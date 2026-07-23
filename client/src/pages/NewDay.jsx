import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toApiDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${m}-${d}-${y}`;
}

export default function NewDay() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!date) { setError('Please choose a date.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/days', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: toApiDate(date), tasklist: { source: 'direct' }, report: { source: 'direct' } }),
      });
      if (res.status === 409) { setError('A report for that date already exists.'); setSaving(false); return; }
      if (!res.ok) throw new Error(res.status);
      navigate(`/${toApiDate(date)}`);
    } catch (err) {
      setError(`Failed to create: ${err.message}`);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-xl font-bold text-gray-900 mb-6">New day report</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-3 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-white border border-brand-8 text-gray-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-1/20 focus:border-brand-1 w-full" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium bg-brand-1 text-white hover:bg-brand-2 transition-colors disabled:opacity-50">
          {saving ? 'Creating…' : 'Create report'}
        </button>
      </form>
    </div>
  );
}
