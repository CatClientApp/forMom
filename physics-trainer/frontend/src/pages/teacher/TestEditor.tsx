import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Plus, X } from 'lucide-react';
import { tasksApi, testsApi } from '../../api/endpoints';
import type { Task } from '../../types';

interface TestWithTasks {
  id: number; title: string; description: string | null;
  tasks?: (Task & { order_index?: number })[];
}

export default function TestEditor() {
  const { id } = useParams();
  const testId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pickOpen, setPickOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: test } = useQuery({
    queryKey: ['test', testId],
    queryFn: async () => (await testsApi.getById(testId)).data as TestWithTasks,
  });
  const { data: allTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => (await tasksApi.getAll({ search: search || undefined })).data as Task[],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['test', testId] });
    qc.invalidateQueries({ queryKey: ['tests'] });
  };

  const addTask = useMutation({
    mutationFn: (taskId: number) => testsApi.addTask(testId, taskId, (test?.tasks?.length ?? 0)),
    onSuccess: () => { setPickOpen(false); invalidate(); },
  });
  const removeTask = useMutation({
    mutationFn: (taskId: number) => testsApi.removeTask(testId, taskId),
    onSuccess: invalidate,
  });
  const move = useMutation({
    mutationFn: async (idx: number) => {
      // пересборка порядка: снимаем все задачи и ставим в новом порядке
      const tasks = [...(test?.tasks ?? [])];
      [tasks[idx - 1], tasks[idx]] = [tasks[idx], tasks[idx - 1]];
      for (const t of test?.tasks ?? []) await testsApi.removeTask(testId, t.id).catch(() => {});
      for (let i = 0; i < tasks.length; i++) await testsApi.addTask(testId, tasks[i].id, i);
    },
    onSuccess: invalidate,
  });

  const chosenIds = useMemo(() => new Set((test?.tasks ?? []).map((t) => t.id)), [test]);
  const candidates = (allTasks ?? []).filter((t) => !chosenIds.has(t.id));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{test?.title ?? 'Тест'}</h2>
          {test?.description && <p className="text-gray-500 text-sm">{test.description}</p>}
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setPickOpen(true)}>
          <Plus size={16} /> Добавить задачу
        </button>
      </div>

      {(test?.tasks ?? []).length === 0 && (
        <p className="text-gray-500 bg-white rounded-lg border p-6 text-center">В тесте ещё нет задач.</p>
      )}

      <div className="space-y-2">
        {(test?.tasks ?? []).map((t, i) => (
          <div key={t.id} className="bg-white rounded-lg border p-3 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">{i + 1}</span>
            <div className="flex-1">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-gray-500">{t.points} баллов · {t.difficulty}</div>
            </div>
            {i > 0 && (
              <button className="text-gray-400 hover:text-gray-700" title="Вверх" onClick={() => move.mutate(i)}>
                <ArrowUp size={16} />
              </button>
            )}
            <button className="text-red-400 hover:text-red-600" title="Убрать" onClick={() => removeTask.mutate(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="btn-primary" onClick={() => navigate('/teacher/tests')}>Готово</button>
        <button className="btn-secondary" onClick={() => navigate('/teacher/tests')}>Назад к списку</button>
      </div>

      {pickOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPickOpen(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Выберите задачу</h3>
              <input className="input w-48" placeholder="Поиск…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {candidates.length === 0 && <p className="text-gray-500 text-sm">Нет доступных задач.</p>}
            <div className="space-y-1">
              {candidates.map((t) => (
                <button
                  key={t.id}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 border-b last:border-0 flex items-center justify-between"
                  onClick={() => addTask.mutate(t.id)}
                >
                  <span>{t.title}</span>
                  <span className="text-xs text-gray-400">{t.points} б.</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
