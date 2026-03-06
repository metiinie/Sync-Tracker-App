/**
 * API Configuration
 *
 * IMPORTANT: Specify your API base URL in the frontend/.env file using the
 * EXPO_PUBLIC_API_URL variable.
 *
 * Example:
 * EXPO_PUBLIC_API_URL=http://10.X.X.X:3000 (Local Dev)
 * EXPO_PUBLIC_API_URL=https://your-api.onrender.com (Production)
 */

// Use the environment variable if defined, otherwise fallback to localhost (for simulator) or a default IP
const defaultApiUrl = 'http://localhost:3000';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl;

export const API_BASE_URL = `${apiUrl}/api/v1`;
export const SOCKET_URL = apiUrl;
