/* ============================================================
   ZIONOVA — Cloud Data Store (Firebase Firestore + Auth)
   Every page includes: firebase SDK <script> tags, firebase-config.js,
   firebase-init.js, then this file.

   Products, Orders, and Site Settings all live in Firestore, so any
   change made from any device (admin laptop, phone, etc.) is visible
   everywhere else within a second or two — no more "it only shows on
   my laptop" problem.

   Cart is intentionally kept in the browser's localStorage — like any
   normal store, a shopping bag is per-visitor/per-browser until they
   check out.
   ============================================================ */

const CART_KEY = 'zionova_cart';

/* ---------------- Defaults (used only if Firestore doc is empty) ---------------- */
const DEFAULT_SETTINGS = {
  // Brand content
  logoImageUrl:'https://drive.google.com/file/d/1R8mjVPUaWiDfxsUC7EZzYjOkBnZpkc2u/view?usp=drive_link',
  name: 'Zionova',
  tagline: 'Wear the Statement',
  description: "Zionova is a premium streetwear label built for those who lead, not follow. Every piece is designed in small batches, blending minimalist tailoring with bold gold accents — crafted for people who value quality over quantity.",
  aboutText: "From the cut of the collar to the weight of the cotton, every detail is considered. This is fashion made to be felt, not just worn.",
  instagram: 'https://instagram.com/zionova',
  facebook: 'https://facebook.com/zionova',
  tiktok: 'https://tiktok.com/@zionova',
  whatsapp: 'https://wa.me/94000000000',
  email: 'hello@zionova.com',
  // Design / theme (applied live across the storefront)
  heroEyebrow: 'Premium Streetwear Label',
  heroCtaPrimary: 'Shop Collection', heroCtaSecondary: 'Our Story',
  heroVisualCaption: 'The Gold Standard Collection — 2026',
  aboutLabel: 'The Brand', aboutHeading: 'About Zionova',
  stat1Value: '4.5★', stat1Label: 'Customer Rating',
  stat2Value: '1K+', stat2Label: 'Happy Customers',
  stat3Value: '100%', stat3Label: 'Premium Cotton',
  productsLabel: 'Latest Drop', productsTitle: 'Shop T-Shirts',
  productsSubtitle: 'Premium cotton tees...',
  socialsLabel: 'Stay Connected', socialsTitle: 'Follow Zionova',
  socialsSubtitle: 'Join the community...',
  footerCopyright: 'Zionova. All rights reserved.',
  colorBg: '#ffffff', colorText: '#0d0d0d', colorGold: '#c9a227',
  fontPair: 'playfair-poppins', heroImageUrl: '', aboutImageUrl: '',
  // Integrations
  sheetWebhookUrl: '',
  shippingFee: 350
};

const FONT_PAIRS = {
  'playfair-poppins': {
    label: 'Playfair Display + Poppins (Classic Luxury)',
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap',
    serif: "'Playfair Display', Georgia, serif",
    sans: "'Poppins', Arial, sans-serif"
  },
  'cormorant-inter': {
    label: 'Cormorant Garamond + Inter (Editorial)',
    href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap',
    serif: "'Cormorant Garamond', Georgia, serif",
    sans: "'Inter', Arial, sans-serif"
  },
  'bodoni-manrope': {
    label: 'Bodoni Moda + Manrope (Bold Fashion)',
    href: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap',
    serif: "'Bodoni Moda', Georgia, serif",
    sans: "'Manrope', Arial, sans-serif"
  }
};

/* ---------------- Utility ---------------- */
function formatMoney(amount){
  return 'Rs. ' + Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function escapeHTML(str=''){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* =====================================================
   PRODUCTS   (Firestore collection: "products")
   ===================================================== */
const ProductStore = {
  async getAll(){
    const snap = await db.collection('products').orderBy('name').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getById(id){
    const doc = await db.collection('products').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  listen(callback){
    return db.collection('products').orderBy('name').onSnapshot(snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('Product listener error:', err));
  },
  async add(product){
    const ref = await db.collection('products').add(product);
    return ref.id;
  },
  async update(id, updates){
    await db.collection('products').doc(id).update(updates);
  },
  async remove(id){
    await db.collection('products').doc(id).delete();
  },
  finalPrice(p){
    const discount = Number(p.discount) || 0;
    return Math.round(p.price * (1 - discount / 100));
  }
};

/* =====================================================
   CART   (localStorage — per browser, pre-checkout only)
   ===================================================== */
function loadCartRaw(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e){ return []; }
}
function saveCartRaw(list){ localStorage.setItem(CART_KEY, JSON.stringify(list)); }

const CartStore = {
  getAll(){ return loadCartRaw(); },
  count(){ return this.getAll().reduce((sum, i) => sum + i.qty, 0); },
  add(productId, qty = 1){
    const cart = this.getAll();
    const existing = cart.find(i => i.productId === productId);
    if(existing) existing.qty += qty; else cart.push({ productId, qty });
    saveCartRaw(cart);
  },
  updateQty(productId, qty){
    let cart = this.getAll();
    if(qty <= 0) cart = cart.filter(i => i.productId !== productId);
    else { const item = cart.find(i => i.productId === productId); if(item) item.qty = qty; }
    saveCartRaw(cart);
  },
  remove(productId){ saveCartRaw(this.getAll().filter(i => i.productId !== productId)); },
  clear(){ saveCartRaw([]); },
  // needs the live product list (already fetched) to compute prices/names
  detailedItems(products){
    return this.getAll().map(item => {
      const product = products.find(p => p.id === item.productId);
      if(!product) return null;
      const unitPrice = ProductStore.finalPrice(product);
      return { productId: item.productId, name: product.name, unitPrice, originalPrice: product.price, qty: item.qty, lineTotal: unitPrice * item.qty };
    }).filter(Boolean);
  },
  subtotal(products){ return this.detailedItems(products).reduce((sum, i) => sum + i.lineTotal, 0); }
};

/* =====================================================
   ORDERS   (Firestore collection: "orders")
   ===================================================== */
const OrderStore = {
  async getAll(){
    const snap = await db.collection('orders').orderBy('date', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  listen(callback){
    return db.collection('orders').orderBy('date', 'desc').onSnapshot(snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('Order listener error:', err));
  },
  async getById(id){
    const doc = await db.collection('orders').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  async create(order){
    const orderId = 'ZN' + Date.now().toString().slice(-8);
    const fullOrder = {
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
    await db.collection('orders').doc(orderId).set(fullOrder);

    // Reduce stock for each purchased product
    await Promise.all(fullOrder.items.map(async item => {
      const ref = db.collection('products').doc(item.productId);
      try{
        await db.runTransaction(async t => {
          const doc = await t.get(ref);
          if(!doc.exists) return;
          const current = Number(doc.data().stock) || 0;
          t.update(ref, { stock: Math.max(0, current - item.qty) });
        });
      }catch(e){ console.error('Stock update failed for', item.productId, e); }
    }));

    // Fire-and-forget push to Google Sheet, if configured
    pushOrderToSheet({ id: orderId, ...fullOrder });

    return { id: orderId, ...fullOrder };
  },
  async remove(id){ await db.collection('orders').doc(id).delete(); }
};

/* ---- pure helper functions for reports (operate on an already-fetched array) ---- */
function computeTodayTotal(orders){
  const todayStr = new Date().toDateString();
  return orders.filter(o => new Date(o.date).toDateString() === todayStr).reduce((s,o) => s + o.total, 0);
}
function computeMonthTotal(orders){
  const now = new Date();
  return orders.filter(o => { const d = new Date(o.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s,o) => s + o.total, 0);
}
function computeLast7Days(orders){
  const days = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const total = orders.filter(o => new Date(o.date).toDateString() === dayStr).reduce((s,o) => s + o.total, 0);
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: dayStr, total });
  }
  return days;
}
function computeLast6Months(orders){
  const months = []; const now = new Date();
  for(let i = 5; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const total = orders.filter(o => { const od = new Date(o.date); return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear(); })
      .reduce((s,o) => s + o.total, 0);
    months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), total });
  }
  return months;
}

/* =====================================================
   SITE SETTINGS   (Firestore doc: settings/site)
   Brand content + design/theme + integrations, all in one doc
   so the admin "Website Editor" tab can save it all at once.
   ===================================================== */
const SettingsStore = {
  async get(){
    const doc = await db.collection('settings').doc('site').get();
    return { ...DEFAULT_SETTINGS, ...(doc.exists ? doc.data() : {}) };
  },
  listen(callback){
    return db.collection('settings').doc('site').onSnapshot(doc => {
      callback({ ...DEFAULT_SETTINGS, ...(doc.exists ? doc.data() : {}) });
    }, err => console.error('Settings listener error:', err));
  },
  async save(partial){
    await db.collection('settings').doc('site').set(partial, { merge: true });
  }
};

/* Apply theme + text content to whatever matching elements exist on
   the current page. Safe to call on every page (storefront, checkout,
   receipt) — elements that don't exist are just skipped. */
function applySiteSettings(settings){
  const root = document.documentElement;
  root.style.setProperty('--white', settings.colorBg);
  root.style.setProperty('--off-white', shadeColor(settings.colorBg, -3));
  root.style.setProperty('--black', settings.colorText);
  root.style.setProperty('--gold', settings.colorGold);
  root.style.setProperty('--gold-light', shadeColor(settings.colorGold, 25));
  root.style.setProperty('--gold-dark', shadeColor(settings.colorGold, -25));

  const pair = FONT_PAIRS[settings.fontPair] || FONT_PAIRS['playfair-poppins'];
  root.style.setProperty('--serif', pair.serif);
  root.style.setProperty('--sans', pair.sans);
  let fontLink = document.getElementById('dynamicFontLink');
  if(!fontLink){
    fontLink = document.createElement('link');
    fontLink.id = 'dynamicFontLink';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }
  if(fontLink.href !== pair.href) fontLink.href = pair.href;

  const setText = (id, val) => { const el = document.getElementById(id); if(el && val) el.textContent = val; };
  // ==========================================
  // LOGO
  // ==========================================
  document.querySelectorAll('.js-logo').forEach(el => {
    if(settings.logoImageUrl){
      el.innerHTML = `
        <img 
          src="${escapeHTML(settings.logoImageUrl)}" 
          alt="${escapeHTML(settings.siteName || 'Zionova')}" 
          class="logo-img"
        >
      `;
    }else{
      el.textContent = settings.siteName || 'Zionova';
    }
  });
  // ==========================================
  // HERO SECTION
  // ==========================================
  setText('heroEyebrow', settings.heroEyebrow);
  setText('heroDesc', settings.description);
  setText('heroCtaPrimary', settings.heroCtaPrimary);
  setText('heroCtaSecondary', settings.heroCtaSecondary);
  setText('heroVisualCaption', settings.heroVisualCaption);
  // ==========================================
  // ABOUT SECTION
  // ==========================================
  setText('aboutLabel', settings.aboutLabel);
  setText('aboutHeading', settings.aboutHeading);
  setText('aboutDesc', settings.description);
  setText('aboutText2', settings.aboutText);
  // ==========================================
  // STATISTICS
  // ==========================================
  setText('stat1Value', settings.stat1Value);
  setText('stat1Label', settings.stat1Label);

  setText('stat2Value', settings.stat2Value);
  setText('stat2Label', settings.stat2Label);

  setText('stat3Value', settings.stat3Value);
  setText('stat3Label', settings.stat3Label);
  // ==========================================
  // PRODUCTS SECTION
  // ==========================================
  setText('productsLabel', settings.productsLabel);
  setText('productsTitle', settings.productsTitle);
  setText('productsSubtitle', settings.productsSubtitle);
  // ==========================================
  // SOCIAL SECTION
  // ==========================================
  setText('socialsLabel', settings.socialsLabel);
  setText('socialsTitle', settings.socialsTitle);
  setText('socialsSubtitle', settings.socialsSubtitle);


  // ==========================================
  // FOOTER
  // ==========================================
  setText('footerTagline', settings.description);
  setText('footerCopyrightText', settings.footerCopyright);

  const heroVisual = document.getElementById('heroVisual');
  if(heroVisual && settings.heroImageUrl){
    heroVisual.style.backgroundImage = `url('${settings.heroImageUrl}')`;
    heroVisual.style.backgroundSize = 'cover';
    heroVisual.style.backgroundPosition = 'center';
  }
  const aboutVisual = document.getElementById('aboutVisual');
  if(aboutVisual && settings.aboutImageUrl){
    aboutVisual.style.backgroundImage = `url('${settings.aboutImageUrl}')`;
    aboutVisual.style.backgroundSize = 'cover';
    aboutVisual.style.backgroundPosition = 'center';
    aboutVisual.textContent = '';
  }

  const socialGrid = document.getElementById('socialGrid');
  if(socialGrid){
    const socials = [
      { key:'instagram', label:'Instagram', ic:'instagram' },
      { key:'facebook', label:'Facebook', ic:'facebook' },
      { key:'tiktok', label:'TikTok', ic:'tiktok' },
      { key:'whatsapp', label:'WhatsApp', ic:'whatsapp' }
    ];
    socialGrid.innerHTML = socials.filter(s => settings[s.key]).map(s => `
      <a class="social-pill" href="${escapeHTML(settings[s.key])}" target="_blank" rel="noopener">
        ${icon(s.ic,'social-icon')} ${s.label}
      </a>
    `).join('');
  }
  const footerContact = document.getElementById('footerContact');
  if(footerContact){
    footerContact.innerHTML = `
      <li>${icon('mail')} ${escapeHTML(settings.email || '')}</li>
      <li><a href="${escapeHTML(settings.instagram||'#')}" target="_blank" rel="noopener">Instagram</a></li>
      <li><a href="${escapeHTML(settings.facebook||'#')}" target="_blank" rel="noopener">Facebook</a></li>
      <li><a href="${escapeHTML(settings.whatsapp||'#')}" target="_blank" rel="noopener">WhatsApp</a></li>
    `;
  }
}

/* lighten/darken a hex color by percent (-100..100) */
function shadeColor(hex, percent){
  hex = (hex || '#ffffff').replace('#','');
  if(hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const num = parseInt(hex, 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00FF) + Math.round(2.55 * percent);
  let b = (num & 0x0000FF) + Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + (0x1000000 + r*0x10000 + g*0x100 + b).toString(16).slice(1);
}

/* =====================================================
   ADMIN AUTH   (Firebase Authentication — email + password)
   ===================================================== */
const AdminAuth = {
  onChange(callback){ return auth.onAuthStateChanged(callback); },
  async login(email, password){
    await auth.signInWithEmailAndPassword(email, password);
  },
  async logout(){ await auth.signOut(); },
  async resetPassword(email){ await auth.sendPasswordResetEmail(email); },
  currentUser(){ return auth.currentUser; }
};

/* =====================================================
   GOOGLE SHEETS SYNC
   Every order is pushed to a Google Apps Script "Web App" URL that
   you deploy from your own Google Sheet. See README.md for the
   3-minute setup + the exact Apps Script code to paste in.
   ===================================================== */
async function pushOrderToSheet(order){
  try{
    const settings = await SettingsStore.get();
    const url = settings.sheetWebhookUrl;
    if(!url) return; // not connected — skip silently

    const payload = {
      orderId: order.id,
      date: order.date,
      customerName: order.customer?.name || '',
      customerPhone: order.customer?.phone || '',
      customerEmail: order.customer?.email || '',
      items: order.items.map(i => `${i.name} x${i.qty}`).join(', '),
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      paymentMethod: order.paymentMethod,
      source: order.source
    };

    // Apps Script web apps don't send CORS headers by default, so we
    // use 'no-cors' — the row still gets written, we just can't read
    // a response back. Using text/plain avoids a CORS preflight.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
  }catch(e){
    console.error('Google Sheet sync failed (order was still saved to Firebase):', e);
  }
}

/* Manual "Test Connection" ping from the admin Settings tab */
async function testSheetConnection(url){
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      orderId: 'TEST-' + Date.now(), date: new Date().toISOString(),
      customerName: 'Connection Test', customerPhone: '', customerEmail: '',
      items: 'Test row from Zionova admin', subtotal: 0, shipping: 0, total: 0,
      paymentMethod: 'Test', source: 'test'
    })
  });
}

/* =====================================================
   EXCEL EXPORT (SheetJS — loaded only on admin.html reports tab)
   ===================================================== */
function exportOrdersToExcel(orders, filename){
  const rows = orders.map(o => ({
    'Order ID': o.id,
    'Date': new Date(o.date).toLocaleString(),
    'Customer': o.customer?.name || 'Walk-in',
    'Phone': o.customer?.phone || '',
    'Email': o.customer?.email || '',
    'Items': o.items.map(i => `${i.name} x${i.qty}`).join(', '),
    'Subtotal': o.subtotal,
    'Shipping': o.shipping,
    'Total': o.total,
    'Payment Method': o.paymentMethod,
    'Source': o.source === 'pos' ? 'In-Store' : 'Online',
    'Status': o.status
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [ {wch:14},{wch:20},{wch:18},{wch:14},{wch:22},{wch:35},{wch:10},{wch:10},{wch:10},{wch:14},{wch:10},{wch:10} ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
  XLSX.writeFile(wb, filename);
}
