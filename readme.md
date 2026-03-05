# SyncTracker - Responsibility & Sync Intelligence

SyncTracker is a high-performance accountability system designed to enforce explicit responsibility, visible sync states, and real-time execution transparency. Built with a focus on "Sync Intelligence," it prevents task fragmentation and ensures absolute ownership.

## 🚀 Tech Stack

- **Backend:** NestJS v11, PostgreSQL (Neon via Drizzle ORM), Redis, Socket.IO.
- **Frontend:** React Native (Expo SDK 54), Zustand, TanStack Query, NativeWind (TailwindCSS v3), Socket.IO Client.
- **Authentication:** Supabase Auth (Google SSO) with JWT verification via JWKS (ES256).
- **Media Storage:** Cloudinary (avatars & task attachments).
- **Real-time:** WebSocket gateway with Redis-backed Socket.IO adapter.

## 🛠️ Key Features

- **Immutable Responsibility:** Every task has a single "Responsible Owner." Ownership must be accepted explicitly.
- **Sync States:** Real-time visibility into whether a team member is `IN_SYNC`, `NEEDS_UPDATE`, `BLOCKED`, or has `HELP_REQUESTED`.
- **Sync Decay:** Automated hourly cron logic that marks users as `NEEDS_UPDATE` if they haven't synchronized within 24 hours.
- **3-Step Ownership Transfer:** Secure initiate → accept/reject handovers with audit logging.
- **Milestones & Time Tracking:** Per-task milestones with completion status, and time logging.
- **Comments & Nudges:** In-task communication and nudge notifications.
- **Real-time Notifications:** Push-style notifications via WebSocket rooms.
- **File Uploads:** Avatar and task attachment uploads via Cloudinary.

## 📦 Getting Started

### Prerequisites
- Node.js v22+ & npm
- PostgreSQL database (Recommended: [Neon.tech](https://neon.tech))
- Redis instance (for WebSocket scaling & caching)
- [Supabase](https://supabase.com) project (for authentication)
- [Cloudinary](https://cloudinary.com) account (for media uploads)

### Backend Setup
```bash
cd backend
npm install

# Create .env with the following variables:
# DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require&pgbouncer=true
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_JWT_SECRET=your_jwt_secret
# REDIS_URL=redis://localhost:6379
# PORT=3000
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

npm run db:push     # Push Drizzle schema to database
npm run start:dev   # Start development server (http://localhost:3000)
```

### Frontend Setup
```bash
cd frontend
npm install

# Update frontend/src/config/apiConfig.ts with your machine's local IP:
# const BASE_IP = 'YOUR_LOCAL_IP';

# Create .env:
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

npx expo start      # Start Expo development server
```

### Docker Setup (Backend + Redis)
```bash
docker compose up --build
# Backend: http://localhost:3000
# Redis: localhost:6379
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── auth/          # Supabase JWT strategy (JWKS/ES256), guards
│   ├── db/            # Drizzle ORM schema (12 tables) & module
│   ├── tasks/         # Core CRUD, transfers, milestones, time logs, sync, cron
│   ├── sync/          # WebSocket gateway, Redis adapter, WS JWT guard
│   ├── users/         # User management, settings, profile
│   ├── activities/    # Activity feed & sync log queries
│   ├── notifications/ # In-app notification system
│   ├── upload/        # Cloudinary file upload controller
│   ├── workspace/     # Workspace settings management
│   └── common/        # Shared services (Cloudinary)
├── drizzle/           # Migration files
├── Dockerfile         # Multi-stage production build
└── entrypoint.sh      # Docker startup script

frontend/
├── src/
│   ├── screens/       # 17 screens (Home, Tasks, Activity, Profile, etc.)
│   ├── store/         # Zustand stores (auth, tasks, etc.)
│   ├── services/      # API (Axios), Socket.IO, Supabase client
│   ├── config/        # API base URL configuration
│   ├── hooks/         # Custom React hooks
│   ├── components/    # Reusable UI components
│   ├── navigation/    # Tab & stack navigation
│   └── utils/         # Utility functions
└── App.tsx            # Root component with navigation
```

## 🔌 API Endpoints

All endpoints are prefixed with `/api/v1` and protected by JWT auth (except WebSocket connections).

| Module | Routes |
|---|---|
| **Auth** | `GET /auth/profile` |
| **Tasks** | CRUD: `POST/GET/PATCH/DELETE /tasks`, Accept/Complete, Transfer flow, Milestones, Time logs, Comments, Sync, Nudge |
| **Users** | `GET /users`, `GET /users/search`, `GET /users/stats`, `GET/PATCH /users/settings`, `PATCH /users/profile` |
| **Activities** | `GET /activities` (with scope filter) |
| **Notifications** | `GET/PATCH /notifications` |
| **Upload** | `POST /upload/avatar`, `POST /upload/task-attachment/:taskId` |
| **Workspace** | `GET/PATCH /workspace/settings` |

## 🔑 Authentication Flow

1. **Frontend:** User logs in via Supabase Auth (Google SSO).
2. **Frontend:** Supabase returns a JWT access token (ES256 signed).
3. **Frontend:** Token is attached to all API calls via Axios interceptor.
4. **Backend:** `JwtStrategy` verifies the token against Supabase JWKS endpoint.
5. **Backend:** `AuthService.getOrCreateUser()` upserts the user into the local PostgreSQL database.

## 🛡️ Security

- JWT-based authentication (Supabase ES256 tokens verified via JWKS).
- All REST endpoints are protected by `JwtAuthGuard`.
- Ownership-based authorization checks in task operations.

---
*Built with focus on visual excellence, real-time transparency, and accountability.*
