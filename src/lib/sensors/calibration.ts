import { SENSOR_IDS, SensorId } from './types';

export interface CalibrationPoint {
  measured: number;
  reference: number;
}

export interface SensorCalibration {
  slope: number;
  intercept: number;
  points: CalibrationPoint[];
  updatedAt: string;
}

export type CalibrationMap = Partial<Record<SensorId, SensorCalibration>>;

const STORAGE_KEY = 'aico:calibration:v1';
const CHANGE_EVENT = 'aico:calibration:change';

function isValidPoint(value: unknown): value is CalibrationPoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CalibrationPoint).measured === 'number' &&
    typeof (value as CalibrationPoint).reference === 'number'
  );
}

function isValidCalibration(value: unknown): value is SensorCalibration {
  if (typeof value !== 'object' || value === null) return false;
  const cal = value as SensorCalibration;
  return (
    typeof cal.slope === 'number' &&
    typeof cal.intercept === 'number' &&
    Array.isArray(cal.points) &&
    cal.points.every(isValidPoint) &&
    typeof cal.updatedAt === 'string'
  );
}

export function loadCalibrations(): CalibrationMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: CalibrationMap = {};
    SENSOR_IDS.forEach(id => {
      const entry = parsed[id];
      if (isValidCalibration(entry)) out[id] = entry;
    });
    return out;
  } catch {
    return {};
  }
}

function persist(map: CalibrationMap) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function saveCalibration(sensorId: SensorId, calibration: SensorCalibration) {
  const map = loadCalibrations();
  map[sensorId] = calibration;
  persist(map);
}

export function clearCalibration(sensorId: SensorId) {
  const map = loadCalibrations();
  delete map[sensorId];
  persist(map);
}

export function fitCalibration(points: CalibrationPoint[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 1, intercept: 0 };
  if (n === 1) return { slope: 1, intercept: points[0].reference - points[0].measured };

  const sumX = points.reduce((acc, p) => acc + p.measured, 0);
  const sumY = points.reduce((acc, p) => acc + p.reference, 0);
  const sumXY = points.reduce((acc, p) => acc + p.measured * p.reference, 0);
  const sumXX = points.reduce((acc, p) => acc + p.measured * p.measured, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) {
    const meanX = sumX / n;
    const meanY = sumY / n;
    return { slope: 1, intercept: meanY - meanX };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function applyCalibration(value: number, calibration?: SensorCalibration | null): number {
  if (!calibration) return value;
  return calibration.slope * value + calibration.intercept;
}

export interface CalibrationSuggestion {
  value: number;
  label: string;
  hint: string;
}

export const SENSOR_CALIBRATION_SUGGESTIONS: Record<SensorId, CalibrationSuggestion[]> = {
  ph: [
    { value: 4.01, label: 'pH 4.01', hint: 'Asidik tampon çözelti (kırmızı)' },
    { value: 7.00, label: 'pH 7.00', hint: 'Nötr tampon çözelti (sarı/yeşil)' },
    { value: 10.01, label: 'pH 10.01', hint: 'Bazik tampon çözelti (mavi)' },
  ],
  ec: [
    { value: 0.084, label: '84 µS/cm', hint: 'Düşük iletkenlik standardı (0.084 mS/cm)' },
    { value: 1.413, label: '1413 µS/cm', hint: 'Orta — KCl 0.01 M (1.413 mS/cm)' },
    { value: 12.88, label: '12.88 mS/cm', hint: 'Yüksek iletkenlik standardı' },
  ],
  do: [
    { value: 0, label: '0 mg/L', hint: 'Sodyum sülfit (Na₂SO₃) çözeltisi — sıfır oksijen' },
    { value: 8.26, label: '~8.26 mg/L', hint: '25 °C\'de havayla doygun saf su' },
    { value: 14.62, label: '~14.62 mg/L', hint: '0 °C\'de havayla doygun saf su (üst sınır)' },
  ],
  waterTemp: [
    { value: 0, label: '0 °C', hint: 'Buz–su karışımı (kıyısında erimekte olan buz)' },
    { value: 25, label: '25 °C', hint: 'Oda sıcaklığında dengelenmiş su' },
    { value: 40, label: '40 °C', hint: 'Termometre ile doğrulanmış ılık su' },
  ],
  airTemp: [
    { value: 0, label: '0 °C', hint: 'Buz banyosu' },
    { value: 22, label: '22 °C', hint: 'Klimasız oda sıcaklığı' },
    { value: 40, label: '40 °C', hint: 'Referans termometre ile doğrulanmış sıcak ortam' },
  ],
  humidity: [
    { value: 33, label: '33% RH', hint: 'MgCl₂ doygun tuz çözeltisi (kapalı kap)' },
    { value: 75, label: '75% RH', hint: 'NaCl doygun tuz çözeltisi (kapalı kap)' },
    { value: 97, label: '97% RH', hint: 'K₂SO₄ doygun çözelti / ıslak süngerli kap' },
  ],
};

export function subscribeCalibrationChanges(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
