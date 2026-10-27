# SPEC-04 · Smart Locks — Feature Overview (WHAT)

> **Refs:** SPEC-04, INV-04  
> **Source files:** `src/controllers/locksController.ts` · `src/integrations/ttlock/ttlockClient.ts` · `src/services/gatewayHealthService.ts`

---

## 1. Назначение фичи

Фича **Smart Locks** обеспечивает бесконтактный доступ арендаторов на спортивные площадки Igraem.kz через электронные замки TTLock. Пользователь открывает дверь либо кнопкой в мобильном приложении, либо сканированием QR-кода на двери — без физических ключей и участия персонала.

Система реализует полный цикл: проверка права доступа → геолокационная проверка → попытка онлайн-разблокировки через TTLock Cloud API → автоматический откат на офлайн-режим при отсутствии связи → аудит-лог каждой попытки.

---

## 2. TTLock Integration Overview

Платформа интегрируется с **TTLock Cloud API** (REST, OAuth2 Client Credentials). Клиент инкапсулирован в `ttlockClient.ts`.

| Аспект | Детали |
|---|---|
| Auth scheme | OAuth2 Client Credentials (`clientId` + `clientSecret`) |
| Token endpoint | `https://euapi.ttlock.com/oauth2/token` |
| Token storage | In-memory singleton, поле `accessToken: string`, `expiresAt: number` |
| Token refresh trigger | HTTP 401 от TTLock API → немедленный refresh → retry запроса 1 раз |
| Base URL (EU) | `https://euapi.ttlock.com/v3` |
| Unlock endpoint | `POST /lock/unlock` |
| Gateway status | `GET /gateway/list` |
| Rate limits | TTLock: 10 req/sec per client; handled via token bucket in `ttlockClient.ts` |

### Failover Strategy (Online → Offline)

```
TTLock Cloud API
      │
      ├─ SUCCESS ──────────────────────► unlock_type = 'online_cloud'
      │
      └─ FAILURE / timeout (>3s)
            │
            ├─ Gateway ONLINE? ──NO──► unlock_type = 'offline_passcode'
            │      YES                  (6-digit dynamic PIN, TOTP-like, 30s window)
            │
            └─ eKey available? ──YES──► unlock_type = 'offline_ekey'
                    NO
                    └─► Return 503: gateway unreachable, no fallback
```

Все три пути логируются в таблицу `lock_logs` с полем `unlock_type`.

---

## 3. Affected Modules

| Модуль | Роль |
|---|---|
| `locksController.ts` | HTTP handlers: `/unlock`, `/unlock-qr`, `/active-access`, admin endpoints |
| `ttlockClient.ts` | TTLock Cloud API wrapper: token management, unlock calls, gateway queries |
| `gatewayHealthService.ts` | Cron-задача (каждые 3 мин): пингует шлюзы, обновляет `Gateway.status`, пишет `GatewayStatusLog` |
| Prisma ORM | Модели: `Gateway`, `LockLog`, `GatewayStatusLog` |
| INV-04 (Venues feature) | Источник геолокации площадки (`ground.lat`, `ground.lng`); Haversine-проверка ≤50м |
| Bookings feature | Источник активного бронирования (`status = 'confirmed' \| 'active'`) |
| No-show detection | Триггер: первый успешный unlock → `is_door_opened = true` на booking |

---

## 4. User Scenarios

### 4.1 Онлайн-разблокировка (штатный сценарий)
1. Пользователь открывает приложение → нажимает «Открыть дверь».
2. Приложение отправляет `POST /api/v1/locks/unlock` с JWT.
3. Сервер проверяет бронирование и геолокацию.
4. Вызов TTLock Cloud API → команда на замок.
5. Замок открывается; `lock_logs` запись с `success=true`, `unlock_type='online_cloud'`.

### 4.2 Офлайн-разблокировка через QR
1. Пользователь сканирует QR на двери площадки.
2. QR содержит `ground_id`; приложение вызывает `POST /api/v1/locks/unlock-qr`.
3. Если TTLock недоступен — генерируется 6-значный PIN, отображается пользователю.
4. Пользователь вводит PIN на механической клавиатуре замка.

### 4.3 Просмотр активного доступа
- `GET /api/v1/locks/active-access` возвращает текущее активное бронирование + статус шлюза площадки.

---

## 5. Key Non-Functional Requirements

| Параметр | Значение |
|---|---|
| Unlock response latency (online) | ≤ 3 seconds p95 |
| Fallback trigger timeout | 3 секунды (TTLock API timeout) |
| Gateway health check interval | 180 секунд (3 мин) |
| Geolocation radius | 50 метров (Haversine) |
| PIN validity window | 30 секунд |
| Log retention | Все `lock_logs` хранятся бессрочно (compliance) |
