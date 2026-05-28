'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BarChart3, 
  Globe2, 
  Users, 
  UploadCloud, 
  PieChart, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Check, 
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { api } from '../../lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  // Responsive state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch in-app notifications
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/notifications')
        .then((data) => setNotifications(data))
        .catch((err) => console.error('Failed to load notifications:', err));
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markNotifRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => 
        prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotifRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  // Navigation Links
  const navLinks = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics Reports', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Website Inventory', href: '/dashboard/inventory', icon: Globe2 },
  ];

  const adminLinks = [
    { name: 'Publishers Directory', href: '/dashboard/admin/publishers', icon: Users },
    { name: 'CSV Demand Ingestion', href: '/dashboard/admin/uploads', icon: UploadCloud },
    { name: 'Network Analytics', href: '/dashboard/admin/analytics', icon: PieChart },
  ];

  return (
    <div className="flex h-screen bg-[#090a0c] text-white overflow-hidden">
      
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111315] border-r border-[#1a1c20] transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#1a1c20]">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tighter">
                ROLLIN<span className="text-[#e50914]">HEAD</span>
              </span>
              <span className="text-[9px] bg-[#e50914] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Partner
              </span>
            </div>
            <button lg-hidden="true" onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-7">
            <div>
              <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Publisher Reporting</p>
              <ul className="space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <button
                        onClick={() => {
                          router.push(link.href);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-[#e5091415] text-[#e50914] border-l-2 border-[#e50914]' 
                            : 'text-gray-400 hover:bg-[#16181c] hover:text-white'
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        <span>{link.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {isAdmin && (
              <div>
                <p className="px-3 text-[10px] font-bold text-[#e50914] uppercase tracking-widest mb-3">Operations / Admin</p>
                <ul className="space-y-1">
                  {adminLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                      <li key={link.href}>
                        <button
                          onClick={() => {
                            router.push(link.href);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-[#e5091415] text-[#e50914] border-l-2 border-[#e50914]' 
                              : 'text-gray-400 hover:bg-[#16181c] hover:text-white'
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                          <span>{link.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </nav>

          {/* Sidebar Footer / User Profile */}
          <div className="p-4 border-t border-[#1a1c20] bg-[#111315]">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-[#e5091422] text-[#e50914] p-2 rounded-full border border-[#e5091433]">
                <UserIcon className="h-4.5 w-4.5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate text-white">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-950 to-red-900 border border-red-900/30 hover:from-red-900 hover:to-red-800 text-red-200 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Topbar Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[#16181c] bg-[#111315] relative z-30">
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight capitalize">
              {pathname === '/dashboard' ? 'Overview Stats' : pathname?.split('/').pop()?.replace(/-/g, ' ')}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  setProfileDropdownOpen(false);
                }}
                className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#16181c] transition-all cursor-pointer focus:outline-none"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e50914] text-[9px] font-bold text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* In-app Notification Dropdown Panel */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 glass glass-red rounded-xl shadow-2xl py-2 z-50 animate-fade-in text-left">
                  <div className="px-4 py-2 border-b border-[#1a1c20] flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Announcements</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllNotifRead}
                        className="text-[10px] font-bold text-[#e50914] hover:text-[#ff5757] transition-all cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#16181c]">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-gray-500">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-4 transition-all relative ${!notif.isRead ? 'bg-[#e5091405]' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-white pr-4">{notif.title}</h4>
                            {!notif.isRead && (
                              <button 
                                onClick={() => markNotifRead(notif.id)}
                                className="text-gray-500 hover:text-[#e50914] transition-all cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{notif.message}</p>
                          <span className="text-[9px] text-gray-600 block mt-2">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setNotifDropdownOpen(false);
                }}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[#16181c] transition-all cursor-pointer focus:outline-none"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#e50914] to-[#ff5757] flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 glass rounded-lg shadow-2xl py-1.5 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-[#1a1c20]">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-xs font-bold text-white truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-[#16181c] flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#090a0c]">
          {children}
        </main>

      </div>
    </div>
  );
}
