/* ============================================================
   ZIONOVA — Shared Data Layer (localStorage based)
   All pages (storefront + admin) read/write through this file.
   ============================================================ */

const STORE_KEYS = {
  products: 'zionova_products',
  cart: 'zionova_cart',
  orders: 'zionova_orders',
  admin: 'zionova_admin_credentials',
  session: 'zionova_admin_session', // sessionStorage
  brand: 'zionova_brand_settings'
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

const DEFAULT_BRAND = {
  name: 'Zionova',
  tagline: 'Wear the Statement',
  description: "Zionova is a premium streetwear label built for those who lead, not follow. Every piece is designed in small batches, blending minimalist tailoring with bold gold accents — crafted for people who value quality over quantity.",
  instagram: 'https://instagram.com/zionova',
  facebook: 'https://facebook.com/zionova',
  tiktok: 'https://tiktok.com/@zionova',
  whatsapp: 'https://wa.me/94000000000',
  email: 'hello@zionova.com'
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

/* ---------------- Init (run once) ---------------- */
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
  if(localStorage.getItem(STORE_KEYS.brand) === null){
    saveJSON(STORE_KEYS.brand, DEFAULT_BRAND);
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

    // reduce stock
    const products = ProductStore.getAll();
    fullOrder.items.forEach(item => {
      const p = products.find(pp => pp.id === item.productId);
      if(p && typeof p.stock === 'number'){
        p.stock = Math.max(0, p.stock - item.qty);
      }
    });
    ProductStore.save(products);

    return fullOrder;
  },
  getById(id){ return this.getAll().find(o => o.id === id); },
  remove(id){
    const list = this.getAll().filter(o => o.id !== id);
    this.save(list);
  },
  // Reporting helpers
  todayTotal(){
    const todayStr = new Date().toDateString();
    return this.getAll()
      .filter(o => new Date(o.date).toDateString() === todayStr)
      .reduce((sum, o) => sum + o.total, 0);
  },
  monthTotal(){
    const now = new Date();
    return this.getAll()
      .filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, o) => sum + o.total, 0);
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

/* ---------------- Brand settings ---------------- */
const BrandStore = {
  get(){ return loadJSON(STORE_KEYS.brand, DEFAULT_BRAND); },
  save(settings){ saveJSON(STORE_KEYS.brand, settings); }
};

/* ---------------- Currency formatting ---------------- */
function formatMoney(amount){
  return 'Rs. ' + Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
