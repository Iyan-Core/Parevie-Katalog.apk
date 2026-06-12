import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, updateDoc,
  deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── Firebase Config ───────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const storage = getStorage(app);

// ─── SVG Placeholder ───────────────────────────────────────────────────────
const IMG_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#1a1a28"/>
    <rect x="150" y="140" width="100" height="80" rx="10" fill="none" stroke="#c9a84c" stroke-width="3"/>
    <circle cx="170" cy="162" r="10" fill="#c9a84c"/>
    <polyline points="150,220 180,185 205,200 230,170 250,220" fill="none" stroke="#c9a84c" stroke-width="3"/>
    <text x="200" y="265" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#c9a84c" opacity="0.7">Foto Produk</text>
  </svg>`
)}`;

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatRp = (n) =>
  new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n ?? 0);

// Ambil URL gambar pertama dari field `images` (array) atau string kosong
const getFirstImage = (p) => {
  if (Array.isArray(p.images) && p.images.length > 0) {
    // cari elemen yang berupa URL http
    const url = p.images.find(i => typeof i === "string" && i.startsWith("http"));
    if (url) return url;
  }
  if (typeof p.images === "string" && p.images.startsWith("http")) return p.images;
  if (typeof p.image  === "string" && p.image.startsWith("http"))  return p.image;
  return "";
};

// Render bintang rating
const Stars = ({ val = 0 }) => {
  const full = Math.floor(val), half = val % 1 >= 0.5;
  return (
    <span className="stars">
      {[...Array(5)].map((_, i) => (
        <span key={i} style={{ color: i < full || (i === full && half) ? "#c9a84c" : "#333" }}>
          {i < full ? "★" : i === full && half ? "½" : "☆"}
        </span>
      ))}
      <span className="rating-num">{val ? val.toFixed(1) : ""}</span>
    </span>
  );
};

// ─── Icons ─────────────────────────────────────────────────────────────────
const Ic = {
  Plus:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Close:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Admin:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Tag:    () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};

// ─── Modal ─────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}><Ic.Close /></button>
        {children}
      </div>
    </div>
  );
}

// ─── Product Card (2-kolom grid) ───────────────────────────────────────────
function ProductCard({ p, onSelect, isAdmin, onEdit, onDelete }) {
  const img = getFirstImage(p);
  const isBestSeller = p.bestSeller === true;
  const isNew  = p.isNew  === true;
  const isSale = p.isSale === true || p.onSale === true;
  const badge  = isBestSeller ? "Best Seller" : isNew ? "New" : isSale ? "Sale" : (p.badge || "");

  return (
    <div className="card" onClick={() => onSelect(p)}>
      <div className="card-img-wrap">
        <img
          src={img || IMG_PLACEHOLDER}
          alt={p.name}
          className="card-img"
          onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }}
        />
        {badge && <span className={`badge bdg-${badge.toLowerCase().replace(/\s/g,"-")}`}>{badge}</span>}
        {!p.isActive && p.isActive !== undefined &&
          <span className="badge-inactive">Nonaktif</span>}
        {isAdmin && (
          <div className="card-admin-btns" onClick={(e) => e.stopPropagation()}>
            <button className="ab edit" onClick={() => onEdit(p)}><Ic.Edit /></button>
            <button className="ab del"  onClick={() => onDelete(p)}><Ic.Trash /></button>
          </div>
        )}
      </div>
      <div className="card-body">
        <p className="card-cat"><Ic.Tag /> {p.category || p.gender || "—"}</p>
        <h3 className="card-name">{p.name}</h3>
        {p.rating > 0 && <Stars val={p.rating} />}
        <div className="card-footer">
          <span className="card-price">{formatRp(p.price)}</span>
          <span className={`stock-pill${(p.stock ?? p.size ?? 0) < 10 ? " low" : ""}`}>
            {(p.stock ?? p.size ?? 0)} stok
          </span>
        </div>
        {p.sold > 0 && <p className="card-sold">{p.sold} terjual</p>}
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────
function ProductDetail({ p }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = Array.isArray(p.images)
    ? p.images.filter(i => typeof i === "string" && i.startsWith("http"))
    : (p.image ? [p.image] : []);
  const thumb = imgs[imgIdx] || IMG_PLACEHOLDER;

  return (
    <div className="detail">
      {/* Gambar + thumbnail row */}
      <div className="detail-imgs">
        <img
          src={thumb}
          alt={p.name}
          className="detail-main-img"
          onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }}
        />
        {imgs.length > 1 && (
          <div className="thumb-row">
            {imgs.map((u, i) => (
              <img key={i} src={u} alt="" className={`thumb${i === imgIdx ? " active" : ""}`}
                onClick={() => setImgIdx(i)}
                onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }} />
            ))}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="detail-body">
        <p className="card-cat"><Ic.Tag /> {p.category || p.gender || "—"}</p>
        <h2 className="detail-name">{p.name}</h2>
        <Stars val={p.rating ?? 0} />
        <p className="detail-price">{formatRp(p.price)}</p>
        {p.aroma && <p className="detail-attr"><strong>Aroma:</strong> {p.aroma}</p>}
        <p className="detail-desc">{p.desc || p.description || "—"}</p>
        <div className="detail-pills">
          <span className={`stock-pill${(p.stock ?? p.size ?? 0) < 10 ? " low" : ""}`}>
            {(p.stock ?? p.size ?? 0)} stok
          </span>
          {p.sold > 0 && <span className="sold-pill">{p.sold} terjual</span>}
          {p.bestSeller && <span className="badge bdg-best-seller">Best Seller</span>}
        </div>
        <button className="btn-order">Pesan Sekarang</button>
      </div>
    </div>
  );
}

// ─── Admin Login ───────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pass, setPass] = useState(""), [err, setErr] = useState(false);
  const PASS = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";
  const go = () => { if (pass === PASS) onLogin(); else { setErr(true); setTimeout(() => setErr(false), 1500); } };
  return (
    <div className="admin-login">
      <div className="al-icon"><Ic.Admin /></div>
      <h3>Panel Admin</h3>
      <p>Masukkan password admin</p>
      <input type="password" className={`finput${err ? " err" : ""}`}
        placeholder="Password…" value={pass}
        onChange={e => setPass(e.target.value)}
        onKeyDown={e => e.key === "Enter" && go()} />
      {err && <p className="errmsg">Password salah!</p>}
      <button className="btn-save" style={{width:"100%",marginTop:10}} onClick={go}>Masuk</button>
    </div>
  );
}

// ─── Product Form ──────────────────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel, saving }) {
  const blank = { name:"", category:"", gender:"", price:"", stock:"", desc:"", images:[], badge:"", bestSeller:false, isActive:true, rating:0, sold:0 };
  const [f, setF] = useState(initial ? { ...blank, ...initial } : blank);
  const [imgUrl, setImgUrl] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(getFirstImage(initial || {}));
  const [uploading, setUploading] = useState(false);

  const ch = (k, v) => setF(x => ({ ...x, [k]: v }));

  const pickFile = (e) => {
    const fl = e.target.files[0]; if (!fl) return;
    setFile(fl); setPreview(URL.createObjectURL(fl));
  };

  const addImgUrl = () => {
    if (!imgUrl.startsWith("http")) return;
    ch("images", [...(Array.isArray(f.images) ? f.images : []), imgUrl]);
    setPreview(imgUrl); setImgUrl("");
  };

  const submit = async () => {
    if (!f.name || !f.price) return alert("Nama & harga wajib diisi!");
    let images = Array.isArray(f.images) ? [...f.images] : [];
    if (file) {
      setUploading(true);
      try {
        const r = ref(storage, `products/${Date.now()}_${file.name}`);
        await uploadBytes(r, file);
        const url = await getDownloadURL(r);
        images = [url, ...images.filter(i => i !== url)];
      } catch { alert("Upload gagal. Cek Firebase Storage rules."); setUploading(false); return; }
      setUploading(false);
    }
    onSave({ ...f, price: Number(f.price), stock: Number(f.stock), rating: Number(f.rating), sold: Number(f.sold), images });
  };

  return (
    <div className="pform">
      <h2 className="pform-title">{initial?.id ? "Edit Produk" : "Tambah Produk"}</h2>

      {/* Preview gambar */}
      <div className="pform-img-section">
        <img src={preview || IMG_PLACEHOLDER} alt="preview" className="pform-preview"
          onError={e => { e.target.onerror=null; e.target.src=IMG_PLACEHOLDER; }} />
        <div className="pform-img-controls">
          <label className="btn-upload"><Ic.Upload /> Upload File
            <input type="file" accept="image/*" hidden onChange={pickFile} />
          </label>
          <div className="url-row">
            <input className="finput" placeholder="atau paste URL gambar…"
              value={imgUrl} onChange={e => setImgUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addImgUrl()} />
            <button className="btn-add-url" onClick={addImgUrl}>+</button>
          </div>
          {Array.isArray(f.images) && f.images.length > 0 && (
            <div className="thumb-row">
              {f.images.filter(i=>i.startsWith("http")).map((u,i) => (
                <div key={i} className="thumb-wrap">
                  <img src={u} className="thumb" onClick={() => setPreview(u)}
                    onError={e=>{e.target.onerror=null;e.target.src=IMG_PLACEHOLDER;}} />
                  <button className="thumb-del" onClick={() => ch("images", f.images.filter((_,j)=>j!==i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pform-grid">
        <div className="fg"><label>Nama Produk *</label>
          <input className="finput" value={f.name} onChange={e=>ch("name",e.target.value)} /></div>
        <div className="fg"><label>Kategori</label>
          <input className="finput" value={f.category} onChange={e=>ch("category",e.target.value)} /></div>
        <div className="fg"><label>Gender</label>
          <select className="finput" value={f.gender} onChange={e=>ch("gender",e.target.value)}>
            <option value="">—</option><option>man</option><option>woman</option><option>unisex</option>
          </select></div>
        <div className="fg"><label>Harga (Rp) *</label>
          <input type="number" className="finput" value={f.price} onChange={e=>ch("price",e.target.value)} /></div>
        <div className="fg"><label>Stok</label>
          <input type="number" className="finput" value={f.stock} onChange={e=>ch("stock",e.target.value)} /></div>
        <div className="fg"><label>Rating (0-5)</label>
          <input type="number" step="0.1" min="0" max="5" className="finput" value={f.rating} onChange={e=>ch("rating",e.target.value)} /></div>
        <div className="fg"><label>Terjual</label>
          <input type="number" className="finput" value={f.sold} onChange={e=>ch("sold",e.target.value)} /></div>
        <div className="fg"><label>Aroma</label>
          <input className="finput" value={f.aroma||""} onChange={e=>ch("aroma",e.target.value)} /></div>
      </div>

      <div className="fg" style={{marginBottom:14}}>
        <label>Deskripsi (desc)</label>
        <textarea className="finput ftarea" rows={4} value={f.desc||""} onChange={e=>ch("desc",e.target.value)} />
      </div>

      <div className="pform-checks">
        <label className="check-label">
          <input type="checkbox" checked={!!f.bestSeller} onChange={e=>ch("bestSeller",e.target.checked)} />
          Best Seller
        </label>
        <label className="check-label">
          <input type="checkbox" checked={!!f.isActive} onChange={e=>ch("isActive",e.target.checked)} />
          Aktif / Tampil
        </label>
      </div>

      <div className="pform-actions">
        <button className="btn-cancel" onClick={onCancel}>Batal</button>
        <button className="btn-save" onClick={submit} disabled={saving||uploading}>
          {uploading?"Mengupload…":saving?"Menyimpan…":"Simpan"}
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Delete ────────────────────────────────────────────────────────
function ConfirmDelete({ p, onConfirm, onCancel, saving }) {
  return (
    <div className="confirm-box">
      <h3>Hapus Produk?</h3>
      <p>Yakin hapus <strong>{p.name}</strong>? Tidak bisa dibatalkan.</p>
      <div className="pform-actions">
        <button className="btn-cancel" onClick={onCancel}>Batal</button>
        <button className="btn-del-confirm" onClick={onConfirm} disabled={saving}>
          {saving?"Menghapus…":"Ya, Hapus"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("All");
  const [sortBy,      setSortBy]      = useState("newest");
  const [selected,    setSelected]    = useState(null);
  const [editP,       setEditP]       = useState(null);
  const [deleteP,     setDeleteP]     = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Realtime listener
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  // Kumpulkan kategori unik dari data
  const allCats = ["All", ...new Set(
    products.flatMap(p => [p.category, p.gender].filter(Boolean))
  )];

  // Filter + sort
  let list = products.filter(p => {
    // sembunyikan produk nonaktif untuk non-admin
    if (!isAdmin && p.isActive === false) return false;
    const matchCat = catFilter === "All" ||
      p.category === catFilter || p.gender === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (p.name||"").toLowerCase().includes(q) ||
      (p.desc||"").toLowerCase().includes(q) ||
      (p.category||"").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (sortBy === "price-asc")  list = [...list].sort((a,b) => (a.price||0)-(b.price||0));
  if (sortBy === "price-desc") list = [...list].sort((a,b) => (b.price||0)-(a.price||0));
  if (sortBy === "name")       list = [...list].sort((a,b) => (a.name||"").localeCompare(b.name||""));
  if (sortBy === "rating")     list = [...list].sort((a,b) => (b.rating||0)-(a.rating||0));
  if (sortBy === "sold")       list = [...list].sort((a,b) => (b.sold||0)-(a.sold||0));

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editP?.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db,"products",editP.id), { ...rest, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db,"products"), { ...data, createdAt: serverTimestamp() });
      }
      setShowForm(false); setEditP(null);
    } catch(e) { alert("Gagal: "+e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await deleteDoc(doc(db,"products",deleteP.id)); }
    catch(e) { alert("Gagal: "+e.message); }
    setDeleteP(null); setSaving(false);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* ── Header ── */}
        <header className="header">
          <div className="hinner">
            <div className="logo">
              <span className="logo-dot"/>
              <span className="logo-text">Katalog<em>Pro</em></span>
            </div>
            <div className="hright">
              {isAdmin
                ? <button className="admin-btn active" onClick={()=>setIsAdmin(false)}>Admin ✓</button>
                : <button className="admin-btn" onClick={()=>setShowLogin(true)}><Ic.Admin/> Admin</button>}
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-glow"/>
          <p className="hero-eye">Koleksi Premium</p>
          <h1 className="hero-title">Temukan Produk<br/><em>Terbaik Kami</em></h1>
          <p className="hero-sub">{list.length} produk tersedia</p>
        </section>

        {/* ── Category tabs ── */}
        <div className="cat-scroll">
          {allCats.map(c => (
            <button key={c} className={`cat-btn${catFilter===c?" active":""}`}
              onClick={()=>setCatFilter(c)}>{c}</button>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="search-box">
            <Ic.Search/>
            <input className="search-inp" placeholder="Cari produk…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button className="search-clr" onClick={()=>setSearch("")}><Ic.Close/></button>}
          </div>
          <select className="sort-sel" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="newest">Terbaru</option>
            <option value="price-asc">Harga ↑</option>
            <option value="price-desc">Harga ↓</option>
            <option value="rating">Rating</option>
            <option value="sold">Terlaris</option>
            <option value="name">A–Z</option>
          </select>
          {isAdmin && (
            <button className="btn-add" onClick={()=>{setEditP(null);setShowForm(true);}}>
              <Ic.Plus/> Tambah
            </button>
          )}
        </div>

        {/* ── Admin bar ── */}
        {isAdmin && (
          <div className="admin-bar">
            <span>🛠 Admin Aktif</span>
            <span>{products.length} produk</span>
            <span>{products.filter(p=>!p.isActive).length} nonaktif</span>
            <span>{products.filter(p=>(p.stock??p.size??0)<10).length} stok menipis</span>
          </div>
        )}

        {/* ── Products 2-column grid ── */}
        <main className="main">
          {loading ? (
            <div className="grid2">
              {[...Array(6)].map((_,i) => <div key={i} className="skeleton"/>)}
            </div>
          ) : list.length === 0 ? (
            <div className="empty">
              <p style={{fontSize:"2.5rem"}}>📦</p>
              <h3>Tidak ada produk</h3>
              <p>{products.length===0 ? "Belum ada produk di database." : "Coba ubah filter atau kata kunci."}</p>
            </div>
          ) : (
            <div className="grid2">
              {list.map(p => (
                <ProductCard key={p.id} p={p} onSelect={setSelected} isAdmin={isAdmin}
                  onEdit={p=>{setEditP(p);setShowForm(true);}}
                  onDelete={setDeleteP} />
              ))}
            </div>
          )}
        </main>

        <footer className="footer">© 2025 KatalogPro — Firebase + React</footer>

        {/* ── Modals ── */}
        <Modal open={!!selected}   onClose={()=>setSelected(null)}>
          {selected && <ProductDetail p={selected}/>}
        </Modal>
        <Modal open={showForm}     onClose={()=>{setShowForm(false);setEditP(null);}}>
          <ProductForm initial={editP} onSave={handleSave} saving={saving}
            onCancel={()=>{setShowForm(false);setEditP(null);}}/>
        </Modal>
        <Modal open={!!deleteP}    onClose={()=>setDeleteP(null)}>
          {deleteP && <ConfirmDelete p={deleteP} onConfirm={handleDelete}
            onCancel={()=>setDeleteP(null)} saving={saving}/>}
        </Modal>
        <Modal open={showLogin}    onClose={()=>setShowLogin(false)}>
          <AdminLogin onLogin={()=>{setIsAdmin(true);setShowLogin(false);}}/>
        </Modal>
      </div>
    </>
  );
}

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d0d14;--bg2:#12121c;--bg3:#1a1a28;
  --card:#16162280;--border:#ffffff12;
  --gold:#c9a84c;--gold2:#f0d080;
  --accent:#7c6af5;--red:#e05a5a;--green:#4caf82;
  --text:#f0ede8;--text2:#b8b4c0;--text3:#6e6a7a;
  --r:12px;--shadow:0 8px 32px rgba(0,0,0,.5);
}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh}
.app{display:flex;flex-direction:column;min-height:100vh}

/* Header */
.header{position:sticky;top:0;z-index:100;background:rgba(13,13,20,.88);backdrop-filter:blur(18px);border-bottom:1px solid var(--border)}
.hinner{max-width:900px;margin:0 auto;padding:0 16px;height:56px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:8px}
.logo-dot{width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold)}
.logo-text{font-family:'Playfair Display',serif;font-size:1.15rem}
.logo-text em{color:var(--gold);font-style:italic}
.admin-btn{display:flex;align-items:center;gap:5px;padding:5px 13px;border-radius:18px;border:1px solid var(--border);background:transparent;color:var(--text3);font-size:.8rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.admin-btn:hover{border-color:var(--gold);color:var(--gold)}
.admin-btn.active{background:#c9a84c22;border-color:var(--gold);color:var(--gold)}

/* Hero */
.hero{position:relative;overflow:hidden;padding:52px 16px 36px;text-align:center}
.hero-glow{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,#c9a84c18 0%,transparent 70%)}
.hero-eye{display:inline-block;padding:3px 14px;border:1px solid var(--gold);border-radius:18px;color:var(--gold);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px}
.hero-title{font-family:'Playfair Display',serif;font-size:clamp(1.9rem,5vw,2.8rem);line-height:1.2;margin-bottom:10px}
.hero-title em{color:var(--gold);font-style:italic}
.hero-sub{color:var(--text3);font-size:.88rem}

/* Category scroll */
.cat-scroll{display:flex;gap:6px;padding:10px 16px;overflow-x:auto;scrollbar-width:none;max-width:900px;margin:0 auto;width:100%}
.cat-scroll::-webkit-scrollbar{display:none}
.cat-btn{padding:5px 14px;border-radius:16px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:500;color:var(--text3);background:var(--bg3);white-space:nowrap;transition:all .2s;flex-shrink:0}
.cat-btn:hover{color:var(--text2)}
.cat-btn.active{background:var(--gold);color:#0d0d14;font-weight:600}

/* Toolbar */
.toolbar{max-width:900px;margin:0 auto;padding:10px 16px;display:flex;gap:8px;align-items:center}
.search-box{flex:1;display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;transition:border-color .2s}
.search-box:focus-within{border-color:var(--gold)}
.search-box svg{color:var(--text3);flex-shrink:0}
.search-inp{flex:1;background:none;border:none;outline:none;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.87rem}
.search-inp::placeholder{color:var(--text3)}
.search-clr{background:none;border:none;cursor:pointer;color:var(--text3);display:flex;padding:0}
.sort-sel{padding:9px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.82rem;cursor:pointer;outline:none;flex-shrink:0}
.btn-add{display:flex;align-items:center;gap:5px;padding:9px 16px;border-radius:10px;border:none;background:var(--gold);color:#0d0d14;font-weight:600;font-size:.83rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;white-space:nowrap;flex-shrink:0}
.btn-add:hover{background:var(--gold2)}

/* Admin bar */
.admin-bar{max-width:900px;margin:0 auto 4px;padding:8px 16px;background:#c9a84c14;border:1px solid #c9a84c2a;border-radius:10px;display:flex;gap:18px;flex-wrap:wrap;font-size:.78rem;color:var(--gold)}

/* Main */
.main{flex:1;max-width:900px;margin:0 auto;padding:8px 12px 48px;width:100%}

/* 2-column grid */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Card */
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;cursor:pointer;transition:all .22s;position:relative;backdrop-filter:blur(10px)}
.card:hover{border-color:#c9a84c44;transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.45)}
.card-img-wrap{position:relative;overflow:hidden;aspect-ratio:1/1}
.card-img{width:100%;height:100%;object-fit:cover;transition:transform .35s}
.card:hover .card-img{transform:scale(1.05)}
.card-admin-btns{position:absolute;top:6px;right:6px;display:flex;gap:4px;opacity:0;transition:opacity .2s}
.card:hover .card-admin-btns{opacity:1}
.ab{width:28px;height:28px;border-radius:7px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.ab.edit{background:rgba(124,106,245,.88);color:#fff}
.ab.del{background:rgba(224,90,90,.88);color:#fff}
.badge{position:absolute;top:7px;left:7px;padding:2px 8px;border-radius:5px;font-size:.65rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.bdg-best-seller{background:var(--gold);color:#0d0d14}
.bdg-new{background:var(--accent);color:#fff}
.bdg-sale{background:var(--red);color:#fff}
.bdg-eco{background:var(--green);color:#fff}
.badge-inactive{position:absolute;bottom:7px;left:7px;padding:2px 8px;border-radius:5px;font-size:.62rem;font-weight:700;background:rgba(0,0,0,.65);color:var(--text3);border:1px solid var(--border)}
.card-body{padding:10px}
.card-cat{display:flex;align-items:center;gap:4px;font-size:.68rem;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.card-name{font-family:'Playfair Display',serif;font-size:.92rem;line-height:1.3;margin-bottom:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.stars{display:flex;align-items:center;gap:1px;font-size:.78rem;margin-bottom:5px}
.rating-num{font-size:.7rem;color:var(--text3);margin-left:3px}
.card-footer{display:flex;align-items:center;justify-content:space-between;gap:4px;flex-wrap:wrap}
.card-price{font-size:.88rem;font-weight:600;color:var(--gold)}
.stock-pill{padding:2px 7px;border-radius:5px;font-size:.65rem;font-weight:500;background:#4caf8222;color:var(--green);border:1px solid #4caf8233;white-space:nowrap}
.stock-pill.low{background:#e05a5a22;color:var(--red);border-color:#e05a5a33}
.card-sold{font-size:.67rem;color:var(--text3);margin-top:4px}

/* Skeleton */
.skeleton{border-radius:var(--r);aspect-ratio:3/4;background:linear-gradient(90deg,var(--bg3) 25%,var(--bg2) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
@keyframes shimmer{to{background-position:-200% 0}}

/* Empty */
.empty{text-align:center;padding:60px 16px}
.empty h3{font-family:'Playfair Display',serif;font-size:1.3rem;margin:10px 0 6px}
.empty p{color:var(--text3);font-size:.87rem}

/* Footer */
.footer{text-align:center;padding:20px;border-top:1px solid var(--border);color:var(--text3);font-size:.78rem}

/* Modal */
.overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}
.modal-box{background:var(--bg2);border:1px solid var(--border);border-radius:18px;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;position:relative;box-shadow:var(--shadow);scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.modal-close{position:sticky;float:right;top:12px;right:12px;margin:12px 12px 0 0;width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;transition:all .2s}
.modal-close:hover{border-color:var(--red);color:var(--red)}

/* Detail */
.detail{display:flex;flex-direction:column}
.detail-imgs{position:relative;background:#000}
.detail-main-img{width:100%;max-height:300px;object-fit:cover;display:block}
.thumb-row{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;scrollbar-width:none;background:var(--bg3)}
.thumb-row::-webkit-scrollbar{display:none}
.thumb{width:52px;height:52px;object-fit:cover;border-radius:7px;cursor:pointer;border:2px solid transparent;flex-shrink:0;transition:border-color .2s}
.thumb.active,.thumb:hover{border-color:var(--gold)}
.thumb-wrap{position:relative}
.thumb-del{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.detail-body{padding:20px}
.detail-name{font-family:'Playfair Display',serif;font-size:1.4rem;line-height:1.25;margin:8px 0 6px}
.detail-price{font-size:1.25rem;font-weight:700;color:var(--gold);margin:6px 0 10px}
.detail-attr{font-size:.83rem;color:var(--text2);margin-bottom:8px}
.detail-desc{font-size:.85rem;color:var(--text2);line-height:1.7;margin-bottom:14px}
.detail-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.sold-pill{padding:2px 9px;border-radius:5px;font-size:.68rem;font-weight:500;background:#7c6af522;color:var(--accent);border:1px solid #7c6af533}
.btn-order{width:100%;padding:12px;border-radius:10px;border:none;background:var(--gold);color:#0d0d14;font-weight:700;font-size:.92rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.btn-order:hover{background:var(--gold2)}

/* Form */
.pform{padding:20px}
.pform-title{font-family:'Playfair Display',serif;font-size:1.3rem;margin-bottom:16px}
.pform-img-section{display:flex;gap:12px;margin-bottom:16px;padding:12px;background:var(--bg3);border-radius:10px;flex-wrap:wrap}
.pform-preview{width:90px;height:90px;object-fit:cover;border-radius:8px;flex-shrink:0}
.pform-img-controls{flex:1;min-width:180px;display:flex;flex-direction:column;gap:7px}
.btn-upload{display:flex;align-items:center;gap:5px;padding:7px 12px;border:1px dashed var(--border);border-radius:7px;cursor:pointer;color:var(--text2);font-size:.78rem;width:fit-content;transition:all .2s}
.btn-upload:hover{border-color:var(--gold);color:var(--gold)}
.url-row{display:flex;gap:6px}
.btn-add-url{padding:7px 12px;border-radius:7px;border:1px solid var(--border);background:var(--bg3);color:var(--gold);cursor:pointer;font-size:1rem;transition:all .2s}
.btn-add-url:hover{background:var(--gold);color:#0d0d14}
.pform-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.fg{display:flex;flex-direction:column;gap:5px}
.fg label{font-size:.76rem;color:var(--text3);font-weight:500}
.finput{padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:'DM Sans',sans-serif;font-size:.85rem;outline:none;transition:border-color .2s;width:100%}
.finput:focus{border-color:var(--gold)}
.finput.err{border-color:var(--red);animation:shake .3s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.ftarea{resize:vertical}
.pform-checks{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}
.check-label{display:flex;align-items:center;gap:6px;font-size:.83rem;color:var(--text2);cursor:pointer}
.pform-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}
.btn-cancel{padding:9px 18px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.85rem;transition:all .2s}
.btn-cancel:hover{background:var(--bg3)}
.btn-save{padding:9px 22px;border-radius:8px;border:none;background:var(--gold);color:#0d0d14;font-weight:700;font-size:.85rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.btn-save:hover:not(:disabled){background:var(--gold2)}
.btn-save:disabled,.btn-del-confirm:disabled{opacity:.55;cursor:not-allowed}
.btn-del-confirm{padding:9px 22px;border-radius:8px;border:none;background:var(--red);color:#fff;font-weight:700;font-size:.85rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}

/* Admin login */
.admin-login{padding:36px 28px;text-align:center}
.al-icon{width:48px;height:48px;border-radius:12px;background:#c9a84c20;border:1px solid var(--gold);color:var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.admin-login h3{font-family:'Playfair Display',serif;font-size:1.3rem;margin-bottom:6px}
.admin-login p{color:var(--text3);margin-bottom:14px;font-size:.85rem}
.errmsg{color:var(--red);font-size:.78rem;margin-top:5px}

/* Confirm */
.confirm-box{padding:32px 24px;text-align:center}
.confirm-box h3{font-family:'Playfair Display',serif;font-size:1.2rem;margin-bottom:10px}
.confirm-box p{color:var(--text2);margin-bottom:20px;font-size:.87rem;line-height:1.6}

@media(max-width:480px){
  .grid2{gap:8px}
  .card-name{font-size:.85rem}
  .card-price{font-size:.82rem}
  .pform-grid{grid-template-columns:1fr}
}
`;
