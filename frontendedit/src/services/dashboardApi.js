// src/services/dashboardApi.js

const BASE_URL = "http://localhost:8000/dashboard";

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
