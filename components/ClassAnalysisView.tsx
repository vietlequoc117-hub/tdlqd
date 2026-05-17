import React from 'react';
import type { GradeData } from '../types';
import { GradePerformanceChart } from './GradePerformanceChart';

export const ClassAnalysisView: React.FC<{ 
    gradeData: GradeData[];
    highlightedClass: string | null;
    onClassSelect: (className: string | null) => void;
}> = ({ gradeData, highlightedClass, onClassSelect }) => {
    
    return (
        <div className="space-y-8">
            {gradeData.map(grade => (
                <div key={grade.grade} className="bg-surface rounded-lg shadow-md border border-gray-200/80 overflow-hidden">
                    <h3 className="text-lg font-bold text-text-primary p-4 bg-gray-50 border-b border-gray-200">
                        {`Phân Tích Thi Đua Khối ${grade.grade}`}
                    </h3>

                    <GradePerformanceChart 
                        grade={grade.grade}
                        classes={grade.classes}
                        onClassSelect={onClassSelect}
                        highlightedClass={highlightedClass}
                    />
                </div>
            ))}
        </div>
    );
};
