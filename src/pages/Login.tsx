import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        const { data } = await api.post('/auth/register', { name, email, password, businessName });
        login(data);
      } else {
        const { data } = await api.post('/auth/login', { email, password });
        login(data);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegister ? 'Crear Negocio' : 'Iniciar Sesión'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema SaaS Multitenant
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded">{error}</div>}
          <div className="rounded-md shadow-sm space-y-4">
            {isRegister && (
              <>
                <input
                  name="businessName"
                  type="text"
                  required
                  placeholder="Nombre de la empresa"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                />
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Tu nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                />
              </>
            )}
            <input
              name="email"
              type="email"
              required
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            />
            <input
              name="password"
              type="password"
              required
              placeholder="Contraseña (ej. Pym3sAdmin.2024*)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            />
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
            >
              {isRegister ? 'Registrar Negocio' : 'Ingresar'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <button 
            type="button" 
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta? Registra tu negocio'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
