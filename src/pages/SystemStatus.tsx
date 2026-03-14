import { useSensorData } from '@/lib/sensors/DataProvider';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SENSOR_IDS, SENSOR_CONFIGS } from '@/lib/sensors/types';
import { cn } from '@/lib/utils';
import { Wifi, Battery, Clock, Activity } from 'lucide-react';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function rssiLabel(rssi: number): string {
  if (rssi > -50) return 'Excellent';
  if (rssi > -60) return 'Good';
  if (rssi > -70) return 'Fair';
  return 'Weak';
}

export default function SystemStatus() {
  const { systemInfo } = useSensorData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">System Status</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ESP32 controller telemetry</p>
        </div>

        {/* ESP Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Uptime', value: formatUptime(systemInfo.uptime) },
            { icon: Wifi, label: 'RSSI', value: `${systemInfo.rssi} dBm (${rssiLabel(systemInfo.rssi)})` },
            { icon: Battery, label: 'Voltage', value: `${systemInfo.voltage.toFixed(2)}V` },
            { icon: Activity, label: 'Last Sync', value: systemInfo.lastSync.toLocaleTimeString() },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Sensor connections */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Sensor Connections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SENSOR_IDS.map(id => {
              const online = systemInfo.sensorConnections[id];
              return (
                <div key={id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3">
                  <span className="text-sm text-foreground">{SENSOR_CONFIGS[id].label}</span>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      online ? 'bg-[hsl(var(--status-healthy))]' : 'bg-[hsl(var(--status-critical))]'
                    )} />
                    <span className={cn(
                      'text-xs font-medium',
                      online ? 'text-[hsl(var(--status-healthy))]' : 'text-[hsl(var(--status-critical))]'
                    )}>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
