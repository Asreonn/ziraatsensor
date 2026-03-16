import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatSensorValue, hasSensorReading } from '@/lib/sensors/display';
import { SensorData, Anomaly, SensorId } from '@/lib/sensors/types';
import { AnomalyFeed } from './AnomalyFeed';
import { TrendingUp, TrendingDown, Minus, ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const trendLabels: Record<string, string> = {
  rising: 'Trending upward',
  falling: 'Trending downward',
  stable: 'Holding stable',
};

const TIME_RANGES = [
  { label: '30m', points: 30 },
  { label: '1h', points: 60 },
  { label: 'All', points: 120 },
];

interface SensorDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sensor: SensorData | null;
  anomalies: Anomaly[];
  poolName: string;
  onMarkRead?: () => void;
}

export function SensorDetailModal({ open, onOpenChange, sensor, anomalies, poolName, onMarkRead }: SensorDetailModalProps) {
  const [range, setRange] = useState(1);

  useEffect(() => {
    if (open && sensor?.hasUnreadAnomaly) {
      onMarkRead?.();
    }
  }, [open, onMarkRead, sensor?.config.id, sensor?.hasUnreadAnomaly]);

  useEffect(() => {
    setRange(1);
  }, [sensor?.config.id]);

  const stats = useMemo(() => {
    if (!sensor) return null;
    const values = sensor.history.filter(hasSensorReading).map(r => r.value);
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [sensor]);

  if (!sensor) return null;

  const { config, current, history, trend } = sensor;
  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;
  const points = TIME_RANGES[range].points;
  const chartData = history.filter(hasSensorReading).slice(-points).map((r, i) => ({
    idx: i,
    value: r.value,
    time: r.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }));
  const hasReading = hasSensorReading(current);

  const sensorAnomalies = anomalies.filter(a => a.sensorId === config.id);

  const statusColor = current.status === 'critical'
    ? 'hsl(0, 72%, 51%)'
    : current.status === 'warning'
    ? 'hsl(38, 92%, 50%)'
    : 'hsl(220, 70%, 50%)';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-y-auto border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,252,245,0.94))] p-0">
        <DialogHeader className="border-b border-border/50 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-xl font-semibold">{config.label}</DialogTitle>
              <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">{poolName} · {config.unit || 'unitless'}</p>
            </div>
            <div className="text-right">
              <span className="font-display text-3xl font-semibold tabular-nums text-foreground">
                {formatSensorValue(current, config.id)}
              </span>
              {config.unit && hasReading && <span className="text-sm text-muted-foreground ml-1">{config.unit}</span>}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</span>
              <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
                {TIME_RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRange(i)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                      range === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-border/60 bg-white/72 p-3">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="modal-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={statusColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={statusColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(v: number) => [v.toFixed(2), config.label]}
                    />
                    <Area type="monotone" dataKey="value" stroke={statusColor} strokeWidth={1.5} fill="url(#modal-grad)" dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  Supabase verisi yok
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'MIN', value: stats ? stats.min.toFixed(2) : '--', icon: ArrowDown, color: 'text-status-healthy' },
              { label: 'MAX', value: stats ? stats.max.toFixed(2) : '--', icon: ArrowUp, color: 'text-status-warning' },
              { label: 'AVG', value: stats ? stats.avg.toFixed(2) : '--', icon: Activity, color: 'text-primary' },
              { label: 'TREND', value: stats ? trendLabels[trend] : '--', icon: TrendIcon, color: trend === 'rising' ? 'text-status-warning' : trend === 'falling' ? 'text-status-healthy' : 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="rounded-[1.25rem] border border-border/60 bg-white/76 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={cn('h-3 w-3', s.color)} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Threshold info */}
          <div className="rounded-[1.4rem] border border-border/60 bg-white/76 p-4">
            <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Thresholds</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warning range</span>
                <span className="tabular-nums text-foreground">{config.warningMin} – {config.warningMax}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Critical range</span>
                <span className="tabular-nums text-foreground">{config.criticalMin} – {config.criticalMax}</span>
              </div>
            </div>
          </div>

          {/* Anomaly history */}
          <div>
            <span className="text-xs font-medium text-foreground mb-2 block">
              Anomaly History ({sensorAnomalies.length})
            </span>
            {sensorAnomalies.length > 0 ? (
              <AnomalyFeed anomalies={sensorAnomalies} limit={10} />
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">No anomalies recorded</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
