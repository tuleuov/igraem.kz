# 09-sygrayem / DATA.md
> SDD ref: SPEC-09 | Feature: «Сыграем» — Модели данных

---

## Prisma-модели (добавить в schema.prisma)

```prisma
// ─── Предложение сыграть вместе ────────────────────────────────────────────
model PlayProposal {
  id               String               @id @default(uuid())
  organizer_id     String
  organizer        User                 @relation("OrganizedProposals", fields: [organizer_id], references: [id], onDelete: Cascade)

  sport_type       String               // 'football' | 'basketball' | 'volleyball'
  event_date       String               // 'YYYY-MM-DD'
  start_time       String               // 'HH:mm'
  end_time         String?              // 'HH:mm' (optional)
  location_text    String               // Свободный адрес (max 200 chars)
  latitude         Float                // Координаты для карты
  longitude        Float
  comment          String?              // Описание (max 500 chars)
  max_participants Int                  // 2–50, включая организатора
  status           String               @default("open")
                                        // 'open' | 'in_progress' | 'completed' | 'cancelled'

  created_at       DateTime             @default(now())
  updated_at       DateTime             @updatedAt

  participants     ProposalParticipant[]
  messages         ProposalMessage[]

  @@index([event_date, status])
  @@index([sport_type, status])
  @@index([organizer_id])
  @@map("play_proposals")
}

// ─── Участник заявки ────────────────────────────────────────────────────────
model ProposalParticipant {
  id          String       @id @default(uuid())
  proposal_id String
  proposal    PlayProposal @relation(fields: [proposal_id], references: [id], onDelete: Cascade)
  user_id     String
  user        User         @relation("ProposalParticipants", fields: [user_id], references: [id], onDelete: Cascade)

  status      String       @default("PENDING")
              // 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'REMOVED'

  created_at  DateTime     @default(now())
  updated_at  DateTime     @updatedAt

  @@unique([proposal_id, user_id])
  @@index([proposal_id, status])
  @@map("proposal_participants")
}

// ─── Сообщение в чате заявки ────────────────────────────────────────────────
model ProposalMessage {
  id          String       @id @default(uuid())
  proposal_id String
  proposal    PlayProposal @relation(fields: [proposal_id], references: [id], onDelete: Cascade)
  sender_id   String
  sender      User         @relation("SentProposalMessages", fields: [sender_id], references: [id], onDelete: Cascade)

  text        String       // max 1000 chars
  created_at  DateTime     @default(now())

  @@index([proposal_id, created_at])
  @@map("proposal_messages")
}
```

### Изменения в модели User (добавить relations)
```prisma
model User {
  // ... existing fields ...

  // NEW: relations for Сыграем
  organizedProposals   PlayProposal[]        @relation("OrganizedProposals")
  proposalParticipants ProposalParticipant[] @relation("ProposalParticipants")
  proposalMessages     ProposalMessage[]     @relation("SentProposalMessages")
}
```

---

## TypeScript-интерфейсы

### DTOs (входящие данные)

```typescript
// POST /api/v1/play-proposals — создать заявку
interface CreateProposalDTO {
  sport_type: 'football' | 'basketball' | 'volleyball';
  event_date: string;     // 'YYYY-MM-DD'
  start_time: string;     // 'HH:mm'
  end_time?: string;      // 'HH:mm'
  location_text: string;  // max 200
  latitude: number;
  longitude: number;
  comment?: string;       // max 500
  max_participants: number; // 2–50
}

// PATCH /api/v1/play-proposals/:id — редактировать
interface UpdateProposalDTO {
  location_text?: string;
  comment?: string;
  max_participants?: number;
  end_time?: string;
}

// POST /api/v1/play-proposals/:id/join — подать заявку на участие
// (тело пустое — user берётся из JWT)

// POST /api/v1/play-proposals/:id/participants/:participantId/respond
interface RespondParticipantDTO {
  status: 'APPROVED' | 'REJECTED';
}

// POST /api/v1/play-proposals/:id/messages — отправить сообщение
interface SendMessageDTO {
  text: string; // max 1000
}
```

### Response-типы

```typescript
// Краткая карточка (для списка и карты)
interface ProposalCard {
  id: string;
  sport_type: 'football' | 'basketball' | 'volleyball';
  event_date: string;         // 'YYYY-MM-DD'
  start_time: string;         // 'HH:mm'
  end_time: string | null;
  location_text: string;
  latitude: number;
  longitude: number;
  comment: string | null;
  max_participants: number;
  approved_count: number;     // кол-во APPROVED участников
  status: ProposalStatus;
  organizer: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  my_participation_status: ParticipantStatus | null; // null если текущий user — организатор или не подавал
  created_at: string;
}

// Полная карточка (детальный экран)
interface ProposalDetail extends ProposalCard {
  participants: ProposalParticipantInfo[];
  messages: ProposalMessageInfo[];
}

interface ProposalParticipantInfo {
  id: string;             // ProposalParticipant.id
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone_number: string; // виден только организатору
  };
  status: ParticipantStatus;
  created_at: string;
}

interface ProposalMessageInfo {
  id: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  text: string;
  created_at: string;
}

// Enum-типы
type ProposalStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
type ParticipantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'REMOVED';
type SportType = 'football' | 'basketball' | 'volleyball';
```

### Фильтры (query params)

```typescript
interface ProposalFilters {
  sport_type?: SportType | SportType[];  // ?sport_type=football&sport_type=basketball
  event_date?: string;                   // 'YYYY-MM-DD'
  start_time_from?: string;             // 'HH:mm'
  start_time_to?: string;               // 'HH:mm'
  page?: number;                         // для списка
  limit?: number;                        // default 20
}
```

---

## Таблицы полей

### play_proposals

| Поле | Тип | Constraints | Описание |
|---|---|---|---|
| id | uuid | PK | Идентификатор |
| organizer_id | uuid | FK → users.id | Создатель заявки |
| sport_type | varchar | enum: football/basketball/volleyball | Вид спорта |
| event_date | varchar | format YYYY-MM-DD | Дата игры |
| start_time | varchar | format HH:mm | Время начала |
| end_time | varchar? | format HH:mm, nullable | Время конца (опц.) |
| location_text | varchar(200) | not null, min 5 | Адрес места |
| latitude | float | not null | Широта |
| longitude | float | not null | Долгота |
| comment | varchar(500) | nullable | Описание/комментарий |
| max_participants | int | 2–50 | Макс. участников (включая организатора) |
| status | varchar | default: open | Статус заявки |
| created_at | timestamp | default now() | Время создания |
| updated_at | timestamp | @updatedAt | Время обновления |

### proposal_participants

| Поле | Тип | Constraints | Описание |
|---|---|---|---|
| id | uuid | PK | Идентификатор |
| proposal_id | uuid | FK → play_proposals.id | Ссылка на заявку |
| user_id | uuid | FK → users.id | Участник |
| status | varchar | default: PENDING | PENDING/APPROVED/REJECTED/WITHDRAWN/REMOVED |
| created_at | timestamp | default now() | Когда подал заявку |
| updated_at | timestamp | @updatedAt | Когда статус изменился |
| — | — | UNIQUE(proposal_id, user_id) | Нет дублей |

### proposal_messages

| Поле | Тип | Constraints | Описание |
|---|---|---|---|
| id | uuid | PK | Идентификатор |
| proposal_id | uuid | FK → play_proposals.id | Ссылка на заявку |
| sender_id | uuid | FK → users.id | Автор сообщения |
| text | text | max 1000, not null | Текст сообщения |
| created_at | timestamp | default now() | Время отправки |
