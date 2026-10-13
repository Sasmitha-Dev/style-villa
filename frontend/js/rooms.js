import { api } from './api.js';
import { formatCurrency } from './utils.js';

export function renderRoomCard(room) {
  const images = Array.isArray(room.images) ? room.images : [];
  const mainImg = room.image_main || (images.length > 0 ? images[0] : 'assets/images/room-1.jpg');
  const amenities = Array.isArray(room.amenities) ? room.amenities.slice(0, 3) : [];

  return `
    <article class="card card-hoverable room-card" id="room-${room.slug}">
      <div class="room-card-img-wrap">
        <img
          src="${mainImg}"
          alt="${room.name}"
          class="room-card-img"
          loading="lazy"
          width="400"
          height="240"
          onerror="this.src='assets/images/room-1.jpg'"
        />
      </div>
      <div class="room-card-body">
        <div class="room-meta">
          <span>${room.max_guests} Guests</span>
          <span>&bull;</span>
          <span>${room.size_sqm} m&sup2;</span>
          <span>&bull;</span>
          <span>${room.beds}</span>
        </div>
        <h3 class="room-title" style="font-size: 1.15rem; font-weight: 600;">${room.name}</h3>
        <p class="room-desc" style="color: var(--muted); font-size: 0.875rem; line-height: 1.5;">
          ${room.description}
        </p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: auto;">
          ${amenities.map((a) => `<span class="badge badge-accent" style="font-size: 0.7rem;">${a}</span>`).join('')}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
          <div>
            <span class="room-price">${formatCurrency(room.price_per_night, room.currency)}</span>
            <span style="font-size: 0.75rem; color: var(--muted);">/ night</span>
          </div>
          <a href="book.html?room=${room.slug}" class="btn btn-primary btn-sm" id="book-btn-${room.slug}">
            Select Room
          </a>
        </div>
      </div>
    </article>
  `;
}

export function renderSkeletons(container, count = 6) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="card" style="height: 380px; display: flex; flex-direction: column; overflow: hidden;">
        <div class="skeleton" style="height: 200px; width: 100%;"></div>
        <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; flex: 1;">
          <div class="skeleton" style="height: 16px; width: 40%;"></div>
          <div class="skeleton" style="height: 24px; width: 75%;"></div>
          <div class="skeleton" style="height: 48px; width: 100%;"></div>
          <div class="skeleton" style="height: 36px; width: 50%; margin-top: auto;"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

export async function loadRooms(containerId = 'rooms-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  renderSkeletons(container, 6);

  try {
    const rooms = await api.getRooms();
    if (!rooms || rooms.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <p style="color: var(--muted);">No rooms currently available.</p>
        </div>
      `;
      return;
    }
    container.innerHTML = rooms.map(renderRoomCard).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border);">
        <p style="color: var(--danger); margin-bottom: 1rem;">Failed to load accommodations.</p>
        <button class="btn btn-outline btn-sm" id="retry-rooms-btn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById('retry-rooms-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => loadRooms(containerId));
    }
  }
}
