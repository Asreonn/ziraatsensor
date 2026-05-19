import { describe, expect, it } from 'vitest';
import {
  formatSensorValue,
  getSensorConnectionMessage,
  getSensorDisplayStatus,
  getSensorStatusLabel,
  hasSensorReading,
  hasSystemStatusData,
} from './display';

describe('sensor display helpers', () => {
  it('treats epoch offline readings as missing live data', () => {
    const reading = {
      value: 0,
      timestamp: new Date(0),
      status: 'offline' as const,
    };

    expect(hasSensorReading(reading)).toBe(false);
    expect(formatSensorValue(reading, 'ph')).toBe('--');
  });

  it('formats real live readings normally', () => {
    const reading = {
      value: 7.23,
      timestamp: new Date('2026-03-17T10:00:00Z'),
      status: 'healthy' as const,
    };

    expect(hasSensorReading(reading)).toBe(true);
    expect(formatSensorValue(reading, 'ph')).toBe('7.23');
  });

  it('detects missing system status rows', () => {
    expect(hasSystemStatusData({
      uptime: 0,
      rssi: -100,
      voltage: 0,
      lastSync: new Date(0),
      sensorConnections: {
        ph: false,
        ec: false,
        do: false,
        waterTemp: false,
        airTemp: false,
        humidity: false,
      },
    })).toBe(false);
  });

  it('treats missing updates and faulty sensors as offline (no data)', () => {
    expect(getSensorConnectionMessage('missed_once')).toContain('veri alinmadi');
    expect(getSensorConnectionMessage('faulty')).toContain('veri akmiyor');

    expect(getSensorStatusLabel({
      current: { value: 0, timestamp: new Date(), status: 'healthy' },
      connectionIssue: 'missed_once',
    })).toBe('Veri bekleniyor');

    expect(getSensorDisplayStatus({
      current: { value: 0, timestamp: new Date(), status: 'healthy' },
      connectionIssue: 'faulty',
    })).toBe('offline');

    expect(getSensorDisplayStatus({
      current: { value: 0, timestamp: new Date(0), status: 'offline' },
      connectionIssue: null,
    })).toBe('offline');
  });
});
