import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface GameboyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  subText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  children?: ReactNode;
}

export function GameboyButton({
  text,
  subText,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: GameboyButtonProps) {
  const baseStyles = 'gameboy-btn font-bold rounded-xl transition-all';

  const variants = {
    primary: 'bg-[#FFCB05] hover:bg-[#E6B800] text-black',
    secondary: 'bg-[#3B4CCA] hover:bg-[#2A3BA8] text-white',
    danger: 'bg-[#FF5A5A] hover:bg-[#E64444] text-white',
  };

  const sizes = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg w-full',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin">⏳</span>
          加载中...
        </span>
      ) : (
        <span className="flex flex-col items-center">
          <span>{text}</span>
          {subText && <span className="text-xs opacity-75">{subText}</span>}
        </span>
      )}
      {children}
    </button>
  );
}