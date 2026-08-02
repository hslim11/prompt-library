// data/prompts/*.json 파일이 스키마를 지키는지 검사하는 검증 모듈 + CLI
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_STRING_FIELDS = ['id', 'title', 'category', 'model', 'version', 'body', 'updated_at'];

// 프롬프트 객체 하나를 검사한다. 순수 함수 — 파일 시스템에 접근하지 않는다.
export function validatePrompt(prompt, categoryIds) {
  const errors = [];

  if (prompt === null || typeof prompt !== 'object') {
    return { valid: false, errors: ['프롬프트가 객체가 아닙니다.'] };
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof prompt[field] !== 'string' || prompt[field].trim() === '') {
      errors.push(`'${field}' 필드는 비어 있지 않은 문자열이어야 합니다.`);
    }
  }

  if (!Array.isArray(prompt.tags) || prompt.tags.length === 0) {
    errors.push(`'tags' 필드는 비어 있지 않은 배열이어야 합니다.`);
  } else if (!prompt.tags.every((t) => typeof t === 'string' && t.trim() !== '')) {
    errors.push(`'tags' 배열의 모든 항목은 비어 있지 않은 문자열이어야 합니다.`);
  }

  if (categoryIds && typeof prompt.category === 'string' && !categoryIds.includes(prompt.category)) {
    errors.push(`'category' 값 '${prompt.category}'가 categories.json에 정의되어 있지 않습니다.`);
  }

  if (typeof prompt.updated_at === 'string' && Number.isNaN(Date.parse(prompt.updated_at))) {
    errors.push(`'updated_at' 값이 유효한 날짜 형식이 아닙니다: ${prompt.updated_at}`);
  }

  if ('notes' in prompt && prompt.notes !== undefined && typeof prompt.notes !== 'string') {
    errors.push(`'notes' 필드는 문자열이어야 합니다.`);
  }

  return { valid: errors.length === 0, errors };
}

// 여러 프롬프트를 검사하고, id 중복도 함께 확인한다.
export function validateAll(prompts, categoryIds) {
  const results = prompts.map(({ file, data }) => ({
    file,
    id: data?.id,
    ...validatePrompt(data, categoryIds),
  }));

  const idCounts = new Map();
  for (const { data } of prompts) {
    if (typeof data?.id === 'string') {
      idCounts.set(data.id, (idCounts.get(data.id) || 0) + 1);
    }
  }
  for (const result of results) {
    const count = idCounts.get(result.id) || 0;
    if (count > 1) {
      result.valid = false;
      result.errors.push(`id '${result.id}'가 ${count}개 파일에서 중복됩니다.`);
    }
  }

  return results;
}

async function loadPromptFiles(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), 'utf-8');
      try {
        return { file, data: JSON.parse(raw) };
      } catch {
        return { file, data: null, parseError: true };
      }
    })
  );
}

async function main() {
  const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const promptsDir = path.join(rootDir, 'data', 'prompts');
  const categories = JSON.parse(await readFile(path.join(rootDir, 'data', 'categories.json'), 'utf-8'));
  const categoryIds = categories.map((c) => c.id);

  const prompts = await loadPromptFiles(promptsDir);
  const results = validateAll(prompts, categoryIds);

  let hasError = false;
  for (const r of results) {
    if (!r.valid) {
      hasError = true;
      console.error(`✗ ${r.file}`);
      for (const err of r.errors) console.error(`  - ${err}`);
    } else {
      console.log(`✓ ${r.file}`);
    }
  }

  if (hasError) {
    console.error(`\n검증 실패: ${results.filter((r) => !r.valid).length}개 파일에 오류가 있습니다.`);
    process.exit(1);
  }
  console.log(`\n검증 통과: ${results.length}개 파일 모두 정상입니다.`);
}

// CLI로 직접 실행됐을 때만 main()을 실행 (테스트에서 import할 때는 실행 안 됨)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
