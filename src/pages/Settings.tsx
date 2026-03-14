import { useState } from 'react';
import { useSensorData } from '@/lib/sensors/DataProvider';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SENSOR_IDS, SENSOR_CONFIGS } from '@/lib/sensors/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { refreshInterval, setRefreshInterval } = useSensorData();
  const [interval, setInterval] = useState(refreshInterval / 1000);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configuration & thresholds</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground">Data Refresh</h2>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              className="w-24"
              min={1}
              max={60}
            />
            <span className="text-sm text-muted-foreground">seconds</span>
            <button
              onClick={() => setRefreshInterval(interval * 1000)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground">Sensor Thresholds</h2>
          <div className="space-y-4">
            {SENSOR_IDS.map(id => {
              const c = SENSOR_CONFIGS[id];
              return (
                <div key={id} className="grid grid-cols-5 gap-3 items-center">
                  <span className="text-xs font-medium text-foreground col-span-1">{c.label}</span>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Warn Min</Label>
                    <Input defaultValue={c.warningMin} className="mt-0.5" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Warn Max</Label>
                    <Input defaultValue={c.warningMax} className="mt-0.5" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Crit Min</Label>
                    <Input defaultValue={c.criticalMin} className="mt-0.5" type="number" step="0.1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Crit Max</Label>
                    <Input defaultValue={c.criticalMax} className="mt-0.5" type="number" step="0.1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-card/50 p-5">
          <h2 className="text-sm font-medium text-foreground mb-2">Data Source Integration</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Currently using mock data. Replace the <code className="text-foreground bg-muted px-1 py-0.5 rounded text-[11px]">DataProvider</code> with
            your ESP32 API endpoint, WebSocket, or MQTT broker for live data.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
