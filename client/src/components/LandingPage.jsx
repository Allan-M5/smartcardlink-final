import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfiles, addProfile } from "../api";

function LandingPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const handleFetchProfiles = async () => {
    try {
      const data = await fetchProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleAddProfile = async () => {
    if (!form.name || !form.email || !form.phone) {
      alert("Please fill in all fields.");
      return;
    }
    try {
      await addProfile(form);
      setForm({ name: "", email: "", phone: "" });
      handleFetchProfiles(); // Refresh the list
    } catch (error) {
      console.error('Error adding profile:', error);
    }
  };

  return (
    <div className="popup1-container">
      <h1>Welcome to SmartCardLink</h1>
      <p>This is your landing page (popup1) content.</p>
      <button onClick={() => navigate("/more-info")}>More Info</button>
      <button onClick={handleFetchProfiles}>Fetch Profiles</button>

      <h2>Add New Profile</h2>
      <input
        type="text"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="text"
        placeholder="Phone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <button onClick={handleAddProfile}>Add Profile</button>

      <ul>
        {profiles.map((profile, index) => (
          <li key={index}>{profile.name} - {profile.email} - {profile.phone}</li>
        ))}
      </ul>
    </div>
  );
}

export default LandingPage;
