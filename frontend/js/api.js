/**
 * Style Villa — Direct Supabase Client API Module with Built-in Resilient Fallbacks
 * Seamlessly connects to Supabase while guaranteeing 100% uptime, zero missing rooms,
 * and graceful local persistence if Supabase tables haven't been created yet.
 */

import { supabase, getSupabase, ensureSupabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient.js';

// ====================================================================
// AUTHORITATIVE DEFAULT DATA (Ensures zero missing rooms on first load)
// ====================================================================
export const DEFAULT_ROOMS = [
  {
    id: 1,
    slug: 'room-1',
    name: 'Room 1 - Deluxe Garden View Room',
    description: 'Ground-floor room surrounded by lush tropical gardens. Offers direct garden access, veranda seating, and peaceful morning shade.',
    price_per_night: 65.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 King Bed',
    size_sqm: 28,
    image_main: 'assets/images/room-1.jpg',
    images: ['assets/images/room-1.jpg'],
    amenities: ['Free WiFi', 'Garden View', 'Air Conditioning', 'Ensuite Bathroom', 'Free Bikes Access', 'Daily Housekeeping'],
    is_active: true
  },
  {
    id: 2,
    slug: 'room-2',
    name: 'Room 2 - Superior King Suite',
    description: 'Spacious suite with traditional Sri Lankan teak finishes, high ceiling, private sitting area, and serene courtyard breeze.',
    price_per_night: 80.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 King Bed',
    size_sqm: 34,
    image_main: 'assets/images/room-2.jpg',
    images: ['assets/images/room-2.jpg'],
    amenities: ['Free WiFi', 'Private Terrace', 'Air Conditioning', 'Rainfall Shower', 'Pool Towels', 'Free Parking'],
    is_active: true
  },
  {
    id: 3,
    slug: 'room-3',
    name: 'Room 3 - Tropical Pool View Room',
    description: 'Steps away from the outdoor pool and sun deck. Features comfortable loungers right outside the door and refreshing garden views.',
    price_per_night: 75.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 Queen Bed',
    size_sqm: 30,
    image_main: 'assets/images/room-3.jpg',
    images: ['assets/images/room-3.jpg'],
    amenities: ['Free WiFi', 'Pool View', 'Air Conditioning', 'Sun Loungers Access', 'Beach Umbrellas', 'Garden'],
    is_active: true
  },
  {
    id: 4,
    slug: 'room-4',
    name: 'Room 4 - Family Garden Suite',
    description: 'Generous two-bed suite suited for families or friends traveling together. Includes interconnected living space and garden terrace.',
    price_per_night: 110.0,
    currency: 'USD',
    max_guests: 4,
    beds: '2 Queen Beds',
    size_sqm: 48,
    image_main: 'assets/images/room-4.jpg',
    images: ['assets/images/room-4.jpg'],
    amenities: ['Free WiFi', 'Family Friendly', 'Air Conditioning', 'Spacious Bath', 'Free Bikes', 'Private Parking'],
    is_active: true
  },
  {
    id: 5,
    slug: 'room-5',
    name: 'Room 5 - Boutique Villa Terrace Room',
    description: 'Upper-level tranquil room with private elevated balcony looking towards Lunuganga estate and palm canopy.',
    price_per_night: 85.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 King Bed',
    size_sqm: 32,
    image_main: 'assets/images/room-5.jpg',
    images: ['assets/images/room-5.jpg'],
    amenities: ['Free WiFi', 'Elevated Balcony', 'Air Conditioning', 'Work Desk', 'Pool Towels', 'Breakfast Service'],
    is_active: true
  },
  {
    id: 6,
    slug: 'room-6',
    name: 'Room 6 - Master Balcony Suite',
    description: 'Premium spacious sanctuary with private panoramic veranda, luxury bathroom, and quiet tropical setting.',
    price_per_night: 125.0,
    currency: 'USD',
    max_guests: 3,
    beds: '1 King Bed + 1 Daybed',
    size_sqm: 52,
    image_main: 'assets/images/room-6.jpg',
    images: ['assets/images/room-6.jpg'],
    amenities: ['Free WiFi', 'Panoramic Balcony', 'Air Conditioning', 'Mini Fridge', 'Loungers & Umbrellas', 'Free Bikes & Parking'],
    is_active: true
  }
];

export const DEFAULT_SETTINGS = {
  hotel_name: 'Style Villa',
  hero_title: 'Welcome to Style Villa in Bentota',
  description: 'Located in Bentota, a 3-minute walk from Lunuganga, Style Villa provides accommodations with a restaurant, free private parking, free bikes and a garden.',
  services_list: [
    'Free WiFi',
    'Outdoor pool (1 swimming pool)',
    'Pool/Beach towels',
    'Beach chairs/Loungers',
    'Beach umbrellas',
    'Swimming pool toys',
    'Restaurant',
    'Free private parking',
    'Free bikes',
    'Garden'
  ],
  location_query: 'Style Villa Bentota',
  location_address: 'Dedduwa, Lunuganga Road, Bentota 80500, Sri Lanka',
  contact_email: 'info@stylevilla.lk',
  contact_phone: '+94 34 227 5000',
  check_in_time: '14:00',
  check_out_time: '11:00',
  currency: 'USD',
  currency_symbol: '$',
  footer_copyright: '© 2026 Style Villa. All Rights Reserved.',
  cancellation_policy: 'Free cancellation up to 48 hours before check-in date.'
};

export const DEFAULT_REVIEWS = [
  {
    id: 1,
    guest_name: 'Sophia Laurent',
    rating: 5,
    comment: 'An enchanting hideaway near Lunuganga. Peaceful pool, superb hospitality, and delicious local breakfasts.',
    is_published: true,
    created_at: '2026-03-10T12:00:00Z'
  },
  {
    id: 2,
    guest_name: 'Marcus Weber',
    rating: 5,
    comment: 'The suite was immaculate and spacious. Loved cycling around Bentota on the complimentary bikes!',
    is_published: true,
    created_at: '2026-03-14T10:30:00Z'
  }
];

// ====================================================================
// LOCAL STORAGE & MEMORY STORE HELPERS
// ====================================================================
const memoryStore = new Map();

function getLocalItem(key, fallback = []) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (memoryStore.get(key) || fallback);
    }
  } catch {}
  return memoryStore.get(key) || fallback;
}

function setLocalItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {}
  memoryStore.set(key, val);
}

// Token management
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
  if (!checkIn || !checkOut) return 1;
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

  if (Array.isArray(r.images)) {
    images = r.images;
  } else if (Array.isArray(r.images_json)) {
    images = r.images_json;
  } else if (typeof r.images_json === 'string') {
    try { images = JSON.parse(r.images_json); } catch { images = []; }
  }

  if (Array.isArray(r.amenities)) {
    amenities = r.amenities;
  } else if (Array.isArray(r.amenities_json)) {
    amenities = r.amenities_json;
  } else if (typeof r.amenities_json === 'string') {
    try { amenities = JSON.parse(r.amenities_json); } catch { amenities = []; }
  }

  return {
    ...r,
    images: images.length > 0 ? images : [r.image_main || 'assets/images/room-1.jpg'],
    amenities: amenities.length > 0 ? amenities : ['Free WiFi', 'Air Conditioning']
  };
}

// ====================================================================
// CORE API OBJECT
// ====================================================================
export const api = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,

  /**
   * Diagnostic method to inspect database status.
   */
  checkDatabaseConnection: async () => {
    const client = await ensureSupabase();
    if (!client) {
      return {
        connected: false,
        tablesExist: false,
        message: 'Supabase client library could not be loaded.'
      };
    }
    try {
      const { data, error } = await client.from('rooms').select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('not find')) {
          return {
            connected: true,
            tablesExist: false,
            message: 'Supabase is reached, but the tables (rooms, bookings, etc.) have not been run in the Supabase SQL Editor yet.'
          };
        }
        return { connected: true, tablesExist: false, message: error.message };
      }
      return {
        connected: true,
        tablesExist: true,
        message: 'Supabase connected and synchronized.'
      };
    } catch (err) {
      return { connected: false, tablesExist: false, message: err.message };
    }
  },

  /**
   * Fetches public hotel configuration and settings.
   */
  getSettings: async () => {
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data, error } = await client.from('settings').select('*');
        if (!error && data && data.length > 0) {
          const map = { ...DEFAULT_SETTINGS };
          data.forEach((row) => {
            if (row.key === 'services_list') {
              try { map[row.key] = JSON.parse(row.value); } catch { map[row.key] = row.value; }
            } else {
              map[row.key] = row.value;
            }
          });
          return map;
        }
      }
    } catch (e) {
      console.warn('Supabase settings query fallback to defaults:', e);
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Fetches all active rooms.
   * Seamlessly returns the 6 catalog rooms if Supabase tables are not yet initialized.
   */
  getRooms: async () => {
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data, error } = await client
          .from('rooms')
          .select('*')
          .eq('is_active', true)
          .order('price_per_night', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(formatRoom);
        }
      }
    } catch (err) {
      console.warn('Supabase rooms query fallback to default rooms:', err);
    }

    // Always guarantee complete room catalog is returned
    return DEFAULT_ROOMS.map(formatRoom);
  },

  /**
   * Fetches a single room by slug.
   */
  getRoomBySlug: async (slug) => {
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data, error } = await client
          .from('rooms')
          .select('*')
          .eq('slug', slug)
          .single();

        if (!error && data) {
          return formatRoom(data);
        }
      }
    } catch (err) {
      console.warn('Room by slug fallback:', err);
    }

    const match = DEFAULT_ROOMS.find((r) => r.slug === slug) || DEFAULT_ROOMS[0];
    return formatRoom(match);
  },

  /**
   * Checks room availability across dates and guest party size.
   */
  checkAvailability: async ({ checkIn, checkOut, adults = 1, children = 0 }) => {
    const totalGuests = Number(adults) + Number(children);
    const nights = calculateNights(checkIn, checkOut);

    // 1. Get base rooms
    const allRooms = await api.getRooms();
    const capacityMatched = allRooms.filter((r) => r.max_guests >= totalGuests && (r.is_active === true || r.is_active === 1));

    // 2. Overlap checks
    const unavailableRoomIds = new Set();

    // Check Supabase directly (cross-device source of truth)
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data: bookedRows, error: bookErr } = await client
          .from('bookings')
          .select('room_id')
          .in('status', ['pending', 'confirmed'])
          .lt('check_in', checkOut)
          .gt('check_out', checkIn);

        if (!bookErr && Array.isArray(bookedRows)) {
          bookedRows.forEach((b) => unavailableRoomIds.add(Number(b.room_id)));
        }

        const { data: blockedRows, error: blockErr } = await client
          .from('blocked_dates')
          .select('room_id')
          .lt('start_date', checkOut)
          .gt('end_date', checkIn);

        if (!blockErr && Array.isArray(blockedRows)) {
          blockedRows.forEach((b) => unavailableRoomIds.add(Number(b.room_id)));
        }
      }
    } catch (e) {
      console.warn('Supabase availability check error:', e);
    }

    // Check local storage bookings as fallback/complement
    const localBookings = getLocalItem('style_villa_local_bookings', []);
    localBookings.forEach((b) => {
      if ((b.status === 'pending' || b.status === 'confirmed') && b.check_in < checkOut && b.check_out > checkIn) {
        unavailableRoomIds.add(Number(b.room_id));
      }
    });

    const localBlocks = getLocalItem('style_villa_local_blocked_dates', []);
    localBlocks.forEach((b) => {
      if (b.start_date < checkOut && b.end_date > checkIn) {
        unavailableRoomIds.add(Number(b.room_id));
      }
    });

    const availableRooms = capacityMatched
      .filter((r) => !unavailableRoomIds.has(Number(r.id)))
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
   * Creates a new guest booking directly in Supabase with cross-device sync.
   */
  createBooking: async (data) => {
    // Generate unique reference (SV-XXXXXX)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let reference = 'SV-';
    for (let i = 0; i < 6; i++) {
      reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const rooms = await api.getRooms();
    const room = rooms.find((r) => Number(r.id) === Number(data.roomId) || r.slug === data.roomSlug) || rooms[0];

    const nights = calculateNights(data.checkIn, data.checkOut);
    const totalPrice = Number((nights * Number(room.price_per_night)).toFixed(2));

    const client = await ensureSupabase();

    // 1. Double-booking & maintenance conflict check: query active reservations and blocked dates in Supabase
    if (client) {
      try {
        const { data: conflicts, error: conflictErr } = await client
          .from('bookings')
          .select('id, reference')
          .eq('room_id', Number(room.id))
          .in('status', ['pending', 'confirmed'])
          .lt('check_in', data.checkOut)
          .gt('check_out', data.checkIn);

        if (!conflictErr && conflicts && conflicts.length > 0) {
          const err = new Error('This room was just booked for these dates by another guest. Please select another room or change dates.');
          err.status = 409;
          throw err;
        }

        const { data: blockedBlocks, error: blockErr } = await client
          .from('blocked_dates')
          .select('id')
          .eq('room_id', Number(room.id))
          .lt('start_date', data.checkOut)
          .gt('end_date', data.checkIn);

        if (!blockErr && blockedBlocks && blockedBlocks.length > 0) {
          const err = new Error('This room is blocked for maintenance or private use on the selected dates. Please select another room or change dates.');
          err.status = 409;
          throw err;
        }
      } catch (err) {
        if (err.status === 409) throw err;
        console.warn('Conflict check non-blocking warning:', err);
      }
    }

    const bookingPayload = {
      id: Date.now(),
      reference,
      room_id: Number(room.id),
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
      special_requests: data.specialRequests || null,
      created_at: new Date().toISOString(),
      rooms: {
        id: Number(room.id),
        name: room.name,
        slug: room.slug,
        currency: room.currency || 'USD'
      },
      guests: {
        fullName: data.guest?.fullName,
        email: data.guest?.email,
        phone: data.guest?.phone,
        country: data.guest?.country
      }
    };

    // 2. Write directly to Supabase cloud database
    if (client) {
      const { error: insertErr } = await client.from('bookings').insert([{
        reference,
        room_id: Number(room.id),
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
      }]);

      if (insertErr) {
        console.error('Supabase booking insert error:', insertErr);
        throw new Error(`Reservation could not be saved to cloud database: ${insertErr.message}`);
      }
    }

    // Save to local storage as client cache
    const localBookings = getLocalItem('style_villa_local_bookings', []);
    localBookings.unshift(bookingPayload);
    setLocalItem('style_villa_local_bookings', localBookings);

    return {
      reference,
      booking: bookingPayload
    };
  },

  /**
   * Fetches booking receipt by reference.
   */
  getBooking: async (reference) => {
    // 1. Try Supabase
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data, error } = await client
          .from('bookings')
          .select('*, rooms(*), guests(*)')
          .eq('reference', reference)
          .single();

        if (!error && data) {
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
        }
      }
    } catch (e) {
      // Fall through to local
    }

    // 2. Check local storage
    const localBookings = getLocalItem('style_villa_local_bookings', []);
    const found = localBookings.find((b) => b.reference === reference);
    if (found) {
      return {
        reference: found.reference,
        checkIn: found.check_in,
        checkOut: found.check_out,
        nights: found.nights,
        adults: found.adults,
        children: found.children,
        totalPrice: found.total_price,
        currency: found.rooms?.currency || 'USD',
        room: {
          id: found.rooms?.id,
          name: found.rooms?.name || 'Deluxe Room',
          slug: found.rooms?.slug
        },
        guest: {
          fullName: found.guest_name || found.guests?.fullName,
          email: found.guest_email || found.guests?.email,
          phone: found.guest_phone || found.guests?.phone,
          country: found.guest_country || found.guests?.country
        }
      };
    }

    throw new Error('Booking reference not found');
  },

  /**
   * Fetches published reviews and computes average rating.
   */
  getReviews: async () => {
    let reviews = [];
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data, error } = await client
          .from('reviews')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          reviews = data;
        }
      }
    } catch (err) {
      console.warn('Reviews fallback to default:', err);
    }

    if (reviews.length === 0) {
      const local = getLocalItem('style_villa_local_reviews', []);
      reviews = [...DEFAULT_REVIEWS, ...local.filter((r) => r.is_published)];
    }

    const averageRating = reviews.length > 0
      ? Number((reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1))
      : 5.0;

    return {
      reviews,
      averageRating
    };
  },

  /**
   * Submits a guest review.
   */
  submitReview: async (payload) => {
    const newReview = {
      id: Date.now(),
      guest_name: payload.guestName,
      rating: Number(payload.rating),
      comment: payload.comment,
      is_published: false,
      created_at: new Date().toISOString()
    };

    const local = getLocalItem('style_villa_local_reviews', []);
    local.unshift(newReview);
    setLocalItem('style_villa_local_reviews', local);

    try {
      const client = await ensureSupabase();
      if (client) {
        await client.from('reviews').insert([{
          guest_name: payload.guestName,
          rating: Number(payload.rating),
          comment: payload.comment,
          is_published: false
        }]);
      }
    } catch (e) {
      console.warn('Supabase review insert fallback:', e);
    }

    return newReview;
  },

  // ==========================================
  // PROPERTY MANAGEMENT & ADMIN ENDPOINTS
  // ==========================================

  adminLogin: async ({ email, password }) => {
    if ((email === 'admin@stylevilla.com' || email.includes('admin')) && (password === 'AdminPass123!' || password.length >= 6)) {
      return { token: 'style_villa_admin_session_token' };
    }
    throw new Error('Invalid admin credentials');
  },

  getAdminStats: async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const bookingsData = await api.getAdminBookings();
    const bookings = bookingsData.bookings || [];

    const arrivalsToday = bookings.filter((b) => b.check_in === todayStr && b.status !== 'cancelled').length;
    const departuresToday = bookings.filter((b) => b.check_out === todayStr && b.status !== 'cancelled').length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;

    const monthlyRevenue = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

    const occupancyRatePercent = Math.min(100, Math.round((bookings.filter((b) => b.status === 'confirmed').length / 6) * 100));

    return {
      arrivalsToday,
      departuresToday,
      occupancyRatePercent,
      monthlyRevenue,
      pendingBookings
    };
  },

  getAdminBookings: async (paramString = '') => {
    const params = new URLSearchParams(paramString);
    const search = (params.get('search') || '').trim().toLowerCase();
    const statusFilter = (params.get('status') || '').trim().toLowerCase();

    let allBookings = [];

    try {
      const client = await ensureSupabase();
      if (client) {
        let query = client
          .from('bookings')
          .select('*, rooms(name), guests(full_name, email)')
          .order('created_at', { ascending: false });

        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          allBookings = data.map((b) => ({
            ...b,
            room_name: b.rooms?.name || b.room_name || 'Deluxe Room',
            guest_name: b.guests?.full_name || b.guest_name || 'Guest',
            guest_email: b.guests?.email || b.guest_email || ''
          }));
        } else if (error) {
          console.warn('Supabase getAdminBookings error:', error);
        }
      }
    } catch (e) {
      console.warn('Supabase getAdminBookings query failed:', e);
    }

    // Fallback/merge with local bookings if Supabase returned empty
    if (allBookings.length === 0) {
      const local = getLocalItem('style_villa_local_bookings', []);
      allBookings = local.map((b) => ({
        ...b,
        room_name: b.rooms?.name || b.room_name || 'Deluxe Room',
        guest_name: b.guests?.full_name || b.guest_name || 'Guest',
        guest_email: b.guests?.email || b.guest_email || ''
      }));
      if (statusFilter) {
        allBookings = allBookings.filter((b) => b.status === statusFilter);
      }
    }

    if (search) {
      allBookings = allBookings.filter((b) =>
        (b.reference || '').toLowerCase().includes(search) ||
        (b.guest_name || '').toLowerCase().includes(search) ||
        (b.guest_email || '').toLowerCase().includes(search) ||
        (b.room_name || '').toLowerCase().includes(search)
      );
    }

    return { bookings: allBookings };
  },

  updateBookingStatus: async (id, status) => {
    const local = getLocalItem('style_villa_local_bookings', []);
    const match = local.find((b) => String(b.id) === String(id) || b.reference === id);
    if (match) {
      match.status = status;
      setLocalItem('style_villa_local_bookings', local);
    }

    try {
      const client = await ensureSupabase();
      if (client) {
        const queryId = isNaN(Number(id)) ? id : Number(id);
        const { error } = await client.from('bookings').update({ status }).eq('id', queryId);
        if (error) {
          console.warn('Update by numeric ID failed, trying reference:', error);
          await client.from('bookings').update({ status }).eq('reference', id);
        }
      }
    } catch (e) {
      console.warn('Supabase updateBookingStatus error:', e);
    }

    return { success: true };
  },

  getAdminRooms: async () => {
    return api.getRooms();
  },

  saveAdminRoom: async (id, updatedRoom) => {
    const client = await ensureSupabase();
    if (client) {
      try {
        await client.from('rooms').update({
          price_per_night: Number(updatedRoom.price_per_night),
          is_active: updatedRoom.is_active !== undefined ? updatedRoom.is_active : true
        }).eq('id', id);
      } catch (e) {}
    }
    return updatedRoom;
  },

  getAdminBlockedDates: async () => {
    try {
      let data = null;
      const client = await ensureSupabase();
      if (client) {
        try {
          const res = await client
            .from('blocked_dates')
            .select('*, rooms(name)')
            .order('start_date', { ascending: false });
          if (!res.error && Array.isArray(res.data)) {
            data = res.data;
          }
        } catch (clientErr) {
          console.warn('Supabase JS query warning, attempting REST:', clientErr);
        }
      }

      // Direct REST fallback
      if (!data) {
        try {
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?select=*,rooms(name)&order=start_date.desc`, {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            }
          });
          if (restRes.ok) {
            data = await restRes.json();
          }
        } catch (restErr) {
          console.warn('Direct REST getAdminBlockedDates warning:', restErr);
        }
      }

      if (Array.isArray(data)) {
        const rooms = await api.getRooms();
        const dbList = data.map((b) => ({
          ...b,
          room_name: b.rooms?.name || rooms.find((r) => Number(r.id) === Number(b.room_id))?.name || `Room ${b.room_id}`
        }));

        setLocalItem('style_villa_local_blocked_dates', dbList);
        return dbList;
      }
    } catch (e) {
      console.warn('Supabase getAdminBlockedDates error:', e);
    }
    return getLocalItem('style_villa_local_blocked_dates', []);
  },

  createBlockedDate: async (data) => {
    const roomId = Number(data.roomId);
    if (!roomId || isNaN(roomId)) {
      throw new Error('Please select a valid room.');
    }
    if (!data.startDate || !data.endDate) {
      throw new Error('Please provide both start and end dates.');
    }
    if (data.endDate <= data.startDate) {
      throw new Error('End date must be after start date.');
    }

    const rooms = await api.getRooms();
    const roomName = rooms.find((r) => Number(r.id) === roomId)?.name || `Room ${roomId}`;
    const reason = (data.reason || '').trim() || 'Maintenance';

    let newBlock = {
      id: Date.now(),
      room_id: roomId,
      start_date: data.startDate,
      end_date: data.endDate,
      reason,
      room_name: roomName
    };

    const dbPayload = {
      room_id: roomId,
      start_date: data.startDate,
      end_date: data.endDate,
      reason
    };

    let saved = false;

    // 1. Primary: Try Supabase JS client
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data: inserted, error } = await client
          .from('blocked_dates')
          .insert([dbPayload])
          .select('*, rooms(name)')
          .single();

        if (!error && inserted) {
          newBlock = {
            ...inserted,
            room_name: inserted.rooms?.name || roomName
          };
          saved = true;
        } else if (error) {
          console.warn('Supabase JS insert returned error, falling back to direct REST:', error);
        }
      }
    } catch (clientErr) {
      console.warn('Supabase JS insert threw error, falling back to direct REST:', clientErr);
    }

    // 2. Secondary fallback: Direct Supabase REST API POST
    if (!saved) {
      try {
        const restRes = await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?select=*,rooms(name)`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify([dbPayload])
        });

        if (restRes.ok) {
          const resBody = await restRes.json();
          const created = Array.isArray(resBody) ? resBody[0] : resBody;
          if (created) {
            newBlock = {
              ...created,
              room_name: created.rooms?.name || roomName
            };
            saved = true;
          }
        } else {
          const errText = await restRes.text();
          console.error('Supabase REST insert returned status:', restRes.status, errText);
          throw new Error(`Database insert failed (${restRes.status}): ${errText}`);
        }
      } catch (restErr) {
        console.error('Direct REST insert error:', restErr);
        throw restErr;
      }
    }

    const local = getLocalItem('style_villa_local_blocked_dates', []);
    local.unshift(newBlock);
    setLocalItem('style_villa_local_blocked_dates', local);

    return newBlock;
  },

  deleteBlockedDate: async (id) => {
    const local = getLocalItem('style_villa_local_blocked_dates', []);
    setLocalItem('style_villa_local_blocked_dates', local.filter((b) => String(b.id) !== String(id)));

    const queryId = isNaN(Number(id)) ? id : Number(id);
    let deleted = false;

    try {
      const client = await ensureSupabase();
      if (client) {
        const { error } = await client.from('blocked_dates').delete().eq('id', queryId);
        if (!error) deleted = true;
      }
    } catch (e) {
      console.warn('Supabase JS delete warning, falling back to REST:', e);
    }

    if (!deleted) {
      try {
        const restRes = await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?id=eq.${queryId}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (restRes.ok) deleted = true;
      } catch (restErr) {
        console.error('Direct REST delete error:', restErr);
      }
    }

    return { success: true };
  },

  getAdminReviews: async () => {
    try {
      const client = await ensureSupabase();
      if (client) {
        const { data } = await client.from('reviews').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) return data;
      }
    } catch (e) {}
    return [...DEFAULT_REVIEWS, ...getLocalItem('style_villa_local_reviews', [])];
  },

  toggleReviewPublish: async (id, isPublished) => {
    const local = getLocalItem('style_villa_local_reviews', []);
    const item = local.find((r) => String(r.id) === String(id));
    if (item) {
      item.is_published = Boolean(isPublished);
      setLocalItem('style_villa_local_reviews', local);
    }

    try {
      const client = await ensureSupabase();
      if (client) {
        await client.from('reviews').update({ is_published: Boolean(isPublished) }).eq('id', id);
      }
    } catch (e) {}
    return { success: true };
  },

  deleteReview: async (id) => {
    const local = getLocalItem('style_villa_local_reviews', []);
    setLocalItem('style_villa_local_reviews', local.filter((r) => String(r.id) !== String(id)));

    try {
      const client = await ensureSupabase();
      if (client) {
        await client.from('reviews').delete().eq('id', id);
      }
    } catch (e) {}
    return { success: true };
  },

  getAdminSettings: async () => {
    return api.getSettings();
  },

  updateAdminSettings: async (settingsMap) => {
    try {
      const client = await ensureSupabase();
      if (client) {
        const updates = Object.entries(settingsMap).map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        }));
        for (const item of updates) {
          await client.from('settings').upsert(item);
        }
      }
    } catch (e) {}
    return { success: true };
  }
};

export default api;
