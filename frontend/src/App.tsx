import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainNav from '@/components/MainNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import CatProfilePage from '@/pages/CatProfilePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ApplyToHelpPage from '@/pages/ApplyToHelpPage';
import ProfilePage from '@/pages/ProfilePage';
import AccountPage from '@/pages/AccountPage';
import './App.css';

function App() {
  return (
    <Router>
      <MainNav />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cats/:id" element={<CatProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/apply-to-help" element={<ApplyToHelpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          {/* Add other routes here as needed */}
        </Routes>
      </main>
    </Router>
  );
}

export default App;