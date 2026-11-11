# Panduan Code Review & Pull Request Checklist

Sebelum anggota tim memberikan persetujuan (*Approve*) dan melakukan *Merge* Pull Request ke *branch* utama (`main`), pastikan poin-poin berikut telah terpenuhi:

1. **Uji Fungsionalitas:** Kode berjalan normal di lingkungan lokal tanpa memicu pesan *error/crash* pada konsol.
2. **Keamanan Konfigurasi:** Tidak ada data rahasia (seperti kata sandi basis data atau kunci API) yang ditulis secara langsung (*hardcoded*). Seluruh parameter sensitif wajib diletakkan di dalam berkas `.env`.
3. **Kesesuaian Standar Commit:** Pesan *commit* mengikuti aturan konvensi (`feat`, `fix`, `docs`).
4. **Kaitan Issue:** Deskripsi pada *Pull Request* wajib menyertakan kata kunci otomatis, contoh: `Closes #1`, `Closes #2`, atau `Closes #3`.