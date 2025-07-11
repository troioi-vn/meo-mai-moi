import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import CatProfilePage from '@/pages/CatProfilePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ApplyToHelpPage from '@/pages/ApplyToHelpPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cats/:id" element={<CatProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/apply-to-help" element={<ApplyToHelpPage />} />
        {/* Add other routes here as needed */}
      </Routes>
    </Router>
  );
}

export default App;