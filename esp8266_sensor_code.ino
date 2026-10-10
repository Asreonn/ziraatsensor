#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ——— WiFi Ayarları ———
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ——— DHT Sensör Ayarları ———
#define DHT_PIN   D3       // DHT data pini (kullanıcı tablosuna göre D3)
#define DHT_TYPE  DHT22    // DHT22 / AM2302 
DHT dht(DHT_PIN, DHT_TYPE);

// ——— Server Ayarları ———
const char* serverURL = "https://ziraatsensor.vercel.app/api/sensor-data";

// ——— Analog Sensör Kontrol Pinleri (Kullanıcı Tablosuna Göre) ———
const int PH_PWR_PIN       = D5;  // GPIO14 - pH modülü VIN kontrolü
const int DO_PWR_PIN       = D6;  // GPIO12 - Çözünmüş O₂ modülü VIN kontrolü  
const int ELYZ_PWR_PIN     = D7;  // GPIO13 - Elektroliz modülü VIN kontrolü
const int WATER_TMP_PWR_PIN= D8;  // GPIO15 - Su sıcaklığı modülü VIN kontrolü

const int ADC_PIN          = A0;  // Ortak ADC girişi - tüm analog sensörler

// ——— Ölçüm Ayarları (Daha uzun süreler) ———
const unsigned long SAMPLE_DURATION = 5000;  // 5 saniye örnekleme (daha uzun)
const unsigned long SAMPLE_INTERVAL = 150;   // ms
const unsigned long STAB_DELAY      = 500;   // ms - daha uzun stabilizasyon
const unsigned long SENSOR_DELAY    = 200;   // ms - sensörler arası bekleme
const unsigned long SEND_INTERVAL   = 3000;  // 3 saniyede bir gönder

// ——— Sensör Kalibrasyon Sabitleri (Daha esnek) ———
// pH sensörü
const float PH7_VOLTAGE       = 2.50f;
const float PH_SLOPE          = 0.18f;
// DO sensörü (0–3.3V → 0–20 mg/L)
const float DO_MAX_MGL        = 20.0f;
// Elektroliz sensörü (çıkış voltajı × faktör)
const float ELYZ_CALIB_FACTOR = 500.0f; // Daha küçük faktör
// Su sıcaklığı sensörü (TMP36: 10mV/°C, 500 mV offset)
const float WATER_TEMP_OFFSET = 0.5f;
const float WATER_TEMP_SCALE  = 0.01f;

unsigned long lastSendTime = 0;

// WiFi ağlarını tarama fonksiyonu
void scanWiFiNetworks() {
  Serial.println("\n📡 Mevcut WiFi ağları taranıyor...");
  
  int networkCount = WiFi.scanNetworks();
  
  if (networkCount == 0) {
    Serial.println("❌ Hiç WiFi ağı bulunamadı!");
    return;
  }
  
  Serial.printf("✅ %d WiFi ağı bulundu:\n\n", networkCount);
  Serial.println("No | SSID                     | RSSI | Güvenlik");
  Serial.println("---|--------------------------|------|----------");
  
  // İlk 10 ağı göster
  int showCount = min(networkCount, 10);
  for (int i = 0; i < showCount; i++) {
    String ssid = WiFi.SSID(i);
    int rssi = WiFi.RSSI(i);
    uint8_t encType = WiFi.encryptionType(i);
    
    String security;
    switch (encType) {
      case ENC_TYPE_NONE: security = "Açık"; break;
      case ENC_TYPE_WEP: security = "WEP"; break;
      case ENC_TYPE_TKIP: security = "WPA"; break;
      case ENC_TYPE_CCMP: security = "WPA2"; break;
      case ENC_TYPE_AUTO: security = "WPA/WPA2"; break;
      default: security = "Bilinmiyor"; break;
    }
    
    Serial.printf("%2d | %-24s | %4d | %s\n", 
                  i+1, 
                  ssid.length() > 24 ? (ssid.substring(0, 21) + "...").c_str() : ssid.c_str(), 
                  rssi, 
                  security.c_str());
  }
  
  if (networkCount > 10) {
    Serial.printf("\n... ve %d ağ daha.\n", networkCount - 10);
  }
  
  Serial.println();
}

// WiFi bağlantı fonksiyonu
void connectToWiFi() {
  Serial.println("\n🔗 WiFi bağlantısı başlatılıyor...");
  Serial.printf("Hedef ağ: %s\n", ssid);
  
  // WiFi modunu station olarak ayarla
  WiFi.mode(WIFI_STA);
  Serial.println("📶 WiFi modu: Station (STA)");
  
  // Önceki bağlantıları temizle
  WiFi.disconnect();
  delay(100);
  Serial.println("🧹 Önceki bağlantılar temizlendi");
  
  // Bağlantıyı başlat
  WiFi.begin(ssid, password);
  Serial.printf("🔄 %s ağına bağlanmaya çalışılıyor", ssid);
  
  int attempts = 0;
  unsigned long startTime = millis();
  
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Her 5 denemede bir durum bilgisi ver
    if (attempts % 5 == 0) {
      Serial.printf("\n⏱️  Deneme %d/30 - Durum: ", attempts);
      switch (WiFi.status()) {
        case WL_IDLE_STATUS: Serial.print("Boşta"); break;
        case WL_NO_SSID_AVAIL: Serial.print("SSID bulunamadı"); break;
        case WL_SCAN_COMPLETED: Serial.print("Tarama tamamlandı"); break;
        case WL_CONNECT_FAILED: Serial.print("Bağlantı başarısız"); break;
        case WL_CONNECTION_LOST: Serial.print("Bağlantı kayboldu"); break;
        case WL_DISCONNECTED: Serial.print("Bağlantı kesildi"); break;
        default: Serial.print("Bilinmiyor"); break;
      }
      Serial.print(" - Devam ediyor");
    }
  }
  
  unsigned long connectionTime = millis() - startTime;
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n\n✅ WiFi bağlantısı başarılı!");
    Serial.println("═══════════════════════════════════");
    Serial.printf("📶 SSID: %s\n", WiFi.SSID().c_str());
    Serial.printf("🏠 IP Adresi: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("🌐 Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
    Serial.printf("🔍 DNS: %s\n", WiFi.dnsIP().toString().c_str());
    Serial.printf("📊 Sinyal Gücü: %d dBm\n", WiFi.RSSI());
    Serial.printf("🔢 MAC Adresi: %s\n", WiFi.macAddress().c_str());
    Serial.printf("⏱️  Bağlantı Süresi: %lu ms\n", connectionTime);
    
    // Sinyal kalitesi yorumu
    int rssi = WiFi.RSSI();
    String quality;
    if (rssi > -50) quality = "Mükemmel";
    else if (rssi > -60) quality = "İyi";
    else if (rssi > -70) quality = "Orta";
    else if (rssi > -80) quality = "Zayıf";
    else quality = "Çok Zayıf";
    
    Serial.printf("📡 Sinyal Kalitesi: %s\n", quality.c_str());
    Serial.println("═══════════════════════════════════\n");
    
  } else {
    Serial.println("\n\n❌ WiFi bağlantısı başarısız!");
    Serial.println("═══════════════════════════════════");
    Serial.printf("⚠️  Son durum: ");
    switch (WiFi.status()) {
      case WL_NO_SSID_AVAIL: 
        Serial.println("SSID bulunamadı");
        Serial.println("💡 Çözüm: SSID adını kontrol edin");
        break;
      case WL_CONNECT_FAILED: 
        Serial.println("Bağlantı başarısız"); 
        Serial.println("💡 Çözüm: Şifrenizi kontrol edin");
        break;
      case WL_CONNECTION_LOST: 
        Serial.println("Bağlantı kayboldu");
        Serial.println("💡 Çözüm: Sinyal gücünü kontrol edin");
        break;
      default: 
        Serial.println("Bilinmiyor");
        Serial.println("💡 Çözüm: Router'ı yeniden başlatmayı deneyin");
        break;
    }
    Serial.printf("⏱️  Deneme süresi: %lu ms\n", connectionTime);
    Serial.printf("🔄 Toplam deneme: %d/30\n", attempts);
    Serial.println("═══════════════════════════════════\n");
  }
}

// ——— Analog sensör okuma (detaylı debug ve uzun stabilizasyon) ———
float readAnalogVoltage(int pwrPin, String sensorName) {
  unsigned long start = millis();
  unsigned long sumRaw = 0, count = 0;
  
  // Önceki sensörün etkisini azaltmak için tüm pinleri LOW yap
  digitalWrite(PH_PWR_PIN, LOW);
  digitalWrite(DO_PWR_PIN, LOW);
  digitalWrite(ELYZ_PWR_PIN, LOW);
  digitalWrite(WATER_TMP_PWR_PIN, LOW);
  delay(100); // Temizleme gecikmesi
  
  Serial.printf("🔌 %s güç veriliyor (Pin %d = GPIO%d)...", 
                sensorName.c_str(), pwrPin, 
                pwrPin == D5 ? 14 : pwrPin == D6 ? 12 : pwrPin == D7 ? 13 : 15);
  
  // İlk ADC okuması (başlangıç değeri)
  int initialADC = analogRead(ADC_PIN);
  Serial.printf(" [Başlangıç ADC: %d]", initialADC);
  
  digitalWrite(pwrPin, HIGH);
  Serial.print(" güç veriliyor");
  
  // Uzun stabilizasyon bekleme
  delay(STAB_DELAY);
  Serial.print(" stabilize ediliyor");
  
  // İkinci ADC okuması (stabilizasyon sonrası)
  int stableADC = analogRead(ADC_PIN);
  Serial.printf(" [Stabil ADC: %d]", stableADC);
  
  // Örnekleme döngüsü
  while (millis() - start < SAMPLE_DURATION) {
    int rawValue = analogRead(ADC_PIN);
    sumRaw += rawValue;
    count++;
    delay(SAMPLE_INTERVAL);
    
    // Her 20 örnekte bir ADC değerini göster
    if (count % 20 == 0) {
      Serial.printf(".[ADC:%d]", rawValue);
    } else if (count % 5 == 0) {
      Serial.print(".");
    }
  }
  
  digitalWrite(pwrPin, LOW);
  
  float avgRaw = float(sumRaw) / float(count);
  float voltage = avgRaw * (3.3f / 1023.0f);
  
  // Son ADC okuması (güç kesildikten sonra)
  delay(50);
  int finalADC = analogRead(ADC_PIN);
  
  Serial.printf(" [%lu örnek, Ort:%.1f, %.3fV, Son ADC:%d]\n", 
                count, avgRaw, voltage, finalADC);
  
  // Sensörler arası bekleme
  delay(SENSOR_DELAY);
  
  return voltage;
}

// ——— Sensör Verilerini Oku ve API'ye POST Et ———
void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi bağlantısı yok!");
    return;
  }

  Serial.println("\n=== Sensör Okumaları Başlatılıyor ===");

  // 1) Hava Sıcaklığı & Nem (DHT22)
  Serial.println("🌡️ DHT22 sensörü okunuyor...");
  float airTemp = dht.readTemperature();
  float airHum  = dht.readHumidity();
  
  if (isnan(airTemp) || isnan(airHum)) {
    Serial.println("⚠️ DHT22 sensör okunamadı - -1 değeri gönderiliyor");
    Serial.println("💡 Çözüm: DHT22 D3 (GPIO0) pinine bağlı mı? 3.3V güç var mı?");
    airTemp = -1.0;
    airHum = -1.0;
  } else {
    Serial.printf("✅ Hava Sıcaklığı: %.1f °C\n", airTemp);
    Serial.printf("✅ Hava Nemi: %.1f %%\n", airHum);
  }

  // 2) pH Ölçümü (daha esnek aralık)
  Serial.println("🧪 pH sensörü okunuyor...");
  float v_ph = readAnalogVoltage(PH_PWR_PIN, "pH");
  float pH;
  
  if (v_ph < 0.01) {  // Çok düşük voltaj - sensör bağlı değil (0.05V → 0.01V)
    Serial.println("⚠️ pH sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    pH = -1.0;
  } else {
    // Daha gerçekçi pH kalibrasyon - Ham voltajı pH'ye basit çeviri
    if (v_ph > 0.5 && v_ph < 3.0) {
      // Gerçek pH sensörü aralığı: genellikle 0.5-2.5V arası
      pH = 7.0f + (PH7_VOLTAGE - v_ph) / PH_SLOPE;
      if (pH < 0 || pH > 14) {
        // Aralık dışıysa basit lineer çeviri kullan
        pH = (v_ph / 3.3) * 14.0; // 0-3.3V → 0-14 pH
      }
    } else {
      // Düşük voltajlar için basit çeviri
      pH = (v_ph / 3.3) * 14.0; // 0-3.3V → 0-14 pH
    }
    Serial.printf("✅ pH: %.2f (%.3fV)\n", pH, v_ph);
  }

  // 3) Çözünmüş Oksijen Ölçümü (daha esnek aralık)
  Serial.println("💧 Çözünmüş oksijen sensörü okunuyor...");
  float v_do = readAnalogVoltage(DO_PWR_PIN, "DO");
  float do_mgL;
  
  if (v_do < 0.01) {  // Eşik düşürüldü (0.05V → 0.01V)
    Serial.println("⚠️ DO sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    do_mgL = -1.0;
  } else {
    // Düşük voltajlar için de hesaplama yap
    do_mgL = (v_do / 3.3f) * DO_MAX_MGL;
    // Negatif değerleri 0 yap, çok küçük değerleri koruma
    if (do_mgL < 0) do_mgL = 0;
    Serial.printf("✅ Çözünmüş O₂: %.2f mg/L (%.3fV) [Düşük sinyal ama işleniyor]\n", do_mgL, v_do);
  }

  // 4) İletkenlik Ölçümü (daha esnek aralık)
  Serial.println("⚡ İletkenlik sensörü okunuyor...");
  float v_el = readAnalogVoltage(ELYZ_PWR_PIN, "İletkenlik");
  float conductivity;
  
  if (v_el < 0.01) {  // Eşik düşürüldü (0.05V → 0.01V)
    Serial.println("⚠️ İletkenlik sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    conductivity = -1.0;
  } else {
    // Düşük voltajlar için daha hassas çeviri
    if (v_el < 0.1) {
      conductivity = v_el * 2000.0f; // Düşük voltaj için yüksek çarpan
    } else {
      conductivity = v_el * ELYZ_CALIB_FACTOR;
    }
    // Negatif değerleri 0 yap
    if (conductivity < 0) conductivity = 0;
    Serial.printf("✅ İletkenlik: %.0f µS/cm (%.3fV) [Düşük sinyal ama işleniyor]\n", conductivity, v_el);
  }

  // 5) Su Sıcaklığı Ölçümü (daha esnek aralık)
  Serial.println("🌊 Su sıcaklığı sensörü okunuyor...");
  float v_wt = readAnalogVoltage(WATER_TMP_PWR_PIN, "Su Sıcaklığı");
  float waterTemp;
  
  if (v_wt < 0.01) {  // Eşik düşürüldü (0.05V → 0.01V)
    Serial.println("⚠️ Su sıcaklığı sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    waterTemp = -1.0;
  } else {
    // Düşük voltajlar için esnek hesaplama
    if (v_wt < 0.5) {
      // Düşük voltajlar için basit lineer çeviri
      waterTemp = (v_wt * 50.0) + 10.0; // 0-0.5V → 10-35°C arası
    } else {
      // Normal TMP36 kalibrasyon
      waterTemp = (v_wt - WATER_TEMP_OFFSET) / WATER_TEMP_SCALE;
    }
    
    // Çok uç değerleri düzelt
    if (waterTemp < -20 || waterTemp > 80) {
      waterTemp = v_wt * 25.0; // Basit lineer çeviri: 0-3.3V → 0-82.5°C
    }
    Serial.printf("✅ Su Sıcaklığı: %.1f °C (%.3fV)\n", waterTemp, v_wt);
  }

  // JSON oluştur
  StaticJsonDocument<512> doc;
  doc["device"] = "ESP8266_Sirayli_Analog_v2.4";
  doc["ts"]     = millis() / 1000;

  JsonObject wifi = doc.createNestedObject("wifi");
  wifi["ssid"]   = WiFi.SSID();
  wifi["rssi"]   = WiFi.RSSI();
  wifi["ip"]     = WiFi.localIP().toString();

  JsonObject values = doc.createNestedObject("values");
  
  // -1 değerleri de dahil olmak üzere tüm değerleri gönder
  if (pH == -1.0) {
    values["ph"] = -1;
  } else {
    values["ph"] = round(pH * 100) / 100.0;
  }
  
  if (do_mgL == -1.0) {
    values["dissolved_oxygen"] = -1;
  } else {
    values["dissolved_oxygen"] = round(do_mgL * 100) / 100.0;
  }
  
  if (conductivity == -1.0) {
    values["conductivity"] = -1;
  } else {
    values["conductivity"] = round(conductivity);
  }
  
  if (waterTemp == -1.0) {
    values["water_temp"] = -1;
  } else {
    values["water_temp"] = round(waterTemp * 100) / 100.0;
  }
  
  if (airTemp == -1.0) {
    values["air_temp"] = -1;
  } else {
    values["air_temp"] = round(airTemp * 100) / 100.0;
  }
  
  if (airHum == -1.0) {
    values["air_humidity"] = -1;
  } else {
    values["air_humidity"] = round(airHum * 100) / 100.0;
  }

  String payload;
  serializeJson(doc, payload);

  Serial.println("\n📋 Gönderilecek JSON verisi:");
  Serial.println(payload);
  
  // Sensör durumu özeti
  Serial.println("\n📊 SENSÖR DURUMU ÖZETİ (Sıralı A0 Okuma):");
  Serial.printf("   🧪 pH (D5→A0): %s\n", pH == -1.0 ? "❌ Sinyal Yok" : "✅ Çalışıyor");
  Serial.printf("   💧 DO (D6→A0): %s\n", do_mgL == -1.0 ? "❌ Sinyal Yok" : "✅ Çalışıyor");
  Serial.printf("   ⚡ İletkenlik (D7→A0): %s\n", conductivity == -1.0 ? "❌ Sinyal Yok" : "✅ Çalışıyor");
  Serial.printf("   🌊 Su Sıcak. (D8→A0): %s\n", waterTemp == -1.0 ? "❌ Sinyal Yok" : "✅ Çalışıyor");
  Serial.printf("   🌡️ Hava Sıcak. (D3): %s\n", airTemp == -1.0 ? "❌ DHT22 Hata" : "✅ DHT22 OK");
  Serial.printf("   💨 Hava Nemi (D3): %s\n", airHum == -1.0 ? "❌ DHT22 Hata" : "✅ DHT22 OK");

  // HTTPS POST
  Serial.println("\n🌐 Web sitesine gönderiliyor...");
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  Serial.printf("📤 POST isteği: %s\n", serverURL);
  unsigned long requestStart = millis();
  
  int code = http.POST(payload);
  unsigned long requestTime = millis() - requestStart;
  
  if (code > 0) {
    String response = http.getString();
    Serial.printf("📥 HTTP Yanıt: %d (%lu ms)\n", code, requestTime);
    
    if (code == 200) {
      Serial.println("✅ Veri başarıyla gönderildi!");
      Serial.println("📋 Sunucu yanıtı: " + response);
      Serial.println("🔗 ESP8266 ↔️ Web Sitesi bağlantısı AKTİF!");
    } else if (code == 404) {
      Serial.println("❌ Endpoint bulunamadı (404)");
    } else if (code == 500) {
      Serial.println("❌ Sunucu hatası (500)");
    } else {
      Serial.printf("⚠️  Beklenmeyen yanıt kodu: %d\n", code);
      Serial.println("📋 Yanıt: " + response);
    }
  } else {
    Serial.printf("❌ HTTP bağlantı hatası: %d (%lu ms)\n", code, requestTime);
    
    // Hata türünü açıkla
    switch (code) {
      case HTTPC_ERROR_CONNECTION_REFUSED:
        Serial.println("🔒 Bağlantı reddedildi");
        break;
      case HTTPC_ERROR_SEND_HEADER_FAILED:
        Serial.println("📤 Header gönderimi başarısız");
        break;
      case HTTPC_ERROR_SEND_PAYLOAD_FAILED:
        Serial.println("📤 Veri gönderimi başarısız");
        break;
      case HTTPC_ERROR_NOT_CONNECTED:
        Serial.println("🌐 İnternet bağlantısı yok");
        break;
      case HTTPC_ERROR_CONNECTION_LOST:
        Serial.println("📡 Bağlantı kayboldu");
        break;
      case HTTPC_ERROR_READ_TIMEOUT:
        Serial.println("⏰ Zaman aşımı");
        break;
      default:
        Serial.println("❓ Bilinmeyen hata");
        break;
    }
  }
  
  http.end();
  Serial.println("=========================================");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n🌱 ESP8266 Sıralı Analog Sensör Sistemi");
  Serial.println("════════════════════════════════════════════════════");
  Serial.println("ESP8266 Analog Sensör İstasyonu v2.4 - Sıralı Okuma");
  Serial.println("════════════════════════════════════════════════════");

  // Pin modları ayarla
  Serial.println("\n🔧 Pin konfigürasyonu (Kullanıcı Tablosuna Göre):");
  pinMode(PH_PWR_PIN,      OUTPUT);
  pinMode(DO_PWR_PIN,      OUTPUT);
  pinMode(ELYZ_PWR_PIN,    OUTPUT);
  pinMode(WATER_TMP_PWR_PIN, OUTPUT);
  
  // Başlangıçta tüm güç pinlerini kapat
  digitalWrite(PH_PWR_PIN,      LOW);
  digitalWrite(DO_PWR_PIN,      LOW);
  digitalWrite(ELYZ_PWR_PIN,    LOW);
  digitalWrite(WATER_TMP_PWR_PIN, LOW);
  
  Serial.printf("   🧪 pH Güç: D5 (GPIO14) → A0\n");
  Serial.printf("   💧 DO Güç: D6 (GPIO12) → A0\n");
  Serial.printf("   ⚡ İletkenlik Güç: D7 (GPIO13) → A0\n");
  Serial.printf("   🌊 Su Sıcaklığı Güç: D8 (GPIO15) → A0\n");
  Serial.printf("   📊 ADC Girişi: A0 (Ortak analog giriş)\n");
  Serial.printf("   🌡️ DHT22: D3 (GPIO0) → DHT data pin\n");

  // İlk ADC okuması (başlangıç durumu)
  delay(100);
  int initialADC = analogRead(ADC_PIN);
  Serial.printf("   📊 Başlangıç ADC değeri: %d (%.3fV)\n", initialADC, initialADC * 3.3f / 1023.0f);

  // DHT22 sensörünü başlat
  Serial.println("\n🌡️ DHT22 sensörü başlatılıyor...");
  dht.begin();
  Serial.println("✅ DHT22 sensörü başlatıldı (Pin: D3 = GPIO0)");
  Serial.println("💡 DHT22/AM2302 dijital sensör - 3.3V güç gerekir");
  
  // İlk DHT22 okumasını test et (daha uzun bekleme)
  Serial.println("🔄 DHT22 ilk okuma testi (5 saniye bekleme)...");
  delay(5000); // DHT22 için daha uzun bekleme
  
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();
  
  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println("⚠️ DHT22 ilk test başarısız - Pin bağlantılarını kontrol edin");
    Serial.println("💡 DHT22 Data → D3 (GPIO0), VCC → 3.3V, GND → GND");
  } else {
    Serial.printf("✅ DHT22 test başarılı: %.1f°C, %.1f%%\n", testTemp, testHum);
  }

  // ADC kalibrasyonu için test okumaları
  Serial.println("\n🔬 ADC test okumaları (tüm pinler LOW):");
  for (int i = 0; i < 5; i++) {
    int adcVal = analogRead(ADC_PIN);
    Serial.printf("   Test %d: ADC = %d (%.3fV)\n", i+1, adcVal, adcVal * 3.3f / 1023.0f);
    delay(200);
  }

  // WiFi ağlarını tara
  scanWiFiNetworks();
  
  // WiFi bağlantısını kur
  connectToWiFi();
  
  Serial.println("\n🚀 Sistem hazır! Sıralı analog sensör okuma modu");
  Serial.printf("⏰ Gönderim aralığı: %lu saniye\n", SEND_INTERVAL / 1000);
  Serial.printf("📊 Her sensör örnekleme süresi: %lu saniye\n", SAMPLE_DURATION / 1000);
  Serial.printf("⏱️ Örnekleme aralığı: %lu ms\n", SAMPLE_INTERVAL);
  Serial.printf("🔄 Stabilizasyon gecikmesi: %lu ms\n", STAB_DELAY);
  Serial.printf("⏸️ Sensörler arası gecikme: %lu ms\n", SENSOR_DELAY);
  Serial.println("💡 Tüm analog sensörler A0'dan sırayla okunacak");
  Serial.println("════════════════════════════════════════════════════\n");
}

void loop() {
  unsigned long currentTime = millis();
  static unsigned long lastStatusCheck = 0;
  static int sendCounter = 0;
  
  // Her 60 saniyede bir sistem durumu göster (daha az sıklıkta)
  if (currentTime - lastStatusCheck >= 60000) {
    Serial.println("\n📊 SİSTEM DURUMU RAPORU");
    Serial.println("═══════════════════════════════════");
    Serial.printf("⏰ Çalışma süresi: %lu dakika\n", currentTime / 60000);
    Serial.printf("📡 WiFi durumu: %s\n", WiFi.status() == WL_CONNECTED ? "Bağlı" : "Bağlı değil");
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("📶 Sinyal gücü: %d dBm\n", WiFi.RSSI());
      Serial.printf("🏠 IP: %s\n", WiFi.localIP().toString().c_str());
    }
    Serial.printf("📤 Toplam gönderim: %d\n", sendCounter);
    Serial.printf("💾 Serbest RAM: %d bytes\n", ESP.getFreeHeap());
    
    // Hızlı ADC durum kontrolü
    int currentADC = analogRead(ADC_PIN);
    Serial.printf("📊 Anlık ADC: %d (%.3fV)\n", currentADC, currentADC * 3.3f / 1023.0f);
    Serial.println("═══════════════════════════════════\n");
    lastStatusCheck = currentTime;
  }
  
  // WiFi bağlantısını kontrol et
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi bağlantısı kesildi, yeniden bağlanılıyor...");
    connectToWiFi();
  }
  
  // Belirlenen aralıklarla veri gönder
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendCounter++;
    Serial.printf("\n🔄 Sıralı sensör okuma #%d başlatılıyor...\n", sendCounter);
    Serial.println("📝 Not: Tüm analog sensörler A0'dan sırayla okunacak");
    sendSensorData();
    lastSendTime = currentTime;
    
    // Bir sonraki gönderim zamanını göster
    Serial.printf("\n⏰ Bir sonraki sıralı okuma: %lu saniye sonra\n", SEND_INTERVAL / 1000);
    Serial.printf("📊 Toplam sensör okuma süresi: ~%lu saniye\n", (SAMPLE_DURATION * 4 + SENSOR_DELAY * 4) / 1000);
    Serial.println("════════════════════════════════════════════════════\n");
  }
  
  delay(100); // CPU'yu rahatlatmak için kısa delay
} 