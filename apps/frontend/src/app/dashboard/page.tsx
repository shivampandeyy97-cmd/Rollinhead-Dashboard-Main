'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
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
  AlertCircle
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
  const [days, setDays] = useState('30');

  // Calculates date range
  const getDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - parseInt(days, 10));
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDates();

  // Queries overview stats
  const { data: overview, isLoading: overviewLoading, error: overviewErr } = useQuery({
    queryKey: ['overview', days, startDate, endDate],
    queryFn: () => api.get(`/reports/overview?startDate=${startDate}&endDate=${endDate}`),
    retry: false,
  });

  // Queries chart performance
  const { data: performance, isLoading: performanceLoading, error: performanceErr } = useQuery({
    queryKey: ['performance', days, startDate, endDate],
    queryFn: () => api.get(`/reports/performance?startDate=${startDate}&endDate=${endDate}`),
    retry: false,
  });

  // Queries website breakdown for the table
  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['breakdown', days, startDate, endDate],
    queryFn: () => api.get(`/reports/breakdown?startDate=${startDate}&endDate=${endDate}&groupBy=website`),
    retry: false,
  });

  const loading = overviewLoading || performanceLoading || breakdownLoading;

  // --- Publisher check & Mock data fallbacks ---
  const isPublisher = user?.role === 'PUBLISHER';

  // Only admins get mock fallback previews when DB has no data
  const useMock = false;

  const mockOverview = {
    netRevenue: { current: 12480.50, changePercent: 12.4 },
    impressions: { current: 5240000, changePercent: 8.2 },
    clicks: { current: 84300, changePercent: 14.1 },
    netCpm: { current: 2.38, changePercent: 4.2 },
    grossRevenue: { current: 15600.60, changePercent: 11.8 },
    margin: { current: 3120.10, changePercent: 9.6 },
    marginPercent: { current: 20.0, changePercent: 0 },
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

  const mockPerformance = Array.from({ length: parseInt(days, 10) }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (parseInt(days, 10) - 1 - i));
    const dayStr = date.toISOString().split('T')[0];
    
    const baseVal = 300 + Math.sin(i * 0.5) * 80 + Math.random() * 50;
    const grossRev = baseVal * 1.25;
    const netRev = baseVal * 1.0; 
    
    return {
      date: dayStr,
      impressions: Math.floor(baseVal * 1000),
      clicks: Math.floor(baseVal * 15),
      netRevenue: netRev,
      grossRevenue: grossRev,
      margin: grossRev - netRev,
    };
  });

  const mockBreakdown = [
    { dimension: 'techblog.com', impressions: 3200000, clicks: 54000, netRevenue: 7680.00, netCpm: 2.40 },
    { dimension: 'sportshub.net', impressions: 2040000, clicks: 30300, netRevenue: 4800.50, netCpm: 2.35 },
  ];

  const currentOverview = useMock ? mockOverview : (overview || zeroOverview);
  const currentPerformance = useMock ? mockPerformance : (Array.isArray(performance) ? performance : []);
  const currentBreakdown = useMock ? mockBreakdown : (Array.isArray(breakdown) ? breakdown : []);

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
            {useMock 
              ? '✨ Showing live demonstration preview data (Database starting up)' 
              : 'Real-time publisher network performance monitor'}
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center space-x-1 bg-slate-100 border border-slate-200/50 p-1 rounded-xl self-start md:self-auto">
          {[
            { label: '7 Days', val: '7' },
            { label: '30 Days', val: '30' },
            { label: '90 Days', val: '90' },
          ].map((d) => (
            <button
              key={d.val}
              onClick={() => setDays(d.val)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                days === d.val 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/20' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {d.label}
            </button>
          ))}
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
        <div className="bg-white border border-[#e50914]/10 p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
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
        <div className="mb-6">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Revenue & Earnings Trend</h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Daily net earnings aggregates</p>
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
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="netRevenue" 
                  name="Net Earnings ($)" 
                  stroke="#e50914" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorNet)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Inventory Breakdown Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Website Performance Breakdown</h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Breakdown sorted by net earnings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-3.5">Website</th>
                <th className="px-6 py-3.5">Impressions</th>
                <th className="px-6 py-3.5">Clicks</th>
                <th className="px-6 py-3.5">Est. CPM</th>
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
                    <td className="px-6 py-4 text-slate-500">{row.impressions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">{row.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">${row.netCpm.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-[#e50914] font-black">${row.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
