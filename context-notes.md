# 컨텍스트 노트 — 프롬프트 라이브러리 시스템

## 배경
사용자가 첨부한 블로그 글(개인 프롬프트 라이브러리 270개 운영 노하우)을 참고해,
지속적으로 관리 가능한 프롬프트 라이브러리 "사이트"를 구축해달라는 요청.
`Prompt-Library/` 디렉토리는 빈 상태에서 시작.

## 결정 사항

### 기술 스택: 파일 기반 + Supabase(DB) + GitHub Pages(정적 프런트)
사용자가 처음 "DB 연동 풀스택 앱" + "파일 직접 편집" + "GitHub Pages"를 동시에 선택 →
GitHub Pages는 정적 호스팅만 가능해 자체 백엔드 서버를 못 돌린다는 충돌을 짚어드렸고,
재확인 결과 "Supabase 사용(파일→DB 동기화 스크립트 포함)"으로 확정.

**구조:**
```
data/prompts/*.json  (진실의 원천, git으로 버전관리)
        │  scripts/sync.mjs (서비스 키, 로컬에서만 실행)
        ▼
   Supabase Postgres (RLS: 공개 SELECT만 허용)
        │  anon key (공개해도 안전 — 읽기 전용)
        ▼
   docs/index.html + app.js  (GitHub Pages, 빌드 도구 없이 CDN ESM import)
```

**이유:** 개인용 수백 개 규모 라이브러리에 풀 백엔드 서버는 과함. Supabase를 쓰더라도
정적 프런트가 클라이언트에서 anon key로 직접 조회하는 방식이면 별도 서버가 필요 없음.
파일을 진실의 원천으로 유지하는 이유는 (1) 사용자가 원한 "파일 직접 편집" 워크플로우,
(2) git이 버전 관리를 공짜로 제공(첨부 글의 "v1.0, v1.1 버전 관리" 원칙과 부합).

### 검색: 클라이언트 사이드 단순 필터 (외부 검색 라이브러리 미사용)
수백 건 규모에서는 title/tags/category/model에 대한 단순 substring 매칭으로 충분.
Fuse.js 등 추가 의존성은 이 규모에 과剩 — CLAUDE.md 단순함 우선 원칙에 따라 제외.

### 카테고리: 첨부 글의 예시(글쓰기/업무자동화/마케팅/이미지생성)를 확장해 7개로 고정
글쓰기, 업무자동화, 마케팅, 이미지생성, 코딩/개발, 리서치/분석, 기타.
`data/categories.json`으로 분리해 나중에 쉽게 조정 가능하게 함.

### 버전 관리: 자동 버전 증가 로직은 만들지 않음
`version` 필드는 사용자가 수동으로 올림(예: 1.0 → 1.1). 상세 히스토리는 git log가 담당.
자동화하면 "요청하지 않은 유연성" 추가가 되어 단순함 원칙 위반.

### 테스트
실제 Supabase 프로젝트가 없으므로(사용자가 아직 계정을 만들지 않음) end-to-end 동기화는
수동 검증 대상으로 문서화. 대신:
- `scripts/validate.mjs`: 순수 함수로 분리해 `node --test`로 단위 테스트
- `scripts/sync.mjs --dry-run`: 네트워크 호출 없이 업서트 대상 목록만 출력하도록 구현

## 남은 수동 작업 (사용자가 직접 해야 함)
1. ~~supabase.com에서 프로젝트 생성~~ 완료 (2026-08-02, Supabase CLI로 생성)
2. ~~SQL Editor에서 `schema.sql` 실행~~ 완료 (`supabase db query --linked -f schema.sql`)
3. ~~`.env`에 `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` 설정~~ 완료, `npm run sync`로 샘플 7개 반영 확인
4. ~~`docs/config.js`에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 설정~~ 완료
5. GitHub 저장소 생성 후 Pages를 `docs/` 디렉토리로 설정 — 아직 미완료

## 백엔드 관리 API (2026-08-02 추가)
"백엔드 프로그램 제작해줘" 요청에 대해, 여러 차례 명확화 질문이 스킵/거절되어
"현재 맥락"(Prompt-Library)에서 가장 자연스러운 해석인 "프롬프트 CRUD 관리 API"로 판단하고 진행함.

- 공개 사이트(`docs/`, GitHub Pages)는 여전히 서버 없는 정적 구조를 유지 — 이건 안 바꿈.
- 새로 추가한 `backend/`는 **로컬 전용** 관리 도구. `SUPABASE_SERVICE_KEY`를 쓰기 때문에
  공개 배포 대상이 아니며, GitHub Pages에도 올라가지 않음(별도 디렉터리, docs/ 밖).
- 쓰기는 `data/prompts/*.json` 파일에 먼저 반영한 뒤 Supabase에 upsert/delete —
  "파일이 진실의 원천"이라는 기존 원칙을 그대로 유지. 즉 backend는 `npm run sync`를
  자동화해주는 창구일 뿐, 별도의 데이터 소스를 만들지 않음.
- 인증은 단일 `ADMIN_TOKEN` 환경변수 비교 방식 (Bearer 토큰). 개인 1인 도구라
  세션/유저 시스템은 요청받지 않았고 과한 설계라 판단해 넣지 않음.
- 테스트는 `PROMPTS_DIR_OVERRIDE` 환경변수로 임시 디렉터리를 가리키게 하고,
  Supabase 호출은 라우터 팩토리에 함수를 주입해 실제 네트워크 호출 없이 검증.
  실제 Supabase까지 왕복하는 End-to-End 확인은 별도로 한 번 수동 실행(생성→조회→삭제)해서 검증함.

## Supabase 프로젝트 정보
- 프로젝트명: `prompt-library`, ref: `ibdgdkxftsvkrdvswzjb`, 리전: `ap-northeast-2`(서울)
- 조직: `hslim11's Org` (`yqzprkhtdveoeabiapsw`)
- CLI 로그인은 Personal Access Token 방식 사용 (브라우저 기반 `supabase login`은 non-TTY 환경에서 동작 안 함).
  사용자가 발급한 토큰은 https://supabase.com/dashboard/account/tokens 에서 재발급/폐기 가능.
- anon/service_role 키는 legacy JWT 형식 사용 (Supabase가 신형 `sb_publishable_`/`sb_secret_` 키로 전환 중이나,
  `sb_secret_` 값은 CLI 출력에서 마스킹되어 가져올 수 없어 legacy 키를 그대로 사용함). 기능상 차이 없음.
- 보안 검증: anon key로 SELECT는 되고 INSERT는 401로 차단되는 것 확인 (RLS 정상 동작).
