import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { articlesApi } from '../../api/endpoints';
import Markdown from '../../components/Markdown';
import type { Article } from '../../types';

export default function ArticleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => (await articlesApi.getById(Number(id))).data as Article,
  });

  if (isLoading) return <p className="text-gray-500">Загрузка…</p>;
  if (!article) return <p className="text-gray-500">Статья не найдена.</p>;

  return (
    <div className="max-w-3xl">
      <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Назад
      </button>
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">{article.title}</h2>
        <Markdown content={article.content_md} />
      </div>
    </div>
  );
}
