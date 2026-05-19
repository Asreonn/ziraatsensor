import { Anomaly } from '@/lib/sensors/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const severityStyles: Record<string, { border: string; badge: string; iconBg: string }> = {
  high: {
    border: 'border-l-status-critical',
    badge: 'bg-status-critical/12 text-status-critical',
    iconBg: 'bg-status-critical/15 text-status-critical',
  },
  medium: {
    border: 'border-l-status-warning',
    badge: 'bg-status-warning/12 text-status-warning',
    iconBg: 'bg-status-warning/15 text-status-warning',
  },
  low: {
    border: 'border-l-primary',
    badge: 'bg-primary/10 text-primary',
    iconBg: 'bg-primary/12 text-primary',
  },
};

const severityLabels: Record<string, string> = {
  high: 'Kritik',
  medium: 'Uyarı',
  low: 'Bilgi',
};

const typeLabels: Record<string, string> = {
  spike: 'Ani Değişim',
  threshold: 'Eşik İhlali',
  deviation: 'Sapma',
};

function pickIcon(anomaly: Anomaly): React.ElementType {
  if (anomaly.type === 'spike') {
    return anomaly.value > anomaly.threshold ? TrendingUp : TrendingDown;
  }
  if (anomaly.type === 'threshold') return AlertTriangle;
  return Activity;
}

function formatRelativeTime(timestamp: Date): string {
  const diffMs = Date.now() - timestamp.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}sn önce`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}dk önce`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}sa önce`;
  return timestamp.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  limit?: number;
}

export function AnomalyFeed({ anomalies, limit }: AnomalyFeedProps) {
  const items = limit ? anomalies.slice(0, limit) : anomalies;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 py-8 text-muted-foreground">
        <Activity className="mb-2 h-7 w-7 opacity-40" />
        <p className="text-sm font-medium">Uyarı yok</p>
        <p className="mt-0.5 text-xs">Tüm sensörler normal değerlerde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(a => {
        const Icon = pickIcon(a);
        const styles = severityStyles[a.severity] ?? severityStyles.low;
        return (
          <div
            key={a.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border border-border/60 border-l-[3px] bg-card p-3 shadow-sm transition-colors',
              styles.border,
            )}
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{a.sensorLabel}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]', styles.badge)}>
                  {severityLabels[a.severity] ?? a.severity}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {typeLabels[a.type] ?? a.type}
                </span>
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                  {formatRelativeTime(a.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground/85">{a.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
