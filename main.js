// RC Boutique — smooth scroll, choreographed entrances, cursor, price peek, family-look picker.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -10, duration: 1.6 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- top bar ---------- */
  var bar = document.getElementById('bar');
  var day = document.querySelector('.day');
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    bar.classList.toggle('is-solid', y > 60);
    bar.classList.toggle('is-hidden', y > lastY && y > 400 && !links.classList.contains('open'));
    var d = day.getBoundingClientRect();
    bar.classList.toggle('on-day', d.top < 40 && d.bottom > 40);
    lastY = y;
  }
  var toggle = document.querySelector('.bar__toggle');
  var links = document.getElementById('nav-links');
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- cursor and magnetic buttons ---------- */
  if (fine && !reduce) {
    var cur = document.querySelector('.cursor');
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var t = e.target;
      cur.classList.toggle('is-link', !!(t.closest && t.closest('a, button, label, summary, input')));
      cur.classList.toggle('is-drag', !!(t.closest && t.closest('#crown-stage')));
    });
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
        b.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
    // the ivory logo leans toward the pointer
    var tilt = document.querySelector('.tilt img');
    if (tilt) {
      tilt.parentElement.addEventListener('pointermove', function (e) {
        var r = tilt.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = 'rotateY(' + (x * 14) + 'deg) rotateX(' + (-y * 14) + 'deg) scale(1.02)';
      });
      tilt.parentElement.addEventListener('pointerleave', function () { tilt.style.transform = ''; });
    }
  }

  /* ---------- price list: the photo follows the row ---------- */
  var peek = document.querySelector('.list__peek');
  var peekImg = peek && peek.querySelector('img');
  if (peek && fine) {
    var px = 0, py = 0, qx = 0, qy = 0, on = false;
    document.querySelectorAll('.price tr[data-img]').forEach(function (tr) {
      tr.addEventListener('pointerenter', function () {
        if (peekImg.getAttribute('src') !== tr.dataset.img) peekImg.src = tr.dataset.img;
        peek.classList.add('is-on'); on = true;
      });
      tr.addEventListener('pointerleave', function () { peek.classList.remove('is-on'); on = false; });
    });
    addEventListener('pointermove', function (e) { qx = e.clientX + 150; qy = e.clientY; });
    (function follow() {
      px += (qx - px) * 0.14; py += (qy - py) * 0.14;
      if (on) { peek.style.left = px + 'px'; peek.style.top = py + 'px'; }
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- the family look: one control re-dresses the panel ---------- */
  var LOOKS = {
    matrimonio: { img: 'assets/img/cerimonia.jpg', alt: 'Frac nero e abito da sposa in pizzo su manichini', mom: 'Abito midi in crêpe avorio con cintura dorata', bambina: 'Abito in tulle avorio con fiocco in raso oro', bambino: 'Completo in lino bianco con papillon dorato', momP: 149, kidP: 89, kidPb: 99 },
    comunione: { img: 'assets/img/bambina-tulle.jpg', alt: 'Bambina in abito di tulle bianco con fiori rossi', mom: 'Tailleur pantalone color sabbia e camicia in seta', bambina: 'Abito da comunione in organza con velo corto', bambino: 'Completo tre pezzi grigio perla', momP: 189, kidP: 179, kidPb: 129 },
    battesimo: { img: 'assets/img/battesimo.jpg', alt: 'Abito da battesimo ricamato in cotone bianco', mom: 'Abito chemisier in seta champagne', bambina: 'Set battesimo in cotone ricamato con cuffia', bambino: 'Set battesimo in cotone ricamato con cuffia', momP: 159, kidP: 69, kidPb: 69 },
    domenica: { img: 'assets/img/cappotto-1951.jpg', alt: 'Donna in cappotto di lana spigato davanti a un faro', mom: 'Camicia in seta crema e pantalone palazzo', bambina: 'Abito in cotone a fiori con ballerine', bambino: 'Polo in piqué e bermuda in lino', momP: 129, kidP: 59, kidPb: 55 },
    sera: { img: 'assets/img/donna-1949.jpg', alt: 'Donna in abito da sera lungo con guanti alti', mom: 'Abito lungo nero con spalline gioiello', bambina: 'Abito in velluto nero con colletto avorio', bambino: 'Camicia bianca, gilet nero e papillon', momP: 179, kidP: 79, kidPb: 75 }
  };
  var CM = [74, 80, 92, 98, 104, 110, 116, 122, 128, 134, 140, 146, 152, 158, 164];
  var form = document.getElementById('look-form');
  var age = document.getElementById('age');
  var ageOut = document.getElementById('age-out');
  var img = document.getElementById('look-img');
  var frame = img.parentElement;
  function $(id) { return document.getElementById(id); }
  var out = { mom: $('r-mom'), kid: $('r-kid'), who: $('r-kid-who'), size: $('r-size'), price: $('r-price'), cta: $('r-cta') };
  function ageLabel(a) { return a === 0 ? 'meno di 1 anno' : a + (a === 1 ? ' anno' : ' anni'); }
  function sizeLabel(a) {
    if (a <= 2) return ['6–12 mesi', '12–18 mesi', '18–24 mesi'][a] + ' · ' + CM[a] + ' cm';
    return a + ' anni · ' + CM[a] + ' cm';
  }
  var currentOcc = 'matrimonio';
  function swapImage(L) {
    if (img.getAttribute('src') === L.img) return;
    if (reduce || !img.animate) { img.src = L.img; img.alt = L.alt; return; }
    var next = img.cloneNode();
    next.removeAttribute('id');
    next.src = L.img; next.alt = L.alt;
    next.style.cssText = 'position:absolute;inset:0;clip-path:inset(0 0 0 100%)';
    frame.appendChild(next);
    var go = function () {
      next.animate([{ clipPath: 'inset(0 0 0 100%)', transform: 'scale(1.12)' }, { clipPath: 'inset(0 0 0 0%)', transform: 'scale(1)' }], { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' })
        .finished.then(function () { img.src = L.img; img.alt = L.alt; next.remove(); });
    };
    next.decode ? next.decode().then(go, go) : go();
  }
  function update(animate) {
    var occ = form.occ.value, kid = form.kid.value, a = +age.value;
    var L = LOOKS[occ];
    var kidLook = L[kid];
    if (occ === 'comunione' && a < 7) kidLook = kid === 'bambina' ? 'Abito da damigella in tulle con fascia in raso' : 'Completo da paggetto con gilet avorio';
    var total = L.momP + (kid === 'bambina' ? L.kidP : L.kidPb);
    ageOut.textContent = ageLabel(a);
    out.mom.textContent = L.mom;
    out.kid.textContent = kidLook;
    out.who.textContent = kid === 'bambina' ? 'Per lei' : 'Per lui';
    out.size.textContent = sizeLabel(a);
    out.price.textContent = '€ ' + total;
    var body = 'Buongiorno, vorrei prenotare una prova per il look "' + occ + '":\n- per me: ' + L.mom + '\n- per ' + (kid === 'bambina' ? 'mia figlia' : 'mio figlio') + ' (' + ageLabel(a) + '): ' + kidLook + ', taglia ' + sizeLabel(a) + '\n\nGiorno e orario preferiti: ';
    out.cta.href = 'mailto:ciao@rcboutique.it?subject=' + encodeURIComponent('Prova look di famiglia: ' + occ) + '&body=' + encodeURIComponent(body);
    if (occ !== currentOcc) { swapImage(L); currentOcc = occ; }
    if (animate && hasGsap && !reduce) {
      gsap.fromTo([out.mom, out.kid, out.size, out.price], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'expo.out' });
    }
  }
  form.addEventListener('change', function () { update(true); });
  age.addEventListener('input', function () { update(false); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  update(false);

  /* ---------- choreography ---------- */
  if (!hasGsap || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  // split headings into words that rise out of a mask
  function splitWords(el) {
    if (el.dataset.split) return el.querySelectorAll('.w > span');
    el.dataset.split = '1';
    el.classList.add('split');
    var walk = function (node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var s = document.createElement('span'); s.textContent = part;
            w.appendChild(s); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('sr')) walk(n);
      });
    };
    walk(el);
    return el.querySelectorAll('.w > span');
  }

  // hero entrance: the name rises letter by letter
  var word = document.querySelector('.hero__word');
  var letters = word.textContent.split('').map(function (ch) {
    var s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = ch === ' ' ? ' ' : ch; return s;
  });
  word.textContent = ''; letters.forEach(function (s) { word.appendChild(s); });
  word.style.overflow = 'hidden';
  gsap.from(letters, { yPercent: 100, duration: 0.7, stagger: 0.02, ease: 'expo.out' });
  gsap.from('.hero__copy > *', { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
  gsap.from('.bar', { yPercent: -100, duration: 1, ease: 'expo.out', delay: 0.4 });
  gsap.from('.hero__hint', { opacity: 0, x: 20, duration: 1.2, delay: 2.4, ease: 'expo.out' });
  // the name drifts apart as the hero leaves
  gsap.to(word, { scale: 1.12, yPercent: -12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__copy', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: '70% top', scrub: true } });

  // galleria title and progress
  gsap.from('.gal__title', { opacity: 0, y: 40, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.gal', start: 'top 60%' } });

  // the day arrives: marble wipes up over the night
  gsap.fromTo('.day', { clipPath: 'inset(0% 7% 0% 7%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.day', start: 'top bottom', end: 'top 20%', scrub: true } });

  // headings: words rise once
  document.querySelectorAll('.family__title, .list .h2, .look .h2, .faq .h2, .statement, .contact__lede').forEach(function (h) {
    var w = splitWords(h);
    gsap.from(w, { yPercent: 105, duration: 1.2, stagger: 0.04, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 98%', once: true } });
  });
  // paragraphs and facts follow
  gsap.utils.toArray('.family__text > p:not(.statement), .family__facts > div, .list__head p, .look__lede').forEach(function (el, i) {
    gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  // the ivory logo settles in from a tilt
  gsap.from('.family__logo img', { rotateY: -24, rotateX: 8, y: 60, opacity: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.family__logo', start: 'top 80%' } });
  // price rows arrive one by one
  gsap.utils.toArray('.price tbody').forEach(function (tb) {
    gsap.from(tb.querySelectorAll('tr'), { y: 24, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: tb, start: 'top 85%' } });
  });
  // the look panel opens like a curtain
  gsap.from('.look__frame', { clipPath: 'inset(0 0 100% 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.look__frame', start: 'top 80%' } });
  gsap.from('.look__pair', { y: 80, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.4, scrollTrigger: { trigger: '.look__frame', start: 'top 80%' } });
  gsap.from('.chips label', { y: 16, opacity: 0, duration: 0.8, stagger: 0.04, ease: 'expo.out', scrollTrigger: { trigger: '.look__form', start: 'top 85%' } });
  // services: pictures unveil, then drift inside their frames
  gsap.utils.toArray('.svc').forEach(function (s) {
    var im = s.querySelector('.svc__img');
    gsap.from(im, { clipPath: 'inset(100% 0 0 0)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: s, start: 'top 85%' } });
    gsap.fromTo(im.querySelector('img'), { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(s.querySelectorAll('h3, p'), { y: 24, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 70%' } });
  });
  gsap.from('.faq__list details', { y: 24, duration: 0.9, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: '.faq__list', start: 'top 95%', once: true } });
  // the address slides in from both sides
  gsap.from('.contact__mail span:first-child', { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.contact__mail', start: 'top bottom', end: 'top 55%', scrub: true } });
  gsap.from('.contact__mail span:last-child', { xPercent: 20, ease: 'none', scrollTrigger: { trigger: '.contact__mail', start: 'top bottom', end: 'top 55%', scrub: true } });

  addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
