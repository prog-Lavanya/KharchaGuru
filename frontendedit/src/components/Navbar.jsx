import { Bell, User, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import logo from "../finance_logo.png";

export default function Navbar({ onToggle }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [newToast, setNewToast] = useState(null);
  const token = localStorage.getItem("token");

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await fetch('https://kharchaguru-0cgi.onrender.com/notifications/');
      if (!res.ok) return;

      const data = await res.json();
      const safeData = Array.isArray(data) ? data : [];

      setNotifications((prev) => {
        if (prev.length > 0 && safeData.length > prev.length) {
          const latest = safeData[0];
          setNewToast(latest.message);
          setTimeout(() => setNewToast(null), 4000);
        }
        return safeData;
      });
      setUnreadCount(safeData.filter((n) => !n.read).length);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", refreshIfVisible);
    const interval = setInterval(fetchNotifications, 15000);

    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const addNotification = useCallback(async (message, type = 'info') => {
    try {
      const res = await fetch('https://kharchaguru-0cgi.onrender.com/notifications/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type })
      });
      if (res.ok) {
        const newNotif = await res.json();
        setNotifications((prev) => {
          const updated = [newNotif, ...prev].slice(0, 50);
          setUnreadCount(updated.filter((n) => !n.read).length);
          return updated;
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`https://kharchaguru-0cgi.onrender.com/notifications/${id}/read`, { method: 'PUT' });
      const updated = notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.read).length);
    } catch (e) { console.error(e); }
  };

  const clearAll = async () => {
    try {
      await fetch('https://kharchaguru-0cgi.onrender.com/notifications/clear', { method: 'DELETE' });
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  // Expose addNotification globally for OCR/Voice components
  useEffect(() => {
    window.addNotification = addNotification;
    return () => {
      if (window.addNotification === addNotification) {
        delete window.addNotification;
      }
    };
  }, [addNotification]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const username = localStorage.getItem("username") || "User";
  const initials = username.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="relative z-[120] h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/60 flex-shrink-0">
      <div className="h-full px-6 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200"
          >
            <Menu size={20} />
          </button>

          <h1 className="text-lg font-semibold text-slate-200 hidden sm:block">
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-teal-500/20">
                <img src={logo} alt="KharchaGuru logo" className="h-full w-full object-contain p-1" />
              </span>
              <span>KharchaGuru</span>
            </span>
          </h1>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200 relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-slate-950 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-3 w-80 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl z-[5000]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-200">Notifications</h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`p-4 border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-all duration-150 ${!notif.read ? 'bg-teal-500/5' : ''
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.type === 'success' ? 'bg-emerald-400' :
                            notif.type === 'error' ? 'bg-red-400' :
                              'bg-teal-400'
                            }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300">{notif.message}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {new Date(notif.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Button */}
          <button
            onClick={() => navigate("/dashboard/profile")}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-slate-950 text-xs font-bold">
              {initials}
            </div>
            <span className="hidden sm:inline text-sm font-medium">{username}</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors px-3 py-2 rounded-xl hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {newToast && (
        <div className="fixed top-20 right-6 bg-teal-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-2xl z-[4000] animate-bounce flex items-center gap-3 border border-teal-500/30">
          <div className="bg-white/20 p-1.5 rounded-full">
            <Bell size={16} />
          </div>
          <span className="font-medium text-sm">{newToast}</span>
        </div>
      )}
    </header>
  );
}
