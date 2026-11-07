// PushkarPath Static Data Fallback for Zero-Crash Offline / Netlify / Vercel Deployments

export const FALLBACK_GHATS = [
  {
    code: 'PKG',
    name: 'Pushkar Ghat',
    nameTe: 'పుష్కర్ ఘాట్',
    description: 'The main and most central holy bathing ghat for Godavari Pushkaralu, closest to historic bridge and VIP bathing steps',
    location: { lat: 17.0005, lng: 81.7838 },
    coordSource: 'official',
    photo: '/photos/pushkar-ghat.png',
    facilities: ['Bathing steps', 'Changing rooms', 'Pooja platform', 'PA system', 'Drinking water', 'First aid', 'Wheelchair ramp']
  },
  {
    code: 'KTL',
    name: 'Kotilingala Ghat / Kotilingala Revu',
    nameTe: 'కోటిలింగాల రేవు ఘాట్',
    description: 'One of the oldest, largest, and busiest bathing locations near Kotilingeshwara temple, with continuous stepped bathing frontage',
    location: { lat: 16.9920, lng: 81.7780 },
    coordSource: 'official',
    photo: '/photos/kotilingala-ghat.png',
    facilities: ['Bathing steps', 'Changing rooms', 'Drinking water', 'Temple access', 'First aid']
  },
  {
    code: 'SRW',
    name: 'Saraswathi Ghat',
    nameTe: 'సరస్వతీ ఘాట్',
    description: 'Designated modern VIP ghat area along the riverfront, popular for serene morning prayers and rituals',
    location: { lat: 17.0060, lng: 81.7900 },
    coordSource: 'official',
    photo: '/photos/saraswathi-ghat.png',
    facilities: ['Bathing steps', 'Pooja platform', 'Drinking water', 'Changing rooms']
  },
  {
    code: 'MRK',
    name: 'Markandeya Ghat',
    nameTe: 'మార్కండేయ ఘాట్',
    description: 'Located adjacent to the historic Markandeyaswamy temple, rich in spiritual heritage and dedicated ritual spaces',
    location: { lat: 16.9880, lng: 81.7750 },
    coordSource: 'official',
    photo: '/photos/markandeya-ghat.png',
    facilities: ['Bathing steps', 'Changing rooms', 'Drinking water', 'First aid']
  },
  {
    code: 'PDM',
    name: 'Padmavathi Ghat',
    nameTe: 'పద్మావతి ఘాట్',
    description: 'Closely paired along the core town stretch with wide river steps and easy vehicular access',
    location: { lat: 16.9895, lng: 81.7762 },
    coordSource: 'official',
    photo: 'https://d2kihw5e8drjh5.cloudfront.net/eyJidWNrZXQiOiJ1dGEtaW1hZ2VzIiwia2V5IjoicGxhY2VfaW1nLzRjNzY1ODY0MjM4YTRjNzY5ZTEyYzVhZWNhMGIxZWMxIiwiZWRpdHMiOnsicmVzaXplIjp7IndpZHRoIjo2NDAsImhlaWdodCI6NjQwLCJmaXQiOiJpbnNpZGUifSwicm90YXRlIjpudWxsLCJ0b0Zvcm1hdCI6ICJ3ZWJwIn19',
    facilities: ['Bathing steps', 'Changing rooms', 'Drinking water', 'Pooja platform']
  },
  {
    code: 'TTD',
    name: 'TTD Ghat',
    nameTe: 'టి.టి.డి. ఘాట్',
    description: 'Managed near the Tirumala Tirupati Devasthanams complex with well-maintained pilgrim facilities and queue lines',
    location: { lat: 16.9960, lng: 81.7810 },
    coordSource: 'official',
    photo: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi8vcYW9dAy2yWemrrUEOVuEDn9-juD00ijcReRvQXsIdLmblapFwBu3cuqvH-F6irKmtthlDyf7cWKtFgkNSR493wiFaxLKqFwHbjRFMC1SvW-OCCxT1h-NUCsMnogZYuL197yqoEJQ0NS/s1600/TTD-Ghat.jpg',
    facilities: ['Bathing steps', 'Changing rooms', 'Drinking water', 'Information desk', 'First aid']
  },
  {
    code: 'SRD',
    name: 'Sradhananda Ghat',
    nameTe: 'శ్రద్ధానంద ఘాట్',
    description: 'Prominent cultural and ritual zone near the central bazaar, frequented for traditional ancestor rituals and holy ablutions',
    location: { lat: 16.9942, lng: 81.7795 },
    coordSource: 'official',
    photo: 'https://scontent.fvtz3-1.fna.fbcdn.net/v/t39.30808-6/484469826_2395616524124888_3483792433386016547_n.jpg?stp=dst-jpg_tt6&cstp=mx720x900&ctp=p600x600&_nc_cat=109&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6376bf&_nc_ohc=_thnoJLAgGUQ7kNvwFeABmj&_nc_oc=AdrnDWxlPFVAI8ErTaVvq9-R5l8AyO3EjTUPfLuNWaJOGkBpVLJSaySK7GsJTQurSr4&_nc_zt=23&_nc_ht=scontent.fvtz3-1.fna&_nc_gid=YkEKPoiJQ8Uf2-QJIQFJJw&_nc_ss=7b20f&oh=00_AQRapPMp0znoFMgsAziMdfHYvYu5hXFo-mBysazOg5g_wg&oe=6AF4E368',
    facilities: ['Bathing steps', 'Pooja platform', 'Drinking water', 'PA system']
  },
  {
    code: 'SNK',
    name: 'Sankar Ghat',
    nameTe: 'శంకర్ ఘాట్',
    description: 'Spiritual bathing point located between Kotilingala and Pushkar Ghats with dedicated steps for devotees and sadhus',
    location: { lat: 16.9985, lng: 81.7825 },
    coordSource: 'official',
    photo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUt6eBoJIK_izFpAjVlRUiAm9E9x1KjtK3BEhYNraY2K6btV3CJmVuXbo&s=10',
    facilities: ['Bathing steps', 'Changing rooms', 'Drinking water', 'First aid']
  },
  {
    code: 'GWG',
    name: 'Gowthami Ghat',
    nameTe: 'గౌతమి ఘాట్',
    description: 'Located towards the Pushkaralapeta zone with a landscaped promenade and close proximity to the ISKCON temple',
    location: { lat: 17.0028, lng: 81.7809 },
    coordSource: 'official',
    photo: '/photos/gowthami-ghat.png',
    facilities: ['Bathing steps', 'Lush promenade', 'Drinking water', 'First aid', 'Wheelchair ramp']
  },
  {
    code: 'TVR',
    name: 'Tummalapalli Vari Revu',
    nameTe: 'తుమ్మలపల్లి వారి రేవు',
    description: 'Traditional community access point with direct steps to the sacred waters, offering a peaceful bathing experience',
    location: { lat: 16.9908, lng: 81.7770 },
    coordSource: 'official',
    photo: '/photos/ramapadalarevu-ghat.png',
    facilities: ['Bathing steps', 'Drinking water', 'Changing areas']
  },
  {
    code: 'SNN',
    name: 'Sri Narasimha Nagar Ghat',
    nameTe: 'శ్రీ నరసింహ నగర్ ఘాట్',
    description: 'Serving the residential extension north of the center with spacious approaches, modern stairs, and low crowd density',
    location: { lat: 17.0120, lng: 81.7940 },
    coordSource: 'official',
    photo: '/images/ghats/SNN.jpg',
    facilities: ['Bathing steps', 'Changing rooms', 'Drinking water', 'Parking access', 'First aid']
  }
];

export const FALLBACK_LOTS = [
  { code: 'PKG-01', name: 'Pushkar Ghat Main Ground', sector: 'Pushkar Core Sector', category: 'open', fee: 'Free (Pushkaralu)', capacity: 350, occupied: 320, status: 'open', location: { lat: 17.0041, lng: 81.7762 }, nearestGhat: 'PKG', nearestGhatMeters: 450 },
  { code: 'PKG-02', name: 'Pushkar Ghat Perimeter Parking Lots', sector: 'Pushkar Ghat Access', category: 'open', fee: 'Free (Perimeter)', capacity: 600, occupied: 570, status: 'open', location: { lat: 17.0015, lng: 81.782 }, nearestGhat: 'PKG', nearestGhatMeters: 250 },
  { code: 'KTL-01', name: 'Kotilingala Model Compartment Parking', sector: 'Kotilingala Ghat Sector', category: 'temporary', fee: 'Free (Perimeter)', capacity: 500, occupied: 410, status: 'open', location: { lat: 16.9918, lng: 81.7775 }, nearestGhat: 'KTL', nearestGhatMeters: 180 },
  { code: 'SRW-01', name: 'Saraswathi Ghat North Yard', sector: 'Saraswathi Sector', category: 'open', fee: 'Free', capacity: 300, occupied: 210, status: 'open', location: { lat: 17.007, lng: 81.7915 }, nearestGhat: 'SRW', nearestGhatMeters: 200 },
  { code: 'MRK-01', name: 'Markandeya Temple North Gate', sector: 'Markandeya Sector', category: 'open', fee: 'Free', capacity: 280, occupied: 190, status: 'open', location: { lat: 16.9885, lng: 81.776 }, nearestGhat: 'MRK', nearestGhatMeters: 120 },
  { code: 'PDM-01', name: 'Padmavathi Riverfront Forecourt', sector: 'Core Town Stretch', category: 'open', fee: 'Free', capacity: 220, occupied: 110, status: 'open', location: { lat: 16.9902, lng: 81.777 }, nearestGhat: 'PDM', nearestGhatMeters: 150 },
  { code: 'TTD-01', name: 'TTD Kalyana Mandapam Grounds', sector: 'TTD Pilgrimage Sector', category: 'open', fee: 'Free', capacity: 400, occupied: 290, status: 'open', location: { lat: 16.9968, lng: 81.7825 }, nearestGhat: 'TTD', nearestGhatMeters: 220 },
  { code: 'SRD-01', name: 'Sradhananda Bazaar Approach Parking', sector: 'Bazaar Ritual Sector', category: 'temporary', fee: 'Free', capacity: 250, occupied: 180, status: 'open', location: { lat: 16.9948, lng: 81.7805 }, nearestGhat: 'SRD', nearestGhatMeters: 140 },
  { code: 'SNK-01', name: 'Sankar Ghat Sadhus & Devotee Yard', sector: 'Central Ghat Corridor', category: 'open', fee: 'Free', capacity: 180, occupied: 95, status: 'open', location: { lat: 16.999, lng: 81.783 }, nearestGhat: 'SNK', nearestGhatMeters: 110 },
  { code: 'GWG-01', name: 'Gowthami Promenade Satellite Lot', sector: 'Pushkaralapeta Zone', category: 'open', fee: 'Free', capacity: 450, occupied: 310, status: 'open', location: { lat: 17.0035, lng: 81.7818 }, nearestGhat: 'GWG', nearestGhatMeters: 190 },
  { code: 'TVR-01', name: 'Tummalapalli Access Bay', sector: 'Traditional Revu Access', category: 'open', fee: 'Free', capacity: 150, occupied: 60, status: 'open', location: { lat: 16.9912, lng: 81.778 }, nearestGhat: 'TVR', nearestGhatMeters: 130 },
  { code: 'SNN-01', name: 'Sri Narasimha Nagar Staging Bay', sector: 'Northern Residential Sector', category: 'open', fee: 'Free', capacity: 550, occupied: 220, status: 'open', location: { lat: 17.0128, lng: 81.795 }, nearestGhat: 'SNN', nearestGhatMeters: 160 },
  { code: 'RMC-09', name: 'Diwancheruvu High Capacity Hub', sector: 'Highway Transit Sector', category: 'open', fee: 'Free', capacity: 500, occupied: 500, status: 'open', location: { lat: 17.052, lng: 81.82 }, nearestGhat: 'PKG', nearestGhatMeters: 4200 },
  { code: 'RMC-10', name: 'Morampudi Mega Satellite Ground', sector: 'Highway Transit Sector', category: 'open', fee: 'Free', capacity: 600, occupied: 600, status: 'open', location: { lat: 17.025, lng: 81.802 }, nearestGhat: 'PKG', nearestGhatMeters: 3100 }
];

