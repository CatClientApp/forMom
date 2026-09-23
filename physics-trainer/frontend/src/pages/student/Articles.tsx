import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { articlesApi, topicsApi } from '../../api/endpoints';
import type { Article } from '../../types';

export default function Articles() {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: async () => (await topicsApi.getAll()).data });
  const { data: articles } = useQuery({ queryKey: ['articles'], queryFn: async () => (await articlesApi.getAll()).data });

  const byTopic = (id: number): Article[] => (articles ?? []).filter((a) => a.topic_id === id);
  const noTopic: Article[] = (articles ?? []).filter((a) => a.topic_id == null);

  const toggle = (id: number) =>
    setOpen((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const renderArticles = (list: Article[]) =>
    list.length === 0 ? (
      <p className="text-sm text-gray-400 pl-8 py-1">Нет статей</p>
    ) : (
      list.map((a) => (
        <Link key={a.id} to={`/student/articles/${a.id}`} className="block pl-8 py-1.5 text-sm text-indigo-600 hover:underline">
          {a.title}
        </Link>
      ))
    );

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">База знаний</h2>
      <div className="card divide-y">
        {(topics ?? []).map((t: any) => (
          <div key={t.id}>
            <button className="w-full flex items-center gap-2 px-4 py-3 font-semibold hover:bg-gray-50" onClick={() => toggle(t.id)}>
              {open.has(t.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {t.name}
            </button>
            {open.has(t.id) && (
              <div className="pb-2">
                {renderArticles(byTopic(t.id))}
                {(t.children ?? []).map((c: any) => (
                  <div key={c.id}>
                    <div className="pl-8 pt-2 pb-1 text-sm font-medium text-gray-500">{c.name}</div>
                    {renderArticles(byTopic(c.id))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {noTopic.length > 0 && (
          <div>
            <button className="w-full flex items-center gap-2 px-4 py-3 font-semibold hover:bg-gray-50" onClick={() => toggle(-1)}>
              {open.has(-1) ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Без темы
            </button>
            {open.has(-1) && renderArticles(noTopic)}
          </div>
        )}
      </div>
    </div>
  );
}
