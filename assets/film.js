/* LIBERÉ LIT — the notes, on real macro film. Rose → saffron → oud (~7 s), then LIT in the white glove.
   Plays once when it comes into view, pauses if you scroll away, skippable, replayable. */
(() => {
  const sec = document.querySelector('.film'); if(!sec) return;
  const v = sec.querySelector('.film-v'), btn = sec.querySelector('.film-skip'), caps = [...sec.querySelectorAll('.fc')];
  const tall = matchMedia('(max-width:860px)').matches;
  if(tall) v.poster = v.dataset.ptall;
  let loaded = false, done = false, cur = 0;

  const show = i => { if(i === cur) return; cur = i; caps.forEach(c => c.classList.toggle('on', +c.dataset.i === i)); };
  const finish = () => { done = true; v.pause(); sec.classList.add('done'); show(3); btn.textContent = 'Replay ↺'; };
  const play = () => {
    if(!loaded){ v.src = tall ? v.dataset.tall : v.dataset.wide; loaded = true; }
    const pr = v.play(); if(pr) pr.catch(e => { if(e.name === 'NotAllowedError') finish(); });   // autoplay refused → land on the finished state
  };
  const replay = () => { done = false; sec.classList.remove('done'); show(0); btn.textContent = 'Skip'; v.currentTime = 0; play(); };

  v.addEventListener('timeupdate', () => { if(!done) show(v.currentTime < 2.35 ? 0 : v.currentTime < 4.45 ? 1 : 2); });
  v.addEventListener('ended', finish);
  btn.addEventListener('click', () => done ? replay() : finish());

  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ finish(); btn.textContent = 'Play the notes'; return; }

  // start fetching a screen or so before it arrives, so it's ready to roll the moment it's in view
  const pre = new IntersectionObserver(es => { if(es[0].isIntersecting && !loaded){ v.src = tall ? v.dataset.tall : v.dataset.wide; v.preload = 'auto'; loaded = true; pre.disconnect(); } }, {rootMargin:'900px 0px'});
  pre.observe(sec);

  new IntersectionObserver(es => es.forEach(e => {
    if(done) return;
    if(e.isIntersecting) play(); else if(loaded) v.pause();
  }), {threshold:.45}).observe(sec);
})();
