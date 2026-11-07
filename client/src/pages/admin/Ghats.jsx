import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import GhatPhoto from '../../components/GhatPhoto';
import {
  Compass,
  Plus,
  Edit2,
  MapPin,
  Info,
  X,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function AdminGhats() {
  const [ghats, setGhats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGhat, setEditingGhat] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameTe: '',
    description: '',
    lat: 17.0028,
    lng: 81.7745,
    photo: '',
    facilities: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchGhats = async () => {
    try {
      const data = await api.ghats.getAll();
      setGhats(data || []);
    } catch (err) {
      console.warn('Failed to load ghats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGhats();
  }, []);

  const openAddModal = () => {
    setEditingGhat(null);
    setFormData({
      code: `GH-0${ghats.length + 1}`,
      name: '',
      nameTe: '',
      description: '',
      lat: 17.0028,
      lng: 81.7745,
      photo: '',
      facilities: 'Drinking Water, First Aid, Changing Rooms',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ghat) => {
    setEditingGhat(ghat);
    setFormData({
      code: ghat.code,
      name: ghat.name,
      nameTe: ghat.nameTe || '',
      description: ghat.description || '',
      lat: ghat.location?.lat ?? ghat.lat ?? 17.0028,
      lng: ghat.location?.lng ?? ghat.lng ?? 81.7745,
      photo: ghat.photo || '',
      facilities: (ghat.facilities || []).join(', '),
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const facilitiesArray = formData.facilities
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      if (editingGhat) {
        await api.ghats.update(editingGhat.code, {
          name: formData.name,
          nameTe: formData.nameTe,
          description: formData.description,
          location: { lat: Number(formData.lat), lng: Number(formData.lng) },
          photo: formData.photo,
          facilities: facilitiesArray,
        });
      } else {
        await api.ghats.create({
          code: formData.code,
          name: formData.name,
          nameTe: formData.nameTe,
          description: formData.description,
          location: { lat: Number(formData.lat), lng: Number(formData.lng) },
          photo: formData.photo,
          facilities: facilitiesArray,
        });
      }
      setIsModalOpen(false);
      fetchGhats();
    } catch (err) {
      alert(err.message || 'Failed to save ghat');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-stone-900">
              Ghat Master Directory
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Manage sacred bathing ghat coordinates, bilingual Telugu metadata, and pilgrim amenities.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal hover:bg-teal-dark text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sacred Ghat</span>
          </button>
        </div>

        {/* Spatial Note Alert */}
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-3">
          <Info className="w-5 h-5 text-teal shrink-0 mt-0.5" />
          <div>
            <strong>Spatial Geometry Note:</strong> Updating a ghat's coordinates automatically re-indexes the
            nearest parking lot routing graph for millions of incoming pilgrims. Ensure high-precision GPS coordinates.
          </div>
        </div>

        {/* Ghats Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ghats.map((ghat) => (
            <div
              key={ghat.code}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:border-stone-300 transition-all flex flex-col"
            >
              {/* Photo or Illustration Fallback */}
              <div className="h-40 w-full relative bg-stone-100">
                <GhatPhoto ghat={ghat} />
                <span className="absolute top-3 right-3 font-mono text-xs font-bold bg-stone-900/80 text-white px-2 py-0.5 rounded">
                  {ghat.code}
                </span>
              </div>

              {/* Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-lg text-stone-900 leading-tight">
                    {ghat.name}
                  </h3>
                  {ghat.nameTe && (
                    <p className="text-teal font-heading font-medium text-sm">
                      {ghat.nameTe}
                    </p>
                  )}
                  <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                    {ghat.description}
                  </p>
                </div>

                <div className="text-xs text-stone-500 font-mono flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {(ghat.location?.lat ?? ghat.lat)?.toFixed(4)}, {(ghat.location?.lng ?? ghat.lng)?.toFixed(4)}
                  </span>
                </div>

                {/* Facilities */}
                {ghat.facilities && ghat.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ghat.facilities.map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => openEditModal(ghat)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Metadata</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Ghat Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-stone-200">
            <div className="bg-teal text-white p-4 flex items-center justify-between">
              <h3 className="font-heading font-bold text-base">
                {editingGhat ? `Edit Ghat: ${editingGhat.name}` : 'Register New Holy Ghat'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono uppercase bg-stone-50"
                    disabled={!!editingGhat}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">English Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-heading text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Telugu Name (తెలుగు)</label>
                <input
                  type="text"
                  value={formData.nameTe}
                  onChange={(e) => setFormData({ ...formData, nameTe: e.target.value })}
                  placeholder="ఉదా: పుష్కర ఘాట్"
                  className="w-full px-3 py-2 border rounded-lg font-heading text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
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

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Photo URL / Path (optional)</label>
                <input
                  type="text"
                  value={formData.photo}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  placeholder="/photos/pushkar_ghat.jpg"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-[11px] text-stone-500 mt-0.5">
                  If left blank, our sacred Godavari SVG river artwork will be displayed automatically.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Facilities (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  placeholder="Drinking Water, First Aid, Cloakroom, Ramp"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

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
                  disabled={submitting}
                  className="px-4 py-2 bg-teal text-white font-semibold rounded-lg hover:bg-teal-dark shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Ghat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
