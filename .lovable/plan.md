
# Alg Havuzu İzleme Dashboard'u

## Genel Bakış
ESP32 tabanlı biyoreaktör/alg havuzu için premium, endüstriyel IoT izleme paneli. Mock data ile başlayıp gerçek sensör verilerine geçişe hazır mimari.

## Tasarım Dili
- **Estetik:** Command Center — Linear meets laboratuvar terminali
- **Palet:** Soğuk tonlar, beyaz kartlar, yeşil (sağlıklı), amber (sapma), kırmızı (anomali)
- **Tipografi:** Tabular-nums sensör değerleri, büyük ölçekli L1 değerler, küçük uppercase etiketler
- **Kartlar:** Bordürsüz, katmanlı gölgeler, hover'da hafif yükselme efekti
- **Gauge/speedometer YOK** — sadece büyük sayılar, sparkline'lar ve durum noktaları

## Sayfalar

### 1. Overview (Ana Sayfa)
- 3x2 grid sensör kartları: pH, EC, Çözünmüş Oksijen, Su Sıcaklığı, Hava Sıcaklığı, Hava Nemi
- Her kart: Durum noktası + etiket, büyük anlık değer, birim, son 60dk mikro-sparkline, delta yüzdesi, son güncelleme zamanı
- Havuz genel durumu başlığı: "Pool Alpha-1: Stable"

### 2. Analytics
- Tam genişlik zaman serisi AreaChart (6 metrik, senkronize tooltip)
- Kısa içgörü kartları: "pH yavaşça yükseliyor", "DO stabil", "EC düşüş trendinde" gibi otomatik trend açıklamaları
- Zaman aralığı seçici (1s, 6s, 24s, 7g)

### 3. Anomalies
- Dikey "feed" listesi, ciddiyet seviyesine göre sol kenar renk kodlaması
- Her anomali: zaman damgası, sensör adı, anomali türü (ani değişim / eşik dışı / sapma), değer detayı
- Filtreleme: sensöre ve ciddiyete göre

### 4. System Status
- ESP32 durumu: uptime, RSSI sinyal gücü, güç voltajı
- Sensör bağlantı durumları (çevrimiçi/çevrimdışı)
- Son veri senkronizasyon zamanları

### 5. Settings
- Havuz bilgileri ve etiketleri
- Her sensör için eşik değerleri (min/maks uyarı sınırları)
- Veri yenileme aralığı ayarı
- Gelecek entegrasyon notları (ESP API / WebSocket / MQTT placeholder)

## Mock Data Sistemi
- Sinüzoidal + Perlin noise tabanlı gerçekçi sensör akışı (rastgele değil, doğal drift)
- Her sensör için bağımsız güncelleme döngüsü
- Merkezi `DataProvider` katmanı — ileride gerçek API'ye geçişte sadece bu katman değişecek

## Navigasyon
- Sol sidebar (collapsible, icon modlu), aktif sayfa vurgusu
- Üst header'da SidebarTrigger (her zaman görünür)
- Mobil responsive

## Teknik Mimari
- `src/lib/sensors/` — sensör tipleri, mock data üretici, veri sağlayıcı (DataProvider context)
- `src/components/dashboard/` — SensorCard, SparklineChart, AnomalyFeed, InsightCard
- `src/pages/` — Overview, Analytics, Anomalies, SystemStatus, Settings
- Recharts ile grafikler
