/**
 * server.js
 * Berkas utama (entry point) aplikasi web server Express.js.
 * Mengintegrasikan konfigurasi lingkungan, routing API, serta penanganan error global.
 */

require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware parsing data JSON dan form URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rute selamat datang / root info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'OS-K4SI.52-24 API',
    version: '1.0.0',
    description: 'API Praktikum Mata Kuliah Open Source - Kelompok 4 SI52',
    endpoints: {
      health: 'GET /health',
      registration: 'POST /api/register'
    }
  });
});

// Endpoint pemantauan kesehatan layanan (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Pendaftaran rute API autentikasi (Registrasi Pengguna)
app.use('/api', authRoutes);
app.use('/api/auth', authRoutes);

// Middleware penanganan 404 (Route Not Found)
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Rute '${req.originalUrl}' tidak ditemukan pada server.`
  });
});

// Middleware penanganan error global (Global Error Handler)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Terjadi kesalahan internal pada server.'
  });
});

// Jalankan server hanya jika dijalankan secara langsung (bukan saat di-import oleh tes)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[INFO] Server berjalan di http://localhost:${PORT}`);
  });

  // Penanganan error saat port bentrok (mencegah crash tidak tertangani)
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[ERROR] Port ${PORT} sudah digunakan oleh aplikasi lain.`);
    } else {
      console.error('[ERROR] Terjadi kesalahan saat memulai server:', err);
    }
  });
}

module.exports = app;

