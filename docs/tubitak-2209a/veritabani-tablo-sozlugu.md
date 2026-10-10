# AICO 2209-A Veritabanı Tabloları

## Tablo Özeti

| Tablo | Amaç | Ana alanlar |
| --- | --- | --- |
| user_preferences | Panel tercihleri | user_id, use_mock_data, refresh_interval_ms, dev_mode |
| pools | Havuz/cihaz kaydı ve ayarlar | id, user_id, name, sensor_thresholds, alarm_settings |
| pool_system_status | Cihaz sağlık durumu | pool_id, uptime_seconds, rssi, voltage, sensor_connections, diagnostics |
| sensor_readings | Zaman serisi ölçümler | pool_id, sensor_id, value, recorded_at |
| sensor_event_logs | Alarm ve olay geçmişi | pool_id, event_type, sensor_id, alarm_key, severity, created_at |

## FK İlişki Özeti

| No | Kaynak sütun | Hedef sütun | Kardinalite |
| --- | --- | --- | --- |
| R1 | auth.users.id | user_preferences.user_id | 1:1 |
| R2 | auth.users.id | pools.user_id | 1:N |
| R3 | pools.id | pool_system_status.pool_id | 1:1 |
| R4 | pools.id | sensor_readings.pool_id | 1:N |
| R5 | pools.id | sensor_event_logs.pool_id | 1:N |

## Sensör Kimlikleri

| Sensör | Kimlik | Birim | Kaynak |
| --- | --- | --- | --- |
| pH | ph | - | ADS1115 A0 |
| EC | ec | mS/cm | ADS1115 A1 |
| TDS | tds | ppm | ADS1115 A1 |
| Çözünmüş oksijen | do | mg/L | ADS1115 A2 |
| Işık | ldr | % | ADS1115 A3 |
| Su sıcaklığı | waterTemp | °C | DS18B20 D5 |
| Hava sıcaklığı | airTemp | °C | DHT22 D6 |
| Nem | humidity | % | DHT22 D6 |
