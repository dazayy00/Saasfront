import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Package, AlertCircle, DollarSign, FileText, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatMXN } from '../utils/format';

const downloadPeriodSummary = (title: string, data: any[]) => {
  if (!data.length) return;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text(`Resumen de Ventas: ${title}`, 14, 20);
  
  const tableData = data.map((d) => {
    const periodLabel = d.date || d.period || d.month || 'N/A';
    const productsStr = d.products ? Object.entries(d.products).map(([p, q]) => `${p} (x${q})`).join(', ') : '';
    return [periodLabel, formatMXN(d.total||0), productsStr];
  });

  (doc as any).autoTable({
    startY: 30,
    head: [['Período', 'Ganancia Bruta', 'Desglose de Productos']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    columnStyles: { 2: { cellWidth: 100 } }
  });

  doc.save(`resumen-${title.toLowerCase().replace(/ /g, '-')}-${Date.now()}.pdf`);
};

const downloadTicket = (sale: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 250]
  });

  doc.setFontSize(16);
  doc.text("SaaS Inventory", 40, 10, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Ticket #${sale.id.slice(-5).toUpperCase()}`, 40, 16, { align: 'center' });
  doc.text(`Fecha: ${new Date(sale.createdAt).toLocaleString()}`, 40, 20, { align: 'center' });

  const tableData = sale.items?.map((i: any) => [
    i.product?.name?.substring(0, 15) || 'Item',
    i.quantity.toString(),
    formatMXN(i.price),
    formatMXN(i.quantity * i.price)
  ]) || [];

  (doc as any).autoTable({
    startY: 25,
    head: [['Prod', 'Cant', 'Precio', 'Total']],
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1, halign: 'left' },
    headStyles: { fontStyle: 'bold' },
    margin: { left: 5, right: 5 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 30;
  
  doc.setFontSize(12);
  doc.text(`TOTAL: ${formatMXN(sale.total)}`, 40, finalY + 10, { align: 'center' });
  doc.setFontSize(10);
  doc.text("¡Gracias por su compra!", 40, finalY + 20, { align: 'center' });

  doc.save(`ticket-${sale.id.slice(-5)}.pdf`);
};

const Dashboard = () => {
  const [historyMode, setHistoryMode] = useState<'tickets' | 'daily' | 'weekly' | 'monthly'>('tickets');
  const [showAllTickets, setShowAllTickets] = useState(false);

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
    const saleDate = new Date(s.createdAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    return saleDate === today;
  }) || [];

  const totalSalesToday = todaySales.reduce((acc: number, sale: any) => acc + sale.total, 0);

  const dailyHistory = useMemo(() => {
    if (!sales) return [];
    const grouped = sales.reduce((acc: any, sale: any) => {
      const date = new Date(sale.createdAt).toLocaleDateString();
      if (!acc[date]) acc[date] = { total: 0, products: {} };
      acc[date].total += sale.total;
      
      sale.items?.forEach((item: any) => {
        const pName = item.product?.name || 'Item';
        if (!acc[date].products[pName]) acc[date].products[pName] = 0;
        acc[date].products[pName] += item.quantity;
      });

      return acc;
    }, {});
    return Object.entries(grouped)
        .map(([date, data]: any) => ({ date, total: data.total, products: data.products }))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales]);

  const weeklyHistory = useMemo(() => {
    if (!sales) return [];
    const grouped = sales.reduce((acc: any, sale: any) => {
      const date = new Date(sale.createdAt);
      const startDate = new Date(date.getFullYear(), 0, 1);
      var days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      var weekNum = Math.ceil(days / 7);
      
      const weekStr = `Semana ${weekNum}, ${date.getFullYear()}`;
      if (!acc[weekStr]) acc[weekStr] = { total: 0, products: {} };
      acc[weekStr].total += sale.total;
      
      sale.items?.forEach((item: any) => {
        const pName = item.product?.name || 'Item';
        if (!acc[weekStr].products[pName]) acc[weekStr].products[pName] = 0;
        acc[weekStr].products[pName] += item.quantity;
      });

      return acc;
    }, {});
    return Object.entries(grouped)
        .map(([period, data]: any) => ({ period, total: data.total, products: data.products }))
        // no strict sorting here to keep it simple, it's mostly visual
        .reverse();
  }, [sales]);

  const monthlyHistory = useMemo(() => {
    if (!sales) return [];
    const grouped = sales.reduce((acc: any, sale: any) => {
      const date = new Date(sale.createdAt);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!acc[monthYear]) acc[monthYear] = { total: 0, products: {} };
      acc[monthYear].total += sale.total;

      sale.items?.forEach((item: any) => {
        const pName = item.product?.name || 'Item';
        if (!acc[monthYear].products[pName]) acc[monthYear].products[pName] = 0;
        acc[monthYear].products[pName] += item.quantity;
      });

      return acc;
    }, {});
    return Object.entries(grouped).map(([month, data]: any) => ({ month, total: data.total, products: data.products }));
  }, [sales]);

  return (
    <div className="space-y-6 relative">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Ventas de Hoy</h3>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{formatMXN(totalSalesToday)}</div>
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
        <div className="col-span-4 rounded-xl border bg-white shadow-sm flex flex-col">
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="font-semibold leading-none tracking-tight">Historial de Ventas</h3>
            
            <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded-lg mt-4 mb-4">
              <div className="flex gap-1 flex-1">
                <button onClick={() => setHistoryMode('tickets')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'tickets' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Tickets</button>
                <button onClick={() => setHistoryMode('daily')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'daily' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Diario</button>
                <button onClick={() => setHistoryMode('weekly')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'weekly' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Semanal</button>
                <button onClick={() => setHistoryMode('monthly')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'monthly' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Mensual</button>
              </div>
              {historyMode === 'tickets' ? (
                <button onClick={() => setShowAllTickets(true)} className="ml-4 px-3 py-1.5 text-sm text-blue-600 hover:underline flex items-center gap-1.5 font-medium whitespace-nowrap">
                  <FileText className="w-4 h-4"/> Todos los tickets
                </button>
              ) : (
                <button onClick={() => downloadPeriodSummary(historyMode, historyMode === 'daily' ? dailyHistory : historyMode === 'weekly' ? weeklyHistory : monthlyHistory)} className="ml-4 px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors flex items-center gap-1.5 font-medium whitespace-nowrap">
                  Descargar PDF
                </button>
              )}
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {historyMode === 'tickets' && (
                 <>
                   {sales?.slice(0, 5).map((sale: any) => (
                    <div key={sale.id} className="flex flex-col border border-gray-100 bg-gray-50/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Ticket #{sale.id.slice(-5).toUpperCase()}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-blue-600">+{formatMXN(sale.total)}</div>
                          <button onClick={() => downloadTicket(sale)} className="text-[10px] uppercase font-bold tracking-wider rounded border bg-white px-2 py-1 text-gray-600 hover:text-black hover:border-black transition-colors">PDF</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!sales?.length && <p className="text-sm text-gray-500 text-center py-4">No hay ventas registradas.</p>}
                 </>
              )}

              {historyMode === 'daily' && (
                <>
                  {dailyHistory.slice(0, 7).map((day: any) => (
                    <div key={day.date} className="flex flex-col border-b pb-3 pt-1">
                       <div className="flex items-center justify-between">
                         <span className="font-semibold text-sm">{day.date}</span>
                         <span className="font-bold text-blue-600">+{formatMXN(Number(day.total))}</span>
                       </div>
                       <div className="mt-2 flex flex-wrap gap-1">
                         {day.products && Object.entries(day.products).map(([pName, qty]: any) => (
                            <span key={pName} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                              {pName} x{qty}
                            </span>
                         ))}
                       </div>
                    </div>
                  ))}
                  {!dailyHistory.length && <p className="text-sm text-gray-500 text-center py-4">No hay datos diarios.</p>}
                </>
              )}

              {historyMode === 'weekly' && (
                <>
                  {weeklyHistory.map((week: any) => (
                    <div key={week.period} className="flex flex-col border-b pb-3 pt-1">
                       <div className="flex items-center justify-between">
                         <span className="font-semibold text-sm">{week.period}</span>
                         <span className="font-bold text-blue-600">+{formatMXN(Number(week.total))}</span>
                       </div>
                       <div className="mt-2 flex flex-wrap gap-1">
                         {week.products && Object.entries(week.products).map(([pName, qty]: any) => (
                            <span key={pName} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                              {pName} x{qty}
                            </span>
                         ))}
                       </div>
                    </div>
                  ))}
                  {!weeklyHistory.length && <p className="text-sm text-gray-500 text-center py-4">No hay datos semanales.</p>}
                </>
              )}

              {historyMode === 'monthly' && (
                <>
                  {monthlyHistory.map((month: any) => (
                    <div key={month.month} className="flex flex-col border-b pb-3 pt-1">
                       <div className="flex items-center justify-between">
                         <span className="font-semibold text-sm">{month.month}</span>
                         <span className="font-bold text-blue-600">+{formatMXN(Number(month.total))}</span>
                       </div>
                       <div className="mt-2 flex flex-wrap gap-1">
                         {month.products && Object.entries(month.products).map(([pName, qty]: any) => (
                            <span key={pName} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                              {pName} x{qty}
                            </span>
                         ))}
                       </div>
                    </div>
                  ))}
                  {!monthlyHistory.length && <p className="text-sm text-gray-500 text-center py-4">No hay datos mensuales.</p>}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-white shadow-sm flex flex-col">
          <div className="p-6 flex-1">
            <h3 className="font-semibold leading-none tracking-tight">Atención Requerida (Stock)</h3>
            <div className="mt-4 space-y-4">
               {lowStockProducts.slice(0, 5).map((prod: any) => (
                <div key={prod.id} className="flex items-center justify-between p-3 border border-red-100 bg-red-50/30 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{prod.name}</p>
                    <p className="text-xs text-red-600 font-medium">Stock actual: {prod.stock}</p>
                  </div>
                  <div className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded">Min: {prod.minStock}</div>
                </div>
              ))}
              {!lowStockProducts.length && <p className="text-sm text-gray-500 text-center py-8">El inventario está saludable.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Modal - Todos los tickets */}
      {showAllTickets && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold">Todos los Tickets</h3>
                <button onClick={() => setShowAllTickets(false)} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                 {sales?.map((sale: any) => (
                   <div key={sale.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                      <div className="mb-2 md:mb-0">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                           Ticket #{sale.id.slice(-5).toUpperCase()}
                           <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{sale.items?.length || 0} items</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(sale.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end gap-2">
                         <div className="font-extrabold text-blue-600 text-lg">
                            {formatMXN(sale.total)}
                         </div>
                         <button onClick={() => downloadTicket(sale)} className="text-xs bg-black text-white px-3 py-1.5 rounded-md font-medium hover:bg-gray-800 transition-colors">
                           Descargar PDF
                         </button>
                      </div>
                   </div>
                 ))}
                 {!sales?.length && (
                   <div className="text-center py-10 text-gray-500">
                     No hay tickets para mostrar.
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
