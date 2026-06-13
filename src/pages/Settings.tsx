import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import {
  SENSOR_IDS,
  SENSOR_CONFIGS,
  SensorId,
  SensorThresholdConfig,
  getDefaultAlarmSettings,
  getDefaultSensorThresholds,
} from '@/lib/sensors/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { BellRing, LogOut, Settings2, SlidersHorizontal, Volume2, VolumeX, Waves } from 'lucide-react';
import { SensorCalibrationDialog } from '@/components/dashboard/SensorCalibrationDialog';
import { clearCalibration, loadCalibrations, subscribeCalibrationChanges } from '@/lib/sensors/calibration';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const {
    refreshInterval,
    setRefreshInterval,
    dataMode,
    setDataMode,
    devMode,
    setDevMode,
    updatePoolThresholds,
    updatePoolAlarmSettings,
    error,
    pools,
  } = useSensorData();
  const firstPool = Object.values(pools).sort((left, right) => left.config.sortOrder - right.config.sortOrder)[0];
  const [interval, setInterval] = useState(refreshInterval / 1000);
  const [savingInterval, setSavingInterval] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [savingDev, setSavingDev] = useState(false);
  const [savingAlarm, setSavingAlarm] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState<Record<SensorId, SensorThresholdConfig>>(() => getDefaultSensorThresholds());
  const [calibrationTarget, setCalibrationTarget] = useState<SensorId | null>(null);
  const [calibrations, setCalibrations] = useState(() => loadCalibrations());

  useEffect(() => {
    setInterval(refreshInterval / 1000);
  }, [refreshInterval]);

  useEffect(() => {
    return subscribeCalibrationChanges(() => setCalibrations(loadCalibrations()));
  }, []);

  const firstPoolId = firstPool?.config.id;
  const firstPoolThresholds = firstPool?.config.thresholds;

  useEffect(() => {
    if (firstPoolThresholds) {
      setThresholdDraft(firstPoolThresholds);
    }
  }, [firstPoolId, firstPoolThresholds]);

  const alarmSettings = firstPool?.config.alarmSettings ?? getDefaultAlarmSettings();
  const liveValueFor = (id: SensorId): number | null => {
    const reading = firstPool?.sensors?.[id]?.current;
    if (!reading || reading.status === 'offline') return null;
    return reading.value;
  };

  const handleRefreshApply = async () => {
    setSavingInterval(true);
    await setRefreshInterval(interval * 1000);
    setSavingInterval(false);
  };

  const handleModeChange = async (checked: boolean) => {
    setSavingMode(true);
    await setDataMode(checked ? 'live' : 'mock');
    setSavingMode(false);
  };

  const handleDevChange = async (checked: boolean) => {
    setSavingDev(true);
    await setDevMode(checked);
    setSavingDev(false);
  };

  const handleAlarmPatch = async (patch: Parameters<typeof updatePoolAlarmSettings>[1]) => {
    if (!firstPool) return;
    setSavingAlarm(true);
    try {
      await updatePoolAlarmSettings(firstPool.config.id, patch);
    } finally {
      setSavingAlarm(false);
    }
  };

  const handleThresholdFieldChange = (id: SensorId, field: keyof SensorThresholdConfig, value: number) => {
    setThresholdDraft(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const handleThresholdApply = async () => {
    if (!firstPool) return;
    setSavingThresholds(true);
    try {
      await updatePoolThresholds(firstPool.config.id, thresholdDraft);
    } finally {
      setSavingThresholds(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-3">
        <section className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Ayarlar</h2>
            </div>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Veri Modu</h3>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5">
              <span className={`text-xs font-semibold ${dataMode === 'mock' ? 'text-primary' : 'text-muted-foreground'}`}>
                Test
              </span>
              <Switch checked={dataMode === 'live'} disabled={savingMode} onCheckedChange={handleModeChange} />
              <span className={`text-xs font-semibold ${dataMode === 'live' ? 'text-primary' : 'text-muted-foreground'}`}>
                Reel
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Geliştirici Ayarları</h3>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5">
              <span className={`text-xs font-semibold ${devMode ? 'text-primary' : 'text-muted-foreground'}`}>
                {devMode ? 'Açık' : 'Kapalı'}
              </span>
              <Switch checked={devMode} disabled={savingDev} onCheckedChange={handleDevChange} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Veri Yenileme</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-3 py-1">
                <Input
                  type="number"
                  value={interval}
                  onChange={e => setInterval(Number(e.target.value))}
                  className="h-7 w-14 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                  min={1}
                  max={60}
                />
                <span className="text-xs text-muted-foreground">sn</span>
              </div>
              <Button size="sm" onClick={handleRefreshApply} disabled={savingInterval}>
                {savingInterval ? 'Kaydediliyor...' : 'Uygula'}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Buzzer Alarmı</h3>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={alarmSettings.buzzerMuted ? 'default' : 'outline'}
                className="gap-1.5"
                disabled={!firstPool || savingAlarm}
                onClick={() => { void handleAlarmPatch({ buzzerMuted: !alarmSettings.buzzerMuted }); }}
              >
                {alarmSettings.buzzerMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {alarmSettings.buzzerMuted ? 'Susturuldu' : 'Sustur'}
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5">
                <span className={`text-xs font-semibold ${alarmSettings.buzzerEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
                  {alarmSettings.buzzerEnabled ? 'Açık' : 'Kapalı'}
                </span>
                <Switch
                  checked={alarmSettings.buzzerEnabled}
                  disabled={!firstPool || savingAlarm}
                  onCheckedChange={checked => { void handleAlarmPatch({ buzzerEnabled: checked }); }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {SENSOR_IDS.map(id => {
              const config = SENSOR_CONFIGS[id];
              const checked = alarmSettings.alarmSensors[id];
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-foreground">{config.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{config.unit || 'ölçüm'}</span>
                  </div>
                  <Switch
                    checked={checked}
                    disabled={!firstPool || savingAlarm}
                    onCheckedChange={next => { void handleAlarmPatch({ alarmSensors: { [id]: next } }); }}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <details className="group rounded-2xl border border-border/70 bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Sensör Eşikleri</h3>
            <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
          </summary>

          <div className="space-y-2 border-t border-border/60 px-3 py-3 md:px-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => { void handleThresholdApply(); }}
                disabled={!firstPool || savingThresholds}
              >
                {savingThresholds ? 'Kaydediliyor...' : 'Eşikleri Kaydet'}
              </Button>
            </div>
            {SENSOR_IDS.map(id => {
              const c = SENSOR_CONFIGS[id];
              const cal = calibrations[id];
              const draft = thresholdDraft[id] ?? firstPool?.config.thresholds[id] ?? {
                warningMin: c.warningMin,
                warningMax: c.warningMax,
                criticalMin: c.criticalMin,
                criticalMax: c.criticalMax,
              };
              return (
                <div
                  key={id}
                  className="rounded-xl border border-border/60 bg-muted/25 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-foreground">{c.label}</span>
                      <span className="text-[11px] text-muted-foreground">{c.unit}</span>
                      {cal && (
                        <span className="rounded-full border border-status-healthy/40 bg-status-healthy/10 px-1.5 py-0.5 font-mono text-[10px] text-status-healthy">
                          y = {cal.slope.toFixed(3)}x {cal.intercept >= 0 ? '+' : '−'} {Math.abs(cal.intercept).toFixed(3)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {cal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-status-critical"
                          onClick={() => clearCalibration(id)}
                        >
                          Sıfırla
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={cal ? 'outline' : 'default'}
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => setCalibrationTarget(id)}
                      >
                        <Settings2 className="h-3 w-3" />
                        {cal ? 'Yeniden kalibre' : 'Kalibre et'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div>
                      <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Uyarı Min</Label>
                      <Input
                        value={draft.warningMin}
                        onChange={e => handleThresholdFieldChange(id, 'warningMin', Number(e.target.value))}
                        className="mt-0.5 h-8"
                        type="number"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Uyarı Maks</Label>
                      <Input
                        value={draft.warningMax}
                        onChange={e => handleThresholdFieldChange(id, 'warningMax', Number(e.target.value))}
                        className="mt-0.5 h-8"
                        type="number"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-[0.12em] text-status-critical">Kritik Min</Label>
                      <Input
                        value={draft.criticalMin}
                        onChange={e => handleThresholdFieldChange(id, 'criticalMin', Number(e.target.value))}
                        className="mt-0.5 h-8"
                        type="number"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-[0.12em] text-status-critical">Kritik Maks</Label>
                      <Input
                        value={draft.criticalMax}
                        onChange={e => handleThresholdFieldChange(id, 'criticalMax', Number(e.target.value))}
                        className="mt-0.5 h-8"
                        type="number"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        {calibrationTarget && (
          <SensorCalibrationDialog
            open={!!calibrationTarget}
            onOpenChange={open => {
              if (!open) setCalibrationTarget(null);
            }}
            sensorId={calibrationTarget}
            liveValue={liveValueFor(calibrationTarget)}
          />
        )}

        <section className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Oturum</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { void signOut(); }} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            Çıkış
          </Button>
        </section>
      </div>
    </DashboardLayout>
  );
}
