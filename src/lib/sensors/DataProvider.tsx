import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SensorId, SensorData, Anomaly, SystemInfo, PoolData,
  SENSOR_CONFIGS, SENSOR_IDS, POOL_CONFIGS,
} from './types';
import {
  generateHistory, generateReading, calculateDelta,
  calculateTrend, detectAnomalies, generateSystemInfo,
} from './mockGenerator';

interface SensorContextValue {
  pools: Record<string, PoolData>;
  systemInfo: SystemInfo;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;
  markAnomaliesRead: (poolId: string, sensorId: SensorId) => void;
}

const SensorContext = createContext<SensorContextValue | null>(null);

export function useSensorData() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensorData must be within DataProvider');
  return ctx;
}

function buildPoolSensors(poolId: string): Record<SensorId, SensorData> {
  const poolConfig = POOL_CONFIGS.find(p => p.id === poolId)!;
  const sensors: Record<string, SensorData> = {};
  SENSOR_IDS.forEach(id => {
    const config = SENSOR_CONFIGS[id];
    const offset = poolConfig.offsets[id] ?? 0;
    const history = generateHistory(config, offset, 60, 60);
    sensors[id] = {
      config, current: history[history.length - 1], history,
      delta: calculateDelta(history), trend: calculateTrend(history),
      hasUnreadAnomaly: false,
    };
  });
  return sensors as Record<SensorId, SensorData>;
}

function getOverallStatus(sensors: Record<SensorId, SensorData>) {
  const statuses = SENSOR_IDS.map(id => sensors[id].current.status);
  if (statuses.includes('critical')) return 'critical' as const;
  if (statuses.includes('warning')) return 'warning' as const;
  return 'healthy' as const;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [refreshInterval, setRefreshInterval] = useState(3000);

  const [pools, setPools] = useState<Record<string, PoolData>>(() => {
    const initial: Record<string, PoolData> = {};
    POOL_CONFIGS.forEach(pc => {
      const sensors = buildPoolSensors(pc.id);
      initial[pc.id] = { config: pc, sensors, anomalies: [], overallStatus: getOverallStatus(sensors) };
    });
    return initial;
  });

  const [systemInfo, setSystemInfo] = useState<SystemInfo>(generateSystemInfo);

  const markAnomaliesRead = useCallback((poolId: string, sensorId: SensorId) => {
    setPools(prev => {
      const pool = prev[poolId];
      if (!pool) return prev;
      const updatedAnomalies = pool.anomalies.map(a =>
        a.sensorId === sensorId ? { ...a, read: true } : a
      );
      const updatedSensors = { ...pool.sensors };
      updatedSensors[sensorId] = { ...updatedSensors[sensorId], hasUnreadAnomaly: false };
      return {
        ...prev,
        [poolId]: { ...pool, anomalies: updatedAnomalies, sensors: updatedSensors },
      };
    });
  }, []);

  const tick = useCallback(() => {
    setPools(prev => {
      const next: Record<string, PoolData> = {};
      POOL_CONFIGS.forEach(pc => {
        const prevPool = prev[pc.id];
        const offset = pc.offsets;
        const sensors: Record<string, SensorData> = {};
        let newAnomalies: Anomaly[] = [];

        SENSOR_IDS.forEach(id => {
          const config = SENSOR_CONFIGS[id];
          const reading = generateReading(config, offset[id] ?? 0);
          const history = [...prevPool.sensors[id].history.slice(-119), reading];
          const detected = detectAnomalies(pc.id, id, history);
          const hadUnread = prevPool.sensors[id].hasUnreadAnomaly;

          sensors[id] = {
            config, current: reading, history,
            delta: calculateDelta(history), trend: calculateTrend(history),
            hasUnreadAnomaly: hadUnread || detected.length > 0,
          };
          newAnomalies.push(...detected);
        });

        const allAnomalies = [...newAnomalies, ...prevPool.anomalies].slice(0, 200);
        next[pc.id] = {
          config: pc,
          sensors: sensors as Record<SensorId, SensorData>,
          anomalies: allAnomalies,
          overallStatus: getOverallStatus(sensors as Record<SensorId, SensorData>),
        };
      });
      return next;
    });
    setSystemInfo(generateSystemInfo());
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, refreshInterval);
    return () => clearInterval(interval);
  }, [tick, refreshInterval]);

  return (
    <SensorContext.Provider value={{ pools, systemInfo, refreshInterval, setRefreshInterval, markAnomaliesRead }}>
      {children}
    </SensorContext.Provider>
  );
}
