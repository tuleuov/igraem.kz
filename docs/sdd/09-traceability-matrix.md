# 🔗 SPEC-09: Матрица Трассируемости Требований (Traceability Matrix)

> **Назначение**: Полная сквозная трассировка: `Требование (REQ) ↔ Спецификация (SPEC) ↔ Код Реализации ↔ Автоматические Тесты`  
> **Статус**: Действующая матрица соответствия (Compliance Baseline)

---

## 1. Сводная таблица трассируемости

| ID Требования | Наименование требования | Спецификация | Исполняемый код (Implementation) | Авто-тесты (Verification) |
| :--- | :--- | :--- | :--- | :--- |
| **INV-01** | Суточный лимит бронирования (3ч) | [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `src/controllers/bookingsController.ts` | `src/controllers/bookingsController.test.ts` |
| **INV-02** | Валидность и уникальность ИИН РК | [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `src/utils/iinValidator.ts`, `schema.prisma` | `src/utils/iinValidator.test.ts` |
| **INV-03** | Авто-бан на 72 часа (Overstay & No-Show)| [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `src/services/cronService.ts`, `bookingsController.ts` | `src/controllers/bookingsController.test.ts` |
| **INV-04** | Отказоустойчивость доступа к замку | [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `src/services/ttlockService.ts`, `locksController.ts`| `src/services/ttlockService.test.ts` |
| **INV-05** | Запрет наложения слотов (Anti-Overlap) | [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `src/controllers/bookingsController.ts` | `src/controllers/bookingsController.test.ts` |
| **INV-06** | Защита учебных часов в школах | [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `src/controllers/groundsController.ts` | `src/controllers/groundsController.test.ts` |
| **INV-07** | Сессия 55 минут + 5 минут грейс | [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `client/src/components/VenueOpenedScreen.tsx` | `client/src/components/VenueOpenedScreen.test.ts` |
| **INV-08** | Блокировка функций забаненного юзера | [00-system-invariants.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md) | `src/middlewares/authMiddleware.ts`, `BannedUserScreen` | `src/controllers/authController.test.ts` |
| **REQ-AUTH-01** | Формат казахстанского номера +7 (7XX) | [01-auth-and-identity.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/01-auth-and-identity.spec.md) | `client/src/components/AuthScreen.tsx` | `src/utils/auth.test.ts` |
| **REQ-AUTH-02** | Защита от спама SMS (таймер 60с) | [01-auth-and-identity.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/01-auth-and-identity.spec.md) | `client/src/components/AuthScreen.tsx` | `client/src/components/AuthScreen.test.ts` |
| **REQ-AUTH-05** | Алгоритмическая проверка ИИН (веса) | [01-auth-and-identity.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/01-auth-and-identity.spec.md) | `src/utils/iinValidator.ts` | `src/utils/iinValidator.test.ts` |
| **REQ-VENUE-02**| Дистанция по формуле Гаверсинуса | [02-venues-and-catalog.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/02-venues-and-catalog.spec.md) | `client/src/utils/geo.ts` | `client/src/utils/geo.test.ts` |
| **REQ-VENUE-03**| Гео-радиус открытия замка (до 50м) | [02-venues-and-catalog.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/02-venues-and-catalog.spec.md) | `src/controllers/locksController.ts` | `src/controllers/locksController.test.ts` |
| **REQ-BOOK-03** | Стилизация и клик по занятым слотам | [03-booking-and-slot-engine.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/03-booking-and-slot-engine.spec.md) | `client/src/components/VenueCardModal.tsx` | `client/src/components/VenueCardModal.test.ts` |
| **REQ-LOCK-02** | Генерация офлайн PIN-кода при сбое сети| [04-smart-locks-ttlock.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/04-smart-locks-ttlock.spec.md) | `src/services/ttlockService.ts` | `src/services/ttlockService.test.ts` |
| **REQ-SES-03**  | Разделение кнопок Организатор/Участник | [05-session-and-overstay-ban.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/05-session-and-overstay-ban.spec.md) | `client/src/components/VenueOpenedScreen.tsx` | `client/src/components/VenueOpenedScreen.test.ts` |
| **REQ-SOC-03**  | Фильтрация слотов без заявок | [06-matchmaking-and-social.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/06-matchmaking-and-social.spec.md) | `client/src/components/RequestsTab.tsx` | `client/src/components/RequestsTab.test.ts` |
| **REQ-ADM-01**  | Отчет для Акимата по использованию кортов| [07-admin-and-akimat-analytics.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/07-admin-and-akimat-analytics.spec.md) | `src/controllers/adminController.ts` | `src/controllers/adminController.test.ts` |
| **REQ-SYS-01**  | Проверка здоровья сервиса и БД | [08-api-contracts.spec.md](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/08-api-contracts.spec.md) | `src/controllers/healthController.ts` | `src/routes/health.test.ts` |
