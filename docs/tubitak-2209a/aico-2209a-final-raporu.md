# AICO Alg Havuzu Kontrol Sistemi 2209-A Final Rapor Taslağı

## Özet

Bu çalışmada alg havuzlarında su kalitesi ve çevresel koşulların izlenmesi için ESP8266 tabanlı, Supabase/PostgreSQL destekli ve web paneliyle yönetilebilen bir izleme sistemi geliştirilmiştir. Sistem pH, EC/TDS, çözünmüş oksijen, ışık, su sıcaklığı, hava sıcaklığı ve nem parametrelerini izlemek üzere tasarlanmıştır.

## Amaç

Projenin amacı, alg havuzundaki kritik çevresel değişkenleri düzenli ölçen, ölçüm verisini merkezi veritabanında saklayan, kullanıcıya canlı panel sunan ve eşik ihlallerinde alarm/olay kaydı üreten bir prototip oluşturmaktır.

## Yöntem

Sistem; saha ölçüm katmanı, ESP8266 kenar düğümü, Supabase veri katmanı ve React tabanlı web panelinden oluşur. Analog sensörler ADS1115 üzerinden, dijital sensörler ise ESP8266 GPIO pinleri üzerinden okunur. Ölçümler sensor_readings tablosuna, cihaz durumu pool_system_status tablosuna, eşik ve alarm yapılandırmaları pools tablosundaki JSONB alanlara kaydedilir.

## Veritabanı Tasarımı

Veritabanı modeli kullanıcı, havuz/cihaz, ölçüm, cihaz durumu ve olay günlüklerini ayrı tablolarla temsil eder. Temel ilişkiler auth.users.id alanından user_preferences.user_id ve pools.user_id alanlarına; pools.id alanından pool_system_status.pool_id, sensor_readings.pool_id ve sensor_event_logs.pool_id alanlarına kurulmuştur.

## Sonuç

Proje çıktısı, ölçüm toplama, veri kaydı, kullanıcıya bağlı cihaz yönetimi, alarm eşik yönetimi ve raporlanabilir veri üretimi için bütünleşik bir prototip sunar. Final raporda kişisel/proje kimlik bilgileri, gerçek deney koşulları, kalibrasyon yöntemi ve sayısal ölçüm sonuçları ayrıca tamamlanmalıdır.
