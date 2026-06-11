import { Router } from "express";
import { prisma } from "../db";
import { newSeed, shortId } from "../util/random";
import { computeDraw, DrawMode } from "../services/draw";

export const sweepstakesRouter = Router();

type IncomingEntrant = { name: string; paid?: boolean };
type IncomingOption = { label: string; alias?: string; meta?: unknown };
type IncomingSidePrize = { name: string; note?: string };

// Build the stored meta JSON for an option, preserving any alias.
function optionMeta(o: IncomingOption): string | null {
  const alias = typeof o.alias === "string" ? o.alias.trim() : "";
  const base = o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>) : {};
  const meta = alias ? { ...base, alias } : base;
  return Object.keys(meta).length > 0 ? JSON.stringify(meta) : null;
}

const DRAW_MODES: DrawMode[] = ["ONE_TO_ONE", "MULTI"];

function cleanStringList<T extends { name?: string; label?: string }>(
  items: T[] | undefined,
  key: "name" | "label"
): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((i) => typeof i?.[key] === "string" && i[key]!.trim().length > 0);
}

/** Load a sweepstake with all relations in a stable, serialisable shape. */
async function loadSweepstake(id: string) {
  const s = await prisma.sweepstake.findUnique({
    where: { id },
    include: {
      entrants: { orderBy: { order: "asc" } },
      options: { orderBy: { order: "asc" } },
      assignments: true,
      sidePrizes: { orderBy: { name: "asc" } },
    },
  });
  return s;
}

// Create a new sweepstake (in DRAFT).
sweepstakesRouter.post("/", async (req, res) => {
  const body = req.body ?? {};
  const name: string = (body.name ?? "Untitled Sweepstake").toString().trim() || "Untitled Sweepstake";
  const category: string = (body.category ?? "football").toString();
  const drawMode: DrawMode = DRAW_MODES.includes(body.drawMode) ? body.drawMode : "ONE_TO_ONE";
  const stake: number = Number.isFinite(body.stake) ? Number(body.stake) : 0;
  const payoutSplit = body.payoutSplit ? JSON.stringify(body.payoutSplit) : null;
  const allowSpare = Boolean(body.allowSpare);

  const entrants = cleanStringList<IncomingEntrant>(body.entrants, "name");
  const options = cleanStringList<IncomingOption>(body.options, "label");
  const sidePrizes = cleanStringList<IncomingSidePrize>(body.sidePrizes, "name");

  const id = shortId(8);

  const created = await prisma.sweepstake.create({
    data: {
      id,
      name,
      category,
      drawMode,
      stake,
      payoutSplit,
      allowSpare,
      status: "DRAFT",
      entrants: {
        create: entrants.map((e, i) => ({
          name: e.name.trim(),
          order: i,
          paid: Boolean(e.paid),
        })),
      },
      options: {
        create: options.map((o, i) => ({
          label: o.label.trim(),
          order: i,
          meta: optionMeta(o),
        })),
      },
      sidePrizes: {
        create: sidePrizes.map((p) => ({
          name: p.name.trim(),
          note: p.note?.toString().trim() || null,
        })),
      },
    },
  });

  const full = await loadSweepstake(created.id);
  res.status(201).json(full);
});

// Fetch a sweepstake (used by the share link).
sweepstakesRouter.get("/:id", async (req, res) => {
  const s = await loadSweepstake(req.params.id);
  if (!s) return res.status(404).json({ error: "Sweepstake not found" });
  res.json(s);
});

// Update a DRAFT sweepstake (entrants/options/side prizes/meta).
sweepstakesRouter.put("/:id", async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.sweepstake.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Sweepstake not found" });
  if (existing.status !== "DRAFT") {
    return res.status(409).json({ error: "Cannot edit a sweepstake that has already been drawn. Reset it first." });
  }

  const body = req.body ?? {};
  const entrants = cleanStringList<IncomingEntrant>(body.entrants, "name");
  const options = cleanStringList<IncomingOption>(body.options, "label");
  const sidePrizes = cleanStringList<IncomingSidePrize>(body.sidePrizes, "name");

  const data: {
    name?: string;
    category?: string;
    drawMode?: string;
    stake?: number;
    payoutSplit?: string | null;
    allowSpare?: boolean;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.category === "string") data.category = body.category;
  if (DRAW_MODES.includes(body.drawMode)) data.drawMode = body.drawMode;
  if (Number.isFinite(body.stake)) data.stake = Number(body.stake);
  if (typeof body.allowSpare === "boolean") data.allowSpare = body.allowSpare;
  if (body.payoutSplit !== undefined) data.payoutSplit = body.payoutSplit ? JSON.stringify(body.payoutSplit) : null;

  // Replace child collections wholesale when provided (simple + predictable for DRAFT editing).
  await prisma.$transaction(async (tx) => {
    await tx.sweepstake.update({ where: { id }, data });

    if (body.entrants !== undefined) {
      await tx.entrant.deleteMany({ where: { sweepstakeId: id } });
      await tx.entrant.createMany({
        data: entrants.map((e, i) => ({ sweepstakeId: id, name: e.name.trim(), order: i, paid: Boolean(e.paid) })),
      });
    }
    if (body.options !== undefined) {
      await tx.option.deleteMany({ where: { sweepstakeId: id } });
      await tx.option.createMany({
        data: options.map((o, i) => ({
          sweepstakeId: id,
          label: o.label.trim(),
          order: i,
          meta: optionMeta(o),
        })),
      });
    }
    if (body.sidePrizes !== undefined) {
      await tx.sidePrize.deleteMany({ where: { sweepstakeId: id } });
      await tx.sidePrize.createMany({
        data: sidePrizes.map((p) => ({ sweepstakeId: id, name: p.name.trim(), note: p.note?.toString().trim() || null })),
      });
    }
  });

  const full = await loadSweepstake(id);
  res.json(full);
});

// Execute the draw (server-side, seeded). Returns ordered reveals for the wheel.
sweepstakesRouter.post("/:id/draw", async (req, res) => {
  const id = req.params.id;
  const s = await loadSweepstake(id);
  if (!s) return res.status(404).json({ error: "Sweepstake not found" });
  if (s.entrants.length === 0) return res.status(400).json({ error: "Add at least one entrant before drawing." });
  if (s.options.length === 0) return res.status(400).json({ error: "Add at least one option before drawing." });

  const seed = newSeed();
  const result = computeDraw(
    s.entrants.map((e) => ({ id: e.id, order: e.order })),
    s.options.map((o) => ({ id: o.id, order: o.order })),
    s.drawMode as DrawMode,
    seed,
    s.allowSpare
  );

  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({ where: { sweepstakeId: id } });
    await tx.assignment.createMany({
      data: result.reveals.map((r) => ({
        sweepstakeId: id,
        entrantId: r.entrantId,
        optionId: r.optionId,
      })),
    });
    await tx.sweepstake.update({ where: { id }, data: { status: "DRAWN", seed } });
  });

  const full = await loadSweepstake(id);
  res.json({ sweepstake: full, reveals: result.reveals, unassignedOptionIds: result.unassignedOptionIds, seed });
});

// Reset back to DRAFT (clear assignments and side-prize winners).
sweepstakesRouter.post("/:id/reset", async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.sweepstake.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Sweepstake not found" });

  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({ where: { sweepstakeId: id } });
    await tx.sidePrize.updateMany({ where: { sweepstakeId: id }, data: { winnerEntrantId: null } });
    await tx.sweepstake.update({ where: { id }, data: { status: "DRAFT", seed: null } });
  });

  const full = await loadSweepstake(id);
  res.json(full);
});

// Record (or clear) a side-prize winner.
sweepstakesRouter.put("/:id/side-prizes/:prizeId", async (req, res) => {
  const { id, prizeId } = req.params;
  const prize = await prisma.sidePrize.findFirst({ where: { id: prizeId, sweepstakeId: id } });
  if (!prize) return res.status(404).json({ error: "Side prize not found" });

  const body = req.body ?? {};
  const winnerEntrantId: string | null = body.winnerEntrantId ?? null;

  if (winnerEntrantId) {
    const entrant = await prisma.entrant.findFirst({ where: { id: winnerEntrantId, sweepstakeId: id } });
    if (!entrant) return res.status(400).json({ error: "Winner must be an entrant in this sweepstake." });
  }

  await prisma.sidePrize.update({
    where: { id: prizeId },
    data: {
      winnerEntrantId,
      note: typeof body.note === "string" ? body.note.trim() : prize.note,
    },
  });

  const full = await loadSweepstake(id);
  res.json(full);
});

// Delete a sweepstake.
sweepstakesRouter.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.sweepstake.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Sweepstake not found" });
  await prisma.sweepstake.delete({ where: { id } });
  res.status(204).end();
});
