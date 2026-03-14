import { useState } from 'react';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { SENSOR_IDS } from '@/lib/sensors/types';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const TIME_RANGES = [
  { label: '1h', points: 60 },
  { label: '6h', points: 60 },
  { label: '24h', points: 60 },
  { label: '7d', points: 60 },
];

const CHART_COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(152, 60%, 42%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(190, 70%, 45%)',
];

export default function Analytics() {
  const { sensors } = useSensorData();
  const [range, setRange] = useState(0);

  // Build combined chart data
  const points = TIME_RANGES[range].points;
  const chartData = Array.from({ length: points }, (_, i) => {
    const entry: Record<string, number | string> = { idx: i };
    SENSOR_IDS.forEach(id => {
      const h = sensors[id].history;
      const idx = Math.max(0, h.length - points + i);
      entry[id] = h[idx]?.value ?? 0;
    });
    return entry;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Trend analysis & insights</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {TIME_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRange(i)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === i
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Per-sensor charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SENSOR_IDS.map((id, idx) => {
            const config = sensors[id].config;
            const color = CHART_COLORS[idx];
            const sensorData = chartData.map(d => ({ idx: d.idx, value: d[id] as number }));
            return (
              <div key={id} className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {config.label} {config.unit && `(${config.unit})`}
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {sensors[id].current.value.toFixed(config.id === 'ph' ? 2 : 1)}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={sensorData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <YAxis domain={['auto', 'auto']} hide />
                    <XAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(v: number) => [v.toFixed(2), config.label]}
                      labelFormatter={() => ''}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={1.5}
                      fill={`url(#grad-${id})`}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>

        {/* Insights */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SENSOR_IDS.map(id => (
              <InsightCard
                key={id}
                config={sensors[id].config}
                trend={sensors[id].trend}
                currentValue={sensors[id].current.value}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
