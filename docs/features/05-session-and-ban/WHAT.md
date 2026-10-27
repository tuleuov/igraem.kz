# WHAT — Feature 05: Session & Ban System
**SPEC-05 | INV-03 | INV-07 | INV-08**

---

## 1. Overview

Feature **05-session-and-ban** управляет двумя взаимосвязанными аспектами платформы Igraem.kz:

1. **Active Session Lifecycle** — что происходит во время активной игровой сессии (от момента открытия двери до завершения игры).
2. **Ban System** — автоматическая и ручная блокировка пользователей за нарушения (overstay, no-show), и запрет действий для заблокированных.

---

## 2. Session Lifecycle

### 2.1 Определение "активной сессии"

Бронирование переходит в статус `active` в момент, когда пользователь открывает дверь (`is_door_opened = true`). До этого момента бронирование находится в статусе `confirmed`.

**Временные рамки сессии** задаются строковыми полями бронирования:
- `booking_date` — дата в формате `YYYY-MM-DD`
- `start_time` — время начала `HH:mm`
- `end_time` — время окончания `HH:mm`

Реальный `DateTime` начала вычисляется на бэкенде как `booking_date + start_time` (timezone: `Asia/Almaty`, UTC+5).

### 2.2 Таймер сессии (INV-07)

- Таймер обратного отсчёта: **55 минут** от `start_time`.
- Показывается на `ActiveSessionScreen` у обеих сторон (host & guest).
- На **5-й минуте до конца** — UI-предупреждение (оранжевый баннер).
- Таймер — клиентский (вычисляется из `start_time` + текущего времени устройства), без WebSocket.

### 2.3 Продление сессии (Extension)

- Хост может нажать «Продлить на 1 час» — бэкенд увеличивает `end_time` на 60 минут.
- Максимум **2 продления** за сессию (`extensionCount` хранится в памяти/сессии, не в БД на текущем этапе).
- После 2-го продления кнопка скрывается.

### 2.4 Завершение сессии

| Роль   | Кнопка             | Action                         |
|--------|--------------------|--------------------------------|
| Host   | «Завершить игру»   | `POST /api/v1/bookings/:id/complete` → статус `completed` |
| Guest  | «Покинуть игру»    | `POST /api/v1/bookings/:id/cancel` → статус `cancelled` |

---

## 3. Ban System

### 3.1 Автоматические баны (INV-03)

Система генерирует записи `UserBan` в двух сценариях:

| Триггер     | Условие                                                             | Статус бронирования     | Длительность |
|-------------|---------------------------------------------------------------------|-------------------------|--------------|
| **Overstay** | Пользователь остаётся в помещении > 5 минут после `end_time`       | `active` → `completed`  | 72 часа      |
| **No-show**  | `is_door_opened = false` AND > 15 минут прошло с `start_time`      | `confirmed` → `cancelled_no_show` | 72 часа |

### 3.2 Ручное управление банами (Admin)

Администраторы могут:
- Просмотреть список всех банов: `GET /api/v1/admin/bans`
- Забанить пользователя вручную: `POST /api/v1/admin/users/:userId/ban`
- Снять бан досрочно: `POST /api/v1/admin/users/:userId/unban`

### 3.3 Последствия бана (INV-08)

Пока `User.is_banned = true` и `User.banned_until > now()`, пользователю **заблокированы**:
- Создание новых бронирований
- Разблокировка двери (smart lock)
- Участие в матчмейкинге
- Принятие приглашений в команду

На клиенте показывается `BannedUserScreen` с обратным отсчётом до снятия бана.

---

## 4. Affected Modules

### Backend
| Файл | Ответственность |
|------|----------------|
| `src/controllers/bookingsController.ts` | `complete`, `cancel` endpoints; overstay ban trigger |
| `src/controllers/adminController.ts` | No-show cron handler; ban/unban admin endpoints |
| `src/services/banService.ts` | Создание `UserBan`, обновление `User.is_banned` / `User.banned_until` |
| `src/middleware/checkBan.ts` | Middleware проверки `is_banned` перед защищёнными действиями |
| `src/cron/checkNoshows.ts` | Cron job, вызывается через `POST /api/v1/admin/bookings/check-noshows` |

### Frontend (client/)
| Файл | Ответственность |
|------|----------------|
| `client/src/screens/ActiveSessionScreen.tsx` | Таймер, кнопки завершения/покидания, orange warning, продление |
| `client/src/screens/BannedUserScreen.tsx` | Баннер с обратным отсчётом до конца бана |
| `client/src/hooks/useSessionTimer.ts` | Клиентский хук для вычисления оставшегося времени |

---

## 5. SDD References

| Код     | Описание |
|---------|---------|
| SPEC-05 | Session & Ban feature specification |
| INV-03  | Auto-ban invariants (overstay, no-show) |
| INV-07  | Session timer rules (55-minute countdown) |
| INV-08  | Banned user action restrictions |
