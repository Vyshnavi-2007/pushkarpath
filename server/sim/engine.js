const { buildNetwork, MAJOR_LOTS, ENTRY_CORRIDORS } = require('./network');
const { emitSimTick } = require('../lib/socketManager');

class SimulationEngine {
  constructor() {
    this.status = 'stopped'; // 'stopped' | 'running' | 'paused'
    this.arrivalsPerMinute = 30; // configurable slider
    this.simMinutes = 6 * 60; // Start at 06:00 AM (360 mins)
    this.timer = null;
    this.tickIntervalMs = 1000;
    this.simSpeedFactor = 30; // 1 real second = 30 simulated seconds (0.5 sim minute)

    this.network = null;
    this.simLots = {};
    this.vehicles = [];
    this.vehicleIdCounter = 1;
    this.divertedCount = 0;

    this.initSimLots();
  }

  initSimLots() {
    this.simLots = {};
    for (const lot of MAJOR_LOTS) {
      this.simLots[lot.code] = {
        code: lot.code,
        name: lot.name,
        capacity: lot.capacity,
        // Start with realistic initial fill ~40%
        occupied: Math.round(lot.capacity * 0.4),
        divertedCount: 0
      };
    }
  }

  async initialize() {
    if (!this.network) {
      this.network = await buildNetwork();
    }
    return this.network;
  }

  start() {
    if (this.status === 'running') return this.getState();

    if (!this.network) {
      // Synchronous kick-off or fallback
      buildNetwork().then((net) => {
        this.network = net;
      });
    }

    this.status = 'running';
    if (!this.timer) {
      this.timer = setInterval(() => this.tick(), this.tickIntervalMs);
    }
    return this.getState();
  }

  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
    return this.getState();
  }

  resume() {
    if (this.status === 'paused' || this.status === 'stopped') {
      this.status = 'running';
      if (!this.timer) {
        this.timer = setInterval(() => this.tick(), this.tickIntervalMs);
      }
    }
    return this.getState();
  }

  reset() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.status = 'stopped';
    this.simMinutes = 6 * 60;
    this.vehicles = [];
    this.vehicleIdCounter = 1;
    this.divertedCount = 0;
    this.initSimLots();
    return this.getState();
  }

  setConfig(config = {}) {
    if (config.arrivalsPerMinute !== undefined) {
      const val = Number(config.arrivalsPerMinute);
      if (!isNaN(val) && val >= 1 && val <= 300) {
        this.arrivalsPerMinute = val;
      }
    }
    return this.getState();
  }

  formatSimClock() {
    const totalMins = Math.floor(this.simMinutes);
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    const secs = Math.floor((this.simMinutes - totalMins) * 60);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }

  findOpenLot(excludeCode = null) {
    const availableLots = Object.values(this.simLots).filter(
      (l) => l.code !== excludeCode && l.occupied < l.capacity
    );
    if (!availableLots.length) return null;
    // Pick the one with the highest vacancy percentage
    availableLots.sort((a, b) => (b.capacity - b.occupied) - (a.capacity - a.occupied));
    return availableLots[0];
  }

  spawnVehicles(deltaSimMins) {
    if (!this.network || !this.network.routes || this.network.routes.length === 0) return;

    // Number of vehicles to spawn this tick
    const expectedSpawn = (this.arrivalsPerMinute * deltaSimMins);
    const count = Math.floor(expectedSpawn) + (Math.random() < (expectedSpawn % 1) ? 1 : 0);

    for (let i = 0; i < count; i++) {
      const corridor = ENTRY_CORRIDORS[Math.floor(Math.random() * ENTRY_CORRIDORS.length)];
      // Choose target lot (prefer larger lots)
      const targetLot = MAJOR_LOTS[Math.floor(Math.random() * MAJOR_LOTS.length)];
      const routeId = `${corridor.id}_TO_${targetLot.code}`;
      const route = this.network.routes.find((r) => r.id === routeId) || this.network.routes[0];

      if (!route || !route.cells || route.cells.length === 0) continue;

      let chosenLotCode = targetLot.code;
      let isDiverted = false;

      // Check if target lot has space
      const lotState = this.simLots[chosenLotCode];
      if (lotState && lotState.occupied >= lotState.capacity) {
        const alt = this.findOpenLot(chosenLotCode);
        if (alt) {
          chosenLotCode = alt.code;
          isDiverted = true;
          this.divertedCount++;
          if (this.simLots[targetLot.code]) {
            this.simLots[targetLot.code].divertedCount++;
          }
        }
      }

      this.vehicles.push({
        id: `veh-${this.vehicleIdCounter++}`,
        corridorId: corridor.id,
        routeId: route.id,
        targetLotCode: chosenLotCode,
        routeCells: route.cells,
        cellIndex: 0,
        status: 'moving', // 'moving' | 'parked'
        parkDurationMins: 20 + Math.floor(Math.random() * 41), // 20 - 60 sim mins
        parkedAtSimMinute: null,
        isDiverted
      });
    }
  }

  tick() {
    if (this.status !== 'running') return;

    const deltaSimMins = (this.simSpeedFactor / 60); // 0.5 sim minute per 1s tick
    this.simMinutes += deltaSimMins;

    // 1. Spawn new vehicles
    this.spawnVehicles(deltaSimMins);

    // 2. Compute cell densities (how many vehicles on each cell)
    const cellCounts = new Map();
    for (const v of this.vehicles) {
      if (v.status === 'moving' && v.routeCells[v.cellIndex]) {
        const cellId = v.routeCells[v.cellIndex].id;
        cellCounts.set(cellId, (cellCounts.get(cellId) || 0) + 1);
      }
    }

    let heavyCellsCount = 0;
    for (const count of cellCounts.values()) {
      if (count >= 2) heavyCellsCount++;
    }

    const totalSampledCells = Math.max(1, cellCounts.size);
    const heavyRoadsPct = Math.round((heavyCellsCount / totalSampledCells) * 100);

    // 3. Move vehicles along route cells
    let totalSpeed = 0;
    let movingCount = 0;
    const remainingVehicles = [];

    for (const vehicle of this.vehicles) {
      if (vehicle.status === 'moving') {
        movingCount++;
        const currentCell = vehicle.routeCells[vehicle.cellIndex];
        const density = currentCell ? (cellCounts.get(currentCell.id) || 1) : 1;

        // Base speed 45 km/h, slowed down by density
        let speedKmh = Math.max(15, 45 - (density - 1) * 8);
        totalSpeed += speedKmh;

        // Distance covered in deltaSimMins: speed in km/h -> km in deltaSimMins -> cells (100m = 0.1km)
        const kmTraveled = speedKmh * (deltaSimMins / 60);
        const cellsToAdvance = Math.max(1, Math.round(kmTraveled / 0.1));

        vehicle.cellIndex += cellsToAdvance;

        if (vehicle.cellIndex >= vehicle.routeCells.length - 1) {
          // Vehicle arrived at parking lot!
          const lot = this.simLots[vehicle.targetLotCode];
          if (lot && lot.occupied < lot.capacity) {
            lot.occupied++;
            vehicle.status = 'parked';
            vehicle.parkedAtSimMinute = this.simMinutes;
            remainingVehicles.push(vehicle);
          } else {
            // Lot became full upon arrival -> try divert or exit
            const alt = this.findOpenLot(vehicle.targetLotCode);
            if (alt && !vehicle.isDiverted) {
              vehicle.targetLotCode = alt.code;
              vehicle.isDiverted = true;
              this.divertedCount++;
              // Retarget to new lot
              const newRouteId = `${vehicle.corridorId}_TO_${alt.code}`;
              const newRoute = this.network?.routes.find((r) => r.id === newRouteId);
              if (newRoute && newRoute.cells.length > 0) {
                vehicle.routeCells = newRoute.cells;
                vehicle.cellIndex = Math.floor(newRoute.cells.length / 2); // halfway
                remainingVehicles.push(vehicle);
                continue;
              }
            }
            // Discard vehicle (exits area)
          }
        } else {
          remainingVehicles.push(vehicle);
        }
      } else if (vehicle.status === 'parked') {
        // 4. Check parked vehicle departure
        const elapsedMins = this.simMinutes - vehicle.parkedAtSimMinute;
        if (elapsedMins >= vehicle.parkDurationMins) {
          // Leaves parking lot
          const lot = this.simLots[vehicle.targetLotCode];
          if (lot && lot.occupied > 0) {
            lot.occupied--;
          }
          // Completed stay, remove from simulation
        } else {
          remainingVehicles.push(vehicle);
        }
      }
    }

    this.vehicles = remainingVehicles;

    const avgSpeedKmh = movingCount > 0 ? Math.round(totalSpeed / movingCount) : 45;
    const parkedCount = this.vehicles.filter((v) => v.status === 'parked').length;

    // Build payload for tick
    const tickData = {
      status: this.status,
      simClock: this.formatSimClock(),
      simMinutes: Math.round(this.simMinutes),
      arrivalsPerMinute: this.arrivalsPerMinute,
      movingVehicles: movingCount,
      parkedVehicles: parkedCount,
      divertedCount: this.divertedCount,
      avgSpeedKmh,
      heavyRoadsPct,
      simLots: Object.values(this.simLots).map((l) => ({
        code: l.code,
        name: l.name,
        capacity: l.capacity,
        occupied: l.occupied,
        divertedCount: l.divertedCount,
        occupancyPct: Math.round((l.occupied / l.capacity) * 100)
      })),
      activeVehiclePositions: this.vehicles
        .filter((v) => v.status === 'moving' && v.routeCells[v.cellIndex])
        .slice(0, 150) // limit network transmission size
        .map((v) => ({
          id: v.id,
          targetLot: v.targetLotCode,
          isDiverted: v.isDiverted,
          lat: v.routeCells[v.cellIndex].lat,
          lng: v.routeCells[v.cellIndex].lng
        }))
    };

    emitSimTick(tickData);
  }

  getState() {
    const movingCount = this.vehicles.filter((v) => v.status === 'moving').length;
    const parkedCount = this.vehicles.filter((v) => v.status === 'parked').length;

    return {
      status: this.status,
      simClock: this.formatSimClock(),
      simMinutes: Math.round(this.simMinutes),
      arrivalsPerMinute: this.arrivalsPerMinute,
      movingVehicles: movingCount,
      parkedVehicles: parkedCount,
      divertedCount: this.divertedCount,
      avgSpeedKmh: 45,
      heavyRoadsPct: 0,
      simLots: Object.values(this.simLots).map((l) => ({
        code: l.code,
        name: l.name,
        capacity: l.capacity,
        occupied: l.occupied,
        divertedCount: l.divertedCount,
        occupancyPct: Math.round((l.occupied / l.capacity) * 100)
      }))
    };
  }
}

// Singleton engine instance
const simEngine = new SimulationEngine();

module.exports = simEngine;
