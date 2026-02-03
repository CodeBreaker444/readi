import { Notifications } from '@/src/config/types';
import { Check, Trash2 } from 'lucide-react';

interface NotificationListProps {
  notifications: Notifications[];
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function NotificationList({
  notifications,
  onMarkAsRead,
  onDelete,
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
   <div className="bg-white rounded-lg shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
            ID
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Message
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
            Procedure
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
            Created
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
            Status
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
            Actions
          </th>
        </tr>
      </thead>

      <tbody className="bg-white divide-y divide-gray-200">
        {notifications.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
              No notifications
            </td>
          </tr>
        ) : (
          notifications.map((notification) => (
            <tr
              key={notification.notification_id}
              className={`${
                notification.is_read === 'N' ? 'bg-yellow-50' : ''
              } hover:bg-gray-50 transition-colors`}
            >
              <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                {notification.notification_id}
              </td>

              <td className="px-4 py-3 text-sm">
                <div className="font-medium text-gray-900">
                  {notification.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Sender: {notification.sender_fullname ?? '-'} •{' '}
                  {notification.sender_profile ?? '-'} •{' '}
                  {notification.sender_profile_code ?? '-'}
                  {notification.communication_general_id && (
                    <> • Comm. ID: {notification.communication_general_id}</>
                  )}
                </div>
              </td>

              <td className="px-4 py-3 text-sm text-gray-500">
                {notification.procedure_name}
              </td>

              <td className="px-4 py-3 text-sm text-gray-500">
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

              <td className="px-4 py-3 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  {notification.is_read === 'N' && (
                    <button
                      onClick={() =>
                        onMarkAsRead(notification.notification_id)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-green-600 text-green-600 rounded hover:bg-green-50 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() =>
                      onDelete(notification.notification_id)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-red-600 text-red-600 rounded hover:bg-red-50 transition-colors"
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