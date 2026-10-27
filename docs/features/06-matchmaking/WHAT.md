# SPEC-06 · Matchmaking — Feature Overview

> **SDD refs:** SPEC-06 (matchmaking), INV-08 (banned users)

---

## Что это за фича

**Matchmaking** позволяет хосту бронирования открыть слот для поиска партнёров по игре (футбол, теннис, и т.д.).
Другие зарегистрированные пользователи платформы Igraem.kz видят открытые слоты, могут отправить заявку на присоединение или воспользоваться инвайт-ссылкой от хоста.

Три способа попасть в бронирование в качестве гостя:

| Способ | Тип `BookingGuest.type` | Описание |
|---|---|---|
| Заявка на присоединение (Join Request) | `invited` (после approve) | Пользователь находит открытый слот → отправляет `JoinRequest` → хост одобряет |
| Инвайт-ссылка | `invited` | Хост отправляет уникальную ссылку с `invite_token` → гость принимает `/invitations/:token/accept` |
| Спонтанный QR check-in | `spontaneous_check_in` | Гость сканирует QR-код площадки → система находит активное бронирование → добавляет гостя |

---

## Концепция

```
Booking (хост)
  └─ is_looking_for_players = true   ← слот открыт
       ├─ needed_players_count = N   ← сколько нужно игроков (0 = без лимита)
       ├─ auto_approve_players       ← авто-одобрение заявок
       └─ invite_token (UUID)        ← уникальный токен для инвайт-ссылки

JoinRequest (заявка)
  └─ PENDING → APPROVED → BookingGuest создаётся
             → REJECTED → конец

BookingGuest (гость в брони)
  └─ type: 'invited' | 'spontaneous_check_in'
  └─ status: 'approved' | 'pending'
```

---

## Затронутые модули

### Backend

| Файл | Ответственность |
|---|---|
| `src/controllers/bookingsController.ts` | PATCH matchmaking-settings, GET open-matchmaking, GET /requests, spontaneous-join |
| `src/controllers/matchmakingController.ts` | POST join-requests, approve/reject, invite token accept |
| `src/models/Booking.ts` (Prisma) | Поля `is_looking_for_players`, `needed_players_count`, `auto_approve_players`, `invite_token` |
| `src/models/BookingGuest.ts` (Prisma) | Гости брони — invited + spontaneous |
| `src/models/JoinRequest.ts` (Prisma) | Жизненный цикл заявки на присоединение |

### Frontend (React Native / Web)

| Файл | Ответственность |
|---|---|
| `client/src/screens/MatchmakingScreen.tsx` | Список открытых слотов, форма отправки заявки, кнопка «Принять инвайт» |
| `client/src/screens/RequestsTab.tsx` | Вкладка хоста: входящие `JoinRequest` со статусом `PENDING` |

### Инфраструктура

| Компонент | Роль |
|---|---|
| QR-код площадки | Статический код, содержащий `venue_id` + `court_id`; используется для spontaneous check-in |
| JWT Auth Middleware | Все мутации требуют аутентификации |
| Ban-check Middleware | Проверка INV-08: забаненные пользователи не могут присоединяться |

---

## Scope

**В скоуп SPEC-06 входит:**
- Открытие/закрытие слота хостом
- Настройка `needed_players_count` и `auto_approve_players`
- Полный цикл `JoinRequest` (PENDING → APPROVED / REJECTED)
- Создание `BookingGuest` при одобрении
- Генерация и принятие `invite_token`
- Спонтанный QR check-in (`spontaneous_check_in`)
- Вкладка `RequestsTab` с фильтрацией по pending-заявкам

**Вне скоупа SPEC-06:**
- Чат между хостом и гостями (отдельная фича)
- Рейтинговая система игроков
- Push-уведомления (интегрируются отдельно)
