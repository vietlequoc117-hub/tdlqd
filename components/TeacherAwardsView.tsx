import React from 'react';
import type { GradeData, TeacherRank } from '../types';

interface TeacherAwardsViewProps {
    gradeData: GradeData[];
}

const AwardCard: React.FC<{ teacher: TeacherRank; rank: number }> = ({ teacher, rank }) => {
    const rankColors = {
        1: 'border-yellow-400 bg-yellow-50', // Gold
        2: 'border-gray-400 bg-gray-50',     // Silver
        3: 'border-yellow-600 bg-yellow-50', // Bronze
    };
    const rankText = {
        1: 'XT Nhất',
        2: 'XT Nhì',
        3: 'XT Ba',
    };

    return (
        <div className={`p-4 rounded-lg border-2 ${rankColors[rank as keyof typeof rankColors] || 'border-gray-200'}`}>
            <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-lg ${rank === 1 ? 'bg-yellow-400 text-white' : (rank === 2 ? 'bg-gray-400 text-white' : 'bg-yellow-600 text-white')}`}>
                    {rank}
                </div>
                <div>
                    <p className="font-bold text-text-primary">{teacher.name}</p>
                    <p className="text-sm text-text-secondary">
                        Chủ nhiệm lớp <span className="font-semibold">{teacher.className}</span> - {rankText[rank as keyof typeof rankText]}
                    </p>
                </div>
            </div>
        </div>
    );
};


export const TeacherAwardsView: React.FC<TeacherAwardsViewProps> = ({ gradeData }) => {
    return (
        <div className="bg-surface rounded-lg shadow-md border border-gray-200/80">
            <h3 className="text-lg font-bold text-text-primary p-4 bg-gray-50 border-b border-gray-200">
                Vinh Danh Giáo Viên Chủ Nhiệm Xuất Sắc
            </h3>
            <div className="p-6 space-y-6">
                {gradeData.map(grade => {
                    const top3Teachers = grade.topHomeroomTeachers.filter(t => t.rank <= 3);
                    if (top3Teachers.length === 0) return null;

                    return (
                        <div key={grade.grade}>
                            <h4 className="text-md font-semibold text-primary mb-3">
                                Khối {grade.grade}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {top3Teachers.map(teacher => (
                                    <AwardCard key={`${grade.grade}-${teacher.className}`} teacher={teacher} rank={teacher.rank} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};