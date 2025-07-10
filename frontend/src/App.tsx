import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CatProfilePage from './pages/CatProfilePage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cats/:id" element={<CatProfilePage />} />
        {/* Add other routes here as needed */}
      </Routes>
    </Router>
  );
}

export default App;