# SyncTracker - Responsibility & Sync Intelligence

SyncTracker is a high-performance accountability system designed to enforce explicit responsibility, visible sync states, and real-time execution transparency. Built with a focus on "Sync Intelligence," it prevents task fragmentation and ensures absolute ownership.

## 🚀 Tech Stack

- **Backend:** NestJS, PostgreSQL (Neon), Drizzle ORM, Redis, Socket.IO.
- **Frontend:** React Native (Expo), Zustand, TanStack Query, NativeWind (Tailwind CSS v4), Socket.IO Client.
- **Real-time:** Event-driven architecture via WebSockets with Redis scaling.

## 🛠️ Key Features

- **Immutable Responsibility:** Every task has a single "Responsible Owner." Ownership must be accepted explicitly.
- **Sync States:** Real-time visibility into whether a team member is `IN_SYNC`, `NEEDS_UPDATE`, `BLOCKED`, or has `HELP_REQUESTED`.
- **Sync Decay:** Automated logic that marks users as `NEEDS_UPDATE` if they haven't synchronized within 24 hours.
- **Ownership Transfer:** Secure handovers with audit logging.

## 📦 Getting Started

### 1. Prerequisite
- Node.js & npm
- PostgreSQL database (Recommended: [Neon.tech](https://neon.tech))
- Redis instance (for WebSocket scaling)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env # Add your credentials
npm run db:push     # Push schema to database
npm run start:dev   # Start development server
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npx expo start      # Start Expo GO
```

## 🏗️ Project Structure

- `backend/src/db`: Database schema and ORM configuration.
- `backend/src/sync`: Real-time gateway and Redis adapters.
- `backend/src/tasks`: Core business logic and background jobs (Cron).
- `frontend/src/store`: State management (Zustand).
- `frontend/src/screens`: UI screens (Home, Login, Track Details).

## 🛡️ Security
- JWT-based authentication for REST and WebSockets.
- Bcrypt password hashing.
- Role-based access control (RBAC).

---
*Created with focus on visual excellence and premium user experience.*
