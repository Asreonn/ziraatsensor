export type SensorId = 'ph' | 'ec' | 'tds' | 'do' | 'ldr' | 'waterTemp' | 'airTemp' | 'humidity';
export type SensorStatus = 'healthy' | 'warning' | 'critical' | 'offline';
export type SensorConnectionIssue = 'none' | 'missed_once' | 'faulty';
export type AnomalyType = 'spike' | 'threshold' | 'deviation' | 'connection';
export type AnomalySeverity = 'low' | 'medium' | 'high';
export type TrendDirection = 'rising' | 'falling' | 'stable';
export type DataMode = 'mock' | 'live';

export interface SensorConfig {
  id: SensorId;
  label: string;
  unit: string;
  min: number;
  max: number;
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  baseValue: number;
  amplitude: number;
  period: number;
}

export interface SensorThresholdConfig {
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
}

export interface AlarmSettings {
  buzzerEnabled: boolean;
  buzzerMuted: boolean;
  mutedAlarmKey: string | null;
  mutedAt: string | null;
  alarmSensors: Record<SensorId, boolean>;
}

export interface SensorReading {
  value: number;
  timestamp: Date;
  status: SensorStatus;
}

export interface SensorData {
  config: SensorConfig;
  current: SensorReading;
  history: SensorReading[];
  delta: number;
  trend: TrendDirection;
  connectionIssue: SensorConnectionIssue;
  hasUnreadAnomaly: boolean;
}

export interface Anomaly {
  id: string;
  poolId: string;
  sensorId: SensorId;
  sensorLabel: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  value: number;
  threshold: number;
  timestamp: Date;
  message: string;
  read: boolean;
}

export interface PoolConfig {
  id: string;
  name: string;
  location: string;
  sortOrder: number;
  offsets: Partial<Record<SensorId, number>>;
  thresholds: Record<SensorId, SensorThresholdConfig>;
  alarmSettings: AlarmSettings;
}

export interface PoolData {
  config: PoolConfig;
  sensors: Record<SensorId, SensorData>;
  anomalies: Anomaly[];
  overallStatus: SensorStatus;
  systemInfo: SystemInfo;
}

export interface EspDiagnostics {
  freeHeap?: number;
  maxBlock?: number;
  adsOk?: boolean;
  rawVoltage?: Partial<Record<SensorId, number>>;
}

export interface SystemInfo {
  uptime: number;
  rssi: number;
  voltage: number;
  lastSync: Date;
  sensorConnections: Record<SensorId, boolean>;
  diagnostics: EspDiagnostics;
}

export const SENSOR_CONFIGS: Record<SensorId, SensorConfig> = {
  ph: {
    id: 'ph', label: 'pH', unit: '',
    min: 0, max: 14, warningMin: 6.5, warningMax: 8.5, criticalMin: 5.5, criticalMax: 9.5,
    baseValue: 7.2, amplitude: 0.4, period: 300,
  },
  ec: {
    id: 'ec', label: 'EC', unit: 'mS/cm',
    min: 0, max: 5, warningMin: 1.0, warningMax: 3.0, criticalMin: 0.5, criticalMax: 4.0,
    baseValue: 1.8, amplitude: 0.3, period: 450,
  },
  tds: {
    id: 'tds', label: 'TDS', unit: 'ppm',
    min: 0, max: 2000, warningMin: 150, warningMax: 1200, criticalMin: 50, criticalMax: 1800,
    baseValue: 800, amplitude: 120, period: 450,
  },
  do: {
    id: 'do', label: 'Çözünmüş O₂', unit: 'mg/L',
    min: 0, max: 20, warningMin: 5.0, warningMax: 12.0, criticalMin: 3.0, criticalMax: 15.0,
    baseValue: 7.5, amplitude: 1.2, period: 360,
  },
  ldr: {
    id: 'ldr', label: 'Işık', unit: '%',
    min: 0, max: 100, warningMin: 20, warningMax: 90, criticalMin: 5, criticalMax: 98,
    baseValue: 60, amplitude: 25, period: 720,
  },
  waterTemp: {
    id: 'waterTemp', label: 'Su Sıcaklığı', unit: '°C',
    min: 0, max: 50, warningMin: 20, warningMax: 30, criticalMin: 15, criticalMax: 35,
    baseValue: 24.5, amplitude: 2.0, period: 600,
  },
  airTemp: {
    id: 'airTemp', label: 'Hava Sıcaklığı', unit: '°C',
    min: -10, max: 50, warningMin: 18, warningMax: 35, criticalMin: 10, criticalMax: 40,
    baseValue: 26.0, amplitude: 3.0, period: 720,
  },
  humidity: {
    id: 'humidity', label: 'Nem', unit: '%',
    min: 0, max: 100, warningMin: 40, warningMax: 80, criticalMin: 20, criticalMax: 95,
    baseValue: 62, amplitude: 8, period: 540,
  },
};

export const SENSOR_IDS: SensorId[] = ['ph', 'ec', 'tds', 'do', 'ldr', 'waterTemp', 'airTemp', 'humidity'];

export function getDefaultSensorThresholds(): Record<SensorId, SensorThresholdConfig> {
  return SENSOR_IDS.reduce((acc, id) => {
    const config = SENSOR_CONFIGS[id];
    acc[id] = {
      warningMin: config.warningMin,
      warningMax: config.warningMax,
      criticalMin: config.criticalMin,
      criticalMax: config.criticalMax,
    };
    return acc;
  }, {} as Record<SensorId, SensorThresholdConfig>);
}

export function getDefaultAlarmSettings(): AlarmSettings {
  return {
    buzzerEnabled: true,
    buzzerMuted: false,
    mutedAlarmKey: null,
    mutedAt: null,
    alarmSensors: SENSOR_IDS.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as Record<SensorId, boolean>),
  };
}

export const POOL_CONFIGS: PoolConfig[] = [
  {
    id: 'pool-1',
    name: 'Pool-1',
    location: '',
    sortOrder: 1,
    offsets: { ph: 0, ec: 0, tds: 0, do: 0, ldr: 0, waterTemp: 0, airTemp: 0, humidity: 0 },
    thresholds: getDefaultSensorThresholds(),
    alarmSettings: getDefaultAlarmSettings(),
  },
];
