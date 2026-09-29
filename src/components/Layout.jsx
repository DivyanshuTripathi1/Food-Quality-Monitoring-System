import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastContainer from './ToastContainer';
import ManualSampleModal from './ManualSampleModal';

const titlesMap = {
  '/': 'Smart Food Quality Dashboard',
  '/live': 'Live Sensor Stream',
  '/history': 'Test History & Logs',
  '/analytics': 'Quality Analytics & Trends',
  '/food-types': 'Food Types & Safety Thresholds',
  '/device': 'ESP32 Device & Hardware Integration',
  '/settings': 'System Settings & Calibration',
  '/about': 'About Project & Team'
};

export default function Layout() {
  const location = useLocation();

  let title = titlesMap[location.pathname];
  if (!title) {
    if (location.pathname.startsWith('/reading/')) {
      title = 'Quality Inspection Certificate';
    } else {
      title = 'Smart Food Quality Dashboard';
    }
  }

  return (
    <div className="app-shell" id="appShell">
      <Sidebar />
      <main className="main">
        <Topbar title={title} />
        <Outlet />
      </main>
      <ToastContainer />
      <ManualSampleModal />
    </div>
  );
}
