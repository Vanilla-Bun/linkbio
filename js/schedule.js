/* =====================================================================
   Расписание стримов — чистая логика без DOM (поэтому её легко проверять в node).

   nextStream(now, cfg) -> { start: Date, end: Date, ongoing: bool, type: string } | null
   describe(now, cfg)   -> { main, label, type, ongoing, start } | null

   Все «настенные» времена в конфиге — по часовому поясу cfg.utcOffsetMinutes
   (для Москвы это 180, без перехода на летнее время).

   У каждого стрима есть тип (music, talk, irl, ...). Названия типов лежат
   в cfg.types и подставляются в подпись над датой.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LBSchedule = factory();
})(typeof self !== "undefined" ? self : this, function () {

  var MIN = 60000, DAY = 86400000;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // "19:00" -> минуты от полуночи
  function parseTime(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }

  function offsetOf(cfg) {
    return typeof cfg.utcOffsetMinutes === "number" ? cfg.utcOffsetMinutes : 180;
  }

  // Настенная дата/время в поясе конфига -> настоящий момент (ms, UTC)
  function wallToUtc(y, mo, d, minutes, offset) {
    return Date.UTC(y, mo, d, 0, minutes) - offset * MIN;
  }

  // Момент (ms) -> настенные компоненты в поясе конфига
  function utcToWall(ms, offset) {
    var d = new Date(ms + offset * MIN);
    return {
      y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(),
      dow: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes()
    };
  }

  function dateKey(w) { return w.y + "-" + pad(w.mo + 1) + "-" + pad(w.d); }

  function nextStream(now, cfg) {
    var offset = offsetOf(cfg);
    var duration = (cfg.durationMinutes || 180) * MIN;
    var defaultType = cfg.defaultType || "music";
    var nowMs = now.getTime();
    var skip = {};
    (cfg.skip || []).forEach(function (s) { skip[String(s).trim()] = true; });

    // { ms, type }. Разовые стримы добавляем ПЕРВЫМИ: если разовый стрим совпал
    // по времени с обычным, побеждает разовый (он стоит раньше в списке).
    var starts = [];

    // 1) разовые стримы: строка "2026-12-31 20:00" (тип по умолчанию)
    //    или объект { at: "2026-12-31 20:00", type: "movies" }
    (cfg.extra || []).forEach(function (entry) {
      var e = typeof entry === "string" ? { at: entry } : entry;
      if (!e || !e.at) return;
      var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}:\d{2})$/.exec(String(e.at).trim());
      if (!m) return;
      var mins = parseTime(m[4]);
      if (mins === null) return;
      starts.push({ ms: wallToUtc(+m[1], +m[2] - 1, +m[3], mins, offset), type: e.type || defaultType });
    });

    // 2) повторяющиеся правила: смотрим вчера, сегодня и ближайшие 14 дней
    //    (вчера — на случай стрима, идущего через полночь)
    var today = utcToWall(nowMs, offset);
    var baseMidnight = wallToUtc(today.y, today.mo, today.d, 0, offset);
    for (var i = -1; i <= 14; i++) {
      var dayStart = baseMidnight + i * DAY;
      var w = utcToWall(dayStart, offset);
      (cfg.rules || []).forEach(function (r) {
        if (r.day !== w.dow) return;
        var mins = parseTime(r.time);
        if (mins === null) return;
        if (skip[dateKey(w)]) return;
        starts.push({ ms: wallToUtc(w.y, w.mo, w.d, mins, offset), type: r.type || defaultType });
      });
    }

    var best = null;
    starts.forEach(function (st) {
      if (st.ms + duration <= nowMs) return;          // уже закончился
      if (best === null || st.ms < best.ms) best = st;
    });
    if (best === null) return null;

    return {
      start: new Date(best.ms),
      end: new Date(best.ms + duration),
      ongoing: best.ms <= nowMs,
      type: best.type
    };
  }

  /* ---------- Подписи по-русски ---------- */
  var WEEKDAYS_LONG  = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  var WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля",
                "августа", "сентября", "октября", "ноября", "декабря"];

  /* main  — вторая строка кнопки:
       у зрителя другой часовой пояс: "вс, 15 ноября, 21:00 (19:00 МСК)"
       у зрителя то же время, что в конфиге: "вс, 15 ноября, 19:00 МСК"
     День недели и число — по времени зрителя (он может оказаться уже в соседних сутках).
     label — подпись над датой, зависит от типа стрима:
       "Следующий музыкальный стрим", "Следующий киноаукцион", ... (cfg.types[тип]) */
  function describe(now, cfg) {
    var next = nextStream(now, cfg);
    if (!next) return null;

    var tz = cfg.tzLabel || "МСК";
    var names = cfg.weekdayStyle === "short" ? WEEKDAYS_SHORT : WEEKDAYS_LONG;
    var offset = offsetOf(cfg);

    var wall = utcToWall(next.start.getTime(), offset);
    var wallTime = pad(wall.h) + ":" + pad(wall.mi);

    var local = next.start;
    var localOffset = -local.getTimezoneOffset();

    var main;
    if (localOffset === offset) {
      main = names[wall.dow] + ", " + wall.d + " " + MONTHS[wall.mo] + ", " + wallTime + " " + tz;
    } else {
      main = names[local.getDay()] + ", " + local.getDate() + " " + MONTHS[local.getMonth()] + ", " +
             pad(local.getHours()) + ":" + pad(local.getMinutes()) +
             " (" + wallTime + " " + tz + ")";
    }

    var label = (cfg.types && cfg.types[next.type]) || cfg.fallbackLabel || "Следующий стрим";   // последний рубеж; обычно подпись задана в config.js

    return { main: main, label: label, type: next.type, ongoing: next.ongoing, start: next.start };
  }

  return { nextStream: nextStream, describe: describe, parseTime: parseTime };
});
