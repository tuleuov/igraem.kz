# DESIGN SYSTEM — Igraem.kz

> Справочник дизайн-системы платформы. Используется как источник истины для всех UI-компонентов, Tailwind-конфига и feature-спеков.  
> Stack: **React 18**, **Vite**, **Tailwind CSS v3**, **TypeScript**.

---

## 1. Цвета (Color Palette)

### 1.1 Brand Colors

| Token | Hex | Tailwind Class | Использование в UI |
|---|---|---|---|
| `brand-green` | `#00B050` | `bg-[#00B050]` / `text-[#00B050]` | Primary CTA-кнопки, активные состояния, логотип, иконки подтверждения, доступные слоты, статус «Подтверждено» |
| `brand-green-dark` | `#008C40` | `bg-[#008C40]` | Hover-состояние brand-green кнопок (`hover:bg-[#008C40]`) |
| `brand-green-light` | `#E6F7EE` | `bg-[#E6F7EE]` | Фон success-баннеров, бейджи «Активно», highlight доступных слотов |

### 1.2 Semantic Colors

| Token | Hex | Tailwind Approx. | Назначение |
|---|---|---|---|
| `warning-orange` | `#F97316` | `orange-500` | Session Warning — оранжевый баннер T-5 мин до конца сессии; иконки предупреждений |
| `warning-orange-bg` | `#FFF7ED` | `orange-50` | Фон оранжевых баннеров (бан, предупреждение о сессии) |
| `danger-red` | `#EF4444` | `red-500` | Ошибки валидации, геочек не пройден, бан-баннер (текст), no-show алерт |
| `danger-red-bg` | `#FEF2F2` | `red-50` | Фон ошибочных состояний, фон бан-баннера |
| `info-blue` | `#3B82F6` | `blue-500` | Информационные тултипы, иконки TTLock offline-режима |
| `info-blue-bg` | `#EFF6FF` | `blue-50` | Фон info-баннеров |
| `success-green` | `#00B050` | _(= brand-green)_ | Успешные действия (замок открыт, бронь создана) — совпадает с brand |

### 1.3 Neutral Colors

| Token | Hex | Tailwind Class | Использование |
|---|---|---|---|
| `gray-50` | `#F9FAFB` | `gray-50` | Фон страниц, фон карточек площадок |
| `gray-100` | `#F3F4F6` | `gray-100` | Разделители, фон disabled-элементов |
| `gray-200` | `#E5E7EB` | `gray-200` | Недоступные слоты в тайм-гриде |
| `gray-400` | `#9CA3AF` | `gray-400` | Placeholder текст, иконки вторичного действия |
| `gray-600` | `#4B5563` | `gray-600` | Вторичный текст, метки, подписи |
| `gray-900` | `#111827` | `gray-900` | Основной текст, заголовки |
| `white` | `#FFFFFF` | `white` | Фон карточек, поповеров, модальных окон |

### 1.4 Slot Grid Color Mapping

| Состояние слота | Цвет фона | Tailwind / Hex | Текст |
|---|---|---|---|
| Доступен | `#E6F7EE` | brand-green-light | `#00B050` |
| Выбран (hover/active) | `#00B050` | brand-green | `#FFFFFF` |
| Недоступен (занят) | `#E5E7EB` | `gray-200` | `#9CA3AF` |
| Школьные часы | `#FEF9C3` | `yellow-100` | `#92400E` (amber-800) |
| Текущий момент (сейчас) | `#EFF6FF` | `blue-50` | `#3B82F6` |

### 1.5 Tailwind Config Extension

```js
// tailwind.config.js — extend.colors
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          green:       '#00B050',
          'green-dark': '#008C40',
          'green-light': '#E6F7EE',
        },
        warning: {
          orange:    '#F97316',
          'orange-bg': '#FFF7ED',
        },
      },
    },
  },
}
```

---

## 2. Типографика (Typography)

> [!NOTE]
> Точное название шрифта уточнить в `client/src` (файлы `index.html`, `main.tsx`, CSS-импорты). Ниже — предполагаемый стек на основе best practices для RU/KZ локали.

| Уровень | Элемент | Font Family | Size (rem/px) | Weight | Line Height |
|---|---|---|---|---|---|
| Display | Название площадки, Hero-заголовок | `Inter`, sans-serif | `2rem / 32px` | 700 | 1.25 |
| H1 | Заголовок страницы | `Inter` | `1.5rem / 24px` | 700 | 1.33 |
| H2 | Заголовок секции | `Inter` | `1.25rem / 20px` | 600 | 1.4 |
| H3 | Подзаголовок, название карточки | `Inter` | `1rem / 16px` | 600 | 1.5 |
| Body | Основной текст, описания | `Inter` | `0.875rem / 14px` | 400 | 1.57 |
| Small | Метки, подписи, timestamp | `Inter` | `0.75rem / 12px` | 400 | 1.67 |
| Code / PIN | PIN-код, TTLock passcode | `JetBrains Mono`, monospace | `1.5rem / 24px` | 700 | 1.25 |

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #111827; /* gray-900 */
}
```

---

## 3. Форматы дат, времени и телефонов (Kazakhstan Standards)

### 3.1 Дата

| Формат | Шаблон | Пример | Где используется |
|---|---|---|---|
| **Отображение (UI)** | `DD.MM.YYYY` | `15.10.2026` | Карточки броней, история, отчёты акимата |
| **API запрос/ответ** | ISO 8601 UTC | `2026-10-15T11:00:00Z` | Все JSON payload, Prisma DateTime |
| **Короткая метка** | `DD MMM` (RU abbr) | `15 окт` | Тайм-грид заголовки, мобильный вид |
| **День недели** | `ddd, DD.MM` | `Чт, 15.10` | Заголовки сетки бронирования |

```typescript
// utils/formatDate.ts
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatDisplayDate = (iso: string) =>
  format(parseISO(iso), 'dd.MM.yyyy');

export const formatShortDate = (iso: string) =>
  format(parseISO(iso), 'd MMM', { locale: ru }); // "15 окт"

export const formatDayLabel = (iso: string) =>
  format(parseISO(iso), 'EEE, dd.MM', { locale: ru }); // "чт, 15.10"
```

### 3.2 Время

| Формат | Шаблон | Пример | Где используется |
|---|---|---|---|
| **Отображение** | `HH:mm` (24h) | `14:00`, `09:30` | Слоты, сессии, таймеры |
| **Диапазон** | `HH:mm – HH:mm` | `14:00 – 15:00` | Карточка бронирования |
| **Таймер обратного отсчёта** | `mm:ss` | `04:32` | Session Warning баннер |
| **Часовой пояс** | `Asia/Almaty` (UTC+5) | GMT+5 | Все вычисления на сервере |

```typescript
// utils/formatTime.ts
export const formatTimeSlot = (iso: string) =>
  format(parseISO(iso), 'HH:mm');                  // "14:00"

export const formatTimeRange = (start: string, end: string) =>
  `${formatTimeSlot(start)} – ${formatTimeSlot(end)}`; // "14:00 – 15:00"

// Countdown timer
export const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
```

### 3.3 Телефон

| Формат | Шаблон | Пример | Валидация |
|---|---|---|---|
| **Отображение** | `+7 7XX XXX XX XX` | `+7 701 234 56 78` | — |
| **Хранение (DB)** | E.164 | `+77012345678` | `User.phone: String` |
| **Валидация** | regex | `/^\+7[78]\d{9}$/` | Казахстанские номера: 700–799 |
| **Маска ввода** | React input-mask | `+7 (___) ___-__-__` | `react-input-mask` или `imask` |

```typescript
// utils/formatPhone.ts
export const formatPhoneDisplay = (e164: string): string => {
  // "+77012345678" → "+7 701 234 56 78"
  const d = e164.replace(/^\+7/, '');
  return `+7 ${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6,8)} ${d.slice(8,10)}`;
};

export const PHONE_REGEX = /^\+7[78]\d{9}$/;
```

---

## 4. Локаль и интернационализация (i18n)

| Параметр | Значение |
|---|---|
| **Первичный язык** | Русский (`ru-KZ`) |
| **Вторичный язык** | Казахский (`kk-KZ`) — кнопка «Қазақша» в хедере |
| **i18n библиотека** | `react-i18next` |
| **Namespace** | `common`, `booking`, `session`, `venue`, `auth`, `matchmaking` |
| **Locale файлы** | `client/src/locales/ru/`, `client/src/locales/kk/` |
| **Дата-библиотека** | `date-fns` + locale `ru`, `kk` |
| **Валюта** | Казахстанский тенге ₸ (KZT), формат: `1 500 ₸` (пробел как разделитель тысяч) |
| **Страна** | KZ, `+7` код |
| **Стандарт недели** | Неделя начинается с **Понедельника** (ISO 8601) |

---

## 5. UI States (Состояния интерфейса)

### 5.1 Normal (Нормальное состояние)

- Фон страницы: `gray-50`
- CTA-кнопки: `bg-brand-green text-white rounded-lg px-4 py-2`
- Карточки: `bg-white rounded-xl shadow-sm border border-gray-100`
- Доступные слоты: фон `brand-green-light`, текст `brand-green`, курсор `pointer`

### 5.2 Warning — Session T-5 min (Предупреждение о скором конце сессии)

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  До конца сессии осталось 04:32                     │
│  [Расширить сессию +1 час]                              │
└─────────────────────────────────────────────────────────┘
```

- Баннер: `bg-[#FFF7ED] border border-[#F97316] text-[#C2410C] rounded-lg`
- Иконка: `⚠️` или Heroicon `ExclamationTriangleIcon` (`text-warning-orange`)
- Таймер: `font-mono font-bold text-xl text-[#F97316]` формат `mm:ss`
- Кнопка «Расширить»: `bg-[#F97316] text-white` (disabled если `extensionCount >= 2`)
- Триггер: `Session.status === 'WARNING'` (за 5 мин до `endsAt`)

### 5.3 Banned (Бан аккаунта)

```
┌─────────────────────────────────────────────────────────┐
│  🚫  Ваш аккаунт заблокирован                          │
│  Причина: Превышение времени (Овертайм)                 │
│  Блокировка снимется через: 71:23:45                    │
└─────────────────────────────────────────────────────────┘
```

- Баннер: `bg-[#FEF2F2] border border-[#EF4444] text-[#B91C1C] rounded-lg`
- Таймер: countdown `HH:mm:ss` до `BanRecord.expiresAt`
- Показывается на всех страницах (sticky top banner)
- Кнопки «Создать бронь» и «Вступить»: `disabled opacity-50 cursor-not-allowed`

### 5.4 Offline Gateway (Шлюз недоступен)

```
┌─────────────────────────────────────────────────────────┐
│  📡  Шлюз недоступен. Используйте PIN-код или eKey      │
│  PIN-код: [2 4 8 7 1 3]   [Скопировать]                │
│  или откройте замок через Bluetooth                     │
└─────────────────────────────────────────────────────────┘
```

- Баннер: `bg-[#EFF6FF] border border-[#3B82F6] text-[#1E40AF] rounded-lg`
- PIN-код: `font-mono text-4xl font-bold tracking-[0.3em] text-gray-900` (моноширный, крупный)
- Кнопка «Скопировать»: `variant="outline"` с иконкой `ClipboardIcon`
- Кнопка «Открыть по Bluetooth»: `bg-blue-500 text-white`

### 5.5 Geolocation Check Failed (Геочек не пройден)

- Модальное окно с картой (Яндекс.Карты или Google Maps)
- Текст ошибки: `text-danger-red` — «Вы находитесь слишком далеко от площадки (>50 м)»
- Показать расстояние: `Ваше расстояние: 127 м`
- Кнопка «Попробовать снова»: `bg-brand-green`

---

## 6. Компоненты — соглашения по именованию

### 6.1 Структура папок

```
client/src/
├── components/
│   ├── ui/                  # Базовые UI-примитивы (Button, Badge, Modal, etc.)
│   ├── booking/             # Booking-specific компоненты
│   ├── session/             # Session-specific (таймер, warning-баннер)
│   ├── venue/               # Venue card, slot grid
│   ├── lock/                # Lock controls, PIN display, geolocation
│   ├── matchmaking/         # JoinRequest cards, public booking list
│   └── layout/              # Header, Footer, PageWrapper
├── pages/                   # Page-level компоненты (route-based)
├── hooks/                   # use* хуки
├── utils/                   # Утилиты (formatDate, formatPhone, etc.)
├── locales/                 # i18n файлы
│   ├── ru/
│   └── kk/
└── types/                   # TypeScript типы / Prisma-generated types
```

### 6.2 Naming Conventions

| Тип | Конвенция | Примеры |
|---|---|---|
| React Component | `PascalCase` | `BookingCard`, `SessionWarningBanner`, `SlotGrid` |
| Hook | `camelCase` с префиксом `use` | `useSession`, `useGeoCheck`, `useTTLock` |
| Utility function | `camelCase` | `formatDisplayDate`, `formatPhoneDisplay` |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_SESSION_EXTENSIONS`, `GEO_CHECK_RADIUS_METERS` |
| Tailwind token (extend) | `kebab-case` | `brand-green`, `warning-orange` |
| i18n key | `dot.notation` namespace | `booking.create.title`, `session.warning.message` |
| API route | `kebab-case` | `/api/venues/:id/bookings`, `/api/sessions/:id/extend` |
| Prisma model | `PascalCase` | `Booking`, `Session`, `JoinRequest` |
| Prisma field | `camelCase` | `hostUserId`, `extensionCount`, `expiresAt` |
| Enum value | `SCREAMING_SNAKE_CASE` | `BookingStatus.NO_SHOW`, `BanReason.OVERSTAY` |

### 6.3 Key Component Props Patterns

```typescript
// Пример: BookingCard
interface BookingCardProps {
  booking: Booking;           // Prisma-generated type
  currentUserId: string;
  onExtend?: () => void;      // только для HOST
  onJoin?: () => void;        // только для GUEST (matchmaking)
}

// Пример: SlotGrid
interface SlotGridProps {
  venueId: string;
  date: string;               // ISO date string "2026-10-15"
  onSlotSelect: (slot: Slot) => void;
  selectedSlots?: Slot[];
}

// Пример: SessionWarningBanner
interface SessionWarningBannerProps {
  session: Session;
  onExtend: () => void;
  extensionCount: number;     // 0 | 1 | 2
}
```

---

## 7. Иконки (Icons)

> [!NOTE]
> Уточнить в `client/src` (поиск `import.*Icon` в компонентах). Ниже — рекомендуемый набор.

- **Библиотека**: `@heroicons/react` v2 (outline + solid variants)
- **Размер по умолчанию**: `w-5 h-5` (20px) для inline, `w-6 h-6` (24px) для CTA
- **Иконки по доменам**:

| Домен | Иконка (Heroicons) | Использование |
|---|---|---|
| Бронирование | `CalendarDaysIcon` | Создать бронь, список броней |
| Замок открыт | `LockOpenIcon` | Открытый замок / успешный вход |
| Замок закрыт | `LockClosedIcon` | Заблокированный замок |
| Предупреждение | `ExclamationTriangleIcon` | Session Warning, бан |
| Геолокация | `MapPinIcon` | Геочек, карта площадки |
| QR-код | `QrCodeIcon` | Venue QR, сканирование |
| Пользователь | `UserIcon` / `UserGroupIcon` | Профиль, участники |
| Расширение | `ArrowPathIcon` | Расширить сессию |
| Копировать | `ClipboardDocumentIcon` | Копировать PIN-код |
| Bluetooth | `SignalIcon` | eKey / BT-открытие |
| Офлайн | `WifiIcon` (crossed) | Offline Gateway |
| Спорт | Custom SVG | Football, Volleyball, Basketball |

---

## 8. Размеры и сетка (Layout & Spacing)

| Элемент | Значение | Tailwind |
|---|---|---|
| Высота слота в тайм-гриде | `64px` | `h-16` |
| Ширина колонки дня | `120px` min | `min-w-[120px]` |
| Ширина колонки времени (метка) | `48px` | `w-12` |
| Радиус карточек | `12px` | `rounded-xl` |
| Радиус кнопок | `8px` | `rounded-lg` |
| Отступы карточки | `16px` | `p-4` |
| Максимальная ширина контейнера | `1200px` | `max-w-[1200px] mx-auto` |
| Мобильный breakpoint | `< 768px` | `md:` prefix |
| Tablet breakpoint | `768px – 1024px` | `lg:` prefix |

---

## 9. Анимации и переходы

| Элемент | Transition | Duration |
|---|---|---|
| Hover на слоте | `bg-color` | `150ms ease` |
| Появление баннера (warning/ban) | `fade-in + slide-down` | `300ms ease-out` |
| Таймер обратного отсчёта | Обновление каждые 1с | — |
| Модальное окно | `opacity + scale` | `200ms ease` |
| Toast notification | `slide-in-right` | `250ms ease` |

```css
/* globals.css — базовые переходы */
.slot-cell {
  transition: background-color 150ms ease, color 150ms ease;
}
.banner-enter {
  animation: slideDown 300ms ease-out forwards;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

*Последнее обновление: автогенерация из system message. При изменении — синхронизировать с `tailwind.config.js` и `globals.css`.*
