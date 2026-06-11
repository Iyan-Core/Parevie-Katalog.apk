import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc,
  deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy
} from "firebase/firestore";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "firebase/storage";

// ─── Firebase Config ───────────────────────────────────────────────────────
// Replace with your own Firebase project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ─── Icons ─────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
);
const IconSearch = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const IconGrid = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
);
const IconList = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const IconAdmin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
);
const IconUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
);
const IconTag = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
);

// ─── SVG Placeholder (inline, tidak butuh internet) ───────────────────────
const makePlaceholder = (label = "Foto Produk") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1a1a28"/><rect x="160" y="100" width="80" height="65" rx="8" fill="none" stroke="#c9a84c" stroke-width="3"/><circle cx="175" cy="120" r="8" fill="#c9a84c"/><polyline points="160,165 185,140 205,155 225,128 240,165" fill="none" stroke="#c9a84c" stroke-width="3"/><text x="200" y="205" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#c9a84c" opacity="0.8">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
const IMG_PLACEHOLDER = makePlaceholder();

// ─── Sample Data Seeder ────────────────────────────────────────────────────
// image dikosongkan → tampil placeholder SVG built-in (offline-safe)
// Isi image dengan URL Firebase Storage setelah upload foto produk Anda
const SAMPLE_PRODUCTS = [
  { name: "Wireless Headphones Pro", category: "Electronics", price: 299000, stock: 45, description: "Premium noise-cancelling wireless headphones dengan 40 jam baterai, suara studio quality, dan desain over-ear ultra-nyaman.", image: "", badge: "Best Seller" },
  { name: "Ergonomic Office Chair", category: "Furniture", price: 2450000, stock: 12, description: "Full lumbar support dengan armrest adjustable, mesh backrest breathable, garansi 5 tahun. Dirancang untuk kerja 8+ jam.", image: "", badge: "New" },
  { name: "Minimalist Watch", category: "Accessories", price: 875000, stock: 30, description: "Kaca kristal safir, case stainless steel 316L, tali kulit asli. Tahan air 50m. Gerakan quartz Jepang yang tak lekang waktu.", image: "", badge: "" },
  { name: "Cold Brew Coffee Kit", category: "Kitchen", price: 320000, stock: 60, description: "Sistem cold brew all-in-one dengan carafe kaca borosilikat 1.5L, filter mesh halus, dan ukuran presisi terukir.", image: "", badge: "Sale" },
  { name: "Running Shoes Ultra", category: "Sports", price: 1200000, stock: 25, description: "Teknologi carbon fiber plate, midsole busa responsif, upper mesh rekayasa. Tersertifikasi untuk lomba maraton.", image: "", badge: "" },
  { name: "Ceramic Plant Pot Set", category: "Home Decor", price: 185000, stock: 80, description: "Pot keramik hand-thrown dengan lubang drainase dan alas bambu. Set 3 ukuran. Setiap buah unik dengan glasir alami.", image: "", badge: "Eco" },
];

const CATEGORIES = ["All", "Electronics", "Furniture", "Accessories", "Kitchen", "Sports", "Home Decor"];

// ─── Formatting ────────────────────────────────────────────────────────────
const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// ─── Modal ─────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}><IconClose /></button>
        {children}
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────
function ProductCard({ product, view, onSelect, isAdmin, onEdit, onDelete }) {
  if (view === "list") {
    return (
      <div className="product-list-item" onClick={() => onSelect(product)}>
        <div className="pli-img">
          <img
            src={product.image || IMG_PLACEHOLDER}
            alt={product.name}
            onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }}
          />
        </div>
        <div className="pli-body">
          <div className="pli-meta">
            <span className="badge-cat"><IconTag />{product.category}</span>
            {product.badge && <span className={`badge badge-${product.badge.toLowerCase().replace(" ", "-")}`}>{product.badge}</span>}
          </div>
          <h3 className="pli-name">{product.name}</h3>
          <p className="pli-desc">{product.description?.slice(0, 110)}…</p>
        </div>
        <div className="pli-right">
          <span className="pli-price">{formatRupiah(product.price)}</span>
          <span className={`stock-pill ${product.stock < 15 ? "low" : ""}`}>{product.stock} stok</span>
          {isAdmin && (
            <div className="admin-actions">
              <button className="act-btn edit" onClick={(e) => { e.stopPropagation(); onEdit(product); }}><IconEdit /></button>
              <button className="act-btn del" onClick={(e) => { e.stopPropagation(); onDelete(product); }}><IconTrash /></button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="product-card" onClick={() => onSelect(product)}>
      <div className="card-img-wrap">
        <img
          src={product.image || IMG_PLACEHOLDER}
          alt={product.name}
          className="card-img"
          onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }}
        />
        {product.badge && <span className={`badge badge-${product.badge.toLowerCase().replace(" ", "-")}`}>{product.badge}</span>}
        {isAdmin && (
          <div className="card-admin-overlay" onClick={(e) => e.stopPropagation()}>
            <button className="act-btn edit" onClick={() => onEdit(product)}><IconEdit /></button>
            <button className="act-btn del" onClick={() => onDelete(product)}><IconTrash /></button>
          </div>
        )}
      </div>
      <div className="card-body">
        <span className="badge-cat"><IconTag />{product.category}</span>
        <h3 className="card-name">{product.name}</h3>
        <p className="card-desc">{product.description?.slice(0, 85)}…</p>
        <div className="card-footer">
          <span className="card-price">{formatRupiah(product.price)}</span>
          <span className={`stock-pill ${product.stock < 15 ? "low" : ""}`}>{product.stock} stok</span>
        </div>
      </div>
    </div>
  );
}

// ─── Product Form (Admin) ──────────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    name: "", category: "Electronics", price: "", stock: "", description: "", image: "", badge: ""
  });
  const [imgFile, setImgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initial?.image || "");

  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImgFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price) return alert("Nama dan harga wajib diisi!");
    let imageUrl = form.image;
    if (imgFile) {
      setUploading(true);
      try {
        const r = ref(storage, `products/${Date.now()}_${imgFile.name}`);
        await uploadBytes(r, imgFile);
        imageUrl = await getDownloadURL(r);
      } catch {
        alert("Upload gambar gagal. Pastikan Firebase Storage sudah dikonfigurasi.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    onSave({ ...form, price: Number(form.price), stock: Number(form.stock), image: imageUrl });
  };

  return (
    <div className="pform">
      <h2 className="pform-title">{initial?.id ? "Edit Produk" : "Tambah Produk Baru"}</h2>
      <div className="pform-img-row">
        {preview && <img src={preview} alt="preview" className="pform-preview" />}
        <label className="pform-upload-btn">
          <IconUpload /> Unggah Gambar
          <input type="file" accept="image/*" hidden onChange={pickFile} />
        </label>
        <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>atau isi URL:</span>
        <input className="pform-input" placeholder="https://..." value={form.image}
          onChange={(e) => { change("image", e.target.value); setPreview(e.target.value); }} />
      </div>
      <div className="pform-row">
        <div className="pform-group">
          <label>Nama Produk *</label>
          <input className="pform-input" value={form.name} onChange={(e) => change("name", e.target.value)} />
        </div>
        <div className="pform-group">
          <label>Kategori</label>
          <select className="pform-input" value={form.category} onChange={(e) => change("category", e.target.value)}>
            {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="pform-row">
        <div className="pform-group">
          <label>Harga (Rp) *</label>
          <input type="number" className="pform-input" value={form.price} onChange={(e) => change("price", e.target.value)} />
        </div>
        <div className="pform-group">
          <label>Stok</label>
          <input type="number" className="pform-input" value={form.stock} onChange={(e) => change("stock", e.target.value)} />
        </div>
        <div className="pform-group">
          <label>Badge</label>
          <select className="pform-input" value={form.badge} onChange={(e) => change("badge", e.target.value)}>
            <option value="">— Tanpa Badge —</option>
            <option>Best Seller</option><option>New</option><option>Sale</option><option>Eco</option>
          </select>
        </div>
      </div>
      <div className="pform-group">
        <label>Deskripsi Produk</label>
        <textarea className="pform-input pform-textarea" rows={4} value={form.description}
          onChange={(e) => change("description", e.target.value)} />
      </div>
      <div className="pform-actions">
        <button className="btn-cancel" onClick={onCancel}>Batal</button>
        <button className="btn-save" onClick={handleSubmit} disabled={loading || uploading}>
          {uploading ? "Mengunggah…" : loading ? "Menyimpan…" : "Simpan Produk"}
        </button>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────
function ProductDetail({ product, onClose }) {
  return (
    <div className="detail">
      <div className="detail-img-wrap">
        <img
          src={product.image || IMG_PLACEHOLDER}
          alt={product.name}
          onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }}
        />
      </div>
      <div className="detail-body">
        <div className="detail-meta">
          <span className="badge-cat"><IconTag />{product.category}</span>
          {product.badge && <span className={`badge badge-${product.badge.toLowerCase().replace(" ", "-")}`}>{product.badge}</span>}
        </div>
        <h2 className="detail-name">{product.name}</h2>
        <p className="detail-price">{formatRupiah(product.price)}</p>
        <p className="detail-desc">{product.description}</p>
        <div className="detail-footer">
          <span className={`stock-pill lg ${product.stock < 15 ? "low" : ""}`}>
            {product.stock < 15 ? "⚠ " : "✓ "}{product.stock} unit tersedia
          </span>
          <button className="btn-order">Pesan Sekarang</button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete ────────────────────────────────────────────────────────
function ConfirmDelete({ product, onConfirm, onCancel, loading }) {
  return (
    <div className="confirm-box">
      <h3>Hapus Produk?</h3>
      <p>Apakah Anda yakin ingin menghapus <strong>{product.name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
      <div className="pform-actions">
        <button className="btn-cancel" onClick={onCancel}>Batal</button>
        <button className="btn-delete" onClick={onConfirm} disabled={loading}>
          {loading ? "Menghapus…" : "Ya, Hapus"}
        </button>
      </div>
    </div>
  );
}

// ─── Admin Login ───────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";
  const attempt = () => {
    if (pass === ADMIN_PASS) { onLogin(); setErr(false); }
    else { setErr(true); setTimeout(() => setErr(false), 1500); }
  };
  return (
    <div className="admin-login">
      <div className="admin-login-icon"><IconAdmin /></div>
      <h3>Panel Admin</h3>
      <p>Masukkan password untuk mengakses mode admin</p>
      <input type="password" className={`pform-input ${err ? "input-err" : ""}`}
        placeholder="Password admin…" value={pass}
        onChange={(e) => setPass(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && attempt()} />
      {err && <p className="err-msg">Password salah!</p>}
      <button className="btn-save" style={{ width: "100%", marginTop: 8 }} onClick={attempt}>Masuk Admin</button>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [sortBy, setSortBy] = useState("default");

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const seedProducts = async () => {
    setSeeding(true);
    for (const p of SAMPLE_PRODUCTS) {
      await addDoc(collection(db, "products"), { ...p, createdAt: serverTimestamp() });
    }
    setSeeding(false);
  };

  const handleSave = async (data) => {
    setActionLoading(true);
    try {
      if (editProduct?.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, "products", editProduct.id), { ...rest, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
      }
      setShowForm(false); setEditProduct(null);
    } catch (e) { alert("Gagal menyimpan: " + e.message); }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try { await deleteDoc(doc(db, "products", deleteProduct.id)); }
    catch (e) { alert("Gagal menghapus: " + e.message); }
    setDeleteProduct(null); setActionLoading(false);
  };

  // Filter & sort
  let filtered = products.filter(p =>
    (category === "All" || p.category === category) &&
    (p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()))
  );
  if (sortBy === "price-asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sortBy === "price-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sortBy === "name") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-dot" />
              <span className="logo-text">Katalog<em>Pro</em></span>
            </div>
            <nav className="nav-cats">
              {CATEGORIES.map(c => (
                <button key={c} className={`nav-cat ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </nav>
            <div className="header-right">
              {isAdmin
                ? <button className="admin-badge active" onClick={() => setIsAdmin(false)}>Admin ✓</button>
                : <button className="admin-badge" onClick={() => setShowLogin(true)}><IconAdmin /> Admin</button>}
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-content">
            <p className="hero-eyebrow">Koleksi Premium</p>
            <h1 className="hero-title">Temukan Produk<br /><em>Terbaik Kami</em></h1>
            <p className="hero-sub">{products.length} produk pilihan — kualitas terjamin, harga terbaik</p>
          </div>
        </section>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <IconSearch />
            <input className="search-input" placeholder="Cari produk…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="search-clear" onClick={() => setSearch("")}><IconClose /></button>}
          </div>
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="default">Terbaru</option>
            <option value="price-asc">Harga ↑</option>
            <option value="price-desc">Harga ↓</option>
            <option value="name">A–Z</option>
          </select>
          <div className="view-toggle">
            <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><IconGrid /></button>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><IconList /></button>
          </div>
          {isAdmin && (
            <button className="btn-add" onClick={() => { setEditProduct(null); setShowForm(true); }}>
              <IconPlus /> Tambah Produk
            </button>
          )}
        </div>

        {/* Stats */}
        {isAdmin && (
          <div className="admin-bar">
            <span>🛠 Mode Admin Aktif</span>
            <span>{products.length} total produk</span>
            <span>{products.filter(p => p.stock < 15).length} stok menipis</span>
            {products.length === 0 && (
              <button className="btn-seed" onClick={seedProducts} disabled={seeding}>
                {seeding ? "Menyemai…" : "⚡ Seed Contoh Data"}
              </button>
            )}
          </div>
        )}

        {/* Products */}
        <main className="main">
          {loading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">📦</p>
              <h3>Tidak ada produk ditemukan</h3>
              <p>{products.length === 0 ? "Belum ada produk. Masuk sebagai admin dan tambahkan produk." : "Coba ubah kata kunci atau kategori."}</p>
            </div>
          ) : (
            <div className={view === "grid" ? "products-grid" : "products-list"}>
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} view={view} onSelect={setSelected}
                  isAdmin={isAdmin} onEdit={(p) => { setEditProduct(p); setShowForm(true); }}
                  onDelete={setDeleteProduct} />
              ))}
            </div>
          )}
        </main>

        <footer className="footer">
          <p>© 2025 KatalogPro — Firebase + React + GitHub Actions</p>
        </footer>

        {/* Modals */}
        <Modal open={!!selected} onClose={() => setSelected(null)}>
          {selected && <ProductDetail product={selected} onClose={() => setSelected(null)} />}
        </Modal>
        <Modal open={showForm} onClose={() => { setShowForm(false); setEditProduct(null); }}>
          <ProductForm initial={editProduct} onSave={handleSave} loading={actionLoading}
            onCancel={() => { setShowForm(false); setEditProduct(null); }} />
        </Modal>
        <Modal open={!!deleteProduct} onClose={() => setDeleteProduct(null)}>
          {deleteProduct && <ConfirmDelete product={deleteProduct} onConfirm={handleDelete}
            onCancel={() => setDeleteProduct(null)} loading={actionLoading} />}
        </Modal>
        <Modal open={showLogin} onClose={() => setShowLogin(false)}>
          <AdminLogin onLogin={() => { setIsAdmin(true); setShowLogin(false); }} />
        </Modal>
      </div>
    </>
  );
}

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0d14;
    --bg2: #12121c;
    --bg3: #1a1a28;
    --card: #16162280;
    --border: #ffffff12;
    --gold: #c9a84c;
    --gold2: #f0d080;
    --accent: #7c6af5;
    --accent2: #a89cf7;
    --text: #f0ede8;
    --text2: #b8b4c0;
    --text3: #6e6a7a;
    --red: #e05a5a;
    --green: #4caf82;
    --radius: 14px;
    --shadow: 0 8px 32px rgba(0,0,0,0.45);
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }

  .app { display: flex; flex-direction: column; min-height: 100vh; }

  /* Header */
  .header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(13,13,20,0.85); backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .header-inner {
    max-width: 1280px; margin: 0 auto; padding: 0 24px;
    height: 64px; display: flex; align-items: center; gap: 32px;
  }
  .logo { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .logo-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--gold); box-shadow: 0 0 12px var(--gold);
  }
  .logo-text { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--text); }
  .logo-text em { color: var(--gold); font-style: italic; }

  .nav-cats { display: flex; gap: 4px; flex: 1; overflow-x: auto; scrollbar-width: none; }
  .nav-cats::-webkit-scrollbar { display: none; }
  .nav-cat {
    padding: 5px 14px; border-radius: 20px; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 500;
    color: var(--text3); background: transparent; white-space: nowrap;
    transition: all 0.2s;
  }
  .nav-cat:hover { color: var(--text2); background: var(--bg3); }
  .nav-cat.active { background: var(--gold); color: #0d0d14; font-weight: 600; }

  .header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .admin-badge {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border);
    background: transparent; color: var(--text3); font-size: 0.82rem;
    cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .admin-badge:hover { border-color: var(--gold); color: var(--gold); }
  .admin-badge.active { background: #c9a84c22; border-color: var(--gold); color: var(--gold); }

  /* Hero */
  .hero { position: relative; overflow: hidden; padding: 72px 24px 56px; text-align: center; }
  .hero-bg {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, #c9a84c18 0%, transparent 70%),
                radial-gradient(ellipse 50% 40% at 80% 50%, #7c6af512 0%, transparent 60%);
  }
  .hero-content { position: relative; max-width: 600px; margin: 0 auto; }
  .hero-eyebrow {
    display: inline-block; padding: 4px 16px; border: 1px solid var(--gold);
    border-radius: 20px; color: var(--gold); font-size: 0.78rem; letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 20px;
  }
  .hero-title {
    font-family: 'Playfair Display', serif; font-size: clamp(2.2rem, 5vw, 3.2rem);
    line-height: 1.15; color: var(--text); margin-bottom: 16px;
  }
  .hero-title em { color: var(--gold); font-style: italic; }
  .hero-sub { color: var(--text3); font-size: 0.95rem; }

  /* Toolbar */
  .toolbar {
    max-width: 1280px; margin: 0 auto; padding: 16px 24px;
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  }
  .search-wrap {
    flex: 1; min-width: 200px; display: flex; align-items: center;
    gap: 10px; padding: 10px 16px;
    background: var(--bg3); border: 1px solid var(--border); border-radius: 12px;
    transition: border-color 0.2s;
  }
  .search-wrap:focus-within { border-color: var(--gold); }
  .search-wrap svg { color: var(--text3); flex-shrink: 0; }
  .search-input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
  }
  .search-input::placeholder { color: var(--text3); }
  .search-clear { background: none; border: none; cursor: pointer; color: var(--text3); display: flex; padding: 0; }

  .sort-select {
    padding: 10px 14px; background: var(--bg3); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem; cursor: pointer; outline: none;
  }
  .view-toggle {
    display: flex; gap: 4px; padding: 4px;
    background: var(--bg3); border: 1px solid var(--border); border-radius: 10px;
  }
  .view-toggle button {
    padding: 6px 10px; border: none; background: transparent; color: var(--text3);
    border-radius: 8px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s;
  }
  .view-toggle button.active { background: var(--gold); color: #0d0d14; }
  .btn-add {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 20px; border-radius: 12px; border: none;
    background: var(--gold); color: #0d0d14; font-weight: 600; font-size: 0.88rem;
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; white-space: nowrap;
  }
  .btn-add:hover { background: var(--gold2); transform: translateY(-1px); box-shadow: 0 4px 20px var(--gold)55; }

  /* Admin bar */
  .admin-bar {
    max-width: 1280px; margin: 0 auto 8px; padding: 10px 24px;
    background: #c9a84c15; border: 1px solid #c9a84c33;
    border-radius: 12px; display: flex; gap: 24px; align-items: center;
    font-size: 0.83rem; color: var(--gold); flex-wrap: wrap;
  }
  .btn-seed {
    margin-left: auto; padding: 6px 16px; border-radius: 8px;
    background: var(--gold); border: none; color: #0d0d14;
    font-weight: 600; font-size: 0.82rem; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  /* Main */
  .main { flex: 1; max-width: 1280px; margin: 0 auto; padding: 8px 24px 48px; width: 100%; }

  /* Grid */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  /* Card */
  .product-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden; cursor: pointer;
    transition: all 0.25s; position: relative;
    backdrop-filter: blur(12px);
  }
  .product-card:hover {
    border-color: #c9a84c44; transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px #c9a84c22;
  }
  .card-img-wrap { position: relative; overflow: hidden; height: 220px; }
  .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
  .product-card:hover .card-img { transform: scale(1.04); }
  .card-admin-overlay {
    position: absolute; top: 10px; right: 10px;
    display: flex; gap: 6px; opacity: 0; transition: opacity 0.2s;
  }
  .product-card:hover .card-admin-overlay { opacity: 1; }
  .card-body { padding: 16px; }
  .badge-cat {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.72rem; color: var(--text3); letter-spacing: 0.06em;
    text-transform: uppercase; margin-bottom: 8px;
  }
  .card-name {
    font-family: 'Playfair Display', serif; font-size: 1.05rem;
    color: var(--text); margin-bottom: 8px; line-height: 1.3;
  }
  .card-desc { font-size: 0.82rem; color: var(--text3); line-height: 1.55; margin-bottom: 14px; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; }
  .card-price { font-size: 1rem; font-weight: 600; color: var(--gold); }

  /* Badge */
  .badge {
    position: absolute; top: 12px; left: 12px;
    padding: 3px 10px; border-radius: 6px; font-size: 0.7rem;
    font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    pointer-events: none;
  }
  .badge-best-seller { background: var(--gold); color: #0d0d14; }
  .badge-new { background: var(--accent); color: white; }
  .badge-sale { background: var(--red); color: white; }
  .badge-eco { background: var(--green); color: white; }

  .stock-pill {
    padding: 3px 10px; border-radius: 6px; font-size: 0.73rem; font-weight: 500;
    background: #4caf8222; color: var(--green); border: 1px solid #4caf8233;
  }
  .stock-pill.low { background: #e05a5a22; color: var(--red); border-color: #e05a5a33; }
  .stock-pill.lg { padding: 6px 14px; font-size: 0.82rem; }

  /* Act buttons */
  .act-btn {
    width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(10px); transition: all 0.2s;
  }
  .act-btn.edit { background: rgba(124,106,245,0.85); color: white; }
  .act-btn.edit:hover { background: var(--accent); }
  .act-btn.del { background: rgba(224,90,90,0.85); color: white; }
  .act-btn.del:hover { background: var(--red); }

  /* List */
  .products-list { display: flex; flex-direction: column; gap: 12px; }
  .product-list-item {
    display: flex; gap: 16px; align-items: center;
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px; cursor: pointer;
    transition: all 0.2s; backdrop-filter: blur(12px);
  }
  .product-list-item:hover { border-color: #c9a84c44; background: var(--bg3); }
  .pli-img { width: 90px; height: 70px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
  .pli-img img { width: 100%; height: 100%; object-fit: cover; }
  .pli-body { flex: 1; min-width: 0; }
  .pli-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
  .pli-meta .badge { position: static; }
  .pli-name { font-family: 'Playfair Display', serif; font-size: 0.98rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pli-desc { font-size: 0.8rem; color: var(--text3); }
  .pli-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
  .pli-price { font-weight: 600; color: var(--gold); font-size: 0.95rem; }
  .admin-actions { display: flex; gap: 6px; }

  /* Loading */
  .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
  .skeleton {
    height: 340px; border-radius: var(--radius);
    background: linear-gradient(90deg, var(--bg3) 25%, var(--bg2) 50%, var(--bg3) 75%);
    background-size: 200% 100%; animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* Empty */
  .empty-state { text-align: center; padding: 80px 24px; }
  .empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .empty-state h3 { font-family: 'Playfair Display', serif; font-size: 1.4rem; margin-bottom: 8px; }
  .empty-state p { color: var(--text3); }

  /* Footer */
  .footer { text-align: center; padding: 24px; border-top: 1px solid var(--border); color: var(--text3); font-size: 0.82rem; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .modal-box {
    background: var(--bg2); border: 1px solid var(--border); border-radius: 20px;
    width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto;
    position: relative; box-shadow: var(--shadow);
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .modal-close {
    position: sticky; float: right; top: 16px; right: 16px; margin: 16px 16px 0 0;
    width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border);
    background: var(--bg3); color: var(--text3); cursor: pointer; display: flex;
    align-items: center; justify-content: center; transition: all 0.2s; z-index: 5;
  }
  .modal-close:hover { border-color: var(--red); color: var(--red); }

  /* Detail */
  .detail { display: grid; grid-template-columns: 1fr 1fr; }
  @media (max-width: 640px) { .detail { grid-template-columns: 1fr; } }
  .detail-img-wrap { height: 100%; min-height: 260px; overflow: hidden; border-radius: 20px 0 0 20px; }
  .detail-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .detail-body { padding: 32px; }
  .detail-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
  .detail-meta .badge { position: static; }
  .detail-name { font-family: 'Playfair Display', serif; font-size: 1.6rem; line-height: 1.25; margin-bottom: 10px; }
  .detail-price { font-size: 1.4rem; font-weight: 700; color: var(--gold); margin-bottom: 16px; }
  .detail-desc { font-size: 0.9rem; color: var(--text2); line-height: 1.7; margin-bottom: 24px; }
  .detail-footer { display: flex; flex-direction: column; gap: 12px; }
  .btn-order {
    padding: 13px 24px; border-radius: 12px; border: none;
    background: var(--gold); color: #0d0d14; font-weight: 700; font-size: 0.95rem;
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s;
  }
  .btn-order:hover { background: var(--gold2); transform: translateY(-2px); }

  /* Form */
  .pform { padding: 32px; }
  .pform-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; margin-bottom: 24px; }
  .pform-img-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 20px; padding: 16px; background: var(--bg3); border-radius: 12px; }
  .pform-preview { width: 80px; height: 60px; object-fit: cover; border-radius: 8px; }
  .pform-upload-btn {
    display: flex; align-items: center; gap: 6px; padding: 8px 14px;
    border: 1px dashed var(--border); border-radius: 8px; cursor: pointer;
    color: var(--text2); font-size: 0.83rem; transition: all 0.2s;
  }
  .pform-upload-btn:hover { border-color: var(--gold); color: var(--gold); }
  .pform-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; margin-bottom: 16px; }
  .pform-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .pform-group label { font-size: 0.8rem; color: var(--text3); font-weight: 500; }
  .pform-input {
    padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px;
    background: var(--bg3); color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem; outline: none; transition: border-color 0.2s; width: 100%;
  }
  .pform-input:focus { border-color: var(--gold); }
  .input-err { border-color: var(--red) !important; animation: shake 0.3s; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  .pform-textarea { resize: vertical; }
  .pform-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  .btn-cancel {
    padding: 10px 20px; border-radius: 10px; border: 1px solid var(--border);
    background: transparent; color: var(--text2); cursor: pointer; font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem; transition: all 0.2s;
  }
  .btn-cancel:hover { background: var(--bg3); }
  .btn-save {
    padding: 10px 24px; border-radius: 10px; border: none;
    background: var(--gold); color: #0d0d14; font-weight: 700; font-size: 0.88rem;
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s;
  }
  .btn-save:hover:not(:disabled) { background: var(--gold2); }
  .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-delete {
    padding: 10px 24px; border-radius: 10px; border: none;
    background: var(--red); color: white; font-weight: 700; font-size: 0.88rem;
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s;
  }
  .btn-delete:hover:not(:disabled) { background: #e87070; }
  .btn-delete:disabled { opacity: 0.55; cursor: not-allowed; }

  /* Confirm */
  .confirm-box { padding: 36px; text-align: center; }
  .confirm-box h3 { font-family: 'Playfair Display', serif; font-size: 1.3rem; margin-bottom: 12px; }
  .confirm-box p { color: var(--text2); margin-bottom: 24px; line-height: 1.6; }

  /* Admin login */
  .admin-login { padding: 40px 36px; text-align: center; }
  .admin-login-icon { width: 52px; height: 52px; border-radius: 14px; background: #c9a84c22; border: 1px solid var(--gold); color: var(--gold); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  .admin-login h3 { font-family: 'Playfair Display', serif; font-size: 1.4rem; margin-bottom: 8px; }
  .admin-login p { color: var(--text3); margin-bottom: 20px; font-size: 0.88rem; }
  .err-msg { color: var(--red); font-size: 0.8rem; margin-top: 6px; }

  @media (max-width: 768px) {
    .header-inner { gap: 12px; }
    .nav-cats { display: none; }
    .hero { padding: 48px 16px 36px; }
    .toolbar { padding: 12px 16px; }
    .main { padding: 8px 16px 40px; }
    .products-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  }
`;
