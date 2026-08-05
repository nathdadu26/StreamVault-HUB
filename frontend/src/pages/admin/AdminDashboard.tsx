import { Link, Routes, Route } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="w-64 border-r bg-background hidden lg:block">
        <div className="p-6">
          <h2 className="font-bold text-lg">Admin Panel</h2>
        </div>
        <nav className="px-4 space-y-2">
          <Link to="/admin" className="block px-4 py-2 rounded-md hover:bg-muted font-medium">Overview</Link>
          <Link to="/admin/files" className="block px-4 py-2 rounded-md hover:bg-muted font-medium">Manage Files</Link>
          <Link to="/admin/settings" className="block px-4 py-2 rounded-md hover:bg-muted font-medium">Settings</Link>
        </nav>
      </aside>
      
      <main className="flex-1">
        <header className="h-16 border-b bg-background flex items-center px-8">
           <h1 className="font-semibold">Dashboard</h1>
        </header>
        <div className="p-8">
          <Routes>
            <Route path="/" element={<div>Welcome to Admin Overview</div>} />
            <Route path="/files" element={<div>File Management Section</div>} />
            <Route path="/settings" element={<div>Settings Configuration</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
