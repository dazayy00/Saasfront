import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">SaaS Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Tenant: {user?.name}</p>
        </div>
        <nav className="mt-6">
          <Link to="/" className="block px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            Dashboard
          </Link>
          <Link to="/inventory" className="block px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            Inventario
          </Link>
          <Link to="/pos" className="block px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            Punto de Venta
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-end px-8">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">{user?.email}</span>
            <button 
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <div className="flex-1 p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
