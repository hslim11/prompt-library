// /api/prompts CRUD 라우터. 쓰기(POST/PUT/DELETE)는 ADMIN_TOKEN 인증 필요.
import { Router } from 'express';
import { validatePrompt } from '../../scripts/validate.mjs';
import * as store from '../lib/store.mjs';
import * as defaultSync from '../lib/supabaseSync.mjs';

function requireAuth(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_TOKEN 환경변수가 설정되어 있지 않습니다.' });
  }
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token !== expected) {
    return res.status(401).json({ error: '인증 토큰이 없거나 올바르지 않습니다.' });
  }
  next();
}

// sync 구현을 주입 가능하게 해서 테스트에서 실제 Supabase 호출 없이 검증할 수 있게 함
export function createPromptsRouter({ upsertPrompt, deletePromptRemote } = defaultSync) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      res.json(await store.listPrompts());
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const prompt = await store.getPrompt(req.params.id);
      if (!prompt) return res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
      res.json(prompt);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const body = req.body;
      if (typeof body?.id !== 'string' || body.id.trim() === '') {
        return res.status(400).json({ errors: ["'id' 필드는 비어 있지 않은 문자열이어야 합니다."] });
      }
      if (await store.getPrompt(body.id)) {
        return res.status(409).json({ error: `id '${body.id}'가 이미 존재합니다.` });
      }

      const categoryIds = await store.loadCategoryIds();
      const prompt = { ...body, updated_at: body.updated_at || new Date().toISOString() };
      const { valid, errors } = validatePrompt(prompt, categoryIds);
      if (!valid) return res.status(400).json({ errors });

      await store.writePrompt(prompt);
      await upsertPrompt(prompt);
      res.status(201).json(prompt);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', requireAuth, async (req, res, next) => {
    try {
      const existing = await store.getPrompt(req.params.id);
      if (!existing) return res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });

      const categoryIds = await store.loadCategoryIds();
      const merged = { ...existing, ...req.body, id: req.params.id, updated_at: new Date().toISOString() };
      const { valid, errors } = validatePrompt(merged, categoryIds);
      if (!valid) return res.status(400).json({ errors });

      await store.writePrompt(merged);
      await upsertPrompt(merged);
      res.json(merged);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      const deleted = await store.deletePrompt(req.params.id);
      if (!deleted) return res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' });
      await deletePromptRemote(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
