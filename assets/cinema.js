/* LIBERÉ — cinematic pages: panels settle in, sticky bar follows the level in view, quantity, forms. */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  /* panels: image eases in and text settles as each one arrives (content is never held back) */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if(!e.isIntersecting) return;
    e.target.classList.add('in');
    const k = e.target.dataset.level;
    if(k && e.target.id && window.LIBERE) LIBERE.setBar(k);     // the sticky bar follows the level you're looking at
  }), {threshold:.28});
  $$('.panel').forEach(p => io.observe(p));

  /* level pages: the sticky bar is that level */
  const lvl = document.body.dataset.level;
  if(lvl && window.LIBERE) LIBERE.setBar(lvl);

  /* quantity feeds Add to bag */
  const add = $('#pdpAdd'), qv = $('#qVal');
  if(add && qv){
    let q = 1;
    const setQ = n => { q = Math.max(1, Math.min(9, n)); qv.textContent = q; add.dataset.qty = q; add.textContent = q > 1 ? `Add ${q} to bag` : 'Add to bag'; };
    $('#qMinus').onclick = () => setQ(q - 1); $('#qPlus').onclick = () => setQ(q + 1);
  }

  /* films behind the words: home level films load only when you scroll near; every film pauses off screen */
  const films = $$('video.hero-film');
  if(films.length && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    const fo = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if(e.isIntersecting){
        if(v.dataset.src && !v.getAttribute('src')) v.src = v.dataset.src;
        const pr = v.play(); if(pr) pr.then(() => v.classList.add('on')).catch(() => {});
      } else v.pause();
    }), {rootMargin:'300px 0px'});
    films.forEach(v => {
      if(getComputedStyle(v).display === 'none'){ v.pause(); v.preload = 'none'; return; }   // hidden on this screen size: don't play or keep loading
      fo.observe(v);
    });
  }

  /* private list */
  const join = $('#join');
  if(join) join.onsubmit = e => { e.preventDefault(); const i = join.querySelector('input'); i.value = ''; i.placeholder = 'You’re on the list.'; join.querySelector('button').textContent = 'Welcome'; };
})();

/* navigation: header slides away while reading, returns on scroll up; menu state; home section index */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const nav = $('#nav'), drawer = $('#drawer'), burger = $('#burger'), shut = $('#closeDrawer');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if(nav && !(drawer && drawer.classList.contains('open'))){
      if(y > 160 && y > lastY + 4) nav.classList.add('hide');
      else if(y < lastY - 4 || y < 160) nav.classList.remove('hide');
    }
    lastY = y;
  }, {passive:true});
  if(nav) nav.addEventListener('focusin', () => nav.classList.remove('hide'));

  if(burger && drawer){
    burger.addEventListener('click', () => { burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); });
    const closed = () => { burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); };
    if(shut) shut.addEventListener('click', () => { closed(); burger.focus({preventScroll:true}); });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closed));
    addEventListener('keydown', e => { if(e.key === 'Escape' && drawer.classList.contains('open') && shut) shut.click(); });
    drawer.querySelectorAll('[data-open-bag]').forEach(b => b.addEventListener('click', () => shut && shut.click()));
  }

  const idx = $('#secIndex');
  if(idx){
    const links = $$('#secIndex a');
    const mark = id => links.forEach(a => a.classList.toggle('on', a.dataset.sec === id));
    const secs = ['lust', 'lux', 'lit', 'story'].map(id => document.getElementById(id)).filter(Boolean);
    // a thin line across the middle of the screen: whichever section crosses it is "where you are"
    const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) mark(e.target.id); }), {rootMargin:'-48% 0px -48% 0px'});
    secs.forEach(s => io.observe(s));
    const toggle = () => idx.classList.toggle('show', scrollY > innerHeight * .6);
    addEventListener('scroll', toggle, {passive:true}); toggle();
  }
})();
