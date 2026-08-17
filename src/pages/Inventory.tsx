import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { 
  Plus, Edit2, Trash2, PackagePlus, Search, AlertCircle, 
  History, Boxes, ArrowDownRight, ArrowUpRight, Calendar, User, 
  Layers, Filter, ArrowRight, RefreshCw, Sparkles 
} from 'lucide-react';
import { formatMXN } from '../utils/format';

const Inventory = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'ENTRY' | 'INITIAL' | 'ADJUSTMENT'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Modal de Reabastecimiento rápido
  const [restockProduct, setRestockProduct] = useState<any>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockNotes, setRestockNotes] = useState<string>('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    barcode: '',
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    minStock: 5,
    notes: ''
  });

  // Query: Productos
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    }
  });

  // Query: Historial de Entradas de Stock
  const { data: stockEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['stock-entries'],
    queryFn: async () => {
      const { data } = await api.get('/products/entries');
      return data;
    }
  });

  // Mutación: Crear / Editar producto
  const mutation = useMutation({
    mutationFn: async (productData: any) => {
      if (editingProduct) {
        return api.put(`/products/${editingProduct.id}`, productData);
      }
      return api.post('/products', productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (error: any) => {
       alert(error.response?.data?.message || 'Error al guardar el producto');
    }
  });

  // Mutación: Reabastecer stock
  const restockMutation = useMutation({
    mutationFn: async ({ id, amount, notes }: { id: string; amount: number; notes?: string }) => {
      return api.post(`/products/${id}/adjust-stock`, { amount, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      setRestockProduct(null);
      setRestockQty(10);
      setRestockNotes('');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Error al actualizar el stock');
    }
  });

  // Mutación: Eliminar producto
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!window.confirm('¿Seguro que deseas eliminar este producto?')) {
        throw new Error('Cancelled');
      }
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
    }
  });

  const resetForm = () => setForm({ name: '', description: '', barcode: '', buyPrice: 0, sellPrice: 0, stock: 0, minStock: 5, notes: '' });

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      barcode: product.barcode || '',
      buyPrice: product.buyPrice || 0,
      sellPrice: product.sellPrice || 0,
      stock: product.stock || 0,
      minStock: product.minStock || 5,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenRestock = (product: any) => {
    setRestockProduct(product);
    setRestockQty(10);
    setRestockNotes('');
  };

  // Filtrado de catálogo
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((p: any) => 
      p.name?.toLowerCase().includes(term) ||
      p.barcode?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term)
    );
  }, [products, search]);

  // Filtrado de historial
  const filteredEntries = useMemo(() => {
    if (!stockEntries) return [];
    let list = stockEntries;
    
    if (historyTypeFilter !== 'ALL') {
      list = list.filter((e: any) => e.type === historyTypeFilter);
    }

    if (historySearch.trim()) {
      const term = historySearch.toLowerCase();
      list = list.filter((e: any) => 
        e.product?.name?.toLowerCase().includes(term) ||
        e.product?.barcode?.toLowerCase().includes(term) ||
        e.notes?.toLowerCase().includes(term) ||
        e.userName?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [stockEntries, historyTypeFilter, historySearch]);

  // Métricas del Historial
  const historyStats = useMemo(() => {
    if (!stockEntries || stockEntries.length === 0) {
      return { totalEntries: 0, totalUnits: 0, todayUnits: 0 };
    }
    const todayStr = new Date().toDateString();
    let totalUnits = 0;
    let todayUnits = 0;

    stockEntries.forEach((entry: any) => {
      const q = Math.max(0, entry.quantity || 0);
      totalUnits += q;
      if (new Date(entry.createdAt).toDateString() === todayStr) {
        todayUnits += q;
      }
    });

    return {
      totalEntries: stockEntries.length,
      totalUnits,
      todayUnits
    };
  }, [stockEntries]);

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Control de Inventario</h2>
          <p className="text-sm text-gray-500 mt-1">
            Administra catálogo, existencias y audita el historial de entradas en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar Producto
          </button>
        </div>
      </div>

      {/* Tabs Selector: Catálogo vs Historial de Entradas */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'border-black text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Catálogo de Productos
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 font-semibold">
            {products?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'border-black text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <History className="w-4 h-4 text-emerald-600" />
          Historial de Entradas
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            {stockEntries?.length || 0}
          </span>
        </button>
      </div>

      {/* VISTA 1: CATÁLOGO DE PRODUCTOS */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Buscador de catálogo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative max-w-md flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar producto por nombre o código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm"
              />
            </div>
            <div className="text-xs text-gray-500">
              Mostrando <strong>{filteredProducts.length}</strong> de <strong>{products?.length || 0}</strong> productos
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Producto / Código</th>
                  <th className="px-6 py-3.5 font-semibold">Precio Compra</th>
                  <th className="px-6 py-3.5 font-semibold">Precio Venta</th>
                  <th className="px-6 py-3.5 font-semibold">Stock Actual</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts?.map((p: any) => {
                  const isLowStock = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className="bg-white hover:bg-gray-50/75 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{p.name}</span>
                          {p.barcode ? (
                            <span className="text-xs text-gray-500 font-mono tracking-wider mt-0.5">Ref: {p.barcode}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin código</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatMXN(p.buyPrice || 0)}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{formatMXN(p.sellPrice)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isLowStock 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {p.stock} unidades
                          </span>
                          {isLowStock && (
                            <span className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Bajo stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón rápido de reabastecimiento */}
                          <button
                            onClick={() => handleOpenRestock(p)}
                            title="Reabastecer stock (Agregar unidades)"
                            className="flex items-center gap-1 bg-gray-100 hover:bg-black hover:text-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            <PackagePlus className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                            <span>+ Stock</span>
                          </button>

                          {/* Editar producto completo */}
                          <button 
                            onClick={() => handleEdit(p)} 
                            title="Editar producto"
                            className="text-gray-500 hover:text-black hover:bg-gray-100 p-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Eliminar producto */}
                          <button 
                            onClick={() => deleteMutation.mutate(p.id)} 
                            title="Eliminar producto"
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredProducts?.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {search ? 'No se encontraron productos con ese término.' : 'No hay productos en inventario. Agrega uno nuevo para empezar.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE ENTRADAS DE MERCANCÍA */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Entradas Registradas</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{historyStats.totalEntries}</p>
                <p className="text-xs text-gray-500 mt-0.5">Movimientos en el almacén</p>
              </div>
              <div className="p-3 bg-gray-100 text-gray-800 rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Unidades Ingresadas Hoy</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">+{historyStats.todayUnits}</p>
                <p className="text-xs text-gray-500 mt-0.5">Entradas del día de hoy</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <PackagePlus className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Histórico de Unidades</p>
                <p className="text-2xl font-black text-blue-600 mt-1">+{historyStats.totalUnits}</p>
                <p className="text-xs text-gray-500 mt-0.5">Suma total de mercancía ingresada</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Boxes className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filtros del Historial */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="relative max-w-md flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por producto, motivo o empleado..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={historyTypeFilter}
                onChange={(e: any) => setHistoryTypeFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="ALL">Todos los tipos de entrada</option>
                <option value="ENTRY">Reabastecimiento (+ Stock)</option>
                <option value="INITIAL">Registro Inicial de Producto</option>
                <option value="ADJUSTMENT">Ajuste de Existencias</option>
              </select>
            </div>
          </div>

          {/* Tabla de Historial de Entradas */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Fecha y Hora</th>
                  <th className="px-6 py-3.5 font-semibold">Producto</th>
                  <th className="px-6 py-3.5 font-semibold">Cantidad Ingresada</th>
                  <th className="px-6 py-3.5 font-semibold">Evolución de Stock</th>
                  <th className="px-6 py-3.5 font-semibold">Motivo / Tipo</th>
                  <th className="px-6 py-3.5 font-semibold">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries?.map((entry: any) => {
                  const isPositive = (entry.quantity || 0) >= 0;
                  const dateObj = new Date(entry.createdAt);

                  return (
                    <tr key={entry.id} className="bg-white hover:bg-gray-50/75 transition-colors">
                      {/* Fecha y Hora */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-900 text-xs">
                              {dateObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-[11px] text-gray-500 font-mono">
                              {dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Producto */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">
                            {entry.product?.name || 'Producto no especificado'}
                          </span>
                          {entry.product?.barcode && (
                            <span className="text-[11px] text-gray-500 font-mono">Ref: {entry.product.barcode}</span>
                          )}
                        </div>
                      </td>

                      {/* Cantidad Ingresada */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black shadow-2xs ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${entry.quantity}` : entry.quantity} uds
                        </span>
                      </td>

                      {/* Evolución de Stock */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-gray-500">{entry.previousStock || 0}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                            {entry.newStock || 0} uds
                          </span>
                        </div>
                      </td>

                      {/* Motivo / Notas */}
                      <td className="px-6 py-4">
                        <div>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider mb-1 ${
                            entry.type === 'INITIAL' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : entry.type === 'ENTRY'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {entry.type === 'INITIAL' ? 'Registro Inicial' : entry.type === 'ENTRY' ? 'Reabastecimiento' : 'Ajuste'}
                          </span>
                          <p className="text-xs text-gray-600">{entry.notes || '—'}</p>
                        </div>
                      </td>

                      {/* Registrado por */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium text-gray-800">{entry.userName || 'Administrador'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filteredEntries?.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <History className="w-10 h-10 text-gray-300" />
                        <p className="font-semibold text-gray-700">No hay movimientos de entrada registrados.</p>
                        <p className="text-xs text-gray-400">
                          Cada vez que agregues stock con el botón <strong>+ Stock</strong> o crees productos, quedará registrado aquí automáticamente.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Reabastecimiento Rápido de Stock */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="p-2.5 bg-black text-white rounded-xl">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reabastecer Stock</h3>
                <p className="text-xs text-gray-500">Ingreso de mercancía al almacén</p>
              </div>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                restockMutation.mutate({ 
                  id: restockProduct.id, 
                  amount: Number(restockQty),
                  notes: restockNotes || 'Reabastecimiento de mercancía'
                });
              }} 
              className="mt-4 space-y-4"
            >
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Producto seleccionado</p>
                <p className="text-sm font-bold text-gray-900">{restockProduct.name}</p>
                <p className="text-xs text-gray-600">Stock actual en sistema: <strong>{restockProduct.stock} unidades</strong></p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ¿Cuántas unidades deseas ingresar?
                </label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    min="1"
                    required
                    autoFocus
                    value={restockQty}
                    onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                {/* Botones de incremento rápido */}
                <div className="flex gap-2 mt-2">
                  {[5, 10, 20, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setRestockQty(qty)}
                      className={`flex-1 py-1 text-xs rounded-lg font-semibold border transition-colors ${
                        restockQty === qty ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nota / Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Compra proveedor Coca-Cola, factura #123"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Vista previa del stock resultante */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium">
                <span>Nuevo stock total estimado:</span>
                <strong className="text-sm text-emerald-700">
                  {Math.max(0, (restockProduct.stock || 0) + (Number(restockQty) || 0))} unidades
                </strong>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setRestockProduct(null)} 
                  className="px-4 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={restockMutation.isPending || restockQty <= 0} 
                  className="px-5 py-2.5 text-sm text-white bg-black hover:bg-gray-800 rounded-xl font-bold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {restockMutation.isPending ? 'Guardando...' : `Confirmar Entrada (+${restockQty})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Crear o Editar Producto Completo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              {editingProduct ? 'Modifica los datos o actualiza las existencias de este producto' : 'Ingresa los datos para registrar un nuevo producto en el catálogo'}
            </p>

            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form as any); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    placeholder="Ej. Agua Ciel 1L"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Código de Barras (Opcional)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" 
                    value={form.barcode} 
                    onChange={e => setForm({...form, barcode: e.target.value})} 
                    placeholder="Ej. 75010001" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descripción (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder="Detalles o presentación del producto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Precio de Compra</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" 
                    value={form.buyPrice} 
                    onChange={e => setForm({...form, buyPrice: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Precio de Venta</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" 
                    value={form.sellPrice} 
                    onChange={e => setForm({...form, sellPrice: parseFloat(e.target.value) || 0})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {editingProduct ? 'Stock Total' : 'Stock Inicial'}
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black" 
                    value={form.stock} 
                    onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Stock Mínimo (Alerta)</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" 
                    value={form.minStock} 
                    onChange={e => setForm({...form, minStock: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>

              {editingProduct && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs text-gray-600 font-medium mb-1.5">Sumar al stock actual ({form.stock}):</p>
                  <div className="flex gap-2">
                    {[5, 10, 20, 50].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, stock: (f.stock || 0) + inc }))}
                        className="px-2.5 py-1 bg-white border border-gray-300 hover:border-black rounded-lg text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={mutation.isPending} 
                  className="px-5 py-2.5 text-sm text-white bg-black hover:bg-gray-800 rounded-xl font-bold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {mutation.isPending ? 'Guardando...' : 'Guardar Producto'}
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
