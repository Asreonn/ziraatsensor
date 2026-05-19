import { useState } from 'react';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { formatSensorValue, getSensorDisplayStatus } from '@/lib/sensors/display';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { SensorDetailModal } from '@/components/dashboard/SensorDetailModal';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SENSOR_IDS, SensorId } from '@/lib/sensors/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, Bell, ChevronRight } from 'lucide-react';
import { AnomalyFeed } from '@/components/dashboard/AnomalyFeed';
import { PoolExportPanel } from '@/components/dashboard/PoolExportPanel';

const statusDot: Record<string, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  offline: 'bg-status-offline',
};

const statusLabel: Record<string, string> = {
  healthy: 'Stabil',
  warning: 'Uyarı',
  critical: 'Kritik',
  offline: 'Çevrimdışı',
};

export default function Overview() {
  const { pools, loading, error, markAnomaliesRead } = useSensorData();
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [modalSensor, setModalSensor] = useState<SensorId | null>(null);
  const [copiedPoolId, setCopiedPoolId] = useState<string | null>(null);

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

  const handleCopyPoolId = async (poolId: string) => {
    try {
      await navigator.clipboard.writeText(poolId);
      setCopiedPoolId(poolId);
      window.setTimeout(() => {
        setCopiedPoolId(current => (current === poolId ? null : current));
      }, 1400);
    } catch {
      setCopiedPoolId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {!selectedPool && (
          <>
            <section className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-card p-4 md:p-5 shadow-sm">
              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">Havuzlar</h2>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: 'Havuz', value: `${totalPools}` },
                    { label: 'Sensör', value: `${totalSensors}` },
                    { label: 'Uyarı', value: `${totalAnomalies}`, accent: totalAnomalies > 0 },
                    { label: 'Stabil', value: `${healthyPools}` },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                        stat.accent
                          ? 'border-status-warning/40 bg-status-warning/12 text-status-warning'
                          : 'border-border/70 bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-[0.14em]">{stat.label}</span>
                      <span className="font-display text-sm font-semibold tabular-nums text-foreground">{stat.value}</span>
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
              <div className="rounded-[1.5rem] border border-border/70 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                Havuz verileri yükleniyor...
              </div>
            )}

            {!loading && poolList.length === 0 && (
              <div className="rounded-[1.5rem] border border-border/70 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                Bu kullanıcı için havuz kaydı bulunamadı.
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
                      'group relative overflow-hidden rounded-[1.8rem] border p-4 md:p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                      'bg-card',
                      hasCritical ? 'border-status-critical/35 ring-1 ring-status-critical/15' : 'border-border/70',
                    )}
                  >
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.28em] text-primary/75">Havuz</p>
                          <h3 className="font-display mt-2 text-2xl font-semibold text-foreground">{pool.config.name}</h3>
                          {pool.config.location && (
                            <p className="mt-1 text-sm text-muted-foreground">{pool.config.location}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {unread > 0 && (
                            <div className="flex items-center gap-1 rounded-full bg-status-warning/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-status-warning">
                              <AlertTriangle className="h-3 w-3" />
                              {unread}
                            </div>
                          )}
                          <div className="rounded-full border border-border/80 bg-muted/40 p-2 text-muted-foreground transition-colors group-hover:text-primary">
                            <ChevronRight className="h-4 w-4" />
                          </div>
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
                          const displayStatus = getSensorDisplayStatus(s);
                          return (
                            <div className={cn(
                              'rounded-[1rem] border px-2.5 py-1.5',
                              displayStatus === 'offline'
                                ? 'border-dashed border-border/60 bg-muted/20'
                                : 'border-border/65 bg-muted/30',
                            )} key={id}>
                              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.config.label}</span>
                              <span className={cn(
                                'mt-2 block text-sm font-semibold tabular-nums',
                                displayStatus === 'critical' && 'text-status-critical',
                                displayStatus === 'warning' && 'text-status-warning',
                                displayStatus === 'healthy' && 'text-foreground',
                                displayStatus === 'offline' && 'text-muted-foreground/70',
                              )}>
                                {displayStatus === 'offline' ? '—' : formatSensorValue(s.current, s.config.id, s.config.id === 'ph' ? 1 : 0)}
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
            <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm md:p-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPool(null)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  title="Tüm havuzlar"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tüm havuzlar</span>
                </button>
                <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusDot[openPool.overallStatus])} />
                <span className="truncate font-display text-base font-semibold text-foreground md:text-lg">
                  {openPool.config.name}
                </span>
                {openPool.config.location && (
                  <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                    {openPool.config.location}
                  </span>
                )}
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{SENSOR_IDS.length}</span>{' '}
                    <span className="hidden sm:inline">sensör</span>
                    <span className="sm:hidden">sns</span>
                  </span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[11px]',
                    openPool.anomalies.filter(a => !a.read).length > 0
                      ? 'bg-status-warning/15 text-status-warning'
                      : 'bg-muted/40 text-muted-foreground',
                  )}>
                    <span className="font-semibold">{openPool.anomalies.filter(a => !a.read).length}</span>{' '}
                    <span className="hidden sm:inline">uyarı</span>
                    <span className="sm:hidden">uy</span>
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyPoolId(openPool.config.id)}
                  className="min-w-0 flex-1 truncate rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted"
                  title={copiedPoolId === openPool.config.id ? 'Kopyalandı' : 'Kimliği kopyala'}
                >
                  {copiedPoolId === openPool.config.id ? 'Kopyalandı' : openPool.config.id}
                </button>
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

            <div className="flex justify-end">
              <PoolExportPanel pool={openPool} />
            </div>

            <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold text-foreground">Genel Uyarılar</h3>
                {openPool.anomalies.length > 0 && (
                  <span className="ml-auto rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {openPool.anomalies.length}
                  </span>
                )}
              </div>
              <AnomalyFeed anomalies={openPool.anomalies} limit={12} />
            </section>
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
