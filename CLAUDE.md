# Server1 — 한약재 유통 웹사이트

## 한 줄 요약
한약재 B2B 구매자가 약재 목록/상세를 조회하고 주문·장바구니·세금계산서를 관리하는 서비스. FastAPI 백엔드 + React 프론트엔드.

---

## 인프라 구조
```
브라우저 → CloudFront → S3 (React 빌드)
                ↓ API 요청 (:8001)
          EC2 (FastAPI, Docker)
                ↓
          PostgreSQL (같은 EC2, Docker)
```

---

## 백엔드 지도 (`app/`)

```
web_main.py          # 진입점. CORS(ALLOWED_ORIGINS 환경변수), lifespan, 라우터 등록
core/
  config.py          # pydantic-settings. .env 또는 환경변수에서 로드
  database.py        # SQLAlchemy async engine (pool=5), async_session_maker
  security.py        # JWT 생성/검증 (HS256, python-jose)
api/
  deps.py            # get_db(), get_current_user() (HTTPBearer JWT 검증)
  v1/
    auth.py          # POST /api/v1/auth/login → 단일 admin 계정 검증 → JWT 발급
    herbs.py         # GET /api/v1/herbs, GET /api/v1/herbs/{herb_id}
    cart.py          # GET/POST/PUT/DELETE /api/v1/cart
    orders.py        # GET/POST /api/v1/orders, /api/v1/orders/cancellations
    invoices.py      # GET /api/v1/invoices/tax, /api/v1/invoices/payments
models/
  user.py            # users 테이블 (UUID PK, partner_token) — 현재 미사용
  cart.py            # cart_items 테이블
  order.py           # orders, order_cancellations 테이블
  invoice.py         # tax_invoices, payments 테이블
```

### 환경변수 (`.env.prod`)
| 키 | 설명 |
|---|---|
| `DATABASE_URL` | PostgreSQL asyncpg URL |
| `ADMIN_ID` / `ADMIN_PASSWORD` | 단일 관리자 계정 |
| `JWT_SECRET` | HS256 서명 키 |
| `JWT_EXPIRE_HOURS` | 기본 24 |
| `ALLOWED_ORIGINS` | CORS 허용 도메인 (콤마 구분) |
| `POSTGRES_USER/PASSWORD/DB` | Docker postgres 컨테이너용 |

---

## DB 테이블 구조

**자동 생성 (SQLAlchemy create_all)**
- `users` — 파트너사 계정 (현재 미사용)
- `cart_items` — 장바구니
- `orders`, `order_cancellations` — 주문/취소
- `tax_invoices`, `payments` — 세금계산서/입금

**외부 마이그레이션으로만 채워짐** (server2의 `scripts/db_migration.py` 실행 필요)
- `han_medicine` — 약재 기본 정보 (PK: `md_seq`)
- `han_medicine_dj` — 성·미·귀경·사상 체질 정보
- `han_warehouse` — 최근 입고 정보
- `price_domestic` — 국내산 가격 (**컬럼명이 한글**)
- `price_imported` — 수입산 가격

> `han_medicine`이 없으면 GET /herbs가 503 반환하고 마이그레이션 안내 메시지를 출력함.

---

## herbs API 동작 방식

**GET /herbs** (목록)
1. `han_medicine` 전체 조회
2. `price_domestic`, `price_imported` 조회 후 약재명으로 매핑
3. qty 기준 재고 상태 계산: `high(≥50)` / `medium(≥10)` / `low(<10)` / `out`
4. 가격: price 테이블 우선, 없으면 `md_price` 사용

**GET /herbs/{herb_id}** (상세)
- 위 정보 + `han_medicine_dj`(한의학 정보) + `han_warehouse`(입고 이력) 추가
- 각 테이블 조회 실패 시 건너뜀 (503 아님, warning 로그)

---

## 프론트엔드 지도 (`frontEnd/src/`)

```
main.tsx             # 진입점
routes.tsx           # React Router 라우팅 정의
api.ts               # fetch 함수 모음 + JWT 로컬스토리지 관리
components/
  LoginPage          # /login — ADMIN_ID/PASSWORD로 JWT 발급
  ProtectedRoute     # JWT 없으면 /login 리다이렉트
  BuyerDashboard     # / — 약재 목록 (GET /herbs) + 필터(초성/형상/효능/원산지/가격) + 정렬
  ProductDetail      # /product/:id — 약재 상세 (GET /herbs/{id})
  MyPage             # /mypage — 주문/장바구니/세금계산서/입금 (실API + mock fallback)
  ChatbotButton      # 우측 하단 플로팅 챗봇 버튼 (server2 연결)
```

- JWT는 `localStorage["palantiny_token"]`에 저장
- API URL: `VITE_API_BASE_URL` 환경변수 + `/api/v1`
- 빌드 결과: `frontEnd/build/` → S3 업로드
- 로컬 개발 프록시: `/api` → `http://localhost:8001`

---

## 배포 구조
```
git push → GitHub Actions
  deploy-backend:
    zip(frontEnd 제외) → S3(palantiny-codedeploy/server1/deploy.zip)
    → CodeDeploy(palantiny-server1) → EC2
    → scripts/after_install.sh: docker compose down → rm -f → build → up -d
  deploy-frontend: (needs: deploy-backend)
    npm build → S3(프론트버킷) sync → CloudFront 캐시 무효화
```

---

## 현재 MVP 한계 / 알고 있는 미완성 사항
- 인증이 단일 admin 계정 1개뿐 (파트너사별 계정 미구현, `users` 테이블은 있음)
- herbs.py가 `get_db()` 대신 `async_session_maker()` 직접 사용 (deps.py와 불일치)
- MyPage 주문/취소/세금계산서/입금은 실데이터 없으면 mock으로 fallback
