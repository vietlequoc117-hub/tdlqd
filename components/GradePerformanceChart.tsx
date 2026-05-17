
import React, { useEffect, useRef } from 'react';
import type { Chart } from 'chart.js';
import type { ClassResult } from '../types';

try {
    if ((window as any).Chart && (window as any).ChartDataLabels && !(window as any).Chart.registry.plugins.get('datalabels')) {
        (window as any).Chart.register((window as any).ChartDataLabels);
    }
} catch (e) {
    console.error("Could not register ChartDataLabels plugin", e);
}


interface GradePerformanceChartProps {
    classes: ClassResult[];
    grade: number;
    onClassSelect: (className: string | null) => void;
    highlightedClass: string | null;
}

const getRankColorForChart = (rank: number): string => {
    if (rank <= 3) return '#10b981'; // secondary color from tailwind config
    if (rank <= 10) return '#f59e0b'; // a yellow color
    return '#ef4444'; // error color from tailwind config
};

export const GradePerformanceChart: React.FC<GradePerformanceChartProps> = ({ classes, grade, onClassSelect, highlightedClass }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }
        
        const sortedClasses = [...classes].sort((a, b) => a.rankByGrade - b.rankByGrade);

        const data = {
            labels: sortedClasses.map(c => c.className),
            datasets: [{
                label: 'Điểm Thi Đua (TB Lớp)',
                data: sortedClasses.map(c => c.totalScore),
                backgroundColor: sortedClasses.map(c => getRankColorForChart(c.rankByGrade)),
                borderColor: sortedClasses.map(c => c.className === highlightedClass ? '#4F46E5' : 'transparent'), // primary-dark
                borderWidth: sortedClasses.map(c => c.className === highlightedClass ? 3 : 0),
                borderRadius: 4,
            }]
        };

        chartRef.current = new (window as any).Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event: any, elements: any[]) => {
                    const chart = chartRef.current;
                    if (!chart) return;
                    
                    if (elements.length > 0) {
                        const clickedIndex = elements[0].index;
                        const className = sortedClasses[clickedIndex].className;
                        onClassSelect(className === highlightedClass ? null : className);
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Biểu đồ Thi đua Khối ${grade}`,
                        font: { size: 16, weight: 'bold' },
                        color: '#111827',
                        padding: { bottom: 16 }
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleFont: { weight: 'bold' },
                        callbacks: {
                            label: (context: any) => {
                                const classInfo = sortedClasses[context.dataIndex];
                                return [
                                    `TB Lớp: ${classInfo.totalScore.toFixed(2)}`,
                                    `XT Khối: ${classInfo.rankByGrade}`
                                ];
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value: any) => Number(value).toFixed(2),
                        color: '#6B7280',
                        font: {
                            weight: 'bold',
                            size: 10,
                        },
                        offset: -5,
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            font: {
                                size: 10
                            },
                            autoSkip: false,
                            maxRotation: 60,
                            minRotation: 0,
                        }
                    },
                    y: {
                        beginAtZero: false, 
                        title: {
                            display: true,
                            text: 'Điểm Thi Đua (TB Lớp - Thấp hơn là tốt hơn)',
                            color: '#6B7280'
                        },
                         grid: {
                            color: '#E5E7EB',
                        }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [classes, grade, onClassSelect, highlightedClass]);

    return (
        <div className="p-4 border-b border-gray-200">
            <div className="relative h-80 w-full">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
};
