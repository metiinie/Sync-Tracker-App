# Comprehensive Deployment Strategy: Sync-Tracker-App

This guide outlines exactly how to deploy your specific tech stack. Based on the project setup, your stack includes:

### Tech Stack Breakdown
**Backend (NestJS)**
- **Database**: PostgreSQL hosted on **Neon** (`ep-plain-fog-aithzseg-pooler`)
- **ORM**: Drizzle ORM
- **Authentication**: **Supabase** JWT Integration
- **Caching/WebSockets**: **Redis** (Local currently, needs Cloud Redis for prod) & Socket.io
- **Media Storage**: **Cloudinary**

**Frontend (React Native)**
- **Framework**: Expo / React Native
- **Styling**: NativeWind (TailwindCSS)
- **Deployment Platform**: EAS (Expo Application Services - "expovas")

---

## 1. Backend Deployment Guide (Render)

Render is the optimal choice for a Node.js/NestJS backend because it natively builds and scales Node applications without requiring a Dockerfile.

### Phase 1: Preparation & Redis Setup
Since your database (Neon), Auth (Supabase), and Storage (Cloudinary) are already hosted on external cloud providers, you only need to host the NestJS API and a Production Redis instance.

1. **Production Redis**: 
   - You currently use `redis://localhost:6379`. 
   - **Action**: Go to the **Render Dashboard** -> **New +** -> **Redis**.
   - Create a free or paid Redis instance.
   - Copy the "Internal Redis URL" (e.g., `redis://red-xxxx:6379`).

### Phase 2: Deploying the NestJS API
1. On the **Render Dashboard**, click **New +** -> **Web Service**.
2. Connect your GitHub/GitLab repository.
3. **Configuration Settings**:
   - **Name**: `sync-tracker-api`
   - **Root Directory**: `backend` (Crucial step since your repo is a monorepo).
   - **Environment**: Docker
   - **Build Command**: Leave blank (Render will use your Dockerfile)
   - **Start Command**: Leave blank (Render will use your entrypoint.sh)
     *(Note: The Drizzle schema `db:push` applies to Neon automatically when the container starts because of the entrypoint.sh script).* 

### Phase 3: Environment Variables
Go to your Render Web Service **Environment** tab and add the exact variables from your `.env`:

```env
# Database (Already hosted on Neon)
DATABASE_URL=postgresql://neondb_owner:***@ep-plain-fog-aithzseg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full

# Supabase Auth
SUPABASE_URL=https://wqvsmotfimbfhmsbuiom.supabase.co
SUPABASE_ANON_KEY=sb_publishable_***
SUPABASE_JWT_SECRET=***

# Redis (Use the Internal Render Redis URL you created in Phase 1)
REDIS_URL=redis://red-xxxxxxxxxxxx:6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=dvkknkmtt
CLOUDINARY_API_KEY=296254495749393
CLOUDINARY_API_SECRET=***
CLOUDINARY_URL=cloudinary://***
```
*Note: Ensure NO quotation marks are used around values in Render.*

4. Click **Deploy**. Render will build the app, apply the DB migrations to Neon, and provide you a live URL: `https://sync-tracker-api.onrender.com`.

---

## 2. Frontend Deployment Guide (Expo EAS)

You will deploy the React Native frontend using Expo Application Services (EAS), which handles cloud compilation for iOS and Android.

### Phase 1: Connect Frontend to Production Backend
1. In your `frontend` folder, locate your `.env` file (or `config.ts`/API client files).
2. Update your API base URL to point to the newly deployed Render backend:
   ```env
   EXPO_PUBLIC_API_URL=https://sync-tracker-api.onrender.com
   EXPO_PUBLIC_SOCKET_URL=wss://sync-tracker-api.onrender.com
   ```
   *(Ensure WebSockets use `wss://` for secure connections).*

### Phase 2: EAS Configuration & Build
1. **Login to Expo via CLI:**
   ```bash
   cd frontend
   npx eas login
   ```
2. **Configure EAS:**
   ```bash
   npx eas build:configure
   ```
   This generates an `eas.json` file. Ensure it has a production profile:
   ```json
   {
     "build": {
       "production": {
         "env": {
            "EXPO_PUBLIC_API_URL": "https://sync-tracker-api.onrender.com"
         }
       }
     }
   }
   ```
3. **Trigger Cloud Builds:**
   Run these commands to generate the installable app binaries:
   
   **For Android (Generates an .aab or .apk)**:
   ```bash
   npx eas build -p android --profile production
   ```
   **For iOS (Generates an .ipa - requires Apple Developer Account)**:
   ```bash
   npx eas build -p ios --profile production
   ```

### Phase 3: Submit to App Stores (Optional/Future)
Once the builds are complete, EAS can automatically upload them to the stores:
```bash
npx eas submit -p android
npx eas submit -p ios
```

### Phase 4: Over-The-Air (OTA) Updates
For minor UI changes or bug fixes (like updating `VisionGraph.tsx`), you can push updates directly to users' phones without store review:
```bash
npx eas update --branch production --message "Fixed graph UI"
```

---

## 3. Pre-Flight Checklist
- [ ] **CORS**: Ensure `backend/src/main.ts` accepts CORS requests from any origin (`*`) or specifically your Expo app.
- [ ] **Neon DB Pooler**: Ensure `DATABASE_URL` is using Neon's connection pooler URL (it is currently, based on `.env`).
- [ ] **Render Sleep**: Free Tier Render instances go to sleep after 15 minutes of inactivity. For production, upgrade the NestJS service to a $7/mo Starter plan to keep WebSockets alive permanently.
