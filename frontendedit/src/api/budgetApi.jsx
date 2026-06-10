import { useState, useEffect } from 'react';
const API_BASE =   "https://kharchaguru-0cgi.onrender.com";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token")}`,
});
const budgetAPI = {
  async fetchCategories() {
    const res = await fetch(`${API_BASE}/budgets/categories`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  },
  async fetchBudgets() {
    const res = await fetch(`${API_BASE}/budgets/`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch budgets");
    return res.json();
  },
  async createBudget(payload) {
    const res = await fetch(`${API_BASE}/budgets/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create budget");
    }
    return res.json();},
  async deleteBudget(id) {
    const res = await fetch(`${API_BASE}/budgets/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete budget");
  }
};