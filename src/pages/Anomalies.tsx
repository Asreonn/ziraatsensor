import { useState } from 'react';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AnomalyFeed } from '@/components/dashboard/AnomalyFeed';
import { SENSOR_IDS, SensorId, AnomalySeverity } from '@/lib/sensors/types';

export default function Anomalies() {
  const { anomalies } = useSensorData();
  const [sensorFilter, setSensorFilter] = useState<SensorId | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>('all');

  const filtered = anomalies.filter(a => {
    if (sensorFilter !== 'all' && a.sensorId !== sensorFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Anomalies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {anomalies.length} events detected
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={sensorFilter}
            onChange={e => setSensorFilter(e.target.value as SensorId | 'all')}
            className="text-xs rounded-lg border border-border bg-card px-3 py-1.5 text-foreground"
          >
            <option value="all">All Sensors</option>
            {SENSOR_IDS.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as AnomalySeverity | 'all')}
            className="text-xs rounded-lg border border-border bg-card px-3 py-1.5 text-foreground"
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <AnomalyFeed anomalies={filtered} />
      </div>
    </DashboardLayout>
  );
}
