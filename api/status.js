export default function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      platform: 'vercel',
      region: process.env.VERCEL_REGION || 'unknown',
      message: 'Ziraat Sensör API çalışıyor'
    });
  } else {
    res.status(405).json({ error: 'Sadece GET method destekleniyor' });
  }
} 