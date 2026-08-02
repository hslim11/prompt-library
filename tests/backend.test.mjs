// backend/routes/prompts.mjs CRUD API에 대한 통합 테스트.
// 실제 Supabase 호출은 주입한 가짜 함수로 대체하고, 파일은 임시 디렉터리에서만 다룬다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';

test('prompts CRUD API', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'prompt-lib-test-'));
  process.env.PROMPTS_DIR_OVERRIDE = dir;
  process.env.ADMIN_TOKEN = 'test-token';

  const { createPromptsRouter } = await import('../backend/routes/prompts.mjs');
  const upserted = [];
  const deleted = [];

  const app = express();
  app.use(express.json());
  app.use(
    '/api/prompts',
    createPromptsRouter({
      upsertPrompt: async (p) => upserted.push(p),
      deletePromptRemote: async (id) => deleted.push(id),
    })
  );

  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;

  t.after(async () => {
    server.close();
    await rm(dir, { recursive: true, force: true });
    delete process.env.PROMPTS_DIR_OVERRIDE;
    delete process.env.ADMIN_TOKEN;
  });

  const samplePrompt = {
    id: 't1',
    title: '테스트 프롬프트',
    category: 'writing',
    tags: ['테스트'],
    model: 'Claude Opus 5',
    version: '1.0',
    body: '테스트 본문',
  };

  await t.test('목록은 처음에 비어 있다', async () => {
    const res = await fetch(`${base}/api/prompts`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  await t.test('토큰 없이 생성하면 401', async () => {
    const res = await fetch(`${base}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(samplePrompt),
    });
    assert.equal(res.status, 401);
  });

  await t.test('토큰과 함께 생성하면 201, 파일 저장 + Supabase upsert 호출됨', async () => {
    const res = await fetch(`${base}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify(samplePrompt),
    });
    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(created.id, 't1');
    assert.ok(created.updated_at);
    assert.equal(upserted.length, 1);
    assert.equal(upserted[0].id, 't1');
  });

  await t.test('같은 id로 다시 생성하면 409', async () => {
    const res = await fetch(`${base}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify(samplePrompt),
    });
    assert.equal(res.status, 409);
  });

  await t.test('스키마 위반 생성은 400', async () => {
    const res = await fetch(`${base}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ ...samplePrompt, id: 't2', tags: [] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.some((e) => e.includes('tags')));
  });

  await t.test('생성된 항목은 조회/목록에 나온다', async () => {
    const getRes = await fetch(`${base}/api/prompts/t1`);
    assert.equal(getRes.status, 200);

    const listRes = await fetch(`${base}/api/prompts`);
    const list = await listRes.json();
    assert.equal(list.length, 1);
  });

  await t.test('존재하지 않는 id 조회는 404', async () => {
    const res = await fetch(`${base}/api/prompts/nope`);
    assert.equal(res.status, 404);
  });

  await t.test('수정하면 내용과 updated_at이 바뀌고 Supabase에 다시 upsert된다', async () => {
    const before = upserted.length;
    const res = await fetch(`${base}/api/prompts/t1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ version: '1.1' }),
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.version, '1.1');
    assert.equal(upserted.length, before + 1);
  });

  await t.test('존재하지 않는 id 수정은 404', async () => {
    const res = await fetch(`${base}/api/prompts/nope`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ version: '1.1' }),
    });
    assert.equal(res.status, 404);
  });

  await t.test('토큰 없이 삭제하면 401', async () => {
    const res = await fetch(`${base}/api/prompts/t1`, { method: 'DELETE' });
    assert.equal(res.status, 401);
  });

  await t.test('토큰과 함께 삭제하면 204, Supabase delete 호출됨, 이후 조회는 404', async () => {
    const res = await fetch(`${base}/api/prompts/t1`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    });
    assert.equal(res.status, 204);
    assert.deepEqual(deleted, ['t1']);

    const getRes = await fetch(`${base}/api/prompts/t1`);
    assert.equal(getRes.status, 404);
  });
});
