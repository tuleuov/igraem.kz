# 🤝 SPEC-06: Матчмейкинг и Совместные Игры (Matchmaking & Social Games)

> **Модуль**: `features/requests`, `src/controllers/bookingsController.ts`, `client/src/components/RequestsTab.tsx`  
> **Статус**: Действующая спецификация (Production Baseline)  
> **Инварианты**: [INV-08 (Блокировка забаненных)](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md#inv-08-тотальная-блокировка-забаненного-профиля)

---

## 1. Обзор предметной области

Модуль позволяет организаторам матчей находить недостающих игроков для командных видов спорта (футбол 5x5, баскетбол 3x3), принимать или отклонять заявки, делиться ссылками-приглашениями и регистрировать спонтанных участников, сканирующих QR-код прямо на калитке площадки.

---

## 2. Модель данных (Data Model)

```prisma
model JoinRequest {
  id         String   @id @default(uuid())
  booking_id String
  booking    Booking  @relation(fields: [booking_id], references: [id], onDelete: Cascade)
  user_iin   String
  user_name  String
  user_phone String
  status     String   @default("PENDING") // 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at DateTime @default(now())
}

model BookingGuest {
  id            String   @id @default(uuid())
  booking_id    String
  booking       Booking  @relation(fields: [booking_id], references: [id], onDelete: Cascade)
  user_id       String
  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  type          String   // 'invited' | 'spontaneous_check_in'
  status        String   @default("approved") // 'approved' | 'pending'
  checked_in_at DateTime @default(now())
  created_at    DateTime @default(now())

  @@unique([booking_id, user_id])
}
```

---

## 3. Функциональные требования (Requirements)

### REQ-SOC-01: Режим открытой игры (Looking for Players)
* **Описание**: При создании или редактировании брони Организатор может активировать тумблер `is_looking_for_players = true`, указать количество требуемых игроков `needed_players_count` и режим авто-одобрения `auto_approve_players`.
* **Критерии приемки**:
  - `Given`: Организатор активирует «Ищу игроков (+4 человека)».
  - `Then`: Игра попадает в ленту `GET /matchmaking/open` и подсвечивается значком открытого матча на карте.

### REQ-SOC-02: Отправка заявки на участие (Join Request)
* **Описание**: Пользователь может отправить заявку на занятый слот или игру из ленты матчмейкинга.
* **Критерии приемки**:
  - `Given`: Пользователь кликает «Присоединиться к игре».
  - `When`: Отправляется `POST /matchmaking/join-requests`.
  - `Then`: Создается запись в `join_requests` со статусом `PENDING`, а пользователю выводится уведомление: *«Запрос отправлен. Как только организатор одобрит его, игра появится в ваших бронированиях»*.

### REQ-SOC-03: Фильтрация в разделе «Запросы мне» (`RequestsTab.tsx`)
* **Описание**: В подвкладке «Запросы мне» отображаются ТОЛЬКО те карточки площадок, на которые поступила хотя бы одна заявка (`requests.length > 0`). Пустые слоты скрыты.
* **Критерии приемки**:
  - `Given`: У организатора есть 3 бронирования, но заявки поступили только на 1 из них.
  - `When`: Организатор открывает вкладку «Запросы» -> «Запросы мне».
  - `Then`: В списке отображается строго 1 карточка площадки с бейджем количества входящих заявок.

### REQ-SOC-04: Принятие и Отклонение заявок Организатором
* **Описание**: Для каждой входящей заявки Организатору доступны две кнопки: зеленая **«Принять»** и красная **«Отклонить»**.
* **Критерии приемки**:
  - `When`: Организатор нажимает «Принять».
  - `Then`: Запрос получает статус `APPROVED`, игрок добавляется в `booking_guests`, счетчик оставшихся свободных мест уменьшается на 1, а у игрока игра появляется во вкладке «Мои бронирования».
  - `When`: Организатор нажимает «Отклонить».
  - `Then`: Статус меняется на `REJECTED`, заявка удаляется из активного списка.

### REQ-SOC-05: Прямые ссылки-приглашения (Invite Links)
* **Описание**: Организатор может скопировать персональную ссылку `https://igraem.kz/invitations/:token` и отправить ее друзьям в мессенджеры. Переход по ссылке мгновенно добавляет авторизованного игрока в состав участников.

### REQ-SOC-06: Спонтанный вход по QR-коду калитки (Spontaneous Check-in)
* **Описание**: Игрок, пришедший на площадку во время чужой открытой игры, может отсканировать QR-код на входе и мгновенно присоединиться к матчу.
* **Критерии приемки**:
  - `Given`: На площадке идет матч, где открыт набор игроков.
  - `When`: Новый игрок сканирует QR калитки и отправляет `POST /bookings/spontaneous-join`.
  - `Then`: Он регистрируется как `spontaneous_check_in`, смарт-замок временно отпирается для прохода, а Организатор видит нового игрока в ростере.

---

## 4. Стратегия тестирования

| Требование | Название теста | Файл теста |
| :--- | :--- | :--- |
| **REQ-SOC-02** | `Creates PENDING join request for match` | `src/controllers/bookingsController.test.ts` |
| **REQ-SOC-03** | `Filters out venues with zero pending requests in RequestsTab` | `client/src/components/RequestsTab.test.ts` |
| **REQ-SOC-04** | `Approving join request adds user to booking guests roster` | `src/controllers/bookingsController.test.ts` |
| **REQ-SOC-06** | `Spontaneous QR check-in grants gate entry and joins match` | `src/controllers/bookingsController.test.ts` |
