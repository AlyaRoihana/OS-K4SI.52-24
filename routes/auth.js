/**
 * routes/auth.js
 * Modul rute dan pengendali endpoint autentikasi (Registrasi Pengguna).
 * Memenuhi kriteria Issue #1 (Feature Implementasi endpoint API untuk registrasi pengguna).
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../config/db');

const router = express.Router();

// Pola regex untuk validasi format email yang aman
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Fungsi pembantu untuk validasi input registrasi
 * @param {object} body - Request body { name, email, password }
 * @returns {string|null} - Mengembalikan string pesan error jika tidak valid, atau null jika valid
 */
const validateRegistrationInput = ({ name, email, password }) => {
  // 1. Validasi nama
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Nama wajib diisi dan minimal terdiri dari 2 karakter.';
  }

  // 2. Validasi email
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return 'Format email tidak valid. Masukkan alamat email yang benar (contoh: user@example.com).';
  }

  // 3. Validasi kata sandi (keamanan dasar: min 8 karakter, ada huruf besar, huruf kecil, dan angka)
  if (!password || typeof password !== 'string') {
    return 'Kata sandi wajib diisi.';
  }

  if (password.length < 8) {
    return 'Kata sandi minimal harus terdiri dari 8 karakter.';
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return 'Kata sandi harus mengandung kombinasi huruf besar, huruf kecil, dan angka.';
  }

  return null;
};

/**
 * @route   POST /api/register
 * @route   POST /api/auth/register
 * @desc    Mendaftarkan pengguna baru dengan validasi dan hashing kata sandi
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // 1. Validasi input pengguna
    const validationError = validateRegistrationInput({ name, email, password });
    if (validationError) {
      return res.status(400).json({
        status: 'fail',
        message: validationError
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // 2. Pengecekan duplikasi email pada basis data
    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.'
      });
    }

    // 3. Enkripsi (hashing) kata sandi menggunakan bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Simpan pengguna baru ke basis data
    const newUser = await createUser({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword
    });

    // 5. Kembalikan respons berhasil tanpa menyertakan kata sandi atau hash
    return res.status(201).json({
      status: 'success',
      message: 'Registrasi pengguna berhasil.',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    // Teruskan ke middleware penanganan error terpusat
    next(error);
  }
});

module.exports = router;
