import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import {
  Users,
  Plus,
  Edit2,
  KeyRound,
  CheckCircle,
  XCircle,
  Shield,
  Search,
  X,
  RefreshCw,
} from 'lucide-react';

export default function AdminStaff() {
  const [staffList, setStaffList] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    staffId: '',
    name: '',
    role: 'staff',
    kind: 'volunteer',
    assignedLot: 'PK-01',
    assignedPoint: 'ENTRY',
    passcode: 'pushkar2027',
  });

  const [resetModalStaff, setResetModalStaff] = useState(null);
  const [newPasscode, setNewPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [staffData, lotsData] = await Promise.all([
        api.staff.getAll(),
        api.lots.getAll(),
      ]);
      setStaffList(staffData || []);
      setLots(lotsData || []);
    } catch (err) {
      console.warn('Failed to load staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      staffId: `VOL-${staffList.length + 101}`,
      name: '',
      role: 'staff',
      kind: 'volunteer',
      assignedLot: lots[0]?.code || 'PK-01',
      assignedPoint: 'ENTRY',
      passcode: 'pushkar2027',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s) => {
    setEditingStaff(s);
    setFormData({
      staffId: s.staffId,
      name: s.name,
      role: s.role,
      kind: s.kind,
      assignedLot: s.assignedLot || 'PK-01',
      assignedPoint: s.assignedPoint || 'ENTRY',
      passcode: '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingStaff) {
        await api.staff.update(editingStaff.id || editingStaff.staffId, {
          name: formData.name,
          role: formData.role,
          kind: formData.kind,
          assignedLot: formData.assignedLot,
          assignedPoint: formData.assignedPoint,
        });
      } else {
        await api.staff.create({
          staffId: formData.staffId,
          name: formData.name,
          role: formData.role,
          kind: formData.kind,
          assignedLot: formData.assignedLot,
          assignedPoint: formData.assignedPoint,
          passcode: formData.passcode,
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error updating staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffMember) => {
    try {
      await api.staff.toggleStatus(staffMember.id || staffMember.staffId, !staffMember.active);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleResetPasscodeSubmit = async (e) => {
    e.preventDefault();
    if (!resetModalStaff || !newPasscode.trim()) return;
    setSubmitting(true);
    try {
      await api.staff.resetPasscode(resetModalStaff.id || resetModalStaff.staffId, newPasscode.trim());
      alert(`Passcode reset successfully for ${resetModalStaff.name}`);
      setResetModalStaff(null);
      setNewPasscode('');
    } catch (err) {
      alert(err.message || 'Error resetting passcode');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q) ||
      s.assignedLot?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-stone-900">
              Staff & Duty Management
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Roster volunteer deployments, police checkposts, entry/exit gates, and passcodes.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-maroon hover:bg-maroon-light text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Enlist Staff / Volunteer</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-stone-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, ID or assigned lot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 rounded-lg border border-stone-300 focus:bg-white"
            />
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Kind</th>
                  <th className="py-3 px-4">Assigned Lot</th>
                  <th className="py-3 px-4">Checkpoint</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStaff.map((staff) => (
                  <tr key={staff.staffId} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">{staff.staffId}</td>
                    <td className="py-3 px-4 font-medium text-stone-900">{staff.name}</td>
                    <td className="py-3 px-4 text-stone-600 font-medium capitalize">{staff.role}</td>
                    <td className="py-3 px-4 text-stone-600 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        staff.kind === 'admin' ? 'bg-purple-100 text-purple-800' : staff.kind === 'police' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {staff.kind}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-stone-800">{staff.assignedLot}</td>
                    <td className="py-3 px-4 font-semibold text-teal">{staff.assignedPoint}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(staff)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          staff.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {staff.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{staff.active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetModalStaff(staff);
                            setNewPasscode('');
                          }}
                          className="px-2 py-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors flex items-center gap-1"
                          title="Reset staff passcode"
                        >
                          <KeyRound className="w-3 h-3" /> Passcode
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100"
                          title="Edit assignment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-heading font-bold text-base">
                {editingStaff ? `Edit Deployment: ${editingStaff.name}` : 'Enlist Staff / Volunteer'}
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
                  <label className="block font-semibold text-stone-700 mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg font-mono uppercase bg-stone-50"
                    disabled={!!editingStaff}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kind</label>
                  <select
                    value={formData.kind}
                    onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="volunteer">Volunteer</option>
                    <option value="police">Traffic Police</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Varma"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Assigned Lot</label>
                  <select
                    value={formData.assignedLot}
                    onChange={(e) => setFormData({ ...formData, assignedLot: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="ALL">ALL (Nodal Admin)</option>
                    {lots.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Assigned Point</label>
                  <select
                    value={formData.assignedPoint}
                    onChange={(e) => setFormData({ ...formData, assignedPoint: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="ENTRY">ENTRY</option>
                    <option value="EXIT">EXIT</option>
                    <option value="ALL">ALL (Supervisory)</option>
                  </select>
                </div>
              </div>

              {!editingStaff && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Initial Passcode</label>
                  <input
                    type="password"
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    placeholder="pushkar2027"
                    className="w-full px-3 py-2 border rounded-lg"
                    required
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
                  disabled={submitting}
                  className="px-4 py-2 bg-maroon text-white font-semibold rounded-lg hover:bg-maroon-light shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Passcode Modal */}
      {resetModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <KeyRound className="w-5 h-5 text-maroon" />
              <h3 className="font-heading font-bold text-base text-stone-900">
                Reset Passcode
              </h3>
            </div>
            <p className="text-xs text-stone-600">
              Set new authentication passcode for <strong>{resetModalStaff.name} ({resetModalStaff.staffId})</strong>.
            </p>
            <form onSubmit={handleResetPasscodeSubmit} className="space-y-4 text-xs">
              <input
                type="password"
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                placeholder="Enter new secure passcode"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
                autoFocus
              />
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalStaff(null)}
                  className="flex-1 py-2 border rounded-lg font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-maroon text-white font-semibold rounded-lg hover:bg-maroon-light"
                >
                  {submitting ? 'Resetting...' : 'Update Passcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
