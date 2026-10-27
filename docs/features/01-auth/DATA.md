# DATA — Feature 01: Authentication & Identity
> SDD Ref: **SPEC-01** | Module: `auth` | Source: `prisma/schema.prisma`, `src/controllers/authController.ts`

---

## 1. Prisma Model — `User`

```prisma
model User {
  id            String    @id @default(uuid())
  iin           String    @unique
  phone_number  String    @unique
  full_name     String
  birth_date    DateTime
  gender        String    // 'male' | 'female'
  role          String    @default("client") // 'client' | 'admin'
  is_blocked    Boolean   @default(false)
  is_banned     Boolean   @default(false)
  banned_until  DateTime?
  password_hash String
  email         String?
  avatar_url    String?
  created_at    DateTime  @default(now())
}
```

### Описание полей модели `User`

| Поле | Тип Prisma | SQL тип | Ограничения | Описание |
|------|-----------|---------|-------------|----------|
| `id` | `String` | `TEXT` | PK, NOT NULL, `uuid()` | UUID v4, генерируется БД |
| `iin` | `String` | `TEXT` | NOT NULL, UNIQUE | 12-цифровой ИИН (РК), см. [AUTH-R-09..15] |
| `phone_number` | `String` | `TEXT` | NOT NULL, UNIQUE | E.164 формат `+7XXXXXXXXXX` |
| `full_name` | `String` | `TEXT` | NOT NULL | ФИО, 2–150 символов |
| `birth_date` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | Дата рождения; совпадает с ИИН [AUTH-R-14] |
| `gender` | `String` | `TEXT` | NOT NULL, `'male'\|'female'` | Пол; совпадает с ИИН [AUTH-R-15] |
| `role` | `String` | `TEXT` | NOT NULL, default `'client'` | `'client'` или `'admin'` |
| `is_blocked` | `Boolean` | `BOOL` | NOT NULL, default `false` | Перманентная блокировка (Admin action) |
| `is_banned` | `Boolean` | `BOOL` | NOT NULL, default `false` | Флаг временного бана |
| `banned_until` | `DateTime?` | `TIMESTAMPTZ` | NULLABLE | Дата окончания бана; NULL = бессрочно если `is_banned` |
| `password_hash` | `String` | `TEXT` | NOT NULL | bcrypt hash, `saltRounds=12` |
| `email` | `String?` | `TEXT` | NULLABLE | Опциональная почта, уникальность не enforced |
| `avatar_url` | `String?` | `TEXT` | NULLABLE | Абсолютный URL аватара (CDN или S3) |
| `created_at` | `DateTime` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Timestamp создания записи |

---

## 2. TypeScript Interfaces

### `UserProfile` — публичный профиль пользователя (возвращается в `/me`)

```typescript
// src/types/auth.types.ts
export interface UserProfile {
  id: string;              // UUID
  iin: string;             // 12-digit string
  phone_number: string;    // "+7XXXXXXXXXX"
  full_name: string;
  birth_date: string;      // ISO 8601 date: "YYYY-MM-DD"
  gender: 'male' | 'female';
  role: 'client' | 'admin';
  is_blocked: boolean;
  is_banned: boolean;
  banned_until: string | null; // ISO 8601 datetime or null
  email: string | null;
  avatar_url: string | null;
  created_at: string;      // ISO 8601 datetime
}
```

> Поля `password_hash` **никогда** не включаются в `UserProfile`. Маппинг через Prisma `omit` или явный destructure.

---

### `AuthResponse` — ответ при успешном логине или регистрации

```typescript
// src/types/auth.types.ts
export interface AuthResponse {
  token: string;       // JWT Bearer token, TTL 7d
  user: UserProfile;
}
```

---

### `RegisterDTO` — тело запроса `POST /api/v1/auth/register` (с OTP)

```typescript
// src/types/auth.types.ts
export interface RegisterDTO {
  iin: string;           // required — 12 digits
  phone_number: string;  // required — E.164 "+7XXXXXXXXXX"
  full_name: string;     // required — 2–150 chars
  birth_date: string;    // required — "YYYY-MM-DD"
  gender: 'male' | 'female'; // required
  password: string;      // required — min 8 chars, ≥1 digit, ≥1 letter
  email?: string;        // optional
  otp_code?: string;     // optional — 4 digits; absence triggers OTP send
}
```

> При отсутствии `otp_code` контроллер переходит в режим «запрос OTP» (см. [AUTH-R-28]).  
> При наличии `otp_code` — режим «подтверждение» (см. [AUTH-R-29]).

---

### `LoginDTO` — тело запроса `POST /api/v1/auth/login`

```typescript
// src/types/auth.types.ts
export interface LoginDTO {
  phone_number: string; // required — E.164
  password: string;     // required
}
```

---

### `IinValidateDTO` — тело запроса `POST /api/v1/iin/validate`

```typescript
// src/types/auth.types.ts
export interface IinValidateDTO {
  iin: string; // required — string to validate
}
```

---

### `IinValidateResponse` — ответ валидации ИИН

```typescript
// src/types/auth.types.ts
export interface IinValidateResponse {
  valid: boolean;
  decoded?: {
    birth_date: string;          // "YYYY-MM-DD"
    gender: 'male' | 'female';
    century: 'XIX' | 'XX' | 'XXI';
  };
  error?: {
    code: string;   // IIN_INVALID_FORMAT | IIN_INVALID_STRUCTURE | IIN_INVALID_CHECKSUM
    message: string;
  };
}
```

---

## 3. Redis Key Schema (OTP store)

| Ключ | Тип | TTL | Значение |
|------|-----|-----|---------|
| `otp:<phone_number>:code` | `string` | 300 с | 4-значный OTP-код |
| `otp:<phone_number>:attempts` | `string` | 300 с | Счётчик неверных попыток (0–5) |
| `otp:<phone_number>:cooldown` | `string` | 60 с | Маркер cooldown (значение `"1"`) |

---

## 4. JWT Payload Schema

```typescript
export interface JwtPayload {
  sub: string;          // user.id (UUID)
  phone: string;        // user.phone_number
  role: 'client' | 'admin';
  iat: number;          // issued at (Unix timestamp)
  exp: number;          // expiry: iat + 604800 (7 days)
}
```

---

## 5. Zod Validation Schemas (runtime)

```typescript
// src/validators/auth.validators.ts
import { z } from 'zod';

export const registerSchema = z.object({
  iin: z.string().regex(/^\d{12}$/, 'IIN must be exactly 12 digits'),
  phone_number: z.string().regex(/^\+7[7]\d{9}$/, 'Invalid KZ phone format'),
  full_name: z.string().min(2).max(150),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  gender: z.enum(['male', 'female']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one digit'),
  email: z.string().email().optional(),
  otp_code: z.string().regex(/^\d{4}$/).optional(),
});

export const loginSchema = z.object({
  phone_number: z.string().regex(/^\+7[7]\d{9}$/),
  password: z.string().min(1),
});

export const iinValidateSchema = z.object({
  iin: z.string(),
});
```
