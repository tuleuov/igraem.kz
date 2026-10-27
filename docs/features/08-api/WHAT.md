# 08-API — Что это такое

> SPEC-08 · Source: `src/routes/index.ts`, `src/middlewares/errorHandler.ts`, `src/middlewares/correlationId.ts`

## Назначение

REST API платформы **Igraem.kz** — единственная точка интеграции между мобильными клиентами (iOS/Android), веб-приложением и сторонними системами (акимат, смарт-замки). Все функциональные домены (аутентификация, бронирование, матчмейкинг, замки, аналитика) экспонируются через единый HTTP-сервер с базовым путём `/api/v1`.

---

## Base URL

| Окружение   | Base URL                              |
|-------------|---------------------------------------|
| Production  | `https://api.igraem.kz/api/v1`        |
| Staging     | `https://staging-api.igraem.kz/api/v1`|
| Local       | `http://localhost:3000/api/v1`        |

Все пути в данной документации указаны **без** base URL. Пример: `POST /auth/login` → полный путь `POST /api/v1/auth/login`.

---

## Протокол и формат

- **Transport**: HTTPS (TLS 1.2+). HTTP редиректится на HTTPS в production.
- **Content-Type**: `application/json; charset=utf-8` — обязателен для всех запросов с телом.
- **Accept**: `application/json` — ожидается клиентом.
- **Кодировка**: UTF-8 везде. Казахский и русский текст передаётся as-is (не escape-последовательности).
- **Versioning**: URL-versioning через сегмент `/v1`. Новые breaking changes вводятся в `/v2` без удаления `/v1` в течение 6 месяцев.

---

## Аутентификация

Платформа использует **Bearer JWT** (JSON Web Token, RFC 7519).

### Получение токена

1. `POST /auth/register` → регистрация, возвращает `{ token: string }`.
2. `POST /auth/login` → логин, возвращает `{ token: string }`.

### Передача токена

```
Authorization: Bearer <jwt_token>
```

JWT декодируется middleware `src/middlewares/auth.ts`. Если токен отсутствует или невалиден — `401 Unauthorized`.

### Структура JWT payload

| Поле  | Тип      | Описание                              |
|-------|----------|---------------------------------------|
| `sub` | `string` | UUID пользователя                     |
| `iat` | `number` | Unix timestamp выдачи                 |
| `exp` | `number` | Unix timestamp истечения (24h default)|
| `role`| `string` | `"user"` \| `"admin"`                |

### Защищённые маршруты

Маршруты, помеченные `[JWT]` в каталоге, требуют валидного токена. Маршруты `[JWT, admin]` дополнительно проверяют `role === "admin"` (403 если нет прав).

---

## Correlation ID (X-Request-Id)

Каждый HTTP-запрос и ответ несёт заголовок `X-Request-Id` с UUID v4.

- **Если клиент передал `X-Request-Id`** в запросе — сервер возвращает его же в ответе.
- **Если клиент не передал** — сервер генерирует новый UUID и включает его в ответ.
- Correlation ID логируется на каждом шаге обработки запроса (middleware → route → service → DB).
- Используется для трассировки запросов в Sentry, Datadog и системных логах.

Реализация: `src/middlewares/correlationId.ts`.

---

## Домены API

| Домен          | Префикс                     | Описание                                    |
|----------------|-----------------------------|---------------------------------------------|
| Health         | `/health`                   | Статус сервиса, uptime, версия              |
| Auth           | `/auth`, `/iin`             | Регистрация, логин, профиль, валидация ИИН  |
| Grounds/Venues | `/grounds`                  | CRUD площадок, QR-коды, отзывы              |
| Bookings       | `/bookings`, `/invitations` | Создание, отмена, приглашения, спонтанный   |
| Matchmaking    | `/matchmaking`              | Заявки на присоединение, одобрение/отклонение|
| Locks          | `/locks`                    | Разблокировка замков, активный доступ       |
| Admin          | `/admin`, `/analytics`      | Статистика, баны, управление шлюзами        |

---

## Связанные спецификации

| Spec   | Описание                              |
|--------|---------------------------------------|
| SPEC-01| Auth — регистрация и аутентификация   |
| SPEC-02| Grounds — управление площадками       |
| SPEC-03| Bookings — бронирование               |
| SPEC-04| Matchmaking — матчмейкинг             |
| SPEC-05| Locks — смарт-замки                   |
| SPEC-06| Admin — административная панель       |
| SPEC-07| Analytics — аналитика и акимат        |
| **SPEC-08**| **API — контракты, конвенции**   |
