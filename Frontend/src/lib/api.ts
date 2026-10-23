const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "onboardiq_access_token";

type ApiResponse<T> = { success: boolean; message?: string; data: T };

export type ApiUser = { id: string; name: string; email: string; role: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as Partial<ApiResponse<T>> & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "The request could not be completed");
  return (body.data ?? body) as T;
}

export const api = {
  async register(input: { name: string; email: string; password: string }) {
    const result = await request<{ user: ApiUser; session: { access_token: string } | null }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (result.session?.access_token) localStorage.setItem(TOKEN_KEY, result.session.access_token);
    return result;
  },
  async login(input: { email: string; password: string }) {
    const result = await request<{ user: ApiUser; session: { access_token: string } }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    localStorage.setItem(TOKEN_KEY, result.session.access_token);
    return result;
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },
  async submitApplication(input: {
    fullName: string; dob: string; gender: string; panNumber: string; aadhaarLast4: string;
    mobile: string; email: string; address: string; city: string; state: string; pincode: string;
    occupationCode: string; annualIncome: string; files: { file: File; type: string }[];
  }) {
    const form = new FormData();
    for (const [key, value] of Object.entries(input)) {
      if (key !== "files") form.append(key, value as string);
    }
    form.append("consentToKyc", "true");
    form.append("documentTypes", JSON.stringify(input.files.map(({ type }) => type)));
    input.files.forEach(({ file }) => form.append("documents", file));
    return request<{ application: { id: string; applicationNo: string; status: string }; documents: unknown[] }>("/api/v1/applications", {
      method: "POST",
      body: form,
    });
  },
};
