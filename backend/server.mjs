// 프롬프트 라이브러리 관리용 로컬 백엔드 서버 (CRUD API + 관리자 UI)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPromptsRouter } from './routes/prompts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/prompts', createPromptsRouter());
  app.use('/admin', express.static(path.join(__dirname, 'admin')));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 8787;
  createApp().listen(port, () => {
    console.log(`prompt-library backend listening on http://localhost:${port}`);
    console.log(`관리자 UI: http://localhost:${port}/admin`);
  });
}
