import { CalibrationMap, SensorCalibration } from './calibration';
import { PoolData, SENSOR_IDS, SENSOR_CONFIGS, SensorId } from './types';

export type DevNoticeLevel = 'info' | 'warning' | 'critical';

export interface DevNotice {
  id: string;
  level: DevNoticeLevel;
  sensorId?: SensorId;
  title: string;
  detail: string;
}

// Kalibrasyon yeterliligi: olculen deger kalibrasyon noktalarinin kapsadigi
// araligin disindaysa kalibrasyon "yetersiz" (ekstrapolasyon) sayilir.
function evaluateCalibration(
  sensorId: SensorId,
  currentValue: number | null,
  cal: SensorCalibration | undefined,
): DevNotice | null {
  const label = SENSOR_CONFIGS[sensorId].label;

  if (!cal || cal.points.length === 0) {
    return null; // kalibrasyon yok -> dev bildirimi degil
  }

  if (cal.points.length < 2) {
    return {
      id: `cal-${sensorId}-offset`,
      level: 'warning',
      sensorId,
      title: `${label}: tek noktali kalibrasyon`,
      detail: 'Sadece ofset uygulaniyor. Dogru olcek icin en az 2 referans nokta onerilir.',
    };
  }

  const refs = cal.points.map(p => p.reference);
  const min = Math.min(...refs);
  const max = Math.max(...refs);

  if (currentValue !== null && (currentValue < min || currentValue > max)) {
    return {
      id: `cal-${sensorId}-extrapolate`,
      level: 'warning',
      sensorId,
      title: `${label}: kalibrasyon araligi disinda`,
      detail: `Deger ${currentValue.toFixed(2)}, kalibre edilen aralik ${min.toFixed(2)}–${max.toFixed(2)}. ` +
        'Ekstrapolasyon yapiliyor; bu seviyede kalibrasyon yetersiz, sonuc guvenilmez olabilir.',
    };
  }

  return null;
}

// Bir havuz icin tum gelistirici bildirimlerini uretir (kalibrasyon + ESP tani).
export function buildDevNotices(pool: PoolData, calibrations: CalibrationMap): DevNotice[] {
  const notices: DevNotice[] = [];

  SENSOR_IDS.forEach(sensorId => {
    const sensor = pool.sensors[sensorId];
    const value = sensor && sensor.current.status !== 'offline' ? sensor.current.value : null;
    const notice = evaluateCalibration(sensorId, value, calibrations[sensorId]);
    if (notice) notices.push(notice);
  });

  const diag = pool.systemInfo.diagnostics;
  if (diag.adsOk === false) {
    notices.push({
      id: 'esp-ads',
      level: 'critical',
      title: 'ADS1115 baslatilamadi',
      detail: 'Analog cevirici yanit vermiyor; pH/TDS/DO/LDR okunamiyor. I2C kablolamasini kontrol edin.',
    });
  }
  if (typeof diag.freeHeap === 'number' && diag.freeHeap < 18000) {
    notices.push({
      id: 'esp-heap',
      level: 'warning',
      title: 'Dusuk bellek (heap)',
      detail: `Bos heap ${diag.freeHeap} bayt. TLS gonderimleri basarisiz olabilir (HTTP -1/-5).`,
    });
  }

  return notices;
}
