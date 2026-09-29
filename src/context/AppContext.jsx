import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('foodguard_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('foodguard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    showToast(`Switched to ${next === 'dark' ? 'Dark Mode' : 'Light Mode'}`, 'info');
  };

  // Sound Alerts state
  const [soundAlerts, setSoundAlerts] = useState(true);

  const toggleSoundAlerts = () => {
    setSoundAlerts(prev => {
      const next = !prev;
      showToast(next ? 'Spoilage alarm buzzer ENABLED' : 'Spoilage alarm buzzer MUTED', next ? 'info' : 'warning');
      return next;
    });
  };

  const playBuzzerSound = useCallback(() => {
    if (!soundAlerts) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, [soundAlerts]);

  // Toast notification system
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, show: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, show: true } : t));
    }, 10);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, show: false } : t));
      setTimeout(() => {
        removeToast(id);
      }, 300);
    }, duration);
  }, [removeToast]);

  // Sidebar mobile toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // Device & Network state
  const [device, setDevice] = useState({
    id: 'ESP32-FOODGUARD',
    mode: 'MOCK_SIMULATOR',
    online: true,
    wifi: 'FoodGuard_IoT_Net',
    ip: '192.168.4.1',
    uptimeFormatted: '0h 0m',
    packetsReceived: 0,
    lastSeen: new Date().toISOString()
  });
  const [pingLatency, setPingLatency] = useState('Online');

  const pingDevice = async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/device/ping', { method: 'POST' });
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        setPingLatency(`${latency}ms`);
        showToast(`ESP32 Node Ping Response: ${latency}ms latency (Status: 200 OK)`, 'success');
      } else {
        showToast('ESP32 Node Ping failed', 'error');
      }
    } catch (e) {
      showToast('ESP32 Node Ping Timeout', 'error');
    }
  };

  // Food Profiles state
  const [foods, setFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState('milk');

  const fetchFoods = useCallback(async () => {
    try {
      const res = await fetch('/api/foods');
      const json = await res.json();
      if (json.success && json.data) {
        setFoods(json.data);
      }
    } catch (e) {
      console.error('Error fetching foods:', e);
    }
  }, []);

  const switchActiveFood = async (foodKey) => {
    setSelectedFood(foodKey);
    try {
      await fetch('/api/demo/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodType: foodKey })
      });
    } catch (e) {
      console.error('Error setting demo food:', e);
    }
  };

  // Manual Sample Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const openManualModal = () => setIsManualModalOpen(true);
  const closeManualModal = () => setIsManualModalOpen(false);

  // Quick simulator triggers
  const triggerQuickRead = async (callback) => {
    try {
      const res = await fetch('/api/simulate/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodType: selectedFood })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Sensor reading accepted: ${json.data.foodType.toUpperCase()} (Score: ${json.data.qualityScore})`, 'success');
        if (callback) callback(json.data);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to trigger reading', 'error');
    }
  };

  const triggerQuickAnomaly = async (callback) => {
    try {
      const res = await fetch('/api/simulate/anomaly', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        playBuzzerSound();
        showToast(`⚠️ SPOILAGE ANOMALY INJECTED: Gas ${json.data.gas} ppm, pH ${json.data.ph} -> SPOILED!`, 'error', 5000);
        if (callback) callback(json.data);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to inject anomaly', 'error');
    }
  };

  // Initial load
  useEffect(() => {
    fetchFoods();
    fetch('/api/device')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) setDevice(j.data);
      })
      .catch(() => {});
  }, [fetchFoods]);

  const value = {
    theme,
    toggleTheme,
    soundAlerts,
    toggleSoundAlerts,
    playBuzzerSound,
    toasts,
    showToast,
    removeToast,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    device,
    setDevice,
    pingLatency,
    pingDevice,
    foods,
    setFoods,
    fetchFoods,
    selectedFood,
    setSelectedFood,
    switchActiveFood,
    isManualModalOpen,
    openManualModal,
    closeManualModal,
    triggerQuickRead,
    triggerQuickAnomaly
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
