// 관리자 UI에서 /api/prompts CRUD를 호출하는 스크립트
const tokenInput = document.getElementById('token');
const listBody = document.querySelector('#list tbody');
const form = document.getElementById('promptForm');
const formError = document.getElementById('formError');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEdit');

let editingId = null;

tokenInput.value = localStorage.getItem('adminToken') || '';
document.getElementById('saveToken').addEventListener('click', () => {
  localStorage.setItem('adminToken', tokenInput.value);
  alert('토큰이 저장되었습니다.');
});

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` };
}

function enterEditMode(prompt) {
  editingId = prompt.id;
  form.id.value = prompt.id;
  form.id.disabled = true;
  form.title.value = prompt.title;
  form.category.value = prompt.category;
  form.tags.value = (prompt.tags || []).join(', ');
  form.model.value = prompt.model;
  form.version.value = prompt.version;
  form.body.value = prompt.body;
  form.notes.value = prompt.notes || '';

  formTitle.textContent = `프롬프트 수정 — ${prompt.id}`;
  submitBtn.textContent = '수정 저장';
  cancelEditBtn.hidden = false;
  formError.textContent = '';
  highlightRow(prompt.id);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitEditMode() {
  editingId = null;
  form.reset();
  form.id.disabled = false;
  formTitle.textContent = '새 프롬프트 추가';
  submitBtn.textContent = '저장';
  cancelEditBtn.hidden = true;
  formError.textContent = '';
  highlightRow(null);
}

function highlightRow(id) {
  for (const tr of listBody.querySelectorAll('tr')) {
    tr.classList.toggle('selected', tr.dataset.id === id);
  }
}

cancelEditBtn.addEventListener('click', exitEditMode);

async function loadList() {
  const res = await fetch('/api/prompts');
  const prompts = await res.json();
  listBody.innerHTML = '';
  for (const p of prompts.sort((a, b) => a.id.localeCompare(b.id))) {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.classList.toggle('selected', p.id === editingId);
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.title}</td>
      <td>${p.category}</td>
      <td>v${p.version}</td>
      <td><button type="button" class="delete">삭제</button></td>
    `;
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.delete')) return;
      enterEditMode(p);
    });
    tr.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePrompt(p.id);
    });
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
  if (id === editingId) exitEditMode();
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

  const isEditing = Boolean(editingId);
  const url = isEditing ? `/api/prompts/${encodeURIComponent(editingId)}` : '/api/prompts';
  if (isEditing) delete payload.id; // id는 URL로 지정, 본문에서는 불필요

  const res = await fetch(url, {
    method: isEditing ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json();
    formError.textContent = (body.errors || [body.error]).join(', ');
    return;
  }
  exitEditMode();
  loadList();
});

loadList();
