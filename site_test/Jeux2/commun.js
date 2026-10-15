/* E-SCHOOL — bibliothèque commune des jeux : sauvegarde signée, pièces, boutique, Premium (licence signée), anti-triche, heure fiable, interface, sons */
(function () {
  'use strict';
  var W = window, D = document, LS;
  try { LS = W.localStorage; LS.getItem('ec_t'); } catch (e) { var mem = {}; LS = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } }; }
  var CFG = Object.assign({ devMode: true, blockDevtools: false, secret: 'x', whatsapp: '', premiumInfo: '', premiumGames: {}, premiumKey: null, firebase: null }, W.EC_CONFIG || {});

  /* ---------- SHA-256 synchrone ---------- */
  var K = [], H0 = [];
  (function () {
    var p = 2, n = 0;
    function isP(x) { for (var i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; }
    while (K.length < 64) { if (isP(p)) { if (n < 8) H0[n] = (Math.pow(p, .5) % 1) * 4294967296 | 0; K[n++] = (Math.pow(p, 1 / 3) % 1) * 4294967296 | 0; } p++; }
  })();
  function rot(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256(s) {
    var m = unescape(encodeURIComponent(s)), l = m.length, i, j, total = (((l + 8) >> 6) + 1) * 16, w = new Array(total);
    for (i = 0; i < total; i++) w[i] = 0;
    for (i = 0; i < l; i++) w[i >> 2] |= m.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[total - 1] = l * 8;
    var h = H0.slice();
    for (j = 0; j < total; j += 16) {
      var Wd = w.slice(j, j + 16), a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        if (i >= 16) { var g0 = Wd[i - 15], g1 = Wd[i - 2]; Wd[i] = (Wd[i - 16] + (rot(g0, 7) ^ rot(g0, 18) ^ (g0 >>> 3)) + Wd[i - 7] + (rot(g1, 17) ^ rot(g1, 19) ^ (g1 >>> 10))) | 0; }
        var t1 = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + Wd[i]) | 0;
        var t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = [(h[0] + a) | 0, (h[1] + b) | 0, (h[2] + c) | 0, (h[3] + d) | 0, (h[4] + e) | 0, (h[5] + f) | 0, (h[6] + g) | 0, (h[7] + hh) | 0];
    }
    return h.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  function rnd(n) { var s = '', c = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

  /* ---------- Heure fiable : l'en-tête "Date" du serveur. Changer l'heure de l'ordinateur ne sert à rien. ---------- */
  var TOFF = 0, TOK = false, TPROM = null;
  function now() { return Date.now() + TOFF; }
  function dayKey() { return new Date(now()).toISOString().slice(0, 10); }
  var time = {
    now: now, day: dayKey, trusted: function () { return TOK; },
    /* Promise<bool> : true si l'heure du serveur a pu être lue (impossible en ouvrant le fichier directement, ou hors-ligne) */
    sync: function () {
      if (TPROM) return TPROM;
      TPROM = new Promise(function (res) {
        try {
          if (!/^https?:$/.test(W.location.protocol) || !W.fetch) return res(false);
          var t0 = Date.now();
          fetch(W.location.pathname + '?_t=' + t0, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
            var d = r.headers.get('Date'), s = d ? Date.parse(d) : 0;
            if (s > 0) { TOFF = s + 500 - (t0 + Date.now()) / 2; TOK = true; }
            res(TOK);
          }).catch(function () { res(false); });
        } catch (e) { res(false); }
      });
      return TPROM;
    }
  };

  /* ---------- Sauvegarde signée (liée à l'appareil) ---------- */
  var DEV = (function () { try { var v = LS.getItem('ec_dev'); if (!v) { v = rnd(24); LS.setItem('ec_dev', v); } return v; } catch (e) { return 'nodev0000000000000000'; } })();
  function sig(s) { return sha256(CFG.secret + '|' + DEV + '|' + s + '|' + CFG.secret).slice(0, 24); }
  function save(k, o) { try { var b = btoa(unescape(encodeURIComponent(JSON.stringify(o)))); LS.setItem('ec_' + k, b + '.' + sig(k + b)); } catch (e) {} }
  function load(k, def) {
    var r; try { r = LS.getItem('ec_' + k); } catch (e) { return def; }
    if (!r) return def;
    var i = r.lastIndexOf('.'), b = r.slice(0, i), s = r.slice(i + 1);
    if (sig(k + b) !== s) { flag('Sauvegarde modifiée : ' + k); try { LS.removeItem('ec_' + k); } catch (e) {} return def; }
    try { return JSON.parse(decodeURIComponent(escape(atob(b)))); } catch (e) { return def; }
  }

  /* ---------- Profil + alertes anti-triche (3 alertes en 7 jours = profil suspendu ; les alertes expirent) ---------- */
  var P = null, pend = 0;
  function blank() { return { coins: 0, owned: {}, sel: {}, xp: 0, seen: 0, fl: [], best: {}, hist: [], tr: {} }; }
  function profile() {
    if (P) return P;
    P = load('pf', null) || blank();
    if (!P.fl) P.fl = []; if (!P.hist) P.hist = []; if (!P.tr || Array.isArray(P.tr)) P.tr = {};
    var had = pend > 0; for (; pend > 0; pend--) P.fl.push(now());
    P.seen = Math.max(P.seen || 0, now() - 1000);
    if (had) save('pf', P);
    return P;
  }
  function commit() { profile(); P.seen = Math.max(P.seen, now()); save('pf', P); refreshBar(); }
  var cheatLog = [];
  function recent() { profile(); var t = now(); P.fl = P.fl.filter(function (x) { return t - x < 6048e5; }); return P.fl.length; }
  function flag(reason) {
    cheatLog.push(reason);
    if (!P) pend++; else { P.fl.push(now()); P.fl = P.fl.slice(-20); save('pf', P); }
    if (W.console) console.warn('[E-school] Anomalie détectée : ' + reason);
  }
  function locked() { return recent() >= 3; }

  /* ---------- Joueur ---------- */
  var player = {
    name: function () { var n; try { n = LS.getItem('nom') || LS.getItem('prenom'); } catch (e) {} return (n || 'Explorateur').slice(0, 16); }
  };

  /* ---------- Limites par jeu (anti-triche sur les gains) ---------- */
  var LIM = {};
  function register(game, o) { LIM[game] = Object.assign({ coinsPerSec: 2, maxRun: 300, maxScore: 1e6, perHour: 2500 }, o || {}); }

  var coins = {
    get: function () { return profile().coins | 0; },
    /* Règle les gains d'une partie. req = pièces demandées par le jeu, seconds = durée réelle de la partie */
    settle: function (game, o) {
      var p = profile(), L = LIM[game] || LIM.default || (register('default'), LIM.default);
      o = o || {}; var sec = Math.max(0, Math.min(+o.seconds || 0, 3600)), req = Math.max(0, Math.floor(+o.req || 0));
      if (locked()) return { granted: 0, locked: true };
      var cap = Math.min(L.maxRun, Math.floor(sec * L.coinsPerSec) + 5);
      if (req > cap * 3 + 20) flag('Gain de pièces impossible (' + game + ')');
      var t = now(), h = p.hist.filter(function (x) { return t - x[0] < 3600000; });
      var used = h.reduce(function (s, x) { return s + x[1]; }, 0);
      var granted = Math.max(0, Math.min(req, cap, L.perHour - used));
      h.push([t, granted]); p.hist = h.slice(-60);
      p.coins += granted; commit();
      return { granted: granted, capped: granted < req };
    },
    spend: function (n) { var p = profile(); n = Math.floor(n); if (!(n >= 0) || p.coins < n) return false; p.coins -= n; commit(); return true; }
  };
  var shop = {
    owned: function (id) { return !!profile().owned[id]; },
    buy: function (id, price) { var p = profile(); if (p.owned[id]) return true; if (!coins.spend(price)) return false; p.owned[id] = 1; commit(); return true; },
    select: function (cat, id) { var p = profile(); if (id !== 'default' && !p.owned[id]) return false; p.sel[cat] = id; commit(); return true; },
    selected: function (cat, def) { return profile().sel[cat] || def; }
  };
  function xpAdd(n) { var p = profile(); if (locked()) return; p.xp += Math.min(Math.max(0, n | 0), 500); commit(); }

  /* ---------- Classement local signé ---------- */
  var scores = {
    submit: function (game, score, meta) {
      var L = LIM[game] || {}; score = Math.floor(+score || 0);
      if (score > (L.maxScore || 1e9)) { flag('Score impossible (' + game + ')'); return { ok: false }; }
      if (locked()) return { ok: false, locked: true };
      var t = load('top_' + game, []); t.push({ s: score, n: player.name(), d: now(), m: meta || null });
      t.sort(function (a, b) { return b.s - a.s; }); save('top_' + game, t.slice(0, 10));
      var p = profile(); if (score > (p.best[game] || 0)) { p.best[game] = score; commit(); }
      if (cloud.ready()) cloud.send('scores_' + game, { game: game, score: score, name: player.name(), t: now() });
      return { ok: true };
    },
    /* Classement en ligne (Promise<[{score,name}]>) : liste vide si le cloud n'est pas configuré */
    cloudTop: function (game, n) {
      return cloud.init().then(function (c) {
        if (!c || !db) return [];
        return db.collection('scores_' + game).orderBy('score', 'desc').limit(n || 10).get().then(function (q) {
          return q.docs.map(function (d) { var x = d.data(); return { score: x.score | 0, name: String(x.name || '').slice(0, 16) }; });
        });
      }).catch(function () { return []; });
    },
    top: function (game) { return load('top_' + game, []); },
    best: function (game) { return profile().best[game] || 0; }
  };

  /* ---------- Premium : licence signée (ECDSA P-256) ----------
     Le propriétaire signe chaque licence avec sa clé PRIVÉE (outil generateur-codes.html, jamais publiée).
     Le jeu ne contient que la clé PUBLIQUE (config.js) : il peut vérifier une licence, mais personne ne peut en fabriquer une.
     Chaque licence est liée à l'ID de l'appareil de l'élève et a une date d'expiration. */
  var lic = { ok: false, until: 0, ready: false }, cloudUntil = 0;
  function b64uBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function devShort() { return DEV.slice(0, 12).toUpperCase(); }
  function verifyLicense(code) {
    return new Promise(function (res) {
      try {
        var m = String(code || '').replace(/\s+/g, '').match(/^ES1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
        if (!m) return res({ ok: false, msg: 'Code invalide.' });
        if (!CFG.premiumKey) return res({ ok: false, msg: "Le Premium n'est pas encore configuré par l'administrateur." });
        if (!(W.crypto && W.crypto.subtle)) return res({ ok: false, msg: 'Ouvre le site avec Live Server ou en https pour activer le code.' });
        var data = b64uBytes(m[1]), sg = b64uBytes(m[2]);
        W.crypto.subtle.importKey('jwk', CFG.premiumKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
          .then(function (k) { return W.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, sg, data); })
          .then(function (ok) {
            if (!ok) return res({ ok: false, msg: 'Code invalide.', forged: true });
            var p; try { p = JSON.parse(new TextDecoder().decode(data)); } catch (e) { return res({ ok: false, msg: 'Code invalide.' }); }
            if (String(p.d || '').toUpperCase().replace(/[^A-Z0-9]/g, '') !== devShort()) return res({ ok: false, msg: 'Ce code est réservé à un autre appareil.' });
            var until = +p.u || 0; if (until <= now()) return res({ ok: false, msg: 'Ce code a expiré.' });
            res({ ok: true, until: until, msg: 'Premium activé jusqu’au ' + new Date(until).toLocaleDateString('fr-FR') + ' !' });
          }).catch(function () { res({ ok: false, msg: 'Code invalide.' }); });
      } catch (e) { res({ ok: false, msg: 'Code invalide.' }); }
    });
  }
  function premOn() { var t = now(); return !locked() && ((lic.ok && t < lic.until) || t < cloudUntil); }
  var premium = {
    is: function (feature) { if (feature && !CFG.premiumGames[feature]) return true; return premOn(); },
    until: function () { return Math.max(lic.ok ? lic.until : 0, cloudUntil); },
    daysLeft: function () { return Math.max(0, Math.ceil((premium.until() - now()) / 864e5)); },
    deviceId: function () { return devShort().replace(/(.{4})(?=.)/g, '$1-'); },
    /* Promise<{ok,msg}> */
    activate: function (code) {
      return verifyLicense(code).then(function (r) {
        if (r.ok) { try { LS.setItem('ec_lic', String(code).replace(/\s+/g, '')); } catch (e) {} lic.ok = true; lic.until = r.until; refreshBar(); }
        else if (r.forged) flag('Code Premium falsifié');
        return r;
      });
    },
    canTrial: function (f) { return !!f && profile().tr[f] !== dayKey(); },
    useTrial: function (f) { var p = profile(); p.tr[f] = dayKey(); commit(); }
  };
  time.sync().then(function () {
    var raw = null; try { raw = LS.getItem('ec_lic'); } catch (e) {}
    if (!raw) { lic.ready = true; refreshBar(); return; }
    verifyLicense(raw).then(function (r) { if (r.ok) { lic.ok = true; lic.until = r.until; } lic.ready = true; refreshBar(); });
  });
  setInterval(function () { TPROM = null; time.sync(); }, 600000);

  /* ---------- Variables protégées (contre Cheat Engine & co) ---------- */
  function secure(v0) {
    var k1, k2, A, B;
    function set(v) { k1 = Math.random() * 1e6 + 1; k2 = Math.random() * 1e6 + 1; A = v + k1; B = v * 3 + k2; }
    set(+v0 || 0);
    return {
      get: function () { var x = A - k1, y = (B - k2) / 3; if (Math.abs(x - y) > 1e-4) { flag('Valeur mémoire modifiée'); set(Math.min(x, y)); return Math.min(x, y); } return x; },
      set: function (v) { set(+v || 0); },
      add: function (d) { var v = this.get() + d; set(v); return v; }
    };
  }

  /* ---------- Garde anti-triche ---------- */
  var natives = [[Date, 'now'], [Math, 'random'], [W, 'requestAnimationFrame'], [W, 'setTimeout'], [W, 'setInterval']], pn = W.performance && W.performance.now;
  var TS = Function.prototype.toString;
  function isNative(fn) { try { return /\[native code\]/.test(TS.call(fn)); } catch (e) { return false; } }
  var guardTimer = null, gState = { bad: 0, last: 0, lastP: 0, paused: false, cb: null }, fired = {};
  var guard = {
    start: function (onCheat) {
      gState.cb = onCheat || function () {}; gState.last = Date.now(); gState.lastP = performance.now(); gState.bad = 0;
      clearInterval(guardTimer);
      guardTimer = setInterval(function () {
        var n = Date.now(), p = performance.now(), dt = n - gState.last, dp = p - gState.lastP;
        gState.last = n; gState.lastP = p;
        if (dt > 800 && dt < 2500) { var r = dp / dt; if (r < .75 || r > 1.3) { if (++gState.bad >= 3) { gState.bad = 0; trigger('Vitesse du jeu modifiée'); } } else gState.bad = 0; }
        for (var i = 0; i < natives.length; i++) if (!isNative(natives[i][0][natives[i][1]])) { trigger('Fonction du navigateur modifiée'); break; }
        if (pn && !isNative(performance.now)) trigger('Horloge modifiée');
        if (!CFG.devMode && CFG.blockDevtools) {
          var open = (W.outerWidth - W.innerWidth > 220) || (W.outerHeight - W.innerHeight > 260);
          if (open && !gState.paused) { gState.paused = true; showDev(true); gState.cb('devtools'); }
          else if (!open && gState.paused) { gState.paused = false; showDev(false); }
        }
      }, 1000);
    },
    stop: function () { clearInterval(guardTimer); }, paused: function () { return gState.paused; },
    /* Plafonne le pas de temps : bloque l'accélération/ralenti artificiel */
    dt: function (ms) { return Math.min(Math.max(ms, 0), 50) / 1000; }
  };
  /* une même anomalie n'est signalée qu'une fois par session (évite de punir un élève honnête pour un problème durable) */
  function trigger(reason) { if (fired[reason]) return; fired[reason] = 1; flag(reason); toast('⚠️ Anomalie détectée : ' + reason, 4000); if (gState.cb) gState.cb(reason); }
  function showDev(on) {
    var e = D.getElementById('ec-dev');
    if (on && !e) { e = D.createElement('div'); e.id = 'ec-dev'; e.className = 'ec-screen'; e.style.zIndex = 99999; e.innerHTML = '<div class="ec-card"><h2>⏸ Jeu en pause</h2><p>Ferme les outils de développement (F12) pour continuer.</p></div>'; D.body.appendChild(e); }
    else if (!on && e) e.remove();
  }

  /* ---------- Sons (synthétisés, aucun fichier) ---------- */
  var AC = null, master = null, noiseBuf = null, muted = (function () { try { return LS.getItem('ec_mute') === '1'; } catch (e) { return false; } })();
  // [freq, délai, durée, volume, type, glisse vers]
  var SF = {
    click: [[700, 0, .05, .06, 'sine']], coin: [[988, 0, .07, .07, 'square'], [1319, .07, .16, .07, 'square']],
    shoot: [[180, 0, .08, .09, 'sawtooth', 70], [90, .02, .1, .08, 'square']], smg: [[260, 0, .05, .06, 'sawtooth', 120]], shotgun: [[110, 0, .2, .14, 'sawtooth', 50], [60, .03, .22, .12, 'square']],
    sniper: [[70, 0, .35, .16, 'sawtooth', 40], [420, 0, .08, .08, 'square', 120]], hit: [[300, 0, .05, .08, 'square']], hurt: [[140, 0, .15, .1, 'sawtooth', 90]],
    boom: [[60, 0, .5, .2, 'sawtooth', 30], [40, .05, .5, .18, 'square']], reload: [[400, 0, .04, .05, 'square'], [600, .35, .05, .05, 'square']],
    win: [[523, 0, .12, .08, 'triangle'], [659, .12, .12, .08, 'triangle'], [784, .24, .12, .08, 'triangle'], [1047, .36, .4, .09, 'triangle']],
    lose: [[392, 0, .2, .08, 'triangle'], [330, .2, .2, .08, 'triangle'], [262, .4, .5, .08, 'triangle']],
    jump: [[400, 0, .12, .06, 'sine', 700]], crash: [[100, 0, .4, .15, 'sawtooth', 40]],
    pop: [[800, 0, .06, .06, 'sine']], buy: [[600, 0, .08, .07, 'triangle'], [900, .08, .08, .07, 'triangle'], [1200, .16, .16, .07, 'triangle']],
    error: [[200, 0, .15, .08, 'square']], pick: [[520, 0, .06, .06, 'triangle'], [780, .05, .08, .06, 'triangle']], heal: [[440, 0, .1, .06, 'sine'], [660, .1, .15, .06, 'sine']],
    zone: [[300, 0, .25, .07, 'sawtooth'], [250, .25, .25, .07, 'sawtooth']], tick: [[900, 0, .03, .05, 'square']],
    levelup: [[440, 0, .1, .07, 'triangle'], [554, .1, .1, .07, 'triangle'], [659, .2, .1, .07, 'triangle'], [880, .3, .3, .08, 'triangle']],
    powerup: [[300, 0, .3, .07, 'square', 900]], alarm: [[880, 0, .15, .07, 'square'], [660, .15, .15, .07, 'square']],
    build: [[220, 0, .06, .08, 'square'], [330, .09, .06, .08, 'square']], upgrade: [[392, 0, .1, .07, 'triangle'], [587, .1, .1, .07, 'triangle'], [784, .2, .2, .08, 'triangle']]
  };
  // [durée, volume, fréquence du filtre, glisse vers, délai, type de filtre]
  var NZ = {
    shoot: [[.09, .16, 2600, 300]], smg: [[.06, .11, 2800, 500]], shotgun: [[.26, .26, 1800, 120]], sniper: [[.4, .26, 1400, 90]], boom: [[.7, .32, 1000, 60]],
    hit: [[.04, .08, 3000, 1500]], hurt: [[.12, .1, 900, 200]], crash: [[.35, .22, 1200, 100]], reload: [[.03, .07, 4000, 2500], [.04, .07, 3000, 2000, .3]],
    jump: [[.1, .05, 1200, 3500, 0, 'highpass']], whoosh: [[.25, .09, 400, 3000, 0, 'bandpass']], step: [[.03, .05, 900, 400]], build: [[.05, .1, 1500, 600]], pop: [[.03, .05, 3500, 1500]]
  };
  function initAudio() {
    try {
      if (!AC) { AC = new (W.AudioContext || W.webkitAudioContext)(); master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination); }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) {}
  }
  function outNode(pan) { if (pan && AC.createStereoPanner) { var p = AC.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(master); return p; } return master; }
  function tone(f, dur, type, vol, o) {
    if (muted || !AC) return; o = o || {}; var t = AC.currentTime + (o.delay || 0), os = AC.createOscillator(), g = AC.createGain();
    os.type = type || 'sine'; os.frequency.setValueAtTime(f * (1 + (Math.random() - .5) * .04), t); if (o.slide) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol == null ? .1 : vol, t + (o.attack || .008)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(outNode(o.pan)); os.start(t); os.stop(t + dur + .03);
  }
  function noise(dur, vol, o) {
    if (muted || !AC) return; o = o || {};
    if (!noiseBuf) { var n = AC.sampleRate; noiseBuf = AC.createBuffer(1, n, n); var d = noiseBuf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    var t = AC.currentTime + (o.delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.freq || 1800, t); if (o.slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.slide), t + dur);
    g.gain.setValueAtTime(vol == null ? .1 : vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(outNode(o.pan)); s.start(t, Math.random() * .5); s.stop(t + dur + .03);
  }
  var sfx = {
    init: initAudio,
    /* play('nom', volume 0..1, pan -1..1) */
    play: function (n, vol, pan) {
      if (muted || !AC) return; vol = vol == null ? 1 : vol;
      (SF[n] || []).forEach(function (s) { tone(s[0], s[2], s[4], s[3] * vol, { delay: s[1], slide: s[5], pan: pan }); });
      (NZ[n] || []).forEach(function (z) { noise(z[0], z[1] * vol, { freq: z[2], slide: z[3], delay: z[4], type: z[5], pan: pan }); });
    },
    tone: tone, noise: noise, ctx: function () { return AC; }, out: function () { return master; },
    toggle: function () { muted = !muted; try { LS.setItem('ec_mute', muted ? '1' : '0'); } catch (e) {} if (master) master.gain.value = muted ? 0 : 1; refreshBar(); return muted; },
    muted: function () { return muted; }
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { D.addEventListener(ev, initAudio, { passive: true }); });

  /* ---------- Cloud (Firebase, optionnel) ---------- */
  var db = null, uid = null, cloudState = 'off', cloudPromise = null;
  var cloud = {
    ready: function () { return !!db; },
    uid: function () { return uid; },
    db: function () { return db; },
    init: function () {
      if (cloudPromise) return cloudPromise;
      cloudPromise = new Promise(function (res) {
        if (!CFG.firebase) { cloudState = 'off'; return res(null); }
        var u = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
        (function load(i) {
          if (i >= u.length) {
            try { if (!firebase.apps.length) firebase.initializeApp(CFG.firebase); db = firebase.firestore();
              /* Si l'élève est déjà connecté au site (même projet Firebase), on garde sa session ; sinon connexion anonyme */
              var au = firebase.auth(), unsub = null;
              var good = function (user) { uid = user.uid; cloudState = 'on'; cloud.syncPremium().then(function () { res({ db: db, uid: uid }); }); };
              var bad = function () { cloudState = 'off'; db = null; res(null); };
              unsub = au.onAuthStateChanged(function (u) { if (unsub) { unsub(); unsub = null; } if (u) good(u); else au.signInAnonymously().then(function (c) { good(c.user); }, bad); });
            } catch (e) { cloudState = 'off'; res(null); } return;
          }
          var s = D.createElement('script'); s.src = u[i]; s.onload = function () { load(i + 1); }; s.onerror = function () { cloudState = 'off'; res(null); }; D.head.appendChild(s);
        })(0);
      });
      return cloudPromise;
    },
    send: function (col, data) { if (!db || !uid) return Promise.resolve(); data.uid = uid; return db.collection(col).add(data).catch(function () {}); },
    /* Premium accordé côté serveur (document premium/{uid} écrit uniquement par l'administrateur) : gardé en mémoire seulement */
    syncPremium: function () {
      if (!db || !uid) return Promise.resolve();
      return db.collection('premium').doc(uid).get().then(function (d) { if (d.exists) { cloudUntil = +d.data().until || 0; refreshBar(); } }).catch(function () {});
    },
    state: function () { return cloudState; }
  };

  /* ---------- Interface ---------- */
  function quit() {
    sfx.play('click');
    var p = profile();
    if (W.parent && W.parent !== W) { W.parent.postMessage({ ec: 'quit', xp: p.xp | 0, coins: p.coins | 0 }, '*'); return; }
    /* L'XP gagnée dans les jeux est ajoutée à l'XP de l'espace élève (seulement le gain depuis la dernière sortie) */
    try { var d = (p.xp | 0) - (p.xps | 0); if (d > 0) { LS.setItem('es_xp', String((+LS.getItem('es_xp') || 0) + d)); p.xps = p.xp; commit(); } } catch (e) {}
    /* depuis un jeu : retour à l'accueil des jeux ; depuis l'accueil (index.html) : retour à l'espace */
    W.location.href = /(^|\/)(index\.html)?$/.test(W.location.pathname) ? '../espace.html' : 'index.html';
  }
  var onQuit = null;
  function toast(msg, ms) {
    var t = D.createElement('div'); t.className = 'ec-toast'; t.textContent = msg; D.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 20); setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, ms || 2200);
  }
  function mountBar(title) {
    if (D.getElementById('ec-bar')) return;
    var b = D.createElement('div'); b.id = 'ec-bar';
    b.innerHTML = '<div class="ec-t">' + title + '</div><div class="ec-sp"></div><div class="ec-pill" id="ec-prem"></div><div class="ec-pill">🪙 <b id="ec-coins">0</b></div><button class="ec-ib" id="ec-snd">🔊</button><button class="ec-ib" id="ec-q">✖</button>';
    D.body.appendChild(b);
    D.getElementById('ec-snd').onclick = function () { sfx.toggle(); };
    D.getElementById('ec-q').onclick = function () { if (onQuit) onQuit(); else quit(); };
    refreshBar();
  }
  function refreshBar() {
    var c = D.getElementById('ec-coins'); if (!c) return; c.textContent = coins.get();
    D.getElementById('ec-snd').textContent = muted ? '🔇' : '🔊';
    var pr = D.getElementById('ec-prem'), on = premOn(); pr.textContent = on ? '👑 Premium · ' + premium.daysLeft() + ' j' : 'Gratuit'; pr.className = 'ec-pill' + (on ? ' gold' : '');
  }
  function barVisible(v) { D.body.classList.toggle('ec-nobar', !v); W.dispatchEvent(new Event('resize')); }
  function screen(html, cls) {
    var e = D.createElement('div'); e.className = 'ec-screen ' + (cls || ''); e.innerHTML = '<div class="ec-card">' + html + '</div>'; D.body.appendChild(e); return e;
  }
  /* Question Oui/Non : Promise<bool> */
  function confirmBox(title, text, okLabel, noLabel) {
    return new Promise(function (res) {
      var e = screen('<h2>' + util.esc(title) + '</h2><p>' + util.esc(text || '') + '</p><button class="ec-btn pri" data-y>' + util.esc(okLabel || 'Oui') + '</button><button class="ec-btn" data-n>' + util.esc(noLabel || 'Non') + '</button>');
      e.style.zIndex = 70;
      e.querySelector('[data-y]').onclick = function () { e.remove(); sfx.play('click'); res(true); };
      e.querySelector('[data-n]').onclick = function () { e.remove(); sfx.play('click'); res(false); };
    });
  }
  /* Mur Premium : retourne true si accès OK ; sinon affiche l'écran, retourne false, et appelle onOk si l'élève active un code ou lance l'essai du jour */
  function requirePremium(feature, label, onOk, onCancel) {
    if (premium.is(feature)) return true;
    var id = premium.deviceId();
    var msg = encodeURIComponent('Bonjour, je veux un code Premium E-school (' + (label || feature) + '). Mon ID appareil : ' + id);
    var trial = premium.canTrial(feature);
    var e = screen('<div class="ec-crown">👑</div><h2>Réservé aux membres Premium</h2><p>' + util.esc(label || '') + '</p><p class="ec-mu">' + util.esc(CFG.premiumInfo || '') + '</p>' +
      '<div class="ec-mu">Ton ID appareil (à envoyer pour recevoir ton code) :</div><div class="ec-idbox">' + id + '</div>' +
      '<textarea id="ec-code" class="ec-in" rows="3" placeholder="Colle ici ton code Premium (il commence par ES1.)" autocomplete="off" spellcheck="false"></textarea><div class="ec-msg" id="ec-cm"></div>' +
      '<button class="ec-btn pri" id="ec-act">Activer mon code</button>' +
      (trial ? '<button class="ec-btn" id="ec-try">🎁 Essai gratuit (1 partie aujourd’hui)</button>' : '') +
      '<a class="ec-btn" target="_blank" rel="noopener" href="https://wa.me/' + CFG.whatsapp + '?text=' + msg + '">💬 Obtenir un code par WhatsApp</a>' +
      '<button class="ec-btn" id="ec-back">← Retour</button>');
    var m = e.querySelector('#ec-cm');
    e.querySelector('#ec-act').onclick = function () {
      m.textContent = 'Vérification…'; m.className = 'ec-msg';
      premium.activate(e.querySelector('#ec-code').value).then(function (r) {
        m.textContent = r.msg; m.className = 'ec-msg ' + (r.ok ? 'ok' : 'ko'); sfx.play(r.ok ? 'win' : 'error');
        if (r.ok) setTimeout(function () { e.remove(); refreshBar(); if (onOk) onOk(); }, 900);
      });
    };
    if (trial) e.querySelector('#ec-try').onclick = function () { premium.useTrial(feature); sfx.play('buy'); e.remove(); if (onOk) onOk(); };
    e.querySelector('#ec-back').onclick = function () { e.remove(); if (onCancel) onCancel(); };
    return false;
  }
  function lockedScreen() {
    if (!locked()) return false;
    screen('<div class="ec-crown">🛡️</div><h2>Compte protégé</h2><p>Des comportements anormaux ont été détectés. Les gains et le classement sont suspendus pour ce profil pendant quelques jours.</p><button class="ec-btn" onclick="EC.quit()">← Retour</button>');
    return true;
  }
  function css() {
    if (D.getElementById('ec-css')) return;
    var l = D.createElement('link'); l.id = 'ec-css'; l.rel = 'stylesheet';
    var s = D.currentScript || (function () { var a = D.getElementsByTagName('script'); for (var i = a.length - 1; i >= 0; i--) if (/commun\.js/.test(a[i].src)) return a[i]; })();
    l.href = s ? s.src.replace(/commun\.js.*$/, 'commun.css') : 'commun.css'; D.head.appendChild(l);
  }
  css();

  /* ---------- Utilitaires ---------- */
  var util = {
    rand: function (a, b) { return a + Math.random() * (b - a); }, ri: function (a, b) { return Math.floor(util.rand(a, b + 1)); },
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; }, pick: function (a) { return a[Math.floor(Math.random() * a.length)]; },
    esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    seeded: function (seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  };

  var EC = {
    cfg: CFG, sha256: sha256, save: save, load: load, flag: flag, flags: recent, cheatLog: function () { return cheatLog.slice(); },
    time: time, register: register, coins: coins, shop: shop, xp: { add: xpAdd, get: function () { return profile().xp; } }, scores: scores, premium: premium,
    secure: secure, guard: guard, sfx: sfx, cloud: cloud, player: player, util: util, locked: locked,
    ui: { toast: toast, bar: mountBar, refresh: refreshBar, screen: screen, confirm: confirmBox, barVisible: barVisible, requirePremium: requirePremium, lockedScreen: lockedScreen, setQuit: function (f) { onQuit = f; } },
    quit: quit
  };
  (function deep(o) { Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v === 'object') deep(v); }); Object.freeze(o); })(EC);
  Object.defineProperty(W, 'EC', { value: EC, writable: false, configurable: false });
})();
