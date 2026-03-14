import { Anomaly } from '@/lib/sensors/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';

const severityBorder: Record<string, string> = {
  high: 'border-l-[hsl(var(--status-critical))]',
  medium: 'border-l-[hsl(var(--status-warning))]',
  low: 'border-l-primary',
};

const typeIcons: Record<string, React.ElementType> = {
  spike: TrendingUp,
  threshold: AlertTriangle,
  deviation: Activity,
};

const typeLabels: Record<string, string> = {
  spike: 'Rapid Change',
  threshold: 'Threshold Breach',
  deviation: 'Deviation',
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  limit?: number;
}

export function AnomalyFeed({ anomalies, limit }: AnomalyFeedProps) {
  const items = limit ? anomalies.slice(0, limit) : anomalies;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No anomalies detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const Icon = typeIcons[a.type];
        return (
          <div
            key={a.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-border/50 border-l-[3px] bg-card p-3.5 transition-colors',
              severityBorder[a.severity],
            )}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {a.sensorLabel}
                </span>
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                  {typeLabels[a.type]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{a.message}</p>
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap mt-0.5">
              {formatTime(a.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
