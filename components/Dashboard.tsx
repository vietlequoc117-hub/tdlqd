import React, { useState } from 'react';
import type { DashboardData } from '../types';
import { ClassAnalysisView } from './ClassAnalysisView';
import { SubjectTeacherRankings } from './SubjectTeacherRankings';
import { TeacherAwardsView } from './TeacherAwardsView';

interface DashboardProps {
    data: DashboardData;
}

type ViewType = 'classes' | 'teachers' | 'awards';

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
    const { grade10, grade11, grade12, subjectRankings } = data;
    const [highlightedClass, setHighlightedClass] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<ViewType>('classes');

    const handleClassSelect = (className: string | null) => {
        // If a class is selected from a chart, switch to the class analysis view
        if (className) {
            setActiveView('classes');
            setHighlightedClass(className);
        } else {
            setHighlightedClass(null);
        }
    };
    
    const gradeData = [grade10, grade11, grade12];

    const renderActiveView = () => {
        switch (activeView) {
            case 'classes':
                return <ClassAnalysisView 
                            gradeData={gradeData} 
                            highlightedClass={highlightedClass} 
                            onClassSelect={setHighlightedClass} 
                        />;
            case 'teachers':
                return <SubjectTeacherRankings 
                            subjectRankings={subjectRankings} 
                            allClasses={data.allClasses}
                            onClassSelect={handleClassSelect} 
                        />;
            case 'awards':
                return <TeacherAwardsView gradeData={gradeData} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            {/* Main Content Section with Tabs */}
            <section>
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveView('classes')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeView === 'classes' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}
                        >
                            Phân Tích Lớp Học
                        </button>
                        <button
                            onClick={() => setActiveView('teachers')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeView === 'teachers' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}
                        >
                            Xếp Hạng Giáo Viên
                        </button>
                         <button
                            onClick={() => setActiveView('awards')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeView === 'awards' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}
                        >
                            Vinh Danh & Khen Thưởng
                        </button>
                    </nav>
                </div>
                <div>
                    {renderActiveView()}
                </div>
            </section>
        </div>
    );
};