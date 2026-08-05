import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import Layout from "./components/Layout";

// Pages
// Note: I'll create these as stubs if they are missing
import VideoPlayer from "./pages/VideoPlayer";
import TaskUnlock from "./pages/TaskUnlock";
import DownloadPage from "./pages/DownloadPage";
import AdminDashboard from "./pages/admin/AdminDashboard";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="atoz-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="video/:slug" element={<VideoPlayer />} />
            <Route path="unlock/:slug" element={<TaskUnlock />} />
            <Route path="download/:slug" element={<DownloadPage />} />
          </Route>
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
