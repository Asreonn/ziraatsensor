// Global veri saklamak için (production'da gerçek veritabanı kullanılmalı)
let latestSensorData = null;

export default function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Gelen veriyi doğrula
      const { device, ts, wifi, values } = req.body;
      
      if (!device || !ts || !wifi || !values) {
        return res.status(400).json({ error: 'Eksik veri alanları' });
      }

      // Timestamp'i readable formata çevir
      const timestamp = new Date(ts * 1000);
      
      // Veriyi sakla
      latestSensorData = {
        device,
        timestamp: timestamp.toISOString(),
        ts,
        wifi,
        values,
        receivedAt: new Date().toISOString()
      };

      console.log(`📊 Yeni veri alındı: ${device} - ${timestamp.toLocaleString('tr-TR')}`);
      console.log('Sensör değerleri:', values);

      res.json({ status: 'success', message: 'Veri başarıyla alındı' });
    } catch (error) {
      console.error('POST hatası:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  } else if (req.method === 'GET') {
    try {
      if (!latestSensorData) {
        return res.status(404).json({ 
          error: 'Henüz veri alınmadı',
          message: 'ESP cihazından veri bekleniyor...' 
        });
      }

      // Son veriyi döndür
      res.json(latestSensorData);
    } catch (error) {
      console.error('GET hatası:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 