import {
  SensorConfig, SensorReading, SensorStatus, SensorId,
  Anomaly, AnomalySeverity, TrendDirection,
  SENSOR_CONFIGS, SENSOR_IDS, SystemInfo, PoolConfig,
} from './types';

const noiseState: Record<string, number> = {};

function smoothNoise(key: string, t: number): number {
  if (!(key in noiseState)) noiseState[key] = Math.random() * 1000;
  const seed = noiseState[key];
  const x = t * 0.01 + seed;
  return (Math.sin(x * 2.1) * 0.5 + Math.sin(x * 5.3) * 0.25 + Math.sin(x * 11.7) * 0.125) / 0.875;
}

export function generateValue(config: SensorConfig, poolOffset: number, timeOffset: number = 0): number {
  const now = (Date.now() / 1000) + timeOffset;
  const sinWave = Math.sin((2 * Math.PI * now) / config.period);
  const noise = smoothNoise(`${config.id}-${poolOffset}`, now);
  const microNoise = (Math.random() - 0.5) * config.amplitude * 0.1;
  const value = config.baseValue + poolOffset + sinWave * config.amplitude * 0.6 + noise * config.amplitude * 0.4 + microNoise;
  return Math.max(config.min, Math.min(config.max, Number(value.toFixed(2))));
}

export function getStatus(config: SensorConfig, value: number): SensorStatus {
  if (value < config.criticalMin || value > config.criticalMax) return 'critical';
  if (value < config.warningMin || value > config.warningMax) return 'warning';
  return 'healthy';
}

export function generateReading(config: SensorConfig, poolOffset: number, timeOffset: number = 0): SensorReading {
  const value = generateValue(config, poolOffset, timeOffset);
  return { value, timestamp: new Date(Date.now() + timeOffset * 1000), status: getStatus(config, value) };
}

export function generateHistory(config: SensorConfig, poolOffset: number, points: number = 60, intervalSec: number = 60): SensorReading[] {
  const readings: SensorReading[] = [];
  for (let i = points - 1; i >= 0; i--) {
    readings.push(generateReading(config, poolOffset, -i * intervalSec));
  }
  return readings;
}

export function calculateDelta(history: SensorReading[]): number {
  if (history.length < 2) return 0;
  const prev = history[history.length - 2].value;
  const curr = history[history.length - 1].value;
  if (prev === 0) return 0;
  return Number(((curr - prev) / prev * 100).toFixed(2));
}

export function calculateTrend(history: SensorReading[]): TrendDirection {
  if (history.length < 10) return 'stable';
  const recent = history.slice(-10).map(r => r.value);
  const firstHalf = recent.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const secondHalf = recent.slice(5).reduce((a, b) => a + b, 0) / 5;
  const diff = secondHalf - firstHalf;
  const threshold = (history[0]?.value || 1) * 0.005;
  if (diff > threshold) return 'rising';
  if (diff < -threshold) return 'falling';
  return 'stable';
}

let anomalyCounter = 0;

export function detectAnomalies(poolId: string, sensorId: SensorId, history: SensorReading[]): Anomaly[] {
  const config = SENSOR_CONFIGS[sensorId];
  const anomalies: Anomaly[] = [];
  if (history.length < 3) return anomalies;

  const latest = history[history.length - 1];
  const prev = history[history.length - 2];

  if (latest.status === 'critical') {
    const isHigh = latest.value > config.criticalMax;
    anomalies.push({
      id: `a-${++anomalyCounter}`, poolId, sensorId, sensorLabel: config.label,
      type: 'threshold', severity: 'high', value: latest.value,
      threshold: isHigh ? config.criticalMax : config.criticalMin, timestamp: latest.timestamp,
      message: `${config.label} ${isHigh ? 'exceeded' : 'below'} critical threshold: ${latest.value}${config.unit}`,
      read: false,
    });
  } else if (latest.status === 'warning') {
    const isHigh = latest.value > config.warningMax;
    anomalies.push({
      id: `a-${++anomalyCounter}`, poolId, sensorId, sensorLabel: config.label,
      type: 'threshold', severity: 'medium', value: latest.value,
      threshold: isHigh ? config.warningMax : config.warningMin, timestamp: latest.timestamp,
      message: `${config.label} ${isHigh ? 'above' : 'below'} warning range: ${latest.value}${config.unit}`,
      read: false,
    });
  }

  const change = Math.abs(latest.value - prev.value);
  const spikeThreshold = config.amplitude * 0.8;
  if (change > spikeThreshold) {
    anomalies.push({
      id: `a-${++anomalyCounter}`, poolId, sensorId, sensorLabel: config.label,
      type: 'spike', severity: change > config.amplitude ? 'high' : 'medium',
      value: latest.value, threshold: spikeThreshold, timestamp: latest.timestamp,
      message: `Rapid ${latest.value > prev.value ? 'increase' : 'decrease'} in ${config.label}: Δ${change.toFixed(2)}${config.unit}`,
      read: false,
    });
  }

  if (history.length >= 20) {
    const avg = history.slice(-20).reduce((s, r) => s + r.value, 0) / 20;
    const deviation = Math.abs(latest.value - avg);
    if (deviation > config.amplitude * 1.2) {
      anomalies.push({
        id: `a-${++anomalyCounter}`, poolId, sensorId, sensorLabel: config.label,
        type: 'deviation', severity: 'low', value: latest.value, threshold: avg, timestamp: latest.timestamp,
        message: `${config.label} deviating from average (${avg.toFixed(2)}): current ${latest.value}${config.unit}`,
        read: false,
      });
    }
  }

  return anomalies;
}

export function generateSystemInfo(): SystemInfo {
  const connections: Record<string, boolean> = {};
  SENSOR_IDS.forEach(id => { connections[id] = Math.random() > 0.05; });
  return {
    uptime: Math.floor(Date.now() / 1000) - 1710000000 + Math.floor(Math.random() * 86400),
    rssi: -40 - Math.floor(Math.random() * 35),
    voltage: 3.2 + Math.random() * 0.5,
    lastSync: new Date(),
    sensorConnections: connections as Record<SensorId, boolean>,
  };
}

export function generatePoolSystemInfo(seed: string): SystemInfo {
  const info = generateSystemInfo();
  const seedValue = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    uptime: info.uptime + seedValue * 10,
    rssi: info.rssi - (seedValue % 6),
    voltage: Number((info.voltage - (seedValue % 4) * 0.03).toFixed(2)),
    lastSync: info.lastSync,
    sensorConnections: info.sensorConnections,
  };
}
