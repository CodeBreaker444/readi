import { Notifications } from '@/config/types/types';
import { Check, Trash2 } from 'lucide-react';

interface NotificationListProps {
  notifications: Notifications[];
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  isDark: boolean
}

export default function NotificationList({
  notifications,
  onMarkAsRead,
  onDelete,
  isDark
}: NotificationListProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'
        }`}
    >
      <div className="overflow-x-auto">
        <table
          className={`min-w-full divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'
            }`}
        >
          <thead className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-20 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Message</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-44 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Procedure</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-44 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Created</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-32 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
              <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider w-44 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
            </tr>
          </thead>

          <tbody
            className={`${isDark ? 'bg-slate-800 divide-slate-700' : 'bg-white divide-gray-200'} divide-y`}
          >
            {notifications.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                >
                  No notifications
                </td>
              </tr>
            ) : (
              notifications.map((notification) => (
                <tr
                  key={notification.notification_id}
                  className={`transition-colors ${notification.is_read === 'N'
                    ? isDark
                      ? 'bg-yellow-900/20'
                      : 'bg-yellow-50'
                    : ''
                    } ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
                >
                  <td className={`px-4 py-3 text-sm text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {notification.notification_id}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {notification.message}
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Sender: {notification.sender_fullname ?? '-'} •{' '}
                      {notification.sender_profile ?? '-'} •{' '}
                      {notification.sender_profile_code ?? '-'}
                      {notification.communication_general_id && (
                        <> • Comm. ID: {notification.communication_general_id}</>
                      )}
                    </div>
                  </td>

                  <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {notification.procedure_name}
                  </td>

                  <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div>{formatDateTime(notification.created_at)}</div>
                    {notification.read_at && (
                      <div className="text-xs text-gray-400 mt-1">
                        Read: {formatDateTime(notification.read_at)}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {notification.is_read === 'Y' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        READ
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        UNREAD
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                      {notification.is_read === 'N' && (
                        <button
                          onClick={() => onMarkAsRead(notification.notification_id)}
                          className={`w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs border rounded whitespace-nowrap transition-colors ${isDark ? 'border-green-500 text-green-400 hover:bg-green-900/30' : 'border-green-600 text-green-600 hover:bg-green-50'}`}
                        >
                          <Check className="w-3 h-3" />
                          Mark as read
                        </button>
                      )}

                      <button
                        onClick={() => onDelete(notification.notification_id)}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs border rounded whitespace-nowrap transition-colors ${isDark ? 'border-red-500 text-red-400 hover:bg-red-900/30' : 'border-red-600 text-red-600 hover:bg-red-50'}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}