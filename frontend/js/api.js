/**
 * API client module for Style Villa
 */

const API_BASE = window.location.port === '4000' || window.location.pathname.startsWith('/api')
  ? '/api'
  : 'http://localhost:4000/api';

export function getAdminToken() {
  return sessionStorage.getItem('style_villa_admin_jwt');
}

export function setAdminToken(token) {
  sessionStorage.setItem('style_villa_admin_jwt', token);
}

export function clearAdminToken() {
  sessionStorage.removeItem('style_villa_admin_jwt');
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAdminToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && window.location.pathname.includes('/admin/dashboard')) {
      clearAdminToken();
      window.location.href = 'login.html';
    }
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = json?.error?.code;
    err.fields = json?.error?.fields;
    throw err;
  }

  return json.data;
}

export const api = {
  // Public
  getSettings: () => request('/settings/public'),
  getRooms: () => request('/rooms'),
  getRoomBySlug: (slug) => request(`/rooms/${slug}`),
  checkAvailability: ({ checkIn, checkOut, adults = 1, children = 0 }) =>
    request(`/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`),
  createBooking: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getBooking: (reference, email) =>
    request(`/bookings/${reference}${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  getReviews: () => request('/reviews'),
  submitReview: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // Auth & Admin
  adminLogin: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getAdminStats: () => request('/admin/stats'),
  getAdminBookings: (params = '') => request(`/admin/bookings${params ? `?${params}` : ''}`),
  updateBookingStatus: (id, status) =>
    request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAdminRooms: () => request('/admin/rooms'),
  saveAdminRoom: (id, room) =>
    id
      ? request(`/admin/rooms/${id}`, { method: 'PUT', body: JSON.stringify(room) })
      : request('/admin/rooms', { method: 'POST', body: JSON.stringify(room) }),
  getAdminBlockedDates: () => request('/admin/blocked-dates'),
  createBlockedDate: (data) => request('/admin/blocked-dates', { method: 'POST', body: JSON.stringify(data) }),
  deleteBlockedDate: (id) => request(`/admin/blocked-dates/${id}`, { method: 'DELETE' }),
  getAdminReviews: () => request('/admin/reviews'),
  toggleReviewPublish: (id, isPublished) =>
    request(`/admin/reviews/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ isPublished }) }),
  deleteReview: (id) => request(`/admin/reviews/${id}`, { method: 'DELETE' }),
  getAdminSettings: () => request('/admin/settings'),
  updateAdminSettings: (data) => request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) })
};
