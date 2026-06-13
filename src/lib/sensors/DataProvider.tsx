import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { Json, PoolRow, PoolSystemStatusRow, SensorReadingRow } from '@/lib/supabase/database.types';
import { supabase } from '@/lib/supabase/client';
import {
  AlarmSettings,
  Anomaly,
  DataMode,
  EspDiagnostics,
  PoolConfig,
  PoolData,
  SENSOR_CONFIGS,
  SENSOR_IDS,
  SensorConfig,
  SensorConnectionIssue,
  SensorData,
  SensorId,
  SensorReading,
  SensorThresholdConfig,
  SystemInfo,
  getDefaultAlarmSettings,
  getDefaultSensorThresholds,
} from './types';
import {
  calculateDelta,
  calculateTrend,
  detectAnomalies,
  generateHistory,
  generatePoolSystemInfo,
  generateReading,
  getStatus,
} from './mockGenerator';
import {
  CalibrationMap,
  applyCalibration,
  loadCalibrations,
  subscribeCalibrationChanges,
} from './calibration';

const DEFAULT_REFRESH_INTERVAL = 3000;
const HISTORY_POINTS = 120;
const READINGS_LIMIT = 6000;

interface LiveSensorSyncState {
  lastObservedCycleMs: number;
  lastSensorTimestampMs: number;
  missedCycles: number;
}

function getConnectionIssue(missedCycles: number): SensorConnectionIssue {
  if (missedCycles >= 2) return 'faulty';
  if (missedCycles === 1) return 'missed_once';
  return 'none';
}

interface SensorContextValue {
  pools: Record<string, PoolData>;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => Promise<void>;
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => Promise<void>;
  devMode: boolean;
  setDevMode: (enabled: boolean) => Promise<void>;
  updatePoolThresholds: (poolId: string, thresholds: Record<SensorId, SensorThresholdConfig>) => Promise<void>;
  updatePoolAlarmSettings: (poolId: string, patch: AlarmSettingsPatch) => Promise<void>;
  createPool: (input: { name: string; location: string }) => Promise<string>;
  claimPool: (input: { poolId: string; name?: string; location?: string }) => Promise<string>;
  loading: boolean;
  error: string | null;
  markAnomaliesRead: (poolId: string, sensorId: SensorId) => void;
}

const SensorContext = createContext<SensorContextValue | null>(null);

type AlarmSettingsPatch = Partial<Omit<AlarmSettings, 'alarmSensors'>> & {
  alarmSensors?: Partial<Record<SensorId, boolean>>;
};

export function useSensorData() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensorData must be within DataProvider');
  return ctx;
}

function normalizeOffsets(input: unknown): Partial<Record<SensorId, number>> {
  const fallback: Partial<Record<SensorId, number>> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fallback;

  const offsets: Partial<Record<SensorId, number>> = {};
  SENSOR_IDS.forEach(id => {
    const value = (input as Record<string, unknown>)[id];
    if (typeof value === 'number') {
      offsets[id] = value;
    }
  });
  return offsets;
}

function normalizeConnections(input: unknown, fallbackValue: boolean): Record<SensorId, boolean> {
  const connections = {} as Record<SensorId, boolean>;
  SENSOR_IDS.forEach(id => {
    connections[id] = fallbackValue;
  });

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return connections;
  }

  SENSOR_IDS.forEach(id => {
    const value = (input as Record<string, unknown>)[id];
    if (typeof value === 'boolean') {
      connections[id] = value;
    }
  });

  return connections;
}

function normalizeThresholds(input: unknown): Record<SensorId, SensorThresholdConfig> {
  const thresholds = getDefaultSensorThresholds();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return thresholds;

  SENSOR_IDS.forEach(id => {
    const value = (input as Record<string, unknown>)[id];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const raw = value as Record<string, unknown>;
    thresholds[id] = {
      warningMin: typeof raw.warningMin === 'number' ? raw.warningMin : thresholds[id].warningMin,
      warningMax: typeof raw.warningMax === 'number' ? raw.warningMax : thresholds[id].warningMax,
      criticalMin: typeof raw.criticalMin === 'number' ? raw.criticalMin : thresholds[id].criticalMin,
      criticalMax: typeof raw.criticalMax === 'number' ? raw.criticalMax : thresholds[id].criticalMax,
    };
  });

  return thresholds;
}

function normalizeAlarmSettings(input: unknown): AlarmSettings {
  const settings = getDefaultAlarmSettings();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return settings;

  const raw = input as Record<string, unknown>;
  if (typeof raw.buzzerEnabled === 'boolean') settings.buzzerEnabled = raw.buzzerEnabled;
  if (typeof raw.buzzerMuted === 'boolean') settings.buzzerMuted = raw.buzzerMuted;
  if (typeof raw.mutedAlarmKey === 'string') settings.mutedAlarmKey = raw.mutedAlarmKey;
  if (raw.mutedAlarmKey === null) settings.mutedAlarmKey = null;
  if (typeof raw.mutedAt === 'string') settings.mutedAt = raw.mutedAt;
  if (raw.mutedAt === null) settings.mutedAt = null;

  const sensors = raw.alarmSensors;
  if (sensors && typeof sensors === 'object' && !Array.isArray(sensors)) {
    SENSOR_IDS.forEach(id => {
      const value = (sensors as Record<string, unknown>)[id];
      if (typeof value === 'boolean') settings.alarmSensors[id] = value;
    });
  }

  return settings;
}

function mergeAlarmSettings(current: AlarmSettings, patch: AlarmSettingsPatch): AlarmSettings {
  return {
    ...current,
    ...patch,
    alarmSensors: {
      ...current.alarmSensors,
      ...(patch.alarmSensors ?? {}),
    },
  };
}

function getPoolSensorConfig(poolConfig: PoolConfig, sensorId: SensorId): SensorConfig {
  const thresholds = poolConfig.thresholds[sensorId];
  return {
    ...SENSOR_CONFIGS[sensorId],
    ...thresholds,
  };
}

const STALE_LOCATION_PLACEHOLDERS = new Set(['Yeni kayit havuzu', 'Yeni kayıt havuzu']);

function mapPoolRowToConfig(row: PoolRow): PoolConfig {
  const rawLocation = (row.location ?? '').trim();
  return {
    id: row.id,
    name: row.name,
    location: STALE_LOCATION_PLACEHOLDERS.has(rawLocation) ? '' : rawLocation,
    sortOrder: row.sort_order,
    offsets: normalizeOffsets(row.sensor_offsets),
    thresholds: normalizeThresholds(row.sensor_thresholds),
    alarmSettings: normalizeAlarmSettings(row.alarm_settings),
  };
}

function getOverallStatus(sensors: Record<SensorId, SensorData>) {
  const issues = SENSOR_IDS.map(id => sensors[id].connectionIssue);
  const statuses = SENSOR_IDS.map(id => sensors[id].current.status);
  if (issues.includes('faulty')) return 'critical' as const;
  if (issues.includes('missed_once')) return 'warning' as const;
  if (statuses.every(status => status === 'offline')) return 'offline' as const;
  if (statuses.includes('critical')) return 'critical' as const;
  if (statuses.includes('warning')) return 'warning' as const;
  if (statuses.includes('healthy')) return 'healthy' as const;
  return 'offline' as const;
}

function applyCalibrationToReading(
  sensorId: SensorId,
  reading: SensorReading,
  calibrations: CalibrationMap,
  config: SensorConfig = SENSOR_CONFIGS[sensorId],
): SensorReading {
  const cal = calibrations[sensorId];
  if (!cal) return reading;
  if (reading.status === 'offline') return reading;
  const adjusted = applyCalibration(reading.value, cal);
  const rounded = Math.round(adjusted * 100) / 100;
  return { ...reading, value: rounded, status: getStatus(config, rounded) };
}

function calibrateHistory(
  sensorId: SensorId,
  history: SensorReading[],
  calibrations: CalibrationMap,
  config: SensorConfig,
): SensorReading[] {
  if (!calibrations[sensorId]) return history;
  return history.map(reading => applyCalibrationToReading(sensorId, reading, calibrations, config));
}

function buildMockPoolSensors(poolConfig: PoolConfig, calibrations: CalibrationMap): Record<SensorId, SensorData> {
  const sensors = {} as Record<SensorId, SensorData>;
  SENSOR_IDS.forEach(id => {
    const config = getPoolSensorConfig(poolConfig, id);
    const offset = poolConfig.offsets[id] ?? 0;
    const history = calibrateHistory(id, generateHistory(config, offset, 60, 60), calibrations, config);
    sensors[id] = {
      config,
      current: history[history.length - 1],
      history,
      delta: calculateDelta(history),
      trend: calculateTrend(history),
      connectionIssue: 'none',
      hasUnreadAnomaly: false,
    };
  });
  return sensors;
}

function buildMockInitialPools(poolConfigs: PoolConfig[], calibrations: CalibrationMap): Record<string, PoolData> {
  const next = {} as Record<string, PoolData>;
  poolConfigs.forEach(poolConfig => {
    const sensors = buildMockPoolSensors(poolConfig, calibrations);
    next[poolConfig.id] = {
      config: poolConfig,
      sensors,
      anomalies: [],
      overallStatus: getOverallStatus(sensors),
      systemInfo: generatePoolSystemInfo(poolConfig.id),
    };
  });
  return next;
}

function buildEmptyLivePools(poolConfigs: PoolConfig[]): Record<string, PoolData> {
  const next = {} as Record<string, PoolData>;

  poolConfigs.forEach(poolConfig => {
    const sensors = {} as Record<SensorId, SensorData>;

    SENSOR_IDS.forEach(id => {
      const reading = createOfflineReading(id);
      sensors[id] = {
        config: getPoolSensorConfig(poolConfig, id),
        current: reading,
        history: [reading],
        delta: 0,
        trend: 'stable',
        connectionIssue: 'none',
        hasUnreadAnomaly: false,
      };
    });

    next[poolConfig.id] = {
      config: poolConfig,
      sensors,
      anomalies: [],
      overallStatus: 'offline',
      systemInfo: toSystemInfo(),
    };
  });

  return next;
}

function tickMockPools(
  prev: Record<string, PoolData>,
  poolConfigs: PoolConfig[],
  calibrations: CalibrationMap,
): Record<string, PoolData> {
  const next = {} as Record<string, PoolData>;

  poolConfigs.forEach(poolConfig => {
    const previousPool = prev[poolConfig.id];
    if (!previousPool) {
      next[poolConfig.id] = buildMockInitialPools([poolConfig], calibrations)[poolConfig.id];
      return;
    }

    const sensors = {} as Record<SensorId, SensorData>;
    let newAnomalies: Anomaly[] = [];

    SENSOR_IDS.forEach(id => {
      const config = getPoolSensorConfig(poolConfig, id);
      const raw = generateReading(config, poolConfig.offsets[id] ?? 0);
      const reading = applyCalibrationToReading(id, raw, calibrations, config);
      const history = [...previousPool.sensors[id].history.slice(-(HISTORY_POINTS - 1)), reading];
      const detected = detectAnomalies(poolConfig.id, id, history, config);
      const hadUnread = previousPool.sensors[id].hasUnreadAnomaly;

      sensors[id] = {
        config,
        current: reading,
        history,
        delta: calculateDelta(history),
        trend: calculateTrend(history),
        connectionIssue: 'none',
        hasUnreadAnomaly: hadUnread || detected.length > 0,
      };

      newAnomalies = [...newAnomalies, ...detected];
    });

    next[poolConfig.id] = {
      config: poolConfig,
      sensors,
      anomalies: [...newAnomalies, ...previousPool.anomalies].slice(0, 200),
      overallStatus: getOverallStatus(sensors),
      systemInfo: generatePoolSystemInfo(poolConfig.id),
    };
  });

  return next;
}

function createOfflineReading(sensorId: SensorId): SensorReading {
  return {
    value: 0,
    timestamp: new Date(0),
    status: 'offline',
  };
}

function buildLiveAnomalyId(poolId: string, sensorId: SensorId, type: string, timestamp: Date, suffix: string) {
  return `live-${poolId}-${sensorId}-${type}-${timestamp.getTime()}-${suffix}`;
}

function deriveAnomaliesFromHistory(
  poolId: string,
  sensorId: SensorId,
  history: SensorReading[],
  config: SensorConfig,
): Anomaly[] {
  if (history.length < 2) return [];

  const anomalies: Anomaly[] = [];

  for (let index = 1; index < history.length; index += 1) {
    const latest = history[index];
    const previous = history[index - 1];
    const statusChanged = latest.status !== previous.status;

    if (latest.status === 'critical' && statusChanged) {
      const isHigh = latest.value > config.criticalMax;
      const limit = isHigh ? config.criticalMax : config.criticalMin;
      anomalies.push({
        id: buildLiveAnomalyId(poolId, sensorId, 'threshold', latest.timestamp, `critical-${isHigh ? 'high' : 'low'}`),
        poolId,
        sensorId,
        sensorLabel: config.label,
        type: 'threshold',
        severity: 'high',
        value: latest.value,
        threshold: limit,
        timestamp: latest.timestamp,
        message: isHigh
          ? `Kritik yüksek: ${latest.value}${config.unit} (sınır ${limit}${config.unit}).`
          : `Kritik düşük: ${latest.value}${config.unit} (sınır ${limit}${config.unit}).`,
        read: false,
      });
    } else if (latest.status === 'warning' && statusChanged) {
      const isHigh = latest.value > config.warningMax;
      const limit = isHigh ? config.warningMax : config.warningMin;
      anomalies.push({
        id: buildLiveAnomalyId(poolId, sensorId, 'threshold', latest.timestamp, `warning-${isHigh ? 'high' : 'low'}`),
        poolId,
        sensorId,
        sensorLabel: config.label,
        type: 'threshold',
        severity: 'medium',
        value: latest.value,
        threshold: limit,
        timestamp: latest.timestamp,
        message: isHigh
          ? `Uyarı: değer ${latest.value}${config.unit}, ideal üst sınır ${limit}${config.unit}.`
          : `Uyarı: değer ${latest.value}${config.unit}, ideal alt sınır ${limit}${config.unit}.`,
        read: false,
      });
    }

    const change = Math.abs(latest.value - previous.value);
    const spikeThreshold = config.amplitude * 0.8;
    if (change > spikeThreshold) {
      anomalies.push({
        id: buildLiveAnomalyId(poolId, sensorId, 'spike', latest.timestamp, change.toFixed(2)),
        poolId,
        sensorId,
        sensorLabel: config.label,
        type: 'spike',
        severity: change > config.amplitude ? 'high' : 'medium',
        value: latest.value,
        threshold: spikeThreshold,
        timestamp: latest.timestamp,
        message: `Ani ${latest.value > previous.value ? 'yükseliş' : 'düşüş'}: ${change.toFixed(2)}${config.unit} değişim (önceki ${previous.value}${config.unit} → şimdi ${latest.value}${config.unit}).`,
        read: false,
      });
    }

    const sample = history.slice(Math.max(0, index - 19), index + 1);
    if (sample.length >= 20) {
      const average = sample.reduce((sum, reading) => sum + reading.value, 0) / sample.length;
      const deviation = Math.abs(latest.value - average);
      if (deviation > config.amplitude * 1.2) {
        anomalies.push({
          id: buildLiveAnomalyId(poolId, sensorId, 'deviation', latest.timestamp, average.toFixed(2)),
          poolId,
          sensorId,
          sensorLabel: config.label,
          type: 'deviation',
          severity: 'low',
          value: latest.value,
          threshold: average,
          timestamp: latest.timestamp,
          message: `Ortalamadan sapma: değer ${latest.value}${config.unit}, son 20 okumanın ortalaması ${average.toFixed(2)}${config.unit}.`,
          read: false,
        });
      }
    }
  }

  return anomalies
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 24);
}

function normalizeDiagnostics(input: unknown): EspDiagnostics {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const obj = input as Record<string, unknown>;
  const out: EspDiagnostics = {};
  if (typeof obj.freeHeap === 'number') out.freeHeap = obj.freeHeap;
  if (typeof obj.maxBlock === 'number') out.maxBlock = obj.maxBlock;
  if (typeof obj.adsOk === 'boolean') out.adsOk = obj.adsOk;

  const raw = obj.rawVoltage;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rawOut: Partial<Record<SensorId, number>> = {};
    SENSOR_IDS.forEach(id => {
      const value = (raw as Record<string, unknown>)[id];
      if (typeof value === 'number') rawOut[id] = value;
    });
    out.rawVoltage = rawOut;
  }
  return out;
}

function toSystemInfo(row?: PoolSystemStatusRow): SystemInfo {
  if (!row) {
    return {
      uptime: 0,
      rssi: -100,
      voltage: 0,
      lastSync: new Date(0),
      sensorConnections: normalizeConnections(null, false),
      diagnostics: {},
    };
  }

  return {
    uptime: row.uptime_seconds,
    rssi: row.rssi,
    voltage: row.voltage,
    lastSync: new Date(row.last_sync),
    sensorConnections: normalizeConnections(row.sensor_connections, false),
    diagnostics: normalizeDiagnostics(row.diagnostics),
  };
}

function buildReadingGroups(rows: SensorReadingRow[], calibrations: CalibrationMap) {
  const grouped: Record<string, SensorReading[]> = {};

  rows.forEach(row => {
    const sensorId = row.sensor_id as SensorId;
    if (!SENSOR_IDS.includes(sensorId)) return;

    const key = `${row.pool_id}:${sensorId}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    if (grouped[key].length >= HISTORY_POINTS) return;

    const cal = calibrations[sensorId];
    const rawValue = row.value;
    const adjusted = cal ? Math.round(applyCalibration(rawValue, cal) * 100) / 100 : rawValue;
    grouped[key].push({
      value: adjusted,
      timestamp: new Date(row.recorded_at),
      status: 'healthy',
    });
  });

  Object.values(grouped).forEach(history => history.reverse());

  return grouped;
}

function applyStatusToHistory(history: SensorReading[], config: SensorConfig): SensorReading[] {
  return history.map(reading => {
    if (reading.status === 'offline') return reading;
    return {
      ...reading,
      status: getStatus(config, reading.value),
    };
  });
}

function getLatestReadingTimestamp(history: SensorReading[]): number {
  const latest = history[history.length - 1];
  return latest?.timestamp.getTime() ?? 0;
}

function buildConnectionAnomaly(
  poolId: string,
  sensorId: SensorId,
  issue: SensorConnectionIssue,
  missedCycles: number,
  timestampMs: number,
  config: SensorConfig,
): Anomaly | null {
  if (issue === 'none' || timestampMs <= 0) return null;

  const timestamp = new Date(timestampMs);

  return {
    id: buildLiveAnomalyId(poolId, sensorId, 'connection', timestamp, `${issue}-${missedCycles}`),
    poolId,
    sensorId,
    sensorLabel: config.label,
    type: 'connection',
    severity: issue === 'faulty' ? 'high' : 'medium',
    value: missedCycles,
    threshold: issue === 'faulty' ? 2 : 1,
    timestamp,
    message: issue === 'faulty'
      ? `${config.label} ust uste ${missedCycles} update kacirdi. Sensor bozuk olabilir.`
      : `${config.label} son update icin veri gondermedi.`,
    read: false,
  };
}

function evaluateLiveSensorIssue(
  key: string,
  poolCycleMs: number,
  latestSensorTimestampMs: number,
  syncState: Record<string, LiveSensorSyncState>,
) {
  const previous = syncState[key] ?? {
    lastObservedCycleMs: 0,
    lastSensorTimestampMs: 0,
    missedCycles: 0,
  };

  if (poolCycleMs <= 0) {
    syncState[key] = {
      ...previous,
      lastSensorTimestampMs: Math.max(previous.lastSensorTimestampMs, latestSensorTimestampMs),
      missedCycles: latestSensorTimestampMs > previous.lastSensorTimestampMs ? 0 : previous.missedCycles,
    };

    return {
      issue: getConnectionIssue(syncState[key].missedCycles),
      missedCycles: syncState[key].missedCycles,
    };
  }

  if (previous.lastObservedCycleMs === 0) {
    const missedCycles = latestSensorTimestampMs > 0 ? 0 : 1;
    syncState[key] = {
      lastObservedCycleMs: poolCycleMs,
      lastSensorTimestampMs: latestSensorTimestampMs,
      missedCycles,
    };

    return {
      issue: getConnectionIssue(missedCycles),
      missedCycles,
    };
  }

  if (latestSensorTimestampMs > previous.lastSensorTimestampMs) {
    syncState[key] = {
      lastObservedCycleMs: Math.max(poolCycleMs, previous.lastObservedCycleMs),
      lastSensorTimestampMs: latestSensorTimestampMs,
      missedCycles: 0,
    };

    return {
      issue: 'none' as const,
      missedCycles: 0,
    };
  }

  if (poolCycleMs > previous.lastObservedCycleMs) {
    const missedCycles = previous.missedCycles + 1;
    syncState[key] = {
      lastObservedCycleMs: poolCycleMs,
      lastSensorTimestampMs: latestSensorTimestampMs,
      missedCycles,
    };

    return {
      issue: getConnectionIssue(missedCycles),
      missedCycles,
    };
  }

  return {
    issue: getConnectionIssue(previous.missedCycles),
    missedCycles: previous.missedCycles,
  };
}

async function fetchLivePools(
  poolConfigs: PoolConfig[],
  readState: Record<string, string[]>,
  syncState: Record<string, LiveSensorSyncState>,
  calibrations: CalibrationMap,
): Promise<Record<string, PoolData>> {
  if (!supabase || poolConfigs.length === 0) return {};

  const poolIds = poolConfigs.map(pool => pool.id);
  const [readingsResult, statusResult] = await Promise.all([
    supabase
      .from('sensor_readings')
      .select('id,pool_id,sensor_id,value,recorded_at')
      .in('pool_id', poolIds)
      .order('recorded_at', { ascending: false })
      .limit(Math.min(poolIds.length * SENSOR_IDS.length * HISTORY_POINTS, READINGS_LIMIT)),
    supabase
      .from('pool_system_status')
      .select('*')
      .in('pool_id', poolIds),
  ]);

  if (readingsResult.error) throw readingsResult.error;
  if (statusResult.error) throw statusResult.error;

  const groupedReadings = buildReadingGroups(readingsResult.data ?? [], calibrations);
  const statusMap = new Map((statusResult.data ?? []).map(row => [row.pool_id, row]));
  const next = {} as Record<string, PoolData>;

  poolConfigs.forEach(poolConfig => {
    const sensors = {} as Record<SensorId, SensorData>;
    let anomalies: Anomaly[] = [];
    const poolStatus = statusMap.get(poolConfig.id);
    const latestSensorTimestamps = SENSOR_IDS.map(sensorId => {
      const key = `${poolConfig.id}:${sensorId}`;
      return getLatestReadingTimestamp(groupedReadings[key] ?? []);
    });
    const poolCycleMs = Math.max(
      poolStatus ? new Date(poolStatus.last_sync).getTime() : 0,
      ...latestSensorTimestamps,
    );

    SENSOR_IDS.forEach(sensorId => {
      const key = `${poolConfig.id}:${sensorId}`;
      const config = getPoolSensorConfig(poolConfig, sensorId);
      const history = applyStatusToHistory(groupedReadings[key] ?? [createOfflineReading(sensorId)], config);
      const latestSensorTimestampMs = getLatestReadingTimestamp(history);
      const connectionState = evaluateLiveSensorIssue(key, poolCycleMs, latestSensorTimestampMs, syncState);
      const derived = deriveAnomaliesFromHistory(poolConfig.id, sensorId, history, config).map(anomaly => ({
        ...anomaly,
        read: (readState[key] ?? []).includes(anomaly.id),
      }));
      const connectionAnomaly = buildConnectionAnomaly(
        poolConfig.id,
        sensorId,
        connectionState.issue,
        connectionState.missedCycles,
        poolCycleMs || latestSensorTimestampMs,
        config,
      );
      const sensorAnomalies = connectionAnomaly
        ? [...derived, { ...connectionAnomaly, read: (readState[key] ?? []).includes(connectionAnomaly.id) }]
        : derived;

      sensors[sensorId] = {
        config,
        current: history[history.length - 1],
        history,
        delta: calculateDelta(history),
        trend: calculateTrend(history),
        connectionIssue: connectionState.issue,
        hasUnreadAnomaly: sensorAnomalies.some(anomaly => !anomaly.read),
      };

      anomalies = [...anomalies, ...sensorAnomalies];
    });

    next[poolConfig.id] = {
      config: poolConfig,
      sensors,
      anomalies: anomalies
        .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
        .slice(0, 200),
      overallStatus: getOverallStatus(sensors),
      systemInfo: toSystemInfo(poolStatus),
    };
  });

  return next;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pools, setPools] = useState<Record<string, PoolData>>({});
  const [poolConfigs, setPoolConfigs] = useState<PoolConfig[]>([]);
  const [refreshInterval, setRefreshIntervalState] = useState(DEFAULT_REFRESH_INTERVAL);
  const [dataMode, setDataModeState] = useState<DataMode>('mock');
  const [devMode, setDevModeState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const readAnomalyIdsRef = useRef<Record<string, string[]>>({});
  const liveSensorSyncStateRef = useRef<Record<string, LiveSensorSyncState>>({});
  const [calibrations, setCalibrations] = useState<CalibrationMap>(() => loadCalibrations());

  useEffect(() => {
    return subscribeCalibrationChanges(() => setCalibrations(loadCalibrations()));
  }, []);

  const persistPreferences = useCallback(async (patch: { use_mock_data?: boolean; refresh_interval_ms?: number; dev_mode?: boolean }) => {
    if (!supabase || !user) return;

    const { error: persistError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        use_mock_data: patch.use_mock_data ?? dataMode === 'mock',
        refresh_interval_ms: patch.refresh_interval_ms ?? refreshInterval,
        dev_mode: patch.dev_mode ?? devMode,
      });

    if (persistError) throw persistError;
  }, [dataMode, devMode, refreshInterval, user]);

  const setDevMode = useCallback(async (enabled: boolean) => {
    setDevModeState(enabled);
    try {
      await persistPreferences({ dev_mode: enabled });
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : 'Gelistirici modu kaydedilemedi.');
    }
  }, [persistPreferences]);

  const markAnomaliesRead = useCallback((poolId: string, sensorId: SensorId) => {
    const key = `${poolId}:${sensorId}`;

    setPools(prev => {
      const pool = prev[poolId];
      if (!pool) return prev;

      const anomalyIds = pool.anomalies
        .filter(anomaly => anomaly.sensorId === sensorId)
        .map(anomaly => anomaly.id);

      readAnomalyIdsRef.current = {
        ...readAnomalyIdsRef.current,
        [key]: Array.from(new Set([...(readAnomalyIdsRef.current[key] ?? []), ...anomalyIds])),
      };

      if (dataMode === 'live') {
        const updatedSensors = { ...pool.sensors };
        updatedSensors[sensorId] = {
          ...updatedSensors[sensorId],
          hasUnreadAnomaly: false,
        };

        return {
          ...prev,
          [poolId]: {
            ...pool,
            sensors: updatedSensors,
            anomalies: pool.anomalies.map(anomaly =>
              anomaly.sensorId === sensorId ? { ...anomaly, read: true } : anomaly
            ),
          },
        };
      }

      const hasUnreadForSensor = pool.anomalies.some(anomaly => anomaly.sensorId === sensorId && !anomaly.read);
      const sensorHasUnread = pool.sensors[sensorId].hasUnreadAnomaly;
      if (!hasUnreadForSensor && !sensorHasUnread) {
        return prev;
      }

      const updatedSensors = { ...pool.sensors };
      updatedSensors[sensorId] = { ...updatedSensors[sensorId], hasUnreadAnomaly: false };

      return {
        ...prev,
        [poolId]: {
          ...pool,
          sensors: updatedSensors,
          anomalies: pool.anomalies.map(anomaly =>
            anomaly.sensorId === sensorId ? { ...anomaly, read: true } : anomaly
          ),
        },
      };
    });
  }, [dataMode]);

  const setRefreshInterval = useCallback(async (ms: number) => {
    const next = Math.min(60000, Math.max(1000, ms));
    setRefreshIntervalState(next);
    try {
      await persistPreferences({ refresh_interval_ms: next });
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : 'Refresh interval kaydedilemedi.');
    }
  }, [persistPreferences]);

  const setDataMode = useCallback(async (mode: DataMode) => {
    setDataModeState(mode);
    liveSensorSyncStateRef.current = {};
    setLoading(true);
    try {
      await persistPreferences({ use_mock_data: mode === 'mock' });
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : 'Veri modu kaydedilemedi.');
    }
  }, [persistPreferences]);

  const updatePoolThresholds = useCallback(async (
    poolId: string,
    thresholds: Record<SensorId, SensorThresholdConfig>,
  ) => {
    if (!supabase || !user) {
      throw new Error('Oturum bulunamadi.');
    }

    const nextThresholds = normalizeThresholds(thresholds);
    const { error: updateError } = await supabase
      .from('pools')
      .update({ sensor_thresholds: nextThresholds as unknown as Json })
      .eq('id', poolId);

    if (updateError) {
      setError(updateError.message);
      throw updateError;
    }

    setPoolConfigs(prev => prev.map(pool =>
      pool.id === poolId ? { ...pool, thresholds: nextThresholds } : pool
    ));
    setPools(prev => {
      const pool = prev[poolId];
      if (!pool) return prev;
      return {
        ...prev,
        [poolId]: {
          ...pool,
          config: { ...pool.config, thresholds: nextThresholds },
        },
      };
    });
  }, [user]);

  const updatePoolAlarmSettings = useCallback(async (poolId: string, patch: AlarmSettingsPatch) => {
    if (!supabase || !user) {
      throw new Error('Oturum bulunamadi.');
    }

    const current = poolConfigs.find(pool => pool.id === poolId)?.alarmSettings ?? getDefaultAlarmSettings();
    const nextSettings = mergeAlarmSettings(current, patch);
    const { error: updateError } = await supabase
      .from('pools')
      .update({ alarm_settings: nextSettings as unknown as Json })
      .eq('id', poolId);

    if (updateError) {
      setError(updateError.message);
      throw updateError;
    }

    setPoolConfigs(prev => prev.map(pool =>
      pool.id === poolId ? { ...pool, alarmSettings: nextSettings } : pool
    ));
    setPools(prev => {
      const pool = prev[poolId];
      if (!pool) return prev;
      return {
        ...prev,
        [poolId]: {
          ...pool,
          config: { ...pool.config, alarmSettings: nextSettings },
        },
      };
    });
  }, [poolConfigs, user]);

  const createPool = useCallback(async ({ name, location }: { name: string; location: string }) => {
    if (!supabase || !user) {
      throw new Error('Oturum bulunamadi.');
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Pool adi zorunlu.');
    }

    setError(null);

    const { data, error: createError } = await supabase.rpc('create_pool', {
      pool_name: trimmedName,
      pool_location: location.trim(),
    });

    if (createError) {
      const message = createError.message.includes('duplicate key') ? 'Bu isimde bir pool zaten var.' : createError.message;
      setError(message);
      throw new Error(message);
    }

    const { data: poolsData, error: poolsError } = await supabase
      .from('pools')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order');

    if (poolsError) {
      setError(poolsError.message);
      throw poolsError;
    }

    setPoolConfigs((poolsData ?? []).map(mapPoolRowToConfig));
    return data;
  }, [user]);

  const claimPool = useCallback(async ({ poolId, name, location }: { poolId: string; name?: string; location?: string }) => {
    if (!supabase || !user) {
      throw new Error('Oturum bulunamadi.');
    }

    const trimmedId = poolId.trim();
    if (!trimmedId) {
      throw new Error('Havuz (cihaz) kimligi zorunlu.');
    }

    setError(null);

    const { data, error: claimError } = await supabase.rpc('claim_pool', {
      target_pool_id: trimmedId,
      pool_name: name?.trim() || undefined,
      pool_location: location?.trim() || undefined,
    });

    if (claimError) {
      const raw = claimError.message ?? '';
      let message = raw;
      if (raw.includes('invalid input syntax')) message = 'Gecersiz kimlik formati. Tam havuz kimligini yapistirin.';
      else if (raw.includes('not found')) message = 'Bu kimlikte bir havuz bulunamadi.';
      else if (raw.includes('already claimed')) message = 'Bu havuz baska bir hesaba tanimli.';
      setError(message);
      throw new Error(message);
    }

    const { data: poolsData, error: poolsError } = await supabase
      .from('pools')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order');

    if (poolsError) {
      setError(poolsError.message);
      throw poolsError;
    }

    setPoolConfigs((poolsData ?? []).map(mapPoolRowToConfig));
    return data;
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      if (!user || !supabase) {
        if (!cancelled) {
          setPools({});
          setPoolConfigs([]);
          setWorkspaceReady(false);
          setLoading(false);
          setError(null);
          readAnomalyIdsRef.current = {};
          liveSensorSyncStateRef.current = {};
        }
        return;
      }

      setLoading(true);
      setWorkspaceReady(false);
      setError(null);
      readAnomalyIdsRef.current = {};
      liveSensorSyncStateRef.current = {};

      try {
        const { error: bootstrapError } = await supabase.rpc('bootstrap_user_workspace');
        if (bootstrapError) throw bootstrapError;

        const [{ data: preferences, error: preferencesError }, { data: poolsData, error: poolsError }] = await Promise.all([
          supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('pools')
            .select('*')
            .eq('user_id', user.id)
            .order('sort_order'),
        ]);

        if (preferencesError) throw preferencesError;
        if (poolsError) throw poolsError;
        if (cancelled) return;

        const nextPoolConfigs = (poolsData ?? []).map(mapPoolRowToConfig);
        setPoolConfigs(nextPoolConfigs);
        setRefreshIntervalState(preferences?.refresh_interval_ms ?? DEFAULT_REFRESH_INTERVAL);
        setDataModeState(preferences?.use_mock_data === false ? 'live' : 'mock');
        setDevModeState(preferences?.dev_mode === true);
        setWorkspaceReady(true);
      } catch (workspaceError) {
        if (cancelled) return;
        setError(workspaceError instanceof Error ? workspaceError.message : 'Workspace yuklenemedi.');
        setPools({});
        setPoolConfigs([]);
        setWorkspaceReady(true);
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!workspaceReady) return undefined;

    let cancelled = false;

    if (dataMode === 'mock') {
      setPools(buildMockInitialPools(poolConfigs, calibrations));
      setLoading(false);

      const timer = window.setInterval(() => {
        if (cancelled) return;
        setPools(prev => tickMockPools(prev, poolConfigs, calibrations));
      }, refreshInterval);

      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }

    const syncLivePools = async (withLoadingState: boolean) => {
      if (!supabase || !user) return;
      if (withLoadingState) {
        setPools(buildEmptyLivePools(poolConfigs));
        setLoading(true);
      }

      try {
        const snapshot = await fetchLivePools(poolConfigs, readAnomalyIdsRef.current, liveSensorSyncStateRef.current, calibrations);
        if (cancelled) return;
        setPools(snapshot);
        setError(null);
      } catch (syncError) {
        if (cancelled) return;
        setPools(buildEmptyLivePools(poolConfigs));
        setError(syncError instanceof Error ? syncError.message : 'Supabase verisi alinamadi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    syncLivePools(true);
    const timer = window.setInterval(() => {
      void syncLivePools(false);
    }, refreshInterval);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [dataMode, poolConfigs, refreshInterval, user, workspaceReady, calibrations]);

  const value = useMemo<SensorContextValue>(() => ({
    pools,
    refreshInterval,
    setRefreshInterval,
    dataMode,
    setDataMode,
    devMode,
    setDevMode,
    updatePoolThresholds,
    updatePoolAlarmSettings,
    createPool,
    claimPool,
    loading,
    error,
    markAnomaliesRead,
  }), [createPool, claimPool, dataMode, devMode, setDevMode, error, loading, markAnomaliesRead, pools, refreshInterval, setDataMode, setRefreshInterval, updatePoolAlarmSettings, updatePoolThresholds]);

  return (
    <SensorContext.Provider value={value}>
      {children}
    </SensorContext.Provider>
  );
}
