# SPEC-06 · Matchmaking — Data Models

> **SDD refs:** SPEC-06  
> Источник: `prisma/schema.prisma`, `src/types/matchmaking.ts`

---

## 1. Prisma Models

### 1.1 Booking (matchmaking-поля)

> Полная модель `Booking` описана в SPEC-01. Здесь — только поля, добавлённые в SPEC-06.

```prisma
model Booking {
  // ... existing fields (id, venue_id, court_id, user_id, start_time, end_time, status, ...)

  // ── MATCHMAKING (SPEC-06) ──────────────────────────────────────────────────
  is_looking_for_players Boolean @default(false)
  needed_players_count   Int     @default(0)
  auto_approve_players   Boolean @default(false)
  invite_token           String  @unique @default(uuid())

  // Relations
  guests       BookingGuest[]
  joinRequests JoinRequest[]
}
```

| Поле | Тип | Default | Описание |
|---|---|---|---|
| `is_looking_for_players` | `Boolean` | `false` | Слот открыт для поиска игроков |
| `needed_players_count` | `Int` | `0` | Сколько игроков нужно (0 = без лимита, MM-R-05) |
| `auto_approve_players` | `Boolean` | `false` | Автоматическое одобрение заявок (MM-R-09) |
| `invite_token` | `String` | `uuid()` | Уникальный токен инвайт-ссылки, `@unique` (MM-R-17) |

---

### 1.2 BookingGuest

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

  // Relations
  booking Booking @relation(fields: [booking_id], references: [id])
  user    User    @relation(fields: [user_id], references: [id])
}
```

| Поле | Тип | Default | Описание |
|---|---|---|---|
| `id` | `String` | `uuid()` | Первичный ключ |
| `booking_id` | `String` | — | FK → `Booking.id` |
| `user_id` | `String` | — | FK → `User.id` |
| `type` | `String` | — | `'invited'` или `'spontaneous_check_in'` |
| `status` | `String` | `'approved'` | `'approved'` или `'pending'` |
| `checked_in_at` | `DateTime` | `now()` | Момент check-in (для spontaneous — время сканирования QR) |
| `created_at` | `DateTime` | `now()` | Время создания записи |

> **Unique constraint:** `@@unique([booking_id, user_id])` — один пользователь может быть гостем бронирования только один раз.

---

### 1.3 JoinRequest

```prisma
model JoinRequest {
  id         String   @id @default(uuid())
  booking_id String
  user_iin   String
  user_name  String
  user_phone String
  status     String   @default("PENDING") // 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at DateTime @default(now())

  // Relations
  booking Booking @relation(fields: [booking_id], references: [id])
}
```

| Поле | Тип | Default | Описание |
|---|---|---|---|
| `id` | `String` | `uuid()` | Первичный ключ |
| `booking_id` | `String` | — | FK → `Booking.id` |
| `user_iin` | `String` | — | ИИН пользователя (для идентификации и дубль-чека MM-R-13) |
| `user_name` | `String` | — | Отображаемое имя для хоста |
| `user_phone` | `String` | — | Телефон для связи |
| `status` | `String` | `'PENDING'` | Статус машины состояний: `PENDING` → `APPROVED` / `REJECTED` |
| `created_at` | `DateTime` | `now()` | Время подачи заявки |

---

## 2. TypeScript Types

> Файл: `src/types/matchmaking.ts`

### 2.1 Enums

```typescript
/** Статус заявки на присоединение. SPEC-06, MM-R-12 */
export enum JoinRequestStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Тип гостя бронирования. SPEC-06 */
export enum GuestType {
  INVITED              = 'invited',
  SPONTANEOUS_CHECK_IN = 'spontaneous_check_in',
}

/** Статус гостя бронирования */
export enum GuestStatus {
  APPROVED = 'approved',
  PENDING  = 'pending',
}
```

---

### 2.2 MatchmakingSettings

```typescript
/** 
 * Настройки матчмейкинга для бронирования.
 * PATCH /api/v1/bookings/:id/matchmaking-settings
 * Поля соответствуют Booking-модели Prisma (SPEC-06).
 */
export interface MatchmakingSettings {
  /** Открыть/закрыть слот для поиска игроков. MM-R-01, MM-R-02 */
  is_looking_for_players: boolean;

  /** 
   * Количество нужных игроков. 0 = без лимита. 
   * Range: 0–50. MM-R-05, MM-R-08 
   */
  needed_players_count: number;

  /** 
   * Автоматически одобрять заявки.
   * При true — JoinRequest сразу APPROVED + BookingGuest создаётся. MM-R-09 
   */
  auto_approve_players: boolean;
}
```

---

### 2.3 JoinRequestDTO

```typescript
/** Тело запроса POST /api/v1/matchmaking/join-requests */
export interface JoinRequestCreateDTO {
  /** ID бронирования, к которому присоединяется пользователь */
  booking_id: string;
  /** ИИН пользователя (берётся из JWT-профиля или передаётся явно) */
  user_iin: string;
  /** Имя для отображения хосту */
  user_name: string;
  /** Телефон для связи с хостом */
  user_phone: string;
}

/** Ответ: созданная или обновлённая JoinRequest */
export interface JoinRequestResponseDTO {
  id: string;
  booking_id: string;
  user_iin: string;
  user_name: string;
  user_phone: string;
  status: JoinRequestStatus;
  created_at: string; // ISO 8601

  /** 
   * Присутствует только при auto_approve = true.
   * Если гость создан немедленно — возвращается объект BookingGuest. MM-R-09 
   */
  guest?: BookingGuestDTO;
}

/** Представление гостя бронирования */
export interface BookingGuestDTO {
  id: string;
  booking_id: string;
  user_id: string;
  type: GuestType;
  status: GuestStatus;
  checked_in_at: string; // ISO 8601
  created_at: string;    // ISO 8601
}
```

---

### 2.4 OpenMatchmakingSlotDTO

```typescript
/** Элемент списка GET /api/v1/bookings/open-matchmaking */
export interface OpenMatchmakingSlotDTO {
  booking_id: string;
  venue_id: string;
  venue_name: string;
  court_id: string;
  court_name: string;
  start_time: string;   // ISO 8601
  end_time: string;     // ISO 8601
  host_name: string;
  /** Вычисляется: needed_players_count - count(approved guests). null если unlimited. */
  spots_left: number | null;
  sport_type: string;
}
```

---

### 2.5 SpontaneousJoinDTO

```typescript
/** Тело запроса POST /api/v1/bookings/spontaneous-join */
export interface SpontaneousJoinDTO {
  /** Из QR-кода площадки */
  venue_id: string;
  /** Из QR-кода площадки */
  court_id: string;
}
```

---

## 3. Индексы и ограничения

| Модель | Constraint | Тип | Назначение |
|---|---|---|---|
| `Booking` | `invite_token` | `@unique` | Уникальность токена инвайта по всей таблице |
| `BookingGuest` | `[booking_id, user_id]` | `@@unique` | Один гость — одно бронирование |
| `JoinRequest` | — | нет unique | Дубль проверяется на уровне бизнес-логики (MM-R-13) по `booking_id + user_iin` |
