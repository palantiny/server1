# server1
드림학기제 웹사이트용 서버

## 환경 변수 (추가)
- `DJMEDI_BASE_URL` — DJMEDI 약재 API 베이스 URL (기본: DEV)
- `DJMEDI_CFAUTHKEY` — PDF의 `cfauthkey` 헤더 값
- 기본 관리자: `ADMIN_ID` / `ADMIN_PASSWORD` — 최초 기동 시 `users`에 없으면 자동 생성

## DB 마이그레이션
기존 `users` 테이블만 있는 경우, 컬럼 추가는 `Base.metadata.create_all`만으로는 반영되지 않습니다. PostgreSQL에서 수동으로 `ALTER TABLE` 하거나 테이블을 재생성하세요.
