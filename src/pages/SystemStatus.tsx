import { useEffect, useState, type FormEvent } from 'react';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { getSensorConnectionMessage, hasSystemStatusData } from '@/lib/sensors/display';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SENSOR_IDS, SENSOR_CONFIGS } from '@/lib/sensors/types';
import { loadCalibrations, subscribeCalibrationChanges } from '@/lib/sensors/calibration';
import { buildDevNotices } from '@/lib/sensors/devDiagnostics';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Activity, Battery, Clock, Copy, Plus, RadioTower, Terminal, Wifi } from 'lucide-react';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}s`;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

function rssiLabel(rssi: number): string {
  if (rssi > -50) return 'Mükemmel';
  if (rssi > -60) return 'İyi';
  if (rssi > -70) return 'Orta';
  return 'Zayıf';
}

const MIN_DEVICE_CYCLE_MS = 10000;

function isFresh(lastSync: Date, expectedIntervalMs: number): boolean {
  const thresholdMs = Math.max(expectedIntervalMs, MIN_DEVICE_CYCLE_MS) * 3;
  return lastSync.getTime() > 0 && Date.now() - lastSync.getTime() < thresholdMs;
}

export default function SystemStatus() {
  const { pools, createPool, claimPool, devMode } = useSensorData();
  const poolList = Object.values(pools).sort((left, right) => left.config.sortOrder - right.config.sortOrder);
  const [calibrations, setCalibrations] = useState(() => loadCalibrations());
  useEffect(() => subscribeCalibrationChanges(() => setCalibrations(loadCalibrations())), []);
  const systemInfo = poolList[0]?.systemInfo;
  const hasStatusData = hasSystemStatusData(systemInfo);

  const [newPoolName, setNewPoolName] = useState('');
  const [newPoolLocation, setNewPoolLocation] = useState('');
  const [creatingPool, setCreatingPool] = useState(false);
  const [copiedPoolId, setCopiedPoolId] = useState<string | null>(null);

  const [claimId, setClaimId] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const summary = {
    uptime: systemInfo?.uptime ?? 0,
    rssi: systemInfo?.rssi ?? -100,
    voltage: systemInfo?.voltage ?? 0,
    lastSync: systemInfo?.lastSync ?? new Date(0),
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

  const handleCreatePool = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPoolName.trim()) return;
    setCreatingPool(true);
    try {
      await createPool({ name: newPoolName, location: newPoolLocation });
      setNewPoolName('');
      setNewPoolLocation('');
    } finally {
      setCreatingPool(false);
    }
  };

  const handleClaimPool = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!claimId.trim()) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await claimPool({ poolId: claimId, name: claimName });
      setClaimId('');
      setClaimName('');
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Havuz eklenemedi.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <section className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Sistem</h2>
            </div>
            <span className="text-xs text-muted-foreground">Bağlantı ve telemetri</span>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { icon: Clock, label: 'Çalışma', value: hasStatusData ? formatUptime(summary.uptime) : '—' },
            { icon: Wifi, label: 'Sinyal', value: hasStatusData ? `${summary.rssi} dBm · ${rssiLabel(summary.rssi)}` : '—' },
            { icon: Battery, label: 'Voltaj', value: hasStatusData ? `${summary.voltage.toFixed(2)} V` : '—' },
            { icon: Activity, label: 'Son Veri', value: hasStatusData ? summary.lastSync.toLocaleTimeString('tr-TR') : '—' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </span>
                <span className="block truncate font-display text-sm font-semibold tabular-nums text-foreground">
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {poolList.map(pool => {
          const fresh = isFresh(pool.systemInfo.lastSync, pool.config.alarmSettings.readingIntervalMs);
          const statusLabel = !hasSystemStatusData(pool.systemInfo)
            ? 'Veri yok'
            : fresh
              ? 'Çevrimiçi'
              : 'Veri güncel değil';
          const statusTone = !hasSystemStatusData(pool.systemInfo) || !fresh
            ? 'border-status-offline/40 bg-status-offline/12 text-muted-foreground'
            : 'border-status-healthy/40 bg-status-healthy/12 text-status-healthy';

          return (
            <section
              key={pool.config.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-foreground">{pool.config.name}</h3>
                  {pool.config.location && (
                    <p className="text-xs text-muted-foreground">{pool.config.location}</p>
                  )}
                </div>
                <span className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
                  statusTone,
                )}>
                  {statusLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {SENSOR_IDS.map(id => {
                  const sensor = pool.sensors[id];
                  const connectionMessage = getSensorConnectionMessage(sensor.connectionIssue);
                  const isFaulty = sensor.connectionIssue === 'faulty';
                  const missedOnce = sensor.connectionIssue === 'missed_once';
                  const isConnected = !connectionMessage && pool.systemInfo.sensorConnections[id] && fresh;
                  const label = isFaulty
                    ? 'Veri yok'
                    : missedOnce
                      ? 'Bekleniyor'
                      : isConnected
                        ? 'Çevrimiçi'
                        : 'Çevrimdışı';
                  const tone = isFaulty || (!missedOnce && !isConnected)
                    ? 'bg-status-offline text-muted-foreground'
                    : missedOnce
                      ? 'bg-status-warning text-status-warning'
                      : 'bg-status-healthy text-status-healthy';
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2"
                    >
                      <span className="truncate text-xs font-medium text-foreground">{SENSOR_CONFIGS[id].label}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className={cn('h-2 w-2 rounded-full', tone.split(' ')[0])} />
                        <span className={cn('text-[10px] font-semibold uppercase tracking-[0.1em]', tone.split(' ')[1])}>
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {devMode && (() => {
                const notices = buildDevNotices(pool, calibrations);
                const raw = pool.systemInfo.diagnostics.rawVoltage ?? {};
                const diag = pool.systemInfo.diagnostics;
                return (
                  <div className="mt-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Geliştirici Bildirimleri</span>
                    </div>

                    {notices.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Bildirim yok — kalibrasyon ve cihaz tanılaması normal.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {notices.map(notice => (
                          <li
                            key={notice.id}
                            className={cn(
                              'rounded-lg border px-2.5 py-1.5',
                              notice.level === 'critical'
                                ? 'border-status-critical/40 bg-status-critical/10'
                                : notice.level === 'warning'
                                  ? 'border-status-warning/40 bg-status-warning/10'
                                  : 'border-border/60 bg-muted/30',
                            )}
                          >
                            <p className="text-[11px] font-semibold text-foreground">{notice.title}</p>
                            <p className="text-[11px] text-muted-foreground">{notice.detail}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-2 font-mono text-[10px] text-muted-foreground">
                      {typeof diag.freeHeap === 'number' && <span>heap: {diag.freeHeap} B</span>}
                      {typeof diag.maxBlock === 'number' && <span>maxBlock: {diag.maxBlock} B</span>}
                      {typeof diag.adsOk === 'boolean' && <span>ADS: {diag.adsOk ? 'OK' : 'HATA'}</span>}
                      {typeof diag.readingIntervalMs === 'number' && <span>interval: {(diag.readingIntervalMs / 1000).toFixed(1)} sn</span>}
                      {typeof diag.cachedSettingsLoaded === 'boolean' && <span>cache: {diag.cachedSettingsLoaded ? 'OK' : 'varsayilan'}</span>}
                      {typeof diag.settingsSaveCount === 'number' && <span>cacheWrite: {diag.settingsSaveCount}</span>}
                      {Object.entries(raw).map(([id, v]) => (
                        <span key={id}>{id}: {Number(v).toFixed(3)} V</span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>
          );
        })}

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold text-foreground">Havuz Yönetimi</h3>
            <span className="text-xs text-muted-foreground">({poolList.length})</span>
          </div>

          <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-medium text-foreground">
              Cihaz kimliğiyle havuz ekle
            </p>
            <form className="flex flex-col gap-1.5 sm:flex-row" onSubmit={handleClaimPool}>
              <Input
                placeholder="Havuz / cihaz kimliği (UUID)"
                value={claimId}
                onChange={event => setClaimId(event.target.value)}
                className="h-9 flex-[2] font-mono text-xs"
              />
              <Input
                placeholder="Havuz adı (opsiyonel)"
                value={claimName}
                onChange={event => setClaimName(event.target.value)}
                className="h-9 flex-1"
              />
              <Button size="sm" className="h-9 shrink-0 gap-1" disabled={claiming || !claimId.trim()} type="submit">
                <Plus className="h-3.5 w-3.5" />
                {claiming ? 'Ekleniyor' : 'Cihazı ekle'}
              </Button>
            </form>
            {claimError && (
              <p className="mt-1.5 text-[11px] text-destructive">{claimError}</p>
            )}
          </div>

          <p className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Veya boş havuz oluştur
          </p>
          <form className="flex flex-col gap-1.5 sm:flex-row" onSubmit={handleCreatePool}>
            <Input
              placeholder="Yeni havuz adı"
              value={newPoolName}
              onChange={event => setNewPoolName(event.target.value)}
              className="h-9 flex-1"
            />
            <Input
              placeholder="Konum (opsiyonel)"
              value={newPoolLocation}
              onChange={event => setNewPoolLocation(event.target.value)}
              className="h-9 flex-1"
            />
            <Button size="sm" className="h-9 shrink-0 gap-1" disabled={creatingPool || !newPoolName.trim()} type="submit">
              <Plus className="h-3.5 w-3.5" />
              {creatingPool ? 'Ekleniyor' : 'Havuz ekle'}
            </Button>
          </form>

          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              ESP cihaz kimlikleri
            </p>
            {poolList.map(pool => (
              <div
                key={pool.config.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/65 bg-muted/30 px-3 py-2"
              >
                <span className="font-display text-sm font-semibold text-foreground">{pool.config.name}</span>
                {pool.config.location && (
                  <span className="text-xs text-muted-foreground">{pool.config.location}</span>
                )}
                <code className="ml-auto break-all rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {pool.config.id}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void handleCopyPoolId(pool.config.id)}
                  title={copiedPoolId === pool.config.id ? 'Kopyalandı' : 'Kimliği kopyala'}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
