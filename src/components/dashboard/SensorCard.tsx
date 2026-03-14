import { SensorData } from '@/lib/sensors/types';
import { SparklineChart } from './SparklineChart';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const statusColors: Record<string, string> = {
  healthy: 'bg-[hsl(var(--status-healthy))]',
  warning: 'bg-[hsl(var(--status-warning))]',
  critical: 'bg-[hsl(var(--status-critical))]',
  offline: 'bg-[hsl(var(--status-offline))]',
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

export function SensorCard({ data }: { data: SensorData }) {
  const { config, current, history, delta, trend } = data;
  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;

  return (
    <div className="group rounded-xl bg-card p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', statusColors[current.status])} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {config.label}
          </span>
        </div>
        <span className={cn(
          'text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full',
          current.status === 'healthy' && 'text-[hsl(var(--status-healthy))] bg-[hsl(var(--status-healthy)/0.1)]',
          current.status === 'warning' && 'text-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning)/0.1)]',
          current.status === 'critical' && 'text-[hsl(var(--status-critical))] bg-[hsl(var(--status-critical)/0.1)]',
          current.status === 'offline' && 'text-muted-foreground bg-muted',
        )}>
          {statusLabels[current.status]}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {current.value.toFixed(config.id === 'ph' ? 2 : 1)}
        </span>
        {config.unit && (
          <span className="text-sm text-muted-foreground font-medium">{config.unit}</span>
        )}
      </div>

      {/* Delta & Trend */}
      <div className="flex items-center gap-2 mb-3">
        <TrendIcon className={cn(
          'h-3.5 w-3.5',
          trend === 'rising' && 'text-[hsl(var(--status-warning))]',
          trend === 'falling' && 'text-[hsl(var(--status-healthy))]',
          trend === 'stable' && 'text-muted-foreground',
        )} />
        <span className={cn(
          'text-xs tabular-nums font-medium',
          delta > 0 ? 'text-[hsl(var(--status-warning))]' : delta < 0 ? 'text-[hsl(var(--status-healthy))]' : 'text-muted-foreground',
        )}>
          {delta > 0 ? '+' : ''}{delta}%
        </span>
      </div>

      {/* Sparkline */}
      <div className="mb-2">
        <SparklineChart data={history.slice(-30)} color={sparkColors[current.status]} height={36} />
      </div>

      {/* Footer */}
      <div className="text-[10px] text-muted-foreground">
        Updated {timeAgo(current.timestamp)}
      </div>
    </div>
  );
}
