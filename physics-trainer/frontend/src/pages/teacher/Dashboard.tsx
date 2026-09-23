export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Панель учителя</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Учеников</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Задач создано</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Статей в базе</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Тестов</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">-</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h3>
        <div className="flex flex-wrap gap-3">
          <a href="/teacher/users" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            👥 Управление пользователями
          </a>
          <a href="/teacher/topics" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            📁 Темы и разделы
          </a>
          <a href="/teacher/articles" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            📚 База знаний
          </a>
          <a href="/teacher/tasks" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            ✏️ Создать задачу
          </a>
          <a href="/teacher/tests" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            📝 Тесты
          </a>
        </div>
      </div>
    </div>
  );
}
