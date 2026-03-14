import { useState } from 'react';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { SensorDetailModal } from '@/components/dashboard/SensorDetailModal';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SENSOR_IDS, SensorId, POOL_CONFIGS } from '@/lib/sensors/types';
import { cn } from '@/lib/utils';
import { ChevronRight, AlertTriangle } from 'lucide-react';

const statusDot: Record<string, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  offline: 'bg-status-offline',
};

const statusLabel: Record<string, string> = {
  healthy: 'Stable',
  warning: 'Warning',
  critical: 'Critical',
  offline: 'Offline',
};

export default function Overview() {
  const { pools, markAnomaliesRead } = useSensorData();
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [modalSensor, setModalSensor] = useState<SensorId | null>(null);

  const openPool = selectedPool ? pools[selectedPool] : null;

  const totalAnomalies = Object.values(pools).reduce(
    (sum, p) => sum + p.anomalies.filter(a => !a.read).length, 0
  );

  const handleSensorClick = (poolId: string, sensorId: SensorId) => {
    setSelectedPool(poolId);
    setModalSensor(sensorId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {POOL_CONFIGS.length} pools · {totalAnomalies > 0 ? (
                <span className="text-status-warning">{totalAnomalies} unread alerts</span>
              ) : (
                <span className="text-status-healthy">All systems normal</span>
              )}
            </p>
          </div>
        </div>

        {/* Pool cards — no pool selected yet */}
        {!selectedPool && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {POOL_CONFIGS.map(pc => {
              const pool = pools[pc.id];
              if (!pool) return null;
              const unread = pool.anomalies.filter(a => !a.read).length;
              const hasCritical = pool.overallStatus === 'critical';

              return (
                <button
                  key={pc.id}
                  onClick={() => setSelectedPool(pc.id)}
                  className={cn(
                    'relative text-left rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                    hasCritical ? 'border-status-critical/30 ring-1 ring-status-critical/20' : 'border-border/50',
                  )}
                >
                  {unread > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-5 w-5 rounded-full bg-status-warning shadow-sm">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{pc.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{pc.location}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('h-2 w-2 rounded-full', statusDot[pool.overallStatus])} />
                    <span className={cn(
                      'text-xs font-medium',
                      pool.overallStatus === 'critical' && 'text-status-critical',
                      pool.overallStatus === 'warning' && 'text-status-warning',
                      pool.overallStatus === 'healthy' && 'text-status-healthy',
                    )}>
                      {statusLabel[pool.overallStatus]}
                    </span>
                    {unread > 0 && (
                      <span className="text-[10px] text-status-warning ml-auto">{unread} alert{unread > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* Mini sensor summary */}
                  <div className="grid grid-cols-3 gap-2">
                    {SENSOR_IDS.map(id => {
                      const s = pool.sensors[id];
                      return (
                        <div key={id} className="text-center">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">{s.config.label}</span>
                          <span className={cn(
                            'text-xs font-semibold tabular-nums',
                            s.current.status === 'critical' && 'text-status-critical',
                            s.current.status === 'warning' && 'text-status-warning',
                            s.current.status === 'healthy' && 'text-foreground',
                          )}>
                            {s.current.value.toFixed(s.config.id === 'ph' ? 1 : 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pool detail view */}
        {selectedPool && openPool && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPool(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← All Pools
              </button>
              <div className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full', statusDot[openPool.overallStatus])} />
                <span className="text-sm font-semibold text-foreground">{openPool.config.name}</span>
                <span className="text-xs text-muted-foreground">{openPool.config.location}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SENSOR_IDS.map(id => (
                <SensorCard
                  key={id}
                  data={openPool.sensors[id]}
                  onClick={() => handleSensorClick(selectedPool, id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sensor detail modal */}
      {selectedPool && modalSensor && openPool && (
        <SensorDetailModal
          open={!!modalSensor}
          onOpenChange={(open) => { if (!open) setModalSensor(null); }}
          sensor={openPool.sensors[modalSensor]}
          anomalies={openPool.anomalies}
          poolName={openPool.config.name}
          onMarkRead={() => markAnomaliesRead(selectedPool, modalSensor)}
        />
      )}
    </DashboardLayout>
  );
}
