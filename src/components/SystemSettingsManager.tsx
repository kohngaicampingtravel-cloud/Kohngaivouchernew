import React, { useState, useRef } from 'react';
import { 
  Building, Mail, Globe, MapPin, Phone, Upload, Check, Trash2, ShieldAlert, Sparkles, AlertCircle, FileText
} from 'lucide-react';
import { SystemSettings, User } from '../types';

interface SystemSettingsManagerProps {
  systemSettings: SystemSettings;
  currentUser: User;
  onUpdateSystemSettings: (newSettings: SystemSettings) => void;
}

export default function SystemSettingsManager({ 
  systemSettings, 
  currentUser, 
  onUpdateSystemSettings 
}: SystemSettingsManagerProps) {
  
  // State variables for form fields
  const [companyName, setCompanyName] = useState(systemSettings.companyName || '');
  const [registrationNo, setRegistrationNo] = useState(systemSettings.registrationNo || '');
  const [address, setAddress] = useState(systemSettings.address || '');
  const [phone, setPhone] = useState(systemSettings.phone || '');
  const [whatsapp, setWhatsapp] = useState(systemSettings.whatsapp || '');
  const [officePhone, setOfficePhone] = useState(systemSettings.officePhone || '');
  const [email, setEmail] = useState(systemSettings.email || '');
  const [website, setWebsite] = useState(systemSettings.website || '');
  const [lineId, setLineId] = useState(systemSettings.lineId || '');
  const [whatsappId, setWhatsappId] = useState(systemSettings.whatsappId || '');
  const [wechatId, setWechatId] = useState(systemSettings.wechatId || '');
  const [bankName, setBankName] = useState(systemSettings.bankName || '');
  const [accountName, setAccountName] = useState(systemSettings.accountName || '');
  const [accountNo, setAccountNo] = useState(systemSettings.accountNo || '');
  const [paymentInstructions, setPaymentInstructions] = useState(systemSettings.paymentInstructions || '');

  // Base64 states for logo and QR images
  const [logoUrl, setLogoUrl] = useState<string>(systemSettings.logoUrl || '');
  const [lineQrUrl, setLineQrUrl] = useState<string>(systemSettings.lineQrUrl || '');
  const [whatsappQrUrl, setWhatsappQrUrl] = useState<string>(systemSettings.whatsappQrUrl || '');
  const [wechatQrUrl, setWechatQrUrl] = useState<string>(systemSettings.wechatQrUrl || '');
  const [paymentQrUrl, setPaymentQrUrl] = useState<string>(systemSettings.paymentQrUrl || '');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dragActive, setDragActive] = useState<{ [key: string]: boolean }>({
    logo: false,
    line: false,
    whatsapp: false,
    wechat: false,
    payment: false
  });

  // Permission Guard
  const isWebAdmin = currentUser.role === 'admin';

  if (!isWebAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h3 className="text-lg font-bold">⚠️ ขออภัย เฉพาะผู้ดูแลระบบสูงสุด (Admin) เท่านั้น</h3>
        <p className="text-sm text-rose-600">
          สิทธิ์การแก้ไขข้อมูลสำนักงาน ชื่อบริษัท คิวอาร์โค้ด และข้อมูลใบกำกับภาษี/ใบแจ้งหนี้เป็นสิทธิ์ของ Admin เท่านั้น เพื่อความปลอดภัยสูงสุดของข้อมูล
        </p>
      </div>
    );
  }

  // Handle image files conversion to base64 with canvas auto-compression (Max 400px to prevent QuotaExceededError in localStorage)
  const handleImageFile = (file: File, type: 'logo' | 'line' | 'whatsapp' | 'wechat' | 'payment') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (PNG, JPG, JPEG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); // Compress to light JPEG (85% quality) for extreme performance
          if (type === 'logo') setLogoUrl(compressedBase64);
          if (type === 'line') setLineQrUrl(compressedBase64);
          if (type === 'whatsapp') setWhatsappQrUrl(compressedBase64);
          if (type === 'wechat') setWechatQrUrl(compressedBase64);
          if (type === 'payment') setPaymentQrUrl(compressedBase64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent, key: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [key]: active }));
  };

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'line' | 'whatsapp' | 'wechat' | 'payment') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0], type);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'line' | 'whatsapp' | 'wechat' | 'payment') => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0], type);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: SystemSettings = {
      companyName,
      registrationNo,
      address,
      phone,
      whatsapp,
      officePhone,
      email,
      website,
      logoUrl,
      lineQrUrl,
      whatsappQrUrl,
      wechatQrUrl,
      lineId,
      whatsappId,
      wechatId,
      bankName,
      accountName,
      accountNo,
      paymentInstructions,
      paymentQrUrl
    };

    onUpdateSystemSettings(updatedSettings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  const renderUploadBox = (
    label: string, 
    value: string, 
    setValue: (v: string) => void, 
    type: 'logo' | 'line' | 'whatsapp' | 'wechat' | 'payment',
    boxId: string
  ) => {
    const isDrag = dragActive[type];
    return (
      <div className="flex flex-col gap-2">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
        
        {value ? (
          <div className="relative border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center gap-3 group">
            <img src={value} alt={label} className="max-h-32 max-w-full rounded-lg object-contain bg-white shadow-xs" referrerPolicy="no-referrer" />
            <button
              type="button"
              id={`btn_clear_${boxId}`}
              onClick={() => setValue('')}
              className="absolute top-2 right-2 p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-full transition-colors cursor-pointer"
              title="ลบรูปภาพ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="text-[10px] text-slate-400 font-mono text-center truncate w-full">
              อัปโหลดแล้ว (Base64 Image Data)
            </div>
          </div>
        ) : (
          <div
            onDragEnter={(e) => handleDrag(e, type, true)}
            onDragOver={(e) => handleDrag(e, type, true)}
            onDragLeave={(e) => handleDrag(e, type, false)}
            onDrop={(e) => handleDrop(e, type)}
            className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2.5 transition-all relative ${
              isDrag 
                ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                : 'border-slate-300 hover:border-sky-500 bg-slate-50/20 hover:bg-sky-50/10'
            }`}
          >
            <Upload className={`w-8 h-8 ${isDrag ? 'text-emerald-500 animate-bounce' : 'text-slate-400'}`} />
            
            <div className="text-xs text-slate-600">
              <span className="font-extrabold text-sky-700 cursor-pointer hover:underline">
                คลิกอัปโหลด
                <input
                  type="file"
                  id={`file_input_${boxId}`}
                  accept="image/*"
                  onChange={(e) => handleFileInputChange(e, type)}
                  className="hidden"
                />
              </span>
              {' '}หรือลากรูปภาพมาวางที่นี่
            </div>
            
            <p className="text-[10px] text-slate-400">รองรับไฟล์ภาพ PNG, JPG หรือ JPEG ขนาดไม่เกิน 2MB</p>
            
            <label htmlFor={`file_input_${boxId}`} className="absolute inset-0 cursor-pointer">
              <span className="sr-only">Upload {label}</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm" id="system_settings_card">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-100 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-950 text-white rounded-xl shadow-xs">
            <Building className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">🏢 ตั้งค่าข้อมูลระบบ (System Management)</h2>
            <p className="text-xs text-slate-400 mt-1">
              แก้ไขข้อมูลชื่อบริษัท, หมายเลขประจำตัวผู้เสียภาษี, ที่อยู่ เบอร์ติดต่อ และ QR Code โซเชียลมีเดียสำหรับพิมพ์บนวอเชอร์และอินวอย
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6" id="system_settings_form">
        
        {/* SECTION 1: COMPANY GENERAL INFO */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2.5 uppercase tracking-wider">
            1. ข้อมูลบริษัทและสำนักงาน (Company Information)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input_company_name" className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อบริษัทอย่างเป็นทางการ (Company Name)</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input_company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="เช่น บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input_reg_no" className="block text-xs font-bold text-slate-600 mb-1.5">เลขทะเบียนพาณิชย์ / เลขผู้เสียภาษี (Tax ID / Reg No.)</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input_reg_no"
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  placeholder="เช่น 34 /03242"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="input_address" className="block text-xs font-bold text-slate-600 mb-1.5">ที่ตั้งสำนักงาน (Office Address)</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                id="input_address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ระบุที่อยู่เต็มของสำนักงาน..."
                rows={3}
                required
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: CONTACT INFORMATION */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2.5 uppercase tracking-wider">
            2. ข้อมูลการติดต่อและเครือข่ายออนไลน์ (Contact & Digital Presence)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="input_phone" className="block text-xs font-bold text-slate-600 mb-1.5">เบอร์โทรศัพท์สายด่วน (Hotline Phone)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input_phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+6680-3203719"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input_office_phone" className="block text-xs font-bold text-slate-600 mb-1.5">เบอร์โทรสำนักงาน (Office Phone)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input_office_phone"
                  value={officePhone}
                  onChange={(e) => setOfficePhone(e.target.value)}
                  placeholder="0955963231"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input_whatsapp" className="block text-xs font-bold text-slate-600 mb-1.5">เบอร์ WhatsApp (WhatsApp Phone)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input_whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+6695596321"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input_email" className="block text-xs font-bold text-slate-600 mb-1.5">อีเมลติดต่อบริษัท (Business Email)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  id="input_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kohngaicampingtour@gmail.com"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input_website" className="block text-xs font-bold text-slate-600 mb-1.5">เว็บไซต์ของบริษัท (Website Url)</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input_website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="kohngaicampingtravel.com"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: SOCIAL IDS & QR CODES */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2.5 uppercase tracking-wider">
            3. บัญชีคิวอาร์โค้ดโซเชียลมีเดีย (Line, WhatsApp, WeChat)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/40">
              <label htmlFor="input_line_id" className="block text-xs font-bold text-slate-700 mb-1.5">Line ID / Handle</label>
              <input
                type="text"
                id="input_line_id"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="เช่น @kohngaicamping"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 mb-3"
              />
              {renderUploadBox('อัปโหลด QR Code Line', lineQrUrl, setLineQrUrl, 'line', 'line_qr')}
            </div>

            <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/40">
              <label htmlFor="input_whatsapp_id" className="block text-xs font-bold text-slate-700 mb-1.5">WhatsApp Link / ID</label>
              <input
                type="text"
                id="input_whatsapp_id"
                value={whatsappId}
                onChange={(e) => setWhatsappId(e.target.value)}
                placeholder="เช่น +6695596321"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 mb-3"
              />
              {renderUploadBox('อัปโหลด QR Code WhatsApp', whatsappQrUrl, setWhatsappQrUrl, 'whatsapp', 'whatsapp_qr')}
            </div>

            <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/40">
              <label htmlFor="input_wechat_id" className="block text-xs font-bold text-slate-700 mb-1.5">WeChat ID</label>
              <input
                type="text"
                id="input_wechat_id"
                value={wechatId}
                onChange={(e) => setWechatId(e.target.value)}
                placeholder="เช่น kohngaicamping"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 mb-3"
              />
              {renderUploadBox('อัปโหลด QR Code WeChat', wechatQrUrl, setWechatQrUrl, 'wechat', 'wechat_qr')}
            </div>
          </div>
        </div>

        {/* SECTION 4: LOGO UPLOAD */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2.5 uppercase tracking-wider">
            4. โลโก้บริษัท (Company Logo)
          </h3>
          <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/40 max-w-md">
            {renderUploadBox('โลโก้แบรนด์หลัก (Primary Logo)', logoUrl, setLogoUrl, 'logo', 'logo_box')}
          </div>
        </div>

        {/* SECTION 5: PAYMENT INSTRUCTIONS */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-sky-900 border-l-4 border-sky-600 pl-2.5 uppercase tracking-wider">
            5. ข้อมูลการชำระเงินและบัญชีธนาคาร (Payment Instructions & Bank Accounts)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="input_bank_name" className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อธนาคาร (Bank Name)</label>
              <input
                type="text"
                id="input_bank_name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="เช่น ธนาคารกสิกรไทย (Kasikorn Bank)"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>

            <div>
              <label htmlFor="input_account_name" className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อบัญชี (Account Name)</label>
              <input
                type="text"
                id="input_account_name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="เช่น บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>

            <div>
              <label htmlFor="input_account_no" className="block text-xs font-bold text-slate-600 mb-1.5">เลขที่บัญชี (Account No.)</label>
              <input
                type="text"
                id="input_account_no"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="เช่น 123-4-56789-0"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="input_payment_instructions" className="block text-xs font-bold text-slate-600 mb-1.5">คำชี้แจง / เงื่อนไขการชำระเงิน (Payment Instructions / Notes)</label>
              <textarea
                id="input_payment_instructions"
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="ระบุข้อความคำชี้แจงการโอนเงิน..."
                rows={5}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed font-semibold text-slate-700 h-[calc(100%-24px)]"
              />
            </div>
            <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/40">
              {renderUploadBox('คิวอาร์โค้ดบัญชีชำระเงิน (Payment QR Code)', paymentQrUrl, setPaymentQrUrl, 'payment', 'payment_qr')}
            </div>
          </div>
        </div>

        {/* FORM ACTION BUTTONS */}
        <div className="border-t border-slate-100 pt-5 mt-4 flex justify-end gap-3">
          <button
            type="submit"
            id="btn_submit_system_settings"
            className="px-6 py-2.5 bg-sky-950 hover:bg-sky-900 text-white font-extrabold text-xs rounded-xl shadow-md border-b-2 border-sky-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-amber-300" />
            บันทึกข้อมูลระบบสำนักงานทั้งหมด
          </button>
        </div>

      </form>
    </div>
  );
}
