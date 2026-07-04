import React, { useState, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User as UserIcon, Activity, 
  DollarSign, Receipt, FileText, Shield, AlertCircle, 
  FileDown, CheckCircle, Search, HelpCircle, ArrowUpRight,
  X, Eye, UserCheck, TrendingUp, Sparkles, LogIn, LogOut
} from 'lucide-react';
import { User as UserType, Voucher, UserActivityLog, SystemSettings } from '../types';
import { jsPDF } from 'jspdf';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import VoucherCard from './VoucherCard';

interface EmployeeActivityStatsProps {
  users: UserType[];
  vouchers: Voucher[];
  activityLogs: UserActivityLog[];
  currentUser: UserType;
  systemSettings?: SystemSettings;
}

export default function EmployeeActivityStats({ 
  users, 
  vouchers, 
  activityLogs = [], 
  currentUser,
  systemSettings
}: EmployeeActivityStatsProps) {
  // Filters State
  const [selectedUsername, setSelectedUsername] = useState<string>('all');
  
  // Default date filter: start of previous month to today (covers metadata date 2026-07-03)
  const [startDate, setStartDate] = useState<string>('2026-06-01');
  const [endDate, setEndDate] = useState<string>('2026-07-31');

  // Sub-tab for viewing Logs vs Performance Breakdown
  const [subTab, setSubTab] = useState<'performance' | 'activity'>('performance');
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);

  // Modal details states
  const [selectedVoucherDetails, setSelectedVoucherDetails] = useState<Voucher | null>(null);
  const [detailedLogsUser, setDetailedLogsUser] = useState<UserType | null>(null);

  // Reference to the printable element for capturing PDF
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Guard: Only Admin can see this
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-rose-100 shadow-3xs max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-lg font-black text-slate-800 mb-2">เข้าถึงระบบถูกปฏิเสธ (Access Denied)</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          หน้านี้สามารถเข้าถึงได้เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น กรุณาติดต่อหัวหน้างานของคุณ
        </p>
      </div>
    );
  }

  // Format Date in Thai and English helper
  const formatDateStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeStr = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) + ' น.';
    } catch {
      return '';
    }
  };

  // Helper to determine if a specific user is currently "Online"
  const isUserOnline = (username: string) => {
    // If it is the current logged-in admin viewing this, they are online
    if (username === currentUser.username) return true;

    // Filter logs for this specific user
    const userLogs = activityLogs.filter(log => log.username === username);
    if (userLogs.length === 0) return false;

    // Sort by timestamp descending to find latest action
    const sortedLogs = [...userLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sortedLogs[0].action === 'login';
  };

  // Helper to calculate total price of a single voucher
  const getVoucherTotalPrice = (v: Voucher) => {
    const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
    return isPrivate 
      ? v.driverPrice 
      : (v.driverCount * v.driverPrice) + (v.pillionCount * v.pillionPrice);
  };

  // Filter vouchers by date and selected user
  const filteredVouchers = vouchers.filter(v => {
    // serviceDate is in format YYYY-MM-DD
    const matchesDate = v.serviceDate >= startDate && v.serviceDate <= endDate;
    const matchesUser = selectedUsername === 'all' || v.createdBy === selectedUsername;
    return matchesDate && matchesUser;
  });

  // Calculate high-level stats for selected scope
  const totalVouchersIssued = filteredVouchers.length;
  
  const totalSalesVolume = filteredVouchers.reduce((sum, v) => sum + getVoucherTotalPrice(v), 0);
  
  const totalDeposits = filteredVouchers.reduce((sum, v) => {
    return sum + (v.depositAmount || 0);
  }, 0);

  const totalRemainingDue = filteredVouchers.reduce((sum, v) => {
    const price = getVoucherTotalPrice(v);
    if (v.paymentStatus === 'Paid') {
      return sum;
    } else if (v.paymentStatus === 'Partial') {
      return sum + Math.max(0, price - (v.depositAmount || 0));
    } else {
      return sum + price;
    }
  }, 0);

  // Total players count (drivers + pillions) for filtered vouchers
  const totalPlayersCount = filteredVouchers.reduce((sum, v) => sum + (v.driverCount || 0) + (v.pillionCount || 0), 0);

  // Group performance stats by user for tabular comparison
  const employeeStatsBreakdown = users.map(u => {
    const userVouchers = vouchers.filter(v => {
      const matchesDate = v.serviceDate >= startDate && v.serviceDate <= endDate;
      return matchesDate && v.createdBy === u.username;
    });

    const vCount = userVouchers.length;
    const sales = userVouchers.reduce((sum, v) => sum + getVoucherTotalPrice(v), 0);
    const deposits = userVouchers.reduce((sum, v) => sum + (v.depositAmount || 0), 0);
    const due = userVouchers.reduce((sum, v) => {
      const price = getVoucherTotalPrice(v);
      if (v.paymentStatus === 'Paid') {
        return sum;
      } else if (v.paymentStatus === 'Partial') {
        return sum + Math.max(0, price - (v.depositAmount || 0));
      } else {
        return sum + price;
      }
    }, 0);

    return {
      user: u,
      vCount,
      sales,
      deposits,
      due
    };
  });

  // Filter activity logs by date and user
  const filteredLogs = activityLogs.filter(log => {
    const logDate = log.timestamp.split('T')[0];
    const matchesDate = logDate >= startDate && logDate <= endDate;
    const matchesUser = selectedUsername === 'all' || log.username === selectedUsername;
    return matchesDate && matchesUser;
  });

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!printContainerRef.current) return;
    setPdfDownloading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await safeHtml2canvas(printContainerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }

      const cleanName = selectedUsername === 'all' ? 'All-Staff' : selectedUsername;
      pdf.save(`VOUCHER-SALES-REPORT-${cleanName}-${startDate}-to-${endDate}.pdf`);
    } catch (err) {
      console.error('Error generating PDF report:', err);
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1">
      {/* Header Widget */}
      <div className="bg-gradient-to-r from-sky-900 to-sky-950 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-48 h-48 bg-sky-400/10 rounded-full blur-xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs font-black tracking-widest text-sky-200 uppercase">Admin Dashboard Only</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">รายงานเวลางาน & ยอดผลงานพนักงาน</h1>
            <p className="text-xs text-sky-200/85 mt-1 font-medium">
              สรุปข้อมูลการปฏิบัติงาน ยอดขายออกตั๋ว และประวัติการเข้าใช้งานระบบ สำหรับผู้บริหารสูงสุด
            </p>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
            <Activity className="w-8 h-8 text-amber-300 animate-pulse shrink-0" />
            <div>
              <span className="text-[10px] text-sky-200 uppercase block font-bold leading-none">Total Team Members</span>
              <span className="text-lg font-black font-mono leading-none">{users.length} <span className="text-xs font-normal">คน</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Filters Panel */}
      <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-3xs">
        <h3 className="text-xs font-black text-sky-950 uppercase tracking-widest mb-4 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-sky-600" />
          ตัวกรองช่วงเวลาและพนักงาน (Filters Panel)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Select Employee */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
              เลือกรายชื่อพนักงาน
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">👥 พนักงานทั้งหมด (All Staff)</option>
                {users.map(u => {
                  const online = isUserOnline(u.username);
                  return (
                    <option key={u.id} value={u.username}>
                      {online ? '🟢' : '⚪'} {u.name} ({u.role.toUpperCase()}) {online ? '[Online]' : '[Offline]'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
              จาก วัน เดือน ปี (From Date)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-slate-700 font-medium font-mono"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
              ถึง วัน เดือน ปี (To Date)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-slate-700 font-medium font-mono"
            />
          </div>
        </div>
      </div>

      {/* Section Mode Switcher */}
      <div className="flex gap-2 border-b border-slate-200/60 pb-1.5">
        <button
          onClick={() => setSubTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${subTab === 'performance' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'}`}
        >
          📈 สรุปผลงานพนักงาน & ยอดขาย
        </button>
        <button
          onClick={() => setSubTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${subTab === 'activity' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'}`}
        >
          🕒 บันทึกเวลาเข้า-ออกระบบ (Login / Logout)
        </button>
      </div>

      {/* Render Sub Tabs */}
      {subTab === 'performance' ? (
        <div className="space-y-6">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vouchers Issued Card */}
            <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-3xs relative overflow-hidden flex items-center gap-4 hover:border-sky-300 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">จำนวนออก Voucher</span>
                <span className="text-xl font-black font-mono text-slate-800 leading-none">
                  {totalVouchersIssued.toLocaleString()} <span className="text-xs font-bold text-slate-500">ตั๋ว</span>
                </span>
                <span className="text-[9px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-bold block mt-1 w-max">
                  Vouchers Count
                </span>
              </div>
            </div>

            {/* Total Players Card */}
            <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-3xs relative overflow-hidden flex items-center gap-4 hover:border-amber-300 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">จำนวนผู้เล่นรวม (Drivers+Pillion)</span>
                <span className="text-xl font-black font-mono text-amber-700 leading-none">
                  {totalPlayersCount.toLocaleString()} <span className="text-xs font-bold text-slate-500">คน</span>
                </span>
                <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold block mt-1 w-max">
                  Total Players
                </span>
              </div>
            </div>

            {/* Total Deposits Card */}
            <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-3xs relative overflow-hidden flex items-center gap-4 hover:border-emerald-300 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ยอดเงินมัดจำรับแล้ว</span>
                <span className="text-xl font-black font-mono text-emerald-600 leading-none">
                  ฿{totalDeposits.toLocaleString()}
                </span>
                <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold block mt-1 w-max">
                  Total Deposits Received
                </span>
              </div>
            </div>

            {/* Total Remaining Due Card */}
            <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-3xs relative overflow-hidden flex items-center gap-4 hover:border-rose-300 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ยอดเงินที่ยังค้างชำระ</span>
                <span className="text-xl font-black font-mono text-rose-600 leading-none">
                  ฿{totalRemainingDue.toLocaleString()}
                </span>
                <span className="text-[9px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold block mt-1 w-max">
                  Total Balance Due
                </span>
              </div>
            </div>
          </div>

          {/* Detailed side-by-side Table (Filtered to selected employee) */}
          <div className="bg-white rounded-3xl border border-sky-100 shadow-3xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-800 text-sm">ตารางสรุปผลงานตามรายชื่อพนักงาน</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ช่วงวันที่ {formatDateStr(startDate)} ถึง {formatDateStr(endDate)}
                </p>
              </div>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                Compare and Filtered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 font-bold text-xs border-b border-slate-100">
                    <th className="p-4">พนักงาน (Name)</th>
                    <th className="p-4">Username</th>
                    <th className="p-4 text-center">สถานะปัจจุบัน</th>
                    <th className="p-4 text-center">จำนวน Voucher</th>
                    <th className="p-4 text-right">ยอดขายรวม</th>
                    <th className="p-4 text-right">ยอดมัดจำที่เก็บได้</th>
                    <th className="p-4 text-right text-rose-600">ยอดค้างชำระ</th>
                    <th className="p-4 text-center">ประวัติล็อกอิน</th>
                    <th className="p-4 text-center">บทบาทระบบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {employeeStatsBreakdown
                    .filter(({ user }) => selectedUsername === 'all' || user.username === selectedUsername)
                    .map(({ user, vCount, sales, deposits, due }) => {
                      const online = isUserOnline(user.username);
                      return (
                        <tr 
                          key={user.id} 
                          className="hover:bg-sky-50/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black flex items-center justify-center border border-slate-200">
                                  {user.name.charAt(0)}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800 flex items-center gap-1">
                                  {user.name}
                                  {user.username === currentUser.username && (
                                    <span className="text-[8px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded uppercase">You</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-500">{user.username}</td>
                          <td className="p-4 text-center">
                            {online ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-emerald-100">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                Online (ออนไลน์)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-slate-200">
                                Offline (ออฟไลน์)
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center font-mono font-black text-slate-700 bg-sky-50/10">
                            {vCount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ใบ</span>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-slate-800">
                            ฿{sales.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono font-extrabold text-amber-600">
                            ฿{deposits.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono font-black text-rose-600 bg-rose-50/10">
                            ฿{due.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setDetailedLogsUser(user)}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold hover:bg-sky-100 hover:text-sky-800 rounded-lg transition-colors cursor-pointer text-[10px] flex items-center gap-1 mx-auto"
                            >
                              <Clock className="w-3 h-3 text-slate-500" />
                              ดูประวัติล็อกอิน
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              user.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              user.role === 'manager' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-sky-50 text-sky-600 border border-sky-100'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vouchers List and Printable Report Container */}
          <div className="bg-white rounded-3xl border border-sky-100 shadow-3xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  ตารางแสดง Vouchers ทั้งหมดที่ขาย (Vouchers Sales Details)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  พนักงาน: {selectedUsername === 'all' ? 'ทุกคน' : `${selectedUsername}`} | ทั้งหมด {filteredVouchers.length} ตั๋ว
                </p>
              </div>

              <button
                onClick={handleExportPdf}
                disabled={pdfDownloading || filteredVouchers.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer border-b-2 border-rose-950"
              >
                <FileDown className="w-4 h-4 animate-bounce" />
                {pdfDownloading ? 'กำลังสร้างไฟล์ PDF...' : 'บันทึกเป็นตารางไฟล์ PDF'}
              </button>
            </div>

            {/* Visible Screen Table & Export Layout wrapper */}
            <div ref={printContainerRef} className="bg-white p-4">
              {/* PDF Document Header (Visible only when captured) */}
              <div className="hidden print-block p-4 border-2 border-slate-200 mb-6 bg-slate-50 rounded-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-sky-950 uppercase tracking-wide">Krabi ATV Adventure</h2>
                    <p className="text-xs text-slate-500 font-bold">รายงานรายละเอียดการจองตั๋วพนักงาน (Voucher Booking Sales Report)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold">EXPORTED BY ADMIN</p>
                    <p className="text-xs font-mono font-bold text-sky-700">พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block">ช่วงวันที่เลือก:</span>
                    <span className="font-black text-slate-800">{formatDateStr(startDate)} ถึง {formatDateStr(endDate)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">พนักงานที่สืบค้น:</span>
                    <span className="font-black text-slate-800">{selectedUsername === 'all' ? 'พนักงานทุกคน (All Staff)' : `ผู้ใช้: ${selectedUsername}`}</span>
                  </div>
                </div>

                {/* mini summary bar inside pdf print */}
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ออกใบจอง</p>
                    <p className="text-sm font-black font-mono text-slate-800">{totalVouchersIssued} ตั๋ว</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ผู้เล่นรวม</p>
                    <p className="text-sm font-black font-mono text-sky-700">{totalPlayersCount} คน</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">มัดจำแล้ว</p>
                    <p className="text-sm font-black font-mono text-emerald-700">฿{totalDeposits.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ค้างชำระ</p>
                    <p className="text-sm font-black font-mono text-rose-600">฿{totalRemainingDue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {filteredVouchers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs font-bold">ไม่พบข้อมูล Vouchers ในช่วงเวลาและพนักงานที่เลือก</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-sky-50/50 text-sky-950 font-black border-b border-sky-100">
                        <th className="p-3">เลขวอเชอร์ / รหัส</th>
                        <th className="p-3">วันที่ใช้บริการ</th>
                        <th className="p-3">ชื่อลูกค้า</th>
                        <th className="p-3">กิจกรรม/รถ</th>
                        <th className="p-3 text-center">จำนวนผู้เล่น</th>
                        <th className="p-3 text-right">ยอดรวม</th>
                        <th className="p-3 text-right">มัดจำ</th>
                        <th className="p-3 text-right">ค้างจ่าย</th>
                        <th className="p-3 text-center">สถานะ</th>
                        <th className="p-3 text-center no-print">ดูรายละเอียด</th>
                        <th className="p-3 text-center">ผู้ขาย (Created By)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVouchers.map((v) => {
                        const price = getVoucherTotalPrice(v);
                        const deposit = v.depositAmount || 0;
                        const due = v.paymentStatus === 'Paid' ? 0 : (v.paymentStatus === 'Partial' ? Math.max(0, price - deposit) : price);
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/50 text-[11px] text-slate-700">
                            <td className="p-3 font-mono font-black text-sky-900">{v.voucherNo || v.id.slice(0, 8)}</td>
                            <td className="p-3 font-mono font-medium text-slate-600">{v.serviceDate}</td>
                            <td className="p-3 font-bold text-slate-800">{v.customerName}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block leading-tight">{v.tourName || 'กิจกรรม ATV'}</span>
                              <span className="text-[9px] text-slate-400 block font-medium uppercase">{v.vehicleType || 'Standard'}</span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              👤 {v.driverCount} / {v.pillionCount}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">฿{price.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-bold text-amber-600">฿{deposit.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-black text-rose-600 bg-rose-50/20">฿{due.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                v.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                v.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {v.paymentStatus}
                              </span>
                            </td>
                            <td className="p-3 text-center no-print">
                              <button
                                onClick={() => setSelectedVoucherDetails(v)}
                                className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white transition-all rounded-md font-bold text-[10px] flex items-center gap-1 mx-auto cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                ดูวอเชอร์
                              </button>
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600 uppercase text-[9px]">
                                {v.createdBy}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* SUMMARY ROW FOR BOTH TABLE SCREEN AND PDF GENERATION */}
                      <tr className="bg-sky-50/70 font-black text-xs text-sky-950 border-t-2 border-sky-200">
                        <td className="p-3 text-center font-extrabold" colSpan={4}>
                          สรุปยอดรวมตารางรายงาน (Summary Grand Total)
                        </td>
                        <td className="p-3 text-center font-mono text-slate-800">
                          👥 {totalPlayersCount} คน
                        </td>
                        <td className="p-3 text-right font-mono text-sky-950">
                          ฿{totalSalesVolume.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700">
                          ฿{totalDeposits.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-700 bg-rose-50/40">
                          ฿{totalRemainingDue.toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500" colSpan={3}>
                          ตั๋วทั้งหมด: {totalVouchersIssued} ใบ
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Login / Logout Logs Table */
        <div className="bg-white rounded-3xl border border-sky-100 shadow-3xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-800 text-sm">ประวัติการลงชื่อเข้าใช้งานและการออกระบบ (Login & Logout Activity)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ประวัติสำหรับพนักงาน {selectedUsername === 'all' ? 'ทุกคน' : `ผู้ใช้: ${selectedUsername}`} ตั้งแต่วันที่ {formatDateStr(startDate)} ถึง {formatDateStr(endDate)}
              </p>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Live logs
            </span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-xs font-bold">ไม่พบประวัติการเข้าใช้งานในช่วงเวลาที่เลือก</p>
              <p className="text-[10px] text-slate-400 mt-1">กรุณาปรับตัวกรองวันที่หรือเลือกพนักงานคนอื่น</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 font-bold text-xs border-b border-slate-100">
                    <th className="p-4 w-12 text-center">ลำดับ</th>
                    <th className="p-4">พนักงาน (Name)</th>
                    <th className="p-4">Username</th>
                    <th className="p-4 text-center">การกระทำ (Action)</th>
                    <th className="p-4">วันที่ลงชื่อ</th>
                    <th className="p-4">เวลาล็อกอิน / ล็อกเอาต์</th>
                    <th className="p-4 text-center">สถานะปัจจุบัน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.map((log, index) => {
                    const logDateStr = log.timestamp.split('T')[0];
                    const online = isUserOnline(log.username);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/40">
                        <td className="p-4 text-center text-slate-400 font-mono font-semibold">{index + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-800 font-black text-[10px] flex items-center justify-center border border-sky-100">
                                {log.name.charAt(0)}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            </div>
                            <span className="font-extrabold text-slate-800">{log.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-semibold text-slate-500">{log.username}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            log.action === 'login' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {log.action === 'login' ? 'เข้าสู่ระบบ (Login)' : 'ออกจากระบบ (Logout)'}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-600">{formatDateStr(logDateStr)}</td>
                        <td className="p-4 font-mono font-bold text-sky-700 flex items-center gap-2 flex-wrap">
                          <span>{formatTimeStr(log.timestamp)}</span>
                          {online && log.action === 'login' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse shrink-0">
                              🟢 กำลังออนไลน์ (Online Now)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {online ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-100/60 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              กำลังออนไลน์อยู่ (Online)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-200/40">
                              ออฟไลน์ (Offline)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VOUCHER DETAILS VIEW */}
      {selectedVoucherDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-550 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-sky-950 p-4 text-white flex justify-between items-center border-b border-sky-900">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm">รายละเอียดวอเชอร์กิจกรรม (Voucher Details Room)</h3>
              </div>
              <button 
                onClick={() => setSelectedVoucherDetails(null)}
                className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto bg-slate-50">
              <VoucherCard 
                voucher={selectedVoucherDetails}
                currentUser={currentUser}
                systemSettings={systemSettings}
                showActions={true}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedVoucherDetails(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 transition-all text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: USER LOGS TIMELINE DETAIL */}
      {detailedLogsUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-550 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-sky-950 p-4 text-white flex justify-between items-center border-b border-sky-900">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm">รายละเอียดการเข้าออกระบบทั้งหมด (Detailed Login Logs)</h3>
              </div>
              <button 
                onClick={() => setDetailedLogsUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-50 space-y-4">
              {/* User Profile Info Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sky-100 text-sky-800 rounded-full font-black text-lg flex items-center justify-center border border-sky-200">
                    {detailedLogsUser.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-base">{detailedLogsUser.name}</h4>
                    <p className="text-xs text-slate-500 font-mono font-bold">Username: {detailedLogsUser.username} | Role: {detailedLogsUser.role.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">สถานะตอนนี้:</span>
                  {isUserOnline(detailedLogsUser.username) ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                      กำลังออนไลน์อยู่ (Online)
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-400 border border-slate-200 text-xs px-3 py-1 rounded-full font-medium">
                      ออฟไลน์ (Offline)
                    </span>
                  )}
                </div>
              </div>

              {/* Individual logs list */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">ประวัติการล็อกอิน-ล็อกเอาต์ทั้งหมดในช่วงวันที่เลือก</h5>
                </div>

                <div className="divide-y divide-slate-100">
                  {activityLogs
                    .filter(log => log.username === detailedLogsUser.username)
                    .filter(log => {
                      const logDateStr = log.timestamp.split('T')[0];
                      return logDateStr >= startDate && logDateStr <= endDate;
                    })
                    .map((log, idx) => {
                      const logDateStr = log.timestamp.split('T')[0];
                      const logOnline = isUserOnline(log.username);
                      return (
                        <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-mono font-bold">#{idx + 1}</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-600">{formatDateStr(logDateStr)}</span>
                              <span className="text-sm font-mono font-black text-sky-800 flex items-center gap-2">
                                {formatTimeStr(log.timestamp)}
                                {logOnline && log.action === 'login' && idx === 0 && (
                                  <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
                                    CURRENT ACTIVE
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1 border ${
                            log.action === 'login' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {log.action === 'login' ? <LogIn className="w-3 h-3 text-emerald-600" /> : <LogOut className="w-3 h-3 text-slate-500" />}
                            {log.action === 'login' ? 'เข้าสู่ระบบ' : 'ออกจากระบบ'}
                          </span>
                        </div>
                      );
                    })}

                  {activityLogs
                    .filter(log => log.username === detailedLogsUser.username)
                    .filter(log => {
                      const logDateStr = log.timestamp.split('T')[0];
                      return logDateStr >= startDate && logDateStr <= endDate;
                    }).length === 0 && (
                      <div className="p-8 text-center text-slate-400">
                        <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-bold">ไม่มีประวัติการบันทึกเวลาในช่วงที่ระบุ</p>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailedLogsUser(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 transition-all text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง (Close)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
