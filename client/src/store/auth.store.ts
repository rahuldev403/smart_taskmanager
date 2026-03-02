import axios from "axios";
import { create } from "zustand";
import type { AuthState, AuthUser } from "./auth.types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

async function postJson<TResponse>(
  path: string,
  body?: unknown,
): Promise<ApiEnvelope<TResponse>> {
  let json: ApiEnvelope<TResponse>;

  try {
    const res = await axios.post<ApiEnvelope<TResponse>>(
      `${API_BASE}${path}`,
      body,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      },
    );
    json = res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const messageFromApi =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message;
      throw new Error(messageFromApi || "Request failed");
    }
    throw error;
  }

  if (!json.success) {
    throw new Error(json?.message || "Request failed");
  }
  return json;
}

async function getJson<TResponse>(
  path: string,
): Promise<ApiEnvelope<TResponse>> {
  let json: ApiEnvelope<TResponse>;

  try {
    const res = await axios.get<ApiEnvelope<TResponse>>(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    json = res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const messageFromApi =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message;
      throw new Error(messageFromApi || "Request failed");
    }
    throw error;
  }

  if (!json.success) {
    throw new Error(json?.message || "Request failed");
  }

  return json;
}

function extractUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== "object") return null;
  const maybeObj = data as Record<string, unknown>;
  if (maybeObj.user && typeof maybeObj.user === "object") {
    return maybeObj.user as AuthUser;
  }
  return maybeObj as AuthUser;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  bootstrapped: false,

  clearError: () => set({ error: null }),

  registerAction: async ({ userName, email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await postJson<{ user?: AuthUser } | AuthUser>(
        "/api/auth/register",
        { userName, email, password },
      );

      const user = extractUser(response.data);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Register failed",
      });
      throw err;
    }
  },

  loginAction: async ({ email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await postJson<{ user?: AuthUser } | AuthUser>(
        "/api/auth/login",
        { email, password },
      );

      const user = extractUser(response.data);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "login failed",
      });
      throw error;
    }
  },

  logoutAction: async () => {
    set({ isLoading: true, error: null });
    try {
      await postJson<null>("/api/auth/logout");
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "logout failed",
      });
    }
  },

  bootstrapAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      await postJson<null>("/api/auth/refresh");
      const response = await getJson<{ user?: AuthUser } | AuthUser>(
        "/api/auth/me",
      );
      const user = extractUser(response.data);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        bootstrapped: true,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        bootstrapped: true,
      });
    }
  },
}));
