/**
 * Название и контакты продукта. Название рабочее — меняется здесь в одном месте.
 * Контактный адрес берётся из переменной окружения, чтобы не публиковать
 * выдуманный ящик: без неё форма заявки работает только через облако.
 */
export const brand = {
  name: 'Алгоскоп',
  tagline: 'Алгоритмы, которые видно',
  description: 'Интерактивный тренажёр по алгоритмам и структурам данных: пошаговые анимации на ваших данных, теория, тесты и инструменты для преподавателей.',
  contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  legalEntity: (import.meta.env.VITE_LEGAL_ENTITY as string | undefined) ?? '',
  siteUrl: ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/$/, ''),
} as const;

export const getSiteOrigin = (): string => (brand.siteUrl.length > 0 ? brand.siteUrl : typeof window === 'undefined' ? '' : window.location.origin);
