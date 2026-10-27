# GLOSSARY — Igraem.kz Domain Terms

> Единый словарь терминов платформы. Используется как источник истины для всех feature-спеков, API-документов и UI-копирайтинга.  
> Mix: RU/KZ бизнес-термины + EN технические имена (field names, enum values, API paths).

---

## Правила именования

- **DB / API / Code**: `camelCase` для полей, `PascalCase` для моделей, `SCREAMING_SNAKE_CASE` для enum-констант.
- **UI copy (RU)**: термин из столбца «Term (KZ/RU)» ниже — строго без произвольных синонимов.
- **Logs / Correlation**: всегда включать `correlationId` (см. строку «Корреляционный ID»).

---

## Таблица терминов

| # | Term (KZ/RU) | English | Prisma Model / Enum / Field | Definition | First Used In Feature |
|---|---|---|---|---|---|
| 1 | **ИИН** (Индивидуальный Идентификационный Номер) | IIN — Kazakhstan National ID | `User.iin: String` (12 chars, unique) | 12-значный государственный идентификатор гражданина РК. Обязателен при регистрации. Валидация: regex `/^\d{12}$/`, проверка контрольной суммы по алгоритму МЮ РК. Хранится в зашифрованном виде (AES-256). | `AUTH` — Регистрация |
| 2 | **TTLock** | TTLock Smart Lock Platform | N/A (external Cloud API) | Китайская облачная платформа управления умными замками. REST API: `https://euapi.ttlock.com/v3/`. Аутентификация: OAuth2 `client_credentials`. Используется для выдачи PIN-кодов, eKey, управления шлюзами. SDK: `@ttlock-sdk/node`. | `LOCK` — Управление замком |
| 3 | **Организатор** | Host | `Booking.hostUserId: String` | Пользователь, создавший бронирование. Обладает расширенными правами в рамках сессии: приглашать участников, расширять время, завершать сессию досрочно. Enum роль в контексте бронирования: `BookingRole.HOST`. | `BOOKING` — Создание брони |
| 4 | **Участник** | Guest / Player | `BookingParticipant.userId: String`, `role: BookingRole.GUEST` | Пользователь, вступивший в бронирование через invite-ссылку, QR-код площадки или одобренную ЗаявкуНаВступление. Может открыть замок, но не может расширить сессию или изменить состав участников. | `BOOKING` — Участие |
| 5 | **Площадка** | Ground / Venue | `Venue` model: `id`, `name`, `city`, `sportType`, `lockId`, `gatewayId`, `lat`, `lng` | Спортивный объект с TTLock-замком на воротах. Принадлежит одному из 4 городов: `TEMIRTAU`, `KARAGANDA`, `ASTANA`, `ALMATY`. Тип спорта: `SportType` enum — `FOOTBALL`, `VOLLEYBALL`, `BASKETBALL`. | `VENUE` — Каталог площадок |
| 6 | **Шлюз** | Gateway | `Gateway` model: `id`, `venueId`, `ttlockGatewayId`, `status: GatewayStatus` | TTLock WiFi-шлюз (физическое устройство), установленный на площадке. Обеспечивает связь облака TTLock с замком. Статусы: `GatewayStatus.ONLINE` / `GatewayStatus.OFFLINE`. При `OFFLINE` — активируется оффлайн-фолбэк. | `LOCK` — Управление замком |
| 7 | **Бронирование** | Booking | `Booking` model: `id`, `venueId`, `hostUserId`, `startTime`, `endTime`, `status: BookingStatus` | Резервирование временного слота на площадке. `startTime` / `endTime` — UTC timestamp, ISO 8601. Статусы: `PENDING`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`. Минимальная длительность: 1 час (1 слот). | `BOOKING` — Создание брони |
| 8 | **Матчмейкинг** | Matchmaking | `Booking.isPublic: Boolean`, `JoinRequest` model | Фича поиска других игроков для заполнения открытых слотов в бронировании. Организатор публикует бронь (`isPublic=true`), система показывает её в ленте. Игроки подают ЗаявкуНаВступление или вступают по QR/invite. | `MATCHMAKING` — Матчмейкинг |
| 9 | **ЗаявкаНаВступление** | JoinRequest | `JoinRequest` model: `id`, `bookingId`, `userId`, `status: JoinRequestStatus`, `createdAt` | Запрос игрока на вступление в публичное бронирование. Статусы: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`. Организатор получает push-уведомление и одобряет/отклоняет в течение 10 мин, иначе авто-отклонение. | `MATCHMAKING` — Матчмейкинг |
| 10 | **Овертайм** | Overstay | `Session.overstayDetectedAt: DateTime?`, `User.banCount: Int` | Пребывание на площадке более чем на 5 минут после `endTime` бронирования. Детектируется через TTLock-события (gate still unlocked). Триггерит автоматический бан (`BanRecord` с `reason: BAN_REASON.OVERSTAY`). Порог: `OVERSTAY_THRESHOLD_MINUTES = 5`. | `SESSION` — Активная сессия |
| 11 | **No-show** | No-show | `Booking.status: BookingStatus.NO_SHOW`, `BanRecord.reason: BAN_REASON.NO_SHOW` | Ситуация, когда организатор не совершил вход на площадку (не открыл замок) в течение 15 минут после `startTime`. Cron-job `checkNoShow` запускается каждые 5 мин. Триггерит автоматический бан. Порог: `NO_SHOW_THRESHOLD_MINUTES = 15`. | `SESSION` — Активная сессия |
| 12 | **Бан** | Ban | `BanRecord` model: `id`, `userId`, `reason: BanReason`, `bannedAt`, `expiresAt`, `isActive` | 72-часовая блокировка аккаунта. `expiresAt = bannedAt + 72h`. В период бана: невозможно создать или присоединиться к бронированию. UI показывает оранжевый баннер с таймером обратного отсчёта. Enum `BanReason`: `OVERSTAY`, `NO_SHOW`, `MANUAL`. | `AUTH` — Управление аккаунтом |
| 13 | **ОтключённыйШлюз** | Offline Gateway | `Gateway.status: GatewayStatus.OFFLINE`, `OfflineFallbackEvent` model | Состояние шлюза при потере связи с TTLock Cloud. Система автоматически переключается на оффлайн-режим: выдаёт PIN-код или eKey. Событие логируется в `OfflineFallbackEvent`. Алерт администратору — через Telegram-bot и email. | `LOCK` — Оффлайн-фолбэк |
| 14 | **PIN-код** | Offline Passcode | `OfflinePasscode` model: `id`, `bookingId`, `code: String(6)`, `validFrom`, `validTo`, `used: Boolean` | 6-значный динамический код для открытия замка без интернета. Генерируется TTLock API (`/v3/keyboardPwd/get`) заблаговременно (за 30 мин до `startTime`). Действителен строго в период бронирования. Одноразовый. | `LOCK` — Оффлайн-фолбэк |
| 15 | **eKey** | Offline eKey | `EKey` model: `id`, `bookingId`, `ttlockEkeyId`, `startDate`, `endDate`, `sent: Boolean` | Bluetooth-метод открытия замка без интернета через мобильное приложение TTLock. Передаётся на телефон пользователя через TTLock API (`/v3/key/send`). Требует BT на телефоне, не требует WiFi. Резервный метод после PIN. | `LOCK` — Оффлайн-фолбэк |
| 16 | **Акимат** | Akimat | N/A (external recipient) | Местный исполнительный орган (городская администрация) Казахстана. Получает агрегированные отчёты об использовании государственных спортивных объектов: загруженность площадок, количество игроков, временны́е паттерны. Отчёты: XLSX + JSON, ежемесячно. | `ANALYTICS` — Гражданская аналитика |
| 17 | **Школьные часы** | School Hours | `VenueSchedule.schoolHoursEnabled: Boolean`, `SCHOOL_HOURS_START = "08:00"`, `SCHOOL_HOURS_END = "15:00"` | Период Пн–Пт с 08:00 до 15:00, когда школьные корты заблокированы для публичного бронирования. Применяется только к площадкам с `Venue.isSchoolCourt = true`. В это время слоты недоступны в сетке бронирования. Часовой пояс: `Asia/Almaty` (UTC+5). | `BOOKING` — Сетка слотов |
| 18 | **ОтметкаГеолокации** | Geolocation Check | `GeolocationCheck` model: `bookingId`, `userId`, `lat`, `lng`, `distance`, `passed: Boolean`, `checkedAt` | Проверка по формуле Гаверсинуса перед разблокировкой замка. Пользователь должен находиться на расстоянии ≤50 м от координат площадки (`Venue.lat`, `Venue.lng`). При провале — замок не открывается, UI показывает ошибку с картой. Порог: `GEO_CHECK_RADIUS_METERS = 50`. | `LOCK` — Проверка геолокации |
| 19 | **QR-код площадки** | Venue QR | `VenueQR` model: `id`, `venueId`, `token: String(uuid)`, `createdAt`, `revokedAt?` | Уникальный QR-токен, физически размещённый на воротах площадки. Сканирование инициирует спонтанный чекин или вступление в активное бронирование без предварительного invite. URL: `/api/venues/:venueId/qr/checkin?token=<uuid>`. Токен сбрасывается при компрометации. | `LOCK` — QR-чекин |
| 20 | **Корреляционный ID** | Correlation ID | HTTP Header: `X-Request-Id: <uuid-v4>`, `req.correlationId` (Express middleware) | UUID v4, генерируется клиентом или gateway при каждом HTTP-запросе. Прокидывается через все микросервисы и логируется в каждой строке лога (`logger.info({ correlationId }, 'msg')`). Обязателен для трейсинга в prod. Middleware: `src/middleware/correlationId.ts`. | Все feature (cross-cutting) |
| 21 | **Слот** | Slot | `Slot` (virtual, not persisted): `{ date: string, hour: number, venueId: string, available: boolean }` | Один 1-часовой блок в сетке бронирования. Генерируется на лету из рабочих часов площадки и существующих броней. В UI: ячейка высотой `SLOT_HEIGHT_PX = 64px` в вертикальном тайм-гриде. Недоступные слоты окрашены в `#E5E7EB` (gray-200). | `BOOKING` — Сетка слотов |
| 22 | **Сессия** | Active Session | `Session` model: `id`, `bookingId`, `startedAt`, `endsAt`, `status: SessionStatus`, `extensionCount: Int` | Активный период игры длительностью 55 минут (с буфером 5 мин до конца бронирования для предупреждения). Создаётся при первом открытии замка. Статусы: `ACTIVE`, `WARNING`, `EXTENDED`, `COMPLETED`, `OVERSTAY`. | `SESSION` — Активная сессия |
| 23 | **Предупреждение** | Warning (Session) | `Session.status: SessionStatus.WARNING`, UI: оранжевый баннер | Оранжевый UI-алерт, появляющийся за 5 минут до окончания сессии (`endsAt - 5min`). Push-уведомление + in-app баннер. Организатор видит кнопку «Расширить сессию». Цвет: `#F97316` (orange-500). | `SESSION` — Активная сессия |
| 24 | **Расширение сессии** | Session Extension | `Session.extensionCount: Int` (max: 2), `SessionExtension` model: `id`, `sessionId`, `extendedAt`, `extraMinutes: 60` | Организатор может продлить сессию на 1 час, максимум 2 раза за бронирование (`MAX_EXTENSIONS = 2`). Доступно только если следующий слот свободен. Фиксируется в `SessionExtension`. Стоимость расширения списывается с баланса. | `SESSION` — Расширение |

---

## Enum Definitions (справочник)

```typescript
// Prisma schema enums — единый источник истины

enum BookingStatus {
  PENDING
  CONFIRMED
  ACTIVE
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum BookingRole {
  HOST
  GUEST
}

enum JoinRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum GatewayStatus {
  ONLINE
  OFFLINE
}

enum SessionStatus {
  ACTIVE
  WARNING      // T-5 min
  EXTENDED
  COMPLETED
  OVERSTAY
}

enum BanReason {
  OVERSTAY
  NO_SHOW
  MANUAL
}

enum SportType {
  FOOTBALL
  VOLLEYBALL
  BASKETBALL
}

enum City {
  TEMIRTAU    // Темиртау
  KARAGANDA   // Қарағанды
  ASTANA      // Астана
  ALMATY      // Алматы
}
```

---

## Константы бизнес-логики

| Константа | Значение | Описание |
|---|---|---|
| `OVERSTAY_THRESHOLD_MINUTES` | `5` | Порог овертайма в минутах |
| `NO_SHOW_THRESHOLD_MINUTES` | `15` | Порог no-show в минутах |
| `BAN_DURATION_HOURS` | `72` | Длительность бана |
| `GEO_CHECK_RADIUS_METERS` | `50` | Максимальное расстояние для геочека |
| `MAX_SESSION_EXTENSIONS` | `2` | Максимум расширений сессии |
| `SESSION_WARNING_MINUTES` | `5` | За сколько минут показывать предупреждение |
| `SESSION_DURATION_MINUTES` | `55` | Продолжительность активной сессии |
| `SLOT_DURATION_MINUTES` | `60` | Длительность одного слота |
| `SCHOOL_HOURS_START` | `"08:00"` | Начало школьных часов |
| `SCHOOL_HOURS_END` | `"15:00"` | Конец школьных часов |
| `JOIN_REQUEST_TIMEOUT_MINUTES` | `10` | Таймаут авто-отклонения заявки |
| `OFFLINE_PASSCODE_LEAD_MINUTES` | `30` | За сколько минут генерировать PIN |
| `VENUE_TIMEZONE` | `"Asia/Almaty"` | Часовой пояс всех площадок (UTC+5) |

---

*Последнее обновление: автогенерация из system message. Обновлять при добавлении новых фич.*
