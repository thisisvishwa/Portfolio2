# ENTERPRISE-GRADE AI-POWERED WEB DEVELOPER PORTFOLIO CMS
## TECHNICAL ARCHITECTURE SPECIFICATION (v1.0)
**Author: Principal Software Architect & Security Engineer**

---

## 1. SYSTEM TOPOLOGY & NETWORK ARCHITECTURE

The Portfolio Management System (PMS) is architected as a high-performance, decoupled, secure, and horizontally scalable application. It leverages a modern hybrid architecture consisting of a **Next.js Frontend (React Server Components + ISR/SSR)** and a separate **Node.js/Express.js Backend** written in strict **TypeScript**, talking to a **PostgreSQL** database via **Prisma ORM**, with **Redis** handling sessions, cache, and rate-limiting.

```
                                      +------------------------------------+
                                      |         Edge CDN (Cloudflare)      |
                                      |   (WAF, DDoS Protection, SSL, DNS) |
                                      +-----------------+------------------+
                                                        |
                                       +----------------+----------------+
                                       |                                 |
                                       v                                 v
                     +-----------------+---------------+ +---------------+---------------+
                     |    Next.js Client (Frontend)    | | Express.js API Server (Backend) |
                     |   Host: Node.js or Vercel Edge  | |      Host: Docker/ECS/VPS     |
                     |  Renders: SSR/ISR, React/Three  | |  Strict Validation, Security  |
                     +-----------------+---------------+ +---------------+---------------+
                                       |                                 |
                        Cache / Hydrate|                                 | DB Query (Prisma)
                                       v                                 v
                     +-----------------+---------------+ +---------------+---------------+
                     |         Cloudinary / S3         | |     PostgreSQL Database       |
                     |     (Media Library Assets)      | |  (Normalized Schema, Indexes) |
                     +---------------------------------+ +---------------+---------------+
                                                                         |
                                                                         v
                                                         +---------------+---------------+
                                                         |        Redis Cache & Store    |
                                                         |  (Rate limits, Session store) |
                                                         +-------------------------------+
```

### 1.1 Frontend: Next.js App Router (Client/Server)
- **Renders/ISR/SSR:** Landing pages, blogs, projects, and custom pages are generated using **Incremental Static Regeneration (ISR)** or **Server-Side Rendering (SSR)**. Blog posts and projects use ISR with a revalidation time of `1800` seconds (30 mins) to maintain absolute speed (Lighthouse 100) while keeping dynamic comments and view counters updated via Client-side Hydration.
- **Dynamic Routing:** A catch-all route `app/[...slug]/page.tsx` reads from the `DynamicPage` table, enabling a custom drag-and-drop Page Builder that handles landing pages, custom links, policies, etc.
- **State Management:** **React Query (TanStack Query)** manages server state, caching, auto-refetching, and optimistic updates. Shared client UI state is managed via lightweight **Zustand** stores.

### 1.2 Backend: Express.js (RESTful API Platform)
- **Monolithic Modular Core:** Standardized Express.js with a modular controller-service-repository pattern implemented in strict TypeScript.
- **Middleware Pipeline:** Every request passes through `Helmet` (CSP, HSTS), `CORS` (IP/Domain whitelist), custom `Rate-Limiter` (Redis backed), `InputSanitizer` (SQLi and XSS prevention), and `AuthMiddleware` (JWT & Refresh Token validation).
- **Background Jobs:** Handled via **BullMQ** + Redis for sending emails (newsletter, contact forms), processing and optimizing images, generating PDF/CSV exports, and database backups.

---

## 2. SECURITY & CRYPTOGRAPHY PROTOCOLS (OWASP Top 10 Compliant)

This architecture guarantees banking-grade security mechanisms:

```
+---------------------------------------------------------------------------------------+
|                                    SECURITY MATRIX                                    |
+------------------------+------------------------------------+-------------------------+
| Threat Category        | Mitigation Protocol                | Implementation Detail   |
+------------------------+------------------------------------+-------------------------+
| Broken Auth            | JWT + RTR + Secure Cookies         | Fingerprinted cookies   |
| XSS (Cross Site Script)| Strict Content Security Policy     | CSP Header + Sanitization|
| SQL Injection          | Parameterized Queries              | Prisma ORM (Built-in)   |
| CSRF Injection         | Double-Submit Cookie / SameSite    | SameSite=Strict cookies |
| Brute Force / Bot      | Redis-based IP rate limit + MFA    | Argon2id + TOTP 2FA     |
| Data Exposure          | Field-level encryption             | AES-256 for SMTP/API keys|
+------------------------+------------------------------------+-------------------------+
```

### 2.1 Dual-Token Authentication & Refresh Token Rotation (RTR)
- **Access Tokens:** Short-lived JWTs (15 minutes lifespan) containing the user’s `id`, `role`, and a unique cryptographic `fingerprint`. Stored in memory or passed as a secure header.
- **Refresh Tokens:** Long-lived UUIDv4 strings (7 days lifespan) stored in a secure, `HttpOnly`, `SameSite=Strict`, `Secure` (HTTPS-enforced) cookie. 
- **Rotation (RTR):** When a new Access Token is requested, the previous Refresh Token is revoked, a new one is generated, and its hash is updated in the database. If a revoked Refresh Token is ever reused, the system instantly invalidates **all active sessions** for that user, flags a potential breach, and sends an alert.

### 2.2 Input Validation, Sanitization, & File Security
- **Strict Validation:** Every endpoint validates incoming payloads against **Zod Schemas** at runtime. Violations return a structured `422 Unprocessable Entity` response.
- **XSS Mitigation:** HTML input from the Rich Text Editor is strictly sanitized on the backend using **DOMPurify** (Node-compatible wrapper) before database writes.
- **File Upload Security:** Direct file uploads are disallowed. Uploads must bypass an enterprise pipeline:
  1. Validate magic numbers (MIME-type validation, not just extension checking).
  2. Enforce absolute file size caps (max 5MB for images, 10MB for CVs).
  3. Scan for malicious payloads using a ClamAV scan hook (or third-party sandbox) during middleware ingestion.
  4. Stream secure uploads to Cloudinary/Supabase Storage, returning only immutable HTTPS URLs.

### 2.3 Two-Factor Authentication (2FA) & Session Tracking
- **TOTP Protocol:** Administrators can enable 2FA, which generates a 16-character base32 secret key, provides a QR code (using Google Authenticator compatible payload), and validates using standard RFC 6238 code steps.
- **Session Tracking:** The database logs active devices, browser agents, and Geo-IP data on every successful handshake. Admins can view and remotely revoke active sessions from their profile.

---

## 3. ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

The application supports robust, hierarchically nested user roles. Each request to protected resources checks the endpoint's minimum permission layer.

| Module | Super Admin | Admin | Editor | Writer | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Global Settings & API Keys** | Full (R/W/D) | Read-Only | Denied | Denied | Denied |
| **User & Role Management** | Full (R/W/D) | Read/Write | Denied | Denied | Denied |
| **Media Library** | Full (R/W/D) | Full (R/W/D) | Full (R/W/D) | Read/Write | Read-Only |
| **Projects / Portfolio** | Full (R/W/D) | Full (R/W/D) | Full (R/W/D) | Read/Write | Read-Only |
| **Blog CMS** | Full (R/W/D) | Full (R/W/D) | Full (R/W/D) | Write (Own Only) | Read-Only |
| **Theme / Layout Builder** | Full (R/W/D) | Full (R/W/D) | Read-Only | Denied | Denied |
| **Form Builder & Submissions**| Full (R/W/D) | Full (R/W/D) | Read-Only | Denied | Denied |
| **Analytics & Security Logs** | Full (R/W/D) | Read-Only | Denied | Denied | Denied |

---

## 4. CACHING, HYDRATION, & DATA PIPELINES

To achieve blazing-fast responses (<100ms) and survive massive viral traffic events, the architecture implements a multi-tier cache pipeline.

```
                      +---------------------------------------+
                      |               Client                  |
                      +-------------------+-------------------+
                                          | 1. HTTP Request
                                          v
                      +---------------------------------------+
                      |        Cloudflare CDN Caching         | (HIT: Return static HTML)
                      +-------------------+-------------------+
                                          | 2. MISS (Forward to Server)
                                          v
                      +---------------------------------------+
                      |        Next.js Edge Page Cache        | (HIT: Return static page)
                      +-------------------+-------------------+
                                          | 3. MISS (Generate dynamic page)
                                          v
                      +---------------------------------------+
                      |      Express API Layer (Redis)        | (HIT: Return JSON from Redis)
                      +-------------------+-------------------+
                                          | 4. MISS (Query Database)
                                          v
                      +---------------------------------------+
                      |             PostgreSQL DB             | (Execute SQL Query)
                      +---------------------------------------+
```

### 4.1 Redis Caching Layer
- **Read Queries Cache:** All public list queries (Blogs, Projects, Skills) are stored in Redis using structured keys (e.g., `cache:blogs:page:1:limit:10`).
- **Cache Invalidation (Cache-Tagging):** Any write, update, or delete operation on a resource executes a hook that scans and purges all related cache keys (e.g., matching `cache:blogs:*`).
- **Session Store:** Active User tokens and IP limit counts are tracked in-memory inside Redis to bypass PostgreSQL lookup costs.

### 4.2 Next.js Hydration & SSR Pipeline
1. **ISR Pre-rendering:** On-build, the framework generates HTML for the landing page, skills, and initial portfolio cards.
2. **Server-Side Hydration:** When a request hits Next.js, Server Components fetch metadata and static copy. Client Components (Framer Motion, GSAP, Canvas scenes) animate instantly.
3. **Optimistic Updates:** Using React Query, when a user bookmarks a blog or hits "Like" on a project, the client-side state increments immediately, sending a background fetch request. If the request fails, the state gracefully rolls back with an error toast.

---

## 5. SYSTEM EXTENSIBILITY & PLUGINS

### 5.1 Dynamic Forms Engine
- Allows custom-built fields defined in JSON format. The form builder saves schemas like `{ fields: [{ name: "email", type: "email", required: true }] }`.
- The frontend dynamically renders inputs, runs client-side validations, and submits results to `/api/forms/:id/submit`, triggering webhooks or emails.

### 5.2 Dynamic Layout Engine (JSON Pages)
- Page layouts are stored as structured JSON components inside `DynamicPage.layout` field. 
- Example format:
  ```json
  [
    { "section": "hero", "props": { "headline": "Hi, I'm a Dev", "background": "gradient" } },
    { "section": "skills", "props": { "categories": ["frontend", "devops"] } }
  ]
  ```
- This configuration is parsed at runtime on Next.js, and maps perfectly to modular React components, making the homepage and landing pages entirely configurable via the Admin Dashboard.
