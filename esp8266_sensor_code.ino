#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ——— WiFi Ayarları ———
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ——— DHT Sensör Ayarları ———
#define DHT_PIN   D4       // DHT data pini (D3 de deneyebilirsiniz)
#define DHT_TYPE  DHT11    // DHT11 sensörü (DHT22 de deneyebilirsiniz)
DHT dht(DHT_PIN, DHT_TYPE);

// ——— Server Ayarları ———
const char* serverURL = "https://ziraatsensor-hgwm56sfl-asrins-projects.vercel.app/api/sensor-data";

// ——— Analog Sensör Kontrol Pinleri ———
const int PH_PWR_PIN       = D5;  // pH modülü VIN kontrolü
const int DO_PWR_PIN       = D6;  // Çözünmüş O₂ modülü VIN kontrolü
const int ELYZ_PWR_PIN     = D7;  // Elektroliz modülü VIN kontrolü
const int WATER_TMP_PWR_PIN= D8;  // Su sıcaklığı modülü VIN kontrolü

const int ADC_PIN          = A0;  // Ortak ADC girişi

// ——— Ölçüm Ayarları ———
const unsigned long SAMPLE_DURATION = 3000;  // 3 saniye örnekleme
const unsigned long SAMPLE_INTERVAL = 100;   // ms
const unsigned long STAB_DELAY      = 300;   // ms - daha uzun stabilizasyon
const unsigned long SEND_INTERVAL   = 2000;  // 2 saniyede bir gönder

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

// ——— Analog sensör okuma (daha basit ve esnek) ———
float readAnalogVoltage(int pwrPin, String sensorName) {
  unsigned long start = millis();
  unsigned long sumRaw = 0, count = 0;
  
  Serial.printf("🔌 %s güç veriliyor (Pin %d)...", sensorName.c_str(), pwrPin);
  digitalWrite(pwrPin, HIGH);
  delay(STAB_DELAY);
  Serial.print(" stabilize ediliyor");
  
  while (millis() - start < SAMPLE_DURATION) {
    sumRaw += analogRead(ADC_PIN);
    count++;
    delay(SAMPLE_INTERVAL);
    if (count % 8 == 0) Serial.print(".");
  }
  
  digitalWrite(pwrPin, LOW);
  float avgRaw = float(sumRaw) / float(count);
  float voltage = avgRaw * (3.3f / 1023.0f);
  Serial.printf(" [%lu örnek, %.3fV]\n", count, voltage);
  
  return voltage;
}

// ——— Sensör Verilerini Oku ve API'ye POST Et ———
void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi bağlantısı yok!");
    return;
  }

  Serial.println("\n=== Sensör Okumaları Başlatılıyor ===");

  // 1) Hava Sıcaklığı & Nem (DHT11)
  Serial.println("🌡️ DHT11 sensörü okunuyor...");
  float airTemp = dht.readTemperature();
  float airHum  = dht.readHumidity();
  
  if (isnan(airTemp) || isnan(airHum)) {
    Serial.println("⚠️ DHT11 sensör okunamadı - -1 değeri gönderiliyor");
    Serial.println("💡 Çözüm: DHT11 D4 pinine bağlı mı? D3 pinini de deneyebilirsiniz");
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
  
  if (v_ph < 0.05) {  // Çok düşük voltaj - sensör bağlı değil
    Serial.println("⚠️ pH sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    pH = -1.0;
  } else {
    pH = 7.0f + (PH7_VOLTAGE - v_ph) / PH_SLOPE;
    // Daha geniş aralık kabul et
    if (pH < 0 || pH > 14) {
      Serial.printf("⚠️ pH hesaplanan değer aralık dışı (%.2f) - ham değer olarak gönderiliyor\n", pH);
      pH = v_ph * 3.0; // Ham voltajı yaklaşık pH değerine çevir
    }
    Serial.printf("✅ pH: %.2f (%.3fV)\n", pH, v_ph);
  }

  // 3) Çözünmüş Oksijen Ölçümü (daha esnek aralık)
  Serial.println("💧 Çözünmüş oksijen sensörü okunuyor...");
  float v_do = readAnalogVoltage(DO_PWR_PIN, "DO");
  float do_mgL;
  
  if (v_do < 0.05) {  // Çok düşük voltaj - sensör bağlı değil
    Serial.println("⚠️ DO sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    do_mgL = -1.0;
  } else {
    do_mgL = (v_do / 3.3f) * DO_MAX_MGL;
    // Negatif değerleri 0 yap
    if (do_mgL < 0) do_mgL = 0;
    Serial.printf("✅ Çözünmüş O₂: %.2f mg/L (%.3fV)\n", do_mgL, v_do);
  }

  // 4) İletkenlik Ölçümü (daha esnek aralık)
  Serial.println("⚡ İletkenlik sensörü okunuyor...");
  float v_el = readAnalogVoltage(ELYZ_PWR_PIN, "İletkenlik");
  float conductivity;
  
  if (v_el < 0.05) {  // Çok düşük voltaj - sensör bağlı değil
    Serial.println("⚠️ İletkenlik sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    conductivity = -1.0;
  } else {
    conductivity = v_el * ELYZ_CALIB_FACTOR;
    // Negatif değerleri 0 yap
    if (conductivity < 0) conductivity = 0;
    Serial.printf("✅ İletkenlik: %.0f µS/cm (%.3fV)\n", conductivity, v_el);
  }

  // 5) Su Sıcaklığı Ölçümü (daha esnek aralık)
  Serial.println("🌊 Su sıcaklığı sensörü okunuyor...");
  float v_wt = readAnalogVoltage(WATER_TMP_PWR_PIN, "Su Sıcaklığı");
  float waterTemp;
  
  if (v_wt < 0.05) {  // Çok düşük voltaj - sensör bağlı değil
    Serial.println("⚠️ Su sıcaklığı sensör bağlı görünmüyor - -1 değeri gönderiliyor");
    waterTemp = -1.0;
  } else {
    waterTemp = (v_wt - WATER_TEMP_OFFSET) / WATER_TEMP_SCALE;
    // Çok uç değerleri düzelt
    if (waterTemp < -50 || waterTemp > 100) {
      waterTemp = v_wt * 10.0; // Basit lineer çeviri
    }
    Serial.printf("✅ Su Sıcaklığı: %.1f °C (%.3fV)\n", waterTemp, v_wt);
  }

  // JSON oluştur
  StaticJsonDocument<512> doc;
  doc["device"] = "ESP8266_Tarim_Sensoru_v2";
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
  Serial.println("\n📊 SENSÖR DURUMU ÖZETİ:");
  Serial.printf("   🧪 pH: %s\n", pH == -1.0 ? "❌ Bağlı Değil" : "✅ Çalışıyor");
  Serial.printf("   💧 Çözünmüş O₂: %s\n", do_mgL == -1.0 ? "❌ Bağlı Değil" : "✅ Çalışıyor");
  Serial.printf("   ⚡ İletkenlik: %s\n", conductivity == -1.0 ? "❌ Bağlı Değil" : "✅ Çalışıyor");
  Serial.printf("   🌊 Su Sıcaklığı: %s\n", waterTemp == -1.0 ? "❌ Bağlı Değil" : "✅ Çalışıyor");
  Serial.printf("   🌡️ Hava Sıcaklığı: %s\n", airTemp == -1.0 ? "❌ Bağlı Değil" : "✅ Çalışıyor");
  Serial.printf("   💨 Hava Nemi: %s\n", airHum == -1.0 ? "❌ Bağlı Değil" : "✅ Çalışıyor");

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
  
  Serial.println("\n🌱 ESP8266 Esnek Tarımsal Sensör Sistemi");
  Serial.println("════════════════════════════════════════════════════");
  Serial.println("ESP8266 Analog Sensör İstasyonu v2.3 - Esnek Mod");
  Serial.println("════════════════════════════════════════════════════");

  // Pin modları ayarla
  Serial.println("\n🔧 Analog sensör güç pinleri ayarlanıyor...");
  pinMode(PH_PWR_PIN,      OUTPUT);
  pinMode(DO_PWR_PIN,      OUTPUT);
  pinMode(ELYZ_PWR_PIN,    OUTPUT);
  pinMode(WATER_TMP_PWR_PIN, OUTPUT);
  
  // Başlangıçta tüm güç pinlerini kapat
  digitalWrite(PH_PWR_PIN,      LOW);
  digitalWrite(DO_PWR_PIN,      LOW);
  digitalWrite(ELYZ_PWR_PIN,    LOW);
  digitalWrite(WATER_TMP_PWR_PIN, LOW);
  
  Serial.printf("✅ Pin konfigürasyonu:\n");
  Serial.printf("   🧪 pH Güç: D5 (Pin %d)\n", PH_PWR_PIN);
  Serial.printf("   💧 DO Güç: D6 (Pin %d)\n", DO_PWR_PIN);
  Serial.printf("   ⚡ İletkenlik Güç: D7 (Pin %d)\n", ELYZ_PWR_PIN);
  Serial.printf("   🌊 Su Sıcaklığı Güç: D8 (Pin %d)\n", WATER_TMP_PWR_PIN);
  Serial.printf("   📊 ADC Girişi: A0\n");

  // DHT11 sensörünü başlat
  Serial.println("\n🌡️ DHT11 sensörü başlatılıyor...");
  dht.begin();
  Serial.println("✅ DHT11 sensörü başlatıldı (Pin: D4)");
  Serial.println("💡 DHT11 çalışmazsa D3 pinini de deneyebilirsiniz");
  
  // İlk DHT11 okumasını test et
  delay(2000);
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();
  
  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println("⚠️ DHT11 ilk test başarısız - Sistem yine de çalışacak");
  } else {
    Serial.printf("✅ DHT11 test başarılı: %.1f°C, %.1f%%\n", testTemp, testHum);
  }

  // WiFi ağlarını tara
  scanWiFiNetworks();
  
  // WiFi bağlantısını kur
  connectToWiFi();
  
  Serial.println("\n🚀 Sistem hazır! Esnek sensör okuma modu aktif");
  Serial.printf("⏰ Gönderim aralığı: %lu saniye\n", SEND_INTERVAL / 1000);
  Serial.printf("📊 Örnekleme süresi: %lu saniye\n", SAMPLE_DURATION / 1000);
  Serial.printf("⏱️ Örnekleme aralığı: %lu ms\n", SAMPLE_INTERVAL);
  Serial.println("💡 Sensörler bağlı olmasa bile -1 değerleri gönderilecek");
  Serial.println("════════════════════════════════════════════════════\n");
}

void loop() {
  unsigned long currentTime = millis();
  static unsigned long lastStatusCheck = 0;
  static int sendCounter = 0;
  
  // Her 30 saniyede bir sistem durumu göster
  if (currentTime - lastStatusCheck >= 30000) {
    Serial.println("\n📊 SİSTEM DURUMU RAPORU");
    Serial.println("═══════════════════════════════════");
    Serial.printf("⏰ Çalışma süresi: %lu saniye\n", currentTime / 1000);
    Serial.printf("📡 WiFi durumu: %s\n", WiFi.status() == WL_CONNECTED ? "Bağlı" : "Bağlı değil");
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("📶 Sinyal gücü: %d dBm\n", WiFi.RSSI());
      Serial.printf("🏠 IP: %s\n", WiFi.localIP().toString().c_str());
    }
    Serial.printf("📤 Toplam gönderim: %d\n", sendCounter);
    Serial.printf("💾 Serbest RAM: %d bytes\n", ESP.getFreeHeap());
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
    Serial.printf("\n🔄 Veri gönderimi #%d başlatılıyor...\n", sendCounter);
    sendSensorData();
    lastSendTime = currentTime;
    
    // Bir sonraki gönderim zamanını göster
    Serial.printf("\n⏰ Bir sonraki gönderim: %lu saniye sonra\n\n", SEND_INTERVAL / 1000);
  }
  
  delay(100); // CPU'yu rahatlatmak için kısa delay
} 