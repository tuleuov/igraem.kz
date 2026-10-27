# RULES — Feature 05: Session & Ban System
**SPEC-05 | INV-03 | INV-07 | INV-08**

---

## SESSION Rules

### [SESSION-R-01] Таймер сессии — 55 минут (INV-07)

- Обратный отсчёт начинается ровно в `start_time` дня `booking_date`.
- Длительность таймера: **55 минут** (не равна фактической длительности слота).
- Таймер вычисляется **на клиенте**: `remaining = start_time_datetime + 55min - Date.now()`.
- Timezone для вычисления: `Asia/Almaty` (UTC+5).
- Таймер показывается только при `booking.status === 'active'`.

### [SESSION-R-02] Orange Warning — 5 минут до конца

- Когда `remaining ≤ 5 * 60` секунд — показывается оранжевый баннер на `ActiveSessionScreen`.
- Баннер: «⏰ До конца игры осталось 5 минут».
- Баннер не исчезает до завершения сессии.

### [SESSION-R-03] Продление сессии (Extension)

- Только **host** может инициировать продление.
- Продление: `+60 минут` к `end_time` бронирования.
- Максимум **2 продления** за одно бронирование.
- После 2-го продления кнопка «Продлить на 1 час» скрывается на клиенте.
- Счётчик продлений (`extensionCount`) хранится на клиенте в состоянии `ActiveSessionScreen`; бэкенд не валидирует количество на текущем этапе (MVP).
- Продление недоступно, если статус не `active`.

### [SESSION-R-04] Завершение сессии хостом

- Хост нажимает **«Завершить игру»** → `POST /api/v1/bookings/:id/complete`.
- Бэкенд: проверяет, что `booking.status === 'active'` и `booking.host_id === req.user.id`.
- После успеха: `booking.status = 'completed'`.
- Проверка overstay: если `now() > end_time_datetime + 5min` → создаётся `UserBan` (см. [BAN-R-02]).

### [SESSION-R-05] Покидание сессии гостем

- Гость нажимает **«Покинуть игру»** → `POST /api/v1/bookings/:id/cancel`.
- Бэкенд: проверяет, что `booking.guest_id === req.user.id` и `booking.status === 'active'`.
- После успеха: `booking.status = 'cancelled'`.
- Бан гостю **не выставляется** при штатном покидании.

### [SESSION-R-06] Защита endpoint-ов сессии

- Оба endpoint (`complete`, `cancel`) требуют валидный JWT.
- Пользователь с `is_banned = true` **не может** вызвать `complete` или `cancel` (middleware `checkBan` блокирует на уровне HTTP 403).

---

## BAN Rules

### [BAN-R-01] Структура бана

- Каждый бан — запись `UserBan` в БД.
- Одновременно обновляется `User.is_banned = true`, `User.banned_until = now() + 72h`.
- `UserBan.ground_id` — опционально, для банов, связанных с конкретной площадкой.
- `UserBan.is_resolved` = `false` при создании; устанавливается в `true` при ручном снятии бана администратором.

### [BAN-R-02] Overstay Ban (INV-03)

**Триггер**: хост вызывает `POST /api/v1/bookings/:id/complete` ИЛИ бэкенд детектирует задержку.

**Условие**:
```
now() > (booking_date + end_time) + 5 minutes
AND booking.status === 'active'
```

**Действия**:
1. Создать `UserBan` с `reason = 'Overstay: превышено время слота более чем на 5 минут'`, `banned_until = now() + 72h`.
2. Обновить `User.is_banned = true`, `User.banned_until = now() + 72h`.
3. Установить `booking.status = 'completed'`.

**Кто получает бан**: пользователь, который физически находился в помещении (идентифицируется как `booking.host_id` или `booking.guest_id` — тот, кто открыл дверь).

### [BAN-R-03] No-Show Ban (INV-03)

**Триггер**: cron-задача через `POST /api/v1/admin/bookings/check-noshows`.

**Условие**:
```
booking.is_door_opened === false
AND now() > (booking_date + start_time) + 15 minutes
AND booking.status === 'confirmed'
```

**Действия**:
1. Установить `booking.status = 'cancelled_no_show'`.
2. Создать `UserBan` с `reason = 'No-show: дверь не была открыта в течение 15 минут после начала'`, `banned_until = now() + 72h`.
3. Обновить `User.is_banned = true`, `User.banned_until = now() + 72h`.

**Кто получает бан**: `booking.host_id` (организатор, который забронировал и не явился).

### [BAN-R-04] Длительность бана

- Стандартная длительность: **72 часа** от момента создания `UserBan`.
- `banned_until = new Date(Date.now() + 72 * 60 * 60 * 1000)`.
- Администратор может снять бан досрочно (`POST /api/v1/admin/users/:userId/unban`), при этом `User.is_banned = false`, `User.banned_until = null`, `UserBan.is_resolved = true`.

### [BAN-R-05] Блокировка действий забаненного пользователя (INV-08)

При `User.is_banned = true AND User.banned_until > now()` — пользователю **запрещено**:

| Действие | HTTP ответ при блокировке |
|----------|--------------------------|
| Создать бронирование `POST /api/v1/bookings` | `403 Forbidden` |
| Открыть дверь `POST /api/v1/bookings/:id/unlock` | `403 Forbidden` |
| Вступить в матчмейкинг `POST /api/v1/matchmaking/join` | `403 Forbidden` |
| Принять приглашение `POST /api/v1/invites/:id/accept` | `403 Forbidden` |

Middleware `checkBan`:
```ts
// src/middleware/checkBan.ts
if (user.is_banned && user.banned_until && user.banned_until > new Date()) {
  return res.status(403).json({
    error: 'USER_BANNED',
    banned_until: user.banned_until,
  });
}
```

### [BAN-R-06] BannedUserScreen — отображение бана на клиенте

- Если при загрузке приложения `User.is_banned = true` — рендерится `BannedUserScreen` вместо основного стека.
- `BannedUserScreen` показывает:
  - Причину бана (`reason` из последней активной записи `UserBan`).
  - Обратный отсчёт (`banned_until - now()`), обновляется каждые 1 секунду.
  - Кнопку «Связаться с поддержкой» (ссылка на WhatsApp/Telegram).

### [BAN-R-07] Проверка истёкшего бана

- При каждом `GET /api/v1/auth/me` (или аналоге) бэкенд проверяет:
  ```
  if (user.banned_until && user.banned_until <= now()) {
    user.is_banned = false;
    user.banned_until = null;
    await prisma.user.update(...)
  }
  ```
- Истёкший бан снимается автоматически без вмешательства администратора.

### [BAN-R-08] Повторные баны

- Каждый новый триггер создаёт **новую** запись `UserBan` (история хранится).
- `User.banned_until` обновляется до последнего значения (не суммируется).
- Администратор видит всю историю банов через `GET /api/v1/admin/bans`.
