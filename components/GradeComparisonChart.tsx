import React, { useEffect, useRef } from 'react';
import type { Chart } from 'chart.js';
import type { GradeData } from '../types';

interface GradeComparisonChartProps {
    grades: GradeData[];
}

export const GradeComparisonChart: React.FC<GradeComparisonChartProps> = ({ grades }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const data = {
            labels: grades.map(g => `Khối ${g.grade}`),
            datasets: [{
                label: 'Điểm TB',
                data: grades.map(g => g.averageScore.toFixed(2)),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)'
                ],
                borderColor: [
                    '#6366F1',
                    '#10b981',
                    '#f59e0b'
                ],
                borderWidth: 1,
                borderRadius: 4,
            }]
        };

        chartRef.current = new (window as any).Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Điểm Thi Đua Trung Bình Các Khối',
                        font: { size: 16, weight: 'bold' },
                        color: '#111827',
                        padding: { bottom: 16 }
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleFont: { weight: 'bold' },
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Điểm (Thấp hơn là tốt hơn)',
                            color: '#6B7280'
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            display: false,
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
    }, [grades]);

    return (
        <div className="relative h-full w-full">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};
