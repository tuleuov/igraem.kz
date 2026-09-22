# 🛡️ Отчет по безопасности приложений (Application Security & Hardening Report)

> **Статус**: Проведено (Production AppSec Baseline)  
> **Проект**: Igraem.kz  
> **Методология**: OWASP Top 10 (2021), SAST, Dependency Auditing, Secrets Prevention, Network & Transport Hardening  

---

## 1. Сводные результаты аудита по OWASP Top 10

| Вектор OWASP | Уровень риска | Статус | Принятые меры / Исправления |
| :--- | :--- | :--- | :--- |
| **A01: Broken Access Control (IDOR)** | **High** | ✅ Защищено | Все роуты бронирования (`completeBooking`, `updateMatchmakingSettings`, `getMe`) строго сопоставляют `req.user.id` с создателем ресурса. |
| **A02: Cryptographic Failures** | **Critical** | ✅ Защищено | Пароли хешируются `bcrypt` (соль 10 раундов). Хэши и чувствительные поля не возвращаются в ответах API. JWT подписывается через `ENV.JWT_SECRET`. |
| **A03: Injection (SQLi / Command)** | **Critical** | ✅ Защищено | Использование Prisma ORM с параметризованными SQL-запросами исключает возможность SQL-инъекций. Сырые вызовы `exec` / `eval` отсутствуют. |
| **A04: Insecure Design & Validation** | **High** | ✅ Защищено | Внедрена строгая валидация входящих данных через `zod` (`authRegisterSchema`, `authLoginSchema`, `createBookingSchema`), алгоритмическая проверка ИИН РК (Modulo 11) и лимит 3ч/день. |
| **A05: Security Misconfiguration** | **Medium** | ✅ Защищено | Подключен `helmet` (HTTP Security Headers), строгий CORS по `CORS_ALLOWED_ORIGINS`, ограничение размера JSON-пакета до 1MB (`express.json({ limit: '1mb' })`). |
| **A07: Identification & Auth Failures** | **High** | ✅ Защищено | Введен `express-rate-limit` (строгий лимит 15 запросов в 15 минут для аутентификации, 300 для общего API) для защиты от перебора и Brute-Force/DoS. |
| **A08: Software & Data Integrity Failures** | **Medium** | ✅ Защищено | В CI/CD добавлены шаги `npm audit` на уязвимости зависимостей и сканер TruffleHog для поиска утечек секретов. |

---

## 2. Сетевая и Инфраструктурная защита (Network & Transport Hardening)

1. **HTTP Security Headers (`helmet`)**:
   * Автоматическая установка заголовоков защиты: `X-DNS-Prefetch-Control`, `X-Frame-Options` (DENY), `X-Content-Type-Options` (nosniff), `Strict-Transport-Security` (HSTS).
2. **Динамическая настройка CORS (`cors`)**:
   * Разрешенные `origin` конфигурируются строго через переменную окружения `CORS_ALLOWED_ORIGINS`. Запрещен `origin: '*'` в production-средах.
3. **Защита от Brute-Force и DoS-атак (`express-rate-limit`)**:
   * `authLimiter`: максимум 15 попыток в 15 минут на маршрутах `/api/v1/auth/*`.
   * `apiLimiter`: максимум 300 запросов в 15 минут на общих эндпоинтах `/api/*`.
4. **Защита от переполнения памяти (Buffer Overflow DoS)**:
   * Ограничение входящих объемов тел запросов `express.json({ limit: '1mb' })` и `express.urlencoded({ limit: '1mb' })`.

---

## 3. Интегрированные Security-проверки в CI/CD

В `.github/workflows/ci.yml` добавлены автоматические контроли:
1. **Dependency Audit (`npm audit --audit-level=high`)**: Блокировка билда при наличии критических CVE уязвимостей в пакетах npm.
2. **Secret Scanning (`trufflesecurity/trufflehog-find-secrets-action`)**: Сканирование коммитов на наличие захардкоженных API-ключей, токенов и паролей.

---

## 4. Политика безопасной разработки (Secure Coding Policy)

1. **Управление секретами**: Никакие API-ключи, ключи TTLock или секреты JWT не должны храниться в открытом коде. Использовать только `process.env`.
2. **Защита PII (Персональные данные)**: Запрещено логировать ИИН, номер телефона или пароль пользователя в логах сервера (`console.log`).
3. **Безопасная передача**: В продакшн-окружении весь трафик должен шифроваться строго по протоколу HTTPS / TLS 1.3.
