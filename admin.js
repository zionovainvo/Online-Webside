/* ============================================================
   ZIONOVA — Admin / POS logic (admin.html) — Firebase edition
   ============================================================ */

let toastTimer;
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- Inject icons into static buttons (replaces emojis) ---------- */
function injectIcons(){
  const navIcons = { dashboard:'Dashboard', pos:'Point of Sale', products:'Products', orders:'Orders', reports:'Sales Reports', design:'Website Editor', settings:'Settings' };
  const iconMap = { dashboard:'dashboard', pos:'pos', products:'shirt', orders:'box', reports:'chart', design:'palette', settings:'gear' };
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const tab = btn.dataset.tab;
    btn.innerHTML = `${icon(iconMap[tab])} <span class="label">${navIcons[tab]}</span>`;
  });
  document.getElementById('logoutBtn').innerHTML = icon('power') + ' Logout';
  document.getElementById('addProductBtn').innerHTML = icon('plus') + ' Add Product';
  document.getElementById('exportExcelBtn').innerHTML = icon('download') + ' Export to Excel';
  document.getElementById('sheetIcon').innerHTML = icon('sheet');
  document.getElementById('firebaseIcon').innerHTML = icon('cloud');
}
injectIcons();

let liveProducts = [];
let liveOrders = [];
let unsubProducts = null, unsubOrders = null, unsubSettings = null;

/* =====================================================
   AUTH GATE
   ===================================================== */
function showApp(user){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  document.getElementById('currentAdminEmail').textContent = user.email;
  document.getElementById('fbStatusDot').className = 'status-dot on';
  document.getElementById('fbStatusText').textContent = 'Connected';
  initDashboard();
}
function showLogin(){
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminShell').style.display = 'none';
  if(unsubProducts) unsubProducts();
  if(unsubOrders) unsubOrders();
  if(unsubSettings) unsubSettings();
}

function initAuth(){
  if(!checkFirebaseConfigured()) return;

  AdminAuth.onChange(async user => {
    if(user){
      try{
        applySiteSettings(await SettingsStore.get());
      }catch(e){
        console.error('Could not load site settings:', e);
      }

      showApp(user);
    }else{
      showLogin();
    }
  });
}

document.getElementById('loginForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  try{
    await AdminAuth.login(user, pass);
  }catch(err){
    errorEl.textContent = 'Invalid email or password.';
    console.error(err);
  }
});

document.getElementById('resetPassLink').addEventListener('click', async () => {
  const email = document.getElementById('loginUser').value.trim();
  if(!email){ document.getElementById('loginError').textContent = 'Type your email above first, then click "Forgot password?"'; return; }
  try{
    await AdminAuth.resetPassword(email);
    document.getElementById('loginError').style.color = 'var(--success)';
    document.getElementById('loginError').textContent = 'Password reset email sent.';
  }catch(err){
    document.getElementById('loginError').textContent = 'Could not send reset email — check the address.';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => AdminAuth.logout());

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
    if(btn.dataset.tab === 'design') loadDesignForm();
    if(btn.dataset.tab === 'settings') loadSettingsForm();
  });
});

function initDashboard(){
  // Real-time listeners — any change from any device reflects here
  // (and on the storefront) within a second or two.
  unsubProducts = ProductStore.listen(products => {
    liveProducts = products;
    renderProductsTable();
    renderPOS();
    document.getElementById('statProducts').textContent = liveProducts.length;
  });

  unsubOrders = OrderStore.listen(orders => {
    liveOrders = orders;
    renderDashboard();
    renderOrdersTable();
    renderReports();
  });

  unsubSettings = SettingsStore.listen(settings => {
  currentSettings = settings;

  applySiteSettings(settings);

  // keep design/settings forms in sync if the user is looking at them
  if(document.getElementById('tab-design').classList.contains('active')) loadDesignForm();
  if(document.getElementById('tab-settings').classList.contains('active')) loadSettingsForm();
  });
}

let currentSettings = {};

/* =====================================================
   DASHBOARD
   ===================================================== */
function renderDashboard(){
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('statToday').textContent = formatMoney(computeTodayTotal(liveOrders));
  document.getElementById('statMonth').textContent = formatMoney(computeMonthTotal(liveOrders));
  document.getElementById('statOrders').textContent = liveOrders.length;
  document.getElementById('statProducts').textContent = liveProducts.length;

  renderBars('weekBars', computeLast7Days(liveOrders));

  const recent = liveOrders.slice(0, 6);
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
  tbody.innerHTML = liveProducts.length ? liveProducts.map(p => {
    const final = ProductStore.finalPrice(p);
    const inStock = Number(p.stock) > 0;
    const images = ProductStore.getImages(p);
    return `
    <tr>
      <td><div class="thumb-sm">${images.length ? `<img src="${escapeHTML(images[0])}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML(p.name.slice(0,2))}</div></td>
      <td>${escapeHTML(p.name)}</td>
      <td>${formatMoney(p.price)}</td>
      <td>${p.discount || 0}%</td>
      <td>${formatMoney(final)}</td>
      <td>${p.stock}</td>
      <td><span class="badge ${inStock ? 'badge-in' : 'badge-out'}">${inStock ? 'In Stock' : 'Out of Stock'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openProductModal('${p.id}')">${icon('edit')} Edit</button>
        <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">${icon('trash')}</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="8" class="empty-state">No products yet. Click "Add Product" to create one.</td></tr>`;
}

async function deleteProduct(id){
  if(confirm('Delete this product? This cannot be undone.')){
    await ProductStore.remove(id);
    showToast('Product deleted');
  }
}

const productModalOverlay = document.getElementById('productModalOverlay');
document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
document.getElementById('cancelProductBtn').addEventListener('click', () => productModalOverlay.classList.remove('active'));

function openProductModal(id){
  document.getElementById('productForm').reset();
  document.getElementById('prodDiscount').value = 0;
  if(id){
    const p = liveProducts.find(x => x.id === id);
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('prodId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodDiscount').value = p.discount || 0;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodDesc').value = p.description || '';
    document.getElementById('prodImages').value = ProductStore.getImages(p).join('\n');
  }else{
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('prodId').value = '';
  }
  productModalOverlay.classList.add('active');
}

document.getElementById('productForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const id = document.getElementById('prodId').value;
  const images = document.getElementById('prodImages').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  const data = {
    name: document.getElementById('prodName').value.trim(),
    price: parseFloat(document.getElementById('prodPrice').value) || 0,
    discount: parseFloat(document.getElementById('prodDiscount').value) || 0,
    stock: parseInt(document.getElementById('prodStock').value, 10) || 0,
    description: document.getElementById('prodDesc').value.trim(),
    images: images,
    image: images[0] || '' // kept for backward compatibility
  };
  try{
    if(id){ await ProductStore.update(id, data); showToast('Product updated'); }
    else{ await ProductStore.add(data); showToast('Product added'); }
    productModalOverlay.classList.remove('active');
  }catch(err){
    console.error(err);
    showToast('Failed to save — check your Firestore rules / connection');
  }
});

/* =====================================================
   POINT OF SALE
   ===================================================== */
let posCart = [];

function renderPOS(){
  const grid = document.getElementById('posProducts');
  const search = (document.getElementById('posSearch').value || '').toLowerCase();
  const products = liveProducts.filter(p => p.name.toLowerCase().includes(search));

  grid.innerHTML = products.length ? products.map(p => {
    const final = ProductStore.finalPrice(p);
    const outOfStock = Number(p.stock) <= 0;
    const images = ProductStore.getImages(p);
    return `
    <div class="pos-card" style="${outOfStock ? 'opacity:.4;pointer-events:none;' : ''}" onclick="posAddItem('${p.id}')">
      <div class="thumb">${images.length ? `<img src="${escapeHTML(images[0])}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML(p.name)}</div>
      <h4>${escapeHTML(p.name)}</h4>
      <div class="price">${formatMoney(final)}</div>
    </div>`;
  }).join('') : `<div class="empty-state">No products found.</div>`;

  renderPOSCart();
}

document.getElementById('posSearch').addEventListener('input', renderPOS);

function posAddItem(productId){
  const existing = posCart.find(i => i.productId === productId);
  if(existing) existing.qty += 1; else posCart.push({ productId, qty: 1 });
  renderPOSCart();
}
function posChangeQty(productId, qty){
  if(qty <= 0) posCart = posCart.filter(i => i.productId !== productId);
  else { const item = posCart.find(i => i.productId === productId); if(item) item.qty = qty; }
  renderPOSCart();
}
function posDetailedItems(){
  return posCart.map(item => {
    const p = liveProducts.find(pp => pp.id === item.productId);
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
        <small style="color:var(--grey);display:inline-flex;align-items:center;gap:6px;">
          <button class="qty-btn" onclick="posChangeQty('${i.productId}', ${i.qty - 1})">${icon('minus')}</button>
          ${i.qty}
          <button class="qty-btn" onclick="posChangeQty('${i.productId}', ${i.qty + 1})">${icon('plus')}</button>
        </small>
      </span>
      <span>${formatMoney(i.lineTotal)}</span>
      <span class="rm" onclick="posChangeQty('${i.productId}', 0)">Remove</span>
    </div>
  `).join('') : `<div class="empty-state">No items added yet.</div>`;

  const total = items.reduce((s,i) => s + i.lineTotal, 0);
  document.getElementById('posTotal').textContent = formatMoney(total);
}

document.getElementById('posClearBtn').addEventListener('click', () => { posCart = []; renderPOSCart(); });

document.getElementById('posCheckoutBtn').addEventListener('click', async () => {
  const items = posDetailedItems();
  if(!items.length){ showToast('Add at least one item first'); return; }
  const customerName = document.getElementById('posCustomerName').value.trim() || 'Walk-in Customer';
  const paymentMethod = document.getElementById('posPaymentMethod').value;
  const subtotal = items.reduce((s,i) => s + i.lineTotal, 0);

  const btn = document.getElementById('posCheckoutBtn');
  btn.disabled = true; btn.textContent = 'Processing…';

  try{
    const order = await OrderStore.create({
      source: 'pos', items, subtotal, shipping: 0, total: subtotal,
      customer: { name: customerName }, paymentMethod, status: 'Paid'
    });

    posCart = [];
    document.getElementById('posCustomerName').value = '';
    renderPOSCart();
    showToast(`Sale completed — ${order.id}`);

    if(confirm('Sale completed! Open printable receipt now?')){
      window.open(`receipt.html?order=${order.id}`, '_blank');
    }
  }catch(err){
    console.error(err);
    showToast('Sale failed — check your connection');
  }finally{
    btn.disabled = false; btn.textContent = 'Complete Sale';
  }
});

/* =====================================================
   ORDERS
   ===================================================== */
function renderOrdersTable(){
  const tbody = document.getElementById('ordersTable');
  const sourceFilter = document.getElementById('orderSourceFilter').value;
  const dateFilter = document.getElementById('orderDateFilter').value;

  let orders = liveOrders;
  if(sourceFilter !== 'all') orders = orders.filter(o => o.source === sourceFilter);
  if(dateFilter) orders = orders.filter(o => new Date(o.date).toISOString().slice(0,10) === dateFilter);

  tbody.innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td>${escapeHTML(o.id)}</td>
      <td>${escapeHTML(o.customer.name || 'Walk-in')}</td>
      <td>${o.items.reduce((s,i) => s + i.qty, 0)} items</td>
      <td>${formatMoney(o.total)}</td>
      <td>${escapeHTML(o.paymentMethod)}</td>
      <td>${renderPaymentStatusCell(o)}</td>
      <td>${o.source === 'pos' ? 'In-Store' : 'Online'}</td>
      <td>${new Date(o.date).toLocaleString()}</td>
      <td><a class="btn btn-outline btn-sm" href="receipt.html?order=${o.id}" target="_blank">${icon('print')} Bill</a></td>
    </tr>
  `).join('') : `<tr><td colspan="9" class="empty-state">No orders match this filter.</td></tr>`;
}

function renderPaymentStatusCell(o){
  const status = o.paymentStatus || 'N/A';
  const badgeClass = status === 'Verified' ? 'badge-in' : status === 'Rejected' ? 'badge-out' : 'badge-out';
  let html = `<span class="badge ${badgeClass}">${escapeHTML(status)}</span>`;
  if(o.paymentProofUrl){
    html += `<br><a href="${escapeHTML(o.paymentProofUrl)}" target="_blank" class="gold-text" style="font-size:11px;">View proof</a>`;
  }
  if(o.paymentMethod === 'Bank Transfer' && status === 'Pending Verification'){
    html += `<br><button class="btn btn-outline btn-sm" style="margin-top:4px;padding:4px 8px;font-size:10px;" onclick="setPaymentStatus('${o.id}','Verified')">Verify</button>
      <button class="btn btn-danger" style="margin-top:4px;padding:4px 8px;font-size:10px;" onclick="setPaymentStatus('${o.id}','Rejected')">Reject</button>`;
  }
  return html;
}

async function setPaymentStatus(orderId, status){
  try{
    await OrderStore.update(orderId, { paymentStatus: status });
    showToast(`Payment marked as ${status}`);
  }catch(err){
    console.error(err);
    showToast('Failed to update payment status');
  }
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
  document.getElementById('repToday').textContent = formatMoney(computeTodayTotal(liveOrders));
  document.getElementById('repMonth').textContent = formatMoney(computeMonthTotal(liveOrders));
  renderBars('dailyReportBars', computeLast7Days(liveOrders));
  renderBars('monthlyReportBars', computeLast6Months(liveOrders));

  const tally = {};
  liveOrders.forEach(o => {
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

document.getElementById('exportExcelBtn').addEventListener('click', () => {
  if(!liveOrders.length){ showToast('No orders to export yet'); return; }
  const now = new Date();
  const monthOrders = liveOrders.filter(o => {
    const d = new Date(o.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const filename = `Zionova-Sales-${now.toLocaleString('en-US',{month:'long'})}-${now.getFullYear()}.xlsx`;
  exportOrdersToExcel(monthOrders.length ? monthOrders : liveOrders, filename);
  showToast('Excel file downloaded');
});

/* =====================================================
   WEBSITE EDITOR (Design tab)
   ===================================================== */
function buildFontOptions(){
  const wrap = document.getElementById('fontOptions');
  wrap.innerHTML = Object.entries(FONT_PAIRS).map(([key, f]) => `
    <div class="font-option" data-font="${key}">
      <div class="preview" style="font-family:${f.serif.split(',')[0]}, serif;">Zionova</div>
      <div class="label">${f.label}</div>
    </div>
  `).join('');
  wrap.querySelectorAll('.font-option').forEach(el => {
    el.addEventListener('click', () => {
      wrap.querySelectorAll('.font-option').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
    });
  });
}

function loadDesignForm(){
  const s = currentSettings;
  // Hero
  document.getElementById('d_heroEyebrow').value = s.heroEyebrow || '';
  document.getElementById('d_heroTitle').value = s.heroTitle || '';
  document.getElementById('d_description').value = s.description || '';
  document.getElementById('d_heroCtaPrimary').value = s.heroCtaPrimary || '';
  document.getElementById('d_heroCtaSecondary').value = s.heroCtaSecondary || '';
  document.getElementById('d_heroVisualCaption').value = s.heroVisualCaption || '';
  // About
  document.getElementById('d_aboutLabel').value = s.aboutLabel || '';
  document.getElementById('d_aboutHeading').value = s.aboutHeading || '';
  document.getElementById('d_aboutText').value = s.aboutText || '';
  document.getElementById('d_stat1Value').value = s.stat1Value || '';
  document.getElementById('d_stat1Label').value = s.stat1Label || '';
  document.getElementById('d_stat2Value').value = s.stat2Value || '';
  document.getElementById('d_stat2Label').value = s.stat2Label || '';
  document.getElementById('d_stat3Value').value = s.stat3Value || '';
  document.getElementById('d_stat3Label').value = s.stat3Label || '';
  // Sections
  document.getElementById('d_productsLabel').value = s.productsLabel || '';
  document.getElementById('d_productsTitle').value = s.productsTitle || '';
  document.getElementById('d_productsSubtitle').value = s.productsSubtitle || '';
  document.getElementById('d_socialsLabel').value = s.socialsLabel || '';
  document.getElementById('d_socialsTitle').value = s.socialsTitle || '';
  document.getElementById('d_socialsSubtitle').value = s.socialsSubtitle || '';
  document.getElementById('d_footerCopyright').value = s.footerCopyright || '';
  // Images
  document.getElementById('d_logoImage').value = s.logoImageUrl || '';
  document.getElementById('d_heroImage').value = s.heroImageUrl || '';
  document.getElementById('d_aboutImage').value = s.aboutImageUrl || '';
  // Receipt
  document.getElementById('d_receiptShowLogo').checked = !!s.receiptShowLogo;
  document.getElementById('d_receiptThanks').value = s.receiptThanksMessage || '';
  document.getElementById('d_receiptFooterNote').value = s.receiptFooterNote || '';
  document.getElementById('d_returnPolicy').value = s.returnPolicyContent || '';
  document.getElementById('d_privacyPolicy').value = s.privacyPolicyContent || '';

  document.getElementById('d_colorBg').value = s.colorBg || '#ffffff';
  document.getElementById('d_colorBgText').value = s.colorBg || '#ffffff';
  document.getElementById('d_colorText').value = s.colorText || '#0d0d0d';
  document.getElementById('d_colorTextText').value = s.colorText || '#0d0d0d';
  document.getElementById('d_colorGold').value = s.colorGold || '#c9a227';
  document.getElementById('d_colorGoldText').value = s.colorGold || '#c9a227';

  document.querySelectorAll('.font-option').forEach(el => {
    el.classList.toggle('active', el.dataset.font === (s.fontPair || 'playfair-poppins'));
  });
}

// keep color swatch <-> text input in sync
['Bg','Text','Gold'].forEach(key => {
  const colorEl = document.getElementById('d_color' + key);
  const textEl = document.getElementById('d_color' + key + 'Text');
  colorEl.addEventListener('input', () => textEl.value = colorEl.value);
  textEl.addEventListener('input', () => { if(/^#[0-9a-fA-F]{6}$/.test(textEl.value)) colorEl.value = textEl.value; });
});

document.getElementById('heroForm').addEventListener('submit', async e => {
  e.preventDefault();
  await SettingsStore.save({
    heroEyebrow: document.getElementById('d_heroEyebrow').value.trim(),
    heroTitle: document.getElementById('d_heroTitle').value.trim(),
    description: document.getElementById('d_description').value.trim(),
    heroCtaPrimary: document.getElementById('d_heroCtaPrimary').value.trim(),
    heroCtaSecondary: document.getElementById('d_heroCtaSecondary').value.trim(),
    heroVisualCaption: document.getElementById('d_heroVisualCaption').value.trim()
  });
  showToast('Hero section saved — live on your site now');
});

document.getElementById('aboutForm').addEventListener('submit', async e => {
  e.preventDefault();
  await SettingsStore.save({
    aboutLabel: document.getElementById('d_aboutLabel').value.trim(),
    aboutHeading: document.getElementById('d_aboutHeading').value.trim(),
    aboutText: document.getElementById('d_aboutText').value.trim(),
    stat1Value: document.getElementById('d_stat1Value').value.trim(),
    stat1Label: document.getElementById('d_stat1Label').value.trim(),
    stat2Value: document.getElementById('d_stat2Value').value.trim(),
    stat2Label: document.getElementById('d_stat2Label').value.trim(),
    stat3Value: document.getElementById('d_stat3Value').value.trim(),
    stat3Label: document.getElementById('d_stat3Label').value.trim()
  });
  showToast('About section saved — live on your site now');
});

document.getElementById('sectionsForm').addEventListener('submit', async e => {
  e.preventDefault();
  await SettingsStore.save({
    productsLabel: document.getElementById('d_productsLabel').value.trim(),
    productsTitle: document.getElementById('d_productsTitle').value.trim(),
    productsSubtitle: document.getElementById('d_productsSubtitle').value.trim(),
    socialsLabel: document.getElementById('d_socialsLabel').value.trim(),
    socialsTitle: document.getElementById('d_socialsTitle').value.trim(),
    socialsSubtitle: document.getElementById('d_socialsSubtitle').value.trim(),
    footerCopyright: document.getElementById('d_footerCopyright').value.trim()
  });
  showToast('Section text saved — live on your site now');
});

document.getElementById('imagesForm').addEventListener('submit', async e => {
  e.preventDefault();
  await SettingsStore.save({
    logoImageUrl: document.getElementById('d_logoImage').value.trim(),
    heroImageUrl: document.getElementById('d_heroImage').value.trim(),
    aboutImageUrl: document.getElementById('d_aboutImage').value.trim()
  });
  showToast('Images saved — live on your site now');
});

document.getElementById('receiptForm').addEventListener('submit', async e => {
  e.preventDefault();
  await SettingsStore.save({
    receiptShowLogo: document.getElementById('d_receiptShowLogo').checked,
    receiptThanksMessage: document.getElementById('d_receiptThanks').value.trim(),
    receiptFooterNote: document.getElementById('d_receiptFooterNote').value.trim()
  });
  showToast('Receipt design saved — used on every order from now on');
});

document.getElementById('saveColorsBtn').addEventListener('click', async () => {
  await SettingsStore.save({
    colorBg: document.getElementById('d_colorBgText').value.trim(),
    colorText: document.getElementById('d_colorTextText').value.trim(),
    colorGold: document.getElementById('d_colorGoldText').value.trim()
  });
  showToast('Colours saved — live on your site now');
});

document.getElementById('saveFontBtn').addEventListener('click', async () => {
  const active = document.querySelector('.font-option.active');
  const fontPair = active ? active.dataset.font : 'playfair-poppins';
  await SettingsStore.save({ fontPair });
  showToast('Font saved — live on your site now');
});

document.getElementById('legalForm').addEventListener('submit', async e => {
  e.preventDefault();
  await SettingsStore.save({
    returnPolicyContent: document.getElementById('d_returnPolicy').value.trim(),
    privacyPolicyContent: document.getElementById('d_privacyPolicy').value.trim()
  });
  showToast('Legal pages saved — live on your site now');
});

/* =====================================================
   SETTINGS TAB
   ===================================================== */
function loadSettingsForm(){
  const s = currentSettings;
  document.getElementById('setInstagram').value = s.instagram || '';
  document.getElementById('setFacebook').value = s.facebook || '';
  document.getElementById('setTiktok').value = s.tiktok || '';
  document.getElementById('setWhatsapp').value = s.whatsapp || '';
  document.getElementById('setEmail').value = s.email || '';
  document.getElementById('setShipping').value = s.shippingFee ?? 350;
  document.getElementById('setBankDetails').value = s.bankDetails || '';

  document.getElementById('sheetWebhookUrl').value = s.sheetWebhookUrl || '';
  const connected = !!s.sheetWebhookUrl;
  document.getElementById('sheetStatusDot').className = 'status-dot ' + (connected ? 'on' : 'off');
  document.getElementById('sheetStatusText').textContent = connected ? 'Connected' : 'Not connected';
}

document.getElementById('brandForm').addEventListener('submit', async function(e){
  e.preventDefault();
  await SettingsStore.save({
    instagram: document.getElementById('setInstagram').value.trim(),
    facebook: document.getElementById('setFacebook').value.trim(),
    tiktok: document.getElementById('setTiktok').value.trim(),
    whatsapp: document.getElementById('setWhatsapp').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    shippingFee: parseFloat(document.getElementById('setShipping').value) || 0
  });
  showToast('Settings saved — live on your site now');
});

document.getElementById('bankForm').addEventListener('submit', async function(e){
  e.preventDefault();
  await SettingsStore.save({
    bankDetails: document.getElementById('setBankDetails').value.trim()
  });
  showToast('Bank details saved — shown at checkout');
});

document.getElementById('saveSheetBtn').addEventListener('click', async () => {
  const url = document.getElementById('sheetWebhookUrl').value.trim();
  await SettingsStore.save({ sheetWebhookUrl: url });
  showToast(url ? 'Google Sheet connected' : 'Google Sheet disconnected');
});

document.getElementById('testSheetBtn').addEventListener('click', async () => {
  const url = document.getElementById('sheetWebhookUrl').value.trim();
  if(!url){ showToast('Paste your Web App URL first'); return; }
  try{
    await testSheetConnection(url);
    showToast('Test row sent — check your Google Sheet');
  }catch(err){
    showToast('Could not reach that URL');
  }
});

document.getElementById('sendResetBtn').addEventListener('click', async () => {
  const user = AdminAuth.currentUser();
  if(!user) return;
  try{
    await AdminAuth.resetPassword(user.email);
    showToast('Password reset email sent to ' + user.email);
  }catch(err){
    showToast('Failed to send reset email');
  }
});

initAuth();
