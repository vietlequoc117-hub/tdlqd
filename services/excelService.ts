
import * as XLSX from 'xlsx';
import type { ParsedData, KqDiem, KqGv, KqDoan, MergedClassData, UploadedFiles, FileKey, DashboardData, ClassResult, GradeData, KqNam, TermOption, KqNeNep, KqGd, KqCsvc, KqTds, SubjectRankInfo } from '../types';

// This function needs to be exposed on the window for App.tsx to call it.
// In a real build system, we'd use modules properly.
const readExcelFile = <T,>(file: File): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error('File reading resulted in no data.');
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// Expose it to the window
(window as any).excelService = { readExcelFile };

const parseNumberWithComma = (value: any): number | null => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    // Replace comma with dot for decimal conversion
    const s = String(value).replace(',', '.');
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
};

// Helper function to find a value in an object with a case-insensitive key
const findValueCaseInsensitive = (obj: any, key: string): any => {
    if (!obj || typeof obj !== 'object' || key === null || key === undefined) {
        return undefined;
    }
    const keyToFind = String(key).toLowerCase().trim();
    const foundKey = Object.keys(obj).find(k => String(k).toLowerCase().trim() === keyToFind);
    return foundKey ? obj[foundKey] : undefined;
};


const getFileHeaders = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) throw new Error('Could not read file for header detection.');
        const workbook = XLSX.read(data, { type: 'binary', sheetRows: 1 });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })[0] || [];
        resolve(headers.map(h => String(h).trim().toLowerCase()));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

export const identifyAndSortFiles = async (fileList: FileList | File[]): Promise<UploadedFiles> => {
  const files = Array.from(fileList);
  const identifiedFiles: UploadedFiles = { diem: null, gv: null, nam: null, nenep: null };

  const remainingFiles = new Set(files);
  const unassignedSlots = new Set<FileKey>(['diem', 'gv', 'nam', 'nenep']);

  // Create a map of files to their headers to avoid reading multiple times
  const fileHeadersMap = new Map<File, string[]>();
  for (const file of files) {
      try {
          fileHeadersMap.set(file, await getFileHeaders(file));
      } catch (e) {
          console.error(`Could not read headers for ${file.name}`, e);
          // Skip file if headers can't be read
      }
  }

  // Pass 1: Identify strictly unique files (gv, nenep)
  // 'nam' is removed from here because 'tb cũ' might appear in 'diem' file too.
  const uniqueIdentifiers: { key: FileKey; identifier: string }[] = [
    { key: 'gv', identifier: 'cn' },
    { key: 'nenep', identifier: 'xtnn' }, 
  ];

  for (const { key, identifier } of uniqueIdentifiers) {
    if (!unassignedSlots.has(key)) continue;
    for (const file of remainingFiles) {
      const headers = fileHeadersMap.get(file);
      if (headers && headers.includes(identifier)) {
        identifiedFiles[key] = file;
        remainingFiles.delete(file);
        unassignedSlots.delete(key);
        break;
      }
    }
  }

  // Pass 2: Identify 'diem' first (it has subjects), then 'nam', then 'gd'
  if (remainingFiles.size > 0) {
      const candidates: { file: File; isDiemFile: boolean; isGdFile: boolean; isNamFile: boolean }[] = [];
      for (const file of remainingFiles) {
          const headers = fileHeadersMap.get(file);
          if (!headers) continue;
          
          // Enhanced Diem detection:
          // 1. Has 'tb mới'
          // 2. OR has subject ranking 'xt_1'
          // 3. OR has multiple subject columns (Toán, Văn, etc.)
          const hasTbMoi = headers.includes('tb mới');
          const hasSubjectXt = headers.some(h => /^xt_\d+$/.test(h));
          const subjectKeywords = ['toán', 'văn', 'anh', 'lí', 'hoá', 'sinh', 'sử', 'địa'];
          const hasSubjects = headers.filter(h => subjectKeywords.includes(h)).length >= 3;
          
          const isDiemFile = hasTbMoi || hasSubjectXt || hasSubjects;

          // Enhanced Nam detection:
          // 1. Has 'tb cũ'
          // 2. We only assign it if it's NOT identified as diem (diem takes precedence if it has subjects)
          const hasTbCu = headers.includes('tb cũ');
          const isNamFile = hasTbCu;

          candidates.push({ file, isDiemFile, isNamFile });
      }
  
      // Priority 1: Assign Diem file
      const diemCandidate = candidates.find(c => c.isDiemFile);
      if (diemCandidate && unassignedSlots.has('diem')) {
          identifiedFiles.diem = diemCandidate.file;
          remainingFiles.delete(diemCandidate.file);
          unassignedSlots.delete('diem');
      }

      // Priority 2: Assign Nam file (from remaining)
      // Only assign if we still need a 'nam' file AND the candidate is not the one we just used for 'diem'
      const namCandidate = candidates.find(c => c.isNamFile && remainingFiles.has(c.file));
      if (namCandidate && unassignedSlots.has('nam')) {
          identifiedFiles.nam = namCandidate.file;
          remainingFiles.delete(namCandidate.file);
          unassignedSlots.delete('nam');
      }
  }
  
  return identifiedFiles;
};

const calculateRanks = (items: { className: string; totalScore: number }[]): Map<string, number> => {
    const ranks = new Map<string, number>();
    if (items.length === 0) return ranks;

    const sortedItems = [...items].sort((a, b) => a.totalScore - b.totalScore);
    
    let rank = 1;
    for (let i = 0; i < sortedItems.length; i++) {
      if (i > 0 && sortedItems[i].totalScore > sortedItems[i-1].totalScore) {
        rank = i + 1;
      }
      ranks.set(sortedItems[i].className, rank);
    }
    return ranks;
};

const getScoreFromRow = (row: any): number | null => {
    return parseNumberWithComma(findValueCaseInsensitive(row, 'TBM')) ?? 
           parseNumberWithComma(findValueCaseInsensitive(row, 'TB mới')) ??
           parseNumberWithComma(findValueCaseInsensitive(row, 'ĐTB'));
};

const isSummaryRow = (className: string): boolean => {
    const lower = className.toLowerCase();
    return lower.startsWith('t.') || lower.startsWith('khối') || lower.includes('tb khối') || lower.includes('tổng');
};

export const processAndStructureData = (data: ParsedData): DashboardData => {
  const { diem, gv, nenep, nam } = data;

  if (!diem || diem.length === 0) {
    throw new Error("Không có dữ liệu điểm (kqdiem) để xử lý.");
  }
  
  const mergedData: { [key: string]: MergedClassData } = {};
  diem.forEach(row => {
    if (row.Lớp) mergedData[String(row.Lớp)] = { diemData: row };
  });

  const merge = <T extends { Lớp: string }>(dataset: T[] | null | undefined, key: keyof MergedClassData) => {
      if(dataset) dataset.forEach(row => {
          const c = String(row.Lớp);
          if(mergedData[c]) (mergedData[c] as any)[key] = row;
      });
  };

  merge(gv, 'gvData');
  merge(nenep, 'nenepData');
  merge(nam, 'namData');
  
  const subjects = ['Toán', 'Văn', 'Anh', 'Lí', 'Hoá', 'Sinh', 'Sử', 'Địa'];
  const xtColKeys = ['XT', 'XT_1', 'XT_2', 'XT_3', 'XT_4', 'XT_5', 'XT_6', 'XT_7'];
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // 1. Initial Class Objects
  const initialClassData = Object.values(mergedData).map(({ diemData, gvData, doanData, nenepData, gdData, namData }): ClassResult | null => {
    const className = String(diemData.Lớp);
    if (isSummaryRow(className)) return null;

    const subjectDetails = subjects.map((subjectName, index) => {
        const xtKey = xtColKeys[index];
        // We initialize with what's in the file, but will override with calculated ranks later
        const xtValueStr = findValueCaseInsensitive(diemData, xtKey);
        return {
            name: subjectName,
            score: findValueCaseInsensitive(diemData, subjectName) ?? null,
            xt: xtValueStr ?? null,
            teacher: (findValueCaseInsensitive(gvData, subjectName) as string) ?? null
        };
    });

    const xtdValue = findValueCaseInsensitive(nenepData, 'XTĐ');
    const xtd = xtdValue ? parseInt(String(xtdValue), 10) : null;
    const xtnnValue = findValueCaseInsensitive(nenepData, 'XTNN');
    const xtnn = xtnnValue ? parseInt(String(xtnnValue), 10) : null;

    return {
        className,
        homeroomTeacher: findValueCaseInsensitive(gvData, 'CN'),
        totalScore: 0, // Will be replaced by TBLop
        rankByGrade: 0, // Will be replaced by XTLop
        subjects: subjectDetails,
        xtd,
        xtnn
    };
  }).filter((item): item is ClassResult => item !== null);

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  
  const allClasses: ClassResult[] = [];
  const gradeDataMap: Record<number, GradeData> = {};

  // 2. Process by Grade
  [10, 11, 12].forEach(grade => {
      const gradeClasses = initialClassData.filter(c => c.className.startsWith(String(grade)));
      
      if (gradeClasses.length === 0) {
          gradeDataMap[grade] = { grade, averageScore: 0, classes: [], topHomeroomTeachers: [] };
          return;
      }

      // 2a. Calculate Deviation (DoLech)
      const classCalculations = gradeClasses.map(c => {
          const { diemData, namData } = mergedData[c.className];
          
          let tbCu = parseNumberWithComma(findValueCaseInsensitive(diemData, 'TB cũ'));
          if (tbCu === null && namData) tbCu = parseNumberWithComma(findValueCaseInsensitive(namData, 'TB cũ'));
          
          let tbMoi = getScoreFromRow(diemData);
          if (tbMoi === null) {
              const subScores = subjects.map(sub => parseNumberWithComma(findValueCaseInsensitive(diemData, sub))).filter((x): x is number => x !== null);
              if (subScores.length > 0) tbMoi = Number(avg(subScores).toFixed(2));
          }
          
          const doLech = (tbMoi !== null && tbCu !== null) ? Number((tbMoi - tbCu).toFixed(2)) : -9999;
          return { className: c.className, doLech };
      });

      // Sort by DoLech Descending
      classCalculations.sort((a, b) => b.doLech - a.doLech);
      
      const xtHocTapMap = new Map<string, number>();
      let rank = 1;
      for (let i = 0; i < classCalculations.length; i++) {
        if (i > 0 && classCalculations[i].doLech < classCalculations[i-1].doLech) {
            rank++;
        }
        xtHocTapMap.set(classCalculations[i].className, rank);
      }

      // 2b. Calculate KQHT HKII and its ranks (xtKqht)
      const gradeKqhtHk2Data = gradeClasses.map(c => {
          const { nenepData } = mergedData[c.className];
          const xt = xtHocTapMap.get(c.className) || 0;
          const xtGdVal = findValueCaseInsensitive(nenepData, 'XTGD') ?? findValueCaseInsensitive(nenepData, 'XT GĐ trước') ?? findValueCaseInsensitive(nenepData, 'XT GĐ Trước') ?? findValueCaseInsensitive(nenepData, 'XT GD Trước');
          const xtGd = xtGdVal ? parseInt(String(xtGdVal), 10) : null;
          
          let tongKqht = null;
          if (xt !== null && xtGd !== null && !isNaN(xtGd)) {
              tongKqht = (xt + xtGd) / 2;
          }
          return { className: c.className, tongKqht };
      });

      const validKqhtData = gradeKqhtHk2Data.filter(d => d.tongKqht !== null).sort((a, b) => a.tongKqht! - b.tongKqht!);
      const kqhtHk2Ranks = new Map<string, number>();
      let kqRank = 1;
      for (let i = 0; i < validKqhtData.length; i++) {
          if (i > 0 && validKqhtData[i].tongKqht! > validKqhtData[i - 1].tongKqht!) {
              kqRank = i + 1;
          }
          kqhtHk2Ranks.set(validKqhtData[i].className, kqRank);
      }

      // 2c. Calculate TBLop using the new formula
      const withScores = gradeClasses.map(c => {
          const { nenepData, diemData } = mergedData[c.className];
          
          const xtKqht = kqhtHk2Ranks.get(c.className) || 0;
          
          const xtnnVal = findValueCaseInsensitive(nenepData, 'XTNN');
          const xtnn = xtnnVal ? parseInt(String(xtnnVal), 10) : 0;
          
          const xtdVal = findValueCaseInsensitive(nenepData, 'XTĐ');
          const xtd = xtdVal ? parseInt(String(xtdVal), 10) : 0;
          
          const xtCsvcValue = findValueCaseInsensitive(nenepData, 'XTCSVC') ?? findValueCaseInsensitive(nenepData, 'CSVC');
          const xtCsvc = xtCsvcValue ? parseInt(String(xtCsvcValue), 10) : 0;
          
          const tdsValue = findValueCaseInsensitive(nenepData, 'XTTĐS') ?? findValueCaseInsensitive(nenepData, 'TĐS') ?? findValueCaseInsensitive(diemData, 'TĐS');
          const xtTds = tdsValue ? parseInt(String(tdsValue), 10) : 0;

          const tbLop = (xtKqht * 2 + xtnn * 2 + xtd + xtCsvc + xtTds) / 7;
          return { ...c, totalScore: Number(tbLop.toFixed(2)) };
      });

      // 2d. Calculate XTLop
      withScores.sort((a, b) => a.totalScore - b.totalScore); // Ascending
      let rankLop = 1;
      const finalized = withScores.map((c, i) => {
          if (i > 0 && c.totalScore > withScores[i-1].totalScore) {
              rankLop = i + 1;
          }
          return { ...c, rankByGrade: rankLop };
      });

      // --- 2d. Calculate Subject Ranks based on Deviation ---
      subjects.forEach(subjectName => {
        const subjectStats = finalized.map(c => {
            const { diemData, namData } = mergedData[c.className];
            const score = parseNumberWithComma(findValueCaseInsensitive(diemData, subjectName));
            let tbCu = null;
            if (namData) {
                tbCu = parseNumberWithComma(findValueCaseInsensitive(namData, subjectName));
            }
            const hasData = score !== null && tbCu !== null;
            const deviation = hasData ? Number((score! - tbCu!).toFixed(2)) : -99999;
            return { className: c.className, deviation, hasData };
        });

        subjectStats.sort((a, b) => b.deviation - a.deviation);

        let currentRank = 1;
        const rankMap = new Map<string, number>();
        for(let i = 0; i < subjectStats.length; i++) {
             if (!subjectStats[i].hasData) continue;
             
             if (i > 0 && subjectStats[i].deviation < subjectStats[i-1].deviation) {
                 currentRank = i + 1;
             }
             rankMap.set(subjectStats[i].className, currentRank);
        }

        finalized.forEach(c => {
             const subIndex = c.subjects.findIndex(s => s.name === subjectName);
             if (subIndex !== -1) {
                 const rank = rankMap.get(c.className);
                 c.subjects[subIndex].xt = rank !== undefined ? rank : null;
             }
        });
      });

      const averageScore = avg(finalized.map(c => c.totalScore));
      
      const topHomeroomTeachers = finalized
          .map(c => ({ name: c.homeroomTeacher || 'N/A', className: c.className, totalScore: c.totalScore, rank: c.rankByGrade }))
          .sort((a,b) => a.rank - b.rank);

      gradeDataMap[grade] = {
          grade,
          averageScore,
          classes: finalized,
          topHomeroomTeachers
      };
      allClasses.push(...finalized);
  });

  allClasses.sort((a, b) => collator.compare(a.className, b.className));
  
  const schoolAverage = avg(allClasses.map(c => c.totalScore));

  let topClass = null, worstClass = null;
  if(allClasses.length > 0) {
    const sortedByScore = [...allClasses].sort((a,b) => a.totalScore - b.totalScore);
    topClass = sortedByScore[0];
    worstClass = sortedByScore[sortedByScore.length - 1];
  }
  
  const subjectRankings: Record<string, SubjectRankInfo[]> = {};
  subjects.forEach(subjectName => {
      subjectRankings[subjectName] = [];
      allClasses.forEach(c => {
          const subjectData = c.subjects.find(s => s.name === subjectName);
          if (subjectData && subjectData.teacher && subjectData.xt !== null && subjectData.xt !== undefined) {
              subjectRankings[subjectName].push({
                  className: c.className,
                  rank: subjectData.xt,
                  teacher: subjectData.teacher
              });
          }
      });
      subjectRankings[subjectName].sort((a, b) => {
        const rankA = Number(a.rank);
        const rankB = Number(b.rank);
        if (!isNaN(rankA) && !isNaN(rankB)) {
            return rankA - rankB;
        }
        return String(a.rank).localeCompare(String(b.rank));
      });
  });

  return {
    schoolAverage,
    topClass,
    worstClass,
    grade10: gradeDataMap[10],
    grade11: gradeDataMap[11],
    grade12: gradeDataMap[12],
    allClasses,
    subjectRankings,
  };
};


export const generateConsolidatedExcel = async (data: ParsedData, term: TermOption, year: string): Promise<void> => {
  const { diem, gv, nam, nenep } = data;

  if (!diem || diem.length === 0) {
    throw new Error("Không có dữ liệu điểm (kqdiem) để xử lý. Vui lòng kiểm tra lại file.");
  }
  
  const getTermConfig = (term: TermOption, year: string) => {
    const termMap: Record<TermOption, { sheetName: string; titlePart: string; fileNamePart: string }> = {
        'Giữa HKI': { sheetName: 'GKI', titlePart: 'TỔNG HỢP THI ĐUA GIỮA KỲ I', fileNamePart: 'gki' },
        'HKI': { sheetName: 'CKI', titlePart: 'TỔNG HỢP THI ĐUA CUỐI KỲ I', fileNamePart: 'cki' },
        'Giữa HKII': { sheetName: 'GKII', titlePart: 'TỔNG HỢP THI ĐUA GIỮA KỲ II', fileNamePart: 'gkii' },
        'HKII': { sheetName: 'CKII', titlePart: 'TỔNG HỢP THI ĐUA CUỐI KỲ II', fileNamePart: 'ckii' },
    };
    const termSpecifics = termMap[term];
    return {
        sheetName: termSpecifics.sheetName,
        title: `${termSpecifics.titlePart} - NĂM HỌC ${year}`,
        fileNamePart: termSpecifics.fileNamePart
    };
  };

  const config = getTermConfig(term, year);

  const mergedData: { [key: string]: MergedClassData } = {};

  diem.forEach((row: KqDiem) => {
    if (row.Lớp) {
      mergedData[String(row.Lớp)] = { diemData: row };
    }
  });

  const mergeByLop = <T extends { Lớp: string }>(
    dataSet: T[], 
    dataKey: keyof Omit<MergedClassData, 'diemData'>
    ) => {
    if (!dataSet) return;
    dataSet.forEach((row) => {
      const className = String(row.Lớp);
      if (className && mergedData[className]) {
        (mergedData[className] as any)[dataKey] = row;
      }
    });
  };

  mergeByLop<KqGv>(gv, 'gvData');
  mergeByLop<KqNam>(nam, 'namData');
  mergeByLop<KqNeNep>(nenep, 'nenepData');

  // WORKBOOK 1: MAIN REPORT (Detailed)
  const wbMain = XLSX.utils.book_new();

  // WORKBOOK 2: SUMMARY REPORT (TK_CKI Only)
  const wbSummary = XLSX.utils.book_new();

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const sortedClasses = Object.keys(mergedData)
      .filter(className => !isSummaryRow(className)) // Filter out summary rows
      .sort(collator.compare);
  
  // --- PREPARE DATA ---
  const orderedSubjects = ['Văn', 'Toán', 'Anh', 'Lí', 'Hoá', 'Sinh', 'Sử', 'Địa'];
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  // --- 1. SETUP COMPLEX SHEET (Original CKI) ---
  const titleRow = [config.title];
  const header1: (string | null)[] = ['', 'TBM', null, null, ''];
  const header2: (string | null)[] = ['CN', 'TB cũ', 'TB mới', 'Độ lệch', 'XT'];
  const merges: XLSX.Range[] = [];
  merges.push({ s: { r: 1, c: 1 }, e: { r: 1, c: 3 } }); // TBM header merge
  let currentColumn = 5;

  orderedSubjects.forEach(s => {
      const colCount = 5;
      header1.push(s, ...Array(colCount - 1).fill(''));
      header2.push('GV', 'TB cũ', 'ĐTB thi', 'Độ lệch', 'XT'); 
      merges.push({ s: { r: 1, c: currentColumn }, e: { r: 1, c: currentColumn + colCount - 1 } });
      currentColumn += colCount;
  });

  header1.push('GĐ trước', 'NN Đoàn', 'TĐ Đoàn', 'XTTĐS');
  header2.push('XT GĐ trước', 'XTNN', 'XTĐ', 'XTTĐS');
  
  merges.unshift({ s: { r: 0, c: 0 }, e: { r: 0, c: header2.length - 1 }}); // Title

  const aoa: (string | number | null)[][] = [
      titleRow,
      header1,
      header2
  ];

  // --- 2. SETUP SIMPLE SHEET (New TK_CKI) for wbSummary ---
  const simpleSheetName = `TK_${config.sheetName}`;
  const simpleAoa: (string | number | null)[][] = [];
  const simpleHeaders = ['Lớp', 'TB mới', 'Văn', 'Toán', 'Anh', 'Lí', 'Hoá', 'Sinh', 'Sử', 'Địa'];
  simpleAoa.push(simpleHeaders);

  // --- 3. SETUP XEPLOP SHEET ---
  const xeplopHeader1: (string | null)[] = ['', 'TBM', null, null, null, 'XT GĐ trước', 'KQHT HKII', null, 'NN Đoàn', 'TĐ Đoàn', 'CSVC', 'XTTĐS', 'T.B', 'Xếp Lớp'];
  const xeplopHeader2: (string | null)[] = ['CN', 'TB cũ', 'TB mới', 'Độ lệch', 'XT', 'XT', 'Tổng', 'XT', 'XTNN', 'XTĐ', 'XTCSVC', 'XTTĐS', 'TBLop', 'XTLop'];
  const xeplopMerges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, // Title merged across all cols
      { s: { r: 1, c: 1 }, e: { r: 1, c: 4 } },   // TBM spans 4 columns: TB cũ, TB mới, Độ lệch, XT
      { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } }    // KQHT HKII spans 2 columns: Tổng, XT
  ];
  
  const xeplopAoa: (string | number | null)[][] = [
      [config.title],
      xeplopHeader1,
      xeplopHeader2
  ];

  const allClassTbLopInfo: Record<string, { tbLop: number, xtLop: number }> = {};
  const gvThiDuaList: { teacher: string; className: string; subject: string; tbCu: number | null; dtbThi: number | null; deviation: number | null }[] = [];
  const grades = [10, 11, 12];
  
  // --- MAIN LOOP BY GRADE ---
  for (const grade of grades) {
    const gradeClasses = sortedClasses.filter(className => className.startsWith(String(grade)));
    if (gradeClasses.length === 0) continue;

    // --- FIND SUMMARY ROW (T.Khoi) ---
    let summaryRowData = diem.find(row => {
         const lopRaw = String(row['Lớp'] || row['lop'] || '').trim().toLowerCase();
         const normalizedLop = lopRaw.replace(/[^a-z0-9à-ỹ]/g, ''); 
         const gradeStr = String(grade);
         return (normalizedLop.includes('khối') || normalizedLop.includes('tk')) && normalizedLop.includes(gradeStr);
    });

    if (!summaryRowData) {
        let lastClassIndex = -1;
        for (let i = 0; i < diem.length; i++) {
            const row = diem[i];
            const lop = String(row['Lớp'] || row['lop'] || '').trim();
            if (lop.startsWith(String(grade))) {
                lastClassIndex = i;
            }
        }
        if (lastClassIndex !== -1 && lastClassIndex + 1 < diem.length) {
             const potentialRow = diem[lastClassIndex + 1];
             const lopRaw = String(potentialRow['Lớp'] || potentialRow['lop'] || '').trim().toLowerCase();
             if (lopRaw.includes('khối') || lopRaw.includes('tk') || lopRaw.includes('tb') || lopRaw.includes('tổng')) {
                 summaryRowData = potentialRow;
             }
        }
    }
    
    // Get TBM Average
    let gradeAvgTbm: number | null = null;
    if (summaryRowData) {
         gradeAvgTbm = getScoreFromRow(summaryRowData);
    }
    if (gradeAvgTbm === null) {
         const tbmScores = gradeClasses
            .map(c => {
                const row = mergedData[c]?.diemData;
                let s = getScoreFromRow(row);
                if (s === null && row) {
                    const subScores = orderedSubjects.map(sub => parseNumberWithComma(findValueCaseInsensitive(row, sub))).filter((x): x is number => x !== null);
                    if (subScores.length > 0) s = avg(subScores);
                }
                return s;
            })
            .filter((s): s is number => s !== null);
         gradeAvgTbm = avg(tbmScores) ?? 0;
    }

    // Get Subject Averages
    const gradeAvgScores: Record<string, number> = {};
    orderedSubjects.forEach(subject => {
        let score: number | null = null;
        if (summaryRowData) {
            score = parseNumberWithComma(findValueCaseInsensitive(summaryRowData, subject));
        }
        if (score === null) {
            const scores = gradeClasses
                .map(className => parseNumberWithComma(findValueCaseInsensitive(mergedData[className]?.diemData, subject)))
                .filter((s): s is number => s !== null);
            score = avg(scores) ?? 0;
        }
        gradeAvgScores[subject] = score;
    });

    // --- CALCULATE DEVIATIONS AND RANKS ---
    const gradeCalculations = gradeClasses.map(className => {
        const { diemData, namData } = mergedData[className];
        
        let tbCu = parseNumberWithComma(findValueCaseInsensitive(diemData, 'TB cũ'));
        if (tbCu === null && namData) {
            tbCu = parseNumberWithComma(findValueCaseInsensitive(namData, 'TB cũ'));
        }

        let tbMoi = diemData ? getScoreFromRow(diemData) : null;
        if (tbMoi === null && diemData) {
             const subScores = orderedSubjects.map(sub => parseNumberWithComma(findValueCaseInsensitive(diemData, sub))).filter((x): x is number => x !== null);
             if (subScores.length > 0) {
                 tbMoi = Number(avg(subScores).toFixed(2));
             }
        }
        
        let doLech: number | null = null;
        if (tbMoi !== null && tbCu !== null) {
            doLech = Number((tbMoi - tbCu).toFixed(2));
        }

        return { className, tbCu, tbMoi, doLech };
    });

    const rankedGradeData = [...gradeCalculations]
        .filter(d => d.doLech !== null)
        .sort((a, b) => (b.doLech!) - (a.doLech!));

    const gradeRanks = new Map<string, number>();
    let rank = 1;
    for (let i = 0; i < rankedGradeData.length; i++) {
        const current = rankedGradeData[i];
        if (i > 0 && current.doLech! < rankedGradeData[i - 1].doLech!) {
            rank++;
        }
        gradeRanks.set(current.className, rank);
    }

    // Subject Deviations and Ranks
    const deviationsAndRanksBySubject: Record<string, Map<string, { deviation: number, rank: number }>> = {};

    orderedSubjects.forEach(subject => {
        const classDeviations: { className: string, deviation: number }[] = [];
        gradeClasses.forEach(className => {
            const { diemData, namData } = mergedData[className];
            const dtbThi = parseNumberWithComma(findValueCaseInsensitive(diemData, subject));
            let tbCu = null;
            if (namData) {
                 tbCu = parseNumberWithComma(findValueCaseInsensitive(namData, subject));
            }
            if (dtbThi !== null && tbCu !== null) {
                const deviation = Number((dtbThi - tbCu).toFixed(2));
                classDeviations.push({ className, deviation });
            }
        });

        classDeviations.sort((a, b) => b.deviation - a.deviation);
        const ranks = new Map<string, { deviation: number, rank: number }>();
        let rank = 1;
        for (let i = 0; i < classDeviations.length; i++) {
            if (i > 0 && classDeviations[i].deviation < classDeviations[i - 1].deviation) {
                rank = i + 1;
            }
            ranks.set(classDeviations[i].className, { deviation: classDeviations[i].deviation, rank });
        }
        deviationsAndRanksBySubject[subject] = ranks;
    });

    // --- Calculate KQHT HKII ---
    const gradeKqhtHk2Data = gradeClasses.map(className => {
        const xt = gradeRanks.get(className) ?? null;
        const { nenepData } = mergedData[className];
        const xtGdVal = findValueCaseInsensitive(nenepData, 'XTGD') ?? 
            findValueCaseInsensitive(nenepData, 'XT GĐ trước') ?? 
            findValueCaseInsensitive(nenepData, 'XT GĐ Trước') ?? 
            findValueCaseInsensitive(nenepData, 'XT GD Trước');
        const xtGdTruoc = xtGdVal ? parseInt(String(xtGdVal), 10) : null;
        
        let tongKqht = null;
        if (xt !== null && xtGdTruoc !== null && !isNaN(xtGdTruoc)) {
            tongKqht = (xt + xtGdTruoc) / 2;
        }
        return { className, tongKqht };
    });

    const validKqhtData = gradeKqhtHk2Data.filter(d => d.tongKqht !== null).sort((a, b) => a.tongKqht! - b.tongKqht!);
    const kqhtHk2Ranks = new Map<string, number>();
    let kqRank = 1;
    for (let i = 0; i < validKqhtData.length; i++) {
        if (i > 0 && validKqhtData[i].tongKqht! > validKqhtData[i - 1].tongKqht!) {
            kqRank = i + 1;
        }
        kqhtHk2Ranks.set(validKqhtData[i].className, kqRank);
    }

    // --- Calculate TBLop and XTLop ---
    const gradeTbLopData = gradeClasses.map(className => {
        const { nenepData, diemData } = mergedData[className];
        
        const xtKqht = kqhtHk2Ranks.get(className) || 0;
        
        const xtnnVal = findValueCaseInsensitive(nenepData, 'XTNN');
        const xtnn = xtnnVal ? parseInt(String(xtnnVal), 10) : 0;
        
        const xtdVal = findValueCaseInsensitive(nenepData, 'XTĐ');
        const xtd = xtdVal ? parseInt(String(xtdVal), 10) : 0;

        const xtCsvcValue = findValueCaseInsensitive(nenepData, 'XTCSVC') ?? findValueCaseInsensitive(nenepData, 'CSVC');
        const xtCsvc = xtCsvcValue ? parseInt(String(xtCsvcValue), 10) : 0;
        
        const tdsValue = findValueCaseInsensitive(nenepData, 'XTTĐS') ?? findValueCaseInsensitive(nenepData, 'TĐS') ?? findValueCaseInsensitive(diemData, 'TĐS');
        const xtTds = tdsValue ? parseInt(String(tdsValue), 10) : 0;

        const tbLop = (xtKqht * 2 + xtnn * 2 + xtd + xtCsvc + xtTds) / 7;
        return { className, tbLop };
    });

    gradeTbLopData.sort((a, b) => a.tbLop - b.tbLop);
    const xtLopMap = new Map<string, number>();
    let rankLop = 1;
    for(let i=0; i<gradeTbLopData.length; i++) {
        if (i > 0 && gradeTbLopData[i].tbLop > gradeTbLopData[i-1].tbLop) {
            rankLop = i + 1;
        }
        xtLopMap.set(gradeTbLopData[i].className, rankLop);
    }
    
    gradeTbLopData.forEach(item => {
        allClassTbLopInfo[item.className] = {
            tbLop: item.tbLop,
            xtLop: xtLopMap.get(item.className) || 0
        };
    });

    // --- GENERATE ROWS ---

    for (const className of gradeClasses) {
        const { diemData, gvData, nenepData, namData } = mergedData[className];
        if (!diemData) continue;

        // -- 1. ROW FOR COMPLEX SHEET --
        const cnName = findValueCaseInsensitive(gvData, 'CN');
        const cn = cnName ? `${className} - ${cnName}` : className;
        const row: (string | number | null)[] = [cn];

        const classCalc = gradeCalculations.find(c => c.className === className);
        let tbCu = null, tbMoi = null, lech = null, xt = null;

        if (classCalc) {
            tbCu = classCalc.tbCu;
            tbMoi = classCalc.tbMoi;
            lech = classCalc.doLech; 
            xt = gradeRanks.get(className) ?? null;
    
            row.push(
                tbCu !== null ? Number(tbCu.toFixed(2)) : null,
                tbMoi !== null ? Number(tbMoi.toFixed(2)) : null,
                lech !== null ? Number(lech.toFixed(2)) : null,
                xt
            );
        } else {
             row.push(null, null, null, null);
        }

        orderedSubjects.forEach(subject => {
            const gv = findValueCaseInsensitive(gvData, subject) as string || null;
            const dtbThi = parseNumberWithComma(findValueCaseInsensitive(diemData, subject));
            const result = deviationsAndRanksBySubject[subject]?.get(className);
            const doLech = result ? result.deviation : null;
            const rank = result ? result.rank : null;
            
            let subjectTbCu = null;
            if (namData) {
                subjectTbCu = parseNumberWithComma(findValueCaseInsensitive(namData, subject));
            }

            row.push(
                gv, 
                subjectTbCu !== null ? Number(subjectTbCu.toFixed(2)) : null, 
                dtbThi, 
                doLech !== null ? Number(doLech.toFixed(2)) : null,
                rank
            );
        });

        const xtGdTruoc = findValueCaseInsensitive(nenepData, 'XTGD') ?? 
            findValueCaseInsensitive(nenepData, 'XT GĐ trước') ?? 
            findValueCaseInsensitive(nenepData, 'XT GĐ Trước') ?? 
            findValueCaseInsensitive(nenepData, 'XT GD Trước');
        row.push(xtGdTruoc ?? null);
        const nnDoanValue = findValueCaseInsensitive(nenepData, 'XTNN');
        row.push(nnDoanValue ?? null);
        const xtdValue = findValueCaseInsensitive(nenepData, 'XTĐ');
        row.push(xtdValue ?? null);
        const tdsValue = nenepData ? (findValueCaseInsensitive(nenepData, 'XTTĐS') ?? findValueCaseInsensitive(nenepData, 'TĐS')) : (findValueCaseInsensitive(diemData, 'TĐS') ?? null);
        row.push(tdsValue);
        
        aoa.push(row);

        // -- 2. ROW FOR SIMPLE SHEET (TK_CKI) --
        const simpleRow: (string | number | null)[] = [className, tbMoi !== null ? Number(tbMoi.toFixed(2)) : null];
        orderedSubjects.forEach(sub => {
            const score = parseNumberWithComma(findValueCaseInsensitive(diemData, sub));
            simpleRow.push(score);
        });
        simpleAoa.push(simpleRow);

        // -- 3. ROW FOR XEPLOP SHEET --
        const tbLopInfo = gradeTbLopData.find(d => d.className === className);
        const tbLop = tbLopInfo ? Number(tbLopInfo.tbLop.toFixed(2)) : null;
        const xtLop = xtLopMap.get(className) ?? null;

        const kqhtDataObj = gradeKqhtHk2Data.find(d => d.className === className);
        const tongKqht = kqhtDataObj?.tongKqht ?? null;
        const xtKqht = kqhtHk2Ranks.get(className) ?? null;

        const xtCsvcValue = nenepData ? (findValueCaseInsensitive(nenepData, 'XTCSVC') ?? findValueCaseInsensitive(nenepData, 'CSVC') ?? findValueCaseInsensitive(nenepData, 'XTCSVC')) : null;

        const xeplopRow: (string | number | null)[] = [
            cn,
            tbCu !== null ? Number(tbCu.toFixed(2)) : null,
            tbMoi !== null ? Number(tbMoi.toFixed(2)) : null,
            lech !== null ? Number(lech.toFixed(2)) : null,
            xt, 
            xtGdTruoc ?? null,
            tongKqht !== null ? Number(tongKqht.toFixed(2)) : null,
            xtKqht,
            nnDoanValue ?? null,
            xtdValue ?? null,
            xtCsvcValue ?? null,
            tdsValue ?? null,
            tbLop, 
            xtLop
        ];
        xeplopAoa.push(xeplopRow);
        
        // -- 4. DATA FOR THIDUAGV --
        if (gvData) {
            orderedSubjects.forEach((subjectName) => {
                const teacherName = findValueCaseInsensitive(gvData, subjectName) as string;
                if (teacherName) {
                   const dtbThi = parseNumberWithComma(findValueCaseInsensitive(diemData, subjectName));
                   let tbCuSub = null;
                   if (namData) tbCuSub = parseNumberWithComma(findValueCaseInsensitive(namData, subjectName));
                   let deviation = null;
                   if (dtbThi !== null && tbCuSub !== null) {
                       deviation = Number((dtbThi - tbCuSub).toFixed(2));
                   }
                   gvThiDuaList.push({
                     teacher: teacherName.trim(),
                     className: className,
                     subject: subjectName,
                     tbCu: tbCuSub,
                     dtbThi: dtbThi,
                     deviation: deviation
                 });
                }
            });
        }
    }
    
    // --- Grade Total Rows ---
    const gradeTotalRow: (string | number | null)[] = [`T.Khối ${grade}`];
    gradeTotalRow.push(null, gradeAvgTbm !== null ? Number(gradeAvgTbm.toFixed(2)) : null, null, '');
    orderedSubjects.forEach(subject => {
        const avgDtbThi = gradeAvgScores[subject];
        gradeTotalRow.push('', '', avgDtbThi !== undefined ? Number(avgDtbThi.toFixed(2)) : null, '', '');
    });
    gradeTotalRow.push('', '', '', ''); // Fill rest
    aoa.push(gradeTotalRow);
    
    // Summary Row for XEPLOP
    const xeplopGradeTotalRow = [`T.Khối ${grade}`, null, gradeAvgTbm !== null ? Number(gradeAvgTbm.toFixed(2)) : null, null, '', '', '', '', '', '', '', '', '', ''];
    xeplopAoa.push(xeplopGradeTotalRow);

    const remainingGrades = grades.slice(grades.indexOf(grade) + 1);
    const hasMoreGradesWithData = remainingGrades.some(g => sortedClasses.some(c => c.startsWith(String(g))));

    if (hasMoreGradesWithData) {
        aoa.push([]); 
        simpleAoa.push([]); // Space for simple sheet too
        xeplopAoa.push([]); 
    }
  }

  // --- BUILD WORKBOOKS ---
  
  // 1. MAIN REPORT (Complex Sheet + Others)
  const tongHopSheet = XLSX.utils.aoa_to_sheet(aoa, { cellStyles: true });
  tongHopSheet['!merges'] = merges;
  XLSX.utils.book_append_sheet(wbMain, tongHopSheet, config.sheetName);

  // 2. SUMMARY REPORT (Simple Sheet Only)
  const simpleSheet = XLSX.utils.aoa_to_sheet(simpleAoa);
  XLSX.utils.book_append_sheet(wbSummary, simpleSheet, simpleSheetName);

  // 3. XEPLOP Sheet (Main WB)
  const xeplopSheet = XLSX.utils.aoa_to_sheet(xeplopAoa, { cellStyles: true });
  xeplopSheet['!merges'] = xeplopMerges;
  XLSX.utils.book_append_sheet(wbMain, xeplopSheet, 'XEPLOP');

  // 4. KQHT Sheet (Main WB)
  const kqhtAoa: (string | number | null)[][] = [['Lớp', 'TB mới', 'XT']];
  for (const className of sortedClasses) {
      const { diemData } = mergedData[className];
      if (diemData) {
          let tbMoi = getScoreFromRow(diemData);
          if (tbMoi === null) {
              const subScores = orderedSubjects.map(sub => parseNumberWithComma(findValueCaseInsensitive(diemData, sub))).filter((x): x is number => x !== null);
              if (subScores.length > 0) tbMoi = Number(avg(subScores).toFixed(2));
          }
          const xt = findValueCaseInsensitive(diemData, 'XT');
          kqhtAoa.push([className, tbMoi ?? null, xt ?? null]);
      }
  }
  const kqhtSheet = XLSX.utils.aoa_to_sheet(kqhtAoa);
  XLSX.utils.book_append_sheet(wbMain, kqhtSheet, 'KQHT');


  // 5. ThiDuaCN Sheet (Main WB)
  const cnThiDuaData: { className: string; cn: string; tbLop: number; xtLop: number }[] = [];
  for (const className of sortedClasses) {
      const classData = mergedData[className];
      const cnName = findValueCaseInsensitive(classData.gvData, 'CN');
      const info = allClassTbLopInfo[className];
      if (cnName && info) {
          cnThiDuaData.push({ className, cn: cnName, tbLop: info.tbLop, xtLop: info.xtLop });
      }
  }
  const sortedGrade10 = cnThiDuaData.filter(d => d.className.startsWith('10')).sort((a, b) => a.xtLop - b.xtLop);
  const sortedGrade11 = cnThiDuaData.filter(d => d.className.startsWith('11')).sort((a, b) => a.xtLop - b.xtLop);
  const sortedGrade12 = cnThiDuaData.filter(d => d.className.startsWith('12')).sort((a, b) => a.xtLop - b.xtLop);
  const finalSortedCnData = [...sortedGrade10, ...sortedGrade11, ...sortedGrade12];
  const cnAoa: (string | number)[][] = [['STT', 'Lớp', 'CN', 'TBLop', 'XTLop']];
  const cnMerges: XLSX.Range[] = [];
  finalSortedCnData.forEach((data, index) => {
      cnAoa.push([index + 1, data.className, data.cn, Number(data.tbLop.toFixed(2)), data.xtLop]);
  });
  cnAoa.push([]); 
  const topTeachersHeader = ['GIÁO VIÊN CHỦ NHIỆM XUẤT SẮC (XT 1, 2, 3)'];
  cnAoa.push(topTeachersHeader);
  const headerRowIndex = cnAoa.length - 1;
  cnMerges.push({ s: { r: headerRowIndex, c: 0 }, e: { r: headerRowIndex, c: 4 } });
  const topTeachersByGrade: { [key: number]: typeof cnThiDuaData } = {
      10: sortedGrade10.filter(t => t.xtLop <= 3),
      11: sortedGrade11.filter(t => t.xtLop <= 3),
      12: sortedGrade12.filter(t => t.xtLop <= 3),
  };
  [10, 11, 12].forEach(grade => {
      const teachers = topTeachersByGrade[grade];
      if (teachers.length > 0) {
          cnAoa.push([`Khối ${grade}`]);
          const gradeHeaderRowIndex = cnAoa.length - 1;
          cnMerges.push({ s: { r: gradeHeaderRowIndex, c: 0 }, e: { r: gradeHeaderRowIndex, c: 4 } });
          teachers.forEach(teacher => {
              cnAoa.push([`XT ${teacher.xtLop}`, `${teacher.cn} (${teacher.className})`]);
              const teacherRowIndex = cnAoa.length - 1;
              cnMerges.push({ s: { r: teacherRowIndex, c: 1 }, e: { r: teacherRowIndex, c: 4 } });
          });
      }
  });
  const cnWorksheet = XLSX.utils.aoa_to_sheet(cnAoa);
  cnWorksheet['!merges'] = cnMerges;
  XLSX.utils.book_append_sheet(wbMain, cnWorksheet, 'ThiDuaCN');
  
  // 6. ThiDuaGV Sheet (Main WB)
  const gvAoa: (string | number | null)[][] = [['STT', 'Giáo viên', 'Lớp', 'TB cũ', 'ĐTB thi', 'Độ lệch', 'XT']];
  const gvMerges: XLSX.Range[] = [];
  let currentRowIndex = 1;
  let stt = 1;
  orderedSubjects.forEach(subject => {
      gvAoa.push([`MÔN ${subject.toUpperCase()}`]);
      gvMerges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 6 } }); 
      currentRowIndex++;
      [10, 11, 12].forEach(grade => {
          const gradeTeachers = gvThiDuaList.filter(t => t.subject === subject && t.className.startsWith(String(grade))).sort((a, b) => {
                  if (a.deviation !== null && b.deviation !== null) return b.deviation - a.deviation;
                  if (a.deviation !== null) return -1;
                  if (b.deviation !== null) return 1;
                  return 0;
              });
          if (gradeTeachers.length > 0) {
              gvAoa.push([`Khối ${grade}`]);
              gvMerges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 6 } });
              currentRowIndex++;
              let currentRank = 1;
              for (let i = 0; i < gradeTeachers.length; i++) {
                  const item = gradeTeachers[i];
                  if (i > 0) {
                      const prevItem = gradeTeachers[i-1];
                      if (!(item.deviation !== null && prevItem.deviation !== null && item.deviation === prevItem.deviation)) currentRank = i + 1;
                  } else currentRank = 1;
                  const rankDisplay = item.deviation !== null ? currentRank : null;
                  gvAoa.push([stt, item.teacher, item.className, item.tbCu, item.dtbThi, item.deviation, rankDisplay]);
                  stt++;
                  currentRowIndex++;
              }
          }
      });
      gvAoa.push([]); currentRowIndex++; stt = 1; 
  });
  const gvWorksheet = XLSX.utils.aoa_to_sheet(gvAoa);
  gvWorksheet['!merges'] = gvMerges;
  const applyVerticalCenter = (worksheet: XLSX.WorkSheet, merges: XLSX.Range[]) => {
      merges.forEach(merge => {
        const startCellAddress = XLSX.utils.encode_cell(merge.s);
        const cell = worksheet[startCellAddress];
        if (cell) {
          if (!cell.s) cell.s = {};
          if (!cell.s.alignment) cell.s.alignment = {};
          cell.s.alignment.vertical = 'center';
          cell.s.alignment.horizontal = 'center';
        }
      });
  };
  applyVerticalCenter(gvWorksheet, gvMerges);
  XLSX.utils.book_append_sheet(wbMain, gvWorksheet, 'ThiDuaGV');

  // 7. KhenCaoGV Sheet (Main WB)
  const khenCaoAoa: (string | number)[][] = [['STT', 'Giáo viên', 'Lớp', 'Môn', 'Độ lệch']];
  let khenCaoStt = 1;
  orderedSubjects.forEach(subject => {
       const subjectTeachers = gvThiDuaList.filter(t => t.subject === subject && t.deviation !== null).sort((a, b) => (b.deviation!) - (a.deviation!));
       const top3 = subjectTeachers.slice(0, 3);
       top3.forEach(item => {
           khenCaoAoa.push([khenCaoStt, item.teacher, item.className, item.subject, item.deviation!]);
           khenCaoStt++;
       });
  });
  const khenCaoWorksheet = XLSX.utils.aoa_to_sheet(khenCaoAoa);
  XLSX.utils.book_append_sheet(wbMain, khenCaoWorksheet, 'KhenCaoGV');
  
  // DOWNLOAD BOTH FILES
  // File 1: Full Report
  XLSX.writeFile(wbMain, `TONG_HOP_THI_DUA_${config.fileNamePart}_${year}.xlsx`);
  
  // File 2: Simple Report (Separate Download)
  XLSX.writeFile(wbSummary, `TK_${config.fileNamePart}_${year}.xlsx`);
};
