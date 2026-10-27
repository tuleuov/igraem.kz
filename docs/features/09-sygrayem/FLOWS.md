# 09-sygrayem / FLOWS.md
> SDD ref: SPEC-09 | Feature: «Сыграем» — Пользовательские сценарии и диаграммы

---

## Flow 1 — Создание заявки

### Шаги
1. Пользователь открывает раздел «Сыграем» → видит список/карту.
2. Нажимает «+» (FAB кнопка) → открывается `CreateProposalScreen`.
3. Заполняет форму: вид спорта, дата, время, место (из геолокации или ручной ввод + выбор на мини-карте), кол-во участников, комментарий.
4. Нажимает «Опубликовать» → POST `/api/v1/play-proposals`.
5. Сервер: проверяет бан → проверяет дату/время → проверяет лимит 5 заявок → создаёт запись → возвращает `ProposalCard`.
6. Клиент: перенаправляет на `ProposalDetailScreen` с только что созданной заявкой.

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant App as CreateProposalScreen
    participant API as POST /play-proposals
    participant DB as PostgreSQL

    U->>App: Нажимает «+», заполняет форму
    App->>API: POST /api/v1/play-proposals {sport_type, event_date, ...}
    API->>DB: SELECT UserBan WHERE user_id AND banned_until > now()
    DB-->>API: нет активного бана
    API->>DB: COUNT PlayProposal WHERE organizer_id AND status=open
    DB-->>API: count < 5
    API->>DB: INSERT PlayProposal (status=open)
    DB-->>API: новая запись
    API-->>App: 201 {success:true, data: ProposalCard}
    App->>U: Переход на ProposalDetailScreen
```

---

## Flow 2 — Просмотр раздела (список и карта)

### Шаги — Список
1. Пользователь открывает раздел → GET `/api/v1/play-proposals?event_date=today&page=1`.
2. Видит карточки с фильтром. Меняет фильтр → новый запрос с params.
3. Нажимает на карточку → `ProposalDetailScreen`.

### Шаги — Карта
1. Переключает режим на «Карта» → GET `/api/v1/play-proposals/map?event_date=today`.
2. Видит маркеры на карте. Меняет дату/фильтр → маркеры обновляются.
3. Тапает на маркер → всплывает мини-карточка → кнопка «Открыть» → `ProposalDetailScreen`.

```mermaid
flowchart TD
    A[Открыть раздел Сыграем] --> B{Режим отображения}
    B -->|Список по умолч.| C[GET /play-proposals\nevent_date=today]
    B -->|Карта| D[GET /play-proposals/map\nevent_date=today]

    C --> E[Отобразить карточки]
    D --> F[Отобразить маркеры на карте]

    E --> G[Изменить фильтр]
    F --> G
    G --> H[Повторный запрос с новыми params]
    H --> C
    H --> D

    E --> I[Тап на карточку]
    F --> J[Тап на маркер]
    J --> K[Мини-карточка popup]
    K --> L[Кнопка Открыть]
    I --> M[ProposalDetailScreen]
    L --> M
```

---

## Flow 3 — Подача заявки на участие и одобрение

### Шаги
1. Пользователь просматривает заявку → видит «Хочу участвовать».
2. Нажимает → POST `/api/v1/play-proposals/:id/join`.
3. Сервер: проверяет бан → дублирование → `approved_count < max_participants - 1` → создаёт `ProposalParticipant(status=PENDING)`.
4. Организатор получает уведомление (in-app).
5. Организатор заходит в детальную карточку → видит вкладку «Заявки».
6. Нажимает «Одобрить» → POST `.../participants/:participantId/respond {status: APPROVED}`.
7. Участник получает уведомление об одобрении.

```mermaid
sequenceDiagram
    participant U as Участник
    participant O as Организатор
    participant API as REST API
    participant DB as PostgreSQL

    U->>API: POST /play-proposals/:id/join
    API->>DB: Check UserBan, Check PENDING/APPROVED exists, Check count < max-1
    DB-->>API: ok
    API->>DB: INSERT ProposalParticipant (status=PENDING)
    DB-->>API: created
    API-->>U: 201 {participant_id, status: PENDING}
    API-)O: in-app уведомление «Новая заявка от Нурлан»

    O->>API: POST /play-proposals/:id/participants/:pid/respond {status: APPROVED}
    API->>DB: UPDATE ProposalParticipant SET status=APPROVED
    DB-->>API: ok
    API-->>O: 200 {status: APPROVED}
    API-)U: in-app уведомление «Ваша заявка одобрена»
```

---

## Flow 4 — Чат внутри заявки

### Кто может писать
- Организатор: всегда (пока заявка не `cancelled`/`completed`).
- Участник со статусом `PENDING` или `APPROVED`: может писать.
- Участник со статусом `REJECTED` / `REMOVED`: только чтение истории.

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant App as ProposalDetailScreen (Chat tab)
    participant WS as WebSocket / Polling
    participant API as POST /messages
    participant DB as PostgreSQL

    U->>App: Открывает вкладку «Чат»
    App->>API: GET /play-proposals/:id/messages?limit=50
    API-->>App: Последние 50 сообщений
    App->>WS: Подключается к ws://host/ws/play-proposals/:id/chat

    loop Реальное время
        WS-->>App: event: new_message {id, sender, text, created_at}
        App->>App: Добавить в конец чата
    end

    U->>App: Вводит текст, нажимает «Отправить»
    App->>API: POST /play-proposals/:id/messages {text}
    API->>DB: Check user ban, check access (PENDING/APPROVED/organizer)
    DB-->>API: ok
    API->>DB: INSERT ProposalMessage
    DB-->>API: created
    API-->>App: 201 {id, text, created_at}
    API-)WS: broadcast new_message event всем подключённым
```

---

## Flow 5 — Жизненный цикл статуса заявки

```mermaid
stateDiagram-v2
    [*] --> open : POST /play-proposals (создание)

    open --> in_progress : наступило event_date + start_time (cron каждые 5 мин)
    open --> cancelled : POST /play-proposals/:id/cancel (организатор)
    open --> completed : POST /play-proposals/:id/complete (организатор)

    in_progress --> completed : POST /play-proposals/:id/complete (организатор)
    in_progress --> completed : end_time + 2ч прошло (cron автозавершение)

    cancelled --> [*]
    completed --> [*]

    note right of open
        Принимает участников.
        Видна в списке и на карте.
    end note

    note right of in_progress
        Игра идёт.
        Новые участники не принимаются.
    end note

    note right of completed
        Архив. Скрыта из публичного списка.
        Доступна по прямой ссылке.
    end note
```

---

## Flow 6 — Автоматические переходы статусов (cron)

Cron-задача запускается каждые **5 минут**.

```mermaid
flowchart TD
    START([Cron: каждые 5 мин]) --> A

    A[SELECT PlayProposal WHERE status=open\nAND event_date+start_time <= NOW]
    A --> B{Есть записи?}
    B -->|Нет| END1([Завершить итерацию])
    B -->|Да| C[UPDATE status = in_progress]
    C --> D([Записи обновлены])

    START --> E[SELECT PlayProposal WHERE status=in_progress\nAND end_time + 2h < NOW\nOR start_time + 4h < NOW if no end_time]
    E --> F{Есть записи?}
    F -->|Нет| END2([Завершить итерацию])
    F -->|Да| G[UPDATE status = completed]
    G --> H([Отправить уведомления участникам])
```

---

## Flow 7 — Бан пользователя и отмена его заявок

```mermaid
sequenceDiagram
    participant Admin as Администратор
    participant API as POST /admin/users/:userId/ban
    participant DB as PostgreSQL

    Admin->>API: POST /admin/users/:userId/ban {reason, banned_until}
    API->>DB: UPDATE User SET is_banned=true, banned_until=...
    API->>DB: UPDATE PlayProposal SET status=cancelled\nWHERE organizer_id=userId AND status IN (open, in_progress)
    DB-->>API: ok
    API-->>Admin: 200 {message: "User banned, N proposals cancelled"}
    API-)DB: INSERT UserBan record
```

---

## UI-навигация раздела «Сыграем»

```mermaid
flowchart LR
    TAB([Tab: Сыграем]) --> SWITCH{Переключатель}
    SWITCH -->|Список| LIST[SygrayemListView\nСписок карточек + фильтры]
    SWITCH -->|Карта| MAP[SygrayemMapView\nКарта + маркеры + фильтры]

    LIST --> DETAIL[ProposalDetailScreen\nОписание + Участники + Чат]
    MAP --> POPUP[Popup маркера]
    POPUP --> DETAIL

    DETAIL --> JOIN[POST /join\nПодать заявку]
    DETAIL --> CHAT[Чат внутри карточки]
    DETAIL -->|Если я организатор| MANAGE[Управление участниками\nОдобрить / Отклонить / Кик]

    TAB --> FAB[FAB: + Создать]
    FAB --> CREATE[CreateProposalScreen\nФорма + мини-карта для места]
    CREATE --> DETAIL
```
