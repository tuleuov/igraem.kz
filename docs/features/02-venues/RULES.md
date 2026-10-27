# SPEC-02 · Venues — Business Rules

> Feature code: **SPEC-02**  
> Rule namespace: `VEN-R-*`

---

## Сводная таблица правил

| Код        | Область                  | Краткое описание                                              | Severity   |
|------------|--------------------------|---------------------------------------------------------------|------------|
| VEN-R-01   | School court lockout     | Блокировка слотов пн–пт 08:00–15:00 для школьных кортов      | HARD BLOCK |
| VEN-R-02   | Geolocation radius       | Разблокировка только в радиусе ≤ 50 м (Haversine)            | HARD BLOCK |
| VEN-R-03   | QR token uniqueness      | `qr_code_token` уникален на уровне БД, UUID v4               | CONSTRAINT |
| VEN-R-04   | Rating computation       | Агрегация `AVG(Review.rating)` → `Ground.rating`             | COMPUTED   |
| VEN-R-05   | Operating hours          | Бронирование только в рамках `operating_schedule`             | HARD BLOCK |
| VEN-R-06   | Sport type validation    | `type` ∈ { `football`, `volleyball`, `basketball` }          | VALIDATION |
| VEN-R-07   | Review eligibility       | Отзыв только от пользователя с завершённым бронированием      | AUTH GUARD |
| VEN-R-08   | Admin-only write         | POST / PUT площадок — только роль `admin` (JWT claim)        | AUTH GUARD |
| VEN-R-09   | Gateway status           | Gateway со статусом `offline` блокирует разблокировку замка   | HARD BLOCK |

---

## VEN-R-01 — School Court Lockout

**Описание:** Площадки, принадлежащие школам (`is_school_court = true`), недоступны для бронирования в учебные часы.

**Параметры (хранятся в `Ground`):**

| Поле                | Значение по умолчанию | Смысл                                    |
|---------------------|-----------------------|------------------------------------------|
| `is_school_court`   | `true`                | Признак школьной площадки                |
| `school_hours_start`| `"08:00"`             | Начало блокировки (локальное время)      |
| `school_hours_end`  | `"15:00"`             | Конец блокировки (локальное время)       |
| `school_days`       | `"MON_FRI"`           | Дни блокировки (пн–пт)                   |

**Алгоритм проверки (псевдокод):**
```ts
function isSchoolLocked(ground: Ground, slotStart: Date): boolean {
  if (!ground.is_school_court) return false;
  const dayOfWeek = getDayOfWeek(slotStart); // 0=Sun … 6=Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // MON_FRI
  const timeStr = toTimeString(slotStart); // "HH:MM"
  return isWeekday
    && timeStr >= ground.school_hours_start
    && timeStr < ground.school_hours_end;
}
```

**Поведение при нарушении:** Слот помечается `status: "blocked"` в ответе API. Попытка забронировать → HTTP 409 `SCHOOL_HOURS_LOCKED`.

---

## VEN-R-02 — Geolocation Unlock Radius

**Описание:** Пользователь может разблокировать замок ворот только если его геопозиция находится в пределах `allowed_radius_meters` (по умолчанию 50 м) от координат площадки.

**Формула Haversine:**
```ts
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Usage
const distance = haversineDistance(userLat, userLon, ground.latitude, ground.longitude);
if (distance > ground.allowed_radius_meters) throw new GeoError("OUT_OF_RADIUS");
```

**Поведение при нарушении:** HTTP 403 `GEO_OUT_OF_RADIUS`. Замок не открывается. TTLock API не вызывается.

---

## VEN-R-03 — QR Token Uniqueness

**Описание:** Поле `Ground.qr_code_token` — UUID v4, генерируется при создании площадки и никогда не меняется. Уникальность гарантируется constraint `@unique` в Prisma.

- **Генерация:** `crypto.randomUUID()` на сервере при POST `/api/v1/grounds`.
- **Использование:** GET `/api/v1/grounds/qr/:qr_code_token` → возвращает `GroundDTO` + инициирует процедуру разблокировки.
- **Ротация:** Только вручную администратором (PUT `/api/v1/grounds/:id` с новым `qr_code_token`). При ротации старый QR немедленно инвалидируется.
- **При нарушении (коллизия):** HTTP 409 `QR_TOKEN_CONFLICT` — практически невозможно для UUID v4, но обрабатывается.

---

## VEN-R-04 — Rating Computation

**Описание:** `Ground.rating` — денормализованный агрегат, обновляемый при каждом создании `Review`.

**Алгоритм:**
```ts
// После сохранения нового Review:
const { _avg } = await prisma.review.aggregate({
  where: { ground_id: groundId },
  _avg: { rating: true },
});
await prisma.ground.update({
  where: { id: groundId },
  data: { rating: _avg.rating ?? 0 },
});
```

- Диапазон: `1.0` – `5.0`. Начальное значение: `0.0` (нет отзывов).
- Точность хранения: `Float` (2 знака после запятой при выводе в API).
- `Review.rating` ∈ { 1, 2, 3, 4, 5 } — валидация на уровне контроллера.

---

## VEN-R-05 — Operating Hours Enforcement

**Описание:** Слоты бронирования генерируются только в пределах `Ground.operating_schedule`.

- Формат поля: `"HH:MM - HH:MM"` (строка), например `"08:00 - 23:00"`.
- Парсинг: разбить по `" - "`, получить `openTime` и `closeTime`.
- Попытка забронировать слот за пределами расписания → HTTP 409 `OUTSIDE_OPERATING_HOURS`.
- Расписание указывается в локальном времени (Астана UTC+5, Алматы UTC+5).

---

## VEN-R-06 — Sport Type Validation

**Описание:** Поле `Ground.type` допускает строго три значения.

```ts
const VALID_TYPES = ['football', 'volleyball', 'basketball'] as const;
type SportType = typeof VALID_TYPES[number];
```

При создании / обновлении — проверка на уровне контроллера. Невалидное значение → HTTP 400 `INVALID_SPORT_TYPE`.

---

## VEN-R-07 — Review Eligibility

**Описание:** Пользователь может оставить отзыв только при наличии **завершённого** (`status: "completed"`) бронирования на данной площадке.

- Повторный отзыв от одного пользователя на одну площадку запрещён (`ground_id + user_id` — уникальная пара).
- При нарушении → HTTP 403 `REVIEW_NOT_ELIGIBLE` или HTTP 409 `REVIEW_ALREADY_EXISTS`.

---

## VEN-R-08 — Admin-Only Write Access

**Описание:** Создание и обновление площадок (`POST`, `PUT`) требуют JWT-токена с claim `role: "admin"`.

- Middleware проверяет `req.user.role === 'admin'`.
- При нарушении → HTTP 403 `FORBIDDEN`.
- Чтение (`GET`) доступно всем, включая анонимных пользователей.

---

## VEN-R-09 — Gateway Offline Block

**Описание:** Если связанный `Gateway` имеет статус `offline`, вызов TTLock API для разблокировки не производится.

- Проверка: `Gateway.status === 'offline'` → HTTP 503 `GATEWAY_OFFLINE`.
- `Gateway.last_ping_at` обновляется TTLock webhook'ом каждые 60 с.
- Если `last_ping_at` старше 5 минут — Gateway автоматически помечается `offline` фоновым job'ом.
