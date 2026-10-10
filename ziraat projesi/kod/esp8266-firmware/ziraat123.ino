#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <EEPROM.h>
#include <string.h>
#include <stddef.h>

// Dahili besleme voltajini olcmek icin (analog A0 ADS1115'e tasindigi icin bos).
ADC_MODE(ADC_VCC);

// --- WiFi Bilgileri ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- Supabase Proje Bilgileri ---
const char* SUPABASE_URL = "https://qmbsptypsnaxojzjrzeu.supabase.co";
const char* SERVICE_ROLE_KEY = "<SUPABASE_SERVICE_ROLE_KEY>";

// --- Havuz Kimliği ---
const char* POOL_ID = "8668a7bf-9c21-4e46-940b-4cd81f3a7f6a";

// --- Sensör Pinleri ve Ayarları ---
#define DHTPIN   D6
#define DHTTYPE  DHT22
#define ONE_WIRE_BUS D5

Adafruit_ADS1115 ads;                  // I2C analog cevirici (pH, TDS, DO, LDR)
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature waterTempSens(&oneWire);
DHT dht(DHTPIN, DHTTYPE);

bool adsOk = false;                    // ADS1115 baslatildi mi

// --- Uyari / durum pinleri ---
#define RED_LED_PIN    D8              // WiFi baglanma / baglanti yok
#define GREEN_LED_PIN  D7              // WiFi baglandi
#define BUZZER_PIN     D0              // Esik disi sensor uyarisi

// --- WiFi durum zamanlamasi ---
const unsigned long WIFI_START_DELAY_MS = 5000;     // Acilistan 5 sn sonra baglanmayi dene
const unsigned long WIFI_RETRY_INTERVAL_MS = 15000; // Baglanamazsa tekrar dene
const unsigned long WIFI_BLINK_INTERVAL_MS = 500;
bool wifiAttemptStarted = false;
unsigned long bootMillis = 0;
unsigned long lastWiFiAttempt = 0;
unsigned long lastWiFiBlink = 0;
bool redLedState = true;

// --- Gonderim Zamanlamasi ---
unsigned long previousMillis = 0;
const unsigned long DEFAULT_READING_INTERVAL_MS = 10000;
const unsigned long MIN_READING_INTERVAL_MS = 1000;
const unsigned long MAX_READING_INTERVAL_MS = 60000;
unsigned long readingIntervalMs = DEFAULT_READING_INTERVAL_MS;

// --- Site kontrollu alarm ayarlari ---
enum SensorSlot {
  SENSOR_PH,
  SENSOR_EC,
  SENSOR_TDS,
  SENSOR_DO,
  SENSOR_LDR,
  SENSOR_WATER_TEMP,
  SENSOR_AIR_TEMP,
  SENSOR_HUMIDITY,
  SENSOR_COUNT
};

const char* SENSOR_KEYS[SENSOR_COUNT] = {
  "ph", "ec", "tds", "do", "ldr", "waterTemp", "airTemp", "humidity"
};

struct SensorThreshold {
  float warningMin;
  float warningMax;
};

SensorThreshold alarmThresholds[SENSOR_COUNT] = {
  {6.5, 8.5},    // pH
  {1.0, 3.0},    // EC
  {150, 1200},   // TDS
  {5.0, 12.0},   // DO
  {20, 90},      // LDR
  {20, 30},      // Su sicakligi
  {18, 35},      // Hava sicakligi
  {40, 80}       // Nem
};

bool alarmSensorEnabled[SENSOR_COUNT] = {
  true, true, true, true, true, true, true, true
};
bool buzzerEnabled = true;
bool alarmActive = false;
String currentAlarmKey = "";
String mutedAlarmKey = "";
String lastReportedAlarmKey = "";
unsigned long lastSettingsFetch = 0;
const unsigned long SETTINGS_FETCH_INTERVAL_MS = 15000;

// --- Kalici ayar onbellegi ---
const size_t EEPROM_SIZE = 512;
const uint32_t SETTINGS_MAGIC = 0x5A495241; // ZIRA
const uint16_t SETTINGS_VERSION = 1;

struct PersistedSettings {
  uint32_t magic;
  uint16_t version;
  uint16_t size;
  uint32_t readingIntervalMs;
  uint8_t buzzerEnabled;
  uint8_t alarmSensorEnabled[SENSOR_COUNT];
  float warningMin[SENSOR_COUNT];
  float warningMax[SENSOR_COUNT];
  uint32_t checksum;
};

bool cachedSettingsLoaded = false;
unsigned long settingsSaveCount = 0;

// --- Buzzer zamanlamasi: 2 sn'de bir 0.5 sn ot ---
const unsigned long BUZZER_PERIOD_MS = 2000;
const unsigned long BUZZER_ON_MS = 500;
unsigned long lastBuzzerCycle = 0;
unsigned long buzzerStartedAt = 0;
bool buzzerOn = false;

// =====================================================================
void setup() {
  Serial.begin(115200);
  bootMillis = millis();

  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(RED_LED_PIN, HIGH);    // Acilista kirmizi yanar
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  EEPROM.begin(EEPROM_SIZE);
  cachedSettingsLoaded = loadPersistedSettings();
  Serial.printf("Kalici ayar: %s\n", cachedSettingsLoaded ? "yuklendi" : "varsayilan");

  // I2C (ESP8266): D2 = SDA, D1 = SCL
  Wire.begin(D2, D1);

  // ADS1115 baslat
  adsOk = ads.begin();
  if (adsOk) {
    ads.setGain(GAIN_TWOTHIRDS);       // +/-6.144V, 1 bit = 0.1875mV
    Serial.println(F("ADS1115 hazir."));
  } else {
    Serial.println(F("ADS1115 BULUNAMADI! Analog sensorler okunamayacak."));
  }

  waterTempSens.begin();
  dht.begin();

  WiFi.mode(WIFI_STA);
  Serial.println(F("Acilis beklemesi: WiFi 5 sn sonra denenecek."));
}

// =====================================================================
void loop() {
  unsigned long currentMillis = millis();

  handleWiFiStatus(currentMillis);

  if (currentMillis - previousMillis < readingIntervalMs) {
    handleBuzzer(currentMillis);
    return;
  }
  stopBuzzer();
  previousMillis = currentMillis;

  fetchPoolSettings(currentMillis);

  Serial.printf("Heap: %u, MaxBlock: %u\n", ESP.getFreeHeap(), ESP.getMaxFreeBlockSize());

  // ----------------------------------------------------------------
  // 1. ANALOG SENSORLER (ADS1115)
  // ----------------------------------------------------------------
  float phVoltage = 0, tdsVoltage = 0, doVoltage = 0, ldrVoltage = 0;
  if (adsOk) {
    phVoltage  = ads.readADC_SingleEnded(0) * 0.1875 / 1000.0;
    tdsVoltage = ads.readADC_SingleEnded(1) * 0.1875 / 1000.0;
    doVoltage  = ads.readADC_SingleEnded(2) * 0.1875 / 1000.0;
    ldrVoltage = ads.readADC_SingleEnded(3) * 0.1875 / 1000.0;
  }

  // ----------------------------------------------------------------
  // 2. DIGER SENSORLER
  // ----------------------------------------------------------------
  waterTempSens.requestTemperatures();
  float wTemp = waterTempSens.getTempCByIndex(0);
  float aTemp = dht.readTemperature();
  float hum   = dht.readHumidity();

  // ----------------------------------------------------------------
  // 3. FIZIKSEL DEGER HESAPLARI
  // ----------------------------------------------------------------
  float phValue = 7.7 + (phVoltage - 1.30) * 4.0;
  phValue = constrain(phValue, 0, 14);

  float compTemp  = (wTemp == -127.00) ? 25.0 : wTemp;
  float compCoef  = 1.0 + 0.02 * (compTemp - 25.0);
  float compVolt  = tdsVoltage / compCoef;
  float tdsValue  = (133.42 * pow(compVolt, 3) - 255.86 * pow(compVolt, 2) + 857.39 * compVolt) * 0.5;
  if (tdsValue < 0) tdsValue = 0;

  float ecValue   = tdsValue / 500.0;          // ppm -> mS/cm (yaklasik)
  float doValue   = doVoltage * 4.5;           // mg/L
  float ldrPercent = (ldrVoltage / 5.0) * 100.0;
  ldrPercent = constrain(ldrPercent, 0, 100);

  // ----------------------------------------------------------------
  // 4. SENSOR BAGLANTI (AKTIFLIK) DURUMLARI
  // ----------------------------------------------------------------
  bool waterTempOk = (wTemp != -127.00 && wTemp != 85.00);
  bool airTempOk   = !isnan(aTemp);
  bool humOk       = !isnan(hum);
  bool phOk  = adsOk;
  bool tdsOk = adsOk;
  bool ecOk  = adsOk;
  bool doOk  = adsOk;
  bool ldrOk = adsOk;

  updateAlarmState(phValue, ecValue, tdsValue, doValue, ldrPercent, wTemp, aTemp, hum,
                   phOk, ecOk, tdsOk, doOk, ldrOk, waterTempOk, airTempOk, humOk);

  // ----------------------------------------------------------------
  // 5. SERIAL RAPORU
  // ----------------------------------------------------------------
  Serial.println(F("\n================================================"));
  Serial.printf ("  Uptime : %lu sn   WiFi: %s (RSSI %d dBm)   Vcc: %.2f V\n",
                 millis() / 1000,
                 WiFi.status() == WL_CONNECTED ? "BAGLI" : "YOK",
                 WiFi.RSSI(),
                 ESP.getVcc() / 1000.0);
  Serial.println(F("------------------------------------------------"));
  Serial.printf ("  pH    : %.2f  (%.3f V) [%s]\n", phValue, phVoltage, phOk ? "OK" : "YOK");
  Serial.printf ("  TDS   : %.1f ppm  [%s]\n", tdsValue, tdsOk ? "OK" : "YOK");
  Serial.printf ("  EC    : %.2f mS/cm\n", ecValue);
  Serial.printf ("  DO    : %.2f mg/L  [%s]\n", doValue, doOk ? "OK" : "YOK");
  Serial.printf ("  LDR   : %% %.1f  [%s]\n", ldrPercent, ldrOk ? "OK" : "YOK");
  Serial.printf ("  Su Sic: %s\n", waterTempOk ? String(wTemp, 2).c_str() : "BAGLANTI HATASI");
  Serial.printf ("  Hava  : %s\n", airTempOk ? String(aTemp, 2).c_str() : "BAGLANTI HATASI");
  Serial.printf ("  Nem   : %s\n", humOk ? String(hum, 2).c_str() : "BAGLANTI HATASI");
  Serial.println(F("================================================"));

  // ----------------------------------------------------------------
  // 6. SUPABASE'E GONDER
  // ----------------------------------------------------------------
  if (WiFi.status() == WL_CONNECTED) {
    sendSensorReadings(phValue, ecValue, tdsValue, doValue, ldrPercent, wTemp, aTemp, hum,
                       phOk, ecOk, tdsOk, doOk, ldrOk, waterTempOk, airTempOk, humOk);
    updateSystemStatus(phOk, ecOk, tdsOk, doOk, ldrOk, waterTempOk, airTempOk, humOk,
                       phVoltage, tdsVoltage, doVoltage, ldrVoltage);
  } else {
    Serial.println(F("  >> WiFi yok, gonderim atlandi."));
  }
}

// =====================================================================
void startWiFiAttempt(unsigned long now) {
  WiFi.disconnect();
  WiFi.begin(ssid, password);
  wifiAttemptStarted = true;
  lastWiFiAttempt = now;
  Serial.print(F("WiFi'ye baglaniyor"));
}

void handleWiFiStatus(unsigned long now) {
  if (now - bootMillis < WIFI_START_DELAY_MS) {
    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(GREEN_LED_PIN, LOW);
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(GREEN_LED_PIN, HIGH);
    return;
  }

  digitalWrite(GREEN_LED_PIN, LOW);
  if (now - lastWiFiBlink >= WIFI_BLINK_INTERVAL_MS) {
    lastWiFiBlink = now;
    redLedState = !redLedState;
    digitalWrite(RED_LED_PIN, redLedState ? HIGH : LOW);
    Serial.print(F("."));
  }

  if (!wifiAttemptStarted || now - lastWiFiAttempt >= WIFI_RETRY_INTERVAL_MS) {
    startWiFiAttempt(now);
  }
}

bool isOutsideWarning(int index, float value) {
  return value < alarmThresholds[index].warningMin || value > alarmThresholds[index].warningMax;
}

String buildAlarmPart(int index, float value) {
  String part = SENSOR_KEYS[index];
  part += ":";
  part += value < alarmThresholds[index].warningMin ? "low" : "high";
  return part;
}

void updateAlarmState(float ph, float ec, float tds, float dox, float ldr,
                      float wTemp, float aTemp, float hum,
                      bool phOk, bool ecOk, bool tdsOk, bool doOk, bool ldrOk,
                      bool wTempOk, bool aTempOk, bool humOk) {
  float values[SENSOR_COUNT] = { ph, ec, tds, dox, ldr, wTemp, aTemp, hum };
  bool ok[SENSOR_COUNT] = { phOk, ecOk, tdsOk, doOk, ldrOk, wTempOk, aTempOk, humOk };

  String nextAlarmKey = "";
  alarmActive = false;
  for (int i = 0; i < SENSOR_COUNT; i++) {
    if (!alarmSensorEnabled[i] || !ok[i]) continue;
    if (isOutsideWarning(i, values[i])) {
      alarmActive = true;
      if (nextAlarmKey.length() > 0) nextAlarmKey += "|";
      nextAlarmKey += buildAlarmPart(i, values[i]);
      Serial.printf("  [UYARI] %s esik disi: %.2f (%.2f - %.2f)\n",
                    SENSOR_KEYS[i], values[i], alarmThresholds[i].warningMin, alarmThresholds[i].warningMax);
    }
  }

  currentAlarmKey = nextAlarmKey;
  syncAlarmTransition();
}

void stopBuzzer() {
  digitalWrite(BUZZER_PIN, LOW);
  buzzerOn = false;
}

void handleBuzzer(unsigned long now) {
  bool mutedForCurrentAlarm = currentAlarmKey.length() > 0 && mutedAlarmKey == currentAlarmKey;
  bool shouldBuzz = alarmActive && buzzerEnabled && !mutedForCurrentAlarm;
  if (!shouldBuzz) {
    stopBuzzer();
    return;
  }

  if (!buzzerOn && now - lastBuzzerCycle >= BUZZER_PERIOD_MS) {
    digitalWrite(BUZZER_PIN, HIGH);
    buzzerOn = true;
    buzzerStartedAt = now;
  }

  if (buzzerOn && now - buzzerStartedAt >= BUZZER_ON_MS) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerOn = false;
    lastBuzzerCycle = now;
  }
}

void fetchPoolSettings(unsigned long now) {
  if (WiFi.status() != WL_CONNECTED) return;
  if (lastSettingsFetch != 0 && now - lastSettingsFetch < SETTINGS_FETCH_INTERVAL_MS) return;
  lastSettingsFetch = now;

  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(4096, 512);
  HTTPClient http;
  http.setReuse(false);
  http.setTimeout(10000);

  String url = String(SUPABASE_URL) + "/rest/v1/pools?id=eq." + POOL_ID + "&select=alarm_settings,sensor_thresholds";
  http.begin(client, url);
  addCommonHeaders(http);

  int code = http.GET();
  if (code < 200 || code >= 300) {
    Serial.printf("  [HATA] Alarm Ayarlari -> HTTP %d | %s\n", code, http.errorToString(code).c_str());
    Serial.println(http.getString());
    http.end();
    return;
  }

  DynamicJsonDocument doc(3072);
  DeserializationError error = deserializeJson(doc, http.getString());
  http.end();
  if (error) {
    Serial.printf("  [HATA] Alarm Ayarlari JSON -> %s\n", error.c_str());
    return;
  }

  JsonArray rows = doc.as<JsonArray>();
  if (rows.isNull() || rows.size() == 0) return;

  JsonObject row = rows[0].as<JsonObject>();
  bool settingsChanged = false;
  JsonObject alarm = row["alarm_settings"].as<JsonObject>();
  if (!alarm.isNull()) {
    if (alarm.containsKey("buzzerEnabled")) {
      bool nextBuzzerEnabled = alarm["buzzerEnabled"].as<bool>();
      if (buzzerEnabled != nextBuzzerEnabled) {
        buzzerEnabled = nextBuzzerEnabled;
        settingsChanged = true;
      }
    }
    if (alarm.containsKey("readingIntervalMs")) {
      unsigned long nextInterval = clampReadingInterval(alarm["readingIntervalMs"].as<unsigned long>());
      if (readingIntervalMs != nextInterval) {
        readingIntervalMs = nextInterval;
        settingsChanged = true;
      }
    }
    if (alarm.containsKey("mutedAlarmKey") && !alarm["mutedAlarmKey"].isNull()) {
      mutedAlarmKey = alarm["mutedAlarmKey"].as<String>();
    } else {
      mutedAlarmKey = "";
    }

    JsonObject sensors = alarm["alarmSensors"].as<JsonObject>();
    if (!sensors.isNull()) {
      for (int i = 0; i < SENSOR_COUNT; i++) {
        if (sensors.containsKey(SENSOR_KEYS[i])) {
          bool nextEnabled = sensors[SENSOR_KEYS[i]].as<bool>();
          if (alarmSensorEnabled[i] != nextEnabled) {
            alarmSensorEnabled[i] = nextEnabled;
            settingsChanged = true;
          }
        }
      }
    }
  }

  JsonObject thresholds = row["sensor_thresholds"].as<JsonObject>();
  if (!thresholds.isNull()) {
    for (int i = 0; i < SENSOR_COUNT; i++) {
      JsonObject t = thresholds[SENSOR_KEYS[i]].as<JsonObject>();
      if (t.isNull()) continue;
      if (t.containsKey("warningMin")) {
        float nextMin = t["warningMin"].as<float>();
        if (fabs(alarmThresholds[i].warningMin - nextMin) > 0.001) {
          alarmThresholds[i].warningMin = nextMin;
          settingsChanged = true;
        }
      }
      if (t.containsKey("warningMax")) {
        float nextMax = t["warningMax"].as<float>();
        if (fabs(alarmThresholds[i].warningMax - nextMax) > 0.001) {
          alarmThresholds[i].warningMax = nextMax;
          settingsChanged = true;
        }
      }
    }
  }

  if (settingsChanged || !cachedSettingsLoaded) {
    if (savePersistedSettings()) {
      cachedSettingsLoaded = true;
    }
  }

  Serial.printf("  [OK]   Alarm Ayarlari -> buzzer:%s mute:%s alarm:%s interval:%lu ms\n",
                buzzerEnabled ? "acik" : "kapali",
                mutedAlarmKey.length() > 0 ? mutedAlarmKey.c_str() : "yok",
                alarmActive ? "aktif" : "normal",
                readingIntervalMs);
}

unsigned long clampReadingInterval(unsigned long value) {
  if (value < MIN_READING_INTERVAL_MS) return MIN_READING_INTERVAL_MS;
  if (value > MAX_READING_INTERVAL_MS) return MAX_READING_INTERVAL_MS;
  return value;
}

uint32_t computeSettingsChecksumBytes(const uint8_t* bytes, size_t length) {
  uint32_t hash = 2166136261UL;
  for (size_t i = 0; i < length; i++) {
    hash ^= bytes[i];
    hash *= 16777619UL;
  }
  return hash;
}

bool loadPersistedSettings() {
  PersistedSettings settings;
  EEPROM.get(0, settings);

  if (settings.magic != SETTINGS_MAGIC ||
      settings.version != SETTINGS_VERSION ||
      settings.size != sizeof(PersistedSettings) ||
      settings.checksum != computeSettingsChecksumBytes(
        reinterpret_cast<const uint8_t*>(&settings),
        offsetof(PersistedSettings, checksum)
      )) {
    return false;
  }

  readingIntervalMs = clampReadingInterval(settings.readingIntervalMs);
  buzzerEnabled = settings.buzzerEnabled == 1;
  for (int i = 0; i < SENSOR_COUNT; i++) {
    alarmSensorEnabled[i] = settings.alarmSensorEnabled[i] == 1;
    if (isfinite(settings.warningMin[i]) && isfinite(settings.warningMax[i])) {
      alarmThresholds[i].warningMin = settings.warningMin[i];
      alarmThresholds[i].warningMax = settings.warningMax[i];
    }
  }
  return true;
}

bool savePersistedSettings() {
  PersistedSettings settings;
  memset(&settings, 0, sizeof(settings));
  settings.magic = SETTINGS_MAGIC;
  settings.version = SETTINGS_VERSION;
  settings.size = sizeof(PersistedSettings);
  settings.readingIntervalMs = readingIntervalMs;
  settings.buzzerEnabled = buzzerEnabled ? 1 : 0;
  for (int i = 0; i < SENSOR_COUNT; i++) {
    settings.alarmSensorEnabled[i] = alarmSensorEnabled[i] ? 1 : 0;
    settings.warningMin[i] = alarmThresholds[i].warningMin;
    settings.warningMax[i] = alarmThresholds[i].warningMax;
  }
  settings.checksum = computeSettingsChecksumBytes(
    reinterpret_cast<const uint8_t*>(&settings),
    offsetof(PersistedSettings, checksum)
  );

  EEPROM.put(0, settings);
  bool ok = EEPROM.commit();
  if (ok) {
    settingsSaveCount++;
    Serial.println(F("  [OK]   Kalici ayar onbellegi guncellendi."));
  } else {
    Serial.println(F("  [HATA] Kalici ayar onbellegi yazilamadi."));
  }
  return ok;
}

void syncAlarmTransition() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (currentAlarmKey != lastReportedAlarmKey) {
    if (currentAlarmKey.length() > 0) {
      postEventLog("alarm_active", currentAlarmKey, "Sensor esik disi alarmi basladi.");
    } else if (lastReportedAlarmKey.length() > 0) {
      postEventLog("alarm_resolved", lastReportedAlarmKey, "Sensor esik disi alarmi normale dondu.");
    }
    lastReportedAlarmKey = currentAlarmKey;
  }

  if (currentAlarmKey.length() > 0 && mutedAlarmKey.length() > 0 && mutedAlarmKey != currentAlarmKey) {
    mutedAlarmKey = "";
    patchAlarmMute("");
  }

  if (currentAlarmKey.length() == 0 && mutedAlarmKey.length() > 0) {
    mutedAlarmKey = "";
    patchAlarmMute("");
  }
}

void patchAlarmMute(const String &muteKey) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(4096, 512);
  HTTPClient http;
  http.setReuse(false);
  http.setTimeout(10000);

  String url = String(SUPABASE_URL) + "/rest/v1/pools?id=eq." + POOL_ID;
  http.begin(client, url);
  addCommonHeaders(http);

  StaticJsonDocument<768> doc;
  JsonObject alarm = doc.createNestedObject("alarm_settings");
  alarm["buzzerEnabled"] = buzzerEnabled;
  alarm["buzzerMuted"] = false;
  alarm["readingIntervalMs"] = (int)readingIntervalMs;
  if (muteKey.length() > 0) {
    alarm["mutedAlarmKey"] = muteKey;
    alarm["mutedAt"] = String(millis() / 1000);
  } else {
    alarm["mutedAlarmKey"] = nullptr;
    alarm["mutedAt"] = nullptr;
  }

  JsonObject sensors = alarm.createNestedObject("alarmSensors");
  for (int i = 0; i < SENSOR_COUNT; i++) {
    sensors[SENSOR_KEYS[i]] = alarmSensorEnabled[i];
  }

  String body;
  serializeJson(doc, body);
  int code = http.PATCH(body);
  if (code < 200 || code >= 300) {
    Serial.printf("  [HATA] Alarm mute temizleme -> HTTP %d | %s\n", code, http.errorToString(code).c_str());
    Serial.println(http.getString());
  }
  http.end();
}

void postEventLog(const char* eventType, const String &alarmKey, const char* message) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(4096, 512);
  HTTPClient http;
  http.setReuse(false);
  http.setTimeout(10000);

  String url = String(SUPABASE_URL) + "/rest/v1/sensor_event_logs";
  http.begin(client, url);
  addCommonHeaders(http);

  StaticJsonDocument<768> doc;
  doc["pool_id"] = POOL_ID;
  doc["event_type"] = eventType;
  doc["alarm_key"] = alarmKey;
  doc["severity"] = strcmp(eventType, "alarm_active") == 0 ? "warning" : "info";
  doc["message"] = message;

  JsonObject meta = doc.createNestedObject("metadata");
  meta["uptimeSeconds"] = (int)(millis() / 1000);
  meta["rssi"] = (int)WiFi.RSSI();
  meta["activeAlarmKey"] = currentAlarmKey;
  meta["mutedAlarmKey"] = mutedAlarmKey;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  if (code < 200 || code >= 300) {
    Serial.printf("  [HATA] Olay Logu -> HTTP %d | %s\n", code, http.errorToString(code).c_str());
    Serial.println(http.getString());
  }
  http.end();
}

void addCommonHeaders(HTTPClient &http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SERVICE_ROLE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SERVICE_ROLE_KEY);
  http.addHeader("Prefer", "return=minimal");
}

// Sistem durumu + sensor aktiflik bayraklari (PATCH)
void updateSystemStatus(bool ph, bool ec, bool tds, bool dox, bool ldr,
                        bool wTemp, bool aTemp, bool hum,
                        float phV, float tdsV, float doV, float ldrV) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(4096, 512);
  HTTPClient http;
  http.setReuse(false);
  http.setTimeout(15000);

  String url = String(SUPABASE_URL) + "/rest/v1/pool_system_status?pool_id=eq." + POOL_ID;
  http.begin(client, url);
  addCommonHeaders(http);

  StaticJsonDocument<768> doc;
  doc["uptime_seconds"] = (int)(millis() / 1000);
  doc["rssi"] = (int)WiFi.RSSI();
  doc["voltage"] = serialized(String(ESP.getVcc() / 1000.0, 2));

  JsonObject conn = doc.createNestedObject("sensor_connections");
  conn["ph"]        = ph;
  conn["ec"]        = ec;
  conn["tds"]       = tds;
  conn["do"]        = dox;
  conn["ldr"]       = ldr;
  conn["waterTemp"] = wTemp;
  conn["airTemp"]   = aTemp;
  conn["humidity"]  = hum;

  // Gelistirici tani verisi (sitede dev modu acikken gorunur)
  JsonObject diag = doc.createNestedObject("diagnostics");
  diag["freeHeap"] = ESP.getFreeHeap();
  diag["maxBlock"] = ESP.getMaxFreeBlockSize();
  diag["adsOk"]    = adsOk;
  diag["activeAlarmKey"] = currentAlarmKey;
  diag["readingIntervalMs"] = (int)readingIntervalMs;
  diag["cachedSettingsLoaded"] = cachedSettingsLoaded;
  diag["settingsSaveCount"] = (int)settingsSaveCount;
  JsonObject rawV  = diag.createNestedObject("rawVoltage");
  rawV["ph"]  = serialized(String(phV, 3));
  rawV["tds"] = serialized(String(tdsV, 3));
  rawV["do"]  = serialized(String(doV, 3));
  rawV["ldr"] = serialized(String(ldrV, 3));

  String body;
  serializeJson(doc, body);
  int code = http.PATCH(body);

  if (code >= 200 && code < 300) {
    Serial.printf("  [OK]   Sistem Durumu  -> HTTP %d\n", code);
  } else {
    Serial.printf("  [HATA] Sistem Durumu  -> HTTP %d | %s\n", code, http.errorToString(code).c_str());
    Serial.println(http.getString());
  }
  http.end();
}

// Sensor olcumlerini toplu gonder (POST). Sadece bagli sensorler gonderilir.
void sendSensorReadings(float ph, float ec, float tds, float dox, float ldr,
                        float wTemp, float aTemp, float hum,
                        bool phOk, bool ecOk, bool tdsOk, bool doOk, bool ldrOk,
                        bool wTempOk, bool aTempOk, bool humOk) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(4096, 512);
  HTTPClient http;
  http.setReuse(false);
  http.setTimeout(15000);

  String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";
  http.begin(client, url);
  addCommonHeaders(http);

  DynamicJsonDocument doc(1024);
  addReading(doc, "ph",        ph,  phOk);
  addReading(doc, "ec",        ec,  ecOk);
  addReading(doc, "tds",       tds, tdsOk);
  addReading(doc, "do",        dox, doOk);
  addReading(doc, "ldr",       ldr, ldrOk);
  addReading(doc, "waterTemp", wTemp, wTempOk);
  addReading(doc, "airTemp",   aTemp, aTempOk);
  addReading(doc, "humidity",  hum, humOk);

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);

  if (code >= 200 && code < 300) {
    Serial.printf("  [OK]   Sensor Verisi  -> HTTP %d\n", code);
  } else {
    Serial.printf("  [HATA] Sensor Verisi  -> HTTP %d | %s\n", code, http.errorToString(code).c_str());
    Serial.println(http.getString());
  }
  http.end();
}

// Bagli olmayan sensoru atla; degeri numeric(10,2) hassasiyetle ekle
void addReading(JsonDocument &doc, const char* id, float value, bool ok) {
  if (!ok) return;
  JsonObject obj = doc.createNestedObject();
  obj["pool_id"]   = POOL_ID;
  obj["sensor_id"] = id;
  obj["value"]     = serialized(String(value, 2));
}
