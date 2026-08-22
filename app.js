/* ============================================================
   ZIONOVA — Storefront logic (index.html) — Firebase edition
   ============================================================ */

document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('cartToggle').innerHTML = icon('bag') + `<span class="cart-badge" id="cartCount">0</span>`;
document.getElementById('closeCart').innerHTML = icon('close');

let liveProducts = [];

function init(){
  if(!checkFirebaseConfigured()) return;

  // Live site settings (content, colors, fonts, social links) — updates
  // instantly if the admin changes anything, no page reload needed.
  SettingsStore.listen(settings => applySiteSettings(settings));

  // Live product catalog
  ProductStore.listen(products => {
    liveProducts = products;
    renderProducts();
    renderCartCount();
    renderCartDrawer();
  });

  renderCartCount();
}

/* ---------- Products ---------- */
function renderProducts(){
  const grid = document.getElementById('productGrid');
  if(!liveProducts.length){
    grid.innerHTML = `<div class="empty-note">No products available right now. Please check back soon.</div>`;
    return;
  }
  grid.innerHTML = liveProducts.map(p => {
    const finalPrice = ProductStore.finalPrice(p);
    const outOfStock = Number(p.stock) <= 0;
    return `
    <div class="product-card">
      ${p.discount > 0 ? `<div class="badge-discount">-${p.discount}%</div>` : ''}
      ${outOfStock ? `<div class="badge-stock">Sold Out</div>` : ''}
      <div class="product-thumb">
        ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}">` : escapeHTML(p.name)}
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
  const items = CartStore.detailedItems(liveProducts);
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
            <button class="qty-btn" onclick="changeQty('${i.productId}', ${i.qty - 1})">${icon('minus')}</button>
            <span>${i.qty}</span>
            <button class="qty-btn" onclick="changeQty('${i.productId}', ${i.qty + 1})">${icon('plus')}</button>
          </div>
          <a class="remove-link" onclick="removeFromCart('${i.productId}')">Remove</a>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('cartSubtotal').textContent = formatMoney(CartStore.subtotal(liveProducts));
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

init();
