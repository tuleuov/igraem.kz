# 08-API — Business Rules

> SPEC-08 · Source: `src/middlewares/errorHandler.ts`, `src/middlewares/correlationId.ts`, `src/routes/index.ts`

---

## [API-R-01] Correlation ID обязателен в каждом ответе

**Каждый HTTP-ответ**, независимо от статус-кода, должен содержать заголовок `X-Request-Id` (UUID v4).

- Если запрос содержит `X-Request-Id` — сервер отражает его в ответе без изменений.
- Если запрос не содержит `X-Request-Id` — сервер генерирует новый UUID и возвращает его.
- Middleware `correlationId` должен выполняться **первым** в цепочке, до auth и routing.
- Correlation ID пишется в лог на уровне `info` с полями `method`, `path`, `requestId`.

```
Source: src/middlewares/correlationId.ts
```

---

## [API-R-02] Стандартный конверт ответа (Response Envelope)

**Все** ответы API оборачиваются в конверт:

```jsonc
// Успех
{ "success": true,  "data": <T> }

// Ошибка
{ "success": false, "error": "<human-readable message>", "code": "<SCREAMING_SNAKE>" }

// Список с пагинацией
{ "success": true, "data": [<T>], "pagination": { "page": 1, "limit": 20, "total": 150 } }
```

- Поле `data` никогда не бывает `null` в успешных ответах — вместо `null` возвращается `{}` или `[]`.
- Поле `code` в ошибочных ответах **опционально**, но должно присутствовать для всех бизнес-ошибок (не для 500).
- Прямые ответы без конверта (например, `204 No Content`) **запрещены**; вместо этого возвращается `200 { success: true, data: {} }`.

---

## [API-R-03] HTTP-статус коды

| Код | Применение                                                                 |
|-----|----------------------------------------------------------------------------|
| 200 | Успешный запрос (GET, PUT, PATCH, DELETE, POST без создания ресурса)       |
| 201 | Ресурс создан (POST /grounds, POST /bookings, POST /auth/register)         |
| 400 | Невалидные входные данные (Zod validation failure, бизнес-ошибка клиента)  |
| 401 | Отсутствует или невалиден JWT; токен истёк                                 |
| 403 | JWT валиден, но прав недостаточно (не admin, бан, чужой ресурс)            |
| 404 | Ресурс не найден (ground/:id, booking/:id)                                 |
| 409 | Конфликт состояния (слот уже забронирован, пользователь уже в матче)       |
| 500 | Внутренняя ошибка сервера; не раскрывать стек трейс клиенту                |

Правило: **статус-код в HTTP-заголовке всегда совпадает со смысловым состоянием**. Нельзя возвращать `200` с `{ success: false }` — это нарушение контракта.

---

## [API-R-04] Коды ошибок (Error Code Convention)

Формат кода: `DOMAIN_ENTITY_REASON` в `SCREAMING_SNAKE_CASE`.

| Код                        | HTTP | Описание                                    |
|----------------------------|------|---------------------------------------------|
| `AUTH_TOKEN_MISSING`       | 401  | Отсутствует заголовок Authorization         |
| `AUTH_TOKEN_INVALID`       | 401  | JWT не прошёл верификацию                   |
| `AUTH_TOKEN_EXPIRED`       | 401  | JWT истёк                                   |
| `AUTH_INSUFFICIENT_ROLE`   | 403  | Роль пользователя не подходит               |
| `AUTH_USER_BANNED`         | 403  | Пользователь заблокирован                   |
| `GROUND_NOT_FOUND`         | 404  | Площадка с данным ID не существует          |
| `BOOKING_SLOT_TAKEN`       | 409  | Временной слот уже занят                    |
| `BOOKING_NOT_FOUND`        | 404  | Бронирование не найдено                     |
| `BOOKING_WRONG_STATUS`     | 409  | Действие невозможно в текущем статусе       |
| `MATCHMAKING_ALREADY_JOINED`| 409 | Пользователь уже подал заявку               |
| `LOCK_ACCESS_DENIED`       | 403  | Нет активного бронирования для разблокировки|
| `IIN_INVALID_FORMAT`       | 400  | ИИН не соответствует формату (12 цифр)      |
| `IIN_CHECKSUM_FAILED`      | 400  | Контрольная сумма ИИН не прошла             |
| `VALIDATION_ERROR`         | 400  | Общая ошибка валидации Zod                  |
| `INTERNAL_ERROR`           | 500  | Непредвиденная ошибка сервера               |

---

## [API-R-05] Валидация входных данных

- Все request body валидируются через **Zod** schema перед передачей в контроллер.
- При ошибке валидации возвращается `400` с кодом `VALIDATION_ERROR` и человекочитаемым `error`.
- Поля, не описанные в Zod schema, **стрипаются** (`.strip()` по умолчанию, не `.passthrough()`).
- Query-параметры также валидируются через Zod (числа приводятся из строк через `z.coerce.number()`).

---

## [API-R-06] Rate Limiting

| Группа маршрутов             | Лимит                  | Window  | Идентификатор  |
|------------------------------|------------------------|---------|----------------|
| `POST /auth/login`           | 10 запросов            | 15 мин  | IP             |
| `POST /auth/register`        | 5 запросов             | 1 час   | IP             |
| `POST /iin/validate`         | 20 запросов            | 1 час   | IP             |
| `POST /locks/unlock`         | 30 запросов            | 1 мин   | user_id        |
| Все остальные `/api/v1/*`    | 300 запросов           | 1 мин   | user_id / IP   |

- При превышении лимита: `429 Too Many Requests` + заголовок `Retry-After: <seconds>`.
- Ответ: `{ "success": false, "error": "Too many requests", "code": "RATE_LIMIT_EXCEEDED" }`.
- Счётчики хранятся в Redis. Ключ: `rate:<group>:<identifier>`.

---

## [API-R-07] CORS Policy

| Параметр                | Значение                                              |
|-------------------------|-------------------------------------------------------|
| `Access-Control-Allow-Origin` | Whitelist: `https://igraem.kz`, `https://admin.igraem.kz`; `*` в dev |
| `Access-Control-Allow-Methods`| `GET, POST, PUT, PATCH, DELETE, OPTIONS`         |
| `Access-Control-Allow-Headers`| `Authorization, Content-Type, X-Request-Id`     |
| `Access-Control-Expose-Headers`| `X-Request-Id`                                 |
| `Access-Control-Max-Age`| `86400` (preflight кэш 24 часа)                       |
| Credentials             | `true` (cookie-based сессии не используются, но нужно для JWT в заголовке) |

- Preflight OPTIONS запросы возвращают `204 No Content` без тела.
- В production запросы с origin вне whitelist получают `403`.

---

## [API-R-08] Безопасность

- **TLS**: только HTTPS в production; HTTP → HTTPS redirect (301).
- **Helmet**: заголовки `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` выставляются middleware.
- **SQL Injection**: запрещены raw SQL-запросы. Всё через ORM (Prisma) с параметризацией.
- **Sensitive data**: токены, пароли, хэши ИИН **никогда** не логируются и не возвращаются в ответах.
- **Error leakage**: в `500`-ответах клиент получает только `{ success: false, error: "Internal server error", code: "INTERNAL_ERROR" }`. Stack trace только в серверном логе.

---

## [API-R-09] Пагинация

Все коллекционные эндпоинты (возвращающие массив) поддерживают пагинацию через query-параметры:

| Query-параметр | Тип      | Default | Ограничение |
|----------------|----------|---------|-------------|
| `page`         | `number` | `1`     | `>= 1`      |
| `limit`        | `number` | `20`    | `1–100`     |

- При `limit > 100` → `400 VALIDATION_ERROR`.
- `pagination.total` — общее число записей (без пагинации), нужно для клиентского расчёта числа страниц.

---

## [API-R-10] Идемпотентность

- `GET` маршруты **всегда** идемпотентны.
- `DELETE` маршруты идемпотентны: повторное удаление возвращает `200 { success: true, data: {} }` (не `404`).
- `POST` маршруты создания (bookings, grounds) — **не** идемпотентны. Клиент несёт ответственность за дедупликацию через `X-Request-Id`.
- Сервер сохраняет `X-Request-Id` первого успешного `POST` и при повторном запросе с тем же ID возвращает кэшированный ответ (idempotency key, TTL 24h в Redis).
