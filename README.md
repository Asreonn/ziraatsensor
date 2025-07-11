# 🌾 Ziraat Sensör İzleme Sistemi

ESP NodeMCU'dan gelen sensör verilerini anlık olarak görüntüleyen ve motor kontrolü yapabilen modern, mobil uyumlu web uygulaması.

## 🌐 **Canlı Web Sitesi**
**https://ziraatsensor-asrins-projects.vercel.app**

## 🚀 Yeni Özellikler (v2.0)

- ✨ **Türkçe Arayüz** - Tamamen Türkçe kullanıcı deneyimi
- 📱 **Mobil Uyumlu** - Tüm cihazlarda mükemmel görünüm
- 🔧 **Motor Kontrolü** - ESP32'ye motor başlat/durdur komutları
- ⏰ **Yerel Zaman** - Grafiklerde kendi zaman diliminizi kullanır
- 📊 **Chart.js Grafikleri** - Daha hızlı ve responsive grafikler
- 🎯 **Anlık Geri Bildirim** - Motor komutları için bildirimler

## 📊 Desteklenen Sensörler

- 💧 **Çözünmüş Oksijen** (mg/L)
- 🔬 **pH Değeri**
- ⚡ **İletkenlik** (µS/cm)
- 🌊 **Su Sıcaklığı** (°C)
- 🌡️ **Hava Sıcaklığı** (°C)
- 💨 **Hava Nemi** (%)

## 🔧 Motor Kontrolü

Web sitesinden ESP32'ye motor kontrolü komutları gönderebilirsiniz:
- ▶️ **Başlat** - Motoru çalıştırır
- ⏹️ **Durdur** - Motoru durdurur
- 📊 **Durum Gösterimi** - Motor durumunu anlık takip

## 🛠️ API Endpoints

### 📡 Sensör Verileri
- `POST /api/sensor-data` - ESP'den veri alma
- `GET /api/sensor-data` - Son veriyi getirme

### 🔧 Motor Kontrolü  
- `POST /api/motor-control` - Motor komutları (start/stop)
- `GET /api/motor-control` - Motor durumu sorgulama

### 🔍 Sistem
- `GET /api/status` - Sistem durumu
- `POST /api/test-data` - Test verisi oluşturma

## 📡 ESP NodeMCU/ESP32 Entegrasyonu

### Sensör Veri Gönderimi

ESP cihazınız aşağıdaki endpoint'e POST isteği göndermelidir:

```
POST https://ziraatsensor-asrins-projects.vercel.app/api/sensor-data
Content-Type: application/json
```

**Veri Formatı:**
```json
{
  "device": "NodeMCU_V3",
  "ts": 1752255820,
  "wifi": {
    "ssid": "WiFi_Adı",
    "rssi": -65,
    "ip": "192.168.1.100"
  },
  "values": {
    "dissolved_o2": 9.8,
    "pH": 7.2,
    "conductivity": 1650,
    "water_temp": 25.5,
    "air_temp": 28.3,
    "air_humidity": 45.2
  }
}
```

### Motor Kontrolü Sorgulama

ESP32 motor komutlarını kontrol etmek için:

```
GET https://ziraatsensor-asrins-projects.vercel.app/api/motor-control
```

**Yanıt:**
```json
{
  "motorStatus": {
    "isRunning": true,
    "lastCommand": "start",
    "timestamp": "2025-07-11T17:43:31.782Z"
  },
  "hasCommand": true
}
```

### ESP32 Arduino Kod Örneği

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* sensorURL = "https://ziraatsensor-asrins-projects.vercel.app/api/sensor-data";
const char* motorURL = "https://ziraatsensor-asrins-projects.vercel.app/api/motor-control";

const int MOTOR_PIN = 2; // Motor kontrol pini

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_PIN, OUTPUT);
  
  // WiFi bağlantısı
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("WiFi bağlanıyor...");
  }
  Serial.println("WiFi bağlandı!");
}

void loop() {
  // Sensör verilerini gönder
  sendSensorData();
  
  // Motor komutlarını kontrol et
  checkMotorCommands();
  
  delay(10000); // 10 saniye bekle
}

void sendSensorData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(sensorURL);
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<500> doc;
    doc["device"] = "NodeMCU_V3";
    doc["ts"] = WiFi.getTime();
    
    JsonObject wifi = doc.createNestedObject("wifi");
    wifi["ssid"] = WiFi.SSID();
    wifi["rssi"] = WiFi.RSSI();
    wifi["ip"] = WiFi.localIP().toString();
    
    JsonObject values = doc.createNestedObject("values");
    values["dissolved_o2"] = readDissolvedOxygen();
    values["pH"] = readPH();
    values["conductivity"] = readConductivity();
    values["water_temp"] = readWaterTemp();
    values["air_temp"] = readAirTemp();
    values["air_humidity"] = readHumidity();
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    if (httpResponseCode == 200) {
      Serial.println("✅ Sensör verisi gönderildi");
    } else {
      Serial.println("❌ Sensör verisi gönderilemedi: " + String(httpResponseCode));
    }
    http.end();
  }
}

void checkMotorCommands() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(motorURL);
    
    int httpResponseCode = http.GET();
    if (httpResponseCode == 200) {
      String payload = http.getString();
      
      StaticJsonDocument<300> doc;
      deserializeJson(doc, payload);
      
      bool isRunning = doc["motorStatus"]["isRunning"];
      String lastCommand = doc["motorStatus"]["lastCommand"];
      
      // Motor kontrolü
      if (isRunning) {
        digitalWrite(MOTOR_PIN, HIGH);
        Serial.println("🔧 Motor başlatıldı");
      } else {
        digitalWrite(MOTOR_PIN, LOW);
        Serial.println("🔧 Motor durduruldu");
      }
    }
    http.end();
  }
}

// Sensör okuma fonksiyonları (sizin sensörlerinize göre değiştirin)
float readDissolvedOxygen() { return random(800, 1200) / 100.0; }
float readPH() { return random(600, 800) / 100.0; }
int readConductivity() { return random(1500, 2000); }
float readWaterTemp() { return random(200, 300) / 10.0; }
float readAirTemp() { return random(250, 350) / 10.0; }
float readHumidity() { return random(400, 700) / 10.0; }
```

## 🧪 Test Etme

### Manuel Testler

**Sensör verisi gönderme:**
```bash
curl -X POST https://ziraatsensor-asrins-projects.vercel.app/api/sensor-data \
-H "Content-Type: application/json" \
-d '{
  "device": "NodeMCU_V3",
  "ts": 1752255820,
  "wifi": {
    "ssid": "TestWiFi",
    "rssi": -65,
    "ip": "192.168.1.50"
  },
  "values": {
    "dissolved_o2": 9.8,
    "pH": 7.2,
    "conductivity": 1650,
    "water_temp": 25.5,
    "air_temp": 28.3,
    "air_humidity": 45.2
  }
}'
```

**Motor başlatma:**
```bash
curl -X POST https://ziraatsensor-asrins-projects.vercel.app/api/motor-control \
-H "Content-Type: application/json" \
-d '{"command":"start"}'
```

**Motor durdurma:**
```bash
curl -X POST https://ziraatsensor-asrins-projects.vercel.app/api/motor-control \
-H "Content-Type: application/json" \
-d '{"command":"stop"}'
```

**Test verisi oluşturma:**
```bash
curl -X POST https://ziraatsensor-asrins-projects.vercel.app/api/test-data
```

## 📱 Mobil Uyumluluğu

- ✅ **Responsive Design** - Tüm ekran boyutlarında optimize
- ✅ **Touch Friendly** - Dokunmatik ekranlar için optimize edilmiş butonlar
- ✅ **Progressive Layout** - Mobilde dikey, masaüstünde yatay düzen
- ✅ **Adaptive Typography** - Ekran boyutuna göre font büyüklükleri

## 🌍 Türkçe Dil Desteği

- ✅ **Tam Türkçe Arayüz** - Tüm metinler Türkçe
- ✅ **Türkçe Tarih/Saat** - Yerel format kullanımı
- ✅ **Türkçe Hata Mesajları** - Anlaşılır hata bildirimleri
- ✅ **Türkçe Grafik Etiketleri** - Grafiklerde Türkçe açıklamalar

## ⚙️ Gelişmiş Özellikler

### Yerel Zaman Kullanımı
- Grafiklerde ESP'den gelen timestamp yerine yerel zaman kullanılır
- Türkçe tarih/saat formatı
- Gerçek zamanlı güncelleme göstergesi

### Chart.js Entegrasyonu
- Daha hızlı render performance
- Responsive grafikler
- Smooth animasyonlar
- Mobil dokunmatik desteği

### Motor Kontrolü
- Anlık komut gönderimi
- Durum geri bildirimi
- Hata yönetimi
- ESP32 tarafında polling desteği

## 🚀 Deployment

Proje **Vercel** üzerinde otomatik olarak deploy edilir. Her güncelleme anında canlıya alınır.

### Local Development

```bash
# Bağımlılıkları yükle
npm install

# Development sunucularını başlat
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 📄 Vercel Configuration

Proje `vercel.json` ile yapılandırılmıştır:
- Otomatik build
- API routes
- Static file serving
- CORS desteği

## 🔒 Güvenlik

- ✅ HTTPS zorunlu
- ✅ CORS yapılandırması
- ✅ Input validation
- ✅ Error handling

## 📞 Destek

Sorun yaşıyorsanız veya önerileriniz varsa issue açabilirsiniz.

---

**🌾 Modern tarım teknolojisi ile geleceği büyütün!**
