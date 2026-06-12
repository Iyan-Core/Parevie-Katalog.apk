import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, updateDoc,
  deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── Firebase Config ───────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app);

// ─── SVG Placeholder (offline-safe) ───────────────────────────────────────
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

const getFirstImage = (p) => {
  if (Array.isArray(p.images)) {
    const url = p.images.find(i => typeof i === "string" && i.startsWith("http"));
    if (url) return url;
  }
  if (typeof p.images === "string" && p.images.startsWith("http")) return p.images;
  if (typeof p.image  === "string" && p.image.startsWith("http"))  return p.image;
  return "";
};

const Stars = ({ val = 0 }) => {
  const full = Math.floor(val), half = val % 1 >= 0.5;
  return (
    <span className="stars">
      {[...Array(5)].map((_, i) => (
        <span key={i} style={{ color: i < full || (i === full && half) ? "#c9a84c" : "var(--star-off)" }}>
          {i < full ? "★" : i === full && half ? "⯨" : "☆"}
        </span>
      ))}
      <span className="rating-num">{val ? val.toFixed(1) : ""}</span>
    </span>
  );
};

// ─── Icons ─────────────────────────────────────────────────────────────────
const Ic = {
  Plus:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Close:  () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Admin:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Upload: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Tag:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Sun:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

// ─── Modal — slide-up dari bawah, full-width, tidak terpotong ──────────────
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
        {/* Drag handle */}
        <div className="modal-handle"/>
        <button className="modal-close" onClick={onClose}><Ic.Close /></button>
        {children}
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────
function ProductCard({ p, onSelect, isAdmin, onEdit, onDelete }) {
  const img        = getFirstImage(p);
  const badge      = p.bestSeller ? "Best Seller" : p.isNew ? "New" : (p.isSale || p.onSale) ? "Sale" : (p.badge || "");

  return (
    <div className="card" onClick={() => onSelect(p)}>
      <div className="card-img-wrap">
        <img src={img || IMG_PLACEHOLDER} alt={p.name} className="card-img"
          onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }} />
        {badge && <span className={`bdg bdg-${badge.toLowerCase().replace(/\s/g,"-")}`}>{badge}</span>}
        {p.isActive === false && <span className="bdg-inactive">Nonaktif</span>}
        {isAdmin && (
          <div className="card-adm" onClick={(e) => e.stopPropagation()}>
            <button className="ab edit" onClick={() => onEdit(p)}><Ic.Edit /></button>
            <button className="ab del"  onClick={() => onDelete(p)}><Ic.Trash /></button>
          </div>
        )}
      </div>
      <div className="card-body">
        <p className="card-cat"><Ic.Tag /> {p.category || p.gender || "—"}</p>
        <h3 className="card-name">{p.name}</h3>
        {p.rating > 0 && <Stars val={p.rating} />}
        <div className="card-foot">
          <span className="card-price">{formatRp(p.price)}</span>
          <span className={`spill${(p.stock ?? p.size ?? 0) < 10 ? " low" : ""}`}>
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
  const [idx, setIdx] = useState(0);
  const imgs = Array.isArray(p.images)
    ? p.images.filter(i => typeof i === "string" && i.startsWith("http"))
    : (p.image ? [p.image] : []);
  const src = imgs[idx] || IMG_PLACEHOLDER;

  return (
    <div className="detail">

      {/* ── Gambar: full-width, sejajar border, tidak terpotong ── */}
      <div className="d-img-wrap">
        <img src={src} alt={p.name} className="d-img"
          onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }} />
      </div>

      {/* ── Thumbnail row jika > 1 gambar ── */}
      {imgs.length > 1 && (
        <div className="d-thumbs">
          {imgs.map((u, i) => (
            <img key={i} src={u} alt=""
              className={`d-thumb${i === idx ? " on" : ""}`}
              onClick={() => setIdx(i)}
              onError={(e) => { e.target.onerror = null; e.target.src = IMG_PLACEHOLDER; }} />
          ))}
        </div>
      )}

      {/* ── Info ── */}
      <div className="d-body">
        <p className="card-cat"><Ic.Tag /> {p.category || p.gender || "—"}</p>
        <h2 className="d-name">{p.name}</h2>
        {p.rating > 0 && <Stars val={p.rating} />}
        <p className="d-price">{formatRp(p.price)}</p>

        {/* Pills */}
        <div className="d-pills">
          <span className={`spill${(p.stock ?? p.size ?? 0) < 10 ? " low" : ""}`}>
            {(p.stock ?? p.size ?? 0)} stok
          </span>
          {p.sold > 0 && <span className="spill sold">{p.sold} terjual</span>}
          {p.bestSeller && <span className="bdg bdg-best-seller" style={{position:"static",fontSize:".7rem"}}>Best Seller</span>}
        </div>

        {/* Aroma — section terpisah dengan title */}
        {p.aroma && (
          <div className="d-section">
            <p className="d-sec-title">🌸 Aroma</p>
            <p className="d-sec-text">{p.aroma}</p>
          </div>
        )}

        {/* Deskripsi — section terpisah dengan title jelas */}
        <div className="d-section">
          <p className="d-sec-title">📋 Deskripsi</p>
          <p className="d-sec-text">{p.desc || p.description || "—"}</p>
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
  const go   = () => {
    if (pass === PASS) onLogin();
    else { setErr(true); setTimeout(() => setErr(false), 1400); }
  };
  return (
    <div className="alog">
      <div className="alog-ico"><Ic.Admin /></div>
      <h3>Panel Admin</h3>
      <p>Masukkan password untuk lanjut</p>
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
  const blank = { name:"", category:"", gender:"", price:"", stock:"", desc:"", images:[], badge:"", bestSeller:false, isActive:true, rating:0, sold:0, aroma:"" };
  const [f, setF]       = useState(initial ? { ...blank, ...initial } : blank);
  const [imgUrl, setIU] = useState("");
  const [file, setFile] = useState(null);
  const [prev, setPrev] = useState(getFirstImage(initial || {}));
  const [uping, setUping] = useState(false);

  const ch = (k, v) => setF(x => ({ ...x, [k]: v }));

  const pickFile = (e) => {
    const fl = e.target.files[0]; if (!fl) return;
    setFile(fl); setPrev(URL.createObjectURL(fl));
  };

  const addUrl = () => {
    if (!imgUrl.startsWith("http")) return;
    ch("images", [...(Array.isArray(f.images) ? f.images : []), imgUrl]);
    setPrev(imgUrl); setIU("");
  };

  const submit = async () => {
    if (!f.name || !f.price) return alert("Nama & harga wajib diisi!");
    let images = Array.isArray(f.images) ? [...f.images] : [];
    if (file) {
      setUping(true);
      try {
        const r = ref(storage, `products/${Date.now()}_${file.name}`);
        await uploadBytes(r, file);
        const url = await getDownloadURL(r);
        images = [url, ...images.filter(i => i !== url)];
      } catch { alert("Upload gagal. Cek Firebase Storage rules."); setUping(false); return; }
      setUping(false);
    }
    onSave({ ...f, price:Number(f.price), stock:Number(f.stock), rating:Number(f.rating), sold:Number(f.sold), images });
  };

  return (
    <div className="pform">
      <h2 className="pform-ttl">{initial?.id ? "Edit Produk" : "Tambah Produk"}</h2>

      <div className="pform-imgs">
        <img src={prev || IMG_PLACEHOLDER} alt="preview" className="pform-prev"
          onError={e => { e.target.onerror=null; e.target.src=IMG_PLACEHOLDER; }} />
        <div className="pform-imgctl">
          <label className="btn-upload"><Ic.Upload /> Upload Foto
            <input type="file" accept="image/*" hidden onChange={pickFile} />
          </label>
          <div className="url-row">
            <input className="finput" placeholder="atau paste URL…" value={imgUrl}
              onChange={e => setIU(e.target.value)} onKeyDown={e => e.key==="Enter" && addUrl()} />
            <button className="btn-addurl" onClick={addUrl}>+</button>
          </div>
          {Array.isArray(f.images) && f.images.length > 0 && (
            <div className="d-thumbs" style={{paddingLeft:0}}>
              {f.images.filter(i=>i.startsWith?.("http")).map((u,i) => (
                <div key={i} style={{position:"relative"}}>
                  <img src={u} className="d-thumb on" onClick={() => setPrev(u)}
                    onError={e=>{e.target.onerror=null;e.target.src=IMG_PLACEHOLDER;}} />
                  <button className="tdel" onClick={() => ch("images", f.images.filter((_,j)=>j!==i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pform-grid">
        <div className="fg"><label>Nama *</label>
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
        <div className="fg"><label>Rating</label>
          <input type="number" step="0.1" min="0" max="5" className="finput" value={f.rating} onChange={e=>ch("rating",e.target.value)} /></div>
        <div className="fg"><label>Terjual</label>
          <input type="number" className="finput" value={f.sold} onChange={e=>ch("sold",e.target.value)} /></div>
        <div className="fg"><label>Aroma</label>
          <input className="finput" value={f.aroma||""} onChange={e=>ch("aroma",e.target.value)} /></div>
      </div>

      <div className="fg" style={{marginBottom:12}}>
        <label>Deskripsi (desc)</label>
        <textarea className="finput ftarea" rows={4} value={f.desc||""} onChange={e=>ch("desc",e.target.value)} />
      </div>

      <div className="pform-checks">
        <label className="chk"><input type="checkbox" checked={!!f.bestSeller} onChange={e=>ch("bestSeller",e.target.checked)} /> Best Seller</label>
        <label className="chk"><input type="checkbox" checked={!!f.isActive}   onChange={e=>ch("isActive",e.target.checked)} /> Aktif/Tampil</label>
      </div>

      <div className="form-acts">
        <button className="btn-cancel" onClick={onCancel}>Batal</button>
        <button className="btn-save" onClick={submit} disabled={saving||uping}>
          {uping?"Mengupload…":saving?"Menyimpan…":"Simpan"}
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Delete ────────────────────────────────────────────────────────
function ConfirmDelete({ p, onConfirm, onCancel, saving }) {
  return (
    <div className="cbox">
      <h3>Hapus Produk?</h3>
      <p>Yakin hapus <strong>{p.name}</strong>?<br/>Tindakan ini tidak bisa dibatalkan.</p>
      <div className="form-acts">
        <button className="btn-cancel" onClick={onCancel}>Batal</button>
        <button className="btn-del" onClick={onConfirm} disabled={saving}>
          {saving ? "Menghapus…" : "Ya, Hapus"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [cat,       setCat]       = useState("All");
  const [sort,      setSort]      = useState("newest");
  const [selected,  setSelected]  = useState(null);
  const [editP,     setEditP]     = useState(null);
  const [delP,      setDelP]      = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [isAdmin,   setIsAdmin]   = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [dark,      setDark]      = useState(true);   // ← dark default

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q,
      snap => { setProducts(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const allCats = ["All", ...new Set(products.flatMap(p => [p.category, p.gender].filter(Boolean)))];

  let list = products.filter(p => {
    if (!isAdmin && p.isActive === false) return false;
    const matchCat = cat === "All" || p.category === cat || p.gender === cat;
    const q = search.toLowerCase();
    return matchCat && (!q ||
      (p.name||"").toLowerCase().includes(q) ||
      (p.desc||"").toLowerCase().includes(q));
  });
  if (sort === "price-asc")  list = [...list].sort((a,b) => (a.price||0)-(b.price||0));
  if (sort === "price-desc") list = [...list].sort((a,b) => (b.price||0)-(a.price||0));
  if (sort === "name")       list = [...list].sort((a,b) => (a.name||"").localeCompare(b.name||""));
  if (sort === "rating")     list = [...list].sort((a,b) => (b.rating||0)-(a.rating||0));
  if (sort === "sold")       list = [...list].sort((a,b) => (b.sold||0)-(a.sold||0));

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
    try { await deleteDoc(doc(db,"products",delP.id)); }
    catch(e) { alert("Gagal: "+e.message); }
    setDelP(null); setSaving(false);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className={`app ${dark ? "dark" : "light"}`}>

        {/* ════ HEADER ════ */}
        <header className="hdr">
          <div className="hinner">
            <div className="logo">
              <span className="logo-dot"/>
              <span className="logo-txt">Katalog<em>Pro</em></span>
            </div>

            {/* Kanan: mode toggle + admin controls */}
            <div className="hright">
              {/* Toggle dark/light */}
              <button className="mode-btn" onClick={() => setDark(d => !d)}
                title={dark ? "Mode Terang" : "Mode Gelap"}>
                {dark ? <Ic.Sun /> : <Ic.Moon />}
              </button>

              {isAdmin ? (
                <>
                  {/* Tombol Tambah di header — tidak geser layout */}
                  <button className="btn-add" onClick={() => { setEditP(null); setShowForm(true); }}>
                    <Ic.Plus /> Tambah
                  </button>
                  <button className="admin-btn on" onClick={() => setIsAdmin(false)}>
                    Admin ✓
                  </button>
                </>
              ) : (
                <button className="admin-btn" onClick={() => setShowLogin(true)}>
                  <Ic.Admin /> Admin
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ════ HERO ════ */}
        <section className="hero">
          <div className="hero-glow"/>
          <p className="hero-eye">Koleksi Premium</p>
          <h1 className="hero-ttl">Temukan Produk<br/><em>Terbaik Kami</em></h1>
          <p className="hero-sub">{list.length} produk tersedia</p>
        </section>

        {/* ════ CATEGORY TABS ════ */}
        <div className="cats">
          {allCats.map(c => (
            <button key={c} className={`cat-btn${cat===c?" on":""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        {/* ════ TOOLBAR — hanya search + sort, tanpa tombol tambah ════ */}
        <div className="toolbar">
          <div className="sbox">
            <Ic.Search />
            <input className="sinp" placeholder="Cari produk…" value={search}
              onChange={e => setSearch(e.target.value)} />
            {search && <button className="sclr" onClick={() => setSearch("")}><Ic.Close /></button>}
          </div>
          <select className="ssel" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Terbaru</option>
            <option value="price-asc">Harga ↑</option>
            <option value="price-desc">Harga ↓</option>
            <option value="rating">Rating</option>
            <option value="sold">Terlaris</option>
            <option value="name">A–Z</option>
          </select>
        </div>

        {/* ════ ADMIN INFO BAR ════ */}
        {isAdmin && (
          <div className="abar">
            <span>🛠 Admin Aktif</span>
            <span>{products.length} produk</span>
            <span>{products.filter(p=>p.isActive===false).length} nonaktif</span>
            <span>{products.filter(p=>(p.stock??p.size??0)<10).length} stok tipis</span>
          </div>
        )}

        {/* ════ PRODUCT GRID 2 kolom ════ */}
        <main className="main">
          {loading ? (
            <div className="grid2">{[...Array(6)].map((_,i) => <div key={i} className="skel"/>)}</div>
          ) : list.length === 0 ? (
            <div className="empty">
              <p style={{fontSize:"2.5rem"}}>📦</p>
              <h3>Tidak ada produk</h3>
              <p>{products.length===0 ? "Belum ada produk di database." : "Coba ubah filter."}</p>
            </div>
          ) : (
            <div className="grid2">
              {list.map(p => (
                <ProductCard key={p.id} p={p} onSelect={setSelected} isAdmin={isAdmin}
                  onEdit={p => { setEditP(p); setShowForm(true); }}
                  onDelete={setDelP} />
              ))}
            </div>
          )}
        </main>

        <footer className="ftr">© 2025 KatalogPro — Firebase + React</footer>

        {/* ════ MODALS ════ */}
        <Modal open={!!selected}  onClose={() => setSelected(null)}>
          {selected && <ProductDetail p={selected} />}
        </Modal>
        <Modal open={showForm}    onClose={() => { setShowForm(false); setEditP(null); }}>
          <ProductForm initial={editP} onSave={handleSave} saving={saving}
            onCancel={() => { setShowForm(false); setEditP(null); }} />
        </Modal>
        <Modal open={!!delP}      onClose={() => setDelP(null)}>
          {delP && <ConfirmDelete p={delP} onConfirm={handleDelete}
            onCancel={() => setDelP(null)} saving={saving} />}
        </Modal>
        <Modal open={showLogin}   onClose={() => setShowLogin(false)}>
          <AdminLogin onLogin={() => { setIsAdmin(true); setShowLogin(false); }} />
        </Modal>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CSS — SATU BLOK, BERSIH, DARK + LIGHT MODE
// ══════════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ── Dark theme ── */
.dark{
  --bg:#0d0d14; --bg2:#12121c; --bg3:#1e1e2c;
  --card:#16162288; --border:#ffffff13;
  --gold:#c9a84c; --gold2:#f0d080;
  --accent:#7c6af5; --red:#e05a5a; --green:#4caf82;
  --text:#f0ede8; --text2:#b0acbc; --text3:#62606c;
  --star-off:#333;
  --shd:0 8px 32px rgba(0,0,0,.55);
  --modal:#12121c;
  --hdr:rgba(13,13,20,.92);
  --hero-glow:radial-gradient(ellipse 80% 60% at 50% 0%,#c9a84c18 0%,transparent 70%);
}
/* ── Light theme ── */
.light{
  --bg:#f4f1eb; --bg2:#ffffff; --bg3:#e8e4da;
  --card:#ffffffd0; --border:#00000010;
  --gold:#9a6e18; --gold2:#c18a20;
  --accent:#5548cc; --red:#c03030; --green:#1e7a48;
  --text:#18160f; --text2:#48443c; --text3:#88847a;
  --star-off:#ccc;
  --shd:0 8px 28px rgba(0,0,0,.13);
  --modal:#ffffff;
  --hdr:rgba(244,241,235,.94);
  --hero-glow:radial-gradient(ellipse 80% 60% at 50% 0%,#c9a84c1a 0%,transparent 70%);
}

body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;transition:background .25s,color .25s}
.app{display:flex;flex-direction:column;min-height:100vh;background:var(--bg);transition:background .25s}

/* ════ HEADER ════ */
.hdr{position:sticky;top:0;z-index:100;background:var(--hdr);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);transition:background .25s}
.hinner{max-width:900px;margin:0 auto;padding:0 14px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.logo{display:flex;align-items:center;gap:8px;flex-shrink:0}
.logo-dot{width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold)}
.logo-txt{font-family:'Playfair Display',serif;font-size:1.15rem;color:var(--text)}
.logo-txt em{color:var(--gold);font-style:italic}
.hright{display:flex;align-items:center;gap:6px;flex-shrink:0}

/* mode toggle */
.mode-btn{width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.mode-btn:hover{border-color:var(--gold);color:var(--gold);transform:rotate(15deg)}

/* admin buttons */
.admin-btn{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:18px;border:1px solid var(--border);background:transparent;color:var(--text3);font-size:.78rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;white-space:nowrap}
.admin-btn:hover{border-color:var(--gold);color:var(--gold)}
.admin-btn.on{background:#c9a84c20;border-color:var(--gold);color:var(--gold)}

/* tombol tambah di header */
.btn-add{display:flex;align-items:center;gap:4px;padding:6px 13px;border-radius:18px;border:none;background:var(--gold);color:#0d0d14;font-weight:700;font-size:.78rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;white-space:nowrap;flex-shrink:0}
.btn-add:hover{background:var(--gold2)}

/* ════ HERO ════ */
.hero{position:relative;overflow:hidden;padding:48px 16px 32px;text-align:center}
.hero-glow{position:absolute;inset:0;background:var(--hero-glow);pointer-events:none}
.hero-eye{display:inline-block;padding:3px 14px;border:1px solid var(--gold);border-radius:18px;color:var(--gold);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px}
.hero-ttl{font-family:'Playfair Display',serif;font-size:clamp(1.8rem,5vw,2.7rem);line-height:1.2;margin-bottom:8px;color:var(--text)}
.hero-ttl em{color:var(--gold);font-style:italic}
.hero-sub{color:var(--text3);font-size:.87rem}

/* ════ CATEGORY TABS ════ */
.cats{display:flex;gap:6px;padding:10px 14px;overflow-x:auto;scrollbar-width:none;max-width:900px;margin:0 auto;width:100%}
.cats::-webkit-scrollbar{display:none}
.cat-btn{padding:5px 13px;border-radius:16px;border:1px solid var(--border);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.77rem;font-weight:500;color:var(--text3);background:var(--bg3);white-space:nowrap;transition:all .2s;flex-shrink:0}
.cat-btn:hover{color:var(--text2);border-color:var(--gold)}
.cat-btn.on{background:var(--gold);color:#0d0d14;font-weight:700;border-color:var(--gold)}

/* ════ TOOLBAR ════ */
.toolbar{max-width:900px;margin:0 auto;padding:6px 14px 10px;display:flex;gap:8px;align-items:center}
.sbox{flex:1;display:flex;align-items:center;gap:8px;padding:9px 13px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;transition:border-color .2s}
.sbox:focus-within{border-color:var(--gold)}
.sbox svg{color:var(--text3);flex-shrink:0}
.sinp{flex:1;background:none;border:none;outline:none;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.87rem}
.sinp::placeholder{color:var(--text3)}
.sclr{background:none;border:none;cursor:pointer;color:var(--text3);display:flex;padding:0}
.ssel{padding:9px 11px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.82rem;cursor:pointer;outline:none;flex-shrink:0}

/* ════ ADMIN BAR ════ */
.abar{max-width:900px;margin:0 auto 6px;padding:7px 14px;background:#c9a84c12;border:1px solid #c9a84c28;border-radius:10px;display:flex;gap:14px;flex-wrap:wrap;font-size:.75rem;color:var(--gold)}

/* ════ MAIN ════ */
.main{flex:1;max-width:900px;margin:0 auto;padding:6px 12px 48px;width:100%}

/* 2-column grid */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* ════ CARD ════ */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;position:relative;backdrop-filter:blur(8px)}
.card:hover{border-color:#c9a84c55;transform:translateY(-3px);box-shadow:var(--shd)}
.card-img-wrap{position:relative;overflow:hidden;aspect-ratio:1/1}
.card-img{width:100%;height:100%;object-fit:cover;transition:transform .3s}
.card:hover .card-img{transform:scale(1.04)}
.card-adm{position:absolute;top:6px;right:6px;display:flex;gap:4px;opacity:0;transition:opacity .2s}
.card:hover .card-adm{opacity:1}
.ab{width:28px;height:28px;border-radius:7px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
.ab.edit{background:rgba(124,106,245,.9);color:#fff}
.ab.del{background:rgba(224,90,90,.9);color:#fff}
.bdg{position:absolute;top:7px;left:7px;padding:2px 8px;border-radius:5px;font-size:.63rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.bdg-best-seller{background:var(--gold);color:#0d0d14}
.bdg-new{background:#7c6af5;color:#fff}
.bdg-sale{background:#e05a5a;color:#fff}
.bdg-eco{background:#4caf82;color:#fff}
.bdg-inactive{position:absolute;bottom:7px;left:7px;padding:2px 8px;border-radius:5px;font-size:.62rem;font-weight:700;background:rgba(0,0,0,.65);color:#999;border:1px solid #ffffff18}
.card-body{padding:10px}
.card-cat{display:flex;align-items:center;gap:4px;font-size:.67rem;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.card-name{font-family:'Playfair Display',serif;font-size:.9rem;line-height:1.3;margin-bottom:5px;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.stars{display:flex;align-items:center;gap:1px;font-size:.78rem;margin-bottom:5px}
.rating-num{font-size:.68rem;color:var(--text3);margin-left:3px}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:4px;flex-wrap:wrap}
.card-price{font-size:.88rem;font-weight:700;color:var(--gold)}
.spill{padding:2px 7px;border-radius:5px;font-size:.63rem;font-weight:500;background:#4caf8220;color:var(--green);border:1px solid #4caf8230;white-space:nowrap}
.spill.low{background:#e05a5a20;color:var(--red);border-color:#e05a5a30}
.spill.sold{background:#7c6af520;color:var(--accent);border-color:#7c6af530}
.card-sold{font-size:.65rem;color:var(--text3);margin-top:3px}

/* skeleton */
.skel{border-radius:12px;aspect-ratio:3/4;background:linear-gradient(90deg,var(--bg3) 25%,var(--bg2) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shim 1.4s infinite}
@keyframes shim{to{background-position:-200% 0}}

/* empty */
.empty{text-align:center;padding:56px 16px}
.empty h3{font-family:'Playfair Display',serif;font-size:1.2rem;margin:10px 0 6px;color:var(--text)}
.empty p{color:var(--text3);font-size:.85rem}

/* footer */
.ftr{text-align:center;padding:18px;border-top:1px solid var(--border);color:var(--text3);font-size:.76rem}

/* ════ MODAL — slide-up dari bawah, sejajar border ════ */
.overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center}
.modal-box{
  background:var(--modal);border:1px solid var(--border);
  border-radius:20px 20px 0 0;         /* rounded atas, sejajar bawah layar */
  width:100%;max-width:900px;
  max-height:90vh;overflow-y:auto;
  position:relative;box-shadow:var(--shd);
  scrollbar-width:thin;scrollbar-color:var(--border) transparent;
  animation:slideup .28s ease;
}
@keyframes slideup{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-handle{width:40px;height:4px;border-radius:2px;background:var(--border);margin:10px auto 0}
.modal-close{position:absolute;top:10px;right:12px;width:30px;height:30px;border-radius:50%;border:1px solid var(--border);background:var(--bg3);color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;transition:all .2s}
.modal-close:hover{border-color:var(--red);color:var(--red)}

/* ════ DETAIL ════ */
.detail{display:flex;flex-direction:column;width:100%}

/* Gambar: full-width, tidak terpotong, sejajar border modal */
.d-img-wrap{width:100%;overflow:hidden;background:var(--bg3);line-height:0}
.d-img{width:100%;max-height:320px;object-fit:contain;display:block}

/* Thumbnail row */
.d-thumbs{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;scrollbar-width:none;background:var(--bg3)}
.d-thumbs::-webkit-scrollbar{display:none}
.d-thumb{width:52px;height:52px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;flex-shrink:0;transition:border-color .2s}
.d-thumb.on,.d-thumb:hover{border-color:var(--gold)}
.tdel{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center}

/* Info body */
.d-body{padding:16px}
.d-name{font-family:'Playfair Display',serif;font-size:1.4rem;line-height:1.25;margin:6px 0 6px;color:var(--text)}
.d-price{font-size:1.25rem;font-weight:700;color:var(--gold);margin:8px 0 10px}
.d-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}

/* Aroma & Deskripsi — kotak terpisah dengan title */
.d-section{margin-bottom:12px;padding:11px 13px;background:var(--bg3);border-radius:10px;border-left:3px solid var(--gold)}
.d-sec-title{font-size:.72rem;font-weight:700;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.d-sec-text{font-size:.85rem;color:var(--text2);line-height:1.75}

.btn-order{width:100%;padding:13px;border-radius:10px;border:none;background:var(--gold);color:#0d0d14;font-weight:700;font-size:.9rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;margin-top:6px}
.btn-order:hover{background:var(--gold2)}

/* ════ FORM ════ */
.pform{padding:18px}
.pform-ttl{font-family:'Playfair Display',serif;font-size:1.2rem;margin-bottom:14px;color:var(--text)}
.pform-imgs{display:flex;gap:10px;margin-bottom:12px;padding:10px;background:var(--bg3);border-radius:10px;flex-wrap:wrap}
.pform-prev{width:80px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid var(--border)}
.pform-imgctl{flex:1;min-width:150px;display:flex;flex-direction:column;gap:6px}
.btn-upload{display:flex;align-items:center;gap:5px;padding:6px 11px;border:1px dashed var(--border);border-radius:7px;cursor:pointer;color:var(--text2);font-size:.76rem;width:fit-content;transition:all .2s}
.btn-upload:hover{border-color:var(--gold);color:var(--gold)}
.url-row{display:flex;gap:5px}
.btn-addurl{padding:6px 11px;border-radius:7px;border:1px solid var(--border);background:var(--bg3);color:var(--gold);cursor:pointer;font-size:.95rem;transition:all .2s}
.btn-addurl:hover{background:var(--gold);color:#0d0d14}
.pform-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.fg{display:flex;flex-direction:column;gap:4px}
.fg label{font-size:.74rem;color:var(--text3);font-weight:500}
.finput{padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:'DM Sans',sans-serif;font-size:.84rem;outline:none;transition:border-color .2s;width:100%}
.finput:focus{border-color:var(--gold)}
.finput.err{border-color:var(--red);animation:shake .3s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.ftarea{resize:vertical;min-height:90px}
.pform-checks{display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.chk{display:flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text2);cursor:pointer}
.form-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
.btn-cancel{padding:9px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.84rem;transition:all .2s}
.btn-cancel:hover{background:var(--bg3)}
.btn-save{padding:9px 20px;border-radius:8px;border:none;background:var(--gold);color:#0d0d14;font-weight:700;font-size:.84rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.btn-save:hover:not(:disabled){background:var(--gold2)}
.btn-save:disabled,.btn-del:disabled{opacity:.5;cursor:not-allowed}
.btn-del{padding:9px 20px;border-radius:8px;border:none;background:var(--red);color:#fff;font-weight:700;font-size:.84rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}

/* ════ ADMIN LOGIN ════ */
.alog{padding:28px 20px;text-align:center}
.alog-ico{width:46px;height:46px;border-radius:12px;background:#c9a84c18;border:1px solid var(--gold);color:var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.alog h3{font-family:'Playfair Display',serif;font-size:1.2rem;margin-bottom:6px;color:var(--text)}
.alog p{color:var(--text3);margin-bottom:12px;font-size:.83rem}
.errmsg{color:var(--red);font-size:.76rem;margin-top:5px}

/* ════ CONFIRM ════ */
.cbox{padding:26px 20px;text-align:center}
.cbox h3{font-family:'Playfair Display',serif;font-size:1.15rem;margin-bottom:10px;color:var(--text)}
.cbox p{color:var(--text2);margin-bottom:20px;font-size:.85rem;line-height:1.6}

/* ════ RESPONSIVE ════ */
@media(max-width:400px){
  .grid2{gap:7px}
  .card-name{font-size:.84rem}
  .card-price{font-size:.83rem}
  .pform-grid{grid-template-columns:1fr}
  .hright{gap:4px}
  .btn-add{padding:5px 9px;font-size:.73rem}
}
`;
