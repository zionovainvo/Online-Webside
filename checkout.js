/* ============================================================
   ZIONOVA — Checkout logic (checkout.html)
   ============================================================ */

applyTheme();

const SHIPPING_FEE = 350; // flat delivery fee, set to 0 for free delivery

function renderOrderLines(){
  const wrap = document.getElementById('orderLines');
  const items = CartStore.detailedItems();

  if(!items.length){
    wrap.innerHTML = `<div class="empty-state">Your cart is empty. <a href="index.html#shop" class="gold-text">Go back to shop</a>.</div>`;
    document.getElementById('placeOrderBtn').disabled = true;
  }else{
    wrap.innerHTML = items.map(i => `
      <div class="order-line">
        <span class="name">${escapeHTML(i.name)} × 
          <select onchange="updateLineQty('${i.productId}', this.value)" style="border:1px solid var(--light-grey);padding:4px;">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${n===i.qty?'selected':''}>${n}</option>`).join('')}
          </select>
        </span>
        <span>${formatMoney(i.lineTotal)}</span>
        <span class="rm" onclick="removeLine('${i.productId}')">Remove</span>
      </div>
    `).join('');
    document.getElementById('placeOrderBtn').disabled = false;
  }
  renderSummary();
}

function escapeHTML(str=''){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function updateLineQty(productId, qty){
  CartStore.updateQty(productId, parseInt(qty, 10));
  renderOrderLines();
}
function removeLine(productId){
  CartStore.remove(productId);
  renderOrderLines();
}

function renderSummary(){
  const items = CartStore.detailedItems();
  const subtotal = CartStore.subtotal();
  const shipping = items.length ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  document.getElementById('itemCount').textContent = items.reduce((s,i) => s + i.qty, 0);
  document.getElementById('sumSubtotal').textContent = formatMoney(subtotal);
  document.getElementById('sumShipping').textContent = formatMoney(shipping);
  document.getElementById('sumTotal').textContent = formatMoney(total);
}

/* ---------- Payment method toggle ---------- */
let selectedPayment = 'Cash on Delivery';
document.querySelectorAll('.pay-method').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.pay-method').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    selectedPayment = el.dataset.method;
    document.getElementById('cardFields').style.display = selectedPayment === 'Card Payment' ? 'block' : 'none';
  });
});

/* ---------- Submit order ---------- */
document.getElementById('customerForm').addEventListener('submit', function(e){
  e.preventDefault();
  const items = CartStore.detailedItems();
  const errorEl = document.getElementById('formError');
  errorEl.textContent = '';

  if(!items.length){
    errorEl.textContent = 'Your cart is empty.';
    return;
  }

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const address = document.getElementById('custAddress').value.trim();

  if(!name || !phone || !email || !address){
    errorEl.textContent = 'Please fill in all required fields.';
    return;
  }

  if(selectedPayment === 'Card Payment'){
    const num = document.getElementById('cardNumber').value.trim();
    const exp = document.getElementById('cardExpiry').value.trim();
    const cvv = document.getElementById('cardCvv').value.trim();
    if(!num || !exp || !cvv){
      errorEl.textContent = 'Please complete your card details.';
      return;
    }
  }

  const subtotal = CartStore.subtotal();
  const shipping = SHIPPING_FEE;
  const total = subtotal + shipping;

  const order = OrderStore.create({
    source: 'online',
    items: items.map(i => ({
      productId: i.productId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, lineTotal: i.lineTotal
    })),
    subtotal,
    shipping,
    total,
    customer: { name, phone, email, address },
    paymentMethod: selectedPayment,
    status: 'Paid'
  });

  CartStore.clear();
  window.location.href = `receipt.html?order=${order.id}`;
});

renderOrderLines();
