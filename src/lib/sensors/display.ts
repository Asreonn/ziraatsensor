import { SensorConnectionIssue, SensorData, SensorId, SensorReading, SensorStatus, SystemInfo } from './types';

const sensorStatusLabels: Record<SensorStatus, string> = {
  healthy: 'Normal',
  warning: 'Uyarı',
  critical: 'Kritik',
  offline: 'Çevrimdışı',
};

export function hasSensorReading(reading: SensorReading | null | undefined): boolean {
  return Boolean(reading) && reading.timestamp.getTime() > 0 && Number.isFinite(reading.value);
}

export function formatSensorValue(reading: SensorReading, sensorId: SensorId, digits?: number): string {
  if (!hasSensorReading(reading)) return '--';
  const fractionDigits = digits ?? (sensorId === 'ph' ? 2 : 1);
  return reading.value.toFixed(fractionDigits);
}

export function hasSystemStatusData(systemInfo: SystemInfo | null | undefined): boolean {
  return Boolean(systemInfo) && systemInfo.lastSync.getTime() > 0;
}

export function getSensorDisplayStatus(sensor: Pick<SensorData, 'current' | 'connectionIssue'>): SensorStatus {
  if (sensor.connectionIssue === 'faulty') return 'offline';
  if (sensor.connectionIssue === 'missed_once') return 'offline';
  if (!hasSensorReading(sensor.current)) return 'offline';
  return sensor.current.status;
}

export function getSensorStatusLabel(sensor: Pick<SensorData, 'current' | 'connectionIssue'>): string {
  if (sensor.connectionIssue === 'faulty') return 'Veri yok';
  if (sensor.connectionIssue === 'missed_once') return 'Veri bekleniyor';
  if (!hasSensorReading(sensor.current)) return 'Veri yok';
  return sensorStatusLabels[getSensorDisplayStatus(sensor)];
}

export function getSensorConnectionMessage(connectionIssue: SensorConnectionIssue): string | null {
  if (connectionIssue === 'faulty') return 'Bu sensorden veri akmiyor. ESP cihazinin baglantisini kontrol edin.';
  if (connectionIssue === 'missed_once') return 'Son guncelleme icin veri alinmadi. Bir sonraki donguyu bekliyoruz.';
  return null;
}
