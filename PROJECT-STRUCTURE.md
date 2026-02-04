# 프로젝트 구조 가이드

Jeju Reviews 프로젝트의 전체 파일 구조와 각 파일의 역할을 설명하는 문서입니다.

---

## 📁 전체 디렉토리 구조

```
taCoding/
├── 📄 README.md                    # 프로젝트 기본 정보 및 실행 방법
├── 📄 PROJECT-STRUCTURE.md         # 이 문서 (프로젝트 구조 설명)
├── 📄 package.json                 # 프로젝트 의존성 및 스크립트
├── 📄 vite.config.js               # Vite 빌드 설정
├── 📄 tailwind.config.cjs          # Tailwind CSS 설정
├── 📄 postcss.config.cjs            # PostCSS 설정
├── 📄 index.html                   # HTML 진입점
│
├── 📁 src/                         # 소스 코드 디렉토리
│   ├── 📄 main.jsx                  # React 앱 진입점
│   ├── 📄 App.jsx                   # 메인 앱 컴포넌트 (단일 파일 구조)
│   ├── 📄 index.css                # 전역 스타일
│   │
│   └── 📁 services/                # 서비스 레이어 (DB 관련)
│       ├── 📄 db.js                 # DB 접근 추상화 레이어 (현재: sqlite)
│       ├── 📄 db-sqlite.js          # SQLite 구현체 (임시 DB)
│       └── 📄 db-init.js            # DB 초기화 및 더미 데이터
│
├── 📁 docs/                        # 프로젝트 문서
│   ├── 📄 database-design.md        # DB 설계 문서 (스키마, 쿼리)
│   ├── 📄 SUPABASE-MIGRATION.md    # Supabase 마이그레이션 가이드
│   └── 📄 SUPABASE-TROUBLESHOOTING.md # Supabase 문제 해결 가이드
│
└── 📁 public/                      # 정적 파일
    ├── 📄 region_12.csv            # 법환포구 관광지 데이터
    ├── 📄 region_14.csv            # 토끼섬과하도포구 관광지 데이터
    ├── 📄 region_35.csv            # 해녀박물관 관광지 데이터
    ├── 📄 region_49.csv            # 동문시장 관광지 데이터
    ├── 📄 region_50.csv            # 제주도립미술관 관광지 데이터
    └── 📄 제주특별자치도_무장애여행정보_*.csv  # 원본 CSV 파일들
```

---

## 📋 주요 파일 설명

### 루트 파일

| 파일 | 설명 |
|------|------|
| `README.md` | 프로젝트 기본 정보, 설치 및 실행 방법 |
| `package.json` | 프로젝트 의존성, 스크립트 정의 |
| `vite.config.js` | Vite 빌드 도구 설정 |
| `tailwind.config.cjs` | Tailwind CSS 커스텀 설정 |
| `index.html` | HTML 진입점, React 앱 마운트 |

### 소스 코드 (`src/`)

#### `main.jsx`
- React 앱의 진입점
- ReactDOM으로 `App` 컴포넌트를 렌더링
- DB 초기화 호출

#### `App.jsx` ⚠️ **중요**
- **단일 파일 구조**: 모든 컴포넌트와 로직이 하나의 파일에 있음
- 메인 앱 컴포넌트
- 상태 관리, 라우팅, UI 렌더링 모두 포함
- **디자인 팀과 DB 팀이 함께 작업하는 파일**
- 섹션별로 주석으로 구분되어 있음:
  - 섹션 1: 상수 및 유틸리티 함수
  - 섹션 2: 상태 관리
  - 섹션 3: 이벤트 핸들러
  - 섹션 4: 데이터 로딩
  - 섹션 5: 컴포넌트 렌더링 함수
  - 섹션 6: 메인 JSX 렌더링

#### `services/db.js`
- DB 접근 추상화 레이어
- 현재는 `db-sqlite.js`를 export
- **Supabase 마이그레이션 시 `db-supabase.js`로 교체 예정**

#### `services/db-sqlite.js`
- SQLite (sql.js) 구현체
- 임시 DB로 사용 중
- Supabase 마이그레이션 후 제거 예정

#### `services/db-init.js`
- DB 초기화 및 더미 데이터 생성
- 테이블 생성, 샘플 데이터 삽입

---

## 📚 문서 디렉토리 (`docs/`)

### `database-design.md` 📖 **필수 참고 문서**
- 전체 DB 스키마 설계
- 테이블 구조 (members, reviews, posts, places, wishlists)
- ER 다이어그램
- SQL 쿼리 예시 (CRUD)
- 프론트엔드 연동 가이드

**언제 참고하나요?**
- DB 구조 이해 필요 시
- SQL 쿼리 작성 시
- API 설계 시

### `SUPABASE-MIGRATION.md` 📖 **마이그레이션 가이드**
- SQLite → Supabase 마이그레이션 가이드
- Supabase 프로젝트 설정 방법
- 테이블 생성 SQL
- RLS (Row Level Security) 설정
- Supabase 클라이언트 구현 예시
- 마이그레이션 체크리스트

**언제 참고하나요?**
- Supabase로 전환할 때
- Supabase 설정이 필요할 때
- RLS 정책 설정 시

### `SUPABASE-TROUBLESHOOTING.md`
- Supabase 관련 문제 해결 가이드
- 자주 발생하는 에러 및 해결 방법

---

## 🗂️ 데이터 파일 (`public/`)

### CSV 파일
- `region_*.csv`: 각 지역별 관광지 정보
- 형식: `위도,경도,장소명칭,장소상세정보,무장애관광정보,추천코스여부,데이터품질점검결과,데이터기준일자`

**사용 방법:**
- 현재는 CSV 파일을 직접 읽어서 사용
- Supabase 마이그레이션 시 `places` 테이블에 저장 예정

---

## 🔧 개발 환경 설정

### 필수 도구
- **Node.js** (v18 이상 권장)
- **npm** 또는 **yarn**
- **VS Code** (권장)
- **Git**

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 http://localhost:5173 열기
```

### 주요 스크립트 (`package.json`)

```json
{
  "dev": "vite",           # 개발 서버 실행
  "build": "vite build",    # 프로덕션 빌드
  "preview": "vite preview" # 빌드 결과 미리보기
}
```

---

## 👥 팀 역할 분담

### 디자인 팀
- **작업 파일**: `src/App.jsx` (섹션 1, 6)
- **작업 영역**:
  - UI/UX 디자인
  - 스타일링 (Tailwind CSS)
  - 레이아웃 수정
  - 컴포넌트 구조 조정

### DB 팀
- **작업 파일**: 
  - `src/services/db*.js` (DB 로직)
  - `docs/database-design.md` (DB 설계)
- **작업 영역**:
  - DB 스키마 설계
  - CRUD 함수 구현
  - Supabase 마이그레이션
  - 데이터 모델링

### 프론트엔드 팀
- **작업 파일**: `src/App.jsx` (전체)
- **작업 영역**:
  - 컴포넌트 로직
  - 상태 관리
  - API 연동
  - 기능 구현

---

## ⚠️ 주의사항

### Git Merge 시 주의
- `src/App.jsx`는 단일 파일 구조이므로 merge conflict 발생 가능성 높음
- 각 팀은 자신의 섹션만 수정하도록 주의
- 충돌 발생 시 팀 간 협의 필요

### 파일 수정 시
- 다른 팀이 작업 중인 파일 수정 전 반드시 확인
- 중요한 변경사항은 팀에 공유
- 문서 업데이트 필요 시 `docs/` 디렉토리 활용

### DB 관련
- 현재는 SQLite (임시) 사용 중
- Supabase 마이그레이션 예정
- DB 구조 변경 시 `docs/database-design.md` 업데이트 필수

---

## 📝 문서 작성 가이드

### 새 문서 추가 시
1. `docs/` 디렉토리에 `.md` 파일 생성
2. 이 문서 (`PROJECT-STRUCTURE.md`)에 추가
3. README.md에 링크 추가 (선택)

### 문서 네이밍 규칙
- 대문자로 시작: `DATABASE-DESIGN.md`
- 하이픈 사용: `SUPABASE-MIGRATION.md`
- 소문자: `README.md` (예외)

---

## 🔍 빠른 참조

### "DB 구조가 어떻게 되어 있나요?"
→ `docs/database-design.md` 참고

### "Supabase로 어떻게 마이그레이션하나요?"
→ `docs/SUPABASE-MIGRATION.md` 참고

### "어떤 파일을 수정해야 하나요?"
→ 이 문서의 "팀 역할 분담" 섹션 참고

### "CSV 데이터는 어디에 있나요?"
→ `public/` 디렉토리 참고

### "DB 관련 함수는 어디에 있나요?"
→ `src/services/db*.js` 파일들 참고

---

## 📞 문의

프로젝트 구조 관련 문의는 팀 리더에게 연락하세요.

---

**마지막 업데이트**: 2024년
