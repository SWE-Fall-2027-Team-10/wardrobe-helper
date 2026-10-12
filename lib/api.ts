// Talks to the team's Express + MySQL backend in server/.
// Set EXPO_PUBLIC_API_URL in .env.local, e.g. http://192.168.1.20:3000/api
// (use your computer's local IP, not localhost, when running on a phone).
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_KEY = 'session_token';

export type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
const saveToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError('EXPO_PUBLIC_API_URL is not set. Add it to .env.local and restart Expo.', 0);
  }
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${API_URL}. Is it running, and is the IP right?`, 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export type RegisterInput = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  date_of_birth?: string; // YYYY-MM-DD
};

export const api = {
  register: (input: RegisterInput) =>
    request<{ message: string; user_id: number }>('/auth/register', { method: 'POST', body: input }),

  // Logs in and stores the session token securely on the device.
  login: async (email: string, password: string): Promise<User> => {
    const { token, user } = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    await saveToken(token);
    return user;
  },

  // Ends the session on the server, and always forgets the token locally.
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      await clearToken();
    }
  },

  me: () => request<User & Record<string, unknown>>('/auth/me'),
};
