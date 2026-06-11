import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-blue-600">SmartAttend</span>
        </div>
        
        <div className="flex-1 py-6 px-4">
          <div className="flex items-center space-x-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg mb-6">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </div>
          
          <div className="px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Logged in as</p>
            <p className="font-medium text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.role}</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-600 hover:text-red-600 w-full px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
           <span className="text-xl font-bold text-blue-600">SmartAttend</span>
           <button onClick={handleLogout} className="text-gray-600 hover:text-red-600">
             <LogOut className="w-5 h-5" />
           </button>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default Layout;
