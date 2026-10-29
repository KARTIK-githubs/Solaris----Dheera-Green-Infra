import React, { useState } from 'react';

export interface AllocationSegment {
  id: string;
  label: string;
  valueKw: number;
  percentage: number;
  color?: string;
  isWithdrawn?: boolean;
  subLabel?: string;
}

export interface AllocationBarProps {
  segments: AllocationSegment[];
  totalCapacityKw: number;
  unallocatedKw?: number;
  showLegend?: boolean;
  unit?: string;
  className?: string;
}

const DEFAULT_SEGMENT_COLORS = [
  '#0F2D24', // deep forest green
  '#163A2F', // pine green
  '#1E4D3E', // medium forest
  '#2C6E59', // muted emerald
  '#3E8F75', // sage teal
  '#5CAE93', // light teal
  '#D9822B', // solar amber
  '#B86B1E', // deep amber
  '#8F5518', // bronze
  '#5C6B64', // slate olive
];

export const AllocationBar: React.FC<AllocationBarProps> = ({
  segments,
  totalCapacityKw,
  unallocatedKw = 0,
  showLegend = true,
  unit = 'kWp',
  className = '',
}) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const activeSegments = segments.filter((s) => !s.isWithdrawn);
  const activeSegment = segments.find((s) => s.id === activeSegmentId);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Bar container */}
      <div className="w-full bg-[#ECEEE8] h-6 rounded-md overflow-hidden flex border border-[#CBD2CA] p-0.5 gap-0.5">
        {activeSegments.map((segment, idx) => {
          const color = segment.color || DEFAULT_SEGMENT_COLORS[idx % DEFAULT_SEGMENT_COLORS.length];
          const isHovered = activeSegmentId === segment.id;
          return (
            <div
              key={segment.id}
              style={{
                width: `${Math.max(1, segment.percentage)}%`,
                backgroundColor: color,
              }}
              className={`h-full transition-opacity cursor-pointer relative group ${
                isHovered ? 'ring-2 ring-offset-1 ring-[#0F2D24] opacity-100 z-10' : 'hover:opacity-90'
              }`}
              onMouseEnter={() => setActiveSegmentId(segment.id)}
              onMouseLeave={() => setActiveSegmentId(null)}
              title={`${segment.label}: ${segment.valueKw.toFixed(2)} ${unit} (${segment.percentage.toFixed(1)}%)`}
            />
          );
        })}

        {/* Unallocated capacity (if any) */}
        {unallocatedKw > 0 && (
          <div
            style={{ width: `${Math.max(1, (unallocatedKw / totalCapacityKw) * 100)}%` }}
            className="h-full bg-repeating-linear-stripes bg-[#CBD2CA]/40 cursor-default"
            title={`Unallocated Reserve: ${unallocatedKw.toFixed(2)} ${unit}`}
          />
        )}
      </div>

      {/* Active segment inspect bar */}
      {activeSegment && (
        <div className="p-2 bg-[#F4F5F0] border border-[#CBD2CA] rounded text-xs flex items-center justify-between font-mono animate-in fade-in">
          <span className="font-bold text-[#1A2421]">{activeSegment.label}</span>
          <span className="text-[#0F2D24] font-bold">
            {activeSegment.valueKw.toFixed(2)} {unit} ({activeSegment.percentage.toFixed(1)}% share)
          </span>
          {activeSegment.subLabel && (
            <span className="text-[#606D69] text-[10px]">{activeSegment.subLabel}</span>
          )}
        </div>
      )}

      {/* Legend Grid */}
      {showLegend && activeSegments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
          {activeSegments.slice(0, 12).map((segment, idx) => {
            const color = segment.color || DEFAULT_SEGMENT_COLORS[idx % DEFAULT_SEGMENT_COLORS.length];
            return (
              <div
                key={segment.id}
                onMouseEnter={() => setActiveSegmentId(segment.id)}
                onMouseLeave={() => setActiveSegmentId(null)}
                className={`p-1.5 rounded border text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeSegmentId === segment.id
                    ? 'bg-[#E1EBE6] border-[#0F2D24]'
                    : 'bg-white border-[#CBD2CA] hover:bg-[#F4F5F0]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1A2421] truncate">{segment.label}</div>
                  <div className="font-mono text-[10px] text-[#606D69] tabular-nums">
                    {segment.valueKw.toFixed(1)} {unit} • {segment.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
          {activeSegments.length > 12 && (
            <div className="p-1.5 rounded border border-[#CBD2CA] bg-[#F4F5F0] text-[10px] font-mono text-[#606D69] flex items-center justify-center">
              +{activeSegments.length - 12} additional members
            </div>
          )}
        </div>
      )}
    </div>
  );
};
