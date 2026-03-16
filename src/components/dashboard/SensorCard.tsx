import { SensorData } from '@/lib/sensors/types';
import { SparklineChart } from './SparklineChart';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const statusColors: Record<string, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  offline: 'bg-status-offline',
};

const statusLabels: Record<string, string> = {
  healthy: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  offline: 'Offline',
};

const sparkColors: Record<string, string> = {
  healthy: 'hsl(152, 60%, 42%)',
  warning: 'hsl(38, 92%, 50%)',
  critical: 'hsl(0, 72%, 51%)',
  offline: 'hsl(215, 15%, 47%)',
};

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

interface SensorCardProps {
  data: SensorData;
  onClick?: () => void;
}

export function SensorCard({ data, onClick }: SensorCardProps) {
  const { config, current, history, delta, trend, hasUnreadAnomaly } = data;
  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[1.7rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,252,245,0.9))] p-5 shadow-[0_24px_65px_-48px_rgba(7,130,95,0.7)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_32px_80px_-48px_rgba(7,130,95,0.82)]',
        hasUnreadAnomaly && 'ring-1 ring-status-warning/40',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(13,187,108,0.12),transparent_72%)]" />

      {hasUnreadAnomaly && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-status-warning/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-status-warning">
          <AlertTriangle className="h-3 w-3" />
          Alert
        </div>
      )}

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn('h-2.5 w-2.5 rounded-full', statusColors[current.status])} />
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {config.label}
          </span>
        </div>
        <span className={cn(
          'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
          current.status === 'healthy' && 'text-status-healthy bg-status-healthy/10',
          current.status === 'warning' && 'text-status-warning bg-status-warning/10',
          current.status === 'critical' && 'text-status-critical bg-status-critical/10',
          current.status === 'offline' && 'text-muted-foreground bg-muted',
        )}>
          {statusLabels[current.status]}
        </span>
      </div>

      <div className="relative flex items-baseline gap-2 mb-1">
        <span className="font-display text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {current.value.toFixed(config.id === 'ph' ? 2 : 1)}
        </span>
        {config.unit && (
          <span className="text-sm text-muted-foreground font-medium">{config.unit}</span>
        )}
      </div>

      <div className="relative flex items-center gap-2 mb-4">
        <TrendIcon className={cn(
          'h-3.5 w-3.5',
          trend === 'rising' && 'text-status-warning',
          trend === 'falling' && 'text-status-healthy',
          trend === 'stable' && 'text-muted-foreground',
        )} />
        <span className={cn(
          'text-xs tabular-nums font-medium',
          delta > 0 ? 'text-status-warning' : delta < 0 ? 'text-status-healthy' : 'text-muted-foreground',
        )}>
          {delta > 0 ? '+' : ''}{delta}%
        </span>
      </div>

      <div className="relative mb-3 rounded-[1.25rem] border border-border/65 bg-white/72 p-2">
        <SparklineChart data={history.slice(-30)} color={sparkColors[current.status]} height={36} />
      </div>

      <div className="relative text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Updated {timeAgo(current.timestamp)}
      </div>
    </div>
  );
}
