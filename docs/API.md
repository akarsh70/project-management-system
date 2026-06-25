# API Reference — Hindlish mein

## Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://api.yourapp.com/api/v1
Swagger UI:  http://localhost:3000/api/docs
```

## Authentication

Sab protected endpoints par ye headers chahiye:

```
Authorization: Bearer <accessToken>
x-organization-id: <orgId>
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/auth/login",
  "correlationId": "550e8400-e29b-41d4-a716",
  "error": {
    "message": "Invalid email or password",
    "code": "UNAUTHORIZED"
  }
}
```

---

## Auth Endpoints

### POST /auth/register

Naya user register karo.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation:**
- `email`: Valid email format required
- `password`: Minimum 8 characters
- `firstName`, `lastName`: Non-empty strings

**Response (201):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000abc...",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": null,
      "isActive": true
    }
  }
}
```

**Errors:**
- `400` — Validation failed
- `409` — Email already registered

---

### POST /auth/login

Email aur password se login karo.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):** Same as register

**Errors:**
- `401` — Invalid credentials
- `429` — Too many login attempts (rate limited)

---

### POST /auth/refresh

Access token renew karo using refresh token.

**Request:**
```json
{
  "refreshToken": "raw-refresh-token-here"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

**Errors:**
- `401` — Invalid/expired/revoked refresh token

---

### POST /auth/logout

🔒 Requires: JWT

Sab devices se logout karo.

**Response (200):**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

### GET /auth/me

🔒 Requires: JWT

Current authenticated user info.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Organizations Endpoints

### POST /organizations

🔒 Requires: JWT

Naya organization banao. Creator automatically ADMIN banta hai.

**Request:**
```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "org-uuid",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "logoUrl": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### GET /organizations/mine

🔒 Requires: JWT

Current user ki sab organizations aur unki roles.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "org-uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "role": "ADMIN",
      "memberCount": 5
    }
  ]
}
```

---

### GET /organizations/:orgId

🔒 Requires: JWT + Member

Organization details.

---

### PATCH /organizations/:orgId

🔒 Requires: JWT + ADMIN role

Update organization name/logo.

**Request:**
```json
{
  "name": "New Name",
  "logoUrl": "https://cdn.example.com/logo.png"
}
```

---

## Members Endpoints

### GET /organizations/:orgId/members

🔒 Requires: JWT + Member

Org ke sab members.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "membership-uuid",
      "userId": "user-uuid",
      "role": "ADMIN",
      "isActive": true,
      "user": {
        "id": "user-uuid",
        "email": "admin@example.com",
        "firstName": "Admin",
        "lastName": "User"
      }
    }
  ]
}
```

---

### POST /organizations/:orgId/members

🔒 Requires: JWT + ADMIN role

Naya member add karo.

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "EDITOR"
}
```

**Errors:**
- `404` — User with email not found
- `409` — Already a member

---

### PATCH /organizations/:orgId/members/:memberId

🔒 Requires: JWT + ADMIN role

Member ka role change karo.

**Request:**
```json
{
  "role": "VIEWER"
}
```

**Errors:**
- `400` — Cannot demote last ADMIN

---

### DELETE /organizations/:orgId/members/:memberId

🔒 Requires: JWT + ADMIN role

Member remove karo.

---

## Projects Endpoints

### GET /organizations/:orgId/projects

🔒 Requires: JWT + Member

Org ke sab active projects.

**Query Parameters:**
- `search` — Project name search
- `status` — Filter by status (ACTIVE, ARCHIVED)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "project-uuid",
      "name": "Website Redesign",
      "description": "...",
      "status": "ACTIVE",
      "organizationId": "org-uuid",
      "createdBy": "user-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /organizations/:orgId/projects

🔒 Requires: JWT + EDITOR role

Naya project banao.

**Request:**
```json
{
  "name": "New Project",
  "description": "Project description here"
}
```

---

### GET /organizations/:orgId/projects/:id

🔒 Requires: JWT + Member

Single project details with tasks.

---

### PATCH /organizations/:orgId/projects/:id

🔒 Requires: JWT + EDITOR role

Project update karo.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "ARCHIVED"
}
```

**Note:** EDITOR sirf apna project edit kar sakta hai. ADMIN kisi ka bhi.

---

### DELETE /organizations/:orgId/projects/:id

🔒 Requires: JWT + EDITOR role

Soft delete karo (status = DELETED).

---

## Tasks Endpoints

### GET /organizations/:orgId/projects/:projectId/tasks

🔒 Requires: JWT + Member

Project ke sab tasks.

**Query Parameters:**
- `status` — Filter by status (TODO, IN_PROGRESS, REVIEW, DONE)
- `assignedTo` — Filter by assignee userId
- `priority` — Filter by priority (LOW, MEDIUM, HIGH, URGENT)

---

### POST /organizations/:orgId/projects/:projectId/tasks

🔒 Requires: JWT + EDITOR role

Naya task banao.

**Request:**
```json
{
  "title": "Implement login page",
  "description": "React form with validation",
  "status": "TODO",
  "priority": "HIGH",
  "assignedTo": "user-uuid",
  "dueDate": "2024-02-01"
}
```

---

### PATCH /organizations/:orgId/tasks/:taskId

🔒 Requires: JWT + EDITOR role

Task update karo (status change, reassign, etc.).

---

### DELETE /organizations/:orgId/tasks/:taskId

🔒 Requires: JWT + EDITOR role

Task delete karo.

---

## Notifications Endpoints

### GET /organizations/:orgId/notifications

🔒 Requires: JWT + Member

Current user ke notifications.

**Query Parameters:**
- `unreadOnly=true` — Sirf unread

---

### PATCH /organizations/:orgId/notifications/:id/read

🔒 Requires: JWT + Member

Notification mark as read.

---

### PATCH /organizations/:orgId/notifications/read-all

🔒 Requires: JWT + Member

Sab notifications mark as read.

---

## Users Endpoints

### GET /users/profile

🔒 Requires: JWT

Current user ka profile.

---

### PATCH /users/profile

🔒 Requires: JWT

Profile update karo.

**Request:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "avatarUrl": "https://cdn.example.com/avatar.jpg"
}
```

---

### PATCH /users/password

🔒 Requires: JWT

Password change karo.

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

---

## Payments Endpoints

### POST /organizations/:orgId/payments

🔒 Requires: JWT + ADMIN role

Payment initiate karo.

**Request:**
```json
{
  "amount": 99900,
  "currency": "INR",
  "description": "Pro plan subscription"
}
```

---

## Health Endpoints

### GET /health

Public endpoint — No auth required.

**Response (200):**
```json
{
  "status": "ok",
  "info": {
    "postgresql": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

---

## Error Codes

| HTTP Status | When |
|------------|------|
| 400 | Validation failed, bad request |
| 401 | Missing or invalid JWT token |
| 403 | Insufficient permissions (not a member, wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, already a member) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Rate Limits

| Endpoint Pattern | Limit |
|-----------------|-------|
| `POST /auth/login` | 10 req/min |
| `POST /auth/register` | 10 req/min |
| All other API endpoints | 100 req/min |
