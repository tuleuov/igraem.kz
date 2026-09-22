# 🔐 Бизнес-сценарий: Авторизация по SMS и Регистрация по ИИН

> **Модуль**: `features/auth` (`AuthScreen.tsx`)  
> **Цель**: Обеспечить быстрый беспарольный вход для существующих пользователей и обязательную регистрацию с проверкой ИИН для новых пользователей.

---

## 1. Описание сценария

Пользователь открывает приложение igraem.kz. Если он не авторизован, ему показывается экран ввода казахстанского номера телефона. Процесс разбит на 3 последовательных шага.

---

## 2. Шаги обработки (Flow Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as AuthScreen.tsx
    participant API as Backend API
    participant SMS as SMS Gateway

    User->>UI: Ввод номера телефона +7 (7XX) XXX-XX-XX
    UI->>UI: Валидация формата номера (10 цифр)
    User->>UI: Клик "Получить SMS код"
    UI->>API: POST /api/v1/auth/request-otp
    API->>SMS: Отправка 4-значного OTP кода
    UI->>UI: Переход на Шаг 2 (OTP) + запуск 60-сек таймера

    User->>UI: Ввод 4 цифр из SMS
    UI->>API: POST /api/v1/auth/verify-otp
    alt Номер есть в базе (Зарегистрирован)
        API-->>UI: 200 OK + JWT Token + UserProfile
        UI->>User: Переход в главное приложение (Карта)
    else Номер отсутствует в базе (Новый пользователь)
        API-->>UI: 200 OK (User Not Found)
        UI->>UI: Переход на Шаг 3 (Форма Личных данных)
        User->>UI: Ввод Имени, Фамилии и ИИН (12 цифр)
        UI->>UI: Валидация ИИН по контрольной сумме РК
        User->>UI: Клик "Завершить регистрацию"
        UI->>API: POST /api/v1/auth/complete-profile
        API-->>UI: 201 Created + JWT Token + UserProfile
        UI->>User: Переход в главное приложение
    end
```

---

## 3. Входные и Выходные данные

### Входные данные:
* `phoneDigits`: 10 цифр номера телефона РК.
* `otpDigits`: 4 цифры из SMS.
* `fullName`: Имя и Фамилия (при регистрации).
* `iin`: 12 цифр ИИН Республики Казахстан (при регистрации).

### Выходные данные:
* `userProfile`: Объект профиля пользователя (`id`, `full_name`, `phone_number`, `iin`, `role`).
* `token`: JWT-токен авторизации в `localStorage`.
