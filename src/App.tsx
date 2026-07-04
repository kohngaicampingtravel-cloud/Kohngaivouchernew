import { useState, useEffect } from 'react';
import { User, Voucher, Expense, MasterData, UserRole, UserPermissions, Invoice, PaymentStatus, SystemSettings, UserActivityLog } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';

// Define initial default options
const DEFAULT_MASTER_DATA: MasterData = {
  tours: [
    'ATV Adventure Tour 1 Hour (ขับรถ ATV ป่า 1 ชม.)',
    'ATV Adventure Tour 2 Hours (ขับรถ ATV ป่า 2 ชม.)',
    'Camping & Sunset Package 2D1N (กางเต็นท์แคมป์ปิ้ง 2 วัน 1 คืน)',
    'Koh Ngai Beach Camping Daytrip (แคมป์ริมหาดเกาะไหง 1 วัน)',
    'Emerald Cave & 4 Island Snorkeling (ดำน้ำถ้ำมรกต & 4 เกาะ)',
  ],
  agents: [
    'Walk-in (หน้างาน/วอคอิน)',
    'Klook Official',
    'Traveloka Partner',
    'Agoda Activities',
    'TripAdvisor Agent',
    'Ao Nang Tour Center',
  ],
  vehicles: [
    'Toyota Commuter VIP (30-1001)',
    'Toyota Commuter VIP (30-1002)',
    'Suzuki Carry Pick-up (81-5555)',
    'Ford Ranger Pick-up 4WD (90-7777)',
    'Boat Koh Lanta Express (99-8888)',
  ],
  vehicleTypes: [
    'รถตู้ (Van)',
    'รถกระบะ / สองแถว (Pick-up / Songthaew)',
    'รถเก๋ง / SUV (Car / SUV)',
    'เรือหางยาว (Longtail Boat)',
    'เรือสปีดโบ๊ท (Speedboat)',
  ],
  expenseCategories: [
    'ค่าน้ำมันรถ/เรือ (Fuel)',
    'ค่าจ้างคนขับ/ไกด์ (Staff Wages)',
    'ค่าเบิกอาหารและน้ำดื่ม (Catering)',
    'ค่าบำรุงรักษาอุปกรณ์ (Maintenance)',
    'ค่าธรรมเนียมอุทยาน (Park Fee)',
    'ค่าโฆษณาและการตลาด (Marketing)',
    'ค่าใช้จ่ายเบ็ดเตล็ด (Miscellaneous)',
  ],
};

const DEFAULT_COMPANY_LOGO_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMTIwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjEyMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIxMjAiIHJ4PSIyNCIgZmlsbD0iIzBmMTcyYSIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0LCAyMCkiPjxwYXRoIGQ9Ik0gMzYgMTIgTCA2OCA2OCBMIDQgNjggWiIgZmlsbD0iI2Y1OWUwYiIvPjxwYXRoIGQ9Ik0gMzYgMTIgTCAzNiA2OCBMIDQgNjggWiIgZmlsbD0iI2Q5NzcwNiIvPjxwYXRoIGQ9Ik0gMzYgMzYgTCA1MCA2OCBMIDIyIDY4IFoiIGZpbGw9IiMwZjE3MmEiLz48cGF0aCBkPSJNIDQgNzQgUSAyMCA2OCAzNiA3NCBUIDY4IDc0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzOGJkZjgiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNIDQgODIgUSAyMCA3NiAzNiA4MiBUIDY4IDgyIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMjg0YzciIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iMTgiIGN5PSIyNiIgcj0iOSIgZmlsbD0iI2VmNDQ0NCIvPjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMTIsIDM0KSI+PHRleHQgeD0iMCIgeT0iMjAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjiIiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiNmZmZmZmYiIGxldHRlci1zcGFjaW5nPSIwLjUiPuC4muC4o+C4tOC4nuC4seC4lyDguYDguIHguYfguKPguYfguJUg4LmE4Lir4LiHIOC5geC4hOC4oeC4m+C5jOC4m+C4tOC5ieC4hyDguYHguJfguKPguYDguKfguKUg4LiI4Liz4LiB4Lix4LiUPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjQyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2Y1OWUwYiIgbGV0dGVyLXNwYWNpbmc9IjEuMiI+S09IIE5HQUkgQ0FNUElORyBUUkFWRUwgQ08uLCBMVEQuPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjU4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjOTRhM2I4IiBsZXR0ZXItc3BhY2luZz0iMC41Ij5UQVQgTElDRU5TRSBOTy4gMzQvMDMyNDI8L3RleHQ+PC9nPjwvc3ZnPg==`;

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companyName: 'บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด (Koh Ngai Camping Travel Co., Ltd.)',
  registrationNo: '34 /03242',
  address: '565 Moo 11 Krabi Noi, Mueang Krabi, Krabi 81000 Thailand',
  phone: '+6680-3203719',
  whatsapp: '+6695596321',
  officePhone: '0955963231',
  email: 'kohngaicampingtour@gmail.com',
  website: 'kohngaicampingtravel.com',
  logoUrl: DEFAULT_COMPANY_LOGO_SVG,
  lineQrUrl: '',
  whatsappQrUrl: '',
  wechatQrUrl: '',
  lineId: '@kohngaicamping',
  whatsappId: '+6695596321',
  wechatId: 'kohngaicamping',
  bankName: 'ธนาคารกสิกรไทย (Kasikorn Bank)',
  accountName: 'บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด (Koh Ngai Camping Travel Co., Ltd.)',
  accountNo: '123-4-56789-0',
  paymentInstructions: 'กรุณาโอนชำระเงินและส่งหลักฐานการโอนเงิน (Pay slip) มาทาง Line หรือ WhatsApp เพื่อยืนยันบุ๊คกิ้ง (Please transfer and send pay slip via Line or WhatsApp to confirm your booking.)'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [masterData, setMasterData] = useState<MasterData>(DEFAULT_MASTER_DATA);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);

  // Initialize Data from LocalStorage
  useEffect(() => {
    // 1. Initial User Accounts
    const storedUsers = localStorage.getItem('k_users');
    let activeUsers: User[] = [];
    if (storedUsers) {
      activeUsers = JSON.parse(storedUsers);
    } else {
      // Seed default accounts
      activeUsers = [
        {
          id: 'u-1',
          username: 'admin',
          password: 'admin123',
          name: 'ผู้ดูแลระบบสูงสุด (Admin)',
          role: 'admin',
          permissions: {
            canDeleteVoucher: true,
            canEditVoucher: true,
            canManageOptions: true,
            canManageStaff: true,
            canEditInvoice: true,
            canDeleteInvoice: true,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'u-2',
          username: 'manager',
          password: 'manager123',
          name: 'เกรียงไกร มั่นคง (Manager)',
          role: 'manager',
          permissions: {
            canDeleteVoucher: true,
            canEditVoucher: true,
            canManageOptions: true,
            canManageStaff: false,
            canEditInvoice: true,
            canDeleteInvoice: true,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'u-3',
          username: 'staff',
          password: 'staff123',
          name: 'ณิชา ยิ้มแย้ม (Staff)',
          role: 'staff',
          permissions: {
            canDeleteVoucher: false,
            canEditVoucher: false,
            canManageOptions: false,
            canManageStaff: false,
            canEditInvoice: false,
            canDeleteInvoice: false,
          },
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('k_users', JSON.stringify(activeUsers));
    }
    setUsers(activeUsers);

    // 2. Initial Master Options
    const storedMaster = localStorage.getItem('k_master_data');
    if (storedMaster) {
      try {
        const parsed = JSON.parse(storedMaster);
        setMasterData({
          ...DEFAULT_MASTER_DATA,
          ...parsed,
          vehicleTypes: parsed.vehicleTypes || DEFAULT_MASTER_DATA.vehicleTypes,
        });
      } catch (err) {
        setMasterData(DEFAULT_MASTER_DATA);
      }
    } else {
      localStorage.setItem('k_master_data', JSON.stringify(DEFAULT_MASTER_DATA));
    }

    // 2.5 Initial System Settings
    const storedSystemSettings = localStorage.getItem('k_system_settings');
    if (storedSystemSettings) {
      try {
        const parsed = JSON.parse(storedSystemSettings);
        setSystemSettings({
          ...DEFAULT_SYSTEM_SETTINGS,
          ...parsed,
          logoUrl: parsed.logoUrl || DEFAULT_COMPANY_LOGO_SVG
        });
      } catch (err) {
        setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      }
    } else {
      localStorage.setItem('k_system_settings', JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    }

    // 3. Initial Bookings / Vouchers
    const storedVouchers = localStorage.getItem('k_vouchers');
    if (storedVouchers) {
      setVouchers(JSON.parse(storedVouchers));
    } else {
      // Seed realistic test vouchers (dated around 2026-07-02)
      const seedVouchers: Voucher[] = [
        {
          id: 'v-1',
          voucherNo: 'KNC-20260702-0001',
          externalVoucherNo: 'EXT-887412',
          tourName: 'ATV Adventure Tour 1 Hour (ขับรถ ATV ป่า 1 ชม.)',
          agentName: 'Klook Official',
          customerName: 'MR. JOHN SMITH',
          customerPhone: '089-776-5544',
          customerEmail: 'john.smith@gmail.com',
          serviceDate: '2026-07-02', // Today in metadata
          pickupTime: '09:00',
          vehicleType: 'รถตู้ (Van)',
          pickupVehicle: 'Toyota Commuter VIP (30-1001)',
          dropoffVehicle: 'Toyota Commuter VIP (30-1001)',
          driverCount: 2,
          driverPrice: 1500,
          pillionCount: 1,
          pillionPrice: 1000,
          pickupLocation: 'Lobby, Layana Resort & Spa',
          dropoffLocation: 'Lobby, Layana Resort & Spa',
          paymentStatus: 'Paid',
          sendEmail: true,
          language: 'EN',
          notes: 'ต้องการรถรับที่เงียบสงบ มารับตรงเวลาด้วยครับ',
          createdAt: '2026-07-02T08:00:00.000Z',
          createdBy: 'admin',
        },
        {
          id: 'v-2',
          voucherNo: 'KNC-20260702-0002',
          externalVoucherNo: 'EXT-104925',
          tourName: 'Emerald Cave & 4 Island Snorkeling (ดำน้ำถ้ำมรกต & 4 เกาะ)',
          agentName: 'Walk-in (หน้างาน/วอคอิน)',
          customerName: 'คุณ สมศักดิ์ รักไทย',
          customerPhone: '081-443-2211',
          customerEmail: 'somsak.rt@outlook.com',
          serviceDate: '2026-07-02', // Today in metadata
          pickupTime: '08:30',
          vehicleType: 'รถกระบะ / สองแถว (Pick-up / Songthaew)',
          pickupVehicle: 'Suzuki Carry Pick-up (81-5555)',
          dropoffVehicle: 'Suzuki Carry Pick-up (81-5555)',
          driverCount: 3,
          driverPrice: 1200,
          pillionCount: 2,
          pillionPrice: 800,
          pickupLocation: 'หน้าร้านสะดวกซื้อเซเว่นปากทางเกาะลันตา',
          dropoffLocation: 'ตลาดคนเดินลันตา',
          paymentStatus: 'Pending',
          sendEmail: false,
          language: 'TH',
          notes: 'ลูกค้าพกกระเป๋ากันน้ำมาเอง ขอถุงพลาสติกคลุมกระเป๋าเสริมด้วย',
          createdAt: '2026-07-02T08:15:00.000Z',
          createdBy: 'staff',
        },
        {
          id: 'v-3',
          voucherNo: 'KNC-20260701-0001',
          externalVoucherNo: 'EXT-334900',
          tourName: 'Camping & Sunset Package 2D1N (กางเต็นท์แคมป์ปิ้ง 2 วัน 1 คืน)',
          agentName: 'Traveloka Partner',
          customerName: 'MISS CHEN WEI',
          customerPhone: '+65-9876-5432',
          customerEmail: 'chen.wei@yahoo.com',
          serviceDate: '2026-07-01', // Yesterday
          pickupTime: '14:00',
          vehicleType: 'รถกระบะ / สองแถว (Pick-up / Songthaew)',
          pickupVehicle: 'Ford Ranger Pick-up 4WD (90-7777)',
          dropoffVehicle: 'Toyota Commuter VIP (30-1002)',
          driverCount: 2,
          driverPrice: 2500,
          pillionCount: 0,
          pillionPrice: 0,
          pickupLocation: 'Saladan Pier Meeting Point',
          dropoffLocation: 'Lanta Castaway Beach Resort',
          paymentStatus: 'Paid',
          sendEmail: true,
          language: 'EN',
          notes: 'Vegetarian meals preferred. Setup campsite near beach front.',
          createdAt: '2026-07-01T10:00:00.000Z',
          createdBy: 'manager',
        },
        {
          id: 'v-4',
          voucherNo: 'KNC-20260628-0001',
          externalVoucherNo: 'EXT-002194',
          tourName: 'ATV Adventure Tour 2 Hours (ขับรถ ATV ป่า 2 ชม.)',
          agentName: 'Agoda Activities',
          customerName: 'คุณ กัลยา มณีวงษ์',
          customerPhone: '085-555-8899',
          customerEmail: 'kanlaya.m@gmail.com',
          serviceDate: '2026-06-28', // Last week
          pickupTime: '10:00',
          vehicleType: 'รถตู้ (Van)',
          pickupVehicle: 'Toyota Commuter VIP (30-1002)',
          dropoffVehicle: 'Toyota Commuter VIP (30-1002)',
          driverCount: 1,
          driverPrice: 2200,
          pillionCount: 1,
          pillionPrice: 1500,
          pickupLocation: 'โรงแรม พิมาลัย รีสอร์ท แอนด์ สปา',
          dropoffLocation: 'โรงแรม พิมาลัย รีสอร์ท แอนด์ สปา',
          paymentStatus: 'Unpaid',
          sendEmail: false,
          language: 'TH',
          notes: 'ลูกค้าขอชำระเงินสดหน้างาน กรุณาเตรียมบิลใบเสร็จเงินสดไปด้วย',
          createdAt: '2026-06-28T07:30:00.000Z',
          createdBy: 'staff',
        }
      ];
      localStorage.setItem('k_vouchers', JSON.stringify(seedVouchers));
      setVouchers(seedVouchers);
    }

    // 4. Initial Expenses
    const storedExpenses = localStorage.getItem('k_expenses');
    if (storedExpenses) {
      setExpenses(JSON.parse(storedExpenses));
    } else {
      // Seed realistic dummy expenses
      const seedExpenses: Expense[] = [
        {
          id: 'e-1',
          date: '2026-07-02', // Today
          category: 'ค่าน้ำมันรถ/เรือ (Fuel)',
          amount: 850,
          description: 'เติมน้ำมันรถตู้ VIP 1001 รับแขก John Smith',
          createdAt: '2026-07-02T09:30:00.000Z',
          createdBy: 'staff',
        },
        {
          id: 'e-2',
          date: '2026-07-01', // Yesterday
          category: 'ค่าจ้างคนขับ/ไกด์ (Staff Wages)',
          amount: 1500,
          description: 'ค่าเบี้ยเลี้ยงไกด์นำเที่ยวถ้ำมรกต (ไกด์สมพงษ์)',
          createdAt: '2026-07-01T17:00:00.000Z',
          createdBy: 'manager',
        },
        {
          id: 'e-3',
          date: '2026-06-30', // End of Month
          category: 'ค่าบำรุงรักษาอุปกรณ์ (Maintenance)',
          amount: 3200,
          description: 'เปลี่ยนน้ำมันเครื่องรถ ATV 2 คัน และเช็คระบบเบรค',
          createdAt: '2026-06-30T11:00:00.000Z',
          createdBy: 'admin',
        },
        {
          id: 'e-4',
          date: '2026-06-28',
          category: 'ค่าเบิกอาหารและน้ำดื่ม (Catering)',
          amount: 600,
          description: 'ซื้ออาหารกล่องบริการลูกค้าคุณกัลยา 2 ชุด และน้ำดื่ม',
          createdAt: '2026-06-28T09:00:00.000Z',
          createdBy: 'staff',
        }
      ];
      localStorage.setItem('k_expenses', JSON.stringify(seedExpenses));
      setExpenses(seedExpenses);
    }
    
    // 6. Initial Invoices
    const storedInvoices = localStorage.getItem('k_invoices');
    if (storedInvoices) {
      setInvoices(JSON.parse(storedInvoices));
    } else {
      const seedInvoices: Invoice[] = [
        {
          id: 'inv-1',
          invoiceNo: 'INV-20260702-001',
          invoiceDate: '2026-07-02',
          dueDate: '2026-07-09',
          clientName: 'MR. JOHN SMITH',
          agentName: 'Klook Official',
          clientPhone: '089-776-5544',
          clientEmail: 'john.smith@gmail.com',
          clientAddress: 'Lobby, Layana Resort & Spa',
          items: [
            { id: 'item-1', description: 'ATV Adventure Tour 1 Hour (ขับรถ ATV ป่า 1 ชม.) - MR. JOHN SMITH (คนขับ 2 ท่าน)', quantity: 2, rate: 1500 },
            { id: 'item-2', description: 'ATV Adventure Tour 1 Hour (ขับรถ ATV ป่า 1 ชม.) - MR. JOHN SMITH (คนซ้อน 1 ท่าน)', quantity: 1, rate: 1000 }
          ],
          bankName: 'ธนาคารกสิกรไทย (Kasikorn Bank)',
          accountName: 'บริษัท เกาะไหง แคมป์ปิ้ง แทรเวล จำกัด (Koh Ngai Camping Travel Co., Ltd.)',
          accountNo: '123-4-56789-0',
          notes: 'Thank you for booking with Koh Ngai Camping Travel. We look forward to welcoming you!',
          taxPercent: 0,
          discount: 0,
          isPaid: true,
          selectedVoucherId: 'v-1',
          createdAt: '2026-07-02T08:05:00.000Z',
          createdBy: 'admin',
        }
      ];
      localStorage.setItem('k_invoices', JSON.stringify(seedInvoices));
      setInvoices(seedInvoices);
    }

    // 7. Initial Activity Logs
    const storedLogs = localStorage.getItem('k_activity_logs');
    if (storedLogs) {
      setActivityLogs(JSON.parse(storedLogs));
    } else {
      const seedLogs: UserActivityLog[] = [
        {
          id: 'log-1',
          userId: 'u-1',
          username: 'admin',
          name: 'ผู้ดูแลระบบสูงสุด (Admin)',
          action: 'login',
          timestamp: '2026-07-01T08:00:00.000Z',
        },
        {
          id: 'log-2',
          userId: 'u-2',
          username: 'manager',
          name: 'ผู้จัดการสาขา (Manager)',
          action: 'login',
          timestamp: '2026-07-01T08:30:00.000Z',
        },
        {
          id: 'log-3',
          userId: 'u-3',
          username: 'staff',
          name: 'พนักงานคีย์ข้อมูล (Staff)',
          action: 'login',
          timestamp: '2026-07-02T08:00:00.000Z',
        },
        {
          id: 'log-4',
          userId: 'u-3',
          username: 'staff',
          name: 'พนักงานคีย์ข้อมูล (Staff)',
          action: 'logout',
          timestamp: '2026-07-02T17:00:00.000Z',
        }
      ];
      localStorage.setItem('k_activity_logs', JSON.stringify(seedLogs));
      setActivityLogs(seedLogs);
    }

    // 5. Try to recover active session if any
    const sessionUser = localStorage.getItem('k_session');
    if (sessionUser) {
      setCurrentUser(JSON.parse(sessionUser));
    }
  }, []);

  // Helper function to sync with Local Storage
  const syncUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('k_users', JSON.stringify(updatedUsers));
  };

  const syncActivityLogs = (updatedLogs: UserActivityLog[]) => {
    setActivityLogs(updatedLogs);
    localStorage.setItem('k_activity_logs', JSON.stringify(updatedLogs));
  };

  const syncVouchers = (updatedVouchers: Voucher[]) => {
    setVouchers(updatedVouchers);
    localStorage.setItem('k_vouchers', JSON.stringify(updatedVouchers));
  };

  const syncExpenses = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
    localStorage.setItem('k_expenses', JSON.stringify(updatedExpenses));
  };

  const syncMasterData = (updatedMaster: MasterData) => {
    setMasterData(updatedMaster);
    localStorage.setItem('k_master_data', JSON.stringify(updatedMaster));
  };

  const syncSystemSettings = (updatedSettings: SystemSettings) => {
    setSystemSettings(updatedSettings);
    localStorage.setItem('k_system_settings', JSON.stringify(updatedSettings));
  };

  const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
    syncSystemSettings(newSettings);
  };

  // Login handler
  const handleLogin = (usernameInput: string, passwordInput: string): User | null => {
    const foundUser = users.find(u => u.username === usernameInput && u.password === passwordInput);
    if (foundUser) {
      setCurrentUser(foundUser);
      localStorage.setItem('k_session', JSON.stringify(foundUser));
      
      const newLog: UserActivityLog = {
        id: `log-${Date.now()}`,
        userId: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        action: 'login',
        timestamp: new Date().toISOString()
      };
      setActivityLogs(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem('k_activity_logs', JSON.stringify(updated));
        return updated;
      });

      return foundUser;
    }
    return null;
  };

  // Logout handler
  const handleLogout = () => {
    if (currentUser) {
      const newLog: UserActivityLog = {
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        action: 'logout',
        timestamp: new Date().toISOString()
      };
      setActivityLogs(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem('k_activity_logs', JSON.stringify(updated));
        return updated;
      });
    }
    setCurrentUser(null);
    localStorage.removeItem('k_session');
  };

  // Manage Bookings
  const handleAddVoucher = (voucherData: Omit<Voucher, 'id' | 'voucherNo' | 'createdAt' | 'createdBy'>) => {
    const todayStr = voucherData.serviceDate.replace(/-/g, ''); // e.g. "20260702"
    
    // Calculate sequence for today
    const bookingsToday = vouchers.filter(v => v.serviceDate === voucherData.serviceDate);
    const nextSeqNum = bookingsToday.length + 1;
    const paddedSeq = String(nextSeqNum).padStart(4, '0'); // e.g. "0001"
    
    const uniqueVoucherNo = `KNC-${todayStr}-${paddedSeq}`;
    
    const newVoucher: Voucher = {
      ...voucherData,
      id: `v-${Date.now()}`,
      voucherNo: uniqueVoucherNo,
      createdAt: new Date().toISOString(),
      createdBy: currentUser ? currentUser.username : 'system',
    };

    syncVouchers([newVoucher, ...vouchers]);
  };

  const handleUpdateVoucher = (updatedVoucher: Voucher) => {
    const updated = vouchers.map(v => v.id === updatedVoucher.id ? updatedVoucher : v);
    syncVouchers(updated);
  };

  const handleDeleteVoucher = (id: string) => {
    const updated = vouchers.filter(v => v.id !== id);
    syncVouchers(updated);
  };

  // Manage Expenses
  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `e-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser ? currentUser.username : 'system',
    };

    syncExpenses([newExpense, ...expenses]);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    syncExpenses(updated);
  };

  // Helper function to sync with Local Storage for Invoices
  const syncInvoices = (updatedInvoices: Invoice[]) => {
    setInvoices(updatedInvoices);
    localStorage.setItem('k_invoices', JSON.stringify(updatedInvoices));
  };

  const syncVoucherFromInvoice = (voucherIdString: string, invoice: Partial<Invoice>) => {
    if (!voucherIdString) return;
    const voucherIds = voucherIdString.split(',').map(id => id.trim()).filter(Boolean);
    if (voucherIds.length === 0) return;

    setVouchers(prevVouchers => {
      const updated = prevVouchers.map(v => {
        if (voucherIds.includes(v.id)) {
          let pStatus = v.paymentStatus;
          if (invoice.watermarkType === 'PAID') {
            pStatus = 'Paid';
          } else if (invoice.watermarkType === 'DEPOSIT') {
            pStatus = 'Partial';
          } else if (invoice.watermarkType === 'UNPAID') {
            pStatus = 'Unpaid';
          } else if (invoice.isPaid !== undefined) {
            pStatus = invoice.isPaid ? 'Paid' : 'Unpaid';
          }

          return {
            ...v,
            customerName: invoice.clientName || v.customerName,
            customerPhone: invoice.clientPhone || v.customerPhone,
            customerEmail: invoice.clientEmail || v.customerEmail,
            agentName: invoice.agentName || v.agentName,
            paymentStatus: pStatus as PaymentStatus,
          };
        }
        return v;
      });
      localStorage.setItem('k_vouchers', JSON.stringify(updated));
      return updated;
    });
  };

  // Manage Invoices
  const handleAddInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy'>) => {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser ? currentUser.username : 'system',
    };
    syncInvoices([newInvoice, ...invoices]);
    if (newInvoice.selectedVoucherId) {
      syncVoucherFromInvoice(newInvoice.selectedVoucherId, newInvoice);
    }
    return newInvoice;
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    const updated = invoices.map(i => i.id === updatedInvoice.id ? updatedInvoice : i);
    syncInvoices(updated);
    if (updatedInvoice.selectedVoucherId) {
      syncVoucherFromInvoice(updatedInvoice.selectedVoucherId, updatedInvoice);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    const updated = invoices.filter(i => i.id !== id);
    syncInvoices(updated);
  };

  // Manage Master Data Settings
  const handleUpdateMasterData = (newMasterData: MasterData) => {
    syncMasterData(newMasterData);
  };

  // Manage Employee accounts
  const handleAddUser = (newUserData: Omit<User, 'id' | 'createdAt'> & { password?: string }) => {
    const newUser: User = {
      ...newUserData,
      id: `u-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    syncUsers([...users, newUser]);
    alert(`สร้างบัญชีพนักงาน "${newUserData.name}" สำเร็จ เรียบร้อยแล้ว!`);
  };

  const handleDeleteUser = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    syncUsers(updated);
    alert('ลบบัญชีผู้ใช้งานพนักงานออกเรียบร้อยแล้ว');
  };

  const handleUpdatePermissions = (userId: string, permissions: UserPermissions, role: UserRole, name?: string, password?: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          role,
          permissions,
          name: name !== undefined ? name : u.name,
          password: password !== undefined ? password : u.password,
        };
      }
      return u;
    });
    syncUsers(updated);
  };

  // If not logged in, show Login Form
  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} logoUrl={systemSettings.logoUrl} />;
  }

  // Else, show Main Applet Interface
  return (
    <Dashboard
      currentUser={currentUser}
      users={users}
      vouchers={vouchers}
      expenses={expenses}
      invoices={invoices}
      masterData={masterData}
      systemSettings={systemSettings}
      activityLogs={activityLogs}
      onLogout={handleLogout}
      onAddVoucher={handleAddVoucher}
      onUpdateVoucher={handleUpdateVoucher}
      onDeleteVoucher={handleDeleteVoucher}
      onAddExpense={handleAddExpense}
      onDeleteExpense={handleDeleteExpense}
      onAddInvoice={handleAddInvoice}
      onUpdateInvoice={handleUpdateInvoice}
      onDeleteInvoice={handleDeleteInvoice}
      onUpdateMasterData={handleUpdateMasterData}
      onUpdateSystemSettings={handleUpdateSystemSettings}
      onAddUser={handleAddUser}
      onDeleteUser={handleDeleteUser}
      onUpdatePermissions={handleUpdatePermissions}
    />
  );
}
