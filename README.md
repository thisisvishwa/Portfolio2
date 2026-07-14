# Nexus PMS — Enterprise-Grade Developer Portfolio CMS (v1.0)
Welcome to the **Nexus Portfolio Management System (PMS)**, a decoupled, database-driven, secure full-stack platform designed to manage and render professional engineering showcases, multi-threaded blog comments, work portfolios, and client contact pipelines.

---

## 1. PROJECT HIGHLIGHTS & ARCHITECTURE
Nexus PMS consists of a robust **Express.js API Microservice (TypeScript)** communicating via **Prisma ORM** to a **PostgreSQL** database, and a high-performance **Next.js 14 App Router client** styled with **Tailwind CSS**, **Framer Motion**, and **Lucide Icons**.

### Core Architecture Capabilities
- **Decoupled SSR/ISR Hydration:** Portfolio components and blogs are generated on-build/server-rendered, with view-counts, likes, and comment queues hydrated client-side via TanStack Query.
- **Dual-Token Handshake with Cookie RTR:** Short-lived access JWTs work in tandem with long-lived, cryptographically signed `HttpOnly`, `SameSite=Strict`, `Secure` refresh cookies. Active Refresh Token Rotation (RTR) invalidates hijacked session trees immediately.
- **Zod Schema Validation:** Enforces structural contracts on incoming JSON payloads, returning detailed error maps.
- **Self-Calculating Spam Protection:** Evaluates spam scores on guest messages, routing suspicious emails directly to the inbox archive.
- **Custom Theme Variables:** Exposes design style controls inside the database, enabling modifications of global borders, primary branding colors, fonts, and light/dark modes on the fly.

---

## 2. API ENDPOINTS DIRECTORY (v1.0.0 Prefix: `/api/v1`)

### Authentication & Sessions (`/auth`)
* `POST /auth/register` — Initial administrator bootstrap (the first account registers as `SUPER_ADMIN`) or writer accounts creation.
* `POST /auth/login` — Session handshake. Sets the secure rotating cookie and issues the short access token.
* `POST /auth/refresh` — Invalidation and rotation handler.
* `POST /auth/logout` — Standard single-device logout.
* `POST /auth/logout-all` — Remote session invalidation on all logged-in devices.
* `GET /auth/me` — Fetches current user profile and lists active sessions.

### Portfolio Project Showcase (`/projects`)
* `GET /projects` — Public access to published projects. Supports filtering by `tag`, `category`, `featured` flag, and `search` query.
* `GET /projects/slug/:slug` — Increments views asynchronously and returns the full case study chapters (problem, solution, architecture, challenges, and lessons learned).
* `POST /projects` — Creates a new project profile (Restricted to `SUPER_ADMIN`, `ADMIN`, `EDITOR`).
* `PATCH /projects/:id` — Edits attributes (Restricted).
* `DELETE /projects/:id` — Soft-deletes a project (Restricted).
* `POST /projects/:id/like` — Increments likes asynchronously.

### Content Blog CMS (`/blogs`)
* `GET /blogs` — Public access to published articles with pagination and tags.
* `GET /blogs/slug/:slug` — Increments views asynchronously and returns author metadata.
* `POST /blogs` — Creates a new article draft (Restricted to `SUPER_ADMIN`, `ADMIN`, `EDITOR`, `WRITER`).
* `PATCH /blogs/:id` — Edits attributes (Restricted).
* `DELETE /blogs/:id` — Soft-deletes an article (Restricted).
* `GET /blogs/:blogId/comments` — Returns approved, threaded comment timelines.
* `POST /blogs/:blogId/comments` — Submits a comment. If the user is logged in, the comment is auto-approved. Anonymous submissions require guest credentials and default to the unapproved queue.
* `PATCH /blogs/comments/:id/approve` — Approves a guest comment (Restricted).

### Customer Engagement (`/contacts`)
* `POST /contacts/submit` — Processes a guest contact request, computes spam scores, and logs IP addresses.
* `GET /contacts` — Lists received contact requests (Restricted to `SUPER_ADMIN`, `ADMIN`, `EDITOR`).
* `PATCH /contacts/:id` — Updates read status and assigns labels (Restricted).
* `POST /contacts/newsletter/subscribe` — Initiates newsletter subscription with a 24-hour verification token.
* `GET /contacts/newsletter/verify/:token` — Validates subscription (Double Opt-In).
* `POST /contacts/newsletter/unsubscribe` — Standard email unsubscribe.

### System Settings & Styling Themes (`/settings`)
* `GET /settings/public` — Returns site branding details and public configurations (social pages, SEO defaults, asset links).
* `GET /settings/theme` — Fetches default style configurations (colors, font family, border-radii, dark-mode flags).
* `GET /settings` — Retrieves private configuration values (SMTP secrets, backup pools) (Restricted to `SUPER_ADMIN`, `ADMIN`).
* `POST /settings` — Saves or updates batch config values (Restricted to `SUPER_ADMIN`).
* `GET /settings/audit-logs` — Access read-only audit logs tracking operations (Restricted to `SUPER_ADMIN`, `ADMIN`).

---

## 3. HOW TO BOOTSTRAP NEXUS PMS

### Local Development & Fast SQLite Setup
To allow instant local development and debugging without running a heavy PostgreSQL database daemon, you can swap providers to **SQLite** in 2 easy steps:

1. Open `prisma/schema.prisma` and replace the database provider block:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
2. Edit `backend/package.json` scripts to replace environment references if necessary.
3. Install dependencies, run migration setups, and launch servers:
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Generate database clients and apply schemas
   npm run prisma:generate
   npx prisma db push --schema=../prisma/schema.prisma
   
   # Build and launch Express.js API
   npm run build
   npm run dev
   ```

### Production Deployment via Docker Compose (PostgreSQL + Redis)
To deploy the entire production stack consisting of the decoupled Next.js web app, Express API microservice, PostgreSQL, and Redis cache, execute the following orchestrated command:

```bash
# Spin up complete linked stack
docker-compose up --build -d

# Execute database migrations inside running containers
docker-compose exec backend npx prisma migrate deploy --schema=../prisma/schema.prisma
```

Your system is now online:
- **Client Frontend Port:** `http://localhost:3000`
- **RESTful API Port:** `http://localhost:5000`
- **PostgreSQL Database:** Whitelisted internally to Docker network.
- **Redis Cache:** Whitelisted internally to Docker network.
