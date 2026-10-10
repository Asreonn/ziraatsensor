// Motor kontrol durumunu saklamak için
let motorStatus = {
  isRunning: false,
  lastCommand: null,
  timestamp: null
};

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
      const { command } = req.body;
      
      if (!command || !['start', 'stop'].includes(command)) {
        return res.status(400).json({ 
          error: 'Geçersiz komut',
          message: 'Komut "start" veya "stop" olmalıdır' 
        });
      }

      // Motor durumunu güncelle
      motorStatus = {
        isRunning: command === 'start',
        lastCommand: command,
        timestamp: new Date().toISOString()
      };

      console.log(`🔧 Motor komutu alındı: ${command} - ${new Date().toLocaleString('tr-TR')}`);

      res.json({ 
        status: 'success', 
        message: `Motor ${command === 'start' ? 'başlatılıyor' : 'durduruluyor'}`,
        motorStatus: motorStatus
      });
    } catch (error) {
      console.error('Motor kontrolü hatası:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  } else if (req.method === 'GET') {
    try {
      // ESP32'nin motor durumunu kontrol etmesi için endpoint
      res.json({
        motorStatus: motorStatus,
        hasCommand: !!motorStatus.lastCommand
      });
    } catch (error) {
      console.error('Motor durumu getirme hatası:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 