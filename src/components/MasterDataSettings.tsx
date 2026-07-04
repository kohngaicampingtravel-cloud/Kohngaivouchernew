import React, { useState } from 'react';
import { Settings, Plus, Trash2, Map, Users, Truck, Sparkles, Edit2, Check, X } from 'lucide-react';
import { MasterData, User } from '../types';
import { getVehicleIcon } from './VoucherCard';

interface MasterDataSettingsProps {
  masterData: MasterData;
  currentUser: User;
  onUpdateMasterData: (newData: MasterData) => void;
}

export default function MasterDataSettings({ masterData, currentUser, onUpdateMasterData }: MasterDataSettingsProps) {
  const [activeTab, setActiveTab] = useState<'tours' | 'agents' | 'vehicles' | 'vehicleTypes' | 'expenseCategories'>('tours');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');

  // Editing state for existing items
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');

  // Permission Guard
  const canManage = currentUser.role === 'admin' || currentUser.permissions.canManageOptions;

  if (!canManage) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
        <Sparkles className="w-12 h-12 text-red-500" />
        <h3 className="text-lg font-bold">⚠️ ขออภัย คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h3>
        <p className="text-sm text-red-600">
          เฉพาะผู้จัดการและผู้ดูแลระบบ (Admin / Manager) ที่ได้รับสิทธิ์เท่านั้น จึงจะสามารถจัดการตั้งค่าระบบและตัวเลือกได้
        </p>
      </div>
    );
  }

  const handleTabChange = (tab: 'tours' | 'agents' | 'vehicles' | 'vehicleTypes' | 'expenseCategories') => {
    setActiveTab(tab);
    setError('');
    setNewValue('');
    setEditingItem(null);
    setEditValue('');
    setEditError('');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = newValue.trim();
    if (!cleanValue) return;

    const listToUpdate = masterData[activeTab];
    if (listToUpdate.includes(cleanValue)) {
      setError('ค่านี้มีอยู่ในระบบแล้ว (This value already exists)');
      return;
    }
    setError('');

    const updatedList = [...listToUpdate, cleanValue];
    onUpdateMasterData({
      ...masterData,
      [activeTab]: updatedList,
    });
    setNewValue('');
  };

  const handleStartEdit = (item: string) => {
    setEditingItem(item);
    setEditValue(item);
    setEditError('');
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
    setEditError('');
  };

  const handleSaveEdit = (oldItem: string) => {
    const cleanValue = editValue.trim();
    if (!cleanValue) {
      setEditError('ค่าที่ระบุต้องไม่เป็นค่าว่าง (Value cannot be empty)');
      return;
    }

    if (cleanValue === oldItem) {
      setEditingItem(null);
      return;
    }

    const listToUpdate = masterData[activeTab];
    // Check if the new value conflicts with any other existing values
    if (listToUpdate.filter(item => item !== oldItem).includes(cleanValue)) {
      setEditError('ค่านี้มีอยู่ในระบบแล้ว (This value already exists)');
      return;
    }

    setEditError('');

    const updatedList = listToUpdate.map((item) => (item === oldItem ? cleanValue : item));
    onUpdateMasterData({
      ...masterData,
      [activeTab]: updatedList,
    });
    setEditingItem(null);
    setEditValue('');
  };

  const handleDeleteItem = (itemToDelete: string) => {
    if (window.confirm(`คุณแน่ใจว่าต้องการลบ "${itemToDelete}" ออกจากระบบ? ตัวเลือกนี้จะไม่สามารถใช้สร้างวอเชอร์ใหม่ได้`)) {
      const updatedList = masterData[activeTab].filter((item) => item !== itemToDelete);
      onUpdateMasterData({
        ...masterData,
        [activeTab]: updatedList,
      });
      // Clear editing if we deleted the editing item
      if (editingItem === itemToDelete) {
        setEditingItem(null);
        setEditValue('');
        setEditError('');
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
        <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">⚙️ ตั้งค่าระบบและตัวเลือกข้อมูล / Master Options</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            จัดการตัวเลือกรายการแบบ Dropdown ในหน้าฟอร์มสร้างและค้นหาวอเชอร์ (เพิ่มและแก้ไขข้อมูลตัวเลือก)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Tab List */}
        <div className="md:col-span-1 flex flex-col gap-1.5 border-r border-slate-100 pr-4">
          <button
            onClick={() => handleTabChange('tours')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'tours' ? 'bg-emerald-900 text-white border-b-2 border-emerald-700 shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Map className="w-4 h-4" />
            โปรแกรมทัวร์ ({masterData.tours.length})
          </button>
          <button
            onClick={() => handleTabChange('agents')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'agents' ? 'bg-emerald-900 text-white border-b-2 border-emerald-700 shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Users className="w-4 h-4" />
            ตัวเลือกเอเยนต์ ({masterData.agents.length})
          </button>
          <button
            onClick={() => handleTabChange('vehicles')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'vehicles' ? 'bg-emerald-900 text-white border-b-2 border-emerald-700 shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Truck className="w-4 h-4" />
            ตัวเลือกรถรับ-ส่ง ({masterData.vehicles.length})
          </button>
          <button
            onClick={() => handleTabChange('vehicleTypes')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'vehicleTypes' ? 'bg-emerald-900 text-white border-b-2 border-emerald-700 shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Truck className="w-4 h-4" />
            ประเภทยานพาหนะ ({(masterData.vehicleTypes || []).length})
          </button>
          <button
            onClick={() => handleTabChange('expenseCategories')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'expenseCategories' ? 'bg-emerald-900 text-white border-b-2 border-emerald-700 shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Settings className="w-4 h-4" />
            หมวดหมู่รายจ่าย ({masterData.expenseCategories.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="md:col-span-3 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'tours' && '🗺️ รายชื่อทัวร์ / โปรแกรมทัวร์ (Tour Programs)'}
              {activeTab === 'agents' && '🤝 รายชื่อเอเยนต์ / Walk-in (Agents)'}
              {activeTab === 'vehicles' && '🚌 รายชื่อรถตู้ / รถรับ-ส่ง (Dispatch Vehicles)'}
              {activeTab === 'vehicleTypes' && '🚐 ประเภทยานพาหนะ (Vehicle Types)'}
              {activeTab === 'expenseCategories' && '💸 หมวดหมู่รายจ่ายหลัก (Expense Categories)'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              เพิ่มหรือแก้ไขและลบตัวเลือกประเภทข้อมูลที่จะนำไปใช้เป็นตัวเลือกให้แก่ทีมงานเมื่อทำรายการจอง
            </p>
          </div>

          {/* Form to add item */}
          <form onSubmit={handleAddItem} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={
                  activeTab === 'tours' ? "กรอกชื่อทัวร์ใหม่ เช่น ATV ผจญภัย 3 ชม." :
                  activeTab === 'agents' ? "กรอกชื่อเอเยนต์ใหม่ เช่น Agoda Extra" :
                  activeTab === 'vehicles' ? "กรอกชื่อทะเบียนหรือชื่อรถ เช่น รถตู้ VIP คันที่ 3" :
                  activeTab === 'vehicleTypes' ? "กรอกประเภทยานพาหนะ เช่น รถสองแถว, รถตู้" :
                  "กรอกหมวดหมู่รายจ่ายใหม่ เช่น ค่าไฟฟ้าสำนักงาน"
                }
                required
                className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              id="btn_add_master_item"
              className="px-4 py-1.5 bg-emerald-900 hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 border-b-2 border-emerald-700 shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มตัวเลือก
            </button>
          </form>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

          {/* Items List */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 text-slate-500 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
              ตัวเลือกปัจจุบันในระบบ ({(masterData[activeTab] || []).length})
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto bg-white">
              {(!masterData[activeTab] || masterData[activeTab].length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  ไม่มีตัวเลือกในหมวดหมู่นี้ กรุณาเพิ่มอย่างน้อย 1 รายการ
                </div>
              ) : (
                (masterData[activeTab] || []).map((item) => {
                  const isEditing = editingItem === item;
                  return (
                    <div key={item} className="px-4 py-2.5 flex justify-between items-center text-xs hover:bg-slate-50 gap-3">
                      <div className="flex-1 flex items-center gap-2.5">
                        {activeTab === 'vehicleTypes' && (
                          <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700 shrink-0 shadow-3xs flex items-center justify-center">
                            {getVehicleIcon(isEditing ? editValue : item)}
                          </div>
                        )}
                        {isEditing ? (
                          <div className="flex-1 flex flex-col gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg border border-emerald-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item);
                                else if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            {editError && <span className="text-[10px] text-rose-500 font-bold">{editError}</span>}
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-700">{item}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item)}
                              className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="บันทึกการแก้ไข (Save)"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="ยกเลิก (Cancel)"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors cursor-pointer"
                              title="แก้ไขชื่อตัวเลือก (Edit)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="ลบตัวเลือก (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Guide Card for Vehicle Type Icon Matching */}
          {activeTab === 'vehicleTypes' && (
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 text-[11px] leading-relaxed text-emerald-950">
              <p className="font-extrabold text-xs text-emerald-900 mb-1.5 flex items-center gap-1">
                💡 คำแนะนำสำหรับการจับคู่ไอคอนยานพาหนะอัตโนมัติ (Automated Icon Matching):
              </p>
              <p className="font-medium text-emerald-800">
                ระบบจะวิเคราะห์คีย์เวิร์ดหรืออีโมจิในชื่อ "ประเภทยานพาหนะ" ที่คุณเพิ่มเพื่อแสดงไอคอนที่ถูกต้องให้โดยอัตโนมัติ:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 font-semibold text-emerald-900">
                <li className="flex items-center gap-1.5">🚌 <strong>รถตู้/รถบัส</strong>: ตู้, รถตู้, Van, Bus, Coach, Shuttle, 🚐, 🚌</li>
                <li className="flex items-center gap-1.5">🛶 <strong>เรือทุกชนิด</strong>: เรือ, Boat, Speedboat, Longtail, Yacht, ⛵, 🚤, 🛶</li>
                <li className="flex items-center gap-1.5">🏍️ <strong>มอเตอร์ไซค์/จักรยาน</strong>: มอเตอร์ไซค์, Motorcycle, Bike, Scooter, 🏍️, 🚲</li>
                <li className="flex items-center gap-1.5">🚗 <strong>รถยนต์/SUV/เก๋ง</strong>: รถเก๋ง, แท็กซี่, Car, SUV, Taxi, Sedan, 🚗, 🚕</li>
                <li className="flex items-center gap-1.5">🚚 <strong>รถสองแถว/กระบะ (ดั้งเดิม)</strong>: สองแถว, กระบะ, Pickup, Truck, 🚚</li>
              </ul>
              <p className="text-emerald-700 font-medium mt-2 italic">
                * หากไม่มีคีย์เวิร์ดข้างต้น ระบบจะใช้ไอคอนรถกระบะ/สองแถว (Truck) เป็นไอคอนตั้งต้น
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
