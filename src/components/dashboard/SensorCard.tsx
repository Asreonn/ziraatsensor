import { SensorData } from '@/lib/sensors/types';
import {
  formatSensorValue,
  getSensorConnectionMessage,
  getSensorDisplayStatus,
  getSensorStatusLabel,
  hasSensorReading,
} from '@/lib/sensors/display';
import { SparklineChart } from './SparklineChart';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const statusDotColors: Record<string, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  offline: 'bg-status-offline',
};

const statusPillColors: Record<string, string> = {
  healthy: 'text-status-healthy bg-status-healthy/12',
  warning: 'text-status-warning bg-status-warning/12',
  critical: 'text-status-critical bg-status-critical/12',
  offline: 'text-muted-foreground bg-muted/60',
};

const sparkColors: Record<string, string> = {
  healthy: 'hsl(158, 70%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  critical: 'hsl(8, 80%, 54%)',
  offline: 'hsl(162, 12%, 50%)',
};

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return 'az önce';
  if (s < 60) return `${s} sn önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  return `${h} sa önce`;
}

interface SensorCardProps {
  data: SensorData;
  onClick?: () => void;
}

export function SensorCard({ data, onClick }: SensorCardProps) {
  const { config, current, history, delta, trend, hasUnreadAnomaly } = data;
  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;
  const hasReading = hasSensorReading(current);
  const displayStatus = getSensorDisplayStatus(data);
  const statusLabel = getSensorStatusLabel(data);
  const connectionMessage = getSensorConnectionMessage(data.connectionIssue);
  const showOfflineValue = displayStatus === 'offline' || !hasReading;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-5',
        hasUnreadAnomaly ? 'border-status-warning/40 ring-1 ring-status-warning/20' : 'border-border/70',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={cn('h-2 w-2 shrink-0 rounded-full', statusDotColors[displayStatus])} />
          <span className="truncate text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {config.label}
          </span>
        </div>
        <span className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
          statusPillColors[displayStatus],
        )}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn(
          'font-display text-4xl font-semibold tabular-nums tracking-tight',
          showOfflineValue ? 'text-muted-foreground/60' : 'text-foreground',
        )}>
          {showOfflineValue ? '—' : formatSensorValue(current, config.id)}
        </span>
        {config.unit && hasReading && !showOfflineValue && (
          <span className="text-sm font-medium text-muted-foreground">{config.unit}</span>
        )}
      </div>

      <div className="mt-1 flex h-5 items-center gap-1.5 text-xs">
        {connectionMessage ? (
          <span className="text-muted-foreground">{connectionMessage}</span>
        ) : hasReading ? (
          <>
            <TrendIcon className={cn(
              'h-3.5 w-3.5',
              trend === 'rising' && 'text-status-warning',
              trend === 'falling' && 'text-status-healthy',
              trend === 'stable' && 'text-muted-foreground',
            )} />
            <span className={cn(
              'font-medium tabular-nums',
              delta > 0 ? 'text-status-warning' : delta < 0 ? 'text-status-healthy' : 'text-muted-foreground',
            )}>
              {delta > 0 ? '+' : ''}{delta}%
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Veri bekleniyor</span>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-2">
        {!showOfflineValue ? (
          <SparklineChart data={history.slice(-30)} color={sparkColors[displayStatus]} height={36} />
        ) : (
          <div className="flex h-9 items-center justify-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
            Veri yok
          </div>
        )}
      </div>

      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {!showOfflineValue ? `Güncellendi · ${timeAgo(current.timestamp)}` : 'Veri akmıyor'}
      </div>
    </button>
  );
}
