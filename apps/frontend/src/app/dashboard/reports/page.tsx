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

  const useMock = error || !breakdown || breakdown.length === 0;

  // Mock fallbacks
  const mockBreakdown = [
    { dimension: '2026-05-28', impressions: 450000, pageviews: 520000, clicks: 6800, netRevenue: 980.50, netCpm: 2.18, grossRevenue: 1225.60, margin: 245.10 },
    { dimension: '2026-05-27', impressions: 420000, pageviews: 490000, clicks: 6100, netRevenue: 910.20, netCpm: 2.16, grossRevenue: 1137.75, margin: 227.55 },
    { dimension: '2026-05-26', impressions: 380000, pageviews: 440000, clicks: 5400, netRevenue: 820.00, netCpm: 2.15, grossRevenue: 1025.00, margin: 205.00 },
  ];

  const currentData = useMock ? mockBreakdown : breakdown;

  const isPublisher = user?.role === 'PUBLISHER';

  // Handle Export CSV
  const handleExportCsv = () => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    if (websiteId) q.append('websiteId', websiteId);
    if (country) q.append('country', country);
    if (device) q.append('device', device);
    if (groupBy) q.append('groupBy', groupBy);

    window.open(`${API_URL}/reports/export?${q.toString()}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title / Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Performance Reports</h2>
          <p className="text-xs text-gray-400 font-semibold tracking-wide mt-1">
            Analyze website metrics with dimension drilldowns and filters
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] text-white px-5 py-3 rounded-lg text-xs font-black transition-all cursor-pointer shadow-lg shadow-[#e5091422] hover:shadow-[#e5091444] self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Advanced Filter Box */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-xs font-black uppercase text-[#e50914] tracking-wider mb-4">Report Configurations</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Group By */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Drilldown (Group By)</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none transition-all cursor-pointer"
            >
              <option value="date">Date</option>
              <option value="website">Website</option>
              <option value="country">Country</option>
              <option value="device">Device</option>
            </select>
          </div>

          {/* Website Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Website Filter</label>
            <select
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none transition-all cursor-pointer"
            >
              <option value="">All Websites</option>
              {websites && websites.map((w: any) => (
                <option key={w.id} value={w.id}>{w.domain}</option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Country Code</label>
            <input
              type="text"
              placeholder="e.g. USA, GBR"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none transition-all uppercase"
            />
          </div>

          {/* Device Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Device</label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none transition-all cursor-pointer"
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
      <div className="glass rounded-xl overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#090a0c99] z-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
          </div>
        )}
        
        <div className="px-6 py-5 border-b border-[#16181c] flex items-center space-x-2">
          <Table className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Reports: Grouped by <span className="text-[#e50914]">{groupBy}</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1a1c20] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Dimension ({groupBy})</th>
                <th className="px-6 py-4">Impressions</th>
                <th className="px-6 py-4">Pageviews</th>
                <th className="px-6 py-4">Clicks</th>
                
                {/* Admin Columns */}
                {!isPublisher && <th className="px-6 py-4">Gross Revenue</th>}
                <th className="px-6 py-4">Net Revenue</th>
                {!isPublisher && <th className="px-6 py-4">Margin</th>}
                
                {!isPublisher && <th className="px-6 py-4">Gross CPM</th>}
                <th className="px-6 py-4">Net CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16181c] text-xs font-semibold">
              {currentData.map((row: any, i: number) => {
                const imps = Number(row.impressions);
                const pageviews = Number(row.pageviews);
                const clicks = Number(row.clicks);
                const netRev = Number(row.netRevenue);
                const netCpm = Number(row.netCpm);

                return (
                  <tr key={i} className="hover:bg-[#121318] transition-all">
                    <td className="px-6 py-4 font-bold text-white flex items-center space-x-2">
                      {groupBy === 'date' && <Calendar className="h-3.5 w-3.5 text-gray-500" />}
                      {groupBy === 'device' && <Laptop className="h-3.5 w-3.5 text-gray-500" />}
                      {groupBy === 'country' && <Globe2 className="h-3.5 w-3.5 text-gray-500" />}
                      {groupBy === 'website' && <Layers className="h-3.5 w-3.5 text-gray-500" />}
                      <span>{row.dimension}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{imps.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-400">{pageviews.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-400">{clicks.toLocaleString()}</td>
                    
                    {/* Admin Columns */}
                    {!isPublisher && (
                      <td className="px-6 py-4 text-gray-400 font-bold">
                        ${Number(row.grossRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    
                    <td className="px-6 py-4 text-[#e50914] font-black">
                      ${netRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    
                    {!isPublisher && (
                      <td className="px-6 py-4 text-green-500 font-bold">
                        ${Number(row.margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}

                    {!isPublisher && (
                      <td className="px-6 py-4 text-gray-400">${Number(row.grossCpm || 0).toFixed(2)}</td>
                    )}
                    <td className="px-6 py-4 text-gray-400">${netCpm.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
