/* ============================================================
   ZIONOVA — Storefront logic (index.html)
   ============================================================ */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Brand content ---------- */
function renderBrand(){
  const brand = BrandStore.get();
  const heroTitleEl = document.getElementById('heroTitle');
  const heroDescEl = document.getElementById('heroDesc');
  const aboutDescEl = document.getElementById('aboutDesc');
  if(heroTitleEl) heroTitleEl.innerHTML = `Wear the <em>${escapeHTML(brand.tagline.replace('Wear the ', '') || 'Statement')}</em>.`;
  if(heroDescEl) heroDescEl.textContent = brand.description;
  if(aboutDescEl) aboutDescEl.textContent = brand.description;

  const socialGrid = document.getElementById('socialGrid');
  const footerContact = document.getElementById('footerContact');
  if(socialGrid){
    const socials = [
      { key:'instagram', label:'Instagram', icon:'📸' },
      { key:'facebook', label:'Facebook', icon:'📘' },
      { key:'tiktok', label:'TikTok', icon:'🎵' },
      { key:'whatsapp', label:'WhatsApp', icon:'💬' }
    ];
    socialGrid.innerHTML = socials
      .filter(s => brand[s.key])
      .map(s => `
        <a class="social-pill" href="${escapeAttr(brand[s.key])}" target="_blank" rel="noopener">
          <span class="social-icon">${s.icon}</span> ${s.label}
        </a>
      `).join('');
  }
  if(footerContact){
    footerContact.innerHTML = `
      <li>Email: ${escapeHTML(brand.email || '')}</li>
      <li><a href="${escapeAttr(brand.instagram||'#')}" target="_blank" rel="noopener">Instagram</a></li>
      <li><a href="${escapeAttr(brand.facebook||'#')}" target="_blank" rel="noopener">Facebook</a></li>
      <li><a href="${escapeAttr(brand.whatsapp||'#')}" target="_blank" rel="noopener">WhatsApp</a></li>
    `;
  }
}

function escapeHTML(str=''){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function escapeAttr(str=''){ return escapeHTML(str); }

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
    <div class="product-card">
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
    wrap.innerHTML = `<div class="cart-empty">Your bag is empty.<br><br><a href="#shop" class="btn btn-outline btn-sm" id="closeCartInline">Continue Shopping</a></div>`;
  }else{
    wrap.innerHTML = items.map(i => `
      <div class="cart-item">
        <div class="cart-item-thumb">${escapeHTML(i.name.split(' ')[0])}</div>
        <div class="cart-item-info">
          <h4>${escapeHTML(i.name)}</h4>
          <div class="price">${formatMoney(i.unitPrice)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${i.productId}', ${i.qty - 1})">−</button>
            <span>${i.qty}</span>
            <button class="qty-btn" onclick="changeQty('${i.productId}', ${i.qty + 1})">+</button>
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

/* ---------- Init ---------- */
renderBrand();
renderProducts();
renderCartCount();
renderCartDrawer();
