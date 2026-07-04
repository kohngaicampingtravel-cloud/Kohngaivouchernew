import { useState, useRef } from 'react';
import { 
  Briefcase, TrendingUp, TrendingDown, DollarSign, Search, FileText, 
  Printer, Check, Info, Calendar, User, Download, AlertCircle, Receipt, ArrowRight, X
} from 'lucide-react';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { Voucher, Invoice, MasterData, User as UserType } from '../types';

interface AgentReportProps {
  vouchers: Voucher[];
  invoices: Invoice[];
  masterData: MasterData;
  currentUser: UserType;
}

export default function AgentReport({ vouchers, invoices, masterData, currentUser }: AgentReportProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Helper to calculate Voucher financial figures
  const getVoucherTotals = (v: Voucher) => {
    const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
    const total = isPrivate 
      ? v.driverPrice 
      : (v.driverCount * v.driverPrice) + (v.pillionCount * v.pillionPrice);
    let paid = 0;
    if (v.paymentStatus === 'Paid') {
      paid = total;
    } else if (v.paymentStatus === 'Partial') {
      paid = v.depositAmount || 0;
    }
    const outstanding = Math.max(0, total - paid);
    return { total, paid, outstanding };
  };

  // Helper to calculate Invoice financial figures
  const getInvoiceTotals = (inv: Invoice) => {
    const subtotal = inv.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = (subtotal * inv.taxPercent) / 100;
    const total = subtotal + taxAmount - inv.discount;
    const paid = inv.isPaid ? total : 0;
    const outstanding = inv.isPaid ? 0 : total;
    return { total, paid, outstanding };
  };

  // Date filtering helper
  const isWithinDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  // 1. Calculate Summary per Agent
  const agentsList = masterData.agents || [];
  
  const agentSummaries = agentsList.map(agent => {
    // Filter vouchers for this agent
    const agentVouchers = vouchers.filter(v => 
      v.agentName === agent && 
      (!startDate || !endDate || isWithinDateRange(v.serviceDate))
    );

    // Filter invoices for this agent
    const agentInvoices = invoices.filter(inv => 
      inv.agentName === agent && 
      (!startDate || !endDate || isWithinDateRange(inv.invoiceDate))
    );

    let totalVoucherRevenue = 0;
    let totalVoucherPaid = 0;
    let totalVoucherOutstanding = 0;

    agentVouchers.forEach(v => {
      const { total, paid, outstanding } = getVoucherTotals(v);
      totalVoucherRevenue += total;
      totalVoucherPaid += paid;
      totalVoucherOutstanding += outstanding;
    });

    let totalInvoiceRevenue = 0;
    let totalInvoicePaid = 0;
    let totalInvoiceOutstanding = 0;

    agentInvoices.forEach(inv => {
      const { total, paid, outstanding } = getInvoiceTotals(inv);
      totalInvoiceRevenue += total;
      totalInvoicePaid += paid;
      totalInvoiceOutstanding += outstanding;
    });

    return {
      agentName: agent,
      vouchersCount: agentVouchers.length,
      voucherRevenue: totalVoucherRevenue,
      voucherPaid: totalVoucherPaid,
      voucherOutstanding: totalVoucherOutstanding,
      invoicesCount: agentInvoices.length,
      invoiceRevenue: totalInvoiceRevenue,
      invoicePaid: totalInvoicePaid,
      invoiceOutstanding: totalInvoiceOutstanding,
      totalRevenue: totalVoucherRevenue, // รายได้รวม เอาเฉพาะยอดจาก Voucher เท่านั้น ไม่รวมยอด Invoice ตามที่ลูกค้ากำหนด
      totalPaid: totalVoucherPaid,       // รับชำระรวม เอาเฉพาะยอดจาก Voucher เท่านั้น
      totalOutstanding: totalVoucherOutstanding // ค้างชำระรวม เอาเฉพาะยอดจาก Voucher เท่านั้น
    };
  });

  // Sort summaries by total revenue descending
  const sortedSummaries = [...agentSummaries].sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Overall totals across ALL agents (or filtered date range)
  const grandTotalRevenue = agentSummaries.reduce((sum, s) => sum + s.totalRevenue, 0);
  const grandTotalPaid = agentSummaries.reduce((sum, s) => sum + s.totalPaid, 0);
  const grandTotalOutstanding = agentSummaries.reduce((sum, s) => sum + s.totalOutstanding, 0);

  // 2. Data for the SELECTED agent
  const currentAgentSummary = agentSummaries.find(s => s.agentName === selectedAgent);

  const selectedAgentVouchers = vouchers.filter(v => 
    v.agentName === selectedAgent && 
    (!startDate || !endDate || isWithinDateRange(v.serviceDate))
  ).map(v => ({
    ...v,
    ...getVoucherTotals(v)
  }));

  const selectedAgentInvoices = invoices.filter(inv => 
    inv.agentName === selectedAgent && 
    (!startDate || !endDate || isWithinDateRange(inv.invoiceDate))
  ).map(inv => ({
    ...inv,
    ...getInvoiceTotals(inv)
  }));

  const handlePrint = () => {
    window.print();
  };

  const handleExportPng = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const canvas = await safeHtml2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const agentLabel = selectedAgent === 'ALL' ? 'ALL_AGENTS' : selectedAgent.replace(/\s+/g, '_');
      link.download = `AGENT-REVENUE-SUMMARY-${agentLabel}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting PNG:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto printable-report-section">
      
      {/* 1. Filtering & Selection Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm no-print">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-sky-600" />
          สรุปรายงานแยกตามเอเยนต์ผู้จอง / Booking Agent Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">เลือกเอเยนต์ (Select Agent)</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-semibold text-slate-700"
            >
              <option value="ALL">🔍 เอเยนต์ทั้งหมด (All Booking Agents)</option>
              {agentsList.map(agent => (
                <option key={`opt-ag-${agent}`} value={agent}>{agent}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">เริ่มจากวันที่ (From Date)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">สิ้นสุดวันที่ (To Date)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* 2. Printable Content Frame */}
      <div ref={reportRef} className="bg-white text-slate-800 p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
        
        {/* Brand print header */}
        <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-wider text-slate-900">
              KOHNGAI<span className="text-amber-500">CAMPING</span>TRAVEL
            </h1>
            <p className="text-xs text-slate-500 font-mono">AGENT FINANCIAL AUDIT REPORT</p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-sky-950 text-white font-bold text-xs rounded-md uppercase tracking-wider">
              {selectedAgent === 'ALL' ? 'ALL AGENTS REPORT' : `AGENT: ${selectedAgent}`}
            </span>
            <p className="text-xs text-slate-400 font-mono mt-1">
              ผู้ตรวจ: {currentUser.name} • วันที่พิมพ์ {new Date().toLocaleDateString('th-TH')}
            </p>
          </div>
        </div>

        {/* Filters status banner */}
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2">
          <div>
            <span className="font-bold text-slate-700">การคัดกรอง: </span>
            <span className="font-medium text-slate-600">
              เอเยนต์: <strong className="text-sky-900">{selectedAgent === 'ALL' ? 'ทั้งหมด' : selectedAgent}</strong>
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-700">ช่วงเวลาบริการ: </span>
            <span className="font-mono font-bold text-amber-600">
              {startDate || endDate ? `${startDate || 'ไม่จำกัด'} ถึง ${endDate || 'ไม่จำกัด'}` : 'ข้อมูลทั้งหมดในระบบ'}
            </span>
          </div>
        </div>

        {/* MAIN DISPLAY: Overview or Selected Agent */}
        {selectedAgent === 'ALL' ? (
          /* ================= ALL AGENTS OVERVIEW MODE ================= */
          <div className="flex flex-col gap-6">
            
            {/* Grand summary stats box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ยอดจำหน่ายรวมของทุกเอเยนต์ (Total Revenue)</span>
                <p className="text-2xl font-black text-sky-900 font-mono mt-1">
                  ฿{grandTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500 mt-2">ยอดขายทัวร์สะสมจาก Voucher (ไม่รวมยอด Invoice)</p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รับชำระเงินเรียบร้อย (Total Received)</span>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  ฿{grandTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-2">
                  คิดเป็น {grandTotalRevenue > 0 ? Math.round((grandTotalPaid / grandTotalRevenue) * 100) : 0}% ของ Voucher ทั้งหมด
                </p>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ยอดเงินค้างชำระสะสม (Outstanding / AR)</span>
                <p className="text-2xl font-black text-rose-600 font-mono mt-1 animate-pulse">
                  ฿{grandTotalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-rose-700 font-bold mt-2">
                  ยอดค้างจ่ายรวมจาก Voucher (ไม่รวมยอด Invoice)
                </p>
              </div>
            </div>

            {/* Aggregated Agents Table */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black text-sky-950 uppercase tracking-wider">
                  ตารางสรุปงบการเงินเอเยนต์ผู้จองทุกราย (Agent Financial Summary Table)
                </h3>
                <span className="text-[10px] font-bold text-slate-400 font-mono">จำนวน {agentsList.length} เอเยนต์</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-sans">
                      <th className="p-3 pl-4">ชื่อเอเยนต์ (Agent Name)</th>
                      <th className="p-3 text-center">จำนวน Voucher</th>
                      <th className="p-3 text-right">รายได้ Voucher</th>
                      <th className="p-3 text-center">จำนวน Invoice</th>
                      <th className="p-3 text-right">รายได้ Invoice</th>
                      <th className="p-3 text-right">รวมรายได้ทั้งหมด</th>
                      <th className="p-3 text-right">รับเงินแล้ว</th>
                      <th className="p-3 text-right pr-4 text-rose-600 bg-rose-50/25">ยอดค้างชำระ (AR)</th>
                      <th className="p-3 text-center w-12 no-print">ดู</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                    {sortedSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">ยังไม่มีข้อมูลรายชื่อเอเยนต์ในระบบ</td>
                      </tr>
                    ) : (
                      sortedSummaries.map((s) => (
                        <tr 
                          key={`s-ag-row-${s.agentName}`} 
                          className="hover:bg-sky-50/20 transition-colors"
                        >
                          <td className="p-3 pl-4 font-bold text-slate-900">{s.agentName}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{s.vouchersCount} ใบ</td>
                          <td className="p-3 text-right font-mono text-slate-600">฿{s.voucherRevenue.toLocaleString()}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{s.invoicesCount} ใบ</td>
                          <td className="p-3 text-right font-mono text-slate-600">฿{s.invoiceRevenue.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-800">฿{s.totalRevenue.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-emerald-600">฿{s.totalPaid.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-black text-rose-600 bg-rose-50/20">
                            ฿{s.totalOutstanding.toLocaleString()}
                          </td>
                          <td className="p-3 text-center no-print">
                            <button
                              onClick={() => setSelectedAgent(s.agentName)}
                              className="p-1 rounded-lg hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
                              title="คลิกเพื่อดูรายละเอียดเชิงลึก"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          /* ================= SINGLE SELECTED AGENT MODE ================= */
          <div className="flex flex-col gap-6">
            
            {/* Navigation back */}
            <div className="flex justify-between items-center no-print pb-2 border-b border-slate-100">
              <button
                onClick={() => setSelectedAgent('ALL')}
                className="flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-900 font-bold transition-all cursor-pointer"
              >
                ← ย้อนกลับไปรายงานเอเยนต์ทั้งหมด (Back to All Agents)
              </button>
              <span className="text-xs text-slate-400 font-bold">ข้อมูลเจาะลึก: {selectedAgent}</span>
            </div>

            {/* Financial figures specifically for selected agent */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายได้รวมของ {selectedAgent}</span>
                <p className="text-2xl font-black text-sky-900 font-mono mt-1">
                  ฿{currentAgentSummary?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="text-[10px] text-slate-500 mt-2 flex flex-col gap-0.5 font-sans">
                  <span>• จาก Voucher ทัวร์: ฿{currentAgentSummary?.voucherRevenue.toLocaleString()} ({currentAgentSummary?.vouchersCount} ใบ)</span>
                  <span className="text-slate-400">• บิล Invoice: ฿{currentAgentSummary?.invoiceRevenue.toLocaleString()} ({currentAgentSummary?.invoicesCount} ใบ) (ไม่รวมในรายได้หลัก)</span>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ชำระเงินเข้ามาแล้ว (Paid)</span>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  ฿{currentAgentSummary?.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="text-[10px] text-emerald-700 font-semibold mt-2">
                  คิดเป็น {currentAgentSummary && currentAgentSummary.totalRevenue > 0 ? Math.round((currentAgentSummary.totalPaid / currentAgentSummary.totalRevenue) * 100) : 0}% ของเป้า Voucher
                </div>
              </div>

              <div className="bg-rose-50/55 border border-rose-100 rounded-2xl p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ยอดหนี้คงค้างสะสม (Outstanding Balance)</span>
                <p className="text-2xl font-black text-rose-600 font-mono mt-1">
                  ฿{currentAgentSummary?.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="text-[10px] text-rose-700 font-bold mt-2 flex flex-col gap-0.5">
                  <span>• ค้างจาก Voucher: ฿{currentAgentSummary?.voucherOutstanding.toLocaleString()}</span>
                  <span className="text-rose-400/80">• ค้างจาก Invoice: ฿{currentAgentSummary?.invoiceOutstanding.toLocaleString()} (ไม่รวมในยอดค้างหลัก)</span>
                </div>
              </div>
            </div>

            {/* Split sections: Vouchers List and Invoices List */}
            <div className="grid grid-cols-1 gap-6">
              
              {/* Vouchers list for this Agent */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-black text-sky-950 uppercase tracking-wider pb-1 border-b border-slate-200">
                  รายการวอเชอร์จำหน่าย (Booking Vouchers Detail List)
                </h3>
                
                <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <th className="p-2 pl-3">รหัสวอเชอร์ / วันบริการ</th>
                        <th className="p-2">ชื่อลูกค้า / รายการทัวร์</th>
                        <th className="p-2 text-center">ยานพาหนะ</th>
                        <th className="p-2 text-center">คนขับ/คนซ้อน</th>
                        <th className="p-2 text-right">ยอดราคารวม</th>
                        <th className="p-2 text-right">ชำระแล้ว</th>
                        <th className="p-2 text-right pr-3 text-rose-600 bg-rose-50/15">ยอดค้างจ่าย (AR)</th>
                        <th className="p-2 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {selectedAgentVouchers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400">เอเยนต์รายนี้ยังไม่มีประวัติการออกวอเชอร์ในช่วงเวลาที่เลือก</td>
                        </tr>
                      ) : (
                        selectedAgentVouchers.map((v) => (
                          <tr key={`sel-ag-v-${v.id}`} className="hover:bg-slate-50/40">
                            <td className="p-2 pl-3">
                              <span className="font-mono font-bold block text-slate-800">{v.voucherNo}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{v.serviceDate}</span>
                            </td>
                            <td className="p-2">
                              <span className="font-bold text-slate-800 block">{v.customerName}</span>
                              <span className="text-[10px] text-slate-400 block">{v.tourName}</span>
                            </td>
                            <td className="p-2 text-center font-semibold text-slate-600">{v.vehicleType}</td>
                            <td className="p-2 text-center font-mono text-[10px] text-slate-500">
                              {v.driverCount} / {v.pillionCount}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-700">฿{v.total.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono text-emerald-600">฿{v.paid.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono font-bold text-rose-600 bg-rose-50/10">฿{v.outstanding.toLocaleString()}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black inline-block uppercase leading-none border ${
                                v.paymentStatus === 'Paid' 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : v.paymentStatus === 'Partial'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}>
                                {v.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoices list for this Agent */}
              <div className="flex flex-col gap-2 mt-4">
                <h3 className="text-xs font-black text-sky-950 uppercase tracking-wider pb-1 border-b border-slate-200">
                  รายการอินวอยซ์ออกบิล (Billing Invoices Detail List)
                </h3>
                
                <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <th className="p-2 pl-3">เลขที่อินวอยซ์ / วันที่ออก</th>
                        <th className="p-2">ผู้รับเอกสาร (Client Name)</th>
                        <th className="p-2">วันครบชำระ (Due Date)</th>
                        <th className="p-2 text-right">จำนวนเงินรวม</th>
                        <th className="p-2 text-right">ชำระแล้ว</th>
                        <th className="p-2 text-right pr-3 text-rose-600 bg-rose-50/15">ยอดค้างจ่าย (AR)</th>
                        <th className="p-2 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {selectedAgentInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400">เอเยนต์รายนี้ยังไม่มีประวัติการออกอินวอยซ์ในช่วงเวลาที่เลือก</td>
                        </tr>
                      ) : (
                        selectedAgentInvoices.map((inv) => (
                          <tr key={`sel-ag-inv-${inv.id}`} className="hover:bg-slate-50/40">
                            <td className="p-2 pl-3">
                              <span className="font-mono font-bold block text-slate-800">{inv.invoiceNo}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{inv.invoiceDate}</span>
                            </td>
                            <td className="p-2">
                              <span className="font-bold text-slate-800 block">{inv.clientName}</span>
                              <span className="text-[10px] text-slate-400 block">{inv.clientEmail}</span>
                            </td>
                            <td className="p-2 text-slate-500 font-mono text-[11px]">{inv.dueDate}</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-700">฿{inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right font-mono text-emerald-600">฿{inv.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right font-mono font-bold text-rose-600 bg-rose-50/10">฿{inv.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black inline-block border ${
                                inv.isPaid 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}>
                                {inv.isPaid ? 'PAID' : 'UNPAID'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Footer info (Visible in print) */}
        <div className="border-t border-dashed border-slate-300 pt-5 text-center text-[11px] text-slate-400 font-mono">
          © {new Date().getFullYear()} KOHNGAICAMPINGTRAVEL SYSTEM. ALL AGENTS FINANCIAL AUDIT REPORTS & OUTSTANDING BALANCES.
        </div>

      </div>

      {/* 3. Export & Print Command Bar */}
      <div className="flex justify-center gap-4 mt-2 no-print">
        <button
          onClick={handlePrint}
          id="btn_print_agent_report"
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-950 text-white font-bold text-xs rounded-xl shadow-md hover:bg-sky-900 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          พิมพ์สรุปรายงาน / Print PDF
        </button>

        <button
          onClick={handleExportPng}
          disabled={exporting}
          id="btn_export_agent_png"
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-800 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'กำลังจับภาพ...' : 'ดาวน์โหลดรายงานเป็นรูป PNG'}
        </button>
      </div>

    </div>
  );
}
