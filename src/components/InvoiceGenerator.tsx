import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Download, Printer, Plus, Trash2, RefreshCw, Calendar, 
  MapPin, Phone, Mail, Globe, CheckCircle, Award, CreditCard, Sparkles, Save, XCircle
} from 'lucide-react';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { Voucher, Invoice, User, SystemSettings } from '../types';
import { jsPDF } from 'jspdf';

const cleanPhone = (phone: string): string => {
  return phone.replace(/[^0-9]/g, '');
};

const normalizeText = (text: string): string => {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
};

interface InvoiceGeneratorProps {
  vouchers: Voucher[];
  editingInvoice?: Invoice | null;
  onAddInvoice?: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'createdBy'>) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
  onCancelEdit?: () => void;
  currentUser?: User;
  systemSettings?: SystemSettings;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export default function InvoiceGenerator({ 
  vouchers, 
  editingInvoice = null, 
  onAddInvoice, 
  onUpdateInvoice, 
  onCancelEdit,
  currentUser,
  systemSettings
}: InvoiceGeneratorProps) {
  // Setup invoice metadata
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Client Details
  const [clientName, setClientName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Voucher search & dropdown states
  const [voucherSearchQuery, setVoucherSearchQuery] = useState('');
  const [showVoucherDropdown, setShowVoucherDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Invoice Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'ATV Adventure Service (ผู้ใหญ่ / Adult)', quantity: 1, rate: 1500 }
  ]);

  // Payment terms & Bank details
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย (Kasikorn Bank)');
  const [accountName, setAccountName] = useState('บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด (Koh Ngai Camping Travel Co., Ltd.)');
  const [accountNo, setAccountNo] = useState('123-4-56789-0');
  const [notes, setNotes] = useState('Thank you for booking with Koh Ngai Camping Travel. We look forward to welcoming you!');
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [watermarkType, setWatermarkType] = useState<'PAID' | 'DEPOSIT' | 'UNPAID' | 'NONE'>('NONE');

  // Selected voucher link state
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [lastAutoLoadedIds, setLastAutoLoadedIds] = useState<string>('');

  const invoicePrintRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Synchronization useEffect when editingInvoice changes or on mount
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNo(editingInvoice.invoiceNo);
      setInvoiceDate(editingInvoice.invoiceDate);
      setDueDate(editingInvoice.dueDate);
      setClientName(editingInvoice.clientName);
      setAgentName(editingInvoice.agentName);
      setClientPhone(editingInvoice.clientPhone);
      setClientEmail(editingInvoice.clientEmail);
      setClientAddress(editingInvoice.clientAddress);
      setItems(editingInvoice.items);
      setBankName(editingInvoice.bankName);
      setAccountName(editingInvoice.accountName);
      setAccountNo(editingInvoice.accountNo);
      setNotes(editingInvoice.notes);
      setTaxPercent(editingInvoice.taxPercent);
      setDiscount(editingInvoice.discount);
      setIsPaid(editingInvoice.isPaid);
      setWatermarkType(editingInvoice.watermarkType || (editingInvoice.isPaid ? 'PAID' : 'UNPAID'));
      setSelectedVoucherId(editingInvoice.selectedVoucherId || '');
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;

      const counterKey = `knc_invoice_counter_${dateStr}`;
      let count = parseInt(localStorage.getItem(counterKey) || '0', 10);
      if (count === 0) {
        count = 1;
        localStorage.setItem(counterKey, '1');
      }
      const paddedCount = String(count).padStart(3, '0');
      
      setInvoiceNo(`INV-${dateStr}-${paddedCount}`);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().split('T')[0]);

      setClientName('');
      setAgentName('');
      setClientPhone('');
      setClientEmail('');
      setClientAddress('');
      setItems([
        { id: '1', description: 'ATV Adventure Service (ผู้ใหญ่ / Adult)', quantity: 1, rate: 1500 }
      ]);
      setBankName(systemSettings?.bankName || 'ธนาคารกสิกรไทย (Kasikorn Bank)');
      setAccountName(systemSettings?.accountName || 'บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด (Koh Ngai Camping Travel Co., Ltd.)');
      setAccountNo(systemSettings?.accountNo || '123-4-56789-0');
      setNotes(systemSettings?.paymentInstructions || 'Thank you for booking with Koh Ngai Camping Travel. We look forward to welcoming you!');
      setTaxPercent(0);
      setDiscount(0);
      setIsPaid(true);
      setWatermarkType('NONE');
      setSelectedVoucherId('');
    }
  }, [editingInvoice, systemSettings]);

  // Smart auto-load of product items and voucher details when input fields match existing vouchers
  useEffect(() => {
    const nameVal = clientName.trim();
    const phoneVal = clientPhone.trim();
    const emailVal = clientEmail.trim();
    const agentVal = agentName.trim();

    // If all fields are empty, reset the loaded tracking and reset items to default
    if (!nameVal && !phoneVal && !emailVal && !agentVal) {
      if (lastAutoLoadedIds) {
        setLastAutoLoadedIds('');
        setSelectedVoucherId('');
        setItems([
          { id: '1', description: 'ATV Adventure Service (ผู้ใหญ่ / Adult)', quantity: 1, rate: 1500 }
        ]);
      }
      return;
    }

    const cleanSearchPhone = cleanPhone(phoneVal);
    const normSearchName = normalizeText(nameVal);
    const normSearchEmail = normalizeText(emailVal);
    const normSearchAgent = normalizeText(agentVal);

    // Only attempt matching if we have entered some substantial query
    if (normSearchName.length < 2 && cleanSearchPhone.length < 3 && normSearchEmail.length < 3 && normSearchAgent.length < 2) {
      return;
    }

    const hasCustomerSearch = normSearchName.length >= 2 || cleanSearchPhone.length >= 3 || normSearchEmail.length >= 3;

    // Filter all vouchers matching the typed details using flexible matching to make sure we don't miss anything.
    const matchingVouchers = vouchers.filter(v => {
      if (hasCustomerSearch) {
        // Match if customer name, phone, or email matches (even partially)
        const matchesName = normSearchName.length >= 2 && v.customerName && normalizeText(v.customerName).includes(normSearchName);
        const matchesPhone = cleanSearchPhone.length >= 3 && v.customerPhone && cleanPhone(v.customerPhone).includes(cleanSearchPhone);
        const matchesEmail = normSearchEmail.length >= 3 && v.customerEmail && normalizeText(v.customerEmail).includes(normSearchEmail);
        
        return matchesName || matchesPhone || matchesEmail;
      } else {
        // If only Agent is entered, match all vouchers belonging to this agent
        const matchesAgent = normSearchAgent.length >= 2 && v.agentName && normalizeText(v.agentName).includes(normSearchAgent);
        return matchesAgent;
      }
    });

    // Remove any duplicate vouchers by ID
    const uniqueMatchingVouchers: Voucher[] = [];
    const seenIds = new Set<string>();
    matchingVouchers.forEach(v => {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id);
        uniqueMatchingVouchers.push(v);
      }
    });

    if (uniqueMatchingVouchers.length === 0) {
      if (lastAutoLoadedIds) {
        setLastAutoLoadedIds('');
      }
      return;
    }

    if (uniqueMatchingVouchers.length > 0) {
      const matchedIdsKey = uniqueMatchingVouchers.map(v => v.id).sort().join(',');
      
      if (matchedIdsKey !== lastAutoLoadedIds) {
        setLastAutoLoadedIds(matchedIdsKey);
        
        // Use the first matched voucher as primary for selected state
        const primary = uniqueMatchingVouchers[0];
        setSelectedVoucherId(primary.id);

        // Map adult/children pricing of ALL matched vouchers into items
        const newItems: InvoiceItem[] = [];

        uniqueMatchingVouchers.forEach(v => {
          const isPrivate = (v.vehicleType || '').toLowerCase().includes('private');
          if (isPrivate) {
            newItems.push({
              id: `auto-${v.id}-private`,
              description: `[Voucher: ${v.voucherNo}] ${v.tourName} - เหมา (${v.vehicleType})`,
              quantity: 1,
              rate: v.driverPrice,
            });
          } else {
            if (v.driverCount > 0) {
              newItems.push({
                id: `auto-${v.id}-driver`,
                description: `[Voucher: ${v.voucherNo}] ${v.tourName} - ผู้ใหญ่ (Adult)`,
                quantity: v.driverCount,
                rate: v.driverPrice,
              });
            }

            if (v.pillionCount > 0) {
              newItems.push({
                id: `auto-${v.id}-pillion`,
                description: `[Voucher: ${v.voucherNo}] ${v.tourName} - เด็ก (Child)`,
                quantity: v.pillionCount,
                rate: v.pillionPrice,
              });
            }
          }
        });

        if (newItems.length > 0) {
          setItems(newItems);
        }

        setIsPaid(primary.paymentStatus === 'Paid' || primary.paymentStatus === 'Collect');
        setVoucherSearchQuery(`[Voucher ${primary.voucherNo}] ${primary.customerName}`);
        
        const formattedDate = primary.serviceDate.replace(/-/g, '');
        setInvoiceNo(`INV-${formattedDate}-${primary.voucherNo.split('-').pop() || '001'}`);
      }
    }
  }, [clientName, agentName, clientPhone, clientEmail, vouchers, lastAutoLoadedIds]);

  // Increment invoice number helper
  const handleIncrementInvoiceNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const counterKey = `knc_invoice_counter_${dateStr}`;
    let count = parseInt(localStorage.getItem(counterKey) || '0', 10);
    count += 1;
    localStorage.setItem(counterKey, String(count));
    
    const paddedCount = String(count).padStart(3, '0');
    setInvoiceNo(`INV-${dateStr}-${paddedCount}`);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVoucherDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync details when a voucher is selected and load all related bookings
  const handleVoucherSelect = (vId: string) => {
    setSelectedVoucherId(vId);
    if (!vId) return;

    const voucher = vouchers.find(v => v.id === vId);
    if (voucher) {
      // Auto-set billing info
      setClientName(voucher.customerName);
      setAgentName(voucher.agentName || '');
      setClientPhone(voucher.customerPhone);
      setClientEmail(voucher.customerEmail || '');
      setClientAddress(voucher.pickupLocation || '');
      
      // Update autocomplete query text
      setVoucherSearchQuery(`[Voucher ${voucher.voucherNo}] ${voucher.customerName}`);
      
      // Find all vouchers with the same customerName, customerPhone, or customerEmail using smart flexible matching
      const nameVal = voucher.customerName.trim();
      const phoneVal = voucher.customerPhone.trim();
      const emailVal = (voucher.customerEmail || '').trim();

      const cleanSearchPhone = cleanPhone(phoneVal);
      const normSearchName = normalizeText(nameVal);
      const normSearchEmail = normalizeText(emailVal);

      const matches = vouchers.filter(v => {
        const matchesName = normSearchName.length >= 2 && v.customerName && normalizeText(v.customerName).includes(normSearchName);
        const matchesPhone = cleanSearchPhone.length >= 3 && v.customerPhone && cleanPhone(v.customerPhone).includes(cleanSearchPhone);
        const matchesEmail = normSearchEmail.length >= 3 && v.customerEmail && normalizeText(v.customerEmail).includes(normSearchEmail);
        
        return matchesName || matchesPhone || matchesEmail;
      });

      // Remove any duplicate matches by ID
      const uniqueMatches: Voucher[] = [];
      const seenIds = new Set<string>();
      matches.forEach(m => {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          uniqueMatches.push(m);
        }
      });

      const matchedIdsKey = uniqueMatches.map(v => v.id).sort().join(',');
      setLastAutoLoadedIds(matchedIdsKey);

      // Map adult/children pricing of ALL matches into items
      const newItems: InvoiceItem[] = [];

      uniqueMatches.forEach(m => {
        const isPrivate = (m.vehicleType || '').toLowerCase().includes('private');
        if (isPrivate) {
          newItems.push({
            id: `sel-${m.id}-private`,
            description: `[Voucher: ${m.voucherNo}] ${m.tourName} - เหมา (${m.vehicleType})`,
            quantity: 1,
            rate: m.driverPrice,
          });
        } else {
          if (m.driverCount > 0) {
            newItems.push({
              id: `sel-${m.id}-driver`,
              description: `[Voucher: ${m.voucherNo}] ${m.tourName} - ผู้ใหญ่ (Adult)`,
              quantity: m.driverCount,
              rate: m.driverPrice,
            });
          }

          if (m.pillionCount > 0) {
            newItems.push({
              id: `sel-${m.id}-pillion`,
              description: `[Voucher: ${m.voucherNo}] ${m.tourName} - เด็ก (Child)`,
              quantity: m.pillionCount,
              rate: m.pillionPrice,
            });
          }
        }
      });

      if (newItems.length > 0) {
        setItems(newItems);
      }

      setIsPaid(voucher.paymentStatus === 'Paid' || voucher.paymentStatus === 'Collect');
      
      const formattedDate = voucher.serviceDate.replace(/-/g, '');
      setInvoiceNo(`INV-${formattedDate}-${voucher.voucherNo.split('-').pop() || '001'}`);
    }
  };

  // Add Item to Invoice table
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: String(Date.now()),
      description: 'บริการท่องเที่ยว / Tour Service',
      quantity: 1,
      rate: 1000
    };
    setItems([...items, newItem]);
  };

  // Remove Item from Invoice table
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert('คุณต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  // Update item field values
  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'description' ? value : Math.max(0, Number(value) || 0)
        };
      }
      return item;
    }));
  };

  // Filter vouchers by search query across customer name, agent name, phone, email, etc.
  const filteredVouchers = vouchers.filter(v => {
    const query = voucherSearchQuery.toLowerCase().trim();
    if (!query) return true; // Show all vouchers initially when focused
    return (
      v.customerName.toLowerCase().includes(query) ||
      v.agentName.toLowerCase().includes(query) ||
      v.customerPhone.toLowerCase().includes(query) ||
      v.voucherNo.toLowerCase().includes(query) ||
      (v.customerEmail && v.customerEmail.toLowerCase().includes(query)) ||
      v.tourName.toLowerCase().includes(query)
    );
  });

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const grandTotal = subtotal + taxAmount - discount;
  const isCompact = items.length > 3;

  const handleSaveInvoice = () => {
    if (!clientName.trim()) {
      alert('⚠️ กรุณากรอกชื่อลูกค้า (Customer Name) ก่อนทำการบันทึกข้อมูล');
      return;
    }

    const invoiceData = {
      invoiceNo,
      invoiceDate,
      dueDate,
      clientName,
      agentName,
      clientPhone,
      clientEmail,
      clientAddress,
      items,
      bankName,
      accountName,
      accountNo,
      notes,
      taxPercent,
      discount,
      isPaid,
      watermarkType,
      selectedVoucherId: lastAutoLoadedIds || selectedVoucherId,
    };

    if (editingInvoice) {
      if (onUpdateInvoice) {
        onUpdateInvoice({
          ...editingInvoice,
          ...invoiceData,
        });
        alert('🎉 บันทึกการแก้ไขข้อมูล Invoice เรียบร้อยแล้ว!');
      }
    } else {
      if (onAddInvoice) {
        onAddInvoice(invoiceData);
        alert('🎉 บันทึกข้อมูล Invoice เข้าฐานข้อมูลสำเร็จแล้ว!');
      }
    }

    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  // Handle PDF Export (High-resolution, supports multi-page continuity)
  const handleExportPDF = async () => {
    if (!invoicePrintRef.current) return;
    setExporting(true);
    try {
      // Brief timeout to let UI settle
      await new Promise(resolve => setTimeout(resolve, 150));
      const canvas = await safeHtml2canvas(invoicePrintRef.current, {
        scale: 3, // Premium ultra-crisp scaling for high resolution printing
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.98); // Top quality JPEG compression
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Map canvas aspect ratio perfectly onto the standard 210mm A4 width
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Page 1
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
      
      // Generate subsequent pages if content exceeds standard A4 height
      while (heightLeft > 0) {
        position -= pdfHeight; // Negative offset shifts target canvas area upwards
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
      
      const sanitizedClientName = clientName ? `-${clientName.trim().replace(/[/\\?%*:|"<>\s]+/g, '_')}` : '';
      pdf.save(`INVOICE-${invoiceNo}${sanitizedClientName}.pdf`);
    } catch (err) {
      console.error('Error exporting invoice to PDF:', err);
      alert('เกิดข้อผิดพลาดในการเซฟไฟล์ PDF');
    } finally {
      setExporting(false);
    }
  };

  // Handle PDF Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-1 md:p-2">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-sky-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border-b-4 border-amber-400 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-300" />
            ระบบออกใบแจ้งหนี้ / ใบเสร็จรับเงิน (Invoice & Receipt)
          </h2>
          <p className="text-xs text-sky-200 mt-1">
            ออกเอกสารเรียกเก็บเงินหรือใบเสร็จรับเงินอย่างเป็นทางการในนาม Koh Ngai Camping Travel
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2.5 shrink-0">
          {onAddInvoice || onUpdateInvoice ? (
            <button
              onClick={handleSaveInvoice}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-100" />
              {editingInvoice ? 'บันทึกการแก้ไขบิล' : 'บันทึกบิลเข้าฐานข้อมูล'}
            </button>
          ) : null}

          {editingInvoice && onCancelEdit ? (
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-100" />
              ยกเลิกแก้ไข
            </button>
          ) : null}
          
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-sky-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'กำลังเซฟ PDF...' : 'เซฟเป็นไฟล์ PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT FORM COLUMN - DESIGN CONTROLS (6 cols on lg) */}
        <div className="lg:col-span-5 bg-white border border-sky-100/80 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-5 no-print">
          
           {/* Quick load from Voucher (Searchable Autocomplete Dropdown) */}
          <div className="bg-sky-50/40 p-4 rounded-2xl border border-sky-100/40 relative" ref={dropdownRef}>
            <label className="block text-xs font-black text-sky-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              ดึงข้อมูลจาก Voucher ทัวร์ (Quick Load Voucher)
            </label>
            
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 ค้นหาด้วย ชื่อลูกค้า, เอเย่นต์, เบอร์โทร หรือ อีเมล..."
                value={voucherSearchQuery}
                onFocus={() => setShowVoucherDropdown(true)}
                onChange={(e) => {
                  setVoucherSearchQuery(e.target.value);
                  setShowVoucherDropdown(true);
                  if (selectedVoucherId) {
                    setSelectedVoucherId('');
                  }
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-sky-100 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 pr-8"
              />
              {voucherSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setVoucherSearchQuery('');
                    setSelectedVoucherId('');
                    setShowVoucherDropdown(true);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {showVoucherDropdown && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-sky-100 rounded-2xl shadow-xl p-1 text-xs">
                {filteredVouchers.length > 0 ? (
                  filteredVouchers.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        handleVoucherSelect(v.id);
                        setShowVoucherDropdown(false);
                      }}
                      className="w-full text-left p-2.5 hover:bg-sky-50 rounded-xl transition-colors border-b border-slate-50 last:border-0 flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-sky-900">{v.voucherNo}</span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[9px] scale-90 uppercase">
                          {v.agentName || 'Walk-in'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800">
                        ลูกค้า (Client): {v.customerName}
                      </div>
                      <div className="text-slate-500 text-[10px] flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>📞 {v.customerPhone}</span>
                        {v.customerEmail && <span>✉️ {v.customerEmail}</span>}
                      </div>
                      <div className="text-sky-700 font-medium text-[10px] mt-0.5 border-t border-slate-100 pt-1">
                        🗺️ {v.tourName}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400">
                    ❌ ไม่พบข้อมูล Voucher ที่ค้นหา
                  </div>
                )}
              </div>
            )}
            
            <p className="text-[10px] text-slate-400 mt-1.5">
              * พิมพ์ค้นหาข้อมูลได้อย่างรวดเร็วตาม ชื่อลูกค้า, เอเย่นต์, เบอร์โทรศัพท์ หรืออีเมลลูกค้า
            </p>
          </div>

          <hr className="border-sky-50" />

          {/* Invoice Information */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-widest">
              1. ข้อมูลเอกสาร (Document Info)
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">เลขที่ใบแจ้งหนี้ (Invoice No.)</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white font-mono font-bold"
                  />
                  <button
                    onClick={handleIncrementInvoiceNumber}
                    title="รันเลขที่ถัดไป (Auto-increment)"
                    className="p-2 bg-sky-50 border border-sky-100 rounded-xl hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">สถานะชำระเงิน (Status)</label>
                <select
                  value={isPaid ? 'paid' : 'unpaid'}
                  onChange={(e) => {
                    const paid = e.target.value === 'paid';
                    setIsPaid(paid);
                    setWatermarkType(paid ? 'PAID' : 'UNPAID');
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none font-bold"
                >
                  <option value="paid" className="text-emerald-600">ชำระเงินแล้ว (PAID)</option>
                  <option value="unpaid" className="text-rose-600">ยังไม่ชำระเงิน (UNPAID)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">วันที่ออกเอกสาร (Date)</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">กำหนดชำระ (Due Date)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white font-mono"
                />
              </div>
            </div>

            {editingInvoice && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ประเภทลายน้ำเอกสาร (Document Watermark)</label>
                <select
                  value={watermarkType}
                  onChange={(e) => setWatermarkType(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none font-bold text-sky-950"
                >
                  <option value="NONE">ไม่มีลายน้ำ (NO WATERMARK)</option>
                  <option value="PAID">ชำระเงินแล้ว (PAID WATERMARK)</option>
                  <option value="DEPOSIT">มัดจำ (DEPOSIT WATERMARK)</option>
                  <option value="UNPAID">ยังไม่ชำระเงิน (UNPAID WATERMARK)</option>
                </select>
              </div>
            )}
          </div>

          <hr className="border-sky-50" />

          {/* Client Info */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-widest">
              2. ข้อมูลผู้ซื้อ / ลูกค้า (Client Billing Details)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อลูกค้า (Customer Name)</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="เช่น MR. JOHN SMITH"
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">เอเย่นต์ / ผู้จอง (Agent Name)</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="เช่น Walk-in, Klook"
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white font-semibold text-sky-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">เบอร์โทรศัพท์ (Phone)</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="เช่น 089-776-5544"
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">อีเมล (Email)</label>
                <input
                  type="text"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="เช่น john@gmail.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ที่อยู่รับส่ง / จุดนัดหมาย (Billing/Pickup Address)</label>
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                rows={2}
                placeholder="ระบุที่อยู่ของลูกค้า หรือ จุดรับโรงแรมที่นัดหมาย"
                className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs focus:ring-2 focus:ring-sky-500 outline-none bg-white resize-none"
              />
            </div>

            {lastAutoLoadedIds && (
              <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2.5 rounded-xl border border-emerald-200/80 font-bold flex items-center gap-1.5 animate-pulse mt-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                ดึงข้อมูลรายการจอง ({lastAutoLoadedIds.split(',').length} รายการ) ลงตารางอินวอยให้อัตโนมัติแล้ว!
              </div>
            )}
          </div>

          <hr className="border-sky-50" />

          {/* Itemized list details */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-widest">
                3. รายการสินค้าและบริการ (Itemized Services)
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[11px] bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-2 py-1 rounded-lg border border-sky-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> เพิ่มแถว
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2 relative">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 transition-colors"
                    title="ลบแถวนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-[10px] font-bold text-slate-400">รายการที่ {index + 1}</div>

                  <div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      placeholder="คำอธิบายบริการทัวร์"
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-0.5">จำนวน (Qty)</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-0.5">ราคาต่อคน (Rate)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-sky-50" />

          {/* Adjustments (Tax & discount) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-widest">
              4. ส่วนลด & ภาษี (Adjustments)
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ส่วนลดพิเศษ (Discount) (บาท)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">อัตราภาษีมูลค่าเพิ่ม (VAT %)</label>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white"
                >
                  <option value={0}>ไม่มีภาษี (0%)</option>
                  <option value={7}>ภาษีมูลค่าเพิ่ม 7%</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-sky-50" />

          {/* Payment info controls */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-widest">
              5. บัญชีรับเงิน & หมายเหตุ (Bank Details & Notes)
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ธนาคาร (Bank Name)</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อบัญชี (Account Name)</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">เลขบัญชี (Account No.)</label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">หมายเหตุท้ายเอกสาร (Notes/Remark)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 rounded-xl border border-sky-100 text-xs bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW COLUMN - DOCUMENT SHEET (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="bg-sky-50/40 p-4 rounded-2xl border border-sky-100/40 flex justify-between items-center no-print">
            <span className="text-xs font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              ตัวอย่างเอกสารก่อนพิมพ์ (Invoice Preview Sheet)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" /> {exporting ? 'กำลังเซฟ...' : 'เซฟ PDF'}
              </button>
            </div>
          </div>

          {/* Printable Invoice Sheet Card Wrapper */}
          <div 
            ref={invoicePrintRef}
            className={`bg-white shadow-xl border border-slate-150 rounded-3xl relative overflow-hidden transition-all duration-300 ${
              isCompact ? 'p-6 max-w-2xl mx-auto' : 'p-8 max-w-3xl mx-auto'
            }`}
            id="invoice-print-area"
          >
            {/* LUXURY DOCUMENT WATERMARK */}
            {watermarkType && watermarkType !== 'NONE' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                <div className={`border-8 rounded-[2rem] px-14 py-6 text-6xl font-black tracking-[0.25em] uppercase transform -rotate-25 select-none ${
                  watermarkType === 'PAID' 
                    ? 'text-emerald-600/[0.04] border-emerald-600/[0.06]' 
                    : watermarkType === 'DEPOSIT'
                    ? 'text-sky-600/[0.04] border-sky-600/[0.06]'
                    : 'text-rose-600/[0.04] border-rose-600/[0.06]'
                }`}>
                  {watermarkType}
                </div>
              </div>
            )}

              {/* BRAND HEADER */}
              <div className={`flex flex-col gap-4 border-b border-slate-100 relative z-10 ${
                isCompact ? 'pb-4 mb-4' : 'pb-6 mb-6'
              }`}>
                {/* Top Row: Brand & Badge Info */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  {/* Company Details */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      {systemSettings?.logoUrl ? (
                        <img src={systemSettings.logoUrl} alt="Logo" className="h-10 max-w-[140px] object-contain rounded" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-9 h-9 bg-sky-950 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-sm">K</span>
                      )}
                      <div>
                        {(() => {
                          const fullName = systemSettings?.companyName || 'บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด (KOH NGAI CAMPING TRAVEL)';
                          let thPart = fullName;
                          let enPart = '';
                          const match = fullName.match(/^(.*?)\s*[\(\(](.*?)[\)\)]\s*$/) || fullName.match(/^(.*?)\s*[\/](.*?)$/);
                          if (match) {
                            thPart = match[1].trim();
                            enPart = match[2].trim();
                          }
                          return (
                            <>
                              <h1 className="text-xs md:text-sm font-extrabold tracking-tight text-sky-950 uppercase leading-tight">
                                {thPart}
                              </h1>
                              {enPart && (
                                <p className="text-[9px] md:text-[11px] font-bold text-sky-700/80 uppercase leading-tight mt-0.5">
                                  {enPart}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="text-[11px] text-slate-600 font-medium leading-relaxed max-w-md">
                      <p className="font-extrabold text-slate-800">
                        เลขประจำตัวผู้เสียภาษี / Registration No. <span className="font-mono">{systemSettings?.registrationNo || '34/03242'}</span>
                      </p>
                      <p className="flex items-start gap-1 mt-1 font-semibold text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                        <span>{systemSettings?.address || '565 Moo 11 Krabi Noi, Mueang Krabi, Krabi 81000 Thailand'}</span>
                      </p>
                    </div>
                  </div>
   
                  {/* Invoice Type Badge & Number */}
                  <div className="text-right flex flex-col items-end shrink-0 gap-1.5">
                    <div className="bg-sky-950 text-white font-extrabold text-sm px-4 py-1.5 rounded-xl uppercase tracking-[0.1em] border-b-2 border-amber-400 shadow-sm">
                      {isPaid ? 'ใบเสร็จรับเงิน / Receipt' : 'ใบแจ้งหนี้ / Invoice'}
                    </div>
                    
                    <div className="mt-1 flex flex-col gap-0.5">
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Document No.</p>
                      <p className="font-mono text-sm font-black text-sky-950">{invoiceNo}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Aligned Contact Info */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pt-2 border-t border-slate-100/60 text-[10px] text-slate-600">
                  {/* Left: Hotline, WhatsApp, Office */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {[
                      (systemSettings?.phone || !systemSettings) && (
                        <span key="hotline" className="flex items-center gap-1 font-semibold whitespace-nowrap">
                          <Phone className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                          <span>Hotline: <strong className="font-mono text-slate-800">{systemSettings?.phone || '+6680-3203719'}</strong></span>
                        </span>
                      ),
                      (systemSettings?.whatsapp || !systemSettings) && (
                        <span key="whatsapp" className="flex items-center gap-1 font-semibold whitespace-nowrap">
                          <Phone className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                          <span>WhatsApp: <strong className="font-mono text-slate-800">{systemSettings?.whatsapp || '+66955963231'}</strong></span>
                        </span>
                      ),
                      (systemSettings?.officePhone || !systemSettings) && (
                        <span key="office" className="flex items-center gap-1 font-semibold whitespace-nowrap">
                          <Phone className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                          <span>Office: <strong className="font-mono text-slate-800">{systemSettings?.officePhone || '0955963231'}</strong></span>
                        </span>
                      ),
                    ]
                      .filter(Boolean)
                      .reduce((acc: any[], element, index) => {
                        if (index > 0) {
                          acc.push(
                            <span key={`sep-${index}`} className="text-slate-300 select-none text-[8px] px-0.5">|</span>
                          );
                        }
                        acc.push(element);
                        return acc;
                      }, [])}
                  </div>

                  {/* Right: Email & Website */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600 font-semibold md:text-right">
                    {[
                      (systemSettings?.email || !systemSettings) && (
                        <span key="email" className="flex items-center gap-1 whitespace-nowrap">
                          <Mail className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                          <span>{systemSettings?.email || 'kohngaicampingtour@gmail.com'}</span>
                        </span>
                      ),
                      (systemSettings?.website || !systemSettings) && (
                        <span key="website" className="flex items-center gap-1 whitespace-nowrap">
                          <Globe className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                          <span>Website: {systemSettings?.website || 'kohngaicampingtravel.com'}</span>
                        </span>
                      ),
                    ]
                      .filter(Boolean)
                      .reduce((acc: any[], element, index) => {
                        if (index > 0) {
                          acc.push(
                            <span key={`sep-right-${index}`} className="text-slate-300 select-none text-[8px] px-0.5">|</span>
                          );
                        }
                        acc.push(element);
                        return acc;
                      }, [])}
                  </div>
                </div>
              </div>
 
              {/* METADATA BLOCK */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/40 border border-slate-100/80 rounded-xl relative z-10 ${
                isCompact ? 'p-2.5 mb-3' : 'p-3 mb-5'
              }`}>
                
                {/* Customer / Client Details */}
                <div className="flex flex-col gap-1 pr-3 md:border-r border-slate-200/50">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Bill To (ผู้รับบริการ)</span>
                  <p className="font-extrabold text-slate-950 uppercase text-[10.5px] tracking-tight leading-tight mb-0.5">{clientName || 'N/A'}</p>
                  
                  <div className="flex flex-col gap-0.5 text-[8.5px] text-slate-600 font-medium">
                    {agentName && (
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="font-extrabold text-slate-400 min-w-[75px] uppercase tracking-wider text-[7.5px]">Agent (เอเย่นต์):</span>
                        <span className="text-slate-800 font-bold">{agentName}</span>
                      </div>
                    )}
                    {clientPhone && (
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="font-extrabold text-slate-400 min-w-[75px] uppercase tracking-wider text-[7.5px]">Tel (เบอร์โทร):</span>
                        <span className="text-slate-800 font-mono font-bold">{clientPhone}</span>
                      </div>
                    )}
                    {clientEmail && (
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="font-extrabold text-slate-400 min-w-[75px] uppercase tracking-wider text-[7.5px]">Email (อีเมล):</span>
                        <span className="text-slate-800 font-mono font-semibold">{clientEmail}</span>
                      </div>
                    )}
                    {clientAddress && (
                      <div className="flex items-start gap-1.5 leading-normal mt-0.5">
                        <span className="font-extrabold text-slate-400 min-w-[75px] uppercase tracking-wider text-[7.5px] shrink-0 mt-[1px]">Pickup (สถานที่):</span>
                        <span className="text-slate-700 line-clamp-2">{clientAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates & Billing Terms */}
                <div className="flex flex-col gap-2 pl-0 md:pl-2">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8.5px]">
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase block leading-none tracking-wider">Date (วันที่ออก):</span>
                      <strong className="text-slate-800 font-mono font-bold text-[9.5px] mt-0.5 block">{invoiceDate}</strong>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase block leading-none tracking-wider">Due Date (ครบกำหนด):</span>
                      <strong className="text-slate-800 font-mono font-bold text-[9.5px] mt-0.5 block">{dueDate}</strong>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase block leading-none tracking-wider">Payment Term:</span>
                      <strong className="text-slate-700 font-bold text-[9px] mt-0.5 block">7 Days / Cash / Transfer</strong>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase block leading-none tracking-wider">Status (สถานะ):</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded font-black font-mono text-[7.5px] mt-0.5 leading-none ${
                        isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                      }`}>
                        {isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* ITEMIZED TABLE */}
              <div className={`border border-slate-200/80 rounded-xl overflow-hidden relative z-10 ${
                isCompact ? 'mb-4' : 'mb-6'
              }`}>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-sky-950 text-white font-black uppercase tracking-wider border-b border-sky-900">
                      <th className={`pl-4 w-12 text-center ${isCompact ? 'p-2 text-[9px]' : 'p-3 text-[10px]'}`}>No.</th>
                      <th className={`${isCompact ? 'p-2 text-[9px]' : 'p-3 text-[10px]'}`}>Description (รายละเอียดบริการ)</th>
                      <th className={`text-center w-16 ${isCompact ? 'p-2 text-[9px]' : 'p-3 text-[10px]'}`}>Qty</th>
                      <th className={`text-right w-24 ${isCompact ? 'p-2 text-[9px]' : 'p-3 text-[10px]'}`}>Rate (THB)</th>
                      <th className={`text-right pr-4 w-32 ${isCompact ? 'p-2 pr-4 text-[9px]' : 'p-3 pr-4 text-[10px]'}`}>Amount (THB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
                    {items.map((item, idx) => (
                      <tr key={`prev-item-${item.id}`} className="hover:bg-slate-50/40">
                        <td className={`text-center font-mono text-slate-400 font-bold ${isCompact ? 'py-1.5 px-2 text-[10px]' : 'p-3 text-[11px]'}`}>{idx + 1}</td>
                        <td className={`font-bold text-slate-900 leading-normal ${isCompact ? 'py-1.5 px-2 text-[11px]' : 'p-3 text-[12px]'}`}>{item.description}</td>
                        <td className={`text-center font-mono font-black text-slate-700 ${isCompact ? 'py-1.5 px-2 text-[11px]' : 'p-3 text-[12px]'}`}>{item.quantity}</td>
                        <td className={`text-right font-mono font-bold text-slate-600 ${isCompact ? 'py-1.5 px-2 text-[11px]' : 'p-3 text-[12px]'}`}>฿{item.rate.toLocaleString()}</td>
                        <td className={`text-right pr-4 font-mono font-black text-slate-950 ${isCompact ? 'py-1.5 pr-4 text-[11px]' : 'p-3 pr-4 text-[12px]'}`}>
                          ฿{(item.quantity * item.rate).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CALCULATIONS AND SIGNATURE */}
              <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-start relative z-10 ${isCompact ? 'pt-1' : 'pt-2'}`}>
                
                {/* Left side: payment bank account */}
                <div className="md:col-span-7 flex flex-col gap-2.5">
                  <div className={`border border-slate-100 bg-slate-50/50 rounded-2xl ${isCompact ? 'p-2.5' : 'p-3'} space-y-3`}>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Payment Instructions (การชำระเงิน):
                      </span>
                      <div className="text-[10px] text-slate-700 font-bold">
                        โอนเงินผ่านบัญชีธนาคาร (Bank Wire Transfer)
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium space-y-0.5 mt-1">
                        <p><span className="font-bold text-slate-700">Bank (ธนาคาร):</span> {bankName}</p>
                        <p><span className="font-bold text-slate-700">Account (ชื่อบัญชี):</span> {accountName}</p>
                        <p><span className="font-bold text-slate-700">A/C No. (เลขบัญชี):</span> <strong className="font-mono text-sky-950 font-black">{accountNo}</strong></p>
                      </div>
                    </div>

                    {/* All QR Codes aligned horizontally side-by-side */}
                    {(systemSettings?.paymentQrUrl || systemSettings?.lineQrUrl || systemSettings?.whatsappQrUrl || systemSettings?.wechatQrUrl) && (
                      <div className="border-t border-slate-200/60 pt-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                          QR Codes for Payment & Contacts (คิวอาร์โค้ดชำระเงินและช่องทางติดต่อ):
                        </span>
                        <div className="flex flex-row flex-wrap items-center gap-2">
                          {systemSettings?.paymentQrUrl && (
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-150 shrink-0 shadow-3xs">
                              <img 
                                src={systemSettings.paymentQrUrl} 
                                alt="Payment QR" 
                                className="w-10 h-10 object-contain rounded" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="text-[8px] leading-tight pr-1">
                                <p className="font-black text-sky-900">QR Payment</p>
                                <p className="text-slate-500 font-bold">Scan to Pay</p>
                              </div>
                            </div>
                          )}
                          {systemSettings?.lineQrUrl && (
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-150 shrink-0 shadow-3xs">
                              <img src={systemSettings.lineQrUrl} alt="Line QR" className="w-10 h-10 object-contain rounded" referrerPolicy="no-referrer" />
                              <div className="text-[8px] leading-tight pr-1">
                                <p className="font-black text-emerald-600">Line ID</p>
                                <p className="text-slate-500 font-bold font-mono">{systemSettings.lineId || '@kohngaicamping'}</p>
                              </div>
                            </div>
                          )}
                          {systemSettings?.whatsappQrUrl && (
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-150 shrink-0 shadow-3xs">
                              <img src={systemSettings.whatsappQrUrl} alt="WhatsApp QR" className="w-10 h-10 object-contain rounded" referrerPolicy="no-referrer" />
                              <div className="text-[8px] leading-tight pr-1">
                                <p className="font-black text-sky-600">WhatsApp</p>
                                <p className="text-slate-500 font-bold font-mono">{systemSettings.whatsappId || '+6695596321'}</p>
                              </div>
                            </div>
                          )}
                          {systemSettings?.wechatQrUrl && (
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-150 shrink-0 shadow-3xs">
                              <img src={systemSettings.wechatQrUrl} alt="WeChat QR" className="w-10 h-10 object-contain rounded" referrerPolicy="no-referrer" />
                              <div className="text-[8px] leading-tight pr-1">
                                <p className="font-black text-amber-600">WeChat</p>
                                <p className="text-slate-500 font-bold font-mono">{systemSettings.wechatId || 'kohngaicamping'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {notes && (
                    <div className="text-[10px] text-slate-400 italic font-medium leading-relaxed pl-1">
                      * {notes}
                    </div>
                  )}
                </div>

                {/* Right side: prices summary */}
                <div className="md:col-span-5 flex flex-col gap-1 text-[11px]">
                  
                  <div className="flex justify-between p-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800">฿{subtotal.toLocaleString()}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between p-1.5 border-b border-slate-100 text-rose-600">
                      <span className="font-medium">Discount (ส่วนลด):</span>
                      <span className="font-mono font-bold">-฿{discount.toLocaleString()}</span>
                    </div>
                  )}

                  {taxPercent > 0 && (
                    <div className="flex justify-between p-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">VAT ({taxPercent}%):</span>
                      <span className="font-mono font-bold text-slate-800">฿{taxAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center p-2.5 bg-sky-950 text-white rounded-xl mt-1.5">
                    <span className="font-black uppercase tracking-wider text-[10px]">Total Due (ราคารวม):</span>
                    <span className="font-mono font-black text-sm text-amber-300">
                      ฿{grandTotal.toLocaleString()}
                    </span>
                  </div>

                </div>

              </div>
 
            {/* DOCUMENT FOOTER SIGNATURES */}
            <div className={`border-t border-slate-100 grid grid-cols-2 gap-8 text-[10px] relative z-10 ${
              isCompact ? 'pt-4 mt-6 min-h-[110px] pb-2' : 'pt-6 mt-10 min-h-[130px] pb-4'
            }`}>
              
              <div className="flex flex-col items-center justify-end text-center">
                <div className="h-12"></div> {/* Equalizer spacing to align with company name block */}
                <div className="w-40 border-b border-slate-300 mb-1.5"></div>
                <p className="font-bold text-slate-700 uppercase">({clientName || 'CUSTOMER SIGNATURE'})</p>
                <p className="text-slate-400">Customer (ผู้รับบริการ / ตัวแทน)</p>
              </div>
 
              <div className="flex flex-col items-center justify-end text-center">
                <p className="font-black text-sky-950 mb-8 uppercase tracking-wide">KOH NGAI CAMPING TRAVEL</p>
                <div className="w-40 border-b border-slate-300 mb-1.5"></div>
                <p className="text-slate-700 font-bold">
                  ({editingInvoice 
                    ? (currentUser?.username === editingInvoice.createdBy ? currentUser.name : editingInvoice.createdBy) 
                    : (currentUser?.name || 'Staff')})
                </p>
                <p className="text-slate-400">ผู้จัดทำ / Prepared By</p>
                <p className="text-slate-400 text-[8px] leading-none">Authorized Signature (ผู้มีอำนาจลงนาม)</p>
              </div>
 
            </div>
 
          </div>
        </div>

      </div>

    </div>
  );
}
