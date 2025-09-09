// src/App.js
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import logo from "./assets/pic.png";
import ProtectedRoute from "./components/ProtectedRoute";
import CashierPage from "./pages/CashierPage";
import DailySummaryPage from "./pages/DailySummaryPage";
import FeedbacksPage from "./pages/FeedbacksPage";
import MenuManagementPage from "./pages/MenuManagementPage";
import MenuPage from "./pages/MenuPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import QrPage from "./pages/QrPages";
import TaxManagementPage from "./pages/TaxManagementPage";
function App(){
  return (
    <Router>
      <header className="header">
        <img src={logo} alt="Bunkers Bell Logo" className="logo" />
        Bunkers Bell
      </header>
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cashier" element={<CashierPage />} />
          <Route path="/menu-management" element={<ProtectedRoute><MenuManagementPage /></ProtectedRoute> } />
          <Route path="/qr" element={<QrPage />} />
          <Route path="/track/:orderId" element={<OrderTrackingPage />} />
          <Route path="/tax-management" element={<ProtectedRoute><TaxManagementPage /></ProtectedRoute> } />
          <Route path="/feedbacks" element={<FeedbacksPage />} />
          <Route path="/daily-summary" element={<ProtectedRoute><DailySummaryPage /></ProtectedRoute> } />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
