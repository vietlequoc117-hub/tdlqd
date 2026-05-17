import React, { useState, useMemo } from 'react';
import type { ClassResult, SubjectRankInfo } from '../types';
import { SubjectRankChart } from './SubjectRankChart';

interface SubjectTeacherRankingsProps {
    subjectRankings: Record<string, SubjectRankInfo[]>;
    allClasses: ClassResult[];
    onClassSelect: (className: string | null) => void;
}

export const SubjectTeacherRankings: React.FC<SubjectTeacherRankingsProps> = ({ subjectRankings, allClasses, onClassSelect }) => {
    const subjects = Object.keys(subjectRankings);
    const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || '');

    const rankedTeachers = useMemo(() => {
        if (!selectedSubject || !subjectRankings[selectedSubject]) return [];
        
        const teacherMap = new Map<string, { totalRank: number, classCount: number }>();
        
        subjectRankings[selectedSubject].forEach(item => {
            if (!item.teacher) return;
            if (!teacherMap.has(item.teacher)) {
                teacherMap.set(item.teacher, { totalRank: 0, classCount: 0 });
            }
            const teacherData = teacherMap.get(item.teacher)!;
            const rank = Number(item.rank);
            if (!isNaN(rank)) {
                teacherData.totalRank += rank;
                teacherData.classCount++;
            }
        });

        const results = Array.from(teacherMap.entries()).map(([name, data]) => ({
            name,
            averageRank: data.classCount > 0 ? data.totalRank / data.classCount : Infinity,
        }));

        return results.sort((a, b) => a.averageRank - b.averageRank);

    }, [selectedSubject, subjectRankings]);
    
    const tableData = useMemo(() => {
        if (!selectedSubject || !subjectRankings[selectedSubject]) return [];
        
        const teacherRankMap = new Map<string, number>();
        rankedTeachers.forEach((teacher, index) => {
            teacherRankMap.set(teacher.name, index + 1);
        });

        const flatData = subjectRankings[selectedSubject]
            .filter(item => item.teacher)
            .map(item => ({
                teacherName: item.teacher!,
                className: item.className,
                classRank: item.rank,
                teacherRank: teacherRankMap.get(item.teacher!) || Infinity,
        }));
        
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        flatData.sort((a, b) => {
            if (a.teacherRank !== b.teacherRank) {
                return a.teacherRank - b.teacherRank;
            }
            return collator.compare(a.className, b.className);
        });
        
        return flatData;
    }, [selectedSubject, subjectRankings, rankedTeachers]);


    if (subjects.length === 0) {
        return (
            <div className="bg-surface rounded-lg shadow-md border border-gray-200/80 p-6 text-center text-text-secondary">
                Không có dữ liệu xếp hạng giáo viên bộ môn.
            </div>
        );
    }
    
    let lastTeacherRendered = '';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
             <div className="lg:col-span-2">
                <div className="bg-surface rounded-lg shadow-md border border-gray-200/80 p-4">
                    <SubjectRankChart teachers={rankedTeachers} subject={selectedSubject} />
                </div>
            </div>

            <div className="lg:col-span-3 bg-surface rounded-lg shadow-md border border-gray-200/80 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-text-primary">
                        Bảng Xếp Hạng Chi Tiết
                    </h3>
                    <div>
                        <label htmlFor="subject-select" className="sr-only">Chọn môn học</label>
                        <select
                            id="subject-select"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                        >
                            {subjects.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-y-auto max-h-[40rem]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-xs text-text-secondary uppercase sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-6 py-3">XT GV</th>
                                <th scope="col" className="px-6 py-3">Giáo viên</th>
                                <th scope="col" className="px-6 py-3">Lớp</th>
                                <th scope="col" className="px-6 py-3">XT (Lớp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tableData.map((item, index) => {
                                const showTeacherInfo = item.teacherName !== lastTeacherRendered;
                                if (showTeacherInfo) {
                                    lastTeacherRendered = item.teacherName;
                                }
                                return (
                                    <tr 
                                        key={`${item.teacherName}-${item.className}`} 
                                        onClick={() => onClassSelect(item.className)}
                                        className="hover:bg-primary/10 cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            {showTeacherInfo && (
                                                <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${item.teacherRank <= 3 ? 'bg-secondary text-white' : 'bg-gray-200 text-text-primary'}`}>
                                                    {item.teacherRank}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-text-primary">
                                            {showTeacherInfo ? item.teacherName : ''}
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary">{item.className}</td>
                                        <td className="px-6 py-4 font-semibold text-lg text-text-primary">{String(item.classRank)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {tableData.length === 0 && (
                        <p className="p-6 text-center text-text-secondary">Không có dữ liệu cho môn học này.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
