import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import {
  MapPin,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  RefreshCw,
} from 'lucide-react';

export default function AdminLots() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    sector: 'Pushkar Core Sector',
    category: 'Car / 4-Wheeler',
    fee: 50,
    capacity: 200,
    lat: 17.0041,
    lng: 81.7762,
    status: 'open',
    changeReason: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Status toggle confirmation modal
  const [toggleConfirmLot, setToggleConfirmLot] = useState(null);

  const fetchLots = async () => {
    try {
      const data = await api.lots.getAll();
      setLots(data || []);
    } catch (err) {
      console.warn('Failed to load lots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const openAddModal = () => {
    setEditingLot(null);
    setFormData({
      code: `LT-${lots.length + 1}`,
      name: '',
      sector: 'Pushkar Core Sector',
      category: 'Car / 4-Wheeler',
      fee: 50,
      capacity: 200,
      lat: 17.0041,
      lng: 81.7762,
      status: 'open',
      changeReason: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lot) => {
    setEditingLot(lot);
    setFormData({
      code: lot.code,
      name: lot.name,
      sector: lot.sector || 'Pushkar Core Sector',
      category: lot.category || 'Car / 4-Wheeler',
      fee: lot.fee ?? 50,
      capacity: lot.capacity || 100,
      lat: lot.location?.lat ?? lot.lat ?? 17.0041,
      lng: lot.location?.lng ?? lot.lng ?? 81.7762,
      status: lot.status || 'open',
      changeReason: '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (editingLot) {
        await api.lots.update(editingLot.code, {
          name: formData.name,
          sector: formData.sector,
          category: formData.category,
          fee: Number(formData.fee),
          capacity: Number(formData.capacity),
          status: formData.status,
          location: { lat: Number(formData.lat), lng: Number(formData.lng) },
          changeReason: formData.changeReason,
        });
      } else {
        await api.lots.create({
          code: formData.code,
          name: formData.name,
          sector: formData.sector,
          category: formData.category,
          fee: Number(formData.fee),
          capacity: Number(formData.capacity),
          status: formData.status,
          location: { lat: Number(formData.lat), lng: Number(formData.lng) },
        });
      }
      setIsModalOpen(false);
      fetchLots();
    } catch (err) {
      alert(err.message || 'Error saving lot');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleConfirmLot) return;
    const newStatus = toggleConfirmLot.status === 'open' ? 'closed' : 'open';
    try {
      await api.lots.toggleStatus(toggleConfirmLot.code, newStatus);
      setToggleConfirmLot(null);
      fetchLots();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  // Filter lots
  const filteredLots = lots.filter((l) => {
    const matchesSearch =
      !search.trim() ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.sector?.toLowerCase().includes(search.toLowerCase());
    const matchesSector = sectorFilter === 'ALL' || l.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sectors = ['ALL', ...new Set(lots.map((l) => l.sector).filter(Boolean))];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-stone-900">
              Parking Lots Management
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Configure capacities, fees, coordinates, and operating status across all 54 parking grounds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-maroon hover:bg-maroon-light text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parking Area</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search code, name, sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 rounded-lg border border-stone-300 focus:bg-white focus:border-maroon focus:ring-1 focus:ring-marigold"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-stone-500 font-medium">Sector:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-stone-50 rounded-lg border border-stone-300 focus:bg-white"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lots Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Lot Name</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Fee</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Occupied</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLots.map((lot) => {
                  const cap = lot.capacity || 100;
                  const occ = lot.occupied || 0;
                  const free = Math.max(0, cap - occ);
                  const isClosed = lot.status === 'closed';

                  return (
                    <tr key={lot.code} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">{lot.code}</td>
                      <td className="py-3 px-4 font-medium text-stone-900 font-heading text-sm">{lot.name}</td>
                      <td className="py-3 px-4 text-stone-600">{lot.sector}</td>
                      <td className="py-3 px-4 text-stone-600">{lot.category}</td>
                      <td className="py-3 px-4 font-medium">{lot.fee ? `₹${lot.fee}` : 'Free'}</td>
                      <td className="py-3 px-4 text-stone-700 font-medium">{cap}</td>
                      <td className="py-3 px-4 text-stone-900 font-bold">{occ}</td>
                      <td className={`py-3 px-4 font-bold ${free > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{free}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setToggleConfirmLot(lot)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isClosed
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {isClosed ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          <span>{lot.status}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/admin/lots/${lot.code}/correct`}
                            className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-900 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                            title="Perform occupancy count correction"
                          >
                            Correct
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditModal(lot)}
                            className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100"
                            title="Edit Lot Configuration"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Lot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-stone-200">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-heading font-bold text-base">
                {editingLot ? `Edit Lot ${editingLot.code}` : 'Add New Parking Ground'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Lot Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono uppercase bg-stone-50"
                    disabled={!!editingLot}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-heading text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Sector</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Pushkar Core Sector">Pushkar Core Sector</option>
                    <option value="Kotilingala Sector">Kotilingala Sector</option>
                    <option value="Markandeya Sector">Markandeya Sector</option>
                    <option value="Highway Transit Sector">Highway Transit Sector</option>
                    <option value="Outer Perimeter Sector">Outer Perimeter Sector</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Vehicle Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Car / 4-Wheeler">Car / 4-Wheeler</option>
                    <option value="Two Wheeler">Two Wheeler</option>
                    <option value="Heavy / Bus">Heavy / Bus</option>
                    <option value="Official / VIP">Official / VIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              {editingLot && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Reason for Modification</label>
                  <textarea
                    rows={2}
                    value={formData.changeReason}
                    onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                    placeholder="e.g. Recalibrated capacity per ground surveyor inspection"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-maroon text-white font-semibold rounded-lg hover:bg-maroon-light shadow-xs"
                >
                  {formSubmitting ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Toggle Confirmation Modal */}
      {toggleConfirmLot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-heading font-bold text-lg text-stone-900">
              Confirm Status Change
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to mark <strong>{toggleConfirmLot.name} ({toggleConfirmLot.code})</strong> as{' '}
              <strong className="uppercase font-mono text-stone-900">
                {toggleConfirmLot.status === 'open' ? 'CLOSED' : 'OPEN'}
              </strong>?
              Pilgrim routing will immediately reflect this change.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setToggleConfirmLot(null)}
                className="flex-1 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="flex-1 py-2 bg-maroon hover:bg-maroon-light text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirm Toggle
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
