import { useState, useRef } from 'react';
import { 
  LogOut, User, PlusCircle, Search, DollarSign, BarChart3, Settings, 
  Users, Menu, X, Calendar, Download, Sparkles, AlertCircle, FileText, Receipt, Briefcase, Sliders, History,
  Mail, Copy, Check
} from 'lucide-react';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { User as UserType, Voucher, Expense, MasterData, PaymentStatus, Language, Invoice, SystemSettings, UserActivityLog } from '../types';

import VoucherForm from './VoucherForm';
import VoucherSearch from './VoucherSearch';
import ExpenseForm from './ExpenseForm';
import ReportSummary from './ReportSummary';
import MasterDataSettings from './MasterDataSettings';
import EmployeeManager from './EmployeeManager';
import VoucherCard from './VoucherCard';
import InvoiceGenerator from './InvoiceGenerator';
import InvoiceSearch from './InvoiceSearch';
import AgentReport from './AgentReport';
import SystemSettingsManager from './SystemSettingsManager';
import EmployeeActivityStats from './EmployeeActivityStats';

interface DashboardProps {
  currentUser: UserType;
  users: UserType[];
  vouchers: Voucher[];
  expenses: Expense[];
  invoices: Invoice[];
  masterData: MasterData;
  systemSettings: SystemSettings;
  activityLogs?: UserActivityLog[];
  onLogout: () => void;
  onAddVoucher: (v: Omit<Voucher, 'id' | 'voucherNo' | 'createdAt' | 'createdBy'>) => void;
  onUpdateVoucher: (v: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  onAddExpense: (e: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => void;
  onDeleteExpense: (id: string) => void;
  onAddInvoice: (i: Omit<Invoice, 'id' | 'createdAt' | 'createdBy'>) => Invoice;
  onUpdateInvoice: (i: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onUpdateMasterData: (md: MasterData) => void;
  onUpdateSystemSettings: (ss: SystemSettings) => void;
  onAddUser: (u: Omit<UserType, 'id' | 'createdAt'> & { password?: string }) => void;
  onDeleteUser: (id: string) => void;
  onUpdatePermissions: (userId: string, permissions: any, role: any) => void;
}

export default function Dashboard({
  currentUser,
  users,
  vouchers,
  expenses,
  invoices,
  masterData,
  systemSettings,
  activityLogs = [],
  onLogout,
  onAddVoucher,
  onUpdateVoucher,
  onDeleteVoucher,
  onAddExpense,
  onDeleteExpense,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onUpdateMasterData,
  onUpdateSystemSettings,
  onAddUser,
  onDeleteUser,
  onUpdatePermissions,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('create-voucher');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Email Dispatcher Modal States
  const [emailModalVoucher, setEmailModalVoucher] = useState<Voucher | null>(null);
  const [customRecipientEmail, setCustomRecipientEmail] = useState<string>('');
  const [customEmailSubject, setCustomEmailSubject] = useState<string>('');
  const [customEmailBody, setCustomEmailBody] = useState<string>('');
  const [emailCopied, setEmailCopied] = useState<boolean>(false);

  // Expense Category Report States
  const [expenseStart, setExpenseStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // start of month
    return d.toISOString().split('T')[0];
  });
  const [expenseEnd, setExpenseEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const expenseTableRef = useRef<HTMLDivElement>(null);
  const [exportingExpenses, setExportingExpenses] = useState(false);

  // Group Expenses by Category from expenseStart to expenseEnd
  const filteredCategoryExpenses = expenses.filter(e => e.date >= expenseStart && e.date <= expenseEnd);
  
  // Grouping logic
  const categorySummary: { [key: string]: { amount: number; count: number } } = {};
  masterData.expenseCategories.forEach(cat => {
    categorySummary[cat] = { amount: 0, count: 0 };
  });

  filteredCategoryExpenses.forEach(e => {
    if (!categorySummary[e.category]) {
      categorySummary[e.category] = { amount: 0, count: 0 };
    }
    categorySummary[e.category].amount += e.amount;
    categorySummary[e.category].count += 1;
  });

  const totalExpenseFiltered = Object.values(categorySummary).reduce((s, c) => s + c.amount, 0);

  // Export expense summary table to PNG
  const handleExportExpenseTablePng = async () => {
    if (!expenseTableRef.current) return;
    setExportingExpenses(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const canvas = await safeHtml2canvas(expenseTableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `EXPENSE-CATEGORY-SUMMARY-${expenseStart}-TO-${expenseEnd}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting expense category table to PNG:', err);
    } finally {
      setExportingExpenses(false);
    }
  };

  const handleEditVoucherInit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setActiveTab('create-voucher');
  };

  const handleSelectVoucherInit = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setActiveTab('view-voucher');
  };

  const handleVoucherFormSubmit = (data: any) => {
    if (data.id) {
      onUpdateVoucher(data as Voucher);
      alert('บันทึกการแก้ไขวอเชอร์เรียบร้อยแล้ว!');
    } else {
      onAddVoucher(data);
      alert('ออกตั๋วทัวร์วอเชอร์เรียบร้อยแล้ว!');
    }
    setEditingVoucher(null);
    setActiveTab('search-vouchers');
  };

  const mockSendEmail = (voucher: Voucher) => {
    const isPrivate = (voucher.vehicleType || '').toLowerCase().includes('private');
    const voucherTotalPrice = isPrivate 
      ? voucher.driverPrice 
      : (voucher.driverCount * voucher.driverPrice) + (voucher.pillionCount * voucher.pillionPrice);
    
    const due = voucher.paymentStatus === 'Paid' 
      ? 0 
      : (voucher.paymentStatus === 'Partial' ? Math.max(0, voucherTotalPrice - (voucher.depositAmount || 0)) : voucherTotalPrice);

    const senderEmail = systemSettings.email || 'kohngaicampingtour@gmail.com';

    const bodyText = `เรียนคุณ ${voucher.customerName},

ขอบคุณสำหรับการจองกิจกรรมกับ Krabi ATV Adventure / เกาะไหง แคมป์ปิ้ง แทรเวล
รายละเอียดใบจองกิจกรรมทัวร์ของท่าน (Voucher No. ${voucher.voucherNo || voucher.id.slice(0, 8)}) มีดังนี้:

• วันที่รับบริการ: ${voucher.serviceDate}
• โปรแกรมทัวร์: ${voucher.tourName || 'กิจกรรม ATV'} (${voucher.vehicleType || 'Standard'})
• จำนวนผู้ขับขี่: ${voucher.driverCount} คน / ผู้ซ้อน: ${voucher.pillionCount} คน
• ยอดเงินมัดจำรับแล้ว: ฿${(voucher.depositAmount || 0).toLocaleString()}
• ยอดคงเหลือค้างจ่ายหน้างาน: ฿${due.toLocaleString()}
• สถานะการชำระเงิน: ${voucher.paymentStatus}

ท่านสามารถเปิดดูหรือบันทึกไฟล์ใบจอง Voucher ในรูปแบบ PDF/PNG ที่ระบบสร้างขึ้นเพื่อแสดงแก่เจ้าหน้าที่ก่อนทำกิจกรรมได้ครับ

หากมีข้อสงสัยเพิ่มเติมหรือประสงค์จะแก้ไขรายละเอียดใดๆ กรุณาตอบกลับทางอีเมลนี้ (${senderEmail}) หรือโทรติดต่อ ${systemSettings.phone || '080-3203719'}

ขอแสดงความนับถืออย่างสูง,
บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด
(Koh Ngai Camping Travel Co., Ltd.)
อีเมลผู้ส่งอย่างเป็นทางการ: ${senderEmail}`;

    setEmailModalVoucher(voucher);
    setCustomRecipientEmail(voucher.customerEmail || '');
    setCustomEmailSubject(`ใบจองกิจกรรมทัวร์ (Voucher No. ${voucher.voucherNo || voucher.id.slice(0, 8)}) - Krabi ATV Adventure`);
    setCustomEmailBody(bodyText);
    setEmailCopied(false);
  };

  // Nav items list based on roles & permissions
  const menuItems = [
    { id: 'create-voucher', label: 'ออก Voucher ทัวร์', icon: <PlusCircle className="w-4 h-4" />, show: true },
    { id: 'search-vouchers', label: 'ค้นหา & จัดการ Voucher', icon: <Search className="w-4 h-4" />, show: true },
    { id: 'invoice', label: 'ออก Invoice / Receipt', icon: <PlusCircle className="w-4 h-4" />, show: true },
    { id: 'manage-invoices', label: 'ค้นหา & จัดการ Invoice', icon: <Receipt className="w-4 h-4" />, show: true },
    { id: 'expenses', label: 'บันทึกรายจ่ายร้าน', icon: <DollarSign className="w-4 h-4" />, show: true },
    { id: 'report', label: 'รายงานรายรับ-รายจ่าย', icon: <BarChart3 className="w-4 h-4" />, show: true },
    { id: 'agent-report', label: 'สรุปรายได้ค้างชำระเอเยนต์', icon: <Briefcase className="w-4 h-4" />, show: true },
    { 
      id: 'master-data', 
      label: 'จัดการตัวเลือกระบบ', 
      icon: <Settings className="w-4 h-4" />, 
      show: currentUser.role === 'admin' || currentUser.permissions.canManageOptions 
    },
    { 
      id: 'employees', 
      label: 'สิทธิ์และบัญชีพนักงาน', 
      icon: <Users className="w-4 h-4" />, 
      show: currentUser.role === 'admin' || currentUser.permissions.canManageStaff 
    },
    { 
      id: 'system-settings', 
      label: 'จัดการข้อมูลระบบ', 
      icon: <Sliders className="w-4 h-4" />, 
      show: currentUser.role === 'admin' 
    },
    {
      id: 'activity-and-stats',
      label: 'ประวัติเวลางาน & ยอดขายพนักงาน',
      icon: <History className="w-4 h-4" />,
      show: currentUser.role === 'admin'
    }
  ];

  const totalIncomeAll = vouchers.reduce((sum, v) => {
    if (v.paymentStatus === 'Paid') {
      const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
      const vTotal = isPrivate 
        ? v.driverPrice 
        : (v.driverCount * v.driverPrice) + (v.pillionCount * v.pillionPrice);
      return sum + vTotal;
    } else if (v.paymentStatus === 'Partial') {
      return sum + (v.depositAmount || 0);
    }
    return sum;
  }, 0);
  const totalExpenseAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div id="dashboard-root" className="flex flex-col h-screen w-full bg-sky-50/20 text-slate-800 font-sans overflow-hidden">
      
      {/* Top Header Navigation */}
      <header className="h-16 bg-gradient-to-r from-sky-950 via-sky-900 to-slate-900 text-white flex items-center justify-between px-6 shadow-md shrink-0 border-b-4 border-amber-400 no-print">
        <div className="flex items-center gap-3">
          {systemSettings?.logoUrl ? (
            <img src={systemSettings.logoUrl} alt="Logo" className="h-10 max-w-[120px] object-contain rounded bg-white/95 p-1 border border-white/20 shadow-sm" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center shrink-0 border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
          )}
          <div>
            {(() => {
              const fullName = systemSettings?.companyName || 'KOH NGAI CAMPING';
              let thPart = fullName;
              let enPart = '';
              const match = fullName.match(/^(.*?)\s*[\(\(](.*?)[\)\)]\s*$/) || fullName.match(/^(.*?)\s*[\/](.*?)$/);
              if (match) {
                thPart = match[1].trim();
                enPart = match[2].trim();
              }
              return (
                <>
                  <h1 className="text-[10px] md:text-xs font-black tracking-wider uppercase leading-none max-w-[200px] md:max-w-xs truncate">
                    {thPart}
                  </h1>
                  <p className="text-[7.5px] md:text-[8.5px] text-sky-300 tracking-[0.1em] uppercase mt-0.5 max-w-[200px] md:max-w-xs truncate">
                    {enPart || 'Premium Management System'}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-white">{currentUser.name}</p>
            <p className="text-[10px] text-sky-300 capitalize font-medium">{currentUser.role} • Premium Access</p>
          </div>
          <div className="w-9 h-9 bg-gradient-to-br from-sky-800 to-sky-600 text-white rounded-full border-2 border-sky-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {currentUser.name.charAt(0)}
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-sky-700 text-sky-200 hover:bg-sky-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r border-sky-100 flex flex-col p-4 shrink-0 hidden md:flex no-print">
          <div className="space-y-1 mb-6">
            <p className="text-[10px] font-black text-sky-900 uppercase tracking-[0.15em] px-3 mb-2">Navigation Menu</p>
            {menuItems.filter(item => item.show).map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'create-voucher' && activeTab !== 'create-voucher') {
                    setEditingVoucher(null);
                  }
                  if (item.id !== 'invoice') {
                    setEditingInvoice(null);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${activeTab === item.id || (item.id === 'create-voucher' && editingVoucher) ? 'bg-sky-50 text-sky-900 border-l-4 border-sky-600 shadow-2xs' : 'text-slate-600 hover:bg-sky-50/50'}`}
              >
                <span className={activeTab === item.id || (item.id === 'create-voucher' && editingVoucher) ? 'text-sky-600' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-4">
            <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-2xl shadow-2xs">
              <p className="text-[10px] font-black text-sky-900 uppercase tracking-wider mb-2">Live Summary</p>
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-slate-500 font-medium">Paid Income</span>
                <span className="text-xs font-bold text-sky-700 font-mono">฿{totalIncomeAll.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-end border-t border-sky-100 mt-1.5 pt-1.5">
                <span className="text-[10px] text-slate-500 font-medium">Expenses</span>
                <span className="text-xs font-bold text-rose-600 font-mono">฿{totalExpenseAll.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 hover:border-rose-100 border border-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </nav>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-sky-950/95 text-slate-300 p-6 flex flex-col md:hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-black text-lg tracking-wider">MENU LIST</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg border border-sky-800 text-sky-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 flex flex-col gap-2">
              {menuItems.filter(item => item.show).map(item => (
                <button
                  key={`mob-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'create-voucher') setEditingVoucher(null);
                    if (item.id !== 'invoice') setEditingInvoice(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${activeTab === item.id ? 'bg-sky-600 text-white shadow-md' : 'text-sky-300 hover:text-slate-100 hover:bg-sky-900/50'}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-900 text-rose-300 border border-sky-800 font-bold text-sm rounded-xl mt-6 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ / Logout</span>
            </button>
          </div>
        )}

        {/* Main Panel Area */}
        <div id="main-panel-area" className="flex-1 p-4 md:p-6 overflow-y-auto">
        {activeTab === 'create-voucher' && (
          <VoucherForm
            onSubmit={handleVoucherFormSubmit}
            onCancel={editingVoucher ? () => { setEditingVoucher(null); setActiveTab('search-vouchers'); } : undefined}
            editingVoucher={editingVoucher}
            masterData={masterData}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'search-vouchers' && (
          <VoucherSearch
            vouchers={vouchers}
            currentUser={currentUser}
            onEditVoucher={handleEditVoucherInit}
            onDeleteVoucher={onDeleteVoucher}
            onSelectVoucher={handleSelectVoucherInit}
          />
        )}

        {activeTab === 'view-voucher' && selectedVoucher && (
          <div className="flex flex-col gap-4">
            <div className="max-w-2xl mx-auto w-full flex justify-between">
              <button
                onClick={() => setActiveTab('search-vouchers')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
              >
                ← ย้อนกลับไปค้นหา
              </button>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold font-mono">
                รหัสภายใน: {selectedVoucher.id}
              </span>
            </div>
            <VoucherCard
              voucher={selectedVoucher}
              onSendEmail={mockSendEmail}
              currentUser={currentUser}
              systemSettings={systemSettings}
            />

            {/* ข้อมูลจัดรถจัดส่งสำหรับพนักงาน (Internal Dispatch Info for Staff) */}
            <div className="max-w-2xl mx-auto w-full bg-sky-50/50 border border-sky-100 rounded-3xl p-5 shadow-sm mt-4 no-print">
              <h3 className="text-xs font-black text-sky-900 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-sky-100/40 pb-2">
                🚐 ข้อมูลการจัดรถรับ-ส่งภายใน (Internal Dispatch details)
              </h3>
              <div className="p-3 bg-white rounded-2xl border border-sky-100/40 shadow-2xs text-xs text-slate-700 flex items-center gap-1.5">
                <span>ประเภทยานพาหนะ:</span>
                <strong className="text-sky-950 font-bold">{selectedVoucher.vehicleType || 'ไม่ได้ระบุ'}</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoice' && (
          <InvoiceGenerator
            vouchers={vouchers}
            editingInvoice={editingInvoice}
            onAddInvoice={onAddInvoice}
            onUpdateInvoice={onUpdateInvoice}
            onCancelEdit={() => {
              setEditingInvoice(null);
              setActiveTab('manage-invoices');
            }}
            currentUser={currentUser}
            systemSettings={systemSettings}
          />
        )}

        {activeTab === 'manage-invoices' && (
          <InvoiceSearch
            invoices={invoices}
            currentUser={currentUser}
            onEditInvoice={(invoice) => {
              setEditingInvoice(invoice);
              setActiveTab('invoice');
            }}
            onDeleteInvoice={onDeleteInvoice}
            onSelectInvoice={(invoice) => {
              setEditingInvoice(invoice);
              setActiveTab('invoice');
            }}
          />
        )}

        {activeTab === 'expenses' && (
          <div className="flex flex-col gap-8">
            <ExpenseForm
              onAddExpense={onAddExpense}
              onDeleteExpense={onDeleteExpense}
              expenses={expenses}
              masterData={masterData}
              canDelete={currentUser.role === 'admin' || currentUser.permissions.canDeleteVoucher}
            />

            {/* EXPENSE CATEGORIES SUMMARY REPORT SECTION (Special Staff requirement!) */}
            {/* "สรุปรายจ่าย จากวันที่นึง ถึงวันที่นึง ออกมาเป็นตาราง บันทึก เป็น png" */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(224,233,244,0.3)] max-w-6xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-sky-50 pb-4 mb-4 gap-4">
                <div>
                  <h3 className="text-base font-black text-sky-950 flex items-center gap-2">
                    📂 สรุปรายจ่ายตามหมวดหมู่ประจำงวด / Expense Category Report
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    เลือกช่วงเวลาเพื่อดูผลรวมแจกแจงรายจ่ายแยกตามประเภทและดาวน์โหลดตารางเป็นรูปภาพ PNG
                  </p>
                </div>
                
                <button
                  onClick={handleExportExpenseTablePng}
                  disabled={exportingExpenses}
                  id="btn_export_expense_cat_png"
                  className="flex items-center gap-1.5 bg-sky-950 hover:bg-sky-900 text-white font-bold text-xs px-4 py-2 rounded-xl border-b-2 border-sky-700 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  {exportingExpenses ? 'กำลังจับภาพ...' : 'บันทึกเป็นรูปตาราง PNG'}
                </button>
              </div>

              {/* Range Picking Calendars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 bg-sky-50/30 p-4 rounded-2xl border border-sky-100/50 text-xs">
                <div>
                  <label className="block font-bold text-sky-900 mb-1">จากวันที่ (From Date)</label>
                  <input
                    type="date"
                    value={expenseStart}
                    onChange={(e) => setExpenseStart(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-100 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sky-900 mb-1">ถึงวันที่ (To Date)</label>
                  <input
                    type="date"
                    value={expenseEnd}
                    onChange={(e) => setExpenseEnd(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-100 bg-white"
                  />
                </div>
              </div>

              {/* Table capturing target */}
              <div ref={expenseTableRef} className="border border-sky-100/60 rounded-2xl overflow-hidden p-4 md:p-6 bg-white shadow-2xs">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-sky-50">
                  <div>
                    <h4 className="text-base font-black text-sky-950">สรุปเงินจ่ายจำแนกตามหมวดหมู่ค่าใช้จ่าย</h4>
                    <p className="text-[10px] text-sky-400 font-mono mt-0.5">
                      ช่วงวันที่: {expenseStart} ถึง {expenseEnd} • KOHNGAICAMPINGTRAVEL
                    </p>
                  </div>
                  <span className="text-xs font-bold text-rose-600 font-mono bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl">
                    ยอดจ่ายรวม: ฿{totalExpenseFiltered.toLocaleString()}
                  </span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sky-50/50 text-sky-950 font-bold border-b border-sky-100 font-sans">
                      <th className="p-3 pl-4">ประเภทหมวดหมู่รายจ่าย</th>
                      <th className="p-3 text-center w-24">จำนวนครั้งเบิก</th>
                      <th className="p-3 text-right pr-4 w-40">ยอดเงินรวมจ่าย (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50 font-sans text-slate-700">
                    {Object.entries(categorySummary).map(([cat, val]) => {
                      return (
                        <tr key={`cat-tbl-${cat}`} className="hover:bg-sky-50/20">
                          <td className="p-3 pl-4 font-semibold text-slate-800">{cat}</td>
                          <td className="p-3 text-center font-mono font-semibold text-sky-600">{val.count} ครั้ง</td>
                          <td className="p-3 text-right pr-4 font-mono font-bold text-rose-600">
                            ฿{val.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-sky-50/30 text-sky-950 font-black">
                      <td className="p-3 pl-4" colSpan={2}>รวมรายจ่ายในคาบทั้งหมด</td>
                      <td className="p-3 text-right pr-4 font-mono text-rose-600 text-sm">
                        ฿{totalExpenseFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <ReportSummary
            vouchers={vouchers}
            expenses={expenses}
            masterData={masterData}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'agent-report' && (
          <AgentReport
            vouchers={vouchers}
            invoices={invoices}
            masterData={masterData}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'master-data' && (
          <MasterDataSettings
            masterData={masterData}
            currentUser={currentUser}
            onUpdateMasterData={onUpdateMasterData}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeManager
            users={users}
            currentUser={currentUser}
            onAddUser={onAddUser}
            onDeleteUser={onDeleteUser}
            onUpdatePermissions={onUpdatePermissions}
          />
        )}

        {activeTab === 'system-settings' && (
          <SystemSettingsManager
            systemSettings={systemSettings}
            currentUser={currentUser}
            onUpdateSystemSettings={onUpdateSystemSettings}
          />
        )}

        {activeTab === 'activity-and-stats' && (
          <EmployeeActivityStats
            users={users}
            vouchers={vouchers}
            activityLogs={activityLogs}
            currentUser={currentUser}
            systemSettings={systemSettings}
          />
        )}
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="h-8 bg-sky-950 text-sky-300/80 flex items-center justify-between px-6 text-[10px] shrink-0 border-t border-sky-900 no-print">
        <div className="flex items-center gap-4">
          <span>Connected to: Local Browser Database (Secure)</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> System Live • Sky Theme Active
          </span>
        </div>
        <div>
          <span>Support: Line ID @kohngaicamping</span>
        </div>
      </footer>
      
      {/* EMAIL DISPATCHER MODAL USING kohngaicampingtour@gmail.com */}
      {emailModalVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-550 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-sky-950 p-4 text-white flex justify-between items-center border-b border-sky-900">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm">ส่งอีเมลใบจองหาลูกค้า (Email Dispatcher Room)</h3>
              </div>
              <button 
                onClick={() => setEmailModalVoucher(null)}
                className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 bg-slate-50 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex gap-2.5 items-start">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  ระบบนี้จะช่วยอำนวยความสะดวกในการจัดส่งรายละเอียดผ่านอีเมลโดยใช้ <strong>{systemSettings.email || 'kohngaicampingtour@gmail.com'}</strong> เป็นอีเมลผู้ส่งหลักของทางบริษัท คุณสามารถคลิกเพื่อเปิดโปรแกรมส่งเมล หรือคัดลอกข้อมูลเพื่อนำไปส่งด้วยตนเองได้อย่างรวดเร็ว
                </p>
              </div>

              {/* Sender & Recipient fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">อีเมลผู้ส่ง (Sender Email)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly 
                      value={systemSettings.email || 'kohngaicampingtour@gmail.com'}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-md uppercase">Official</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">อีเมลผู้รับลูกค้า (Recipient Email)</label>
                  <input 
                    type="email" 
                    value={customRecipientEmail}
                    onChange={(e) => setCustomRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="ระบุอีเมลผู้รับ"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">หัวข้ออีเมล (Subject)</label>
                <input 
                  type="text" 
                  value={customEmailSubject}
                  onChange={(e) => setCustomEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>

              {/* Editable Body */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">เนื้อหาอีเมลหลัก (Email Message Body)</label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(customEmailBody);
                      setEmailCopied(true);
                      setTimeout(() => setEmailCopied(false), 2000);
                    }}
                    className="text-[10px] text-sky-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    {emailCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">คัดลอกสำเร็จ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกข้อความ</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea 
                  rows={10}
                  value={customEmailBody}
                  onChange={(e) => setCustomEmailBody(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-2xl text-[11px] font-medium font-mono text-slate-700 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
              <button
                onClick={() => setEmailModalVoucher(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                ยกเลิก (Cancel)
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(customEmailBody);
                    setEmailCopied(true);
                    setTimeout(() => setEmailCopied(false), 2000);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-sky-50 hover:text-sky-800 border border-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {emailCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {emailCopied ? 'คัดลอกแล้ว' : 'คัดลอกเนื้อหา'}
                </button>

                <button
                  onClick={() => {
                    const mailtoUrl = `mailto:${encodeURIComponent(customRecipientEmail)}?subject=${encodeURIComponent(customEmailSubject)}&body=${encodeURIComponent(customEmailBody)}`;
                    window.location.href = mailtoUrl;
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl border-b-2 border-amber-700 shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="เปิด Gmail, Outlook หรือแอปส่งจดหมายหลักเพื่อจัดส่งอย่างเป็นทางการ"
                >
                  <Mail className="w-4 h-4" />
                  เปิดแอปส่งเมล (Send Mail)
                </button>

                <button
                  onClick={() => {
                    alert(`📧 ระบบบันทึกสถานะการส่งหาลูกค้า ${customRecipientEmail} จากที่อยู่ผู้ส่ง ${systemSettings.email || 'kohngaicampingtour@gmail.com'} เรียบร้อยแล้ว!`);
                    setEmailModalVoucher(null);
                  }}
                  className="px-4 py-2 bg-sky-950 hover:bg-sky-900 text-white font-black text-xs rounded-xl border-b-2 border-slate-900 shadow-3xs transition-all cursor-pointer"
                >
                  จำลองการส่งสำเร็จ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
