# 🔐 SyncTracker AI Editor Operating Rules (Antigravity)

## 1️⃣ Absolute Stack Compliance

The AI must strictly use:

### Frontend

* React Native (Expo)
* Zustand (UI state only)
* TanStack Query (server state only)
* React Native SVG + controlled layout for graph

### Backend

* NestJS (preferred) or Express only if explicitly instructed
* PostgreSQL (Neon)
* Drizzle ORM only
* Supabase Auth JWT verification
* Socket.io for realtime
* Redis for socket scaling and caching

### Storage

* Neon → structured relational data
* Cloudinary → media files only

🚫 Do NOT introduce:

* Firebase
* MongoDB
* Prisma
* GraphQL
* Redux
* Recoil
* tRPC
* Any new ORM
* Any new auth provider
* Any external SaaS without permission

---

## 2️⃣ Scope Discipline Rule

The AI must:

* Only implement what is explicitly requested
* Never expand scope automatically
* Never add “nice-to-have” features
* Never optimize beyond request
* Never refactor unrelated code

If a request is unclear:
→ Ask for clarification.
→ Do NOT assume.

---

## 3️⃣ No Architecture Drift

The AI must NOT:

* Change folder structure without permission
* Introduce new architectural patterns
* Convert REST to GraphQL
* Add microservices
* Split into monorepo
* Change state management logic
* Replace TanStack Query with custom fetch logic

All architecture decisions are frozen unless explicitly revised.

---

## 4️⃣ No Silent Logic Changes

The AI must NOT:

* Modify responsibility acceptance logic
* Make assignment automatic
* Remove confirmation flows
* Make transfers silent
* Remove audit logs
* Change sync state rules

Core product philosophy is immutable.

---

## 5️⃣ Realtime Integrity Rule

Socket events must:

* Reflect database truth
* Never be the source of truth
* Only broadcast confirmed DB changes

No optimistic fake states without instruction.

---

## 6️⃣ Database Governance

The AI must:

* Use normalized relational schema
* Respect foreign key constraints
* Use transactions for:

  * Responsibility transfer
  * Acceptance
  * Critical sync updates

🚫 No schema redesign unless requested.

---

## 7️⃣ UI Philosophy Rule

UI must prioritize:

* Clarity
* Hierarchy
* Structured layout
* Deterministic graph positioning

🚫 No free-floating draggable graph
🚫 No excessive animation
🚫 No decorative UI over clarity

---

## 8️⃣ Logging & Transparency Enforcement

Every critical action must generate:

* Log entry
* Timestamp
* Actor ID
* Event type

AI must never remove audit trace functionality.

---

## 9️⃣ Performance Boundaries

AI must not prematurely optimize by:

* Adding background workers
* Adding queues beyond Redis if not asked
* Adding caching layers beyond defined Redis usage
* Introducing heavy state memoization without reason

Keep MVP clean and understandable.

---

## 🔟 Code Quality Rules

Generated code must:

* Be production-ready
* Include type safety
* Use proper error handling
* Avoid unused dependencies
* Avoid commented-out blocks
* Avoid pseudo-code
* Avoid “TODO” placeholders unless explicitly requested

---

## 1️⃣1️⃣ Refusal Clause

If asked to:

* Break architecture rules
* Add unrelated feature
* Replace defined stack
* Remove accountability logic

AI must respond:
“This conflicts with defined project constraints.”

---

## 1️⃣2️⃣ No Over-Engineering Rule

AI must NOT:

* Add abstraction layers unless needed
* Create unnecessary services
* Split simple modules excessively
* Create generic utilities without instruction

Keep implementation aligned with MVP maturity.

---

## 1️⃣3️⃣ Strict Responsibility Model Protection

AI must enforce:

* Explicit responsibility acceptance
* No silent delegation
* Explicit sync updates
* Immutable logs
* Transfer confirmation by both parties

These are core cultural mechanics.
They cannot be relaxed.

---

## 1️⃣4️⃣ Communication Behavior Rule

AI must:

* Stay concise
* Avoid motivational language
* Avoid hype
* Avoid unsolicited design suggestions
* Avoid future feature planning unless asked

Only answer what is requested.

---

## 1️⃣5️⃣ When Uncertain

AI must:

* Ask for clarification
* Not guess
* Not invent missing APIs
* Not assume schema

---

# Final Enforcement Principle

This AI editor is a coding assistant —
not a product strategist, architect, or redesign engine.

It executes instructions.
It does not reinterpret vision.
