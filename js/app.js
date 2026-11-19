/* =====================================================================
   Сборка страницы из config.js.
   Все тексты из конфига вставляются через textContent (не innerHTML),
   поэтому случайный символ < или & в конфиге ничего не сломает.
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG;
  var ICONS = window.LB_ICONS || {};
  var GLASS = window.LB_GLASS || {};
  if (!cfg) { return; }

  var root = document.documentElement;
  var query = new URLSearchParams(location.search);

  /* ---------- КОНСТАНТЫ ----------
     Числа и тексты, которые не хочется искать по коду. Размеры и скорости анимаций
     лежат в css/style.css (блок «ПАРАМЕТРЫ»). */
  var FIT_SLACK = 16;            // строка может зайти в промежуток возле значка (по 8px с каждой стороны)
  var FIT_MIN_PX = 9.5;          // мельче этого размер строки не уменьшаем
  var FIT_MIN_RATIO = 0.62;      // и не меньше этой доли от исходного размера
  var RESIZE_DEBOUNCE_MS = 120;  // пауза после изменения размера окна перед пересчётом строк
  var TOAST_MS = 2200;           // сколько висит подсказка «Номер карты скопирован» и галочка на кнопке
  var SCHEDULE_REFRESH_MS = 60000;   // как часто обновлять кнопку расписания
  var CARD_GROUP_MIN_DIGITS = 13;    // номер карты от стольких цифр показываем группами по 4
  var STREAMS_DATA_URL = "data/streams.json";    // где лежат данные о стримах, если не задано в config.js
  var STREAMS_MAX = 4;                           // сколько стримов показывать максимум (1 главный + 3 в ряду)
  var STREAMS_MORE_TEXT = "Все стримы на YouTube →";
  var STREAM_TZ = "Europe/Moscow";               // по какому часовому поясу писать дату стрима
  var SWIPE_MIN_PX = 40;                         // насколько надо сдвинуть палец, чтобы это считалось свайпом
  var SWIPE_TAP_SLOP_PX = 10;                    // меньший сдвиг считается нажатием, а не свайпом
  var FALLBACK_LABEL = "Следующий стрим";      // если в config.js не задан schedule.fallbackLabel
  var NO_DATE_TEXT = "Скоро объявим дату";     // если ближайшего стрима нет
  var LIVE_LABEL = "В ЭФИРЕ";                  // если в config.js не задан live.label

  /* ---------- маленькие помощники ---------- */
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function icon(name, extraClass) {
    var span = el("span", "icon" + (extraClass ? " " + extraClass : ""));
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = ICONS[name] || ICONS.link || "";   // только наши собственные SVG
    return span;
  }

  /* «Стеклянная» кнопка в форме значка (см. LB_GLASS в js/icons.js). Слои снизу вверх:
     тень и стекло (размытие за ним, вырезано по форме маской). */
  function glassShape(name) {
    var g = GLASS[name];
    var NS = "http://www.w3.org/2000/svg";
    var box = el("span", "glassshape");
    if (!g) return box;
    var shape = (g.fill ? 'fill="#000" ' : 'fill="none" ') + 'stroke="#000" stroke-width="' + g.sw +
                '" stroke-linecap="round" stroke-linejoin="round"';
    var mask = '<svg xmlns="' + NS + '" viewBox="' + g.vb + '"><path d="' + g.d + '" ' + shape + '/></svg>';
    box.style.setProperty("--gs-mask", 'url("data:image/svg+xml,' + encodeURIComponent(mask) + '")');
    var vb = g.vb.split(" ");
    box.style.aspectRatio = vb[2] + " / " + vb[3];
    box.appendChild(el("span", "gs-shadow"));
    box.appendChild(el("span", "gs-glass"));

    return box;
  }

  // Кнопка со стеклянной формой внутри; ширина кнопки берётся из пропорций формы.
  function addShape(btn, name) {
    var shape = glassShape(name);
    btn.appendChild(shape);
    btn.style.aspectRatio = shape.style.aspectRatio;
  }

  var revealIndex = 0;
  function reveal(node) {
    node.classList.add("reveal");
    node.style.setProperty("--i", revealIndex++);
    return node;
  }

  // Возвращает безопасный адрес или null (пустой, битый, не http/https).
  function safeUrl(url) {
    if (!url || !String(url).trim()) return null;      // пустой адрес URL() принял бы за адрес самой страницы
    try {
      var u = new URL(url, location.href);
      return (u.protocol === "https:" || u.protocol === "http:") ? u.href : null;
    } catch (e) { return null; }
  }

  /* ---------- текст кнопки: основной + необязательный дополнительный ----------
     position: "above" — дополнительный текст над основным, иначе — под ним. */
  function buildBtnText(mainText, captionText, position, mainExtraClass) {
    var box = el("span", "btn__text");
    var main = el("span", "btn__main btn__fit" + (mainExtraClass ? " " + mainExtraClass : ""), mainText);
    var caption = captionText ? el("span", "btn__caption btn__fit", captionText) : null;

    if (caption && position === "above") box.appendChild(caption);
    box.appendChild(main);
    if (caption && position !== "above") box.appendChild(caption);

    return { box: box, main: main, caption: caption };
  }

  /* ---------- подгонка текста по ширине ----------
     Строки не переносятся (.btn__fit). Если строка шире свободного места между
     значками, размер её шрифта чуть уменьшается — настолько, чтобы она влезла.
     Так длинный текст не вылезает за кнопку на любом телефоне и в любом шрифте. */
  // Сбрасывает размер строки до CSS-шного и мерит: сколько места есть и сколько нужно строке.
  function measureFit(node) {
    node.style.fontSize = "";
    var box = node.parentNode;
    if (!box) return null;
    var cs = getComputedStyle(box);
    var avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + FIT_SLACK;
    if (avail <= FIT_SLACK) return null;                        // скрыто
    return { max: parseFloat(getComputedStyle(node).fontSize), avail: avail, width: node.getBoundingClientRect().width };
  }

  function fitEl(node) {
    var m = measureFit(node);
    if (!m || m.width <= m.avail) return;                       // скрыто или уже влезает
    var size = Math.max(FIT_MIN_PX, m.max * FIT_MIN_RATIO, m.max * m.avail / m.width);
    node.style.fontSize = (Math.floor(size * 10) / 10) + "px";
  }

  function overflows(node) {
    var m = measureFit(node);
    return !!m && m.width > m.avail;
  }

  /* ---------- одинаковый отступ между строками в двухстрочных кнопках ----------
     Оба текста разного размера и шрифта, поэтому одинаковый CSS-отступ выглядит по-разному.
     Здесь мерится видимый зазор: от базовой линии верхней строки до верха заглавных
     нижней, и нижней строке добавляется поправка, чтобы зазор стал равен --caption-gap. */
  var capCanvas = document.createElement("canvas").getContext("2d");

  function baselineY(node) {
    var probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0";
    node.appendChild(probe);
    var y = probe.getBoundingClientRect().bottom;
    node.removeChild(probe);
    return y;
  }

  function capHeight(node) {
    var cs = getComputedStyle(node);
    capCanvas.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    return capCanvas.measureText("H").actualBoundingBoxAscent;
  }

  // Насколько буквы строки уходят ниже базовой линии (хвосты р, у, д, запятых). У цифр это 0.
  function inkDescent(node) {
    var cs = getComputedStyle(node);
    var text = node.textContent;
    if (cs.textTransform === "uppercase") text = text.toUpperCase();
    capCanvas.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    return Math.max(0, capCanvas.measureText(text).actualBoundingBoxDescent);
  }

  function cssPx(name, fallback) {
    var v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return isFinite(v) ? v : fallback;
  }

  /* Отступы в группе. Структура у всех групп одна:
       header.group__head
         div.group__titlebar  (заголовок + бейдж)
         p.group__note        (необязательно)
       ul.group__list (или видео)
     Два отступа: внутри шапки (заголовок -> подпись) и между шапкой и содержимым
     (последняя строка шапки -> первая кнопка). Мерится видимый зазор от низа букв
     верхнего элемента до верха букв (или края кнопки) нижнего; недостающее
     добавляется отступом. */
  function equalizeGroupGaps() {
    var tn = cssPx("--gap-title-note", 10);
    var hl = cssPx("--gap-head-list", 14);
    var groups = document.querySelectorAll(".group");
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var head = g.querySelector(".group__head");
      var title = g.querySelector(".group__title");
      var note = g.querySelector(".group__note");
      var list = g.querySelector(".group__list, .streams__view");
      if (!head || !title || !list) continue;
      head.style.marginBottom = "";
      if (note) note.style.marginTop = "";
      if (!title.clientWidth || g.hidden) continue;

      var titleBottom = baselineY(title) + inkDescent(title);
      var listTop = list.getBoundingClientRect().top;
      var headBottom = titleBottom;                       // низ букв последней строки шапки

      if (note) {
        // первая строка подписи: пустой маркер в начале текста даёт её базовую линию
        var probe = document.createElement("span");
        probe.style.cssText = "display:inline-block;width:0;height:0";
        note.insertBefore(probe, note.firstChild);
        var firstBase = probe.getBoundingClientRect().bottom;
        note.removeChild(probe);
        headBottom = baselineY(note) + inkDescent(note);
        note.style.marginTop = round1(tn - ((firstBase - capHeight(note)) - titleBottom)) + "px";
      }
      head.style.marginBottom = round1(hl - (listTop - headBottom)) + "px";
    }
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  function equalizeCaptionGaps() {
    var target = parseFloat(getComputedStyle(root).getPropertyValue("--caption-gap")) || 6;
    var boxes = document.querySelectorAll(".btn__text");
    for (var i = 0; i < boxes.length; i++) {
      var kids = boxes[i].children;
      if (kids.length !== 2) continue;
      var upper = kids[0], lower = kids[1];
      lower.style.marginTop = "";
      if (!boxes[i].clientWidth) continue;                       // скрыто
      var gap = (baselineY(lower) - capHeight(lower)) - (baselineY(upper) + inkDescent(upper));
      if (isFinite(gap)) lower.style.marginTop = (Math.round((target - gap) * 10) / 10) + "px";
    }
  }

  function fitAll() {
    updateSchedule();                  // заново выбираем «полные/короткие дни» под текущую ширину
    var nodes = document.querySelectorAll(".btn__fit");
    for (var i = 0; i < nodes.length; i++) fitEl(nodes[i]);
    equalizeCaptionGaps();
    equalizeGroupGaps();
  }

  var fitTimer = null;
  function fitSoon() {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitAll, RESIZE_DEBOUNCE_MS);
  }

  /* ---------- тема ---------- */
  root.setAttribute("data-palette", (cfg.theme && cfg.theme.palette) || "bordeaux");

  function currentTheme() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }

  // Цвет строки браузера (theme-color) берём из --bg палитры, отдельно его нигде не храним.
  // Запасные значения совпадают с --bg из css/themes.css (и с inline-скриптом в index.html).
  function applyTheme(mode) {
    root.setAttribute("data-theme", mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    meta.setAttribute("content", bg || (mode === "dark" ? "#1d0f13" : "#f6eeea"));
  }

  // Принудительный режим из конфига действует, пока человек сам не выбрал тему кнопкой
  (function initMode() {
    var mode = cfg.theme && cfg.theme.mode;
    var saved = null;
    try { saved = localStorage.getItem("lb-theme"); } catch (e) {}
    if (!saved && (mode === "light" || mode === "dark")) applyTheme(mode);
  })();

  /* ---------- шапка ---------- */
  function buildHero() {
    var p = cfg.profile || {};
    var hero = document.getElementById("hero");

    if (p.heroImage) {
      var img = el("img", "hero__img");
      img.src = p.heroImage;
      img.alt = p.heroAlt || p.name || "";
      img.decoding = "async";
      img.fetchPriority = "high";
      hero.style.setProperty("--hero-pos", p.heroPosition || "50% 22%");
      hero.appendChild(img);
    }

    var btn = el("button", "theme-toggle");
    btn.type = "button";
    btn.setAttribute("aria-label", "Переключить светлую и тёмную тему");
    btn.appendChild(icon("sun", "icon--sun"));
    btn.appendChild(icon("moon", "icon--moon"));
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("lb-theme", next); } catch (e) {}
    });
    hero.appendChild(btn);

    var text = el("div", "hero__text");
    text.appendChild(el("h1", "hero__name", p.name || ""));
    if (p.tagline) text.appendChild(el("p", "hero__tagline", p.tagline));
    hero.appendChild(text);
  }

  function buildBio(parent) {
    var p = cfg.profile || {};
    if (p.bio) parent.appendChild(reveal(el("p", "bio", p.bio)));
  }

  /* ---------- кнопка-расписание (не ссылка, но выглядит как кнопка) ---------- */
  var scheduleEls = null;

  function buildScheduleButton() {
    if (!cfg.schedule || !window.LBSchedule) return null;

    var box = el("div", "btn btn--static");
    box.setAttribute("aria-live", "polite");
    box.appendChild(icon("calendar"));

    var t = buildBtnText("", cfg.schedule.fallbackLabel || FALLBACK_LABEL,
                         cfg.schedule.captionPosition || "above");
    box.appendChild(t.box);

    scheduleEls = { main: t.main, caption: t.caption };
    updateSchedule();
    return box;
  }

  function describeSchedule(now, weekdayStyle) {
    var c = {};
    for (var k in cfg.schedule) c[k] = cfg.schedule[k];
    c.weekdayStyle = weekdayStyle;
    return window.LBSchedule.describe(now, c);
  }

  function updateSchedule() {
    if (!scheduleEls) return;
    // weekdayStyle: "auto" (по умолчанию) — полные дни недели, а если строка не влезает, то короткие;
    // "long" — всегда полные; "short" — всегда короткие.
    var style = cfg.schedule.weekdayStyle || "auto";
    var now = new Date();
    var d = describeSchedule(now, style === "short" ? "short" : "long");
    scheduleEls.main.textContent = d ? d.main : NO_DATE_TEXT;
    if (style === "auto" && d && overflows(scheduleEls.main)) {
      d = describeSchedule(now, "short");
      scheduleEls.main.textContent = d.main;
    }
    scheduleEls.caption.textContent = d ? d.label : (cfg.schedule.fallbackLabel || FALLBACK_LABEL);
    fitEl(scheduleEls.main);
    fitEl(scheduleEls.caption);
    equalizeCaptionGaps();
  }

  /* ---------- кнопка-карта: копирование номера в один клик ---------- */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, TOAST_MS);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Запасной вариант для старых браузеров / http. execCommand устарел: когда нужно
    // поддерживать только браузеры с navigator.clipboard, этот блок можно удалить.
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      try { document.execCommand("copy") ? resolve() : reject(); }
      catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  // Номер хранится в конфиге один раз. Для показа — группы по 4 цифры,
  // для копирования — только цифры.
  function cardDigits(number) { return String(number || "").replace(/\D/g, ""); }
  function cardDisplay(number) {
    var d = cardDigits(number);
    return d.length >= CARD_GROUP_MIN_DIGITS ? d.replace(/(\d{4})(?=\d)/g, "$1 ") : String(number || "");
  }

  function buildCardButton(card) {
    var btn = el("button", "btn btn--end-icon");
    btn.type = "button";

    btn.appendChild(icon(card.icon || "tbank"));

    // дополнительный текст: «Т-Банк (Анастасия Г.)»
    var caption = ((card.bank || "") + (card.holder ? " (" + card.holder + ")" : "")).trim();
    var t = buildBtnText(cardDisplay(card.number), caption, card.captionPosition || "below", "btn__number");
    btn.appendChild(t.box);
    // Название для скринридера и голосового управления начинается с видимого текста кнопки
    // (номер и «банк (держатель)»), потом действие.
    btn.setAttribute("aria-label", cardDisplay(card.number) + (caption ? " " + caption : "") + ", скопировать номер карты");

    btn.appendChild(icon("copy", "icon--copy"));
    btn.appendChild(icon("check", "icon--check"));

    var resetTimer = null;
    btn.addEventListener("click", function () {
      copyText(cardDigits(card.number)).then(function () {
        btn.classList.add("is-copied");
        showToast("Номер карты скопирован");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () { btn.classList.remove("is-copied"); }, TOAST_MS);
      }, function () {
        showToast("Не получилось скопировать — выдели номер вручную");
      });
    });

    return btn;
  }

  /* ---------- группа ссылок ---------- */
  function buildLinks(block) {
    var group = el("section", "group");
    if (block.id) group.id = block.id;
    if (block.liveHighlight) group.setAttribute("data-live-group", "");

    // Шапка группы: строка заголовка (название + бейдж «в эфире») и, если есть, подпись note
    var head = el("header", "group__head");
    var bar = el("div", "group__titlebar");
    if (block.title) bar.appendChild(el("h2", "group__title", block.title));
    bar.appendChild(el("span", "badge-live", (cfg.live && cfg.live.label) || LIVE_LABEL));
    head.appendChild(bar);

    // note: строка ИЛИ массив строк. Каждая строка массива выводится с новой строки.
    // Внутри одной строки "\n" тоже переносит (white-space: pre-line в CSS).
    if (block.note) {
      var noteText = Array.isArray(block.note) ? block.note.join("\n") : block.note;
      head.appendChild(el("p", "group__note", noteText));
    }
    group.appendChild(head);

    var list = el("ul", "group__list");

    (block.links || []).forEach(function (l) {
      var href = safeUrl(l.url);
      if (!href) {                                      // пустой или битый адрес — кнопки не будет
        console.warn("[linkbio] ссылка пропущена, неверный url:", l.title || l);
        return;
      }
      var li = el("li");
      var a = el("a", "btn");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.appendChild(icon(l.icon || "link"));
      a.appendChild(buildBtnText(l.title || l.url, l.caption, l.captionPosition).box);
      li.appendChild(a);
      list.appendChild(li);
    });

    if (block.showSchedule) {
      var sched = buildScheduleButton();
      if (sched) { var sli = el("li"); sli.appendChild(sched); list.appendChild(sli); }
    }

    if (block.card) {
      var cli = el("li");
      cli.appendChild(buildCardButton(block.card));
      list.appendChild(cli);
    }

    group.appendChild(list);
    return group;
  }

  /* ---------- прошедшие стримы: главный кадр + ряд миниатюр ----------
     Данные лежат в data/streams.json (их обновляет GitHub Action, см. README).
     Картинки берутся с нашего хостинга, а не с YouTube, поэтому блок виден и там,
     где YouTube недоступен. Нет данных или не загрузились — блок удаляется.

     Показывается один главный стрим (active) и ниже ряд из остальных в порядке
     «после главного, по кругу»: если главный третий, ряд — четвёртый, первый, второй.
     Тап по миниатюре делает её главной, свайп по главному кадру листает
     (влево — следующий, вправо — предыдущий), ▶ открывает видео на YouTube. */
  function streamDate(iso, short) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var text = d.toLocaleDateString("ru-RU", { day: "numeric", month: short ? "short" : "long", timeZone: STREAM_TZ });
    return text.replace(".", "");
  }

  // Проверяем запись из data/streams.json; возвращаем нормальную или null.
  function cleanStream(raw) {
    if (!raw || !/^[\w-]{6,20}$/.test(String(raw.id || ""))) return null;
    var thumb;
    try {
      var u = new URL(String(raw.thumb || ""), location.href);
      if (u.origin !== location.origin) return null;      // картинки только с нашего хостинга
      thumb = u.href;
    } catch (e) { return null; }
    var url = safeUrl(raw.url) || "https://www.youtube.com/watch?v=" + encodeURIComponent(raw.id);
    return { id: raw.id, thumb: thumb, url: url, published: raw.published || "" };
  }

  function buildStreams(block) {
    var group = el("section", "group streams");
    group.hidden = true;
    if (block.id) group.id = block.id;

    var head = el("header", "group__head");
    var bar = el("div", "group__titlebar");
    if (block.title) bar.appendChild(el("h2", "group__title", block.title));
    head.appendChild(bar);
    group.appendChild(head);

    var box = el("div", "streams__box");            // контейнер: по его ширине считаются размеры ряда
    var view = el("div", "streams__view");
    var main = el("div", "streams__main");
    var frames = el("div", "streams__frames");
    var chip = el("span", "streams__chip glass");
    var play = el("a", "streams__ctl streams__play");
    play.target = "_blank";
    play.rel = "noopener noreferrer";
    addShape(play, "play");
    var prev = el("button", "streams__ctl streams__nav streams__nav--prev");
    prev.type = "button";
    prev.setAttribute("aria-label", "Предыдущий стрим");
    addShape(prev, "chevron-left");
    var next = el("button", "streams__ctl streams__nav streams__nav--next");
    next.type = "button";
    next.setAttribute("aria-label", "Следующий стрим");
    addShape(next, "chevron-right");
    main.appendChild(frames);
    main.appendChild(chip);
    main.appendChild(prev);
    main.appendChild(next);
    main.appendChild(play);
    var rail = el("ul", "streams__rail");
    view.appendChild(main);
    view.appendChild(rail);
    box.appendChild(view);
    group.appendChild(box);

    if (safeUrl(block.moreUrl)) {
      var more = el("a", "streams__more", block.moreText || STREAMS_MORE_TEXT);
      more.href = safeUrl(block.moreUrl);
      more.target = "_blank";
      more.rel = "noopener noreferrer";
      group.appendChild(more);
    }

    function start(list) {
      var n = list.length;
      var active = 0;
      var imgs = list.map(function (s) {
        var img = el("img", "streams__img");
        img.src = s.thumb;
        img.alt = "";
        img.draggable = false;
        img.decoding = "async";
        frames.appendChild(img);
        return img;
      });

      var slots = [];
      for (var k = 0; k < n - 1; k++) {
        (function (slot) {
          var li = el("li");
          slot.btn = el("button", "streams__thumb");
          slot.btn.type = "button";
          slot.img = el("img");
          slot.img.alt = "";
          slot.img.draggable = false;
          slot.date = el("span", "streams__thumbdate");
          slot.btn.appendChild(slot.img);
          slot.btn.appendChild(slot.date);
          slot.btn.addEventListener("click", function () { go(slot.idx); });
          li.appendChild(slot.btn);
          rail.appendChild(li);
          slots.push(slot);
        })({ idx: 0 });
      }

      function render() {
        var s = list[active];
        imgs.forEach(function (img, i) { img.classList.toggle("is-active", i === active); });
        var date = streamDate(s.published, false);
        chip.textContent = date;
        chip.hidden = !date;
        play.href = s.url;
        play.setAttribute("aria-label", "Смотреть стрим" + (date ? " от " + date : "") + " на YouTube");

        // Ряд: после главного, по кругу. Кнопки ряда создаются один раз и только обновляются,
        // чтобы при листании клавишами фокус не терялся.
        for (var k = 1; k < n; k++) {
          var idx = (active + k) % n;
          var slot = slots[k - 1];
          var t = list[idx];
          var d = streamDate(t.published, false);
          slot.idx = idx;
          slot.img.src = t.thumb;
          slot.btn.setAttribute("aria-label", "Показать стрим" + (d ? " от " + d : ""));
          slot.date.textContent = streamDate(t.published, true);
        }
      }

      function go(i) {
        active = ((i % n) + n) % n;
        render();
      }

      prev.addEventListener("click", function () { go(active - 1); });
      next.addEventListener("click", function () { go(active + 1); });
      view.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { go(active - 1); e.preventDefault(); }
        else if (e.key === "ArrowRight") { go(active + 1); e.preventDefault(); }
      });

      // Свайп по главному кадру (пальцем или мышью). Вертикальную прокрутку страницы
      // не трогаем: в CSS у кадра touch-action: pan-y.
      var sx = 0, sy = 0, tracking = false, moved = false;
      main.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        tracking = true; moved = false; sx = e.clientX; sy = e.clientY;
      });
      main.addEventListener("pointermove", function (e) {
        if (tracking && Math.abs(e.clientX - sx) > SWIPE_TAP_SLOP_PX) moved = true;
      });
      main.addEventListener("pointerup", function (e) {
        if (!tracking) return;
        tracking = false;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.2) go(active + (dx < 0 ? 1 : -1));
      });
      main.addEventListener("pointercancel", function () { tracking = false; });
      play.addEventListener("click", function (e) { if (moved) e.preventDefault(); });   // это был свайп, а не нажатие

      render();
      group.hidden = false;
      group.classList.add("is-ready");
      equalizeGroupGaps();
    }

    fetch(block.dataUrl || STREAMS_DATA_URL, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = ((data && data.streams) || []).map(cleanStream).filter(Boolean)
                     .slice(0, Math.max(1, Math.min(block.count || STREAMS_MAX, STREAMS_MAX)));
        if (!list.length) { group.remove(); return; }
        start(list);
      })
      .catch(function () { group.remove(); });

    return group;
  }

  /* ---------- «в эфире» ---------- */
  function setLive(isLive) {
    var groups = document.querySelectorAll("[data-live-group]");
    for (var i = 0; i < groups.length; i++) groups[i].classList.toggle("is-live", !!isLive);
  }

  function initLive() {
    if (query.get("live") === "1") { setLive(true); return; }   // ?live=1 — посмотреть подсветку
    if (cfg.live && cfg.live.enabled) {
      // Место для будущей автоматики: здесь будет проверка статуса стрима.
      setLive(false);
    }
  }

  /* ---------- сборка ---------- */
  function build() {
    buildHero();

    var content = document.getElementById("content");
    buildBio(content);

    (cfg.blocks || []).forEach(function (block) {
      if (block.enabled === false) return;              // блок выключен в config.js
      if (block.type === "links") {
        content.appendChild(reveal(buildLinks(block)));
      } else if (block.type === "streams") {
        content.appendChild(buildStreams(block));
      }
    });

    var footer = document.getElementById("footer");
    if (cfg.footer) footer.textContent = cfg.footer;

    initLive();

    // Размеры строк в кнопках подгоняем после вставки в страницу и при изменении окна
    fitAll();
    window.addEventListener("resize", fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

    // Обновляем расписание раз в минуту и когда вкладка снова становится активной
    setInterval(updateSchedule, SCHEDULE_REFRESH_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) updateSchedule();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
