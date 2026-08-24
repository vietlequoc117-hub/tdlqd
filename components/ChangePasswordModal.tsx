import React, { useState } from 'react';
import { KeyIcon, EyeIcon, EyeOffIcon, XIcon, CheckCircleIcon } from './Icons';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStoredPassword: string;
  onPasswordChanged: (newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentStoredPassword,
  onPasswordChanged,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (oldPassword !== currentStoredPassword) {
      setError('Mật khẩu hiện tại không chính xác.');
      return;
    }

    if (!newPassword.trim()) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.length < 4) {
      setError('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    onPasswordChanged(newPassword);
    setSuccess('Đổi mật khẩu thành công!');
    setTimeout(() => {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(null);
      onClose();
    }, 1000);
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-gray-100 relative transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          title="Đóng"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-primary flex items-center justify-center shadow-xs">
            <KeyIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary">Đổi Mật Khẩu</h3>
            <p className="text-xs text-text-secondary">Cập nhật mật khẩu bảo vệ ứng dụng</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                required
                className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-hidden"
              >
                {showOld ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
                required
                className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-hidden"
              >
                {showNew ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-hidden"
              >
                {showConfirm ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-text-primary text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg shadow-md shadow-primary/20 hover:shadow-lg transition-all cursor-pointer"
            >
              Lưu Mật Khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
