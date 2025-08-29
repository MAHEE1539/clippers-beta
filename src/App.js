// src/App.js
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import logo from "./assets/pic.png";
import CashierPage from "./pages/CashierPage";
import MenuManagementPage from "./pages/MenuManagementPage";
import MenuPage from "./pages/MenuPage";
import QrPage from "./pages/QrPages";
function App(){
  return (
    <Router>
      <header className="header">
        <img src={logo} alt="Bunkers Bell Logo" className="logo" />
        Bunkers Bell
      </header>
      <div className="container">
        {/* Top links for testing only - remove or hide in production */}
        {/* <nav style={{ marginBottom: 16 }}>
          <Link to="/menu" style={{ marginRight: 12 }}>Menu</Link>
          <Link to="/cashier">Cashier</Link>
        </nav> */}

        <Routes>
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cashier" element={<CashierPage />} />
          <Route path="/menu-management" element={<MenuManagementPage />} />
          <Route path="/qr" element={<QrPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
