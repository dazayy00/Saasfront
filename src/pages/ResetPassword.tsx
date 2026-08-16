import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Package, ShieldCheck, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '../api';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const phone = location.state?.phone || '';

  const [step, setStep] = useState<'verify' | 'reset'>('verify');
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

  // Paso 1: Verificar que el código PIN sea correcto
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setStatus('error');
      setMessage('El código PIN debe tener 6 dígitos exactos.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      await api.post('/auth/verify-reset-code', { phone, token: pin });
      setStatus('idle');
      setMessage('');
      setStep('reset');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Código PIN inválido o expirado. Inténtalo de nuevo.');
      setStatus('error');
    }
  };

  // Paso 2: Establecer y confirmar la nueva contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
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

    setStatus('loading');
    setMessage('');
    try {
      const response = await api.post('/auth/reset-password', { phone, token: pin, newPassword: password });
      setMessage(response.data.message || 'Contraseña actualizada con éxito');
      setStatus('success');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error al actualizar la contraseña. Inténtalo de nuevo.');
      setStatus('error');
    }
  };

  if (!phone) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-black rounded-2xl shadow-md">
            {step === 'verify' ? (
              <ShieldCheck className="w-8 h-8 text-white" />
            ) : (
              <KeyRound className="w-8 h-8 text-white" />
            )}
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === 'verify' ? 'Verificación de Código' : 'Nueva Contraseña'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'verify'
            ? `Ingresa el PIN de 6 dígitos enviado al número ${phone}`
            : 'El código fue verificado. Ahora define tu nueva contraseña.'}
        </p>

        {/* Step Indicator */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
            step === 'verify' ? 'bg-black text-white' : 'bg-green-600 text-white'
          }`}>
            {step === 'reset' ? '✓' : '1'}
          </span>
          <div className={`w-8 h-0.5 ${step === 'reset' ? 'bg-green-600' : 'bg-gray-300'}`} />
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
            step === 'reset' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10 border border-gray-100">
          {status === 'success' ? (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">¡Contraseña Actualizada!</h3>
              <p className="text-sm text-gray-600">
                Tu contraseña ha sido restablecida correctamente. Redirigiendo al inicio de sesión...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Ir al inicio de sesión ahora
                </Link>
              </div>
            </div>
          ) : step === 'verify' ? (
            /* PASO 1: Formulario para ingresar y comprobar el código PIN */
            <form className="space-y-6" onSubmit={handleVerifyCode}>
              {status === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 text-center">
                  Código PIN (6 dígitos)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-center tracking-[0.6em] font-mono font-bold text-2xl"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Revisa tus mensajes SMS en el celular {phone}
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === 'loading' || pin.length !== 6}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-all cursor-pointer"
                >
                  {status === 'loading' ? 'Verificando Código...' : 'Verificar Código'}
                </button>
              </div>

              <div className="text-center pt-2 flex items-center justify-center gap-4">
                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-500 hover:text-black flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Reenviar o cambiar número
                </Link>
              </div>
            </form>
          ) : (
            /* PASO 2: Formulario para ingresar y confirmar la nueva contraseña */
            <form className="space-y-5" onSubmit={handleResetPassword}>
              {status === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Código <strong>{pin}</strong> verificado para {phone}</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Confirmar nueva contraseña (verificación)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === 'loading' || !password || !confirmPassword}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-all cursor-pointer"
                >
                  {status === 'loading' ? 'Guardando Contraseña...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('verify');
                    setMessage('');
                    setStatus('idle');
                  }}
                  className="text-xs text-gray-500 hover:text-black hover:underline"
                >
                  Volver a ingresar código PIN
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

