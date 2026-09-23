import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { statsApi } from '../../api/endpoints';

export default function Progress() {
  const { data: summary } = useQuery({ queryKey: ['stats', 'summary'], queryFn: async () => (await statsApi.getMySummary()).data });
  const { data: topics } = useQuery({ queryKey: ['stats', 'topics'], queryFn: async () => (await statsApi.getMyTopics()).data as any[] });
  const { data: errors } = useQuery({ queryKey: ['stats', 'errors'], queryFn: async () => (await statsApi.getMyErrors(20)).data as any[] });

  const maxSolved = Math.max(1, ...(topics ?? []).map((t: any) => t.solved ?? 0));

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Прогресс</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{summary?.total_points ?? 0}</div>
          <div className="text-xs text-gray-500">всего баллов</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{summary?.solved_count ?? 0}</div>
          <div className="text-xs text-gray-500">решено верно</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{Math.round((summary?.accuracy ?? 0) * 100)}%</div>
          <div className="text-xs text-gray-500">точность</div>
        </div>
      </div>

      <h3 className="font-bold mb-2">По темам</h3>
      <div className="card p-4 mb-8 space-y-3">
        {(topics ?? []).length === 0 && <p className="text-sm text-gray-400">Пока нет данных — решите пару задач.</p>}
        {(topics ?? []).map((t: any) => (
          <div key={t.topic_id}>
            <div className="flex justify-between text-sm mb-1">
              <span>{t.name}</span>
              <span className="text-gray-500">{t.correct}/{t.solved} верно</span>
            </div>
            <div className="h-2 bg-gray-100 rounded overflow-hidden">
              <div className="h-full bg-indigo-500 rounded" style={{ width: `${((t.solved ?? 0) / maxSolved) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-bold mb-2 flex items-center gap-2">
        <AlertTriangle size={16} className="text-orange-500" /> Последние ошибки
      </h3>
      <div className="card divide-y">
        {(errors ?? []).length === 0 && <p className="text-sm text-gray-400 p-4">Ошибок нет — отлично! 🎉</p>}
        {(errors ?? []).map((e: any, i: number) => (
          <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
            <span>{e.task_title}</span>
            <span className="text-gray-400 text-xs">{new Date(e.answered_at).toLocaleDateString('ru-RU')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
