'use client';

import NotificationFilters from '@/components/notifications/NotificationFilters';
import NotificationList from '@/components/notifications/NotificationList';
import { useTheme } from '@/components/useTheme';
import { Notifications } from '@/config/types/types';
import { DUMMY_NOTIFICATIONS } from '@/lib/dummydata';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useState } from 'react';

 

export default function NotificationsPage() {
  const { isDark } = useTheme()
  const [notifications, setNotifications] = useState<Notifications[]>(DUMMY_NOTIFICATIONS);
  const [filteredNotifications, setFilteredNotifications] = useState<Notifications[]>(DUMMY_NOTIFICATIONS);
  const [filters, setFilters] = useState({
    status: '',
    procedure: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    
    let filtered = [...notifications];
    
    if (newFilters.status) {
      filtered = filtered.filter(n => 
        newFilters.status === 'UNREAD' ? n.is_read === 'N' : n.is_read === 'Y'
      );
    }
    
    if (newFilters.procedure) {
      filtered = filtered.filter(n => 
        n.procedure_name.toLowerCase().includes(newFilters.procedure.toLowerCase())
      );
    }
    
    if (newFilters.search) {
      const search = newFilters.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.message.toLowerCase().includes(search)
      );
    }
    
    if (newFilters.dateFrom) {
      filtered = filtered.filter(n => 
        new Date(n.created_at) >= new Date(newFilters.dateFrom)
      );
    }
    
    if (newFilters.dateTo) {
      filtered = filtered.filter(n => 
        new Date(n.created_at) <= new Date(newFilters.dateTo)
      );
    }
    
    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = (id: number) => {
    const updated = notifications.map(n => 
      n.notification_id === id 
        ? { ...n, is_read: 'Y' as const, read_at: new Date().toISOString() }
        : n
    );
    setNotifications(updated);
    setFilteredNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({
      ...n,
      is_read: 'Y' as const,
      read_at: n.read_at || new Date().toISOString(),
    }));
    setNotifications(updated);
    setFilteredNotifications(updated);
  };

  const handleDelete = (id: number) => {
      const updated = notifications.filter(n => n.notification_id !== id);
      setNotifications(updated);
      setFilteredNotifications(updated);
  };

  const handleReload = () => {
    // Simulate reload
    setFilteredNotifications([...notifications]);
  };

  return (
  <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
  <div className="container mx-auto px-4 py-6">
    
    <div className="flex items-center justify-between mb-6">
      <h1
        className={`text-2xl font-semibold flex items-center gap-2 ${
          isDark ? 'text-white' : 'text-gray-800'
        }`}
      >
        <Bell className="w-7 h-7" />
        Notifications
      </h1>

      <div className="flex gap-2">
        <button
          onClick={handleMarkAllAsRead}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            isDark
              ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10'
              : 'border-blue-600 text-blue-600 hover:bg-blue-50'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          Mark all as read
        </button>

        <button
          onClick={handleReload}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            isDark
              ? 'border-slate-600 text-gray-300 hover:bg-slate-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Reload
        </button>
      </div>
    </div>

    <NotificationFilters
      filters={filters}
      onFilterChange={handleFilterChange}
      isDark={isDark}
    />

    <NotificationList
      notifications={filteredNotifications}
      onMarkAsRead={handleMarkAsRead}
      onDelete={handleDelete}
      isDark={isDark}
    />
  </div>
</div>
  );
}