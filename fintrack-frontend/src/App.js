import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Bills from './pages/Bills';
import Goals from './pages/Goals';
import Buddy from './pages/Buddy';
import Analytics from './pages/Analytics'
import Predict from './pages/Predict'
import Insights from './pages/Insights'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/buddy" element={<Buddy />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/insights" element={<Insights />} />
      </Routes>
    </BrowserRouter>
  );
}