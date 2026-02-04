# 빠른 시작 가이드

VS Code와 Copilot을 사용하는 팀원들을 위한 빠른 시작 가이드입니다.

---

## 🚀 5분 안에 시작하기

### 1단계: 저장소 클론 및 설치

```bash
# 저장소 클론
git clone <repository-url>
cd taCoding

# 의존성 설치
npm install
```

### 2단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 열기

---

## 📁 작업할 파일 찾기

### 디자인 팀
- **파일**: `src/App.jsx`
- **섹션**: 섹션 1 (상수/유틸리티), 섹션 6 (JSX 렌더링)
- **찾는 방법**: 파일 열고 `// 섹션 1` 또는 `// 섹션 6` 검색

### DB 팀
- **파일**: `src/services/db*.js`
- **문서**: `docs/database-design.md`
- **찾는 방법**: `src/services/` 폴더 열기

### 프론트엔드 팀
- **파일**: `src/App.jsx` (전체)
- **찾는 방법**: 파일 열고 각 섹션 확인

---

## 🔍 Copilot 활용 팁

### VS Code에서 Copilot 사용하기

1. **파일 열기**: `Cmd+P` (Mac) 또는 `Ctrl+P` (Windows)
2. **파일 검색**: 파일명 입력
3. **코드 작성**: 주석으로 의도 설명하면 Copilot이 코드 제안

### 예시: DB 함수 작성

```javascript
// Copilot에게 이렇게 물어보세요:
// "회원 ID로 리뷰 목록을 조회하는 함수를 작성해줘"
```

### 예시: 컴포넌트 작성

```javascript
// Copilot에게 이렇게 물어보세요:
// "리뷰 카드 컴포넌트를 만들어줘. 닉네임, 평점, 댓글 표시"
```

---

## 📚 자주 참고하는 문서

### DB 구조 확인
```
docs/database-design.md
```
- 테이블 구조
- SQL 쿼리 예시
- API 사용법

### Supabase 마이그레이션
```
docs/SUPABASE-MIGRATION.md
```
- Supabase 설정 방법
- 테이블 생성 SQL
- RLS 정책 설정

### 프로젝트 구조
```
PROJECT-STRUCTURE.md
```
- 전체 파일 구조
- 각 파일의 역할
- 팀 역할 분담

---

## ⚡ 자주 사용하는 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

---

## 🐛 문제 해결

### 포트가 이미 사용 중일 때
```bash
# 다른 포트로 실행
npm run dev -- --port 3000
```

### node_modules 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
npm install
```

### 캐시 문제
```bash
# Vite 캐시 삭제
rm -rf node_modules/.vite
npm run dev
```

---

## 💡 VS Code 추천 확장 프로그램

- **ES7+ React/Redux/React-Native snippets** - React 코드 스니펫
- **Tailwind CSS IntelliSense** - Tailwind 자동완성
- **Prettier** - 코드 포맷팅
- **GitLens** - Git 히스토리 확인

---

## 📞 도움이 필요할 때

1. **문서 확인**: `docs/` 폴더의 문서들 확인
2. **프로젝트 구조**: `PROJECT-STRUCTURE.md` 참고
3. **팀 리더에게 문의**: 문서로 해결되지 않을 때

---

**마지막 업데이트**: 2024년
