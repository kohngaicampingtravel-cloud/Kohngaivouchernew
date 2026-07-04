import React, { useState, useRef } from 'react';
import { Search, Calendar, ChevronRight, FileDown, Edit3, Trash2, SlidersHorizontal, Info, Download, AlertCircle } from 'lucide-react';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { Voucher, User } from '../types';

interface VoucherSearchProps {
  vouchers: Voucher[];
  currentUser: User;
  onEditVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  onSelectVoucher: (voucher: Voucher) => void;
}

export default function VoucherSearch({ vouchers, currentUser, onEditVoucher, onDeleteVoucher, onSelectVoucher }: VoucherSearchProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Permissions Check
  const canEdit = currentUser.role === 'admin' || currentUser.permissions.canEditVoucher;
  const canDelete = currentUser.role === 'admin' || currentUser.permissions.canDeleteVoucher;

  // Filter Logic
  const filteredVouchers = vouchers.filter((v) => {
    // Text search (Customer Name, Voucher ID, External Voucher ID, Phone, Email)
    const matchesQuery = 
      v.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.externalVoucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.customerPhone.includes(searchQuery) ||
      v.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    // Date Range (Service Date)
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && v.serviceDate >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && v.serviceDate <= endDate;
    }

    // Agent Filter
    const matchesAgent = selectedAgent === 'ALL' || v.agentName === selectedAgent;

    // Status Filter
    const matchesStatus = selectedStatus === 'ALL' || v.paymentStatus === selectedStatus;

    return matchesQuery && matchesDate && matchesAgent && matchesStatus;
  });

  // Agents list for dropdown
  const uniqueAgents = Array.from(new Set(vouchers.map((v) => v.agentName)));

  // Financial Summaries
  const totalRevenue = filteredVouchers.reduce((sum, v) => {
    const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
    const vTotal = isPrivate 
      ? v.driverPrice 
      : (v.driverCount * v.driverPrice) + (v.pillionCount * v.pillionPrice);
    return sum + vTotal;
  }, 0);

  const totalDrivers = filteredVouchers.reduce((sum, v) => sum + v.driverCount, 0);
  const totalPillions = filteredVouchers.reduce((sum, v) => sum + v.pillionCount, 0);
  const totalPassengers = totalDrivers + totalPillions;

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
      link.download = `SUMMARY-VOUCHERS-TABLE.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting table to PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 border-2 border-emerald-400 rounded-md font-black text-[10px]">PAID</span>;
      case 'Pending':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-950 border-2 border-amber-400 rounded-md font-black text-[10px]">PENDING</span>;
      case 'Partial':
        return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-950 border-2 border-indigo-400 rounded-md font-black text-[10px]">PARTIAL</span>;
      case 'Collect':
        return <span className="px-2 py-0.5 bg-sky-100 text-sky-950 border-2 border-sky-400 rounded-md font-black text-[10px]">COLLECT</span>;
      default:
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-950 border-2 border-rose-400 rounded-md font-black text-[10px]">UNPAID</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Search and Filters Panel */}
      <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-black text-sky-950 mb-4 flex items-center gap-2">
          <SlidersHorizontal className="w-4.5 h-4.5 text-sky-600" />
          ค้นหา & ตัวกรองข้อมูลวอเชอร์ / Search & Filter Vouchers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main search query */}
          <div className="md:col-span-4 relative">
            <label className="block text-[10px] font-bold text-sky-950 uppercase tracking-wider mb-1">คำค้นหา (ชื่อ / รหัสวอเชอร์)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นชื่อลูกค้า, รหัสวอเชอร์ใน/นอก, อีเมล..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>
          </div>

          {/* Start Service Date */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-sky-950 uppercase tracking-wider mb-1">วันที่เริ่มบริการ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>
          </div>

          {/* End Service Date */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-sky-950 uppercase tracking-wider mb-1">ถึงวันที่บริการ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>
          </div>

          {/* Agent Filter */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-sky-950 uppercase tracking-wider mb-1">เลือกเอเยนต์</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="ALL">ทั้งหมด / All Agents</option>
              {uniqueAgents.map((agent) => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-sky-950 uppercase tracking-wider mb-1">สถานะชำระเงิน</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="Paid">ชำระแล้ว (Paid)</option>
              <option value="Unpaid">ยังไม่ชำระ (Unpaid)</option>
              <option value="Pending">รอตรวจสอบ (Pending)</option>
              <option value="Partial">มัดจำบางส่วน (Partial)</option>
              <option value="Collect">เก็บเงินจากลูกค้า (Collect)</option>
            </select>
          </div>
        </div>

        {/* Clear filter shortcut */}
        {(searchQuery || startDate || endDate || selectedAgent !== 'ALL' || selectedStatus !== 'ALL') && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
                setSelectedAgent('ALL');
                setSelectedStatus('ALL');
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Main Results Table & Capture Region */}
      <div className="flex flex-col gap-3">
        {/* Export Button Bar */}
        <div className="flex justify-between items-center px-1">
          <p className="text-xs text-slate-500">
            พบข้อมูลจองทั้งหมด <strong className="text-sky-950 font-mono text-sm">{filteredVouchers.length}</strong> รายการ
          </p>
          <button
            onClick={handleExportTablePng}
            disabled={downloading || filteredVouchers.length === 0}
            id="btn_export_search_table_png"
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-950 text-white font-bold text-xs rounded-xl shadow-md hover:bg-sky-900 active:bg-slate-950 disabled:opacity-50 transition-all cursor-pointer border-b border-sky-700"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            {downloading ? 'กำลังบันทึกภาพ...' : 'บันทึกเป็นไฟล์ภาพ PNG ตาราง'}
          </button>
        </div>

        {/* Table Capture Area */}
        <div ref={tableRef} className="bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)] p-4 md:p-6">
          {/* Header information for PNG export */}
          <div className="mb-4 pb-4 border-b border-sky-50 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-sky-950 uppercase tracking-wider font-sans">
                ตารางสรุปรายงานการจอง • KOHNGAICAMPINGTRAVEL
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                ช่วงวันที่สืบค้น: {startDate || 'เริ่มต้น'} ถึง {endDate || 'ปัจจุบัน'} • ดึงข้อมูลเมื่อ {new Date().toLocaleDateString('th-TH')}
              </p>
            </div>
            
            {/* Quick Stat boxes for the PNG image */}
            <div className="flex gap-4">
              <div className="bg-sky-50/50 border border-sky-100 px-3 py-1.5 rounded-xl flex flex-col justify-center">
                <span className="text-[9px] font-bold text-sky-800 uppercase tracking-wider">จำนวนผู้เดินทาง</span>
                <span className="text-xs font-black text-sky-950 font-mono">
                  {totalPassengers} คน (ขับ {totalDrivers} / ซ้อน {totalPillions})
                </span>
              </div>
              <div className="bg-sky-950 border border-sky-800 px-3 py-1.5 rounded-xl flex flex-col justify-center text-white">
                <span className="text-[9px] font-bold text-sky-300 uppercase tracking-wider">ยอดเงินรวม</span>
                <span className="text-xs font-black text-amber-400 font-mono">
                  ฿{totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase tracking-wider border-b-2 border-slate-950 font-sans">
                  <th className="p-3">วันที่ใช้บริการ</th>
                  <th className="p-3">เวลารับ</th>
                  <th className="p-3">รหัสวอเชอร์</th>
                  <th className="p-3">เลขนอก</th>
                  <th className="p-3">ชื่อลูกค้า</th>
                  <th className="p-3">เอเยนต์</th>
                  <th className="p-3 text-center">ผู้ใหญ่/เด็ก</th>
                  <th className="p-3 text-right">ยอดรวม (บาท)</th>
                  <th className="p-3 text-center">สถานะ</th>
                  <th className="p-3 text-center w-24 no-export-element">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans text-slate-950 bg-white">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-500 font-bold">
                      ไม่พบข้อมูลจองทัวร์ตามเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredVouchers
                    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate) || a.pickupTime.localeCompare(b.pickupTime))
                    .map((v) => {
                      const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
                      const vTotal = isPrivate 
                        ? v.driverPrice 
                        : (v.driverCount * v.driverPrice) + (v.pillionCount * v.pillionPrice);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-black text-slate-950">
                            {v.serviceDate}
                          </td>
                          <td className="p-3 font-mono font-black text-slate-950">
                            {v.pickupTime} น.
                          </td>
                          <td className="p-3 font-mono text-slate-950 font-black">{v.voucherNo}</td>
                          <td className="p-3 font-mono text-slate-950 font-bold">{v.externalVoucherNo || '-'}</td>
                          <td className="p-3 font-black text-slate-950">{v.customerName}</td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-950 border-2 border-slate-300 rounded-md text-[10px] font-black">
                              {v.agentName}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-xs font-black text-slate-950">
                            <span className="font-black text-slate-950">{v.driverCount}</span> ผู้ใหญ่ | <span className="font-black text-slate-950">{v.pillionCount}</span> เด็ก
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-950">
                            ฿{vTotal.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(v.paymentStatus)}
                          </td>
                          <td className="p-3 text-center no-export-element flex items-center justify-center gap-1">
                            <button
                              onClick={() => onSelectVoucher(v)}
                              title="ดูวอเชอร์ใบจอง"
                              className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => onEditVoucher(v)}
                                title="แก้ไขข้อมูล"
                                className="p-1 text-slate-400 hover:text-sky-800 hover:bg-sky-50 rounded-md transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`คุณแน่ใจว่าต้องการลบวอเชอร์ของ คุณ${v.customerName} ใช่หรือไม่? การลบไม่สามารถเรียกคืนได้`)) {
                                    onDeleteVoucher(v.id);
                                  }
                                }}
                                title="ลบวอเชอร์"
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Mini Info note at bottom of report print */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>KOHNGAICAMPINGTRAVEL SYSTEM REPORT</span>
            <span>ลงชื่อผู้ดึงรายงาน: {currentUser.name} ({currentUser.role.toUpperCase()})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
