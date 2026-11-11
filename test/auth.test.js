/**
 * test/auth.test.js
 * Pengujian unit & integrasi untuk endpoint registrasi pengguna (Issue #1).
 * Dapat dijalankan tanpa membutuhkan akses soket jaringan eksternal.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const authRouter = require('../routes/auth');
const { findUserByEmail, getAllUsers } = require('../config/db');

/**
 * Helper untuk menyimulasikan panggilan request/response ke Express router
 */
function invokeRouter(method, path, body = {}) {
  return new Promise((resolve) => {
    const req = {
      method: method.toUpperCase(),
      url: path,
      originalUrl: path,
      body,
      headers: { 'content-type': 'application/json' }
    };

    let statusCode = 200;
    let responseBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        resolve({ status: statusCode, body: responseBody });
        return this;
      }
    };

    const next = (err) => {
      if (err) {
        resolve({
          status: 500,
          body: { status: 'error', message: err.message }
        });
      } else {
        resolve({ status: 404, body: { status: 'fail', message: 'Not found' } });
      }
    };

    authRouter.handle(req, res, next);
  });
}

describe('Pengujian Endpoint Registrasi Pengguna (Issue #1)', () => {
  test('Gagal jika nama tidak diisi atau kurang dari 2 karakter', async () => {
    const res = await invokeRouter('POST', '/register', {
      name: 'A',
      email: 'user@example.com',
      password: 'Password123'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.status, 'fail');
    assert.match(res.body.message, /Nama wajib diisi/);
  });

  test('Gagal jika format email tidak valid', async () => {
    const res = await invokeRouter('POST', '/register', {
      name: 'Budi Santoso',
      email: 'budi-bukan-email',
      password: 'Password123'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.status, 'fail');
    assert.match(res.body.message, /Format email tidak valid/);
  });

  test('Gagal jika kata sandi kurang dari 8 karakter', async () => {
    const res = await invokeRouter('POST', '/register', {
      name: 'Budi Santoso',
      email: 'budi@example.com',
      password: 'Pass1'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.status, 'fail');
    assert.match(res.body.message, /Kata sandi minimal harus terdiri dari 8 karakter/);
  });

  test('Gagal jika kata sandi tidak mengandung kombinasi huruf besar, kecil, dan angka', async () => {
    const res = await invokeRouter('POST', '/register', {
      name: 'Budi Santoso',
      email: 'budi@example.com',
      password: 'passwordsemuakecil'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.status, 'fail');
    assert.match(res.body.message, /kombinasi huruf besar, huruf kecil, dan angka/);
  });

  test('Berhasil mendaftarkan pengguna baru dengan data valid dan kata sandi di-hash', async () => {
    const payload = {
      name: 'Khairunnisa',
      email: 'khairunnisa@example.com',
      password: 'SecurePassword123'
    };

    const res = await invokeRouter('POST', '/register', payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.message, 'Registrasi pengguna berhasil.');
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.name, payload.name);
    assert.equal(res.body.data.email, payload.email);
    assert.equal(res.body.data.password, undefined); // Kata sandi tidak boleh bocor

    // Verifikasi pada basis data bahwa data tersimpan dan kata sandi di-hash
    const savedUser = await findUserByEmail(payload.email);
    assert.ok(savedUser);
    assert.notEqual(savedUser.password, payload.password);
    const isMatch = await bcrypt.compare(payload.password, savedUser.password);
    assert.equal(isMatch, true);
  });

  test('Gagal jika mendaftarkan email yang sudah terdaftar (duplikasi email)', async () => {
    const payload = {
      name: 'Khairunnisa Clone',
      email: 'khairunnisa@example.com',
      password: 'AnotherPassword123'
    };

    const res = await invokeRouter('POST', '/register', payload);

    assert.equal(res.status, 409);
    assert.equal(res.body.status, 'fail');
    assert.match(res.body.message, /Email sudah terdaftar/);
  });
});
