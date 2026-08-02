// docs/filter.js 의 검색/필터 로직에 대한 단위 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPrompts } from '../docs/filter.js';

const PROMPTS = [
  { id: 'a', title: '블로그 제목 추출', category: 'writing', tags: ['블로그', 'SEO'], model: 'Claude Opus 5' },
  { id: 'b', title: '회의록 정리', category: 'automation', tags: ['회의록'], model: 'Claude Opus 5' },
  { id: 'c', title: '인스타 캡션', category: 'marketing', tags: ['SNS'], model: 'GPT-4o' },
];

test('필터 조건이 없으면 전체를 반환한다', () => {
  assert.equal(filterPrompts(PROMPTS).length, 3);
});

test('카테고리로 걸러낸다', () => {
  const result = filterPrompts(PROMPTS, { category: 'writing' });
  assert.deepEqual(result.map((p) => p.id), ['a']);
});

test('태그로 걸러낸다', () => {
  const result = filterPrompts(PROMPTS, { tag: 'SNS' });
  assert.deepEqual(result.map((p) => p.id), ['c']);
});

test('검색어는 대소문자 구분 없이 제목/모델/태그를 매칭한다', () => {
  const result = filterPrompts(PROMPTS, { query: 'gpt-4o' });
  assert.deepEqual(result.map((p) => p.id), ['c']);
});

test('카테고리와 검색어를 함께 적용한다', () => {
  const result = filterPrompts(PROMPTS, { category: 'writing', query: 'seo' });
  assert.deepEqual(result.map((p) => p.id), ['a']);
});
