const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1`;

/** localStorage 키 (MVP 로그인 JWT) */
export const TOKEN_STORAGE_KEY = "palantiny_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function loginUser(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let message = "로그인에 실패했습니다.";
    try {
      const err = await res.json();
      if (typeof err.detail === "string") {
        message = err.detail;
      } else if (Array.isArray(err.detail) && err.detail[0]?.msg) {
        message = err.detail[0].msg;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const data = (await res.json()) as { access_token: string };
  setToken(data.access_token);
}

export interface HerbItem {
  id: string;
  name: string;
  name_chn: string;
  name_eng: string;
  origin: string;
  price: number;
  stockStatus: "high" | "medium" | "low" | "out";
  qty: number;
  description: string;
  feature: string;
  note: string;
  interaction: string;
  related: string;
  property: string;
  manufacturer: string;
  packagingUnitG: string;
  boxQuantity: string;
  subscriptionPrice: string;
  discountRate: string;
  grade: string;
  marketType: string;
}

export interface HerbDetail extends HerbItem {
  status: string;
  code: string;
  pricePerGeun: string;
  nature: string;
  taste: string;
  meridian: string;
  constitution: string;
  warehouseMaker: string;
  warehouseOrigin: string;
  warehouseDate: string;
  warehouseExpired: string;
}

export async function fetchHerbs(): Promise<{ herbs: HerbItem[]; total: number }> {
  const res = await fetch(`${API_BASE}/herbs`);
  if (!res.ok) throw new Error("약재 목록을 불러오는데 실패했습니다.");
  return res.json();
}

export async function fetchHerbDetail(id: string): Promise<HerbDetail> {
  const res = await fetch(`${API_BASE}/herbs/${id}`);
  if (!res.ok) throw new Error("약재 상세 정보를 불러오는데 실패했습니다.");
  return res.json();
}
