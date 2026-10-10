export default function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const mockData = {
      device: "NodeMCU_V3",
      ts: Math.floor(Date.now() / 1000),
      wifi: {
        ssid: "YOUR_WIFI_SSID",
        rssi: -68,
        ip: "10.0.0.5"
      },
      values: {
        dissolved_oxygen: parseFloat((Math.random() * 5 + 8).toFixed(2)),
        ph: parseFloat((Math.random() * 2 + 6).toFixed(2)),
        conductivity: Math.floor(Math.random() * 500 + 1500),
        water_temp: parseFloat((Math.random() * 10 + 20).toFixed(1)),
        air_temp: parseFloat((Math.random() * 15 + 25).toFixed(1)),
        air_humidity: parseFloat((Math.random() * 30 + 40).toFixed(1))
      }
    };

    // Mock veriyi sensor-data endpoint'ine gönder (simülasyon)
    res.json({ 
      status: 'success', 
      message: 'Test verisi oluşturuldu',
      data: mockData,
      note: 'Gerçek ESP cihazı gibi /api/sensor-data endpoint\'ine POST gönderin'
    });
  } else {
    res.status(405).json({ error: 'Sadece POST method destekleniyor' });
  }
} 