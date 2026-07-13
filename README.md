# Sistem Pemantauan Kualitas Udara

Sistem komprehensif berbasis web untuk memantau, memvisualisasikan, dan meramalkan kualitas udara secara real-time di lima kota utama: Bangkok, Canberra, Causeway Bay, London, dan Philadelphia. Sistem ini memantau berbagai parameter polutan utama termasuk CO, NO₂, O₃, PM10, dan PM2.5.

---

## Ringkasan Fitur

- **Dashboard Terintegrasi**: Pemantauan metrik kualitas udara terkini secara real-time dari berbagai stasiun sensor di seluruh dunia.
- **Analisis Data Historis**: Eksplorasi tren dan pola polusi udara menggunakan grafik interaktif berdasarkan rentang waktu tertentu.
- **Peramalan (Forecasting)**: Estimasi tingkat polutan di masa depan berdasarkan analisis data historis untuk mendukung pengambilan keputusan.
- **Visualisasi Geospasial**: Pemetaan lokasi sensor interaktif (GIS) yang dilengkapi dengan representasi heatmap untuk melihat sebaran polutan secara spasial.

---

## Arsitektur & Teknologi

Proyek ini dibangun menggunakan arsitektur modern yang memisahkan antara antarmuka pengguna, layanan backend, dan penyimpanan data:

- **Frontend**: React, Vite, Recharts (Visualisasi Data), MapLibre GL (Web GIS)
- **Backend**: FastAPI (Python), Uvicorn
- **Database**: Supabase (PostgreSQL)
- **Machine Learning**: XGBoost, Prophet

---

## Model Prediksi

Sistem ini mengimplementasikan dua jenis pendekatan pemodelan untuk menangani rentang waktu peramalan yang berbeda:

### 1. Model Prediksi Jangka Pendek (XGBoost)
Algoritma berbasis gradient boosting yang dikonfigurasi untuk memprediksi tingkat polutan dalam rentang waktu singkat (1 hingga 48 jam ke depan). Pendekatan ini memanfaatkan fitur temporal dan pola sekuensial dari data sensor untuk menghasilkan estimasi yang presisi.

### 2. Model Analisis Tren Jangka Panjang (Prophet)
Model time-series aditif yang handal dalam mendeteksi pola musiman dan tren makro. Model ini diaplikasikan untuk peramalan jangka panjang guna melihat arah pergerakan kualitas udara harian, mingguan, maupun bulanan.

---

## Panduan Instalasi & Eksekusi

Berikut adalah tahapan umum untuk menjalankan proyek ini di lingkungan lokal Anda.

### Prasyarat Sistem
- **Node.js** (Versi 18 atau lebih baru) dan paket manajer npm
- **Python** (Versi 3.11 atau lebih baru)
- Akses kredensial ke layanan database **Supabase**

### Langkah Inisialisasi

1. **Konfigurasi Environment**
   Terdapat dua file environment yang perlu dikonfigurasi (pada backend dan frontend). Salin file .env.example menjadi .env di masing-masing direktori dan isi parameter yang dibutuhkan (terutama kunci API Supabase).

2. **Inisialisasi Backend (FastAPI)**
   Masuk ke direktori backend/, sangat disarankan untuk mengaktifkan virtual environment Python. Instal seluruh dependensi melalui berkas requirements.txt, lalu jalankan server Uvicorn.

3. **Inisialisasi Frontend (React)**
   Masuk ke direktori frontend/, instal dependensi Node.js melalui npm install, kemudian mulai jalankan development server aplikasi web.
