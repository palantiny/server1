-- 로컬 PostgreSQL에 server1/.env 와 맞는 역할·DB를 만듭니다.
-- 실행 예 (설치 시 지정한 postgres 슈퍼유저 비밀번호 입력):
--   psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -f scripts/init_local_postgres.sql
--
-- 이미 palantiny 역할이 있으면 CREATE ROLE 은 실패합니다. 그때는 아래 주석의 ALTER 만 사용하세요.

CREATE ROLE palantiny WITH LOGIN PASSWORD 'palantiny_secret';

CREATE DATABASE palantiny_db OWNER palantiny;

-- ALTER ROLE palantiny WITH PASSWORD 'palantiny_secret';
