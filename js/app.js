/* =====================================================================
   Сборка страницы из config.js.
   Все тексты из конфига вставляются через textContent (не innerHTML),
   поэтому случайный символ < или & в конфиге ничего не сломает.
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG;
  var ICONS = window.LB_ICONS || {};
  if (!cfg) { return; }

  var root = document.documentElement;

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

  var revealIndex = 0;
  function reveal(node) {
    node.classList.add("reveal");
    node.style.setProperty("--i", revealIndex++);
    return node;
  }

  /* ---------- тема ---------- */
  var palette = (cfg.theme && cfg.theme.palette) || "bordeaux";
  root.setAttribute("data-palette", palette);

  function currentTheme() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }

  function applyTheme(mode) {
    root.setAttribute("data-theme", mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "dark" ? "#1d0f13" : "#f6eeea");
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

  /* ---------- био + расписание ---------- */
  function buildBio(parent) {
    var p = cfg.profile || {};
    if (p.bio) parent.appendChild(reveal(el("p", "bio", p.bio)));
  }

  var scheduleEls = null;

  function buildSchedule(parent) {
    if (!cfg.schedule || !window.LBSchedule) return;

    var box = el("section", "schedule");
    box.setAttribute("aria-live", "polite");
    box.appendChild(el("div", "schedule__icon")).appendChild(icon("calendar"));

    var body = el("div", "schedule__body");
    var label = el("p", "schedule__label", cfg.schedule.title || "Следующий стрим");
    var when = el("p", "schedule__when");
    var sub = el("p", "schedule__sub");
    body.appendChild(label); body.appendChild(when); body.appendChild(sub);
    box.appendChild(body);

    scheduleEls = { box: box, when: when, sub: sub };
    updateSchedule();
    parent.appendChild(reveal(box));
  }

  function updateSchedule() {
    if (!scheduleEls) return;
    var d = window.LBSchedule.describe(new Date(), cfg.schedule);
    if (!d) {
      scheduleEls.when.textContent = "Скоро объявим новую дату";
      scheduleEls.sub.textContent = "Следи за анонсами в Telegram";
      return;
    }
    scheduleEls.when.textContent = d.main;
    scheduleEls.sub.textContent = d.sub;
  }

  /* ---------- безопасные ссылки ---------- */
  function safeUrl(url) {
    try {
      var u = new URL(url, location.href);
      return (u.protocol === "https:" || u.protocol === "http:") ? u.href : "#";
    } catch (e) { return "#"; }
  }

  /* ---------- группа ссылок ---------- */
  function buildLinks(block) {
    var group = el("section", "group");
    if (block.id) group.id = block.id;
    if (block.liveHighlight) group.setAttribute("data-live-group", "");

    var head = el("div", "group__head");
    if (block.title) head.appendChild(el("h2", "group__title", block.title));
    var badge = el("span", "badge-live", "В ЭФИРЕ");
    head.appendChild(badge);
    group.appendChild(head);

    if (block.note) group.appendChild(el("p", "group__note", block.note));

    var list = el("ul", "group__list");
    var variant = block.variant === "filled" ? "btn--filled" : "btn--soft";

    (block.links || []).forEach(function (l) {
      var li = el("li");
      var a = el("a", "btn " + variant);
      a.href = safeUrl(l.url);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.appendChild(icon(l.icon || "link"));
      a.appendChild(el("span", "btn__label", l.title || l.url));
      li.appendChild(a);
      list.appendChild(li);
    });
    group.appendChild(list);

    if (block.card) group.appendChild(buildCard(block.card));
    return group;
  }

  /* ---------- карта: копирование в один клик ---------- */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // запасной вариант для старых браузеров / http
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

  function buildCard(card) {
    var wrap = el("div", "copycard-wrap");
    var btn = el("button", "copycard");
    btn.type = "button";
    btn.setAttribute("aria-label", "Скопировать номер карты " + (card.bank || ""));

    var main = el("span", "copycard__main");
    if (card.bank) main.appendChild(el("span", "copycard__bank", card.bank));
    main.appendChild(el("span", "copycard__number", card.number));
    if (card.holder) main.appendChild(el("span", "copycard__holder", card.holder));
    btn.appendChild(main);

    var action = el("span", "copycard__action");
    action.appendChild(icon("copy", "icon--copy"));
    action.appendChild(icon("check", "icon--check"));
    btn.appendChild(action);

    var resetTimer = null;
    btn.addEventListener("click", function () {
      var value = card.copyValue || String(card.number).replace(/\s+/g, "");
      copyText(value).then(function () {
        btn.classList.add("is-copied");
        showToast("Номер карты скопирован");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () { btn.classList.remove("is-copied"); }, 2200);
      }, function () {
        showToast("Не получилось скопировать — выдели номер вручную");
      });
    });

    wrap.appendChild(btn);
    wrap.appendChild(el("p", "copycard__hint", "Нажми, чтобы скопировать номер"));
    return wrap;
  }

  /* ---------- последний ролик YouTube ----------
     У канала с ID UCxxxx есть служебный плейлист всех загрузок с ID UUxxxx.
     Встраиваем его: первым всегда играет самое новое видео, ключи не нужны. */
  function buildYoutube(block) {
    var group = el("section", "group video");
    if (block.id) group.id = block.id;
    if (block.title) group.appendChild(el("h2", "group__title", block.title));

    var cid = String(block.channelId || "");
    if (!/^UC[\w-]{22}$/.test(cid)) {
      // неверный ID — просто показываем ссылку на канал
      if (block.channelUrl) {
        var a = el("a", "btn btn--soft", "");
        a.href = safeUrl(block.channelUrl); a.target = "_blank"; a.rel = "noopener noreferrer";
        a.appendChild(icon("youtube"));
        a.appendChild(el("span", "btn__label", "Открыть канал на YouTube"));
        group.appendChild(a);
      }
      return group;
    }

    var uploads = "UU" + cid.slice(2);
    var frame = el("div", "video__frame");
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/videoseries?list=" + encodeURIComponent(uploads);
    iframe.title = "Последний ролик Vanilla Bun";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.setAttribute("allowfullscreen", "");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    frame.appendChild(iframe);
    group.appendChild(frame);

    if (block.channelUrl) {
      var more = el("a", "video__more", "Все видео на канале →");
      more.href = safeUrl(block.channelUrl);
      more.target = "_blank";
      more.rel = "noopener noreferrer";
      group.appendChild(more);
    }
    return group;
  }

  /* ---------- «в эфире» ---------- */
  function setLive(isLive) {
    var groups = document.querySelectorAll("[data-live-group]");
    for (var i = 0; i < groups.length; i++) groups[i].classList.toggle("is-live", !!isLive);
  }

  function initLive() {
    var params = new URLSearchParams(location.search);
    var forced = params.get("live");           // ?live=1 — посмотреть, как выглядит подсветка
    if (forced === "1") { setLive(true); return; }
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
    buildSchedule(content);

    (cfg.blocks || []).forEach(function (block) {
      var node = null;
      if (block.type === "links") node = buildLinks(block);
      else if (block.type === "youtube") node = buildYoutube(block);
      if (node) content.appendChild(reveal(node));
    });

    var footer = document.getElementById("footer");
    if (cfg.footer) footer.textContent = cfg.footer;

    initLive();

    // Обновляем расписание раз в минуту и когда вкладка снова становится активной
    setInterval(updateSchedule, 60000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) updateSchedule();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
