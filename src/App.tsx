/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell, AuthProvider } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { ReportPage } from './pages/ReportPage';
import { TrackPage } from './pages/TrackPage';
import { HandlerPage } from './pages/HandlerPage';
import { RoutingPage } from './pages/RoutingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ValidationLabPage } from './pages/ValidationLabPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/handler" element={<HandlerPage />} />
            <Route path="/routing" element={<RoutingPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/validation" element={<ValidationLabPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
}
