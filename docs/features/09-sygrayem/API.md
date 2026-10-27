# 09-sygrayem / API.md
> SDD ref: SPEC-09 | Feature: «Сыграем» — HTTP API

Base URL: `/api/v1`  
Auth: `Authorization: Bearer <JWT>` где обозначено `[JWT]`  
All responses include header `X-Request-Id: <uuid>`  
Success envelope: `{ success: true, data: T }`  
Error envelope: `{ success: false, error: string, code?: string }`

---

## Публичные заявки

### GET /play-proposals
Список заявок с фильтрами. Статусы `open` и `in_progress` только.

**Auth:** необязателен (публичный), но с JWT возвращает `my_participation_status`.

**Query params:**
```
sport_type    = football | basketball | volleyball  (повторяемый)
event_date    = YYYY-MM-DD
start_time_from = HH:mm
start_time_to   = HH:mm
page          = 1
limit         = 20
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sport_type": "football",
      "event_date": "2026-10-28",
      "start_time": "18:00",
      "end_time": "20:00",
      "location_text": "ул. Абая 12, Алматы, рядом со школой №5",
      "latitude": 43.238949,
      "longitude": 76.889709,
      "comment": "Ищем 3 человека, уровень любительский",
      "max_participants": 10,
      "approved_count": 7,
      "status": "open",
      "organizer": {
        "id": "uuid",
        "full_name": "Алибек Джаксыбеков",
        "avatar_url": null
      },
      "my_participation_status": null,
      "created_at": "2026-10-27T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

---

### GET /play-proposals/map
Точки для карты. Возвращает только `id`, `latitude`, `longitude`, `sport_type`, `status`, `event_date`, `start_time`, `approved_count`, `max_participants` (минимум для рендера маркеров).  
По умолчанию `event_date = сегодня`.

**Auth:** не обязателен.

**Query params:** те же фильтры, что у `/play-proposals`. `event_date` default = today.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sport_type": "basketball",
      "event_date": "2026-10-27",
      "start_time": "19:00",
      "latitude": 43.238949,
      "longitude": 76.889709,
      "approved_count": 3,
      "max_participants": 6,
      "status": "open"
    }
  ]
}
```

---

### GET /play-proposals/:id
Полная детальная карточка: описание + список участников + история чата (последние 50 сообщений).

**Auth:** не обязателен для открытых заявок. С JWT возвращает `my_participation_status` и `phone_number` участников (если запрашивает организатор).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sport_type": "football",
    "event_date": "2026-10-28",
    "start_time": "18:00",
    "end_time": "20:00",
    "location_text": "ул. Абая 12, Алматы",
    "latitude": 43.238949,
    "longitude": 76.889709,
    "comment": "Уровень любитель",
    "max_participants": 10,
    "approved_count": 7,
    "status": "open",
    "organizer": { "id": "uuid", "full_name": "Алибек", "avatar_url": null },
    "my_participation_status": "PENDING",
    "participants": [
      {
        "id": "participant-uuid",
        "user": { "id": "uuid", "full_name": "Нурлан Ахметов", "avatar_url": null },
        "status": "APPROVED",
        "created_at": "2026-10-27T12:00:00.000Z"
      }
    ],
    "messages": [
      {
        "id": "msg-uuid",
        "sender": { "id": "uuid", "full_name": "Алибек", "avatar_url": null },
        "text": "Встречаемся у центрального входа",
        "created_at": "2026-10-27T15:45:00.000Z"
      }
    ],
    "created_at": "2026-10-27T10:00:00.000Z"
  }
}
```

**Error 404:** `{ "success": false, "error": "Proposal not found", "code": "PROPOSAL_NOT_FOUND" }`

---

## Управление заявками (JWT обязателен)

### POST /play-proposals `[JWT]`
Создать новую заявку.

**Request body:**
```json
{
  "sport_type": "football",
  "event_date": "2026-10-28",
  "start_time": "18:00",
  "end_time": "20:00",
  "location_text": "ул. Абая 12, Алматы, рядом со школой №5",
  "latitude": 43.238949,
  "longitude": 76.889709,
  "comment": "Ищем 3 человека, уровень любительский",
  "max_participants": 10
}
```

**Response 201:**
```json
{ "success": true, "data": { /* ProposalCard */ } }
```

**Errors:**
| Code | HTTP | Описание |
|---|---|---|
| `USER_BANNED` | 403 | Пользователь заблокирован |
| `DATE_IN_PAST` | 400 | Дата в прошлом |
| `TIME_IN_PAST` | 400 | Время в прошлом (сегодняшняя дата) |
| `TOO_MANY_OPEN_PROPOSALS` | 409 | Более 5 активных заявок |
| `VALIDATION_ERROR` | 400 | Не заполнены обязательные поля |

---

### PATCH /play-proposals/:id `[JWT]`
Редактировать заявку (только организатор, только статус `open`).

**Request body (все поля опциональные):**
```json
{
  "location_text": "Новый адрес",
  "comment": "Обновлённое описание",
  "max_participants": 12,
  "end_time": "21:00"
}
```

**Response 200:** `{ "success": true, "data": { /* ProposalCard */ } }`

**Errors:**
| Code | HTTP | Описание |
|---|---|---|
| `FORBIDDEN` | 403 | Не организатор |
| `PROPOSAL_NOT_EDITABLE` | 409 | Статус не `open` |

---

### POST /play-proposals/:id/cancel `[JWT]`
Отменить заявку (только организатор). Статус → `cancelled`.

**Response 200:** `{ "success": true, "data": { "status": "cancelled" } }`

---

### POST /play-proposals/:id/complete `[JWT]`
Завершить заявку вручную (только организатор, статусы `open`/`in_progress`).

**Response 200:** `{ "success": true, "data": { "status": "completed" } }`

---

## Участие

### POST /play-proposals/:id/join `[JWT]`
Подать заявку на участие. Тело пустое — user берётся из JWT.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "participant_id": "uuid",
    "status": "PENDING"
  }
}
```

**Errors:**
| Code | HTTP | Описание |
|---|---|---|
| `USER_BANNED` | 403 | Пользователь забанен |
| `ALREADY_REQUESTED` | 409 | Уже есть PENDING или APPROVED заявка |
| `PROPOSAL_FULL` | 409 | Достигнут max_participants |
| `CANNOT_JOIN_OWN` | 400 | Организатор не может вступить в свою заявку |
| `PROPOSAL_NOT_OPEN` | 409 | Заявка не в статусе open |

---

### POST /play-proposals/:id/participants/:participantId/respond `[JWT]`
Организатор одобряет или отклоняет участника.

**Request body:**
```json
{ "status": "APPROVED" }
```
или
```json
{ "status": "REJECTED" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "participant_id": "uuid",
    "status": "APPROVED"
  }
}
```

**Errors:**
| Code | HTTP | Описание |
|---|---|---|
| `FORBIDDEN` | 403 | Не организатор |
| `PARTICIPANT_NOT_FOUND` | 404 | Участник не найден |
| `PROPOSAL_FULL` | 409 | При одобрении — мест уже нет |

---

### POST /play-proposals/:id/withdraw `[JWT]`
Участник самостоятельно отказывается. Статус → `WITHDRAWN`.

**Response 200:** `{ "success": true, "data": { "status": "WITHDRAWN" } }`

---

### DELETE /play-proposals/:id/participants/:participantId `[JWT]`
Организатор удаляет участника (kick). Статус → `REMOVED`.

**Response 200:** `{ "success": true, "data": { "participant_id": "uuid", "status": "REMOVED" } }`

**Errors:** `403 FORBIDDEN` если не организатор.

---

## Чат

### GET /play-proposals/:id/messages `[JWT]`
История чата. Пагинация курсором.

**Query params:**
```
before    = message_id   (курсор для подгрузки старых)
limit     = 50
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid",
      "sender": { "id": "uuid", "full_name": "Нурлан", "avatar_url": null },
      "text": "Во сколько начинаем?",
      "created_at": "2026-10-27T16:00:00.000Z"
    }
  ],
  "has_more": false
}
```

**Errors:** `403 CHAT_ACCESS_DENIED` — пользователь REJECTED/REMOVED или не участник.

---

### POST /play-proposals/:id/messages `[JWT]`
Отправить сообщение в чат.

**Request body:**
```json
{ "text": "Встречаемся у центрального входа" }
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "text": "Встречаемся у центрального входа",
    "created_at": "2026-10-27T16:05:00.000Z"
  }
}
```

**Errors:**
| Code | HTTP | Описание |
|---|---|---|
| `USER_BANNED` | 403 | Пользователь забанен |
| `CHAT_ACCESS_DENIED` | 403 | Статус REJECTED/REMOVED |
| `TEXT_TOO_LONG` | 400 | Текст > 1000 символов |

---

## WebSocket (реальное время чата)

```
ws://host/ws/play-proposals/:id/chat?token=<JWT>
```

**Входящие события (сервер → клиент):**
```json
{ "event": "new_message", "data": { /* ProposalMessageInfo */ } }
{ "event": "participant_status_changed", "data": { "participant_id": "uuid", "status": "APPROVED" } }
{ "event": "proposal_status_changed", "data": { "status": "cancelled" } }
```

> MVP допускает polling GET /play-proposals/:id/messages каждые 5 секунд вместо WS.

---

## Мои заявки

### GET /play-proposals/my `[JWT]`
Все заявки текущего пользователя: созданные им + те, в которых он участник.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "organized": [ /* ProposalCard[] — созданные мной */ ],
    "participating": [ /* ProposalCard[] + my_participation_status */ ]
  }
}
```

---

## Admin

### DELETE /admin/play-proposals/:id `[JWT, admin]`
Удалить любую заявку.

### GET /admin/play-proposals `[JWT, admin]`
Все заявки (включая cancelled/completed) с пагинацией.

**Query params:** `status`, `sport_type`, `organizer_id`, `page`, `limit`
