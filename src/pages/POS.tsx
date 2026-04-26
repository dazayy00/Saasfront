import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import { formatMXN } from '../utils/format';

const POS = () => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    }
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      const items = cart.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
        price: i.product.sellPrice
      }));
      return api.post('/sales', { items });
    },
    onSuccess: () => {
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      alert('Venta procesada con éxito!');
    }
  });

  const addToCart = (product: any) => {
    const existing = cart.find(i => i.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert('Stock insuficiente');
        return;
      }
      setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (product.stock <= 0) {
         alert('Producto sin stock');
         return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const decreaseQuantity = (productId: string) => {
    setCart(cart.map(i => {
      if (i.product.id === productId) {
        return { ...i, quantity: i.quantity - 1 };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(i => i.product.id !== productId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const exactMatch = products?.find((p: any) => p.barcode === searchQuery.trim());
      if (exactMatch) {
         addToCart(exactMatch);
         setSearchQuery('');
      } else {
         // Si no es un código exacto pero la búsqueda retorna 1 solo producto por nombre, podríamos agregarlo (opcional)
         const matches = products?.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
         if (matches && matches.length === 1) {
            addToCart(matches[0]);
            setSearchQuery('');
         }
      }
    }
  };

  const total = cart.reduce((acc, i) => acc + (i.product.sellPrice * i.quantity), 0);
  
  const filteredProducts = products?.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchQuery))
  ) || [];

  return (
    <div className="h-full flex gap-6">
      {/* Listado de Productos */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Punto de Venta</h2>
          <input 
            type="text" 
            placeholder="Buscar por nombre o escanear código de barras..." 
            className="mt-4 w-full border p-2 rounded bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 ring-black"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p: any) => (
              <button 
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className="flex flex-col items-center justify-center p-4 rounded-lg border hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white relative"
              >
                {p.barcode && <span className="absolute top-2 right-2 text-[10px] text-gray-400 font-medium">Ref: {p.barcode}</span>}
                <div className="font-semibold text-gray-900 text-center">{p.name}</div>
                <div className="text-blue-600 font-bold">{formatMXN(p.sellPrice)}</div>
                <div className="text-xs text-gray-500 mt-2">Stock: {p.stock}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket / Cart */}
      <div className="w-96 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5"/> Ticket</h3>
          <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">{cart.length} items</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
             <div className="h-full flex items-center justify-center text-gray-400 text-sm">
               Carrito vacío
             </div>
          ) : (
             <div className="space-y-2">
               {cart.map((item) => (
                 <div key={item.product.id} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-gray-900">{item.product.name}</div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4"/>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg w-fit px-1 py-1">
                        <button onClick={() => decreaseQuantity(item.product.id)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-black transition-colors">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item.product)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-black transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-bold text-sm text-blue-600">
                          {formatMXN(item.quantity * item.product.sellPrice)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {formatMXN(item.product.sellPrice)} c/u
                        </div>
                      </div>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
        <div className="p-4 border-t bg-gray-50">
           <div className="flex items-center justify-between mb-4">
             <span className="text-xl font-bold">Total</span>
             <span className="text-3xl font-black">{formatMXN(total)}</span>
           </div>
           <button 
             onClick={() => saleMutation.mutate()}
             disabled={cart.length === 0 || saleMutation.isPending}
             className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
             {saleMutation.isPending ? 'Procesando...' : 'Cobrar e Imprimir Ticket'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default POS;
