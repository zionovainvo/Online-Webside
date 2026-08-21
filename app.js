/* ============================================================
   ZIONOVA — Storefront logic (index.html)
   ============================================================ */

applyTheme();
document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('bagIcon').innerHTML = icon('bag', 19);
document.getElementById('closeIcon').innerHTML = icon('close', 18);

function escapeHTML(str=''){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function escapeAttr(str=''){ return escapeHTML(str); }

/* ---------- Brand + editable content + images ---------- */
function renderBrand(){
  const site = SiteStore.get();
  const brand = site.brand;
  const c = site.content;
  const images = site.images;

  document.getElementById('heroEyebrow').textContent = c.heroEyebrow;
  document.getElementById('heroTitle').innerHTML = `${escapeHTML(c.heroTitleMain)} <em>${escapeHTML(c.heroTitleAccent)}</em>.`;
  document.getElementById('heroDesc').textContent = c.heroDesc;
  document.getElementById('heroCaption').textContent = c.heroVisualCaption;

  const heroVisual = document.getElementById('heroVisual');
  if(images.heroImage){
    heroVisual.style.background = `url('${images.heroImage.replace(/'/g,"")}') center/cover no-repeat`;
    heroVisual.style.setProperty('--hv-overlay','none');
  }else{
    heroVisual.style.background = '';
  }

  document.getElementById('aboutBadgeText').textContent = c.aboutBadge;
  document.getElementById('aboutHeading').textContent = c.aboutHeading;
  document.getElementById('aboutDesc').textContent = c.aboutDesc;
  document.getElementById('aboutDesc2').textContent = c.aboutDesc2;
  document.getElementById('stat1Value').textContent = c.stat1Value;
  document.getElementById('stat1Label').textContent = c.stat1Label;
  document.getElementById('stat2Value').textContent = c.stat2Value;
  document.getElementById('stat2Label').textContent = c.stat2Label;
  document.getElementById('stat3Value').textContent = c.stat3Value;
  document.getElementById('stat3Label').textContent = c.stat3Label;

  const aboutVisual = document.getElementById('aboutVisual');
  if(images.aboutImage){
    aboutVisual.style.backgroundImage = `url('${images.aboutImage.replace(/'/g,"")}')`;
    aboutVisual.style.backgroundSize = 'cover';
    aboutVisual.style.backgroundPosition = 'center';
    document.getElementById('aboutBadgeText').style.display = 'none';
  }else{
    aboutVisual.style.backgroundImage = '';
    document.getElementById('aboutBadgeText').style.display = 'block';
  }

  document.getElementById('footerAbout').textContent = c.footerAbout;
  document.getElementById('footerNote').textContent = c.footerNote;

  const socialGrid = document.getElementById('socialGrid');
  const socials = [
    { key:'instagram', label:'Instagram', iconName:'instagram' },
    { key:'facebook', label:'Facebook', iconName:'facebook' },
    { key:'tiktok', label:'TikTok', iconName:'tiktok' },
    { key:'whatsapp', label:'WhatsApp', iconName:'whatsapp' }
  ];
  socialGrid.innerHTML = socials
    .filter(s => brand[s.key])
    .map(s => `
      <a class="social-pill" href="${escapeAttr(brand[s.key])}" target="_blank" rel="noopener">
        ${icon(s.iconName, 18)} ${s.label}
      </a>
    `).join('');

  const footerContact = document.getElementById('footerContact');
  footerContact.innerHTML = `
    <li>${icon('mail',14)} ${escapeHTML(brand.email || '')}</li>
    ${brand.instagram ? `<li><a href="${escapeAttr(brand.instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : ''}
    ${brand.facebook ? `<li><a href="${escapeAttr(brand.facebook)}" target="_blank" rel="noopener">Facebook</a></li>` : ''}
    ${brand.whatsapp ? `<li><a href="${escapeAttr(brand.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></li>` : ''}
  `;
}

/* ---------- Products ---------- */
function renderProducts(){
  const grid = document.getElementById('productGrid');
  const products = ProductStore.getAll();
  if(!products.length){
    grid.innerHTML = `<div class="empty-note">No products available right now. Please check back soon.</div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const finalPrice = ProductStore.finalPrice(p);
    const outOfStock = Number(p.stock) <= 0;
    return `
    <div class="product-card" style="position:relative;">
      ${p.discount > 0 ? `<div class="badge-discount" style="position:absolute;">-${p.discount}%</div>` : ''}
      ${outOfStock ? `<div class="badge-stock">Sold Out</div>` : ''}
      <div class="product-thumb">
        ${p.image ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}">` : escapeHTML(p.name)}
      </div>
      <div class="product-info">
        <h3>${escapeHTML(p.name)}</h3>
        <p>${escapeHTML(p.description || '')}</p>
        <div class="price-row">
          <span class="price-now">${formatMoney(finalPrice)}</span>
          ${p.discount > 0 ? `<span class="price-old">${formatMoney(p.price)}</span>` : ''}
        </div>
        <div class="product-actions">
          <select class="qty-select" id="qty-${p.id}" ${outOfStock ? 'disabled' : ''}>
            ${[1,2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
          </select>
          <button class="btn btn-dark btn-sm btn-block" ${outOfStock ? 'disabled' : ''} onclick="handleAddToCart('${p.id}')">
            ${outOfStock ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function handleAddToCart(productId){
  const qtySelect = document.getElementById('qty-' + productId);
  const qty = qtySelect ? parseInt(qtySelect.value, 10) : 1;
  CartStore.add(productId, qty);
  renderCartCount();
  renderCartDrawer();
  showToast('Added to bag');
  openCart();
}

/* ---------- Cart drawer ---------- */
function renderCartCount(){
  document.getElementById('cartCount').textContent = CartStore.count();
}

function renderCartDrawer(){
  const wrap = document.getElementById('cartItems');
  const items = CartStore.detailedItems();
  if(!items.length){
    wrap.innerHTML = `<div class="cart-empty">Your bag is empty.<br><br><a href="#shop" class="btn btn-outline btn-sm">Continue Shopping</a></div>`;
  }else{
    wrap.innerHTML = items.map(i => `
      <div class="cart-item">
        <div class="cart-item-thumb">${escapeHTML(i.name.split(' ')[0])}</div>
        <div class="cart-item-info">
          <h4>${escapeHTML(i.name)}</h4>
          <div class="price">${formatMoney(i.unitPrice)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${i.productId}', ${i.qty - 1})">${icon('minus',12)}</button>
            <span>${i.qty}</span>
            <button class="qty-btn" onclick="changeQty('${i.productId}', ${i.qty + 1})">${icon('plus',12)}</button>
          </div>
          <a class="remove-link" onclick="removeFromCart('${i.productId}')">Remove</a>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('cartSubtotal').textContent = formatMoney(CartStore.subtotal());
}

function changeQty(productId, qty){
  CartStore.updateQty(productId, qty);
  renderCartCount(); renderCartDrawer(); renderProducts();
}
function removeFromCart(productId){
  CartStore.remove(productId);
  renderCartCount(); renderCartDrawer(); renderProducts();
}

function openCart(){
  document.getElementById('cartDrawer').classList.add('active');
  document.getElementById('overlay').classList.add('active');
}
function closeCartFn(){
  document.getElementById('cartDrawer').classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
}

document.getElementById('cartToggle').addEventListener('click', () => { renderCartDrawer(); openCart(); });
document.getElementById('closeCart').addEventListener('click', closeCartFn);
document.getElementById('overlay').addEventListener('click', closeCartFn);

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- Live sync: reflect admin edits immediately if this tab
   stays open while changes are made in another tab of the same origin ---------- */
window.onZionovaStorageChange = function(key){
  if(key === STORE_KEYS.site){ applyTheme(); renderBrand(); }
  if(key === STORE_KEYS.products){ renderProducts(); }
  if(key === STORE_KEYS.cart){ renderCartCount(); renderCartDrawer(); }
};

/* ---------- Init ---------- */
renderBrand();
renderProducts();
renderCartCount();
renderCartDrawer();
