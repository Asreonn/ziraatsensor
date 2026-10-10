# AICO Alg Havuzu Komuta Paneli

AICO icin hazirlanan bu arayuz; alg havuzlarindaki su kimyasi, ortam kosullari ve cihaz telemetrisini tek panelden izlemek uzere kuruludur.

## Teknoloji yigin

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts

## Gelistirme komutlari

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Supabase kurulumu

```bash
cp .env.example .env.local
supabase start
supabase db push
```

- `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` degerlerini `.env.local` icine yazin.
- Uygulama giris zorunludur; her kullanicinin kendi `pools`, `sensor_readings` ve `pool_system_status` verisi vardir.
- `user_preferences.use_mock_data` bool alani test veri mi yoksa Supabase verisi mi kullanilacagini belirler.
- Yeni migration sonrasinda kullanicilar varsayilan olarak `reel` modda acilir; isterlerse ayarlardan tekrar test moduna donebilir.

## Proje yapisi

- `src/pages`: ana ekranlar
- `src/components/dashboard`: dashboard kartlari, sidebar ve modal bilesenleri
- `src/lib/sensors`: mock sensor veri modeli ve durum uretimi
- `src/lib/auth`: Supabase auth context ve session mantigi
- `src/lib/supabase`: istemci ve veritabani tipleri
- `supabase/migrations`: tablo, RLS ve bootstrap SQL dosyalari
- `public`: favicon ve statik marka varliklari

## Vercel'e deploy

1. GitHub'da yeni bir repo olusturup bu klasoru pushlayin.
2. https://vercel.com/new uzerinden repoyu import edin (framework otomatik **Vite** olarak algilanir).
3. Project Settings -> Environment Variables altinda ekleyin:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy edin. SPA fallback ve cache ayarlari `vercel.json` icinde tanimlidir.

> `dist/`, `.env*`, `node_modules` ve `PRIVATE_ESP_SUPABASE_HANDOFF.md` `.gitignore` ile dislanmistir; service_role veya gercek anon key asla repoya gitmez.

## Notlar

- Test modu rastgele veri uretir, reel mod Supabase tabanli pool verilerini okur.
- Gercek ESP32, MQTT veya REST veri yazimi icin Supabase tablolarini besleyen entegrasyon katmani eklenmelidir.

## Project State

Status: PAUSED
Completion: 65
Last reviewed: 2026-09-22
Family: sensors
Resume cost: medium

### Purpose

TÜBİTAK 2209-A alg havuzu paneli ve ESP firmware.

### Current state

README, web ve .ino. Git 2025-07-18, dosyalar 2026-06-26. Yaklaşık 11 bin satır.

### Missing / unfinished

Hangi firmware klasörünün yüklü kartla aynı olduğu doğrulanmadı.

### Next action

espScript ile ziraat projesi/kod/esp8266-firmware arasından yüklü olanı işaretle.

### Important files

Registry id `ziraat-sensor`. Source scan: 106 files, about 10809 lines, tests=True.

### Related projects

sera-prototip

