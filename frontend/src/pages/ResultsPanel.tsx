import { useMemo, useState } from "react";
import { api } from "../api";
import type { Sweepstake } from "../types";

interface Props {
  sweepstake: Sweepstake;
  entrantsById: Map<string, string>;
  optionsById: Map<string, string>;
  onChange: (s: Sweepstake) => void;
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsPanel({ sweepstake, entrantsById, optionsById, onChange }: Props) {
  const [busyPrize, setBusyPrize] = useState<string | null>(null);

  const pot = useMemo(() => sweepstake.stake * sweepstake.entrants.length, [sweepstake]);

  // Group assignments by entrant for a clean per-person summary.
  const byEntrant = useMemo(() => {
    const map = new Map<string, string[]>();
    sweepstake.entrants.forEach((e) => map.set(e.id, []));
    sweepstake.assignments.forEach((a) => {
      const list = map.get(a.entrantId) ?? [];
      list.push(optionsById.get(a.optionId) ?? a.optionId);
      map.set(a.entrantId, list);
    });
    return map;
  }, [sweepstake, optionsById]);

  async function setWinner(prizeId: string, winnerEntrantId: string) {
    setBusyPrize(prizeId);
    try {
      const updated = await api.setSidePrizeWinner(sweepstake.id, prizeId, winnerEntrantId || null);
      onChange(updated);
    } finally {
      setBusyPrize(null);
    }
  }

  function exportCsv() {
    const rows: string[][] = [["Entrant", "Options", "Paid"]];
    sweepstake.entrants.forEach((e) => {
      rows.push([e.name, (byEntrant.get(e.id) ?? []).join("; "), e.paid ? "yes" : "no"]);
    });
    rows.push([]);
    rows.push(["Side prize", "Winner"]);
    sweepstake.sidePrizes.forEach((p) => {
      rows.push([p.name, p.winnerEntrantId ? entrantsById.get(p.winnerEntrantId) ?? "" : ""]);
    });
    downloadCsv(`${sweepstake.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`, rows);
  }

  return (
    <div className="results-panel">
      <div className="card">
        <div className="card-head">
          <h2>Final results</h2>
          <button className="btn btn-ghost" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
        <div className="results-grid">
          {sweepstake.entrants.map((e) => (
            <div key={e.id} className="result-card">
              <div className="result-name">{e.name}</div>
              <div className="result-options">
                {(byEntrant.get(e.id) ?? []).map((label) => (
                  <span key={label} className="result-chip">
                    {label}
                  </span>
                ))}
                {(byEntrant.get(e.id) ?? []).length === 0 && <span className="muted small">No option</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {sweepstake.sidePrizes.length > 0 && (
        <div className="card">
          <h2>Side prizes</h2>
          <p className="muted small">Record winners as the real-world events conclude (e.g. golden boot).</p>
          <div className="sideprize-list">
            {sweepstake.sidePrizes.map((p) => (
              <div key={p.id} className="sideprize-row">
                <div>
                  <strong>{p.name}</strong>
                  {p.note && <span className="muted small"> — {p.note}</span>}
                </div>
                <select
                  value={p.winnerEntrantId ?? ""}
                  disabled={busyPrize === p.id}
                  onChange={(e) => setWinner(p.id, e.target.value)}
                >
                  <option value="">— Not decided —</option>
                  {sweepstake.entrants.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {pot > 0 && (
        <div className="card">
          <h2>Prize pot</h2>
          <p className="pot-total">
            {sweepstake.entrants.length} × {sweepstake.stake.toFixed(2)} = <strong>{pot.toFixed(2)}</strong>
          </p>
          <PayoutSplit pot={pot} sidePrizeCount={sweepstake.sidePrizes.length} />
        </div>
      )}
    </div>
  );
}

function PayoutSplit({ pot, sidePrizeCount }: { pot: number; sidePrizeCount: number }) {
  // A simple, client-side configurable split: a percentage to the main winner,
  // the remainder shared equally across side prizes (or all to the winner if none).
  const [mainPct, setMainPct] = useState(sidePrizeCount > 0 ? 70 : 100);
  const mainAmount = (pot * mainPct) / 100;
  const remainder = pot - mainAmount;
  const perSide = sidePrizeCount > 0 ? remainder / sidePrizeCount : 0;

  return (
    <div className="payout">
      <label className="muted small">
        Main winner share: {mainPct}%
        <input
          type="range"
          min={0}
          max={100}
          value={mainPct}
          onChange={(e) => setMainPct(Number(e.target.value))}
        />
      </label>
      <ul className="payout-list">
        <li>
          Main winner: <strong>{mainAmount.toFixed(2)}</strong>
        </li>
        {sidePrizeCount > 0 && (
          <li>
            Each side prize ({sidePrizeCount}): <strong>{perSide.toFixed(2)}</strong>
          </li>
        )}
      </ul>
    </div>
  );
}
