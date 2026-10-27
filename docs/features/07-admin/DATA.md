# DATA — Admin Feature Data Models
**SPEC-07** | Igraem.kz — Admin Module

---

## 1. Prisma Models

### VenueDailyStats

Агрегированная дневная статистика по площадке. Обновляется ночным cron-джобом (или инкрементно при завершении бронирования).

```prisma
model VenueDailyStats {
  id                   String  @id @default(uuid())
  ground_id            String
  date                 String  // 'YYYY-MM-DD'
  total_bookings       Int     @default(0)
  unique_players_count Int     @default(0)
  peak_hours_occupancy Float   @default(0.0)
  off_peak_occupancy   Float   @default(0.0)
  average_team_size    Float   @default(0.0)
  @@unique([ground_id, date])
}
```

| Поле | Тип | Описание |
|---|---|---|
| `id` | `String` (UUID) | Primary key |
| `ground_id` | `String` (FK → Ground) | ID площадки |
| `date` | `String` | Дата в формате `'YYYY-MM-DD'` |
| `total_bookings` | `Int` | Общее число бронирований за день |
| `unique_players_count` | `Int` | Уникальные игроки (по `user_id`) за день |
| `peak_hours_occupancy` | `Float` | Средняя загруженность в пиковые часы (0.0–1.0) |
| `off_peak_occupancy` | `Float` | Средняя загруженность в непиковые часы (0.0–1.0) |
| `average_team_size` | `Float` | Среднее число игроков на одно бронирование |

---

### UserBan

```prisma
model UserBan {
  id           String   @id @default(uuid())
  user_id      String
  ground_id    String?
  reason       String
  banned_until DateTime
  is_resolved  Boolean  @default(false)
  created_at   DateTime @default(now())
}
```

| Поле | Тип | Описание |
|---|---|---|
| `id` | `String` (UUID) | Primary key |
| `user_id` | `String` (FK → User) | Заблокированный пользователь |
| `ground_id` | `String?` (FK → Ground) | `null` = глобальный бан; значение = площадочный бан |
| `reason` | `String` | Причина бана (min 10 символов, обязательно) |
| `banned_until` | `DateTime` | Дата истечения бана (строго в будущем) |
| `is_resolved` | `Boolean` | `true` = бан снят (разбан или истёк) |
| `created_at` | `DateTime` | Дата создания бана |

---

### Gateway

```prisma
model Gateway {
  status       String    // 'online' | 'offline'
  last_ping_at DateTime
}
```

| Поле | Тип | Описание |
|---|---|---|
| `status` | `String` | `'online'` или `'offline'` — ручной override |
| `last_ping_at` | `DateTime` | Время последнего heartbeat от IoT-устройства |

> **Примечание:** расхождение между `status` и `last_ping_at` (пинг > 5 мин назад при `status = 'online'`) сигнализирует о проблеме с устройством. UI показывает предупреждение.

---

### LockLog

```prisma
model LockLog {
  method      String  // 'app_button' | 'qr_code'
  unlock_type String  // 'online_cloud' | 'offline_passcode' | 'offline_ekey'
  success     Boolean
}
```

| Поле | Тип | Описание |
|---|---|---|
| `method` | `String` | Способ инициации: `'app_button'` или `'qr_code'` |
| `unlock_type` | `String` | Механизм открытия: `'online_cloud'`, `'offline_passcode'`, `'offline_ekey'` |
| `success` | `Boolean` | Результат попытки открытия замка |

---

## 2. TypeScript Types

### AkimatReport

Отчёт для государственных органов (Акимат). Генерируется по запросу за указанный период и город.

```typescript
interface AkimatReport {
  city: string;              // Город (напр. 'Almaty', 'Astana')
  period: {
    from: string;            // 'YYYY-MM-DD'
    to:   string;            // 'YYYY-MM-DD'
  };
  total_bookings: number;    // Общее число confirmed/completed бронирований
  unique_players: number;    // Уникальные игроки за период
  total_hours_played: number; // Суммарных часов игры (sum of slot durations)
  venues_count: number;      // Число активных площадок в городе за период
  bookings_by_sport: Array<{
    sport_type: string;      // 'football' | 'basketball' | 'tennis' | etc.
    bookings:   number;
    hours:      number;
  }>;
  bookings_by_district: Array<{
    district: string;
    bookings: number;
  }>;
  generated_at: string;      // ISO 8601 timestamp генерации
}
```

---

### VenueHeatmapData

7-дневная × 24-часовая матрица загруженности площадки. `matrix[day][hour]` ∈ `[0.0, 1.0]`.

```typescript
interface VenueHeatmapData {
  venue_id: string;
  period: {
    from: string; // 'YYYY-MM-DD'
    to:   string; // 'YYYY-MM-DD'
  };
  // matrix[0] = Monday ... matrix[6] = Sunday
  // matrix[d][h] = occupancy ratio for weekday d, hour h
  matrix: [
    [number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number], // Mon
    [number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number], // Tue
    [number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number], // Wed
    [number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number], // Thu
    [number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number], // Fri
    [number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number], // Sat
    [number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number,
     number, number, number, number, number, number, number, number]  // Sun
  ]; // 7 rows × 24 columns
  peak_hour: number;         // Hour with highest overall occupancy [0..23]
  peak_day: number;          // Weekday index with highest overall occupancy [0..6]
}
```

---

### AdminBanDTO

DTO для создания бана через `POST /api/v1/admin/users/:userId/ban`.

```typescript
interface AdminBanDTO {
  reason:       string;   // min 10 chars, required
  banned_until: string;   // ISO 8601 datetime, must be > now()
  ground_id?:   string;   // optional: scope ban to specific venue (UUID)
}
```

---

### SystemStats

Системная статистика сервера и БД, возвращаемая `GET /api/v1/admin/stats`.

```typescript
interface SystemStats {
  uptime_seconds:      number;  // Process uptime in seconds
  db_pool_size:        number;  // Active Prisma connection pool size
  db_query_latency_ms: number;  // Avg DB query latency (last 100 queries)
  redis_latency_ms:    number;  // Redis PING latency
  active_bookings:     number;  // Bookings with status 'confirmed' right now
  gateways: {
    total:   number;
    online:  number;
    offline: number;
  };
  collected_at: string;         // ISO 8601 timestamp
}
```

---

## 3. Enum Values (Reference)

### Gateway.status
| Значение | Описание |
|---|---|
| `'online'` | Шлюз доступен (ручной или автоматический статус) |
| `'offline'` | Шлюз недоступен / на обслуживании |

### LockLog.method
| Значение | Описание |
|---|---|
| `'app_button'` | Нажатие кнопки в мобильном приложении |
| `'qr_code'` | Сканирование QR-кода на площадке |

### LockLog.unlock_type
| Значение | Описание |
|---|---|
| `'online_cloud'` | Открытие через облако в реальном времени |
| `'offline_passcode'` | Открытие офлайн-паролем (когда нет сети) |
| `'offline_ekey'` | Открытие офлайн-ключом (Bluetooth eKey) |
