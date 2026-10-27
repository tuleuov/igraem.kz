# 08-API — Data Types

> SPEC-08 · TypeScript types for API response contracts.

---

## Core Response Types

### `ApiSuccessResponse<T>`

Обёртка для всех успешных ответов.

```typescript
/**
 * SPEC-08: Standard success envelope for all API responses.
 * Used for single-resource and action responses.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}
```

### `ApiSuccessListResponse<T>`

Обёртка для ответов с коллекцией и пагинацией.

```typescript
/**
 * SPEC-08: Standard success envelope for paginated list responses.
 * All collection endpoints (GET /bookings/all, GET /grounds, etc.) use this type.
 */
export interface ApiSuccessListResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}
```

### `ApiErrorResponse`

Обёртка для всех ошибочных ответов.

```typescript
/**
 * SPEC-08: Standard error envelope.
 * `code` is always present for domain errors; omitted only for generic 500.
 */
export interface ApiErrorResponse {
  success: false;
  error: string;       // Human-readable, may be shown to user
  code?: ErrorCode;    // SCREAMING_SNAKE domain error code
}
```

### `ApiResponse<T>`

Union-тип для использования в клиентских хуках и fetch-утилитах.

```typescript
/**
 * SPEC-08: Discriminated union of success and error responses.
 * Narrowed via `response.success` boolean.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Usage example:
// const response: ApiResponse<Ground> = await fetchGround(id);
// if (response.success) {
//   console.log(response.data.name); // TypeScript knows data: Ground
// } else {
//   console.error(response.error, response.code);
// }
```

---

## `PaginationMeta`

```typescript
/**
 * SPEC-08: Pagination metadata returned with all list responses.
 * `total` is the count without pagination, used for page calculation.
 */
export interface PaginationMeta {
  page: number;    // Current page, 1-indexed
  limit: number;   // Items per page (1–100)
  total: number;   // Total records matching query (not paginated)
}

// Derived values (computed client-side):
// totalPages = Math.ceil(pagination.total / pagination.limit)
// hasNext    = pagination.page < totalPages
// hasPrev    = pagination.page > 1
```

---

## `HealthStatus`

```typescript
/**
 * SPEC-08: Shape of GET /health response body.
 * Not wrapped in ApiSuccessResponse — returned directly.
 * Used by load balancers and monitoring systems.
 */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;      // Server uptime in seconds
  timestamp: string;   // ISO 8601 UTC timestamp
  version: string;     // App version from package.json (semver)
  database: DatabaseHealthStatus;
}

export interface DatabaseHealthStatus {
  status: 'ok' | 'error';
  latencyMs?: number;   // Round-trip ping to DB in milliseconds
  error?: string;       // Present only when status === 'error'
}
```

---

## `ErrorCode`

```typescript
/**
 * SPEC-08: All possible domain error codes.
 * Must match codes returned by src/middlewares/errorHandler.ts.
 */
export type ErrorCode =
  // Auth domain
  | 'AUTH_TOKEN_MISSING'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_INSUFFICIENT_ROLE'
  | 'AUTH_USER_BANNED'
  // IIN domain
  | 'IIN_INVALID_FORMAT'
  | 'IIN_CHECKSUM_FAILED'
  // Ground domain
  | 'GROUND_NOT_FOUND'
  // Booking domain
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_SLOT_TAKEN'
  | 'BOOKING_WRONG_STATUS'
  | 'BOOKING_GUEST_NOT_FOUND'
  // Matchmaking domain
  | 'MATCHMAKING_ALREADY_JOINED'
  | 'MATCHMAKING_REQUEST_NOT_FOUND'
  // Lock domain
  | 'LOCK_ACCESS_DENIED'
  | 'LOCK_GATEWAY_OFFLINE'
  // Invitation domain
  | 'INVITATION_TOKEN_INVALID'
  | 'INVITATION_TOKEN_EXPIRED'
  // Rate limit
  | 'RATE_LIMIT_EXCEEDED'
  // Generic
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';
```

---

## Generic Fetch Utility Pattern

Рекомендуемый паттерн для клиентских fetch-хелперов:

```typescript
/**
 * SPEC-08: Type-safe API fetch wrapper.
 * Automatically attaches Authorization and X-Request-Id headers.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; requestId?: string } = {}
): Promise<ApiResponse<T>> {
  const { token, requestId, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Request-Id', requestId ?? crypto.randomUUID());
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api/v1${path}`, { ...fetchOptions, headers });
  const json = await res.json();

  // Narrow by success discriminant
  return json as ApiResponse<T>;
}
```

---

## Pagination Query Params

```typescript
/**
 * SPEC-08: Standard query params for all list endpoints.
 */
export interface PaginationQuery {
  page?: number;   // Default: 1, min: 1
  limit?: number;  // Default: 20, min: 1, max: 100
}
```

---

## JWT Payload

```typescript
/**
 * SPEC-08: Decoded JWT payload structure.
 * Set on req.user by auth middleware after verification.
 */
export interface JwtPayload {
  sub: string;              // User UUID (primary key)
  role: 'user' | 'admin';  // Authorization role
  iat: number;              // Issued at (Unix timestamp)
  exp: number;              // Expiry (Unix timestamp, default +24h)
}
```
