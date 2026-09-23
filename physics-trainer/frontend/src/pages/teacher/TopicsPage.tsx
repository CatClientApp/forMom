import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsApi } from '../../api/endpoints';
import type { Topic } from '../../types';

export default function TopicsPage() {
  const qc = useQueryClient();
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => (await topicsApi.getAll()).data as Topic[],
  });

  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (data: { name: string; parent_id?: number }) => topicsApi.create(data),
    onSuccess: () => { setNewName(''); setError(null); qc.invalidateQueries({ queryKey: ['topics'] }); },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Ошибка создания темы'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['topics'] }); },
    onError: (e: any) => setError(typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : 'Нельзя удалить: есть связанные задачи/статьи/подтемы'),
  });

  const roots = topics.filter(t => !t.parent_id);
  const childrenOf = (id: number) => (topics.find(t => t.id === id)?.children || []).sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Темы</h2>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Название</label>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Например: Кинематика" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Родительская тема</label>
          <select value={parentId} onChange={e => setParentId(e.target.value ? Number(e.target.value) : '')}
            className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">— верхний уровень —</option>
            {roots.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button
          disabled={!newName.trim() || createMut.isPending}
          onClick={() => createMut.mutate({ name: newName.trim(), parent_id: parentId === '' ? undefined : Number(parentId) })}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
          + Создать
        </button>
      </div>

      {isLoading ? <p className="text-gray-500">Загрузка…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roots.length === 0 && <p className="text-gray-400">Тем пока нет — создайте первую.</p>}
          {roots.map(root => (
            <div key={root.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{root.name}</h3>
                <button onClick={() => deleteMut.mutate(root.id)} className="text-red-500 text-sm hover:underline">удалить</button>
              </div>
              <ul className="mt-2 space-y-1">
                {childrenOf(root.id).map(ch => (
                  <li key={ch.id} className="flex items-center justify-between text-sm text-gray-600 pl-3 border-l-2 border-indigo-200">
                    <span>{ch.name}</span>
                    <button onClick={() => deleteMut.mutate(ch.id)} className="text-red-400 hover:underline">×&nbsp;удалить</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
