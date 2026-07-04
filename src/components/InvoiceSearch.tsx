import React, { useState, useRef } from 'react';
import { Search, Calendar, ChevronRight, FileDown, Edit3, Trash2, SlidersHorizontal, Info, Download, AlertCircle, FileText, CheckCircle, XCircle } from 'lucide-react';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { Invoice, User } from '../types';

interface InvoiceSearchProps {
  invoices: Invoice[];
  currentUser: User;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export default function InvoiceSearch({ invoices, currentUser, onEditInvoice, onDeleteInvoice, onSelectInvoice }: InvoiceSearchProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, PAID, UNPAID

  // Permissions check
  const canEdit = currentUser.role === 'admin' || currentUser.permissions.canEditInvoice;
  const canDelete = currentUser.role === 'admin' || currentUser.permissions.canDeleteInvoice;

  // Invoice calculations helper
  const getInvoiceTotals = (invoice: Invoice) => {
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = (subtotal * invoice.taxPercent) / 100;
    const grandTotal = subtotal + taxAmount - invoice.discount;
    return { subtotal, taxAmount, grandTotal };
  };

  // Filter logic
  const filteredInvoices = invoices.filter((inv) => {
    // Text search (Customer Name, Invoice No, Phone, Email, Agent)
    const matchesQuery = 
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientPhone.includes(searchQuery) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.agentName.toLowerCase().includes(searchQuery.toLowerCase());

    // Date Range (Invoice Date)
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && inv.invoiceDate >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && inv.invoiceDate <= endDate;
    }

    // Status Filter
    let matchesStatus = true;
    if (selectedStatus === 'PAID') {
      matchesStatus = inv.isPaid;
    } else if (selectedStatus === 'UNPAID') {
      matchesStatus = !inv.isPaid;
    }

    return matchesQuery && matchesDate && matchesStatus;
  });

  // Financial Summaries for active view
  const summary = filteredInvoices.reduce(
    (acc, inv) => {
      const { grandTotal } = getInvoiceTotals(inv);
      acc.total += grandTotal;
      if (inv.isPaid) {
        acc.paid += grandTotal;
      } else {
        acc.unpaid += grandTotal;
      }
      return acc;
    },
    { total: 0, paid: 0, unpaid: 0 }
  );

  // Export filtered table view to PNG
  const handleExportTablePng = async () => {
    if (!tableRef.current) return;
    setDownloading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const canvas = await safeHtml2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `SUMMARY-INVOICES-TABLE.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting table to PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      
      {/* Title block */}
      <div className="bg-gradient-to-r from-sky-950 via-sky-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border-b-4 border-amber-400">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-300" />
              ค้นหาและจัดการอินวอย (Invoice Database Management)
            </h2>
            <p className="text-xs text-sky-200 mt-1">
              ค้นหา แก้ไข อัปเดต และติดตามสถานะบิลใบแจ้งหนี้หรือใบเสร็จรับเงินที่ถูกสร้างขึ้นในระบบ
            </p>
          </div>
          
          <button
            onClick={handleExportTablePng}
            disabled={downloading}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-sky-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'กำลังบันทึกภาพ...' : 'บันทึกเป็นรูปตาราง PNG'}
          </button>
        </div>
      </div>

      {/* Financial stats summary card widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">มูลค่ารวมตามตาราง (Total Invoiced)</span>
            <h3 className="text-2xl font-black text-sky-950 font-mono mt-1">
              ฿{summary.total.toLocaleString()}
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            จากทั้งหมด <span className="font-bold text-sky-700">{filteredInvoices.length}</span> บิลที่ผ่านการกรองข้อมูล
          </p>
        </div>

        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">ชำระเงินแล้ว (Paid Invoices)</span>
            <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">
              ฿{summary.paid.toLocaleString()}
            </h3>
          </div>
          <p className="text-[10px] text-emerald-600/80 mt-2 font-medium">
            บิลที่ออกใบเสร็จเรียบร้อยแล้ว
          </p>
        </div>

        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">ค้างชำระเงิน (Unpaid Invoices)</span>
            <h3 className="text-2xl font-black text-rose-700 font-mono mt-1">
              ฿{summary.unpaid.toLocaleString()}
            </h3>
          </div>
          <p className="text-[10px] text-rose-600/80 mt-2 font-medium">
            บิลที่รอคอยการชำระเงินจากลูกค้าหรือเอเย่นต์
          </p>
        </div>
      </div>

      {/* Search & Filter Options Bar */}
      <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-sky-50 pb-3">
          <SlidersHorizontal className="w-4 h-4 text-sky-600" />
          <h4 className="text-xs font-black text-sky-950 uppercase tracking-widest">
            ตัวกรองค้นหาละเอียด (Advanced Filters)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Main search text query */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">คำค้นหาหลัก (Search Query)</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 เลขที่อินวอย, ชื่อลูกค้า, เบอร์โทร, เอเย่นต์..."
                className="w-full px-3 py-1.5 rounded-xl border border-sky-100 bg-sky-50/20 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Start Date filter */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">จากวันที่ออกบิล (From Date)</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-sky-100 bg-sky-50/20 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* End Date filter */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">ถึงวันที่ออกบิล (To Date)</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-sky-100 bg-sky-50/20 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Status filter dropdown */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">สถานะชำระ (Status)</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-sky-100 bg-sky-50/20 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">ทั้งหมด (ALL)</option>
              <option value="PAID">จ่ายแล้ว (PAID)</option>
              <option value="UNPAID">ค้างจ่าย (UNPAID)</option>
            </select>
          </div>

        </div>

        {/* Clear filters button if active */}
        {(searchQuery || startDate || endDate || selectedStatus !== 'ALL') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
                setSelectedStatus('ALL');
              }}
              className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              ✕ ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Search results table */}
      <div className="bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-sm">
        
        <div ref={tableRef} className="overflow-x-auto p-4 md:p-6 bg-white">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-sky-50">
            <div>
              <h4 className="text-base font-black text-sky-950">รายการฐานข้อมูลบิลจัดส่ง / Invoices DB Table</h4>
              <p className="text-[10px] text-sky-400 font-mono mt-0.5">
                พิมพ์สรุปตารางเมื่อวันที่ {new Date().toLocaleString()} • รวม {filteredInvoices.length} บิลรายการ
              </p>
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border-2 border-dashed border-sky-100 rounded-2xl">
              <AlertCircle className="w-8 h-8 mx-auto text-sky-200 mb-2 animate-bounce" />
              <p className="font-bold text-sm">ไม่พบข้อมูลใบแจ้งหนี้ (Invoices) ที่ตรงกับเงื่อนไข</p>
              <p className="text-xs mt-1">กรุณาลองระบุตัวกรองข้อมูลอื่น หรือกลับไปออก Invoice ใบใหม่</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-sky-50/50 text-sky-950 font-bold border-b border-sky-100 font-sans">
                  <th className="p-3 pl-4">เลขที่เอกสาร / วันออกบิล</th>
                  <th className="p-3">ข้อมูลลูกค้า & เอเย่นต์</th>
                  <th className="p-3">รายการในบิล</th>
                  <th className="p-3 text-right">ยอดรวมสุทธิ</th>
                  <th className="p-3 text-center">สถานะ</th>
                  <th className="p-3 text-center pr-4 no-print">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50 font-sans text-slate-700">
                {filteredInvoices.map((inv) => {
                  const { grandTotal } = getInvoiceTotals(inv);
                  
                  return (
                    <tr key={inv.id} className="hover:bg-sky-50/20 group">
                      {/* Document ID & Date */}
                      <td className="p-3 pl-4">
                        <div className="font-mono font-bold text-sky-950 text-xs">{inv.invoiceNo}</div>
                        <div className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">
                          📅 บิล: {inv.invoiceDate}
                        </div>
                        <div className="text-[10px] text-amber-600 font-medium font-mono">
                          ⌛ ครบกำหนด: {inv.dueDate}
                        </div>
                      </td>

                      {/* Customer info */}
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{inv.clientName}</div>
                        <div className="text-[10px] text-slate-500 flex flex-col gap-0.5 mt-0.5">
                          <span>📞 {inv.clientPhone}</span>
                          {inv.clientEmail && <span>✉️ {inv.clientEmail}</span>}
                          {inv.agentName && (
                            <span className="inline-block self-start font-bold text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200 mt-1 uppercase scale-90 -translate-x-1">
                              เอเย่นต์: {inv.agentName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Service Items */}
                      <td className="p-3 max-w-[200px]">
                        <div className="text-[10px] text-slate-600 truncate font-semibold" title={inv.items.map(i => i.description).join(', ')}>
                          {inv.items.map((i, index) => (
                            <div key={i.id || index} className="truncate">
                              • {i.description} <span className="font-mono text-sky-700">x{i.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Net Total Amount */}
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        ฿{grandTotal.toLocaleString()}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3 text-center">
                        {inv.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[9px] uppercase">
                            <CheckCircle className="w-3 h-3" /> PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[9px] uppercase">
                            <XCircle className="w-3 h-3" /> UNPAID
                          </span>
                        )}
                      </td>

                      {/* Row actions */}
                      <td className="p-3 text-center pr-4 no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print/View document */}
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            title="เปิดบอร์ดพิมพ์เอกสารนี้"
                            className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 rounded-lg border border-sky-100 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Invoice Form */}
                          {canEdit && (
                            <button
                              onClick={() => onEditInvoice(inv)}
                              title="แก้ไขข้อมูลอินวอย"
                              className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 rounded-lg border border-amber-100 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Invoice */}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(`❌ คุณแน่ใจหรือไม่ว่าต้องการลบ Invoice เลขที่ "${inv.invoiceNo}" ออกจากฐานข้อมูล?`)) {
                                  onDeleteInvoice(inv.id);
                                }
                              }}
                              title="ลบเอกสารนี้"
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
