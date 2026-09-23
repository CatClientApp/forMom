import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { articlesApi, statsApi, tasksApi, testsApi, topicsApi, usersApi } from '../../api/endpoints';

export default function TeacherDashboard() {
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: async () => (await usersApi.getAll()).data });
  const { data: tasks } = useQuery({ queryKey: ['tasks', 'all'], queryFn: async () => (await tasksApi.getAll({ limit: 1000 })).data });
  const { data: articles } = useQuery({ queryKey: ['articles'], queryFn: async () => (await articlesApi.getAll()).data });
  const { data: tests } = useQuery({ queryKey: ['tests'], queryFn: async () => (await testsApi.getAll()).data });
  const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: async () => (await topicsApi.getAll()).data });
  const { data: students } = useQuery({ queryKey: ['stats', 'students'], queryFn: async () => (await statsApi.getStudents()).data as any[] });

  const studentCount = (users ?? []).filter((u) => u.role === 'student').length;
  const topicCount = (topics ?? []).reduce((s: number, t: any) => s + 1 + (t.children?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Панель учителя</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Учеников', value: studentCount, color: 'text-indigo-600' },
          { label: 'Задач', value: tasks?.length ?? 0, color: 'text-green-600' },
          { label: 'Статей', value: articles?.length ?? 0, color: 'text-blue-600' },
          { label: 'Тестов', value: tests?.length ?? 0, color: 'text-purple-600' },
          { label: 'Тем', value: topicCount, color: 'text-orange-600' },
        ].map((c) => (
          <div key={c.label} className="bg-white p-5 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">{c.label}</h3>
            <p className={`text-3xl font-bold mt-2 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/teacher/users" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">👥 Пользователи</Link>
          <Link to="/teacher/topics" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">📁 Темы</Link>
          <Link to="/teacher/articles/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">📚 Новая статья</Link>
          <Link to="/teacher/tasks/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">✏️ Новая задача</Link>
          <Link to="/teacher/tests" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">📝 Тесты</Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ученики</h3>
        {(students ?? []).length === 0 && <p className="text-sm text-gray-400">Пока никто не решал задачи.</p>}
        {(students ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Имя</th>
                <th className="py-2">Попыток</th>
                <th className="py-2">Баллов</th>
              </tr>
            </thead>
            <tbody>
              {(students ?? []).map((s: any) => (
                <tr key={s.user_id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2">{s.total_attempts}</td>
                  <td className="py-2 text-indigo-600 font-semibold">{s.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
