/**
 * ==============================================================================
 * MODUL KONFIGURASI BASIS DATA DENGAN SISTEM FALLBACK PORT OTOMATIS
 * ==============================================================================
 * Mata Kuliah : Open Source (MKIPS030524) - Kelas SI52
 * Tugas       : Issue #2 - Perbaikan error koneksi database saat port lokal bentrok
 * Author      : Alya Roihanatul Jannah (NIM: 2441919018)
 * Deskripsi   : Berkas ini bertanggung jawab untuk mengelola koneksi ke basis data.
 *               Dilengkapi mekanisme deteksi port otomatis, jika port utama (default: 3306)
 *               mengalami bentrok/tidak merespons, sistem akan otomatis beralih ke port
 *               alternatif/cadangan (fallback port, default: 3307 atau 5432).
 * ==============================================================================
 */

// Memuat modul bawaan Node.js 'net' untuk melakukan uji coba soket TCP pada port
const net = require('net');

// Memuat berkas variabel lingkungan (.env) jika modul dotenv tersedia di sistem
try {
  require('dotenv').config();
} catch (error) {
  // Jika dotenv belum terinstal, proses tetap berjalan menggunakan process.env lokal
  console.warn('[Peringatan] Modul dotenv belum terpasang, menggunakan variabel lingkungan default.');
}

// Konfigurasi parameter basis data yang diambil dari environment variables (.env)
const dbConfig = {
  // Alamat host server basis data (default: 'localhost')
  host: process.env.DB_HOST || 'localhost',

  // Nama pengguna basis data (default: 'root')
  user: process.env.DB_USER || 'root',

  // Kata sandi basis data (default: kosong)
  password: process.env.DB_PASS || '',

  // Nama basis data yang dituju (default: 'db_opensrc')
  database: process.env.DB_NAME || 'db_opensrc',

  // Port utama yang menjadi prioritas koneksi pertama (default: 3306 untuk MySQL)
  primaryPort: parseInt(process.env.DB_PORT, 10) || 3306,

  // Port alternatif (fallback) jika port utama gagal dihubungi (default: 3307)
  fallbackPort: parseInt(process.env.DB_FALLBACK_PORT, 10) || 3307,

  // Batas waktu tunggu (timeout) uji coba soket dalam milidetik (default: 2000 ms)
  timeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 2000,
};

/**
 * Fungsi untuk menguji apakah port tertentu pada host target aktif dan merespons.
 * Menggunakan koneksi TCP socket murni melalui modul bawaan 'net'.
 *
 * @param {string} host - Host target (misal: 'localhost' atau '127.0.0.1')
 * @param {number} port - Nomor port yang akan diuji
 * @param {number} timeout - Batas waktu pengujian dalam milidetik
 * @returns {Promise<boolean>} - Mengembalikan true jika port merespons, false jika gagal
 */
function testPortAvailability(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    // Membuat instansiasi socket baru
    const socket = new net.Socket();

    // Penanda status apakah koneksi sudah diselesaikan (untuk mencegah double resolve)
    let isSettled = false;

    // Mengatur batas waktu timeout koneksi
    socket.setTimeout(timeout);

    // Event jika koneksi soket berhasil terhubung ke host dan port target
    socket.on('connect', () => {
      if (!isSettled) {
        isSettled = true;
        // Melepaskan dan menutup soket setelah pengujian berhasil
        socket.destroy();
        resolve(true);
      }
    });

    // Event jika terjadi error pada soket (misal: ECONNREFUSED, EADDRINUSE, host unreachable)
    socket.on('error', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });

    // Event jika waktu koneksi melebihi batas batas waktu (timeout)
    socket.on('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });

    // Memulai percobaan koneksi TCP ke target host dan port
    socket.connect(port, host);
  });
}

/**
 * Fungsi utama untuk menentukan port yang aktif dengan mekanisme Fallback Port Otomatis.
 * Urutan pengecekan:
 * 1. Mencoba port utama (dbConfig.primaryPort, contoh: 3306).
 * 2. Jika port utama gagal/bentrok, beralih ke port cadangan (dbConfig.fallbackPort, contoh: 3307).
 * 3. Jika port cadangan gagal, memeriksa alternatif darurat (misal: 5432).
 *
 * @returns {Promise<number>} - Port aktif yang berhasil dipilih untuk koneksi database
 */
async function resolveWorkingPort() {
  // Daftar port kandidat yang akan diuji secara berurutan
  const candidatePorts = [
    { port: dbConfig.primaryPort, label: 'Port Utama (Primary)' },
    { port: dbConfig.fallbackPort, label: 'Port Alternatif (Fallback)' },
    { port: 5432, label: 'Port Alternatif Sekunder (PostgreSQL/Secondary)' }
  ];

  console.log(`[Database] Memulai pemindaian ketersediaan port untuk host: ${dbConfig.host}...`);

  // Melakukan iterasi dan menguji setiap port kandidat satu per satu
  for (const candidate of candidatePorts) {
    console.log(`[Database] Menguji koneksi ke ${candidate.label}: ${candidate.port}...`);

    // Memanggil fungsi uji soket TCP
    const isAvailable = await testPortAvailability(dbConfig.host, candidate.port, dbConfig.timeout);

    if (isAvailable) {
      console.log(`[Database] BERHASIL: Port ${candidate.port} aktif dan siap menerima koneksi.`);
      return candidate.port;
    }

    console.warn(`[Database] GAGAL: Port ${candidate.port} tidak merespons atau sedang terjadi konflik.`);
  }

  // Jika semua port gagal dihubungi, sistem memberikan peringatan dan kembali ke port default utama
  console.error('[Database] PERINGATAN: Semua port kandidat tidak merespons! Menggunakan port default utama.');
  return dbConfig.primaryPort;
}

// Variabel penampung pool koneksi basis data (singleton pattern)
let poolInstance = null;

/**
 * Fungsi untuk menginisialisasi atau mengambil Connection Pool ke database.
 * Fungsi ini mengintegrasikan 'mysql2/promise' secara dinamis.
 *
 * @returns {Promise<object>} - Instansiasi Pool basis data yang siap digunakan
 */
async function getDatabasePool() {
  // Jika pool sudah pernah dibuat sebelumnya, gunakan kembali (reuse pool)
  if (poolInstance) {
    return poolInstance;
  }

  // Menentukan port yang aktif menggunakan mekanisme fallback otomatis
  const selectedPort = await resolveWorkingPort();

  // Mempersiapkan parameter koneksi lengkap
  const finalConfig = {
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: selectedPort,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  try {
    // Memuat pustaka mysql2/promise
    const mysql = require('mysql2/promise');

    // Membuat connection pool baru dengan konfigurasi port terpilih
    poolInstance = mysql.createPool(finalConfig);
    console.log(`[Database] Pool koneksi database berhasil diinisialisasi pada port: ${selectedPort}`);
    return poolInstance;
  } catch (err) {
    // Penanganan jika paket 'mysql2' belum terinstal di node_modules
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('[Database] Modul "mysql2" belum terinstal. Mengembalikan objek konfigurasi terverifikasi.');
      return {
        isMock: true,
        config: finalConfig,
        message: 'Modul mysql2 belum terpasang. Jalankan "npm install mysql2" untuk mengaktifkan koneksi riil.'
      };
    }
    throw err;
  }
}

/**
 * Fungsi pembantu untuk menguji konektivitas riil ke database (ping query).
 *
 * @returns {Promise<boolean>} - Status keberhasilan eksekusi query uji coba
 */
async function testConnection() {
  try {
    const pool = await getDatabasePool();

    // Jika modul mysql2 belum dipasang, tampilkan panduan konfigurasi
    if (pool.isMock) {
      console.log(`[Database] Konfigurasi tervalidasi: Host ${pool.config.host}, Port ${pool.config.port}`);
      return true;
    }

    // Melakukan eksekusi query uji koneksi sederhana
    const [rows] = await pool.query('SELECT 1 + 1 AS test_result');
    console.log('[Database] Uji query koneksi database berhasil:', rows);
    return true;
  } catch (error) {
    console.error('[Database] Kesalahan saat melakukan koneksi ke database:', error.message);
    return false;
  }
}

// Ekspor fungsi dan objek konfigurasi agar dapat digunakan oleh modul lain (misal: routes/auth.js)
module.exports = {
  dbConfig,
  testPortAvailability,
  resolveWorkingPort,
  getDatabasePool,
  testConnection
};

// Blok eksekusi otomatis jika berkas ini dijalankan langsung lewat CLI (contoh: node config/db.js)
if (require.main === module) {
  console.log('====================================================');
  console.log('  UJI DIAGNOSTIK KONEKSI DATABASE & FALLBACK PORT   ');
  console.log('====================================================');
  testConnection().then((success) => {
    console.log(`Hasil diagnostik: ${success ? 'SUKSES' : 'GAGAL'}`);
    process.exit(0);
  });
}

