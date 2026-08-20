import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useAuthStore } from '../store/authStore';
import { Package, AlertCircle, DollarSign, FileText, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatMXN } from '../utils/format';
import { downloadTicket } from '../utils/ticket';

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

const downloadPeriodSummary = (mode: string, data: any[]) => {
  if (!data.length) return;

  const periodLabel = PERIOD_LABELS[mode] || mode;
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageW, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Resumen ${periodLabel} de Ventas`, 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el ${dateStr}`, 14, 24);

  // ── Totals summary ──────────────────────────────────────────
  const grandTotal = data.reduce((sum, d) => sum + (d.total || 0), 0);
  const totalTx = data.length;

  doc.setTextColor(17, 17, 17);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, 38, pageW - 28, 20, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total general:', 18, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(formatMXN(grandTotal), 55, 50);

  doc.setFont('helvetica', 'bold');
  doc.text(`Períodos registrados:`, pageW / 2, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalTx}`, pageW / 2 + 42, 50);

  // ── Table ───────────────────────────────────────────────────
  const tableData = data.map((d) => {
    const periodKey = d.date || d.period || d.month || 'N/A';
    const productsStr = d.products
      ? Object.entries(d.products)
          .sort((a: any, b: any) => b[1] - a[1])
          .map(([name, qty]) => `• ${name}  ×${qty}`)
          .join('\n')
      : '—';
    return [periodKey, formatMXN(d.total || 0), productsStr];
  });

  (doc as any).autoTable({
    startY: 64,
    head: [['Período', 'Total de Ventas', 'Productos Vendidos']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [17, 17, 17],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, valign: 'top' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },
      1: { cellWidth: 38, halign: 'right' },
      2: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ───────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Página ${i} de ${pageCount}  |  Resumen ${periodLabel}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`resumen-${periodLabel.toLowerCase()}-${Date.now()}.pdf`);
};

// ── helpers for default date values ─────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);
const currentWeekISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
};
const currentMonthISO = () => new Date().toISOString().slice(0, 7);

const Dashboard = () => {
  const { user } = useAuthStore();
  const [historyMode, setHistoryMode] = useState<'tickets' | 'daily' | 'weekly' | 'monthly'>('tickets');
  const [showAllTickets, setShowAllTickets] = useState(false);

  // Period selectors
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekISO);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const businessName = settings?.business?.name || user?.businessName || 'Mi Negocio';

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
            
            {/* ── Mode tabs ── */}
            <div className="flex gap-1 bg-gray-50 p-1.5 rounded-lg mt-4">
              <button onClick={() => setHistoryMode('tickets')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'tickets' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Tickets</button>
              <button onClick={() => setHistoryMode('daily')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'daily' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Diario</button>
              <button onClick={() => setHistoryMode('weekly')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'weekly' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Semanal</button>
              <button onClick={() => setHistoryMode('monthly')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${historyMode === 'monthly' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Mensual</button>
            </div>

            {/* ── Period selector + download ── */}
            <div className="mt-3 mb-4 flex items-center gap-2">
              {historyMode === 'tickets' && (
                <button onClick={() => setShowAllTickets(true)} className="px-3 py-1.5 text-sm text-blue-600 hover:underline flex items-center gap-1.5 font-medium">
                  <FileText className="w-4 h-4"/> Todos los tickets
                </button>
              )}

              {historyMode === 'daily' && (
                <>
                  <label className="text-xs font-medium text-gray-500">Selecciona el día:</label>
                  <input
                    id="daily-date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                  <button
                    onClick={() => {
                      // selectedDate is ISO "2026-08-17"; dailyHistory stores locale dates e.g. "17/8/2026"
                      // Add T12:00 to avoid timezone shifting the day
                      const localeDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString();
                      const entry = dailyHistory.find((d: any) => d.date === localeDate);
                      if (entry) downloadPeriodSummary('daily', [entry]);
                      else alert('No hay ventas para ese día.');
                    }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </button>
                </>
              )}

              {historyMode === 'weekly' && (
                <>
                  <label className="text-xs font-medium text-gray-500">Selecciona la semana:</label>
                  <input
                    id="weekly-week-picker"
                    type="week"
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                  <button
                    onClick={() => {
                      // Match "Semana N, YYYY" format stored in weeklyHistory
                      const [yearStr, wStr] = selectedWeek.split('-W');
                      const weekNum = parseInt(wStr, 10);
                      const label = `Semana ${weekNum}, ${yearStr}`;
                      const entry = weeklyHistory.find((w: any) => w.period === label);
                      if (entry) downloadPeriodSummary('weekly', [entry]);
                      else alert('No hay ventas para esa semana.');
                    }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </button>
                </>
              )}

              {historyMode === 'monthly' && (
                <>
                  <label className="text-xs font-medium text-gray-500">Selecciona el mes:</label>
                  <input
                    id="monthly-month-picker"
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                  <button
                    onClick={() => {
                      // Month stored as "M/YYYY" e.g. "8/2026"
                      const [yearStr, monthStr] = selectedMonth.split('-');
                      const monthKey = `${parseInt(monthStr, 10)}/${yearStr}`;
                      const entry = monthlyHistory.find((m: any) => m.month === monthKey);
                      if (entry) downloadPeriodSummary('monthly', [entry]);
                      else alert('No hay ventas para ese mes.');
                    }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </button>
                </>
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
                          <button onClick={() => downloadTicket(sale, businessName)} className="text-[10px] uppercase font-bold tracking-wider rounded border bg-white px-2 py-1 text-gray-600 hover:text-black hover:border-black transition-colors">PDF</button>
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
                          <button onClick={() => downloadTicket(sale, businessName)} className="text-xs bg-black text-white px-3 py-1.5 rounded-md font-medium hover:bg-gray-800 transition-colors">
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
