import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import DayList from './pages/DayList';
import DayPage from './pages/DayPage';
import NewDay from './pages/NewDay';
import Trends from './pages/Trends';

const BANNER_KEY = 'daftro_ical_dismissed';

function CalendarBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(BANNER_KEY) === '1');
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const feedUrl = `${window.location.origin}/api/calendar/feed.ics`;

  function dismiss() {
    localStorage.setItem(BANNER_KEY, '1');
    setDismissed(true);
  }

  function copy() {
    navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border-b border-blue-100 bg-blue-50 px-6 py-3">
      <div className="mx-auto max-w-4xl flex items-center gap-3 flex-wrap">
        <span className="text-blue-500 text-base leading-none">📅</span>
        <p className="text-sm text-blue-800 font-medium">
          Subscribe to your day plan calendar
        </p>
        <code className="flex-1 min-w-0 truncate rounded bg-white border border-blue-200 px-2 py-0.5 text-xs text-blue-700 font-mono">
          {feedUrl}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded px-3 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 text-blue-400 hover:text-blue-600 transition-colors text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-brand-6 text-gray-900">
      <header className="border-b border-brand-8 bg-brand-7 px-6 py-3 flex items-center gap-8 shadow-sm">
        <NavLink to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/icon.png" alt="Daftro" className="h-7 w-7 object-contain" />
          <span className="text-xl font-bold tracking-tight text-gray-900">Daftro</span>
        </NavLink>
        <nav className="flex gap-5 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? 'text-brand-1 font-medium border-b-2 border-brand-1 pb-0.5'
                : 'text-brand-3 hover:text-gray-700 transition-colors'
            }
          >
            Reports
          </NavLink>
          <NavLink
            to="/trends"
            className={({ isActive }) =>
              isActive
                ? 'text-brand-1 font-medium border-b-2 border-brand-1 pb-0.5'
                : 'text-brand-3 hover:text-gray-700 transition-colors'
            }
          >
            Trends
          </NavLink>
        </nav>
      </header>
      <CalendarBanner />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<DayList />} />
          <Route path="/new" element={<NewDay />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/:date" element={<DayPage />} />
        </Routes>
      </main>
    </div>
  );
}
