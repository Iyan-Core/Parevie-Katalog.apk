/**
 * Cloud Function: rajaOngkirProxy
 * ─────────────────────────────────────────────────────────────────
 * Tujuan: API Key RajaOngkir tidak boleh ada di APK (bisa dibongkar
 * lewat decompile). Function ini jadi perantara — APK kirim request
 * tanpa API key, function ini yang menyimpan & memakai API key asli.
 *
 * Cara set API key (jalankan sekali via terminal):
 *   firebase functions:config:set rajaongkir.key="API_KEY_KAMU"
 *   (untuk Firebase Functions v2 / Node 20, pakai .env atau Secret Manager — lihat catatan di bawah)
 *
 * Deploy:
 *   cd functions && npm install
 *   firebase deploy --only functions
 * ─────────────────────────────────────────────────────────────────
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const axios = require("axios");
const cors = require("cors")({ origin: true });

// Secret Manager — cara aman simpan API key di Functions v2.
// Set sekali via: firebase functions:secrets:set RAJAONGKIR_API_KEY
const RAJAONGKIR_API_KEY = defineSecret("RAJAONGKIR_API_KEY");

// Ganti sesuai jenis akun RajaOngkir kamu: starter | basic | pro
const RAJAONGKIR_BASE = "https://api.rajaongkir.com/starter";

/**
 * GET /searchCity?keyword=klaten
 * Cari ID kota untuk dropdown asal/tujuan
 */
exports.searchCity = onRequest(
  { secrets: [RAJAONGKIR_API_KEY], region: "asia-southeast2" },
  (req, res) => {
    cors(req, res, async () => {
      try {
        const keyword = req.query.keyword || "";
        if (!keyword) return res.status(400).json({ error: "keyword wajib diisi" });

        const r = await axios.get(`${RAJAONGKIR_BASE}/city`, {
          headers: { key: RAJAONGKIR_API_KEY.value() },
        });

        const cities = (r.data?.rajaongkir?.results || []).filter((c) =>
          c.city_name.toLowerCase().includes(keyword.toLowerCase())
        );

        res.json({ cities: cities.slice(0, 15) });
      } catch (e) {
        console.error(e?.response?.data || e.message);
        res.status(500).json({ error: "Gagal mengambil data kota" });
      }
    });
  }
);

/**
 * POST /getShippingCost
 * Body: { origin, destination, weight, courier }
 * origin/destination = city_id dari RajaOngkir
 * weight dalam gram, courier: "jne" | "pos" | "tiki"
 */
exports.getShippingCost = onRequest(
  { secrets: [RAJAONGKIR_API_KEY], region: "asia-southeast2" },
  (req, res) => {
    cors(req, res, async () => {
      try {
        const { origin, destination, weight, courier } = req.body || {};
        if (!origin || !destination || !weight || !courier) {
          return res.status(400).json({
            error: "origin, destination, weight, courier wajib diisi",
          });
        }

        const r = await axios.post(
          `${RAJAONGKIR_BASE}/cost`,
          { origin, destination, weight, courier },
          {
            headers: {
              key: RAJAONGKIR_API_KEY.value(),
              "content-type": "application/x-www-form-urlencoded",
            },
          }
        );

        const results = r.data?.rajaongkir?.results || [];
        // Sederhanakan response agar mudah dipakai di UI
        const simplified = results.flatMap((courierResult) =>
          (courierResult.costs || []).map((c) => ({
            courier: courierResult.code.toUpperCase(),
            service: c.service,
            description: c.description,
            cost: c.cost?.[0]?.value || 0,
            etd: c.cost?.[0]?.etd || "-",
          }))
        );

        res.json({ options: simplified });
      } catch (e) {
        console.error(e?.response?.data || e.message);
        res.status(500).json({ error: "Gagal menghitung ongkos kirim" });
      }
    });
  }
);
