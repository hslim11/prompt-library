// data/prompts/*.json 을 Supabase prompts 테이블에 업서트하는 동기화 스크립트
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAll } from './validate.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isDryRun = process.argv.includes('--dry-run');

async function loadPrompts() {
  const promptsDir = path.join(rootDir, 'data', 'prompts');
  const files = (await readdir(promptsDir)).filter((f) => f.endsWith('.json'));
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(promptsDir, file), 'utf-8');
      return { file, data: JSON.parse(raw) };
    })
  );
}

async function main() {
  const categories = JSON.parse(
    await readFile(path.join(rootDir, 'data', 'categories.json'), 'utf-8')
  );
  const categoryIds = categories.map((c) => c.id);

  const prompts = await loadPrompts();
  const results = validateAll(prompts, categoryIds);
  const invalid = results.filter((r) => !r.valid);

  if (invalid.length > 0) {
    console.error('검증 실패 — 동기화를 중단합니다:');
    for (const r of invalid) {
      console.error(`✗ ${r.file}`);
      r.errors.forEach((e) => console.error(`  - ${e}`));
    }
    process.exit(1);
  }

  const rows = prompts.map(({ data }) => data);

  if (isDryRun) {
    console.log(`[dry-run] ${rows.length}개 프롬프트를 upsert할 예정입니다 (네트워크 호출 없음):`);
    rows.forEach((r) => console.log(`  - ${r.id} (${r.category}, v${r.version})`));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수가 필요합니다. (.env.example 참고)');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase.from('prompts').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('동기화 실패:', error.message);
    process.exit(1);
  }
  console.log(`동기화 완료: ${rows.length}개 프롬프트를 Supabase에 반영했습니다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
