# 🛍️ KatalogPro — Katalog Produk Dinamis

Aplikasi katalog produk yang elegan dan dinamis dibangun dengan **React + Vite + Firebase**, dilengkapi panel admin dan deploy otomatis via **GitHub Actions**.

![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28?logo=firebase) ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite) ![CI/CD](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=github-actions)

---

## ✨ Fitur

- 📦 **Katalog produk real-time** — Firestore `onSnapshot` live updates
- 🔍 **Pencarian & filter** — by keyword, kategori, sorting harga/nama
- 🖼️ **Grid & List view** — toggle tampilan sesuai preferensi
- 🛠️ **Panel Admin** — tambah, edit, hapus produk + upload gambar ke Firebase Storage
- 🏷️ **Badge produk** — Best Seller, New, Sale, Eco
- 📱 **Responsive** — mobile-first design
- ⚡ **Deploy otomatis** — GitHub Actions → Firebase Hosting

---

## 🚀 Cara Setup

### 1. Clone & Install

```bash
git clone https://github.com/username/katalog-pro.git
cd katalog-pro
npm install
```

### 2. Buat Firebase Project

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik **Add project** → beri nama project
3. Aktifkan:
   - **Firestore Database** (mode: Production atau Test)
   - **Storage** (default bucket)
   - **Hosting** (akan dipakai GitHub Actions)

### 3. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit `.env` dengan nilai dari Firebase Console:
```
Firebase Console → Project Settings → Your Apps → Add Web App
```

### 4. Jalankan Lokal

```bash
npm run dev
# Buka http://localhost:5173
```

---

## 🔑 Login Admin

Password default: `admin123`

Ganti di `.env`:
```
VITE_ADMIN_PASSWORD=password_kuat_anda
```

Setelah login admin:
- Tombol ✏️ dan 🗑️ muncul di setiap produk
- Tombol **"Tambah Produk"** muncul di toolbar
- Jika Firestore kosong, tombol **"Seed Contoh Data"** muncul

---

## 📦 Deploy dengan GitHub Actions

### Langkah 1: Install Firebase CLI & Init

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

### Langkah 2: Dapatkan Service Account

```
Firebase Console → Project Settings → Service Accounts
→ Generate new private key → Simpan JSON
```

### Langkah 3: Tambahkan GitHub Secrets

Di repo GitHub → **Settings → Secrets → Actions**, tambahkan:

| Secret Name | Nilai |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Isi JSON service account (seluruh isi file) |
| `VITE_FIREBASE_API_KEY` | API Key Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_ADMIN_PASSWORD` | Password admin panel |

### Langkah 4: Push ke main

```bash
git add .
git commit -m "feat: initial katalog pro"
git push origin main
```

GitHub Actions akan otomatis:
1. ✅ Install dependencies
2. 🔨 Build aplikasi
3. 🚀 Deploy ke Firebase Hosting

---

## 📁 Struktur Project

```
katalog-pro/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD
├── src/
│   ├── App.jsx                 # Komponen utama + semua logika
│   └── main.jsx                # Entry point React
├── .env.example                # Template environment variables
├── .gitignore
├── firebase.json               # Firebase Hosting config
├── firestore.indexes.json      # Firestore indexes
├── firestore.rules             # Security rules Firestore
├── storage.rules               # Security rules Storage
├── index.html
├── package.json
└── vite.config.js
```

---

## 🔒 Keamanan Production

Untuk produksi nyata, upgrade keamanan dengan:

1. **Firebase Authentication** — gunakan Email/Password atau Google Sign-In
2. **Custom Claims** — set `admin: true` di token JWT
3. **Update Firestore rules** — uncomment blok `PRODUCTION VERSION`
4. **Update Storage rules** — idem

---

## 🛠️ Commands

```bash
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Lint code
firebase deploy    # Manual deploy (semua services)
firebase deploy --only hosting   # Deploy hosting saja
```

---

## 📄 Lisensi

MIT — bebas digunakan dan dimodifikasi.
