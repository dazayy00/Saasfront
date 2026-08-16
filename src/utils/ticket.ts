import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatMXN } from './format';

export const downloadTicket = (sale: any, businessName?: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 250]
  });

  const title = (businessName && businessName.trim()) || 'Mi Negocio';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const ticketNumber = sale.id ? sale.id.slice(-5).toUpperCase() : 'N/A';
  doc.text(`Ticket #${ticketNumber}`, 40, 16, { align: 'center' });
  doc.text(`Fecha: ${new Date(sale.createdAt || Date.now()).toLocaleString('es-MX')}`, 40, 20, { align: 'center' });

  const tableData = sale.items?.map((i: any) => [
    i.product?.name?.substring(0, 15) || 'Producto',
    (i.quantity || 1).toString(),
    formatMXN(i.price || 0),
    formatMXN((i.quantity || 1) * (i.price || 0))
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

  const finalY = (doc as any).lastAutoTable?.finalY || 30;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: ${formatMXN(sale.total || 0)}`, 40, finalY + 10, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("¡Gracias por su compra!", 40, finalY + 20, { align: 'center' });

  doc.save(`ticket-${ticketNumber.toLowerCase()}.pdf`);
};
