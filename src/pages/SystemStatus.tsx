import { useSensorData } from '@/lib/sensors/DataProvider';
import { getSensorConnectionMessage, hasSystemStatusData } from '@/lib/sensors/display';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { InfoHint } from '@/components/ui/info-hint';
import { SENSOR_IDS, SENSOR_CONFIGS } from '@/lib/sensors/types';
import { cn } from '@/lib/utils';
import { Activity, Battery, Clock, RadioTower, Wifi } from 'lucide-react';

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
  const { pools } = useSensorData();
  const poolList = Object.values(pools).sort((left, right) => left.config.sortOrder - right.config.sortOrder);
  const systemInfo = poolList[0]?.systemInfo;
  const hasStatusData = hasSystemStatusData(systemInfo);

  const summary = {
    uptime: systemInfo?.uptime ?? 0,
    rssi: systemInfo?.rssi ?? -100,
    voltage: systemInfo?.voltage ?? 0,
    lastSync: systemInfo?.lastSync ?? new Date(0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[1.8rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,252,243,0.92))] p-5 shadow-[0_30px_80px_-55px_rgba(7,130,95,0.75)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-primary" />
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">Sistem</h2>
              <InfoHint label="Bu ekran gateway, guc ve sensör hat baglantilarini izler. Offline sensorler kritik olarak isaretlenir." />
            </div>
            <div className="rounded-full border border-border/70 bg-white/76 px-3 py-1.5 text-xs text-muted-foreground">
              Havuz baglanti durumu
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, label: 'Uptime', value: hasStatusData ? formatUptime(summary.uptime) : 'Yok' },
            { icon: Wifi, label: 'RSSI', value: hasStatusData ? `${summary.rssi} dBm (${rssiLabel(summary.rssi)})` : 'Yok' },
            { icon: Battery, label: 'Voltage', value: hasStatusData ? `${summary.voltage.toFixed(2)}V` : 'Yok' },
            { icon: Activity, label: 'Last Sync', value: hasStatusData ? summary.lastSync.toLocaleTimeString('tr-TR') : 'Yok' },
          ].map(stat => (
            <div key={stat.label} className="rounded-[1.6rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,252,246,0.9))] p-5 shadow-[0_25px_65px_-48px_rgba(7,130,95,0.75)]">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <stat.icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <span className="mt-4 block font-display text-2xl font-semibold tabular-nums text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>

        {poolList.map(pool => {
          return (
            <section
              key={pool.config.id}
              className="rounded-[2rem] border border-border/70 bg-card/88 p-6 shadow-[0_30px_80px_-55px_rgba(7,130,95,0.75)]"
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-primary/80">Sensor hatlari</p>
                  <h3 className="font-display mt-2 text-2xl font-semibold text-foreground">{pool.config.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pool.config.location}</p>
                </div>
                <div className="rounded-full border border-border/80 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
                  {hasSystemStatusData(pool.systemInfo)
                    ? pool.overallStatus === 'critical' ? 'Sahada kontrol onerilir' : 'Hatlar cevap veriyor'
                    : 'Supabase durumu bekleniyor'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SENSOR_IDS.map(id => {
                  const sensor = pool.sensors[id];
                  const connectionMessage = getSensorConnectionMessage(sensor.connectionIssue);
                  const isFaulty = sensor.connectionIssue === 'faulty';
                  const missedOnce = sensor.connectionIssue === 'missed_once';
                  const isConnected = !connectionMessage && pool.systemInfo.sensorConnections[id];
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-[1.3rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,252,246,0.88))] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">{SENSOR_CONFIGS[id].label}</span>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          isFaulty ? 'bg-status-critical' : missedOnce ? 'bg-status-warning' : isConnected ? 'bg-status-healthy' : 'bg-status-critical'
                        )} />
                        <span className={cn(
                          'text-xs font-semibold uppercase tracking-[0.14em]',
                          isFaulty ? 'text-status-critical' : missedOnce ? 'text-status-warning' : isConnected ? 'text-status-healthy' : 'text-status-critical'
                        )}>
                          {isFaulty ? 'Sensor bozuk' : missedOnce ? 'Veri alinmadi' : isConnected ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
