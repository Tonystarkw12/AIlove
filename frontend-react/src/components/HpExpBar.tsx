interface HpExpBarProps {
  hp: number;
  maxHp: number;
  exp: number;
  maxExp: number;
  showLabels?: boolean;
}

export function HpExpBar({ hp, maxHp, exp, maxExp, showLabels = true }: HpExpBarProps) {
  const hpPercentage = Math.min((hp / maxHp) * 100, 100);
  const expPercentage = Math.min((exp / maxExp) * 100, 100);

  return (
    <div className="space-y-2">
      {/* HP Bar */}
      <div className="space-y-1">
        {showLabels && (
          <div className="flex justify-between text-sm font-bold">
            <span>❤️ HP</span>
            <span>{hp}/{maxHp}</span>
          </div>
        )}
        <div className="h-4 bg-gray-200 rounded-full border-2 border-black overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-red-400 to-red-600 transition-all duration-300"
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* EXP Bar */}
      <div className="space-y-1">
        {showLabels && (
          <div className="flex justify-between text-sm font-bold">
            <span>⭐ EXP</span>
            <span>{exp}/{maxExp}</span>
          </div>
        )}
        <div className="h-4 bg-gray-200 rounded-full border-2 border-black overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-blue-400 to-blue-600 transition-all duration-300"
            style={{ width: `${expPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}