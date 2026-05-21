import { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { SENSOR_CONFIGS, SensorId } from '@/lib/sensors/types';
import {
  CalibrationPoint,
  SENSOR_CALIBRATION_SUGGESTIONS,
  SensorCalibration,
  clearCalibration,
  fitCalibration,
  loadCalibrations,
  saveCalibration,
} from '@/lib/sensors/calibration';

const TOTAL_STEPS = 3;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sensorId: SensorId;
  liveValue: number | null;
}

interface BodyProps extends Props {
  variant: 'sheet' | 'dialog';
}

function CalibrationBody({ sensorId, liveValue, onOpenChange, variant }: BodyProps) {
  const config = SENSOR_CONFIGS[sensorId];
  const existing = useMemo<SensorCalibration | undefined>(() => loadCalibrations()[sensorId], [sensorId]);
  const [step, setStep] = useState(0);
  const [points, setPoints] = useState<CalibrationPoint[]>([]);
  const [reference, setReference] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setStep(0);
    setPoints([]);
    setReference('');
    setSavedAt(null);
  }, [sensorId]);

  const measured = liveValue ?? 0;
  const allDone = step >= TOTAL_STEPS;

  const handleCapture = () => {
    const parsed = Number(reference.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;

    const nextPoints = [...points, { measured, reference: parsed }];
    setPoints(nextPoints);
    setReference('');

    if (nextPoints.length >= TOTAL_STEPS) {
      const { slope, intercept } = fitCalibration(nextPoints);
      const calibration: SensorCalibration = {
        slope,
        intercept,
        points: nextPoints,
        updatedAt: new Date().toISOString(),
      };
      saveCalibration(sensorId, calibration);
      setSavedAt(calibration.updatedAt);
      setStep(TOTAL_STEPS);
    } else {
      setStep(nextPoints.length);
    }
  };

  const handleReset = () => {
    clearCalibration(sensorId);
    setStep(0);
    setPoints([]);
    setReference('');
    setSavedAt(null);
  };

  const handleRestart = () => {
    setStep(0);
    setPoints([]);
    setReference('');
    setSavedAt(null);
  };

  const stepLabel = allDone ? 'Tamamlandı' : `Adım ${step + 1}/${TOTAL_STEPS}`;
  const isCompact = variant === 'sheet';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold tracking-wide text-foreground">{stepLabel}</span>
        </div>
        {existing && !allDone && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-status-critical"
          >
            <X className="h-3 w-3" /> Mevcut kalibrasyonu sil
          </button>
        )}
      </div>

      <div className={`grid gap-2 ${isCompact ? 'grid-cols-3' : 'grid-cols-3'}`}>
        {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
          const isDone = idx < points.length;
          const isActive = idx === step && !allDone;
          return (
            <div
              key={idx}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition ${
                isDone
                  ? 'border-status-healthy/60 bg-status-healthy/10'
                  : isActive
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/60 bg-muted/20'
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{idx + 1}. ölçüm</span>
              {isDone ? (
                <div className="flex flex-col items-center text-xs leading-tight">
                  <span className="font-mono font-semibold text-foreground">
                    {points[idx].measured.toFixed(2)} → {points[idx].reference.toFixed(2)}
                  </span>
                  <Check className="mt-0.5 h-3 w-3 text-status-healthy" />
                </div>
              ) : (
                <span className="font-display text-base font-semibold text-foreground">
                  {isActive ? '•' : '—'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!allDone ? (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Sensör şu an okuyor</Label>
              <div className="mt-1 font-mono text-2xl font-semibold text-foreground">
                {liveValue !== null ? liveValue.toFixed(2) : '—'}
                <span className="ml-1 text-xs text-muted-foreground">{config.unit}</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              Bu okuma kalibrasyon noktası olarak<br />kaydedilecek.
            </div>
          </div>

          <div>
            <Label htmlFor="ref-value" className="text-[11px] font-medium text-foreground">
              Olması gereken değer ({config.unit || '—'})
            </Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="ref-value"
                type="number"
                inputMode="decimal"
                step="0.01"
                autoFocus
                value={reference}
                onChange={e => setReference(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCapture();
                  }
                }}
                placeholder="örn. 7.00"
                className="h-11 text-base"
              />
              <Button
                onClick={handleCapture}
                disabled={!reference.trim() || liveValue === null}
                className="h-11 min-w-[88px] gap-1"
              >
                <Check className="h-4 w-4" />
                Enter
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Referans cihaz veya kalibrasyon çözeltisinin değerini girip Enter'a bas.
            </p>
          </div>

          {(() => {
            const suggestion = SENSOR_CALIBRATION_SUGGESTIONS[sensorId]?.[step];
            if (!suggestion) return null;
            const allSuggestions = SENSOR_CALIBRATION_SUGGESTIONS[sensorId] ?? [];
            return (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Önerilen {step + 1}. nokta
                  </span>
                  <button
                    type="button"
                    onClick={() => setReference(String(suggestion.value))}
                    className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    {suggestion.label} kullan
                  </button>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">{suggestion.hint}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {allSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReference(String(s.value))}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-mono transition ${
                        idx === step
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
                      }`}
                      title={s.hint}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-status-healthy/40 bg-status-healthy/10 p-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-status-healthy" />
            <span className="text-sm font-semibold text-foreground">Kalibrasyon kaydedildi</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border/60 bg-card p-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Eğim</div>
              <div className="font-mono text-base font-semibold text-foreground">
                {existing ? existing.slope.toFixed(4) : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Ofset</div>
              <div className="font-mono text-base font-semibold text-foreground">
                {existing ? existing.intercept.toFixed(4) : '—'}
              </div>
            </div>
          </div>
          {savedAt && (
            <p className="text-[11px] text-muted-foreground">
              Artık gelen değerler düzeltme uygulanarak gösterilecek.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={handleRestart} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          Baştan başla
        </Button>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          {allDone ? 'Kapat' : 'İptal'}
        </Button>
      </div>
    </div>
  );
}

export function SensorCalibrationDialog(props: Props) {
  const isMobile = useIsMobile();
  const config = SENSOR_CONFIGS[props.sensorId];
  const title = `${config.label} kalibrasyonu`;
  const description = '3 farklı referans noktası ile sensör çıktısı düzeltilir.';

  if (isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl px-4 pb-6 pt-4">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-lg">{title}</SheetTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </SheetHeader>
          <div className="mt-4">
            <CalibrationBody {...props} variant="sheet" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{description}</p>
        </DialogHeader>
        <CalibrationBody {...props} variant="dialog" />
      </DialogContent>
    </Dialog>
  );
}
