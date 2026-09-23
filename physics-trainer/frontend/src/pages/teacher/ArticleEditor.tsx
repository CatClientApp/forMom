import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articlesApi, topicsApi } from '../../api/endpoints';
import Markdown from '../../components/Markdown';
import type { Article, Topic } from '../../types';

export default function ArticleEditor() {
  const { id } = useParams();
  const articleId = id ? Number(id) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topicId, setTopicId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => (await topicsApi.getAll()).data as Topic[],
  });

  const { data: existing } = useQuery({
    queryKey: ['article', articleId],
    enabled: !!articleId,
    queryFn: async () => (await articlesApi.getById(articleId!)).data as Article,
  });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setContent(existing.content_md);
      setTopicId(existing.topic_id ?? '');
    }
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { title, content_md: content, topic_id: topicId === '' ? undefined : Number(topicId) };
      if (articleId) return (await articlesApi.update(articleId, payload)).data as Article;
      return (await articlesApi.create(payload)).data as Article;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['articles'] });
      navigate('/teacher/articles');
    },
    onError: (e: any) => setError(e?.response?.data?.detail || 'Ошибка сохранения'),
  });

  const flatTopics = useMemo(() => {
    const list: { id: number; name: string }[] = [];
    topics.forEach(t => {
      list.push({ id: t.id, name: t.name });
      (t.children || []).forEach(c => list.push({ id: c.id, name: `— ${c.name}` }));
    });
    return list;
  }, [topics]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">{articleId ? 'Редактирование статьи' : 'Новая статья'}</h2>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок"
        className="w-full border rounded-lg px-3 py-2 text-base font-medium" />

      <select value={topicId} onChange={e => setTopicId(e.target.value === '' ? '' : Number(e.target.value))}
        className="border rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">Без темы</option>
        {flatTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={20}
          placeholder={'Markdown + LaTeX: $F = m a$'}
          className="border rounded-lg px-3 py-2 font-mono text-sm" />
        <div className="border rounded-lg p-4 bg-white min-h-[300px] overflow-auto">
          <p className="text-xs uppercase text-gray-400 mb-2">Превью</p>
          <Markdown content={content || '*Пусто*'} />
        </div>
      </div>

      <div className="flex gap-3">
        <button disabled={!title.trim() || saveMut.isPending} onClick={() => saveMut.mutate()}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          Сохранить
        </button>
        <button onClick={() => navigate('/teacher/articles')} className="px-5 py-2 border rounded-lg hover:bg-gray-50">
          Отмена
        </button>
      </div>
    </div>
  );
}
