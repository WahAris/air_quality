# ─────────────────────────────────────────────────────────
# AirWatch - README.md
# ─────────────────────────────────────────────────────────

# 🌬️ AirWatch — Sistem Monitoring Kualitas Udara

Aplikasi web untuk monitoring dan prediksi kualitas udara berbasis ML (Machine Learning). Menampilkan data polutan (PM2.5, PM10, O3, NO2, CO) dari berbagai kota dengan visualisasi GIS, grafik tren, dan forecast.

## 📦 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, Vite, MapLibre GL, Recharts |
| Backend | FastAPI, Python 3.11+ |
| Database | Supabase (PostgreSQL) |
| ML Models | XGBoost, Prophet (Facebook) |
| Map Tiles | OpenFreeMap |

## 🗂️ Struktur Proyek

```
web_air_baru/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── routers/  # data, forecast, gis
│   │   └── services/ # forecast_service
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
├── model/            # File model ML (.joblib, .json)
│   ├── pm25/
│   ├── pm10/
│   ├── o3/
│   ├── no2/
│   └── co/
└── dataset/          # Dataset CSV (tidak di-push, lihat catatan)
```

## 🚀 Cara Menjalankan

### Prasyarat
- Python 3.11+
- Node.js 18+
- Akun Supabase

---

### 1. Backend (FastAPI)

```bash
cd backend

# Buat virtual environment
python -m venv venv
source venv/bin/activate      # Linux/macOS
# atau
venv\Scripts\activate         # Windows

# Install dependensi
pip install -r requirements.txt

# Salin dan isi environment variables
cp .env.example .env
# Edit file .env dengan kredensial Supabase Anda

# Jalankan server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend akan tersedia di: `http://localhost:8000`  
Dokumentasi API: `http://localhost:8000/docs`

---

### 2. Frontend (React + Vite)

```bash
cd frontend

# Install dependensi
npm install

# Salin dan isi environment variables
cp .env.example .env
# Edit file .env dengan kredensial Supabase & URL backend Anda

# Jalankan dev server
npm run dev
```

Frontend akan tersedia di: `http://localhost:5173`

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `SUPABASE_URL` | URL project Supabase | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon/service key | `eyJ...` |
| `MODEL_DIR` | Path folder model ML | `./models` |
| `ALLOWED_ORIGINS` | URL frontend untuk CORS | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `VITE_SUPABASE_URL` | URL project Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_KEY` | Supabase anon key | `eyJ...` |
| `VITE_API_URL` | URL backend FastAPI | `http://localhost:8000` |
| `VITE_MAP_STYLE` | URL style peta | `https://tiles.openfreemap.org/styles/liberty` |

---

## 🗃️ Dataset & Model

### Dataset
File dataset CSV berukuran besar (~18-19 MB per file) dan **tidak disertakan** di repository ini.

Untuk mendapatkan dataset:
- Hubungi maintainer project, atau
- Jalankan script seed data: `python backend/seed_data.py`

### Model ML
File model `.joblib` tersimpan di folder `model/`. Jika terlalu besar untuk di-push:
- Gunakan **Git LFS**: `git lfs track "*.joblib"`
- Atau unduh dari link yang disediakan maintainer

---

## 📡 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/health` | Health check |
| GET | `/api/data/...` | Data kualitas udara |
| GET | `/api/forecast/...` | Prediksi kualitas udara |
| GET | `/api/gis/...` | Data GIS/peta |

Lihat dokumentasi lengkap di `/docs` setelah backend berjalan.

---

## 🤝 Kontribusi

1. Fork repository ini
2. Buat branch baru: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: tambah fitur X'`
4. Push ke branch: `git push origin fitur/nama-fitur`
5. Buat Pull Request

---

## ⚠️ Keamanan

- **Jangan pernah** commit file `.env` yang berisi kredensial asli
- Gunakan file `.env.example` sebagai template
- Rotasi API key jika tidak sengaja ter-expose
- Untuk production, gunakan environment variables dari platform deployment (Railway, Render, Vercel, dll.)

---

## 📄 Lisensi

[MIT License](LICENSE)
