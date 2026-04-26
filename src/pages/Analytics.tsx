import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, parseISO, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, Download, PieChart, Activity } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatMXN } from '../utils/format';

const exportGeneralReport = (sales: any[], chartData: any[], topProducts: any[], predictions: any[], period: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text("Reporte Avanzado de Cierre", 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Periodo evaluado: Últimos ${period} días`, 14, 28);
  doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 34);

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Ingreso Bruto del Periodo: ${formatMXN(totalRevenue)}`, 14, 45);

  (doc as any).autoTable({
    startY: 55,
    head: [['Día/Fecha', 'Total de Ventas ($)']],
    body: chartData.map(d => [d.date, formatMXN(d.total)]),
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.text("Top 10 Productos Más Vendidos", 14, finalY1);
  
  (doc as any).autoTable({
    startY: finalY1 + 5,
    head: [['Producto', 'Unidades Vendidas', 'Ingreso Generado ($)']],
    body: topProducts.slice(0, 10).map(p => [p.name, p.qty.toString(), formatMXN(p.revenue)]),
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96] }
  });

  const finalY2 = (doc as any).lastAutoTable.finalY + 15;
  
  if (finalY2 > 250) {
    doc.addPage();
  }
  
  const predictiveY = finalY2 > 250 ? 20 : finalY2;

  doc.setFontSize(14);
  doc.text("Predicciones de Inventario (Próximos 7 días)", 14, predictiveY);
  
  (doc as any).autoTable({
    startY: predictiveY + 5,
    head: [['Producto', 'Media Diaria (µ)', 'Desviación (σ)', 'Demanda Estimada (7d)']],
    body: predictions.slice(0, 15).map(p => [
      p.name, 
      p.mean.toFixed(2), 
      p.stdDev.toFixed(2), 
      `${Math.ceil(p.estimated7d)} unid.`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [142, 68, 173] }
  });

  doc.save(`reporte-cierre-${Date.now()}.pdf`);
};

const Analytics = () => {
  const [daysRange, setDaysRange] = useState(30);

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data } = await api.get('/sales');
      return data;
    }
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    }
  });

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    const cutoffDate = startOfDay(subDays(new Date(), daysRange));
    return sales.filter((s: any) => parseISO(s.createdAt) >= cutoffDate);
  }, [sales, daysRange]);

  // Aggregate daily sales for chart
  const dailyChartData = useMemo(() => {
    if (!filteredSales.length) return [];
    const grouped = filteredSales.reduce((acc: any, sale: any) => {
      const date = format(parseISO(sale.createdAt), 'dd MMM', { locale: es });
      if (!acc[date]) acc[date] = 0;
      acc[date] += sale.total;
      return acc;
    }, {});
    return Object.entries(grouped).map(([date, total]) => ({ date, total }));
  }, [filteredSales]);

  // Top Products
  const topProducts = useMemo(() => {
    if (!filteredSales.length) return [];
    const prodMap: any = {};
    
    filteredSales.forEach((s: any) => {
      s.items?.forEach((item: any) => {
        const id = item.productId;
        if (!prodMap[id]) {
          prodMap[id] = { name: item.product?.name || 'Desconocido', qty: 0, revenue: 0 };
        }
        prodMap[id].qty += item.quantity;
        prodMap[id].revenue += (item.quantity * item.price);
      });
    });

    return Object.values(prodMap).sort((a: any, b: any) => b.qty - a.qty);
  }, [filteredSales]);

  // Predictive Logic
  const predictions = useMemo(() => {
    if (!filteredSales.length || !products) return [];

    // First map daily consumption per product
    const dailyConsumption: Record<string, Record<string, number>> = {}; 
    const datesSet = new Set<string>();

    filteredSales.forEach((s: any) => {
      const dateKey = startOfDay(parseISO(s.createdAt)).toISOString();
      datesSet.add(dateKey);
      s.items?.forEach((item: any) => {
         if (!dailyConsumption[item.productId]) dailyConsumption[item.productId] = {};
         if (!dailyConsumption[item.productId][dateKey]) dailyConsumption[item.productId][dateKey] = 0;
         dailyConsumption[item.productId][dateKey] += item.quantity;
      });
    });

    const activeDaysCount = Math.max(datesSet.size, 1);

    const stats = products.map((p: any) => {
      const counts = Array.from(datesSet).map(date => dailyConsumption[p.id]?.[date] || 0);
      
      const sum = counts.reduce((a,b) => a+b, 0);
      const mean = sum / activeDaysCount;
      
      const variance = counts.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / activeDaysCount;
      const stdDev = Math.sqrt(variance);

      // Safe estimate = mean + stdDev (per day). Multiplied by 7 for weekly.
      // This ensures 84% confidence demand coverage assuming normal distribution.
      const estimated7d = Math.max((mean + stdDev) * 7, 0);

      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        mean,
        stdDev,
        estimated7d
      };
    }).sort((a: any, b: any) => b.estimated7d - a.estimated7d);

    return stats.filter((s:any) => s.estimated7d > 0);
  }, [filteredSales, products]);

  if (isLoading) return <div className="p-8">Cargando métricas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Analítica Avanzada</h2>
        <div className="flex items-center gap-4">
          <select 
            className="border-gray-200 rounded-md border text-sm px-3 py-2 bg-white"
            value={daysRange} 
            onChange={(e) => setDaysRange(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <button 
            onClick={() => exportGeneralReport(filteredSales, dailyChartData, topProducts, predictions, daysRange.toString())}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar Reporte PDF
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Gráfico principal */}
        <div className="col-span-2 rounded-xl border bg-white shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500"/> Retorno en Ventas</h3>
            <span className="text-sm text-gray-500 font-medium">Volumen Diario</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} tickFormatter={(value) => formatMXN(value)} />
                <RechartsTooltip 
                  formatter={(value: number) => [formatMXN(value), 'Ventas']} 
                />
                <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Productos Chart */}
        <div className="rounded-xl border bg-white shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><PieChart className="w-5 h-5 text-green-500"/> Best Sellers</h3>
          </div>
          <div className="flex-1 h-[300px]">
             {topProducts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400">Sin datos</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#374151'}} width={90} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: '#F3F4F6'}} formatter={(value: number) => [`${value} uds.`, 'Vendido']} />
                    <Bar dataKey="qty" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      {/* Predictions */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
         <div className="p-6 border-b bg-gray-50 flex items-start gap-4">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
               <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Demanda Estimada y Reabastecimiento (Próximos 7 días)</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-4xl">
                Esta tabla utiliza estadística descriptiva (media y desviación estándar) sobre tus ventas diarias dentro del rango de fechas seleccionado para proyectar métricas con un margen de seguridad estadístico (84% intervalo de confianza). Si el inventario actual es menor a la demanda estimada, te sugerimos comprar stock.
              </p>
            </div>
         </div>
         <div className="p-0 overflow-x-auto">
           <table className="w-full text-sm text-left">
             <thead className="text-xs text-gray-700 bg-gray-100 border-b">
                <tr>
                   <th className="px-6 py-4">Producto</th>
                   <th className="px-6 py-4 text-center">Media Diaria (µ)</th>
                   <th className="px-6 py-4 text-center">Desviación (σ)</th>
                   <th className="px-6 py-4 bg-purple-50 text-center text-purple-900">Demanda Estimada (7d)</th>
                   <th className="px-6 py-4 text-center">Inventario Actual</th>
                   <th className="px-6 py-4 text-right">Estatus Sugerido</th>
                </tr>
             </thead>
             <tbody>
                {predictions.map((p: any) => {
                   const mustRestock = p.stock < p.estimated7d;
                   return (
                     <tr key={p.id} className="border-b bg-white hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{p.mean.toFixed(2)} uds</td>
                        <td className="px-6 py-4 text-center text-gray-500">± {p.stdDev.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center font-bold text-purple-700 bg-purple-50/30">{Math.ceil(p.estimated7d)} uds</td>
                        <td className="px-6 py-4 text-center font-semibold">{p.stock} uds</td>
                        <td className="px-6 py-4 text-right">
                           {mustRestock ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Comprar a proveedor</span>
                           ) : (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Stock Saludable</span>
                           )}
                        </td>
                     </tr>
                   )
                })}
                {predictions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Vende al menos un producto para comenzar a generar proyecciones estadísticas.
                    </td>
                  </tr>
                )}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};

export default Analytics;
