/* ============================================================
   EcoShop — Cart (carrinho compartilhado entre páginas)
   Persiste via localStorage.
   ============================================================ */

const CART_KEY = 'ecoshop_cart';
const COUPONS  = { ECO10: 10, GREEN20: 20, NATURA15: 15 };

/* ── Storage ── */
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* ── Helpers ── */
function fmtPrice(v) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function totalItems(cart) {
  return cart.reduce((s, i) => s + i.qty, 0);
}

function subtotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

/* ── Add to cart (called from product buttons) ── */
function cartAdd(product) {
  // product = { id, name, price, img }
  const cart = loadCart();
  const idx  = cart.findIndex(i => i.id === product.id);
  if (idx > -1) {
    cart[idx].qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart(cart);
  renderCart();
  showToast(product.name);
  bumpBadge();
}

/* ── Remove ── */
function cartRemove(id) {
  const cart = loadCart().filter(i => i.id !== id);
  saveCart(cart);
  renderCart();
}

/* ── Change qty ── */
function cartSetQty(id, delta) {
  const cart = loadCart();
  const idx  = cart.findIndex(i => i.id === id);
  if (idx < 0) return;
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart(cart);
  renderCart();
}

/* ── Coupon state ── */
let activeCoupon = null;

function applyCoupon(code) {
  const pct = COUPONS[code.toUpperCase().trim()];
  if (pct) {
    activeCoupon = { code: code.toUpperCase(), pct };
    return { ok: true, pct };
  }
  activeCoupon = null;
  return { ok: false };
}

/* ── Render sidebar ── */
function renderCart() {
  const cart  = loadCart();
  const body  = document.getElementById('cart-body');
  const count = document.getElementById('cart-count-badge');
  const mobileCount = document.getElementById('cart-count-badge-mobile');
  const navBadge    = document.querySelector('.cart-nav-badge');

  const n = totalItems(cart);

  // Update badges
  [count, mobileCount, navBadge].forEach(el => {
    if (!el) return;
    el.textContent = n;
    el.style.display = n > 0 ? 'flex' : 'none';
  });

  if (!body) return;

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <span class="material-symbols-outlined">shopping_cart</span>
        <div class="cart-empty-title">Seu carrinho está vazio</div>
        <p class="cart-empty-desc">Adicione produtos sustentáveis e faça a diferença!</p>
        <button class="cart-empty-btn" onclick="closeCart();window.location='produtos.html'">
          Ver produtos
        </button>
      </div>`;
    renderSummary(cart);
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item" id="ci-${item.id}">
      <img class="cart-item-img" src="${item.img}" alt="${item.name}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${fmtPrice(item.price)}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="cartSetQty('${item.id}', -1)">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="cartSetQty('${item.id}', +1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="cartRemove('${item.id}')" aria-label="Remover">
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>
  `).join('');

  renderSummary(cart);
}

function renderSummary(cart) {
  const footer = document.getElementById('cart-footer');
  if (!footer) return;

  if (cart.length === 0) {
    footer.style.display = 'none';
    return;
  }

  footer.style.display = '';

  const sub      = subtotal(cart);
  const shipping = sub >= 150 ? 0 : 15.9;
  const discount = activeCoupon ? (sub * activeCoupon.pct / 100) : 0;
  const total    = Math.max(0, sub - discount + shipping);

  const discountRow = activeCoupon
    ? `<div class="cart-summary-row discount">
         <span>🏷 Cupom ${activeCoupon.code} (−${activeCoupon.pct}%)</span>
         <span>−${fmtPrice(discount)}</span>
       </div>` : '';

  footer.innerHTML = `
    <!-- Cupom -->
    <div class="cart-coupon">
      <input type="text" id="coupon-input" placeholder="Código do cupom" maxlength="20"
             value="${activeCoupon ? activeCoupon.code : ''}"
             class="${activeCoupon ? 'coupon-ok' : ''}"/>
      <button class="cart-coupon-btn" onclick="handleCoupon()">Aplicar</button>
    </div>
    <div id="coupon-msg" class="cart-coupon-msg ${activeCoupon ? 'ok' : ''}">
      ${activeCoupon ? `✓ Cupom aplicado: ${activeCoupon.pct}% de desconto!` : ''}
    </div>

    <!-- Resumo -->
    <div class="cart-summary-row">
      <span>Subtotal (${totalItems(cart)} ${totalItems(cart) === 1 ? 'item' : 'itens'})</span>
      <span>${fmtPrice(sub)}</span>
    </div>
    <div class="cart-summary-row">
      <span>Frete ${shipping === 0 ? '🎉 Grátis' : ''}</span>
      <span>${shipping === 0 ? 'Grátis' : fmtPrice(shipping)}</span>
    </div>
    ${discountRow}
    ${sub < 150 ? `<div style="font-size:11px;color:var(--primary);margin-bottom:4px;">
      Faltam ${fmtPrice(150 - sub)} para frete grátis!</div>` : ''}

    <div class="cart-summary-total">
      <span class="cart-summary-total-label">Total</span>
      <span class="cart-summary-total-value">${fmtPrice(total)}</span>
    </div>

    <button class="cart-checkout-btn" onclick="handleCheckout()">
      <span class="material-symbols-outlined" style="font-size:20px;">lock</span>
      Finalizar compra
    </button>
    <button class="cart-keep-shopping" onclick="closeCart()">← Continuar comprando</button>
  `;
}

function handleCoupon() {
  const input = document.getElementById('coupon-input');
  const msg   = document.getElementById('coupon-msg');
  if (!input || !msg) return;

  const result = applyCoupon(input.value);

  if (result.ok) {
    input.className = 'coupon-ok';
    msg.className   = 'cart-coupon-msg ok';
    msg.textContent = `✓ Cupom aplicado: ${result.pct}% de desconto!`;
  } else {
    input.className = 'coupon-err';
    msg.className   = 'cart-coupon-msg err';
    msg.textContent = '✗ Cupom inválido. Tente: ECO10, GREEN20 ou NATURA15';
  }

  renderSummary(loadCart());
}

function handleCheckout() {
  alert('🌿 Checkout em breve!\n\nEm breve esta etapa estará disponível.');
}

/* ── Open / Close ── */
function openCart() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Toast notification ── */
function showToast(name) {
  let toast = document.getElementById('cart-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.className = 'cart-toast';
    document.body.appendChild(toast);
  }
  const short = name.length > 28 ? name.slice(0, 28) + '…' : name;
  toast.innerHTML = `<span class="material-symbols-outlined">check_circle</span> ${short} adicionado!`;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Badge bump animation ── */
function bumpBadge() {
  document.querySelectorAll('.cart-nav-badge').forEach(el => {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  });
}

/* ── Init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  // Close on overlay click
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

  // Keyboard ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
  });
});
