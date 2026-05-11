import Link from 'next/link';
import { LayoutDashboard, Map, ShieldAlert, Users, Radio, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/router';
import { cn } from '@/utils/cn';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Carte Live', href: '/map', icon: Map },
  { name: 'Citoyen (Test)', href: '/citizen', icon: ShieldAlert },
  { name: 'Agent', href: '/agent', icon: Radio },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <div className="flex flex-col w-64 h-screen bg-gray-900 text-white border-r border-gray-800">
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          USALAMA AI
        </h1>
      </div>
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-6 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-400 transition-colors rounded-md hover:bg-gray-800 hover:text-white">
          <LogOut className="w-5 h-5 mr-3" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
