import { Bell, ChevronDown, Clock, LogOut, Mail, Moon, Sun, User, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import ProfileModal from './ProfileModal';

interface TopBarProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ isDark, toggleTheme }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
        return;
      }

      setShowUserMenu(false);
      
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Unexpected logout error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className={`h-16 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b flex items-center justify-between px-6`}>
        <div className="flex items-center space-x-4">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            className={`relative p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Messages"
          >
            <Mail size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>

          <button
            className={`relative p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              3
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              }`}
            >
              <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  John Doe
                </p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <ChevronDown size={16} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
            </button>

            {showUserMenu && (
              <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-50 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    John Doe
                  </p>
                  <p className="text-sm text-gray-500">JD001</p>
                </div>

                <div className="p-2">
                  <div className={`px-3 py-2 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ACCOUNT
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <UserCircle size={18} />
                    <span>Profile</span>
                  </button>

                  <button
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Clock size={18} />
                    <span>Time Zone</span>
                  </button>

                  <div className={`my-2 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}></div>

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-red-500 hover:bg-red-50 ${
                      isDark && 'hover:bg-red-900/20'
                    } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        isDark={isDark}
      />
    </>
  );
};

export default TopBar;