import { useState } from 'react';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { SensorDetailModal } from '@/components/dashboard/SensorDetailModal';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { InfoHint } from '@/components/ui/info-hint';
import { SENSOR_IDS, SensorId } from '@/lib/sensors/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, ChevronRight } from 'lucide-react';

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
  const { pools, loading, error, markAnomaliesRead } = useSensorData();
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [modalSensor, setModalSensor] = useState<SensorId | null>(null);

  const poolList = Object.values(pools).sort((left, right) => left.config.sortOrder - right.config.sortOrder);
  const openPool = selectedPool ? pools[selectedPool] : null;
  const totalPools = poolList.length;
  const totalSensors = poolList.length * SENSOR_IDS.length;

  const totalAnomalies = poolList.reduce(
    (sum, p) => sum + p.anomalies.filter(a => !a.read).length, 0
  );
  const healthyPools = poolList.filter(pool => pool.overallStatus === 'healthy').length;

  const handleSensorClick = (poolId: string, sensorId: SensorId) => {
    setSelectedPool(poolId);
    setModalSensor(sensorId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {!selectedPool && (
          <>
            <section className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(237,252,243,0.92))] p-5 shadow-[0_30px_90px_-50px_rgba(7,130,95,0.65)]">
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(13,187,108,0.18),transparent_62%)]" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[2rem]">Havuzlar</h2>
                    <InfoHint label="Kartlara tiklayarak havuz icine girer, sensor kartina tiklayarak detay modalini acarsin." />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">AICO izleme yuzu</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Havuz', value: `${totalPools}` },
                    { label: 'Sensor', value: `${totalSensors}` },
                    { label: 'Uyari', value: `${totalAnomalies}` },
                    { label: 'Stabil', value: `${healthyPools}` },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-full border border-border/70 bg-white/76 px-3 py-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</span>
                      <span className="ml-2 font-display text-lg font-semibold text-foreground">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-[1rem] border border-status-critical/20 bg-status-critical/8 px-3 py-2 text-xs text-status-critical">
                  {error}
                </div>
              )}
            </section>

            {loading && poolList.length === 0 && (
              <div className="rounded-[1.5rem] border border-border/70 bg-card/88 px-4 py-8 text-center text-sm text-muted-foreground">
                Havuz verileri yukleniyor...
              </div>
            )}

            {!loading && poolList.length === 0 && (
              <div className="rounded-[1.5rem] border border-border/70 bg-card/88 px-4 py-8 text-center text-sm text-muted-foreground">
                Bu kullanici icin pool kaydi bulunamadi.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {poolList.map(pool => {
                const unread = pool.anomalies.filter(a => !a.read).length;
                const hasCritical = pool.overallStatus === 'critical';

                return (
                  <button
                    key={pool.config.id}
                    onClick={() => setSelectedPool(pool.config.id)}
                    className={cn(
                      'group relative overflow-hidden rounded-[1.8rem] border p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_30px_70px_-45px_rgba(7,130,95,0.7)]',
                      'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,252,246,0.92))]',
                      hasCritical ? 'border-status-critical/35 ring-1 ring-status-critical/20' : 'border-border/70',
                    )}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(13,187,108,0.16),transparent_70%)]" />
                    {unread > 0 && (
                      <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-status-warning/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-status-warning">
                        <AlertTriangle className="h-3 w-3" />
                        {unread} uyari
                      </div>
                    )}

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.28em] text-primary/75">Habitat</p>
                          <h3 className="font-display mt-2 text-2xl font-semibold text-foreground">{pool.config.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{pool.config.location}</p>
                        </div>
                        <div className="mt-1 rounded-full border border-border/80 bg-white/80 p-2 text-muted-foreground transition-colors group-hover:text-primary">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-2">
                        <div className={cn('h-2.5 w-2.5 rounded-full', statusDot[pool.overallStatus])} />
                        <span className={cn(
                          'text-xs font-semibold uppercase tracking-[0.18em]',
                          pool.overallStatus === 'critical' && 'text-status-critical',
                          pool.overallStatus === 'warning' && 'text-status-warning',
                          pool.overallStatus === 'healthy' && 'text-status-healthy',
                        )}>
                          {statusLabel[pool.overallStatus]}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        {SENSOR_IDS.map(id => {
                          const s = pool.sensors[id];
                          return (
                            <div key={id} className="rounded-[1rem] border border-border/65 bg-white/72 px-3 py-2">
                              <span className="block text-[9px] uppercase tracking-[0.24em] text-muted-foreground">{s.config.label}</span>
                              <span className={cn(
                                'mt-2 block text-sm font-semibold tabular-nums',
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
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedPool && openPool && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(234,250,239,0.92))] px-4 py-3 shadow-[0_26px_70px_-52px_rgba(7,130,95,0.75)]">
              <button
                onClick={() => setSelectedPool(null)}
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/76 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Tum havuzlar
              </button>

              <div className={cn('ml-1 h-2.5 w-2.5 rounded-full', statusDot[openPool.overallStatus])} />
              <span className="font-display text-xl font-semibold text-foreground">{openPool.config.name}</span>
              <span className="text-sm text-muted-foreground">{openPool.config.location}</span>
              <InfoHint label="Bu satir secili havuzu gosterir. Asagidaki sensor kartlariyla detay modalina inebilirsin." />

              <div className="ml-auto flex flex-wrap gap-2">
                <div className="rounded-full border border-border/70 bg-white/76 px-3 py-1.5 text-xs text-muted-foreground">
                  Sensor <span className="ml-1 font-semibold text-foreground">{SENSOR_IDS.length}</span>
                </div>
                <div className="rounded-full border border-border/70 bg-white/76 px-3 py-1.5 text-xs text-muted-foreground">
                  Uyari <span className="ml-1 font-semibold text-foreground">{openPool.anomalies.filter(a => !a.read).length}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
