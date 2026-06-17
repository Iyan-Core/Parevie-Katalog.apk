import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, query, orderBy, where, getDoc
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ─── SVG Placeholder ──────────────────────────────────────────────────────
const IMG_PH = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#1a1a28"/>
    <rect x="150" y="140" width="100" height="80" rx="10" fill="none" stroke="#c9a84c" stroke-width="3"/>
    <circle cx="170" cy="162" r="10" fill="#c9a84c"/>
    <polyline points="150,220 180,185 205,200 230,170 250,220" fill="none" stroke="#c9a84c" stroke-width="3"/>
    <text x="200" y="265" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#c9a84c" opacity="0.7">Foto Produk</text>
  </svg>`
)}`;

// ─── Helpers ──────────────────────────────────────────────────────────────
const fRp = (n) =>
  new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n??0);

const getImg = (p) => {
  if (Array.isArray(p?.images)) {
    const u = p.images.find(i=>typeof i==="string"&&i.startsWith("http"));
    if (u) return u;
  }
  if (typeof p?.images==="string"&&p.images.startsWith("http")) return p.images;
  if (typeof p?.image ==="string"&&p.image.startsWith("http"))  return p.image;
  return "";
};

const normGender = (g="") => {
  const v = g.toLowerCase().trim();
  if (["male","man"].includes(v))           return "Male";
  if (["female","woman"].includes(v))       return "Female";
  if (["unisex","both","all"].includes(v))  return "Unisex";
  return g ? g.charAt(0).toUpperCase()+g.slice(1) : "";
};

const getStock = (p) => Number(p?.stock ?? p?.size ?? 0);

// ─── LocalStorage helpers ─────────────────────────────────────────────────
const LS_KEY = "parevie_my_orders";
const lsGet  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); } catch { return []; } };
const lsSet  = (arr) => { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {} };

const Stars = ({val=0}) => {
  const full=Math.floor(val), half=val%1>=0.5;
  return (
    <span className="stars">
      {[...Array(5)].map((_,i)=>(
        <span key={i} style={{color:i<full||(i===full&&half)?"#c9a84c":"var(--star-off)"}}>
          {i<full?"★":i===full&&half?"⯨":"☆"}
        </span>
      ))}
      <span className="rnum">{val?val.toFixed(1):""}</span>
    </span>
  );
};

// ─── Icons ────────────────────────────────────────────────────────────────
const Ic = {
  Plus:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Search: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Close:  ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Admin:  ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Upload: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Tag:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Sun:    ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Send:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Loc:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Bell:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Chat:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Menu:   ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Qris:   ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="17" y1="17" x2="21" y2="17"/><line x1="21" y1="14" x2="21" y2="17"/></svg>,
  WA:     ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
};

// ─── Modal ────────────────────────────────────────────────────────────────
function Modal({open, onClose, children}) {
  useEffect(()=>{
    const h=(e)=>e.key==="Escape"&&onClose();
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[onClose]);
  if(!open) return null;
  return (
    <div className="overlay" onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-handle"/>
        <button className="modal-close" onClick={onClose}><Ic.Close/></button>
        {children}
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────
function ProductCard({p, onSelect, isAdmin, onEdit, onDelete}) {
  const img   = getImg(p);
  const badge = p.bestSeller?"Best Seller":p.isNew?"New":(p.isSale||p.onSale)?"Sale":(p.badge||"");
  const stok  = getStock(p);
  return (
    <div className="card" onClick={()=>onSelect(p)}>
      <div className="card-img-wrap">
        <img src={img||IMG_PH} alt={p.name} className="card-img"
          onError={(e)=>{e.target.onerror=null;e.target.src=IMG_PH;}}/>
        {badge&&<span className={`bdg bdg-${badge.toLowerCase().replace(/\s/g,"-")}`}>{badge}</span>}
        {p.isActive===false&&<span className="bdg-inactive">Nonaktif</span>}
        {stok===0&&<div className="sold-out-overlay">HABIS</div>}
        {isAdmin&&(
          <div className="card-adm" onClick={(e)=>e.stopPropagation()}>
            <button className="ab edit" onClick={()=>onEdit(p)}><Ic.Edit/></button>
            <button className="ab del"  onClick={()=>onDelete(p)}><Ic.Trash/></button>
          </div>
        )}
      </div>
      <div className="card-body">
        <p className="card-cat"><Ic.Tag/> {normGender(p.gender)||p.category||"—"}</p>
        <h3 className="card-name">{p.name}</h3>
        {p.rating>0&&<Stars val={p.rating}/>}
        <div className="card-foot">
          <span className="card-price">{fRp(p.price)}</span>
          <span className={`spill${stok===0?" out":stok<10?" low":""}`}>
            {stok===0?"Habis":`${stok} stok`}
          </span>
        </div>
        {p.sold>0&&<p className="card-sold">{p.sold} terjual</p>}
      </div>
    </div>
  );
}

// ─── ORDER MODAL ──────────────────────────────────────────────────────────
function OrderModal({p}) {
  const [step,     setStep]    = useState("form");
  const [name,     setName]    = useState("");
  const [phone,    setPhone]   = useState("");
  const [addr,     setAddr]    = useState("");
  const [note,     setNote]    = useState("");
  const [locState, setLocState]= useState("idle");
  const [gpsText,  setGpsText] = useState("");
  const [orderId,  setOId]     = useState(null);
  const [msgs,     setMsgs]    = useState([]);
  const [chatTxt,  setChatTxt] = useState("");
  const [submitting,setSub]    = useState(false);
  const [paying,   setPaying]  = useState(false);
  const chatRef = useRef(null);

  // ── Jenis pengiriman: jne (otomatis RajaOngkir) / gosend / grab (manual) ──
  const [courierType, setCourierType] = useState("jne");

  // ── Shipping cost (RajaOngkir via Cloud Function proxy) ──
  const [destKeyword, setDestKeyword]   = useState("");
  const [destOptions, setDestOptions]   = useState([]);
  const [destCity,    setDestCity]      = useState(null); // {city_id, city_name}
  const [searchingCity, setSearchingCity] = useState(false);
  const [shipOptions, setShipOptions]   = useState([]);
  const [shipSelected,setShipSelected]  = useState(null);
  const [loadingShip, setLoadingShip]   = useState(false);
  const [shipError,   setShipError]     = useState("");

  // Ganti dengan URL Cloud Function kamu setelah deploy
  const FN_SEARCH_CITY = import.meta.env.VITE_FN_SEARCH_CITY_URL || "";
  const FN_SHIP_COST    = import.meta.env.VITE_FN_SHIP_COST_URL    || "";
  const ORIGIN_CITY_ID  = import.meta.env.VITE_ORIGIN_CITY_ID      || ""; // kota asal toko

  const searchCity = async (kw) => {
    setDestKeyword(kw);
    setDestCity(null);
    setShipOptions([]);
    setShipSelected(null);
    if (kw.trim().length < 3 || !FN_SEARCH_CITY) { setDestOptions([]); return; }
    setSearchingCity(true);
    try {
      const r = await fetch(`${FN_SEARCH_CITY}?keyword=${encodeURIComponent(kw)}`);
      const data = await r.json();
      setDestOptions(data.cities || []);
    } catch { setDestOptions([]); }
    setSearchingCity(false);
  };

  const pickCity = async (city) => {
    setDestCity(city);
    setDestKeyword(city.city_name);
    setDestOptions([]);
    if (!ORIGIN_CITY_ID || !FN_SHIP_COST) {
      setShipError("Konfigurasi ongkir belum lengkap. Hubungi admin.");
      return;
    }
    setLoadingShip(true); setShipError("");
    try {
      const r = await fetch(FN_SHIP_COST, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          origin: ORIGIN_CITY_ID,
          destination: city.city_id,
          weight: 200, // gram — sesuaikan dengan berat produk
          courier: "jne",
        }),
      });
      const data = await r.json();
      if (data.error) setShipError(data.error);
      else setShipOptions(data.options || []);
    } catch { setShipError("Gagal menghitung ongkir. Coba lagi."); }
    setLoadingShip(false);
  };

  // Ongkir: JNE dari RajaOngkir (otomatis), GoSend/Grab manual (admin isi nanti)
  const shippingCost = courierType==="jne" ? (shipSelected?.cost||0) : 0;
  const totalWithShipping = p.price + shippingCost;

  const switchCourierType = (type) => {
    setCourierType(type);
    // Reset pilihan ongkir JNE saat ganti ke kurir manual
    if (type !== "jne") {
      setShipSelected(null);
    }
  };

  const COURIER_LABEL = {
    jne: "JNE / SiCepat / TIKI",
    gosend: "GoSend (Gojek)",
    grab: "Grab Express",
  };

  const getLocation = () => {
    if (!navigator.geolocation) { setLocState("error"); setGpsText("GPS tidak tersedia."); return; }
    setLocState("loading"); setGpsText("Mengambil lokasi GPS…");
    const tid = setTimeout(()=>{
      setLocState("error");
      setGpsText("Timeout. Aktifkan GPS & izin lokasi di Pengaturan → Aplikasi → Izin → Lokasi.");
    },15000);
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        clearTimeout(tid);
        const la=pos.coords.latitude.toFixed(6), lo=pos.coords.longitude.toFixed(6);
        const url=`https://maps.google.com/?q=${la},${lo}`;
        setGpsText(`📍 ${la}, ${lo}`); setLocState("done");
        setAddr(prev=>prev.includes("GPS:")?prev:(prev.trim()?prev+"\n":"")+`GPS: ${url}`);
      },
      (err)=>{
        clearTimeout(tid); setLocState("error");
        const m=err.code===1?"Izin lokasi DITOLAK.\n👉 Pengaturan → Aplikasi → KatalogPro → Izin → Lokasi → Izinkan"
          :err.code===2?"GPS tidak ditemukan. Pastikan GPS aktif."
          :"Timeout. Coba di area terbuka.";
        setGpsText(m);
      },
      {enableHighAccuracy:true,timeout:12000,maximumAge:0}
    );
  };

  const submitOrder = async () => {
    if (!name.trim()) return alert("Nama wajib diisi!");
    if (!phone.trim()) return alert("Nomor WhatsApp wajib diisi!");
    if (!addr.trim()) return alert("Alamat pengiriman wajib diisi!");
    setSub(true);
    try {
      const oRef = await addDoc(collection(db,"orders"),{
        productId:p.id, productName:p.name, productImg:getImg(p),
        price:p.price, buyerName:name.trim(), buyerPhone:phone.trim(),
        address:addr.trim(), note:note.trim(), status:"pending",
        courierType: courierType,
        courierLabel: COURIER_LABEL[courierType],
        shippingCity: destCity?.city_name || "",
        shippingCourier: shipSelected?.courier || "",
        shippingService: shipSelected?.service || "",
        shippingCost: shippingCost,
        shippingPending: courierType!=="jne", // true jika ongkir belum dihitung (manual)
        totalAmount: totalWithShipping,
        createdAt:serverTimestamp(),
      });
      setOId(oRef.id);
      // Simpan ke localStorage
      const existing = lsGet();
      if (!existing.find(o=>o.orderId===oRef.id)) {
        lsSet([{orderId:oRef.id, productName:p.name, productImg:getImg(p),
          price:p.price, status:"pending", buyerConfirmed:false}, ...existing]);
      }
      await addDoc(collection(db,"notifications"),{
        type:"new_order", orderId:oRef.id,
        message:`🛒 Pesanan baru: ${p.name}`,
        detail:`Dari: ${name.trim()} (${phone.trim()})${courierType!=="jne"?` · 🚨 Perlu hitung ongkir ${COURIER_LABEL[courierType]}`:""}`,
        address:addr.trim(), read:false, createdAt:serverTimestamp(),
      });
      await addDoc(collection(db,`orders/${oRef.id}/chats`),{
        from:"system",
        text:`Pesanan diterima! Menunggu konfirmasi admin.\nProduk: ${p.name} — ${fRp(p.price)}\nPengiriman: ${COURIER_LABEL[courierType]}`,
        createdAt:serverTimestamp(),
      });
      // Jika kurir manual (GoSend/Grab), kirim pengingat khusus ke admin
      if (courierType !== "jne") {
        await addDoc(collection(db,`orders/${oRef.id}/chats`),{
          from:"system",
          text:`📍 Mohon admin hitung & infokan ongkos kirim ${COURIER_LABEL[courierType]} ke pembeli sebelum pembayaran.`,
          createdAt:serverTimestamp(),
        });
      }
      setStep("qris");
    } catch(e){ alert("Gagal membuat pesanan: "+e.message); }
    setSub(false);
  };

  const confirmPay = async () => {
    if (!orderId) return alert("ID pesanan tidak ditemukan.");
    setPaying(true);
    try {
      await updateDoc(doc(db,"orders",orderId),{status:"paid_pending_confirm",paidAt:serverTimestamp()});
      await addDoc(collection(db,`orders/${orderId}/chats`),{
        from:"buyer",
        text:`✅ Saya sudah transfer untuk pesanan ${p.name} (${fRp(p.price)}). Mohon dikonfirmasi ya 🙏`,
        createdAt:serverTimestamp(),
      });
      await addDoc(collection(db,"notifications"),{
        type:"payment_received", orderId,
        message:`💰 Pembayaran: ${p.name} — ${fRp(p.price)}`,
        read:false, createdAt:serverTimestamp(),
      });
      // Update status di localStorage juga
      const arr = lsGet().map(o=>o.orderId===orderId?{...o,status:"paid_pending_confirm"}:o);
      lsSet(arr);
      setStep("chat");
    } catch(e){ alert("Gagal konfirmasi: "+e.message); }
    setPaying(false);
  };

  useEffect(()=>{
    if (step!=="chat"||!orderId) return;
    const q=query(collection(db,`orders/${orderId}/chats`),orderBy("createdAt","asc"));
    const u=onSnapshot(q,snap=>{
      setMsgs(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>chatRef.current?.scrollTo(0,99999),120);
    });
    return ()=>u();
  },[step,orderId]);

  const sendChat = async () => {
    if (!chatTxt.trim()||!orderId) return;
    try {
      await addDoc(collection(db,`orders/${orderId}/chats`),{from:"buyer",text:chatTxt.trim(),createdAt:serverTimestamp()});
      setChatTxt("");
    } catch(e){ alert("Gagal: "+e.message); }
  };

  if (step==="form") return (
    <div className="ord-wrap">
      <div className="ord-hdr">
        <img src={getImg(p)||IMG_PH} alt={p.name} className="ord-thumb"
          onError={(e)=>{e.target.onerror=null;e.target.src=IMG_PH;}}/>
        <div><p className="ord-pname">{p.name}</p><p className="ord-price">{fRp(p.price)}</p></div>
      </div>
      <div className="ord-body">
        <div className="fg"><label>Nama Lengkap *</label>
          <input className="finput" value={name} onChange={e=>setName(e.target.value)} placeholder="Nama penerima"/></div>
        <div className="fg"><label>No. WhatsApp *</label>
          <input className="finput" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxxxx"/></div>
        <div className="fg">
          <label>Alamat Pengiriman *</label>
          <textarea className="finput ftarea" rows={3} value={addr}
            onChange={e=>setAddr(e.target.value)} placeholder="Jalan, RT/RW, Kelurahan, Kota…"/>
          <button type="button"
            className={`btn-loc${locState==="loading"?" loading":locState==="done"?" done":""}`}
            onClick={(e)=>{e.preventDefault();e.stopPropagation();getLocation();}}>
            <Ic.Loc/>
            {locState==="loading"?" Mengambil GPS…":locState==="done"?" Lokasi Tersimpan ✓":locState==="error"?" Coba Lagi":" Tambah Lokasi GPS"}
          </button>
          {gpsText&&<p className={`loc-msg${locState==="error"?" err":locState==="done"?" ok":""}`}>{gpsText}</p>}
        </div>
        <div className="fg"><label>Catatan (opsional)</label>
          <input className="finput" value={note} onChange={e=>setNote(e.target.value)} placeholder="Warna, ukuran, dll…"/></div>

        {/* ── Pilih Jenis Pengiriman ── */}
        <div className="fg">
          <label>🚚 Pilih Jenis Pengiriman</label>
          <div className="courier-radio-group">
            <button type="button"
              className={`courier-radio${courierType==="jne"?" on":""}`}
              onClick={()=>switchCourierType("jne")}>
              <span className="courier-icon">📦</span>
              <span>JNE / SiCepat<br/><small>Ongkir otomatis</small></span>
            </button>
            <button type="button"
              className={`courier-radio${courierType==="gosend"?" on":""}`}
              onClick={()=>switchCourierType("gosend")}>
              <span className="courier-icon">🛵</span>
              <span>GoSend<br/><small>Diatur admin</small></span>
            </button>
            <button type="button"
              className={`courier-radio${courierType==="grab"?" on":""}`}
              onClick={()=>switchCourierType("grab")}>
              <span className="courier-icon">🟢</span>
              <span>Grab Express<br/><small>Diatur admin</small></span>
            </button>
          </div>
        </div>

        {/* ── Ongkos Kirim JNE (otomatis via RajaOngkir) ── */}
        {courierType==="jne" && (
          <div className="fg ship-section">
            <label>Hitung Ongkos Kirim JNE</label>
            <div className="ship-city-search">
              <input className="finput" value={destKeyword}
                onChange={e=>searchCity(e.target.value)}
                placeholder="Cari kota tujuan… (min. 3 huruf)"/>
              {searchingCity && <span className="ship-loading-dot">⏳</span>}
            </div>
            {destOptions.length>0 && (
              <div className="ship-city-list">
                {destOptions.map(c=>(
                  <button key={c.city_id} type="button" className="ship-city-item"
                    onClick={()=>pickCity(c)}>
                    {c.city_name}, {c.province}
                  </button>
                ))}
              </div>
            )}
            {loadingShip && <p className="ship-msg">⏳ Menghitung ongkos kirim…</p>}
            {shipError && <p className="ship-msg err">{shipError}</p>}
            {shipOptions.length>0 && (
              <div className="ship-options">
                {shipOptions.map((o,i)=>(
                  <button key={i} type="button"
                    className={`ship-option${shipSelected===o?" on":""}`}
                    onClick={()=>setShipSelected(o)}>
                    <div>
                      <strong>{o.courier} {o.service}</strong>
                      <p>{o.description} · Estimasi {o.etd} hari</p>
                    </div>
                    <span>{fRp(o.cost)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GoSend / Grab Express: manual, admin akan infokan ongkir via chat ── */}
        {(courierType==="gosend"||courierType==="grab") && (
          <div className="fg">
            <div className="ship-manual-note">
              <p>
                {courierType==="gosend"?"🛵":"🟢"} Kamu memilih <strong>{COURIER_LABEL[courierType]}</strong>.
              </p>
              <p>Ongkos kirim akan dihitung admin berdasarkan jarak toko ke alamatmu, dan diinfokan lewat chat setelah pesanan dibuat.</p>
            </div>
          </div>
        )}


        <div className="ord-info">
          <p>🚚 Pengiriman via <strong>Gojek / Grab / SiCepat / JNE</strong></p>
          <p>💳 Pembayaran QRIS setelah pesanan dikonfirmasi</p>
        </div>

        {/* ── Ringkasan Total ── */}
        <div className="ord-total-box">
          <div className="ord-total-row"><span>Harga produk</span><span>{fRp(p.price)}</span></div>
          <div className="ord-total-row">
            <span>Ongkos kirim</span>
            <span>
              {courierType==="jne"
                ? (shippingCost>0?fRp(shippingCost):"—")
                : "Diinfokan admin"}
            </span>
          </div>
          <div className="ord-total-row total">
            <span>Total{courierType!=="jne"&&"*"}</span>
            <span>{fRp(totalWithShipping)}</span>
          </div>
          {courierType!=="jne" && (
            <p className="ord-total-note">*Belum termasuk ongkir {COURIER_LABEL[courierType]}</p>
          )}
        </div>

        <button type="button" className="btn-order" onClick={submitOrder} disabled={submitting}>
          {submitting?"⏳ Mengirim…":"📦 Buat Pesanan"}
        </button>
      </div>
    </div>
  );

  if (step==="qris") return (
    <div className="ord-wrap">
      <div className="qris-head"><Ic.Qris/> <span>Pembayaran QRIS</span></div>
      <div className="qris-body">
        <p className="qris-amount">{fRp(p.price)}</p>
        <p style={{color:"var(--text3)",fontSize:".82rem",marginBottom:16}}>
          Pesanan #{orderId?.slice(-6).toUpperCase()} · {p.name}
        </p>
        <div className="qris-img-wrap">
          <img src="https://ik.imagekit.io/bn7fafwae/logo/parevie.png?updatedAt=1781320550809"
            alt="QRIS Parevie" className="qris-img"
            onError={(e)=>{e.target.onerror=null;e.target.style.display="none";}}/>
        </div>
        <div className="qris-steps">
          <p>1. Buka e-wallet / m-banking</p>
          <p>2. Scan kode QR di atas</p>
          <p>3. Bayar tepat <strong>{fRp(p.price)}</strong></p>
          <p>4. Klik tombol di bawah setelah transfer</p>
        </div>
        <button type="button" className={`btn-order${paying?" disabled":""}`}
          onClick={confirmPay} disabled={paying}>
          {paying?"⏳ Memproses…":"✅ Sudah Bayar → Chat Admin"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="chat-wrap">
      <div className="chat-hdr"><Ic.Chat/> <span>Chat dengan Admin</span>
        <span className="chat-status">● Online</span></div>
      <div className="chat-info">#{orderId?.slice(-6).toUpperCase()} · {p.name} · {fRp(p.price)}</div>
      <div className="chat-msgs" ref={chatRef}>
        {msgs.map(m=>(
          <div key={m.id} className={`cmsg ${m.from==="buyer"?"right":m.from==="system"?"center":"left"}`}>
            {m.from==="system"
              ?<div className="csys">{m.text}</div>
              :<><div className={`cbubble ${m.from==="buyer"?"bubble-buyer":"bubble-admin"}`}>{m.text}</div>
                <span className="ctime">{m.from==="buyer"?"Saya":"👤 Admin"}</span></>}
          </div>
        ))}
      </div>
      <div className="chat-inp-row">
        <input className="finput" style={{flex:1}} placeholder="Ketik pesan…"
          value={chatTxt} onChange={e=>setChatTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&sendChat()}/>
        <button type="button" className="btn-send" onClick={sendChat}><Ic.Send/></button>
      </div>
    </div>
  );
}

// ─── USER CHAT PANEL ──────────────────────────────────────────────────────
function UserChatPanel() {
  const [selOrd,   setSelOrd]   = useState(null);
  const [msgs,     setMsgs]     = useState([]);
  const [txt,      setTxt]      = useState("");
  const [ordData,  setOrdData]  = useState(null);
  const [myOrders, setMyOrders] = useState(lsGet);
  const [confirming, setConfirming] = useState(false);
  const chatRef = useRef(null);

  // Sync localStorage → state setiap buka panel
  useEffect(()=>{ setMyOrders(lsGet()); },[]);

  // Listen status semua pesanan di LIST (bukan yang sedang dibuka detailnya)
  // agar tidak race dengan listener detail di bawah
  useEffect(()=>{
    const orders = lsGet();
    if (orders.length===0) return;
    const unsubs = orders
      .filter(order=>order.orderId!==selOrd) // skip yang sedang dibuka — dihandle listener detail
      .map(order=>{
        return onSnapshot(doc(db,"orders",order.orderId), snap=>{
          if (snap.exists()) {
            const newStatus = snap.data().status;
            const newBC     = snap.data().buyerConfirmed || false;
            const arr = lsGet().map(o=>
              o.orderId===order.orderId ? {...o, status:newStatus, buyerConfirmed:newBC} : o
            );
            lsSet(arr);
            setMyOrders(arr);
          } else {
            const arr = lsGet().filter(o=>o.orderId!==order.orderId);
            lsSet(arr); setMyOrders(arr);
          }
        });
      });
    return ()=>unsubs.forEach(u=>u());
  },[selOrd]);

  // Listen chat + order saat detail dibuka — SATU-SATUNYA sumber kebenaran untuk order yang aktif
  useEffect(()=>{
    if (!selOrd) return;
    const q=query(collection(db,`orders/${selOrd}/chats`),orderBy("createdAt","asc"));
    const u1=onSnapshot(q,snap=>{
      setMsgs(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>chatRef.current?.scrollTo(0,99999),120);
    });
    const u2=onSnapshot(doc(db,"orders",selOrd),snap=>{
      if (snap.exists()) {
        const data = snap.data();
        setOrdData(data);
        // Sync ke localStorage juga supaya list pesanan ikut update
        const arr = lsGet().map(o=>
          o.orderId===selOrd ? {...o, status:data.status, buyerConfirmed:data.buyerConfirmed||false} : o
        );
        lsSet(arr);
        setMyOrders(arr);
      } else {
        setSelOrd(null);
      }
    });
    return ()=>{ u1(); u2(); };
  },[selOrd]);

  const sendChat = async () => {
    if (!txt.trim()||!selOrd) return;
    try {
      await addDoc(collection(db,`orders/${selOrd}/chats`),{
        from:"buyer", text:txt.trim(), createdAt:serverTimestamp(),
      });
      setTxt("");
    } catch(e){ alert("Gagal: "+e.message); }
  };

  // ── Konfirmasi terima pesanan ──
  // Firestore adalah satu-satunya sumber kebenaran.
  // Listener detail (u2 di atas) akan otomatis update ordData + localStorage
  // begitu write ini berhasil — tidak perlu set manual di sini (hindari race).
  const handleBuyerConfirm = async () => {
    if (!selOrd || confirming) return;
    setConfirming(true);
    try {
      await updateDoc(doc(db,"orders",selOrd),{
        buyerConfirmed: true,
        buyerConfirmedAt: serverTimestamp(),
      });
      await addDoc(collection(db,`orders/${selOrd}/chats`),{
        from:"system",
        text:"✅ Buyer mengonfirmasi pesanan telah diterima dengan baik. Terima kasih! 💛",
        createdAt:serverTimestamp(),
      });
    } catch(e){ alert("Gagal konfirmasi: "+e.message); }
    setConfirming(false);
  };

  const SL = {pending:"⏳ Menunggu konfirmasi",paid_pending_confirm:"💰 Pembayaran diverifikasi",
    confirmed:"✅ Dikonfirmasi",shipped:"🚚 Dalam pengiriman",done:"🎉 Selesai",cancelled:"❌ Dibatalkan"};
  const SC = {pending:"#c9a84c",paid_pending_confirm:"#7c6af5",confirmed:"#4caf82",
    shipped:"#29b6f6",done:"#4caf82",cancelled:"#e05a5a"};

  const WA_ADMIN = "6281328046768"; // ganti nomor WA admin

  if (myOrders.length===0) return (
    <div className="acp">
      <h3 className="acp-ttl"><Ic.Chat/> Pesanan Saya</h3>
      <div className="empty" style={{padding:"40px 16px"}}>
        <p style={{fontSize:"2rem"}}>🛒</p><h3>Belum ada pesanan</h3>
        <p>Pesanan akan muncul setelah checkout</p>
      </div>
    </div>
  );

  if (!selOrd) return (
    <div className="acp">
      <h3 className="acp-ttl"><Ic.Chat/> Pesanan Saya</h3>
      <div className="acp-list">
        {myOrders.map(o=>{
          const status = o.status||"pending";
          return (
            <div key={o.orderId} className="acp-item" onClick={()=>setSelOrd(o.orderId)}>
              <img src={o.productImg||IMG_PH} alt={o.productName}
                style={{width:48,height:48,objectFit:"cover",borderRadius:8,flexShrink:0}}
                onError={e=>{e.target.src=IMG_PH;}}/>
              <div style={{flex:1,minWidth:0}}>
                <p className="acp-pname">{o.productName}</p>
                <p className="acp-buyer">{fRp(o.price)} · #{o.orderId.slice(-6).toUpperCase()}</p>
                <span style={{fontSize:".7rem",fontWeight:600,color:SC[status]||"#888"}}>
                  {SL[status]||status}
                </span>
              </div>
              <span style={{color:"var(--gold)",fontSize:".8rem"}}>Chat →</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const status      = ordData?.status||"pending";
  // Cek buyerConfirmed dari ordData (Firestore) ATAU localStorage
  const lsOrder     = myOrders.find(o=>o.orderId===selOrd);
  const buyerConfirmed = ordData?.buyerConfirmed || lsOrder?.buyerConfirmed || false;
  const found       = lsOrder;

  return (
    <div className="chat-wrap">
      <div className="chat-hdr">
        <button type="button" onClick={()=>setSelOrd(null)} className="btn-back-chat">←</button>
        <Ic.Chat/> <span>{found?.productName}</span>
      </div>
      <div className="status-bar" style={{
        background:SC[status]+"22",borderColor:SC[status]+"55",color:SC[status]}}>
        {SL[status]||status}
      </div>

      {/* ── Tombol konfirmasi terima pesanan ── */}
      {status==="done" && !buyerConfirmed && (
        <div className="buyer-confirm-box">
          <button
            className="btn-buyer-confirm"
            onClick={handleBuyerConfirm}
            disabled={confirming}>
            {confirming?"⏳ Mengonfirmasi…":"✅ Saya Sudah Menerima Pesanan"}
          </button>
        </div>
      )}

      {/* ── Tampilan setelah konfirmasi — PERMANEN ── */}
      {status==="done" && buyerConfirmed && (
        <div className="buyer-thankyou-box">
          <p className="buyer-thankyou-title">🎉 Terima Kasih!</p>
          <p className="buyer-thankyou-sub">
            Pesanan kamu sudah kami tandai selesai.<br/>
            Semoga puas dengan produk Parevie 💛
          </p>
          <a
            href={`https://wa.me/${WA_ADMIN}?text=Halo+Parevie%2C+saya+butuh+bantuan+mengenai+pesanan+saya`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wa-help">
            <Ic.WA/> Butuh Bantuan? Hubungi Kami
          </a>
        </div>
      )}

      <div className="chat-msgs" ref={chatRef}>
        {msgs.map(m=>(
          <div key={m.id} className={`cmsg ${m.from==="buyer"?"right":m.from==="system"?"center":"left"}`}>
            {m.from==="system"
              ?<div className="csys">{m.text}</div>
              :<><div className={`cbubble ${m.from==="buyer"?"bubble-buyer":"bubble-admin"}`}>{m.text}</div>
                <span className="ctime">{m.from==="buyer"?"Saya":"👤 Admin"}</span></>}
          </div>
        ))}
      </div>
      <div className="chat-inp-row">
        <input className="finput" style={{flex:1}} placeholder="Ketik pesan ke admin…"
          value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&sendChat()}/>
        <button type="button" className="btn-send" onClick={sendChat}><Ic.Send/></button>
      </div>
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────
function AdminLogin({onLogin}) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch { setError("Email atau password salah."); }
    setLoading(false);
  };

  return (
    <div className="alog">
      <div className="alog-ico"><Ic.Admin/></div>
      <h3>Login Admin</h3>
      <p>Masukkan email dan password admin</p>
      <form onSubmit={handleLogin}>
        <div className="fg" style={{marginBottom:10}}>
          <label>Email</label>
          <input type="email" className="finput" placeholder="admin@email.com"
            value={email} onChange={e=>setEmail(e.target.value)} required/>
        </div>
        <div className="fg" style={{marginBottom:10}}>
          <label>Password</label>
          <input type="password" className="finput" placeholder="Password"
            value={password} onChange={e=>setPassword(e.target.value)} required/>
        </div>
        {error&&<p className="errmsg">{error}</p>}
        <button type="submit" className="btn-save" style={{width:"100%",marginTop:10}} disabled={loading}>
          {loading?"⏳ Login…":"Masuk"}
        </button>
      </form>
    </div>
  );
}

// ─── ADMIN CHAT PANEL ─────────────────────────────────────────────────────
function AdminChatPanel({onLogout}) {
  const [orders,  setOrders]  = useState([]);
  const [selOrd,  setSelOrd]  = useState(null);
  const [msgs,    setMsgs]    = useState([]);
  const [txt,     setTxt]     = useState("");
  const [delConf, setDelConf] = useState(null);
  const chatRef = useRef(null);

  useEffect(()=>{
    const q=query(collection(db,"orders"),orderBy("createdAt","desc"));
    return onSnapshot(q,snap=>setOrders(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);

  useEffect(()=>{
    if (!selOrd) return;
    const q=query(collection(db,`orders/${selOrd.id}/chats`),orderBy("createdAt","asc"));
    return onSnapshot(q,snap=>{
      setMsgs(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>chatRef.current?.scrollTo(0,99999),120);
    });
  },[selOrd]);

  useEffect(()=>{
    if (!selOrd?.id) return;
    return onSnapshot(doc(db,"orders",selOrd.id), snap=>{
      if (snap.exists()) setSelOrd(prev=>({...prev,...snap.data(),id:snap.id}));
      else setSelOrd(null);
    });
  },[selOrd?.id]);

  const send = async () => {
    if (!txt.trim()||!selOrd) return;
    try {
      await addDoc(collection(db,`orders/${selOrd.id}/chats`),{
        from:"admin",text:txt.trim(),createdAt:serverTimestamp(),
      });
      setTxt("");
    } catch(e){ alert("Gagal kirim: "+e.message); }
  };

  const updStatus = async (s) => {
    if (!selOrd) return;
    try {
      await updateDoc(doc(db,"orders",selOrd.id),{status:s,updatedAt:serverTimestamp()});
      setSelOrd(o=>({...o,status:s}));
      if (s==="confirmed"&&selOrd.productId) {
        try {
          const prodRef=doc(db,"products",selOrd.productId);
          const prodSnap=await getDoc(prodRef);
          if (prodSnap.exists()) {
            const cur=Number(prodSnap.data().stock??prodSnap.data().size??0);
            if (cur>0) await updateDoc(prodRef,{stock:cur-1,updatedAt:serverTimestamp()});
          }
        } catch(e){ console.warn("Gagal kurangi stok:",e.message); }
      }
      const statusMsg={
        confirmed:"✅ Pesanan dikonfirmasi! Sedang disiapkan untuk dikirim.",
        shipped:"🚚 Pesanan sedang dalam perjalanan ke alamatmu!",
        done:"🎉 Pesanan selesai! Terima kasih sudah berbelanja di Parevie 💛",
        cancelled:"❌ Pesanan dibatalkan. Hubungi admin untuk info lebih lanjut.",
      };
      if (statusMsg[s]) {
        await addDoc(collection(db,`orders/${selOrd.id}/chats`),{
          from:"system",text:statusMsg[s],createdAt:serverTimestamp(),
        });
      }
    } catch(e){ alert("Gagal update status: "+e.message); }
  };

  const deleteMsg = async (chatId) => {
    try { await deleteDoc(doc(db,`orders/${selOrd.id}/chats`,chatId)); }
    catch(e){ alert("Gagal hapus: "+e.message); }
    setDelConf(null);
  };

  const deleteOrder = async (ordId) => {
    if (!window.confirm("Hapus pesanan ini permanen?")) return;
    try { await deleteDoc(doc(db,"orders",ordId)); setSelOrd(null); }
    catch(e){ alert("Gagal: "+e.message); }
  };

  const SC={pending:"#c9a84c",paid_pending_confirm:"#7c6af5",
    confirmed:"#4caf82",shipped:"#29b6f6",done:"#4caf82",cancelled:"#e05a5a"};
  const SL={pending:"Pending",paid_pending_confirm:"Sudah Bayar",
    confirmed:"Konfirmasi",shipped:"Kirim",done:"Selesai",cancelled:"Batal"};

  return (
    <div className="acp">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <h3 className="acp-ttl"><Ic.Bell/> Pesanan Masuk</h3>
        <button className="btn-cancel" style={{padding:"4px 10px"}} onClick={onLogout}>Logout</button>
      </div>
      {!selOrd ? (
        <div className="acp-list">
          {orders.length===0&&<p className="chat-empty">Belum ada pesanan masuk</p>}
          {orders.map(o=>(
            <div key={o.id} className="acp-item" onClick={()=>setSelOrd(o)}>
              <div style={{flex:1,minWidth:0}}>
                <p className="acp-pname">{o.productName}</p>
                <p className="acp-buyer">{o.buyerName} · {o.buyerPhone}</p>
                <p className="acp-addr">{o.address?.slice(0,65)}{o.address?.length>65?"…":""}</p>
              </div>
              <div style={{flexShrink:0,textAlign:"right"}}>
                <p className="acp-price">{fRp(o.price)}</p>
                <span style={{color:SC[o.status]||"#888",textTransform:"uppercase",fontSize:".68rem",fontWeight:700}}>
                  {SL[o.status]||o.status||"pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="acp-detail">
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
            <button type="button" className="btn-back" onClick={()=>setSelOrd(null)}>← Kembali</button>
            <button type="button" className="btn-del-order" onClick={()=>deleteOrder(selOrd.id)}>
              <Ic.Trash/> Hapus
            </button>
          </div>
          <div className="acp-order-info">
            <p><strong>{selOrd.productName}</strong> · {fRp(selOrd.price)}</p>
            <p>👤 {selOrd.buyerName} · 📱 {selOrd.buyerPhone}</p>
            <p>📍 {selOrd.address}</p>
            {selOrd.note&&<p>📝 {selOrd.note}</p>}
            {selOrd.buyerConfirmed&&<p style={{color:"var(--green)",fontWeight:600}}>✅ Buyer sudah konfirmasi terima</p>}
          </div>
          <div className="acp-status-row">
            {Object.entries(SL).map(([k,v])=>{
              const cur = selOrd.status || "pending";
              // ── State machine: hanya 1 langkah maju + Batal yang aktif ──
              let disabled = true;
              if (k === cur) {
                // Tombol status saat ini selalu tampil aktif (sebagai indikator)
                disabled = false;
              } else if (k === "cancelled") {
                // Batal selalu jadi escape hatch, KECUALI saat sudah selesai/dibatalkan
                disabled = (cur === "done" || cur === "cancelled");
              } else if (cur === "pending" && k === "paid_pending_confirm") {
                disabled = false; // Pending → Sudah Bayar (biasanya otomatis dari buyer)
              } else if (cur === "paid_pending_confirm" && k === "confirmed") {
                disabled = false; // Sudah Bayar → Konfirmasi
              } else if (cur === "confirmed" && k === "shipped") {
                disabled = false; // Konfirmasi → Kirim
              } else if (cur === "shipped" && k === "done") {
                disabled = false; // Kirim → Selesai
              }
              return (
                <button key={k} type="button"
                  className={`btn-status${selOrd.status===k?" on":""}`}
                  style={selOrd.status===k?{background:SC[k],borderColor:SC[k]}:{}}
                  onClick={()=>updStatus(k)}
                  disabled={disabled}>{v}
                </button>
              );
            })}
          </div>
          <div className="chat-msgs" ref={chatRef} style={{height:220}}>
            {msgs.map(m=>(
              <div key={m.id} className={`cmsg ${m.from==="admin"?"right":m.from==="system"?"center":"left"}`}>
                {m.from==="system"
                  ?<div className="csys">{m.text}</div>
                  :<div style={{display:"flex",flexDirection:"column",
                      alignItems:m.from==="admin"?"flex-end":"flex-start",gap:2}}>
                    <div style={{display:"flex",alignItems:"flex-end",gap:4,
                        flexDirection:m.from==="admin"?"row-reverse":"row"}}>
                      <div className={`cbubble ${m.from==="admin"?"bubble-admin":"bubble-buyer"}`}>{m.text}</div>
                      <button type="button" className="msg-del-btn"
                        onClick={()=>setDelConf(m.id)}><Ic.Trash/></button>
                    </div>
                    <span className="ctime">{m.from==="admin"?"👑 Admin":"👤 "+selOrd.buyerName}</span>
                  </div>
                }
              </div>
            ))}
          </div>
          {delConf&&(
            <div className="del-confirm-bar">
              <span>Hapus pesan ini?</span>
              <button type="button" className="btn-yes-del" onClick={()=>deleteMsg(delConf)}>Ya</button>
              <button type="button" className="btn-no-del" onClick={()=>setDelConf(null)}>Batal</button>
            </div>
          )}
          <div className="chat-inp-row">
            <input className="finput" style={{flex:1}} placeholder="Balas pesan pembeli…"
              value={txt} onChange={e=>setTxt(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send()}/>
            <button type="button" className="btn-send" onClick={send}><Ic.Send/></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────
function ProductDetail({p, onOrder}) {
  const [idx,setIdx]=useState(0);
  const imgs=Array.isArray(p.images)?p.images.filter(i=>typeof i==="string"&&i.startsWith("http")):(p.image?[p.image]:[]);
  const stok=getStock(p);
  const src=imgs[idx]||IMG_PH;
  return (
    <div className="detail">
      <div className="d-img-wrap">
        <img src={src} alt={p.name} className="d-img"
          onError={(e)=>{e.target.onerror=null;e.target.src=IMG_PH;}}/>
        {stok===0&&<div className="sold-out-overlay lg">STOK HABIS</div>}
      </div>
      {imgs.length>1&&(
        <div className="d-thumbs">
          {imgs.map((u,i)=>(
            <img key={i} src={u} alt="" className={`d-thumb${i===idx?" on":""}`}
              onClick={()=>setIdx(i)}
              onError={(e)=>{e.target.onerror=null;e.target.src=IMG_PH;}}/>
          ))}
        </div>
      )}
      <div className="d-body">
        <p className="card-cat"><Ic.Tag/> {normGender(p.gender)||p.category||"—"}</p>
        <h2 className="d-name">{p.name}</h2>
        {p.rating>0&&<Stars val={p.rating}/>}
        <p className="d-price">{fRp(p.price)}</p>
        <div className="d-pills">
          <span className={`spill${stok===0?" out":stok<10?" low":""}`}>{stok===0?"Habis":`${stok} stok`}</span>
          {p.sold>0&&<span className="spill sold">{p.sold} terjual</span>}
          {p.bestSeller&&<span className="bdg bdg-best-seller" style={{position:"static",fontSize:".7rem"}}>Best Seller</span>}
        </div>
        {p.aroma&&<div className="d-section"><p className="d-sec-title">🌸 Aroma</p><p className="d-sec-text">{p.aroma}</p></div>}
        <div className="d-section"><p className="d-sec-title">📋 Deskripsi</p><p className="d-sec-text">{p.desc||p.description||"—"}</p></div>
        <button type="button" className={`btn-order${stok===0?" disabled":""}`}
          onClick={()=>stok>0&&onOrder(p)} disabled={stok===0}>
          {stok===0?"🚫 Stok Habis":"🛒 Pesan Sekarang"}
        </button>
      </div>
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────────────────
function ProductForm({initial,onSave,onCancel,saving}) {
  const blank={name:"",category:"",gender:"",price:"",stock:"",desc:"",images:[],badge:"",bestSeller:false,isActive:true,rating:0,sold:0,aroma:""};
  const [f,setF]=useState(initial?{...blank,...initial}:blank);
  const [iu,setIU]=useState(""); const [file,setFile]=useState(null);
  const [prev,setPrev]=useState(getImg(initial||{})); const [up,setUp]=useState(false);
  const ch=(k,v)=>setF(x=>({...x,[k]:v}));
  const submit=async()=>{
    if(!f.name||!f.price) return alert("Nama & harga wajib!");
    let images=Array.isArray(f.images)?[...f.images]:[];
    if(file){
      setUp(true);
      try{
        const r=ref(storage,`products/${Date.now()}_${file.name}`);
        await uploadBytes(r,file); const url=await getDownloadURL(r);
        images=[url,...images.filter(i=>i!==url)];
      }catch(e){alert("Upload gagal: "+e.message);setUp(false);return;}
      setUp(false);
    }
    onSave({...f,price:Number(f.price),stock:Number(f.stock),rating:Number(f.rating),sold:Number(f.sold),images});
  };
  return (
    <div className="pform">
      <h2 className="pform-ttl">{initial?.id?"Edit Produk":"Tambah Produk"}</h2>
      <div className="pform-imgs">
        <img src={prev||IMG_PH} alt="prev" className="pform-prev" onError={e=>{e.target.onerror=null;e.target.src=IMG_PH;}}/>
        <div className="pform-imgctl">
          <label className="btn-upload"><Ic.Upload/> Upload Foto
            <input type="file" accept="image/*" hidden onChange={e=>{const fl=e.target.files[0];if(!fl)return;setFile(fl);setPrev(URL.createObjectURL(fl));}}/>
          </label>
          <div className="url-row">
            <input className="finput" placeholder="atau paste URL…" value={iu} onChange={e=>setIU(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&iu.startsWith("http")){ch("images",[...(Array.isArray(f.images)?f.images:[]),iu]);setPrev(iu);setIU("");}}}/>
            <button type="button" className="btn-addurl" onClick={()=>{if(iu.startsWith("http")){ch("images",[...(Array.isArray(f.images)?f.images:[]),iu]);setPrev(iu);setIU("");}}}>+</button>
          </div>
        </div>
      </div>
      <div className="pform-grid">
        <div className="fg"><label>Nama *</label><input className="finput" value={f.name} onChange={e=>ch("name",e.target.value)}/></div>
        <div className="fg"><label>Kategori</label><input className="finput" value={f.category} onChange={e=>ch("category",e.target.value)}/></div>
        <div className="fg"><label>Gender</label>
          <select className="finput" value={f.gender} onChange={e=>ch("gender",e.target.value)}>
            <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="unisex">Unisex</option>
          </select></div>
        <div className="fg"><label>Harga (Rp)*</label><input type="number" className="finput" value={f.price} onChange={e=>ch("price",e.target.value)}/></div>
        <div className="fg"><label>Stok</label><input type="number" className="finput" value={f.stock} onChange={e=>ch("stock",e.target.value)}/></div>
        <div className="fg"><label>Rating</label><input type="number" step="0.1" min="0" max="5" className="finput" value={f.rating} onChange={e=>ch("rating",e.target.value)}/></div>
        <div className="fg"><label>Terjual</label><input type="number" className="finput" value={f.sold} onChange={e=>ch("sold",e.target.value)}/></div>
        <div className="fg"><label>Aroma</label><input className="finput" value={f.aroma||""} onChange={e=>ch("aroma",e.target.value)}/></div>
      </div>
      <div className="fg" style={{marginBottom:12}}>
        <label>Deskripsi</label>
        <textarea className="finput ftarea" rows={4} value={f.desc||""} onChange={e=>ch("desc",e.target.value)}/>
      </div>
      <div className="pform-checks">
        <label className="chk"><input type="checkbox" checked={!!f.bestSeller} onChange={e=>ch("bestSeller",e.target.checked)}/> Best Seller</label>
        <label className="chk"><input type="checkbox" checked={!!f.isActive} onChange={e=>ch("isActive",e.target.checked)}/> Aktif/Tampil</label>
      </div>
      <div className="form-acts">
        <button type="button" className="btn-cancel" onClick={onCancel}>Batal</button>
        <button type="button" className="btn-save" onClick={submit} disabled={saving||up}>
          {up?"Uploading…":saving?"Menyimpan…":"Simpan"}
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({p,onConfirm,onCancel,saving}) {
  return (
    <div className="cbox">
      <h3>Hapus Produk?</h3>
      <p>Yakin hapus <strong>{p.name}</strong>?<br/>Tidak bisa dibatalkan.</p>
      <div className="form-acts">
        <button type="button" className="btn-cancel" onClick={onCancel}>Batal</button>
        <button type="button" className="btn-del" onClick={onConfirm} disabled={saving}>{saving?"Menghapus…":"Ya, Hapus"}</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────
export default function App() {
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [cat,          setCat]          = useState("All");
  const [sort,         setSort]         = useState("newest");
  const [selected,     setSelected]     = useState(null);
  const [orderProd,    setOrderProd]    = useState(null);
  const [editP,        setEditP]        = useState(null);
  const [delP,         setDelP]         = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [showLogin,    setShowLogin]    = useState(false);
  const [showACP,      setShowACP]      = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [dark,         setDark]         = useState(true);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [notifCnt,     setNotifCnt]     = useState(0);
  const menuRef = useRef(null);

  // Tutup menu saat klik luar
  useEffect(()=>{
    const h=(e)=>{ if(menuRef.current&&!menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  // Firebase Auth listener
  useEffect(()=>{
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL||"awianton2@gmail.com";
    return onAuthStateChanged(auth,(user)=>{
      if (user&&user.email===adminEmail) setIsAdmin(true);
      else { setIsAdmin(false); if(user) signOut(auth); }
    });
  },[]);

  // Produk realtime
  useEffect(()=>{
    const q=query(collection(db,"products"),orderBy("createdAt","desc"));
    return onSnapshot(q,
      s=>{setProducts(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);},
      e=>{console.error(e);setLoading(false);}
    );
  },[]);

  // Notif badge admin
  useEffect(()=>{
    if(!isAdmin) return;
    const q=query(collection(db,"orders"),where("status","in",["pending","paid_pending_confirm"]));
    return onSnapshot(q,s=>setNotifCnt(s.size));
  },[isAdmin]);

  const GENDERS=["All","Male","Female","Unisex"];
  const matchGender=(p,tab)=>{
    if(tab==="All") return true;
    return normGender(p.gender||"").toLowerCase()===tab.toLowerCase();
  };

  let list=products.filter(p=>{
    if(!isAdmin&&p.isActive===false) return false;
    if(!matchGender(p,cat)) return false;
    const q=search.toLowerCase();
    return !q||(p.name||"").toLowerCase().includes(q)||(p.desc||"").toLowerCase().includes(q);
  });
  if(sort==="price-asc")  list=[...list].sort((a,b)=>(a.price||0)-(b.price||0));
  if(sort==="price-desc") list=[...list].sort((a,b)=>(b.price||0)-(a.price||0));
  if(sort==="name")       list=[...list].sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  if(sort==="rating")     list=[...list].sort((a,b)=>(b.rating||0)-(a.rating||0));
  if(sort==="sold")       list=[...list].sort((a,b)=>(b.sold||0)-(a.sold||0));

  const handleSave=async(data)=>{
    setSaving(true);
    try{
      if(editP?.id){const{id,...r}=data;await updateDoc(doc(db,"products",editP.id),{...r,updatedAt:serverTimestamp()});}
      else{await addDoc(collection(db,"products"),{...data,createdAt:serverTimestamp()});}
      setShowForm(false);setEditP(null);
    }catch(e){alert("Gagal simpan produk: "+e.message);}
    setSaving(false);
  };

  const handleDelete=async()=>{
    setSaving(true);
    try{await deleteDoc(doc(db,"products",delP.id));}
    catch(e){alert("Gagal hapus: "+e.message);}
    setDelP(null);setSaving(false);
  };

  const closeMenu=()=>setMenuOpen(false);
  const handleLogout=()=>{ signOut(auth); setIsAdmin(false); setShowACP(false); };

  // Hitung pesanan aktif user dari localStorage
  const myActiveOrders = lsGet().filter(o=>o.status&&!["done","cancelled"].includes(o.status)).length;

  return (
    <>
      <style>{CSS}</style>
      <div className={`app ${dark?"dark":"light"}`}>

        <header className="hdr">
          <div className="hinner">
            <div className="logo">
              <span className="logo-dot"/>
              <span className="logo-txt">Katalog<em>Pro</em></span>
            </div>
            <div className="hright">
              <button type="button" className="icon-btn" onClick={()=>setDark(d=>!d)}>
                {dark?<Ic.Sun/>:<Ic.Moon/>}
              </button>
              {!isAdmin&&(
                <button type="button" className="icon-btn" onClick={()=>setShowMyOrders(true)}>
                  <Ic.Chat/>
                  {myActiveOrders>0&&<span className="notif-dot">{myActiveOrders}</span>}
                </button>
              )}
              {isAdmin&&(
                <button type="button" className="icon-btn notif-btn" onClick={()=>{setShowACP(true);closeMenu();}}>
                  <Ic.Bell/>
                  {notifCnt>0&&<span className="notif-dot">{notifCnt}</span>}
                </button>
              )}
              <div className="burger-wrap" ref={menuRef}>
                <button type="button" className="icon-btn" onClick={()=>setMenuOpen(o=>!o)}>
                  <Ic.Menu/>
                </button>
                {menuOpen&&(
                  <div className="dropdown">
                    {!isAdmin?(
                      <button type="button" className="dd-item" onClick={()=>{setShowLogin(true);closeMenu();}}>
                        <Ic.Admin/> Login Admin
                      </button>
                    ):(
                      <>
                        <div className="dd-label">Admin Panel</div>
                        <button type="button" className="dd-item gold" onClick={()=>{setEditP(null);setShowForm(true);closeMenu();}}>
                          <Ic.Plus/> Tambah Produk
                        </button>
                        <button type="button" className="dd-item" onClick={()=>{setShowACP(true);closeMenu();}}>
                          <Ic.Chat/> Pesanan {notifCnt>0&&<span className="dd-badge">{notifCnt}</span>}
                        </button>
                        <div className="dd-info">
                          <span>📦 {products.length} produk</span>
                          <span>⚠ {products.filter(p=>getStock(p)<10).length} stok tipis</span>
                          <span>🚫 {products.filter(p=>p.isActive===false).length} nonaktif</span>
                        </div>
                        <div className="dd-divider"/>
                        <button type="button" className="dd-item red" onClick={()=>{handleLogout();closeMenu();}}>
                          Keluar Admin
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="hero">
          <div className="hero-glow"/>
          <p className="hero-eye">Koleksi Parfum</p>
          <p className="hero-sub">{list.length} produk tersedia</p>
        </section>

        <div className="cats">
          {GENDERS.map(g=>(
            <button key={g} type="button" className={`cat-btn${cat===g?" on":""}`} onClick={()=>setCat(g)}>{g}</button>
          ))}
        </div>

        <div className="toolbar">
          <div className="sbox">
            <Ic.Search/>
            <input className="sinp" placeholder="Cari produk…" value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&<button type="button" className="sclr" onClick={()=>setSearch("")}><Ic.Close/></button>}
          </div>
          <select className="ssel" value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="newest">Terbaru</option>
            <option value="price-asc">Harga ↑</option>
            <option value="price-desc">Harga ↓</option>
            <option value="rating">Rating</option>
            <option value="sold">Terlaris</option>
            <option value="name">A–Z</option>
          </select>
        </div>

        <main className="main">
          {loading?(
            <div className="grid2">{[...Array(6)].map((_,i)=><div key={i} className="skel"/>)}</div>
          ):list.length===0?(
            <div className="empty">
              <p style={{fontSize:"2.5rem"}}>📦</p>
              <h3>Tidak ada produk</h3>
              <p>{products.length===0?"Belum ada produk.":"Coba ubah filter."}</p>
            </div>
          ):(
            <div className="grid2">
              {list.map(p=>(
                <ProductCard key={p.id} p={p} onSelect={setSelected} isAdmin={isAdmin}
                  onEdit={p=>{setEditP(p);setShowForm(true);}} onDelete={setDelP}/>
              ))}
            </div>
          )}
        </main>

        <footer className="ftr">© 2026 Katalog Parfum — By:Parevie</footer>

        <Modal open={!!selected}     onClose={()=>setSelected(null)}>
          {selected&&<ProductDetail p={selected} onOrder={p=>{setSelected(null);setOrderProd(p);}}/>}
        </Modal>
        <Modal open={!!orderProd}    onClose={()=>setOrderProd(null)}>
          {orderProd&&<OrderModal p={orderProd}/>}
        </Modal>
        <Modal open={showForm}       onClose={()=>{setShowForm(false);setEditP(null);}}>
          <ProductForm initial={editP} onSave={handleSave} saving={saving}
            onCancel={()=>{setShowForm(false);setEditP(null);}}/>
        </Modal>
        <Modal open={!!delP}         onClose={()=>setDelP(null)}>
          {delP&&<ConfirmDelete p={delP} onConfirm={handleDelete} onCancel={()=>setDelP(null)} saving={saving}/>}
        </Modal>
        <Modal open={showLogin}      onClose={()=>setShowLogin(false)}>
          <AdminLogin onLogin={()=>setShowLogin(false)}/>
        </Modal>
        <Modal open={showMyOrders}   onClose={()=>setShowMyOrders(false)}>
          <UserChatPanel/>
        </Modal>
        <Modal open={showACP}        onClose={()=>setShowACP(false)}>
          <AdminChatPanel onLogout={handleLogout}/>
        </Modal>
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.dark{--bg:#0d0d14;--bg2:#12121c;--bg3:#1e1e2c;--card:#16162288;--border:#ffffff13;--gold:#c9a84c;--gold2:#f0d080;--accent:#7c6af5;--red:#e05a5a;--green:#4caf82;--text:#f0ede8;--text2:#b0acbc;--text3:#62606c;--star-off:#333;--shd:0 8px 32px rgba(0,0,0,.55);--modal:#12121c;--hdr:rgba(13,13,20,.95);--hero-glow:radial-gradient(ellipse 80% 50% at 50% 0%,#c9a84c14 0%,transparent 70%)}
.light{--bg:#f4f1eb;--bg2:#fff;--bg3:#e8e4da;--card:#ffffffd0;--border:#00000010;--gold:#9a6e18;--gold2:#c18a20;--accent:#5548cc;--red:#c03030;--green:#1e7a48;--text:#18160f;--text2:#48443c;--text3:#88847a;--star-off:#ccc;--shd:0 8px 28px rgba(0,0,0,.13);--modal:#fff;--hdr:rgba(244,241,235,.96);--hero-glow:radial-gradient(ellipse 80% 50% at 50% 0%,#c9a84c1a 0%,transparent 70%)}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;transition:background .25s,color .25s}
.app{display:flex;flex-direction:column;min-height:100vh;background:var(--bg)}
.hdr{position:sticky;top:0;z-index:100;background:var(--hdr);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.hinner{max-width:900px;margin:0 auto;padding:0 14px;height:52px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:8px}
.logo-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px var(--gold)}
.logo-txt{font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--text)}
.logo-txt em{color:var(--gold);font-style:italic}
.hright{display:flex;align-items:center;gap:5px}
.icon-btn{width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;position:relative}
.icon-btn:hover{border-color:var(--gold);color:var(--gold)}
.notif-dot{position:absolute;top:-3px;right:-3px;min-width:17px;height:17px;border-radius:9px;background:var(--red);color:#fff;font-size:.58rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;border:2px solid var(--bg)}
.burger-wrap{position:relative}
.dropdown{position:absolute;top:calc(100% + 8px);right:0;min-width:200px;background:var(--modal);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shd);overflow:hidden;z-index:200;animation:fadedown .18s ease}
@keyframes fadedown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.dd-label{padding:10px 14px 4px;font-size:.68rem;letter-spacing:.09em;text-transform:uppercase;color:var(--text3);font-weight:600}
.dd-item{width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;border:none;background:transparent;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:.85rem;cursor:pointer;text-align:left;transition:background .15s}
.dd-item:hover{background:var(--bg3)}
.dd-item.gold{color:var(--gold);font-weight:600}
.dd-item.red{color:var(--red)}
.dd-badge{margin-left:auto;min-width:18px;height:18px;border-radius:9px;background:var(--red);color:#fff;font-size:.62rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
.dd-info{padding:8px 14px;background:var(--bg3);font-size:.74rem;color:var(--text3);display:flex;flex-direction:column;gap:3px}
.dd-divider{height:1px;background:var(--border);margin:2px 0}
.hero{position:relative;overflow:hidden;padding:18px 16px 12px;text-align:center}
.hero-glow{position:absolute;inset:0;background:var(--hero-glow);pointer-events:none}
.hero-eye{display:inline-block;padding:3px 14px;border:1px solid var(--gold);border-radius:18px;color:var(--gold);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}
.hero-sub{color:var(--text3);font-size:.84rem}
.cats{display:flex;gap:6px;padding:8px 14px;overflow-x:auto;scrollbar-width:none;max-width:900px;margin:0 auto;width:100%}
.cats::-webkit-scrollbar{display:none}
.cat-btn{padding:6px 18px;border-radius:20px;border:1px solid var(--border);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:500;color:var(--text3);background:var(--bg3);white-space:nowrap;transition:all .2s;flex-shrink:0}
.cat-btn:hover{border-color:var(--gold);color:var(--text2)}
.cat-btn.on{background:var(--gold);color:#0d0d14;font-weight:700;border-color:var(--gold)}
.toolbar{max-width:900px;margin:0 auto;padding:6px 14px 10px;display:flex;gap:8px;align-items:center}
.sbox{flex:1;display:flex;align-items:center;gap:8px;padding:9px 13px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;transition:border-color .2s}
.sbox:focus-within{border-color:var(--gold)}
.sbox svg{color:var(--text3);flex-shrink:0}
.sinp{flex:1;background:none;border:none;outline:none;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.87rem}
.sinp::placeholder{color:var(--text3)}
.sclr{background:none;border:none;cursor:pointer;color:var(--text3);display:flex;padding:0}
.ssel{padding:9px 11px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.82rem;cursor:pointer;outline:none;flex-shrink:0}
.main{flex:1;max-width:900px;margin:0 auto;padding:6px 12px 48px;width:100%}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
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
.bdg-inactive{position:absolute;bottom:7px;left:7px;padding:2px 8px;border-radius:5px;font-size:.62rem;font-weight:700;background:rgba(0,0,0,.65);color:#999;border:1px solid #fff2}
.sold-out-overlay{position:absolute;inset:0;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;letter-spacing:.12em;color:#fff;backdrop-filter:blur(2px)}
.sold-out-overlay.lg{font-size:1.4rem}
.card-body{padding:10px}
.card-cat{display:flex;align-items:center;gap:4px;font-size:.67rem;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.card-name{font-family:'Playfair Display',serif;font-size:.9rem;line-height:1.3;margin-bottom:5px;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.stars{display:flex;align-items:center;gap:1px;font-size:.78rem;margin-bottom:5px}
.rnum{font-size:.68rem;color:var(--text3);margin-left:3px}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:4px;flex-wrap:wrap}
.card-price{font-size:.88rem;font-weight:700;color:var(--gold)}
.spill{padding:2px 7px;border-radius:5px;font-size:.63rem;font-weight:500;background:#4caf8220;color:var(--green);border:1px solid #4caf8230;white-space:nowrap}
.spill.low{background:#e05a5a20;color:var(--red);border-color:#e05a5a30}
.spill.out{background:#e05a5a;color:#fff;border-color:#e05a5a}
.spill.sold{background:#7c6af520;color:var(--accent);border-color:#7c6af530}
.card-sold{font-size:.65rem;color:var(--text3);margin-top:3px}
.skel{border-radius:12px;aspect-ratio:3/4;background:linear-gradient(90deg,var(--bg3) 25%,var(--bg2) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shim 1.4s infinite}
@keyframes shim{to{background-position:-200% 0}}
.empty{text-align:center;padding:56px 16px}
.empty h3{font-family:'Playfair Display',serif;font-size:1.2rem;margin:10px 0 6px;color:var(--text)}
.empty p{color:var(--text3);font-size:.85rem}
.ftr{text-align:center;padding:18px;border-top:1px solid var(--border);color:var(--text3);font-size:.76rem}
.overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center}
.modal-box{background:var(--modal);border:1px solid var(--border);border-radius:20px 20px 0 0;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;position:relative;box-shadow:var(--shd);scrollbar-width:thin;scrollbar-color:var(--border) transparent;animation:slideup .25s ease}
@keyframes slideup{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-handle{width:40px;height:4px;border-radius:2px;background:var(--border);margin:10px auto 0}
.modal-close{position:absolute;top:10px;right:12px;width:30px;height:30px;border-radius:50%;border:1px solid var(--border);background:var(--bg3);color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;transition:all .2s}
.modal-close:hover{border-color:var(--red);color:var(--red)}
.detail{display:flex;flex-direction:column;width:100%}
.d-img-wrap{width:100%;overflow:hidden;background:var(--bg3);line-height:0;position:relative}
.d-img{width:100%;max-height:320px;object-fit:contain;display:block}
.d-thumbs{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;scrollbar-width:none;background:var(--bg3)}
.d-thumbs::-webkit-scrollbar{display:none}
.d-thumb{width:52px;height:52px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;flex-shrink:0;transition:border-color .2s}
.d-thumb.on,.d-thumb:hover{border-color:var(--gold)}
.d-body{padding:16px}
.d-name{font-family:'Playfair Display',serif;font-size:1.4rem;line-height:1.25;margin:6px 0;color:var(--text)}
.d-price{font-size:1.25rem;font-weight:700;color:var(--gold);margin:8px 0 10px}
.d-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.d-section{margin-bottom:12px;padding:11px 13px;background:var(--bg3);border-radius:10px;border-left:3px solid var(--gold)}
.d-sec-title{font-size:.72rem;font-weight:700;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.d-sec-text{font-size:.85rem;color:var(--text2);line-height:1.75}
.btn-order{width:100%;padding:13px;border-radius:10px;border:none;background:var(--gold);color:#0d0d14;font-weight:700;font-size:.9rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;margin-top:6px}
.btn-order:hover:not(.disabled){background:var(--gold2)}
.btn-order.disabled{background:var(--bg3);color:var(--text3);cursor:not-allowed;border:1px solid var(--border)}
.ord-wrap{padding:16px}
.ord-hdr{display:flex;gap:12px;align-items:center;padding:12px;background:var(--bg3);border-radius:10px;margin-bottom:16px}
.ord-thumb{width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0}
.ord-pname{font-family:'Playfair Display',serif;font-size:1rem;color:var(--text);margin-bottom:4px}
.ord-price{font-weight:700;color:var(--gold);font-size:.95rem}
.ord-body{display:flex;flex-direction:column;gap:12px}
.btn-loc{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;border:1px solid var(--gold);background:transparent;color:var(--gold);cursor:pointer;font-size:.78rem;font-family:'DM Sans',sans-serif;margin-top:6px;transition:all .2s}
.btn-loc:hover,.btn-loc:active{background:#c9a84c18}
.btn-loc.loading{opacity:.7;cursor:wait}
.btn-loc.done{border-color:var(--green);color:var(--green);background:#4caf8210}
.loc-msg{font-size:.75rem;margin-top:4px;padding:6px 8px;border-radius:6px;background:var(--bg3)}
.loc-msg.ok{color:var(--green)}
.loc-msg.err{color:var(--red)}
.ord-info{padding:10px 12px;background:var(--bg3);border-radius:8px;font-size:.8rem;color:var(--text2);line-height:1.9;border-left:3px solid var(--gold)}
/* Courier type radio selector */
.courier-radio-group{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.courier-radio{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border:1px solid var(--border);border-radius:10px;background:var(--bg3);cursor:pointer;font-family:'DM Sans',sans-serif;color:var(--text2);transition:all .2s;text-align:center}
.courier-radio:hover{border-color:var(--gold)}
.courier-radio.on{border-color:var(--gold);background:#c9a84c14;color:var(--text)}
.courier-icon{font-size:1.3rem}
.courier-radio span:last-child{font-size:.72rem;line-height:1.3}
.courier-radio small{color:var(--text3);font-size:.62rem}
.courier-radio.on small{color:var(--gold)}
.ship-manual-note{padding:11px 13px;background:#7c6af514;border:1px solid #7c6af530;border-radius:10px;font-size:.8rem;color:var(--text2);line-height:1.7}
.ship-manual-note strong{color:var(--accent)}
.ord-total-note{font-size:.7rem;color:var(--text3);margin-top:2px;font-style:italic}
/* Shipping cost UI */
.ship-section{position:relative}
.ship-city-search{position:relative;display:flex;align-items:center}
.ship-loading-dot{position:absolute;right:10px;font-size:.8rem}
.ship-city-list{margin-top:4px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;overflow:hidden;max-height:160px;overflow-y:auto}
.ship-city-item{display:block;width:100%;text-align:left;padding:9px 12px;border:none;background:transparent;color:var(--text2);font-size:.8rem;cursor:pointer;font-family:'DM Sans',sans-serif;border-bottom:1px solid var(--border)}
.ship-city-item:last-child{border-bottom:none}
.ship-city-item:hover{background:var(--bg2);color:var(--gold)}
.ship-msg{font-size:.78rem;color:var(--text3);margin-top:6px}
.ship-msg.err{color:var(--red)}
.ship-options{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.ship-option{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);cursor:pointer;font-family:'DM Sans',sans-serif;color:var(--text2);transition:all .2s;text-align:left}
.ship-option:hover{border-color:var(--gold)}
.ship-option.on{border-color:var(--gold);background:#c9a84c14}
.ship-option strong{font-size:.82rem;color:var(--text);display:block}
.ship-option p{font-size:.72rem;color:var(--text3);margin-top:2px}
.ship-option span{font-weight:700;color:var(--gold);font-size:.85rem;flex-shrink:0;margin-left:10px}
.ord-total-box{padding:12px;background:var(--bg3);border-radius:10px;display:flex;flex-direction:column;gap:6px}
.ord-total-row{display:flex;justify-content:space-between;font-size:.82rem;color:var(--text2)}
.ord-total-row.total{padding-top:8px;border-top:1px solid var(--border);font-weight:700;font-size:.95rem;color:var(--text)}
.ord-total-row.total span:last-child{color:var(--gold)}
.qris-head{display:flex;align-items:center;gap:8px;padding:16px 16px 0;font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--text)}
.qris-body{padding:16px;text-align:center}
.qris-amount{font-size:1.6rem;font-weight:700;color:var(--gold);margin-bottom:4px}
.qris-img-wrap{width:220px;height:220px;margin:0 auto 16px;border-radius:14px;overflow:hidden;border:2px solid var(--gold);background:var(--bg3);display:flex;align-items:center;justify-content:center}
.qris-img{width:100%;height:100%;object-fit:contain}
.qris-steps{text-align:left;padding:12px;background:var(--bg3);border-radius:10px;margin-bottom:16px;font-size:.82rem;color:var(--text2);line-height:2}
.chat-wrap{display:flex;flex-direction:column;height:480px}
.chat-hdr{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--border);font-weight:600;color:var(--text);flex-shrink:0}
.chat-status{margin-left:auto;font-size:.72rem;color:var(--green)}
.chat-info{padding:7px 16px;background:var(--bg3);font-size:.74rem;color:var(--text3);border-bottom:1px solid var(--border);flex-shrink:0}
.status-bar{padding:7px 16px;font-size:.78rem;font-weight:600;border-bottom:1px solid;flex-shrink:0}
.chat-msgs{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.chat-empty{text-align:center;color:var(--text3);font-size:.83rem;margin:auto;padding:20px}
.cmsg{display:flex;flex-direction:column;gap:2px}
.cmsg.right{align-items:flex-end}
.cmsg.left{align-items:flex-start}
.cmsg.center{align-items:center}
.cbubble{max-width:78%;padding:9px 13px;border-radius:14px;font-size:.84rem;line-height:1.5;word-break:break-word}
.bubble-admin{background:var(--gold);color:#0d0d14;border-radius:14px 14px 4px 14px}
.bubble-buyer{background:var(--bg3);color:var(--text);border-radius:14px 14px 14px 4px;border:1px solid var(--border)}
.csys{font-size:.75rem;color:var(--text3);background:var(--bg3);padding:6px 12px;border-radius:10px;text-align:center;max-width:85%;border:1px solid var(--border)}
.ctime{font-size:.64rem;color:var(--text3);margin-top:1px}
.chat-inp-row{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border);flex-shrink:0}
.btn-send{width:40px;height:40px;border-radius:10px;border:none;background:var(--gold);color:#0d0d14;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.btn-send:hover{background:var(--gold2)}
.btn-back-chat{background:none;border:none;color:var(--gold);cursor:pointer;font-size:1rem;padding:0 4px}
.msg-del-btn{width:22px;height:22px;border-radius:6px;border:none;background:transparent;color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:all .2s;flex-shrink:0}
.cmsg:hover .msg-del-btn{opacity:1}
.msg-del-btn:hover{background:var(--red);color:#fff}
.del-confirm-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#e05a5a18;border-top:1px solid #e05a5a33;font-size:.8rem;color:var(--text2)}
.del-confirm-bar span{flex:1}
.btn-yes-del{padding:4px 12px;border-radius:6px;border:none;background:var(--red);color:#fff;font-size:.78rem;cursor:pointer;font-family:'DM Sans',sans-serif}
.btn-no-del{padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:.78rem;cursor:pointer;font-family:'DM Sans',sans-serif}
/* Buyer confirm box */
.buyer-confirm-box{padding:10px 14px;border-bottom:1px solid var(--border);flex-shrink:0}
.btn-buyer-confirm{width:100%;padding:11px;border-radius:10px;border:none;background:#4caf82;color:#fff;font-weight:700;font-size:.88rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.btn-buyer-confirm:hover:not(:disabled){background:#3d9e70}
.btn-buyer-confirm:disabled{opacity:.6;cursor:not-allowed}
/* Buyer thankyou box — permanen setelah konfirmasi */
.buyer-thankyou-box{padding:14px 16px;background:#4caf8218;border-bottom:1px solid #4caf8233;flex-shrink:0;text-align:center}
.buyer-thankyou-title{font-family:'Playfair Display',serif;font-size:1rem;color:var(--green);margin-bottom:4px;font-weight:700}
.buyer-thankyou-sub{font-size:.8rem;color:var(--text2);line-height:1.6;margin-bottom:10px}
.btn-wa-help{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;background:#25d366;color:#fff;font-weight:600;font-size:.8rem;text-decoration:none;transition:all .2s}
.btn-wa-help:hover{background:#1da851}
/* Admin panel */
.acp{padding:16px;min-height:380px}
.acp-ttl{font-family:'Playfair Display',serif;font-size:1.1rem;margin-bottom:0;display:flex;align-items:center;gap:7px;color:var(--text)}
.acp-list{display:flex;flex-direction:column;gap:8px}
.acp-item{display:flex;justify-content:space-between;gap:10px;padding:12px;background:var(--bg3);border-radius:10px;cursor:pointer;border:1px solid var(--border);transition:border-color .2s}
.acp-item:hover{border-color:var(--gold)}
.acp-pname{font-weight:600;font-size:.88rem;color:var(--text);margin-bottom:2px}
.acp-buyer{font-size:.78rem;color:var(--text2);margin-bottom:2px}
.acp-addr{font-size:.72rem;color:var(--text3)}
.acp-price{font-weight:700;color:var(--gold);font-size:.85rem;margin-bottom:4px}
.acp-detail{display:flex;flex-direction:column;gap:10px}
.btn-back{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;font-size:.8rem;font-family:'DM Sans',sans-serif;transition:all .2s}
.btn-back:hover{background:var(--bg3)}
.btn-del-order{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;border:1px solid #e05a5a44;background:transparent;color:var(--red);cursor:pointer;font-size:.78rem;font-family:'DM Sans',sans-serif}
.btn-del-order:hover{background:#e05a5a18}
.acp-order-info{padding:10px 12px;background:var(--bg3);border-radius:8px;font-size:.82rem;color:var(--text2);line-height:1.9;border-left:3px solid var(--gold)}
.acp-status-row{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px}
.btn-status{padding:5px 10px;border-radius:14px;border:1px solid var(--border);background:transparent;color:var(--text3);font-size:.72rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;text-transform:capitalize}
.btn-status:hover:not(:disabled){border-color:var(--gold);color:var(--gold)}
.btn-status.on{color:#0d0d14;font-weight:700}
.btn-status:disabled{opacity:.3;cursor:not-allowed;background:transparent!important;border-color:var(--border)!important;color:var(--text3)!important}
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
.ftarea{resize:vertical;min-height:80px}
.pform-checks{display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.chk{display:flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text2);cursor:pointer}
.form-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
.btn-cancel{padding:9px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.84rem;transition:all .2s}
.btn-cancel:hover{background:var(--bg3)}
.btn-save{padding:9px 20px;border-radius:8px;border:none;background:var(--gold);color:#0d0d14;font-weight:700;font-size:.84rem;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.btn-save:hover:not(:disabled){background:var(--gold2)}
.btn-save:disabled,.btn-del:disabled{opacity:.5;cursor:not-allowed}
.btn-del{padding:9px 20px;border-radius:8px;border:none;background:var(--red);color:#fff;font-weight:700;font-size:.84rem;cursor:pointer;font-family:'DM Sans',sans-serif}
.alog{padding:28px 20px;text-align:center}
.alog-ico{width:46px;height:46px;border-radius:12px;background:#c9a84c18;border:1px solid var(--gold);color:var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.alog h3{font-family:'Playfair Display',serif;font-size:1.2rem;margin-bottom:6px;color:var(--text)}
.alog p{color:var(--text3);margin-bottom:12px;font-size:.83rem}
.errmsg{color:var(--red);font-size:.76rem;margin-top:5px}
.cbox{padding:26px 20px;text-align:center}
.cbox h3{font-family:'Playfair Display',serif;font-size:1.15rem;margin-bottom:10px;color:var(--text)}
.cbox p{color:var(--text2);margin-bottom:20px;font-size:.85rem;line-height:1.6}
@media(max-width:400px){.grid2{gap:7px}.pform-grid{grid-template-columns:1fr}}
`;
