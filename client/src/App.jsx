import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DayList from './pages/DayList';
import DayDetail from './pages/DayDetail';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <a href="/" className="text-xl font-bold tracking-tight text-white hover:text-gray-300">
          Daftro
        </a>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<DayList />} />
          <Route path="/:date" element={<DayDetail />} />
        </Routes>
      </main>
    </div>
  );
}
