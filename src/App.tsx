import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Box,
  CircularProgress,
  LinearProgress,
  Divider,
  Button,
  Snackbar
} from '@mui/material';
import {
  WaterDrop,
  Thermostat,
  Air,
  OpacityOutlined,
  DeviceHub,
  Wifi,
  Schedule,
  Warning,
  PlayArrow,
  Stop,
  Settings
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

// Chart.js kayıt
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SensorData {
  device: string;
  timestamp: string;
  ts: number;
  wifi: {
    ssid: string;
    rssi: number;
    ip: string;
  };
  values: {
    dissolved_o2: number;
    pH: number;
    conductivity: number;
    water_temp: number;
    air_temp: number;
    air_humidity: number;
  };
  receivedAt: string;
}

interface HistoryData {
  time: string;
  dissolved_o2: number;
  pH: number;
  conductivity: number;
  water_temp: number;
  air_temp: number;
  air_humidity: number;
}

interface MotorStatus {
  isRunning: boolean;
  lastCommand: string | null;
  timestamp: string | null;
}

const App: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [motorStatus, setMotorStatus] = useState<MotorStatus>({
    isRunning: false,
    lastCommand: null,
    timestamp: null
  });
  const [motorLoading, setMotorLoading] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });

  const getBaseURL = () => {
    return process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001';
  };

  const fetchSensorData = async () => {
    try {
      setError(null);
      const response = await axios.get(`${getBaseURL()}/api/sensor-data`);
      const data = response.data as SensorData;
      setSensorData(data);
      setLastUpdate(new Date()); // Yerel zamanı kullan
      
      // Geçmişe ekle (son 20 veriyi tut) - yerel zaman kullan
      const newHistoryEntry: HistoryData = {
        time: new Date().toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        ...data.values
      };
      
      setHistory(prev => {
        const updated = [...prev, newHistoryEntry];
        return updated.slice(-20);
      });
      
      setLoading(false);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('ESP cihazından veri bekleniyor...');
      } else {
        setError('Bağlantı hatası: ' + (err.message || 'Bilinmeyen hata'));
      }
      setLoading(false);
    }
  };

  const handleMotorControl = async (command: 'start' | 'stop') => {
    setMotorLoading(true);
    try {
      const response = await axios.post(`${getBaseURL()}/api/motor-control`, {
        command: command
      });
      
      if (response.data.status === 'success') {
        setMotorStatus(response.data.motorStatus);
        setSnackbar({
          open: true,
          message: response.data.message,
          severity: 'success'
        });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: 'Motor kontrolü hatası: ' + (err.response?.data?.message || err.message),
        severity: 'error'
      });
    } finally {
      setMotorLoading(false);
    }
  };

  useEffect(() => {
    // İlk yükleme
    fetchSensorData();
    
    // Her 10 saniyede bir güncelle
    const interval = setInterval(fetchSensorData, 10000);
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'dissolved_o2': return <OpacityOutlined color="primary" />;
      case 'pH': return <WaterDrop color="secondary" />;
      case 'conductivity': return <DeviceHub color="warning" />;
      case 'water_temp': return <Thermostat color="info" />;
      case 'air_temp': return <Thermostat color="error" />;
      case 'air_humidity': return <Air color="success" />;
      default: return <DeviceHub />;
    }
  };

  const getSensorUnit = (type: string) => {
    switch (type) {
      case 'dissolved_o2': return 'mg/L';
      case 'pH': return '';
      case 'conductivity': return 'µS/cm';
      case 'water_temp': return '°C';
      case 'air_temp': return '°C';
      case 'air_humidity': return '%';
      default: return '';
    }
  };

  const getSensorName = (type: string) => {
    switch (type) {
      case 'dissolved_o2': return 'Çözünmüş Oksijen';
      case 'pH': return 'pH Değeri';
      case 'conductivity': return 'İletkenlik';
      case 'water_temp': return 'Su Sıcaklığı';
      case 'air_temp': return 'Hava Sıcaklığı';
      case 'air_humidity': return 'Hava Nemi';
      default: return type;
    }
  };

  const getWifiStrength = (rssi: number) => {
    if (rssi > -50) return { strength: 'Mükemmel', color: 'success' as const };
    if (rssi > -60) return { strength: 'İyi', color: 'primary' as const };
    if (rssi > -70) return { strength: 'Orta', color: 'warning' as const };
    return { strength: 'Zayıf', color: 'error' as const };
  };

  const chartData = {
    labels: history.map(item => item.time),
    datasets: [
      {
        label: 'Çözünmüş O₂ (mg/L)',
        data: history.map(item => item.dissolved_o2),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'pH',
        data: history.map(item => item.pH),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      },
      {
        label: 'İletkenlik (µS/cm)',
        data: history.map(item => item.conductivity),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.1
      },
      {
        label: 'Su Sıcaklığı (°C)',
        data: history.map(item => item.water_temp),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1
      },
      {
        label: 'Hava Sıcaklığı (°C)',
        data: history.map(item => item.air_temp),
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.2)',
        tension: 0.1
      },
      {
        label: 'Hava Nemi (%)',
        data: history.map(item => item.air_humidity),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: true,
        text: 'Sensör Değerleri Geçmişi'
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: function(context: any) {
            return `Zaman: ${context[0].label}`;
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          },
          afterBody: function(context: any) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex;
              const historyItem = history[dataIndex];
              if (historyItem) {
                return [
                  '',
                  '--- TÜM DEĞERLER ---',
                  `Çözünmüş O₂: ${historyItem.dissolved_o2.toFixed(2)} mg/L`,
                  `pH: ${historyItem.pH.toFixed(2)}`,
                  `İletkenlik: ${historyItem.conductivity.toFixed(2)} µS/cm`,
                  `Su Sıcaklığı: ${historyItem.water_temp.toFixed(2)} °C`,
                  `Hava Sıcaklığı: ${historyItem.air_temp.toFixed(2)} °C`,
                  `Hava Nemi: ${historyItem.air_humidity.toFixed(2)} %`
                ];
              }
            }
            return [];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    }
  };

  if (loading && !sensorData) {
    return (
      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, textAlign: 'center', px: { xs: 1, sm: 3 } }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Sensör verileri yükleniyor...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 1, sm: 2 }, mb: 4, px: { xs: 1, sm: 3 } }}>
      {/* Başlık */}
      <Paper elevation={3} sx={{ 
        p: { xs: 2, sm: 3 }, 
        mb: { xs: 2, sm: 3 }, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            color: 'white', 
            textAlign: 'center', 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
          }}
        >
          🌾 Ziraat Sensör İzleme Sistemi
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: 'white', 
            textAlign: 'center', 
            mt: 1,
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          ESP NodeMCU Anlık Sensör Verileri
        </Typography>
      </Paper>

      {/* Hata Mesajı */}
      {error && (
        <Alert severity="warning" sx={{ mb: { xs: 2, sm: 3 } }} icon={<Warning />}>
          {error}
        </Alert>
      )}

      {/* Motor Kontrol */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          🔧 Motor Kontrolü
        </Typography>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayArrow />}
            onClick={() => handleMotorControl('start')}
            disabled={motorLoading || motorStatus.isRunning}
            fullWidth={window.innerWidth < 600}
            sx={{ minWidth: { sm: 120 } }}
          >
            {motorLoading ? <CircularProgress size={20} color="inherit" /> : 'Başlat'}
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={() => handleMotorControl('stop')}
            disabled={motorLoading || !motorStatus.isRunning}
            fullWidth={window.innerWidth < 600}
            sx={{ minWidth: { sm: 120 } }}
          >
            {motorLoading ? <CircularProgress size={20} color="inherit" /> : 'Durdur'}
          </Button>
          <Chip
            icon={<Settings />}
            label={motorStatus.isRunning ? 'Motor Çalışıyor' : 'Motor Durdu'}
            color={motorStatus.isRunning ? 'success' : 'default'}
            variant={motorStatus.isRunning ? 'filled' : 'outlined'}
          />
        </Box>
        {motorStatus.timestamp && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Son güncelleme: {new Date(motorStatus.timestamp).toLocaleString('tr-TR')}
          </Typography>
        )}
      </Paper>

      {/* Cihaz Bilgileri */}
      {sensorData && (
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
          <Box 
            display="grid" 
            gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
            gap={2} 
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <DeviceHub color="primary" />
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {sensorData.device}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Wifi color="primary" />
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {sensorData.wifi.ssid} ({sensorData.wifi.rssi} dBm)
              </Typography>
              <Chip 
                size="small" 
                label={getWifiStrength(sensorData.wifi.rssi).strength}
                color={getWifiStrength(sensorData.wifi.rssi).color}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              IP: {sensorData.wifi.ip}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule color="action" />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {new Date(sensorData.timestamp).toLocaleString('tr-TR')}
              </Typography>
            </Box>
          </Box>
          {lastUpdate && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={((Date.now() - lastUpdate.getTime()) / 10000) * 100} 
                sx={{ mt: 0.5, height: 2 }} 
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Sensör Kartları */}
      {sensorData && (
        <Box 
          display="grid" 
          gridTemplateColumns={{ 
            xs: '1fr',
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)',
            lg: 'repeat(3, 1fr)'
          }}
          gap={{ xs: 2, sm: 3 }}
          sx={{ mb: { xs: 3, sm: 4 } }}
        >
          {Object.entries(sensorData.values).map(([key, value]) => (
            <Card 
              elevation={3} 
              key={key} 
              sx={{ 
                height: '100%', 
                transition: 'transform 0.2s', 
                '&:hover': { transform: 'scale(1.02)' }
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  {getSensorIcon(key)}
                  <Typography 
                    variant="h5" 
                    component="div" 
                    fontWeight="bold" 
                    color="primary.main"
                    sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                  >
                    {typeof value === 'number' ? value.toFixed(2) : value}
                    <Typography 
                      variant="caption" 
                      component="span" 
                      sx={{ ml: 0.5, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                    >
                      {getSensorUnit(key)}
                    </Typography>
                  </Typography>
                </Box>
                <Typography 
                  variant="h6" 
                  component="div" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  {getSensorName(key)}
                </Typography>
                <Divider />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Anlık değer
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Grafik */}
      {history.length > 1 && (
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h5" 
            gutterBottom
            sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}
          >
            📈 Sensör Değerleri Geçmişi
          </Typography>
          <Box sx={{ 
            width: '100%', 
            height: { xs: 300, sm: 400, md: 500 },
            position: 'relative'
          }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        </Paper>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default App;
