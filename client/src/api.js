// client/src/api.js

import axios from "axios";

// Use LOCAL during development, replace with Fly.io URL during production
const API_BASE = "http://localhost:8080/api";

export const fetchProfiles = async () => {
    const response = await axios.get(`${API_BASE}/profiles`);
    return response.data;
};

export const addProfile = async (profile) => {
    const response = await axios.post(`${API_BASE}/profiles`, profile);
    return response.data;
};
