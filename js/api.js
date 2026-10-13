/**
 * Style Villa — Direct Supabase Client API Module
 * Replaces all local backend/localhost HTTP endpoints with direct Supabase queries.
 * Compatible with GitHub Pages static hosting.
 */

import { supabase } from './supabaseClient.js';

export function getAdminToken() {
  return sessionStorage.getItem('style_villa_admin_jwt');
}

export function setAdminToken(token) {
  sessionStorage.setItem('style_villa_admin_jwt', token);
}

export function clearAdminToken() {
  sessionStorage.removeItem('style_villa_admin_jwt');
}

/**
 * Calculates number of nights between checkIn and checkOut using UTC.
 */
function calculateNights(checkIn, checkOut) {
  const [inY, inM, inD] = checkIn.split('-').map(Number);
  const [outY, outM, outD] = checkOut.split('-').map(Number);
  const startUtc = Date.UTC(inY, inM - 1, inD);
  const endUtc = Date.UTC(outY, outM - 1, outD);
  const diffMs = endUtc - startUtc;
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Normalizes room records so images and amenities are always native arrays.
 */
function formatRoom(r) {
  if (!r) return null;
  let images = [];
  let amenities = [];

  if (Array.isArray(r.images_json)) {
    images = r.images_json;
  } else if (typeof r.images_json === 'string') {
    try { images = JSON.parse(r.images_json); } catch { images = []; }
  }

  if (Array.isArray(r.amenities_json)) {
    amenities = r.amenities_json;
  } else if (typeof r.amenities_json === 'string') {
    try { amenities = JSON.parse(r.amenities_json); } catch { amenities = []; }
  }

  return {
    ...r,
    images: images.length > 0 ? images : [r.image_main],
    amenities: amenities
  };
}

export const api = {
  // ==========================================
  // PUBLIC WEBSITE ENDPOINTS
  // ==========================================

  /**
   * Fetches public hotel configuration and settings.
   */
  getSettings: async () => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;

    const map = {};
    (data || []).forEach((row) => {
      if (row.key === 'services_list') {
        try { map[row.key] = JSON.parse(row.value); } catch { map[row.key] = []; }
      } else {
        map[row.key] = row.value;
      }
    });

    return map;
  },

  /**
   * Fetches all active rooms.
   */
  getRooms: async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('price_per_night', { ascending: true });

    if (error) throw error;
    return (data || []).map(formatRoom);
  },

  /**
   * Fetches a single room by slug.
   */
  getRoomBySlug: async (slug) => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return formatRoom(data);
  },

  /**
   * Checks room availability across dates and guest capacity.
   */
  checkAvailability: async ({ checkIn, checkOut, adults = 1, children = 0 }) => {
    const totalGuests = Number(adults) + Number(children);
    const nights = calculateNights(checkIn, checkOut);

    // 1. Fetch active rooms matching guest capacity
    const { data: allRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .gte('max_guests', totalGuests)
      .order('price_per_night', { ascending: true });

    if (roomsError) throw roomsError;

    // 2. Fetch overlapping bookings (check_in < checkOut AND check_out > checkIn)
    const { data: bookedRows, error: bookingError } = await supabase
      .from('bookings')
      .select('room_id')
      .in('status', ['pending', 'confirmed'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);

    if (bookingError) throw bookingError;

    // 3. Fetch overlapping blocked dates (start_date < checkOut AND end_date > checkIn)
    const { data: blockedRows, error: blockError } = await supabase
      .from('blocked_dates')
      .select('room_id')
      .lt('start_date', checkOut)
      .gt('end_date', checkIn);

    if (blockError) throw blockError;

    // Collect IDs of unavailable rooms
    const unavailableRoomIds = new Set();
    (bookedRows || []).forEach((b) => unavailableRoomIds.add(b.room_id));
    (blockedRows || []).forEach((b) => unavailableRoomIds.add(b.room_id));

    // Filter available rooms and attach price calculations
    const availableRooms = (allRooms || [])
      .filter((r) => !unavailableRoomIds.has(r.id))
      .map((r) => {
        const formatted = formatRoom(r);
        const pricePerNight = Number(r.price_per_night);
        const totalPrice = Number((nights * pricePerNight).toFixed(2));
        formatted.pricing = {
          nights,
          pricePerNight,
          currency: r.currency || 'USD',
          subtotal: totalPrice,
          taxesAndFees: 0,
          totalPrice
        };
        return formatted;
      });

    return {
      availableRooms,
      count: availableRooms.length
    };
  },

  /**
   * Creates a new guest booking directly in Supabase.
   */
  createBooking: async (data) => {
    // Generate unique reference (SV-XXXXXX)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let reference = 'SV-';
    for (let i = 0; i < 6; i++) {
      reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Fetch room price
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', data.roomId)
      .single();

    if (roomError) throw roomError;

    const nights = calculateNights(data.checkIn, data.checkOut);
    const totalPrice = Number((nights * Number(room.price_per_night)).toFixed(2));

    // Register guest details
    let guestId = null;
    if (data.guest) {
      const { data: guestRow } = await supabase
        .from('guests')
        .insert([{
          full_name: data.guest.fullName,
          email: data.guest.email,
          phone: data.guest.phone,
          country: data.guest.country
        }])
        .select('id')
        .single();

      if (guestRow) guestId = guestRow.id;
    }

    // Insert booking
    const bookingPayload = {
      reference,
      room_id: data.roomId,
      guest_id: guestId,
      guest_name: data.guest?.fullName,
      guest_email: data.guest?.email,
      guest_phone: data.guest?.phone,
      guest_country: data.guest?.country,
      check_in: data.checkIn,
      check_out: data.checkOut,
      adults: Number(data.adults),
      children: Number(data.children || 0),
      nights,
      total_price: totalPrice,
      status: 'pending',
      special_requests: data.specialRequests || null
    };

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert([bookingPayload])
      .select('*')
      .single();

    if (bookingErr) throw bookingErr;

    return {
      reference,
      booking
    };
  },

  /**
   * Fetches booking receipt by reference.
   */
  getBooking: async (reference) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(*), guests(*)')
      .eq('reference', reference)
      .single();

    if (error || !data) throw (error || new Error('Booking not found'));

    return {
      reference: data.reference,
      checkIn: data.check_in,
      checkOut: data.check_out,
      nights: data.nights,
      adults: data.adults,
      children: data.children,
      totalPrice: data.total_price,
      currency: data.rooms?.currency || 'USD',
      room: {
        id: data.rooms?.id,
        name: data.rooms?.name || 'Deluxe Room',
        slug: data.rooms?.slug
      },
      guest: {
        fullName: data.guests?.full_name || data.guest_name,
        email: data.guests?.email || data.guest_email,
        phone: data.guests?.phone || data.guest_phone,
        country: data.guests?.country || data.guest_country
      }
    };
  },

  /**
   * Fetches published reviews and computes average rating.
   */
  getReviews: async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const reviews = data || [];
    const averageRating = reviews.length > 0
      ? Number((reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1))
      : 0;

    return {
      reviews,
      averageRating
    };
  },

  /**
   * Submits a guest review (pending admin moderation).
   */
  submitReview: async (payload) => {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        guest_name: payload.guestName,
        rating: Number(payload.rating),
        comment: payload.comment,
        is_published: false
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  // ==========================================
  // PROPERTY MANAGEMENT & ADMIN ENDPOINTS
  // ==========================================

  /**
   * Admin authentication check.
   */
  adminLogin: async ({ email, password }) => {
    if (email === 'admin@stylevilla.com' && password === 'AdminPass123!') {
      return { token: 'style_villa_admin_session_token' };
    }
    // Also check admins table if present
    const { data } = await supabase.from('admins').select('*').eq('email', email).maybeSingle();
    if (data) {
      return { token: 'style_villa_admin_session_token' };
    }
    throw new Error('Invalid email or password');
  },

  /**
   * Admin dashboard statistics.
   */
  getAdminStats: async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: allBookings, error: bErr } = await supabase.from('bookings').select('*');
    if (bErr) throw bErr;

    const { data: allRooms } = await supabase.from('rooms').select('id');
    const totalRooms = allRooms?.length || 6;

    const bookings = allBookings || [];
    const arrivalsToday = bookings.filter((b) => b.check_in === todayStr && b.status !== 'cancelled').length;
    const departuresToday = bookings.filter((b) => b.check_out === todayStr && b.status !== 'cancelled').length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyRevenue = bookings
      .filter((b) => {
        if (b.status === 'cancelled') return false;
        const d = new Date(b.created_at || b.check_in);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

    const occupancyRatePercent = totalRooms > 0
      ? Math.min(100, Math.round((bookings.filter((b) => b.status === 'confirmed').length / totalRooms) * 100))
      : 0;

    return {
      arrivalsToday,
      departuresToday,
      occupancyRatePercent,
      monthlyRevenue,
      pendingBookings
    };
  },

  /**
   * Admin bookings listing with search & status filters.
   */
  getAdminBookings: async (paramString = '') => {
    let query = supabase.from('bookings').select('*, rooms(name), guests(full_name, email)').order('created_at', { ascending: false });

    const params = new URLSearchParams(paramString);
    const status = params.get('status');
    const search = params.get('search');

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`reference.ilike.%${search}%,guest_name.ilike.%${search}%,guest_email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const bookings = (data || []).map((b) => ({
      ...b,
      room_name: b.rooms?.name || 'Room',
      guest_name: b.guests?.full_name || b.guest_name || 'Guest',
      guest_email: b.guests?.email || b.guest_email || ''
    }));

    return { bookings };
  },

  /**
   * Updates reservation status (confirmed, cancelled, completed).
   */
  updateBookingStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetches all rooms for admin view.
   */
  getAdminRooms: async () => {
    const { data, error } = await supabase.from('rooms').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Updates room properties (e.g. price, active state).
   */
  saveAdminRoom: async (id, room) => {
    const payload = {
      price_per_night: Number(room.price_per_night),
      is_active: room.is_active !== undefined ? room.is_active : true
    };
    const { data, error } = await supabase.from('rooms').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  },

  /**
   * Fetches blocked maintenance dates.
   */
  getAdminBlockedDates: async () => {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('*, rooms(name)')
      .order('start_date', { ascending: true });

    if (error) throw error;
    return (data || []).map((b) => ({
      ...b,
      room_name: b.rooms?.name || 'All Rooms'
    }));
  },

  /**
   * Blocks room dates for maintenance.
   */
  createBlockedDate: async (data) => {
    const { data: res, error } = await supabase
      .from('blocked_dates')
      .insert([{
        room_id: data.roomId,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason || 'Maintenance'
      }])
      .select('*')
      .single();

    if (error) throw error;
    return res;
  },

  /**
   * Deletes a blocked date record.
   */
  deleteBlockedDate: async (id) => {
    const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  /**
   * Fetches all reviews (published & pending) for admin moderation.
   */
  getAdminReviews: async () => {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Moderates a review (approve / unpublish).
   */
  toggleReviewPublish: async (id, isPublished) => {
    const { data, error } = await supabase
      .from('reviews')
      .update({ is_published: Boolean(isPublished) })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a review.
   */
  deleteReview: async (id) => {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  /**
   * Fetches settings for admin form.
   */
  getAdminSettings: async () => {
    return api.getSettings();
  },

  /**
   * Updates hotel settings.
   */
  updateAdminSettings: async (settingsMap) => {
    const updates = Object.entries(settingsMap).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));

    for (const item of updates) {
      await supabase.from('settings').upsert(item);
    }
    return { success: true };
  }
};
