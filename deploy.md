# Deployment Strategy: Sync-Tracker-App

This guide outlines how to deploy the Sync-Tracker-App to production.

## Current Tech Stack

| Component | Technology | Hosting |
|---|---|---|
| Backend API | NestJS v11 | **To deploy:** Render |
| Database | PostgreSQL (Drizzle ORM) | **Neon** (already hosted) |
| Authentication | Supabase Auth (Google SSO) | **Supabase** (already hosted) |
| WebSocket Scaling | Redis + Socket.IO | **To deploy:** Render Redis |
| Media Storage | Cloudinary | **Cloudinary** (already hosted) |
| Frontend | React Native (Expo SDK 54) | **EAS** (Expo Application Services) |

---

## 1. Backend Deployment (Render)

### Phase 1: Production Redis

Your current `REDIS_URL` points to `redis://sync-redis:6379` (Docker internal). For production:

1. Go to **Render Dashboard** → **New +** → **Redis**.
2. Create a Redis instance (free or paid).
3. Copy the **Internal Redis URL** (e.g., `redis://red-xxxx:6379`).

### Phase 2: Deploy the NestJS API

1. On **Render Dashboard**, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. **Configuration:**
   - **Name**: `sync-tracker-api`
   - **Root Directory**: `backend`
   - **Environment**: Docker
   - **Build Command**: *(leave blank — Render uses the Dockerfile)*
   - **Start Command**: *(leave blank — Render uses entrypoint.sh)*

### Phase 3: Environment Variables

Add these in the Render **Environment** tab:

```env
# Database (Neon — already hosted)
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-plain-fog-aithzseg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true

# Supabase Auth
SUPABASE_URL=https://wqvsmotfimbfhmsbuiom.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Redis (use the Render Redis Internal URL from Phase 1)
REDIS_URL=redis://red-xxxxxxxxxxxx:6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=dvkknkmtt
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Port
PORT=3000
```

> **Important:** Do NOT wrap values in quotation marks in Render.

### Phase 4: Database Schema Migration

The `entrypoint.sh` currently does **not** run `npx drizzle-kit push` automatically. Before the first deploy:

1. Run `npm run db:push` locally with `DATABASE_URL` pointing to the Neon production DB.
2. Or add the following to `entrypoint.sh` before the `node dist/main.js` line:
   ```bash
   echo "Running Drizzle schema push..."
   npx drizzle-kit push
   ```

After deploy, Render provides a URL like: `https://sync-tracker-api.onrender.com`

---

## 2. Frontend Deployment (Expo EAS)

### Phase 1: Update Frontend to Point to Production Backend

Update `frontend/src/config/apiConfig.ts` to use the Render URL:

```typescript
// Option A: Hardcode production URL
const API_HOST = 'https://sync-tracker-api.onrender.com';
export const API_BASE_URL = `${API_HOST}/api/v1`;
export const SOCKET_URL = API_HOST; // wss:// is handled automatically by socket.io

// Option B (better): Use environment variable
// const API_HOST = process.env.EXPO_PUBLIC_API_URL || 'http://10.22.140.80:3000';
// export const API_BASE_URL = `${API_HOST}/api/v1`;
// export const SOCKET_URL = API_HOST;
```

And add to `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=https://sync-tracker-api.onrender.com
EXPO_PUBLIC_SUPABASE_URL=https://wqvsmotfimbfhmsbuiom.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Phase 2: EAS Configuration & Build

1. **Login to Expo:**
   ```bash
   cd frontend
   npx eas login
   ```

2. **Configure EAS:**
   ```bash
   npx eas build:configure
   ```
   This generates `eas.json`. Add a production profile:
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_API_URL": "https://sync-tracker-api.onrender.com",
           "EXPO_PUBLIC_SUPABASE_URL": "https://wqvsmotfimbfhmsbuiom.supabase.co",
           "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your_supabase_anon_key"
         }
       }
     }
   }
   ```

3. **Build:**
   ```bash
   # Android (.aab or .apk)
   npx eas build -p android --profile production

   # iOS (.ipa — requires Apple Developer Account)
   npx eas build -p ios --profile production
   ```

### Phase 3: Submit to App Stores (Optional)

```bash
npx eas submit -p android
npx eas submit -p ios
```

### Phase 4: Over-The-Air (OTA) Updates

For minor changes without store review:
```bash
npx eas update --branch production --message "Description of changes"
```

---

## 3. Pre-Deployment Checklist

### Must Fix Before Deploying

- [ ] **Update `apiConfig.ts`**: Replace hardcoded local IP with production URL or env variable.
- [ ] **Add Supabase AsyncStorage**: Configure `@react-native-async-storage/async-storage` with the Supabase client for session persistence.
- [ ] **Run `db:push`**: Ensure the Neon database schema is up to date.
- [ ] **Update Supabase Redirect URLs**: Add your production deep link scheme (`synctracker://`) to the Supabase dashboard under Authentication → URL Configuration.

### Security Checks

- [ ] **WebSocket Auth**: The WebSocket gateway currently has **no authentication guard**. Apply `WsJwtGuard` to `SyncGateway.handleConnection()` before deploying.
- [ ] **Remove secrets from `docker-compose.yml`**: Use an `env_file:` reference or Docker secrets instead of hardcoded values.
- [ ] **CORS**: Review `app.enableCors()` — currently allows all origins. Consider restricting for production.

### Render-Specific Notes

- **Free Tier Sleep**: Free Render instances sleep after 15 minutes of inactivity. WebSocket connections will drop. Upgrade to Starter ($7/mo) for persistent connections.
- **Neon DB Pooler**: The `DATABASE_URL` uses Neon's connection pooler (`-pooler` suffix). This is correct and should be kept.
- **Dockerfile**: Uses `npm install --only=production` which is deprecated in npm v7+. Consider changing to `npm install --omit=dev`.

---

## 4. Architecture Diagram

```
┌─────────────────┐     HTTPS/WSS      ┌─────────────────────┐
│  React Native   │ ──────────────────► │    NestJS Backend    │
│  (Expo / EAS)   │   Bearer JWT        │    (Render)          │
│                 │ ◄────────────────── │                      │
└────────┬────────┘    REST + WS        └──────────┬───────────┘
         │                                         │
    Supabase Auth                          ┌───────┼───────┐
    (Google SSO)                           │       │       │
         │                            Neon DB   Redis   Cloudinary
         ▼                           (Drizzle)  (WS)    (Uploads)
┌─────────────────┐
│    Supabase      │
│  (Auth + JWKS)   │
└─────────────────┘
```
