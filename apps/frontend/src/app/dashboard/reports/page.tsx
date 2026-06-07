'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, API_URL } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import { Loader2, Download, Table, Calendar, Laptop, Globe2, Layers } from 'lucide-react';

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [websiteId, setWebsiteId] = useState('');
  const [country, setCountry] = useState('');
  const [device, setDevice] = useState('');
  const [groupBy, setGroupBy] = useState('date');

  // Query websites for selection
  const { data: websites } = useQuery({
    queryKey: ['websites-list'],
    queryFn: () => api.get('/websites'),
    retry: false,
  });

  // Query breakdown report
  const { data: breakdown, isLoading, error } = useQuery({
    queryKey: ['reports-breakdown', startDate, endDate, websiteId, country, device, groupBy],
    queryFn: () => {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (websiteId) q.append('websiteId', websiteId);
      if (country) q.append('country', country);
      if (device) q.append('device', device);
      if (groupBy) q.append('groupBy', groupBy);
      
      return api.get(`/reports/breakdown?${q.toString()}`);
    },
    retry: false,
  });

  const isPublisher = user?.role === 'PUBLISHER';
  const useMock = false;

  // Mock fallbacks
  const mockBreakdown = [
    { dimension: '2026-05-28', impressions: 450000, pageviews: 520000, clicks: 6800, netRevenue: 980.50, netCpm: 2.18, grossRevenue: 1225.60, margin: 245.10 },
    { dimension: '2026-05-27', impressions: 420000, pageviews: 490000, clicks: 6100, netRevenue: 910.20, netCpm: 2.16, grossRevenue: 1137.75, margin: 227.55 },
    { dimension: '2026-05-26', impressions: 380000, pageviews: 440000, clicks: 5400, netRevenue: 820.00, netCpm: 2.15, grossRevenue: 1025.00, margin: 205.00 },
  ];

  const currentData = useMock ? mockBreakdown : (Array.isArray(breakdown) ? breakdown : []);

  // Handle Export CSV
  const handleExportCsv = () => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    if (websiteId) q.append('websiteId', websiteId);
    if (country) q.append('country', country);
    if (device) q.append('device', device);
    if (groupBy) q.append('groupBy', groupBy);

    const token = typeof window !== 'undefined' ? localStorage.getItem('rollinhead_token') : '';
    if (token) q.append('token', token);

    window.open(`${API_URL}/reports/export?${q.toString()}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans">
      
      {/* Title / Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Performance Reports</h2>
          <p className="text-xs text-slate-500 font-semibold tracking-wide mt-1">
            Analyze website metrics with dimension drilldowns and filters
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] text-white px-5 py-3 rounded-lg text-xs font-black transition-all cursor-pointer shadow-md hover:shadow-lg shadow-red-500/10 hover:shadow-red-500/20 self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase text-[#e50914] tracking-wider mb-4">Report Configurations</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Start Date</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">End Date</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Group By */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Drilldown (Group By)</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="date">Date</option>
              <option value="website">Website</option>
              <option value="country">Country</option>
              <option value="device">Device</option>
            </select>
          </div>

          {/* Website Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Website Filter</label>
            <select
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="">All Websites</option>
              {websites && websites.map((w: any) => (
                <option key={w.id} value={w.id}>{w.domain}</option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Country Code</label>
            <input
              type="text"
              placeholder="e.g. USA, GBR"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all uppercase placeholder-slate-400 shadow-sm"
            />
          </div>

          {/* Device Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Device</label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="">All Devices</option>
              <option value="DESKTOP">Desktop</option>
              <option value="MOBILE">Mobile</option>
              <option value="TABLET">Tablet</option>
            </select>
          </div>

        </div>
      </div>

      {/* Reports Table Grid */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden relative shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
          </div>
        )}
        
        <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-2">
          <Table className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Reports: Grouped by <span className="text-[#e50914]">{groupBy}</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-3.5">Dimension ({groupBy})</th>
                <th className="px-6 py-3.5">Impressions</th>
                
                {/* Admin Columns */}
                {!isPublisher && <th className="px-6 py-3.5">Gross Revenue</th>}
                <th className="px-6 py-3.5">Net Revenue</th>
                {!isPublisher && <th className="px-6 py-3.5">Margin</th>}
                
                {!isPublisher && <th className="px-6 py-3.5">Gross CPM</th>}
                <th className="px-6 py-3.5">Net CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={isPublisher ? 3 : 7} className="px-6 py-10 text-center text-slate-400 font-medium bg-white">
                    No performance records found for the selected configurations.
                  </td>
                </tr>
              ) : (
                currentData.map((row: any, i: number) => {
                  const imps = Number(row.impressions);
                  const netRev = Number(row.netRevenue);
                  const netCpm = Number(row.netCpm);

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center space-x-2">
                        {groupBy === 'date' && <Calendar className="h-3.5 w-3.5 text-slate-400" />}
                        {groupBy === 'device' && <Laptop className="h-3.5 w-3.5 text-slate-400" />}
                        {groupBy === 'country' && <Globe2 className="h-3.5 w-3.5 text-slate-400" />}
                        {groupBy === 'website' && <Layers className="h-3.5 w-3.5 text-slate-400" />}
                        <span>{row.dimension}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{imps.toLocaleString()}</td>
                      
                      {/* Admin Columns */}
                      {!isPublisher && (
                        <td className="px-6 py-4 text-slate-500 font-bold">
                          ${Number(row.grossRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      
                      <td className="px-6 py-4 text-[#e50914] font-black">
                        ${netRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      
                      {!isPublisher && (
                        <td className="px-6 py-4 text-green-600 font-bold">
                          ${Number(row.margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      )}

                      {!isPublisher && (
                        <td className="px-6 py-4 text-slate-500">${Number(row.grossCpm || 0).toFixed(2)}</td>
                      )}
                      <td className="px-6 py-4 text-slate-500">${netCpm.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
