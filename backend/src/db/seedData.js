/**
 * Authoritative seed data for Style Villa.
 * Merges real scraped data from the original site with clearly marked [PLACEHOLDER] fields.
 */

export const settingsData = [
  { key: 'hotel_name', value: 'Style Villa' },
  { key: 'hero_title', value: 'Welcome to Style Villa in Bentota' },
  {
    key: 'description',
    value:
      'Located in Bentota, a 3-minute walk from Lunuganga, Style Villa provides accommodations with a restaurant, free private parking, free bikes and a garden.'
  },
  {
    key: 'services_list',
    value: JSON.stringify([
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
    ])
  },
  { key: 'location_query', value: 'Style Villa Bentota' },
  { key: 'location_address', value: 'Polwatta, Dedduwa, Haburugala, 80500 Bentota, Sri Lanka' },
  { key: 'contact_email', value: 'info@stylevilla.com' },
  { key: 'contact_phone', value: '+94766218498' },
  { key: 'check_in_time', value: '14:00' },
  { key: 'check_out_time', value: '11:00' },
  { key: 'currency', value: 'USD' },
  { key: 'currency_symbol', value: '$' },
  { key: 'footer_copyright', value: '© 2026 Style Villa. All Rights Reserved.' },
  { key: 'cancellation_policy', value: 'Free cancellation up to 48 hours before check-in date.' }
];

export const roomsData = [
  {
    slug: 'room-1',
    name: 'Room 1 - [PLACEHOLDER] Deluxe Garden View Room',
    description:
      '[PLACEHOLDER] Ground-floor room surrounded by lush tropical gardens. Offers direct garden access, veranda seating, and peaceful morning shade.',
    price_per_night: 65.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 King Bed',
    size_sqm: 28,
    image_main: 'assets/images/room-1.jpg',
    images_json: JSON.stringify(['assets/images/room-1.jpg']),
    amenities_json: JSON.stringify([
      'Free WiFi',
      'Garden View',
      'Air Conditioning',
      'Ensuite Bathroom',
      'Free Bikes Access',
      'Daily Housekeeping'
    ]),
    is_active: 1
  },
  {
    slug: 'room-2',
    name: 'Room 2 - [PLACEHOLDER] Superior King Suite',
    description:
      '[PLACEHOLDER] Spacious suite with traditional Sri Lankan teak finishes, high ceiling, private sitting area, and serene courtyard breeze.',
    price_per_night: 80.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 King Bed',
    size_sqm: 34,
    image_main: 'assets/images/room-2.jpg',
    images_json: JSON.stringify(['assets/images/room-2.jpg']),
    amenities_json: JSON.stringify([
      'Free WiFi',
      'Private Terrace',
      'Air Conditioning',
      'Rainfall Shower',
      'Pool Towels',
      'Free Parking'
    ]),
    is_active: 1
  },
  {
    slug: 'room-3',
    name: 'Room 3 - [PLACEHOLDER] Tropical Pool View Room',
    description:
      '[PLACEHOLDER] Steps away from the outdoor pool and sun deck. Features comfortable loungers right outside the door and refreshing garden views.',
    price_per_night: 75.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 Queen Bed',
    size_sqm: 30,
    image_main: 'assets/images/room-3.jpg',
    images_json: JSON.stringify(['assets/images/room-3.jpg']),
    amenities_json: JSON.stringify([
      'Free WiFi',
      'Pool View',
      'Air Conditioning',
      'Sun Loungers Access',
      'Beach Umbrellas',
      'Garden'
    ]),
    is_active: 1
  },
  {
    slug: 'room-4',
    name: 'Room 4 - [PLACEHOLDER] Family Garden Suite',
    description:
      '[PLACEHOLDER] Generous two-bed suite suited for families or friends traveling together. Includes interconnected living space and garden terrace.',
    price_per_night: 110.0,
    currency: 'USD',
    max_guests: 4,
    beds: '2 Queen Beds',
    size_sqm: 48,
    image_main: 'assets/images/room-4.jpg',
    images_json: JSON.stringify(['assets/images/room-4.jpg']),
    amenities_json: JSON.stringify([
      'Free WiFi',
      'Family Friendly',
      'Air Conditioning',
      'Spacious Bath',
      'Free Bikes',
      'Private Parking'
    ]),
    is_active: 1
  },
  {
    slug: 'room-5',
    name: 'Room 5 - [PLACEHOLDER] Boutique Villa Terrace Room',
    description:
      '[PLACEHOLDER] Upper-level tranquil room with private elevated balcony looking towards Lunuganga estate and palm canopy.',
    price_per_night: 85.0,
    currency: 'USD',
    max_guests: 2,
    beds: '1 King Bed',
    size_sqm: 32,
    image_main: 'assets/images/room-5.jpg',
    images_json: JSON.stringify(['assets/images/room-5.jpg']),
    amenities_json: JSON.stringify([
      'Free WiFi',
      'Elevated Balcony',
      'Air Conditioning',
      'Work Desk',
      'Pool Towels',
      'Breakfast Service'
    ]),
    is_active: 1
  },
  {
    slug: 'room-6',
    name: 'Room 6 - [PLACEHOLDER] Master Balcony Suite',
    description:
      '[PLACEHOLDER] Premium spacious sanctuary with private panoramic veranda, luxury bathroom, and quiet tropical setting.',
    price_per_night: 125.0,
    currency: 'USD',
    max_guests: 3,
    beds: '1 King Bed + 1 Daybed',
    size_sqm: 52,
    image_main: 'assets/images/room-6.jpg',
    images_json: JSON.stringify(['assets/images/room-6.jpg']),
    amenities_json: JSON.stringify([
      'Free WiFi',
      'Panoramic Balcony',
      'Air Conditioning',
      'Mini Fridge',
      'Loungers & Umbrellas',
      'Free Bikes & Parking'
    ]),
    is_active: 1
  }
];
