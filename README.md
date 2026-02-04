# Jeju Reviews — Vite + React + Tailwind

제주도 특화 리뷰 & 지도 뷰 앱입니다.

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 표시되는 로컬 URL (예: http://localhost:5173)를 열면 앱을 확인할 수 있습니다.

---

## 📚 문서

**📖 [전체 문서 인덱스](./docs/README.md)** - 모든 문서를 한눈에 보기

### 주요 문서
- **[빠른 시작 가이드](./docs/QUICK-START.md)** ⭐ - VS Code/Copilot 사용자를 위한 시작 가이드
- **[프로젝트 구조 가이드](./PROJECT-STRUCTURE.md)** - 전체 파일 구조 및 역할 설명
- **[DB 설계 문서](./docs/database-design.md)** - 데이터베이스 스키마 및 쿼리
- **[Supabase 마이그레이션 가이드](./docs/SUPABASE-MIGRATION.md)** - Supabase 전환 가이드
- **[Supabase 문제 해결](./docs/SUPABASE-TROUBLESHOOTING.md)** - 자주 발생하는 문제 해결

---

## 🛠️ 기술 스택

- **프론트엔드**: React 18, Vite
- **스타일링**: Tailwind CSS
- **데이터베이스**: SQLite (sql.js) → Supabase (마이그레이션 예정)
- **지도**: Kakao Maps API

---

## 📁 주요 디렉토리

- `src/` - 소스 코드
  - `App.jsx` - 메인 앱 컴포넌트 (단일 파일 구조)
  - `services/` - DB 서비스 레이어
- `docs/` - 프로젝트 문서
- `public/` - 정적 파일 (CSV 데이터)

---

## 👥 팀 역할

- **디자인 팀**: UI/UX, 스타일링 (`src/App.jsx` 섹션 1, 6)
- **DB 팀**: 데이터베이스 설계 및 구현 (`src/services/`, `docs/`)
- **프론트엔드 팀**: 컴포넌트 로직 및 기능 구현 (`src/App.jsx` 전체)

자세한 내용은 [프로젝트 구조 가이드](./PROJECT-STRUCTURE.md)를 참고하세요.

---

## ⚠️ 주의사항

- 현재 SQLite (임시 DB) 사용 중, Supabase 마이그레이션 예정
- `src/App.jsx`는 단일 파일 구조이므로 Git merge 시 주의 필요
- CSV 데이터는 `public/` 디렉토리에 위치

---

## 📝 참고

- Tailwind CSS가 포함되어 있으며 기본 구성만 제공합니다.
- 이미지 외부 URL을 사용하므로 네트워크가 필요합니다.
