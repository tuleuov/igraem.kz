# WHAT — Feature 01: Authentication & Identity
> SDD Ref: **SPEC-01** | Module: `auth` | Stack: Node.js 20 · Express · TypeScript · Prisma/PostgreSQL · JWT · React 18

---

## Что делает фича

Фича `01-auth` обеспечивает полный цикл идентификации и аутентификации пользователя на платформе **Igraem.kz** — казахстанском сервисе бронирования спортивных объектов. Все пользователи — физические лица с казахстанским ИИН (индивидуальный идентификационный номер).

### Основные функции

1. **Регистрация** — новый пользователь вводит ИИН, номер телефона, ФИО, дату рождения, пол и пароль. Система валидирует ИИН двухпроходным алгоритмом контрольной суммы, проверяет, что номер телефона уникален, и сохраняет запись `User` в PostgreSQL. Пароль хранится в виде bcrypt-хеша.

2. **SMS OTP верификация** — перед завершением регистрации на телефон отправляется 4-значный одноразовый код. Повторная отправка заблокирована 60-секундным cooldown-ом.

3. **Вход (Login)** — пользователь аутентифицируется по номеру телефона + паролю. Система проверяет статусы `is_blocked` и `is_banned`/`banned_until` и выдаёт JWT Bearer-токен (TTL 7 дней).

4. **Профиль (me)** — защищённый эндпоинт возвращает текущий профиль пользователя из JWT-контекста без лишних запросов к БД (или с ним для актуальности данных).

5. **Валидация ИИН** — автономный эндпоинт (`POST /api/v1/iin/validate`) принимает строку ИИН и возвращает результат структурной и алгоритмической проверки, а также декодированные метаданные (дата рождения, пол).

---

## Пользовательский путь (user-facing)

| Шаг | Экран / действие | Результат |
|-----|-----------------|-----------|
| 1 | Открывает `/auth` → вкладка «Регистрация» | `AuthScreen.tsx` рендерит форму |
| 2 | Вводит ИИН → `onChange` trigger | Inline-валидация, декодирование ДР и пола |
| 3 | Заполняет телефон, ФИО, пароль → «Получить код» | POST `/api/v1/auth/register` (без confirmed=true) → отправка SMS |
| 4 | Вводит 4-значный OTP из SMS | POST `/api/v1/auth/register` с `otp_code` → 201 Created + JWT |
| 5 | Переход на `/auth` → «Вход» | POST `/api/v1/auth/login` → JWT или 403 с ban info |
| 6 | Защищённые страницы | GET `/api/v1/auth/me` → `UserProfile` |

---

## Затронутые модули и исходные файлы

### Backend

| Файл | Роль |
|------|------|
| `src/controllers/authController.ts` | Express route handlers: `register`, `login`, `me` |
| `src/utils/iinValidator.ts` | Двухпроходная валидация ИИН, декодирование ДР/пола |
| `src/middleware/authMiddleware.ts` | JWT verify middleware, инжекция `req.user` |
| `src/routes/authRoutes.ts` | Подключение роутов `/api/v1/auth/*` |
| `src/routes/iinRoutes.ts` | Роут `/api/v1/iin/validate` |
| `src/services/smsService.ts` | Отправка SMS OTP, хранение кода с TTL |
| `src/services/authService.ts` | Бизнес-логика регистрации/логина, bcrypt, JWT sign |
| `prisma/schema.prisma` | Модель `User` |

### Frontend

| Файл | Роль |
|------|------|
| `client/src/screens/AuthScreen.tsx` | Единый экран регистрации и входа (tab-переключение) |
| `client/src/hooks/useAuth.ts` | React context + state management для JWT, `UserProfile` |
| `client/src/api/authApi.ts` | Axios-обёртки над `/api/v1/auth/*` и `/api/v1/iin/validate` |
| `client/src/components/IinInput.tsx` | Контролируемый input с inline-валидацией ИИН |
| `client/src/components/OtpInput.tsx` | 4-ячейковый OTP input с таймером обратного отсчёта |

### Инфраструктура

| Ресурс | Назначение |
|--------|-----------|
| Redis (или in-memory store) | Хранение OTP-кодов с TTL 5 мин, cooldown-флагов 60 с |
| PostgreSQL | Основная БД, таблица `users` |
| JWT secret (`JWT_SECRET` env) | Подпись токенов HS256 |
| SMS-провайдер (env `SMS_API_KEY`) | Отправка OTP на казахстанские номера |

---

## Границы фичи (scope)

**Входит:**
- Регистрация через ИИН + телефон + пароль
- Верификация телефона через SMS OTP
- Login + JWT
- Блокировка / бан-проверка при входе
- Валидация ИИН (отдельный эндпоинт)
- Получение профиля (`/me`)

**Не входит:**
- OAuth / социальный вход (вне SPEC-01)
- Сброс пароля (SPEC-02)
- Управление ролями/правами (SPEC-05)
- 2FA после логина (вне SPEC-01)
