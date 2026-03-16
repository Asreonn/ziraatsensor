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

## Proje yapisi

- `src/pages`: ana ekranlar
- `src/components/dashboard`: dashboard kartlari, sidebar ve modal bilesenleri
- `src/lib/sensors`: mock sensor veri modeli ve durum uretimi
- `src/lib/auth`: Supabase auth context ve session mantigi
- `src/lib/supabase`: istemci ve veritabani tipleri
- `supabase/migrations`: tablo, RLS ve bootstrap SQL dosyalari
- `public`: favicon ve statik marka varliklari

## Notlar

- Test modu rastgele veri uretir, reel mod Supabase tabanli pool verilerini okur.
- Gercek ESP32, MQTT veya REST veri yazimi icin Supabase tablolarini besleyen entegrasyon katmani eklenmelidir.
