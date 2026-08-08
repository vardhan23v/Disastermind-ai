export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className="progress"
      style={{
        height: 5,
        borderRadius: 3,
        background: 'var(--line-soft)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: color,
          transition: 'width 0.7s ease',
          borderRadius: 3,
        }}
      />
    </div>
  );
}

export function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontFamily: 'var(--mono)',
        color: color ?? 'var(--text-dim)',
        border: `1px solid ${color ?? 'var(--line)'}`,
        borderRadius: 4,
        padding: '1px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function ConfidenceGauge({ value }: { value: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171';
  return (
    <svg width={44} height={44} viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--line-soft)" strokeWidth={4} />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text
        x="22"
        y="25"
        textAnchor="middle"
        fontSize="9"
        fill={color}
        fontFamily="var(--mono)"
        fontWeight={700}
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}