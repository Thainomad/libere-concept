/* LIBERÉ product gallery: the hero is a swipeable gallery; tap any image for a full-screen viewer
   with swipe, pinch / double-tap zoom, drag to pan, swipe down or Esc to close. */
(() => {
  const $ = s => document.querySelector(s);
  const hg = $('#hg'); if(!hg) return;
  const slides = [...hg.children], n = slides.length;
  const dots = [...document.querySelectorAll('.hg-dots i')], count = $('#hgCount');
  let cur = 0;

  /* ---------- hero gallery ---------- */
  const mark = i => { cur = i; dots.forEach((d, j) => d.classList.toggle('on', j === i)); slides.forEach((s, j) => s.classList.toggle('cur', j === i)); if(count) count.textContent = `${i + 1} / ${n}`; };
  const idx = el => Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
  hg.addEventListener('scroll', () => { const i = idx(hg); if(i !== cur) mark(i); }, {passive:true});
  const go = i => hg.scrollTo({left: ((i + n) % n) * hg.clientWidth, behavior:'smooth'});
  const prev = $('.hg-prev'), next = $('.hg-next');
  if(prev) prev.onclick = () => go(cur - 1);
  if(next) next.onclick = () => go(cur + 1);
  hg.addEventListener('keydown', e => {
    if(e.key === 'ArrowRight'){ e.preventDefault(); go(cur + 1); }
    if(e.key === 'ArrowLeft'){ e.preventDefault(); go(cur - 1); }
  });
  slides.forEach((b, i) => b.addEventListener('click', () => open(i)));

  /* phones: one gentle sideways nudge on arrival, so people know the photos swipe */
  if(n > 1 && matchMedia('(max-width:860px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    setTimeout(() => {
      if(cur !== 0 || hg.scrollLeft > 2) return;
      hg.style.scrollSnapType = 'none';
      hg.scrollTo({left: Math.round(hg.clientWidth * .16), behavior:'smooth'});
      setTimeout(() => { hg.scrollTo({left:0, behavior:'smooth'}); setTimeout(() => { hg.style.scrollSnapType = ''; }, 600); }, 560);
    }, 1600);
  }

  /* ---------- full-screen viewer ---------- */
  const lb = $('#lb'), tr = $('#lbTrack'); if(!lb || !tr) return;
  const ls = [...tr.children], lcount = $('#lbCount'), hint = $('.lb-hint');
  let li = 0, back = null;
  const Z = {s:1, x:0, y:0};                       // zoom state of the image in view
  const im = () => ls[li].querySelector('img');
  const paint = (drag) => { const m = im(); m.classList.toggle('drag', !!drag); m.classList.toggle('z', Z.s > 1);
    m.style.transform = Z.s > 1 ? `translate(${Z.x}px,${Z.y}px) scale(${Z.s})` : ''; tr.classList.toggle('zoomed', Z.s > 1); };
  const unzoom = () => { if(Z.s === 1) return; Z.s = 1; Z.x = Z.y = 0; paint(); };
  const lmark = i => { if(i !== li){ unzoom(); li = i; } if(lcount) lcount.textContent = `${i + 1} / ${n}`; };
  const load = i => { const m = ls[i] && ls[i].querySelector('img'); if(m && !m.src) m.src = m.dataset.src; };

  function open(i){
    back = document.activeElement;
    for(let j = 0; j < n; j++) load(j);
    lb.hidden = false; document.body.classList.add('lb-open');
    requestAnimationFrame(() => { tr.scrollLeft = i * tr.clientWidth; lmark(i); lb.classList.add('on'); $('.lb-x').focus({preventScroll:true}); });
    if(hint){ hint.classList.remove('gone'); setTimeout(() => hint.classList.add('gone'), 2600); }
  }
  function close(){
    unzoom(); lb.classList.remove('on'); document.body.classList.remove('lb-open');
    setTimeout(() => { lb.hidden = true; }, 300);
    hg.scrollLeft = li * hg.clientWidth; mark(li);           // the hero follows to the image you were looking at
    if(back) back.focus({preventScroll:true});
  }
  tr.addEventListener('scroll', () => lmark(idx(tr)), {passive:true});
  const lgo = i => { unzoom(); tr.scrollTo({left: ((i + n) % n) * tr.clientWidth, behavior:'smooth'}); };
  $('.lb-x').onclick = close;
  $('.lb-prev').onclick = () => lgo(li - 1);
  $('.lb-next').onclick = () => lgo(li + 1);
  addEventListener('keydown', e => {
    if(lb.hidden) return;
    if(e.key === 'Escape') close();
    if(e.key === 'ArrowRight') lgo(li + 1);
    if(e.key === 'ArrowLeft') lgo(li - 1);
  });

  /* zoom to a point: double-click / double-tap toggles 2.5×, centred on where you tapped */
  const zoomAt = (cx, cy, s) => {
    const m = im(), r = m.getBoundingClientRect();
    const ox = cx - (r.left + r.width / 2) + Z.x, oy = cy - (r.top + r.height / 2) + Z.y;   // point relative to the image centre (unzoomed)
    Z.x = -ox * (s - 1); Z.y = -oy * (s - 1); Z.s = s; clamp(); paint();
  };
  // keep the zoomed image covering the screen: it can't be dragged past its own edges
  const clamp = () => {
    const m = im(), w = m.offsetWidth * Z.s, h = m.offsetHeight * Z.s;
    const mx = Math.max(0, (w - innerWidth) / 2), my = Math.max(0, (h - innerHeight) / 2);
    Z.x = Math.max(-mx, Math.min(mx, Z.x)); Z.y = Math.max(-my, Math.min(my, Z.y));
  };
  tr.addEventListener('dblclick', e => { if(e.target.tagName !== 'IMG') return; Z.s > 1 ? unzoom() : zoomAt(e.clientX, e.clientY, 2.5); });

  /* touch: double-tap, pinch, pan when zoomed, swipe down to close */
  let t0 = null, lastTap = 0, pinch = null, pan = null;
  tr.addEventListener('touchstart', e => {
    if(e.touches.length === 2){
      const [a, b] = e.touches;
      pinch = {d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), s: Z.s, x: Z.x, y: Z.y,
               cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2};
      pan = null; t0 = null; return;
    }
    const t = e.touches[0];
    t0 = {x: t.clientX, y: t.clientY, time: Date.now()};
    if(Z.s > 1) pan = {x: t.clientX, y: t.clientY, zx: Z.x, zy: Z.y};
  }, {passive:true});
  tr.addEventListener('touchmove', e => {
    if(pinch && e.touches.length === 2){
      e.preventDefault();
      const [a, b] = e.touches, d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const s = Math.max(1, Math.min(4, pinch.s * d / pinch.d));
      // keep the point between your fingers fixed: u = pinch midpoint relative to the image's untransformed centre
      const m = im(), r = m.getBoundingClientRect(), k = s / pinch.s;
      const ux = pinch.cx - (r.left + r.width / 2) + Z.x, uy = pinch.cy - (r.top + r.height / 2) + Z.y;
      Z.x = ux - k * (ux - pinch.x); Z.y = uy - k * (uy - pinch.y);
      Z.s = s; if(s === 1){ Z.x = Z.y = 0; } clamp(); paint(true);
    } else if(pan && Z.s > 1 && e.touches.length === 1){
      e.preventDefault();
      const t = e.touches[0]; Z.x = pan.zx + (t.clientX - pan.x); Z.y = pan.zy + (t.clientY - pan.y); clamp(); paint(true);
    }
  }, {passive:false});
  tr.addEventListener('touchend', e => {
    if(pinch){ if(e.touches.length < 2){ pinch = null; paint(); } return; }
    pan = null; paint();
    if(!t0) return;
    const t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y, quick = Date.now() - t0.time < 300;
    if(Z.s === 1 && dy > 110 && Math.abs(dx) < 70){ close(); return; }                 // swipe down to close
    if(quick && Math.abs(dx) < 10 && Math.abs(dy) < 10){
      const now = Date.now();
      if(now - lastTap < 300){ Z.s > 1 ? unzoom() : zoomAt(t.clientX, t.clientY, 2.5); lastTap = 0; }
      else lastTap = now;
    }
    t0 = null;
  });

  /* mouse: drag to pan when zoomed */
  let md = null;
  tr.addEventListener('mousedown', e => { if(Z.s > 1 && e.target.tagName === 'IMG'){ e.preventDefault(); md = {x: e.clientX, y: e.clientY, zx: Z.x, zy: Z.y}; } });
  addEventListener('mousemove', e => { if(!md) return; Z.x = md.zx + (e.clientX - md.x); Z.y = md.zy + (e.clientY - md.y); clamp(); paint(true); });
  addEventListener('mouseup', () => { if(md){ md = null; paint(); } });
})();
