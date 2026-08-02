// 프롬프트 한 건을 Supabase에 반영(upsert/delete)하는 헬퍼. service_role 키로만 동작.
import { createClient } from '@supabase/supabase-js';

let client = null;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  }
  client = createClient(url, key);
  return client;
}

export async function upsertPrompt(prompt) {
  const { error } = await getClient().from('prompts').upsert(prompt, { onConflict: 'id' });
  if (error) throw new Error(`Supabase upsert 실패: ${error.message}`);
}

export async function deletePromptRemote(id) {
  const { error } = await getClient().from('prompts').delete().eq('id', id);
  if (error) throw new Error(`Supabase delete 실패: ${error.message}`);
}
