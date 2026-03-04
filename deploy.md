# Deployment Strategy

This document outlines the deployment strategy for the Sync-Tracker-App, divided into the **NestJS Backend** (deployed to Render) and the **Expo React Native Frontend** (deployed via Expo Application Services - EAS).

---

## 1. Project Overview
- **Backend**: NestJS, PostgreSQL (via Drizzle ORM), Redis, Socket.io, Cloudinary.
- **Frontend**: React Native, Expo, Supabase Client, NativeWind, Zustand.

---

## 2. Backend Deployment (Render)
Render offers a very straightforward "Web Service" deployment for Node.js apps. There is no need for a Dockerfile as Render can build and run NestJS natively.

### Steps to Deploy:
1. **Prepare the Repository**: Ensure your project is pushed to a git provider (GitHub/GitLab).
2. **Create Backing Services** (If not already using an external provider like Supabase):
   - Navigate to the Render Dashboard and create a **PostgreSQL** database.
   - Create a **Redis** instance (needed for your `@socket.io/redis-adapter`).
3. **Create the Web Service**:
   - In Render, click "New +" -> "Web Service".
   - Connect your repository and select the project.
   - If your repository contains both frontend and backend, set the **Root Directory** to `backend`.
4. **Configuration Settings**:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run db:push && npm run start:prod` *(Note: Using `db:push` will automatically sync the schema to the database. For production, generating and applying structured migrations with `drizzle-kit migrate` is generally safer).*
5. **Environment Variables**: Open your Render Web Service settings and add all required environment variables from your local `.env`:
   - `DATABASE_URL` (Use the internal/external URL of your chosen Postgres DB)
   - `REDIS_URL` (Use the internal/external URL of your Redis instance)
   - `JWT_SECRET`, `CLOUDINARY_URL`, etc.
   - `PORT` (Usually Render automatically handles `PORT`, but ensure your `main.ts` correctly listens to `process.env.PORT || 3000`).
6. **Deploy**: Save and let Render build and deploy the application. It provides automatic HTTPS and WebSocket support out of the box.

---

## 3. Frontend Deployment (Expo EAS)
The "expovas" mentioned refers to **Expo Application Services (EAS)**, which is the official cloud build and submission service for Expo apps.

### Prerequisites:
- An Expo account (sign up at [expo.dev](https://expo.dev)).
- EAS CLI installed globally: `npm install -g eas-cli`

### Steps to Deploy:
1. **Initialize EAS**:
   Navigate to your frontend directory and login:
   ```bash
   cd frontend
   eas login
   eas build:configure
   ```
   This generates an `eas.json` file where you configure your build profiles (development, preview, production).
   
2. **Environment Variables**:
   Your frontend must communicate with the new Render backend. 
   - Update your local `.env` with the new production Render API URL (e.g., `EXPO_PUBLIC_API_URL=https://sync-tracker-api.onrender.com`).
   - Store these keys securely in your Expo dashboard (Project -> Secrets) or encode them in your `eas.json` depending on your security needs.

3. **Build the App**:
   Run the following commands to trigger cloud builds. This generates the standalone binaries (APK/AAB for Android, IPA for iOS).
   
   **For Android**:
   ```bash
   eas build -p android --profile production
   ```
   **For iOS** *(Requires an active Apple Developer Program membership)*:
   ```bash
   eas build -p ios --profile production
   ```

4. **Submit to App Stores**:
   Once the builds complete, you can use EAS Submit to automatically upload them to the Google Play Console and Apple App Store Connect:
   ```bash
   eas submit -p android
   eas submit -p ios
   ```

### Over-The-Air (OTA) Updates
One of the key benefits of Expo is **EAS Update**. This allows you to push minor JavaScript, style, or asset changes directly to users without going through the App Store review process.
```bash
eas update --branch production --message "Fixed UI bugs in VisionGraph"
```
*(Requires the `expo-updates` library to be installed and configured in your `app.json`)*

---

## 4. Final Verification
- **CORS Setup**: Ensure the NestJS backend's `main.ts` has CORS configured to accept requests from your compiled frontend (usually any origin for a mobile app or specific origins for web).
- **Socket Connections**: Verify that `socket.io-client` on the frontend connects to the correct Render WS URL via `wss://`.
- **Database Rules**: Check that production databases (especially if using Supabase DB) have secure policies and complex passwords.
