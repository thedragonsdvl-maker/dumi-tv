/*
 * Dumi TV for Samsung Tizen (TizenBrew app module).
 * Apple TV-style home: clock, rotating nature photos, a dock of your apps and a grid of all of them,
 * boot / return animations, console-style UI sounds (synthesised with Web Audio), Settings, and
 * Dumi Assistant: type a question, Gemini answers in bold under it and speaks the answer.
 *
 * Remote: arrows + OK · BACK · RED = Dumi Assistant · GREEN = Settings.
 * On a computer: arrows, Enter, Esc/Backspace = Back, R = assistant, G = settings.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var HAS_TIZEN = typeof window.tizen !== 'undefined';

  // ---------------------------------------------------------------- storage
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('dumi.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('dumi.' + k, JSON.stringify(v)); } catch (e) { } }
  };

  // ---------------------------------------------------------------- stage
  var scale = 1;
  function fit() {
    scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $('stage').style.transform = 'scale(' + scale + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------------------------------------------------------------- language
  var LANGS = ['auto', 'ro', 'en', 'ru', 'fr', 'de', 'es', 'it'];
  var LANG_NAMES = ['Automat', 'Română', 'English', 'Русский', 'Français', 'Deutsch', 'Español', 'Italiano'];
  var LANG_EN = ['', 'Romanian', 'English', 'Russian', 'French', 'German', 'Spanish', 'Italian'];
  var T = { // key: [ro, en, ru]
    morning: ['BUNĂ DIMINEAȚA', 'GOOD MORNING', 'ДОБРОЕ УТРО'], day: ['BUNĂ ZIUA', 'GOOD AFTERNOON', 'ДОБРЫЙ ДЕНЬ'],
    evening: ['BUNĂ SEARA', 'GOOD EVENING', 'ДОБРЫЙ ВЕЧЕР'], night: ['NOAPTE BUNĂ', 'GOOD NIGHT', 'ДОБРОЙ НОЧИ'],
    st_typing: ['SCRIE ÎNTREBAREA', 'TYPE YOUR QUESTION', 'НАПИШИТЕ ВОПРОС'], st_thinking: ['MĂ GÂNDESC', 'THINKING', 'ДУМАЮ'],
    st_speaking: ['VORBESC', 'SPEAKING', 'ГОВОРЮ'],
    input: ['Scrie întrebarea și apasă Enter', 'Type your question and press Enter', 'Напишите вопрос и нажмите Enter'],
    hint: ['OK   întreabă      BACK   închide', 'OK   ask      BACK   close', 'OK   спросить      BACK   закрыть'],
    no_key: ['Pune cheia Gemini în Setări → Asistent ca să pot răspunde.', 'Add your Gemini key in Settings → Assistant so I can answer.',
      'Добавьте ключ Gemini в Настройки → Ассистент.'],
    err_busy: ['Am primit prea multe întrebări. Încearcă peste un minut.', 'Too many questions right now. Try again in a minute.',
      'Слишком много вопросов. Попробуйте через минуту.'],
    err_net: ['Nu am putut răspunde acum. Verifică internetul și încearcă din nou.', 'I couldn\'t answer right now. Check the internet and try again.',
      'Сейчас не могу ответить. Проверьте интернет.'],
    not_understood: ['Nu am înțeles. Mai încearcă o dată.', 'I didn\'t catch that. Please try again.', 'Не понял. Попробуйте ещё раз.'],
    open: ['Deschid %s', 'Opening %s', 'Открываю %s'], vol_up: ['Volum mai tare', 'Volume up', 'Громче'],
    vol_down: ['Volum mai încet', 'Volume down', 'Тише'], mute: ['Fără sunet', 'Muted', 'Без звука'],
    unmute: ['Sunet pornit', 'Sound on', 'Звук включён'], vol_set: ['Volum %s%', 'Volume %s%', 'Громкость %s%'],
    all_apps: ['TOATE APLICAȚIILE', 'ALL APPS', 'ВСЕ ПРИЛОЖЕНИЯ'], settings: ['Setări', 'Settings', 'Настройки'],
    cant_open: ['Nu pot deschide %s.', 'Can\'t open %s.', 'Не могу открыть %s.']
  };
  var MONTHS = {
    ro: ['IANUARIE', 'FEBRUARIE', 'MARTIE', 'APRILIE', 'MAI', 'IUNIE', 'IULIE', 'AUGUST', 'SEPTEMBRIE', 'OCTOMBRIE', 'NOIEMBRIE', 'DECEMBRIE'],
    en: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
    ru: ['ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ', 'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ']
  };
  var DAYS = {
    ro: ['DUMINICĂ', 'LUNI', 'MARȚI', 'MIERCURI', 'JOI', 'VINERI', 'SÂMBĂTĂ'],
    en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    ru: ['ВОСКРЕСЕНЬЕ', 'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА']
  };
  function uiLang() { var c = store.get('lang', 'auto'); return c === 'en' || c === 'ru' ? c : (c === 'auto' || c === 'ro' ? 'ro' : 'en'); }
  function t(key, arg) {
    var row = T[key]; if (!row) return key;
    var s = row[{ ro: 0, en: 1, ru: 2 }[uiLang()]];
    return arg === undefined ? s : s.replace('%s', arg);
  }
  function langInstruction() {
    var i = LANGS.indexOf(store.get('lang', 'auto'));
    return i > 0 ? 'Always write "answer" in ' + LANG_EN[i] + ', whatever language the user writes in.'
      : 'Answer in the same language as the question (usually Romanian).';
  }

  // ---------------------------------------------------------------- remote keys
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, RED: 403, GREEN: 404 };
  if (HAS_TIZEN) {
    ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (k) {
      try { tizen.tvinputdevice.registerKey(k); } catch (e) { }
    });
  }
  function keyOf(e) {
    switch (e.keyCode) {
      case 37: return 'left'; case 38: return 'up'; case 39: return 'right'; case 40: return 'down';
      case 13: return 'ok';
      case 10009: case 27: case 8: return 'back';
      case 403: case 82: return 'red';     // R on a keyboard
      case 404: case 71: return 'green';   // G on a keyboard
      default: return null;
    }
  }

  // ---------------------------------------------------------------- sounds (synthesised)
  var ac = null, sfxBuffers = {};
  function actx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function synth(name) {
    var c = actx(), sr = c.sampleRate;
    var specs = {
      move: 0.06, edge: 0.12, select: 0.12, back: 0.14, open: 0.34, home: 0.30, chime: 0.40, ding: 0.32
    };
    var len = Math.floor(specs[name] * sr), b = new Float32Array(len);
    function tone(start, f0, f1, amp, attack, tau) {
      var ph = 0, T0 = (len - start) / sr;
      for (var i = 0; start + i < len; i++) {
        var tt = i / sr, f = f0 * Math.pow(f1 / f0, Math.min(1, tt / T0));
        ph += 2 * Math.PI * f / sr;
        var env = tt < attack ? tt / attack : Math.exp(-(tt - attack) / tau);
        b[start + i] += amp * env * Math.sin(ph);
      }
    }
    function bell(start, f, amp) { tone(start, f, f, amp, 0.002, 0.16); tone(start, f * 2.76, f * 2.76, amp * 0.25, 0.001, 0.05); }
    function whoosh(c0, c1, amp) {
      var y = 0, seed = 7;
      for (var i = 0; i < len; i++) {
        var p = i / len, cutoff = c0 * Math.pow(c1 / c0, p), a = 1 - Math.exp(-2 * Math.PI * cutoff / sr);
        seed = (seed * 16807) % 2147483647;
        y += a * ((seed / 2147483647) * 2 - 1 - y);
        b[i] += amp * Math.pow(Math.sin(Math.PI * p), 2) * y * 2.2;
      }
    }
    switch (name) {
      case 'move': tone(0, 1900, 1900, 0.16, 0.002, 0.016); tone(0, 3800, 3800, 0.05, 0.001, 0.008); break;
      case 'edge': tone(0, 210, 140, 0.32, 0.003, 0.035); break;
      case 'select': tone(0, 620, 1150, 0.28, 0.002, 0.04); tone(0, 1240, 2300, 0.06, 0.002, 0.025); break;
      case 'back': tone(0, 900, 480, 0.24, 0.003, 0.05); break;
      case 'open': whoosh(500, 4500, 0.16); tone(0, 320, 980, 0.12, 0.05, 0.12); break;
      case 'home': whoosh(3500, 500, 0.12); tone(0, 1050, 520, 0.10, 0.02, 0.10); break;
      case 'chime': bell(0, 1046.5, 0.17); bell(Math.floor(0.045 * sr), 1318.5, 0.14); bell(Math.floor(0.09 * sr), 1568, 0.13); break;
      default: bell(0, 1318.5, 0.15); bell(Math.floor(0.1 * sr), 1760, 0.14);
    }
    var fade = Math.floor(sr / 200);
    for (var i = 0; i < len; i++) {
      var v = b[i]; if (i > len - fade) v *= (len - i) / fade;
      b[i] = Math.tanh(v * 1.2);
    }
    var buf = c.createBuffer(1, len, sr);
    buf.getChannelData(0).set(b);
    return buf;
  }
  function sfx(name) {
    if (!store.get('sounds', true)) return;
    var c = actx(); if (!c) return;
    try {
      var src = c.createBufferSource(), g = c.createGain();
      src.buffer = sfxBuffers[name] || (sfxBuffers[name] = synth(name));
      g.gain.value = [0.35, 0.6, 1][store.get('soundLevel', 1)];
      src.connect(g); g.connect(c.destination); src.start(0);
    } catch (e) { }
  }

  // ---------------------------------------------------------------- toast
  var toastTimer;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('in');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('in'); }, 2600);
  }

  // ---------------------------------------------------------------- apps
  var apps = [];
  var DEMO = ['Netflix', 'YouTube', 'Spotify', 'Prime Video', 'Disney+', 'Plex', 'Apple TV', 'Internet', 'Galerie', 'SmartThings', 'TizenBrew'];
  function loadApps(done) {
    if (!HAS_TIZEN) {
      apps = DEMO.map(function (n) { return { id: 'demo.' + n, name: n, icon: null }; });
      return done();
    }
    try {
      tizen.application.getAppsInfo(function (list) {
        apps = list.filter(function (a) { return a.show !== false && a.name && a.id; })
          .map(function (a) { return { id: a.id, name: a.name, icon: a.iconPath || null }; })
          .sort(function (a, b) { return a.name.localeCompare(b.name); });
        done();
      }, function () { apps = []; done(); });
    } catch (e) { apps = []; done(); }
  }
  function findApp(name) {
    if (!name) return null;
    var n = String(name).toLowerCase().trim(), best = null;
    apps.forEach(function (a) {
      var l = a.name.toLowerCase();
      if (l === n) best = a;
      else if (!best && (l.indexOf(n) >= 0 || n.indexOf(l) >= 0)) best = a;
    });
    return best;
  }
  function dockIds() {
    var saved = store.get('dock', null);
    if (saved) return saved.filter(function (id) { return apps.some(function (a) { return a.id === id; }); });
    var picks = [];
    [/netflix/i, /youtube/i, /spotify/i, /prime|disney|hbo|max|plex/i].forEach(function (re) {
      var a = apps.filter(function (x) { return re.test(x.name) && picks.indexOf(x.id) < 0; })[0];
      if (a) picks.push(a.id);
    });
    return picks;
  }
  function launch(app) {
    sfx('open');
    if (!HAS_TIZEN) { toast(t('open', app.name)); return; }
    try {
      tizen.application.launch(app.id, null, function () { toast(t('cant_open', app.name)); });
    } catch (e) { toast(t('cant_open', app.name)); }
  }
  function hue(name) {
    var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }
  /**
   * Brand looks for well-known apps: [name pattern, Simple Icons logo (or null), tile colour, logo colour].
   * Logos come from the free Simple Icons set via its CDN; apps without one get their name as a wordmark.
   */
  var BRANDS = [
    [/youtube\s*music/i, 'youtubemusic', '#000000', 'FF0000'],
    [/youtube/i, 'youtube', '#FFFFFF', 'FF0000'],
    [/netflix/i, 'netflix', '#000000', 'E50914'],
    [/spotify/i, 'spotify', '#000000', '1ED760'],
    [/plex/i, 'plex', '#1F1F1F', 'EBAF00'],
    [/apple\s*tv/i, 'appletv', '#000000', 'FFFFFF'],
    [/apple\s*music/i, 'applemusic', '#FA243C', 'FFFFFF'],
    [/hbo\s*max|^max$/i, 'max', '#0026FF', 'FFFFFF'],
    [/hbo/i, 'hbo', '#000000', 'FFFFFF'],
    [/twitch/i, 'twitch', '#9146FF', 'FFFFFF'],
    [/tiktok/i, 'tiktok', '#000000', 'FFFFFF'],
    [/facebook/i, 'facebook', '#0866FF', 'FFFFFF'],
    [/instagram/i, 'instagram', '#E1306C', 'FFFFFF'],
    [/kodi/i, 'kodi', '#17B2E7', 'FFFFFF'],
    [/smartthings/i, 'smartthings', '#15BFFF', 'FFFFFF'],
    [/samsung/i, 'samsung', '#1428A0', 'FFFFFF'],
    [/google\s*play|play\s*store/i, 'googleplay', '#FFFFFF', '414141'],
    [/chrome/i, 'googlechrome', '#FFFFFF', '4285F4'],
    [/paramount/i, 'paramountplus', '#0064FF', 'FFFFFF'],
    [/crunchyroll/i, 'crunchyroll', '#FF5E00', 'FFFFFF'],
    [/deezer/i, 'deezer', '#000000', 'A238FF'],
    [/soundcloud/i, 'soundcloud', '#FF5500', 'FFFFFF'],
    [/dazn/i, 'dazn', '#0C161C', 'F8F8F5'],
    [/mubi/i, 'mubi', '#000000', 'FFFFFF'],
    [/prime\s*video|amazon/i, null, '#00A8E1', 'FFFFFF'],
    [/disney/i, null, '#0E1A4B', 'FFFFFF']
  ];
  function brandOf(name) {
    for (var i = 0; i < BRANDS.length; i++) if (BRANDS[i][0].test(name)) return BRANDS[i];
    return null;
  }
  /** Tile art: brand logo → the TV's own app icon → the app's name on a colour gradient. */
  function tile(app) {
    var el = document.createElement('div');
    el.className = 'tile';
    var brand = brandOf(app.name), h = hue(app.name);
    var word = document.createElement('div');
    word.className = 'wordmark';
    word.textContent = app.name;
    if (brand) {
      el.style.background = brand[2];
      word.style.color = '#' + brand[3];
    } else {
      el.style.background = 'linear-gradient(135deg, hsl(' + h + ',45%,32%), hsl(' + ((h + 40) % 360) + ',50%,18%))';
    }
    el.appendChild(word);

    var sources = [];
    if (brand && brand[1]) sources.push({ src: 'https://cdn.simpleicons.org/' + brand[1] + '/' + brand[3], cls: 'logo' });
    if (app.icon) sources.push({ src: app.icon.charAt(0) === '/' ? 'file://' + app.icon : app.icon, cls: 'icon' });
    (function tryNext() {
      var s = sources.shift(); if (!s) return; // keep the wordmark
      var img = new Image();
      img.className = s.cls;
      img.onload = function () { if (word.parentNode === el) el.replaceChild(img, word); };
      img.onerror = tryNext;
      img.src = s.src;
    })();
    return el;
  }

  // ---------------------------------------------------------------- home: build + focus
  var pills = [].slice.call(document.querySelectorAll('.pill'));
  var dockTiles = [], gridCells = [], COLS = 5;
  var focus = { zone: 'dock', i: 0 };

  function buildHome() {
    var dock = $('dock'), grid = $('grid');
    dock.innerHTML = ''; grid.innerHTML = ''; dockTiles = []; gridCells = [];
    var ids = dockIds();
    ids.forEach(function (id) {
      var a = apps.filter(function (x) { return x.id === id; })[0];
      var el = tile(a); el.app = a; dock.appendChild(el); dockTiles.push(el);
    });
    apps.filter(function (a) { return ids.indexOf(a.id) < 0; }).forEach(function (a) {
      var cell = document.createElement('div'); cell.className = 'cell';
      var el = tile(a); el.app = a; cell.appendChild(el);
      var cap = document.createElement('div'); cap.className = 'caption'; cap.textContent = a.name; cell.appendChild(cap);
      grid.appendChild(cell); gridCells.push(cell);
    });
    $('appsLabel').textContent = t('all_apps');
    $('appsLabel').style.display = gridCells.length ? '' : 'none';
    if (!dockTiles.length && focus.zone === 'dock') focus = gridCells.length ? { zone: 'grid', i: 0 } : { zone: 'pills', i: 0 };
    setFocus(focus.zone, Math.min(focus.i, zoneSize(focus.zone) - 1), false);
  }

  function zoneEls(z) { return z === 'pills' ? pills : z === 'dock' ? dockTiles : gridCells; }
  function zoneSize(z) { return zoneEls(z).length; }
  function focusedEl() { return zoneEls(focus.zone)[focus.i]; }

  function setFocus(zone, i, sound) {
    var prev = focusedEl();
    if (prev) { prev.classList.remove('focused', 'focusedCell'); var pt = prev.querySelector && prev.querySelector('.tile'); if (pt) pt.classList.remove('focused'); }
    focus = { zone: zone, i: Math.max(0, i) };
    var el = focusedEl(); if (!el) return;
    if (zone === 'grid') { el.classList.add('focusedCell'); el.querySelector('.tile').classList.add('focused'); }
    else el.classList.add('focused');
    if (sound !== false) sfx('move');

    var content = $('content');
    if (zone === 'grid') {
      var y = Math.max(0, el.offsetTop - 380);
      content.style.transform = 'translateY(' + (-y) + 'px)';
      $('dim').style.opacity = 0.55; $('title').style.opacity = 0;
    } else {
      content.style.transform = 'translateY(0)';
      $('dim').style.opacity = [0, 0.2, 0.4, 0.6][store.get('dimLevel', 0)];
      $('title').style.opacity = 1;
    }
    if (zone === 'dock') {
      var a = el.app; $('title').textContent = a.name;
      var h = hue(a.name);
      $('glow').style.background = 'radial-gradient(ellipse 70% 55% at 50% 82%, hsla(' + h + ',80%,55%,.42), hsla(' + h + ',80%,55%,.1) 55%, transparent 75%)';
    } else if (zone === 'pills') {
      $('glow').style.background = 'none';
    }
  }

  function homeKey(k) {
    var z = focus.zone, i = focus.i, n = zoneSize(z);
    if (k === 'left' || k === 'right') {
      var d = k === 'left' ? -1 : 1, j = i + d;
      if (z === 'grid' && (Math.floor(j / COLS) !== Math.floor(i / COLS) || j >= n || j < 0)) return sfx('edge');
      if (j < 0 || j >= n) return sfx('edge');
      return setFocus(z, j);
    }
    if (k === 'down') {
      if (z === 'pills') return dockTiles.length ? setFocus('dock', Math.floor(dockTiles.length / 2)) : (gridCells.length ? setFocus('grid', 0) : sfx('edge'));
      if (z === 'dock') return gridCells.length ? setFocus('grid', Math.min(i, gridCells.length - 1)) : sfx('edge');
      if (i + COLS < n) return setFocus('grid', i + COLS);
      if (Math.floor(i / COLS) < Math.floor((n - 1) / COLS)) return setFocus('grid', n - 1);
      return sfx('edge');
    }
    if (k === 'up') {
      if (z === 'pills') return sfx('edge');
      if (z === 'dock') return setFocus('pills', 0);
      if (i >= COLS) return setFocus('grid', i - COLS);
      return dockTiles.length ? setFocus('dock', Math.min(i % COLS, dockTiles.length - 1)) : setFocus('pills', 0);
    }
    if (k === 'ok') {
      var el = focusedEl(); if (!el) return;
      if (z === 'pills') { sfx('select'); return el.dataset.action === 'assistant' ? openAssistant() : openSettings(); }
      return launch(el.app || el.querySelector('.tile').app);
    }
    if (k === 'back') {
      if (z === 'grid') { sfx('back'); return setFocus('dock', 0, false); }
      if (z === 'pills') { sfx('back'); return dockTiles.length ? setFocus('dock', 0, false) : null; }
    }
    if (k === 'red') { sfx('select'); return openAssistant(); }
    if (k === 'green') { sfx('select'); return openSettings(); }
  }

  // ---------------------------------------------------------------- clock + look
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clockText(d) { return d.getHours() + ':' + pad(d.getMinutes()); }
  function updateClock() {
    var d = new Date(), h = d.getHours(), L = uiLang();
    $('greeting').textContent = t(h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : 'evening');
    $('clock').textContent = clockText(d);
    $('date').textContent = DAYS[L][d.getDay()] + '  ' + d.getDate() + ' ' + MONTHS[L][d.getMonth()];
  }
  function applyLook() {
    $('clock').style.fontSize = store.get('clockSize', 150) + 'px';
    $('greeting').style.display = store.get('showGreeting', true) ? '' : 'none';
    $('date').style.display = store.get('showDate', true) ? '' : 'none';
    pills[1].innerHTML = '⚙&nbsp; ' + t('settings');
    if (focus.zone !== 'grid') $('dim').style.opacity = [0, 0.2, 0.4, 0.6][store.get('dimLevel', 0)];
    updateClock();
    scheduleWall();
  }

  // ---------------------------------------------------------------- wallpaper
  var WALLS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  var wallIdx = store.get('wallIdx', -1), wallFront = $('wallA'), wallBack = $('wallB'), wallTimer = null;
  function nextWall() {
    wallIdx = (wallIdx + 1) % WALLS.length; store.set('wallIdx', wallIdx);
    var img = wallBack;
    img.onload = function () {
      img.classList.add('on'); wallFront.classList.remove('on');
      wallBack = wallFront; wallFront = img;
    };
    img.src = 'wallpapers/' + WALLS[wallIdx] + '.jpg';
    scheduleWall();
  }
  function scheduleWall() {
    clearTimeout(wallTimer);
    var min = store.get('wallMin', 10);
    if (min > 0) wallTimer = setTimeout(nextWall, min * 60000);
  }

  // ---------------------------------------------------------------- animation helpers
  /** Animate from the given inline styles back to the element's normal CSS state. */
  function animIn(el, from, dur, delay, ease) {
    if (!el) return;
    el.style.transition = 'none';
    for (var k in from) el.style[k] = from[k];
    void el.offsetWidth;
    el.style.transition = 'all ' + dur + 'ms ' + (ease || 'cubic-bezier(.2,.8,.2,1)') + ' ' + (delay || 0) + 'ms';
    for (var k2 in from) el.style[k2] = '';
    setTimeout(function () { el.style.transition = ''; }, dur + (delay || 0) + 30);
  }
  var OVERSHOOT = 'cubic-bezier(.3,1.45,.5,1)';

  function walls(fromScale, dur) {
    [$('wallA'), $('wallB')].forEach(function (w) {
      w.style.transition = 'none'; w.style.transform = 'scale(' + fromScale + ')'; void w.offsetWidth;
      w.style.transition = 'opacity 2s ease, transform ' + dur + 'ms cubic-bezier(.2,.8,.2,1)'; w.style.transform = 'scale(1)';
    });
  }

  /** Coming back to the app: photo settles, corner drops in, dock rises in a ripple. */
  function playReturn() {
    if (!store.get('returnAnim', true)) return;
    sfx('home');
    walls(1.07, 750);
    animIn($('header'), { opacity: 0, transform: 'translateY(-14px)' }, 500, 60);
    animIn($('title'), { opacity: 0 }, 400, 220);
    dockTiles.forEach(function (el, i) {
      animIn(el, { opacity: 0, transform: 'translateY(26px) scale(.94)' }, 450, 90 + i * 55);
    });
  }

  /** On start: the clock appears big in the middle, a colour line draws, then it glides into the corner. */
  function playIntro() {
    var intro = $('intro'), big = $('introClock'), line = $('introLine'), hello = $('introHello'), black = $('introBlack');
    intro.classList.remove('hidden');
    big.textContent = $('clock').textContent;
    big.style.fontSize = Math.round(store.get('clockSize', 150) * 1.6) + 'px';
    hello.textContent = $('greeting').textContent;
    var corner = [$('greeting'), $('date'), $('clock')];
    corner.concat(pills).forEach(function (el) { el.style.opacity = 0; });
    $('dock').style.opacity = 0; $('title').style.opacity = 0;
    dockTiles.forEach(function (el) { el.style.transition = 'none'; el.style.opacity = 0; el.style.transform = 'translateY(70px) scale(.8)'; });
    [$('wallA'), $('wallB')].forEach(function (w) { w.style.transition = 'none'; w.style.transform = 'scale(1.18)'; });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        big.style.opacity = 1; big.style.transform = 'scale(1)';
        line.style.transform = 'scaleX(1)';
        hello.style.opacity = 1; hello.style.transform = 'none';
      });
    });
    setTimeout(function () { sfx('chime'); }, 400);

    setTimeout(function () {
      // Glide: same font and text, so translate + scale lines the big clock up with the real one.
      var from = big.getBoundingClientRect(), to = $('clock').getBoundingClientRect();
      var k = store.get('clockSize', 150) / parseFloat(big.style.fontSize);
      big.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1)';
      big.style.transform = 'translate(' + ((to.left - from.left) / scale) + 'px,' + ((to.top - from.top) / scale) + 'px) scale(' + k + ')';
      line.style.opacity = 0; hello.style.opacity = 0; black.style.opacity = 0;
      sfx('home');
      walls(1.18, 1800);
      [$('greeting'), $('date')].forEach(function (el) { el.style.transition = 'opacity .5s .65s'; el.style.opacity = ''; });
      pills.forEach(function (p, i) { animIn(p, { opacity: 0, transform: 'translateY(-10px)' }, 500, 300 + i * 90); });
      $('dock').style.transition = 'opacity .4s .45s'; $('dock').style.opacity = '';
      dockTiles.forEach(function (el, i) {
        void el.offsetWidth;
        el.style.transition = 'all 650ms ' + OVERSHOOT + ' ' + (550 + i * 110) + 'ms';
        el.style.opacity = ''; el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 1300 + i * 110);
      });
      $('title').style.transition = 'opacity .5s .9s'; $('title').style.opacity = '';
      setTimeout(function () {
        $('clock').style.opacity = ''; intro.classList.add('hidden');
        [$('greeting'), $('date'), $('dock'), $('title')].forEach(function (el) { el.style.transition = ''; });
      }, 950);
    }, 2000);
  }

  // ---------------------------------------------------------------- settings
  var SECTIONS = ['Ceas', 'Fotografii', 'Dock', 'Asistent', 'Sunete & animații'];
  var HINTS = ['Cum arată ceasul din colț', 'Fotografiile din spatele ecranului', 'OK adaugă sau scoate o aplicație din dock',
    'Dumi Assistant: butonul ROȘU sau „Dumi” sus', 'Sunetele de la apăsări și animațiile'];
  var set = { open: false, section: 0, inRows: false, row: 0, rows: [], navEls: [] };

  function choice(label, key, names, values, def, after) {
    return { type: 'choice', label: label, key: key, names: names, values: values, def: def, after: after };
  }
  function toggle(label, key, def, after) { return { type: 'toggle', label: label, key: key, def: def, after: after }; }

  function sectionRows(s) {
    switch (s) {
      case 0: return [
        choice('Mărime', 'clockSize', ['Mic', 'Mediu', 'Mare', 'Foarte mare'], [110, 150, 190, 230], 150, applyLook),
        toggle('Salut', 'showGreeting', true, applyLook),
        toggle('Dată', 'showDate', true, applyLook)];
      case 1: return [
        choice('Schimbă fotografia la', 'wallMin', ['Niciodată', '5 minute', '10 minute', '30 minute', 'O oră'], [0, 5, 10, 30, 60], 10, applyLook),
        choice('Întunecare', 'dimLevel', ['Deloc', 'Puțin', 'Mediu', 'Mult'], [0, 1, 2, 3], 0, applyLook),
        { type: 'action', label: 'Arată următoarea fotografie', run: nextWall }];
      case 2:
        var ids = dockIds();
        return [{ type: 'head', label: 'ÎN DOCK (OK = SCOATE)' }].concat(
          ids.map(function (id) { return { type: 'app', id: id }; }),
          [{ type: 'head', label: 'ADAUGĂ ÎN DOCK' }],
          apps.filter(function (a) { return ids.indexOf(a.id) < 0; }).map(function (a) { return { type: 'app', id: a.id }; }));
      case 3: return [
        { type: 'key', label: 'Cheie Gemini' },
        choice('Limbă', 'lang', LANG_NAMES, LANGS, 'auto', function () { applyLook(); buildHome(); }),
        choice('Voce', 'voice', ['Kore · feminină', 'Aoede · feminină caldă', 'Leda · feminină tânără', 'Puck · masculină', 'Charon · masculină gravă', 'Fenrir · masculină vie'],
          ['Kore', 'Aoede', 'Leda', 'Puck', 'Charon', 'Fenrir'], 'Kore'),
        toggle('Răspuns vorbit', 'speak', true),
        { type: 'info', label: 'Cheia o iei gratuit de pe aistudio.google.com' }];
      default: return [
        toggle('Sunete la apăsări', 'sounds', true),
        choice('Volum sunete', 'soundLevel', ['Mic', 'Mediu', 'Mare'], [0, 1, 2], 1),
        toggle('Animație la revenire', 'returnAnim', true),
        { type: 'info', label: 'Animația de pornire rulează la fiecare deschidere a aplicației.' }];
    }
  }

  function rowValue(r) {
    if (r.type === 'choice') {
      var v = store.get(r.key, r.def), i = r.values.indexOf(v);
      return '‹  ' + r.names[i < 0 ? 0 : i] + '  ›';
    }
    if (r.type === 'toggle') return store.get(r.key, r.def) ? 'Pornit' : 'Oprit';
    if (r.type === 'action') return '›';
    if (r.type === 'key') { var k = store.get('geminiKey', ''); return k ? '••••' + k.slice(-4) : 'Adaugă ›'; }
    if (r.type === 'app') return dockIds().indexOf(r.id) >= 0 ? '#' + (dockIds().indexOf(r.id) + 1) : 'Adaugă';
    return '';
  }

  function openSettings() {
    set.open = true; set.inRows = false;
    $('settings').classList.remove('hidden');
    var nav = $('setSections'); nav.innerHTML = ''; set.navEls = [];
    SECTIONS.forEach(function (s, i) {
      var el = document.createElement('div'); el.className = 'navItem'; el.textContent = s; nav.appendChild(el); set.navEls.push(el);
    });
    showSection(0);
    animIn($('settings'), { opacity: 0 }, 250, 0);
  }
  function closeSettings() {
    sfx('back'); set.open = false; $('settings').classList.add('hidden');
    buildHome(); applyLook();
  }
  function showSection(s, keepRow) {
    set.section = s;
    set.navEls.forEach(function (el, i) {
      el.classList.toggle('open', i === s); el.classList.toggle('focused', !set.inRows && i === s);
    });
    $('setPanelTitle').textContent = SECTIONS[s];
    $('setPanelHint').textContent = HINTS[s];
    set.rows = sectionRows(s);
    var box = $('setRows'); box.innerHTML = '';
    var inner = document.createElement('div'); inner.className = 'rowsInner'; box.appendChild(inner);
    set.rows.forEach(function (r) {
      var el = document.createElement('div');
      if (r.type === 'head') { el.className = 'rowHead'; el.textContent = r.label; }
      else {
        el.className = 'row' + (r.type === 'info' ? ' info' : '');
        var label = r.type === 'app' ? (apps.filter(function (a) { return a.id === r.id; })[0] || { name: r.id }).name : r.label;
        el.innerHTML = '<span></span><span class="val"></span>';
        el.firstChild.textContent = label;
        el.lastChild.textContent = rowValue(r);
      }
      r.el = el; inner.appendChild(el);
    });
    if (set.inRows) focusRow(keepRow !== undefined ? keepRow : firstRow(), false);
  }
  function selectable(r) { return r && r.type !== 'head' && r.type !== 'info'; }
  function firstRow() { for (var i = 0; i < set.rows.length; i++) if (selectable(set.rows[i])) return i; return -1; }
  function focusRow(i, sound) {
    if (i < 0) return;
    set.rows.forEach(function (r) { if (r.el) r.el.classList.remove('focused'); });
    set.row = i; set.rows[i].el.classList.add('focused');
    var inner = $('setRows').firstChild, top = set.rows[i].el.offsetTop, h = $('setRows').clientHeight;
    inner.style.transform = 'translateY(' + (-Math.max(0, top - h * 0.45)) + 'px)';
    if (sound !== false) sfx('move');
  }
  function refreshRow(r) { if (r.el && r.el.lastChild) r.el.lastChild.textContent = rowValue(r); }

  function settingsKey(k) {
    if (!set.inRows) {
      if (k === 'up' || k === 'down') {
        var j = set.section + (k === 'up' ? -1 : 1);
        if (j < 0 || j >= SECTIONS.length) return sfx('edge');
        sfx('move'); return showSection(j);
      }
      if (k === 'right' || k === 'ok') {
        var f = firstRow(); if (f < 0) return sfx('edge');
        set.inRows = true; showSection(set.section, f); return sfx('move');
      }
      if (k === 'back' || k === 'left' || k === 'green') return closeSettings();
      return;
    }
    var r = set.rows[set.row];
    if (k === 'up' || k === 'down') {
      var d = k === 'up' ? -1 : 1, n = set.row + d;
      while (n >= 0 && n < set.rows.length && !selectable(set.rows[n])) n += d;
      if (n < 0 || n >= set.rows.length) return sfx('edge');
      return focusRow(n);
    }
    if (k === 'back' || (k === 'left' && r.type !== 'choice' && r.type !== 'toggle')) {
      sfx('back'); set.inRows = false; return showSection(set.section);
    }
    if (k === 'left' || k === 'right' || k === 'ok') {
      var dir = k === 'left' ? -1 : 1;
      if (r.type === 'choice') {
        var vi = r.values.indexOf(store.get(r.key, r.def)); if (vi < 0) vi = 0;
        vi = k === 'ok' ? (vi + 1) % r.values.length : Math.max(0, Math.min(r.values.length - 1, vi + dir));
        store.set(r.key, r.values[vi]); sfx(k === 'ok' ? 'select' : 'move');
      } else if (r.type === 'toggle') {
        store.set(r.key, k === 'ok' ? !store.get(r.key, r.def) : dir > 0); sfx('select');
      } else if (k === 'ok' && r.type === 'action') { sfx('select'); r.run(); }
      else if (k === 'ok' && r.type === 'key') { sfx('select'); return editKey(r); }
      else if (k === 'ok' && r.type === 'app') {
        var ids = dockIds(), at = ids.indexOf(r.id);
        if (at >= 0) ids.splice(at, 1); else ids.push(r.id);
        store.set('dock', ids); sfx('select'); buildHome();
        return showSection(set.section, set.row);
      } else return;
      refreshRow(r); if (r.after) r.after();
    }
  }

  /** The Gemini key is typed once on the TV (never stored in the public code). */
  function editKey(r) {
    var input = document.createElement('input');
    input.type = 'text'; input.value = store.get('geminiKey', ''); input.placeholder = 'AIza… / AQ.…';
    r.el.replaceChild(input, r.el.lastChild);
    set.editing = input;
    input.focus();
    function done() {
      if (set.editing !== input) return;
      set.editing = null;
      store.set('geminiKey', input.value.trim());
      var v = document.createElement('span'); v.className = 'val'; r.el.replaceChild(v, input); refreshRow(r);
    }
    input.addEventListener('blur', done);
    input.addEventListener('change', done);
  }

  // ---------------------------------------------------------------- Dumi Assistant
  var as = { open: false, state: 'typing', session: 0, audio: null, level: 0 };

  function openAssistant() {
    as.open = true;
    var el = $('assistant'); el.classList.remove('hidden');
    void el.offsetWidth; el.classList.add('shown');
    $('asHint').textContent = t('hint');
    $('asInput').placeholder = t('input');
    $('asQuestion').textContent = ''; $('asAnswer').textContent = ''; $('asChips').innerHTML = '';
    sfx('chime');
    startTyping();
    orbLoop();
  }
  function closeAssistant() {
    sfx('back'); as.open = false; as.session++; stopVoice();
    $('asInput').blur();
    var el = $('assistant'); el.classList.remove('shown');
    setTimeout(function () { if (!as.open) el.classList.add('hidden'); }, 420);
  }
  function setState(s) {
    as.state = s;
    $('asStatus').textContent = s === 'typing' ? t('st_typing') : s === 'thinking' ? t('st_thinking') : s === 'speaking' ? t('st_speaking') : '';
    $('asDots').classList.toggle('hidden', s !== 'thinking');
    $('asInput').style.display = s === 'typing' ? '' : 'none';
  }
  function startTyping() {
    setState('typing');
    var input = $('asInput'); input.value = '';
    setTimeout(function () { input.focus(); }, 150);
  }
  function typeQuestion(q) {
    var el = $('asQuestion'), i = 0; el.textContent = '';
    var step = Math.max(8, Math.min(22, 1200 / Math.max(1, q.length)));
    (function tick() { if (i <= q.length) { el.textContent = q.slice(0, i++); setTimeout(tick, step); } })();
  }
  function revealAnswer(text) {
    var el = $('asAnswer'); el.innerHTML = '';
    var spans = text.split(' ').map(function (w) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w + ' '; el.appendChild(s); return s;
    });
    animIn(el, { transform: 'translateY(16px)' }, 350, 0);
    spans.forEach(function (s, i) { setTimeout(function () { s.classList.remove('w'); }, 60 + i * 65); });
  }
  function chip(label, i) {
    var c = document.createElement('div'); c.className = 'chip'; c.textContent = '✓  ' + label;
    $('asChips').appendChild(c);
    setTimeout(function () { c.classList.add('in'); }, 250 + i * 120);
  }

  function ask(q) {
    var s = ++as.session;
    $('asInput').blur();
    typeQuestion(q);
    $('asAnswer').textContent = ''; $('asChips').innerHTML = '';
    var key = store.get('geminiKey', '');
    if (!key) return showAnswer(t('no_key'), []);
    setState('thinking');
    gemini(key, q).then(function (r) {
      if (s !== as.session) return;
      showAnswer(r.answer || t('not_understood'), r.actions || []);
    }, function (err) {
      if (s !== as.session) return;
      showAnswer(err && err.status === 429 ? t('err_busy') : t('err_net'), []);
    });
  }

  function showAnswer(text, actions) {
    setState('answered');
    sfx('ding');
    revealAnswer(text);
    var openLater = null, n = 0;
    actions.forEach(function (a) {
      var v = String(a.value || '').toLowerCase().trim();
      if (a.type === 'open_app') {
        var app = findApp(a.value); if (!app) return;
        chip(t('open', app.name), n++); openLater = app;
      } else if (a.type === 'volume') {
        var label = volume(v); if (label) chip(label, n++);
      }
    });
    speak(text);
    if (openLater) setTimeout(function () { if (as.open) { closeAssistant(); launch(openLater); } }, 1800);
  }

  /** TV volume through Tizen's audio control, if the TV allows it. */
  function volume(v) {
    try {
      var tv = tizen.tvaudiocontrol;
      if (v === 'up') { tv.setVolumeUp(); tv.setVolumeUp(); return t('vol_up'); }
      if (v === 'down') { tv.setVolumeDown(); tv.setVolumeDown(); return t('vol_down'); }
      if (v === 'mute') { tv.setMute(true); return t('mute'); }
      if (v === 'unmute') { tv.setMute(false); return t('unmute'); }
      var pct = parseInt(v.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(pct)) { tv.setVolume(Math.max(0, Math.min(100, pct))); return t('vol_set', pct); }
    } catch (e) { }
    return null;
  }
  function currentVolume() { try { return tizen.tvaudiocontrol.getVolume() + '%'; } catch (e) { return 'unknown'; } }

  // ---------------------------------------------------------------- Gemini
  var MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];
  var SYSTEM = 'You are Dumi Assistant, the assistant built into Dumi\'s Samsung TV. The user typed a question. '
    + 'Put their question, cleaned up, in "question". Answer in "answer": short (one or two sentences) and friendly. '
    + 'If the request needs the TV to do something, add actions; otherwise return an empty list. You can only:\n'
    + '- open_app: value = the app\'s exact name from the installed list.\n'
    + '- volume: value = up | down | mute | unmute | a number 0-100.\n'
    + 'You cannot change channels or control other apps on this TV; say so kindly if asked. '
    + 'When you perform an action, say what you did in "answer".';

  function gemini(key, q) {
    var context = 'Installed apps: ' + apps.map(function (a) { return a.name; }).join(', ')
      + '\nVolume: ' + currentVolume() + '\nTime: ' + new Date().toString();
    var body = function (thinkingOff) {
      var gen = {
        responseMimeType: 'application/json', temperature: 0.4,
        responseSchema: {
          type: 'OBJECT', required: ['question', 'answer', 'actions'], properties: {
            question: { type: 'STRING' }, answer: { type: 'STRING' },
            actions: { type: 'ARRAY', items: { type: 'OBJECT', required: ['type', 'value'], properties: {
              type: { type: 'STRING', enum: ['open_app', 'volume'] }, value: { type: 'STRING' } } } }
          }
        }
      };
      if (thinkingOff) gen.thinkingConfig = { thinkingBudget: 0 };
      return JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM + '\n' + langInstruction() + '\n\nTV state:\n' + context }] },
        contents: [{ role: 'user', parts: [{ text: q }] }],
        generationConfig: gen
      });
    };
    function attempt(mi, thinkingOff) {
      if (mi >= MODELS.length) return Promise.reject({ status: 0 });
      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODELS[mi] + ':generateContent?key=' + encodeURIComponent(key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(thinkingOff)
      }).then(function (res) {
        if (res.status === 400 && thinkingOff) return attempt(mi, false);
        if ([404, 429, 500, 503].indexOf(res.status) >= 0) return mi + 1 < MODELS.length ? attempt(mi + 1, true) : Promise.reject({ status: res.status });
        if (!res.ok) return Promise.reject({ status: res.status });
        return res.json().then(function (j) {
          return JSON.parse(j.candidates[0].content.parts[0].text);
        });
      });
    }
    return attempt(0, true);
  }

  // ---------------------------------------------------------------- voice (Gemini TTS, streamed)
  function stopVoice() {
    if (as.audio) { as.audio.forEach(function (s) { try { s.stop(); } catch (e) { } }); }
    as.audio = null; as.level = 0;
  }
  function speak(text) {
    stopVoice();
    var key = store.get('geminiKey', '');
    if (!store.get('speak', true) || !key) return;
    var c = actx(); if (!c) return;
    var s = as.session, sources = [], nextAt = 0, analyser = c.createAnalyser();
    analyser.fftSize = 512; analyser.connect(c.destination);
    as.audio = sources; as.analyser = analyser;
    var started = false, pending = '';

    function play(b64) {
      var bin = atob(b64), n = bin.length >> 1, f = new Float32Array(n);
      for (var i = 0; i < n; i++) { var v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); f[i] = (v > 32767 ? v - 65536 : v) / 32768; }
      var buf = c.createBuffer(1, n, 24000); buf.getChannelData(0).set(f);
      var src = c.createBufferSource(); src.buffer = buf; src.connect(analyser);
      nextAt = Math.max(nextAt, c.currentTime + 0.05);
      src.start(nextAt); nextAt += buf.duration; sources.push(src);
      if (!started) { started = true; setState('speaking'); }
      src.onended = function () {
        if (s === as.session && as.state === 'speaking' && c.currentTime >= nextAt - 0.05) setState('answered');
      };
    }
    function lines(chunk) {
      pending += chunk;
      var parts = pending.split('\n'); pending = parts.pop();
      parts.forEach(function (l) {
        if (l.indexOf('data:') !== 0 || s !== as.session) return;
        try {
          var j = JSON.parse(l.slice(5));
          (j.candidates[0].content.parts || []).forEach(function (p) { if (p.inlineData) play(p.inlineData.data); });
        } catch (e) { }
      });
    }
    fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:streamGenerateContent?alt=sse&key=' + encodeURIComponent(key), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: store.get('voice', 'Kore') } } } }
      })
    }).then(function (res) {
      if (!res.ok) return;
      if (res.body && res.body.getReader) {
        var reader = res.body.getReader(), dec = new TextDecoder();
        return (function pump() {
          return reader.read().then(function (r) {
            if (r.done || s !== as.session) return;
            lines(dec.decode(r.value, { stream: true })); return pump();
          });
        })();
      }
      return res.text().then(function (all) { lines(all + '\n'); });
    }).catch(function () { });
  }

  // ---------------------------------------------------------------- orb
  var orbAngle = 0;
  function orbLoop() {
    if (!as.open) return;
    var cv = $('orb'), g = cv.getContext('2d'), W = cv.width, cx = W / 2, r = W / 2;
    var lvl = 0;
    if (as.state === 'speaking' && as.analyser) {
      var data = new Uint8Array(as.analyser.fftSize); as.analyser.getByteTimeDomainData(data);
      var sum = 0; for (var i = 0; i < data.length; i++) { var d = (data[i] - 128) / 128; sum += d * d; }
      lvl = Math.min(1, Math.sqrt(sum / data.length) * 5);
    } else if (as.state === 'thinking') lvl = 0.35 + 0.25 * Math.sin(Date.now() / 160);
    else if (as.state === 'typing') lvl = 0.15 + 0.1 * Math.sin(Date.now() / 600);
    as.level += (lvl - as.level) * 0.25;
    orbAngle += as.state === 'thinking' ? 0.12 : 0.025;
    g.clearRect(0, 0, W, W);
    var glow = g.createRadialGradient(cx, cx, 0, cx, cx, r);
    glow.addColorStop(0, 'rgba(155,114,203,.45)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(cx, cx, r, 0, 2 * Math.PI); g.fill();
    var rr = r * 0.62 * (0.82 + 0.25 * as.level), cols = ['#4285F4', '#9B72CB', '#D96570', '#F2A60C'];
    for (var k = 0; k < 4; k++) {
      g.beginPath(); g.moveTo(cx, cx);
      g.arc(cx, cx, rr, orbAngle + k * Math.PI / 2, orbAngle + (k + 1) * Math.PI / 2 + 0.02);
      g.fillStyle = cols[k]; g.fill();
    }
    g.fillStyle = '#0b0b16'; g.beginPath(); g.arc(cx, cx, rr * (0.6 - 0.25 * as.level), 0, 2 * Math.PI); g.fill();
    requestAnimationFrame(orbLoop);
  }

  function assistantKey(k, e) {
    var input = $('asInput');
    if (document.activeElement === input) {
      if (k === 'ok') { e.preventDefault(); var q = input.value.trim(); if (q) { sfx('select'); ask(q); } return true; }
      if (k === 'back' && e.keyCode !== 8) { closeAssistant(); return true; }
      return false; // let the text field have arrows / letters
    }
    if (k === 'back') { closeAssistant(); return true; }
    if (k === 'ok' || k === 'red') { sfx('select'); stopVoice(); as.session++; startTyping(); return true; }
    return true;
  }

  // ---------------------------------------------------------------- key routing
  document.addEventListener('keydown', function (e) {
    var k = keyOf(e);
    if (!k) return;
    actx(); // first key press unlocks audio in browsers
    if (as.open) { if (assistantKey(k, e)) e.preventDefault(); return; }
    if (set.open) {
      if (set.editing) {
        if (k === 'ok' || (k === 'back' && e.keyCode !== 8)) { e.preventDefault(); set.editing.blur(); }
        return;
      }
      e.preventDefault(); return settingsKey(k);
    }
    e.preventDefault();
    homeKey(k);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { updateClock(); loadApps(function () { buildHome(); playReturn(); }); }
  });

  // ---------------------------------------------------------------- start
  setInterval(updateClock, 10000);
  applyLook();
  nextWall();
  loadApps(function () {
    buildHome();
    playIntro();
  });
})();
