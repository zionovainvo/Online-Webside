/* ============================================================
   ZIONOVA — Shared Data Layer (localStorage based)
   All pages (storefront + admin) read/write through this file.

   IMPORTANT: localStorage is per-origin. If you open these files
   directly by double-clicking (file:// links), some browsers
   (especially Firefox) treat every local file as its own origin,
   so changes made in admin.html will NOT appear on index.html.
   To avoid this, run the site through a local web server (e.g.
   VS Code "Live Server", `python3 -m http.server`, or upload it
   to any host like Netlify/GitHub Pages) and open it as
   http://localhost/... instead of file://...
   ============================================================ */

const STORE_KEYS = {
  products: 'zionova_products',
  cart: 'zionova_cart',
  orders: 'zionova_orders',
  admin: 'zionova_admin_credentials',
  session: 'zionova_admin_session', // sessionStorage
  site: 'zionova_site_settings',    // brand + content + images + theme
  sheet: 'zionova_google_sheet'     // Google Sheets integration config
};

/* ---------------- Default seed data (first run only) ---------------- */
const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: 'Noir Signature Tee',
    price: 4500,
    discount: 10,
    description: 'Premium heavyweight cotton tee in classic black with subtle gold embroidered logo.',
    stock: 25,
    image: ''
  },
  {
    id: 'p2',
    name: 'Ivory Essential Crew',
    price: 3900,
    discount: 0,
    description: 'Soft-touch ivory crew neck, minimalist cut, everyday luxury essential.',
    stock: 18,
    image: ''
  },
  {
    id: 'p3',
    name: 'Gold Line Oversized Tee',
    price: 5200,
    discount: 15,
    description: 'Oversized fit tee featuring a hand-finished gold foil line print.',
    stock: 12,
    image: ''
  },
  {
    id: 'p4',
    name: 'Zionova Monogram Tee',
    price: 4800,
    discount: 0,
    description: 'Bold monogram chest print on a structured black cotton base.',
    stock: 0,
    image: ''
  }
];

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'zionova2026' // change this after first login
};

/* Unified site settings: brand info, editable page content, images, theme */
const DEFAULT_SITE = {
  brand: {
    name: 'Zionova',
    email: 'hello@zionova.com',
    instagram: 'https://instagram.com/zionova',
    facebook: 'https://facebook.com/zionova',
    tiktok: 'https://tiktok.com/@zionova',
    whatsapp: 'https://wa.me/94000000000'
  },
  content: {
    heroEyebrow: 'Premium Streetwear Label',
    heroTitleMain: 'Wear the',
    heroTitleAccent: 'Statement',
    heroDesc: 'Zionova is a premium streetwear label built for those who lead, not follow. Every piece is designed in small batches, blending minimalist tailoring with bold gold accents.',
    heroVisualCaption: 'The Gold Standard Collection — 2026',
    aboutBadge: 'Est. 2026',
    aboutHeading: 'About Zionova',
    aboutDesc: 'Zionova is a premium streetwear label built for those who lead, not follow. Every piece is designed in small batches, blending minimalist tailoring with bold gold accents — crafted for people who value quality over quantity.',
    aboutDesc2: 'From the cut of the collar to the weight of the cotton, every detail is considered. This is fashion made to be felt, not just worn.',
    stat1Value: '4.9★', stat1Label: 'Customer Rating',
    stat2Value: '2K+', stat2Label: 'Happy Customers',
    stat3Value: '100%', stat3Label: 'Premium Cotton',
    footerAbout: 'Premium streetwear crafted for those who lead. Minimal design, maximum statement.',
    footerNote: 'All rights reserved.'
  },
  images: {
    heroImage: '',
    aboutImage: ''
  },
  theme: {
    primaryColor: '#c9a227',
    primaryLight: '#e6c85a',
    primaryDark: '#9c7d1a',
    textColor: '#0d0d0d',
    bgColor: '#ffffff',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Poppins', Arial, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap'
  }
};

const DEFAULT_SHEET = {
  webAppUrl: '',
  enabled: false
};

/* ---------------- Generic helpers ---------------- */
function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    console.error('Failed to parse storage for', key, e);
    return fallback;
  }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function deepMerge(base, override){
  const out = { ...base };
  for(const k in override){
    if(override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])){
      out[k] = deepMerge(base[k] || {}, override[k]);
    }else{
      out[k] = override[k];
    }
  }
  return out;
}

/* ---------------- Init (run once, and heal missing keys on every load) ---------------- */
function initStore(){
  if(localStorage.getItem(STORE_KEYS.products) === null){
    saveJSON(STORE_KEYS.products, DEFAULT_PRODUCTS);
  }
  if(localStorage.getItem(STORE_KEYS.orders) === null){
    saveJSON(STORE_KEYS.orders, []);
  }
  if(localStorage.getItem(STORE_KEYS.cart) === null){
    saveJSON(STORE_KEYS.cart, []);
  }
  if(localStorage.getItem(STORE_KEYS.admin) === null){
    saveJSON(STORE_KEYS.admin, DEFAULT_ADMIN);
  }
  if(localStorage.getItem(STORE_KEYS.sheet) === null){
    saveJSON(STORE_KEYS.sheet, DEFAULT_SHEET);
  }
  const existingSite = loadJSON(STORE_KEYS.site, {});
  saveJSON(STORE_KEYS.site, deepMerge(DEFAULT_SITE, existingSite));

  const legacyBrand = loadJSON('zionova_brand_settings', null);
  if(legacyBrand){
    const site = loadJSON(STORE_KEYS.site, DEFAULT_SITE);
    site.brand = { ...site.brand, ...legacyBrand };
    if(legacyBrand.description) site.content.aboutDesc = legacyBrand.description;
    saveJSON(STORE_KEYS.site, site);
    localStorage.removeItem('zionova_brand_settings');
  }
}
initStore();

/* ---------------- Products ---------------- */
const ProductStore = {
  getAll(){ return loadJSON(STORE_KEYS.products, []); },
  getById(id){ return this.getAll().find(p => p.id === id); },
  save(list){ saveJSON(STORE_KEYS.products, list); },
  add(product){
    const list = this.getAll();
    product.id = 'p' + Date.now();
    list.push(product);
    this.save(list);
    return product;
  },
  update(id, updates){
    const list = this.getAll();
    const idx = list.findIndex(p => p.id === id);
    if(idx > -1){ list[idx] = { ...list[idx], ...updates }; this.save(list); }
  },
  remove(id){
    const list = this.getAll().filter(p => p.id !== id);
    this.save(list);
  },
  finalPrice(p){
    const discount = Number(p.discount) || 0;
    return Math.round(p.price * (1 - discount / 100));
  }
};

/* ---------------- Cart ---------------- */
const CartStore = {
  getAll(){ return loadJSON(STORE_KEYS.cart, []); },
  save(list){ saveJSON(STORE_KEYS.cart, list); },
  count(){ return this.getAll().reduce((sum, i) => sum + i.qty, 0); },
  add(productId, qty = 1){
    const cart = this.getAll();
    const existing = cart.find(i => i.productId === productId);
    if(existing){ existing.qty += qty; }
    else{ cart.push({ productId, qty }); }
    this.save(cart);
  },
  updateQty(productId, qty){
    let cart = this.getAll();
    if(qty <= 0){
      cart = cart.filter(i => i.productId !== productId);
    }else{
      const item = cart.find(i => i.productId === productId);
      if(item) item.qty = qty;
    }
    this.save(cart);
  },
  remove(productId){
    const cart = this.getAll().filter(i => i.productId !== productId);
    this.save(cart);
  },
  clear(){ this.save([]); },
  detailedItems(){
    const products = ProductStore.getAll();
    return this.getAll().map(item => {
      const product = products.find(p => p.id === item.productId);
      if(!product) return null;
      const unitPrice = ProductStore.finalPrice(product);
      return {
        productId: item.productId,
        name: product.name,
        unitPrice,
        originalPrice: product.price,
        qty: item.qty,
        lineTotal: unitPrice * item.qty
      };
    }).filter(Boolean);
  },
  subtotal(){
    return this.detailedItems().reduce((sum, i) => sum + i.lineTotal, 0);
  }
};

/* ---------------- Orders ---------------- */
const OrderStore = {
  getAll(){ return loadJSON(STORE_KEYS.orders, []); },
  save(list){ saveJSON(STORE_KEYS.orders, list); },
  create(order){
    const list = this.getAll();
    const orderId = 'ZN' + Date.now().toString().slice(-8);
    const fullOrder = {
      id: orderId,
      date: new Date().toISOString(),
      source: order.source || 'online',
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping || 0,
      total: order.total,
      customer: order.customer || {},
      paymentMethod: order.paymentMethod || 'Cash on Delivery',
      status: order.status || 'Paid'
    };
    list.unshift(fullOrder);
    this.save(list);

    const products = ProductStore.getAll();
    fullOrder.items.forEach(item => {
      const p = products.find(pp => pp.id === item.productId);
      if(p && typeof p.stock === 'number'){
        p.stock = Math.max(0, p.stock - item.qty);
      }
    });
    ProductStore.save(products);

    syncOrderToSheet(fullOrder);

    return fullOrder;
  },
  getById(id){ return this.getAll().find(o => o.id === id); },
  remove(id){
    const list = this.getAll().filter(o => o.id !== id);
    this.save(list);
  },
  todayTotal(){
    const todayStr = new Date().toDateString();
    return this.getAll()
      .filter(o => new Date(o.date).toDateString() === todayStr)
      .reduce((sum, o) => sum + o.total, 0);
  },
  monthTotal(refDate){
    const now = refDate || new Date();
    return this.getAll()
      .filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, o) => sum + o.total, 0);
  },
  ordersInCurrentMonth(){
    const now = new Date();
    return this.getAll().filter(o => {
      const d = new Date(o.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  },
  ordersToday(){
    const todayStr = new Date().toDateString();
    return this.getAll().filter(o => new Date(o.date).toDateString() === todayStr);
  },
  last7Days(){
    const days = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const total = this.getAll()
        .filter(o => new Date(o.date).toDateString() === dayStr)
        .reduce((sum, o) => sum + o.total, 0);
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: dayStr, total });
    }
    return days;
  },
  last6Months(){
    const months = [];
    const now = new Date();
    for(let i = 5; i >= 0; i--){
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = this.getAll()
        .filter(o => {
          const od = new Date(o.date);
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        })
        .reduce((sum, o) => sum + o.total, 0);
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), total });
    }
    return months;
  }
};

/* ---------------- Admin Auth ---------------- */
const AdminAuth = {
  getCredentials(){ return loadJSON(STORE_KEYS.admin, DEFAULT_ADMIN); },
  setCredentials(username, password){
    saveJSON(STORE_KEYS.admin, { username, password });
  },
  login(username, password){
    const creds = this.getCredentials();
    if(username === creds.username && password === creds.password){
      sessionStorage.setItem(STORE_KEYS.session, 'active');
      return true;
    }
    return false;
  },
  isLoggedIn(){ return sessionStorage.getItem(STORE_KEYS.session) === 'active'; },
  logout(){ sessionStorage.removeItem(STORE_KEYS.session); }
};

/* ---------------- Site settings (brand + content + images + theme) ---------------- */
const SiteStore = {
  get(){ return loadJSON(STORE_KEYS.site, DEFAULT_SITE); },
  save(settings){ saveJSON(STORE_KEYS.site, settings); },
  saveSection(section, data){
    const site = this.get();
    site[section] = { ...site[section], ...data };
    this.save(site);
    return site;
  },
  reset(){ this.save(DEFAULT_SITE); }
};

function applyTheme(){
  const theme = SiteStore.get().theme;
  const root = document.documentElement;
  root.style.setProperty('--gold', theme.primaryColor);
  root.style.setProperty('--gold-light', theme.primaryLight);
  root.style.setProperty('--gold-dark', theme.primaryDark);
  root.style.setProperty('--black', theme.textColor);
  root.style.setProperty('--white', theme.bgColor);
  root.style.setProperty('--serif', theme.headingFont);
  root.style.setProperty('--sans', theme.bodyFont);

  if(theme.googleFontsUrl){
    let link = document.getElementById('dynamicFontLink');
    if(!link){
      link = document.createElement('link');
      link.id = 'dynamicFontLink';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if(link.href !== theme.googleFontsUrl){
      link.href = theme.googleFontsUrl;
    }
  }
}

/* ---------------- Google Sheets Integration ----------------
   Zionova syncs new orders to a Google Sheet through a small
   Google Apps Script "Web App" that you deploy yourself (Google
   Sheets has no direct browser API for security reasons — Apps
   Script is Google's official way to bridge this).
   See the Apps Script snippet inside admin.html > Settings tab.
------------------------------------------------------------- */
const GoogleSheetStore = {
  get(){ return loadJSON(STORE_KEYS.sheet, DEFAULT_SHEET); },
  save(cfg){ saveJSON(STORE_KEYS.sheet, cfg); }
};

function syncOrderToSheet(order){
  const cfg = GoogleSheetStore.get();
  if(!cfg.enabled || !cfg.webAppUrl) return;
  try{
    fetch(cfg.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        orderId: order.id,
        date: order.date,
        customerName: order.customer.name || 'Walk-in Customer',
        customerPhone: order.customer.phone || '',
        customerEmail: order.customer.email || '',
        items: order.items.map(i => `${i.name} x${i.qty}`).join(', '),
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        paymentMethod: order.paymentMethod,
        source: order.source,
        status: order.status
      })
    }).catch(err => console.warn('Google Sheet sync failed:', err));
  }catch(err){
    console.warn('Google Sheet sync error:', err);
  }
}

function testSheetConnection(webAppUrl){
  return fetch(webAppUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ test: true, message: 'Zionova connection test', time: new Date().toISOString() })
  });
}

/* ---------------- Currency formatting ---------------- */
function formatMoney(amount){
  return 'Rs. ' + Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------------- Cross-tab live sync ----------------
   When localStorage changes in ANOTHER tab of the same origin
   (e.g. you edit Settings in the admin tab while the storefront
   tab is open), the "storage" event fires here so the storefront
   can immediately re-render instead of showing stale data. */
window.addEventListener('storage', function(e){
  if(!e.key) return;
  if(typeof window.onZionovaStorageChange === 'function'){
    window.onZionovaStorageChange(e.key);
  }
});
