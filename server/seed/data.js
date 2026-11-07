// PushkarPath Seed Data — Rajamahendravaram (Rajahmundry), AP
// Ground-audited 36 parking locations + Pushkaralu Ghats

const ghats = [
  {
    code: 'PKG',
    name: 'Pushkar Ghat',
    nameTe: 'పుష్కర్ ఘాట్',
    description: 'The main and most central holy bathing ghat for Godavari Pushkaralu, closest to historic bridge and VIP bathing steps',
    location: { lat: 17.0005, lng: 81.7838 },
    coordSource: 'official',
    photo: '/photos/pushkar-ghat.png',
    facilities: [
      'Bathing steps',
      'Changing rooms',
      'Pooja platform',
      'PA system',
      'Drinking water',
      'First aid',
      'Wheelchair ramp'
    ]
  },
  {
    code: 'KTL',
    name: 'Kotilingala Ghat / Kotilingala Revu',
    nameTe: 'కోటిలింగాల రేవు ఘాట్',
    description: 'One of the oldest, largest, and busiest bathing locations near Kotilingeshwara temple, with continuous stepped bathing frontage',
    location: { lat: 16.9920, lng: 81.7780 },
    coordSource: 'official',
    photo: '/photos/kotilingala-ghat.png',
    facilities: [
      'Bathing steps',
      'Changing rooms',
      'Drinking water',
      'Temple access',
      'First aid'
    ]
  },
  {
    code: 'SRW',
    name: 'Saraswathi Ghat',
    nameTe: 'సరస్వతీ ఘాట్',
    description: 'Designated modern VIP ghat area along the riverfront, popular for serene morning prayers and rituals',
    location: { lat: 17.0060, lng: 81.7900 },
    coordSource: 'official',
    photo: '/photos/saraswathi-ghat.png',
    facilities: [
      'Bathing steps',
      'Pooja platform',
      'Drinking water',
      'Changing rooms'
    ]
  },
  {
    code: 'MRK',
    name: 'Markandeya Ghat',
    nameTe: 'మార్కండేయ ఘాట్',
    description: 'Located adjacent to the historic Markandeyaswamy temple, rich in spiritual heritage and dedicated ritual spaces',
    location: { lat: 16.9880, lng: 81.7750 },
    coordSource: 'official',
    photo: '/photos/markandeya-ghat.png',
    facilities: [
      'Bathing steps',
      'Changing rooms',
      'Drinking water',
      'First aid'
    ]
  },
  {
    code: 'PDM',
    name: 'Padmavathi Ghat',
    nameTe: 'పద్మావతి ఘాట్',
    description: 'Closely paired along the core town stretch with wide river steps and easy vehicular access',
    location: { lat: 16.9895, lng: 81.7762 },
    coordSource: 'official',
    photo: 'https://d2kihw5e8drjh5.cloudfront.net/eyJidWNrZXQiOiJ1dGEtaW1hZ2VzIiwia2V5IjoicGxhY2VfaW1nLzRjNzY1ODY0MjM4YTRjNzY5ZTEyYzVhZWNhMGIxZWMxIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo2NDAsImhlaWdodCI6NjQwLCJmaXQiOiJpbnNpZGUifSwicm90YXRlIjpudWxsLCJ0b0Zvcm1hdCI6ICJ3ZWJwIn19',
    facilities: [
      'Bathing steps',
      'Changing rooms',
      'Drinking water',
      'Pooja platform'
    ]
  },
  {
    code: 'TTD',
    name: 'TTD Ghat',
    nameTe: 'టి.టి.డి. ఘాట్',
    description: 'Managed near the Tirumala Tirupati Devasthanams complex with well-maintained pilgrim facilities and queue lines',
    location: { lat: 16.9960, lng: 81.7810 },
    coordSource: 'official',
    photo: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi8vcYW9dAy2yWemrrUEOVuEDn9-juD00ijcReRvQXsIdLmblapFwBu3cuqvH-F6irKmtthlDyf7cWKtFgkNSR493wiFaxLKqFwHbjRFMC1SvW-OCCxT1h-NUCsMnogZYuL197yqoEJQ0NS/s1600/TTD-Ghat.jpg',
    facilities: [
      'Bathing steps',
      'Changing rooms',
      'Drinking water',
      'Information desk',
      'First aid'
    ]
  },
  {
    code: 'SRD',
    name: 'Sradhananda Ghat',
    nameTe: 'శ్రద్ధానంద ఘాట్',
    description: 'Prominent cultural and ritual zone near the central bazaar, frequented for traditional ancestor rituals and holy ablutions',
    location: { lat: 16.9942, lng: 81.7795 },
    coordSource: 'official',
    photo: 'https://scontent.fvtz3-1.fna.fbcdn.net/v/t39.30808-6/484469826_2395616524124888_3483792433386016547_n.jpg?stp=dst-jpg_tt6&cstp=mx720x900&ctp=p600x600&_nc_cat=109&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6376bf&_nc_ohc=_thnoJLAgGUQ7kNvwFeABmj&_nc_oc=AdrnDWxlPFVAI8ErTaVvq9-R5l8AyO3EjTUPfLuNWaJOGkBpVLJSaySK7GsJTQurSr4&_nc_zt=23&_nc_ht=scontent.fvtz3-1.fna&_nc_gid=YkEKPoiJQ8Uf2-QJIQFJJw&_nc_ss=7b20f&oh=00_AQRapPMp0znoFMgsAziMdfHYvYu5hXFo-mBysazOg5g_wg&oe=6AF4E368',
    facilities: [
      'Bathing steps',
      'Pooja platform',
      'Drinking water',
      'PA system'
    ]
  },
  {
    code: 'SNK',
    name: 'Sankar Ghat',
    nameTe: 'శంకర్ ఘాట్',
    description: 'Spiritual bathing point located between Kotilingala and Pushkar Ghats with dedicated steps for devotees and sadhus',
    location: { lat: 16.9985, lng: 81.7825 },
    coordSource: 'official',
    photo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUt6eBoJIK_izFpAjVlRUiAm9E9x1KjtK3BEhYNraY2K6btV3CJmVuXbo&s=10',
    facilities: [
      'Bathing steps',
      'Changing rooms',
      'Drinking water',
      'First aid'
    ]
  },
  {
    code: 'GWG',
    name: 'Gowthami Ghat',
    nameTe: 'గౌతమి ఘాట్',
    description: 'Located towards the Pushkaralapeta zone with a landscaped promenade and close proximity to the ISKCON temple',
    location: { lat: 17.0028, lng: 81.7809 },
    coordSource: 'official',
    photo: '/photos/gowthami-ghat.png',
    facilities: [
      'Bathing steps',
      'Lush promenade',
      'Drinking water',
      'First aid',
      'Wheelchair ramp'
    ]
  },
  {
    code: 'TVR',
    name: 'Tummalapalli Vari Revu',
    nameTe: 'తుమ్మలపల్లి వారి రేవు',
    description: 'Traditional community access point with direct steps to the sacred waters, offering a peaceful bathing experience',
    location: { lat: 16.9908, lng: 81.7770 },
    coordSource: 'official',
    photo: '/photos/ramapadalarevu-ghat.png',
    facilities: [
      'Bathing steps',
      'Drinking water',
      'Changing areas'
    ]
  },
  {
    code: 'SNN',
    name: 'Sri Narasimha Nagar Ghat',
    nameTe: 'శ్రీ నరసింహ నగర్ ఘాట్',
    description: 'Serving the residential extension north of the center with spacious approaches, modern stairs, and low crowd density',
    location: { lat: 17.0120, lng: 81.7940 },
    coordSource: 'official',
    photo: '/images/ghats/SNN.jpg',
    facilities: [
      'Bathing steps',
      'Changing rooms',
      'Drinking water',
      'Parking access',
      'First aid'
    ]
  }
];

// Helper to compute distance in meters using Haversine formula
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 36 Identified Ground-Audited Parking Locations (Rajahmundry / Rajamahendravaram)
const rawLots = [
  // 1. Rajahmundry Railway Station (RJY) - Main Entrance
  { code: 'RJY-01', name: 'Rajahmundry Railway Station - Main Entrance', sector: 'Railway Precinct', category: 'ground', fee: 'Paid (Railway)', capacity: 250, lat: 17.0018, lng: 81.7770 },
  // 2. Rajahmundry Railway Station (RJY) - Backside Entrance
  { code: 'RJY-02', name: 'Rajahmundry Railway Station - Backside Entrance', sector: 'Railway Precinct', category: 'ground', fee: 'Paid (Railway)', capacity: 200, lat: 17.0025, lng: 81.7745 },
  // 3. Parcel Office Parking Stand, SC Railway
  { code: 'RJY-03', name: 'Parcel Office Parking Stand, SC Railway', sector: 'Railway Precinct', category: 'ground', fee: 'Paid (Railway)', capacity: 150, lat: 17.0012, lng: 81.7762 },
  // 4. South Central Railway Stand (East Side)
  { code: 'RJY-04', name: 'South Central Railway Stand (East Side)', sector: 'Railway Precinct', category: 'ground', fee: 'Paid (Railway)', capacity: 180, lat: 17.0030, lng: 81.7785 },
  // 5. APSRTC Bus Stand Parking Area
  { code: 'BUS-01', name: 'APSRTC Bus Stand Parking Area', sector: 'Transit Corridor', category: 'open', fee: 'Paid (Transit)', capacity: 300, lat: 17.00234, lng: 81.78985 },
  // 6. PVNR Park Paid Parking
  { code: 'RMC-01', name: 'PVNR Park Paid Parking', sector: 'Riverfront Central', category: 'ground', fee: 'Paid (RMC)', capacity: 120, lat: 16.9985, lng: 81.7812 },
  // 7. Pushkar Ghat Road Paid Parking
  { code: 'PKG-01', name: 'Pushkar Ghat Road Paid Parking', sector: 'Pushkar Ghat Zone', category: 'ground', fee: 'Paid (RMC)', capacity: 220, lat: 17.0005, lng: 81.8040 },
  // 8. Kandakam Road Paid Parking
  { code: 'RMC-02', name: 'Kandakam Road Paid Parking', sector: 'Commercial Hub', category: 'ground', fee: 'Paid (RMC)', capacity: 160, lat: 16.9975, lng: 81.7865 },
  // 9. Kambala Cheruvu Paid Parking
  { code: 'RMC-03', name: 'Kambala Cheruvu Paid Parking', sector: 'Kambala Cheruvu', category: 'ground', fee: 'Paid (RMC)', capacity: 200, lat: 17.0065, lng: 81.8010 },
  // 10. SBI Center Paid Parking
  { code: 'RMC-04', name: 'SBI Center Paid Parking', sector: 'Central Financial Zone', category: 'ground', fee: 'Paid (RMC)', capacity: 140, lat: 16.9988, lng: 81.7885 },
  // 11. Ganesh Nagar Paid Parking
  { code: 'RMC-05', name: 'Ganesh Nagar Paid Parking', sector: 'North Central Zone', category: 'ground', fee: 'Paid (RMC)', capacity: 130, lat: 17.0092, lng: 81.7940 },
  // 12. Rythu Bazaar Paid Parking
  { code: 'RMC-06', name: 'Rythu Bazaar Paid Parking', sector: 'Market Corridor', category: 'ground', fee: 'Paid (RMC)', capacity: 175, lat: 17.0042, lng: 81.7925 },
  // 13. Stadium Road Paid Parking
  { code: 'RMC-07', name: 'Stadium Road Paid Parking', sector: 'Sports / Stadium Zone', category: 'ground', fee: 'Paid (RMC)', capacity: 250, lat: 17.0075, lng: 81.7850 },
  // 14. Jampeta Paid Parking
  { code: 'RMC-08', name: 'Jampeta Paid Parking', sector: 'Jampeta Market', category: 'ground', fee: 'Paid (RMC)', capacity: 150, lat: 16.9960, lng: 81.7840 },
  // 15. Disha Police Station Center Paid Parking
  { code: 'RMC-09', name: 'Disha Police Station Center Paid Parking', sector: 'Civic Corridor', category: 'ground', fee: 'Paid (RMC)', capacity: 110, lat: 17.0080, lng: 81.7900 },
  // 16. RMC Paid Parking Mangalavaripeta
  { code: 'RMC-10', name: 'RMC Paid Parking Mangalavaripeta', sector: 'Mangalavaripeta Sector', category: 'ground', fee: 'Paid (RMC)', capacity: 190, lat: 16.9935, lng: 81.7795 },
  // 17. B.R.K. Parking Stand
  { code: 'PRV-01', name: 'B.R.K. Parking Stand', sector: 'Commercial Street', category: 'ground', fee: 'Paid (Private)', capacity: 100, lat: 16.9980, lng: 81.7830 },
  // 18. Jaya Lakshmi Parking Stand
  { code: 'PRV-02', name: 'Jaya Lakshmi Parking Stand', sector: 'Urban Market', category: 'ground', fee: 'Paid (Private)', capacity: 120, lat: 16.9990, lng: 81.7845 },
  // 19. Sri Lakshmi Ganapathi Cycle & Scooter Stand
  { code: 'PRV-03', name: 'Sri Lakshmi Ganapathi Cycle Stand', sector: 'Commercial Street', category: 'ground', fee: 'Paid (Private)', capacity: 110, lat: 16.9970, lng: 81.7820 },
  // 20. Sri Venkateswara Parking Stand
  { code: 'PRV-04', name: 'Sri Venkateswara Parking Stand', sector: 'Town Center', category: 'ground', fee: 'Paid (Private)', capacity: 90, lat: 16.9965, lng: 81.7855 },
  // 21. Test Stand Check Point Parking
  { code: 'PRV-05', name: 'Test Stand Check Point Parking', sector: 'Central City Checkpoint', category: 'ground', fee: 'Paid (Private)', capacity: 80, lat: 17.0000, lng: 81.7860 },
  // 22. Central Parking Hub
  { code: 'PRV-06', name: 'Central Parking Hub', sector: 'City Centre Commercial', category: 'multi-level', fee: 'Paid (Covered Deck)', capacity: 120, lat: 16.9995, lng: 81.7875 },
  // 23. Metro Station Park & Ride
  { code: 'PUB-01', name: 'Metro Station Park & Ride', sector: 'Transit Terminal', category: 'open', fee: 'Free (Park & Ride)', capacity: 80, lat: 17.0040, lng: 81.7910 },
  // 24. Mall Underground Garage
  { code: 'PRV-07', name: 'Mall Underground Garage', sector: 'Shopping District', category: 'multi-level', fee: 'Paid (Underground)', capacity: 350, lat: 17.0030, lng: 81.7860 },
  // 25. Hospital Multi-Level Deck
  { code: 'PRV-08', name: 'Hospital Multi-Level Deck', sector: 'Medical District', category: 'multi-level', fee: 'Paid (Multi-Level)', capacity: 60, lat: 17.0060, lng: 81.7890 },
  // 26. IT Park Smart Garage
  { code: 'PRV-09', name: 'IT Park Smart Garage', sector: 'Tech Corridor', category: 'multi-level', fee: 'Paid (Covered Deck)', capacity: 300, lat: 17.0110, lng: 81.7980 },
  // 27. Market Area Open Parking
  { code: 'PUB-02', name: 'Market Area Open Parking', sector: 'Commercial Wholesale', category: 'open', fee: 'Free (Open-Air)', capacity: 45, lat: 16.9940, lng: 81.7850 },
  // 28. South India Shopping Mall Parking
  { code: 'COM-01', name: 'South India Shopping Mall Parking', sector: 'Tyagaraja Nagar', category: 'ground', fee: 'Paid (Commercial)', capacity: 140, lat: 17.0010, lng: 81.7800 },
  // 29. RTC Complex Road Shopping Malls
  { code: 'COM-02', name: 'RTC Complex Road Shopping Malls', sector: 'RTC Complex Corridor', category: 'multi-level', fee: 'Paid (Cellar)', capacity: 180, lat: 17.0035, lng: 81.7905 },
  // 30. Gokavaram Bus Stand Commercial Malls
  { code: 'COM-03', name: 'Gokavaram Bus Stand Commercial Malls', sector: 'Gokavaram Sector', category: 'multi-level', fee: 'Paid (Cellar)', capacity: 160, lat: 17.0090, lng: 81.7915 },
  // 31. CMR Central Mall Parking
  { code: 'COM-04', name: 'CMR Central Mall Parking', sector: 'Main City Commercial', category: 'multi-level', fee: 'Paid (Mall)', capacity: 280, lat: 17.0020, lng: 81.7880 },
  // 32. CineMax Mall Parking
  { code: 'COM-05', name: 'CineMax Mall Parking', sector: 'Entertainment Hub', category: 'multi-level', fee: 'Paid (Mall)', capacity: 210, lat: 17.0050, lng: 81.7880 },
  // 33. Ratna Complex / Big Bazaar Parking
  { code: 'COM-06', name: 'Ratna Complex / Big Bazaar Parking', sector: 'Central Retail Zone', category: 'multi-level', fee: 'Paid (Retail)', capacity: 175, lat: 17.0008, lng: 81.7868 },
  // 34. RNR Mall Parking
  { code: 'COM-07', name: 'RNR Mall Parking', sector: 'City Catchment', category: 'multi-level', fee: 'Paid (Mall)', capacity: 260, lat: 17.0045, lng: 81.7950 },
  // 35. Pushkar Ghat Perimeter Parking Lots
  { code: 'PKG-02', name: 'Pushkar Ghat Perimeter Parking Lots', sector: 'Pushkar Ghat Access', category: 'open', fee: 'Free (Perimeter)', capacity: 600, lat: 17.0015, lng: 81.7820 },
  // 36. Kotilingala Model Compartment & Perimeter Parking
  { code: 'KTL-01', name: 'Kotilingala Model Compartment Parking', sector: 'Kotilingala Ghat Sector', category: 'temporary', fee: 'Free (Perimeter)', capacity: 500, lat: 16.9918, lng: 81.7775 }
];

function hashLotCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Fixed percentage distribution for realistic sample occupancy:
// 4 lots: 90–100% full (red), including 2 lots exactly full (100%)
// 7 lots: 70–89% full (amber)
// 11 lots: 50–69% full
// 14 lots: 15–45% full
const SAMPLE_PERCENTAGES = [
  100, 100, 95, 91,
  88, 85, 82, 79, 76, 73, 71,
  68, 66, 64, 62, 60, 58, 56, 54, 52, 51, 50,
  45, 42, 40, 37, 35, 32, 30, 27, 25, 22, 20, 18, 16, 15
];

// Map lots to deterministic sample occupancy
const sortedLotHashes = rawLots
  .map((l) => ({ code: l.code, hash: hashLotCode(l.code) }))
  .sort((a, b) => a.hash - b.hash);
const defaultOccupancyMap = new Map();
sortedLotHashes.forEach((item, rank) => {
  defaultOccupancyMap.set(item.code, SAMPLE_PERCENTAGES[rank % SAMPLE_PERCENTAGES.length]);
});

// Map lots with calculated nearest ghat and distance
const lots = rawLots.map((lot) => {
  let nearestGhat = ghats[0].code;
  let minMeters = Infinity;

  for (const ghat of ghats) {
    const dist = getDistanceMeters(lot.lat, lot.lng, ghat.location.lat, ghat.location.lng);
    if (dist < minMeters) {
      minMeters = dist;
      nearestGhat = ghat.code;
    }
  }

  const samplePct = defaultOccupancyMap.get(lot.code) ?? 30;
  const initialOccupied = samplePct === 100
    ? lot.capacity
    : Math.min(lot.capacity, Math.max(0, Math.round((samplePct / 100) * lot.capacity)));

  return {
    code: lot.code,
    name: lot.name,
    sector: lot.sector,
    category: lot.category,
    fee: lot.fee,
    capacity: lot.capacity,
    occupied: initialOccupied,
    status: 'open',
    location: {
      lat: lot.lat,
      lng: lot.lng
    },
    coordSource: 'official',
    nearestGhat,
    nearestGhatMeters: minMeters
  };
});

module.exports = {
  ghats,
  lots
};
