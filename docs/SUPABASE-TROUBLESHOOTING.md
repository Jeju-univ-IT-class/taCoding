# Supabase SQL Editor 오류 해결 가이드

## "Failed to fetch (api.supabase.com)" 오류 해결 방법

Supabase 대시보드의 SQL Editor에서 쿼리를 실행할 때 발생하는 "Failed to fetch" 오류를 해결하는 방법입니다.

---

## 1. 즉시 확인 사항

### 1.1 Supabase 프로젝트 상태 확인

1. **Supabase 대시보드** → **Settings** → **General**에서 프로젝트 상태 확인
2. 프로젝트가 **Paused** 상태인지 확인
   - Paused 상태라면 **Resume** 버튼 클릭
   - 프로젝트가 일시 중지되면 모든 API 요청이 실패합니다

### 1.2 네트워크 연결 확인

- 인터넷 연결 상태 확인
- 방화벽이나 VPN이 `api.supabase.com`을 차단하는지 확인
- 회사 네트워크를 사용 중이라면 네트워크 관리자에게 문의

---

## 2. 브라우저 관련 문제 해결

### 2.1 브라우저 캐시 및 쿠키 삭제

1. **Chrome/Edge**: `Ctrl+Shift+Delete` (Windows) 또는 `Cmd+Shift+Delete` (Mac)
2. **캐시된 이미지 및 파일** 선택
3. **쿠키 및 기타 사이트 데이터** 선택
4. 삭제 후 Supabase 대시보드 재로그인

### 2.2 시크릿/프라이빗 모드에서 시도

- 확장 프로그램이나 캐시 문제를 배제하기 위해 시크릿 모드에서 테스트
- 시크릿 모드에서도 동일한 오류가 발생하면 브라우저 문제가 아닙니다

### 2.3 다른 브라우저에서 시도

- Chrome, Firefox, Safari 등 다른 브라우저에서 테스트
- 특정 브라우저의 문제인지 확인

### 2.4 브라우저 확장 프로그램 비활성화

- AdBlock, Privacy Badger 등 네트워크 요청을 차단하는 확장 프로그램 일시 비활성화
- 특히 `api.supabase.com`을 차단하는 확장 프로그램이 있는지 확인

---

## 3. SQL 쿼리 문제 해결

### 3.1 쿼리 길이 제한

- 매우 긴 쿼리는 여러 부분으로 나누어 실행
- 한 번에 실행할 수 있는 쿼리 크기 제한 확인

### 3.2 쿼리 문법 확인

제공하신 쿼리를 확인한 결과, 문법적으로는 문제가 없습니다. 하지만 다음 사항을 확인하세요:

```sql
-- 장소 테이블
CREATE TABLE places (
  id BIGSERIAL PRIMARY KEY,
  region VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  detail_info TEXT,
  disabled_info TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  data_quality VARCHAR(50),
  modified_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_places_region ON places(region);
CREATE INDEX idx_places_location ON places(latitude, longitude);
CREATE INDEX idx_places_name ON places(name);
CREATE INDEX idx_places_recommended ON places(is_recommended);
```

**확인 사항:**
- `places` 테이블이 이미 존재하는지 확인
  - 존재한다면 `CREATE TABLE IF NOT EXISTS places` 사용 또는 기존 테이블 삭제 후 재생성
- 인덱스가 이미 존재하는지 확인
  - 존재한다면 `CREATE INDEX IF NOT EXISTS` 사용

### 3.3 개선된 쿼리 (안전한 버전)

```sql
-- 기존 테이블이 있으면 삭제 (주의: 데이터 손실)
-- DROP TABLE IF EXISTS places CASCADE;

-- 장소 테이블 생성 (IF NOT EXISTS 사용)
CREATE TABLE IF NOT EXISTS places (
  id BIGSERIAL PRIMARY KEY,
  region VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  detail_info TEXT,
  disabled_info TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  data_quality VARCHAR(50),
  modified_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (IF NOT EXISTS 사용)
CREATE INDEX IF NOT EXISTS idx_places_region ON places(region);
CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
CREATE INDEX IF NOT EXISTS idx_places_recommended ON places(is_recommended);
```

---

## 4. 단계별 문제 해결

### 단계 1: 간단한 쿼리로 테스트

먼저 간단한 쿼리로 SQL Editor가 정상 작동하는지 확인:

```sql
SELECT NOW();
```

이 쿼리가 성공하면 SQL Editor 자체는 정상입니다.

### 단계 2: 테이블 존재 여부 확인

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'places'
);
```

### 단계 3: 쿼리를 나누어 실행

큰 쿼리를 여러 부분으로 나누어 실행:

**1단계: 테이블 생성**
```sql
CREATE TABLE IF NOT EXISTS places (
  id BIGSERIAL PRIMARY KEY,
  region VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  detail_info TEXT,
  disabled_info TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  data_quality VARCHAR(50),
  modified_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**2단계: 인덱스 생성 (하나씩)**
```sql
CREATE INDEX IF NOT EXISTS idx_places_region ON places(region);
```

```sql
CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);
```

```sql
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
```

```sql
CREATE INDEX IF NOT EXISTS idx_places_recommended ON places(is_recommended);
```

---

## 5. Supabase 대시보드 문제 해결

### 5.1 프로젝트 재시작

1. **Settings** → **General** → **Restart Project**
2. 프로젝트 재시작 후 몇 분 대기
3. SQL Editor에서 다시 시도

### 5.2 API 키 확인

1. **Settings** → **API**에서 API 키 확인
2. `anon` 키와 `service_role` 키가 정상적으로 표시되는지 확인
3. 키가 표시되지 않으면 프로젝트에 문제가 있을 수 있습니다

### 5.3 데이터베이스 연결 확인

1. **Database** → **Connection Pooling**에서 연결 상태 확인
2. 연결 풀 설정이 올바른지 확인

---

## 6. 대안 방법

### 6.1 Supabase CLI 사용

로컬에서 Supabase CLI를 사용하여 마이그레이션 실행:

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 파일 생성
supabase migration new create_places_table

# 마이그레이션 파일에 SQL 작성 후 실행
supabase db push
```

### 6.2 psql 직접 연결

Supabase 대시보드 → **Settings** → **Database**에서 연결 문자열을 가져와 `psql`로 직접 연결:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

연결 후 SQL 실행:

```sql
CREATE TABLE places (...);
```

---

## 7. 추가 확인 사항

### 7.1 Supabase 상태 페이지 확인

- [Supabase Status Page](https://status.supabase.com/)에서 서비스 상태 확인
- 서비스 장애가 있는지 확인

### 7.2 브라우저 콘솔 확인

1. 브라우저 개발자 도구 열기 (`F12`)
2. **Console** 탭에서 추가 오류 메시지 확인
3. **Network** 탭에서 실패한 요청 확인
   - 요청 URL 확인
   - 응답 상태 코드 확인
   - 응답 본문 확인

### 7.3 Supabase 지원팀 문의

위 방법으로 해결되지 않으면:
1. Supabase 대시보드에서 **Support** 메뉴 확인
2. 오류 메시지와 함께 문의
3. 브라우저 콘솔의 네트워크 오류 스크린샷 첨부

---

## 8. 예방 조치

### 8.1 정기적인 백업

- 중요한 데이터는 정기적으로 백업
- Supabase 대시보드 → **Database** → **Backups**에서 백업 설정

### 8.2 마이그레이션 파일 사용

- SQL Editor 대신 마이그레이션 파일 사용 권장
- 버전 관리 및 재현 가능한 스키마 관리

---

## 요약

"Failed to fetch" 오류가 발생할 때 다음 순서로 확인하세요:

1. ✅ Supabase 프로젝트가 활성화되어 있는지 확인
2. ✅ 브라우저 캐시 및 쿠키 삭제
3. ✅ 시크릿 모드에서 테스트
4. ✅ 간단한 쿼리(`SELECT NOW()`)로 SQL Editor 작동 확인
5. ✅ 쿼리를 작은 단위로 나누어 실행
6. ✅ 브라우저 콘솔에서 네트워크 오류 확인
7. ✅ Supabase 상태 페이지 확인
8. ✅ Supabase CLI 또는 psql로 대안 시도

문제가 계속되면 Supabase 지원팀에 문의하세요.
