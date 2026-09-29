import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import TestHistory from './pages/TestHistory';
import Analytics from './pages/Analytics';
import FoodTypes from './pages/FoodTypes';
import DeviceStatus from './pages/DeviceStatus';
import Settings from './pages/Settings';
import AboutUs from './pages/AboutUs';
import CertificateDetail from './pages/CertificateDetail';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveMonitoring />} />
            <Route path="/history" element={<TestHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/food-types" element={<FoodTypes />} />
            <Route path="/device" element={<DeviceStatus />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/reading/:id" element={<CertificateDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
