import React, { useEffect, useRef } from 'react';
import type { Chart } from 'chart.js';
import type { ClassResult } from '../types';

interface ClassProfileRadarChartProps {
    classResult: ClassResult;
}

export const ClassProfileRadarChart: React.FC<ClassProfileRadarChartProps> = ({ classResult }) => {
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
            labels: classResult.subjects.map(s => s.name),
            datasets: [{
                label: 'Xếp Hạng Môn',
                data: classResult.subjects.map(s => s.xt ?? 0),
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
            }]
        };

        chartRef.current = new (window as any).Chart(ctx, {
            type: 'radar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                         callbacks: {
                            label: function(context: any) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.r !== null) {
                                    label += context.parsed.r;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        grid: {
                           color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                           backdropColor: 'rgba(255, 255, 255, 1)',
                           stepSize: 5
                        },
                        // Lower value is better, so we can reverse the scale
                        reverse: true 
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [classResult]);

    return (
        <div className="relative h-full w-full">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};
