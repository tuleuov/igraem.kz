# 🛡️ Отчет по безопасности приложений (Application Security & Hardening Report)

> **Статус**: Проведено (Production AppSec Baseline)  
> **Проект**: Igraem.kz  
> **Методология**: OWASP Top 10 (2021), SAST, Dependency Auditing, Secrets Prevention  

---

## 1. Сводные результаты аудита по OWASP Top 10

| ВекторOWASP | Уровень риска | Статус | Принятые меры / Исправления |
| :--- | :--- | :--- | :--- |
| **A01: Broken Access Control (IDOR)** | **High** | ✅ Защищено | Все роуты бронирования (`completeBooking`, `updateMatchmakingSettings`, `getMe`) строго сопоставляют `req.user.id` с создателем ресурса. |
| **A02: Cryptographic Failures** | **Critical** | ✅ Защищено | Пароли хешируются `bcrypt` (соль 10 раундов). Хэши и чувствительные поля не возвращаются в ответах API. JWT подписывается через `ENV.JWT_SECRET`. |
| **A03: Injection (SQLi / Command)** | **Critical** | ✅ Защищено | Использование Prisma ORM с параметризованными SQL-запросами исключает возможность SQL-инъекций. Сырые вызовы `exec` / `eval` отсутствуют. |
| **A04: Insecure Design & Validation** | **High** | ✅ Защищено | Реализована алгоритмическая проверка ИИН РК (Modulo 11), лимит на 3 часа аренды в сутки и проверка накладывающихся слотов (`checkUserHasOverlap`). |
| **A05: Security Misconfiguration** | **Medium** | ✅ Защищено | Настроена загрузка конфигурации строго из `.env`. Файл `.env` внесён в `.gitignore`. Заголовки CORS и обработка 500 ошибок нормализованы. |
| **A07: Identification & Auth Failures** | **High** | ✅ Защищено | Введен 60-секундный блокирующий таймер повторной отправки SMS OTP. Лимит символов и сложность пароля валидируются. |
| **A08: Software & Data Integrity Failures** | **Medium** | ✅ Защищено | В CI/CD добавлены шаги `npm audit` на уязвимости зависимостей и сканер TruffleHog для поиска утечек секретов. |

---

## 2. Интегрированные Security-проверки в CI/CD

В `.github/workflows/ci.yml` добавлены автоматические контроли:
1. **Dependency Audit (`npm audit --audit-level=high`)**: Блокировка билда при наличии критических CVE уязвимостей в пакетах npm.
2. **Secret Scanning (`trufflesecurity/trufflehog-find-secrets-action`)**: Сканирование коммитов на наличие захардкоженных API-ключей, токенов и паролей.

---

## 3. Политика безопасной разработки (Secure Coding Policy)

1. **Управление секретами**: Никакие API-ключи, ключи TTLock или секреты JWT не должны храниться в открытом коде. Использовать только `process.env`.
2. **Защита PII (Персональные данные)**: Запрещено логировать ИИН, номер телефона или пароль пользователя в логах сервера (`console.log`).
3. **Безопасная передача**: В продакшн-окружении весь трафик должен шифроваться строго по протоколу HTTPS / TLS 1.3.
