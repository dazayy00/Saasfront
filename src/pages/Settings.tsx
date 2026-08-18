import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useAuthStore } from '../store/authStore';
import { Building2, User, Phone, Mail, Lock, Calendar, Edit3, Check, X } from 'lucide-react';

const Settings = () => {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore(state => state.updateUser);
  const [editMode, setEditMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    businessName: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      setForm(f => ({
        ...f,
        name: data.name || '',
        phone: data.phone || '',
        businessName: data.business?.name || '',
      }));
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }
      const payload: any = {
        name: form.name,
        phone: form.phone,
        businessName: form.businessName,
      };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }
      return api.put('/settings', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      updateUser({
        name: form.name,
        businessName: form.businessName,
        phone: form.phone,
      });
      setEditMode(false);
      setSuccessMsg('¡Datos actualizados correctamente!');
      setErrorMsg('');
      setForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || error.response?.data?.message || 'Error al guardar los cambios');
    }
  });

  const cancelEdit = () => {
    setEditMode(false);
    setErrorMsg('');
    setForm(f => ({
      ...f,
      name: settings?.name || '',
      phone: settings?.phone || '',
      businessName: settings?.business?.name || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    }));
  };

  if (isLoading) return <div className="p-8 text-gray-500">Cargando configuración...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Configuración</h2>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Edit3 className="w-4 h-4" /> Editar datos
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      {/* Business Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex items-center gap-3">
          <div className="p-2 bg-black rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Datos del Negocio</h3>
            <p className="text-xs text-gray-500">Nombre de tu local o empresa</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del Negocio</label>
            {editMode ? (
              <input
                type="text"
                value={form.businessName}
                onChange={e => setForm({ ...form, businessName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            ) : (
              <p className="text-gray-900 font-medium">{settings?.business?.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />Registrado el
            </label>
            <p className="text-gray-600 text-sm">
              {settings?.business?.createdAt ? new Date(settings.business.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex items-center gap-3">
          <div className="p-2 bg-gray-800 rounded-lg">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Datos del Administrador</h3>
            <p className="text-xs text-gray-500">Tu perfil personal</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <User className="w-3 h-3 inline mr-1" />Nombre completo
            </label>
            {editMode ? (
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            ) : (
              <p className="text-gray-900 font-medium">{settings?.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Mail className="w-3 h-3 inline mr-1" />Correo electrónico
            </label>
            <p className="text-gray-600 text-sm">{settings?.email}</p>
            {editMode && <p className="text-xs text-gray-400 mt-1">El correo no puede modificarse</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Phone className="w-3 h-3 inline mr-1" />Teléfono celular
            </label>
            {editMode ? (
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="10 dígitos"
              />
            ) : (
              <p className="text-gray-900 font-medium">{settings?.phone || <span className="text-gray-400 italic">No registrado</span>}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />Cuenta creada
            </label>
            <p className="text-gray-600 text-sm">
              {settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      {editMode && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-gray-50 flex items-center gap-3">
            <div className="p-2 bg-gray-600 rounded-lg">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Cambiar Contraseña</h3>
              <p className="text-xs text-gray-500">Opcional — déjalo en blanco para no cambiarla</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contraseña actual</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Tu contraseña actual"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={form.confirmNewPassword}
                onChange={e => setForm({ ...form, confirmNewPassword: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Repite la nueva contraseña"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
