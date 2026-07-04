import React, { useState } from 'react';
import { UserPlus, ShieldAlert, Key, UserCheck, Trash2, Edit2, ShieldCheck, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';
import { User, UserRole, UserPermissions } from '../types';

interface EmployeeManagerProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'> & { password?: string }) => void;
  onDeleteUser: (id: string) => void;
  onUpdatePermissions: (userId: string, permissions: UserPermissions, role: UserRole, name?: string, password?: string) => void;
}

export default function EmployeeManager({ users, currentUser, onAddUser, onDeleteUser, onUpdatePermissions }: EmployeeManagerProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('staff');

  // Permission states for new/editing user
  const [canDeleteVoucher, setCanDeleteVoucher] = useState(false);
  const [canEditVoucher, setCanEditVoucher] = useState(false);
  const [canManageOptions, setCanManageOptions] = useState(false);
  const [canManageStaff, setCanManageStaff] = useState(false);
  const [canEditInvoice, setCanEditInvoice] = useState(false);
  const [canDeleteInvoice, setCanDeleteInvoice] = useState(false);

  // Editing mode state
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [showFormPassword, setShowFormPassword] = useState(false);
  const [visibleUserPasswords, setVisibleUserPasswords] = useState<{[userId: string]: boolean}>({});

  const [error, setError] = useState('');

  // Permission Guard
  const canManage = currentUser.role === 'admin' || currentUser.permissions.canManageStaff;

  if (!canManage) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h3 className="text-lg font-bold">⚠️ สิทธิ์ไม่เพียงพอในการเข้าถึง</h3>
        <p className="text-sm text-red-600">
          เฉพาะผู้ดูแลระบบหรือผู้จัดการระบบที่มีสิทธิ์ (Admin / Manager) เท่านั้น ที่สามารถจัดการบัญชีผู้ใช้งานและกำหนดสิทธิ์ให้พนักงานคนอื่นได้
        </p>
      </div>
    );
  }

  // Adjust default permissions when role changes
  const handleRoleChange = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setCanDeleteVoucher(true);
      setCanEditVoucher(true);
      setCanManageOptions(true);
      setCanManageStaff(true);
      setCanEditInvoice(true);
      setCanDeleteInvoice(true);
    } else if (selectedRole === 'manager') {
      setCanDeleteVoucher(true);
      setCanEditVoucher(true);
      setCanManageOptions(true);
      setCanManageStaff(false);
      setCanEditInvoice(true);
      setCanDeleteInvoice(true);
    } else {
      setCanDeleteVoucher(false);
      setCanEditVoucher(false);
      setCanManageOptions(false);
      setCanManageStaff(false);
      setCanEditInvoice(false);
      setCanDeleteInvoice(false);
    }
  };

  const startEditUser = (u: User) => {
    if (u.username === 'admin' && currentUser.username !== 'admin') {
      alert('ไม่สามารถแก้ไขบัญชีผู้ดูแลระบบหลักได้');
      return;
    }
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setPassword(u.password || '');
    setRole(u.role);
    setCanDeleteVoucher(u.permissions.canDeleteVoucher);
    setCanEditVoucher(u.permissions.canEditVoucher);
    setCanManageOptions(u.permissions.canManageOptions);
    setCanManageStaff(u.permissions.canManageStaff);
    setCanEditInvoice(u.permissions.canEditInvoice || false);
    setCanDeleteInvoice(u.permissions.canDeleteInvoice || false);
    setError('');
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setName('');
    setRole('staff');
    setCanDeleteVoucher(false);
    setCanEditVoucher(false);
    setCanManageOptions(false);
    setCanManageStaff(false);
    setCanEditInvoice(false);
    setCanDeleteInvoice(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password || !name.trim()) {
      setError('กรุณากรอกข้อมูลผู้ใช้งานให้ครบทุกช่อง');
      return;
    }

    if (!editingUser && users.some((u) => u.username === cleanUser)) {
      setError('ชื่อผู้ใช้งาน (username) นี้ได้รับการสมัครในระบบแล้ว');
      return;
    }
    setError('');

    if (editingUser) {
      // Edit mode: Update user
      onUpdatePermissions(
        editingUser.id,
        {
          canDeleteVoucher,
          canEditVoucher,
          canManageOptions,
          canManageStaff,
          canEditInvoice,
          canDeleteInvoice,
        },
        role,
        name.trim(),
        password
      );
      alert(`แก้ไขข้อมูลพนักงาน "${name.trim()}" สำเร็จแล้ว!`);
      cancelEdit();
    } else {
      // Add mode: Create user
      onAddUser({
        username: cleanUser,
        password,
        name: name.trim(),
        role,
        permissions: {
          canDeleteVoucher,
          canEditVoucher,
          canManageOptions,
          canManageStaff,
          canEditInvoice,
          canDeleteInvoice,
        },
      });

      // Reset Form
      cancelEdit();
    }
  };

  const toggleUserPermission = (u: User, field: keyof UserPermissions) => {
    if (u.id === currentUser.id) {
      alert('คุณไม่สามารถเปลี่ยนสิทธิ์ของตัวคุณเองได้');
      return;
    }
    if (u.username === 'admin') {
      alert('ไม่สามารถแก้ไขสิทธิ์ของบัญชีผู้ดูแลระบบหลักได้');
      return;
    }

    const updatedPerms = {
      ...u.permissions,
      [field]: !u.permissions[field]
    };

    onUpdatePermissions(u.id, updatedPerms, u.role);
  };

  const handleRoleUpdate = (u: User, newRole: UserRole) => {
    if (u.id === currentUser.id) {
      alert('คุณไม่สามารถเปลี่ยนระดับบทบาทของตนเองได้');
      return;
    }
    if (u.username === 'admin') {
      alert('ไม่สามารถเปลี่ยนบทบาทของผู้ดูแลระบบหลักได้');
      return;
    }

    // Default permissions on role switch
    let perms = { ...u.permissions };
    if (newRole === 'admin') {
      perms = {
        canDeleteVoucher: true,
        canEditVoucher: true,
        canManageOptions: true,
        canManageStaff: true,
        canEditInvoice: true,
        canDeleteInvoice: true,
      };
    } else if (newRole === 'manager') {
      perms = {
        canDeleteVoucher: true,
        canEditVoucher: true,
        canManageOptions: true,
        canManageStaff: false,
        canEditInvoice: true,
        canDeleteInvoice: true,
      };
    } else {
      perms = {
        canDeleteVoucher: false,
        canEditVoucher: false,
        canManageOptions: false,
        canManageStaff: false,
        canEditInvoice: false,
        canDeleteInvoice: false,
      };
    }

    onUpdatePermissions(u.id, perms, newRole);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Create Account Form */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          {editingUser ? <Edit2 className="w-5 h-5 text-sky-600" /> : <UserPlus className="w-5 h-5 text-emerald-600" />}
          {editingUser ? 'แก้ไขข้อมูลและสิทธิ์พนักงาน / Edit Account' : 'สร้างบัญชีและกำหนดสิทธิ์พนักงาน / Add Account'}
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อแสดงพนักงาน (Name) *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ระบุชื่อพนักงาน เช่น สมชาย พารวย"
              required
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อเข้าสู่ระบบ (Username) *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="อังกฤษตัวเล็กหรือตัวเลข เช่น somchai99"
              required
              disabled={!!editingUser}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none font-mono disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">รหัสผ่านบัญชี (Password) *</label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type={showFormPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ขั้นต่ำ 4 ตัวอักษร"
                required
                className="w-full pl-9 pr-9 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowFormPassword(!showFormPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                title={showFormPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showFormPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">ประเภทบัญชีผู้ใช้ (Role) *</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-semibold text-slate-800"
            >
              <option value="staff">Staff (พนักงานจำกัดสิทธิ์)</option>
              <option value="manager">Manager (ผู้จัดการทั่วไป)</option>
              <option value="admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
            </select>
          </div>

          {/* CHECKBOX PERMISSIONS (สิทธิ์การเข้าถึง) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-2.5 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-1">
              ขอบเขตสิทธิ์การใช้งาน (TICK PERMISSIONS)
            </span>

            {/* Checkbox 1 */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={canEditVoucher}
                onChange={(e) => setCanEditVoucher(e.target.checked)}
                className="h-4 w-4 rounded-sm text-emerald-600 accent-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>สามารถแก้ไข Voucher ในระบบ (Edit)</span>
            </label>

            {/* Checkbox 2 */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={canDeleteVoucher}
                onChange={(e) => setCanDeleteVoucher(e.target.checked)}
                className="h-4 w-4 rounded-sm text-emerald-600 accent-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>สามารถลบ Voucher ออกจากระบบ (Delete)</span>
            </label>

            {/* Checkbox 2.5 (canEditInvoice) */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={canEditInvoice}
                onChange={(e) => setCanEditInvoice(e.target.checked)}
                className="h-4 w-4 rounded-sm text-emerald-600 accent-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>สามารถแก้ไข Invoice ในระบบ (Edit)</span>
            </label>

            {/* Checkbox 2.6 (canDeleteInvoice) */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={canDeleteInvoice}
                onChange={(e) => setCanDeleteInvoice(e.target.checked)}
                className="h-4 w-4 rounded-sm text-emerald-600 accent-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>สามารถลบ Invoice ออกจากระบบ (Delete)</span>
            </label>

            {/* Checkbox 3 */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={canManageOptions}
                onChange={(e) => setCanManageOptions(e.target.checked)}
                className="h-4 w-4 rounded-sm text-emerald-600 accent-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>สามารถจัดการตัวเลือกและตารางระบบ (Settings)</span>
            </label>

            {/* Checkbox 4 */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={canManageStaff}
                onChange={(e) => setCanManageStaff(e.target.checked)}
                disabled={role === 'staff'}
                className="h-4 w-4 rounded-sm text-emerald-600 accent-emerald-600 focus:ring-0 cursor-pointer disabled:opacity-40"
              />
              <span className={role === 'staff' ? 'text-slate-400 font-normal line-through' : ''}>สามารถเพิ่ม/สิทธิ บัญชีพนักงาน (Staff)</span>
            </label>
          </div>

          {error && <p className="text-xs text-rose-500 mt-1 font-semibold">{error}</p>}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              id="btn_add_user_submit"
              className={`w-full flex items-center justify-center gap-2 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors cursor-pointer ${
                editingUser 
                  ? 'bg-sky-900 hover:bg-sky-800 border-b-2 border-sky-700' 
                  : 'bg-emerald-900 hover:bg-emerald-800 border-b-2 border-emerald-700'
              }`}
            >
              {editingUser ? <CheckSquare className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              {editingUser ? 'บันทึกการแก้ไขข้อมูลพนักงาน' : 'สร้างและเปิดใช้งานบัญชีพนักงาน'}
            </button>

            {editingUser && (
              <button
                type="button"
                onClick={cancelEdit}
                className="w-full text-slate-500 hover:text-slate-800 font-bold text-xs py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                ยกเลิกแก้ไข / Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Employees accounts list */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          รายชื่อพนักงานและสิทธิ์ผู้ใช้งานทั้งหมด / Staff Access Control
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-3">ชื่อ-นามสกุล</th>
                <th className="p-3">Username</th>
                <th className="p-3 text-center">รหัสผ่าน (Password)</th>
                <th className="p-3 text-center">ระดับบทบาท</th>
                <th className="p-3 text-center">สิทธิ์การจัดการ</th>
                <th className="p-3 text-center w-12">แก้ไข</th>
                <th className="p-3 text-center w-12">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const isAdminAccount = u.username === 'admin';
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">
                      {u.name} {isSelf && <span className="ml-1 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black">YOU</span>}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-500">{u.username}</td>
                    <td className="p-3 text-center font-mono text-xs">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-lg">
                        <span className="font-semibold text-slate-600 select-all tracking-wider min-w-[50px] text-center">
                          {visibleUserPasswords[u.id] ? (u.password || '••••') : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVisibleUserPasswords(prev => ({
                            ...prev,
                            [u.id]: !prev[u.id]
                          }))}
                          className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5"
                          title={visibleUserPasswords[u.id] ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        >
                          {visibleUserPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleUpdate(u, e.target.value as UserRole)}
                        disabled={isSelf || isAdminAccount}
                        className="px-2 py-0.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-bold focus:outline-none disabled:opacity-60"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5 text-[10px]">
                        {/* Edit Voucher Toggle */}
                        <button
                          onClick={() => toggleUserPermission(u, 'canEditVoucher')}
                          disabled={isSelf || isAdminAccount}
                          className="flex items-center gap-1.5 hover:text-emerald-600 text-left cursor-pointer disabled:pointer-events-none"
                        >
                          {u.permissions.canEditVoucher ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">☑ แก้ไขจอง</span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">☐ แก้ไขจอง</span>
                          )}
                        </button>

                        {/* Delete Voucher Toggle */}
                        <button
                          onClick={() => toggleUserPermission(u, 'canDeleteVoucher')}
                          disabled={isSelf || isAdminAccount}
                          className="flex items-center gap-1.5 hover:text-emerald-600 text-left cursor-pointer disabled:pointer-events-none"
                        >
                          {u.permissions.canDeleteVoucher ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">☑ ลบข้อมูลจอง</span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">☐ ลบข้อมูลจอง</span>
                          )}
                        </button>

                        {/* Edit Invoice Toggle */}
                        <button
                          onClick={() => toggleUserPermission(u, 'canEditInvoice')}
                          disabled={isSelf || isAdminAccount}
                          className="flex items-center gap-1.5 hover:text-emerald-600 text-left cursor-pointer disabled:pointer-events-none"
                        >
                          {u.permissions.canEditInvoice ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">☑ แก้ไขอินวอย</span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">☐ แก้ไขอินวอย</span>
                          )}
                        </button>

                        {/* Delete Invoice Toggle */}
                        <button
                          onClick={() => toggleUserPermission(u, 'canDeleteInvoice')}
                          disabled={isSelf || isAdminAccount}
                          className="flex items-center gap-1.5 hover:text-emerald-600 text-left cursor-pointer disabled:pointer-events-none"
                        >
                          {u.permissions.canDeleteInvoice ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">☑ ลบอินวอย</span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">☐ ลบอินวอย</span>
                          )}
                        </button>

                        {/* Options System Toggle */}
                        <button
                          onClick={() => toggleUserPermission(u, 'canManageOptions')}
                          disabled={isSelf || isAdminAccount}
                          className="flex items-center gap-1.5 hover:text-emerald-600 text-left cursor-pointer disabled:pointer-events-none"
                        >
                          {u.permissions.canManageOptions ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">☑ ตั้งค่าตัวเลือก</span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">☐ ตั้งค่าตัวเลือก</span>
                          )}
                        </button>

                        {/* Manage Staff Toggle */}
                        <button
                          onClick={() => toggleUserPermission(u, 'canManageStaff')}
                          disabled={isSelf || isAdminAccount || u.role === 'staff'}
                          className="flex items-center gap-1.5 hover:text-emerald-600 text-left cursor-pointer disabled:pointer-events-none disabled:opacity-30"
                        >
                          {u.permissions.canManageStaff ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">☑ สิทธิ์พนักงาน</span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">☐ สิทธิ์พนักงาน</span>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => startEditUser(u)}
                        disabled={isAdminAccount && currentUser.username !== 'admin'}
                        className="p-1 rounded-lg text-slate-400 hover:text-sky-600 disabled:opacity-40 transition-colors cursor-pointer"
                        title="แก้ไขข้อมูลและสิทธิ์พนักงาน"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`คุณแน่ใจว่าต้องการลบพนักงาน คุณ${u.name} ใช่หรือไม่?`)) {
                            onDeleteUser(u.id);
                          }
                        }}
                        disabled={isSelf || isAdminAccount}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-500 disabled:opacity-40 transition-colors cursor-pointer"
                        title="ลบบัญชีผู้ใช้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
