# 08-API — Complete API Catalog

> SPEC-08 · Source: `src/routes/index.ts` · Base URL: `/api/v1`

Обозначения в колонке **Auth**:
- `—` — публичный маршрут, токен не требуется
- `JWT` — требуется Bearer JWT
- `JWT+admin` — требуется JWT с `role === "admin"`

---

## Health

| Method | Path      | Auth | Description                                       | Spec     |
|--------|-----------|------|---------------------------------------------------|----------|
| GET    | `/health` | —    | Статус сервиса: uptime, версия, состояние базы данных | SPEC-08 |

**Response shape** (не в конверте, прямой объект):
```jsonc
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.4.2",
  "database": { "status": "ok", "latencyMs": 4 }
}
```

---

## Auth — Аутентификация и профиль

| Method | Path               | Auth | Description                                                    | Spec     |
|--------|--------------------|------|----------------------------------------------------------------|----------|
| POST   | `/auth/register`   | —    | Регистрация нового пользователя. Возвращает JWT.               | SPEC-01  |
| POST   | `/auth/login`      | —    | Логин по phone/password. Возвращает JWT.                       | SPEC-01  |
| GET    | `/auth/me`         | JWT  | Профиль текущего пользователя (из JWT sub).                    | SPEC-01  |
| POST   | `/iin/validate`    | —    | Валидация казахстанского ИИН (формат + контрольная сумма).     | SPEC-01  |

### POST `/auth/register` — Request Body

| Поле        | Тип      | Обязательно | Описание                            |
|-------------|----------|-------------|-------------------------------------|
| `phone`     | `string` | ✅          | Номер телефона в формате +7XXXXXXXXXX |
| `password`  | `string` | ✅          | Минимум 8 символов                  |
| `name`      | `string` | ✅          | Отображаемое имя пользователя       |
| `iin`       | `string` | ❌          | ИИН, 12 цифр (опционально)         |

### POST `/auth/login` — Request Body

| Поле       | Тип      | Описание          |
|------------|----------|-------------------|
| `phone`    | `string` | Телефон           |
| `password` | `string` | Пароль            |

---

## Grounds — Спортивные площадки

| Method | Path                          | Auth      | Description                                                     | Spec    |
|--------|-------------------------------|-----------|-----------------------------------------------------------------|---------|
| GET    | `/grounds`                    | —         | Список всех активных площадок (пагинация + фильтры).            | SPEC-02 |
| POST   | `/grounds`                    | JWT+admin | Создание новой площадки.                                        | SPEC-02 |
| PUT    | `/grounds/:id`                | JWT+admin | Обновление площадки по ID.                                      | SPEC-02 |
| GET    | `/grounds/qr/:qr_code_token`  | —         | Получение площадки по QR-коду токену.                           | SPEC-02 |
| POST   | `/grounds/:id/reviews`        | JWT       | Добавление отзыва к площадке.                                   | SPEC-02 |

### GET `/grounds` — Query Parameters

| Параметр   | Тип      | Default | Описание                                    |
|------------|----------|---------|---------------------------------------------|
| `page`     | `number` | `1`     | Номер страницы                              |
| `limit`    | `number` | `20`    | Размер страницы (max 100)                   |
| `sport`    | `string` | —       | Фильтр по виду спорта (football, basketball)|
| `city`     | `string` | —       | Фильтр по городу                            |

### POST `/grounds/:id/reviews` — Request Body

| Поле      | Тип      | Описание                       |
|-----------|----------|--------------------------------|
| `rating`  | `number` | Оценка 1–5                     |
| `comment` | `string` | Текст отзыва (до 1000 символов)|

---

## Bookings — Бронирование

| Method | Path                                        | Auth | Description                                                          | Spec    |
|--------|---------------------------------------------|------|----------------------------------------------------------------------|---------|
| GET    | `/bookings/all`                             | —    | Все публичные бронирования с открытым матчмейкингом.                 | SPEC-03 |
| POST   | `/bookings`                                 | JWT  | Создать новое бронирование.                                          | SPEC-03 |
| GET    | `/bookings/my`                              | JWT  | Бронирования текущего пользователя.                                  | SPEC-03 |
| POST   | `/bookings/:id/cancel`                      | JWT  | Отменить бронирование (только owner или admin).                      | SPEC-03 |
| POST   | `/bookings/:id/complete`                    | JWT  | Завершить бронирование вручную.                                      | SPEC-03 |
| DELETE | `/bookings/:bookingId/guests/:guestId`      | JWT  | Удалить гостя из бронирования.                                       | SPEC-03 |
| PATCH  | `/bookings/:id/matchmaking-settings`        | JWT  | Обновить настройки матчмейкинга бронирования.                        | SPEC-04 |
| GET    | `/bookings/open-matchmaking`                | —    | Бронирования с открытым набором игроков.                             | SPEC-04 |
| POST   | `/bookings/:id/invite-link`                 | JWT  | Сгенерировать ссылку-приглашение для бронирования.                   | SPEC-03 |
| GET    | `/invitations/:token`                       | —    | Получить информацию по токену приглашения.                           | SPEC-03 |
| POST   | `/invitations/:token/accept`                | JWT  | Принять приглашение и войти в бронирование.                          | SPEC-03 |
| POST   | `/bookings/spontaneous-join`                | JWT  | Спонтанное присоединение к открытому бронированию (QR или поиск).   | SPEC-03 |

### POST `/bookings` — Request Body

| Поле              | Тип        | Обязательно | Описание                                      |
|-------------------|------------|-------------|-----------------------------------------------|
| `groundId`        | `string`   | ✅          | UUID площадки                                 |
| `startTime`       | `string`   | ✅          | ISO 8601 дата-время начала                    |
| `endTime`         | `string`   | ✅          | ISO 8601 дата-время конца                     |
| `sport`           | `string`   | ✅          | Вид спорта                                    |
| `isMatchmaking`   | `boolean`  | ❌          | Открыть матчмейкинг (default: false)          |
| `maxPlayers`      | `number`   | ❌          | Макс. игроков при матчмейкинге                |

### PATCH `/bookings/:id/matchmaking-settings` — Request Body

| Поле            | Тип       | Описание                           |
|-----------------|-----------|------------------------------------|
| `isOpen`        | `boolean` | Открыть/закрыть набор              |
| `maxPlayers`    | `number`  | Обновить максимум игроков          |
| `requireApproval`| `boolean`| Требовать одобрения хоста          |

---

## Matchmaking — Заявки на присоединение

| Method | Path                                         | Auth | Description                                                         | Spec    |
|--------|----------------------------------------------|------|---------------------------------------------------------------------|---------|
| POST   | `/matchmaking/join-requests`                 | JWT  | Подать заявку на присоединение к открытому бронированию.            | SPEC-04 |
| POST   | `/matchmaking/join-requests/:id/approve`     | JWT  | Одобрить заявку (только хост бронирования).                         | SPEC-04 |
| POST   | `/matchmaking/join-requests/:id/reject`      | JWT  | Отклонить заявку (только хост бронирования).                        | SPEC-04 |
| GET    | `/bookings/requests`                         | JWT  | Все входящие заявки для бронирований текущего пользователя.         | SPEC-04 |
| GET    | `/bookings/:id/requests`                     | JWT  | Заявки для конкретного бронирования.                                | SPEC-04 |
| POST   | `/bookings/requests/:requestId/respond`      | JWT  | Ответить на заявку (approve/reject, alias endpoint).                | SPEC-04 |

### POST `/matchmaking/join-requests` — Request Body

| Поле        | Тип      | Описание                    |
|-------------|----------|-----------------------------|
| `bookingId` | `string` | UUID целевого бронирования  |
| `message`   | `string` | Сообщение хосту (опционально)|

### POST `/bookings/requests/:requestId/respond` — Request Body

| Поле     | Тип      | Значения           |
|----------|----------|--------------------|
| `action` | `string` | `"approve"` \| `"reject"` |

---

## Locks — Смарт-замки

| Method | Path                    | Auth | Description                                                       | Spec    |
|--------|-------------------------|------|-------------------------------------------------------------------|---------|
| POST   | `/locks/unlock`         | JWT  | Разблокировать замок по ID площадки (проверяет активное бронирование). | SPEC-05 |
| POST   | `/locks/unlock-qr`      | JWT  | Разблокировать замок по QR-коду площадки.                         | SPEC-05 |
| GET    | `/locks/active-access`  | JWT  | Список площадок с активным доступом для текущего пользователя.    | SPEC-05 |

### POST `/locks/unlock` — Request Body

| Поле       | Тип      | Описание              |
|------------|----------|-----------------------|
| `groundId` | `string` | UUID площадки         |

### POST `/locks/unlock-qr` — Request Body

| Поле          | Тип      | Описание                        |
|---------------|----------|---------------------------------|
| `qrCodeToken` | `string` | QR-код токен площадки           |

---

## Admin — Административные маршруты

> Все маршруты `/admin/*` требуют `JWT+admin`. Нарушение → `403 AUTH_INSUFFICIENT_ROLE`.

| Method | Path                                           | Auth      | Description                                               | Spec    |
|--------|------------------------------------------------|-----------|-----------------------------------------------------------|---------|
| GET    | `/admin/gateways`                              | JWT+admin | Список IoT-шлюзов (состояние, онлайн/офлайн).            | SPEC-05 |
| POST   | `/admin/gateways/toggle`                       | JWT+admin | Включить/выключить шлюз.                                  | SPEC-05 |
| GET    | `/admin/lock-logs`                             | JWT+admin | Журнал событий замков (с фильтрами).                      | SPEC-05 |
| GET    | `/admin/stats`                                 | JWT+admin | Агрегированная статистика платформы.                      | SPEC-07 |
| GET    | `/analytics/akimat`                            | JWT+admin | Аналитический отчёт для акимата.                          | SPEC-07 |
| GET    | `/admin/analytics/overview`                    | JWT+admin | Сводная аналитика: бронирования, выручка, активность.     | SPEC-07 |
| GET    | `/admin/analytics/venues/:venueId/heatmap`     | JWT+admin | Тепловая карта загрузки площадки по времени.              | SPEC-07 |
| GET    | `/admin/analytics/venues/:venueId/players`     | JWT+admin | Статистика игроков конкретной площадки.                   | SPEC-07 |
| POST   | `/admin/grounds`                               | JWT+admin | Создать площадку (admin-версия с расширенными полями).    | SPEC-02 |
| PUT    | `/admin/grounds/:id`                           | JWT+admin | Обновить площадку (admin-версия).                         | SPEC-02 |
| GET    | `/admin/bans`                                  | JWT+admin | Список заблокированных пользователей.                     | SPEC-06 |
| GET    | `/admin/users`                                 | JWT+admin | Список всех пользователей (пагинация + поиск).            | SPEC-06 |
| POST   | `/admin/users/:userId/ban`                     | JWT+admin | Заблокировать пользователя.                               | SPEC-06 |
| POST   | `/admin/users/:userId/unban`                   | JWT+admin | Разблокировать пользователя.                              | SPEC-06 |
| POST   | `/admin/bookings/check-noshows`                | JWT+admin | Запустить проверку no-show бронирований вручную.          | SPEC-03 |

### POST `/admin/users/:userId/ban` — Request Body

| Поле     | Тип      | Описание                            |
|----------|----------|-------------------------------------|
| `reason` | `string` | Причина блокировки (для аудита)     |
| `until`  | `string` | ISO 8601 дата окончания (null = навсегда) |

---

## Сводная таблица всех маршрутов

| # | Method | Path | Auth |
|---|--------|------|------|
| 1 | GET | `/health` | — |
| 2 | POST | `/auth/register` | — |
| 3 | POST | `/auth/login` | — |
| 4 | GET | `/auth/me` | JWT |
| 5 | POST | `/iin/validate` | — |
| 6 | GET | `/grounds` | — |
| 7 | POST | `/grounds` | JWT+admin |
| 8 | PUT | `/grounds/:id` | JWT+admin |
| 9 | GET | `/grounds/qr/:qr_code_token` | — |
| 10 | POST | `/grounds/:id/reviews` | JWT |
| 11 | GET | `/bookings/all` | — |
| 12 | POST | `/bookings` | JWT |
| 13 | GET | `/bookings/my` | JWT |
| 14 | POST | `/bookings/:id/cancel` | JWT |
| 15 | POST | `/bookings/:id/complete` | JWT |
| 16 | DELETE | `/bookings/:bookingId/guests/:guestId` | JWT |
| 17 | PATCH | `/bookings/:id/matchmaking-settings` | JWT |
| 18 | GET | `/bookings/open-matchmaking` | — |
| 19 | POST | `/bookings/:id/invite-link` | JWT |
| 20 | GET | `/invitations/:token` | — |
| 21 | POST | `/invitations/:token/accept` | JWT |
| 22 | POST | `/bookings/spontaneous-join` | JWT |
| 23 | POST | `/matchmaking/join-requests` | JWT |
| 24 | POST | `/matchmaking/join-requests/:id/approve` | JWT |
| 25 | POST | `/matchmaking/join-requests/:id/reject` | JWT |
| 26 | GET | `/bookings/requests` | JWT |
| 27 | GET | `/bookings/:id/requests` | JWT |
| 28 | POST | `/bookings/requests/:requestId/respond` | JWT |
| 29 | POST | `/locks/unlock` | JWT |
| 30 | POST | `/locks/unlock-qr` | JWT |
| 31 | GET | `/locks/active-access` | JWT |
| 32 | GET | `/admin/gateways` | JWT+admin |
| 33 | POST | `/admin/gateways/toggle` | JWT+admin |
| 34 | GET | `/admin/lock-logs` | JWT+admin |
| 35 | GET | `/admin/stats` | JWT+admin |
| 36 | GET | `/analytics/akimat` | JWT+admin |
| 37 | GET | `/admin/analytics/overview` | JWT+admin |
| 38 | GET | `/admin/analytics/venues/:venueId/heatmap` | JWT+admin |
| 39 | GET | `/admin/analytics/venues/:venueId/players` | JWT+admin |
| 40 | POST | `/admin/grounds` | JWT+admin |
| 41 | PUT | `/admin/grounds/:id` | JWT+admin |
| 42 | GET | `/admin/bans` | JWT+admin |
| 43 | GET | `/admin/users` | JWT+admin |
| 44 | POST | `/admin/users/:userId/ban` | JWT+admin |
| 45 | POST | `/admin/users/:userId/unban` | JWT+admin |
| 46 | POST | `/admin/bookings/check-noshows` | JWT+admin |
