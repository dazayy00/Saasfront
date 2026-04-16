import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Package, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    }
  });

  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data } = await api.get('/sales');
      return data;
    }
  });

  const lowStockProducts = products?.filter((p: any) => p.stock <= p.minStock) || [];
  const todaySales = sales?.filter((s: any) => {
    // simplificación: validamos que la fecha sea de hoy
    const saleDate = new Date(s.createdAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    return saleDate === today;
  }) || [];

  const totalSalesToday = todaySales.reduce((acc: number, sale: any) => acc + sale.total, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Ventas de Hoy</h3>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">${totalSalesToday.toFixed(2)}</div>
          <p className="text-xs text-gray-500">{todaySales.length} transacciones registradas</p>
        </div>

        <div className="rounded-xl border bg-white text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Productos Activos</h3>
            <Package className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{products?.length || 0}</div>
          <p className="text-xs text-gray-500">En el inventario</p>
        </div>

        <div className="rounded-xl border bg-white text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Alertas de Stock</h3>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
          <p className="text-xs text-gray-500">Bajo el mínimo sugerido</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-white shadow-sm">
          <div className="p-6">
            <h3 className="font-semibold leading-none tracking-tight">Últimas Ventas</h3>
            <div className="mt-4 space-y-4">
              {sales?.slice(0, 5).map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-sm font-medium leading-none">Venta</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="font-medium">+${sale.total.toFixed(2)}</div>
                </div>
              ))}
              {!sales?.length && <p className="text-sm text-gray-500">No hay ventas registradas.</p>}
            </div>
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-white shadow-sm">
          <div className="p-6">
            <h3 className="font-semibold leading-none tracking-tight">Atención Requerida (Stock)</h3>
            <div className="mt-4 space-y-4">
               {lowStockProducts.slice(0, 5).map((prod: any) => (
                <div key={prod.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{prod.name}</p>
                    <p className="text-sm text-red-500">Stock actual: {prod.stock}</p>
                  </div>
                  <div className="text-sm font-medium text-gray-500">Min: {prod.minStock}</div>
                </div>
              ))}
              {!lowStockProducts.length && <p className="text-sm text-gray-500">El inventario está saludable.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
