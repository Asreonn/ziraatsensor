import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { InfoHint } from '@/components/ui/info-hint';
import { SENSOR_IDS, SENSOR_CONFIGS } from '@/lib/sensors/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal, Waves } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { refreshInterval, setRefreshInterval, dataMode, setDataMode, error } = useSensorData();
  const [interval, setInterval] = useState(refreshInterval / 1000);
  const [savingInterval, setSavingInterval] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => {
    setInterval(refreshInterval / 1000);
  }, [refreshInterval]);

  const handleRefreshApply = async () => {
    setSavingInterval(true);
    await setRefreshInterval(interval * 1000);
    setSavingInterval(false);
  };

  const handleModeChange = async (checked: boolean) => {
    setSavingMode(true);
    await setDataMode(checked ? 'mock' : 'live');
    setSavingMode(false);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[1.8rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,252,243,0.92))] p-5 shadow-[0_30px_80px_-55px_rgba(7,130,95,0.75)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">Ayarlar</h2>
              <InfoHint label="Buradan yenileme hizi ve sensor esikleri ayarlanir. Gercek veri entegrasyonu yine veri katmanindan yapilir." />
            </div>
            <div className="rounded-full border border-border/70 bg-white/76 px-3 py-1.5 text-xs text-muted-foreground">
              {user?.email ?? 'Kimlik dogrulandi'}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-[1rem] border border-status-critical/20 bg-status-critical/8 px-4 py-3 text-sm text-status-critical">
            {error}
          </div>
        )}

        <div className="rounded-[2rem] border border-border/70 bg-card/88 p-6 shadow-[0_30px_80px_-55px_rgba(7,130,95,0.75)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Data mode</h2>
              <p className="mt-2 text-sm text-foreground">
                Test acik ise rastgele veri uret, kapali ise Supabase verisini goster.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-border/70 bg-white/76 px-4 py-2">
              <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${dataMode === 'mock' ? 'text-primary' : 'text-muted-foreground'}`}>
                Test
              </span>
              <Switch checked={dataMode === 'mock'} disabled={savingMode} onCheckedChange={handleModeChange} />
              <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${dataMode === 'live' ? 'text-primary' : 'text-muted-foreground'}`}>
                Reel
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card/88 p-6 shadow-[0_30px_80px_-55px_rgba(7,130,95,0.75)]">
          <div className="flex items-center gap-2 text-primary">
            <Waves className="h-4 w-4" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em]">Data refresh</h2>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-[1.3rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,252,246,0.9))] px-4 py-3">
              <Input
                type="number"
                value={interval}
                onChange={e => setInterval(Number(e.target.value))}
                className="w-24 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                min={1}
                max={60}
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>

            <button
              onClick={handleRefreshApply}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_18px_36px_-22px_rgba(7,130,95,0.7)] transition-colors hover:bg-primary/90"
            >
              {savingInterval ? 'Kaydediliyor...' : 'Uygula'}
            </button>

            <InfoHint label="Daha dusuk saniye degeri daha sik veri ceker. Gercek donanimda bu ag trafigini artirir." />
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card/88 p-6 shadow-[0_30px_80px_-55px_rgba(7,130,95,0.75)]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Sensor thresholds</h2>

          <div className="mt-5 space-y-4">
            {SENSOR_IDS.map(id => {
              const c = SENSOR_CONFIGS[id];
              return (
                <div
                  key={id}
                  className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,252,246,0.9))] p-4 lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]"
                >
                  <div className="flex items-center">
                    <span className="font-display text-lg font-semibold text-foreground">{c.label}</span>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Warn Min</Label>
                    <Input defaultValue={c.warningMin} className="mt-1" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Warn Max</Label>
                    <Input defaultValue={c.warningMax} className="mt-1" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Crit Min</Label>
                    <Input defaultValue={c.criticalMin} className="mt-1" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Crit Max</Label>
                    <Input defaultValue={c.criticalMax} className="mt-1" type="number" step="0.1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-dashed border-border bg-card/75 p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Data source integration</h2>
            <InfoHint label="Canli sisteme gecmek icin DataProvider katmanini kendi API, WebSocket veya MQTT baglantinizla degistirin." />
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card/75 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Session</h2>
              <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={() => { void signOut(); }}
              className="rounded-full border border-border/70 bg-white/76 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white"
              type="button"
            >
              Cikis yap
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
