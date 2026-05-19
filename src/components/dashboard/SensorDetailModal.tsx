import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatSensorValue, getSensorConnectionMessage, getSensorDisplayStatus, hasSensorReading } from '@/lib/sensors/display';
import { SensorData, Anomaly, SensorId } from '@/lib/sensors/types';
import { AnomalyFeed } from './AnomalyFeed';
import { TrendingUp, TrendingDown, Minus, ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const trendLabels: Record<string, string> = {
  rising: 'Yükseliyor',
  falling: 'Düşüyor',
  stable: 'Stabil',
};

const TIME_RANGES: Array<{ label: string; windowMs: number | null }> = [
  { label: '30dk', windowMs: 30 * 60 * 1000 },
  { label: '1sa', windowMs: 60 * 60 * 1000 },
  { label: '6sa', windowMs: 6 * 60 * 60 * 1000 },
  { label: 'Tümü', windowMs: null },
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
  const windowMs = TIME_RANGES[range].windowMs;
  const cutoffMs = windowMs === null ? null : Date.now() - windowMs;
  const filteredHistory = history.filter(r => {
    if (!hasSensorReading(r)) return false;
    if (cutoffMs === null) return true;
    return r.timestamp.getTime() >= cutoffMs;
  });
  const chartData = filteredHistory.map((r, i) => ({
    idx: i,
    value: r.value,
    time: r.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  }));
  const hasReading = hasSensorReading(current);
  const connectionMessage = getSensorConnectionMessage(sensor.connectionIssue);
  const displayStatus = getSensorDisplayStatus(sensor);

  const sensorAnomalies = anomalies.filter(a => a.sensorId === config.id);

  const statusColor = displayStatus === 'critical'
    ? 'hsl(0, 72%, 51%)'
    : displayStatus === 'warning'
    ? 'hsl(38, 92%, 50%)'
    : 'hsl(220, 70%, 50%)';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl gap-0 overflow-y-auto border border-border/70 bg-card p-0 shadow-lg">
        <DialogHeader className="border-b border-border/50 p-4 pb-3 md:p-6 md:pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate font-display text-lg font-semibold md:text-xl">{config.label}</DialogTitle>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs">
                {poolName}{config.unit ? ` · ${config.unit}` : ''}
              </p>
              {connectionMessage && (
                <p className={cn(
                  'mt-2 text-xs font-medium',
                  sensor.connectionIssue === 'faulty' ? 'text-status-critical' : 'text-status-warning',
                )}>
                  {connectionMessage}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground md:text-3xl">
                {formatSensorValue(current, config.id)}
              </span>
              {config.unit && hasReading && <span className="ml-1 text-xs text-muted-foreground md:text-sm">{config.unit}</span>}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-4 md:space-y-6 md:p-6">
          {/* Chart */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Geçmiş</span>
              <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
                {TIME_RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRange(i)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                      range === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-border/60 bg-muted/30 p-3">
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
                <div className="flex h-[200px] flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                  <span>Bu aralıkta veri yok</span>
                  <span className="text-[11px]">Farklı bir aralık seçin</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {[
              { label: 'EN DÜŞÜK', value: stats ? stats.min.toFixed(2) : '--', icon: ArrowDown, color: 'text-status-healthy' },
              { label: 'EN YÜKSEK', value: stats ? stats.max.toFixed(2) : '--', icon: ArrowUp, color: 'text-status-warning' },
              { label: 'ORTALAMA', value: stats ? stats.avg.toFixed(2) : '--', icon: Activity, color: 'text-primary' },
              { label: 'TREND', value: stats ? trendLabels[trend] : '--', icon: TrendIcon, color: trend === 'rising' ? 'text-status-warning' : trend === 'falling' ? 'text-status-healthy' : 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-muted/40 p-2.5 md:p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={cn('h-3 w-3', s.color)} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Threshold info */}
          <div className="rounded-[1.4rem] border border-border/60 bg-muted/40 p-4">
            <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Eşik Değerleri</span>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uyarı aralığı</span>
                <span className="tabular-nums text-foreground">{config.warningMin} – {config.warningMax}{config.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kritik aralık</span>
                <span className="tabular-nums text-foreground">{config.criticalMin} – {config.criticalMax}{config.unit}</span>
              </div>
            </div>
          </div>

          {/* Anomaly history */}
          <div>
            <span className="mb-2 block text-xs font-medium text-foreground">
              Uyarı Geçmişi ({sensorAnomalies.length})
            </span>
            {sensorAnomalies.length > 0 ? (
              <AnomalyFeed anomalies={sensorAnomalies} limit={10} />
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">Bu sensör için uyarı kaydı yok</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
