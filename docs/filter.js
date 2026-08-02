// 프롬프트 목록을 검색어/카테고리/태그로 걸러내는 순수 함수 (브라우저와 Node 테스트 양쪽에서 사용)
export function filterPrompts(prompts, { query = '', category = 'all', tag = null } = {}) {
  const q = query.trim().toLowerCase();

  return prompts.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (tag && !(p.tags || []).includes(tag)) return false;
    if (!q) return true;

    const haystack = [p.title, p.model, ...(p.tags || [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
