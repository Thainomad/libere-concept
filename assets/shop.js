/* ------------------------------------------------------------------
   LIBERÉ concept — shared shop layer: cart drawer, waitlist dialog,
   sticky buy bar (phone + desktop), Afterpay messaging, express
   checkout, delivery-date promise, gifting mode.
   In the real build these map to Shopify: Cart API + checkout,
   Shop Pay / Apple Pay / Google Pay, Afterpay app, Klaviyo or
   Shopify Email for waitlists, and LIBERÉ's real dispatch rules.
   ------------------------------------------------------------------ */
(() => {
  const CATALOG = {
    lust: {name:'LIBERÉ LUST', short:'LUST', size:'Extrait de Parfum · 50 mL', price:230, status:'available', img:'https://libere.com.au/cdn/shop/files/58D95605-EA02-464E-9659-6A3C3EE0C95E.png?v=1794397847&width=400', url:'lust.html'},
    lux:  {name:'LIBERÉ LUX',  short:'LUX',  size:'Extrait de Parfum', price:230, status:'soon', url:'lux.html', img:'https://libere.com.au/cdn/shop/files/5E4721EE-E9EB-4AA7-B482-68EF5FDF4FAF.png?v=1794397898&width=400',
           notify:{title:'LUX is almost here.', body:'Be first to know the moment LUX is released. One email, on launch day.', done:'You’re on the LUX list. We’ll email you on launch day.'}},
    lit:  {name:'LIBERÉ LIT',  short:'LIT',  size:'Extrait de Parfum · 50 mL', price:230, status:'soldout', url:'lit.html', img:'https://libere.com.au/cdn/shop/files/F81FF836-EEA6-48CB-A019-D5317E953A60.png?v=1787125360&width=400',
           notify:{title:'LIT is resting.', body:'LIT sold out. Leave your email and we’ll tell you the moment it’s back.', done:'Done. You’ll hear from us the moment LIT returns.'}},
  };
  const $ = (s, r = document) => r.querySelector(s);
  const money = n => `$${n % 1 ? n.toFixed(2) : n.toFixed(0)}`;
  const afterpay = n => `or 4 interest-free payments of ${money(n / 4)} with Afterpay`;
  const isDesk = () => matchMedia('(min-width: 861px)').matches;

  /* ---------- delivery promise (Sydney time). ASSUMPTION for the concept: dispatch weekdays
     before 2pm, 3 business days in transit. Replace with LIBERÉ's real rules. ---------- */
  function eta(){
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-AU', {timeZone:'Australia/Sydney', year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'numeric', hour12:false})
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const today = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)), h = (+p.hour) % 24, m = +p.minute;
    const biz = d => d.getUTCDay() !== 0 && d.getUTCDay() !== 6, CUT = 14;
    const shipsToday = biz(today) && h < CUT;
    const ship = new Date(today);
    if(!shipsToday) do { ship.setUTCDate(ship.getUTCDate() + 1); } while(!biz(ship));
    const del = new Date(ship); for(let n = 0; n < 3;){ del.setUTCDate(del.getUTCDate() + 1); if(biz(del)) n++; }
    const date = del.toLocaleDateString('en-AU', {weekday:'long', day:'numeric', month:'short', timeZone:'UTC'});
    const left = shipsToday ? CUT * 60 - (h * 60 + m) : 0;
    return {date, left, shipsToday};
  }
  function etaText(){
    const e = eta();
    if(e.shipsToday){
      const hh = Math.floor(e.left / 60), mm = e.left % 60;
      return `Order within <b>${hh ? hh + 'h ' : ''}${mm}m</b> — gift wrapped and with you by <b>${e.date}</b>`;
    }
    return `Order now — gift wrapped and with you by <b>${e.date}</b>`;
  }
  function paintPromises(){
    document.querySelectorAll('[data-afterpay]').forEach(el => el.textContent = afterpay(+el.dataset.afterpay));
    document.querySelectorAll('[data-eta]').forEach(el => el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7h12v9H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg><span>${etaText()} <em>(est.)</em></span>`);
  }

  /* ---------- state: a per-visitor convenience only (the real store keeps the cart in Shopify) ---------- */
  const KEY = 'libere-concept-cart';
  let cart = {items:{}, gift:true, note:'', hidePrices:false};
  try { const s = JSON.parse(localStorage.getItem(KEY)); if(s && s.items) cart = Object.assign(cart, s); } catch {}
  Object.keys(cart.items).forEach(k => { if(!CATALOG[k]) delete cart.items[k]; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };
  const count = () => Object.values(cart.items).reduce((a, b) => a + b, 0);
  const subtotal = () => Object.entries(cart.items).reduce((a, [k, q]) => a + CATALOG[k].price * q, 0);

  /* ---------- markup ---------- */
  document.body.insertAdjacentHTML('beforeend', `
  <div class="bag-scrim" id="bagScrim"></div>
  <aside class="bag" id="bag" role="dialog" aria-modal="true" aria-labelledby="bagTitle" aria-hidden="true">
    <header class="bag-head">
      <h2 id="bagTitle">Your Bag <span id="bagCount"></span></h2>
      <button class="icon-btn" id="bagClose" aria-label="Close bag"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </header>
    <p class="bag-ship" data-eta></p>
    <div class="bag-items" id="bagItems"></div>
    <div class="bag-gift" id="bagGift">
      <label class="switch"><input type="checkbox" id="giftToggle"><span></span>Complimentary gift wrapping</label>
      <div id="giftMore">
        <label class="check"><input type="checkbox" id="giftHide"><i></i>This is a gift — leave prices off the packing slip</label>
        <textarea id="giftNote" rows="2" maxlength="180" placeholder="Add a handwritten note (optional)"></textarea>
      </div>
    </div>
    <div class="bag-next" id="bagNext"></div>
    <footer class="bag-foot">
      <div class="bag-row"><span>Subtotal</span><b id="bagSub"></b></div>
      <p class="bag-pay" id="bagPay"></p>
      <div class="bag-row small"><span>Shipping</span><span>Complimentary</span></div>
      <div class="express" id="express">
        <p>Express checkout</p>
        <div><button type="button" data-express>Shop Pay</button><button type="button" data-express>Apple Pay</button><button type="button" data-express>Google Pay</button></div>
      </div>
      <button class="btn solid wide" id="checkout"><span>Checkout</span></button>
      <p class="bag-secure"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Secure, encrypted checkout</p>
      <p class="bag-msg" id="bagMsg" hidden></p>
    </footer>
  </aside>

  <dialog class="notify" id="notify" aria-labelledby="notifyTitle">
    <form method="dialog" class="notify-x"><button class="icon-btn" aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></form>
    <div class="notify-img"><img id="notifyImg" alt=""></div>
    <div class="notify-body">
      <p class="eyebrow" id="notifyEyebrow"></p>
      <h2 id="notifyTitle"></h2>
      <p id="notifyText"></p>
      <form class="join" id="notifyForm"><input type="email" required placeholder="Your email" aria-label="Email" id="notifyEmail"><button type="submit">Notify me</button></form>
      <p class="fine">One email about this release. Nothing else.</p>
    </div>
  </dialog>

  <div class="buybar" id="buybar" aria-hidden="true">
    <img id="barImg" src="${CATALOG.lust.img}" alt="">
    <div><b id="barName">LUST</b><span id="barSub"></span></div>
    <button class="btn solid" id="barBtn" data-add="lust"><span>Add to Bag</span></button>
  </div>`);

  const bag = $('#bag'), scrim = $('#bagScrim'), items = $('#bagItems');
  const giftT = $('#giftToggle'), giftN = $('#giftNote'), giftH = $('#giftHide');
  let lastFocus = null;
  const thumb = p => p.trio
    ? `<div class="bag-thumb trio">${p.trio.map(s => `<img src="${s}" alt="">`).join('')}</div>`
    : `<div class="bag-thumb"><img src="${p.img}" alt=""></div>`;

  function render(){
    const n = count(), sub = subtotal();
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = n; el.classList.toggle('has', n > 0); });
    $('#bagCount').textContent = n ? `(${n})` : '';
    $('#bagSub').textContent = money(sub);
    $('#bagPay').textContent = n ? afterpay(sub) : '';
    giftT.checked = cart.gift; giftN.value = cart.note; giftH.checked = cart.hidePrices; $('#giftMore').hidden = !cart.gift;
    $('#checkout span').textContent = n ? `Checkout · ${money(sub)}` : 'Checkout';
    $('#checkout').disabled = !n; $('#express').hidden = !n;
    $('#bagGift').hidden = !n;
    items.innerHTML = n ? Object.entries(cart.items).map(([k, q]) => {
      const p = CATALOG[k];
      return `<div class="bag-item">
        ${thumb(p)}
        <div class="bag-info"><b>${p.name}</b><span>${p.size}</span>
          <div class="qty" role="group" aria-label="Quantity for ${p.short}">
            <button data-q="${k}" data-d="-1" aria-label="Decrease">−</button><output>${q}</output><button data-q="${k}" data-d="1" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="bag-price">${money(p.price * q)}<button class="link" data-rm="${k}">Remove</button></div>
      </div>`;
    }).join('') : `<div class="bag-empty"><p>Your bag is empty.</p><a class="btn" href="${CATALOG.lust.url}"><span>Discover LUST</span></a></div>`;
    // next steps: a low-risk first try, then the other two levels
    $('#bagNext').innerHTML = n ? `<p class="eyebrow">Complete the levels</p>
      <button class="bag-up" data-notify="lux"><span>LUX</span><em>Coming soon — join the list</em></button>
      <button class="bag-up" data-notify="lit"><span>LIT</span><em>Sold out — get notified</em></button>` : '';
    paintPromises();
  }

  function open(){
    lastFocus = document.activeElement;
    bag.classList.add('open'); scrim.classList.add('open'); bag.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('locked');
    setTimeout(() => $('#bagClose').focus(), 50);
  }
  function close(){
    bag.classList.remove('open'); scrim.classList.remove('open'); bag.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('locked'); $('#bagMsg').hidden = true;
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  function add(k, q = 1){
    const p = CATALOG[k]; if(!p) return;
    if(p.status !== 'available') return notify(k);
    cart.items[k] = (cart.items[k] || 0) + q; save(); render(); open();
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
  }

  /* ---------- waitlist dialog ---------- */
  const dlg = $('#notify');
  function notify(k){
    const p = CATALOG[k], copy = p.notify; if(!copy) return;
    dlg.dataset.k = k;
    $('#notifyEyebrow').textContent = `${p.name} · ${p.status === 'soon' ? 'Coming soon' : 'Sold out'}`;
    $('#notifyTitle').textContent = copy.title; $('#notifyText').textContent = copy.body;
    $('#notifyImg').src = p.img; $('#notifyForm').hidden = false; $('#notifyEmail').value = '';
    if(bag.classList.contains('open')) close();
    dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  }
  $('#notifyForm').addEventListener('submit', e => {
    e.preventDefault();
    const k = dlg.dataset.k;
    $('#notifyText').textContent = CATALOG[k].notify.done;
    $('#notifyForm').hidden = true;
    setTimeout(() => dlg.open && dlg.close(), 2600);
  });
  dlg.addEventListener('click', e => { if(e.target === dlg) dlg.close(); });

  /* ---------- events ---------- */
  const msg = t => { const m = $('#bagMsg'); m.textContent = t; m.hidden = false; };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]'); if(a){ e.preventDefault(); add(a.dataset.add, +(a.dataset.qty || 1)); return; }
    const nt = e.target.closest('[data-notify]'); if(nt){ e.preventDefault(); notify(nt.dataset.notify); return; }
    if(e.target.closest('[data-open-bag]')){ e.preventDefault(); render(); open(); return; }
    const ex = e.target.closest('[data-express]'); if(ex){ msg(`In the live store, ${ex.textContent} opens here with one tap — no forms. This concept stops here.`); return; }
    const qb = e.target.closest('[data-q]');
    if(qb){ const k = qb.dataset.q; cart.items[k] = Math.max(0, (cart.items[k] || 0) + +qb.dataset.d); if(!cart.items[k]) delete cart.items[k]; save(); render(); return; }
    const rm = e.target.closest('[data-rm]'); if(rm){ delete cart.items[rm.dataset.rm]; save(); render(); }
  });
  $('#bagClose').onclick = close; scrim.onclick = close;
  addEventListener('keydown', e => { if(e.key === 'Escape' && bag.classList.contains('open')) close(); });
  giftT.onchange = () => { cart.gift = giftT.checked; save(); render(); };
  giftH.onchange = () => { cart.hidePrices = giftH.checked; save(); };
  giftN.oninput = () => { cart.note = giftN.value; save(); };
  $('#checkout').onclick = () => msg('In the live store this opens LIBERÉ’s Shopify checkout, with Afterpay as a payment option. This concept stops here.');

  /* ---------- navigation (shared) ---------- */
  const navEl = $('#nav');
  if(navEl) addEventListener('scroll', () => navEl.classList.toggle('scrolled', scrollY > 30), {passive:true});
  const drawer = $('#drawer');
  if(drawer){
    const shut = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); };
    $('#burger').onclick = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); };
    $('#closeDrawer').onclick = shut; drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', shut));
  }

  /* ---------- sticky buy bar (phones only): bottom bar whenever the page's own Add to Bag is off screen ---------- */
  const anchor = document.querySelector('[data-buybar-anchor]'), bar = $('#buybar');
  let barKey = 'lust';
  if(anchor){
    let raf = 0;
    const check = () => {
      raf = 0;
      const r = anchor.getBoundingClientRect();
      const off = !isDesk() && r.bottom < 70;
      bar.classList.toggle('show', off); bar.setAttribute('aria-hidden', String(!off));
    };
    addEventListener('scroll', () => { if(!raf) raf = requestAnimationFrame(check); }, {passive:true});
    addEventListener('resize', () => { setBar(barKey); check(); }); setTimeout(check, 600);
  }

  /* the buy bar mirrors whichever fragrance is in focus */
  function setBar(k){
    const p = CATALOG[k]; if(!p) return; barKey = k;
    $('#barImg').src = p.img; $('#barName').textContent = p.short;
    const btn = $('#barBtn'); btn.removeAttribute('data-add'); btn.removeAttribute('data-notify');
    if(p.status === 'available'){
      btn.dataset.add = k; btn.querySelector('span').textContent = 'Add to Bag';
      $('#barSub').textContent = `${money(p.price)} AUD`;
    } else {
      btn.dataset.notify = k; btn.querySelector('span').textContent = p.status === 'soon' ? 'Join the list' : 'Notify me';
      $('#barSub').textContent = p.status === 'soon' ? 'Coming soon' : 'Sold out · back soon';
    }
  }

  setBar('lust');
  render();
  setInterval(paintPromises, 30000);           // keep the "order within" countdown honest
  window.LIBERE = {add, notify, open, close, setBar, CATALOG, eta};
})();
