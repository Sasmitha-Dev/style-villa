import { api } from './api.js';
import { loadRooms } from './rooms.js';
import { showToast, formatDate } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Header scroll effect
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    });
  }

  // 2. Mobile Menu Drawer
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-backdrop');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');

  function openDrawer() {
    if (drawer) drawer.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Close drawer on link click
  document.querySelectorAll('.mobile-menu-drawer a').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  // 3. Back to Top
  const backToTopBtn = document.querySelector('.js-backtotop');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 4. Hero compact booking bar date defaults
  const checkInInput = document.getElementById('bar-check-in');
  const checkOutInput = document.getElementById('bar-check-out');
  if (checkInInput && checkOutInput) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(today.getDate() + 3);

    checkInInput.min = tomorrow.toISOString().slice(0, 10);
    checkInInput.value = tomorrow.toISOString().slice(0, 10);

    checkOutInput.min = dayAfter.toISOString().slice(0, 10);
    checkOutInput.value = dayAfter.toISOString().slice(0, 10);

    checkInInput.addEventListener('change', () => {
      const nextDate = new Date(checkInInput.value);
      nextDate.setDate(nextDate.getDate() + 1);
      const minOut = nextDate.toISOString().slice(0, 10);
      checkOutInput.min = minOut;
      if (checkOutInput.value <= checkInInput.value) {
        checkOutInput.value = minOut;
      }
    });
  }

  // 5. Booking bar submit -> redirect to book.html
  const bookingBarForm = document.getElementById('hero-booking-bar');
  if (bookingBarForm) {
    bookingBarForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const inVal = checkInInput?.value;
      const outVal = checkOutInput?.value;
      const guestsVal = document.getElementById('bar-guests')?.value || '2';
      window.location.href = `book.html?checkIn=${inVal}&checkOut=${outVal}&adults=${guestsVal}`;
    });
  }

  // 6. Load room list on home page
  if (document.getElementById('rooms-container')) {
    loadRooms('rooms-container');
  }

  // 7. Load reviews and empty state
  loadPublicReviews();

  // 8. Review submission form handler
  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const guestName = document.getElementById('review-name').value;
      const rating = parseInt(document.getElementById('review-rating').value, 10);
      const comment = document.getElementById('review-comment').value;

      try {
        await api.submitReview({ guestName, rating, comment });
        showToast('Thank you! Your review was submitted for approval.', 'success');
        reviewForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to submit review.', 'error');
      }
    });
  }
});

async function loadPublicReviews() {
  const container = document.getElementById('reviews-list');
  const ratingAvgDisplay = document.getElementById('reviews-avg-rating');
  if (!container) return;

  try {
    const data = await api.getReviews();
    if (ratingAvgDisplay) {
      ratingAvgDisplay.textContent = data.averageRating > 0 ? `${data.averageRating} / 5` : 'New';
    }

    if (!data.reviews || data.reviews.length === 0) {
      container.innerHTML = `
        <div class="reviews-empty-state">
          <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h3 style="font-size: 1.25rem; font-weight: 500; margin-bottom: 0.5rem;">Be the first to share your experience!</h3>
          <p style="color: var(--muted); font-size: 0.9375rem;">
            We have recently opened our online guestbook. Stay with us and leave your impressions of Style Villa.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.reviews
      .map(
        (r) => `
        <div class="card" style="padding: 1.25rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong>${r.guest_name}</strong>
            <span style="color: var(--accent); font-weight: 600;">★ ${r.rating}/5</span>
          </div>
          <p style="color: var(--muted); font-size: 0.875rem; margin-bottom: 0.5rem;">${r.comment}</p>
          <small style="color: var(--muted); font-size: 0.75rem;">${formatDate(r.created_at.slice(0, 10))}</small>
        </div>
      `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<p style="color: var(--muted); text-align: center;">Unable to load reviews.</p>`;
  }
}
