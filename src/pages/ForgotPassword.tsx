import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import api from '../api';

const ForgotPassword = () => {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/auth/forgot-password', { phone });
      navigate('/reset-password', { state: { phone } });
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error al conectar con el servidor.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Package className="w-12 h-12 text-black" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Recuperar Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enviaremos un código PIN por SMS.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {status === 'error' && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                {message}
              </div>
            )}
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Tu número de celular
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="10 dígitos"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
              >
                {status === 'loading' ? 'Enviando SMS...' : 'Enviar Código SMS'}
              </button>
            </div>

            <div className="text-center">
                <Link to="/login" className="text-sm text-gray-600 hover:text-black hover:underline">
                  Cancelar
                </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
