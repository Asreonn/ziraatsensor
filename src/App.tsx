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
    dissolved_oxygen: number;
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
  dissolved_oxygen: number;
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

  const fetchSensorData = async (isInitialLoad = false) => {
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
      
      // Sadece ilk yüklemede loading'i false yap
      if (isInitialLoad) {
        setLoading(false);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('ESP cihazından veri bekleniyor...');
      } else {
        setError('Bağlantı hatası: ' + (err.message || 'Bilinmeyen hata'));
      }
      
      // Sadece ilk yüklemede loading'i false yap
      if (isInitialLoad) {
        setLoading(false);
      }
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
    fetchSensorData(true);
    
    // Her 1 saniyede bir güncelle (background update)
    const interval = setInterval(() => fetchSensorData(false), 1000);
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'dissolved_oxygen': return <OpacityOutlined color="primary" />;
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
      case 'dissolved_oxygen': return 'mg/L';
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
      case 'dissolved_oxygen': return 'Çözünmüş Oksijen';
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

  // Her sensör için ayrı grafik verisi
  const createChartData = (sensorKey: keyof HistoryData, label: string, color: string) => ({
    labels: history.map(item => item.time),
    datasets: [
      {
        label: label,
        data: history.map(item => {
          const value = item[sensorKey];
          return typeof value === 'number' && !isNaN(value) ? value : null;
        }),
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        spanGaps: true // Bu null değerlerde çizgiyi devam ettirir
      }
    ]
  });

  // Sensör grafik konfigürasyonları
  const sensorConfigs = [
    {
      key: 'dissolved_oxygen' as keyof HistoryData,
      label: 'Çözünmüş Oksijen (mg/L)',
      color: 'rgb(75, 192, 192)',
      range: { min: 0, max: 15 }
    },
    {
      key: 'pH' as keyof HistoryData,
      label: 'pH Değeri',
      color: 'rgb(255, 99, 132)',
      range: { min: 4, max: 10 }
    },
    {
      key: 'conductivity' as keyof HistoryData,
      label: 'İletkenlik (µS/cm)',
      color: 'rgb(255, 159, 64)',
      range: { min: 0, max: 2500 }
    },
    {
      key: 'water_temp' as keyof HistoryData,
      label: 'Su Sıcaklığı (°C)',
      color: 'rgb(54, 162, 235)',
      range: { min: 0, max: 50 }
    },
    {
      key: 'air_temp' as keyof HistoryData,
      label: 'Hava Sıcaklığı (°C)',
      color: 'rgb(255, 205, 86)',
      range: { min: 0, max: 50 }
    },
    {
      key: 'air_humidity' as keyof HistoryData,
      label: 'Hava Nemi (%)',
      color: 'rgb(153, 102, 255)',
      range: { min: 0, max: 100 }
    }
  ];

  // Her sensör için özel grafik seçenekleri
  const createChartOptions = (title: string, min: number, max: number, unit: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false // Tek veri seti olduğu için legend'i gizle
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 14,
          weight: 'bold' as const
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: function(context: any) {
            return `Zaman: ${context[0].label}`;
          },
          label: function(context: any) {
            const value = context.parsed.y;
            if (value !== null && value !== undefined) {
              return `${title}: ${value.toFixed(2)} ${unit}`;
            }
            return `${title}: Veri yok`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: min,
        max: max,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return value.toFixed(1) + (unit ? ' ' + unit : '');
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          maxTicksLimit: 10,
          font: {
            size: 10
          }
        }
      }
    }
  });

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
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      pb: 4
    }}>
      {/* Modern Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        color: 'white',
        py: { xs: 4, sm: 6 },
        mb: 4,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                mb: 2,
                textShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              🌱 Tarım Sensör İzleme
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 400,
                mb: 2
              }}
            >
              Gerçek Zamanlı Çevresel Monitöring
            </Typography>
            
            {lastUpdate && (
              <Chip 
                label={`Son güncelleme: ${lastUpdate.toLocaleTimeString('tr-TR')}`}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 500,
                  backdropFilter: 'blur(10px)'
                }}
              />
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>

      {/* Hata Mesajı */}
      {error && (
        <Alert severity="warning" sx={{ mb: { xs: 2, sm: 3 } }} icon={<Warning />}>
          {error}
        </Alert>
      )}

      {/* Motor Kontrol */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 3, sm: 4 }, 
          mb: { xs: 3, sm: 4 },
          borderRadius: 3,
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: '12px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2
          }}>
            <Typography sx={{ fontSize: '1.5rem' }}>🔧</Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Motor Kontrolü
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: 2, 
          alignItems: 'center',
          mb: 3
        }}>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => handleMotorControl('start')}
            disabled={motorLoading || motorStatus.isRunning}
            fullWidth={window.innerWidth < 600}
            sx={{ 
              minWidth: { sm: 140 },
              py: 1.5,
              borderRadius: 2,
              backgroundColor: '#10b981',
              '&:hover': { backgroundColor: '#059669' },
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {motorLoading ? <CircularProgress size={20} color="inherit" /> : 'Başlat'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Stop />}
            onClick={() => handleMotorControl('stop')}
            disabled={motorLoading || !motorStatus.isRunning}
            fullWidth={window.innerWidth < 600}
            sx={{ 
              minWidth: { sm: 140 },
              py: 1.5,
              borderRadius: 2,
              backgroundColor: '#ef4444',
              '&:hover': { backgroundColor: '#dc2626' },
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {motorLoading ? <CircularProgress size={20} color="inherit" /> : 'Durdur'}
          </Button>
          <Chip
            icon={<Settings />}
            label={motorStatus.isRunning ? 'Motor Çalışıyor' : 'Motor Durdu'}
            sx={{
              backgroundColor: motorStatus.isRunning ? '#dcfce7' : '#f1f5f9',
              color: motorStatus.isRunning ? '#166534' : '#64748b',
              border: motorStatus.isRunning ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              fontWeight: 500,
              px: 2,
              py: 1
            }}
          />
        </Box>
        
        {motorStatus.timestamp && (
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
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
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600, 
              color: '#1e293b', 
              mb: 3,
              textAlign: 'center'
            }}
          >
            📊 Anlık Sensör Değerleri
          </Typography>
          <Box 
            display="grid" 
            gridTemplateColumns={{ 
              xs: '1fr',
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)',
              lg: 'repeat(3, 1fr)'
            }}
            gap={{ xs: 2, sm: 3 }}
          >
            {Object.entries(sensorData.values).map(([key, value]) => (
              <Card 
                elevation={0} 
                key={key} 
                sx={{ 
                  height: '100%', 
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: '12px',
                      backgroundColor: '#f0f9ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      border: '1px solid #e0f2fe'
                    }}>
                      {getSensorIcon(key)}
                    </Box>
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600, 
                          color: '#1e293b',
                          fontSize: { xs: '1rem', sm: '1.1rem' }
                        }}
                      >
                        {getSensorName(key)}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#64748b',
                          fontSize: '0.75rem'
                        }}
                      >
                        Anlık değer
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: '#0f172a',
                      fontSize: { xs: '1.75rem', sm: '2rem' },
                      mb: 1
                    }}
                  >
                    {typeof value === 'number' ? value.toFixed(2) : value}
                    <Typography 
                      component="span" 
                      sx={{ 
                        ml: 1, 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        color: '#64748b',
                        fontWeight: 500
                      }}
                    >
                      {getSensorUnit(key)}
                    </Typography>
                  </Typography>
                  
                  <Box sx={{ 
                    height: 6, 
                    backgroundColor: '#f1f5f9',
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      height: '100%',
                      backgroundColor: '#3b82f6',
                      borderRadius: 3,
                      width: `${Math.min(((value as number) / 100) * 100, 100)}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Grafikler */}
      {history.length > 1 && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            backgroundColor: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                fontSize: { xs: '1.5rem', sm: '2rem' },
                mb: 1
              }}
            >
              📈 Sensör Değerleri Geçmişi
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#64748b',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Son 20 ölçümün trend analizi
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
            mt: 2
          }}>
            {sensorConfigs.map((config, index) => (
              <Box key={config.key} sx={{ 
                backgroundColor: 'white',
                borderRadius: 2,
                p: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                border: '1px solid #f1f5f9',
                height: { xs: 280, sm: 320, md: 380 },
                position: 'relative'
              }}>
                <Line 
                  data={createChartData(config.key, config.label, config.color)} 
                  options={createChartOptions(
                    config.label,
                    config.range.min,
                    config.range.max,
                    config.key === 'pH' ? '' : 
                    config.key === 'conductivity' ? 'µS/cm' :
                    config.key === 'dissolved_oxygen' ? 'mg/L' :
                    config.key === 'air_humidity' ? '%' : '°C'
                  )}
                />
              </Box>
            ))}
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
    </Box>
  );
};

export default App;
