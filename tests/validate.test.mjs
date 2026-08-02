// scripts/validate.mjs 의 검증 로직에 대한 단위 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePrompt, validateAll } from '../scripts/validate.mjs';

const CATEGORY_IDS = ['writing', 'automation', 'etc'];

function basePrompt(overrides = {}) {
  return {
    id: 'sample-prompt',
    title: '샘플 프롬프트',
    category: 'writing',
    tags: ['샘플'],
    model: 'Claude Opus 5',
    version: '1.0',
    body: '이것은 샘플 본문입니다.',
    updated_at: '2026-06-19T00:00:00Z',
    ...overrides,
  };
}

test('유효한 프롬프트는 통과한다', () => {
  const result = validatePrompt(basePrompt(), CATEGORY_IDS);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('필수 문자열 필드가 비어 있으면 실패한다', () => {
  const result = validatePrompt(basePrompt({ title: '' }), CATEGORY_IDS);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("'title'")));
});

test('tags가 빈 배열이면 실패한다', () => {
  const result = validatePrompt(basePrompt({ tags: [] }), CATEGORY_IDS);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('tags')));
});

test('categories.json에 없는 category는 실패한다', () => {
  const result = validatePrompt(basePrompt({ category: 'nonexistent' }), CATEGORY_IDS);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('category')));
});

test('updated_at이 유효하지 않은 날짜면 실패한다', () => {
  const result = validatePrompt(basePrompt({ updated_at: 'not-a-date' }), CATEGORY_IDS);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('updated_at')));
});

test('validateAll은 중복 id를 감지한다', () => {
  const prompts = [
    { file: 'a.json', data: basePrompt({ id: 'dup' }) },
    { file: 'b.json', data: basePrompt({ id: 'dup' }) },
  ];
  const results = validateAll(prompts, CATEGORY_IDS);
  assert.ok(results.every((r) => !r.valid));
  assert.ok(results.every((r) => r.errors.some((e) => e.includes('중복'))));
});

test('validateAll은 서로 다른 id를 가진 유효한 프롬프트들을 통과시킨다', () => {
  const prompts = [
    { file: 'a.json', data: basePrompt({ id: 'a' }) },
    { file: 'b.json', data: basePrompt({ id: 'b' }) },
  ];
  const results = validateAll(prompts, CATEGORY_IDS);
  assert.ok(results.every((r) => r.valid));
});
