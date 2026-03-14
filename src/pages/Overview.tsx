import { useSensorData } from '@/lib/sensors/DataProvider';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { SENSOR_IDS } from '@/lib/sensors/types';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AnomalyFeed } from '@/components/dashboard/AnomalyFeed';

export default function Overview() {
  const { sensors, anomalies } = useSensorData();

  const allHealthy = SENSOR_IDS.every(id => sensors[id].current.status === 'healthy');
  const hasWarning = SENSOR_IDS.some(id => sensors[id].current.status === 'warning');
  const hasCritical = SENSOR_IDS.some(id => sensors[id].current.status === 'critical');

  const poolStatus = hasCritical ? 'Critical' : hasWarning ? 'Warning' : allHealthy ? 'Stable' : 'Monitoring';
  const statusColor = hasCritical
    ? 'text-[hsl(var(--status-critical))]'
    : hasWarning
    ? 'text-[hsl(var(--status-warning))]'
    : 'text-[hsl(var(--status-healthy))]';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Pool status header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pool Alpha-1: <span className={statusColor}>{poolStatus}</span>
          </p>
        </div>

        {/* Sensor grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SENSOR_IDS.map(id => (
            <SensorCard key={id} data={sensors[id]} />
          ))}
        </div>

        {/* Recent anomalies */}
        {anomalies.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">Recent Anomalies</h2>
            <AnomalyFeed anomalies={anomalies} limit={5} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
