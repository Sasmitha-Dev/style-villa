import { api } from './api.js';
import { formatCurrency, showToast } from './utils.js';
import { updateStickySummary } from './bookingSummary.js';

let bookingState = {
  step: 1,
  checkIn: '',
  checkOut: '',
  adults: 2,
  children: 0,
  selectedRoom: null,
  availableRooms: []
};

document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('style_villa_booking_flow');
  if (saved) {
    try { bookingState = { ...bookingState, ...JSON.parse(saved) }; } catch {}
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('checkIn')) bookingState.checkIn = urlParams.get('checkIn');
  if (urlParams.get('checkOut')) bookingState.checkOut = urlParams.get('checkOut');
  if (urlParams.get('adults')) bookingState.adults = parseInt(urlParams.get('adults'), 10);
  if (urlParams.get('children')) bookingState.children = parseInt(urlParams.get('children'), 10);
  const preselectedRoomSlug = urlParams.get('room');

  if (!bookingState.checkIn || !bookingState.checkOut) {
    const today = new Date();
    const inDate = new Date();
    inDate.setDate(today.getDate() + 1);
    const outDate = new Date();
    outDate.setDate(today.getDate() + 4);
    bookingState.checkIn = inDate.toISOString().slice(0, 10);
    bookingState.checkOut = outDate.toISOString().slice(0, 10);
  }

  bindEvents(preselectedRoomSlug);
  renderStep(bookingState.step);
});

function saveState() {
  sessionStorage.setItem('style_villa_booking_flow', JSON.stringify(bookingState));
}

function bindEvents(preselectedRoomSlug) {
  const inInput = document.getElementById('book-check-in');
  const outInput = document.getElementById('book-check-out');
  const adultsSelect = document.getElementById('book-adults');
  const childrenSelect = document.getElementById('book-children');

  if (inInput) inInput.value = bookingState.checkIn;
  if (outInput) outInput.value = bookingState.checkOut;
  if (adultsSelect) adultsSelect.value = bookingState.adults;
  if (childrenSelect) childrenSelect.value = bookingState.children;

  document.getElementById('step-1-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    bookingState.checkIn = inInput.value;
    bookingState.checkOut = outInput.value;
    bookingState.adults = parseInt(adultsSelect.value, 10);
    bookingState.children = parseInt(childrenSelect.value, 10);
    saveState();
    await fetchAvailableRooms(preselectedRoomSlug);
    goToStep(2);
  });

  document.getElementById('step-3-form')?.addEventListener('submit', handleBookingSubmit);

  document.querySelectorAll('[data-action="prev-step"]').forEach((btn) => {
    btn.addEventListener('click', () => goToStep(bookingState.step - 1));
  });
}

async function fetchAvailableRooms(autoSelectSlug = null) {
  const container = document.getElementById('available-rooms-list');
  if (container) {
    container.innerHTML = '<div style="text-align: center; padding: 3rem;"><div class="spinner"></div><p style="margin-top: 1rem; color: var(--muted);">Checking room availability...</p></div>';
  }

  try {
    const data = await api.checkAvailability({
      checkIn: bookingState.checkIn,
      checkOut: bookingState.checkOut,
      adults: bookingState.adults,
      children: bookingState.children
    });

    bookingState.availableRooms = data.availableRooms;
    saveState();
    renderAvailableRooms();

    if (autoSelectSlug) {
      const match = bookingState.availableRooms.find((r) => r.slug === autoSelectSlug);
      if (match) selectRoom(match);
    }
  } catch (err) {
    if (container) container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--danger);">${err.message}</div>`;
  }
}

function renderAvailableRooms() {
  const container = document.getElementById('available-rooms-list');
  if (!container) return;

  if (bookingState.availableRooms.length === 0) {
    container.innerHTML = `
      <div class="card" style="padding: 3rem; text-align: center;">
        <h3 style="margin-bottom: 0.5rem;">No rooms available</h3>
        <p style="color: var(--muted); margin-bottom: 1.5rem;">All rooms are booked for your selected dates. Please adjust your dates or party size.</p>
        <button type="button" class="btn btn-outline btn-sm" id="btn-adjust-dates">Change Dates</button>
      </div>
    `;
    document.getElementById('btn-adjust-dates')?.addEventListener('click', () => goToStep(1));
    return;
  }

  container.innerHTML = bookingState.availableRooms
    .map((room) => {
      const isSelected = bookingState.selectedRoom?.id === room.id;
      return `
      <div class="card card-hoverable" style="display: flex; gap: 1rem; padding: 1.25rem; border: ${isSelected ? '2px solid var(--primary)' : '1px solid var(--border)'}; margin-bottom: 1rem;">
        <img src="${room.image_main}" alt="${room.name}" style="width: 140px; height: 110px; object-fit: cover; border-radius: var(--radius-sm);" />
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between;">
            <h4 style="font-weight: 600;">${room.name}</h4>
            <span style="font-weight: 700; color: var(--primary);">${formatCurrency(room.pricing.totalPrice, room.currency)}</span>
          </div>
          <p style="color: var(--muted); font-size: 0.8125rem; margin: 0.25rem 0;">${room.beds} &bull; Up to ${room.max_guests} guests &bull; ${room.size_sqm} m&sup2;</p>
          <button type="button" class="btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-sm select-room-btn" data-room-id="${room.id}" style="margin-top: 0.5rem;">
            ${isSelected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  container.querySelectorAll('.select-room-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const roomId = parseInt(e.currentTarget.dataset.roomId, 10);
      const room = bookingState.availableRooms.find((r) => r.id === roomId);
      if (room) {
        selectRoom(room);
        goToStep(3);
      }
    });
  });
}

function selectRoom(room) {
  bookingState.selectedRoom = room;
  saveState();
  updateStickySummary(bookingState);
}

function goToStep(stepNum) {
  bookingState.step = stepNum;
  saveState();
  renderStep(stepNum);
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

function renderStep(stepNum) {
  document.querySelectorAll('.step-section').forEach((sec) => (sec.style.display = 'none'));
  const current = document.getElementById(`step-${stepNum}-section`);
  if (current) current.style.display = 'block';

  document.querySelectorAll('.progress-step').forEach((p, idx) => {
    p.className = idx + 1 < stepNum ? 'progress-step is-completed' : idx + 1 === stepNum ? 'progress-step is-active' : 'progress-step';
  });
  updateStickySummary(bookingState);
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-booking-btn');
  const errEl = document.getElementById('step-3-error');
  if (errEl) errEl.innerHTML = '';

  const guest = {
    fullName: document.getElementById('guest-name').value.trim(),
    email: document.getElementById('guest-email').value.trim(),
    phone: document.getElementById('guest-phone').value.trim(),
    country: document.getElementById('guest-country').value.trim()
  };
  const specialRequests = document.getElementById('guest-requests')?.value.trim();

  if (!document.getElementById('agree-terms')?.checked) {
    showToast('Please accept the booking terms to continue.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> Processing reservation...';
  }

  try {
    const res = await api.createBooking({
      roomId: bookingState.selectedRoom.id,
      checkIn: bookingState.checkIn,
      checkOut: bookingState.checkOut,
      adults: bookingState.adults,
      children: bookingState.children,
      guest,
      specialRequests
    });
    sessionStorage.removeItem('style_villa_booking_flow');
    showToast('Booking successfully confirmed!', 'success');
    window.location.href = `confirmation.html?ref=${res.reference}`;
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Complete Reservation';
    }
    if (err.status === 409) {
      showToast('This room was just booked for these dates. Please choose another room.', 'error', 6000);
      setTimeout(() => goToStep(2), 2000);
    } else {
      showToast(err.message || 'Booking submission failed.', 'error');
    }
  }
}
