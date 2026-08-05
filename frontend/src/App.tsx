/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { Layout } from "./components/Layout";
import { TaskUnlock } from "./pages/TaskUnlock";
import { VideoPlayer } from "./pages/VideoPlayer";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { DownloadPage } from "./pages/DownloadPage";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="stream-vault-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/admin_dashboard/*" element={<AdminDashboard />} />
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<TaskUnlock />} />
                <Route path="/ad/:slug" element={<TaskUnlock />} />
                <Route path="/s/:slug" element={<VideoPlayer />} />
                <Route path="/dl/:slug" element={<DownloadPage />} />
                <Route path="/d/:slug" element={<DownloadPage />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
