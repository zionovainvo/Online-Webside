/* ============================================================
   ZIONOVA — Admin / POS logic (admin.html)
   ============================================================ */

applyTheme();

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
   ICONS — wire up every icon slot once on load
   ===================================================== */
function paintStaticIcons(){
  document.getElementById('loginLockIcon').innerHTML = icon('lock', 26);
  document.getElementById('logoutIcon').innerHTML = icon('power', 16);
  document.getElementById('addProductBtn').innerHTML = icon('plus', 14) + ' Add Product';
  document.getElementById('exportExcelBtn').innerHTML = icon('excel', 14) + ' Export to Excel';
  document.getElementById('backToStoreLink').innerHTML = `<a href="index.html">${icon('arrowLeft',12)} Back to store</a>`;

  const navIconMap = { dashboard:'dashboard', pos:'pos', products:'shirt', orders:'box', reports:'chart', editor:'edit', settings:'gear' };
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const slot = btn.querySelector('.nav-icon');
    if(slot) slot.innerHTML = icon(navIconMap[btn.dataset.tab] || 'dashboard', 18);
  });
}
paintStaticIcons();

/* =====================================================
   AUTH GATE
   ===================================================== */
function showApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  initDashboard();
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
    if(btn.dataset.tab === 'editor') loadEditorForm();
    if(btn.dataset.tab === 'settings') loadSettingsForm();
  });
});

function initDashboard(){
  renderDashboard();
  renderPOS();
  renderProductsTable();
  renderOrdersTable();
  renderReports();
  loadEditorForm();
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
        <button class="btn btn-outline btn-sm" onclick="openProductModal('${p.id}')">${icon('edit',12)} Edit</button>
        <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">${icon('trash',12)}</button>
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
let posCart = [];

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
        <small style="color:var(--grey);display:inline-flex;align-items:center;gap:6px;margin-top:4px;">
          <button class="qty-btn" onclick="posChangeQty('${i.productId}', ${i.qty - 1})">${icon('minus',10)}</button>
          ${i.qty}
          <button class="qty-btn" onclick="posChangeQty('${i.productId}', ${i.qty + 1})">${icon('plus',10)}</button>
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

document.getElementById('posCheckoutBtn').addEventListener('click', () => {
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
        <a class="btn btn-outline btn-sm" href="receipt.html?order=${o.id}" target="_blank">${icon('printer',12)} View Bill</a>
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

/* ---------- Export to Excel (SheetJS) ---------- */
document.getElementById('exportExcelBtn').addEventListener('click', function(){
  if(typeof XLSX === 'undefined'){
    showToast('Excel library failed to load — check your internet connection');
    return;
  }
  const orders = OrderStore.getAll();
  if(!orders.length){
    showToast('No orders to export yet');
    return;
  }

  // Sheet 1: every order as one row
  const orderRows = orders.map(o => ({
    'Order ID': o.id,
    'Date': new Date(o.date).toLocaleString(),
    'Source': o.source === 'pos' ? 'In-Store (POS)' : 'Online',
    'Customer Name': o.customer.name || 'Walk-in Customer',
    'Phone': o.customer.phone || '',
    'Email': o.customer.email || '',
    'Items': o.items.map(i => `${i.name} x${i.qty}`).join(', '),
    'Subtotal': o.subtotal,
    'Shipping': o.shipping,
    'Total': o.total,
    'Payment Method': o.paymentMethod,
    'Status': o.status
  }));

  // Sheet 2: daily totals for the current month
  const dailyMap = {};
  OrderStore.ordersInCurrentMonth().forEach(o => {
    const day = new Date(o.date).toLocaleDateString();
    dailyMap[day] = (dailyMap[day] || 0) + o.total;
  });
  const dailyRows = Object.entries(dailyMap).map(([date, total]) => ({ Date: date, 'Total Sales (Rs.)': total }));

  // Sheet 3: monthly totals, last 6 months
  const monthlyRows = OrderStore.last6Months().map(m => ({ Month: m.label, 'Total Sales (Rs.)': m.total }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), 'All Orders');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily Sales (This Month)');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly Sales (6mo)');

  const filename = `Zionova-Sales-Report-${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast('Excel report downloaded');
});

/* =====================================================
   WEBSITE EDITOR
   ===================================================== */
const FONT_PAIRS = [
  {
    name: 'Playfair Display + Poppins',
    tag: 'Classic Luxury (default)',
    heading: "'Playfair Display', Georgia, serif",
    body: "'Poppins', Arial, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap'
  },
  {
    name: 'Cormorant Garamond + Montserrat',
    tag: 'Elegant Editorial',
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Montserrat', Arial, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@300;400;500;600;700&display=swap'
  },
  {
    name: 'Bodoni Moda + Inter',
    tag: 'Bold High Fashion',
    heading: "'Bodoni Moda', Georgia, serif",
    body: "'Inter', Arial, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap'
  },
  {
    name: 'Marcellus + Lato',
    tag: 'Minimal Classic',
    heading: "'Marcellus', Georgia, serif",
    body: "'Lato', Arial, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Marcellus&family=Lato:wght@300;400;700&display=swap'
  },
  {
    name: 'Cinzel + Raleway',
    tag: 'Bold Statement',
    heading: "'Cinzel', Georgia, serif",
    body: "'Raleway', Arial, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Raleway:wght@300;400;500;600;700&display=swap'
  }
];

let selectedFontIndex = 0;

function loadEditorForm(){
  const site = SiteStore.get();
  const c = site.content, images = site.images, theme = site.theme;

  document.getElementById('edHeroEyebrow').value = c.heroEyebrow;
  document.getElementById('edHeroTitleMain').value = c.heroTitleMain;
  document.getElementById('edHeroTitleAccent').value = c.heroTitleAccent;
  document.getElementById('edHeroDesc').value = c.heroDesc;
  document.getElementById('edHeroCaption').value = c.heroVisualCaption;
  document.getElementById('edHeroImage').value = images.heroImage;

  document.getElementById('edAboutBadge').value = c.aboutBadge;
  document.getElementById('edAboutHeading').value = c.aboutHeading;
  document.getElementById('edAboutDesc').value = c.aboutDesc;
  document.getElementById('edAboutDesc2').value = c.aboutDesc2;
  document.getElementById('edStat1Value').value = c.stat1Value;
  document.getElementById('edStat1Label').value = c.stat1Label;
  document.getElementById('edStat2Value').value = c.stat2Value;
  document.getElementById('edStat2Label').value = c.stat2Label;
  document.getElementById('edStat3Value').value = c.stat3Value;
  document.getElementById('edStat3Label').value = c.stat3Label;
  document.getElementById('edAboutImage').value = images.aboutImage;

  document.getElementById('edFooterAbout').value = c.footerAbout;
  document.getElementById('edFooterNote').value = c.footerNote;

  document.getElementById('edPrimaryColor').value = theme.primaryColor;
  document.getElementById('edPrimaryColorText').value = theme.primaryColor;
  document.getElementById('edTextColor').value = theme.textColor;
  document.getElementById('edTextColorText').value = theme.textColor;
  document.getElementById('edBgColor').value = theme.bgColor;
  document.getElementById('edBgColorText').value = theme.bgColor;
  document.getElementById('edPrimaryLight').value = theme.primaryLight;
  document.getElementById('edPrimaryLightText').value = theme.primaryLight;

  syncColorPickers();
  renderImagePreviews();

  selectedFontIndex = FONT_PAIRS.findIndex(f => f.heading === theme.headingFont);
  if(selectedFontIndex === -1) selectedFontIndex = 0;
  renderFontOptions();
}

function syncColorPickers(){
  bindColorPair('edPrimaryColor', 'edPrimaryColorText');
  bindColorPair('edTextColor', 'edTextColorText');
  bindColorPair('edBgColor', 'edBgColorText');
  bindColorPair('edPrimaryLight', 'edPrimaryLightText');
}
function bindColorPair(colorId, textId){
  const colorEl = document.getElementById(colorId);
  const textEl = document.getElementById(textId);
  colorEl.oninput = () => { textEl.value = colorEl.value; };
  textEl.oninput = () => { if(/^#[0-9A-Fa-f]{6}$/.test(textEl.value)) colorEl.value = textEl.value; };
}

function renderImagePreviews(){
  const heroUrl = document.getElementById('edHeroImage').value.trim();
  const aboutUrl = document.getElementById('edAboutImage').value.trim();
  document.getElementById('heroImgPreview').innerHTML = heroUrl
    ? `<img src="${escapeHTML(heroUrl)}" onerror="this.parentElement.innerHTML='Image failed to load'">`
    : `No image set — showing default gold/black panel`;
  document.getElementById('aboutImgPreview').innerHTML = aboutUrl
    ? `<img src="${escapeHTML(aboutUrl)}" onerror="this.parentElement.innerHTML='Image failed to load'">`
    : `No image set — showing default bordered panel`;
}
document.getElementById('edHeroImage').addEventListener('input', renderImagePreviews);
document.getElementById('edAboutImage').addEventListener('input', renderImagePreviews);

function renderFontOptions(){
  const wrap = document.getElementById('fontOptionsWrap');
  wrap.innerHTML = FONT_PAIRS.map((f, idx) => `
    <div class="font-option ${idx === selectedFontIndex ? 'active' : ''}" data-idx="${idx}">
      <strong style="font-family:${f.heading};font-size:15px;">${escapeHTML(f.name)}</strong>
      <div style="font-size:11px;color:var(--grey);margin-top:3px;">${escapeHTML(f.tag)}</div>
    </div>
  `).join('');
  wrap.querySelectorAll('.font-option').forEach(el => {
    el.addEventListener('click', () => {
      selectedFontIndex = parseInt(el.dataset.idx, 10);
      renderFontOptions();
      updateFontPreview();
    });
  });
  updateFontPreview();
}

function updateFontPreview(){
  const f = FONT_PAIRS[selectedFontIndex];
  // Load the chosen Google Font just for the live preview box
  let previewLink = document.getElementById('fontPreviewLink');
  if(!previewLink){
    previewLink = document.createElement('link');
    previewLink.id = 'fontPreviewLink';
    previewLink.rel = 'stylesheet';
    document.head.appendChild(previewLink);
  }
  previewLink.href = f.url;
  document.getElementById('fontPreviewHeading').style.fontFamily = f.heading;
  document.getElementById('fontPreviewBody').style.fontFamily = f.body;
}

document.getElementById('editorForm').addEventListener('submit', function(e){
  e.preventDefault();
  const site = SiteStore.get();
  const f = FONT_PAIRS[selectedFontIndex];

  site.content = {
    ...site.content,
    heroEyebrow: document.getElementById('edHeroEyebrow').value.trim(),
    heroTitleMain: document.getElementById('edHeroTitleMain').value.trim(),
    heroTitleAccent: document.getElementById('edHeroTitleAccent').value.trim(),
    heroDesc: document.getElementById('edHeroDesc').value.trim(),
    heroVisualCaption: document.getElementById('edHeroCaption').value.trim(),
    aboutBadge: document.getElementById('edAboutBadge').value.trim(),
    aboutHeading: document.getElementById('edAboutHeading').value.trim(),
    aboutDesc: document.getElementById('edAboutDesc').value.trim(),
    aboutDesc2: document.getElementById('edAboutDesc2').value.trim(),
    stat1Value: document.getElementById('edStat1Value').value.trim(),
    stat1Label: document.getElementById('edStat1Label').value.trim(),
    stat2Value: document.getElementById('edStat2Value').value.trim(),
    stat2Label: document.getElementById('edStat2Label').value.trim(),
    stat3Value: document.getElementById('edStat3Value').value.trim(),
    stat3Label: document.getElementById('edStat3Label').value.trim(),
    footerAbout: document.getElementById('edFooterAbout').value.trim(),
    footerNote: document.getElementById('edFooterNote').value.trim()
  };
  site.images = {
    heroImage: document.getElementById('edHeroImage').value.trim(),
    aboutImage: document.getElementById('edAboutImage').value.trim()
  };
  site.theme = {
    primaryColor: document.getElementById('edPrimaryColorText').value.trim() || '#c9a227',
    primaryLight: document.getElementById('edPrimaryLightText').value.trim() || '#e6c85a',
    primaryDark: site.theme.primaryDark,
    textColor: document.getElementById('edTextColorText').value.trim() || '#0d0d0d',
    bgColor: document.getElementById('edBgColorText').value.trim() || '#ffffff',
    headingFont: f.heading,
    bodyFont: f.body,
    googleFontsUrl: f.url
  };

  SiteStore.save(site);
  applyTheme(); // re-theme the admin panel itself too
  showToast('Website updated — changes are now live on your storefront');
});

document.getElementById('resetEditorBtn').addEventListener('click', function(){
  if(confirm('Reset all website content, images, colours and fonts back to the original Zionova defaults?')){
    SiteStore.reset();
    loadEditorForm();
    applyTheme();
    showToast('Website reset to defaults');
  }
});

/* =====================================================
   SETTINGS — Social links
   ===================================================== */
function loadSettingsForm(){
  const site = SiteStore.get();
  const brand = site.brand;
  document.getElementById('setEmail').value = brand.email || '';
  document.getElementById('setInstagram').value = brand.instagram || '';
  document.getElementById('setFacebook').value = brand.facebook || '';
  document.getElementById('setTiktok').value = brand.tiktok || '';
  document.getElementById('setWhatsapp').value = brand.whatsapp || '';

  const creds = AdminAuth.getCredentials();
  document.getElementById('setUsername').value = creds.username;
  document.getElementById('setPassword').value = '';

  loadSheetSettings();
}

document.getElementById('brandForm').addEventListener('submit', function(e){
  e.preventDefault();
  SiteStore.saveSection('brand', {
    email: document.getElementById('setEmail').value.trim(),
    instagram: document.getElementById('setInstagram').value.trim(),
    facebook: document.getElementById('setFacebook').value.trim(),
    tiktok: document.getElementById('setTiktok').value.trim(),
    whatsapp: document.getElementById('setWhatsapp').value.trim()
  });
  showToast('Social links updated — changes are now live on your storefront');
});

document.getElementById('credsForm').addEventListener('submit', function(e){
  e.preventDefault();
  const username = document.getElementById('setUsername').value.trim();
  const password = document.getElementById('setPassword').value;
  if(!username || !password){ showToast('Please fill both fields'); return; }
  AdminAuth.setCredentials(username, password);
  showToast('Login credentials updated');
});

/* =====================================================
   SETTINGS — Google Sheets Integration
   ===================================================== */
const APPS_SCRIPT_SNIPPET = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  // Write header row once if the sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Order ID','Date','Customer','Phone','Email','Items',
                      'Subtotal','Shipping','Total','Payment','Source','Status']);
  }

  if (data.test) {
    sheet.appendRow(['TEST', new Date(), data.message, '', '', '', '', '', '', '', '', '']);
  } else {
    sheet.appendRow([
      data.orderId, data.date, data.customerName, data.customerPhone,
      data.customerEmail, data.items, data.subtotal, data.shipping,
      data.total, data.paymentMethod, data.source, data.status
    ]);
  }

  return ContentService.createTextOutput('OK');
}`;

function loadSheetSettings(){
  document.getElementById('appsScriptCode').textContent = APPS_SCRIPT_SNIPPET;
  const cfg = GoogleSheetStore.get();
  document.getElementById('sheetWebAppUrl').value = cfg.webAppUrl || '';
  document.getElementById('sheetEnabledToggle').checked = !!cfg.enabled;
  updateSheetStatusPill(cfg);
}

function updateSheetStatusPill(cfg){
  const pill = document.getElementById('sheetStatusPill');
  if(cfg.enabled && cfg.webAppUrl){
    pill.textContent = 'Connected & Syncing';
    pill.className = 'status-pill status-connected';
  }else{
    pill.textContent = 'Not Connected';
    pill.className = 'status-pill status-disconnected';
  }
}

document.getElementById('saveSheetBtn').addEventListener('click', function(){
  const url = document.getElementById('sheetWebAppUrl').value.trim();
  const enabled = document.getElementById('sheetEnabledToggle').checked;
  if(enabled && !url){
    showToast('Please paste your Web App URL first');
    return;
  }
  const cfg = { webAppUrl: url, enabled };
  GoogleSheetStore.save(cfg);
  updateSheetStatusPill(cfg);
  showToast('Google Sheet connection saved');
});

document.getElementById('testSheetBtn').addEventListener('click', function(){
  const url = document.getElementById('sheetWebAppUrl').value.trim();
  if(!url){
    showToast('Paste your Web App URL first');
    return;
  }
  testSheetConnection(url);
  showToast('Test row sent — check your Google Sheet');
});

/* =====================================================
   Live sync — if an order comes in from another tab (e.g. a
   customer checking out on the storefront tab) while the admin
   panel is open, refresh the relevant views automatically.
   ===================================================== */
window.onZionovaStorageChange = function(key){
  if(!AdminAuth.isLoggedIn()) return;
  if(key === STORE_KEYS.orders){ renderDashboard(); renderOrdersTable(); renderReports(); }
  if(key === STORE_KEYS.products){ renderProductsTable(); renderPOS(); }
  if(key === STORE_KEYS.site){ applyTheme(); }
};
