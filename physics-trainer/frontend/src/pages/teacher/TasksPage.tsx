import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { tasksApi, topicsApi } from '../../api/endpoints';
import type { Task } from '../../types';

const diffBadge: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};
const diffLabel: Record<string, string> = { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' };

export default function TasksPage() {
  const qc = useQueryClient();
  const [topicId, setTopicId] = useState<number | ''>('');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');

  const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: async () => (await topicsApi.getAll()).data });
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', topicId, difficulty, search],
    queryFn: async () =>
      (
        await tasksApi.getAll({
          topic_id: topicId === '' ? undefined : Number(topicId),
          difficulty: difficulty || undefined,
          search: search || undefined,
        })
      ).data as Task[],
  });

  const del = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const flatTopics: { id: number; label: string }[] = [];
  (topics ?? []).forEach((t: any) => {
    flatTopics.push({ id: t.id, label: t.name });
    (t.children ?? []).forEach((c: any) => flatTopics.push({ id: c.id, label: `— ${c.name}` }));
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Задачи</h2>
        <Link to="/teacher/tasks/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Задача
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={topicId} onChange={(e) => setTopicId(e.target.value === '' ? '' : Number(e.target.value))} className="input w-56">
          <option value="">Все темы</option>
          {flatTopics.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input w-40">
          <option value="">Любая сложность</option>
          <option value="easy">Лёгкие</option>
          <option value="medium">Средние</option>
          <option value="hard">Сложные</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…" className="input w-64" />
      </div>

      {isLoading && <p className="text-gray-500">Загрузка…</p>}
      {!isLoading && (tasks?.length ?? 0) === 0 && (
        <p className="text-gray-500 bg-white rounded-lg border p-6 text-center">Задач нет. Создайте первую!</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tasks ?? []).map((t) => (
          <div key={t.id} className="bg-white rounded-lg border p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{t.title}</span>
              <span className={`badge ${diffBadge[t.difficulty]}`}>{diffLabel[t.difficulty]}</span>
            </div>
            <div className="text-xs text-gray-500">
              {t.points} балл(ов) · {t.answer_type === 'choice' ? 'выбор ответа' : t.answer_type}
            </div>
            <div className="mt-auto flex gap-2 pt-2">
              <Link to={`/teacher/tasks/${t.id}`} className="btn-secondary flex items-center gap-1 text-sm">
                <Pencil size={14} /> Изменить
              </Link>
              <button
                onClick={() => { if (confirm(`Удалить задачу «${t.title}»?`)) del.mutate(t.id); }}
                className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm ml-auto"
              >
                <Trash2 size={14} /> Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
