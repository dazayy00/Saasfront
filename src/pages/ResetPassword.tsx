import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import api from '../api';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const phone = location.state?.phone || '';

  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!phone) {
      navigate('/forgot-password');
    }
  }, [phone, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pin.length !== 6) {
      setStatus('error');
      setMessage('El código PIN debe tener 6 dígitos exactos.');
      return;
    }

    setStatus('loading');
    try {
      const response = await api.post('/auth/reset-password', { phone, token: pin, newPassword: password });
      setMessage(response.data.message);
      setStatus('success');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error al procesar la solicitud. Verifica el PIN.');
      setStatus('error');
    }
  };

  if (!phone) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Package className="w-12 h-12 text-black" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verifica tu celular
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresa el NIP de 6 dígitos enviado al {phone}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          {status === 'success' ? (
             <div className="text-center">
                <div className="p-4 bg-green-50 text-green-800 rounded-lg text-sm font-medium mb-4">
                  {message}
                </div>
                <p className="text-gray-500 text-sm">Serás redirigido al inicio de sesión.</p>
             </div>
          ) : (
             <form className="space-y-6" onSubmit={handleSubmit}>
              {status === 'error' && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                  {message}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código PIN de 6 dígitos
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Ej: 123456"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm text-center tracking-[1em] font-bold text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nueva contraseña
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Verificar nueva contraseña
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {status === 'loading' ? 'Verificando...' : 'Cambiar Contraseña'}
                </button>
              </div>

              <div className="text-center">
                 <Link to="/login" className="text-sm text-gray-600 hover:text-black hover:underline">
                   Cancelar
                 </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
