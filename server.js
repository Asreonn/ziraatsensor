const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// En son alınan sensör verisini saklamak için
let latestSensorData = null;

// ESP'den gelen POST verisini alacak endpoint
app.post('/api/sensor-data', (req, res) => {
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
});

// Frontend'in veri alacağı GET endpoint
app.get('/api/sensor-data', (req, res) => {
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
});

// Sistem durumu endpoint'i
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        uptime: process.uptime(),
        lastDataReceived: latestSensorData ? latestSensorData.receivedAt : null,
        hasData: !!latestSensorData
    });
});

// Test için mock data endpoint'i
app.post('/api/test-data', (req, res) => {
    const mockData = {
        device: "NodeMCU_V3",
        ts: Math.floor(Date.now() / 1000),
        wifi: {
            ssid: "YOUR_WIFI_SSID",
            rssi: -68,
            ip: "10.0.0.5"
        },
        values: {
            dissolved_o2: (Math.random() * 5 + 8).toFixed(2),
            pH: (Math.random() * 2 + 6).toFixed(2),
            conductivity: Math.floor(Math.random() * 500 + 1500),
            water_temp: (Math.random() * 10 + 20).toFixed(1),
            air_temp: (Math.random() * 15 + 25).toFixed(1),
            air_humidity: (Math.random() * 30 + 40).toFixed(1)
        }
    };

    // Mock veriyi POST endpoint'ine gönder
    latestSensorData = {
        ...mockData,
        timestamp: new Date(mockData.ts * 1000).toISOString(),
        receivedAt: new Date().toISOString()
    };

    res.json({ status: 'success', message: 'Test verisi oluşturuldu', data: mockData });
});

app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    console.log(`📡 ESP cihazı http://localhost:${PORT}/api/sensor-data adresine POST gönderebilir`);
    console.log(`🧪 Test için: curl -X POST http://localhost:${PORT}/api/test-data`);
}); 