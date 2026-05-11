import { Bell, Search, UserCircle } from 'lucide-react';

export default function Topbar({ title = "Dashboard" }) {
  return (
    <header className="flex items-center justify-between h-20 px-6 bg-gray-900 border-b border-gray-800 z-10 w-full relative">
      <div className="flex items-center flex-1">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-64"
          />
        </div>
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-gray-900 rounded-full"></span>
        </button>
        <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:text-white transition-colors">
          <UserCircle className="w-8 h-8 mr-2 text-gray-400" />
          <div className="flex flex-col items-start">
            <span className="leading-tight">Admin Principal</span>
            <span className="text-xs text-gray-500">Autorité</span>
          </div>
        </button>
      </div>
    </header>
  );
}
