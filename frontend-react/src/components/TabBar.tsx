import { NavLink } from 'react-router-dom';

interface TabItem {
  path: string;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/lobster', label: '龙虾', icon: '🦞' },
  { path: '/lobster/chat', label: '对话', icon: '💬' },
  { path: '/profile', label: '我的', icon: '👤' },
];

export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1f33]/95 backdrop-blur-md border-t border-white/10 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                isActive
                  ? 'text-[#ff6b6b] scale-105'
                  : 'text-[#87CEEB]/60 hover:text-[#87CEEB]'
              }`
            }
          >
            <span className="text-2xl mb-0.5">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
