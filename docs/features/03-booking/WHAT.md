# WHAT — Feature 03-booking: Бронирование спортивных площадок

> SDD refs: **SPEC-03**, **INV-01**, **INV-05**

---

## 1. Назначение фичи

Фича **03-booking** реализует полный цикл бронирования спортивных площадок на платформе **Igraem.kz**:

- Пользователь выбирает площадку, дату и временной слот.
- Система атомарно проверяет отсутствие пересечений и лимит 3 ч/день (INV-01).
- Создаётся `Booking` со статусом `confirmed`, генерируется уникальный `invite_token`.
- Хост может пригласить друзей по ссылке (`/invite/:token`) или включить режим поиска игроков (`is_looking_for_players`).
- Гости подключаются через invite-link или spontaneous check-in (QR-код на площадке).
- Дверь площадки открывается через `is_door_opened = true` (IoT-интеграция).
- Booking завершается автоматически или вручную переходом в `completed`.

---

## 2. Слот-грид (Slot Grid)

Визуальная концепция сетки доступности отображается на экране **BookingScreen.tsx**.

```
        Пн 15.10  Вт 16.10  Ср 17.10  Чт 18.10  Пт 19.10  Сб 20.10
07:00  [  FREE  ] [ FREE  ] [ FREE  ] [ FREE  ] [ FREE  ] [ FREE  ]
08:00  [  FREE  ] [BOOKED ] [ FREE  ] [ FREE  ] [ FREE  ] [ FREE  ]
09:00  [ FREE  ] [BOOKED ] [BOOKED ] [ FREE  ] [ FREE  ] [ FREE  ]
10:00  [BOOKED ] [ FREE  ] [BOOKED ] [ FREE  ] [ FREE  ] [ FREE  ]
11:00  [BOOKED ] [ FREE  ] [ FREE  ] [ FREE  ] [BOOKED ] [ FREE  ]
...
22:00  [ FREE  ] [ FREE  ] [ FREE  ] [BOOKED ] [ FREE  ] [ FREE  ]
```

**Правила грида:**
- Видимый диапазон: **6 дней** начиная с сегодня (`today` … `today + 5`).
- Шаг слота: **1 час** (или задаётся `slot_duration_minutes` площадки).
- `FREE` слоты — кликабельны → открывают форму создания бронирования.
- `BOOKED` (жёлтые) слоты — кликабельны → показывают **Join Request UI** (INV-05), если `is_looking_for_players = true`.
- `BOOKED` слоты без флага — показывают только информацию (недоступно для вступления).
- Прошедшие слоты — серые, некликабельны.

---

## 3. Режим поиска игроков (Looking for Players)

Когда хост включает `is_looking_for_players = true`:

| Поле | Описание |
|------|----------|
| `is_looking_for_players` | Флаг «ищу игроков» |
| `needed_players_count` | Сколько игроков нужно |
| `auto_approve_players` | Автоматически принимать запросы гостей |

Слот в гриде подсвечивается **жёлтым** и содержит badge с количеством мест. Другие пользователи нажимают на слот → видят карточку бронирования → нажимают **Вступить** → создаётся `BookingGuest` со статусом `pending` (или `approved` при `auto_approve = true`).

---

## 4. Affected Modules

### Backend

| Модуль | Путь | Роль |
|--------|------|------|
| Controller | `src/controllers/bookingsController.ts` | HTTP-хендлеры, валидация входных DTO |
| Service | `src/services/bookingService.ts` | Бизнес-логика, транзакции Prisma, расчёт цены |
| Prisma schema | `prisma/schema.prisma` | Модели `Booking`, `BookingGuest` |
| Auth middleware | `src/middleware/auth.ts` | JWT-проверка для защищённых роутов |
| IoT hook | `src/services/doorService.ts` | Управление `is_door_opened` |

### Frontend

| Модуль | Путь | Роль |
|--------|------|------|
| Booking Screen | `client/src/screens/BookingScreen.tsx` | Слот-грид, форма бронирования |
| Invite Screen | `client/src/screens/InviteScreen.tsx` | Просмотр invite-link, кнопка Accept |
| Booking Store | `client/src/stores/bookingStore.ts` | Zustand/Redux state для бронирований |
| API client | `client/src/api/bookings.ts` | HTTP-вызовы к /api/v1/bookings/* |

---

## 5. Связанные фичи и зависимости

| Фича | Связь |
|------|-------|
| `01-auth` | JWT токен, флаг `is_banned` пользователя |
| `02-grounds` | `ground_id`, `cost_per_hour`, расписание работы |
| `04-payments` | `payment_status`, возврат при отмене |
| `05-iot` | Управление дверью через `is_door_opened` |
| `06-notifications` | Push/SMS при создании, отмене, принятии гостя |

---

## 6. Ограничения и допущения

- `booking_date` хранится как строка `'YYYY-MM-DD'` (UTC+5 Алматы).
- `start_time` / `end_time` — строки `'HH:mm'` без timezone; клиент обязан передавать локальное время площадки.
- Максимальная длительность одного бронирования: **3 часа** (INV-01, ограничивает одиночное бронирование и суммарно за день).
- Слот-грид показывает только публичные площадки (`is_active = true`).
