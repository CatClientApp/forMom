import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Dumbbell, TrendingUp } from 'lucide-react';
import { statsApi } from '../../api/endpoints';
import { useUserStore } from '../../store/userStore';
import { useEffect, useState } from 'react';
import { getUsers } from '../../api/endpoints';
import type { User } from '../../types';

export default function Home() {
  const uid = useUserStore((s) => s.currentUserId);
  const [user, setUser] = useState<User | null>(null);
  const { data: stats } = useQuery({ queryKey: ['stats', 'summary', uid], queryFn: async () => (await statsApi.getMySummary()).data });

  useEffect(() => {
    getUsers().then((us) => setUser(us.find((u) => u.id === uid) ?? null));
  }, [uid]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Привет, {user?.name ?? '…'}! 👋</h2>
      <p className="text-gray-500 mb-6">Что будем решать сегодня?</p>

      <div className="grid grid-cols-3 gap-4 mb-8 max-w-xl">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{stats?.solved_count ?? 0}</div>
          <div className="text-xs text-gray-500">решено верно</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{Math.round((stats?.accuracy ?? 0) * 100)}%</div>
          <div className="text-xs text-gray-500">точность</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{stats?.total_points ?? 0}</div>
          <div className="text-xs text-gray-500">баллов</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Link to="/student/practice" className="card p-6 flex items-center gap-4 hover:border-indigo-300 transition-colors">
          <Dumbbell className="text-indigo-500" size={32} />
          <div>
            <div className="font-semibold">Свободная практика</div>
            <div className="text-sm text-gray-500">Решай задачи с разбором и подсказками</div>
          </div>
        </Link>
        <Link to="/student/tests" className="card p-6 flex items-center gap-4 hover:border-indigo-300 transition-colors">
          <ClipboardList className="text-indigo-500" size={32} />
          <div>
            <div className="font-semibold">Тесты</div>
            <div className="text-sm text-gray-500">Проверь себя без подсказок</div>
          </div>
        </Link>
        <Link to="/student/articles" className="card p-6 flex items-center gap-4 hover:border-indigo-300 transition-colors">
          <BookOpen className="text-indigo-500" size={32} />
          <div>
            <div className="font-semibold">База знаний</div>
            <div className="text-sm text-gray-500">Статьи и формулы по темам</div>
          </div>
        </Link>
        <Link to="/student/progress" className="card p-6 flex items-center gap-4 hover:border-indigo-300 transition-colors">
          <TrendingUp className="text-indigo-500" size={32} />
          <div>
            <div className="font-semibold">Прогресс</div>
            <div className="text-sm text-gray-500">Статистика и ошибки</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
