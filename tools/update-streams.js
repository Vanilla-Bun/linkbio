#!/usr/bin/env node
/* Обновляет data/streams.json и обложки в data/streams/ по RSS YouTube-канала.
   Запускается GitHub Action'ом (см. .github/workflows/update-streams.yml), а при желании и вручную:
     node tools/update-streams.js
   Нужен Node 18+. Обложки уменьшаются до 640×360 библиотекой sharp. Если её нет, скрипт сам
   пробует поставить её командой npm (нужен интернет). Настройки берутся из config.js
   (блок type: "streams": channelId, count, dataUrl). */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");
var lib = require("./streams-lib.js");

var ROOT = path.resolve(__dirname, "..");
var THUMB_DIR = "data/streams";
var THUMB_W = 640, THUMB_H = 360;

// Подключает sharp; если не установлен, ставит его в папку проекта (без правки package.json).
function loadSharp() {
  try { return require("sharp"); } catch (e) { /* ставим ниже */ }
  console.log("Ставлю sharp для уменьшения обложек (один раз, около минуты)...");
  try {
    // shell нужен на Windows (npm там - npm.cmd); команда фиксированная, чужих данных в ней нет
    require("child_process").execSync("npm install --no-save --no-audit --no-fund sharp", { cwd: ROOT, stdio: "inherit", shell: true });
    return require("sharp");
  } catch (e) {
    return null;
  }
}

function loadConfig() {
  var sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8"), sandbox);
  var cfg = sandbox.window.SITE_CONFIG;
  var block = ((cfg && cfg.blocks) || []).filter(function (b) { return b.type === "streams"; })[0];
  if (!block) throw new Error('В config.js нет блока type: "streams"');
  if (!/^UC[\w-]{22}$/.test(block.channelId || "")) throw new Error("В блоке streams не задан верный channelId");
  return block;
}

async function getFeed(url) {
  var res = await fetch(url);
  if (!res.ok) throw new Error("RSS недоступен (" + res.status + "): " + url);
  return lib.parseFeed(await res.text());
}

// Short определяем так: адрес /shorts/ID у настоящего Short открывается (200),
// а у обычного видео и стрима перенаправляет на страницу просмотра (3xx).
async function isShort(id) {
  var res = await fetch("https://www.youtube.com/shorts/" + id, { redirect: "manual" });
  return res.status === 200;
}

// Только стримы: сначала служебный плейлист трансляций канала (в нём Shorts не бывает);
// если он пуст или недоступен, берём общий RSS и отбрасываем Shorts.
async function pickStreams(channelId, count) {
  try {
    var live = await getFeed(lib.liveFeedUrl(channelId));
    if (live.length) {
      console.log("Источник: плейлист трансляций канала");
      return lib.pickLatest(live, count);
    }
    console.warn("Плейлист трансляций пуст, беру общий RSS без Shorts");
  } catch (e) {
    console.warn("Плейлист трансляций недоступен (" + e.message + "), беру общий RSS без Shorts");
  }
  var all = await getFeed(lib.channelFeedUrl(channelId));
  return lib.pickNonShorts(all, count, isShort);
}

async function download(urls) {
  for (var i = 0; i < urls.length; i++) {
    var res = await fetch(urls[i]);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Не удалось скачать обложку: " + urls[0]);
}

async function main() {
  var block = loadConfig();
  var count = Math.max(1, Math.min(block.count || 4, 4));
  var dataFile = path.join(ROOT, block.dataUrl || "data/streams.json");

  var picked = await pickStreams(block.channelId, count);
  if (!picked.length) throw new Error("Подходящих стримов не нашлось, ничего не меняю");

  var sharp = loadSharp();
  if (!sharp) {
    throw new Error("Не удалось поставить sharp, без него обложки остались бы 1280×720 (тяжёлые). " +
                    "Выполните вручную в папке проекта: npm install --no-save sharp, и запустите скрипт ещё раз.");
  }

  fs.mkdirSync(path.join(ROOT, THUMB_DIR), { recursive: true });
  var thumbs = {};
  for (var i = 0; i < picked.length; i++) {
    var id = picked[i].id;
    var ext = ".webp";
    var rel = THUMB_DIR + "/" + id + ext;
    var file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      var raw = await download([
        "https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg",
        "https://i.ytimg.com/vi/" + id + "/hq720.jpg",
        "https://i.ytimg.com/vi/" + id + "/sddefault.jpg"
      ]);
      var out = await sharp(raw).resize(THUMB_W, THUMB_H, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
      fs.writeFileSync(file, out);
      console.log("Скачана обложка " + rel);
    }
    thumbs[id] = rel;
  }

  // удаляем обложки стримов, которых больше нет в списке
  fs.readdirSync(path.join(ROOT, THUMB_DIR)).forEach(function (name) {
    var keep = Object.keys(thumbs).some(function (id) { return thumbs[id] === THUMB_DIR + "/" + name; });
    if (!keep && /\.(webp|jpg)$/.test(name)) fs.unlinkSync(path.join(ROOT, THUMB_DIR, name));
  });

  var json = JSON.stringify(lib.buildJson(picked, thumbs), null, 2) + "\n";
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, json);
  console.log("Готово: " + picked.length + " стрим(ов)");
}

main().catch(function (e) { console.error("Ошибка: " + e.message); process.exit(1); });
