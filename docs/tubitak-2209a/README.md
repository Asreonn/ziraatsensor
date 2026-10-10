# AICO TÜBİTAK 2209-A Akademik Figür Paketi

Bu paket, AICO alg havuzu izleme projesi için makale/rapor kullanımına uygun, açıklaması altyazıda verilen ve görsel içinde gereksiz metin taşımayan figürlerden oluşur.

## Tasarım Kararları

- Görsellerde büyük "Şekil" başlığı, uzun açıklama kutusu veya rapor paragrafı bulunmaz.
- Akış yönleri oklarla, ilişki ayrıntıları ise kısa etiketler ve tablo içi eşleşmelerle verilir.
- Veritabanı figüründe her FK ilişkisi `kaynak tablo.sütun -> hedef tablo.sütun` biçiminde gösterilmiştir.
- Renkler yalnızca katman/işlev ayrımı için kullanılmıştır; ana taşıyıcı çizgi ve tablo yapısı sade tutulmuştur.

## Figür Listesi

| No | Dosya | Başlık | Rapor altyazısı |
| --- | --- | --- | --- |
| Şekil 1 | figures/sekil-01-genel-sistem-mimarisi.svg | Genel sistem mimarisi | Saha ölçüm katmanı, ESP8266 kenar düğümü, Supabase veri katmanı ve web paneli arasındaki ölçüm/yapılandırma akışı. |
| Şekil 2 | figures/sekil-02-donanim-baglanti-pin-eslestirmesi.svg | Donanım bağlantı ve pin eşleştirmesi | Analog ve dijital sensörlerin ADS1115 ve ESP8266 pinleriyle açık bağlantı şeması. |
| Şekil 3 | figures/sekil-03-veri-akisi-islem-protokolu.svg | Veri akışı ve işlem protokolü | ESP8266, Supabase ve web paneli arasında gerçekleşen temel okuma/yazma işlemleri. |
| Şekil 4 | figures/sekil-04-tam-veritabani-iliski-diyagrami.svg | Tam veritabanı ilişki diyagramı | Tablolar arasındaki PK/FK ilişkileri ve kaynak-hedef sütun eşleşmeleri. |
| Şekil 5 | figures/sekil-05-firmware-karar-akisi.svg | Firmware karar akışı | ESP8266 yazılımında ağ, yapılandırma, ölçüm, eşik ve alarm kararlarının çalışma sırası. |
| Şekil 6 | figures/sekil-06-alarm-karar-modeli.svg | Alarm karar modeli | Ölçüm geçerliliği, eşik karşılaştırma, susturma ve olay günlüğü ilişkisi. |
| Şekil 7 | figures/sekil-07-veri-guncelligi-durum-modeli.svg | Veri güncelliği durum modeli | Canlı, bekleniyor ve veri yok durumlarının cihaz çevrimine göre ayrılması. |
| Şekil 8 | figures/sekil-08-cihaz-sahiplenme-akisi.svg | Cihaz sahiplenme akışı | Kullanıcı oturumu, çalışma alanı ve claim_pool() ile cihazın kullanıcı hesabına bağlanması. |
| Şekil 9 | figures/sekil-09-web-panel-modul-mimarisi.svg | Web panel modül mimarisi | React panelde oturum, veri sağlayıcı, sayfalar ve bileşenler arasındaki bağımlılıklar. |
| Şekil 10 | figures/sekil-10-yetkilendirme-veri-erisim-modeli.svg | Yetkilendirme ve veri erişim modeli | Auth oturumu, RLS politikası ve istemci/yönetici sınırlarının veri erişimine etkisi. |
| Şekil 11 | figures/sekil-11-dogrulama-matrisi.svg | Doğrulama matrisi | Donanım, veri aktarımı, cihaz sağlığı, alarm ve panel çıktılarının doğrulama kanıtları. |
| Şekil 12 | figures/sekil-12-olcum-parametreleri.svg | Ölçüm parametreleri | Sensörler, birimler ve veritabanında kullanılan sensör kimlikleri. |

## Veritabanı FK Eşleşmeleri

| No | Kaynak sütun | Hedef sütun | Kardinalite |
| --- | --- | --- | --- |
| R1 | auth.users.id | user_preferences.user_id | 1:1 |
| R2 | auth.users.id | pools.user_id | 1:N |
| R3 | pools.id | pool_system_status.pool_id | 1:1 |
| R4 | pools.id | sensor_readings.pool_id | 1:N |
| R5 | pools.id | sensor_event_logs.pool_id | 1:N |

## Ana Çıktılar

- `aico-2209a-diyagram-paketi.pdf`: 12 figürlük A4 yatay PDF.
- `aico-2209a-final-raporu.pdf`: figürleri kullanan 2209-A final rapor taslak PDF.
- `aico-2209a-final-raporu.md`: düzenlenebilir rapor metni.
- `veritabani-tablo-sozlugu.md`: tablo ve ilişki sözlüğü.
