/* Чистые функции для обновления превью стримов (без сети и без файлов), чтобы их можно было проверить тестами. */
"use strict";

// Достаёт записи из RSS YouTube-канала: [{ id, published, title }] в порядке файла.
function parseFeed(xml) {
  var out = [];
  var re = /<entry>([\s\S]*?)<\/entry>/g;
  var m;
  while ((m = re.exec(xml))) {
    var body = m[1];
    var id = (body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    var published = (body.match(/<published>([^<]+)<\/published>/) || [])[1];
    var title = (body.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    if (id && published) out.push({ id: id.trim(), published: published.trim(), title: title });
  }
  return out;
}

// Берёт count самых новых (по дате публикации), без повторов.
function pickLatest(entries, count) {
  var seen = {};
  return entries
    .filter(function (e) { return !isNaN(new Date(e.published)) && !seen[e.id] && (seen[e.id] = true); })
    .sort(function (a, b) { return new Date(b.published) - new Date(a.published); })
    .slice(0, count);
}

// Что записываем в data/streams.json. thumbs: { id: "data/streams/id.webp" }.
function buildJson(picked, thumbs) {
  return {
    streams: picked
      .filter(function (e) { return thumbs[e.id]; })
      .map(function (e) {
        return {
          id: e.id,
          published: new Date(e.published).toISOString(),
          url: "https://www.youtube.com/watch?v=" + e.id,
          thumb: thumbs[e.id]
        };
      })
  };
}

// Адреса RSS. У каждого канала YouTube есть служебные плейлисты: UU... — все загрузки,
// UULV... — только прямые трансляции (то есть без Shorts и обычных роликов).
function channelFeedUrl(channelId) {
  return "https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId;
}
function liveFeedUrl(channelId) {
  return "https://www.youtube.com/feeds/videos.xml?playlist_id=UULV" + channelId.slice(2);
}

// Берёт count самых новых записей, для которых isShort(id) вернул false (isShort может быть async).
async function pickNonShorts(entries, count, isShort) {
  var sorted = pickLatest(entries, entries.length);
  var out = [];
  for (var i = 0; i < sorted.length && out.length < count; i++) {
    if (!(await isShort(sorted[i].id))) out.push(sorted[i]);
  }
  return out;
}

module.exports = {
  parseFeed: parseFeed, pickLatest: pickLatest, buildJson: buildJson,
  channelFeedUrl: channelFeedUrl, liveFeedUrl: liveFeedUrl, pickNonShorts: pickNonShorts
};
