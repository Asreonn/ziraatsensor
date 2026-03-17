import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SensorDetailModal } from './SensorDetailModal';
import type { Anomaly, SensorData } from '@/lib/sensors/types';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
}));

vi.mock('./AnomalyFeed', () => ({
  AnomalyFeed: () => <div>anomaly-feed</div>,
}));

vi.mock('recharts', () => {
  const ResponsiveContainer = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const AreaChart = ({ children }: { children?: ReactNode }) => (
    <svg role="img" aria-label="sensor-history-chart">
      {children}
    </svg>
  );
  return {
    ResponsiveContainer,
    AreaChart,
    CartesianGrid: () => <g />,
    Tooltip: () => null,
    XAxis: () => <g />,
    YAxis: () => <g />,
    Area: () => <g />,
  };
});

const sensor: SensorData = {
  config: {
    id: 'ph',
    label: 'pH',
    unit: '',
    min: 0,
    max: 14,
    warningMin: 6.5,
    warningMax: 8.5,
    criticalMin: 5.5,
    criticalMax: 9.5,
    baseValue: 7.2,
    amplitude: 0.4,
    period: 300,
  },
  current: {
    value: 7.42,
    timestamp: new Date('2026-03-14T10:00:00Z'),
    status: 'warning',
  },
  history: [
    { value: 7.12, timestamp: new Date('2026-03-14T09:58:00Z'), status: 'healthy' },
    { value: 7.3, timestamp: new Date('2026-03-14T09:59:00Z'), status: 'healthy' },
    { value: 7.42, timestamp: new Date('2026-03-14T10:00:00Z'), status: 'warning' },
  ],
  delta: 1.7,
  trend: 'rising',
  connectionIssue: 'none',
  hasUnreadAnomaly: true,
};

const anomalies: Anomaly[] = [
  {
    id: 'anomaly-1',
    poolId: 'pool-alpha',
    sensorId: 'ph',
    sensorLabel: 'pH',
    type: 'threshold',
    severity: 'medium',
    value: 7.42,
    threshold: 6.5,
    timestamp: new Date('2026-03-14T10:00:00Z'),
    message: 'pH warning threshold exceeded.',
    read: false,
  },
];

function Harness() {
  const [markCount, setMarkCount] = useState(0);
  const handleMarkRead = useCallback(() => {
    setMarkCount(count => count + 1);
  }, []);

  return (
    <>
      <span data-testid="mark-count">{markCount}</span>
      <SensorDetailModal
        open
        onOpenChange={() => {}}
        sensor={sensor}
        anomalies={anomalies}
        poolName="Alpha-1"
        onMarkRead={handleMarkRead}
      />
    </>
  );
}

describe('SensorDetailModal', () => {
  it('marks anomalies as read after mount without entering a render loop', async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId('mark-count')).toHaveTextContent('1');
    });

    expect(screen.getByText('pH')).toBeInTheDocument();
  });
});
