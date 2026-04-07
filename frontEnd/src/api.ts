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

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 401 응답 시 토큰 삭제 후 로그인 페이지로 이동 */
function handle401(res: Response): void {
  if (res.status === 401) {
    clearToken();
    window.location.replace('/login');
  }
}

export async function fetchHerbs(): Promise<{ herbs: HerbItem[]; total: number }> {
  const res = await fetch(`${API_BASE}/herbs`, { headers: authHeaders() });
  handle401(res);
  if (!res.ok) throw new Error("약재 목록을 불러오는데 실패했습니다.");
  return res.json();
}

export async function fetchHerbDetail(id: string): Promise<HerbDetail> {
  const res = await fetch(`${API_BASE}/herbs/${id}`, { headers: authHeaders() });
  handle401(res);
  if (!res.ok) throw new Error("약재 상세 정보를 불러오는데 실패했습니다.");
  return res.json();
}

// ── MyPage 타입 ──────────────────────────────────────────

export interface Order {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  status: string;
  created_at: string;
}

export interface OrderCancellation {
  id: string;
  type: string;
  product_name: string;
  price: number;
  quantity: number;
  status: string;
  reason: string;
  created_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

export interface TaxInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface Payment {
  id: string;
  order_number: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

// ── MyPage API ───────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders`, { headers: authHeaders() });
  handle401(res);
  if (!res.ok) throw new Error("주문 목록을 불러오는데 실패했습니다.");
  return res.json();
}

export async function fetchCancellations(): Promise<OrderCancellation[]> {
  const res = await fetch(`${API_BASE}/orders/cancellations`, { headers: authHeaders() });
  handle401(res);
  if (!res.ok) throw new Error("취소/반품 내역을 불러오는데 실패했습니다.");
  return res.json();
}

export async function fetchCart(): Promise<CartItem[]> {
  const res = await fetch(`${API_BASE}/cart`, { headers: authHeaders() });
  handle401(res);
  if (!res.ok) throw new Error("장바구니를 불러오는데 실패했습니다.");
  return res.json();
}

export async function addToCart(item: Omit<CartItem, "id">): Promise<CartItem> {
  const res = await fetch(`${API_BASE}/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(item),
  });
  handle401(res);
  if (!res.ok) throw new Error("장바구니 추가에 실패했습니다.");
  return res.json();
}

export async function updateCartItem(id: string, quantity: number): Promise<CartItem> {
  const res = await fetch(`${API_BASE}/cart/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ quantity }),
  });
  handle401(res);
  if (!res.ok) throw new Error("장바구니 수정에 실패했습니다.");
  return res.json();
}

export async function deleteCartItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cart/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  handle401(res);
  if (!res.ok) throw new Error("장바구니 삭제에 실패했습니다.");
}

export async function fetchTaxInvoices(): Promise<TaxInvoice[]> {
  const res = await fetch(`${API_BASE}/invoices/tax`, { headers: authHeaders() });
  handle401(res);
  if (!res.ok) throw new Error("세금계산서를 불러오는데 실패했습니다.");
  return res.json();
}

export async function fetchPayments(): Promise<Payment[]> {
  const res = await fetch(`${API_BASE}/invoices/payments`, { headers: authHeaders() });
  handle401(res);
  if (!res.ok) throw new Error("입금 내역을 불러오는데 실패했습니다.");
  return res.json();
}
