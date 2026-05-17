import React, { useEffect, useRef } from 'react';
import type { Chart } from 'chart.js';
import type { SubjectRankInfo } from '../types';

interface SubjectDistributionChartProps {
    rankings: SubjectRankInfo[];
    subject: string;
}

export const SubjectDistributionChart: React.FC<SubjectDistributionChartProps> = ({ rankings, subject }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || rankings.length === 0) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }
        
        const rankGroups = {
            'Top 3': 0,
            '4-10': 0,
            '11-20': 0,
            '20+': 0
        };

        rankings.forEach(item => {
            const rank = Number(item.rank);
            if (isNaN(rank)) return;

            if (rank <= 3) rankGroups['Top 3']++;
            else if (rank <= 10) rankGroups['4-10']++;
            else if (rank <= 20) rankGroups['11-20']++;
            else rankGroups['20+']++;
        });

        const data = {
            labels: Object.keys(rankGroups),
            datasets: [{
                label: 'Số Lớp',
                data: Object.values(rankGroups),
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                ],
            }]
        };

        chartRef.current = new (window as any).Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `Phân Bổ Xếp Hạng Môn ${subject}`,
                        font: { size: 16, weight: 'bold' },
                        color: '#111827'
                    },
                },
            }
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [rankings, subject]);

    if (rankings.length === 0) return null;

    return (
        <div className="relative h-64 w-full">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};
