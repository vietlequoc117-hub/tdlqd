
// FIX: Add a global declaration for `window.excelService` to provide TypeScript with its type definition.
// This resolves errors in App.tsx where this property is accessed.
declare global {
  interface Window {
    excelService: {
      readExcelFile: <T>(file: File) => Promise<T[]>;
    };
  }
}

export type TermOption = 'Giữa HKI' | 'HKI' | 'Giữa HKII' | 'HKII';

export interface KqDiem {
  Lớp: string;
  [key: string]: any; 
}

export interface KqGv {
  Lớp: string;
  CN?: string;
  Văn?: string;
  Toán?: string;
  Lí?: string;
  Hoá?: string;
  Sinh?: string;
  Sử?: string;
  Địa?: string;
  Anh?: string;
}

export interface KqDoan {
  Lớp: string;
  XTĐ: number;
}

export interface KqNam {
  Lớp: string;
  [key: string]: any;
}

export interface KqNeNep {
  Lớp: string;
  XTGD?: number;
  XTNN?: number;
  XTĐ?: number;
  XTCSVC?: number;
  XTTĐS?: number;
  [key: string]: any;
}

export interface UploadedFiles {
  diem: File | null;
  gv: File | null;
  nam: File | null;
  nenep: File | null;
}

export type FileKey = keyof UploadedFiles;

export interface FileConfig {
  key: FileKey;
  title: string;
}

export interface ParsedData {
  diem: KqDiem[];
  gv: KqGv[];
  nam: KqNam[];
  nenep: KqNeNep[];
}

export interface MergedClassData {
  diemData: KqDiem;
  gvData?: KqGv;
  namData?: KqNam;
  nenepData?: KqNeNep;
}

// --- New Types for Dashboard ---

export interface ClassResult {
  className: string;
  homeroomTeacher?: string;
  totalScore: number;
  rankByGrade: number;
  subjects: { name: string; score: number | string | null; xt: number | string | null; teacher: string | null; }[];
  xtd: number | null;
  xtnn: number | null;
}

export interface TeacherRank {
  name: string;
  className: string;
  totalScore: number;
  rank: number;
}

export interface SubjectRankInfo {
  className: string;
  rank: number | string | null;
  teacher: string | null;
}

export interface GradeData {
  grade: number;
  averageScore: number;
  classes: ClassResult[];
  topHomeroomTeachers: TeacherRank[];
}

export interface DashboardData {
  schoolAverage: number;
  topClass: ClassResult | null;
  worstClass: ClassResult | null;
  grade10: GradeData;
  grade11: GradeData;
  grade12: GradeData;
  allClasses: ClassResult[];
  subjectRankings: Record<string, SubjectRankInfo[]>;
}
