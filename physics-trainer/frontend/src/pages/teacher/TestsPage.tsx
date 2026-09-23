import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { testsApi, topicsApi } from '../../api/endpoints';

export default function TestsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState<number | ''>('');

  const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: async () => (await topicsApi.getAll()).data });
  const { data: tests, isLoading } = useQuery({ queryKey: ['tests'], queryFn: async () => (await testsApi.getAll()).data });

  const create = useMutation({
    mutationFn: () =>
      testsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        topic_id: topicId === '' ? undefined : Number(topicId),
      }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setTopicId('');
      qc.invalidateQueries({ queryKey: ['tests'] });
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => testsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests'] }),
  });

  const flatTopics: { id: number; label: string }[] = [];
  (topics ?? []).forEach((t: any) => {
    flatTopics.push({ id: t.id, label: t.name });
    (t.children ?? []).forEach((c: any) => flatTopics.push({ id: c.id, label: `— ${c.name}` }));
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Тесты</h2>

      <div className="card p-4 mb-6">
        <span className="label flex items-center gap-1"><Plus size={14} /> Новый тест</span>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="input" placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" placeholder="Описание (опционально)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Без темы</option>
            {flatTopics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button className="btn-primary" disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Создание…' : 'Создать'}
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Загрузка…</p>}
      {!isLoading && (tests?.length ?? 0) === 0 && (
        <p className="text-gray-500 bg-white rounded-lg border p-6 text-center">Тестов пока нет.</p>
      )}

      <div className="space-y-3">
        {(tests ?? []).map((t: any) => (
          <div key={t.id} className="bg-white rounded-lg border p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold">{t.title}</div>
              {t.description && <div className="text-sm text-gray-500">{t.description}</div>}
            </div>
            <Link to={`/teacher/tests/${t.id}`} className="btn-secondary flex items-center gap-1 text-sm">
              <Pencil size={14} /> Составить
            </Link>
            <button
              onClick={() => { if (confirm(`Удалить тест «${t.title}»?`)) del.mutate(t.id); }}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
