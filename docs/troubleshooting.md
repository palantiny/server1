# Palantiny 트러블슈팅 기록

## 1. AWS CodeDeploy 배포 파이프라인 구축

### 1-1. Service Role 오류
**증상**: CodeDeploy 배포 그룹 생성 시 Service Role 관련 오류  
**원인**: IAM User를 Role로 잘못 입력  
**해결**: IAM Role(`CodeDeployRole`) 생성 후 `AWSCodeDeployRole` 정책 연결, 신뢰 관계에 `codedeploy.amazonaws.com` 추가

### 1-2. Load Balancer 오류
**증상**: 배포 그룹 설정 시 로드밸런서 관련 오류  
**원인**: Enable load balancing 체크박스 활성화  
**해결**: 체크 해제

### 1-3. S3 버킷 NoSuchBucket / ParamValidation
**증상**: `NoSuchBucket` 또는 공백 관련 에러  
**원인**: `CODEDEPLOY_S3_BUCKET` GitHub Secret 값에 trailing space 포함  
**해결**: Secret 값 재입력 (공백 제거)

### 1-4. EC2 S3 접근 거부 (AccessDenied)
**증상**: CodeDeploy가 S3에서 번들 다운로드 실패  
**원인**: EC2 IAM Role에 S3 읽기 권한 없음  
**해결**: EC2 IAM Role에 `AmazonS3ReadOnlyAccess` 정책 추가

### 1-5. Docker 컨테이너 충돌 (Container Conflict)
**증상**: `after_install.sh` 실행 시 `container name already in use` 오류  
**원인**: 이전 배포에서 실행 중인 컨테이너가 남아있음  
**해결**: `after_install.sh`에 `docker rm -f` 명령 추가

---

## 2. 프론트엔드 배포 (CloudFront + S3)

### 2-1. CORS 오류
**증상**: 브라우저에서 API 호출 시 CORS 에러  
**원인**: `VITE_API_BASE_URL`에 CloudFront 도메인이 설정돼 cross-origin 요청 발생  
**해결**: `VITE_API_BASE_URL` Secret 삭제 → 상대 경로로 API 호출

### 2-2. CloudFront Origin IP 오류
**증상**: CloudFront Origin 설정 시 "Origin domain cannot be an IP address" 오류  
**원인**: EC2 IP 주소를 그대로 입력  
**해결**: EC2 Public DNS 주소 사용

### 2-3. SPA 새로고침 403 오류
**증상**: `/login` 등 React Router 경로에서 새로고침 시 CloudFront 403 에러  
**원인**: S3에 해당 경로의 파일이 없어 403/404 반환  
**해결**: CloudFront Custom Error Response 설정
- 403 → `/index.html` (200)
- 404 → `/index.html` (200)

---

## 3. Neo4j AuraDB 연동

### 3-1. herbs API 503 (NEO4J_URI 미설정)
**증상**: `GET /api/v1/herbs` 503 반환  
**원인**: `docker-compose.prod.yml`의 `web_app` 서비스에 NEO4J 환경변수 누락  
**해결**: `docker-compose.prod.yml` environment 섹션에 NEO4J_URI/USERNAME/PASSWORD/DATABASE 추가

### 3-2. Neo4j AuthError (잘못된 USERNAME/DATABASE)
**증상**: `Neo.ClientError.Security.Unauthorized` 인증 실패  
**원인**: AuraDB 인스턴스의 USERNAME과 DATABASE가 `neo4j`가 아닌 인스턴스 ID(`20a2b7bf`)  
**해결**: `.env.prod`에서 `NEO4J_USERNAME`과 `NEO4J_DATABASE`를 `20a2b7bf`로 수정

> **주의**: AuraDB 연결 정보 파일(`.txt`)에 명시된 값 그대로 사용할 것.  
> `NEO4J_USERNAME=neo4j`는 AuraDB Free에서 동작하지 않을 수 있음.

---

## 4. server2 챗봇 서버

### 4-1. server2 PostgreSQL 컨테이너 충돌
**증상**: server2 컨테이너 기동 시 `palantiny_postgres already in use` 오류  
**원인**: server1과 server2가 같은 EC2에서 동일한 `palantiny_postgres` 컨테이너명 사용  
**해결**: server2의 postgres `container_name`을 `palantiny_postgres_s2`로 변경

### 4-2. server2 chatbot_app DB 연결 실패
**증상**: `socket.gaierror: Temporary failure in name resolution`  
**원인**: `--no-deps`로 postgres 없이 chatbot_app만 기동해 `postgres` 호스트명 미해결  
**해결**: server2 전체 재시작 (`docker compose down && up -d`)

### 4-3. server2 NEO4J_URI 누락
**증상**: `NEO4J_URI variable is not set` 경고, Neo4j 연결 불가  
**원인**: server2 `.env.prod`에 `NEO4J_URI` 항목 없음  
**해결**: `.env.prod`에 `NEO4J_URI` 추가 후 컨테이너 재시작

---

## 5. CloudFront 라우팅 (챗봇)

### 5-1. 챗봇 요청이 server2에 미도달
**증상**: 챗봇 메시지 전송해도 응답 없음, `palantiny_chatbot_app` 로그에 요청 없음  
**원인**: CloudFront behavior 순서 문제 — `/api/*` (server1:8001)가 `/api/v1/chat/*` (server2:8000)보다 앞에 있어 챗봇 요청이 server1으로 라우팅됨  
**해결**: CloudFront Behaviors에서 `/api/v1/chat/*`를 `/api/*`보다 위로 순서 변경

> **CloudFront Behavior 순서 (위에서 아래로 우선순위)**
> 1. `/api/v1/chat/*` → EC2:8000 (server2, CachingDisabled)
> 2. `/api/v1/herbs*` → EC2:8001 (server1)
> 3. `/api/*` → EC2:8001 (server1)
> 4. `/*` (Default) → S3 (React 빌드)

---

## 환경 구성 요약

| 항목 | 값 |
|---|---|
| EC2 | `ip-172-31-39-49` (ap-northeast-2) |
| server1 포트 | 8001 (FastAPI 웹 서버) |
| server2 포트 | 8000 (FastAPI 챗봇 서버) |
| CloudFront | palantiny.kro.kr |
| Neo4j AuraDB | `neo4j+s://20a2b7bf.databases.neo4j.io` |
| S3 (프론트) | React 빌드 파일 |
| S3 (CodeDeploy) | 배포 번들 (server1/, server2/) |

## EC2 배포 후 수동 관리 파일

CodeDeploy 배포 시 덮어쓰지 않는 파일들 (EC2에서 직접 관리):
- `/home/ubuntu/server1/.env.prod`
- `/home/ubuntu/server2/.env.prod`
