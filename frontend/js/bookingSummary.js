import { formatCurrency, formatDate } from './utils.js';

export function updateStickySummary(bookingState) {
  const summaryEl = document.getElementById('booking-summary-content');
  if (!summaryEl) return;

  if (!bookingState.selectedRoom) {
    summaryEl.innerHTML = `
      <p style="color: var(--muted); font-size: 0.875rem;">Select dates and a room to review your stay breakdown.</p>
    `;
    return;
  }

  const room = bookingState.selectedRoom;
  summaryEl.innerHTML = `
    <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
      <img src="${room.image_main}" alt="${room.name}" style="width: 72px; height: 56px; object-fit: cover; border-radius: var(--radius-sm);" />
      <div>
        <h4 style="font-size: 0.95rem; font-weight: 600;">${room.name}</h4>
        <span style="font-size: 0.8125rem; color: var(--muted);">${room.beds}</span>
      </div>
    </div>
    <div style="border-top: 1px solid var(--border); padding-top: 0.75rem; font-size: 0.875rem; display: flex; flex-direction: column; gap: 0.4rem;">
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--muted);">Check-in:</span>
        <strong>${formatDate(bookingState.checkIn)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--muted);">Check-out:</span>
        <strong>${formatDate(bookingState.checkOut)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--muted);">Duration:</span>
        <span>${room.pricing.nights} nights</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--muted);">Guests:</span>
        <span>${bookingState.adults} Adults${bookingState.children ? `, ${bookingState.children} Children` : ''}</span>
      </div>
      <div style="border-top: 1px dashed var(--border); margin-top: 0.5rem; padding-top: 0.5rem; display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 600;">
        <span>Total:</span>
        <span style="color: var(--primary);">${formatCurrency(room.pricing.totalPrice, room.currency)}</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--muted); margin-top: 0.25rem;">
        Payment: Pay at the hotel upon arrival
      </div>
    </div>
  `;
}
