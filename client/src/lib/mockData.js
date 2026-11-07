/**
 * Mock & Seed Dataset for PushkarPath Frontend
 * Realistic Rajahmundry coordinates, all 54 parking areas categorized into sectors,
 * Godavari river ghats with Telugu names, facilities, and mock simulation data.
 */

export const MOCK_GHATS = [
  {
    code: 'GH-01',
    name: 'Pushkar Ghat',
    nameTe: 'పుష్కర ఘాట్',
    description: 'The holiest and premier ghat of Rajahmundry, main center of Godavari Pushkaralu ceremonies and evening Maha Harati.',
    location: { lat: 17.0028, lng: 81.7745 },
    photo: '',
    facilities: ['VIP Changing Rooms', 'Drinking Water (Jala Seva)', 'Medical First Aid Camp', 'Wheelchair Ramp', 'Luggage Cloakroom', 'Police Help Desk'],
  },
  {
    code: 'GH-02',
    name: 'Kotilingala Ghat',
    nameTe: 'కోటిలింగాల ఘాట్',
    description: 'Ancient bathing ghat near Kotilingeswara temple known for grand steps and peaceful morning holy dips.',
    location: { lat: 17.0142, lng: 81.7692 },
    photo: '',
    facilities: ['Drinking Water', 'Cloakroom', 'Emergency Boat Team', 'Changing Rooms', 'First Aid'],
  },
  {
    code: 'GH-03',
    name: 'Saraswathi Ghat',
    nameTe: 'సరస్వతి ఘాట్',
    description: 'High capacity spiritual bathing ghat with expansive pavilions and direct transit road access.',
    location: { lat: 17.0095, lng: 81.7718 },
    photo: '',
    facilities: ['Changing Rooms', 'Drinking Water', 'Children Lost & Found Post', 'Sanitation Kiosks'],
  },
  {
    code: 'GH-04',
    name: 'Markandeya Ghat',
    nameTe: 'మార్కండేయ ఘాట్',
    description: 'Sacred heritage ghat situated beside Markandeyeswara Swamy temple, beloved by local pilgrims.',
    location: { lat: 16.9972, lng: 81.7782 },
    photo: '',
    facilities: ['Drinking Water', 'Medical Camp', 'Wheelchair Access'],
  },
  {
    code: 'GH-05',
    name: 'VIP & Gautami Ghat',
    nameTe: 'వి.ఐ.పి మరియు గౌతమి ఘాట్',
    description: 'Designated protocols for senior citizens, dignitaries, and ISKCON temple access.',
    location: { lat: 17.0068, lng: 81.7731 },
    photo: '',
    facilities: ['Priority Lanes', 'Wheelchair Assist', 'Dedicated Ambulance Station', 'Air-cooled Waiting Lounges'],
  },
  {
    code: 'GH-06',
    name: 'Subrahmanya Ghat',
    nameTe: 'సుబ్రహ్మణ్య ఘాట్',
    description: 'Quiet family-friendly ghat situated towards southern canal junction.',
    location: { lat: 16.9890, lng: 81.7820 },
    photo: '',
    facilities: ['Drinking Water', 'Changing Tents', 'Volunteers Hub'],
  },
];

// 54 Parking Lots organized into 5 Strategic Sectors across Rajahmundry
export const MOCK_LOTS = [
  // Sector 1: Pushkar Ghat Core Sector
  { code: 'PK-01', name: 'Pushkar Ghat Main Ground', sector: 'Pushkar Core Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 350, occupied: 320, status: 'open', location: { lat: 17.0041, lng: 81.7762 }, ghatProximity: 'GH-01' },
  { code: 'PK-02', name: 'Pushkar Municipal High School', sector: 'Pushkar Core Sector', category: 'Two Wheeler', fee: 20, capacity: 400, occupied: 180, status: 'open', location: { lat: 17.0055, lng: 81.7780 }, ghatProximity: 'GH-01' },
  { code: 'PK-03', name: 'Godavari Bund North Lot', sector: 'Pushkar Core Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 200, occupied: 195, status: 'open', location: { lat: 17.0018, lng: 81.7758 }, ghatProximity: 'GH-01' },
  { code: 'PK-04', name: 'Old Bus Stand Grounds', sector: 'Pushkar Core Sector', category: 'Heavy / Bus', fee: 100, capacity: 120, occupied: 45, status: 'open', location: { lat: 17.0070, lng: 81.7810 }, ghatProximity: 'GH-01' },
  { code: 'PK-05', name: 'Fort Gate Community Lot', sector: 'Pushkar Core Sector', category: 'Two Wheeler', fee: 0, capacity: 300, occupied: 110, status: 'open', location: { lat: 17.0035, lng: 81.7795 }, ghatProximity: 'GH-01' },
  { code: 'PK-06', name: 'Gautami Library Lane Lot', sector: 'Pushkar Core Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 150, occupied: 142, status: 'open', location: { lat: 17.0010, lng: 81.7770 }, ghatProximity: 'GH-01' },
  { code: 'PK-07', name: 'Main Road Multi-level Point', sector: 'Pushkar Core Sector', category: 'Two Wheeler', fee: 30, capacity: 500, occupied: 290, status: 'open', location: { lat: 17.0080, lng: 81.7830 }, ghatProximity: 'GH-01' },
  { code: 'PK-08', name: 'Devichowk Open Ground', sector: 'Pushkar Core Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 220, occupied: 80, status: 'open', location: { lat: 17.0090, lng: 81.7850 }, ghatProximity: 'GH-01' },
  { code: 'PK-09', name: 'Syndicate Bank Cross Parking', sector: 'Pushkar Core Sector', category: 'Two Wheeler', fee: 20, capacity: 250, occupied: 160, status: 'open', location: { lat: 17.0060, lng: 81.7845 }, ghatProximity: 'GH-01' },
  { code: 'PK-10', name: 'Pushkar Ghat VIP Terminal', sector: 'Pushkar Core Sector', category: 'VIP Pass', fee: 0, capacity: 80, occupied: 65, status: 'open', location: { lat: 17.0030, lng: 81.7750 }, ghatProximity: 'GH-01' },

  // Sector 2: Kotilingala & Saraswathi Sector
  { code: 'KS-11', name: 'Kotilingala Temple Forecourt', sector: 'Kotilingala Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 280, occupied: 210, status: 'open', location: { lat: 17.0150, lng: 81.7710 }, ghatProximity: 'GH-02' },
  { code: 'KS-12', name: 'River View Park South', sector: 'Kotilingala Sector', category: 'Two Wheeler', fee: 20, capacity: 350, occupied: 120, status: 'open', location: { lat: 17.0130, lng: 81.7725 }, ghatProximity: 'GH-02' },
  { code: 'KS-13', name: 'Saraswathi Ghat North Yard', sector: 'Kotilingala Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 300, occupied: 275, status: 'open', location: { lat: 17.0105, lng: 81.7730 }, ghatProximity: 'GH-03' },
  { code: 'KS-14', name: 'Aryapuram Municipal Complex', sector: 'Kotilingala Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 240, occupied: 90, status: 'open', location: { lat: 17.0165, lng: 81.7750 }, ghatProximity: 'GH-02' },
  { code: 'KS-15', name: 'Saraswathi School Grounds', sector: 'Kotilingala Sector', category: 'Two Wheeler', fee: 10, capacity: 450, occupied: 190, status: 'open', location: { lat: 17.0090, lng: 81.7740 }, ghatProximity: 'GH-03' },
  { code: 'KS-16', name: 'Kumari Talkies Open Bay', sector: 'Kotilingala Sector', category: 'Heavy / Bus', fee: 80, capacity: 90, occupied: 30, status: 'open', location: { lat: 17.0180, lng: 81.7780 }, ghatProximity: 'GH-02' },
  { code: 'KS-17', name: 'Alcot Gardens West Lot', sector: 'Kotilingala Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 180, occupied: 110, status: 'open', location: { lat: 17.0120, lng: 81.7770 }, ghatProximity: 'GH-03' },
  { code: 'KS-18', name: 'Rajahmundry Club Annex', sector: 'Kotilingala Sector', category: 'Two Wheeler', fee: 20, capacity: 220, occupied: 70, status: 'open', location: { lat: 17.0140, lng: 81.7760 }, ghatProximity: 'GH-02' },
  { code: 'KS-19', name: 'Godavari Bund Service Bay', sector: 'Kotilingala Sector', category: 'Two Wheeler', fee: 0, capacity: 150, occupied: 135, status: 'closed', location: { lat: 17.0110, lng: 81.7715 }, ghatProximity: 'GH-03' },
  { code: 'KS-20', name: 'ISCON Heritage Ground', sector: 'Kotilingala Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 320, occupied: 240, status: 'open', location: { lat: 17.0085, lng: 81.7725 }, ghatProximity: 'GH-03' },
  { code: 'KS-21', name: 'Gautami Ghat Transit Hub', sector: 'Kotilingala Sector', category: 'Heavy / Bus', fee: 100, capacity: 110, occupied: 85, status: 'open', location: { lat: 17.0075, lng: 81.7745 }, ghatProximity: 'GH-05' },

  // Sector 3: Markandeya & Rail Bridge Sector
  { code: 'MR-22', name: 'Markandeya Temple North Gate', sector: 'Markandeya Sector', category: 'Two Wheeler', fee: 10, capacity: 300, occupied: 260, status: 'open', location: { lat: 16.9980, lng: 81.7790 }, ghatProximity: 'GH-04' },
  { code: 'MR-23', name: 'Havelock Bridge View Yard', sector: 'Markandeya Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 250, occupied: 210, status: 'open', location: { lat: 16.9960, lng: 81.7765 }, ghatProximity: 'GH-04' },
  { code: 'MR-24', name: 'Railway Station East Yard', sector: 'Markandeya Sector', category: 'Car / 4-Wheeler', fee: 60, capacity: 420, occupied: 310, status: 'open', location: { lat: 16.9940, lng: 81.7840 }, ghatProximity: 'GH-04' },
  { code: 'MR-25', name: 'Railway Station West Two-Wheeler', sector: 'Markandeya Sector', category: 'Two Wheeler', fee: 20, capacity: 600, occupied: 410, status: 'open', location: { lat: 16.9935, lng: 81.7820 }, ghatProximity: 'GH-04' },
  { code: 'MR-26', name: 'Innespeta Police Grounds', sector: 'Markandeya Sector', category: 'Heavy / Bus', fee: 100, capacity: 140, occupied: 92, status: 'open', location: { lat: 16.9920, lng: 81.7800 }, ghatProximity: 'GH-04' },
  { code: 'MR-27', name: 'Subrahmanya Canal Embankment', sector: 'Markandeya Sector', category: 'Two Wheeler', fee: 0, capacity: 180, occupied: 60, status: 'open', location: { lat: 16.9895, lng: 81.7830 }, ghatProximity: 'GH-06' },
  { code: 'MR-28', name: 'Lala Cheruvu Junction Area', sector: 'Markandeya Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 300, occupied: 150, status: 'open', location: { lat: 16.9910, lng: 81.7870 }, ghatProximity: 'GH-06' },
  { code: 'MR-29', name: 'Dowleswaram Approach Lot A', sector: 'Markandeya Sector', category: 'Heavy / Bus', fee: 100, capacity: 160, occupied: 50, status: 'open', location: { lat: 16.9850, lng: 81.7850 }, ghatProximity: 'GH-06' },
  { code: 'MR-30', name: 'Subrahmanya Grounds West', sector: 'Markandeya Sector', category: 'Two Wheeler', fee: 20, capacity: 250, occupied: 120, status: 'open', location: { lat: 16.9880, lng: 81.7815 }, ghatProximity: 'GH-06' },
  { code: 'MR-31', name: 'Barrage Road Overflow Lot', sector: 'Markandeya Sector', category: 'Car / 4-Wheeler', fee: 30, capacity: 200, occupied: 40, status: 'open', location: { lat: 16.9830, lng: 81.7880 }, ghatProximity: 'GH-06' },
  { code: 'MR-32', name: 'Godavari Arch Bridge Depot', sector: 'Markandeya Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 350, occupied: 315, status: 'open', location: { lat: 16.9995, lng: 81.7770 }, ghatProximity: 'GH-04' },

  // Sector 4: National Highway & Transit Hub Sector (Outskirts)
  { code: 'NH-33', name: 'NH-16 Morampudi Junction Mega Lot', sector: 'Highway Transit Sector', category: 'Heavy / Bus', fee: 100, capacity: 800, occupied: 340, status: 'open', location: { lat: 17.0250, lng: 81.8020 }, ghatProximity: 'GH-01' },
  { code: 'NH-34', name: 'Morampudi Flyover Underpass A', sector: 'Highway Transit Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 350, occupied: 140, status: 'open', location: { lat: 17.0235, lng: 81.8005 }, ghatProximity: 'GH-01' },
  { code: 'NH-35', name: 'Morampudi Two-Wheeler Transit Point', sector: 'Highway Transit Sector', category: 'Two Wheeler', fee: 0, capacity: 500, occupied: 160, status: 'open', location: { lat: 17.0220, lng: 81.8030 }, ghatProximity: 'GH-01' },
  { code: 'NH-36', name: 'Diwancheruvu High Capacity Hub', sector: 'Highway Transit Sector', category: 'Heavy / Bus', fee: 120, capacity: 1000, occupied: 480, status: 'open', location: { lat: 17.0520, lng: 81.8200 }, ghatProximity: 'GH-02' },
  { code: 'NH-37', name: 'Lalacheruvu Ring Road Staging Bay', sector: 'Highway Transit Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 600, occupied: 290, status: 'open', location: { lat: 17.0180, lng: 81.8150 }, ghatProximity: 'GH-01' },
  { code: 'NH-38', name: 'Lalacheruvu Bus Parking Terminal', sector: 'Highway Transit Sector', category: 'Heavy / Bus', fee: 100, capacity: 450, occupied: 210, status: 'open', location: { lat: 17.0160, lng: 81.8180 }, ghatProximity: 'GH-01' },
  { code: 'NH-39', name: 'APSRTC Central Bus Station Reserve', sector: 'Highway Transit Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 250, occupied: 235, status: 'open', location: { lat: 17.0080, lng: 81.7920 }, ghatProximity: 'GH-01' },
  { code: 'NH-40', name: 'Kambala Cheruvu East Lot', sector: 'Highway Transit Sector', category: 'Two Wheeler', fee: 20, capacity: 400, occupied: 220, status: 'open', location: { lat: 17.0110, lng: 81.7890 }, ghatProximity: 'GH-03' },
  { code: 'NH-41', name: 'Kambala Cheruvu Park West', sector: 'Highway Transit Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 200, occupied: 180, status: 'open', location: { lat: 17.0125, lng: 81.7870 }, ghatProximity: 'GH-03' },
  { code: 'NH-42', name: 'Danavaipeta Municipal Ground', sector: 'Highway Transit Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 320, occupied: 280, status: 'open', location: { lat: 17.0040, lng: 81.7885 }, ghatProximity: 'GH-01' },
  { code: 'NH-43', name: 'Subhash Road Shuttle Hub', sector: 'Highway Transit Sector', category: 'Two Wheeler', fee: 10, capacity: 350, occupied: 110, status: 'open', location: { lat: 17.0065, lng: 81.7870 }, ghatProximity: 'GH-01' },

  // Sector 5: Outer Perimeter & Satellite Shuttles
  { code: 'OP-44', name: 'Bommuru Satellite Park & Ride', sector: 'Outer Perimeter Sector', category: 'Heavy / Bus', fee: 80, capacity: 900, occupied: 310, status: 'open', location: { lat: 16.9680, lng: 81.8050 }, ghatProximity: 'GH-06' },
  { code: 'OP-45', name: 'Bommuru Cars Terminal', sector: 'Outer Perimeter Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 550, occupied: 180, status: 'open', location: { lat: 16.9695, lng: 81.8030 }, ghatProximity: 'GH-06' },
  { code: 'OP-46', name: 'Hukumpeta Agricultural Market Lot', sector: 'Outer Perimeter Sector', category: 'Car / 4-Wheeler', fee: 30, capacity: 400, occupied: 120, status: 'open', location: { lat: 16.9800, lng: 81.8150 }, ghatProximity: 'GH-06' },
  { code: 'OP-47', name: 'Vemagiri Bypass Staging Area', sector: 'Outer Perimeter Sector', category: 'Heavy / Bus', fee: 100, capacity: 700, occupied: 280, status: 'open', location: { lat: 16.9550, lng: 81.8000 }, ghatProximity: 'GH-06' },
  { code: 'OP-48', name: 'Kovvur Tollgate North Terminal', sector: 'Outer Perimeter Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 500, occupied: 210, status: 'open', location: { lat: 17.0180, lng: 81.7380 }, ghatProximity: 'GH-02' },
  { code: 'OP-49', name: 'Kovvur Goshpada Kshetram Parking', sector: 'Outer Perimeter Sector', category: 'Two Wheeler', fee: 10, capacity: 400, occupied: 150, status: 'open', location: { lat: 17.0120, lng: 81.7450 }, ghatProximity: 'GH-02' },
  { code: 'OP-50', name: 'Airport Road Madhurapudi Lot', sector: 'Outer Perimeter Sector', category: 'Car / 4-Wheeler', fee: 50, capacity: 600, occupied: 190, status: 'open', location: { lat: 17.0900, lng: 81.8250 }, ghatProximity: 'GH-02' },
  { code: 'OP-51', name: 'Dowleswaram Cotton Museum Ground', sector: 'Outer Perimeter Sector', category: 'Car / 4-Wheeler', fee: 40, capacity: 250, occupied: 160, status: 'open', location: { lat: 16.9480, lng: 81.7750 }, ghatProximity: 'GH-06' },
  { code: 'OP-52', name: 'Gollapudi Canal Side Overflow', sector: 'Outer Perimeter Sector', category: 'Two Wheeler', fee: 0, capacity: 200, occupied: 45, status: 'open', location: { lat: 16.9920, lng: 81.7950 }, ghatProximity: 'GH-04' },
  { code: 'OP-53', name: 'Tadithota Police Parade Field', sector: 'Outer Perimeter Sector', category: 'Official / Police', fee: 0, capacity: 150, occupied: 90, status: 'open', location: { lat: 17.0015, lng: 81.7910 }, ghatProximity: 'GH-01' },
  { code: 'OP-54', name: 'River Crest Emergency Depot', sector: 'Outer Perimeter Sector', category: 'Emergency Services', fee: 0, capacity: 100, occupied: 18, status: 'open', location: { lat: 17.0100, lng: 81.7680 }, ghatProximity: 'GH-02' },
];

export const MOCK_STAFF = [
  { id: 'STF-001', staffId: 'VOL-101', name: 'Ravi Kumar Varma', role: 'staff', kind: 'volunteer', assignedLot: 'PK-01', assignedPoint: 'ENTRY', active: true, phone: '9848011223' },
  { id: 'STF-002', staffId: 'VOL-102', name: 'Priya Ananth', role: 'staff', kind: 'volunteer', assignedLot: 'PK-01', assignedPoint: 'EXIT', active: true, phone: '9848022334' },
  { id: 'STF-003', staffId: 'POL-201', name: 'SI N. Chandrasekhar', role: 'staff', kind: 'police', assignedLot: 'KS-11', assignedPoint: 'ENTRY', active: true, phone: '9848033445' },
  { id: 'STF-004', staffId: 'VOL-104', name: 'Srinivasa Rao G.', role: 'staff', kind: 'volunteer', assignedLot: 'MR-22', assignedPoint: 'ENTRY', active: true, phone: '9848044556' },
  { id: 'STF-005', staffId: 'ADM-001', name: 'Dr. K. Ramalingam (IAS)', role: 'admin', kind: 'admin', assignedLot: 'ALL', assignedPoint: 'ALL', active: true, phone: '9848055667' },
];

export const MOCK_VEHICLES = [
  { vehicleNo: 'AP 05 BG 2415', type: '4-Wheeler / Car', phone: '9848012345', insideLot: 'PK-01', lastEntryAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { vehicleNo: 'AP 31 CT 8892', type: '2-Wheeler', phone: '9848054321', insideLot: 'KS-11', lastEntryAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { vehicleNo: 'TS 09 EZ 4410', type: '4-Wheeler / Car', phone: '9440011223', insideLot: 'NH-33', lastEntryAt: new Date(Date.now() - 3600000 * 1).toISOString() },
  { vehicleNo: 'AP 05 BD 9001', type: 'Bus / Heavy', phone: '9440022334', insideLot: 'PK-04', lastEntryAt: new Date(Date.now() - 3600000 * 6).toISOString() },
  { vehicleNo: 'AP 07 KR 1122', type: '4-Wheeler / Car', phone: '9848099887', insideLot: null, lastEntryAt: null },
];

export const MOCK_SCANS = [
  { id: 'SCN-1001', timestamp: new Date(Date.now() - 60000 * 3).toISOString(), type: 'ENTRY', vehicleNo: 'AP 05 BG 2415', lotCode: 'PK-01', staffId: 'VOL-101', reason: 'Normal Entry Validated', duration: '-' },
  { id: 'SCN-1002', timestamp: new Date(Date.now() - 60000 * 7).toISOString(), type: 'EXIT', vehicleNo: 'TS 07 AA 3456', lotCode: 'PK-01', staffId: 'VOL-102', reason: 'Exit checkout completed', duration: '2h 15m' },
  { id: 'SCN-1003', timestamp: new Date(Date.now() - 60000 * 12).toISOString(), type: 'REJECTED', vehicleNo: 'AP 05 ZZ 9999', lotCode: 'PK-01', staffId: 'VOL-101', reason: 'Lot is at 100% capacity (Refusal)', duration: '-' },
  { id: 'SCN-1004', timestamp: new Date(Date.now() - 60000 * 18).toISOString(), type: 'ENTRY', vehicleNo: 'AP 31 CT 8892', lotCode: 'KS-11', staffId: 'POL-201', reason: 'Normal Entry Validated', duration: '-' },
  { id: 'SCN-1005', timestamp: new Date(Date.now() - 60000 * 25).toISOString(), type: 'REJECTED', vehicleNo: 'KA 03 MM 7711', lotCode: 'KS-19', staffId: 'VOL-104', reason: 'Lot is currently closed by Traffic Police', duration: '-' },
];

export const MOCK_AUDIT = [
  { id: 'AUD-501', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), action: 'OCCUPANCY_CORRECTION', target: 'PK-01 (Pushkar Ghat Main Ground)', before: 'Count: 348', after: 'Count: 320', reason: 'Manual physical count verified 28 cars had exited without scanning due to gate rush', admin: 'ADM-001 (Nodal Officer)' },
  { id: 'AUD-502', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), action: 'LOT_STATUS_TOGGLE', target: 'KS-19 (Godavari Bund Service Bay)', before: 'Status: open', after: 'Status: closed', reason: 'VVIP convoy movement cordoned off bund road', admin: 'ADM-001 (Nodal Officer)' },
  { id: 'AUD-503', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), action: 'STAFF_ASSIGNMENT', target: 'VOL-101 (Ravi Kumar)', before: 'Assigned: MR-22 ENTRY', after: 'Assigned: PK-01 ENTRY', reason: 'High surge reinforcement at Pushkar core', admin: 'ADM-001 (Nodal Officer)' },
  { id: 'AUD-504', timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), action: 'VEHICLE_MANUAL_EXIT', target: 'AP 05 BD 1234', before: 'Inside: PK-04', after: 'Exited', reason: 'Lost pass physical receipt verified at helpdesk', admin: 'ADM-001 (Nodal Officer)' },
];
