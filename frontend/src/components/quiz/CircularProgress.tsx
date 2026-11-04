import React from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  passed?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 130,
  strokeWidth = 10,
  passed = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const strokeColor = passed ? '#10B981' : '#F43F5E';
  const glowClass = passed ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'drop-shadow-[0_0_12px_rgba(244,63,94,0.35)]';

  return (
    <div className={`relative flex items-center justify-center ${glowClass}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      {/* Centered Percentage Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl font-black tracking-tight text-white">
          {Math.round(clamped)}%
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Accuracy
        </span>
      </div>
    </div>
  );
};
