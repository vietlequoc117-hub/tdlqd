
import React, { useCallback, useRef } from 'react';
import { UploadIcon, CheckCircleIcon } from './Icons';

interface FileUploaderProps {
  onFileSelect: (files: FileList | null) => void;
  disabled: boolean;
  uploadedFileCount: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, disabled, uploadedFileCount }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `multi-file-upload`;

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(event.target.files);
    // Reset input value to allow re-uploading the same file names
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onFileSelect]);
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    onFileSelect(event.dataTransfer.files);
  }, [onFileSelect]);

  const REQUIRED_FILE_COUNT = 4;

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex justify-center items-center w-full h-40 px-4 transition-colors duration-300 bg-background border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary hover:bg-primary/5 focus:outline-none ${ disabled ? 'cursor-not-allowed opacity-50' : 'border-gray-300' }`}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
          multiple
        />
        {uploadedFileCount > 0 ? (
          <div className="flex flex-col items-center space-y-2 text-center">
             <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-8 h-8 text-secondary" />
                <span className="font-medium text-text-primary text-lg">
                    {uploadedFileCount === REQUIRED_FILE_COUNT ? `Đã nhận dạng đủ ${REQUIRED_FILE_COUNT} tệp!` : `Đã nhận dạng ${uploadedFileCount}/${REQUIRED_FILE_COUNT} tệp`}
                </span>
             </div>
             <span className="text-sm text-text-secondary">Bạn có thể chọn lại để thay thế.</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-center">
            <UploadIcon className="w-10 h-10 text-text-secondary" />
            <span className="font-medium text-text-primary">Kéo & thả hoặc <span className="text-primary">nhấn để chọn các tệp</span></span>
            <span className="text-xs text-text-secondary">Hỗ trợ tải lên nhiều file .xlsx, .xls cùng lúc</span>
          </div>
        )}
      </label>
    </div>
  );
};
