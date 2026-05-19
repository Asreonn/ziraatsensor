import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { PoolData, SENSOR_IDS, SensorId } from '@/lib/sensors/types';
import { hasSensorReading } from '@/lib/sensors/display';
import { cn } from '@/lib/utils';

type RangeKey = '1h' | '24h' | '7d' | '30d' | 'all';

const RANGES: Array<{ key: RangeKey; label: string; ms: number | null }> = [
  { key: '1h', label: 'Son 1 saat', ms: 60 * 60 * 1000 },
  { key: '24h', label: 'Son 24 saat', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: 'Son 1 hafta', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: 'Son 30 gün', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'Tüm kayıtlar', ms: null },
];

const SUPABASE_FETCH_LIMIT = 50_000;

interface Row {
  timestamp: Date;
  values: Partial<Record<SensorId, number>>;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildClientRows(pool: PoolData, sensorIds: SensorId[], fromMs: number | null): Row[] {
  const bucket = new Map<number, Partial<Record<SensorId, number>>>();
  for (const id of sensorIds) {
    const sensor = pool.sensors[id];
    for (const reading of sensor.history) {
      if (!hasSensorReading(reading)) continue;
      const ts = reading.timestamp.getTime();
      if (fromMs !== null && ts < fromMs) continue;
      const row = bucket.get(ts) ?? {};
      row[id] = reading.value;
      bucket.set(ts, row);
    }
  }
  return Array.from(bucket.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, values]) => ({ timestamp: new Date(ts), values }));
}

async function fetchSupabaseRows(
  poolId: string,
  sensorIds: SensorId[],
  fromMs: number | null,
): Promise<Row[]> {
  if (!supabase) return [];
  let query = supabase
    .from('sensor_readings')
    .select('sensor_id,value,recorded_at')
    .eq('pool_id', poolId)
    .in('sensor_id', sensorIds)
    .order('recorded_at', { ascending: true })
    .limit(SUPABASE_FETCH_LIMIT);

  if (fromMs !== null) {
    query = query.gte('recorded_at', new Date(fromMs).toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const bucket = new Map<number, Partial<Record<SensorId, number>>>();
  for (const row of data ?? []) {
    const ts = new Date(row.recorded_at).getTime();
    const id = row.sensor_id as SensorId;
    const value = typeof row.value === 'number' ? row.value : Number(row.value);
    if (!Number.isFinite(value)) continue;
    const entry = bucket.get(ts) ?? {};
    entry[id] = value;
    bucket.set(ts, entry);
  }
  return Array.from(bucket.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, values]) => ({ timestamp: new Date(ts), values }));
}

interface Props {
  pool: PoolData;
}

export function PoolExportPanel({ pool }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>('24h');
  const [selectedSensors, setSelectedSensors] = useState<Set<SensorId>>(new Set(SENSOR_IDS));
  const [supabaseRows, setSupabaseRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const rangeConfig = RANGES.find(r => r.key === range)!;
  const sensorKey = useMemo(
    () => SENSOR_IDS.filter(id => selectedSensors.has(id)).join(','),
    [selectedSensors],
  );

  const clientRowCount = useMemo(() => {
    const ids = sensorKey ? (sensorKey.split(',') as SensorId[]) : [];
    if (ids.length === 0) return 0;
    const fromMs = rangeConfig.ms === null ? null : Date.now() - rangeConfig.ms;
    return buildClientRows(pool, ids, fromMs).length;
  }, [pool, rangeConfig.ms, sensorKey]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setSupabaseRows(null);

    if (!supabase) {
      setFetchError('Supabase yapılandırılmamış');
      setLoading(false);
      return;
    }

    const ids = sensorKey ? (sensorKey.split(',') as SensorId[]) : [];
    if (ids.length === 0) {
      setSupabaseRows([]);
      setLoading(false);
      return;
    }

    const fromMs = rangeConfig.ms === null ? null : Date.now() - rangeConfig.ms;

    fetchSupabaseRows(pool.config.id, ids, fromMs)
      .then(rows => {
        if (!cancelled) setSupabaseRows(rows);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[export] Supabase fetch failed', err);
          setFetchError(err?.message ?? 'Veri alınamadı');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, pool.config.id, range, sensorKey, rangeConfig.ms]);

  const previewCount = supabaseRows
    ? supabaseRows.length
    : clientRowCount;

  const toggleSensor = (id: SensorId) => {
    setSelectedSensors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    const ids = SENSOR_IDS.filter(id => selectedSensors.has(id));
    if (ids.length === 0) return;
    const rows = supabaseRows && supabaseRows.length > 0
      ? supabaseRows
      : buildClientRows(pool, ids, fromMs);
    if (rows.length === 0) return;

    const header = ['timestamp', ...ids.map(id => `${pool.sensors[id].config.label} (${pool.sensors[id].config.unit})`)];
    const lines = [header.map(escapeCsv).join(',')];
    for (const row of rows) {
      const cells = [row.timestamp.toISOString(), ...ids.map(id => {
        const v = row.values[id];
        return typeof v === 'number' ? v.toString() : '';
      })];
      lines.push(cells.map(escapeCsv).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = pool.config.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `${safeName}_${range}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const disabled = selectedSensors.size === 0 || previewCount === 0 || loading;

  return (
    <>
      <Button className="gap-2" variant="outline" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" />
        Dışa Aktar (CSV)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <Download className="h-5 w-5 text-primary" />
              Veri Dışa Aktar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Zaman aralığı
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RANGES.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                      range === r.key
                        ? 'border-primary bg-primary/12 text-primary'
                        : 'border-border bg-muted/30 text-foreground hover:bg-muted/50',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sensörler
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SENSOR_IDS.map(id => {
                  const selected = selectedSensors.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleSensor(id)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                        selected
                          ? 'border-primary/40 bg-primary/10 text-foreground'
                          : 'border-dashed border-border bg-transparent text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      {pool.sensors[id].config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs">
              {loading ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Supabase'den veri çekiliyor…
                </span>
              ) : fetchError ? (
                <span className="text-status-warning">
                  Supabase erişilemedi — bellekteki {clientRowCount.toLocaleString('tr-TR')} kayıt kullanılacak
                </span>
              ) : (
                <span className="text-muted-foreground">
                  <strong className="font-semibold text-foreground">{previewCount.toLocaleString('tr-TR')}</strong>{' '}
                  satır indirilecek
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button className="gap-1.5" onClick={handleExport} disabled={disabled}>
              <Download className="h-4 w-4" />
              CSV İndir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
