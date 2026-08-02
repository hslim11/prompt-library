// data/prompts/*.json 파일을 읽고 쓰는 저장소 계층 (진실의 원천은 항상 파일)
import { readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
// 테스트에서 실제 데이터를 건드리지 않도록 디렉터리를 바꿀 수 있게 함
const promptsDir = process.env.PROMPTS_DIR_OVERRIDE || path.join(rootDir, 'data', 'prompts');
const categoriesPath = path.join(rootDir, 'data', 'categories.json');

function filePathFor(id) {
  return path.join(promptsDir, `${id}.json`);
}

export async function listPrompts() {
  const files = (await readdir(promptsDir)).filter((f) => f.endsWith('.json'));
  return Promise.all(
    files.map(async (file) => JSON.parse(await readFile(path.join(promptsDir, file), 'utf-8')))
  );
}

export async function getPrompt(id) {
  try {
    return JSON.parse(await readFile(filePathFor(id), 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writePrompt(prompt) {
  await writeFile(filePathFor(prompt.id), JSON.stringify(prompt, null, 2) + '\n', 'utf-8');
}

export async function deletePrompt(id) {
  try {
    await unlink(filePathFor(id));
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

export async function loadCategoryIds() {
  const categories = JSON.parse(await readFile(categoriesPath, 'utf-8'));
  return categories.map((c) => c.id);
}
