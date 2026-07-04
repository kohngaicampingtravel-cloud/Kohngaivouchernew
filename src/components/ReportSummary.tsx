import { useState, useRef } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Award, Truck, Search, FileText, Printer, Check, Info } from 'lucide-react';
import { Voucher, Expense, MasterData, User } from '../types';
import { getVehicleIcon } from './VoucherCard';

interface ReportSummaryProps {
  vouchers: Voucher[];
  expenses: Expense[];
  masterData: MasterData;
  currentUser: User;
}

export default function ReportSummary({ vouchers, expenses, masterData, currentUser }: ReportSummaryProps) {
  const [reportType, setReportType] = useState<'day' | 'month' | 'year' | 'custom'>('month');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [targetYear, setTargetYear] = useState(new Date().getFullYear().toString()); // YYYY

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filters
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchVoucherNo, setSearchVoucherNo] = useState('');
  const [searchAgent, setSearchAgent] = useState('ALL');
  const [searchVehicleType, setSearchVehicleType] = useState('ALL');

  // Filter Sales & Expenses based on timeframe
  const getFilteredData = () => {
    let filteredVouchers = [...vouchers];
    let filteredExpenses = [...expenses];

    // Timeframe filters
    if (reportType === 'day') {
      filteredVouchers = filteredVouchers.filter(v => v.serviceDate === targetDate);
      filteredExpenses = filteredExpenses.filter(e => e.date === targetDate);
    } else if (reportType === 'month') {
      filteredVouchers = filteredVouchers.filter(v => v.serviceDate.startsWith(targetMonth));
      filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(targetMonth));
    } else if (reportType === 'year') {
      filteredVouchers = filteredVouchers.filter(v => v.serviceDate.startsWith(targetYear));
      filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(targetYear));
    } else if (reportType === 'custom') {
      if (startDate) {
        filteredVouchers = filteredVouchers.filter(v => v.serviceDate >= startDate);
        filteredExpenses = filteredExpenses.filter(e => e.date >= startDate);
      }
      if (endDate) {
        filteredVouchers = filteredVouchers.filter(v => v.serviceDate <= endDate);
        filteredExpenses = filteredExpenses.filter(e => e.date <= endDate);
      }
    }

    // Secondary Search Queries
    if (searchCustomer) {
      filteredVouchers = filteredVouchers.filter(v => 
        v.customerName.toLowerCase().includes(searchCustomer.toLowerCase())
      );
    }
    if (searchVoucherNo) {
      filteredVouchers = filteredVouchers.filter(v => 
        v.voucherNo.toLowerCase().includes(searchVoucherNo.toLowerCase()) ||
        v.externalVoucherNo.toLowerCase().includes(searchVoucherNo.toLowerCase())
      );
    }
    if (searchAgent !== 'ALL') {
      filteredVouchers = filteredVouchers.filter(v => v.agentName === searchAgent);
    }
    if (searchVehicleType !== 'ALL') {
      filteredVouchers = filteredVouchers.filter(v => v.vehicleType === searchVehicleType);
    }

    return { filteredVouchers, filteredExpenses };
  };

  const { filteredVouchers, filteredExpenses } = getFilteredData();

  // Calculations
  const totalSalesRevenue = filteredVouchers.reduce((sum, v) => {
    const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
    const vTotal = isPrivate 
      ? v.driverPrice 
      : (v.driverCount * v.driverPrice) + (v.pillionCount * v.pillionPrice);
    return sum + vTotal;
  }, 0);

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSalesRevenue - totalExpenseAmount;

  const paidVouchersCount = filteredVouchers.filter(v => v.paymentStatus === 'Paid').length;
  const pendingVouchersCount = filteredVouchers.filter(v => v.paymentStatus === 'Pending').length;
  const unpaidVouchersCount = filteredVouchers.filter(v => v.paymentStatus === 'Unpaid').length;

  const driverCountSum = filteredVouchers.reduce((sum, v) => sum + v.driverCount, 0);
  const pillionCountSum = filteredVouchers.reduce((sum, v) => sum + v.pillionCount, 0);

  // Dispatch Vehicles Count Statistics: "สรุปตามประเภทยานพาหนะ"
  const vehicleTypeStats: { [key: string]: number } = {};

  // Initialize stats with master data keys
  (masterData.vehicleTypes || []).forEach(v => {
    vehicleTypeStats[v] = 0;
  });

  filteredVouchers.forEach(v => {
    if (v.vehicleType) {
      vehicleTypeStats[v.vehicleType] = (vehicleTypeStats[v.vehicleType] || 0) + 1;
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto printable-report-section">
      {/* Search and Period Picker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm no-print">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          สรุปรายงานรายการขายและรายจ่าย / Sales & Expense Report
        </h3>

        {/* Timeframe Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ประเภทรายงาน (Report Type)</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setReportType('day')}
                className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all ${reportType === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
              >
                รายวัน
              </button>
              <button
                onClick={() => setReportType('month')}
                className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all ${reportType === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
              >
                รายเดือน
              </button>
              <button
                onClick={() => setReportType('year')}
                className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all ${reportType === 'year' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
              >
                รายปี
              </button>
              <button
                onClick={() => setReportType('custom')}
                className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all ${reportType === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
              >
                กำหนดเอง
              </button>
            </div>
          </div>

          {/* Conditional Calendars based on selection */}
          {reportType === 'day' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">เลือกวันที่ (Select Date)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
              />
            </div>
          )}

          {reportType === 'month' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">เลือกเดือน (Select Month)</label>
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
              />
            </div>
          )}

          {reportType === 'year' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">เลือกปี (Select Year)</label>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year.toString()}>{year + 543} (ปี {year})</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'custom' && (
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">เริ่มจากวันที่</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">สิ้นสุดวันที่</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Query Filter Section */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ค้นตามชื่อลูกค้า</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                placeholder="ชื่อลูกค้า..."
                className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ค้นรหัสวอเชอร์ (ใน/นอก)</label>
            <input
              type="text"
              value={searchVoucherNo}
              onChange={(e) => setSearchVoucherNo(e.target.value)}
              placeholder="KNC-... หรือ EXT-..."
              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">กรองตามเอเยนต์</label>
            <select
              value={searchAgent}
              onChange={(e) => setSearchAgent(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
            >
              <option value="ALL">เอเยนต์ทั้งหมด</option>
              {masterData.agents.map(a => (
                <option key={`rep-ag-${a}`} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">กรองประเภทยานพาหนะ</label>
            <select
              value={searchVehicleType}
              onChange={(e) => setSearchVehicleType(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none bg-white"
            >
              <option value="ALL">ยานพาหนะทั้งหมด</option>
              {(masterData.vehicleTypes || []).map(vt => (
                <option key={`rep-v-type-${vt}`} value={vt}>{vt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Report Layout Container */}
      <div id="capture_report_printable" className="bg-white text-slate-800 p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
        
        {/* Print Brand Header (Visible in print) */}
        <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-wider text-slate-900">
              KOHNGAI<span className="text-amber-500">CAMPING</span>TRAVEL
            </h1>
            <p className="text-xs text-slate-500 font-mono">CAMPING & TOUR SERVICE MANAGER REPORT</p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-md uppercase tracking-wider">
              {reportType === 'day' && 'DAILY REPORT'}
              {reportType === 'month' && 'MONTHLY REPORT'}
              {reportType === 'year' && 'ANNUAL REPORT'}
              {reportType === 'custom' && 'CUSTOM PERIOD REPORT'}
            </span>
            <p className="text-xs text-slate-400 font-mono mt-1">
              พิมพ์โดย: {currentUser.name} • วันที่ {new Date().toLocaleDateString('th-TH')}
            </p>
          </div>
        </div>

        {/* Selected Period info */}
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex justify-between items-center text-sm">
          <span className="font-bold text-slate-700">ช่วงเวลาสรุป:</span>
          <span className="font-mono font-bold text-amber-600">
            {reportType === 'day' && `วันที่ ${targetDate}`}
            {reportType === 'month' && `ประจำเดือน ${targetMonth}`}
            {reportType === 'year' && `ประจำปี ${targetYear}`}
            {reportType === 'custom' && `ระหว่างวันที่ ${startDate || '-'} ถึง ${endDate || '-'}`}
          </span>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue */}
          <div className="bg-emerald-50/55 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายรับรวม (Sales Total)</span>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  ฿{totalSalesRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-emerald-700 mt-3 flex items-center gap-1">
              <Check className="w-3 h-3" />
              คำนวณจากวอเชอร์ที่ออกทั้งหมด {filteredVouchers.length} ใบ
            </p>
          </div>

          {/* Expenses */}
          <div className="bg-rose-50/55 border border-rose-100 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายจ่ายรวม (Expenses Total)</span>
                <p className="text-2xl font-black text-rose-600 font-mono mt-1">
                  ฿{totalExpenseAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-rose-500 text-white rounded-xl shadow-xs">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-rose-700 mt-3">
              รวมรายการเบิกจ่าย {filteredExpenses.length} รายการในคาบเวลา
            </p>
          </div>

          {/* Net Profit */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between ${netProfit >= 0 ? 'bg-amber-50/55 border-amber-100' : 'bg-red-50/55 border-red-100'}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">กำไรสุทธิ (Net Balance)</span>
                <p className={`text-2xl font-black font-mono mt-1 ${netProfit >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  ฿{netProfit.toLocaleString()}
                </p>
              </div>
              <div className={`p-2 rounded-xl shadow-xs text-white ${netProfit >= 0 ? 'bg-amber-500' : 'bg-red-500'}`}>
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-[10px] mt-3 font-semibold ${netProfit >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
              {netProfit >= 0 ? 'ผลการดำเนินงานเป็นบวก (Profit)' : 'ผลการดำเนินงานติดลบ (Loss)'}
            </p>
          </div>
        </div>

        {/* LOGISTICAL SUMMARY: Dispatch Vehicle Statistics (CRITICAL) */}
        <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Truck className="w-4.5 h-4.5 text-amber-500" />
            สรุปประเภทยานพาหนะที่ใช้ (Vehicle Type Dispatch Statistics)
          </h3>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1 flex justify-between">
              <span>ประเภทยานพาหนะ (Vehicle Types)</span>
              <span className="text-slate-400 font-mono">ความถี่การจอง</span>
            </h4>
            <div className="flex flex-col gap-2 max-w-xl">
              {(masterData.vehicleTypes || []).map(vt => {
                const count = vehicleTypeStats[vt] || 0;
                const totalCount = Object.values(vehicleTypeStats).reduce((s, c) => s + c, 0) || 1;
                const percent = Math.round((count / totalCount) * 100);
                return (
                  <div key={`stat-v-${vt}`} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="text-emerald-700 shrink-0">
                        {getVehicleIcon(vt)}
                      </div>
                      <span className="font-semibold text-slate-700">{vt}</span>
                    </div>
                    <div className="flex items-center gap-3 w-2/3 justify-end">
                      <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div className="bg-emerald-500 h-full" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="font-mono font-bold bg-white border border-slate-200 text-slate-800 px-2.5 py-0.5 rounded-md min-w-14 text-center shadow-2xs">
                        {count} ครั้ง
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DETAILS GRID: VOUCHERS AND EXPENSES IN PRINT FORMAT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Vouchers Segment */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                รายละเอียดวอเชอร์จำหน่าย (Sales Details - Vouchers)
              </h3>
              <span className="text-[10px] font-mono text-slate-400">ทั้งหมด {filteredVouchers.length} ใบ</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <th className="p-2 pl-3">รหัส / วันบริการ</th>
                    <th className="p-2">ลูกค้า / เอเยนต์</th>
                    <th className="p-2 text-center">ผู้ใหญ่/เด็ก</th>
                    <th className="p-2 text-right pr-3">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">ไม่มีข้อมูลการขายในรอบนี้</td>
                    </tr>
                  ) : (
                    filteredVouchers.map((v) => {
                      const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
                      const vTotal = isPrivate 
                        ? v.driverPrice 
                        : (v.driverCount * v.driverPrice) + (v.pillionCount * v.pillionPrice);
                      return (
                        <tr key={`v-tbl-${v.id}`} className="hover:bg-slate-50">
                          <td className="p-2 pl-3">
                            <span className="font-mono font-bold block text-slate-800">{v.voucherNo}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{v.serviceDate}</span>
                          </td>
                          <td className="p-2">
                            <span className="font-semibold text-slate-900 block">{v.customerName}</span>
                            <span className="text-[9px] text-slate-500 block">Agent: {v.agentName}</span>
                          </td>
                          <td className="p-2 text-center font-mono text-[10px]">
                            {v.driverCount} / {v.pillionCount}
                          </td>
                          <td className="p-2 text-right pr-3 font-mono font-bold text-slate-800">
                            ฿{vTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses Segment */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                รายละเอียดเงินจ่ายออก (Expense Details)
              </h3>
              <span className="text-[10px] font-mono text-slate-400">ทั้งหมด {filteredExpenses.length} รายการ</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <th className="p-2 pl-3">วันที่ / หมวดหมู่</th>
                    <th className="p-2">คำอธิบาย</th>
                    <th className="p-2 text-center">ผู้เบิก</th>
                    <th className="p-2 text-right pr-3">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">ไม่มีข้อมูลรายจ่ายในรอบนี้</td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => {
                      return (
                        <tr key={`e-tbl-${e.id}`} className="hover:bg-slate-50">
                          <td className="p-2 pl-3">
                            <span className="font-semibold block text-amber-700">{e.category}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{e.date}</span>
                          </td>
                          <td className="p-2 max-w-[150px] truncate" title={e.description}>
                            {e.description || '-'}
                          </td>
                          <td className="p-2 text-center font-mono text-[10px] text-slate-500">
                            {e.createdBy}
                          </td>
                          <td className="p-2 text-right pr-3 font-mono font-bold text-rose-600">
                            ฿{e.amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer info (Visible in print) */}
        <div className="border-t border-dashed border-slate-300 pt-5 text-center text-xs text-slate-400 font-mono">
          © {new Date().getFullYear()} KOHNGAICAMPINGTRAVEL SYSTEM. ALL RIGHTS RESERVED. PRINT GENERATED SUCCESSFULLY.
        </div>

      </div>

      {/* Download and Print Command Bar */}
      <div className="flex justify-center gap-4 mt-2 no-print">
        <button
          onClick={handlePrint}
          id="btn_print_pdf"
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl shadow-md hover:bg-amber-600 transition-colors"
        >
          <Printer className="w-5 h-5 animate-pulse" />
          พิมพ์ใบสรุปรายงานและบันทึกเป็น PDF
        </button>
      </div>
    </div>
  );
}
