# RULES — Бизнес-правила бронирования

> SDD refs: **SPEC-03**, **INV-01**, **INV-05**, **INV-08**

---

## Коды правил

Формат: `[BOOK-R-XX]` — правило бронирования. Нарушение правила возвращает HTTP 422/400/403 с кодом ошибки.

---

### [BOOK-R-01] Суточный лимит часов (INV-01)

**Правило:** Один пользователь не может забронировать более **3 часов** суммарно на одного и того же `booking_date`.

**Применяется к:** `host_user_id`, не к гостям.

**Алгоритм проверки:**
```
booked_minutes_today = SUM(duration_minutes)
  WHERE host_user_id = :uid
    AND booking_date = :date
    AND status NOT IN ('cancelled', 'cancelled_no_show')

new_duration_minutes = diff_minutes(start_time, end_time)

IF (booked_minutes_today + new_duration_minutes) > 180
  → REJECT: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Превышен лимит 3 ч/день' }
```

**HTTP-статус при нарушении:** `422 Unprocessable Entity`

**Поле ошибки:** `error.code = 'DAILY_LIMIT_EXCEEDED'`

---

### [BOOK-R-02] Атомарная проверка пересечения (Overlap)

**Правило:** В один момент времени на одной площадке не может быть двух активных бронирований.

**Условие пересечения:** `start_time < :end_time AND end_time > :start_time`

**Реализация:** Проверка и вставка выполняются в **одной Prisma-транзакции** (`$transaction`) с уровнем изоляции `Serializable` или использованием `SELECT FOR UPDATE`, чтобы исключить race condition.

```typescript
// bookingService.ts — псевдокод транзакции
await prisma.$transaction(async (tx) => {
  const conflict = await tx.booking.findFirst({
    where: {
      ground_id,
      booking_date,
      status: { notIn: ['cancelled', 'cancelled_no_show'] },
      AND: [
        { start_time: { lt: end_time } },
        { end_time:   { gt: start_time } },
      ],
    },
  });
  if (conflict) throw new ConflictError('SLOT_TAKEN');
  return tx.booking.create({ data: { ... } });
});
```

**HTTP-статус при нарушении:** `409 Conflict`

**Поле ошибки:** `error.code = 'SLOT_TAKEN'`

---

### [BOOK-R-03] Машина состояний (State Machine)

**Правило:** Статус бронирования (`status`) может изменяться только по разрешённым переходам.

| Из состояния | В состояние | Кто инициирует | Условие |
|---|---|---|---|
| `confirmed` | `active` | Система (cron/IoT) | `booking_date` наступил и `start_time` достигнуто |
| `confirmed` | `cancelled` | Хост или Админ | До начала слота |
| `active` | `completed` | Хост или Система | После `end_time` |
| `active` | `cancelled_no_show` | Система (cron) | Хост не открыл дверь через N минут после `start_time` |
| `completed` | — | — | Терминальное состояние |
| `cancelled` | — | — | Терминальное состояние |
| `cancelled_no_show` | — | — | Терминальное состояние |

**Запрещённые переходы:** Любые, не перечисленные выше → `400 Bad Request`, `error.code = 'INVALID_STATUS_TRANSITION'`.

**Эндпоинты, изменяющие статус:**
- `POST /api/v1/bookings/:id/cancel` → `cancelled`
- `POST /api/v1/bookings/:id/complete` → `completed`

---

### [BOOK-R-04] Расчёт стоимости (Price Calculation)

**Правило:** `total_price` рассчитывается на backend при создании бронирования. Клиент не передаёт цену.

**Формула:**
```
duration_hours = diff_minutes(start_time, end_time) / 60
total_price = duration_hours × ground.cost_per_hour
```

**Источник `cost_per_hour`:** Модель `Ground.cost_per_hour` (фича `02-grounds`).

**Округление:** До 2 знаков после запятой (`Math.round(x * 100) / 100`).

**Валюта:** KZT (тенге), передаётся как `Float` без символа.

**Ошибка при нулевой стоимости:** Если `cost_per_hour = 0`, бронирование создаётся с `total_price = 0` и `payment_status = 'paid'` автоматически.

---

### [BOOK-R-05] Блокировка забаненных пользователей (INV-08)

**Правило:** Пользователь с флагом `User.is_banned = true` не может создавать бронирования, принимать инвайты или делать spontaneous check-in.

**Проверка:** В `bookingService.ts` перед любой мутацией:
```typescript
const user = await prisma.user.findUnique({ where: { id: userId } });
if (user.is_banned) throw new ForbiddenError('USER_BANNED');
```

**HTTP-статус:** `403 Forbidden`

**Поле ошибки:** `error.code = 'USER_BANNED'`

---

### [BOOK-R-06] Генерация invite-токена

**Правило:** При создании каждого `Booking` автоматически генерируется уникальный `invite_token` (UUID v4, Prisma `@default(uuid())`).

**Ссылка для приглашения:** `https://igraem.kz/invite/:invite_token`

**Срок действия:** Токен активен пока `status` ∈ `{'confirmed', 'active'}`. При `cancelled`, `cancelled_no_show`, `completed` — ссылка отклоняется (`410 Gone`, `error.code = 'INVITE_EXPIRED'`).

**Уникальность:** `invite_token String @unique` в Prisma — база гарантирует уникальность. Повторная генерация не предусмотрена.

---

### [BOOK-R-07] Управление гостями (INV-05)

**Правило:** Хост может удалить гостя из бронирования через `DELETE /api/v1/bookings/:bookingId/guests/:guestId`. Удаление доступно только хосту (`host_user_id = JWT.sub`).

**Автоодобрение:** Если `auto_approve_players = true`, `BookingGuest.status` при создании = `'approved'`. Иначе = `'pending'`, хост подтверждает вручную.

**Лимит гостей:** `needed_players_count` — максимальное количество гостей. Если `BookingGuest.count(approved) >= needed_players_count`, новые запросы отклоняются (`409 Conflict`, `error.code = 'GAME_FULL'`).

---

### [BOOK-R-08] Spontaneous Check-In

**Правило:** Пользователь может присоединиться к активному бронированию без инвайта через QR-код площадки (`POST /api/v1/bookings/spontaneous-join`).

**Условия:**
- `Booking.status = 'active'` (идёт сейчас).
- `is_looking_for_players = true`.
- Пользователь не забанен ([BOOK-R-05]).
- Свободные места: `needed_players_count > count(approved_guests)`.

**Тип записи:** `BookingGuest.type = 'spontaneous_check_in'`

---

### [BOOK-R-09] Платёжный статус при отмене

**Правило:** При отмене бронирования (`status → cancelled`):
- Если `payment_status = 'paid'` → инициируется возврат → `payment_status = 'refunded'` (через фичу `04-payments`).
- Если `payment_status = 'unpaid'` → статус остаётся `'unpaid'`, возврат не требуется.
- `cancelled_no_show` → политика возврата определяется отдельно администратором.

---

### [BOOK-R-10] Временны́е ограничения площадки

**Правило:** `start_time` и `end_time` должны находиться в диапазоне рабочих часов площадки (`Ground.open_time` … `Ground.close_time`). Иначе → `422`, `error.code = 'OUTSIDE_WORKING_HOURS'`.

**Минимальная длительность:** 1 час (`end_time - start_time >= 60 минут`).
