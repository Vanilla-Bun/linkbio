/* Иконки (линейные, 24×24). Это наши собственные строки, не данные пользователя,
   поэтому их безопасно вставлять как SVG. Новая иконка — просто добавь строку. */
(function () {
  var wrap = function (inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
           inner + '</svg>';
  };

  window.LB_ICONS = {
    youtube:   wrap('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>'),
    twitch:    wrap('<path d="M5 3h15v10.5L15.5 18H12l-3 3v-3H5z"/><path d="M15 7.5v3.5M11 7.5v3.5"/>'),
    vkvideo:   wrap('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/>'),
    vk:        wrap('<rect x="3" y="3" width="18" height="18" rx="5"/><text x="12" y="15.6" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">VK</text>'),
    telegram:  wrap('<path d="M21.5 3.5 2.8 10.7l5.4 2 2 5.8 3-3.6 4.6 3.4z"/><path d="m8.2 12.7 8.8-5.2"/>'),
    instagram: wrap('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>'),
    tiktok:    wrap('<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2 4.2 5 4.5"/>'),
    boosty:    wrap('<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>'),
    list:      wrap('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>'),
    heart:     wrap('<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.4 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'),
    music:     wrap('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
    link:      wrap('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.700l1-1"/>'),
    calendar:  wrap('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    copy:      wrap('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>'),
    check:     wrap('<path d="m5 12.500 4.500 4.500L19 7.500"/>'),
    sun:       wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800"/>'),
    moon:      wrap('<path d="M20 14.500A8.500 8.500 0 0 1 9.500 4 8.500 8.500 0 1 0 20 14.500z"/>')
  };
})();
