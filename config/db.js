/**
 * config/db.js
 * Modul konfigurasi basis data dan abstraksi penyimpanan data pengguna.
 * Selaras dengan architecture.md & prd.md.
 */

require('dotenv').config();

// Konfigurasi koneksi basis data dari variabel lingkungan (.env)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  database: process.env.DB_NAME || 'os_k4si_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

/**
 * Penyimpanan data pengguna (In-Memory Database Store)
 * Digunakan sebagai repositori terisolasi yang siap dihubungkan dengan pool MySQL/PostgreSQL.
 */
const usersTable = [];

/**
 * Mencari data pengguna berdasarkan alamat email
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const findUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = usersTable.find((u) => u.email.toLowerCase() === normalizedEmail);
  return user || null;
};

/**
 * Menyimpan data pengguna baru ke dalam basis data
 * @param {object} userData - { name, email, password }
 * @returns {Promise<object>}
 */
const createUser = async ({ name, email, password }) => {
  const newUser = {
    id: usersTable.length + 1,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password, // Password yang sudah dienkripsi / di-hash
    createdAt: new Date().toISOString()
  };

  usersTable.push(newUser);
  return newUser;
};

/**
 * Mengambil semua data pengguna (untuk kebutuhan audit/testing)
 * @returns {Promise<Array>}
 */
const getAllUsers = async () => {
  return [...usersTable];
};

module.exports = {
  dbConfig,
  findUserByEmail,
  createUser,
  getAllUsers
};

