// Supabase에서 프롬프트를 불러와 검색/카테고리/태그 필터 UI를 그리는 스크립트
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { filterPrompts } from './filter.js';

// data/categories.json과 내용을 맞춰서 유지할 것 (docs/는 정적 호스팅이라 data/를 직접 fetch할 수 없음)
const CATEGORIES = [
  { id: 'writing', label: '글쓰기', emoji: '✍️' },
  { id: 'automation', label: '업무자동화', emoji: '⚙️' },
  { id: 'marketing', label: '마케팅', emoji: '📣' },
  { id: 'image', label: '이미지생성', emoji: '🎨' },
  { id: 'coding', label: '코딩/개발', emoji: '💻' },
  { id: 'research', label: '리서치/분석', emoji: '🔍' },
  { id: 'etc', label: '기타', emoji: '🗂️' },
];

const state = { prompts: [], category: 'all', tag: null, query: '' };

const els = {
  search: document.getElementById('search'),
  categoryTabs: document.getElementById('categoryTabs'),
  tagChips: document.getElementById('tagChips'),
  results: document.getElementById('results'),
  empty: document.getElementById('empty'),
  loadError: document.getElementById('loadError'),
};

function renderCategoryTabs() {
  const tabs = [{ id: 'all', label: '전체', emoji: '📚' }, ...CATEGORIES];
  els.categoryTabs.innerHTML = '';
  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.textContent = `${tab.emoji} ${tab.label}`;
    btn.setAttribute('aria-pressed', String(state.category === tab.id));
    btn.addEventListener('click', () => {
      state.category = tab.id;
      render();
    });
    els.categoryTabs.appendChild(btn);
  }
}

function renderTagChips(prompts) {
  const tags = [...new Set(prompts.flatMap((p) => p.tags || []))].sort();
  els.tagChips.innerHTML = '';
  for (const tag of tags) {
    const btn = document.createElement('button');
    btn.textContent = `#${tag}`;
    btn.setAttribute('aria-pressed', String(state.tag === tag));
    btn.addEventListener('click', () => {
      state.tag = state.tag === tag ? null : tag;
      render();
    });
    els.tagChips.appendChild(btn);
  }
}

function renderCards(prompts) {
  els.results.innerHTML = '';
  els.empty.hidden = prompts.length > 0;

  for (const p of prompts) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <div class="meta">
        <span>${escapeHtml(p.model)}</span>
        <span>v${escapeHtml(p.version)}</span>
        ${(p.tags || []).map((t) => `<span>#${escapeHtml(t)}</span>`).join('')}
      </div>
      <pre>${escapeHtml(p.body)}</pre>
      <button class="copy">복사</button>
    `;
    card.querySelector('.copy').addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(p.body);
      const btn = e.target;
      const original = btn.textContent;
      btn.textContent = '복사됨!';
      setTimeout(() => (btn.textContent = original), 1200);
    });
    els.results.appendChild(card);
  }
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function render() {
  const filtered = filterPrompts(state.prompts, {
    query: state.query,
    category: state.category,
    tag: state.tag,
  });
  renderCategoryTabs();
  renderTagChips(state.prompts);
  renderCards(filtered);
}

els.search.addEventListener('input', (e) => {
  state.query = e.target.value;
  render();
});

async function init() {
  try {
    // config.js가 아직 없으면(docs/config.example.js를 복사하지 않은 경우) 여기서 실패한다.
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./config.js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('prompts').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    state.prompts = data || [];
    render();
  } catch (err) {
    console.error(err);
    els.loadError.hidden = false;
  }
}

init();
