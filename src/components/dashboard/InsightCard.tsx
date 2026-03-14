import { TrendDirection, SensorConfig } from '@/lib/sensors/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const trendMessages: Record<TrendDirection, string> = {
  rising: 'trending upward',
  falling: 'trending downward',
  stable: 'holding stable',
};

interface InsightCardProps {
  config: SensorConfig;
  trend: TrendDirection;
  currentValue: number;
}

export function InsightCard({ config, trend, currentValue }: InsightCardProps) {
  const Icon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-4">
      <div className={cn(
        'mt-0.5 rounded-md p-1.5',
        trend === 'rising' && 'bg-[hsl(var(--status-warning)/0.1)] text-[hsl(var(--status-warning))]',
        trend === 'falling' && 'bg-[hsl(var(--status-healthy)/0.1)] text-[hsl(var(--status-healthy))]',
        trend === 'stable' && 'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {config.label} {trendMessages[trend]}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Currently at {currentValue.toFixed(config.id === 'ph' ? 2 : 1)}{config.unit}
        </p>
      </div>
    </div>
  );
}
