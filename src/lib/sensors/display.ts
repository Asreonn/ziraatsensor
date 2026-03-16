import { SensorId, SensorReading, SystemInfo } from './types';

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
