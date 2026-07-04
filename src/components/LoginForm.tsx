import React, { useState } from 'react';
import { LogIn, Key, User as UserIcon, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface LoginFormProps {
  onLogin: (username: string, password: string) => User | null;
  logoUrl?: string;
}

export default function LoginForm({ onLogin, logoUrl }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = onLogin(username.trim().toLowerCase(), password);
    if (!user) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (Invalid Username or Password)');
    }
  };

  return (
    <div className="min-h-screen bg-sky-50/40 flex items-center justify-center p-4 font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent)] pointer-events-none" />
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-sky-100 rounded-3xl p-6 md:p-8 shadow-[0_15px_40px_rgba(15,23,42,0.08)] flex flex-col gap-6 relative overflow-hidden">
        
        {/* Top Accent Bar (Celestial Gradient) */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-400 via-sky-600 to-amber-400" />

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mt-2">
          {logoUrl ? (
            <div className="mb-4 bg-white p-2.5 rounded-2xl border border-sky-100 shadow-[0_4px_12px_rgba(14,165,233,0.05)] max-h-24 max-w-[200px] flex items-center justify-center">
              <img src={logoUrl} alt="Logo" className="max-h-20 max-w-full object-contain rounded-xl" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-sky-950 to-slate-900 rounded-2xl flex items-center justify-center mb-3 shadow-lg border-b-4 border-amber-400">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
          )}
          <h1 className="text-2xl font-black text-sky-950 tracking-wider">
            KOH NGAI <span className="text-sky-600 font-light">CAMPING</span>
          </h1>
          <p className="text-[10px] text-sky-500 font-black uppercase tracking-[0.25em] mt-1.5">
            LUXURY TRAVEL PORTAL
          </p>
        </div>


        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-sky-900 mb-1.5 uppercase tracking-wide">ชื่อผู้ใช้ (Username)</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-2.5 h-4 w-4 text-sky-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น admin"
                required
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sky-900 mb-1.5 uppercase tracking-wide">รหัสผ่าน (Password)</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-2.5 h-4 w-4 text-sky-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="เช่น admin123"
                required
                className="w-full pl-10 pr-10 py-2 rounded-xl border border-sky-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-sky-400 hover:text-sky-600 focus:outline-none cursor-pointer"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="btn_login_submit"
            className="w-full flex items-center justify-center gap-2 bg-sky-950 hover:bg-sky-900 active:bg-slate-950 text-white font-bold text-sm py-2.5 rounded-xl shadow-md border-b-2 border-sky-800 hover:shadow-sky-200 hover:shadow-lg transition-all cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4 text-amber-300" />
            เข้าสู่ระบบจัดการข้อมูล
          </button>
        </form>

        <div className="text-center text-[10px] text-sky-400/80 font-mono uppercase tracking-widest mt-2">
          KOHNGAICAMPINGTRAVEL SYSTEM PORTAL v1.0
        </div>
      </div>
    </div>
  );
}
