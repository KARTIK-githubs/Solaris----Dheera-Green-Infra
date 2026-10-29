import React from 'react';

export interface DualParamControlProps {
  id: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  icon?: string;
  helperText?: string;
  badgeText?: string;
  presets?: { label: string; value: number }[];
  disabled?: boolean;
}

export const DualParamControl: React.FC<DualParamControlProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  icon,
  helperText,
  badgeText,
  presets,
  disabled = false,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') return;
    const num = Number(raw);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="flex flex-col gap-2 p-3.5 bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg shadow-xs transition-colors hover:border-[#163A2F]/40">
      {/* Header Row: Label, Icon, and Optional Badge */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-[#1A2421]">
          {icon && <span className="material-symbols-outlined text-[17px] text-[#0F2D24]">{icon}</span>}
          <span>{label}</span>
        </label>
        {badgeText && (
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2]">
            {badgeText}
          </span>
        )}
      </div>

      {/* Dual Input Row: Number field with unit adornment */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={handleInputChange}
            className="w-full bg-white border border-[#CBD2CA] rounded-md px-3 py-1.5 text-sm font-mono tabular-nums font-bold text-[#0F2D24] focus:outline-none focus:ring-1 focus:ring-[#0F2D24] focus:border-[#0F2D24] disabled:opacity-50 pr-14"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#606D69] pointer-events-none select-none">
            {unit}
          </span>
        </div>
      </div>

      {/* Synchronized Range Slider */}
      <div className="space-y-1 pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleSliderChange}
          aria-label={label}
          className="w-full h-1.5 bg-[#ECEEE8] rounded-lg appearance-none cursor-pointer accent-[#0F2D24] disabled:opacity-50"
        />
        <div className="flex justify-between items-center text-[10px] font-mono text-[#606D69]">
          <span>{min.toLocaleString('en-IN')} {unit}</span>
          <span>{max.toLocaleString('en-IN')} {unit}</span>
        </div>
      </div>

      {/* Quick Presets Row (if provided) */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {presets.map((preset) => {
            const isSelected = value === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.value)}
                disabled={disabled}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  isSelected
                    ? 'bg-[#0F2D24] text-white border-[#0F2D24]'
                    : 'bg-white text-[#1A2421] border-[#CBD2CA] hover:bg-[#F4F5F0]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Helper text */}
      {helperText && (
        <p className="text-[11px] text-[#606D69] leading-tight pt-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
};
