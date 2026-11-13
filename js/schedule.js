/* =====================================================================
   Расписание стримов — чистая логика без DOM (поэтому её легко проверять в node).

   nextStream(now, cfg) -> { start: Date, end: Date, ongoing: bool } | null
   Все «настенные» времена в конфиге — по часовому поясу cfg.utcOffsetMinutes
   (для Москвы это 180, без перехода на летнее время).
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
    var offset = typeof cfg.utcOffsetMinutes === "number" ? cfg.utcOffsetMinutes : 180;
    var duration = (cfg.durationMinutes || 180) * MIN;
    var nowMs = now.getTime();
    var skip = {};
    (cfg.skip || []).forEach(function (s) { skip[String(s).trim()] = true; });

    var starts = [];

    // 1) повторяющиеся правила: смотрим сегодня и ближайшие 14 дней (+1 назад — на случай стрима, идущего через полночь)
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
        starts.push(wallToUtc(w.y, w.mo, w.d, mins, offset));
      });
    }

    // 2) разовые стримы: "2026-12-31 20:00"
    (cfg.extra || []).forEach(function (s) {
      var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}:\d{2})$/.exec(String(s).trim());
      if (!m) return;
      var mins = parseTime(m[4]);
      if (mins === null) return;
      starts.push(wallToUtc(+m[1], +m[2] - 1, +m[3], mins, offset));
    });

    var best = null;
    starts.forEach(function (st) {
      if (st + duration <= nowMs) return;          // уже закончился
      if (best === null || st < best) best = st;
    });
    if (best === null) return null;

    return {
      start: new Date(best),
      end: new Date(best + duration),
      ongoing: best <= nowMs
    };
  }

  /* ---------- Подписи по-русски ---------- */
  var WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  var WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля",
                "августа", "сентября", "октября", "ноября", "декабря"];

  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  // "четверг, 19 ноября, 19:00" — в поясе конфига
  function formatWall(date, cfg) {
    var offset = typeof cfg.utcOffsetMinutes === "number" ? cfg.utcOffsetMinutes : 180;
    var w = utcToWall(date.getTime(), offset);
    return {
      weekday: WEEKDAYS[w.dow],
      date: w.d + " " + MONTHS[w.mo],
      time: pad(w.h) + ":" + pad(w.mi),
      key: dateKey(w)
    };
  }

  // Время в часовом поясе зрителя (то, что показывает его устройство)
  function formatLocal(date) {
    return {
      weekdayShort: WEEKDAYS_SHORT[date.getDay()],
      date: date.getDate() + " " + MONTHS[date.getMonth()],
      time: pad(date.getHours()) + ":" + pad(date.getMinutes()),
      key: date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
    };
  }

  // Сколько календарных дней от «сегодня» до дня стрима (в поясе конфига)
  function daysUntil(now, start, cfg) {
    var offset = typeof cfg.utcOffsetMinutes === "number" ? cfg.utcOffsetMinutes : 180;
    var a = utcToWall(now.getTime(), offset), b = utcToWall(start.getTime(), offset);
    return Math.round((Date.UTC(b.y, b.mo, b.d) - Date.UTC(a.y, a.mo, a.d)) / DAY);
  }

  // Готовый текст для страницы
  function describe(now, cfg) {
    var next = nextStream(now, cfg);
    if (!next) return null;

    var tz = cfg.tzLabel || "МСК";
    var w = formatWall(next.start, cfg);
    var days = daysUntil(now, next.start, cfg);

    var dayWord;
    if (days === 0) dayWord = "сегодня";
    else if (days === 1) dayWord = "завтра";
    else dayWord = w.weekday;

    var main = (days <= 1 ? dayWord + ", " : dayWord + ", ") + w.date + ", " + w.time + " (" + tz + ")";
    // "сегодня, 13 ноября, 19:00 (МСК)" / "четверг, 19 ноября, 19:00 (МСК)"

    var sub = "";
    if (next.ongoing) {
      sub = "Стрим по расписанию уже идёт — заглядывай!";
    } else if (days >= 2) {
      sub = "через " + days + " " + plural(days, "день", "дня", "дней");
    }

    // По времени зрителя — только если оно отличается от времени конфига
    var loc = formatLocal(next.start);
    var localOffset = -next.start.getTimezoneOffset();
    var cfgOffset = typeof cfg.utcOffsetMinutes === "number" ? cfg.utcOffsetMinutes : 180;
    if (localOffset !== cfgOffset) {
      var localText = "у тебя: " + (loc.key !== w.key ? loc.weekdayShort + ", " + loc.date + ", " : "") + loc.time;
      sub = sub ? sub + " · " + localText : localText;
    }

    return { main: main, sub: sub, ongoing: next.ongoing, start: next.start };
  }

  return { nextStream: nextStream, describe: describe, parseTime: parseTime, plural: plural };
});
