import { useRef, useState } from 'react';
import { Download, Mail, Phone, Calendar, Clock, MapPin, CheckCircle, AlertTriangle, HelpCircle, Globe, Truck, Car, Bus, Ship, Bike } from 'lucide-react';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { Voucher, User, SystemSettings } from '../types';
import { jsPDF } from 'jspdf';

interface VoucherCardProps {
  voucher: Voucher;
  onSendEmail?: (voucher: Voucher) => void;
  showActions?: boolean;
  currentUser?: User;
  systemSettings?: SystemSettings;
}

export function getVehicleIcon(vehicleType: string) {
  const type = (vehicleType || '').toLowerCase();
  
  // 1. Boat / Ship category
  if (
    type.includes('boat') || 
    type.includes('ship') || 
    type.includes('เรือ') || 
    type.includes('speedboat') || 
    type.includes('longtail') || 
    type.includes('ferry') || 
    type.includes('yacht') || 
    type.includes('canoe') || 
    type.includes('kayak') ||
    type.includes('⛵') ||
    type.includes('🚤') ||
    type.includes('🛶') ||
    type.includes('🛳️')
  ) {
    return <Ship className="w-4 h-4 text-emerald-600 mb-0.5" />;
  }
  
  // 2. Van / Bus category
  if (
    type.includes('van') || 
    type.includes('bus') || 
    type.includes('รถตู้') || 
    type.includes('มินิบัส') || 
    type.includes('shuttle') || 
    type.includes('coach') ||
    type.includes('🚐') ||
    type.includes('🚌')
  ) {
    return <Bus className="w-4 h-4 text-emerald-600 mb-0.5" />;
  }
  
  // 3. Motorcycle / Bicycle category
  if (
    type.includes('motorcycle') || 
    type.includes('motorbike') || 
    type.includes('bike') || 
    type.includes('scooter') || 
    type.includes('มอเตอร์ไซค์') || 
    type.includes('จักรยาน') ||
    type.includes('🏍️') ||
    type.includes('🚲') ||
    type.includes('scooters')
  ) {
    return <Bike className="w-4 h-4 text-emerald-600 mb-0.5" />;
  }
  
  // 4. Car / Sedan / Taxi category
  if (
    type.includes('car') || 
    type.includes('suv') || 
    type.includes('sedan') || 
    type.includes('taxi') || 
    type.includes('รถเก๋ง') || 
    type.includes('แท็กซี่') || 
    type.includes('limo') || 
    type.includes('🚗') ||
    type.includes('🚕')
  ) {
    return <Car className="w-4 h-4 text-emerald-600 mb-0.5" />;
  }
  
  // 5. Default/Fallback (Songthaew/Pickup/Truck)
  return <Truck className="w-4 h-4 text-emerald-600 mb-0.5" />;
}

export function formatPickupTime(timeStr: string, isEN: boolean) {
  if (!timeStr) return '';
  if (!isEN) return `${timeStr} น.`;
  
  // Parse HH:MM format
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${ampm}`;
    }
  }
  return `${timeStr} hrs`;
}

export default function VoucherCard({ 
  voucher, 
  onSendEmail, 
  showActions = true, 
  currentUser,
  systemSettings
}: VoucherCardProps) {
  const voucherRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const isEN = voucher.language === 'EN';

  // Helper translations
  const t = {
    title: isEN ? 'TOUR SERVICE VOUCHER' : 'เอกสารจองทัวร์ (วอเชอร์)',
    logoSubtitle: isEN ? 'CAMPING & ADVENTURE TOURS' : 'แคมป์ปิ้ง & ทัวร์ผจญภัย',
    voucherNo: isEN ? 'Voucher ID' : 'รหัสวอเชอร์',
    extVoucherNo: isEN ? 'External Voucher No.' : 'เลขวอเชอร์นอก',
    bookingDate: isEN ? 'Booking Date' : 'วันที่ออกวอเชอร์',
    customerName: isEN ? 'Customer Name' : 'ชื่อลูกค้า',
    customerPhone: isEN ? 'Phone Number' : 'เบอร์โทรศัพท์',
    customerEmail: isEN ? 'Email' : 'อีเมล',
    tourProgram: isEN ? 'Tour / Program' : 'โปรแกรมทัวร์',
    agent: isEN ? 'Agent' : 'เอเยนต์/ผู้ส่งจอง',
    serviceDate: isEN ? 'Service Date' : 'วันที่ใช้บริการ',
    pickupTime: isEN ? 'Pickup Time' : 'เวลารับ',
    pickupLocation: isEN ? 'Pickup Point' : 'จุดรับ',
    dropoffLocation: isEN ? 'Dropoff Point' : 'จุดส่ง',
    driverType: isEN ? 'Adult' : 'ผู้ใหญ่',
    pillionType: isEN ? 'Child' : 'เด็ก',
    quantity: isEN ? 'Qty' : 'จำนวน',
    pricePerUnit: isEN ? 'Rate' : 'ราคา/ท่าน',
    totalPrice: isEN ? 'Total Amount' : 'ราคารวมทั้งหมด',
    paymentStatus: isEN ? 'Payment Status' : 'สถานะชำระเงิน',
    notes: isEN ? 'Remarks / Meeting Point' : 'หมายเหตุ / สถานที่นัดพบ',
    importantNotice: isEN ? 'Important Instructions' : 'คำแนะนำสำคัญ',
    noticeText: isEN 
      ? 'Please be ready at the designated lobby/pickup point 15 minutes before the pickup time. Present this voucher on your mobile phone to our driver.'
      : 'กรุณาเตรียมตัวพร้อม ณ จุดรับหรือล็อบบี้ล่วงหน้า 15 นาทีก่อนเวลารับ และแสดงวอเชอร์นี้บนมือถือแก่พนักงานขับรถ',
    contactUs: isEN ? 'Contact: KOHNGAICAMPINGTRAVEL' : 'ติดต่อ: เกาะไหงแคมป์ปิ้งแทรเวล',
    statusPaid: isEN ? 'PAID' : 'ชำระเงินแล้ว',
    statusUnpaid: isEN ? 'UNPAID' : 'ยังไม่ชำระเงิน',
    statusPending: isEN ? 'PENDING' : 'รอตรวจสอบ',
    statusPartial: isEN ? 'PARTIAL DEPOSIT' : 'มัดจำบางส่วน',
    statusCollect: isEN ? 'COLLECT FROM CUSTOMER' : 'เก็บเงินจากลูกค้า',
    depositAmountLabel: isEN ? 'Deposit Amount' : 'ยอดเงินมัดจำ',
    collectAmountLabel: isEN ? 'Amount to Collect' : 'ยอดเงินเก็บหน้างาน',
    remainingAmountLabel: isEN ? 'Remaining Balance' : 'ยอดค้างชำระ',
  };

  const isPrivate = (voucher.vehicleType || '').toLowerCase().includes('private');
  const total = isPrivate 
    ? voucher.driverPrice 
    : (voucher.driverCount * voucher.driverPrice) + (voucher.pillionCount * voucher.pillionPrice);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid':
        return {
          bg: 'bg-emerald-100 text-emerald-950 border-emerald-400 font-black',
          badge: 'bg-emerald-600 text-white font-black',
          text: t.statusPaid,
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-900" />
        };
      case 'Pending':
        return {
          bg: 'bg-amber-100 text-amber-950 border-amber-400 font-black',
          badge: 'bg-amber-600 text-white font-black',
          text: t.statusPending,
          icon: <HelpCircle className="w-3.5 h-3.5 text-amber-900" />
        };
      case 'Partial':
        return {
          bg: 'bg-indigo-100 text-indigo-950 border-indigo-400 font-black',
          badge: 'bg-indigo-600 text-white font-black',
          text: `${t.statusPartial} (฿${(voucher.depositAmount || 0).toLocaleString()})`,
          icon: <CheckCircle className="w-3.5 h-3.5 text-indigo-900" />
        };
      case 'Collect':
        return {
          bg: 'bg-sky-100 text-sky-950 border-sky-400 font-black',
          badge: 'bg-sky-600 text-white font-black',
          text: `${t.statusCollect} (฿${(voucher.collectAmount || 0).toLocaleString()})`,
          icon: <HelpCircle className="w-3.5 h-3.5 text-sky-900" />
        };
      default:
        return {
          bg: 'bg-rose-100 text-rose-950 border-rose-400 font-black',
          badge: 'bg-rose-600 text-white font-black',
          text: t.statusUnpaid,
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-900" />
        };
    }
  };

  const statusInfo = getStatusStyle(voucher.paymentStatus);

  const handleDownloadPng = async () => {
    if (!voucherRef.current) return;
    setDownloading(true);
    try {
      // Small timeout to let any rendering settle
      await new Promise(resolve => setTimeout(resolve, 150));
      const canvas = await safeHtml2canvas(voucherRef.current, {
        scale: 4, // ultra-high resolution for maximum sharpness
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanCustomerName = voucher.customerName
        ? voucher.customerName.replace(/[^a-zA-Z0-9_\-\u0E00-\u0E7F\s]/g, '').trim().replace(/\s+/g, '_')
        : '';
      const filenameSuffix = cleanCustomerName ? `-${cleanCustomerName}` : '';
      link.download = `VOUCHER-${voucher.voucherNo || voucher.id}${filenameSuffix}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting voucher to PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!voucherRef.current) return;
    setPdfDownloading(true);
    try {
      // Small timeout to let any rendering settle
      await new Promise(resolve => setTimeout(resolve, 150));
      const canvas = await safeHtml2canvas(voucherRef.current, {
        scale: 4, // ultra-high resolution for maximum sharpness
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
      
      // Calculate layout to fit neatly on an A4 page with margins
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2); // 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      
      const cleanCustomerName = voucher.customerName
        ? voucher.customerName.replace(/[^a-zA-Z0-9_\-\u0E00-\u0E7F\s]/g, '').trim().replace(/\s+/g, '_')
        : '';
      const filenameSuffix = cleanCustomerName ? `-${cleanCustomerName}` : '';
      pdf.save(`VOUCHER-${voucher.voucherNo || voucher.id}${filenameSuffix}.pdf`);
    } catch (err) {
      console.error('Error exporting voucher to PDF:', err);
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Voucher Container for PNG Capture */}
      <div 
        ref={voucherRef}
        id="voucher-print-area"
        className="w-full bg-white text-slate-950 border-2 border-slate-300 rounded-2xl p-4 md:p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] flex flex-col gap-3 relative font-sans"
        style={{ 
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility'
        }}
      >
        {/* Header Ribbon / Decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-sky-600 to-amber-400 rounded-t-2xl"></div>

        {/* Brand & Logo Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pt-1 border-b-2 border-dashed border-slate-300 pb-2.5">
          <div className="flex items-center gap-3">
            {systemSettings?.logoUrl ? (
              <img src={systemSettings.logoUrl} alt="Logo" className="h-10 max-w-[140px] object-contain rounded" referrerPolicy="no-referrer" />
            ) : (
              <span className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-sm">K</span>
            )}
            <div>
              {(() => {
                const fullName = systemSettings?.companyName || 'บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด (KOHNGAI CAMPING TRAVEL)';
                let thPart = fullName;
                let enPart = '';
                const match = fullName.match(/^(.*?)\s*[\(\(](.*?)[\)\)]\s*$/) || fullName.match(/^(.*?)\s*[\/](.*?)$/);
                if (match) {
                  thPart = match[1].trim();
                  enPart = match[2].trim();
                }
                return (
                  <>
                    <h1 className="text-xs md:text-sm font-black tracking-tight text-slate-950 font-sans uppercase leading-tight">
                      {thPart}
                    </h1>
                    {enPart && (
                      <p className="text-[9px] md:text-[11px] font-extrabold text-slate-800 font-sans uppercase leading-tight mt-0.5">
                        {enPart}
                      </p>
                    )}
                  </>
                );
              })()}
              <p className="text-[10px] text-slate-950 font-black leading-relaxed mt-1 max-w-xl">
                <span className="font-extrabold text-slate-800">{isEN ? 'Address: ' : 'ที่อยู่: '}</span>
                <span>{systemSettings?.address || '565 Moo 11 Krabi Noi, Mueang Krabi, Krabi 81000 Thailand'}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span className="font-extrabold text-slate-800">{isEN ? 'Reg No: ' : 'เลขทะเบียน: '}</span>
                <span className="font-mono">{systemSettings?.registrationNo || '34/03242'}</span>
              </p>
            </div>
          </div>
          <div className="text-left md:text-right flex flex-col">
            <span className="text-[9px] uppercase font-mono tracking-widest text-slate-950 font-black">{t.title}</span>
            <span className="text-xl font-black font-mono text-slate-950 mt-0.5 tracking-tight">
              {voucher.voucherNo}
            </span>
            {voucher.externalVoucherNo && (
              <span className="text-xs text-slate-900 font-bold">
                {t.extVoucherNo}: <strong className="font-mono text-slate-950 font-black">{voucher.externalVoucherNo}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Client & Booking Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border-2 border-slate-300">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-black text-[9px] text-slate-950 uppercase tracking-widest">{t.customerName}</h3>
            <p className="font-black text-slate-950 text-sm leading-none">{voucher.customerName}</p>
            
            <div className="flex items-center gap-1.5 text-[11px] text-slate-950 font-black mt-0.5">
              <Phone className="w-3 h-3 text-sky-700" />
              <span>{voucher.customerPhone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-950 font-black">
              <Mail className="w-3 h-3 text-sky-700" />
              <span className="break-all">{voucher.customerEmail}</span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 md:border-l-2 md:border-slate-300 md:pl-3">
            <h3 className="font-black text-[9px] text-slate-950 uppercase tracking-widest">{t.tourProgram}</h3>
            <p className="font-black text-slate-950 text-[13px] leading-tight">
              {voucher.tourName}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[11px] text-slate-900 font-extrabold">{t.agent}:</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 bg-slate-200 text-slate-950 rounded border-2 border-slate-300 leading-none">
                {voucher.agentName}
              </span>
            </div>
          </div>
        </div>

        {/* Date, Time & Vehicle Highlights */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="border-2 border-slate-300 rounded-xl py-3 px-2 min-h-[88px] flex flex-col items-center justify-center bg-white shadow-3xs">
            <Calendar className="w-4 h-4 text-sky-700 mb-1" />
            <span className="text-[9px] text-slate-950 uppercase font-black tracking-wider">{t.serviceDate}</span>
            <span className="font-black text-slate-950 text-[11px] mt-1.5 leading-normal block px-0.5 break-words">
              {new Date(voucher.serviceDate).toLocaleDateString(isEN ? 'en-US' : 'th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="border-2 border-slate-300 rounded-xl py-3 px-2 min-h-[88px] flex flex-col items-center justify-center bg-white shadow-3xs">
            <Clock className="w-4 h-4 text-amber-600 mb-1" />
            <span className="text-[9px] text-slate-950 uppercase font-black tracking-wider">{t.pickupTime}</span>
            <span className="font-black text-amber-950 text-[12px] mt-1.5 font-mono leading-normal block px-1 py-0.5 bg-amber-100 rounded border border-amber-300 break-words">
              {formatPickupTime(voucher.pickupTime, isEN)}
            </span>
          </div>

          <div className="border-2 border-slate-300 rounded-xl py-3 px-2 min-h-[88px] flex flex-col items-center justify-center bg-white shadow-3xs">
            {getVehicleIcon(voucher.vehicleType)}
            <span className="text-[9px] text-slate-950 uppercase font-black tracking-wider">{isEN ? 'Vehicle Type' : 'ยานพาหนะ'}</span>
            <span className="font-black text-emerald-950 text-[11px] mt-1.5 leading-normal block px-0.5 break-words">
              {voucher.vehicleType || (isEN ? 'Not specified' : 'ไม่ได้ระบุ')}
            </span>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-4">
          <div className="flex gap-1.5">
            <MapPin className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div className="w-full">
              <h4 className="font-black text-[9.5px] text-slate-950 uppercase tracking-widest">{t.pickupLocation}</h4>
              <p className="text-slate-950 font-black mt-2 bg-slate-100 px-3 py-2 rounded-xl border-2 border-slate-300 leading-relaxed text-[11px]">
                {voucher.pickupLocation}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5">
            <MapPin className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <div className="w-full">
              <h4 className="font-black text-[9.5px] text-slate-950 uppercase tracking-widest">{t.dropoffLocation}</h4>
              <p className="text-slate-950 font-black mt-2 bg-slate-100 px-3 py-2 rounded-xl border-2 border-slate-300 leading-relaxed text-[11px]">
                {voucher.dropoffLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Seat / Pricing Summary */}
        <div className="border-2 border-slate-300 rounded-xl overflow-hidden mt-0.5">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-900 text-white font-black uppercase tracking-wider border-b-2 border-slate-900">
                <th className="py-2 px-3 text-[9px]">{isEN ? 'Description' : 'รายการ'}</th>
                <th className="py-2 px-3 text-center w-16 text-[9px]">{t.quantity}</th>
                <th className="py-2 px-3 text-right w-24 text-[9px]">{t.pricePerUnit}</th>
                <th className="py-2 px-3 text-right pr-3.5 w-28 text-[9px]">{isEN ? 'Total' : 'ราคารวม'}</th>
              </tr>
            </thead>
            <tbody>
              {isPrivate ? (
                <tr className="border-b border-slate-300 text-slate-950 font-black">
                  <td className="py-2 px-3 font-black text-slate-950">
                    {isEN ? 'Private Charter' : 'ราคาเหมา'} ({voucher.vehicleType})
                    <span className="block text-[9px] text-slate-900 font-extrabold mt-0.5">
                      {isEN ? 'Passengers' : 'จำนวนผู้ใช้บริการ'}: {voucher.driverCount} {t.driverType} {voucher.pillionCount > 0 ? ` | ${voucher.pillionCount} ${t.pillionType}` : ''}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-black text-slate-950">1</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-950">฿{voucher.driverPrice.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right pr-3.5 font-mono font-black text-slate-950">฿{voucher.driverPrice.toLocaleString()}</td>
                </tr>
              ) : (
                <>
                  {voucher.driverCount > 0 && (
                    <tr className="border-b border-slate-300 text-slate-950 font-black">
                      <td className="py-2 px-3 font-black text-slate-950">{t.driverType}</td>
                      <td className="py-2 px-3 text-center font-mono font-black text-slate-950">{voucher.driverCount}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-950">฿{voucher.driverPrice.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right pr-3.5 font-mono font-black text-slate-950">฿{(voucher.driverCount * voucher.driverPrice).toLocaleString()}</td>
                    </tr>
                  )}
                  {voucher.pillionCount > 0 && (
                    <tr className="border-b border-slate-300 text-slate-950 font-black">
                      <td className="py-2 px-3 font-black text-slate-950">{t.pillionType}</td>
                      <td className="py-2 px-3 text-center font-mono font-black text-slate-950">{voucher.pillionCount}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-950">฿{voucher.pillionPrice.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right pr-3.5 font-mono font-black text-slate-950">฿{(voucher.pillionCount * voucher.pillionPrice).toLocaleString()}</td>
                    </tr>
                  )}
                </>
              )}
              <tr className="bg-slate-100 text-slate-950 font-black text-xs border-t-2 border-slate-300">
                <td className="py-2 px-3 font-black" colSpan={2}>{t.totalPrice}</td>
                <td className="py-2 px-3 text-right font-mono" colSpan={2}>
                  <span className="text-sm font-black text-slate-950 font-sans">฿{total.toLocaleString()}</span>
                </td>
              </tr>
              {voucher.paymentStatus === 'Partial' && (
                <>
                  <tr className="border-t border-slate-300 bg-indigo-50 text-indigo-950 font-black text-[10px]">
                    <td className="py-2 px-3 font-black" colSpan={2}>{t.depositAmountLabel}</td>
                    <td className="py-2 px-3 text-right font-mono text-indigo-950" colSpan={2}>
                      <span className="font-black">฿{(voucher.depositAmount || 0).toLocaleString()}</span>
                    </td>
                  </tr>
                  <tr className="border-t border-slate-300 bg-emerald-50 text-emerald-950 font-black text-[10px]">
                    <td className="py-2 px-3 font-black" colSpan={2}>{t.remainingAmountLabel}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-950" colSpan={2}>
                      <span className="font-black">฿{Math.max(0, total - (voucher.depositAmount || 0)).toLocaleString()}</span>
                    </td>
                  </tr>
                </>
              )}
              {voucher.paymentStatus === 'Collect' && (
                <tr className="border-t border-slate-300 bg-amber-50 text-amber-950 font-black text-[10px]">
                  <td className="py-2 px-3 font-black" colSpan={2}>{t.collectAmountLabel}</td>
                  <td className="py-2 px-3 text-right font-mono text-amber-950" colSpan={2}>
                    <span className="text-xs font-black">฿{(voucher.collectAmount || 0).toLocaleString()}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Note / Meeting point */}
        {voucher.notes && (
          <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-3">
            <h4 className="font-black text-[9.5px] text-amber-950 uppercase tracking-widest mb-0.5">{t.notes}</h4>
            <p className="text-slate-950 text-[11px] font-black leading-normal whitespace-pre-wrap">{voucher.notes}</p>
          </div>
        )}

        {/* Social Contacts & QR Codes */}
        {(() => {
          const lineQr = voucher.lineQrUrl || systemSettings?.lineQrUrl;
          const lineIdValue = voucher.lineId || systemSettings?.lineId || '@kohngaicamping';
          const whatsappQr = voucher.whatsappQrUrl || systemSettings?.whatsappQrUrl;
          const whatsappIdValue = voucher.whatsappId || systemSettings?.whatsappId || '+6695596321';
          const wechatQr = voucher.wechatQrUrl || systemSettings?.wechatQrUrl;
          const wechatIdValue = voucher.wechatId || systemSettings?.wechatId || 'kohngaicamping';

          if (!lineQr && !whatsappQr && !wechatQr) return null;

          return (
            <div className="border-2 border-slate-300 bg-slate-50 rounded-xl p-2.5 flex flex-wrap gap-2 items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-950 uppercase tracking-widest block mb-1">
                  Contact & Chat QR Codes (ช่องทางติดต่อประสานงาน):
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                  {lineQr && (
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border-2 border-slate-300 shrink-0 shadow-2xs">
                      <img src={lineQr} alt="Line QR" className="w-8 h-8 object-contain rounded" referrerPolicy="no-referrer" />
                      <div className="text-[8px] leading-tight pr-0.5">
                        <p className="font-black text-emerald-950">Line ID</p>
                        <p className="text-slate-950 font-black font-mono">{lineIdValue}</p>
                      </div>
                    </div>
                  )}
                  {whatsappQr && (
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border-2 border-slate-300 shrink-0 shadow-2xs">
                      <img src={whatsappQr} alt="WhatsApp QR" className="w-8 h-8 object-contain rounded" referrerPolicy="no-referrer" />
                      <div className="text-[8px] leading-tight pr-0.5">
                        <p className="font-black text-sky-950">WhatsApp</p>
                        <p className="text-slate-950 font-black font-mono">{whatsappIdValue}</p>
                      </div>
                    </div>
                  )}
                  {wechatQr && (
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border-2 border-slate-300 shrink-0 shadow-2xs">
                      <img src={wechatQr} alt="WeChat QR" className="w-8 h-8 object-contain rounded" referrerPolicy="no-referrer" />
                      <div className="text-[8px] leading-tight pr-0.5">
                        <p className="font-black text-amber-950">WeChat</p>
                        <p className="text-slate-950 font-black font-mono">{wechatIdValue}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {systemSettings?.phone && (
                <div className="text-right text-[9px] text-slate-950 leading-normal pr-1 shrink-0">
                  <p className="font-black text-slate-950">Customer Support</p>
                  <p className="font-black font-mono text-xs text-sky-950">{systemSettings.phone}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Instructions & Payment Status block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t-2 border-slate-300 pt-2.5 text-[11px]">
          {/* Important instructions */}
          <div className="flex flex-col gap-1 text-slate-950">
            <div>
              <span className="font-black text-slate-950 uppercase tracking-wider text-[10.5px]">{t.importantNotice}</span>
              <p className="leading-relaxed mt-0.5 font-black text-slate-950">{t.noticeText}</p>
            </div>
            <div className="border-t-2 border-slate-300 pt-1 mt-0.5">
              <span className="text-[8px] font-black text-slate-950 uppercase tracking-widest block">Prepared By (ผู้จัดทำ)</span>
              <span className="text-xs font-black text-slate-950">{currentUser?.name || voucher.createdBy}</span>
            </div>
          </div>

          {/* Payment indicator badge and Contact info */}
          <div className="flex items-center justify-end gap-3.5 text-right">
            {/* Contact info and payment badge stacked together */}
            <div className="flex flex-col items-end gap-1">
              <div className="text-slate-950 text-[9.5px] font-black font-mono tracking-wider">
                {t.contactUs}
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md border-2 font-black text-[9.5px] ${statusInfo.bg}`}>
                {statusInfo.icon}
                <span>{t.paymentStatus}: {statusInfo.text}</span>
              </div>
            </div>

            {/* Large Payment QR Code on the right */}
            {systemSettings?.paymentQrUrl && (
              <div className="bg-white p-2.5 rounded-2xl border-2 border-slate-300 shadow-xs flex flex-col items-center justify-center shrink-0">
                <img 
                  src={systemSettings.paymentQrUrl} 
                  alt="Payment QR" 
                  className="w-32 h-32 object-contain" 
                  referrerPolicy="no-referrer"
                />
                <span className="text-[8.5px] font-black text-slate-950 uppercase tracking-widest mt-1.5">QR Payment</span>
              </div>
            )}
          </div>
        </div>

        {/* Custom Language Indicator */}
        <div className="absolute bottom-3 left-4 flex items-center gap-1 text-[10px] text-slate-400 pointer-events-none">
          <Globe className="w-3 h-3 text-slate-400" />
          <span className="font-bold text-slate-500">Voucher Language: {voucher.language}</span>
        </div>
      </div>

      {/* Actions (Print, Download, Share) */}
      {showActions && (
        <div className="flex flex-wrap gap-3 justify-center mt-6 w-full px-4">
          <button
            onClick={handleDownloadPng}
            disabled={downloading || pdfDownloading}
            id="btn_download_voucher_png"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-950 text-white font-bold text-sm rounded-xl shadow-md hover:bg-sky-900 active:bg-slate-950 transition-all disabled:opacity-50 border-b-2 border-sky-700 hover:shadow-sky-100 hover:shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-300 animate-bounce" />
            {downloading ? 'Capturing PNG...' : 'บันทึกเป็นไฟล์ PNG'}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading || pdfDownloading}
            id="btn_download_voucher_pdf"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md hover:bg-rose-600 active:bg-rose-800 transition-all disabled:opacity-50 border-b-2 border-rose-900 hover:shadow-rose-100 hover:shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4 text-white animate-pulse" />
            {pdfDownloading ? 'Generating PDF...' : 'บันทึกเป็นไฟล์ PDF'}
          </button>

          {voucher.sendEmail && onSendEmail && (
            <button
              onClick={() => onSendEmail(voucher)}
              disabled={downloading || pdfDownloading}
              id="btn_send_voucher_email"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md transition-all border-b-2 border-amber-600 cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              ส่งอีเมลให้ลูกค้า ({voucher.customerEmail})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
