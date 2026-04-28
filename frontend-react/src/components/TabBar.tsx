import { NavLink } from 'react-router-dom';

interface TabItem {
  path: string;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/lobster', label: '龙虾', icon: '🦞' },
  { path: '/map', label: '发现', icon: '📍' },
  { path: '/chat', label: '聊天', icon: '💬' },
  { path: '/profile', label: '我的', icon: '👤' },
];

export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0F380F] border-t-4 border-black z-50">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive
                  ? 'bg-[#306230] text-white'
                  : 'text-[#9BBC0F] hover:bg-[#306230]/50'
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs mt-0.5 font-bold">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}