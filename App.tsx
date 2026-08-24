
import React, { useState, useCallback, useMemo } from 'react';
import type { UploadedFiles, FileKey, KqDiem, KqGv, KqDoan, DashboardData, ParsedData, KqNam, TermOption, KqNeNep, KqGd } from './types';
import { generateConsolidatedExcel, identifyAndSortFiles, processAndStructureData } from './services/excelService';
import { FileUploader } from './components/FileUploader';
import { DownloadIcon, LoaderIcon, CheckCircleIcon, FileIcon, RefreshIcon, KeyIcon, LogOutIcon } from './components/Icons';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';

const DEFAULT_PASSWORD = '123456';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('lqd_auth') === 'true' || sessionStorage.getItem('lqd_auth') === 'true';
  });
  const [appPassword, setAppPassword] = useState<string>(() => {
    return localStorage.getItem('lqd_app_password') || DEFAULT_PASSWORD;
  });
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  const [files, setFiles] = useState<UploadedFiles>({
    diem: null,
    gv: null,
    nam: null,
    nenep: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermOption>('Giữa HKI');
  const [processedTerm, setProcessedTerm] = useState<TermOption | null>(null);
  
  const generateYearOptions = () => {
    const startYear = 2025;
    const endYear = 2030;
    const years = [];
    for (let i = startYear; i <= endYear; i++) {
        years.push(`${i}-${i + 1}`);
    }
    return years;
  };

  const yearOptions = useMemo(() => generateYearOptions(), []);
  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0]);
  const [processedYear, setProcessedYear] = useState<string | null>(null);

  const handleLoginSuccess = (remember: boolean) => {
    setIsAuthenticated(true);
    if (remember) {
      localStorage.setItem('lqd_auth', 'true');
    } else {
      sessionStorage.setItem('lqd_auth', 'true');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('lqd_auth');
    sessionStorage.removeItem('lqd_auth');
  };

  const handlePasswordChanged = (newPass: string) => {
    setAppPassword(newPass);
    localStorage.setItem('lqd_app_password', newPass);
  };

  const fileDisplayInfo: Record<FileKey, { title: string, status: string }> = {
    diem: { title: 'File Điểm & Xếp loại Môn', status: 'kqdiem.xlsx' },
    gv: { title: 'File Giáo viên Bộ môn', status: 'kqgv.xlsx' },
    nam: { title: 'File Điểm GD trước', status: 'kqnam.xlsx' },
    nenep: { title: 'File Tổng Hợp Chung', status: 'kqnenep.xlsx' },
  };
  
  const termOptions: TermOption[] = ['Giữa HKI', 'HKI', 'Giữa HKII', 'HKII'];

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setFiles({ diem: null, gv: null, nam: null, nenep: null });
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      const identifiedFiles = await identifyAndSortFiles(selectedFiles);
      setFiles(identifiedFiles);

      const missingFiles = Object.entries(identifiedFiles)
        .filter(([, file]) => file === null)
        .map(([key]) => fileDisplayInfo[key as FileKey].status)
        .join(', ');

      if (missingFiles) {
        setError(`Không thể xác định các tệp sau: ${missingFiles}. Vui lòng kiểm tra lại nội dung và tiêu đề cột.`);
      }

    } catch (err) {
       console.error(err);
       setError(`Lỗi khi xác định tệp: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const uploadedFileCount = useMemo(() => Object.values(files).filter(f => f !== null).length, [files]);

  const handleProcess = async () => {
    setError(null);
    const allFilesPresent = Object.values(files).every((file) => file !== null);

    if (!allFilesPresent) {
      setError('Vui lòng tải lên đủ cả 4 file Excel được yêu cầu.');
      return;
    }

    setIsLoading(true);

    try {
      const [diemJson, gvJson, namJson, nenepJson] = await Promise.all([
        window.excelService.readExcelFile<KqDiem>(files.diem!),
        window.excelService.readExcelFile<KqGv>(files.gv!),
        window.excelService.readExcelFile<KqNam>(files.nam!),
        window.excelService.readExcelFile<KqNeNep>(files.nenep!),
      ]);
      
      const parsedData: ParsedData = { diem: diemJson, gv: gvJson, nam: namJson, nenep: nenepJson };
      const structuredData = processAndStructureData(parsedData);
      setDashboardData(structuredData);
      setProcessedTerm(selectedTerm);
      setProcessedYear(selectedYear);
      
    } catch (err) {
      console.error(err);
      setError(`Đã xảy ra lỗi khi xử lý file. Vui lòng kiểm tra định dạng file và thử lại. Lỗi: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = async () => {
    if (!files.diem || !files.gv || !files.nam || !files.nenep || !processedTerm || !processedYear) {
        setError("Không thể tải xuống vì thiếu tệp đầu vào hoặc chưa xử lý dữ liệu.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const [diemJson, gvJson, namJson, nenepJson] = await Promise.all([
            window.excelService.readExcelFile<KqDiem>(files.diem),
            window.excelService.readExcelFile<KqGv>(files.gv),
            window.excelService.readExcelFile<KqNam>(files.nam),
            window.excelService.readExcelFile<KqNeNep>(files.nenep),
        ]);
        const parsedData: ParsedData = { diem: diemJson, gv: gvJson, nam: namJson, nenep: nenepJson };
        await generateConsolidatedExcel(parsedData, processedTerm, processedYear);
    } catch(err) {
        console.error(err);
        setError(`Lỗi khi tạo file Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFiles({ diem: null, gv: null, nam: null, nenep: null });
    setError(null);
    setDashboardData(null);
    setIsLoading(false);
    setProcessedTerm(null);
    setProcessedYear(null);
    setSelectedTerm('Giữa HKI');
    setSelectedYear(yearOptions[0]);
  };

  const isProcessButtonDisabled = Object.values(files).some((file) => file === null) || isLoading;

  if (!isAuthenticated) {
    return (
      <LoginScreen
        validPassword={appPassword}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (dashboardData && processedTerm && processedYear) {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200 max-w-7xl mx-auto gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Bảng Điều Khiển Thi Đua - {processedTerm} ({processedYear})</h1>
                    <p className="mt-1 text-md text-text-secondary">
                        Phân tích tổng quan kết quả thi đua toàn trường.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                     <button
                        onClick={handleDownload}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary/90 hover:bg-secondary disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                        >
                        {isLoading ? <LoaderIcon className="animate-spin h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
                        <span>Tải Báo Cáo</span>
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                        <RefreshIcon className="h-5 w-5" />
                        <span>Tải Tệp Mới</span>
                    </button>
                    <div className="h-6 w-px bg-gray-300 hidden sm:block mx-1" />
                    <button
                        onClick={() => setIsChangePasswordOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-text-secondary hover:text-text-primary text-sm font-medium border border-gray-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                        title="Đổi mật khẩu"
                    >
                        <KeyIcon className="h-4 w-4 text-primary" />
                        <span className="hidden md:inline">Đổi mật khẩu</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium border border-red-200 rounded-lg shadow-xs transition-colors cursor-pointer"
                        title="Đăng xuất"
                    >
                        <LogOutIcon className="h-4 w-4" />
                        <span className="hidden md:inline">Đăng xuất</span>
                    </button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto">
                {error && (
                    <div className="bg-error/10 border border-error/20 text-error/80 px-4 py-3 rounded-lg mb-6 text-center">
                    {error}
                    </div>
                )}
                <Dashboard data={dashboardData} />
            </main>

            <ChangePasswordModal
              isOpen={isChangePasswordOpen}
              onClose={() => setIsChangePasswordOpen(false)}
              currentStoredPassword={appPassword}
              onPasswordChanged={handlePasswordChanged}
            />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-indigo-50/30 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <button
          onClick={() => setIsChangePasswordOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-text-secondary hover:text-text-primary text-xs sm:text-sm font-medium border border-gray-200 rounded-xl shadow-xs transition-all hover:shadow-sm cursor-pointer"
          title="Đổi mật khẩu"
        >
          <KeyIcon className="h-4 w-4 text-primary" />
          <span>Đổi mật khẩu</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 text-xs sm:text-sm font-medium border border-gray-200 hover:border-red-200 rounded-xl shadow-xs transition-all hover:shadow-sm cursor-pointer"
          title="Đăng xuất"
        >
          <LogOutIcon className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>

      <div className="w-full max-w-4xl mx-auto pt-10 sm:pt-0">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            TỔNG HỢP THI ĐUA - LQĐ
          </h1>
          <p className="mt-2 text-lg text-text-secondary">
            Tải lên 4 file Excel để tạo dashboard và file tổng hợp thi đua.
          </p>
        </header>

        <main className="bg-surface rounded-xl shadow-xl shadow-indigo-500/10 border border-gray-200/80 p-6 sm:p-8">
          <div className="mb-8">
            <h3 className="font-semibold text-text-primary mb-3 text-center">1. Chọn kỳ tổng hợp & Năm học</h3>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <div>
                  <label htmlFor="term-select" className="sr-only">Chọn Kỳ Thi</label>
                  <select
                      id="term-select"
                      value={selectedTerm}
                      onChange={e => setSelectedTerm(e.target.value as TermOption)}
                      disabled={isLoading}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white focus:outline-none focus:ring-primary focus:border-primary rounded-md shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                      {termOptions.map(term => (
                          <option key={term} value={term}>{term}</option>
                      ))}
                  </select>
              </div>
               <div>
                  <label htmlFor="year-select" className="sr-only">Chọn Năm Học</label>
                  <select
                      id="year-select"
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      disabled={isLoading}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white focus:outline-none focus:ring-primary focus:border-primary rounded-md shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                      {yearOptions.map(year => (
                          <option key={year} value={year}>{`Năm học ${year}`}</option>
                      ))}
                  </select>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
             <h3 className="font-semibold text-text-primary mb-3 text-center">2. Tải lên các tệp của bạn</h3>
             <FileUploader
                onFileSelect={handleFileSelect}
                disabled={isLoading}
                uploadedFileCount={uploadedFileCount}
             />
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 my-8">
            {Object.entries(fileDisplayInfo).map(([key, {title}]) => (
              <div key={key} className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-300 p-3 rounded-lg">
                {files[key as FileKey] ? (
                  <CheckCircleIcon className="w-6 h-6 text-secondary flex-shrink-0" />
                ) : (
                  <FileIcon className="w-6 h-6 text-text-secondary flex-shrink-0" />
                )}
                <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium text-text-primary">{title}</p>
                    {files[key as FileKey] ? (
                         <p className="text-xs text-secondary truncate">{files[key as FileKey]!.name}</p>
                    ) : (
                        <p className="text-xs text-text-secondary">Chưa tải lên</p>
                    )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error/80 px-4 py-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              disabled={isProcessButtonDisabled}
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-primary/40 hover:shadow-primary-dark/50 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {isLoading && uploadedFileCount < 4 ? (
                <>
                  <LoaderIcon className="animate-spin h-5 w-5" />
                  <span>Đang xác định tệp...</span>
                </>
              ) : isLoading ? (
                <>
                  <LoaderIcon className="animate-spin h-5 w-5" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Xử lý Dữ liệu</span>
                </>
              )}
            </button>
          </div>
        </main>
        
        <footer className="text-center mt-8 text-sm text-text-secondary">
          <p>&copy; {new Date().getFullYear()} AI Data Assistant. All rights reserved.</p>
        </footer>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentStoredPassword={appPassword}
        onPasswordChanged={handlePasswordChanged}
      />
    </div>
  );
};

export default App;
