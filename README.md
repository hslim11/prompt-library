# 프롬프트 라이브러리

검증된 프롬프트를 파일로 관리하고, Supabase를 거쳐 GitHub Pages에서 검색·필터링할 수 있는
개인용 프롬프트 라이브러리입니다.

## 구조

```
data/prompts/*.json     ← 진실의 원천. 프롬프트 추가/수정은 여기서만.
data/categories.json    ← 카테고리 정의 (docs/app.js의 CATEGORIES와 내용 동일하게 유지)
scripts/validate.mjs    ← data/prompts/*.json 스키마 검증
scripts/sync.mjs        ← 검증 후 Supabase에 upsert
docs/                   ← GitHub Pages로 배포되는 정적 프런트엔드
tests/                  ← node --test 로 실행하는 단위 테스트
```

동작 흐름: `data/prompts/*.json` 편집 → `npm run sync` → Supabase 반영 →
`docs/`가 브라우저에서 Supabase를 anon key로 직접 조회해 검색/필터링.
GitHub Pages는 정적 파일만 서빙하므로 별도 서버 없이 이 구조로 동작합니다.

## 처음 설정하기

### 1. Supabase 프로젝트 생성
1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. 대시보드 → SQL Editor에서 [`schema.sql`](./schema.sql) 전체 실행
   (prompts 테이블 생성 + 읽기 전용 RLS 정책 적용)
3. 대시보드 → Project Settings → API에서 다음 값을 확인
   - `Project URL`
   - `anon public` 키 (공개용 — 읽기만 가능)
   - `service_role` 키 (관리용 — 쓰기 가능, **절대 공개 금지**)

### 2. 동기화용 환경변수 설정 (로컬 전용, 커밋 금지)
```bash
cp .env.example .env
# .env에 SUPABASE_URL, SUPABASE_SERVICE_KEY(service_role) 입력
npm install
```

### 3. 프런트엔드 접속 정보 설정 (커밋 대상)
```bash
cp docs/config.example.js docs/config.js
# docs/config.js에 SUPABASE_URL, SUPABASE_ANON_KEY(anon public) 입력
```
`anon` 키는 RLS로 SELECT만 허용되어 있어 공개 저장소에 커밋해도 안전합니다.
`service_role` 키는 절대 `docs/`나 git에 넣지 마세요.

### 4. GitHub Pages 배포
1. 이 프로젝트를 GitHub 저장소에 push
2. 저장소 Settings → Pages → Source를 `main` 브랜치 `/docs` 폴더로 설정

## 새 프롬프트 추가하는 법

1. `data/prompts/`에 새 JSON 파일 생성 (파일명 = `id`, kebab-case 권장)
   ```json
   {
     "id": "example-id",
     "title": "제목",
     "category": "writing",
     "tags": ["태그1", "태그2"],
     "model": "Claude Opus 5",
     "version": "1.0",
     "body": "프롬프트 본문. {{변수}}는 이렇게 표시.",
     "notes": "선택 사항: 사용 팁",
     "updated_at": "2026-08-02T00:00:00Z"
   }
   ```
   `category`는 반드시 `data/categories.json`에 정의된 id 중 하나여야 합니다.
2. 검증: `npm run validate`
3. 동기화: `npm run sync` (실제 반영 전 `npm run sync:dry-run`으로 먼저 확인 가능)
4. 프롬프트를 수정할 때는 `version`을 올리고(예: 1.0 → 1.1), git 히스토리가 이전 버전 기록을 대신합니다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run validate` | `data/prompts/*.json` 스키마 검증 |
| `npm run sync:dry-run` | 실제 반영 없이 upsert 대상만 출력 |
| `npm run sync` | Supabase에 실제 반영 |
| `npm test` | 검증/필터 로직 단위 테스트 실행 |

## 로컬에서 프런트엔드 미리보기

```bash
python3 -m http.server 8080 -d docs/
open http://localhost:8080
```
`docs/config.js`가 설정되어 있어야 실제 데이터가 로드됩니다. 설정 전에는
화면에 "Supabase 연결에 실패했습니다" 안내가 표시됩니다.
