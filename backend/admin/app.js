// 관리자 UI에서 /api/prompts CRUD를 호출하는 스크립트
const tokenInput = document.getElementById('token');
const listBody = document.querySelector('#list tbody');
const form = document.getElementById('promptForm');
const formError = document.getElementById('formError');

tokenInput.value = localStorage.getItem('adminToken') || '';
document.getElementById('saveToken').addEventListener('click', () => {
  localStorage.setItem('adminToken', tokenInput.value);
  alert('토큰이 저장되었습니다.');
});

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` };
}

async function loadList() {
  const res = await fetch('/api/prompts');
  const prompts = await res.json();
  listBody.innerHTML = '';
  for (const p of prompts.sort((a, b) => a.id.localeCompare(b.id))) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.title}</td>
      <td>${p.category}</td>
      <td>v${p.version}</td>
      <td><button data-id="${p.id}" class="delete">삭제</button></td>
    `;
    tr.querySelector('.delete').addEventListener('click', () => deletePrompt(p.id));
    listBody.appendChild(tr);
  }
}

async function deletePrompt(id) {
  if (!confirm(`'${id}'를 삭제할까요?`)) return;
  const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    alert(`삭제 실패: ${(await res.json()).error || res.status}`);
    return;
  }
  loadList();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    ...data,
    tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
  };

  const res = await fetch('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json();
    formError.textContent = (body.errors || [body.error]).join(', ');
    return;
  }
  form.reset();
  loadList();
});

loadList();
