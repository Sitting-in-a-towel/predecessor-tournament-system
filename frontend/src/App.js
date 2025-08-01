import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Common/Header';
import { Footer } from './components/Common/Footer';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Teams from './pages/Teams';
import Profile from './pages/Profile';
import Feedback from './pages/Feedback';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';

// Auth Components
import DiscordLogin from './components/Auth/DiscordLogin';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/login" element={<DiscordLogin />} />
            
            {/* Protected Routes */}
            <Route path="/teams" element={
              <ProtectedRoute>
                <Teams />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;