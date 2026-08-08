// Real-time analytics bar — count-up KPIs + mini river/rainfall chart.

import { Line, LineChart, XAxis, YAxis } from 'recharts';
import { useSimulation } from '@/store/simulationStore';
import { useCountUp } from '@/hooks/useCountUp';
import { fmtKm, fmtCompact } from '@/utils/geo';

interface KpiProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  tone?: 'hot' | 'good' | 'cy' | 'am';
}

function Kpi({ label, value, format, tone }: KpiProps) {
  const animated = useCountUp(value, 650);
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className={`value ${tone ?? ''}`}>{format ? format(animated) : Math.round(animated).toLocaleString('en-IN')}</div>
    </div>
  );
}

export function AnalyticsBar() {
  const analytics = useSimulation((s) => s.world.analytics);
  const history = useSimulation((s) => s.world.history);

  const data = history.slice(-40).map((h) => ({
    tick: h.tick,
    river: h.riverPct,
    rain: h.rainfallMmHr,
  }));

  return (
    <div className="analytics">
      <Kpi label="People rescued" value={analytics.peopleRescued} tone="good" />
      <Kpi label="Pending SOS" value={analytics.pendingSos} tone="hot" />
      <Kpi label="Critical SOS" value={analytics.criticalSos} tone="hot" />
      <Kpi label="Hospital load" value={analytics.hospitalLoadPct} format={(n) => `${Math.round(n)}%`} tone="am" />
      <Kpi label="Flooded roads" value={analytics.floodedRoadsKm} format={fmtKm} tone="cy" />
      <Kpi label="Active units" value={analytics.activeVehicles} tone="cy" />
      <Kpi label="Avg response" value={analytics.avgResponseMin} format={(n) => `${Math.round(n)} min`} tone="am" />
      <Kpi label="Lives saved (est.)" value={analytics.savedEstimate} format={fmtCompact} tone="good" />

      <div className="chart-box">
        <div className="cap">River % · Rain mm/hr</div>
        <LineChart width={210} height={52} data={data}>
          <XAxis dataKey="tick" hide />
          <YAxis domain={[0, 120]} hide />
          <Line type="monotone" dataKey="river" stroke="#22d3ee" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="rain" stroke="#fbbf24" dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </div>
    </div>
  );
}