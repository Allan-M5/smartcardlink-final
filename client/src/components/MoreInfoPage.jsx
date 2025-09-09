import React from "react";
import { useNavigate } from "react-router-dom";
 // optional if you want to separate styles

function MoreInfoPage() {
  const navigate = useNavigate();

  return (
    <div className="popup2-container">
      <h1>More Info</h1>
      <p>This is your More Info page (popup2) content.</p>
      <button onClick={() => navigate("/")}>Back</button>
    </div>
  );
}

export default MoreInfoPage;
