import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { formatMXN } from '../utils/format';

const Inventory = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    barcode: '',
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    minStock: 5
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (productData) => {
      if (editingProduct) {
        return api.put(`/products/${editingProduct.id}`, productData);
      }
      return api.post('/products', productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (error: any) => {
       alert(error.response?.data?.message || 'Error guardando producto');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const resetForm = () => setForm({ name: '', description: '', barcode: '', buyPrice: 0, sellPrice: 0, stock: 0, minStock: 5 });

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      barcode: product.barcode || '',
      buyPrice: product.buyPrice || 0,
      sellPrice: product.sellPrice || 0,
      stock: product.stock || 0,
      minStock: product.minStock || 5
    });
    setIsModalOpen(true);
  }

  const handleCreate = () => {
    setEditingProduct(null);
    resetForm();
    setIsModalOpen(true);
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Inventario</h2>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Producto
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4">Producto / Código</th>
              <th className="px-6 py-4">Precio de Venta</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p: any) => (
              <tr key={p.id} className="border-b bg-white hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  <div className="flex flex-col">
                    <span>
                      {p.name}
                      {p.stock <= p.minStock && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Bajo stock
                        </span>
                      )}
                    </span>
                    {p.barcode && <span className="text-xs text-gray-500 font-normal tracking-wider mt-0.5">Ref: {p.barcode}</span>}
                  </div>
                </td>
                <td className="px-6 py-4">{formatMXN(p.sellPrice)}</td>
                <td className="px-6 py-4">{p.stock}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(p)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full mr-2">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(p.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!products?.length && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay productos. Agrega uno nuevo para empezar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form as any); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input required type="text" className="w-full border p-2 rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Código de Barras (Opcional)</label>
                  <input type="text" className="w-full border p-2 rounded" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Ej: 75010001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Precio de Compra</label>
                  <input required type="number" step="0.01" className="w-full border p-2 rounded" value={form.buyPrice} onChange={e => setForm({...form, buyPrice: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Precio de Venta</label>
                  <input required type="number" step="0.01" className="w-full border p-2 rounded" value={form.sellPrice} onChange={e => setForm({...form, sellPrice: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Inicial</label>
                  <input required type="number" disabled={!!editingProduct} className="w-full border p-2 rounded bg-gray-50 disabled:cursor-not-allowed" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Mínimo</label>
                  <input required type="number" className="w-full border p-2 rounded" value={form.minStock} onChange={e => setForm({...form, minStock: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancelar</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-md">
                  {mutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
