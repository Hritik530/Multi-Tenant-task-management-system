
# Multi-Tenant Task Management System

A production-grade multi-tenant task management web application (similar to Trello/Asana) where multiple organizations can use the same system simultaneously while keeping their data completely isolated from each other.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Multi-Tenancy](#multi-tenancy)
- [Audit Logs](#audit-logs)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [Security](#security)

## Features

### Core Features
- **Multi-Tenancy**: Complete data isolation between organizations
- **User Management**: Role-based access control (Admin/Member)
- **Task Management**: Full CRUD operations with status and priority
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Audit Logging**: Complete audit trail for all task operations

### Security Features
- Tenant isolation at database query level
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- Helmet.js for HTTP security headers
- Input validation with Joi

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Optional)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Backend                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Controllers │  │     Middleware      │  │
│  │  - /auth    │  │  - Auth     │  │  - Authentication   │  │
│  │  - /tasks   │  │  - Task     │  │  - Tenant Isolation│  │
│  │  - /audit   │  │  - AuditLog │  │  - RBAC            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│   PostgreSQL     │  │    Redis     │  │     App     │
│   (Database)     │  │ (Token Store)│  │   Memory    │
└──────────────────┘  └──────────────┘  └──────────────┘
```

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + bcryptjs
- **Validation**: Joi
- **Security**: Helmet.js, express-rate-limit
- **Logging**: Winston
- **Containerization**: Docker + Docker Compose

## Project Structure

```
/src
  /config          → Database configuration
  /controllers     → Route handler logic
  /middleware       → Auth, permission, error handling
  /models          → Prisma schema (database models)
  /routes          → API route definitions
  /services        → Business logic layer
  /utils           → Helper functions (JWT, hashing, validation)
/prisma            → Database schema
/tests             → Unit and integration tests
Dockerfile
docker-compose.yml
.env.example
README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multi-tenant-task-management
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Generate Prisma Client**
   ```bash
   npm run generate
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

### Docker Setup

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f app
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | postgresql://postgres:postgres@db:5432/taskmanager |
| `JWT_SECRET` | Secret key for JWT tokens | (change in production) |
| `JWT_EXPIRY` | JWT token expiry time | 24h |
| `REFRESH_TOKEN_SECRET` | Secret for refresh tokens | (change in production) |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiry | 7d |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `REDIS_URL` | Redis connection string | redis://redis:6379 |
| `CORS_ORIGIN` | Allowed CORS origins | http://localhost:3000 |

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/auth/register` | Register new org + admin | No |
| POST | `/auth/login` | Login and get tokens | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout and invalidate token | Yes |
| GET | `/auth/profile` | Get current user profile | Yes |

### Users (Admin Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| GET | `/auth/users` | List all org users | Yes (Admin) |
| POST | `/auth/users/invite` | Invite new user | Yes (Admin) |
| DELETE | `/auth/users/:id` | Remove user | Yes (Admin) |

### Tasks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/tasks` | Create new task | Yes |
| GET | `/tasks` | List all accessible tasks | Yes |
| GET | `/tasks/:id` | Get specific task | Yes |
| PUT | `/tasks/:id` | Update task | Yes |
| DELETE | `/tasks/:id` | Delete task | Yes |

### Audit Logs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| GET | `/audit-logs` | List audit logs | Yes |
| GET | `/audit-logs/task/:taskId` | Get logs for a task | Yes |

## Authentication & Authorization

### JWT Token Structure

```json
{
  "userId": "uuid",
  "organizationId": "uuid",
  "role": "ADMIN | MEMBER",
  "iat": 1234567890,
  "exp": 1234577890
}
```

### Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| Create tasks | ✓ (any user) | ✓ (self only) |
| View all tasks | ✓ | ✗ (own tasks) |
| Update any task | ✓ | ✗ (own tasks) |
| Delete any task | ✓ | ✗ (own tasks) |
| Manage users | ✓ | ✗ |
| View audit logs | ✓ (org) | ✗ (own tasks) |

### Authentication Flow

1. **Register**: POST `/auth/register`
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "password": "securepassword123",
     "organizationName": "Acme Corp"
   }
   ```

2. **Login**: POST `/auth/login`
   ```json
   {
     "email": "john@example.com",
     "password": "securepassword123"
   }
   ```

3. **Use Access Token**: Include in Authorization header
   ```
   Authorization: Bearer <access_token>
   ```

4. **Refresh Token**: POST `/auth/refresh`
   ```json
   {
     "refreshToken": "<refresh_token>"
   }
   ```

## Multi-Tenancy

### Tenant Isolation

Every database query MUST include `organization_id` filter. This is enforced at:

1. **Application Level**: Middleware adds `organizationId` to all queries
2. **Database Level**: Foreign keys and indexes on `organization_id`

### Data Flow

```
User Request
    │
    ▼
Authentication (JWT)
    │
    ▼
Tenant Isolation Middleware
    │
    ▼
Query Filter: { organizationId: req.user.organizationId }
    │
    ▼
Database (isolated data)
```

### Log Structure

```json
{
  "id": "uuid",
  "actionType": "TASK_UPDATED",
  "taskId": "uuid",
  "performedBy": "uuid",
  "organizationId": "uuid",
  "oldValue": { "title": "Old Title" },
  "newValue": { "title": "New Title" },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Docker Deployment

### Production Build

```bash
# Build the image
docker build -t multi-tenant-task-app .

# Run with docker-compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Health Checks

- **Backend**: GET `http://localhost:3000/health`
- **Database**: `pg_isready` command
- **Redis**: `redis-cli ping`

## Testing

### Run Tests

```bash
npm test
```

### Sample Test Scenarios

1. **Multi-tenancy isolation**: Verify Org A cannot access Org B's data
2. **RBAC**: Verify members cannot delete other users' tasks
3. **Authentication**: Verify invalid tokens return 401
4. **Audit logs**: Verify all task actions are logged

## Security

### Implemented Security Measures

- ✓ Password hashing with bcrypt (12 rounds)
- ✓ JWT with short expiry + refresh tokens
- ✓ Token blacklisting on logout
- ✓ Rate limiting on auth endpoints
- ✓ Helmet.js for security headers
- ✓ CORS configuration
- ✓ Input validation with Joi
- ✓ SQL injection prevention (Prisma ORM)
- ✓ No stack traces in production responses

### Security Best Practices

1. Change all secret values in production
2. Use HTTPS in production
3. Implement OAuth for social login (optional)
4. Regular security audits
5. Keep dependencies updated

## License

MIT License - See LICENSE file for details
>>>>>>> 365d2ef (Initial commit)
