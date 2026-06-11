import { useMemo } from "react";

export interface WheelSegment {
  id: string;
  label: string;
}

interface WheelProps {
  segments: WheelSegment[];
  /** Current rotation in degrees (monotonically increasing for a smooth spin). */
  rotation: number;
  spinning: boolean;
  durationMs: number;
  /** Ids of segments already drawn (rendered dimmed). */
  dimmedIds?: string[];
  /** Fired when the spin transition finishes. */
  onSpinEnd?: () => void;
}

// A palette that repeats around the wheel; alternating shades keep adjacent
// segments distinct even with many options.
const PALETTE = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

const SIZE = 460;
const R = SIZE / 2;
const CENTER = R;

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
}

function segmentPath(startAngle: number, endAngle: number, radius: number) {
  const start = polar(CENTER, CENTER, radius, endAngle);
  const end = polar(CENTER, CENTER, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function truncate(label: string, max: number) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function Wheel({ segments, rotation, spinning, durationMs, dimmedIds = [], onSpinEnd }: WheelProps) {
  const n = segments.length;
  const dimmed = new Set(dimmedIds);

  const paths = useMemo(() => {
    if (n === 0) return [];
    const seg = 360 / n;
    return segments.map((s, i) => {
      const start = i * seg;
      const end = (i + 1) * seg;
      const mid = start + seg / 2;
      // Orient labels radially (along the spoke) so the text length runs along
      // the wedge's long axis, giving plenty of room even with many wedges.
      // Centre the label in the wide outer portion of the wedge.
      const textPos = polar(CENTER, CENTER, R * 0.64, mid);
      // Radial-outward reading is `mid - 90`; flip the left half by 180° so
      // every label stays upright (it remains centred, so position is unchanged).
      const radialRotation = mid - 90;
      const flip = mid > 180;
      return {
        id: s.id,
        label: s.label,
        d: segmentPath(start, end, R - 4),
        color: PALETTE[i % PALETTE.length],
        textX: textPos.x,
        textY: textPos.y,
        textRotation: flip ? radialRotation + 180 : radialRotation,
        fontSize: n > 36 ? 13 : n > 24 ? 15 : n > 16 ? 16 : n > 10 ? 17 : 18,
        maxChars: n > 36 ? 12 : n > 24 ? 14 : n > 16 ? 16 : 20,
      };
    });
  }, [segments, n]);

  return (
    <div className="wheel">
      <div className="wheel-pointer" aria-hidden />
      <svg
        className="wheel-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)` : "none",
        }}
        onTransitionEnd={() => onSpinEnd?.()}
        role="img"
        aria-label="Sweepstake wheel"
      >
        {n === 0 ? (
          <circle cx={CENTER} cy={CENTER} r={R - 4} fill="#1f2540" />
        ) : (
          paths.map((p) => (
            <g key={p.id} opacity={dimmed.has(p.id) ? 0.28 : 1}>
              <path d={p.d} fill={p.color} stroke="#0b1020" strokeWidth={2} />
              <text
                x={p.textX}
                y={p.textY}
                fill="#0b1020"
                fontSize={p.fontSize}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${p.textRotation}, ${p.textX}, ${p.textY})`}
              >
                {truncate(p.label, p.maxChars)}
              </text>
            </g>
          ))
        )}
        <circle cx={CENTER} cy={CENTER} r={28} fill="#0b1020" stroke="#3a4170" strokeWidth={3} />
      </svg>
    </div>
  );
}
