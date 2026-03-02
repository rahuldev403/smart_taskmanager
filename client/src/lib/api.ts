import axios, { type Method } from "axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

async function requestJson<TResponse>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<ApiEnvelope<TResponse>> {
  try {
    const res = await axios.request<ApiEnvelope<TResponse>>({
      method,
      url: `${API_BASE}${path}`,
      data: body,
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });

    const json = res.data;

    if (!json.success) {
      throw new Error(json?.message || "Request failed");
    }

    return json;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const messageFromApi =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message;
      throw new Error(messageFromApi || "Request failed");
    }
    throw error;
  }
}

export function apiGet<TResponse>(path: string) {
  return requestJson<TResponse>("GET", path);
}

export function apiPost<TResponse>(path: string, body?: unknown) {
  return requestJson<TResponse>("POST", path, body);
}

export function apiPatch<TResponse>(path: string, body?: unknown) {
  return requestJson<TResponse>("PATCH", path, body);
}

export function apiDelete<TResponse>(path: string) {
  return requestJson<TResponse>("DELETE", path);
}
