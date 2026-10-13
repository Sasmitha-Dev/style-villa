import { api, setAdminToken, clearAdminToken, getAdminToken } from './api.js';
import { ensureSupabase } from './supabaseClient.js';
import { formatCurrency, formatDate, showToast } from './utils.js';
import {
  loadRoomsTable,
  initBlockedDatesTab,
  loadBlockedDatesTable,
  loadReviewsTable,
  initSettingsTab,
  loadSettingsForm
} from './adminTabs.js';

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('login.html')) {
    initAdminLogin();
  } else {
    initAdminDashboard();
  }
});

function initAdminLogin() {
  document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn');

    if (errorEl) errorEl.textContent = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div> Signing in...';
    }

    try {
      const data = await api.adminLogin({ email, password });
      setAdminToken(data.token);
      showToast('Signed in successfully!', 'success');
      window.location.href = 'dashboard.html';
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
      }
      if (errorEl) errorEl.textContent = err.message || 'Invalid credentials';
    }
  });
}

async function initAdminDashboard() {
  if (!getAdminToken()) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    clearAdminToken();
    window.location.href = 'login.html';
  });

  document.querySelectorAll('.admin-nav-item').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.dataset.target);
    });
  });

  document.getElementById('btn-refresh-overview')?.addEventListener('click', () => {
    loadOverviewStats();
    showToast('Overview refreshed.', 'info', 2000);
  });

  document.getElementById('btn-refresh-bookings')?.addEventListener('click', () => {
    loadBookingsTable();
    showToast('Reservations refreshed.', 'info', 2000);
  });

  loadOverviewStats();
  initBookingsTab();
  initBlockedDatesTab();
  initSettingsTab();

  // Cross-device live sync: Subscribe to Supabase database changes
  try {
    const client = await ensureSupabase();
    if (client && client.channel) {
      client.channel('admin-live-bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          loadOverviewStats();
          const bookingsPane = document.getElementById('tab-bookings');
          if (bookingsPane && bookingsPane.style.display !== 'none') {
            loadBookingsTable();
          }
        })
        .subscribe();
    }
  } catch (e) {
    console.warn('Realtime channel warning:', e);
  }

  // Cross-device background polling (every 8 seconds) so changes made on other devices appear automatically
  setInterval(() => {
    const overviewPane = document.getElementById('tab-overview');
    if (overviewPane && overviewPane.style.display !== 'none') {
      loadOverviewStats();
    }
    const bookingsPane = document.getElementById('tab-bookings');
    if (bookingsPane && bookingsPane.style.display !== 'none') {
      loadBookingsTable();
    }
  }, 8000);
}

function switchTab(tabId) {
  document.querySelectorAll('.admin-tab-pane').forEach((p) => (p.style.display = 'none'));
  document.querySelectorAll('.admin-nav-item').forEach((i) => i.classList.remove('is-active'));

  const targetPane = document.getElementById(`tab-${tabId}`);
  const targetNav = document.querySelector(`.admin-nav-item[data-target="${tabId}"]`);
  if (targetPane) targetPane.style.display = 'block';
  if (targetNav) targetNav.classList.add('is-active');

  if (tabId === 'overview') loadOverviewStats();
  if (tabId === 'bookings') loadBookingsTable();
  if (tabId === 'rooms') loadRoomsTable();
  if (tabId === 'blocked') loadBlockedDatesTable();
  if (tabId === 'reviews') loadReviewsTable();
  if (tabId === 'settings') loadSettingsForm();
}

async function loadOverviewStats() {
  try {
    const stats = await api.getAdminStats();
    document.getElementById('stat-arrivals').textContent = stats.arrivalsToday;
    document.getElementById('stat-departures').textContent = stats.departuresToday;
    document.getElementById('stat-occupancy').textContent = `${stats.occupancyRatePercent}%`;
    document.getElementById('stat-revenue').textContent = formatCurrency(stats.monthlyRevenue);
    document.getElementById('stat-pending').textContent = stats.pendingBookings;

    // Check Supabase database connectivity
    if (api.checkDatabaseConnection) {
      const dbStatus = await api.checkDatabaseConnection();
      const dbDot = document.getElementById('db-status-dot');
      const dbTitle = document.getElementById('db-status-title');
      const dbDesc = document.getElementById('db-status-desc');
      const dbBtn = document.getElementById('btn-open-sql-editor');

      if (dbStatus.tablesExist) {
        if (dbDot) dbDot.style.background = '#22c55e';
        if (dbTitle) dbTitle.textContent = 'Database: Supabase Connected & Synchronized';
        if (dbDesc) dbDesc.textContent = 'Tables verified and active in Supabase.';
        if (dbBtn) dbBtn.style.display = 'none';
      } else {
        if (dbDot) dbDot.style.background = '#f59e0b';
        if (dbTitle) dbTitle.textContent = 'Database: Operating with Built-in Fallback Catalog';
        if (dbDesc) dbDesc.textContent = dbStatus.message;
        if (dbBtn) dbBtn.style.display = 'inline-block';
      }
    }
  } catch (err) {
    showToast('Failed to load stats: ' + err.message, 'error');
  }
}

function initBookingsTab() {
  document.getElementById('booking-search-input')?.addEventListener('input', () => loadBookingsTable());
  document.getElementById('booking-status-filter')?.addEventListener('change', () => loadBookingsTable());
}

async function loadBookingsTable() {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;

  const search = document.getElementById('booking-search-input')?.value || '';
  const status = document.getElementById('booking-status-filter')?.value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const data = await api.getAdminBookings(params.toString());
    if (data.bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--muted);">No bookings found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.bookings
      .map(
        (b) => `
      <tr class="table-row">
        <td data-label="Reference"><strong>${b.reference}</strong></td>
        <td data-label="Guest"><div>${b.guest_name}</div><small style="color: var(--muted);">${b.guest_email}</small></td>
        <td data-label="Room">${b.room_name}</td>
        <td data-label="Dates">${formatDate(b.check_in)} - ${formatDate(b.check_out)}</td>
        <td data-label="Total">${formatCurrency(b.total_price)}</td>
        <td data-label="Status"><span class="badge badge-${b.status}">${b.status}</span></td>
        <td data-label="Actions">
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            ${b.status === 'pending' ? `<button class="btn btn-primary btn-sm status-btn" data-id="${b.id}" data-status="confirmed">Confirm</button>` : ''}
            ${b.status !== 'cancelled' ? `<button class="btn btn-outline btn-sm status-btn" data-id="${b.id}" data-status="cancelled" style="color: var(--danger);">Cancel</button>` : ''}
            ${b.status === 'confirmed' ? `<button class="btn btn-outline btn-sm status-btn" data-id="${b.id}" data-status="completed">Complete</button>` : ''}
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    tbody.querySelectorAll('.status-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const newStatus = e.currentTarget.dataset.status;
        if (confirm(`Change reservation status to "${newStatus}"?`)) {
          try {
            await api.updateBookingStatus(id, newStatus);
            showToast(`Reservation updated to ${newStatus}.`, 'success');
            loadBookingsTable();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger); text-align:center;">${err.message}</td></tr>`;
  }
}
