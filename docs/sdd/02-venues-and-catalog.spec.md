# 🏟️ SPEC-02: Каталог Площадок и Геолокация (Venues & Geolocation Specification)

> **Модуль**: `features/map`, `src/controllers/groundsController.ts`, `client/src/utils/geo.ts`  
> **Статус**: Действующая спецификация (Production Baseline)  
> **Инварианты**: [INV-06 (Защита школьных часов)](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md#inv-06-защита-учебного-времени-школьных-площадок), [INV-10 (Стандарты РК)](file:///Users/antontuleuov/.gemini/antigravity/scratch/igraem.kz/docs/sdd/00-system-invariants.md#inv-10-языковой-и-дизайн-стандарт-рк)

---

## 1. Обзор предметной области

Модуль отвечает за хранение каталога спортивных объектов (футбольные поля, баскетбольные и волейбольные площадки), их гео-привязку, расчет дистанции до пользователя, дифференциацию школьных и муниципальных кортов, а также привязку аппаратных токенов смарт-замков и QR-кодов входных калиток.

---

## 2. Модель данных (Data Model)

```prisma
model Ground {
  id                    String     @id @default(uuid())
  name                  String
  type                  String     // 'football' | 'volleyball' | 'basketball'
  address               String
  operating_schedule    String     // e.g. "08:00 - 23:00"
  cost_per_hour         Float
  latitude              Float      @default(50.060371)
  longitude             Float      @default(72.993374)
  allowed_radius_meters Int        @default(50)
  qr_code_token         String     @unique
  ttlock_lock_id        String
  ttlock_mac_address    String?
  is_school_court       Boolean    @default(true)
  school_hours_start    String     @default("08:00")
  school_hours_end      String     @default("15:00")
  school_days           String     @default("MON_FRI")
  rating                Float      @default(0.0)
  created_at            DateTime   @default(now())

  gateways   Gateway[]
  bookings   Booking[]
  reviews    Review[]
}
```

---

## 3. Функциональные требования (Requirements)

### REQ-VENUE-01: Фильтрация по городам и видам спорта
* **Описание**: Каталог поддерживает 4 ключевых города Казахстана: **Темиртау, Караганды, Астана, Алматы**, а также фильтрацию по видам спорта: «Все», «Футбол», «Баскетбол».
* **Критерии приемки**:
  - `Given`: Пользователь переключает фильтр города на «Астана».
  - `Then`: Карта плавно центрируется на координатах столицы, в списке отображаются только площадки с адресом в Астане.
  - `When`: Выбирается фильтр «Футбол».
  - `Then`: Скрываются баскетбольные корты, метки на карте обновляются соответствующими иконками.

### REQ-VENUE-02: Расчет дистанции по формуле Гаверсинуса (Haversine)
* **Описание**: Клиент вычисляет расстояние от текущих GPS-координат пользователя до каждой площадки с точностью до десятков метров.
* **Критерии приемки**:
  - `Given`: Пользователь находится в координатах $(50.060000, 72.990000)$.
  - `When`: Загружается карточка площадки с координатами $(50.060371, 72.993374)$.
  - `Then`: На карточке площадки отображается плашка расстояния: `«240 м от вас»` или `«1.2 км от вас»`.

### REQ-VENUE-03: Гео-валидация открытия замка (Allowed Radius)
* **Описание**: Отпирание двери площадки через мобильное приложение разрешено только в пределах заданного радиуса безопасности (по умолчанию 50 метров).
* **Критерии приемки**:
  - `Given`: Пользователь пытается открыть дверь, находясь в 200 метрах от площадки.
  - `When`: Нажимает кнопку «Открыть дверь».
  - `Then`: Система отклоняет запрос с предупреждением: `«Вы находитесь слишком далеко от площадки. Подойдите ближе (радиус до 50 метров)»`.

### REQ-VENUE-04: Уникальный QR-код на калитке площадки (`qr_code_token`)
* **Описание**: Каждая площадка имеет физическую табличку с динамическим QR-кодом, содержащим зашифрованный токен `qr_code_token`.
* **Критерии приемки**:
  - `Given`: Игрок сканирует QR-код на входе через камеру смартфона.
  - `When`: Отправляется запрос `GET /api/v1/grounds/qr/:qr_code_token`.
  - `Then`: Система возвращает детальные данные площадки и активную бронь на текущий временной слот.

### REQ-VENUE-05: Блокировка школьного времени для бронирования (School Court Lockout)
* **Описание**: Для площадок на территории общеобразовательных школ (`is_school_court = true`) запрещено создавать бронирования в интервале учебных занятий (Пн–Пт, 08:00–15:00).
* **Критерии приемки**:
  - `Given`: Площадка `Спорткомплекс Школы №9` (`is_school_court = true`).
  - `When`: Пользователь открывает сетку слотов на среду (будний день).
  - `Then`: Слоты с 08:00 до 15:00 помечены как *«Учебное время школьников (недоступно для аренды)»* и заблокированы для клика.

---

## 4. Спецификация API Контрактов (DTO)

### Получение списка площадок (`GET /api/v1/grounds`)
```json
// Response 200 OK
{
  "success": true,
  "data": [
    {
      "id": "ground-uuid-1",
      "name": "Футбольное поле им. Н. Абдирова",
      "type": "football",
      "address": "г. Караганда, пр. Бухар Жырау, 32",
      "cost_per_hour": 0,
      "latitude": 49.801878,
      "longitude": 73.088365,
      "rating": 4.9,
      "is_school_court": false,
      "operating_schedule": "08:00 - 23:00",
      "qr_code_token": "QR_TOKEN_KAR_01"
    }
  ]
}
```

---

## 5. Стратегия тестирования

| Требование | Название теста | Файл теста |
| :--- | :--- | :--- |
| **REQ-VENUE-02** | `Haversine formula computes accurate distance in meters` | `client/src/utils/geo.test.ts` |
| **REQ-VENUE-03** | `Rejects unlock request when distance exceeds allowed_radius_meters` | `src/controllers/locksController.test.ts` |
| **REQ-VENUE-05** | `Prevents booking slots during school hours for school courts` | `src/controllers/groundsController.test.ts` |
