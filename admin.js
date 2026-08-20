/* ============================================================
   ZIONOVA — Admin / POS logic (admin.html)
   ============================================================ */

function escapeHTML(str=''){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
let toastTimer;
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* =====================================================
   AUTH GATE
   ===================================================== */
async function showApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  await initDashboard();
}
function showLogin(){
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminShell').style.display = 'none';
}

if(AdminAuth.isLoggedIn()){
  showApp();
}else{
  showLogin();
}

document.getElementById('loginForm').addEventListener('submit', function(e){
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  if(AdminAuth.login(user, pass)){
    errorEl.textContent = '';
    showApp();
  }else{
    errorEl.textContent = 'Invalid username or password.';
  }
});

document.getElementById('logoutBtn').addEventListener('click', function(){
  AdminAuth.logout();
  showLogin();
});

/* =====================================================
   TAB NAVIGATION
   ===================================================== */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab === 'dashboard') renderDashboard();
    if(btn.dataset.tab === 'pos') renderPOS();
    if(btn.dataset.tab === 'products') renderProductsTable();
    if(btn.dataset.tab === 'orders') renderOrdersTable();
    if(btn.dataset.tab === 'reports') renderReports();
    if(btn.dataset.tab === 'settings') loadSettingsForm();
  });
});

async function initDashboard(){
  await SheetsStore.pullOrders();
  renderDashboard();
  renderPOS();
  renderProductsTable();
  renderOrdersTable();
  renderReports();
  loadSettingsForm();
}

/* =====================================================
   DASHBOARD
   ===================================================== */
function renderDashboard(){
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('statToday').textContent = formatMoney(OrderStore.todayTotal());
  document.getElementById('statMonth').textContent = formatMoney(OrderStore.monthTotal());
  document.getElementById('statOrders').textContent = OrderStore.getAll().length;
  document.getElementById('statProducts').textContent = ProductStore.getAll().length;

  renderBars('weekBars', OrderStore.last7Days());

  const recent = OrderStore.getAll().slice(0, 6);
  const tbody = document.querySelector('#recentOrdersTable tbody');
  tbody.innerHTML = recent.length ? recent.map(o => `
    <tr>
      <td>${escapeHTML(o.id)}</td>
      <td>${escapeHTML(o.customer.name || 'Walk-in')}</td>
      <td>${o.source === 'pos' ? 'In-Store' : 'Online'}</td>
      <td>${formatMoney(o.total)}</td>
      <td>${new Date(o.date).toLocaleString()}</td>
    </tr>
  `).join('') : `<tr><td colspan="5" class="empty-state">No orders yet.</td></tr>`;
}

function renderBars(containerId, dataArr){
  const el = document.getElementById(containerId);
  const max = Math.max(...dataArr.map(d => d.total), 1);
  el.innerHTML = dataArr.map(d => `
    <div class="report-bar-wrap">
      <div class="report-bar-val">${d.total > 0 ? Math.round(d.total).toLocaleString() : ''}</div>
      <div class="report-bar" style="height:${Math.max((d.total / max) * 100, 2)}%;"></div>
      <div class="report-bar-label">${escapeHTML(d.label)}</div>
    </div>
  `).join('');
}

/* =====================================================
   PRODUCTS (Manage)
   ===================================================== */
function renderProductsTable(){
  const tbody = document.getElementById('productsTable');
  const products = ProductStore.getAll();
  tbody.innerHTML = products.length ? products.map(p => {
    const final = ProductStore.finalPrice(p);
    const inStock = Number(p.stock) > 0;
    return `
    <tr>
      <td><div class="thumb-sm">${p.image ? `<img src="${escapeHTML(p.image)}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML(p.name.slice(0,2))}</div></td>
      <td>${escapeHTML(p.name)}</td>
      <td>${formatMoney(p.price)}</td>
      <td>${p.discount || 0}%</td>
      <td>${formatMoney(final)}</td>
      <td>${p.stock}</td>
      <td><span class="badge ${inStock ? 'badge-in' : 'badge-out'}">${inStock ? 'In Stock' : 'Out of Stock'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openProductModal('${p.id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="8" class="empty-state">No products yet. Click "Add Product" to create one.</td></tr>`;
}

function deleteProduct(id){
  if(confirm('Delete this product? This cannot be undone.')){
    ProductStore.remove(id);
    renderProductsTable();
    renderPOS();
    showToast('Product deleted');
  }
}

/* Product Modal */
const productModalOverlay = document.getElementById('productModalOverlay');
document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
document.getElementById('cancelProductBtn').addEventListener('click', () => productModalOverlay.classList.remove('active'));

function openProductModal(id){
  document.getElementById('productForm').reset();
  document.getElementById('prodDiscount').value = 0;
  if(id){
    const p = ProductStore.getById(id);
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('prodId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodDiscount').value = p.discount || 0;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodDesc').value = p.description || '';
    document.getElementById('prodImage').value = p.image || '';
  }else{
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('prodId').value = '';
  }
  productModalOverlay.classList.add('active');
}

document.getElementById('productForm').addEventListener('submit', function(e){
  e.preventDefault();
  const id = document.getElementById('prodId').value;
  const data = {
    name: document.getElementById('prodName').value.trim(),
    price: parseFloat(document.getElementById('prodPrice').value) || 0,
    discount: parseFloat(document.getElementById('prodDiscount').value) || 0,
    stock: parseInt(document.getElementById('prodStock').value, 10) || 0,
    description: document.getElementById('prodDesc').value.trim(),
    image: document.getElementById('prodImage').value.trim()
  };
  if(id){
    ProductStore.update(id, data);
    showToast('Product updated');
  }else{
    ProductStore.add(data);
    showToast('Product added');
  }
  productModalOverlay.classList.remove('active');
  renderProductsTable();
  renderPOS();
});

/* =====================================================
   POINT OF SALE
   ===================================================== */
let posCart = []; // { productId, qty }

function renderPOS(){
  const grid = document.getElementById('posProducts');
  const search = (document.getElementById('posSearch').value || '').toLowerCase();
  const products = ProductStore.getAll().filter(p => p.name.toLowerCase().includes(search));

  grid.innerHTML = products.length ? products.map(p => {
    const final = ProductStore.finalPrice(p);
    const outOfStock = Number(p.stock) <= 0;
    return `
    <div class="pos-card" style="${outOfStock ? 'opacity:.4;pointer-events:none;' : ''}" onclick="posAddItem('${p.id}')">
      <div class="thumb">${p.image ? `<img src="${escapeHTML(p.image)}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML(p.name)}</div>
      <h4>${escapeHTML(p.name)}</h4>
      <div class="price">${formatMoney(final)}</div>
    </div>`;
  }).join('') : `<div class="empty-state">No products found.</div>`;

  renderPOSCart();
}

document.getElementById('posSearch').addEventListener('input', renderPOS);

function posAddItem(productId){
  const existing = posCart.find(i => i.productId === productId);
  if(existing) existing.qty += 1;
  else posCart.push({ productId, qty: 1 });
  renderPOSCart();
}

function posChangeQty(productId, qty){
  if(qty <= 0){
    posCart = posCart.filter(i => i.productId !== productId);
  }else{
    const item = posCart.find(i => i.productId === productId);
    if(item) item.qty = qty;
  }
  renderPOSCart();
}

function posDetailedItems(){
  const products = ProductStore.getAll();
  return posCart.map(item => {
    const p = products.find(pp => pp.id === item.productId);
    if(!p) return null;
    const unitPrice = ProductStore.finalPrice(p);
    return { productId: item.productId, name: p.name, unitPrice, qty: item.qty, lineTotal: unitPrice * item.qty };
  }).filter(Boolean);
}

function renderPOSCart(){
  const wrap = document.getElementById('posCartItems');
  const items = posDetailedItems();
  wrap.innerHTML = items.length ? items.map(i => `
    <div class="order-line">
      <span class="name">${escapeHTML(i.name)}<br>
        <small style="color:var(--grey);">
          <button class="qty-btn" style="display:inline-flex;" onclick="posChangeQty('${i.productId}', ${i.qty - 1})">−</button>
          ${i.qty}
          <button class="qty-btn" style="display:inline-flex;" onclick="posChangeQty('${i.productId}', ${i.qty + 1})">+</button>
        </small>
      </span>
      <span>${formatMoney(i.lineTotal)}</span>
      <span class="rm" onclick="posChangeQty('${i.productId}', 0)">Remove</span>
    </div>
  `).join('') : `<div class="empty-state">No items added yet.</div>`;

  const total = items.reduce((s,i) => s + i.lineTotal, 0);
  document.getElementById('posTotal').textContent = formatMoney(total);
}

document.getElementById('posClearBtn').addEventListener('click', () => {
  posCart = [];
  renderPOSCart();
});

document.getElementById('posCheckoutBtn').addEventListener('click', async () => {
  const items = posDetailedItems();
  if(!items.length){
    showToast('Add at least one item first');
    return;
  }
  const customerName = document.getElementById('posCustomerName').value.trim() || 'Walk-in Customer';
  const paymentMethod = document.getElementById('posPaymentMethod').value;
  const subtotal = items.reduce((s,i) => s + i.lineTotal, 0);

  const order = OrderStore.create({
    source: 'pos',
    items,
    subtotal,
    shipping: 0,
    total: subtotal,
    customer: { name: customerName },
    paymentMethod,
    status: 'Paid'
  });

  await SheetsStore.syncOrder(order);

  posCart = [];
  document.getElementById('posCustomerName').value = '';
  renderPOSCart();
  renderPOS();
  showToast(`Sale completed — ${order.id}`);
  renderDashboard();
  renderOrdersTable();

  if(confirm('Sale completed! Open printable receipt now?')){
    window.open(`receipt.html?order=${order.id}`, '_blank');
  }
});

/* =====================================================
   ORDERS
   ===================================================== */
function renderOrdersTable(){
  const tbody = document.getElementById('ordersTable');
  const sourceFilter = document.getElementById('orderSourceFilter').value;
  const dateFilter = document.getElementById('orderDateFilter').value;

  let orders = OrderStore.getAll();
  if(sourceFilter !== 'all') orders = orders.filter(o => o.source === sourceFilter);
  if(dateFilter){
    orders = orders.filter(o => new Date(o.date).toISOString().slice(0,10) === dateFilter);
  }

  tbody.innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td>${escapeHTML(o.id)}</td>
      <td>${escapeHTML(o.customer.name || 'Walk-in')}</td>
      <td>${o.items.reduce((s,i) => s + i.qty, 0)} items</td>
      <td>${formatMoney(o.total)}</td>
      <td>${escapeHTML(o.paymentMethod)}</td>
      <td>${o.source === 'pos' ? 'In-Store' : 'Online'}</td>
      <td>${new Date(o.date).toLocaleString()}</td>
      <td>
        <a class="btn btn-outline btn-sm" href="receipt.html?order=${o.id}" target="_blank">View Bill</a>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="8" class="empty-state">No orders match this filter.</td></tr>`;
}

document.getElementById('orderSourceFilter').addEventListener('change', renderOrdersTable);
document.getElementById('orderDateFilter').addEventListener('change', renderOrdersTable);
document.getElementById('clearOrderFilter').addEventListener('click', () => {
  document.getElementById('orderSourceFilter').value = 'all';
  document.getElementById('orderDateFilter').value = '';
  renderOrdersTable();
});

/* =====================================================
   REPORTS
   ===================================================== */
function renderReports(){
  document.getElementById('repToday').textContent = formatMoney(OrderStore.todayTotal());
  document.getElementById('repMonth').textContent = formatMoney(OrderStore.monthTotal());
  renderBars('dailyReportBars', OrderStore.last7Days());
  renderBars('monthlyReportBars', OrderStore.last6Months());

  // Best sellers
  const tally = {};
  OrderStore.getAll().forEach(o => {
    o.items.forEach(i => {
      if(!tally[i.name]) tally[i.name] = { units: 0, revenue: 0 };
      tally[i.name].units += i.qty;
      tally[i.name].revenue += i.lineTotal;
    });
  });
  const sorted = Object.entries(tally).sort((a,b) => b[1].units - a[1].units).slice(0, 8);
  const tbody = document.getElementById('bestSellersTable');
  tbody.innerHTML = sorted.length ? sorted.map(([name, stats]) => `
    <tr><td>${escapeHTML(name)}</td><td>${stats.units}</td><td>${formatMoney(stats.revenue)}</td></tr>
  `).join('') : `<tr><td colspan="3" class="empty-state">No sales data yet.</td></tr>`;
}

/* =====================================================
   SETTINGS
   ===================================================== */
function loadSettingsForm(){
  const brand = BrandStore.get();
  document.getElementById('setDesc').value = brand.description || '';
  document.getElementById('setInstagram').value = brand.instagram || '';
  document.getElementById('setFacebook').value = brand.facebook || '';
  document.getElementById('setTiktok').value = brand.tiktok || '';
  document.getElementById('setWhatsapp').value = brand.whatsapp || '';
  document.getElementById('setEmail').value = brand.email || '';
  document.getElementById('setSheetsUrl').value = SheetsStore.getUrl();

  const creds = AdminAuth.getCredentials();
  document.getElementById('setUsername').value = creds.username;
  document.getElementById('setPassword').value = '';
}

document.getElementById('brandForm').addEventListener('submit', function(e){
  e.preventDefault();
  BrandStore.save({
    ...BrandStore.get(),
    description: document.getElementById('setDesc').value.trim(),
    instagram: document.getElementById('setInstagram').value.trim(),
    facebook: document.getElementById('setFacebook').value.trim(),
    tiktok: document.getElementById('setTiktok').value.trim(),
    whatsapp: document.getElementById('setWhatsapp').value.trim(),
    email: document.getElementById('setEmail').value.trim()
  });
  SheetsStore.setUrl(document.getElementById('setSheetsUrl').value);
  showToast('Brand settings saved');
});

document.getElementById('credsForm').addEventListener('submit', function(e){
  e.preventDefault();
  const username = document.getElementById('setUsername').value.trim();
  const password = document.getElementById('setPassword').value;
  if(!username || !password){ showToast('Please fill both fields'); return; }
  AdminAuth.setCredentials(username, password);
  showToast('Login credentials updated');
});
