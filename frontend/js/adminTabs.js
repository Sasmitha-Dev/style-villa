import { api } from './api.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

// Rooms Tab
export async function loadRoomsTable() {
  const container = document.getElementById('admin-rooms-list');
  if (!container) return;

  try {
    const rooms = await api.getAdminRooms();
    container.innerHTML = rooms
      .map(
        (r) => `
      <div class="card" style="padding: 1.25rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <img src="../${r.image_main}" alt="${r.name}" style="width: 80px; height: 60px; object-fit: cover; border-radius: var(--radius-sm);" onerror="this.src='../assets/images/room-1.jpg'" />
          <div>
            <h4 style="font-weight: 600;">${r.name}</h4>
            <small style="color: var(--muted);">${r.beds} &bull; ${r.max_guests} Guests &bull; ${r.size_sqm} m&sup2;</small>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <strong style="color: var(--primary);">${formatCurrency(r.price_per_night)} / night</strong>
          <span class="badge ${r.is_active ? 'badge-confirmed' : 'badge-cancelled'}">${r.is_active ? 'Active' : 'Inactive'}</span>
          <button class="btn btn-outline btn-sm edit-room-btn" data-id="${r.id}">Edit Price</button>
        </div>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('.edit-room-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id, 10);
        const room = rooms.find((r) => r.id === id);
        if (room) {
          const newPrice = prompt(`Enter new price per night for ${room.name} (USD):`, room.price_per_night);
          if (newPrice !== null && !isNaN(Number(newPrice)) && Number(newPrice) > 0) {
            api.saveAdminRoom(room.id, { ...room, price_per_night: Number(newPrice) })
              .then(() => { showToast('Room price updated!', 'success'); loadRoomsTable(); })
              .catch((err) => showToast(err.message, 'error'));
          }
        }
      });
    });
  } catch (err) { container.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`; }
}

// Blocked Dates Tab
export function initBlockedDatesTab() {
  document.getElementById('add-blocked-date-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = parseInt(document.getElementById('block-room-id').value, 10);
    const startDate = document.getElementById('block-start-date').value;
    const endDate = document.getElementById('block-end-date').value;
    const reason = document.getElementById('block-reason').value.trim();

    try {
      await api.createBlockedDate({ roomId, startDate, endDate, reason });
      showToast('Dates blocked successfully.', 'success');
      e.target.reset();
      loadBlockedDatesTable();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

export async function loadBlockedDatesTable() {
  const tbody = document.getElementById('blocked-dates-tbody');
  if (!tbody) return;

  try {
    const list = await api.getAdminBlockedDates();
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 1.5rem;">No dates currently blocked.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((b) => `
      <tr>
        <td><strong>${b.room_name}</strong></td>
        <td>${formatDate(b.start_date)}</td>
        <td>${formatDate(b.end_date)}</td>
        <td>${b.reason || 'Maintenance'}</td>
        <td><button class="btn btn-outline btn-sm delete-block-btn" data-id="${b.id}" style="color: var(--danger);">Delete</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.delete-block-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        if (confirm('Unblock these dates?')) {
          try {
            await api.deleteBlockedDate(e.currentTarget.dataset.id);
            showToast('Unblocked successfully.', 'success');
            loadBlockedDatesTable();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  } catch (err) { tbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger);">${err.message}</td></tr>`; }
}

// Reviews Tab
export async function loadReviewsTable() {
  const tbody = document.getElementById('reviews-tbody');
  if (!tbody) return;

  try {
    const reviews = await api.getAdminReviews();
    if (reviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 1.5rem;">No reviews submitted yet.</td></tr>';
      return;
    }
    tbody.innerHTML = reviews.map((r) => `
      <tr>
        <td><strong>${r.guest_name}</strong></td>
        <td>★ ${r.rating}/5</td>
        <td>${r.comment}</td>
        <td><span class="badge ${r.is_published ? 'badge-confirmed' : 'badge-pending'}">${r.is_published ? 'Published' : 'Pending'}</span></td>
        <td>${formatDate(r.created_at.slice(0, 10))}</td>
        <td>
          <button class="btn btn-outline btn-sm toggle-review-btn" data-id="${r.id}" data-publish="${r.is_published ? 0 : 1}">${r.is_published ? 'Unpublish' : 'Approve'}</button>
          <button class="btn btn-outline btn-sm delete-review-btn" data-id="${r.id}" style="color: var(--danger);">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.toggle-review-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        try {
          await api.toggleReviewPublish(e.currentTarget.dataset.id, parseInt(e.currentTarget.dataset.publish, 10));
          showToast('Review status updated.', 'success');
          loadReviewsTable();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    tbody.querySelectorAll('.delete-review-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        if (confirm('Delete this review permanently?')) {
          try {
            await api.deleteReview(e.currentTarget.dataset.id);
            showToast('Review deleted.', 'success');
            loadReviewsTable();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  } catch (err) { tbody.innerHTML = `<tr><td colspan="6" style="color: var(--danger);">${err.message}</td></tr>`; }
}

// Settings Tab
export function initSettingsTab() {
  document.getElementById('admin-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      contact_phone: document.getElementById('set-phone').value,
      contact_email: document.getElementById('set-email').value,
      location_address: document.getElementById('set-address').value,
      cancellation_policy: document.getElementById('set-cancellation').value
    };
    try {
      await api.updateAdminSettings(payload);
      showToast('Settings saved successfully.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

export async function loadSettingsForm() {
  try {
    const s = await api.getAdminSettings();
    if (document.getElementById('set-phone')) document.getElementById('set-phone').value = s.contact_phone || '';
    if (document.getElementById('set-email')) document.getElementById('set-email').value = s.contact_email || '';
    if (document.getElementById('set-address')) document.getElementById('set-address').value = s.location_address || '';
    if (document.getElementById('set-cancellation')) document.getElementById('set-cancellation').value = s.cancellation_policy || '';
  } catch (err) { showToast(err.message, 'error'); }
}
