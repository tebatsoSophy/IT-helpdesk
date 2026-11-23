# IT Help Desk & Incident Management System

Spring Boot 3 + Spring Data JPA + Spring Security (JWT) on the backend, React + TypeScript + Vite on the frontend.
The database is **H2** for now (file-based, so data survives restarts). The PostgreSQL driver is already on the
classpath, so moving later is a configuration change.

## Run it

### With Docker

```bash
cp .env.example .env     # optional, the defaults work
docker compose up --build
```

- Web app: http://localhost:3000
- API docs (Swagger UI): http://localhost:8080/swagger-ui.html

### Without Docker (development)

Needs Java 21, Maven 3.9+ and Node 20+.

```bash
# terminal 1
cd backend && mvn spring-boot:run

# terminal 2
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to port 8080. The H2 console is at http://localhost:8080/h2-console
(JDBC URL `jdbc:h2:file:./data/helpdesk`, user `sa`, empty password).

## Sign in

The first start creates an administrator and, while `SEED_DEMO_DATA=true`, demo accounts and sample tickets:

| Role       | Email                  | Password        |
|------------|------------------------|-----------------|
| Admin      | admin@helpdesk.local   | `Admin123!`     |
| Technician | tech1@helpdesk.local   | `Password123!`  |
| Technician | tech2@helpdesk.local   | `Password123!`  |
| User       | user@helpdesk.local    | `Password123!`  |

Before real use: set `SEED_DEMO_DATA=false`, set `ADMIN_PASSWORD`, set a long random `JWT_SECRET`, and keep
`H2_CONSOLE_ENABLED=false`.

## Roles

| Role         | Can do |
|--------------|--------|
| `USER`       | Raise tickets, see only their own, reply, edit while still open, cancel, confirm a fix (close) or reopen it |
| `TECHNICIAN` | See every ticket, claim unassigned ones, and work (status, priority, resolve, internal notes) on tickets assigned to them. View reports |
| `ADMIN`      | Everything: assign to any technician, work on any ticket, manage users and categories, technician performance report |

Ticket workflow: `OPEN -> IN_PROGRESS <-> WAITING_FOR_USER -> RESOLVED -> CLOSED`, with `CANCELLED` as an exit from
any active state. A resolved ticket can be reopened; closed and cancelled tickets are frozen. Every change is written
to the ticket's history. Internal comments are never returned to regular users.

## What is included

- JWT login, registration (always creates a `USER`), role-based access with `@PreAuthorize`
- Tickets with filters (status, priority, category, assignee, unassigned, date range, text search), pagination, sorting
- Status workflow with validated transitions, assignment/claiming, priority changes, resolve with notes
- Comments with internal notes, file attachments (stored on disk), full audit history
- Response-target tracking per priority (Critical 4 h, High 8 h, Medium 24 h, Low 72 h), see `SlaPolicy.java`
- Reports: summary, by status/priority/category, resolution times, repeat problems, technician performance
- Email notifications on assignment, status change, resolution and replies. They are logged until you set
  `SPRING_MAIL_HOST` (plus the usual `spring.mail.*` settings)
- Admin screens for users (create, edit, deactivate) and categories
- Swagger UI, health endpoint (`/actuator/health`), Dockerfiles, docker-compose, GitHub Actions workflow

## Project layout

```
backend/    Spring Boot API (config, controller, dto, entity, repository, service, security, exception, util)
frontend/   React app (api, components, contexts, pages, types, utils)
docker-compose.yml
```

## Tests

```bash
cd backend  && mvn test      # end-to-end API test on in-memory H2 (roles, internal notes, lifecycle)
cd frontend && npm test      # unit tests for formatting helpers
```

## Moving to PostgreSQL later

1. Start with `SPRING_PROFILES_ACTIVE=postgres` and set `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD`.
2. Add Flyway (`flyway-core` and `flyway-database-postgresql`), generate an initial migration from the entities, and
   change `spring.jpa.hibernate.ddl-auto` to `validate`. `ddl-auto: update` is fine on H2 but should not manage a
   production schema.
3. Your H2 data does not migrate itself. Export it from the H2 console if you need to keep it.

## Notes and known limits

- The JWT is kept in `localStorage` for simplicity. For stricter XSS protection, move it to an httpOnly cookie.
- Report averages are computed in Java from resolved tickets, which is fine into the thousands of tickets. Switch to
  SQL aggregates if you reach hundreds of thousands.
- Attachments live on the local disk (`UPLOAD_DIR`, a Docker volume in compose). Swap `AttachmentService` for S3
  if you run more than one backend instance.
- There is no login rate limiting yet. Put the API behind a reverse proxy that limits `/api/auth/login`, or add
  Bucket4j.
