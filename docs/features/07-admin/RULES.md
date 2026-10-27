# RULES — Admin Feature Business Rules
**SPEC-07** | Igraem.kz — Admin Module

---

## Role & Access Rules

### ADMIN-R-01 — Role Enforcement on Every Admin Route
Каждый запрос к `/api/v1/admin/*` и `/api/v1/analytics/akimat` обязан пройти через middleware `requireAdmin`.  
Middleware декодирует JWT, проверяет `payload.role === 'admin'`. При несовпадении — `403 Forbidden`.  
Отсутствие или невалидность токена — `401 Unauthorized`.

```
requireAdmin = (req, res, next) =>
  if !jwt.valid(req.headers.Authorization) → 401
  if jwt.payload.role !== 'admin'          → 403
  else next()
```

### ADMIN-R-02 — Запрет самоназначения роли
Пользователь не может изменить собственное поле `role` через публичный API.  
Смена роли производится только прямым SQL-запросом или суперадмин-консолью.

### ADMIN-R-03 — Audit Trail для каждого административного действия
Любое мутирующее действие администратора (ban, unban, toggle gateway, create/update ground) **обязано** записывать запись в `AuditLog`:

| Поле | Значение |
|---|---|
| `admin_id` | `req.user.id` из JWT |
| `action` | строка-идентификатор действия (`'BAN_USER'`, `'TOGGLE_GATEWAY'`, etc.) |
| `target_id` | ID объекта-цели (userId, gatewayId, groundId) |
| `meta` | JSON с деталями действия (reason, new_status, etc.) |
| `created_at` | `now()` |

Запись создаётся в `auditLogger.log(action, targetId, meta)` **до** возврата ответа клиенту.  
Если `auditLogger` выбрасывает ошибку — action всё равно выполняется, ошибка логируется в Sentry.

---

## Ban Management Rules

### ADMIN-R-04 — Обязательная причина бана
Поле `reason` в `POST /api/v1/admin/users/:userId/ban` является **обязательным** (non-empty string, min 10 символов).  
При отсутствии или пустом значении — `400 Bad Request` с `{ error: 'REASON_REQUIRED' }`.

### ADMIN-R-05 — Поле `banned_until` обязательно и в будущем
`banned_until` должен быть ISO 8601 datetime **строго в будущем** относительно `now()`.  
При нарушении — `400 Bad Request` с `{ error: 'INVALID_BAN_EXPIRY' }`.

### ADMIN-R-06 — Повторный бан активного пользователя
Если у пользователя уже есть активный бан (`is_resolved = false` и `banned_until > now()`):
- Новый бан **перезаписывает** предыдущий: `is_resolved` старого устанавливается в `true`, создаётся новая запись `UserBan`.
- Это позволяет пролонгировать бан с другой причиной.

### ADMIN-R-07 — Разбан (Unban)
`POST /api/v1/admin/users/:userId/unban` находит последний активный `UserBan` (по `user_id`, `is_resolved = false`) и устанавливает `is_resolved = true`.  
Если активных банов нет — `404 Not Found` с `{ error: 'NO_ACTIVE_BAN' }`.

### ADMIN-R-08 — Бан на конкретную площадку (опциональный `ground_id`)
Если `ground_id` передан в теле запроса, бан является **площадочным** (пользователь не может бронировать именно эту площадку).  
Если `ground_id = null` — бан **глобальный** (пользователь блокируется на всей платформе).

---

## Analytics & Heatmap Rules

### ADMIN-R-09 — Heatmap: вычисление ячейки 7×24
Матрица `heatmap[day][hour]` — процент занятости слота (`0.0 – 1.0`).

```
occupancy(day, hour) =
  COUNT(bookings WHERE weekday=day AND hour=hour AND status='completed')
  / MAX(capacity_per_hour)
```

- `day` ∈ `[0..6]`, где `0 = Monday`.
- `hour` ∈ `[0..23]`.
- Период вычисления: последние **90 дней** по умолчанию; переопределяется query-параметрами `from` / `to`.
- Если данных за ячейку нет — значение `0.0` (не `null`).

### ADMIN-R-10 — Akimat Analytics: область данных
Akimat-отчёт (`GET /api/v1/analytics/akimat`) агрегирует данные **по всем площадкам** за запрошенный период.  
Обязательные query-параметры: `city`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD).  
Максимальный период — **365 дней**; при превышении — `400 Bad Request` с `{ error: 'PERIOD_TOO_LONG' }`.

### ADMIN-R-11 — Akimat: только подтверждённые бронирования
В Akimat-отчёт включаются только бронирования со статусом `'completed'` или `'confirmed'`.  
Отменённые (`'cancelled'`) и неоплаченные (`'pending'`) — **не включаются**.

### ADMIN-R-12 — Overview Analytics: кэширование
`GET /api/v1/admin/analytics/overview` кэшируется в Redis с TTL **5 минут**.  
Ключ кэша: `admin:analytics:overview`.  
При изменении данных (новое бронирование, отмена) кэш **не инвалидируется принудительно** — допускается staleness до 5 минут.

---

## Gateway Rules

### ADMIN-R-13 — Toggle Gateway: допустимые статусы
`POST /api/v1/admin/gateways/toggle` принимает `{ gateway_id, status }`.  
`status` ∈ `['online', 'offline']`. Иное значение — `400 Bad Request`.  
Переключение в тот же статус (idempotent) — `200 OK` без изменений в БД.

### ADMIN-R-14 — Gateway toggle не управляет физическим устройством
Переключение через API изменяет только запись `Gateway.status` в БД.  
Фактическое состояние IoT-устройства определяется им самим (heartbeat-пинг обновляет `last_ping_at`).  
Расхождение между `Gateway.status` и реальным пингом отображается предупреждением на UI.

---

## Lock Log Rules

### ADMIN-R-15 — Пагинация Lock Logs обязательна
`GET /api/v1/admin/lock-logs` требует параметров `page` (default: 1) и `limit` (default: 50, max: 200).  
При `limit > 200` — `400 Bad Request` с `{ error: 'LIMIT_EXCEEDED' }`.

### ADMIN-R-16 — Фильтры Lock Logs
Поддерживаемые query-фильтры:

| Параметр | Тип | Описание |
|---|---|---|
| `ground_id` | `string` | UUID площадки |
| `date` | `string` | YYYY-MM-DD |
| `method` | `string` | `'app_button'` \| `'qr_code'` |
| `success` | `boolean` | `true` \| `false` |

Фильтры комбинируются через `AND`.
