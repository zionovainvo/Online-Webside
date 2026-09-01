/* ============================================================
   ZIONOVA — Checkout logic (checkout.html) — Firebase edition
   ============================================================ */

let checkoutProducts = [];
let shippingFee = 350;
let selectedPayment = 'Cash on Delivery';
let siteSettings = {};

async function init(){
  if(!checkFirebaseConfigured()) return;
  const settings = await SettingsStore.get();
  siteSettings = settings;
  applySiteSettings(settings);
  shippingFee = Number(settings.shippingFee) || 0;
  document.getElementById('bankDetailsText').textContent = settings.bankDetails || 'Please contact us for our bank transfer details.';
  checkoutProducts = await ProductStore.getAll();
  renderOrderLines();
}

function renderOrderLines(){
  const wrap = document.getElementById('orderLines');
  const items = CartStore.detailedItems(checkoutProducts);

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

function updateLineQty(productId, qty){
  CartStore.updateQty(productId, parseInt(qty, 10));
  renderOrderLines();
}
function removeLine(productId){
  CartStore.remove(productId);
  renderOrderLines();
}

function renderSummary(){
  const items = CartStore.detailedItems(checkoutProducts);
  const subtotal = CartStore.subtotal(checkoutProducts);
  const shipping = items.length ? shippingFee : 0;
  const total = subtotal + shipping;

  document.getElementById('itemCount').textContent = items.reduce((s,i) => s + i.qty, 0);
  document.getElementById('sumSubtotal').textContent = formatMoney(subtotal);
  document.getElementById('sumShipping').textContent = formatMoney(shipping);
  document.getElementById('sumTotal').textContent = formatMoney(total);
}

function updatePaymentUI(){
  document.querySelectorAll('.pay-method').forEach(p => p.classList.toggle('active', p.dataset.method === selectedPayment));
  document.getElementById('cardApologyBox').style.display = selectedPayment === 'Card Payment' ? 'block' : 'none';
  document.getElementById('bankDetailsBox').style.display = selectedPayment === 'Bank Transfer' ? 'block' : 'none';
}

document.querySelectorAll('.pay-method').forEach(el => {
  el.addEventListener('click', () => {
    selectedPayment = el.dataset.method;
    updatePaymentUI();
  });
});

document.getElementById('switchToBankBtn').addEventListener('click', () => {
  selectedPayment = 'Bank Transfer';
  updatePaymentUI();
});

document.getElementById('customerForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const items = CartStore.detailedItems(checkoutProducts);
  const errorEl = document.getElementById('formError');
  errorEl.textContent = '';

  if(!items.length){ errorEl.textContent = 'Your cart is empty.'; return; }

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const address = document.getElementById('custAddress').value.trim();

  if(!name || !phone || !email || !address){
    errorEl.textContent = 'Please fill in all required fields.';
    return;
  }
  if(selectedPayment === 'Card Payment'){
    errorEl.textContent = 'Card payments aren\'t available yet — please switch to Bank Transfer to continue.';
    return;
  }

  const submitBtn = document.getElementById('placeOrderBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing Order…';

  try{
    const subtotal = CartStore.subtotal(checkoutProducts);
    const shipping = shippingFee;
    const total = subtotal + shipping;

    const order = await OrderStore.create({
      source: 'online',
      items: items.map(i => ({ productId: i.productId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, lineTotal: i.lineTotal })),
      subtotal, shipping, total,
      customer: { name, phone, email, address },
      paymentMethod: selectedPayment,
      status: 'Paid'
    });

    CartStore.clear();
    window.location.href = `receipt.html?order=${order.id}`;
  }catch(err){
    console.error(err);
    errorEl.textContent = 'Something went wrong placing your order. Please try again.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order & Pay';
  }
});

init();
