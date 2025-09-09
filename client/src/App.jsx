import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import MoreInfoPage from "./components/MoreInfoPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/more-info" element={<MoreInfoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
