import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import DayList from './pages/DayList';
import DayDetail from './pages/DayDetail';
import DayEditor from './pages/DayEditor';
import Trends from './pages/Trends';

export default function App() {
  return (
    <div className="min-h-screen bg-brand-6 text-gray-900">
      <header className="border-b border-brand-8 bg-brand-7 px-6 py-3 flex items-center gap-8 shadow-sm">
        <NavLink to="/" className="text-xl font-bold tracking-tight text-gray-900 hover:text-brand-1 transition-colors">
          Daftro
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
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<DayList />} />
          <Route path="/new" element={<DayEditor />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/:date/edit" element={<DayEditor />} />
          <Route path="/:date" element={<DayDetail />} />
        </Routes>
      </main>
    </div>
  );
}
