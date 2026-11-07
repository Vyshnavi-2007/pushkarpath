import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Gauge,
  Sliders,
  AlertTriangle,
  Car,
  Compass,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function AdminSimulation() {
  const [simState, setSimState] = useState({
    running: true,
    clock: '09:30:00 AM',
    arrivalsPerMin: 45,
    activeVehiclesCount: 140,
    avgSpeedKmh: 28,
    heavyRoadsPercentage: 25,
    parkedSyntheticCount: 650,
    divertedCount: 42,
    segments: [
      { id: 'SEG-1', name: 'NH16 Diwancheruvu Entry', from: [80, 50], to: [200, 150], density: 'heavy', color: '#ef4444' },
      { id: 'SEG-2', name: 'Morampudi Ring Road', from: [200, 150], to: [320, 240], density: 'moderate', color: '#f59e0b' },
      { id: 'SEG-3', name: 'Danavaipeta City Link', from: [320, 240], to: [420, 280], density: 'light', color: '#10b981' },
      { id: 'SEG-4', name: 'Pushkar Ghat Bund Road', from: [420, 280], to: [550, 310], density: 'heavy', color: '#ef4444' },
      { id: 'SEG-5', name: 'Kotilingala Ghat Sector Road', from: [420, 280], to: [520, 420], density: 'moderate', color: '#f59e0b' },
      { id: 'SEG-6', name: 'Godavari Fourth Bridge Approach', from: [50, 380], to: [220, 360], density: 'light', color: '#10b981' },
      { id: 'SEG-7', name: 'Kovvur Highway Corridor', from: [220, 360], to: [420, 280], density: 'moderate', color: '#f59e0b' },
    ]
  });

  const [arrivalRate, setArrivalRate] = useState(45);
  const [animFrame, setAnimFrame] = useState(0);
  const canvasRef = useRef(null);

  // Poll or tick simulation
  useEffect(() => {
    let timer = setInterval(async () => {
      try {
        const state = await api.simulation.getState();
        if (state) setSimState((prev) => ({ ...prev, ...state }));
      } catch (e) {
        // Fallback tick
      }
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Animation loop for synthetic vehicle dots on canvas
  useEffect(() => {
    let reqId;
    let tick = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background grid
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw road segments
      simState.segments.forEach((seg) => {
        ctx.beginPath();
        ctx.moveTo(seg.from[0], seg.from[1]);
        ctx.lineTo(seg.to[0], seg.to[1]);
        ctx.strokeStyle = seg.density === 'heavy' ? '#f87171' : seg.density === 'moderate' ? '#fbbf24' : '#34d399';
        ctx.lineWidth = seg.density === 'heavy' ? 8 : 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Label road
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Hind Guntur, sans-serif';
        const midX = (seg.from[0] + seg.to[0]) / 2;
        const midY = (seg.from[1] + seg.to[1]) / 2 - 8;
        ctx.fillText(seg.name, midX - 30, midY);

        // Draw animated vehicle dots along this segment
        if (simState.running) {
          const numDots = seg.density === 'heavy' ? 6 : seg.density === 'moderate' ? 4 : 2;
          for (let i = 0; i < numDots; i++) {
            const speed = seg.density === 'heavy' ? 0.0015 : 0.0035;
            const progress = ((tick * speed) + (i / numDots)) % 1;
            const vx = seg.from[0] + (seg.to[0] - seg.from[0]) * progress;
            const vy = seg.from[1] + (seg.to[1] - seg.from[1]) * progress;

            ctx.beginPath();
            ctx.arc(vx, vy, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#7A1424'; // Kumkum maroon vehicle dot
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });

      // Draw Key Destination Nodes
      const nodes = [
        { name: 'NH16 North Inflow', x: 80, y: 50, color: '#0F5C5C' },
        { name: 'Morampudi Circle', x: 200, y: 150, color: '#0F5C5C' },
        { name: 'Danavaipeta Hub', x: 320, y: 240, color: '#0F5C5C' },
        { name: 'Pushkar Ghat (PKG-01/02)', x: 550, y: 310, color: '#7A1424' },
        { name: 'Kotilingala Ghat (KTL-01)', x: 520, y: 420, color: '#7A1424' },
        { name: 'Fourth Bridge Entry', x: 50, y: 380, color: '#0F5C5C' },
      ];

      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px Hind Guntur, sans-serif';
        ctx.fillText(n.name, n.x + 12, n.y + 4);
      });

      reqId = requestAnimationFrame(render);
    };

    reqId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqId);
  }, [simState]);

  const handleStart = async () => {
    try {
      await api.simulation.start();
      setSimState((prev) => ({ ...prev, running: true }));
    } catch {}
  };

  const handlePause = async () => {
    try {
      await api.simulation.pause();
      setSimState((prev) => ({ ...prev, running: false }));
    } catch {}
  };

  const handleReset = async () => {
    try {
      await api.simulation.reset();
      setSimState((prev) => ({
        ...prev,
        parkedSyntheticCount: 0,
        divertedCount: 0,
        activeVehiclesCount: 0
      }));
    } catch {}
  };

  const handleRateChange = (newRate) => {
    setArrivalRate(newRate);
    api.simulation.setArrivalRate(newRate).catch(() => {});
  };

  return (
    <Layout title="Traffic Simulation" activeTab="admin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Synthetic Traffic Banner (Prominently Required) */}
        <div className="bg-amber-500 text-maroon-900 border-2 border-amber-600 px-5 py-3.5 rounded-xl flex items-center gap-3 shadow-md">
          <ShieldAlert className="w-6 h-6 text-maroon-900 shrink-0" />
          <div className="text-sm font-semibold tracking-wide">
            SYNTHETIC TRAFFIC SIMULATION ENGINE (DEMO MODE — NOT LIVE HIGHWAY SENSOR DATA)
          </div>
        </div>

        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to="/admin" className="hover:text-maroon">Admin Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Traffic Simulation</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-7 h-7 text-maroon" />
              Microscopic Traffic Simulation Engine
            </h1>
            <p className="text-sm text-gray-600">
              Simulates pilgrim vehicular arrivals from NH-16, bridge crossings, and dynamic diversion to peripheral parking lots.
            </p>
          </div>

          {/* Simulation Controls */}
          <div className="flex items-center gap-2">
            {simState.running ? (
              <button
                onClick={handlePause}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm shadow-sm transition"
              >
                <Pause className="w-4 h-4" /> Pause Sim
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm shadow-sm transition"
              >
                <Play className="w-4 h-4" /> Start Sim
              </button>
            )}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium shadow-sm transition"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Live Simulation Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Virtual Clock</span>
            <div className="text-lg font-bold text-gray-900 font-mono mt-1">{simState.clock || '09:42 AM'}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Arrival Rate</span>
            <div className="text-lg font-bold text-maroon mt-1">{arrivalRate} veh/min</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">In Transit</span>
            <div className="text-lg font-bold text-blue-700 mt-1">{simState.activeVehiclesCount || 140}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Average Speed</span>
            <div className="text-lg font-bold text-emerald-700 mt-1">{simState.avgSpeedKmh || 28} km/h</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Synthetically Parked</span>
            <div className="text-lg font-bold text-teal mt-1">{simState.parkedSyntheticCount || 650}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Diverted (Full Lots)</span>
            <div className="text-lg font-bold text-rose-600 mt-1">{simState.divertedCount || 42}</div>
          </div>
        </div>

        {/* Arrival Rate Slider */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-maroon" />
            <div>
              <div className="text-sm font-semibold text-gray-900">Inflow Intensity (NH-16 & City Gateways)</div>
              <div className="text-xs text-gray-500">Adjust the simulated incoming pilgrim arrival volume per minute</div>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-80">
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={arrivalRate}
              onChange={(e) => handleRateChange(parseInt(e.target.value, 10))}
              className="w-full accent-maroon cursor-pointer"
            />
            <span className="text-sm font-bold font-mono text-maroon min-w-16 text-right">
              {arrivalRate} /m
            </span>
          </div>
        </div>

        {/* Synthetic Network Canvas Visualization */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal" />
              Rajahmundry Pushkaralu Inflow Corridor Map
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" /> Free Flow
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> Moderate Density
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" /> High Congestion
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#7A1424]" /> Simulated Vehicle
              </span>
            </div>
          </div>

          <div className="relative border border-gray-100 rounded-lg overflow-hidden bg-slate-50 flex justify-center">
            <canvas
              ref={canvasRef}
              width={750}
              height={480}
              className="w-full max-w-[750px] h-auto block"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

