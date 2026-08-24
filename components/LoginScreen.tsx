import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon, ShieldCheckIcon } from './Icons';

interface LoginScreenProps {
  onLoginSuccess: (remember: boolean) => void;
  validPassword: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, validPassword }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      if (password === validPassword) {
        onLoginSuccess(rememberMe);
      } else {
        setError('Mật khẩu không chính xác. Vui lòng thử lại!');
        setIsSubmitting(false);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 mb-4 transform hover:scale-105 transition-transform duration-300">
            <LockIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            TỔNG HỢP THI ĐUA - LQĐ
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Vui lòng nhập mật khẩu để truy cập hệ thống
          </p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-indigo-500/10 border border-gray-200/80 p-6 sm:p-8 backdrop-blur-xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="app-password" 
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
              >
                Mật khẩu truy cập
              </label>
              <div className="relative">
                <input
                  id="app-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Nhập mật khẩu..."
                  autoFocus
                  required
                  className="w-full px-4 py-3 pr-11 text-base border border-gray-300 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-primary shadow-xs transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-hidden p-1 rounded-md transition-colors"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none text-text-secondary hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-gray-300 text-primary focus:ring-primary accent-primary"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="w-full py-3.5 px-6 bg-primary hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary-dark/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheckIcon className="w-5 h-5" />
              <span>{isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
            </button>
          </form>
        </div>

        <footer className="text-center mt-8 text-xs text-text-secondary">
          <p>© {new Date().getFullYear()} THPT Lê Quý Đôn. Tất cả quyền được bảo lưu.</p>
        </footer>
      </div>
    </div>
  );
};
