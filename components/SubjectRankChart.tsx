
import React, { useEffect, useRef } from 'react';
import type { Chart } from 'chart.js';

// Ensure DataLabels plugin is registered
try {
    if ((window as any).Chart && (window as any).ChartDataLabels && !(window as any).Chart.registry.plugins.get('datalabels')) {
        (window as any).Chart.register((window as any).ChartDataLabels);
    }
} catch (e) {
    console.error("Could not register ChartDataLabels plugin", e);
}

interface RankedTeacher {
    name: string;
    averageRank: number;
}

interface SubjectRankChartProps {
    teachers: RankedTeacher[];
    subject: string;
}

export const SubjectRankChart: React.FC<SubjectRankChartProps> = ({ teachers, subject }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || teachers.length === 0) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }
        
        const topTeachers = teachers.slice(0, 10); // Show top 10

        const data = {
            labels: topTeachers.map(t => t.name),
            datasets: [{
                label: 'XT TB',
                data: topTeachers.map(t => t.averageRank),
                // Emerald-400 equivalent for the bars to match the screenshot
                backgroundColor: 'rgba(52, 211, 153, 0.9)', 
                borderColor: 'rgba(5, 150, 105, 0.8)', // Emerald-600
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.7,
            }]
        };

        chartRef.current = new (window as any).Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        right: 30 // Add space for labels at the end of bars if needed
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Top 10 Giáo Viên Môn ${subject} (XT TB)`,
                        font: { size: 18, weight: 'bold' },
                        color: '#111827',
                        padding: { bottom: 20 }
                    },
                    tooltip: {
                        backgroundColor: '#1f2937', // Gray-800
                        titleFont: { size: 14 },
                        bodyFont: { size: 14, weight: 'bold' },
                        padding: 10,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            label: function(context: any) {
                                return `XT TB: ${Number(context.raw).toFixed(2).replace(/\.00$/, '')}`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: '#374151', // Gray-700
                        anchor: 'center',
                        align: 'center',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: (value: any) => Number(value).toFixed(2).replace(/\.00$/, '')
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'XT TB (Thấp hơn là tốt hơn)',
                            color: '#6B7280',
                            font: { size: 12 }
                        },
                        grid: {
                            color: '#f3f4f6'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: '#374151'
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
    }, [teachers, subject]);

    if (teachers.length === 0) return null;

    return (
        <div className="relative h-96 w-full p-2">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};
