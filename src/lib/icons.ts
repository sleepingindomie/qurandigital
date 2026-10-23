// Line icons on a 24 px grid, 1.5 stroke. Constant markup from this file only,
// never API text. Paths with class "f" are filled.
export const ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  play: '<path class="f" d="M8.5 5.8v12.4L18.5 12z"/>',
  pause: '<path class="f" d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z"/>',
  prev: '<path d="M17 6l-7 6 7 6M7 6v12"/>',
  next: '<path d="M7 6l7 6-7 6M17 6v12"/>',
  more: '<circle class="f" cx="6" cy="12" r="1.5"/><circle class="f" cx="12" cy="12" r="1.5"/><circle class="f" cx="18" cy="12" r="1.5"/>',
  mark: '<path class="mk-fill" d="M7 4h10v16l-5-3.6L7 20z"/><path class="mk-line" pathLength="100" d="M7 4h10v16l-5-3.6L7 20z"/>',
  book: '<path d="M4 5.5c2.8-1 5.5-.8 8 .9 2.5-1.7 5.2-1.9 8-.9v13c-2.8-1-5.5-.8-8 .9-2.5-1.7-5.2-1.9-8-.9zM12 6.4v13"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  repeat: '<path d="M4 11a5 5 0 0 1 5-5h10M16 3l3 3-3 3M20 13a5 5 0 0 1-5 5H5M8 21l-3-3 3-3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  type: '<path d="M3.5 18L8.5 6l5 12M5.3 14h6.4M15 18l3-7 3 7M15.9 16h4.2"/>',
  offline:
    '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.2-2.4M19 13a10 10 0 0 0-3-1.9M2 9.5a15 15 0 0 1 4.6-2.8M22 9.5A15 15 0 0 0 11 5.6"/><circle class="f" cx="12" cy="19.5" r="1.2"/>',
  pin: '<path d="M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2"/>',
  retry: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
} as const

export type IconName = keyof typeof ICONS
