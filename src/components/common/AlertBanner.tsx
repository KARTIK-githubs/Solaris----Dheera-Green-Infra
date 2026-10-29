import React from 'react';

export type AlertBannerVariant = 'assumption' | 'warning' | 'error' | 'success' | 'info';

export interface AlertBannerProps {
  variant?: AlertBannerVariant;
  code?: string;
  title?: string;
  children: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = 'info',
  code,
  title,
  children,
  action,
  className = '',
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'assumption':
        return {
          container: 'bg-[#FBF0E2] border-[#D9822B]/40 text-[#422000]',
          badge: 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]/50',
          iconName: 'lightbulb',
          iconColor: 'text-[#A85913]',
          defaultCode: '[PROVISIONAL MODEL ASSUMPTION]',
        };
      case 'warning':
        return {
          container: 'bg-[#FFF8E6] border-[#D9822B]/60 text-[#422000]',
          badge: 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]/50',
          iconName: 'warning',
          iconColor: 'text-[#D9822B]',
          defaultCode: '[ATTENTION REQUIRED]',
        };
      case 'error':
        return {
          container: 'bg-[#FFF0F0] border-[#BA1A1A]/30 text-[#5C000B]',
          badge: 'bg-[#FFDAD6] text-[#93000A] border-[#BA1A1A]/40',
          iconName: 'error',
          iconColor: 'text-[#BA1A1A]',
          defaultCode: '[VALIDATION ERROR]',
        };
      case 'success':
        return {
          container: 'bg-[#E1EBE6] border-[#0F2D24]/20 text-[#0F2D24]',
          badge: 'bg-[#BFECE0] text-[#0F2D24] border-[#0F2D24]/30',
          iconName: 'check_circle',
          iconColor: 'text-[#0F2D24]',
          defaultCode: '[AUDIT VERIFIED]',
        };
      case 'info':
      default:
        return {
          container: 'bg-[#F4F5F0] border-[#CBD2CA] text-[#1A2421]',
          badge: 'bg-[#ECEEE8] text-[#374340] border-[#CBD2CA]',
          iconName: 'info',
          iconColor: 'text-[#606D69]',
          defaultCode: '[ENGINEERING NOTE]',
        };
    }
  };

  const style = getStyles();
  const displayCode = code || style.defaultCode;

  return (
    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${style.container} ${className}`}>
      <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${style.iconColor}`}>
        {style.iconName}
      </span>
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {displayCode && (
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${style.badge}`}>
              {displayCode}
            </span>
          )}
          {title && <span className="font-headline font-bold text-xs">{title}</span>}
        </div>
        <div className="text-[11px] leading-relaxed opacity-95">
          {children}
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 text-[11px] font-semibold underline hover:no-underline px-1 py-0.5"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
