export type SensorId = 'ph' | 'ec' | 'do' | 'waterTemp' | 'airTemp' | 'humidity';

export type SensorStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export type AnomalyType = 'spike' | 'threshold' | 'deviation';
export type AnomalySeverity = 'low' | 'medium' | 'high';
export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface SensorConfig {
  id: SensorId;
  label: string;
  unit: string;
  icon: string;
  min: number;
  max: number;
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  /** Base value for mock sinusoidal wave */
  baseValue: number;
  amplitude: number;
  /** Period in seconds */
  period: number;
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
  delta: number; // percentage change from previous
  trend: TrendDirection;
}

export interface Anomaly {
  id: string;
  sensorId: SensorId;
  sensorLabel: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  value: number;
  threshold: number;
  timestamp: Date;
  message: string;
}

export interface SystemInfo {
  uptime: number; // seconds
  rssi: number; // dBm
  voltage: number;
  lastSync: Date;
  sensorConnections: Record<SensorId, boolean>;
}

export const SENSOR_CONFIGS: Record<SensorId, SensorConfig> = {
  ph: {
    id: 'ph', label: 'pH', unit: '', icon: 'Droplets',
    min: 0, max: 14, warningMin: 6.5, warningMax: 8.5, criticalMin: 5.5, criticalMax: 9.5,
    baseValue: 7.2, amplitude: 0.4, period: 300,
  },
  ec: {
    id: 'ec', label: 'EC', unit: 'mS/cm', icon: 'Zap',
    min: 0, max: 5, warningMin: 1.0, warningMax: 3.0, criticalMin: 0.5, criticalMax: 4.0,
    baseValue: 1.8, amplitude: 0.3, period: 450,
  },
  do: {
    id: 'do', label: 'Dissolved O₂', unit: 'mg/L', icon: 'Wind',
    min: 0, max: 20, warningMin: 5.0, warningMax: 12.0, criticalMin: 3.0, criticalMax: 15.0,
    baseValue: 7.5, amplitude: 1.2, period: 360,
  },
  waterTemp: {
    id: 'waterTemp', label: 'Water Temp', unit: '°C', icon: 'Thermometer',
    min: 0, max: 50, warningMin: 20, warningMax: 30, criticalMin: 15, criticalMax: 35,
    baseValue: 24.5, amplitude: 2.0, period: 600,
  },
  airTemp: {
    id: 'airTemp', label: 'Air Temp', unit: '°C', icon: 'Sun',
    min: -10, max: 50, warningMin: 18, warningMax: 35, criticalMin: 10, criticalMax: 40,
    baseValue: 26.0, amplitude: 3.0, period: 720,
  },
  humidity: {
    id: 'humidity', label: 'Humidity', unit: '%', icon: 'CloudRain',
    min: 0, max: 100, warningMin: 40, warningMax: 80, criticalMin: 20, criticalMax: 95,
    baseValue: 62, amplitude: 8, period: 540,
  },
};

export const SENSOR_IDS: SensorId[] = ['ph', 'ec', 'do', 'waterTemp', 'airTemp', 'humidity'];
