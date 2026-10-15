# 📡 SPEC-08: Мастер-Реестр Контрактов REST API (API Specifications)

> **Модуль**: `src/routes/index.ts`, Все контроллеры (`src/controllers/`)  
> **Статус**: Действующая спецификация (Production Baseline)  
> **Формат данных**: JSON, кодировка UTF-8  
> **Базовый префикс**: `/api/v1` (за исключением `/health` и `/admin`)

---

## 1. Общие заголовки и Стандарты ответов

### Заголовки запроса (Request Headers)
* `Content-Type: application/json`
* `Authorization: Bearer <JWT_TOKEN>` (для защищенных эндпоинтов)
* `X-Request-Id: <UUID>` (опциональный заголовок сквозной трассировки; если не передан — генерируется сервером)

### Стандарт успешного ответа
```json
{
  "success": true,
  "data": { ... },
  "message": "Опциональное пояснение"
}
```

### Стандарт ответа с ошибкой (Centralized Error Payload)
```json
{
  "success": false,
  "error": {
    "message": "Текст ошибки на русском языке",
    "statusCode": 400,
    "requestId": "uuid-v4",
    "details": { ... }
  }
}
```

---

## 2. Системные эндпоинты и Мониторинг

### `GET /health`
* **Доступ**: Публичный
* **Назначение**: Проверка работоспособности сервиса и подключения к БД (Prisma `$queryRaw`SELECT 1``).
* **Ответ 200 OK**:
  ```json
  {
    "status": "ok",
    "uptime": 1420.5,
    "timestamp": "2026-10-15T18:00:00.000Z",
    "database": "connected",
    "requestId": "req-123"
  }
  ```
* **Ответ 503 Service Unavailable**:
  ```json
  {
    "status": "error",
    "message": "Database connection failed",
    "database": "disconnected",
    "requestId": "req-123"
  }
  ```

---

## 3. Авторизация и Идентификация (Auth & Identity)

| Метод | Путь | Доступ | Назначение |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Публичный | Вход по номеру телефона/ИИН |
| `POST` | `/api/v1/auth/register` | Публичный | Регистрация нового профиля (ФИО + ИИН 12 цифр) |
| `GET` | `/api/v1/auth/me` | JWT Client | Получение текущего профиля авторизованного игрока |
| `POST` | `/api/v1/iin/validate` | Публичный | Алгоритмическая валидация ИИН РК |

---

## 4. Каталог Площадок (Grounds & Venues)

| Метод | Путь | Доступ | Назначение |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/grounds` | Публичный | Список всех площадок с фильтрацией |
| `POST` | `/api/v1/grounds` | JWT Admin | Создание нового спортивного объекта |
| `PUT` | `/api/v1/grounds/:id` | JWT Admin | Редактирование параметров площадки |
| `GET` | `/api/v1/grounds/qr/:qr_code_token` | Публичный | Поиск площадки по токену калиточного QR-кода |
| `POST` | `/api/v1/grounds/:id/reviews` | JWT Client | Добавление отзыва и оценки (1-5 звезд) |

---

## 5. Бронирование и Слоты (Bookings)

| Метод | Путь | Доступ | Назначение |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/bookings/all` | Публичный | Все бронирования (для отрисовки сетки занятых слотов) |
| `POST` | `/api/v1/bookings` | JWT Client | Создание новой брони (проверка суточного лимита 3ч) |
| `GET` | `/api/v1/bookings/my` | JWT Client | Список предстоящих и прошедших игр пользователя |
| `POST` | `/api/v1/bookings/:id/cancel` | JWT Client | Отмена предстоящей брони Организатором |
| `POST` | `/api/v1/bookings/:id/complete` | JWT Client | Досрочное успешное завершение бронирования |
| `POST` | `/api/v1/bookings/:id/invite-link` | JWT Client | Генерация прямой ссылки для друзей |
| `GET` | `/api/v1/invitations/:token` | Публичный | Просмотр параметров игры по инвайт-ссылке |
| `POST` | `/api/v1/invitations/:token/accept`| JWT Client | Принятие приглашения и вход в ростер |

---

## 6. Матчмейкинг и Совместные игры (Matchmaking)

| Метод | Путь | Доступ | Назначение |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/matchmaking/open` | Публичный | Лента открытых игр с поиском сокомандников |
| `POST` | `/api/v1/matchmaking/join-requests` | JWT Client | Подача заявки на присоединение к игре |
| `POST` | `/api/v1/matchmaking/join-requests/:id/approve` | JWT Client | Одобрение заявки Организатором |
| `POST` | `/api/v1/matchmaking/join-requests/:id/reject` | JWT Client | Отклонение заявки Организатором |
| `GET` | `/api/v1/bookings/requests` | JWT Client | Входящие заявки, поступившие Организатору |

---

## 7. Смарт-Замки и Физический Доступ (TTLock Access)

| Метод | Путь | Доступ | Назначение |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/locks/unlock` | JWT Client | Дистанционное открытие двери кнопкой в приложении |
| `POST` | `/api/v1/locks/unlock-qr` | JWT Client | Открытие двери сканированием калиточного QR-кода |
| `GET` | `/api/v1/locks/active-access` | JWT Client | Получение актуального PIN-кода / eKey для текущего слота |
| `POST` | `/api/v1/bookings/spontaneous-join`| JWT Client | Спонтанный вход на текущую открытую игру через QR |

---

## 8. Администрирование и Аналитика Акимата (Admin & Akimat)

| Метод | Путь | Доступ | Назначение |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/akimat` | Публичный/Admin | Муниципальный аналитический отчет для Акимата |
| `GET` | `/api/v1/admin/analytics/venues/:id/heatmap` | JWT Admin | Почасовая тепловая карта загрузки площадки |
| `GET` | `/api/v1/admin/gateways` | JWT Admin | Мониторинг состояния IoT-шлюзов |
| `POST` | `/api/v1/admin/gateways/toggle` | JWT Admin | Тестовое переключение онлайн/офлайн статуса шлюза |
| `GET` | `/api/v1/admin/lock-logs` | JWT Admin | Полный журнал срабатывания замков |
| `GET` | `/api/v1/admin/bans` | JWT Admin | Реестр заблокированных нарушителей |
| `POST` | `/api/v1/admin/users/:userId/unban` | JWT Admin | Ручная разблокировка (удовлетворение апелляции) |
| `POST` | `/api/v1/admin/bookings/check-noshows` | JWT Admin | Принудительный триггер проверки неявок и авто-банов |
