# 체크리스트 — 프롬프트 라이브러리 시스템 구축

## 1. 스키마 & 데이터
- [x] `schema.sql` — Supabase `prompts` 테이블 + RLS(공개 읽기 전용) 정책
- [x] `data/categories.json` — 7개 카테고리 정의
- [x] `data/prompts/*.json` — 샘플 프롬프트 7개 (카테고리별 1개)

## 2. 검증 & 동기화 스크립트
- [x] `scripts/validate.mjs` — 필수 필드/타입 검사
- [x] `scripts/sync.mjs` — `data/prompts/*.json` → Supabase upsert (서비스 키, dry-run 지원)
- [x] `tests/validate.test.mjs` — validate 로직 단위 테스트

## 3. 프런트엔드 (GitHub Pages, docs/)
- [x] `docs/index.html` — 레이아웃 (카테고리 탭, 검색창, 태그 필터, 카드 리스트)
- [x] `docs/app.js` — Supabase anon key로 조회 + 클라이언트 검색/필터 + 복사 버튼
- [x] `docs/style.css` — 최소한의 스타일
- [x] `docs/config.example.js` → 사용자가 `docs/config.js`로 복사해 실제 anon key 입력
- [x] `docs/filter.js` + `tests/filter.test.mjs` — 검색/필터 로직을 순수 함수로 분리해 테스트 가능하게 함

## 4. 문서화
- [x] `README.md` — Supabase 프로젝트 생성, 스키마 적용, 환경변수 설정, 동기화, GitHub Pages 배포, 신규 프롬프트 추가 워크플로우
- [x] `.env.example`, `.gitignore`

## 5. 검증
- [x] `npm test` (node --test) 통과 — 12/12
- [x] `node scripts/validate.mjs` 샘플 데이터 통과 — 7/7
- [x] `node scripts/sync.mjs --dry-run` 정상 동작 (네트워크 없이)
- [x] 로컬 서버로 `docs/` 정적 자산 200 확인 + config.js 부재 시 에러 처리 버그 발견·수정
- [x] Supabase 프로젝트 실제 생성 (CLI, ref `ibdgdkxftsvkrdvswzjb`, 서울 리전) + `schema.sql` 적용
- [x] `npm run sync`로 샘플 7개를 실제 Supabase에 반영, REST API로 조회/쓰기차단 확인
      (anon key SELECT 성공, INSERT 401 차단 — RLS 정상)

## 6. 배포
- [x] GitHub 저장소 생성: https://github.com/hslim11/prompt-library (별도 신규 저장소, 모노레포와 분리)
- [x] GitHub Pages 활성화 (`main` 브랜치 `/docs`) → https://hslim11.github.io/prompt-library/
- [x] 배포된 사이트의 정적 자산(HTML/JS/CSS/config.js) 200 확인

## 7. 남은 작업
- [ ] (권장) Supabase 대시보드에서 발급받은 Personal Access Token 폐기 — 대화 기록에 남아있어 revoke 권장
- [ ] 상위 모노레포(`my-project`)에도 동일 파일이 커밋되어 있음(커밋 `5c28df9`) — 이제 별도 저장소로 운영되므로,
      모노레포 쪽 사본을 계속 둘지/제거할지는 사용자 결정 필요 (자동으로 지우지 않음)
