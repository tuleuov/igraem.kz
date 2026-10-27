# DATA — Модели данных и TypeScript-типы

> SDD refs: **SPEC-03**

---

## 1. Prisma-модели

### `Booking`

```prisma
model Booking {
  id             String   @id @default(uuid())
  ground_id      String
  host_user_id   String
  booking_date   String   // 'YYYY-MM-DD' — локальная дата площадки (UTC+5)
  start_time     String   // 'HH:mm'
  end_time       String   // 'HH:mm'
  status         String   @default("confirmed")
  // 'pending' | 'confirmed' | 'cancelled' | 'cancelled_no_show' | 'completed'
  payment_status String   @default("paid")
  // 'unpaid' | 'paid' | 'refunded'
  is_door_opened Boolean  @default(false)
  total_price    Float
  invite_token   String   @unique @default(uuid())
  is_looking_for_players Boolean @default(false)
  needed_players_count   Int     @default(0)
  auto_approve_players   Boolean @default(false)
  created_at     DateTime @default(now())
}
```

**Таблица полей `Booking`:**

| Поле | Тип Prisma | Nullable | Default | Описание |
|------|-----------|----------|---------|----------|
| `id` | `String` | No | `uuid()` | PK, UUID v4 |
| `ground_id` | `String` | No | — | FK → `Ground.id` |
| `host_user_id` | `String` | No | — | FK → `User.id`, создатель брони |
| `booking_date` | `String` | No | — | `'YYYY-MM-DD'`, дата бронирования |
| `start_time` | `String` | No | — | `'HH:mm'`, начало слота |
| `end_time` | `String` | No | — | `'HH:mm'`, конец слота |
| `status` | `String` | No | `'confirmed'` | Статус жизненного цикла |
| `payment_status` | `String` | No | `'paid'` | Статус оплаты |
| `is_door_opened` | `Boolean` | No | `false` | IoT: дверь открыта |
| `total_price` | `Float` | No | — | Рассчитывается на backend (KZT) |
| `invite_token` | `String` | No | `uuid()` | Уникальный токен приглашения |
| `is_looking_for_players` | `Boolean` | No | `false` | Слот виден в «поиске игроков» |
| `needed_players_count` | `Int` | No | `0` | Макс. количество дополнительных игроков |
| `auto_approve_players` | `Boolean` | No | `false` | Автоодобрение заявок гостей |
| `created_at` | `DateTime` | No | `now()` | Время создания |

---

### `BookingGuest`

```prisma
model BookingGuest {
  id            String   @id @default(uuid())
  booking_id    String
  user_id       String
  type          String   // 'invited' | 'spontaneous_check_in'
  status        String   @default("approved") // 'approved' | 'pending'
  checked_in_at DateTime @default(now())
  created_at    DateTime @default(now())
  @@unique([booking_id, user_id])
}
```

**Таблица полей `BookingGuest`:**

| Поле | Тип Prisma | Nullable | Default | Описание |
|------|-----------|----------|---------|----------|
| `id` | `String` | No | `uuid()` | PK, UUID v4 |
| `booking_id` | `String` | No | — | FK → `Booking.id` |
| `user_id` | `String` | No | — | FK → `User.id` |
| `type` | `String` | No | — | `'invited'` или `'spontaneous_check_in'` |
| `status` | `String` | No | `'approved'` | `'approved'` или `'pending'` |
| `checked_in_at` | `DateTime` | No | `now()` | Время чекина |
| `created_at` | `DateTime` | No | `now()` | Время создания записи |

**Уникальное ограничение:** `@@unique([booking_id, user_id])` — один пользователь не может быть гостем дважды в одном бронировании.

---

## 2. TypeScript Enums

```typescript
// src/types/booking.ts

export enum BookingStatus {
  PENDING           = 'pending',
  CONFIRMED         = 'confirmed',
  CANCELLED         = 'cancelled',
  CANCELLED_NO_SHOW = 'cancelled_no_show',
  COMPLETED         = 'completed',
}

export enum PaymentStatus {
  UNPAID   = 'unpaid',
  PAID     = 'paid',
  REFUNDED = 'refunded',
}

export enum GuestType {
  INVITED             = 'invited',
  SPONTANEOUS_CHECK_IN = 'spontaneous_check_in',
}

export enum GuestStatus {
  APPROVED = 'approved',
  PENDING  = 'pending',
}
```

---

## 3. DTO — Input Types

### `CreateBookingDTO`

Используется в `POST /api/v1/bookings`. Передаётся в теле запроса. `total_price` и `invite_token` **не принимаются** от клиента.

```typescript
export interface CreateBookingDTO {
  ground_id:               string;   // UUID площадки, required
  booking_date:            string;   // 'YYYY-MM-DD', required
  start_time:              string;   // 'HH:mm', required
  end_time:                string;   // 'HH:mm', required, > start_time
  is_looking_for_players?: boolean;  // default: false
  needed_players_count?:   number;   // default: 0, integer >= 0
  auto_approve_players?:   boolean;  // default: false
}
```

| Поле | Тип | Обязательно | Валидация |
|------|-----|:-----------:|-----------|
| `ground_id` | `string` | ✅ | Существующий UUID из `Ground` |
| `booking_date` | `string` | ✅ | `YYYY-MM-DD`, не в прошлом |
| `start_time` | `string` | ✅ | `HH:mm`, в рабочих часах площадки |
| `end_time` | `string` | ✅ | `HH:mm`, > `start_time`, ≤ close_time |
| `is_looking_for_players` | `boolean` | ❌ | — |
| `needed_players_count` | `number` | ❌ | Integer, 0–20 |
| `auto_approve_players` | `boolean` | ❌ | — |

---

### `SpontaneousJoinDTO`

Используется в `POST /api/v1/bookings/spontaneous-join`.

```typescript
export interface SpontaneousJoinDTO {
  ground_id: string;  // UUID площадки для определения активного бронирования
}
```

---

### `CancelBookingDTO`

Тело запроса необязательно, но может содержать причину:

```typescript
export interface CancelBookingDTO {
  reason?: string;  // Опциональная причина отмены, max 500 символов
}
```

---

## 4. Response Types

### `BookingSlot`

Используется в слот-гриде (`GET /api/v1/bookings/all`). Минимальный объект для рендеринга ячейки.

```typescript
export interface BookingSlot {
  id:                    string;
  ground_id:             string;
  booking_date:          string;        // 'YYYY-MM-DD'
  start_time:            string;        // 'HH:mm'
  end_time:              string;        // 'HH:mm'
  status:                BookingStatus;
  is_looking_for_players: boolean;
  needed_players_count:  number;
  approved_guests_count: number;        // Вычисляемое поле
}
```

---

### `BookingResponse`

Полный объект бронирования, возвращаемый в `POST /api/v1/bookings` и `GET /api/v1/bookings/my`.

```typescript
export interface BookingResponse {
  id:                    string;
  ground_id:             string;
  host_user_id:          string;
  booking_date:          string;
  start_time:            string;
  end_time:              string;
  status:                BookingStatus;
  payment_status:        PaymentStatus;
  is_door_opened:        boolean;
  total_price:           number;
  invite_token:          string;
  invite_link:           string;        // Синтетическое поле: `https://igraem.kz/invite/${invite_token}`
  is_looking_for_players: boolean;
  needed_players_count:  number;
  auto_approve_players:  boolean;
  created_at:            string;        // ISO 8601
  guests:                BookingGuestResponse[];
}
```

---

### `BookingGuestResponse`

```typescript
export interface BookingGuestResponse {
  id:           string;
  booking_id:   string;
  user_id:      string;
  type:         GuestType;
  status:       GuestStatus;
  checked_in_at: string;   // ISO 8601
  created_at:   string;    // ISO 8601
  user?: {                 // Populated join
    id:         string;
    name:       string;
    avatar_url: string | null;
  };
}
```

---

## 5. Ошибки (Error Response Shape)

Все ошибки бизнес-логики возвращаются в едином формате:

```typescript
export interface ApiError {
  error: {
    code:    string;   // 'DAILY_LIMIT_EXCEEDED' | 'SLOT_TAKEN' | 'USER_BANNED' | ...
    message: string;   // Человекочитаемое описание (русский)
    details?: unknown; // Опциональные детали
  };
}
```

| `error.code` | HTTP | Правило | Описание |
|---|---|---|---|
| `DAILY_LIMIT_EXCEEDED` | 422 | BOOK-R-01 | Превышен лимит 3 ч/день |
| `SLOT_TAKEN` | 409 | BOOK-R-02 | Слот уже занят |
| `INVALID_STATUS_TRANSITION` | 400 | BOOK-R-03 | Недопустимый переход статуса |
| `USER_BANNED` | 403 | BOOK-R-05 | Пользователь заблокирован |
| `INVITE_EXPIRED` | 410 | BOOK-R-06 | Инвайт-ссылка недействительна |
| `GAME_FULL` | 409 | BOOK-R-07 | Все места заняты |
| `OUTSIDE_WORKING_HOURS` | 422 | BOOK-R-10 | Время вне рабочих часов |
| `NOT_FOUND` | 404 | — | Бронирование не найдено |
| `FORBIDDEN` | 403 | — | Нет прав (не хост) |
