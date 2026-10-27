# SPEC-06 · Matchmaking — Business Rules

> **SDD refs:** SPEC-06, INV-08  
> Коды правил: `[MM-R-XX]`

---

## 1. Toggle — открытие/закрытие слота

| Код | Правило |
|---|---|
| **MM-R-01** | Только хост бронирования (владелец `Booking`) может переключать `is_looking_for_players`. |
| **MM-R-02** | Переключение доступно только для бронирований со статусом `ACTIVE` или `UPCOMING`. Завершённые и отменённые брони нельзя открывать. |
| **MM-R-03** | При переключении `is_looking_for_players = false` все `JoinRequest` со статусом `PENDING` автоматически переводятся в `REJECTED`. Уже созданные `BookingGuest` остаются без изменений. |
| **MM-R-04** | Поле `invite_token` генерируется один раз при создании `Booking` (UUID, `@default(uuid())`). Хост не может удалить токен, но может перегенерировать его через отдельный endpoint (вне скоупа SPEC-06). |

---

## 2. needed_players_count — лимит мест

| Код | Правило |
|---|---|
| **MM-R-05** | `needed_players_count = 0` означает «без лимита» — любое количество игроков может присоединиться. |
| **MM-R-06** | `needed_players_count > 0` — максимальное число дополнительных игроков. Считаются записи `BookingGuest` со статусом `approved` для данного бронирования. |
| **MM-R-07** | Если текущее количество `approved` гостей достигает `needed_players_count`, новые `JoinRequest` отклоняются с ошибкой `SLOT_FULL` (HTTP 409). Слот автоматически закрывается (`is_looking_for_players = false`). |
| **MM-R-08** | `needed_players_count` должен быть `>= 0` и `<= 50`. Значения вне диапазона — ошибка валидации HTTP 422. |

---

## 3. Auto-approve — автоматическое одобрение

| Код | Правило |
|---|---|
| **MM-R-09** | Если `auto_approve_players = true`, при создании `JoinRequest` система немедленно: (1) создаёт `BookingGuest` с `type = 'invited'`, `status = 'approved'`; (2) устанавливает `JoinRequest.status = 'APPROVED'`. Запись `JoinRequest` всё равно создаётся для аудита. |
| **MM-R-10** | При `auto_approve_players = true` лимит `needed_players_count` проверяется **до** создания гостя. Если слот полон — `JoinRequest` создаётся со статусом `REJECTED`, `BookingGuest` не создаётся. |
| **MM-R-11** | `auto_approve_players` можно изменить в любой момент, пока `is_looking_for_players = true`. Изменение не влияет на уже существующие `JoinRequest`. |

---

## 4. Join Request State Machine

```
[Создание POST /join-requests]
        │
        ▼
    PENDING  ──────────────────────────────────────────┐
        │                                               │
   auto_approve?                                        │
   ┌────┴─────┐                                         │
   YES        NO                                        │
   │          │                                         │
   ▼          ▼                                         │
APPROVED   (ждёт действия хоста)                        │
   │          │                                         │
   │    ┌─────┴──────┐                                  │
   │  approve      reject                               │
   │    │            │                                  │
   │    ▼            ▼                                  │
   │  APPROVED    REJECTED ◄─────── MM-R-03 (слот закрыт)
   │    │
   ▼    ▼
BookingGuest(status='approved', type='invited') создаётся
```

| Код | Правило |
|---|---|
| **MM-R-12** | `JoinRequest` может быть в состоянии `PENDING`, `APPROVED` или `REJECTED`. Переходы: `PENDING → APPROVED`, `PENDING → REJECTED`. Обратные переходы запрещены. |
| **MM-R-13** | Один пользователь (по `user_iin`) не может иметь более одного активного `JoinRequest` (статус `PENDING` или `APPROVED`) для одного бронирования. Повторная отправка — HTTP 409 `DUPLICATE_REQUEST`. |
| **MM-R-14** | При переводе `JoinRequest` в `APPROVED` система создаёт `BookingGuest` с `@@unique([booking_id, user_id])`. Если гость уже существует — возвращается HTTP 409 `ALREADY_JOINED`. |
| **MM-R-15** | `JoinRequest.approve` и `JoinRequest.reject` может выполнять только хост бронирования. Попытка другого пользователя — HTTP 403. |
| **MM-R-16** | Хост не может подать `JoinRequest` на собственное бронирование — HTTP 400 `CANNOT_JOIN_OWN_BOOKING`. |

---

## 5. Invite Token — инвайт-ссылка

| Код | Правило |
|---|---|
| **MM-R-17** | `invite_token` является уникальным UUID, генерируется Prisma `@default(uuid())` при создании `Booking`. |
| **MM-R-18** | Принятие инвайта `POST /invitations/:token/accept` создаёт `BookingGuest` с `type = 'invited'`, `status = 'approved'` **без создания** `JoinRequest`. |
| **MM-R-19** | Инвайт-ссылка **не является одноразовой** — один и тот же токен может использоваться несколькими пользователями. Повторное принятие одним пользователем блокируется `@@unique([booking_id, user_id])` → HTTP 409 `ALREADY_JOINED`. |
| **MM-R-20** | При принятии инвайта проверяется лимит `needed_players_count` (если > 0). Полный слот → HTTP 409 `SLOT_FULL`. |
| **MM-R-21** | Принятие инвайта возможно только если `is_looking_for_players = true`. Закрытый слот → HTTP 400 `SLOT_CLOSED`. |

---

## 6. Spontaneous QR Check-in

| Код | Правило |
|---|---|
| **MM-R-22** | QR-код содержит `venue_id` и `court_id`. После сканирования клиент отправляет `POST /bookings/spontaneous-join` с этими полями. |
| **MM-R-23** | Система ищет `Booking` с условиями: `venue_id` + `court_id` совпадают, статус `ACTIVE`, время бронирования пересекается с `now()`. Если не найдено — HTTP 404 `NO_ACTIVE_BOOKING`. |
| **MM-R-24** | Спонтанный check-in создаёт `BookingGuest` с `type = 'spontaneous_check_in'`, `status = 'approved'`, `checked_in_at = now()` **без проверки** `is_looking_for_players`. |
| **MM-R-25** | Хост бронирования не может выполнить спонтанный check-in в собственное бронирование — HTTP 400 `CANNOT_JOIN_OWN_BOOKING`. |
| **MM-R-26** | Повторный QR check-in одного пользователя в то же бронирование — HTTP 409 `ALREADY_JOINED` (UniqueConstraint `[booking_id, user_id]`). |

---

## 7. Ban Check (INV-08)

| Код | Правило |
|---|---|
| **MM-R-27** | Перед созданием `JoinRequest`, принятием инвайта и QR check-in система проверяет статус пользователя. Забаненный пользователь (`User.is_banned = true`) получает HTTP 403 `USER_BANNED` (ref: INV-08). |
| **MM-R-28** | Проверка бана выполняется через middleware до входа в бизнес-логику контроллера. |

---

## 8. RequestsTab — фильтрация входящих заявок

| Код | Правило |
|---|---|
| **MM-R-29** | `GET /api/v1/bookings/requests` возвращает только те бронирования хоста, у которых есть хотя бы одна `JoinRequest` со статусом `PENDING`. |
| **MM-R-30** | `GET /api/v1/bookings/:id/requests` возвращает все `JoinRequest` для конкретного бронирования хоста (все статусы). |
| **MM-R-31** | Доступ к обоим endpoints только для авторизованного хоста (JWT). Попытка получить заявки чужого бронирования → HTTP 403. |
