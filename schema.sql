-- Supabase Postgres 스키마: 프롬프트 라이브러리 테이블 + 공개 읽기 전용 RLS
-- 적용: Supabase 대시보드 → SQL Editor → 이 파일 전체 실행

create table if not exists prompts (
  id text primary key,
  title text not null,
  category text not null,
  tags text[] not null default '{}',
  model text not null,
  version text not null default '1.0',
  body text not null,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists prompts_category_idx on prompts (category);
create index if not exists prompts_tags_idx on prompts using gin (tags);

alter table prompts enable row level security;

-- 누구나 읽을 수 있음 (anon key로 프런트엔드에서 직접 조회)
drop policy if exists "public read" on prompts;
create policy "public read" on prompts
  for select
  using (true);

-- insert/update/delete 정책은 의도적으로 만들지 않음.
-- 쓰기는 scripts/sync.mjs가 service_role 키로만 수행 (RLS를 우회하므로 정책 불필요).
