import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articlesApi, topicsApi } from '../../api/endpoints';
import type { Article, Topic } from '../../types';

export default function ArticlesPage() {
  const qc = useQueryClient();
  const [topicFilter, setTopicFilter] = useState<number | ''>('');

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => (await topicsApi.getAll()).data as Topic[],
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles', topicFilter],
    queryFn: async () =>
      (await articlesApi.getAll(topicFilter === '' ? undefined : Number(topicFilter))).data as Article[],
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => articlesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articles'] }),
  });

  const flatTopics: Topic[] = [];
  topics.forEach(t => {
    flatTopics.push(t);
    (t.children || []).forEach(c => flatTopics.push({ ...c, name: `— ${c.name}` }));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">База знаний</h2>
        <Link to="/teacher/articles/new" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          + Создать статью
        </Link>
      </div>

      <select value={topicFilter} onChange={e => setTopicFilter(e.target.value === '' ? '' : Number(e.target.value))}
        className="border rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">Все темы</option>
        {flatTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {isLoading ? <p className="text-gray-500">Загрузка…</p> : (
        <div className="space-y-2">
          {articles.length === 0 && <p className="text-gray-400">Статей нет.</p>}
          {articles.map(a => (
            <div key={a.id} className="bg-white border rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div>
                <Link to={`/teacher/articles/${a.id}`} className="font-medium text-indigo-700 hover:underline">{a.title}</Link>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{a.content_md.slice(0, 120)}</p>
              </div>
              <div className="flex gap-3 text-sm shrink-0 ml-4">
                <Link to={`/teacher/articles/${a.id}`} className="text-gray-600 hover:underline">редактировать</Link>
                <button onClick={() => deleteMut.mutate(a.id)} className="text-red-500 hover:underline">удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
