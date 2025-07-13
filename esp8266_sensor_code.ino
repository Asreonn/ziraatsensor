#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi ayarları
const char* ssid = "YOUR_WIFI_SSID";           // WiFi adınızı buraya yazın
const char* password = "YOUR_WIFI_PASSWORD";   // WiFi şifrenizi buraya yazın

// DHT11 sensör ayarları
#define DHT_PIN D4        // DHT11 D4 pinine bağlı
#define DHT_TYPE DHT11    // DHT11 sensör tipi
DHT dht(DHT_PIN, DHT_TYPE);

// Server ayarları
const char* serverURL = "https://ziraatsensor-asrins-projects.vercel.app/api/sensor-data";

// Sensör değişkenleri
float lastDissolvedOxygen = 7.5;  // Son çözünmüş oksijen değeri
float lastPH = 7.2;               // Son pH değeri
float lastConductivity = 800;     // Son iletkenlik değeri
float lastWaterTemp = 22.0;       // Son su sıcaklığı değeri

// Zaman ayarları
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 1000; // 1 saniyede bir gönder

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

// Rastgele ama mantıklı sensör değerleri üret
float generateDissolvedOxygen() {
  // Çözünmüş oksijen: 4-12 mg/L, yavaş değişim
  float change = random(-20, 21) / 100.0; // -0.2 ile +0.2 arası değişim
  lastDissolvedOxygen += change;
  
  // Sınırları kontrol et
  if (lastDissolvedOxygen < 4.0) lastDissolvedOxygen = 4.0;
  if (lastDissolvedOxygen > 12.0) lastDissolvedOxygen = 12.0;
  
  return lastDissolvedOxygen;
}

float generatePH() {
  // pH: 6.0-8.5, yavaş değişim
  float change = random(-10, 11) / 100.0; // -0.1 ile +0.1 arası değişim
  lastPH += change;
  
  // Sınırları kontrol et
  if (lastPH < 6.0) lastPH = 6.0;
  if (lastPH > 8.5) lastPH = 8.5;
  
  return lastPH;
}

float generateConductivity() {
  // İletkenlik: 200-2000 µS/cm, orta hızda değişim
  float change = random(-50, 51); // -50 ile +50 arası değişim
  lastConductivity += change;
  
  // Sınırları kontrol et
  if (lastConductivity < 200) lastConductivity = 200;
  if (lastConductivity > 2000) lastConductivity = 2000;
  
  return lastConductivity;
}

float generateWaterTemp(float airTemp) {
  // Su sıcaklığı: hava sıcaklığına yakın ama biraz farklı
  float targetTemp = airTemp + random(-5, 6); // ±5°C fark
  float change = (targetTemp - lastWaterTemp) * 0.1; // Yavaş yaklaşım
  lastWaterTemp += change;
  
  // Mantıklı sınırlar
  if (lastWaterTemp < 10.0) lastWaterTemp = 10.0;
  if (lastWaterTemp > 40.0) lastWaterTemp = 40.0;
  
  return lastWaterTemp;
}

// Veri gönderme fonksiyonu
void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi bağlantısı yok!");
    return;
  }

  // DHT11'den gerçek veri oku
  float airTemp = dht.readTemperature();
  float airHumidity = dht.readHumidity();
  
  // DHT11 okuma kontrolü
  if (isnan(airTemp) || isnan(airHumidity)) {
    Serial.println("DHT11 sensör okunamadı!");
    return;
  }

  // Diğer sensörler için rastgele mantıklı değerler üret
  float dissolvedOxygen = generateDissolvedOxygen();
  float ph = generatePH();
  float conductivity = generateConductivity();
  float waterTemp = generateWaterTemp(airTemp);

  // JSON verisi oluştur
  StaticJsonDocument<512> jsonDoc;
  
  jsonDoc["device"] = "ESP8266_Tarim_Sensoru";
  jsonDoc["ts"] = millis() / 1000; // Basit timestamp (sistem açılışından itibaren saniye)
  
  // WiFi bilgileri
  JsonObject wifi = jsonDoc.createNestedObject("wifi");
  wifi["ssid"] = WiFi.SSID();
  wifi["rssi"] = WiFi.RSSI();
  
  // Sensör değerleri
  JsonObject values = jsonDoc.createNestedObject("values");
  values["dissolved_oxygen"] = round(dissolvedOxygen * 100) / 100.0;  // 2 ondalık basamak
  values["ph"] = round(ph * 100) / 100.0;  // 'ph' küçük harfle (frontend ile uyumlu)
  values["conductivity"] = round(conductivity);
  values["water_temp"] = round(waterTemp * 100) / 100.0;
  values["air_temp"] = round(airTemp * 100) / 100.0;        // DHT11'den gerçek veri
  values["air_humidity"] = round(airHumidity * 100) / 100.0; // DHT11'den gerçek veri

  // JSON string'e çevir
  String jsonString;
  serializeJson(jsonDoc, jsonString);

  // Debug için konsola yazdır
  Serial.println("\n--- Sensör Verileri ---");
  Serial.printf("Çözünmüş Oksijen: %.2f mg/L\n", dissolvedOxygen);
  Serial.printf("pH: %.2f\n", ph);
  Serial.printf("İletkenlik: %.0f µS/cm\n", conductivity);
  Serial.printf("Su Sıcaklığı: %.2f °C\n", waterTemp);
  Serial.printf("Hava Sıcaklığı: %.2f °C (DHT11)\n", airTemp);
  Serial.printf("Hava Nemi: %.2f %% (DHT11)\n", airHumidity);
  Serial.printf("WiFi Sinyal: %d dBm\n", WiFi.RSSI());
  Serial.println("JSON: " + jsonString);

  // HTTPS POST gönder
  Serial.println("🌐 Sunucuya bağlanılıyor...");
  WiFiClientSecure client;
  client.setInsecure(); // SSL sertifika kontrolünü devre dışı bırak
  
  HTTPClient http;
  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 saniye timeout
  
  Serial.printf("📤 POST isteği gönderiliyor: %s\n", serverURL);
  unsigned long requestStart = millis();
  
  int httpResponseCode = http.POST(jsonString);
  unsigned long requestTime = millis() - requestStart;
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("📥 HTTP Yanıt Kodu: %d (%lu ms)\n", httpResponseCode, requestTime);
    
    if (httpResponseCode == 200) {
      Serial.println("✅ Veri başarıyla gönderildi!");
      Serial.println("📋 Sunucu yanıtı: " + response);
    } else if (httpResponseCode == 404) {
      Serial.println("❌ Endpoint bulunamadı (404)");
    } else if (httpResponseCode == 500) {
      Serial.println("❌ Sunucu hatası (500)");
    } else {
      Serial.printf("⚠️  Beklenmeyen yanıt kodu: %d\n", httpResponseCode);
      Serial.println("📋 Yanıt: " + response);
    }
  } else {
    Serial.printf("❌ HTTP bağlantı hatası: %d (%lu ms)\n", httpResponseCode, requestTime);
    
    // Hata türünü açıkla
    switch (httpResponseCode) {
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
  Serial.println("─────────────────────────────────────────");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n🌱 Tarımsal Sensör Sistemi Başlatılıyor...");
  Serial.println("════════════════════════════════════════════");
  Serial.println("ESP8266 Tarımsal Sensör İstasyonu v1.0");
  Serial.println("════════════════════════════════════════════");
  
  // DHT11 sensörünü başlat
  Serial.println("\n🌡️  DHT11 sensörü başlatılıyor...");
  dht.begin();
  Serial.println("✅ DHT11 sensörü başarıyla başlatıldı (Pin: D4)");
  
  // İlk DHT11 okumasını test et
  delay(2000); // DHT11'in hazır olması için bekle
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();
  
  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println("⚠️  DHT11 test okuması başarısız - Bağlantıları kontrol edin");
  } else {
    Serial.printf("✅ DHT11 test okuması başarılı: %.1f°C, %.1f%%\n", testTemp, testHum);
  }
  
  // WiFi ağlarını tara
  scanWiFiNetworks();
  
  // WiFi bağlantısını kur
  connectToWiFi();
  
  // Rastgele sayı üreteci için seed
  randomSeed(analogRead(0));
  Serial.println("🎲 Rastgele sayı üreteci başlatıldı");
  
  Serial.println("\n🚀 Sistem hazır! Veri gönderimi başlıyor...");
  Serial.println("⏰ Gönderim aralığı: 1 saniye");
  Serial.println("════════════════════════════════════════════\n");
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
    Serial.println("⚠️  WiFi bağlantısı kesildi, yeniden bağlanılıyor...");
    connectToWiFi();
  }
  
  // Belirlenen aralıklarla veri gönder
  if (currentTime - lastSendTime >= sendInterval) {
    sendCounter++;
    Serial.printf("\n🔄 Veri gönderimi #%d başlatılıyor...\n", sendCounter);
    sendSensorData();
    lastSendTime = currentTime;
    
    // Bir sonraki gönderim zamanını göster
    Serial.printf("⏰ Bir sonraki gönderim: %d saniye sonra\n\n", sendInterval / 1000);
  }
  
  delay(100); // CPU'yu rahatlatmak için kısa delay
} 