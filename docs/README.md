# 문서 인덱스

Jeju Reviews 프로젝트의 모든 문서를 한눈에 볼 수 있는 인덱스입니다.

---

## 🚀 시작하기

### [빠른 시작 가이드](./QUICK-START.md) ⭐ **새 팀원 필수**
- VS Code와 Copilot 사용자를 위한 시작 가이드
- 5분 안에 프로젝트 시작하기
- 자주 사용하는 명령어
- 문제 해결 방법

---

## 📐 설계 문서

### [DB 설계 문서](./database-design.md) 📖 **필수 참고**
- 전체 데이터베이스 스키마
- 테이블 구조 (members, reviews, posts, places, wishlists)
- ER 다이어그램
- SQL 쿼리 예시 (CRUD)
- 프론트엔드 연동 가이드

**언제 참고하나요?**
- DB 구조 이해 필요 시
- SQL 쿼리 작성 시
- API 설계 시

---

## 🔄 마이그레이션 가이드

### [Supabase 마이그레이션 가이드](./SUPABASE-MIGRATION.md)
- SQLite → Supabase 마이그레이션 전체 과정
- Supabase 프로젝트 설정
- 테이블 생성 SQL
- RLS (Row Level Security) 설정
- Supabase 클라이언트 구현 예시
- 마이그레이션 체크리스트

**언제 참고하나요?**
- Supabase로 전환할 때
- Supabase 설정이 필요할 때
- RLS 정책 설정 시

### [Supabase 문제 해결](./SUPABASE-TROUBLESHOOTING.md)
- 자주 발생하는 Supabase 오류
- "Failed to fetch" 오류 해결
- 프로젝트 일시 중지 문제
- 네트워크 문제 해결

**언제 참고하나요?**
- Supabase 관련 오류 발생 시
- SQL Editor가 작동하지 않을 때

---

## 📋 프로젝트 관리

### [프로젝트 구조 가이드](../PROJECT-STRUCTURE.md)
- 전체 파일 구조 트리
- 각 파일의 역할 설명
- 팀 역할 분담
- Git merge 주의사항

**언제 참고하나요?**
- 프로젝트 구조 이해 필요 시
- 어떤 파일을 수정해야 할지 모를 때
- 팀 역할 확인 필요 시

---

## 📚 문서 읽기 순서

### 새 팀원
1. [빠른 시작 가이드](./QUICK-START.md) - 프로젝트 시작하기
2. [프로젝트 구조 가이드](../PROJECT-STRUCTURE.md) - 전체 구조 이해
3. [DB 설계 문서](./database-design.md) - 데이터베이스 이해

### DB 팀
1. [DB 설계 문서](./database-design.md) - 현재 DB 구조
2. [Supabase 마이그레이션 가이드](./SUPABASE-MIGRATION.md) - 마이그레이션 준비

### 디자인 팀
1. [빠른 시작 가이드](./QUICK-START.md) - 개발 환경 설정
2. [프로젝트 구조 가이드](../PROJECT-STRUCTURE.md) - 작업할 파일 확인

### 프론트엔드 팀
1. [빠른 시작 가이드](./QUICK-START.md) - 개발 환경 설정
2. [DB 설계 문서](./database-design.md) - API 사용법 확인
3. [프로젝트 구조 가이드](../PROJECT-STRUCTURE.md) - 코드 구조 이해

---

## 🔍 빠른 검색

### "DB 구조가 어떻게 되어 있나요?"
→ [DB 설계 문서](./database-design.md)

### "Supabase로 어떻게 마이그레이션하나요?"
→ [Supabase 마이그레이션 가이드](./SUPABASE-MIGRATION.md)

### "어떤 파일을 수정해야 하나요?"
→ [프로젝트 구조 가이드](../PROJECT-STRUCTURE.md)

### "프로젝트를 처음 시작하는데 어떻게 하나요?"
→ [빠른 시작 가이드](./QUICK-START.md)

### "Supabase 오류가 발생했어요"
→ [Supabase 문제 해결](./SUPABASE-TROUBLESHOOTING.md)

---

## 📝 문서 업데이트 가이드

### 새 문서 추가 시
1. `docs/` 디렉토리에 `.md` 파일 생성
2. 이 인덱스 파일에 추가
3. 관련 문서에 링크 추가

### 문서 네이밍 규칙
- 대문자로 시작: `DATABASE-DESIGN.md`
- 하이픈 사용: `SUPABASE-MIGRATION.md`
- 소문자: `README.md` (예외)

---

**마지막 업데이트**: 2024년
