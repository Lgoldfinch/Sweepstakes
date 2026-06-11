import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { DrawMode, Preset, PresetsResponse } from "../types";

function linesToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function CreatePage() {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string>("wc-2026");

  const [name, setName] = useState("");
  const [drawMode, setDrawMode] = useState<DrawMode>("ONE_TO_ONE");
  const [allowSpare, setAllowSpare] = useState(false);
  const [entrantsText, setEntrantsText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [sidePrizesText, setSidePrizesText] = useState("");
  const [stake, setStake] = useState<string>("0");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPresets()
      .then((data: PresetsResponse) => {
        setPresets(data.presets);
      })
      .catch(() => setPresets([]));
  }, []);

  const activePreset = useMemo(() => presets.find((p) => p.id === presetId), [presets, presetId]);

  // Apply a preset's options + side prizes (without clobbering manual entrants).
  useEffect(() => {
    if (!activePreset) return;
    setOptionsText(activePreset.options.map((o) => (o.alias ? `${o.label} | ${o.alias}` : o.label)).join("\n"));
    setSidePrizesText(activePreset.sidePrizes.map((p) => (p.note ? `${p.name} | ${p.note}` : p.name)).join("\n"));
    if (!name) setName(activePreset.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, presets.length]);

  // Each option line is "Label" or "Label | ALIAS" (alias shown on the wheel).
  function parseOptions(text: string) {
    return linesToList(text)
      .map((line) => {
        const [label, ...rest] = line.split("|");
        return { label: label.trim(), alias: rest.join("|").trim() || undefined };
      })
      .filter((o) => o.label.length > 0);
  }

  const entrants = linesToList(entrantsText);
  const options = parseOptions(optionsText);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (entrants.length === 0) return setError("Add at least one entrant.");
    if (options.length === 0) return setError("Add at least one option.");

    const sidePrizes = linesToList(sidePrizesText).map((line) => {
      const [n, ...rest] = line.split("|");
      return { name: n.trim(), note: rest.join("|").trim() || undefined };
    });

    setSubmitting(true);
    try {
      const created = await api.createSweepstake({
        name: name.trim() || "Untitled Sweepstake",
        category: activePreset?.category ?? "custom",
        drawMode,
        allowSpare: drawMode === "MULTI" ? allowSpare : false,
        stake: Number(stake) || 0,
        entrants: entrants.map((nm) => ({ name: nm })),
        options,
        sidePrizes,
      });
      navigate(`/s/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sweepstake");
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <h1>Create a sweepstake</h1>
        <p className="muted">
          Add your entrants and the options to be drawn, then spin the wheel for a fair, seeded draw.
        </p>
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Template</label>
          <div className="preset-grid">
            {presets.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`preset ${presetId === p.id ? "preset-active" : ""}`}
                onClick={() => setPresetId(p.id)}
              >
                <strong>{p.label}</strong>
                <span className="muted">{p.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="name">Sweepstake name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Office World Cup 2026" />
        </div>

        <div className="field">
          <label>Draw mode</label>
          <div className="radio-row">
            <label className={`chip ${drawMode === "ONE_TO_ONE" ? "chip-active" : ""}`}>
              <input
                type="radio"
                name="drawMode"
                checked={drawMode === "ONE_TO_ONE"}
                onChange={() => setDrawMode("ONE_TO_ONE")}
              />
              One option per entrant
            </label>
            <label className={`chip ${drawMode === "MULTI" ? "chip-active" : ""}`}>
              <input type="radio" name="drawMode" checked={drawMode === "MULTI"} onChange={() => setDrawMode("MULTI")} />
              Multiple options per entrant
            </label>
          </div>
          <p className="muted small">
            {drawMode === "ONE_TO_ONE"
              ? "Each entrant gets exactly one option. Best when counts roughly match."
              : "Options are shared out across entrants."}
          </p>
        </div>

        {drawMode === "MULTI" && (
          <div className="field">
            <label className={`chip ${allowSpare ? "chip-active" : ""}`}>
              <input type="checkbox" checked={allowSpare} onChange={(e) => setAllowSpare(e.target.checked)} />
              Leave overflow options spare
            </label>
            <p className="muted small">
              {(() => {
                const e = entrants.length;
                const o = options.length;
                if (e === 0 || o === 0) {
                  return allowSpare
                    ? "Each entrant gets an equal share; any extra options are left spare (unassigned)."
                    : "Every option is dealt out, so some entrants may get one more than others.";
                }
                if (allowSpare) {
                  const per = Math.floor(o / e);
                  const spare = per > 0 ? o - per * e : o;
                  return `${e} entrants, ${o} options -> each gets ${per}, ${spare} spare.`;
                }
                const base = Math.floor(o / e);
                const extra = o % e;
                return extra === 0
                  ? `${e} entrants, ${o} options -> each gets ${base}, none spare.`
                  : `${e} entrants, ${o} options -> ${extra} get ${base + 1}, the rest get ${base}, none spare.`;
              })()}
            </p>
          </div>
        )}

        <div className="grid-2">
          <div className="field">
            <label htmlFor="entrants">Entrants ({entrants.length})</label>
            <textarea
              id="entrants"
              value={entrantsText}
              onChange={(e) => setEntrantsText(e.target.value)}
              placeholder={"One per line\nAlice\nBob\nCharlie"}
              rows={10}
            />
          </div>
          <div className="field">
            <label htmlFor="options">Options ({options.length})</label>
            <textarea
              id="options"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder={"Label | ALIAS (alias optional)\nBrazil | BRA\nFrance | FRA"}
              rows={10}
            />
            <p className="muted small">Add an alias after "|" to show a short code on the wheel.</p>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="sidePrizes">Side prizes (optional)</label>
            <textarea
              id="sidePrizes"
              value={sidePrizesText}
              onChange={(e) => setSidePrizesText(e.target.value)}
              placeholder={"Name | optional note\nGolden Boot | Top scorer"}
              rows={4}
            />
            <p className="muted small">Winners are recorded manually later (e.g. golden boot).</p>
          </div>
          <div className="field">
            <label htmlFor="stake">Stake per entrant (optional)</label>
            <input
              id="stake"
              type="number"
              min="0"
              step="0.01"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
            />
            <p className="muted small">
              Total pot: {entrants.length} × {Number(stake) || 0} = {(entrants.length * (Number(stake) || 0)).toFixed(2)}
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create sweepstake"}
          </button>
        </div>
      </form>
    </div>
  );
}
