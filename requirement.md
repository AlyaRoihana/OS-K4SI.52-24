### 3. `requirement.md`
```markdown
# Persyaratan Sistem (Requirements)

## 1. Persyaratan Fungsional (Berdasarkan Pembagian Issue)
- **Issue #1 (Endpoint Registrasi):** 
  - Sistem wajib menerima input data pengguna berupa nama, email, dan kata sandi.
  - Melakukan validasi format email dan enkripsi kata sandi sebelum disimpan ke basis data.
- **Issue #2 (Konfigurasi Database & Port):** 
  - Sistem wajib mendeteksi ketersediaan port lokal secara dinamis.
  - Menyediakan mekanisme *fallback port* otomatis jika port utama (misal: 3306 atau 5432) sedang digunakan oleh proses lain.
- **Issue #3 (Dokumentasi API & README):** 
  - Menyediakan rincian parameter *request* dan *response* untuk setiap endpoint.
  - Memuat panduan langkah instalasi dari awal hingga aplikasi berjalan di komputer lokal.

## 2. Persyaratan Non-Fungsional & Kolaborasi
- Setiap anggota tim wajib menggunakan format **Conventional Commits** (contoh: `feat:`, `fix:`, `docs:`).
- Perubahan kode wajib diisolasi pada *branch* fitur masing-masing dan digabungkan lewat mekanisme *Pull Request* dengan format penutup `Closes #ID`.