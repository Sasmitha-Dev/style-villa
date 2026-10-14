/**
 * Shared utilities for Style Villa frontend
 */

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-');
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Generates an .ics calendar file and triggers client-side download.
 */
export function generateIcs(booking) {
  const checkInClean = booking.checkIn.replace(/-/g, '');
  const checkOutClean = booking.checkOut.replace(/-/g, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Style Villa Bentota//Room Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.reference}@stylevilla.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${checkInClean}`,
    `DTEND;VALUE=DATE:${checkOutClean}`,
    `SUMMARY:Stay at Style Villa (${booking.room.name})`,
    `DESCRIPTION:Reservation Ref: ${booking.reference}\\nTotal: $${booking.totalPrice}\\nCheck-in: 14:00\\nAddress: Polwatta, Dedduwa, Haburugala, 80500 Bentota, Sri Lanka`,
    'LOCATION:Style Villa, Polwatta, Dedduwa, Haburugala, 80500 Bentota, Sri Lanka',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `style-villa-${booking.reference}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
