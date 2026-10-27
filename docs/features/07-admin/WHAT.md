# WHAT — Admin Dashboard Feature
**SPEC-07** | Igraem.kz — Sports Venue Booking Platform (Kazakhstan)

---

## 1. Feature Overview

Фича `07-admin` реализует полный административный бэк-офис платформы Igraem.kz. Включает три основные зоны:
1. **Управление площадками** — создание, редактирование, мониторинг Gateway-устройств и Lock-логов.
2. **Аналитика** — оперативный дашборд, heatmap загруженности, аналитика по игрокам, отчётность для Акимата.
3. **Управление пользователями** — список пользователей, ручная блокировка/разблокировка, просмотр активных банов.

Доступ к фиче — исключительно для пользователей с `User.role = 'admin'`. Все действия логируются для audit trail.

---

## 2. Admin Role

| Атрибут | Значение |
|---|---|
| Поле модели | `User.role` |
| Значение для доступа | `'admin'` |
| Проверка | JWT middleware `requireAdmin` на каждом роуте `/api/v1/admin/*` |
| Frontend route | `/admin` (защищён `AdminGuard`) |

Роль присваивается напрямую в базе данных или суперадмином. Самостоятельная смена роли через API **запрещена**.

---

## 3. Dashboard Overview

Frontend-дашборд располагается по пути `/admin` и реализован в компоненте `client/src/screens/AdminDashboard.tsx`.

### Вкладки дашборда

| Tab | Содержимое | API |
|---|---|---|
| **Overview** | KPI-карточки: bookings, revenue, active users, uptime | `GET /api/v1/admin/analytics/overview` |
| **Venues** | Список площадок, создание/редактирование | `POST /api/v1/admin/grounds`, `PUT /api/v1/admin/grounds/:id` |
| **Heatmap** | 7×24 матрица загруженности площадки | `GET /api/v1/admin/analytics/venues/:venueId/heatmap` |
| **Players** | Топ игроков по площадке | `GET /api/v1/admin/analytics/venues/:venueId/players` |
| **Gateways** | Статус IoT-шлюзов, ручное переключение | `GET /api/v1/admin/gateways`, `POST /api/v1/admin/gateways/toggle` |
| **Lock Logs** | Журнал открытий замков с фильтрами | `GET /api/v1/admin/lock-logs` |
| **Users** | Список пользователей, бан/разбан | `GET /api/v1/admin/users`, `POST /api/v1/admin/users/:userId/ban` |
| **Bans** | Список активных банов | `GET /api/v1/admin/bans` |
| **Akimat** | Civics-отчёт для государственных органов | `GET /api/v1/analytics/akimat` |
| **Stats** | Системная статистика (CPU, DB, latency) | `GET /api/v1/admin/stats` |

---

## 4. Affected Modules

### Backend
| Модуль | Путь | Назначение |
|---|---|---|
| Controller | `src/controllers/adminController.ts` | Все admin-хендлеры |
| Middleware | `src/middleware/requireAdmin.ts` | Проверка `User.role = 'admin'` |
| Analytics Service | `src/services/analyticsService.ts` | Генерация heatmap, Akimat-отчёта, overview |
| Ban Service | `src/services/banService.ts` | Логика бана/разбана |
| Gateway Service | `src/services/gatewayService.ts` | Toggle online/offline |
| Audit Logger | `src/services/auditLogger.ts` | Запись действий администратора |

### Frontend
| Модуль | Путь | Назначение |
|---|---|---|
| Admin Dashboard | `client/src/screens/AdminDashboard.tsx` | Главный экран дашборда |
| Heatmap Widget | `client/src/components/admin/HeatmapGrid.tsx` | 7×24 визуализация |
| Ban Modal | `client/src/components/admin/BanModal.tsx` | Форма ручного бана |
| Gateway Card | `client/src/components/admin/GatewayCard.tsx` | Карточка IoT-шлюза |

### Database Models
- `User` — роль и статус
- `UserBan` — баны пользователей
- `VenueDailyStats` — ежедневная статистика площадки
- `Gateway` — IoT-шлюзы
- `LockLog` — журнал открытий замков

---

## 5. Non-Goals (Out of Scope for SPEC-07)

- Создание ролей суперадмина / Igraem operator — выходит за рамки данной спецификации.
- Финансовая отчётность и выплаты — SPEC-08.
- Push-нотификации администратору — SPEC-09.
