import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Save, X, Calendar, Clock, MapPin, User, Phone, Mail, FileText, ChevronDown, Check } from 'lucide-react';
import { Voucher, MasterData, PaymentStatus, Language } from '../types';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'พิมพ์เพื่อค้นหา หรือคลิกเพื่อเลือก...',
  required = false,
  error,
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-bold text-sky-950 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="text"
          className={`w-full pl-3.5 pr-10 py-2 rounded-xl border-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-black text-slate-950 transition-colors ${
            error ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          placeholder={placeholder}
          value={isOpen ? searchQuery : value}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchQuery(''); // Clear search query to show all
            }
          }}
          disabled={disabled}
        />
        <div className="absolute right-3 top-2.5 flex items-center gap-1.5 pointer-events-none text-sky-600">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border-2 border-sky-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 font-bold text-center">
              ไม่พบตัวเลือกที่ตรงกัน
            </div>
          ) : (
            <div className="py-1">
              {filteredOptions.map((option) => {
                const isSelected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    className={`w-full text-left px-3.5 py-2 text-xs font-black flex items-center justify-between hover:bg-sky-50 hover:text-sky-950 transition-colors ${
                      isSelected ? 'bg-sky-100 text-sky-950 font-black' : 'text-slate-950'
                    }`}
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <span>{option}</span>
                    {isSelected && <Check className="w-4 h-4 text-sky-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-500 mt-1 font-bold">
          {error}
        </p>
      )}
    </div>
  );
}

interface VoucherFormProps {
  onSubmit: (voucherData: Omit<Voucher, 'id' | 'voucherNo' | 'createdAt' | 'createdBy'> & { id?: string; voucherNo?: string }) => void;
  onCancel?: () => void;
  editingVoucher?: Voucher | null;
  masterData: MasterData;
  currentUser: { username: string };
}

export default function VoucherForm({ onSubmit, onCancel, editingVoucher, masterData, currentUser }: VoucherFormProps) {
  // Generate random default external voucher code
  const generateRandomExtNo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'EXT-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [tourName, setTourName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [externalVoucherNo, setExternalVoucherNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [pickupVehicle, setPickupVehicle] = useState('');
  const [dropoffVehicle, setDropoffVehicle] = useState('');
  const [driverCount, setDriverCount] = useState<number | string>(0);
  const [driverPrice, setDriverPrice] = useState<number | string>('');
  const [pillionCount, setPillionCount] = useState<number | string>(0);
  const [pillionPrice, setPillionPrice] = useState<number | string>('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending');
  const [depositAmount, setDepositAmount] = useState<number | string>('');
  const [collectAmount, setCollectAmount] = useState<number | string>('');
  const [sendEmail, setSendEmail] = useState(false);
  const [language, setLanguage] = useState<Language>('TH');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize fields
  useEffect(() => {
    if (editingVoucher) {
      setTourName(editingVoucher.tourName);
      setAgentName(editingVoucher.agentName);
      setExternalVoucherNo(editingVoucher.externalVoucherNo);
      setCustomerName(editingVoucher.customerName);
      setCustomerPhone(editingVoucher.customerPhone);
      setCustomerEmail(editingVoucher.customerEmail);
      setServiceDate(editingVoucher.serviceDate);
      setPickupTime(editingVoucher.pickupTime);
      setVehicleType(editingVoucher.vehicleType || '');
      setPickupVehicle(editingVoucher.pickupVehicle);
      setDropoffVehicle(editingVoucher.dropoffVehicle);
      setDriverCount(editingVoucher.driverCount);
      setDriverPrice(editingVoucher.driverPrice);
      setPillionCount(editingVoucher.pillionCount);
      setPillionPrice(editingVoucher.pillionPrice);
      setPickupLocation(editingVoucher.pickupLocation);
      setDropoffLocation(editingVoucher.dropoffLocation);
      setPaymentStatus(editingVoucher.paymentStatus);
      setDepositAmount(editingVoucher.depositAmount !== undefined ? editingVoucher.depositAmount : '');
      setCollectAmount(editingVoucher.collectAmount !== undefined ? editingVoucher.collectAmount : '');
      setSendEmail(editingVoucher.sendEmail);
      setLanguage(editingVoucher.language);
      setNotes(editingVoucher.notes);
    } else {
      // Defaults for creation
      setTourName(masterData.tours[0] || '');
      setAgentName(masterData.agents[0] || '');
      setExternalVoucherNo('');
      setServiceDate(new Date().toISOString().split('T')[0]);
      setPickupTime('08:30');
      setVehicleType('');
      setPickupVehicle('');
      setDropoffVehicle('');
      setDriverCount(1);
      setDriverPrice('');
      setPillionCount(0);
      setPillionPrice('');
      setPaymentStatus('Pending');
      setDepositAmount('');
      setCollectAmount('');
      setLanguage('TH');
      setNotes('');
    }
  }, [editingVoucher, masterData]);

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!customerName.trim()) tempErrors.customerName = 'กรุณากรอกชื่อลูกค้า (Required)';
    if (!customerPhone.trim()) tempErrors.customerPhone = 'กรุณากรอกเบอร์โทรลูกค้า (Required)';
    if (!customerEmail.trim()) {
      tempErrors.customerEmail = 'กรุณากรอกอีเมลลูกค้า (Required)';
    } else if (!/\S+@\S+\.\S+/.test(customerEmail)) {
      tempErrors.customerEmail = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    if (!serviceDate) tempErrors.serviceDate = 'กรุณาระบุวันที่ใช้บริการ (Required)';
    if (!pickupTime) tempErrors.pickupTime = 'กรุณาระบุเวลารับ (Required)';
    if (!pickupLocation.trim()) tempErrors.pickupLocation = 'กรุณาระบุจุดรับ (Required)';
    if (!dropoffLocation.trim()) tempErrors.dropoffLocation = 'กรุณาระบุจุดส่ง (Required)';
    if (!vehicleType) tempErrors.vehicleType = 'กรุณาเลือกประเภทยานพาหนะ (Required)';

    const dCount = Number(driverCount) || 0;
    const dPrice = Number(driverPrice) || 0;
    const pCount = Number(pillionCount) || 0;
    const pPrice = Number(pillionPrice) || 0;

    if (dCount < 0) tempErrors.driverCount = 'จำนวนผู้ใหญ่ต้องไม่ติดลบ';
    if (dPrice < 0) tempErrors.driverPrice = 'ราคาผู้ใหญ่ต้องไม่ติดลบ';
    if (pCount < 0) tempErrors.pillionCount = 'จำนวนเด็กต้องไม่ติดลบ';
    if (pPrice < 0) tempErrors.pillionPrice = 'ราคาเด็กต้องไม่ติดลบ';
    if (dCount === 0 && pCount === 0) {
      tempErrors.driverCount = 'ต้องระบุจำนวนลูกค้าอย่างน้อย 1 คน (ผู้ใหญ่ หรือ เด็ก)';
    }

    if (paymentStatus === 'Partial') {
      const depAmt = Number(depositAmount);
      if (depositAmount === '' || isNaN(depAmt) || depAmt < 0) {
        tempErrors.depositAmount = 'กรุณาระบุจำนวนเงินมัดจำที่ถูกต้อง';
      }
    }

    if (paymentStatus === 'Collect') {
      const colAmt = Number(collectAmount);
      if (collectAmount === '' || isNaN(colAmt) || colAmt < 0) {
        tempErrors.collectAmount = 'กรุณาระบุจำนวนเงินที่เก็บจากลูกค้า';
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      ...(editingVoucher ? { id: editingVoucher.id, voucherNo: editingVoucher.voucherNo } : {}),
      tourName,
      agentName,
      externalVoucherNo: externalVoucherNo.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      serviceDate,
      pickupTime,
      vehicleType,
      pickupVehicle,
      dropoffVehicle,
      driverCount: Number(driverCount) || 0,
      driverPrice: Number(driverPrice) || 0,
      pillionCount: Number(pillionCount) || 0,
      pillionPrice: vehicleType.toLowerCase().includes('private') ? 0 : (Number(pillionPrice) || 0),
      pickupLocation: pickupLocation.trim(),
      dropoffLocation: dropoffLocation.trim(),
      paymentStatus,
      depositAmount: paymentStatus === 'Partial' ? (Number(depositAmount) || 0) : undefined,
      collectAmount: paymentStatus === 'Collect' ? (Number(collectAmount) || 0) : undefined,
      sendEmail,
      language,
      notes: notes.trim(),
      lineId: editingVoucher?.lineId,
      whatsappId: editingVoucher?.whatsappId,
      wechatId: editingVoucher?.wechatId,
      lineQrUrl: editingVoucher?.lineQrUrl,
      whatsappQrUrl: editingVoucher?.whatsappQrUrl,
      wechatQrUrl: editingVoucher?.wechatQrUrl,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto bg-white border border-sky-100 rounded-3xl p-6 md:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.05)] flex flex-col gap-8">
      {/* Title Header */}
      <div className="flex justify-between items-center pb-4 border-b border-sky-50">
        <div>
          <h2 className="text-lg md:text-xl font-black text-sky-950 flex items-center gap-2">
            {editingVoucher ? '📝 แก้ไขข้อมูลวอเชอร์ / Edit Tour Voucher' : '✨ ออกวอเชอร์จำหน่ายทัวร์ใหม่ / Create Tour Voucher'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            KOHNGAICAMPINGTRAVEL • จัดการการจองและออกตั๋วระดับพรีเมียมให้กับลูกค้า
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg border border-sky-100 text-sky-400 hover:bg-sky-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUMN 1: Tour details & Customer info */}
        <div className="flex flex-col gap-6">
          {/* SECTION 1: Booking Core Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-[0.12em]">
              1. ข้อมูลการเดินทาง & เอเยนต์ผู้จำหน่าย (Tour & Agent Details)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableSelect
                label="ชื่อทัวร์ / โปรแกรมทัวร์ (Tour Program)"
                value={tourName}
                onChange={setTourName}
                options={masterData.tours}
                required
              />

              <SearchableSelect
                label="เอเยนต์ผู้จอง / วอคอิน (Agent)"
                value={agentName}
                onChange={setAgentName}
                options={masterData.agents}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">เลขวอเชอร์นอก (Ext Voucher Code)</label>
                <input
                  type="text"
                  value={externalVoucherNo}
                  onChange={(e) => setExternalVoucherNo(e.target.value)}
                  placeholder="ระบุรหัสอ้างอิงภายนอก"
                  className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">วันที่ใช้บริการ (Service Date) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-sky-400" />
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border ${errors.serviceDate ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                  />
                </div>
                {errors.serviceDate && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.serviceDate}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">เวลารับ (Pickup Time) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-sky-400" />
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border ${errors.pickupTime ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                  />
                </div>
                {errors.pickupTime && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.pickupTime}</p>}
              </div>
            </div>
          </div>

          <hr className="border-sky-100/50" />

          {/* SECTION 2: Customer Contact Info */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-[0.12em]">
              2. ข้อมูลส่วนบุคคลลูกค้า (Customer Details)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">ชื่อลูกค้า (Full Name) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-sky-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ชื่อ-นามสกุลลูกค้าภาษาอังกฤษ"
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border ${errors.customerName ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                  />
                </div>
                {errors.customerName && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.customerName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">เบอร์โทรศัพท์ (Phone Number) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-sky-400" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border ${errors.customerPhone ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                  />
                </div>
                {errors.customerPhone && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.customerPhone}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-950 mb-1.5">อีเมลลูกค้า (Customer Email) <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-sky-400" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl border ${errors.customerEmail ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                />
              </div>
              {errors.customerEmail && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.customerEmail}</p>}
            </div>
          </div>
        </div>

        {/* COLUMN 2: Vehicle Selection & Logistics */}
        <div className="flex flex-col gap-6">
          {/* Vehicle Selection - First-Class Compulsory Option */}
          <div className="flex flex-col gap-4 bg-sky-50/30 p-4 rounded-2xl border border-sky-100/50">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-[0.12em]">
              3. ประเภทยานพาหนะ (Vehicle Selection)
            </h3>

            <SearchableSelect
              label="ประเภทยานพาหนะที่ใช้บริการ"
              value={vehicleType}
              onChange={(val) => {
                setVehicleType(val);
                if (val.toLowerCase().includes('private')) {
                  setPillionPrice(0);
                }
              }}
              options={masterData.vehicleTypes || []}
              required
              error={errors.vehicleType}
            />

            {/* Pick-up / Drop-off Vehicles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">รถรับ (Pickup Vehicle)</label>
                <select
                  value={pickupVehicle}
                  onChange={(e) => setPickupVehicle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-black text-slate-950"
                >
                  <option value="">-- ไม่ระบุ / None --</option>
                  {(masterData.vehicles || []).map((vehicle) => (
                    <option key={`pv-${vehicle}`} value={vehicle}>{vehicle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">รถส่ง (Dropoff Vehicle)</label>
                <select
                  value={dropoffVehicle}
                  onChange={(e) => setDropoffVehicle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-black text-slate-950"
                >
                  <option value="">-- ไม่ระบุ / None --</option>
                  {(masterData.vehicles || []).map((vehicle) => (
                    <option key={`dv-${vehicle}`} value={vehicle}>{vehicle}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-sky-100/50" />

          {/* SECTION 3: Logistics Info (เส้นทางและการเดินทาง) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-[0.12em]">
              4. เส้นทางและการเดินทาง (Logistics Info)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">จุดรับ (Pickup Location) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-sky-500" />
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="ชื่อโรงแรม ล็อบบี้ หรือพิกัดจุดรับ"
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border ${errors.pickupLocation ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                  />
                </div>
                {errors.pickupLocation && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.pickupLocation}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-950 mb-1.5">จุดส่ง (Dropoff Location) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-rose-500" />
                  <input
                    type="text"
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    placeholder="ชื่อโรงแรม ท่าเรือ หรือจุดส่งกลับ"
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border ${errors.dropoffLocation ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                  />
                </div>
                {errors.dropoffLocation && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.dropoffLocation}</p>}
              </div>
            </div>
          </div>

          <hr className="border-sky-100/50" />

          {/* SECTION 4: Booking Pricing & Headcount */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-[0.12em]">
              5. จำนวน และ ราคาที่จอง (Quantities & Pricing)
            </h3>

            {(() => {
              const isPrivate = vehicleType.toLowerCase().includes('private');
              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-sky-950 mb-1.5">จำนวน (ผู้ใหญ่) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        value={driverCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDriverCount(val === '' ? '' : Math.max(0, parseInt(val) || 0));
                        }}
                        className={`w-full px-3.5 py-2 rounded-xl border ${errors.driverCount ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
                      />
                      {errors.driverCount && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.driverCount}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-sky-950 mb-1.5">จำนวน (เด็ก)</label>
                      <input
                        type="number"
                        value={pillionCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPillionCount(val === '' ? '' : Math.max(0, parseInt(val) || 0));
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      />
                    </div>

                    {isPrivate ? (
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-sky-950 mb-1.5">ราคาเหมา (Charter Price / Flat Rate) <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          value={driverPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDriverPrice(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold text-sky-900"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-sky-950 mb-1.5">ราคาต่อคน (ผู้ใหญ่) <span className="text-rose-500">*</span></label>
                          <input
                            type="number"
                            value={driverPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDriverPrice(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                            }}
                            className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-sky-950 mb-1.5">ราคาต่อคน (เด็ก)</label>
                          <input
                            type="number"
                            value={pillionPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPillionPrice(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                            }}
                            className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-sky-50/30 p-4 rounded-2xl flex justify-between items-center border border-sky-100/40">
                    <span className="text-xs font-bold text-sky-900 uppercase tracking-wide">ยอดรวมในวอเชอร์นี้:</span>
                    <span className="text-lg font-black text-sky-950 font-mono">
                      ฿{(isPrivate
                        ? (Number(driverPrice) || 0)
                        : ((Number(driverCount) || 0) * (Number(driverPrice) || 0) + (Number(pillionCount) || 0) * (Number(pillionPrice) || 0))
                      ).toLocaleString()}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <hr className="border-sky-50" />

      {/* SECTION 5: Language, Payment & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-[0.12em]">
            6. ตั้งค่าวอเชอร์ & การชำระเงิน (Voucher & Payment Settings)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-sky-950 mb-1.5">ภาษาใน Voucher (Language) <span className="text-rose-500">*</span></label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="TH">ภาษาไทย (TH)</option>
                <option value="EN">English (EN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-sky-950 mb-1.5">สถานะชำระเงิน (Payment) <span className="text-rose-500">*</span></label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="Paid">ชำระเงินแล้ว (Paid)</option>
                <option value="Unpaid">ยังไม่ชำระเงิน (Unpaid)</option>
                <option value="Pending">รอตรวจสอบ (Pending)</option>
                <option value="Partial">มัดจำบางส่วน (Partial Deposit)</option>
                <option value="Collect">เก็บเงินจากลูกค้า (Collect Payment)</option>
              </select>
            </div>
          </div>

          {paymentStatus === 'Partial' && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-sky-950 mb-1.5">จำนวนเงินมัดจำ (Deposit Amount) (บาท) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="เช่น 500"
                className={`w-full px-3.5 py-2 rounded-xl border ${errors.depositAmount ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
              />
              {errors.depositAmount && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.depositAmount}</p>}
            </div>
          )}

          {paymentStatus === 'Collect' && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-sky-950 mb-1.5">จำนวนเงินที่ต้องเก็บจากลูกค้า (Collect Amount) (บาท) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="เช่น 1500"
                className={`w-full px-3.5 py-2 rounded-xl border ${errors.collectAmount ? 'border-rose-400 bg-rose-50/20' : 'border-sky-100'} text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white`}
              />
              {errors.collectAmount && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.collectAmount}</p>}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2 bg-sky-50/30 p-3 rounded-xl border border-sky-100/50">
            <label className="relative flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="mt-1 h-4.5 w-4.5 rounded-md border-sky-300 text-sky-600 focus:ring-sky-500 accent-sky-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-sky-950">ส่ง Voucher เข้าทาง Email ของลูกค้าทันที</span>
                <span className="text-[10px] text-slate-400 font-medium">ระบบจำลองการส่งข้อมูลวอเชอร์ pdf/png ไปยัง {customerEmail || 'อีเมลลูกค้า'}</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2 uppercase tracking-[0.12em]">
            7. หมายเหตุ/สถานที่นัดพบ (Remarks & Notes)
          </h3>

          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น นัดพบหน้าล็อบบี้โรงแรม หรือ มีข้อตกลงพิเศษเพิ่มเติม"
              rows={4}
              className="w-full px-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>
        </div>
      </div>


      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-sky-50">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            id="btn_cancel_voucher"
            className="px-5 py-2.5 border border-sky-100 text-slate-500 font-bold text-sm rounded-xl hover:bg-sky-50 active:bg-sky-100 transition-all cursor-pointer"
          >
            ยกเลิก (Cancel)
          </button>
        )}
        <button
          type="submit"
          id="btn_submit_voucher"
          className="flex items-center gap-2 px-6 py-2.5 bg-sky-950 hover:bg-sky-900 active:bg-slate-950 text-white font-bold text-sm rounded-xl border-b-2 border-sky-800 shadow-md transition-all hover:shadow-sky-100 hover:shadow-lg cursor-pointer"
        >
          <Save className="w-4 h-4 text-amber-300" />
          {editingVoucher ? 'บันทึกการแก้ไข (Save Changes)' : 'ออกวอเชอร์นี้ (Create Voucher)'}
        </button>
      </div>
    </form>
  );
}
