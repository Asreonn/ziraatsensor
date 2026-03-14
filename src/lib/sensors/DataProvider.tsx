import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  SensorId, SensorData, Anomaly, SystemInfo,
  SENSOR_CONFIGS, SENSOR_IDS,
} from './types';
import {
  generateHistory, generateReading, calculateDelta,
  calculateTrend, detectAnomalies, generateSystemInfo,
} from './mockGenerator';

interface SensorContextValue {
  sensors: Record<SensorId, SensorData>;
  anomalies: Anomaly[];
  systemInfo: SystemInfo;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;
}

const SensorContext = createContext<SensorContextValue | null>(null);

export function useSensorData() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensorData must be within DataProvider');
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [sensors, setSensors] = useState<Record<SensorId, SensorData>>(() => {
    const initial: Record<string, SensorData> = {};
    SENSOR_IDS.forEach(id => {
      const config = SENSOR_CONFIGS[id];
      const history = generateHistory(config, 60, 60);
      initial[id] = {
        config,
        current: history[history.length - 1],
        history,
        delta: calculateDelta(history),
        trend: calculateTrend(history),
      };
    });
    return initial as Record<SensorId, SensorData>;
  });

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(generateSystemInfo);

  const anomalyRef = useRef(anomalies);
  anomalyRef.current = anomalies;

  const tick = useCallback(() => {
    setSensors(prev => {
      const next = { ...prev };
      const newAnomalies: Anomaly[] = [];

      SENSOR_IDS.forEach(id => {
        const config = SENSOR_CONFIGS[id];
        const reading = generateReading(config);
        const history = [...prev[id].history.slice(-119), reading];
        const data: SensorData = {
          config,
          current: reading,
          history,
          delta: calculateDelta(history),
          trend: calculateTrend(history),
        };
        next[id] = data;
        newAnomalies.push(...detectAnomalies(id, history));
      });

      if (newAnomalies.length > 0) {
        setAnomalies(prev => [...newAnomalies, ...prev].slice(0, 100));
      }
      return next as Record<SensorId, SensorData>;
    });
    setSystemInfo(generateSystemInfo());
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, refreshInterval);
    return () => clearInterval(interval);
  }, [tick, refreshInterval]);

  return (
    <SensorContext.Provider value={{ sensors, anomalies, systemInfo, refreshInterval, setRefreshInterval }}>
      {children}
    </SensorContext.Provider>
  );
}
