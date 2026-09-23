import { Routes, Route, Navigate } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import UserSwitcher from './components/UserSwitcher';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import UsersPage from './pages/teacher/UsersPage';
import TopicsPage from './pages/teacher/TopicsPage';
import ArticlesPage from './pages/teacher/ArticlesPage';
import TasksPage from './pages/teacher/TasksPage';
import TestsPage from './pages/teacher/TestsPage';

// Student pages
import StudentHome from './pages/student/Home';
import Practice from './pages/student/Practice';
import Articles from './pages/student/Articles';
import Progress from './pages/student/Progress';

function App() {
  const { currentUserId } = useUserStore();

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Physics Trainer</h1>
          <p className="text-gray-600 mb-4">Выберите пользователя для начала работы</p>
          <UserSwitcher />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">Physics Trainer</h1>
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
          <Route path="/teacher/tasks" element={<TasksPage />} />
          <Route path="/teacher/tests" element={<TestsPage />} />

          {/* Student routes */}
          <Route path="/student" element={<StudentHome />} />
          <Route path="/student/practice" element={<Practice />} />
          <Route path="/student/articles" element={<Articles />} />
          <Route path="/student/progress" element={<Progress />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/student" replace />} />
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
