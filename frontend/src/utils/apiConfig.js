/**
 * apiConfig.js
 * URL backend dipusatkan di sini. Saat production (deploy), isi env var
 * VITE_API_URL (misalnya di Render: https://nama-backend.onrender.com).
 * Saat development lokal, otomatis fallback ke http://localhost:5000.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';