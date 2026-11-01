// RC Boutique: entrances, the travelling collection, the family-look picker, the scaling wordmark.
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Menu on the phone
  var toggle = document.querySelector('.nav__toggle');
  var links = document.getElementById('nav-links');
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });

  // Entrances: the parts of each section in reading order, staggered
  var groups = new Map();
  document.querySelectorAll('.reveal').forEach(function (el) {
    var sec = el.closest('section') || document.body;
    var list = groups.get(sec) || [];
    el.style.setProperty('--d', (list.length * 80) + 'ms');
    list.push(el);
    groups.set(sec, list);
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  // Scroll-linked: collection track, hero wordmark, footer wordmark
  var show = document.querySelector('.show');
  var track = document.querySelector('.show__track');
  var heroMark = document.querySelector('.hero__name .wordmark');
  var footMark = document.querySelector('.wordmark--foot');
  var footer = document.querySelector('.footer');
  var desktop = window.matchMedia('(min-width: 721px)');
  var ticking = false;

  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    if (desktop.matches) {
      var r = show.getBoundingClientRect();
      var p = clamp(-r.top / (r.height - vh));
      var travel = track.scrollWidth - window.innerWidth * 0.52;
      track.style.setProperty('--x', (-p * travel).toFixed(1) + 'px');
    }
    if (!reduce) {
      var h = clamp(window.scrollY / vh);
      heroMark.style.transform = 'scale(' + (1 - h * 0.07).toFixed(4) + ')';
      var f = footer.getBoundingClientRect();
      var q = clamp(1 - (f.top / vh));
      footMark.style.transform = 'scale(' + (0.94 + q * 0.06).toFixed(4) + ')';
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  // Il look di famiglia
  var LOOKS = {
    matrimonio: { mom: 'Abito midi in crêpe avorio con cintura dorata', bambina: 'Abito in tulle avorio con fiocco in raso oro', bambino: 'Completo in lino bianco con papillon dorato', momP: 149, kidP: 89, kidPb: 99 },
    comunione: { mom: 'Tailleur pantalone color sabbia e camicia in seta', bambina: 'Abito da comunione in organza con velo corto', bambino: 'Completo tre pezzi grigio perla', momP: 189, kidP: 179, kidPb: 129 },
    battesimo: { mom: 'Abito chemisier in seta champagne', bambina: 'Set battesimo in cotone ricamato con cuffia', bambino: 'Set battesimo in cotone ricamato con cuffia', momP: 159, kidP: 69, kidPb: 69 },
    domenica: { mom: 'Camicia in seta crema e pantalone palazzo', bambina: 'Abito in cotone a fiori con ballerine', bambino: 'Polo in piqué e bermuda in lino', momP: 129, kidP: 59, kidPb: 55 },
    sera: { mom: 'Abito lungo nero con spalline gioiello', bambina: 'Abito in velluto nero con colletto avorio', bambino: 'Camicia bianca, gilet nero e papillon', momP: 179, kidP: 79, kidPb: 75 }
  };
  var CM = [74, 80, 92, 98, 104, 110, 116, 122, 128, 134, 140, 146, 152, 158, 164];
  var form = document.getElementById('look-form');
  var age = document.getElementById('age');
  var ageOut = document.getElementById('age-out');
  var out = { mom: byId('r-mom'), kid: byId('r-kid'), who: byId('r-kid-who'), size: byId('r-size'), price: byId('r-price'), cta: byId('r-cta') };
  function byId(id) { return document.getElementById(id); }

  function sizeLabel(a, occ) {
    if (occ === 'battesimo' || a === 0) {
      var months = a === 0 ? '6–12 mesi' : (a === 1 ? '12–18 mesi' : '18–24 mesi');
      return a <= 2 ? months + ' · ' + CM[a] + ' cm' : a + ' anni · ' + CM[a] + ' cm';
    }
    return a + (a === 1 ? ' anno' : ' anni') + ' · ' + CM[a] + ' cm';
  }
  function ageLabel(a) { return a === 0 ? 'meno di 1 anno' : a + (a === 1 ? ' anno' : ' anni'); }

  function update(animate) {
    var occ = form.occ.value, kid = form.kid.value, a = +age.value;
    var L = LOOKS[occ];
    var kidLook = L[kid];
    if (occ === 'comunione' && a < 7) kidLook = kid === 'bambina' ? 'Abito da damigella in tulle con fascia in raso' : 'Completo da paggetto con gilet avorio';
    var kidPrice = kid === 'bambina' ? L.kidP : L.kidPb;
    ageOut.textContent = ageLabel(a);
    out.mom.textContent = L.mom;
    out.kid.textContent = kidLook;
    out.who.textContent = kid === 'bambina' ? 'Per lei' : 'Per lui';
    out.size.textContent = sizeLabel(a, occ);
    out.price.textContent = '€ ' + (L.momP + kidPrice);
    var body = 'Buongiorno, vorrei prenotare una prova per il look "' + occ + '":\n- per me: ' + L.mom + '\n- per ' + (kid === 'bambina' ? 'mia figlia' : 'mio figlio') + ' (' + ageLabel(a) + '): ' + kidLook + ', taglia ' + sizeLabel(a, occ) + '\n\nGiorno e orario preferiti: ';
    out.cta.href = 'mailto:ciao@rcboutique.it?subject=' + encodeURIComponent('Prova look di famiglia: ' + occ) + '&body=' + encodeURIComponent(body);
    if (animate && !reduce) {
      [out.mom, out.kid, out.size, out.price].forEach(function (el, i) {
        el.classList.remove('swap'); void el.offsetWidth; el.style.animationDelay = (i * 60) + 'ms'; el.classList.add('swap');
      });
    }
  }
  form.addEventListener('change', function () { update(true); });
  age.addEventListener('input', function () { update(false); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  update(false);
})();
