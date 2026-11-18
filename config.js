/* =====================================================================
   Vanilla Bun - link-in-bio
   ВСЁ, что нужно править на странице, лежит в этом файле.
   Меняешь текст / ссылку / время - сохраняешь - пушишь в GitHub. Готово.
   ===================================================================== */

window.SITE_CONFIG = {

  /* ---------- Шапка ---------- */
  profile: {
    name: "Vanilla Bun",
    tagline: "Музыкальный стример",
    bio: "Привет ✨ Меня зовут Настя. Пою кавера, пишу свои песни и рисую на холстах 🎨 " +
         "Вне стримов - мама и просто хороший человек. " +
         "Заглядывай на Ванильные стримы - у нас уютно и комфортно 🕊️",
    // bio: "Привет ✨ Меня зовут Настя. Пою кавера, пишу свои песни и рисую на холстах 🎨 Вне стримов - мама и просто хороший человек. Заглядывай на Ванильные стримы - у нас уютно и комфортно 🕊️",
    heroImage: "assets/hero.jpg",
    // Какую часть фото показывать в шапке: "X% Y%". Меньше Y - выше, больше Y - ниже.
    heroPosition: "0% 52%",
    heroAlt: "Vanilla Bun"
  },

  /* ---------- Оформление ---------- */
  theme: {
    palette: "bordeaux",   // сейчас есть только "bordeaux"; новые палитры - в css/themes.css
    mode: "auto"           // "auto" (как на устройстве) | "light" | "dark"
  },

  /* ---------- Расписание ----------
     Время указывается по московскому времени (utcOffsetMinutes: 180).

     types - какие бывают стримы. Ключ - короткое имя типа (его пишем в rules и extra),
             значение - подпись над датой на кнопке. Подпись пишем целиком, чтобы
             склонение было верным («Следующий киноаукцион», а не «...киноаукцион стрим»).
     defaultType - тип, если у стрима тип не указан.

     rules - обычные стримы по дням недели.
             day: 0 = воскресенье, 1 = понедельник, ... 4 = четверг ... 6 = суббота.
             type: необязательно, по умолчанию defaultType.
     extra - разовые стримы (в любой день). Две записи на выбор:
               "2026-12-31 20:00"                              - тип по умолчанию
               { at: "2026-11-18 20:00", type: "movies" }      - с типом
             Если разовый стрим совпал по времени с обычным, показывается разовый.
     skip  - даты (мск), когда обычного стрима НЕ будет: "2026-11-19".

     weekdayStyle: "short" (вс, чт) или "long" (воскресенье, четверг).
                   Полные названия на узких телефонах в одну строку не помещаются.

     Где показывается расписание, задаётся у группы ссылок: showSchedule: true. */
  schedule: {
    utcOffsetMinutes: 180,
    tzLabel: "мск",
    durationMinutes: 180,
    weekdayStyle: "long",
    // Здесь по умолчанию "above" (подпись над датой), а у обычных ссылок и карты - "below" (под текстом).
    captionPosition: "above",           // подпись над датой ("above") или под ней ("below")
    fallbackLabel: "Следующий стрим",   // если у стрима неизвестный тип

    types: {
      music:   "Следующий музыкальный стрим",
      talk:    "Следующий разговорный стрим",
      irl:     "Следующий IRL-стрим",
      movies:  "Следующий стрим киноаукцион",
      guest:   "Следующий гостевой стрим",
      game:    "Следующий игровой стрим",
      cooking: "Следующий кукинг-стрим"
    },
    defaultType: "music",

    rules: [
      { day: 4, time: "19:00", type: "music" },   // четверг
      { day: 0, time: "19:00", type: "music" }    // воскресенье
    ],
    extra: [
      // { at: "2026-11-17 19:00", type: "movies" }
    ],
    skip: []
  },

  /* ---------- Индикатор «в эфире» ----------
     Пока выключен. Позже сюда подключим автоматическое определение (Twitch).
     Для проверки внешнего вида открой страницу с ?live=1 в конце адреса.    */
  live: {
    enabled: false,
    label: "В ЭФИРЕ"      // надпись на бейдже
  },

  /* ---------- Блоки страницы (сверху вниз) ----------
     type: "links"   - группа кнопок
     type: "youtube" - последний ролик с канала (показывается, только если YouTube доступен)
     enabled: false  - у любого блока: временно убрать его со страницы, не удаляя из файла
     liveHighlight: true - группа получает рамку и бейдж, когда включён режим «в эфире»
     showSchedule:  true - внизу группы появляется кнопка с датой ближайшего стрима
     card: { ... }       - внизу группы появляется кнопка «скопировать номер карты»

     note - подпись под заголовком. Одной строкой, либо массивом строк (каждая строка массива
            выводится с новой строки), либо одной строкой с "\n" внутри кавычек.
            Подробности про переносы - README, «Перенос строки».
     Дополнительный текст у кнопки: caption и captionPosition (подробности - README, «Кнопки»).

     icon: youtube | twitch | vkvideo | telegram | vk | instagram | tiktok | boosty |
           musiclist | donationalerts | donatepay | dalink | trula | tbank | link
           (рисунки лежат в js/icons.js)                                              */
  blocks: [
    {
      type: "links",
      id: "watch",
      title: "Смотреть стримы",
      note: "Музыкальные стримы в четверг и воскресенье в 19:00 (мск)",
      liveHighlight: true,
      showSchedule: true,
      links: [
        { title: "YouTube",  url: "https://youtube.com/@_vanilla_bun_",  icon: "youtube" },
        { title: "Twitch",   url: "https://www.twitch.tv/vanilla__bun",  icon: "twitch" },
        { title: "VK Видео", url: "https://live.vkvideo.ru/vanillabun",  icon: "vkvideo" }
      ]
    },

    /* Последний ролик. Перед показом страница пробует загрузить картинку с YouTube
       (probeUrl). Загрузилась за probeTimeoutMs - блок показывается.
       Не загрузилась (YouTube недоступен) - блок скрывается целиком.
       Проверить оба случая: ?yt=on (показать) и ?yt=off (скрыть) в адресе.
       Сейчас блок выключен (enabled: false); поставь true, чтобы вернуть. */
    {
      type: "youtube",
      enabled: false,
      id: "latest-video",
      title: "Последний ролик",
      channelId: "UCmyC498PNl_U_OsuwzJAmGw",
      channelUrl: "https://youtube.com/@_vanilla_bun_",
      probeUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/default.jpg",   // обложка самого первого видео на YouTube
      probeTimeoutMs: 4000
    },

    {
      type: "links",
      id: "community",
      title: "Общение",
      note: "Здесь мы общаемся, выходят анонсы, фото и видео",
      links: [
        { title: "VK сообщество",         url: "https://vk.ru/vanilla__bun",                icon: "vk" },
        { title: "Telegram - канал",      url: "https://t.me/Vanilla_Bun_Channel",          icon: "telegram" },
        { title: "Telegram - чат",        url: "https://t.me/+FaVk_Y1WB2FhNWMy",            icon: "telegram" },
        { title: "Telegram - предложка",  url: "https://t.me/Vanilla_Bun_Channel?direct",   icon: "telegram",
          caption: "(для вопросов и предложений)" }
      ]
    },

    {
      type: "links",
      id: "more",
      title: "Дополнительные площадки",
      links: [
        { title: "Boosty",    url: "https://boosty.to/vanillabun",            icon: "boosty" },
        { title: "Instagram", url: "https://www.instagram.com/_vanillabun_",  icon: "instagram" },
        { title: "TikTok",    url: "https://www.tiktok.com/@vanilla_bun_",    icon: "tiktok" }
      ]
    },

    {
      type: "links",
      id: "songs",
      title: "Списочки песен",
      links: [
        { title: "Список песен 1", url: "https://www.streamersonglist.com/t/vanilla__bun/songs",  icon: "musiclist" },
        { title: "Список песен 2", url: "https://vanilla-bun.github.io/songlist",                  icon: "musiclist" }
      ]
    },

    {
      type: "links",
      id: "support",
      title: "Поддержать",
      // note: строка, либо массив строк (каждая с новой строки), либо "\n" внутри строки
      note: [
        "Поддержать Ванильку, её творчество и все задуманные идеи"
      ],
      links: [
        { title: "DonationAlerts", url: "https://www.donationalerts.com/r/vanilla_bun_", icon: "donationalerts" },
        { title: "DonatePay",      url: "https://new.donatepay.ru/@vanillabun",          icon: "donatepay" },
        { title: "DALink",         url: "https://dalink.to/vanilla_bun_",                icon: "dalink" },
        { title: "Trula",          url: "https://trula.io/dp/twitch/vanilla__bun",       icon: "trula" }
      ],
      // Кнопка-карта: слева значок банка, справа «скопировать».
      // Номер пишется один раз, в любом виде (с пробелами или без): на кнопке он
      // показывается группами по 4 цифры, а копируется без пробелов.
      // Дополнительный текст собирается из bank и holder: «Т-Банк (Анастасия Г.)».
      card: {
        icon: "tbank",
        bank: "Т-Банк",
        number: "2200 7020 4907 7444",
        holder: "Анастасия Г.",
        captionPosition: "below"
      }
    }
  ],

  footer: "Сделано с ♥ для ванильных стримов"
};
