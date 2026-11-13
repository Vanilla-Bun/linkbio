/* =====================================================================
   Vanilla Bun — link-in-bio
   ВСЁ, что нужно править на странице, лежит в этом файле.
   Меняешь текст / ссылку / время — сохраняешь — пушишь в GitHub. Готово.
   ===================================================================== */

window.SITE_CONFIG = {

  /* ---------- Шапка ---------- */
  profile: {
    name: "Vanilla Bun",
    tagline: "Музыкальный стример",
    bio: "Привет ✨ Меня зовут Настя. Пою кавера, пишу свои песни и рисую на холстах 🎨 " +
         "Вне стримов — мама и просто хороший человек. " +
         "Заглядывай на Ванильные стримы — у нас уютно и комфортно 🕊️",
    heroImage: "assets/hero.jpg",
    // Какую часть фото показывать в шапке: "X% Y%". Меньше Y — выше, больше Y — ниже.
    heroPosition: "50% 22%",
    heroAlt: "Vanilla Bun"
  },

  /* ---------- Оформление ---------- */
  theme: {
    palette: "bordeaux",   // сейчас есть только "bordeaux"; новые палитры — в css/themes.css
    mode: "auto"           // "auto" (как на устройстве) | "light" | "dark"
  },

  /* ---------- Расписание ----------
     day: 0 = воскресенье, 1 = понедельник, ... 4 = четверг ... 6 = суббота.
     Время указывается по московскому времени (utcOffsetMinutes: 180).
     extra: разовые стримы, формат "2026-12-31 20:00" (по МСК).
     skip:  даты (МСК), когда стрима НЕ будет, формат "2026-11-19".          */
  schedule: {
    title: "Следующий музыкальный стрим",
    utcOffsetMinutes: 180,
    tzLabel: "МСК",
    durationMinutes: 180,
    rules: [
      { day: 4, time: "19:00" },   // четверг
      { day: 0, time: "19:00" }    // воскресенье
    ],
    extra: [],
    skip: []
  },

  /* ---------- Индикатор «в эфире» ----------
     Пока выключен. Позже сюда подключим автоматическое определение (Twitch).
     Для проверки внешнего вида открой страницу с ?live=1 в конце адреса.    */
  live: {
    enabled: false
  },

  /* ---------- Блоки страницы (сверху вниз) ----------
     type: "links"   — группа кнопок
     type: "youtube" — последний ролик с канала
     variant у группы: "filled" (залитые кнопки) или "soft" (светлые)
     liveHighlight: true — группа подсвечивается, когда включён режим «в эфире»
     icon: youtube | twitch | vkvideo | telegram | vk | boosty | instagram |
           tiktok | list | heart | music | link                                */
  blocks: [
    {
      type: "links",
      id: "watch",
      title: "Смотреть стримы",
      note: "Музыкальные стримы в четверг и воскресенье в 19:00 (МСК)",
      variant: "filled",
      liveHighlight: true,
      links: [
        { title: "YouTube",  url: "https://youtube.com/@_vanilla_bun_",       icon: "youtube" },
        { title: "Twitch",   url: "https://www.twitch.tv/vanilla__bun",        icon: "twitch" },
        { title: "VK Видео", url: "https://live.vkvideo.ru/vanillabun",        icon: "vkvideo" }
      ]
    },

    {
      type: "youtube",
      id: "latest-video",
      title: "Последний ролик",
      channelId: "UCmyC498PNl_U_OsuwzJAmGw",
      channelUrl: "https://youtube.com/@_vanilla_bun_"
    },

    {
      type: "links",
      id: "community",
      title: "Общение",
      note: "Здесь мы общаемся, выходят анонсы, фото и видео",
      variant: "soft",
      links: [
        { title: "Telegram — канал", url: "https://t.me/Vanilla_Bun_Channel",         icon: "telegram" },
        { title: "Telegram — чат",   url: "https://t.me/+FaVk_Y1WB2FhNWMy",           icon: "telegram" },
        { title: "VK сообщество",    url: "https://vk.ru/vanilla__bun",               icon: "vk" }
      ]
    },

    {
      type: "links",
      id: "more",
      title: "Дополнительные площадки",
      variant: "soft",
      links: [
        { title: "Boosty",    url: "https://boosty.to/vanillabun",                   icon: "boosty" },
        { title: "Instagram", url: "https://www.instagram.com/_vanillabun_",         icon: "instagram" },
        { title: "TikTok",    url: "https://www.tiktok.com/@vanilla_bun_",           icon: "tiktok" }
      ]
    },

    {
      type: "links",
      id: "songs",
      title: "Списочки песен",
      variant: "soft",
      links: [
        { title: "Список песен 1", url: "https://www.streamersonglist.com/t/vanilla__bun/songs", icon: "list" },
        { title: "Список песен 2", url: "https://vanilla-bun.github.io/songlist",                 icon: "list" }
      ]
    },

    {
      type: "links",
      id: "support",
      title: "Поддержать",
      note: "Поддержать Ванильку, её творчество и все задуманные идеи можно по ссылочкам ниже",
      variant: "soft",
      links: [
        { title: "DonationAlerts", url: "https://www.donationalerts.com/r/vanilla_bun_", icon: "heart" },
        { title: "DonatePay",      url: "https://new.donatepay.ru/@vanillabun",          icon: "heart" },
        { title: "DALink",         url: "https://dalink.to/vanilla_bun_",                icon: "heart" },
        { title: "Trula",          url: "https://trula.io/dp/twitch/vanilla__bun",       icon: "heart" }
      ],
      // Карта: нажатие копирует номер без пробелов (copyValue).
      card: {
        bank: "Т-Банк",
        number: "2200 7020 4907 7444",
        copyValue: "2200702049077444",
        holder: "Анастасия Г."
      }
    }
  ],

  footer: "Сделано с ♥ для ванильных стримов"
};
