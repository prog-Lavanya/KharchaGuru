// src/services/dashboardApi.js

const BASE_URL = "https://kharchaguru-0cgi.onrender.com/dashboard";

export const fetchDashboard = async (token) => {
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  return response.json();
};
