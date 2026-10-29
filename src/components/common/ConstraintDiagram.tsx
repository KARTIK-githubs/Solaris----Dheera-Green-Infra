import React from 'react';

export interface ConstraintDiagramProps {
  rooftopCapacityKw: number;
  sanctionedLoadCapKw: number;
  demandOffsetCapKw: number;
  recommendedCapacityKw: number;
  limitingFactor: 'roof' | 'sanctioned_load' | 'energy_demand';
  isViable?: boolean;
}

export const ConstraintDiagram: React.FC<ConstraintDiagramProps> = ({
  rooftopCapacityKw,
  sanctionedLoadCapKw,
  demandOffsetCapKw,
  recommendedCapacityKw,
  limitingFactor,
  isViable = true,
}) => {
  // Max scale reference for normalizing horizontal bar widths
  const maxKw = Math.max(rooftopCapacityKw, sanctionedLoadCapKw, demandOffsetCapKw, 5);
  const scale = (val: number) => Math.min(100, Math.max(4, (val / maxKw) * 100));

  const items = [
    {
      id: 'roof',
      label: 'Rooftop Clearance Limit',
      rule: 'Area / 95 sq.ft per kWp',
      capacityKw: rooftopCapacityKw,
      isBinding: limitingFactor === 'roof',
      barColor: limitingFactor === 'roof' ? 'bg-[#D9822B]' : 'bg-[#163A2F]/60',
    },
    {
      id: 'sanctioned_load',
      label: 'DISCOM Sanctioned Load Cap',
      rule: '100% of Connected Load (DERC Net-Meter)',
      capacityKw: sanctionedLoadCapKw,
      isBinding: limitingFactor === 'sanctioned_load',
      barColor: limitingFactor === 'sanctioned_load' ? 'bg-[#D9822B]' : 'bg-[#163A2F]/60',
    },
    {
      id: 'energy_demand',
      label: '100% Net-Zero Energy Target',
      rule: 'Annual kWh / 1,334.8 eff. yield',
      capacityKw: demandOffsetCapKw,
      isBinding: limitingFactor === 'energy_demand',
      barColor: limitingFactor === 'energy_demand' ? 'bg-[#0F2D24]' : 'bg-[#163A2F]/60',
    },
  ];

  const getBadgeText = () => {
    if (!isViable) return 'SPACE CONSTRAINED (<90 SQ.FT)';
    if (limitingFactor === 'roof') return 'BINDING: ROOFTOP SPACE';
    if (limitingFactor === 'sanctioned_load') return 'BINDING: SANCTIONED LOAD';
    return 'SIZED: 100% ENERGY OFFSET';
  };

  const getBadgeClass = () => {
    if (!isViable) return 'bg-[#FFF0F0] text-[#BA1A1A] border-[#BA1A1A]/30';
    if (limitingFactor === 'roof' || limitingFactor === 'sanctioned_load') {
      return 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]/40';
    }
    return 'bg-[#E1EBE6] text-[#0F2D24] border-[#0F2D24]/20';
  };

  return (
    <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD2CA] pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">vertical_align_center</span>
          <h3 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
            Physical &amp; Statutory Constraint Analysis
          </h3>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${getBadgeClass()}`}>
          {getBadgeText()}
        </span>
      </div>

      {/* Comparative Bars */}
      <div className="space-y-3 pt-1">
        {items.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-[#1A2421] flex items-center gap-1.5">
                {item.label}
                {item.isBinding && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FBF0E2] text-[#A85913] border border-[#D9822B]/40 font-semibold">
                    LIMITING
                  </span>
                )}
              </span>
              <span className="font-mono tabular-nums font-bold text-[#1A2421]">
                {item.capacityKw.toFixed(1)} kWp
              </span>
            </div>

            <div className="w-full bg-[#ECEEE8] h-3 rounded-xs overflow-hidden flex items-center relative">
              <div
                className={`h-full ${item.barColor} transition-all duration-300 rounded-xs`}
                style={{ width: `${scale(item.capacityKw)}%` }}
              />
            </div>

            <div className="text-[10px] text-[#606D69] flex justify-between font-mono">
              <span>{item.rule}</span>
              <span>{item.capacityKw > 0 ? `${item.capacityKw.toFixed(1)} kWp headroom` : '0 kWp'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Decision Summary Box */}
      <div className="mt-3 p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">check_circle</span>
          <div>
            <span className="font-semibold text-[#1A2421] block">
              Adopted System Capacity: <span className="font-mono tabular-nums text-[#0F2D24] font-bold">{recommendedCapacityKw.toFixed(1)} kWp</span>
            </span>
            <span className="text-[10px] text-[#606D69]">
              Strictly governed by min(Rooftop Space, Sanctioned Load, Energy Offset)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
