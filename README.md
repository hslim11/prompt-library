# 프롬프트 라이브러리

검증된 프롬프트를 파일로 관리하고, Supabase를 거쳐 GitHub Pages에서 검색·필터링할 수 있는
개인용 프롬프트 라이브러리입니다.

## 구조

```
data/prompts/*.json     ← 진실의 원천. 프롬프트 추가/수정은 여기서만.
data/categories.json    ← 카테고리 정의 (docs/app.js의 CATEGORIES와 내용 동일하게 유지)
scripts/validate.mjs    ← data/prompts/*.json 스키마 검증
scripts/sync.mjs        ← 검증 후 Supabase에 upsert (일괄)
backend/                ← 로컬 전용 관리자 API 서버 + 관리자 UI (CRUD)
docs/                   ← GitHub Pages로 배포되는 정적 프런트엔드 (읽기 전용)
tests/                  ← node --test 로 실행하는 단위/통합 테스트
```

동작 흐름: `data/prompts/*.json` 편집(직접 또는 `backend/` 관리자 UI로) →
파일 저장 시 Supabase에 즉시 반영(관리자 UI) 또는 `npm run sync`로 일괄 반영 →
`docs/`가 브라우저에서 Supabase를 anon key로 직접 조회해 검색/필터링.
GitHub Pages는 정적 파일만 서빙하므로, 공개 사이트(`docs/`)에는 별도 서버가 필요 없습니다.
`backend/`는 프롬프트를 **관리(쓰기)**할 때만 로컬에서 실행하는 도구이며 배포 대상이 아닙니다.

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

### 방법 A. 관리자 API 서버 사용 (추천)
```bash
npm run backend
open http://localhost:8787/admin
```
브라우저에서 상단에 `.env`의 `ADMIN_TOKEN` 값을 입력·저장한 뒤 폼으로 추가/삭제하면
`data/prompts/*.json` 저장과 Supabase 반영이 한 번에 처리됩니다. 수정(PUT)은 API로만 가능
(`curl -X PUT http://localhost:8787/api/prompts/<id> -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"version":"1.1"}'`).

### 방법 B. 파일 직접 편집
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

두 방법 모두 결과물은 동일하게 `data/prompts/*.json`(git으로 버전관리)입니다. 방법 A는
파일 저장 + Supabase 반영을 자동으로 묶어서 처리해줄 뿐입니다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run validate` | `data/prompts/*.json` 스키마 검증 |
| `npm run sync:dry-run` | 실제 반영 없이 upsert 대상만 출력 |
| `npm run sync` | Supabase에 실제 반영 (일괄) |
| `npm run backend` | 관리자 API 서버 실행 (`localhost:8787`, `/admin`이 관리자 UI) |
| `npm test` | 검증/필터/백엔드 API 테스트 실행 |

## 로컬에서 프런트엔드 미리보기

```bash
python3 -m http.server 8080 -d docs/
open http://localhost:8080
```
`docs/config.js`가 설정되어 있어야 실제 데이터가 로드됩니다. 설정 전에는
화면에 "Supabase 연결에 실패했습니다" 안내가 표시됩니다.
