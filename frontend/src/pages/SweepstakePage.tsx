import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { optionAlias, type Reveal, type Sweepstake } from "../types";
import type { Option } from "../types";
import { Wheel, WheelSegment } from "../components/Wheel";
import { Confetti } from "../components/Confetti";
import { ShareBox } from "../components/ShareBox";
import { ResultsPanel } from "./ResultsPanel";

type Phase = "draft" | "drawing" | "done";

const SPIN_MS = 4200;
const EXTRA_TURNS = 5;

export function SweepstakePage() {
  const { id = "" } = useParams();
  const [sweepstake, setSweepstake] = useState<Sweepstake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("draft");
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const [step, setStep] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.getSweepstake(id);
      setSweepstake(s);
      if (s.status === "DRAWN") {
        // Reconstruct reveals from stored assignments so a reload shows results.
        setReveals(s.assignments.map((a) => ({ entrantId: a.entrantId, optionId: a.optionId })));
        setStep(s.assignments.length);
        setPhase("done");
      } else {
        setPhase("draft");
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sweepstake");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const optionsById = useMemo(() => {
    const m = new Map<string, string>();
    sweepstake?.options.forEach((o) => m.set(o.id, o.label));
    return m;
  }, [sweepstake]);

  const entrantsById = useMemo(() => {
    const m = new Map<string, string>();
    sweepstake?.entrants.forEach((e) => m.set(e.id, e.name));
    return m;
  }, [sweepstake]);

  const segments: WheelSegment[] = useMemo(
    () => (sweepstake?.options ?? []).map((o) => ({ id: o.id, label: optionAlias(o.meta) ?? o.label })),
    [sweepstake]
  );

  const drawnSoFar = useMemo(() => reveals.slice(0, step), [reveals, step]);
  const dimmedIds = drawnSoFar.map((r) => r.optionId);
  const currentReveal = reveals[step];

  // Spare options are simply those that received no assignment in the draw.
  const spareOptions: Option[] = useMemo(() => {
    const assigned = new Set(reveals.map((r) => r.optionId));
    return (sweepstake?.options ?? []).filter((o) => !assigned.has(o.id));
  }, [sweepstake, reveals]);

  async function startDraw() {
    if (!sweepstake) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.draw(sweepstake.id);
      setSweepstake(res.sweepstake);
      setReveals(res.reveals);
      setStep(0);
      setRotation(0);
      setPhase("drawing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draw failed");
    } finally {
      setBusy(false);
    }
  }

  function spin() {
    if (spinning || !currentReveal) return;
    const idx = segments.findIndex((s) => s.id === currentReveal.optionId);
    if (idx < 0) return;
    const n = segments.length;
    const segAngle = 360 / n;
    const center = (idx + 0.5) * segAngle;
    const desired = (360 - center) % 360;
    const current = ((rotation % 360) + 360) % 360;
    const delta = (desired - current + 360) % 360;
    setSpinning(true);
    setRotation((r) => r + EXTRA_TURNS * 360 + delta);
  }

  function handleSpinEnd() {
    if (!spinning) return;
    setSpinning(false);
    const next = step + 1;
    setStep(next);
    if (next >= reveals.length) {
      setPhase("done");
      setConfettiKey((k) => k + 1);
    }
  }

  async function handleReset() {
    if (!sweepstake) return;
    if (!confirm("Reset this sweepstake back to draft? This clears the draw and side-prize winners.")) return;
    setBusy(true);
    try {
      const s = await api.reset(sweepstake.id);
      setSweepstake(s);
      setReveals([]);
      setStep(0);
      setRotation(0);
      setPhase("draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page"><div className="card">Loading…</div></div>;
  if (error && !sweepstake) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!sweepstake) return null;

  const shareUrl = `${window.location.origin}/s/${sweepstake.id}`;
  const allDrawn = step >= reveals.length && reveals.length > 0;

  return (
    <div className="page">
      {confettiKey > 0 && <Confetti fireKey={confettiKey} />}

      <div className="sweepstake-header">
        <div>
          <h1>{sweepstake.name}</h1>
          <p className="muted">
            <span className="badge">{sweepstake.category}</span>
            <span className="badge">{sweepstake.drawMode === "ONE_TO_ONE" ? "1 per entrant" : "Multiple per entrant"}</span>
            <span className={`badge badge-${sweepstake.status === "DRAWN" ? "done" : "draft"}`}>{sweepstake.status}</span>
            {sweepstake.entrants.length} entrants · {sweepstake.options.length} options
          </p>
        </div>
        <ShareBox url={shareUrl} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="draw-layout">
        <div className="wheel-col card">
          <Wheel
            segments={segments}
            rotation={rotation}
            spinning={spinning}
            durationMs={SPIN_MS}
            dimmedIds={dimmedIds}
            onSpinEnd={handleSpinEnd}
          />

          {phase === "draft" && (
            <div className="draw-controls">
              <p className="muted">Ready to draw {sweepstake.entrants.length} entrants.</p>
              <button className="btn btn-primary btn-lg" onClick={startDraw} disabled={busy}>
                {busy ? "Preparing…" : "Start the draw"}
              </button>
            </div>
          )}

          {phase === "drawing" && currentReveal && (
            <div className="draw-controls">
              <p className="now-drawing">
                Drawing for <strong>{entrantsById.get(currentReveal.entrantId)}</strong>
              </p>
              <button className="btn btn-primary btn-lg" onClick={spin} disabled={spinning}>
                {spinning ? "Spinning…" : `Spin (${step + 1}/${reveals.length})`}
              </button>
            </div>
          )}

          {phase === "done" && (
            <div className="draw-controls">
              <p className="now-drawing">Draw complete! 🎉</p>
              <button className="btn btn-ghost" onClick={handleReset} disabled={busy}>
                Reset & redraw
              </button>
            </div>
          )}
        </div>

        <div className="results-col">
          <div className="card">
            <h2>Draw {allDrawn ? "results" : "in progress"}</h2>
            {drawnSoFar.length === 0 ? (
              <p className="muted">Spin the wheel to reveal assignments.</p>
            ) : (
              <ul className="reveal-list">
                {drawnSoFar.map((r, i) => (
                  <li key={`${r.entrantId}-${r.optionId}`} className="reveal-item reveal-new">
                    <span className="reveal-index">{i + 1}</span>
                    <span className="reveal-entrant">{entrantsById.get(r.entrantId)}</span>
                    <span className="reveal-arrow">→</span>
                    <span className="reveal-option">{optionsById.get(r.optionId)}</span>
                  </li>
                ))}
              </ul>
            )}
            {sweepstake.seed && phase === "done" && (
              <p className="muted small">Fairness seed: <code>{sweepstake.seed}</code></p>
            )}
          </div>

          {phase === "done" && spareOptions.length > 0 && (
            <div className="card">
              <h2>Spare options ({spareOptions.length})</h2>
              <p className="muted small">Not assigned to anyone.</p>
              <div className="result-options">
                {spareOptions.map((o) => (
                  <span key={o.id} className="result-chip result-chip-spare">
                    {o.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {phase === "done" && (
        <ResultsPanel
          sweepstake={sweepstake}
          entrantsById={entrantsById}
          optionsById={optionsById}
          onChange={setSweepstake}
        />
      )}
    </div>
  );
}
