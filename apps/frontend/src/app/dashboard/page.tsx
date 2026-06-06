'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, API_URL } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Eye, 
  MousePointerClick, 
  Activity, 
  Loader2, 
  Globe,
  AlertCircle,
  Filter,
  Calendar,
  Laptop,
  Download
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function OverviewPage() {
  const user = useAuthStore((state) => state.user);
  const isPublisher = user?.role === 'PUBLISHER';

  // Filters State
  const [datePreset, setDatePreset] = useState('30'); // '7' | '30' | '90' | 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [websiteId, setWebsiteId] = useState('');
  const [publisherId, setPublisherId] = useState('');
  const [country, setCountry] = useState('');
  const [device, setDevice] = useState('');
  const [chartMetric, setChartMetric] = useState('netRevenue');

  // Query websites for filter dropdown
  const { data: websites } = useQuery({
    queryKey: ['websites-filter-list'],
    queryFn: () => api.get('/websites'),
    retry: false,
  });

  // Query publishers for filter dropdown (Admin only)
  const { data: publishers } = useQuery({
    queryKey: ['publishers-filter-list'],
    queryFn: () => api.get('/publishers'),
    enabled: !isPublisher,
    retry: false,
  });

  // Date handlers
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - parseInt(preset, 10));
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset('custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset('custom');
  };

  const resetFilters = () => {
    setDatePreset('30');
    const d = new Date();
    const start = new Date();
    start.setDate(d.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(d.toISOString().split('T')[0]);
    setWebsiteId('');
    setPublisherId('');
    setCountry('');
    setDevice('');
  };

  // Queries overview stats
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['overview', startDate, endDate, websiteId, publisherId, country, device],
    queryFn: () => {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (websiteId) q.append('websiteId', websiteId);
      if (publisherId) q.append('publisherId', publisherId);
      if (country) q.append('country', country);
      if (device) q.append('device', device);
      return api.get(`/reports/overview?${q.toString()}`);
    },
    retry: false,
  });

  // Queries chart performance
  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance', startDate, endDate, websiteId, publisherId, country, device],
    queryFn: () => {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (websiteId) q.append('websiteId', websiteId);
      if (publisherId) q.append('publisherId', publisherId);
      if (country) q.append('country', country);
      if (device) q.append('device', device);
      return api.get(`/reports/performance?${q.toString()}`);
    },
    retry: false,
  });

  // Queries website breakdown for the table
  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['breakdown', startDate, endDate, websiteId, publisherId, country, device],
    queryFn: () => {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (websiteId) q.append('websiteId', websiteId);
      if (publisherId) q.append('publisherId', publisherId);
      if (country) q.append('country', country);
      if (device) q.append('device', device);
      q.append('groupBy', 'website');
      return api.get(`/reports/breakdown?${q.toString()}`);
    },
    retry: false,
  });

  const loading = overviewLoading || performanceLoading || breakdownLoading;

  // Handle Export CSV
  const handleExportCsv = () => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    if (websiteId) q.append('websiteId', websiteId);
    if (publisherId) q.append('publisherId', publisherId);
    if (country) q.append('country', country);
    if (device) q.append('device', device);
    q.append('groupBy', 'website');

    const token = typeof window !== 'undefined' ? localStorage.getItem('rollinhead_token') : '';
    if (token) q.append('token', token);

    window.open(`${API_URL}/reports/export?${q.toString()}`, '_blank');
  };

  const zeroOverview = {
    netRevenue: { current: 0.00, changePercent: 0.0 },
    impressions: { current: 0, changePercent: 0.0 },
    clicks: { current: 0, changePercent: 0.0 },
    netCpm: { current: 0.00, changePercent: 0.0 },
    grossRevenue: { current: 0.00, changePercent: 0.0 },
    margin: { current: 0.00, changePercent: 0.0 },
    marginPercent: { current: 0.0, changePercent: 0.0 },
  };

  const currentOverview = overview || zeroOverview;
  const currentPerformance = Array.isArray(performance) ? performance : [];
  const currentBreakdown = Array.isArray(breakdown) ? breakdown : [];

  // Chart Metric Options
  const metricsOptions = [
    { label: 'Net Revenue', value: 'netRevenue' },
    { label: 'Impressions', value: 'impressions' },
    { label: 'Net CPM', value: 'netCpm' },
    { label: 'Clicks', value: 'clicks' },
  ];

  if (!isPublisher) {
    metricsOptions.push(
      { label: 'Gross Revenue', value: 'grossRevenue' },
      { label: 'Margin', value: 'margin' },
      { label: 'Gross CPM', value: 'grossCpm' }
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Welcome Back, <span className="text-[#e50914]">{user?.name}</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold tracking-wide mt-1">
            Real-time analytics and performance dashboard.
          </p>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
          <span className="flex items-center text-xs font-black uppercase text-[#e50914] tracking-wider space-x-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>Dashboard Filters</span>
          </span>
          <button
            onClick={resetFilters}
            className="text-[10px] font-bold text-slate-400 hover:text-[#e50914] transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          
          {/* Preset Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date Range Preset</label>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
            />
          </div>

          {/* Website Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Website</label>
            <select
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="">All Websites</option>
              {websites?.map((w: any) => (
                <option key={w.id} value={w.id}>{w.domain}</option>
              ))}
            </select>
          </div>

          {/* Publisher Selection (Admin only) */}
          {!isPublisher && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Publisher</label>
              <select
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all cursor-pointer shadow-sm"
              >
                <option value="">All Publishers</option>
                {publishers?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.companyName || p.user?.name || p.contactEmail}</option>
                ))}
              </select>
            </div>
          )}

          {/* Device Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Device Type</label>
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

          {/* Country Selection */}
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

        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 relative overflow-hidden group hover:border-red-100 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Revenue</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight text-slate-900">
                ${currentOverview.netRevenue.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="bg-red-50/50 border border-red-100/30 p-2.5 rounded-lg text-[#e50914]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-xs font-semibold">
            {currentOverview.netRevenue.changePercent >= 0 ? (
              <span className="flex items-center text-green-600 space-x-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+{currentOverview.netRevenue.changePercent.toFixed(1)}%</span>
              </span>
            ) : (
              <span className="flex items-center text-red-600 space-x-1">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>{currentOverview.netRevenue.changePercent.toFixed(1)}%</span>
              </span>
            )}
            <span className="text-slate-400 ml-2">vs prev period</span>
          </div>
        </div>

        {/* Impressions Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 relative overflow-hidden group hover:border-red-100 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ad Impressions</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight text-slate-900">
                {currentOverview.impressions.current.toLocaleString()}
              </h3>
            </div>
            <div className="bg-red-50/50 border border-red-100/30 p-2.5 rounded-lg text-[#e50914]">
              <Eye className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-xs font-semibold">
            {currentOverview.impressions.changePercent >= 0 ? (
              <span className="flex items-center text-green-600 space-x-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+{currentOverview.impressions.changePercent.toFixed(1)}%</span>
              </span>
            ) : (
              <span className="flex items-center text-red-600 space-x-1">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>{currentOverview.impressions.changePercent.toFixed(1)}%</span>
              </span>
            )}
            <span className="text-slate-400 ml-2">vs prev period</span>
          </div>
        </div>

        {/* Net CPM Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 relative overflow-hidden group hover:border-red-100 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net CPM</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight text-slate-900">
                ${currentOverview.netCpm.current.toFixed(2)}
              </h3>
            </div>
            <div className="bg-red-50/50 border border-red-100/30 p-2.5 rounded-lg text-[#e50914]">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-xs font-semibold">
            {currentOverview.netCpm.changePercent >= 0 ? (
              <span className="flex items-center text-green-600 space-x-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+{currentOverview.netCpm.changePercent.toFixed(1)}%</span>
              </span>
            ) : (
              <span className="flex items-center text-red-600 space-x-1">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>{currentOverview.netCpm.changePercent.toFixed(1)}%</span>
              </span>
            )}
            <span className="text-slate-400 ml-2">vs prev period</span>
          </div>
        </div>

        {/* Clicks Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 relative overflow-hidden group hover:border-red-100 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ad Clicks</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight text-slate-900">
                {currentOverview.clicks.current.toLocaleString()}
              </h3>
            </div>
            <div className="bg-red-50/50 border border-red-100/30 p-2.5 rounded-lg text-[#e50914]">
              <MousePointerClick className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-xs font-semibold">
            {currentOverview.clicks.changePercent >= 0 ? (
              <span className="flex items-center text-green-600 space-x-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+{currentOverview.clicks.changePercent.toFixed(1)}%</span>
              </span>
            ) : (
              <span className="flex items-center text-red-600 space-x-1">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>{currentOverview.clicks.changePercent.toFixed(1)}%</span>
              </span>
            )}
            <span className="text-slate-400 ml-2">vs prev period</span>
          </div>
        </div>

      </div>

      {/* Admin Extra Metrics Section */}
      {!isPublisher && currentOverview.grossRevenue && (
        <div className="bg-white border border-[#e50914]/10 p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm animate-fade-in">
          <div className="border-r border-slate-100 pr-6 last:border-0 last:pr-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Revenue (AdNetwork)</span>
            <h4 className="text-xl font-black mt-1 text-slate-900">
              ${currentOverview.grossRevenue.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="border-r border-slate-100 pr-6 last:border-0 last:pr-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operations Margin</span>
            <h4 className="text-xl font-black mt-1 text-slate-900">
              ${currentOverview.margin.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margin Percentage</span>
            <h4 className="text-xl font-black mt-1 text-slate-900">
              {currentOverview.marginPercent.current.toFixed(1)}%
            </h4>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Performance Trend</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Daily aggregates for the selected metric</p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 border border-slate-200/50 rounded-xl self-start lg:self-auto">
            {metricsOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setChartMetric(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  chartMetric === opt.value
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {currentPerformance.length === 0 ? (
          <div className="h-80 w-full flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl space-y-3">
            <AlertCircle className="h-8 w-8 text-slate-300" />
            <span className="text-xs font-semibold text-slate-400">No performance metrics recorded for this period.</span>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e50914" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#e50914" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(str) => {
                    const parts = str.split('-');
                    return parts.length > 2 ? `${parts[1]}/${parts[2]}` : str;
                  }}
                />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => {
                    const isCurrency = ['netRevenue', 'grossRevenue', 'margin', 'netCpm', 'grossCpm'].includes(chartMetric);
                    if (isCurrency) {
                      return [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, metricsOptions.find(o => o.value === chartMetric)?.label];
                    }
                    return [Number(value).toLocaleString(), metricsOptions.find(o => o.value === chartMetric)?.label];
                  }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={chartMetric} 
                  name={metricsOptions.find(o => o.value === chartMetric)?.label} 
                  stroke="#e50914" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMetric)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Inventory Breakdown Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Website Performance Breakdown</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Breakdown sorted by net earnings</p>
          </div>
          <button
            onClick={handleExportCsv}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] text-white px-4 py-2 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-md hover:shadow-lg shadow-red-500/10 hover:shadow-red-500/20 self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-3.5">Website</th>
                <th className="px-6 py-3.5">Impressions</th>
                <th className="px-6 py-3.5">Clicks</th>
                <th className="px-6 py-3.5">Est. Net CPM</th>
                <th className="px-6 py-3.5 text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {currentBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium bg-white">
                    No active website performance logs found.
                  </td>
                </tr>
              ) : (
                currentBreakdown.map((row: any) => (
                  <tr key={row.dimension} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 flex items-center space-x-2 text-slate-900 font-bold">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      <span>{row.dimension}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{Number(row.impressions).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">{Number(row.clicks).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">${Number(row.netCpm || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-[#e50914] font-black">${Number(row.netRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
