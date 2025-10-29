# Vocal Class - 로컬 개발 환경 설정 가이드

## 1. 사전 준비

### Node.js 및 Wrangler 설치
```bash
# Node.js 18 이상 필요
node --version

# Wrangler CLI 설치
npm install -g wrangler

# Wrangler 로그인
wrangler login
```

## 2. D1 데이터베이스 설정

### 데이터베이스 생성
```bash
# D1 데이터베이스 생성
wrangler d1 create vocal-class-db
```

생성 후 출력되는 `database_id`를 복사하여 `wrangler.toml` 파일의 `[[d1_databases]]` 섹션에 추가:

```toml
[[d1_databases]]
binding = "DB"
database_name = "vocal-class-db"
database_id = "YOUR_DATABASE_ID_HERE"  # 여기에 실제 ID 입력
```

### 스키마 적용
```bash
# 로컬 D1 데이터베이스에 스키마 적용
wrangler d1 execute vocal-class-db --local --file=./schema.sql

# 프로덕션 D1 데이터베이스에 스키마 적용 (배포 전)
wrangler d1 execute vocal-class-db --file=./schema.sql
```

## 3. R2 스토리지 설정

### R2 버킷 생성
```bash
# R2 버킷 생성
wrangler r2 bucket create vocal-class-storage
```

생성 후 `wrangler.toml`에 이미 설정되어 있는지 확인:

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "vocal-class-storage"
```

## 4. 로컬 개발 서버 실행

### 올바른 명령어
```bash
# D1과 R2 바인딩을 포함하여 로컬 서버 실행
wrangler pages dev . --d1=DB --r2=STORAGE --port=8788

# 또는 간단하게 (wrangler.toml의 설정 사용)
wrangler pages dev .
```

### 브라우저에서 접속
```
http://localhost:8788
```

## 5. 문제 해결

### "Unexpected end of JSON input" 에러
이 에러는 API 엔드포인트가 제대로 응답하지 않을 때 발생합니다.

**해결 방법:**
1. 로컬 개발 서버가 제대로 실행되었는지 확인
2. 터미널에서 `wrangler pages dev . --d1=DB --r2=STORAGE` 명령어 실행
3. 브라우저 콘솔에서 네트워크 탭 확인
4. `/api/auth` 요청이 404나 500 에러를 반환하는지 확인

### D1 데이터베이스가 비어있음
```bash
# 로컬 DB 초기화
wrangler d1 execute vocal-class-db --local --file=./schema.sql

# 프로덕션 DB 초기화
wrangler d1 execute vocal-class-db --file=./schema.sql
```

### R2 권한 에러
```bash
# R2 버킷 목록 확인
wrangler r2 bucket list

# 버킷이 없으면 생성
wrangler r2 bucket create vocal-class-storage
```

## 6. 배포 (Cloudflare Pages)

### GitHub 연동 배포
1. GitHub에 코드 푸시
2. Cloudflare Dashboard > Pages > Create a project
3. GitHub 저장소 선택
4. 빌드 설정:
   - Build command: (비워둠)
   - Build output directory: `/`
5. Environment variables 설정:
   - D1 데이터베이스 바인딩 추가
   - R2 버킷 바인딩 추가

### Wrangler CLI로 직접 배포
```bash
# 배포 전 프로덕션 DB 스키마 적용
wrangler d1 execute vocal-class-db --file=./schema.sql

# Pages 프로젝트 배포
wrangler pages deploy .
```

## 7. 로컬 vs 프로덕션 차이점

| 항목 | 로컬 개발 | 프로덕션 |
|------|----------|---------|
| D1 Database | `--local` 플래그 사용 | 실제 Cloudflare D1 |
| R2 Storage | 로컬 에뮬레이션 | 실제 Cloudflare R2 |
| API 엔드포인트 | `http://localhost:8788/api/*` | `https://your-domain.pages.dev/api/*` |

## 8. 테스트 데이터 생성

### 강사 계정 생성
1. `http://localhost:8788` 접속
2. 이름: "테스트강사", 역할: "강사" 선택
3. 로그인

### 학생 계정 생성
1. 로그아웃 후 메인 페이지로 이동
2. 이름: "테스트학생", 역할: "수강생" 선택
3. 로그인

### 스케줄 설정 (강사)
1. 강사로 로그인
2. 주간 시간표에서 가능한 시간 체크
3. "스케줄 저장" 클릭

### 수업 예약 (학생)
1. 학생으로 로그인
2. 강사의 가능 시간 중 원하는 시간 클릭
3. 예약 확인

## 9. 유용한 명령어

```bash
# D1 데이터베이스 쿼리 실행
wrangler d1 execute vocal-class-db --local --command="SELECT * FROM users"

# R2 버킷 내용 확인
wrangler r2 object list vocal-class-storage

# 로그 확인 (배포 후)
wrangler pages deployment tail

# 환경 변수 확인
wrangler pages project list
```

## 문제가 계속되면?

1. Wrangler 버전 확인: `wrangler --version` (3.0 이상 권장)
2. Node.js 버전 확인: `node --version` (18 이상 필요)
3. 캐시 삭제: `npm cache clean --force`
4. Wrangler 재설치: `npm uninstall -g wrangler && npm install -g wrangler`
5. GitHub Issues: https://github.com/zuhthebeg/vocal-class-cloudflare/issues
