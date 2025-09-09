import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

interface NotificationToastProps {
  notification: ToastNotification;
  onClose: (id: string) => void;
}

export default function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const { id, type, title, message, duration = 5000, autoClose = true } = notification;

  // Animation entrance
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto close
  useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 shadow-green-100';
      case 'error':
        return 'bg-red-50 border-red-200 shadow-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 shadow-yellow-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
      default:
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full mx-auto
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div className={`
        ${getColors()}
        border rounded-lg shadow-lg backdrop-blur-sm
        p-4 relative overflow-hidden
      `}>
        {/* Progress bar for auto-close */}
        {autoClose && duration > 0 && (
          <div 
            className={`absolute bottom-0 left-0 h-1 bg-opacity-50 ${
              type === 'success' ? 'bg-green-500' :
              type === 'error' ? 'bg-red-500' :
              type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{
              animation: `shrink ${duration}ms linear`,
              width: '100%'
            }}
          />
        )}

        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium ${
              type === 'success' ? 'text-green-800' :
              type === 'error' ? 'text-red-800' :
              type === 'warning' ? 'text-yellow-800' :
              'text-blue-800'
            }`}>
              {title}
            </h4>
            {message && (
              <p className={`mt-1 text-sm ${
                type === 'success' ? 'text-green-700' :
                type === 'error' ? 'text-red-700' :
                type === 'warning' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                {message}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className={`flex-shrink-0 p-1 rounded-md hover:bg-opacity-20 transition-colors ${
              type === 'success' ? 'text-green-600 hover:bg-green-600' :
              type === 'error' ? 'text-red-600 hover:bg-red-600' :
              type === 'warning' ? 'text-yellow-600 hover:bg-yellow-600' :
              'text-blue-600 hover:bg-blue-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// Hook para gerenciar notificações
export function useNotifications() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = (notification: Omit<ToastNotification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Shorthand methods
  const success = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addNotification({ type: 'success', title, message: message || '', ...options });
  };

  const error = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addNotification({ type: 'error', title, message: message || '', ...options });
  };

  const warning = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addNotification({ type: 'warning', title, message: message || '', ...options });
  };

  const info = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addNotification({ type: 'info', title, message: message || '', ...options });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  };
}
