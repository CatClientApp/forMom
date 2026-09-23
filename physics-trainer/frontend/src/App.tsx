import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from './store/userStore';
import UserSwitcher from './components/UserSwitcher';
import RoleRedirect from './components/RoleRedirect';
import { getUsers } from './api/endpoints';
import type { User } from './types';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import UsersPage from './pages/teacher/UsersPage';
import TopicsPage from './pages/teacher/TopicsPage';
import ArticlesPage from './pages/teacher/ArticlesPage';
import ArticleEditor from './pages/teacher/ArticleEditor';
import TasksPage from './pages/teacher/TasksPage';
import TaskEditor from './pages/teacher/TaskEditor';
import TestsPage from './pages/teacher/TestsPage';
import TestEditor from './pages/teacher/TestEditor';

// Student pages
import StudentHome from './pages/student/Home';
import Practice from './pages/student/Practice';
import TestsList from './pages/student/TestsList';
import TestRun from './pages/student/TestRun';
import StudentArticles from './pages/student/Articles';
import ArticleView from './pages/student/ArticleView';
import Progress from './pages/student/Progress';

const navCls = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-lg font-medium ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`;

function App() {
  const currentUserId = useUserStore((s) => s.currentUserId);
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const me: User | undefined = (users ?? []).find((u) => u.id === currentUserId);
  const isTeacher = me?.role === 'teacher';

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Physics Trainer</h1>
          <p className="text-gray-600 mb-4">Выберите пользователя для начала работы</p>
          <div className="flex justify-center"><UserSwitcher /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-indigo-600 whitespace-nowrap">Physics Trainer</h1>
          <nav className="hidden md:flex gap-1 text-sm items-center">
            {isTeacher ? (
              <>
                <NavLink to="/teacher" end className={navCls}>Главная</NavLink>
                <NavLink to="/teacher/users" className={navCls}>Пользователи</NavLink>
                <NavLink to="/teacher/topics" className={navCls}>Темы</NavLink>
                <NavLink to="/teacher/articles" className={navCls}>Статьи</NavLink>
                <NavLink to="/teacher/tasks" className={navCls}>Задачи</NavLink>
                <NavLink to="/teacher/tests" className={navCls}>Тесты</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/student" end className={navCls}>Главная</NavLink>
                <NavLink to="/student/practice" className={navCls}>Практика</NavLink>
                <NavLink to="/student/tests" className={navCls}>Тесты</NavLink>
                <NavLink to="/student/articles" className={navCls}>База знаний</NavLink>
                <NavLink to="/student/progress" className={navCls}>Прогресс</NavLink>
              </>
            )}
          </nav>
          <UserSwitcher />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          {/* Teacher routes */}
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/users" element={<UsersPage />} />
          <Route path="/teacher/topics" element={<TopicsPage />} />
          <Route path="/teacher/articles" element={<ArticlesPage />} />
          <Route path="/teacher/articles/new" element={<ArticleEditor />} />
          <Route path="/teacher/articles/:id" element={<ArticleEditor />} />
          <Route path="/teacher/tasks" element={<TasksPage />} />
          <Route path="/teacher/tasks/new" element={<TaskEditor />} />
          <Route path="/teacher/tasks/:id" element={<TaskEditor />} />
          <Route path="/teacher/tests" element={<TestsPage />} />
          <Route path="/teacher/tests/:id" element={<TestEditor />} />

          {/* Student routes */}
          <Route path="/student" element={<StudentHome />} />
          <Route path="/student/practice" element={<Practice />} />
          <Route path="/student/tests" element={<TestsList />} />
          <Route path="/student/tests/:id" element={<TestRun />} />
          <Route path="/student/articles" element={<StudentArticles />} />
          <Route path="/student/articles/:id" element={<ArticleView />} />
          <Route path="/student/progress" element={<Progress />} />

          {/* Default redirect по роли */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
