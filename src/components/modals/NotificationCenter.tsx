import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Volume2, VolumeX, ShieldAlert, Zap, TrendingUp, Info, X } from 'lucide-react';
import { notifications, AppNotification } from '../../utils/notifications.js';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  useEffect(() => {
    setNotifs(notifications.getHistory());
    setPermission(notifications.getPermissionStatus());

    const unsubscribe = notifications.subscribe((newNotif) => {
      setNotifs(notifications.getHistory());
      
      // Add to active toast list
      setToasts((prev) => [newNotif, ...prev.slice(0, 3)]);

      // Auto dismiss toast after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
      }, 5000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRequestPermission = async () => {
    const granted = await notifications.requestPermission();
    setPermission(notifications.getPermissionStatus());
    if (granted) {
      notifications.trigger({
        title: '🔔 Notifications Enabled',
        message: 'You will now receive real-time alerts for CALL/PUT signals and market volatility.',
        type: 'alert',
      });
    }
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => {
    notifs.forEach((n) => (n.read = true));
    setNotifs([...notifs]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'signal':
        return <Zap className="w-4 h-4 text-[#00F3FF]" />;
      case 'trade':
        return <TrendingUp className="w-4 h-4 text-[#00FF88]" />;
      case 'risk':
        return <ShieldAlert className="w-4 h-4 text-[#FF4560]" />;
      default:
        return <Info className="w-4 h-4 text-[#E8EDF5]" />;
    }
  };

  return (
    <>
      {/* Header Notification Bell Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 bg-[#101722] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#00F3FF]/40 rounded-lg text-[#8B98AA] hover:text-[#E8EDF5] transition-all flex items-center justify-center"
          title="Notification Center & Signals"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#FF4560] text-white text-[9px] font-black rounded-full animate-pulse shadow-md">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Notification Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0B1018] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
            {/* Header */}
            <div className="px-4 py-3 bg-[#101722] border-b border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#00F3FF]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#E8EDF5]">
                  Live Notifications & Signals
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] text-[#00F3FF] hover:underline font-bold"
                >
                  Mark read
                </button>
                <button
                  type="button"
                  onClick={() => notifications.clearHistory()}
                  className="text-[10px] text-[#FF4560] hover:underline font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[#8B98AA] hover:text-[#E8EDF5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Permission Banner if not granted */}
            {permission !== 'granted' && permission !== 'unsupported' && (
              <div className="bg-[#00F3FF]/10 border-b border-[#00F3FF]/30 p-3 flex items-center justify-between gap-3">
                <div className="text-[11px] text-[#E8EDF5]">
                  <p className="font-bold text-[#00F3FF]">Enable Browser Alerts</p>
                  <p className="text-[#8B98AA]">Get instant desktop alerts for high-conviction CALL/PUT signals.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-3 py-1 bg-[#00F3FF] text-[#04060A] rounded-lg text-xs font-black hover:bg-[#00FF88] transition-all whitespace-nowrap shadow-md shadow-[#00F3FF]/20"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[#1E293B]">
              {notifs.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8B98AA]">
                  No notifications yet. AI signals and market alerts will appear here in real time.
                </div>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 transition-all hover:bg-[#101722]/60 ${!n.read ? 'bg-[#101722]/30' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#04060A] border border-[#1E293B] shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[#E8EDF5] truncate">{n.title}</h4>
                          <span className="text-[9px] text-[#8B98AA] shrink-0 font-mono-numbers">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8B98AA] mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-[#04060A] border-t border-[#1E293B] text-[10px] text-[#8B98AA] flex items-center justify-between">
              <span>Web Notifications API Active</span>
              <span className="text-[#00FF88] font-mono-numbers">Audio Chime: Enabled</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating In-App Toast Notifications Container (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#0B1018]/95 backdrop-blur-xl border border-[#00F3FF]/40 rounded-xl shadow-2xl p-3.5 flex items-start gap-3 animate-slide-up text-left"
          >
            <div className="p-2 rounded-lg bg-[#04060A] border border-[#1E293B] shrink-0">
              {getIcon(t.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-[#E8EDF5] truncate">{t.title}</h5>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="text-[#8B98AA] hover:text-[#E8EDF5]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-[#8B98AA] mt-1 leading-snug">{t.message}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
