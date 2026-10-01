(function () {
"use strict";

/* =========================================================
   PENGATURAN - ubah sesuai restoranmu
   ========================================================= */
var CONFIG = {
  NAMA: "AiSiang",        // nama restoran (dipakai di pesan WhatsApp)
  WA: "6285101708389",    // nomor WhatsApp (format 62..., tanpa + atau 0 di depan)
  OPEN: 7,               // jam buka (0-23)
  CLOSE: 22,              // jam tutup (0-23)
  FEE: 8000,              // ongkos antar
  MINDEL: 40000,          // minimal subtotal untuk antar
  PROMO: { SARI10: 0.10 } // kode promo: besar diskon (0.10 = 10%)
};

/* =========================================================
   DATA MENU
   id = nomor unik (tidak boleh sama)
   c  = kategori, n = nama, p = harga (angka saja, tanpa titik)
   d  = keterangan (boleh dihapus)
   o  = pilihan. Isinya teks biasa, atau { n: "Panas", p: 3000 }
        kalau pilihan itu punya harga sendiri.
   x  = tambahan berbayar, contoh: x: [{ n: "Tambah telur", p: 5000 }]
   k: 1 = pilihan chef,  s: 1 = habis
   ========================================================= */
var PEDAS = { g: "Level pedas", v: ["Tidak pedas", "Pedas"] };
var MASAK = { g: "Cara masak", v: ["Kuah", "Goreng"] };

var MENU = [
  // ----- HIDANGAN UTAMA -----
  { id: 1,  c: "Hidangan utama", n: "Nasi Goreng", p: 35000, o: [PEDAS] },
  { id: 2,  c: "Hidangan utama", n: "Mie",         p: 35000, o: [MASAK] },
  { id: 3,  c: "Hidangan utama", n: "Ifumie",      p: 35000, o: [MASAK] },
  { id: 4,  c: "Hidangan utama", n: "Bihun",       p: 35000, o: [MASAK] },
  { id: 5,  c: "Hidangan utama", n: "Kwetiau",     p: 35000, o: [MASAK, { g: "Jenis", v: ["Biasa", "Kangkung belacan"] }] },
  { id: 6,  c: "Hidangan utama", n: "Capcai",      p: 50000 },
  { id: 7,  c: "Hidangan utama", n: "Nasi Ayam",   p: 43000 },
  { id: 8,  c: "Hidangan utama", n: "Bubur Ayam",  p: 25000 },

  // ----- MINUMAN -----
  { id: 9,  c: "Minuman", n: "Teh Pahit", p: 7000,  o: [{ g: "Penyajian", v: [{ n: "Dingin", p: 7000 }, { n: "Panas", p: 3000 }] }] },
  { id: 10, c: "Minuman", n: "Teh Manis", p: 10000, o: [{ g: "Penyajian", v: [{ n: "Dingin", p: 10000 }, { n: "Panas", p: 5000 }] }] },
  { id: 11, c: "Minuman", n: "Fruit Tea", p: 13000 },
  { id: 12, c: "Minuman", n: "Badak",     p: 15000 },
  { id: 13, c: "Minuman", n: "Aqua",      p: 5000 },
  { id: 14, c: "Minuman", n: "Teh Bunga", p: 13000 },
  { id: 15, c: "Minuman", n: "Kundur",    p: 13000 }
];

/* =========================================================
   UTILITAS
   ========================================================= */
function $(id) { return document.getElementById(id); }
function rp(n) { return "Rp" + n.toLocaleString("id-ID"); }
function jam(h) { return (h < 10 ? "0" : "") + h + ".00"; }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
function setText(id, t) { var e = $(id); if (e) e.textContent = t; }
function on(id, ev, fn) { var e = $(id); if (e) e.addEventListener(ev, fn); }
function closeDlg(id) { var d = $(id); if (d && d.open) d.close(); }
function openDlg(id) {
  var d = $(id);
  if (!d) return;
  if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
}

var store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privat */ } }
};

var CATS = ["Semua"];
MENU.forEach(function (m) { if (CATS.indexOf(m.c) < 0) CATS.push(m.c); });
var TYPES = { DINE: "Makan di tempat", TAKE: "Bawa pulang", DEL: "Antar ke alamat" };

var state = {
  cart: loadCart(),
  cat: "Semua",
  q: "",
  promo: "",
  cur: null,      // menu yang sedang dipilih opsinya
  prevType: null,
  fields: {}      // isi kolom meja/alamat/jam per jenis pesanan
};

function findMenu(id) {
  for (var i = 0; i < MENU.length; i++) if (MENU[i].id === id) return MENU[i];
  return null;
}

function loadCart() {
  var saved = store.get("sr_cart", []);
  if (!Array.isArray(saved)) return [];
  return saved.filter(function (l) {
    var m = findMenu(l.id);
    // buang isi keranjang lama kalau menunya sudah diganti
    return m && !m.s && m.n === l.n && l.q > 0 && typeof l.u === "number";
  });
}
function saveCart() { store.set("sr_cart", state.cart); }

function isOpen() {
  var h = new Date().getHours();
  return h >= CONFIG.OPEN && h < CONFIG.CLOSE;
}

function typeValue() { var t = $("ty"); return t ? t.value : TYPES.DINE; }
function fieldValue(id) { var e = $(id); return e ? e.value.trim() : ""; }

/* =========================================================
   TEMA
   ========================================================= */
var SUN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
var MOON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';

function currentTheme() {
  var t = document.documentElement.getAttribute("data-theme");
  if (t) return t;
  return window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function applyTheme(t) {
  if (t) document.documentElement.setAttribute("data-theme", t);
  var now = currentTheme();
  var btn = $("theme");
  if (btn) btn.innerHTML = now === "dark" ? SUN : MOON;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", now === "dark" ? "#160d0f" : "#faf5eb");
}

/* =========================================================
   RENDER
   ========================================================= */
function renderStatus() {
  var e = $("st");
  if (!e) return;
  var o = isOpen(), h = new Date().getHours();
  e.textContent = o
    ? "Buka sekarang, sampai pukul " + jam(CONFIG.CLOSE)
    : "Sedang tutup, buka " + (h >= CONFIG.CLOSE ? "besok " : "") + "pukul " + jam(CONFIG.OPEN);
  e.className = "st" + (o ? "" : " off");
}

function renderTabs() {
  var t = $("tabs");
  if (!t) return;
  t.innerHTML = CATS.map(function (c) {
    return '<button type="button" aria-pressed="' + (c === state.cat) + '" data-c="' + esc(c) + '">' + esc(c) + "</button>";
  }).join("");
}

// Pilihan bisa berupa teks ("Kuah") atau objek ({ n: "Panas", p: 3000 })
function optName(v) { return typeof v === "object" ? v.n : v; }
function optCost(v) { return typeof v === "object" && typeof v.p === "number" ? v.p : null; }

// Harga yang tampil di daftar menu: satu harga, atau rentang kalau pilihan punya harga sendiri
function priceLabel(m) {
  var all = [];
  (m.o || []).forEach(function (g) {
    g.v.forEach(function (v) { var c = optCost(v); if (c !== null) all.push(c); });
  });
  if (!all.length) return rp(m.p);
  var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
  return lo === hi ? rp(lo) : rp(lo) + " - " + rp(hi);
}

function qtyInCart(id) {
  return state.cart.reduce(function (s, l) { return l.id === id ? s + l.q : s; }, 0);
}

function renderList() {
  var list = $("list");
  if (!list) return;
  var f = MENU.filter(function (m) {
    return (state.cat === "Semua" || m.c === state.cat) &&
      (m.n + " " + (m.d || "")).toLowerCase().indexOf(state.q) >= 0;
  });
  var html = CATS.slice(1).map(function (c) {
    var items = f.filter(function (m) { return m.c === c; });
    if (!items.length) return "";
    return '<h3 class="cg">' + esc(c) + '</h3><ul class="menu">' + items.map(function (m) {
      var n = qtyInCart(m.id);
      return '<li class="dish' + (m.s ? " out" : "") + '">' +
        '<div class="hd"><h3>' + esc(m.n) + '</h3><i class="dots"></i><span class="pr">' + priceLabel(m) + "</span></div>" +
        "<div>" + (m.d ? "<p>" + esc(m.d) + "</p>" : "") + (m.k ? '<span class="tag">Pilihan chef</span>' : "") + "</div>" +
        '<button type="button" class="add" data-i="' + m.id + '"' + (m.s ? " disabled" : "") + ">" +
        (m.s ? "Habis" : "Tambah") + (n ? '<span class="n">' + n + "</span>" : "") +
        "</button></li>";
    }).join("") + "</ul>";
  }).join("");
  list.innerHTML = html || '<div class="empty">Menu tidak ditemukan. Coba kata lain.</div>';
}

function calc() {
  var sub = state.cart.reduce(function (s, l) { return s + l.u * l.q; }, 0);
  var ty = typeValue();
  var rate = CONFIG.PROMO[state.promo] || 0;
  var disc = Math.round(sub * rate);
  var fee = ty === TYPES.DEL && sub > 0 ? CONFIG.FEE : 0;
  return { sub: sub, disc: disc, fee: fee, tot: sub - disc + fee, ty: ty };
}

function renderBar(bump) {
  var b = $("open");
  var n = state.cart.reduce(function (s, l) { return s + l.q; }, 0);
  var open = isOpen();
  if (b) {
    // Keranjang tetap bisa dibuka saat tutup.
    b.disabled = !n;
    b.innerHTML = n
      ? "<span>Lihat pesanan (" + n + ")" + (open ? "" : " - sedang tutup") + "</span><span>" + rp(calc().sub) + "</span>"
      : (open ? "Pilih menu untuk mulai memesan" : "Sedang tutup, buka pukul " + jam(CONFIG.OPEN));
    if (bump) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  // Tombol kirim selalu aktif. Saat tutup, pesanan dikirim sebagai pesanan untuk jam buka berikutnya.
  var s = $("send");
  if (s) {
    s.disabled = false;
    s.textContent = open ? "Kirim pesanan lewat WhatsApp" : "Kirim pesanan (diproses mulai pukul " + jam(CONFIG.OPEN) + ")";
  }
}

function renderRows() {
  if (!state.cart.length) { closeDlg("dlg"); return; }
  var rows = $("rows");
  if (rows) {
    rows.innerHTML = state.cart.map(function (l, i) {
      return '<div class="row"><div>' + esc(l.n) + (l.opt ? "<small>" + esc(l.opt) + "</small>" : "") +
        '<div class="qt">' +
        '<button type="button" data-k="' + i + '" data-a="-" aria-label="Kurangi">-</button>' +
        "<b>" + l.q + "</b>" +
        '<button type="button" data-k="' + i + '" data-a="+" aria-label="Tambah">+</button>' +
        "</div></div><span>" + rp(l.u * l.q) + "</span></div>";
    }).join("");
  }

  var c = calc();
  var s = '<div class="row"><span>Subtotal</span><span>' + rp(c.sub) + "</span></div>";
  if (c.disc) s += '<div class="row"><span>Diskon (' + esc(state.promo) + ")</span><span>-" + rp(c.disc) + "</span></div>";
  if (c.fee) s += '<div class="row"><span>Ongkos antar</span><span>' + rp(c.fee) + "</span></div>";
  s += '<div class="row t"><span>Total</span><span>' + rp(c.tot) + "</span></div>";
  if (c.ty === TYPES.DEL && c.sub < CONFIG.MINDEL)
    s += '<div class="hint">Minimal pesanan antar ' + rp(CONFIG.MINDEL) + ", kurang " + rp(CONFIG.MINDEL - c.sub) + " lagi.</div>";
  var sum = $("sum");
  if (sum) sum.innerHTML = s;
  renderFieldLabel();
}

function fieldLabel() {
  var ty = typeValue();
  if (ty === TYPES.DINE) return "Nomor meja";
  if (ty === TYPES.DEL) return "Alamat lengkap";
  return "Jam ambil (opsional)";
}

function renderFieldLabel() {
  var ty = typeValue(), nt = $("nt");
  setText("ntl", fieldLabel());
  if (!nt) return;
  if (ty === TYPES.DINE) nt.placeholder = "Contoh: 7";
  else if (ty === TYPES.DEL) nt.placeholder = "Jalan, nomor rumah, patokan";
  else nt.placeholder = "Contoh: 19.30";
}

/* =========================================================
   TOAST (notifikasi kecil)
   ========================================================= */
var toastTimer;
function toast(msg) {
  var t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
}

/* =========================================================
   KERANJANG
   ========================================================= */
function addToCart(m, opt, u) {
  var l = null;
  state.cart.forEach(function (x) { if (x.id === m.id && x.opt === opt) l = x; });
  if (l) l.q++;
  else state.cart.push({ id: m.id, n: m.n, opt: opt, u: u, q: 1 });
  saveCart();
  renderBar(true);
  renderList();
  toast(m.n + " ditambahkan");
}

/* Dialog opsi menu */
function showOpts(m) {
  state.cur = m;
  setText("ot", m.n);
  var h = "";
  (m.o || []).forEach(function (g, i) {
    h += '<div class="gl">' + esc(g.g) + "</div>" + g.v.map(function (v, j) {
      var name = optName(v), cost = optCost(v);
      return '<label class="opt"><input type="radio" name="g' + i + '" value="' + esc(name) + '"' +
        (cost !== null ? ' data-base="' + cost + '"' : "") + (j ? "" : " checked") + "><span>" + esc(name) + "</span>" +
        (cost !== null ? "<span>" + rp(cost) + "</span>" : "") + "</label>";
    }).join("");
  });
  if (m.x) {
    h += '<div class="gl">Tambahan</div>' + m.x.map(function (x) {
      return '<label class="opt"><input type="checkbox" data-p="' + x.p + '" value="' + esc(x.n) + '"><span>' + esc(x.n) + "</span><span>+" + rp(x.p) + "</span></label>";
    }).join("");
  }
  var ob = $("ob");
  if (ob) ob.innerHTML = h;
  optPrice();
  openDlg("od");
}

function optPrice() {
  var u = state.cur ? state.cur.p : 0;
  var ob = $("ob");
  if (ob) {
    // pilihan yang punya harga sendiri (misal teh panas) mengganti harga dasar
    var base = ob.querySelector("input[type=radio][data-base]:checked");
    if (base) u = Number(base.getAttribute("data-base"));
    var checks = ob.querySelectorAll("input[type=checkbox]:checked");
    for (var i = 0; i < checks.length; i++) u += Number(checks[i].getAttribute("data-p"));
  }
  setText("oa", "Tambahkan, " + rp(u));
  return u;
}

/* =========================================================
   JENIS PESANAN
   ========================================================= */
function onTypeChange() {
  var ty = typeValue(), nt = $("nt");
  if (nt) {
    if (state.prevType) state.fields[state.prevType] = nt.value;
    var saved = state.fields[ty];
    nt.value = saved !== undefined ? saved : (ty === TYPES.DEL ? store.get("sr_addr", "") : "");
  }
  state.prevType = ty;
  setText("err", "");
  renderRows();
}

/* =========================================================
   PROMO
   ========================================================= */
function applyPromo() {
  var v = fieldValue("pc").toUpperCase(), msg = $("pmsg");
  var text = "", cls = "ok";
  if (!v) {
    state.promo = "";
  } else if (CONFIG.PROMO[v]) {
    state.promo = v;
    text = "Diskon " + Math.round(CONFIG.PROMO[v] * 100) + "% terpasang.";
  } else {
    state.promo = "";
    text = "Kode tidak dikenali.";
    cls = "ok bad";
  }
  if (msg) { msg.textContent = text; msg.className = cls; }
  renderRows();
  renderBar();
}

/* =========================================================
   KIRIM KE WHATSAPP
   ========================================================= */
function send() {
  var nm = fieldValue("nm"), nt = fieldValue("nt"), note = fieldValue("cat");
  var c = calc();
  function fail(t, focusId) { setText("err", t); if (focusId && $(focusId)) $(focusId).focus(); }
  setText("err", "");

  if (!state.cart.length) return fail("Keranjangmu masih kosong.");
  if (!nm) return fail("Isi namamu dulu.", "nm");
  if (c.ty !== TYPES.TAKE && !nt)
    return fail(c.ty === TYPES.DINE ? "Isi nomor mejamu." : "Isi alamat pengantaran.", "nt");
  if (c.ty === TYPES.DEL && c.sub < CONFIG.MINDEL)
    return fail("Minimal pesanan antar " + rp(CONFIG.MINDEL) + " (kurang " + rp(CONFIG.MINDEL - c.sub) + ").");

  store.set("sr_nm", nm);
  store.set("sr_ty", c.ty);
  if (c.ty === TYPES.DEL) store.set("sr_addr", nt);

  // Susun pesan baris per baris. Baris kosong = "".
  var L = [];
  L.push("Halo " + CONFIG.NAMA + ", saya mau pesan:");
  L.push("");
  state.cart.forEach(function (l) {
    L.push(l.q + " x " + l.n + (l.opt ? " (" + l.opt + ")" : "") + " - " + rp(l.u * l.q));
  });
  L.push("");
  L.push("Subtotal: " + rp(c.sub));
  if (c.disc) L.push("Diskon (" + state.promo + "): -" + rp(c.disc));
  if (c.fee) L.push("Ongkos antar: " + rp(c.fee));
  L.push("Total: " + rp(c.tot));
  L.push("");
  L.push("Nama: " + nm);
  L.push("Jenis: " + c.ty);
  L.push(fieldLabel() + ": " + (nt || "-"));
  if (note) L.push("Catatan: " + note);
  if (!isOpen()) {
    L.push("");
    L.push("(Pesanan di luar jam buka, mohon diproses mulai pukul " + jam(CONFIG.OPEN) + ")");
  }
  var m = L.join(String.fromCharCode(10)); // 10 = kode "pindah baris"

  var url = "https://wa.me/" + CONFIG.WA + "?text=" + encodeURIComponent(m);
  var w = window.open(url, "_blank");
  if (!w) location.href = url; // popup diblokir -> buka di tab yang sama
  toast("Membuka WhatsApp...");
}

// Konfirmasi tanpa alert browser: klik pertama minta konfirmasi, klik kedua baru mengosongkan.
var clrTimer;
function resetClr() {
  var b = $("clr");
  if (!b) return;
  clearTimeout(clrTimer);
  b.removeAttribute("data-confirm");
  b.textContent = "Kosongkan pesanan";
}

function clearCart() {
  var b = $("clr");
  if (b && !b.getAttribute("data-confirm")) {
    b.setAttribute("data-confirm", "1");
    b.textContent = "Yakin? Klik sekali lagi untuk mengosongkan";
    clearTimeout(clrTimer);
    clrTimer = setTimeout(resetClr, 4000);
    return;
  }
  resetClr();
  state.cart = [];
  saveCart();
  closeDlg("dlg");
  renderBar();
  renderList();
  toast("Pesanan dikosongkan");
}


/* =========================================================
   EVENT
   ========================================================= */
function bind() {
  on("tabs", "click", function (e) {
    var b = e.target.closest("[data-c]");
    if (!b) return;
    state.cat = b.getAttribute("data-c");
    renderTabs();
    renderList();
  });

  on("q", "input", function (e) {
    state.q = e.target.value.trim().toLowerCase();
    renderList();
  });

  on("list", "click", function (e) {
    var b = e.target.closest("[data-i]");
    if (!b || b.disabled) return;
    var m = findMenu(Number(b.getAttribute("data-i")));
    if (!m) return;
    if (m.o || m.x) showOpts(m);
    else addToCart(m, "", m.p);
  });

  // dialog opsi
  on("ob", "change", optPrice);
  on("oa", "click", function () {
    var u = optPrice();
    var picked = [];
    var ins = $("ob") ? $("ob").querySelectorAll("input:checked") : [];
    for (var i = 0; i < ins.length; i++) picked.push(ins[i].value);
    addToCart(state.cur, picked.join(", "), u);
    closeDlg("od");
  });
  on("ox", "click", function () { closeDlg("od"); });

  // dialog keranjang
  on("open", "click", function () {
    setText("err", "");
    resetClr();
    renderRows();
    openDlg("dlg");
  });
  on("x", "click", function () { closeDlg("dlg"); });
  on("rows", "click", function (e) {
    var b = e.target.closest("[data-k]");
    if (!b) return;
    var i = Number(b.getAttribute("data-k")), l = state.cart[i];
    if (!l) return;
    l.q += b.getAttribute("data-a") === "+" ? 1 : -1;
    if (l.q < 1) state.cart.splice(i, 1);
    saveCart();
    renderBar();
    renderList();
    renderRows();
  });
  on("clr", "click", clearCart);
  on("ty", "change", onTypeChange);
  on("pa", "click", applyPromo);
  on("pc", "keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } });
  on("send", "click", send);

  // klik di luar dialog (backdrop) untuk menutup
  ["od", "dlg"].forEach(function (id) {
    var d = $(id);
    if (d) d.addEventListener("click", function (e) { if (e.target === d) closeDlg(id); });
  });

  // tema
  on("theme", "click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    store.set("sr_theme", next);
    applyTheme(next);
  });
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: light)");
    if (mq.addEventListener) mq.addEventListener("change", function () { applyTheme(); });
  }
}

/* =========================================================
   MULAI
   ========================================================= */
function init() {
  console.log(CONFIG.NAMA + " script.js versi 6");
  applyTheme(store.get("sr_theme", null));

  var wal = $("wal");
  if (wal) wal.href = "https://wa.me/" + CONFIG.WA;
  setText("jam", jam(CONFIG.OPEN) + " sampai " + jam(CONFIG.CLOSE));
  setText("yr", String(new Date().getFullYear()));

  // isi ulang data pelanggan yang tersimpan
  var nmEl = $("nm");
  if (nmEl) nmEl.value = store.get("sr_nm", "");
  var tyEl = $("ty");
  var ty = store.get("sr_ty", TYPES.DINE);
  if (tyEl && (ty === TYPES.DINE || ty === TYPES.TAKE || ty === TYPES.DEL)) tyEl.value = ty;
  state.prevType = typeValue();
  if (state.prevType === TYPES.DEL && $("nt")) $("nt").value = store.get("sr_addr", "");
  renderFieldLabel();

  renderStatus();
  renderTabs();
  renderList();
  renderBar();
  bind();

  // perbarui status buka/tutup tiap menit
  setInterval(function () { renderStatus(); renderBar(); }, 60000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

})();
