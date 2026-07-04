import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Tag, DollarSign, FileText } from 'lucide-react';
import { Expense, MasterData } from '../types';

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => void;
  onDeleteExpense?: (id: string) => void;
  expenses: Expense[];
  masterData: MasterData;
  canDelete?: boolean;
}

export default function ExpenseForm({ onAddExpense, onDeleteExpense, expenses, masterData, canDelete = true }: ExpenseFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(masterData.expenseCategories[0] || 'ค่าน้ำมันรถ/เรือ');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('กรุณากรอกจำนวนเงินรายจ่ายที่ถูกต้อง (Amount must be > 0)');
      return;
    }
    setError('');

    onAddExpense({
      date,
      category,
      amount: Number(amount),
      description: description.trim(),
    });

    // Reset inputs except date
    setAmount('');
    setDescription('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Form Card */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          💰 บันทึกรายจ่ายใหม่ / Add Expense
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">วันที่จ่าย (Expense Date) *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">หมวดหมู่รายจ่าย (Category) *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            >
              {masterData.expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">จำนวนเงิน (Amount - THB) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">฿</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                required
                min="0.01"
                step="0.01"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-semibold"
              />
            </div>
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">คำอธิบายรายจ่าย (Description)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ค่าน้ำมันรถตู้รับแขก ท่าเรือปากเมง"
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            id="btn_add_expense_submit"
            className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-900 hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold text-sm py-2.5 rounded-xl border-b-2 border-emerald-700 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            บันทึกรายการรายจ่าย
          </button>
        </form>
      </div>

      {/* History Table List */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              📋 รายการบันทึกรายจ่ายทั้งหมด / Expense History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              แสดงประวัติค่าใช้จ่าย เรียงจากวันที่ล่าสุด
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-lg">
            ยอดรวม: ฿{expenses.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-3">วันที่ใช้จ่าย</th>
                <th className="p-3">หมวดหมู่</th>
                <th className="p-3">รายละเอียด</th>
                <th className="p-3 text-right">จำนวนเงิน</th>
                <th className="p-3 text-center">ผู้บันทึก</th>
                {canDelete && <th className="p-3 text-center w-12">ลบ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="p-8 text-center text-slate-400">
                    ไม่มีข้อมูลบันทึกรายจ่ายในระบบ
                  </td>
                </tr>
              ) : (
                [...expenses]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 text-slate-700">
                      <td className="p-3 font-mono font-medium">
                        {new Date(item.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md font-medium text-xs">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px] truncate" title={item.description}>
                        {item.description || '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">
                        {item.createdBy}
                      </td>
                      {canDelete && onDeleteExpense && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm('คุณต้องการลบรายการจ่ายนี้ใช่หรือไม่?')) {
                                onDeleteExpense(item.id);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
