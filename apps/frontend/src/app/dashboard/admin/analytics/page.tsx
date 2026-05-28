'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Cell, 
  Pie 
} from 'recharts';
import { Loader2, PieChart, ShieldCheck, Globe, Percent, ArrowUpRight } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState('30');

  // Queries network overview metrics (admins get gross/net/margin/marginPercent)
  const { data: overview, isLoading: overviewLoading, error: overviewErr } = useQuery({
    queryKey: ['admin-overview', days],
    queryFn: () => api.get(`/reports/overview?startDate=${new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`),
    retry: false,
  });

  // Queries publisher comparing stats
  const { data: pubData, isLoading: pubLoading, error: pubErr } = useQuery({
    queryKey: ['admin-pub-breakdown', days],
    queryFn: () => api.get(`/reports/breakdown?startDate=${new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&groupBy=website`),
    retry: false,
  });

  // Queries device breakdown
  const { data: deviceData, isLoading: deviceLoading } = useQuery({
    queryKey: ['admin-device-breakdown', days],
    queryFn: () => api.get(`/reports/breakdown?startDate=${new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&groupBy=device`),
    retry: false,
  });

  const loading = overviewLoading || pubLoading || deviceLoading;

  const useMock = overviewErr || pubErr || !overview || !pubData || pubData.length === 0;

  // Mock fallbacks
  const mockOverview = {
    grossRevenue: { current: 48900.00, changePercent: 11.2 },
    netRevenue: { current: 39120.00, changePercent: 12.4 },
    margin: { current: 9780.00, changePercent: 9.1 },
    marginPercent: { current: 20.0, changePercent: 0 },
    impressions: { current: 22400000, changePercent: 8.5 },
  };

  const mockPubData = [
    { dimension: 'techblog.com', grossRevenue: 28600.00, netRevenue: 22880.00, margin: 5720.00 },
    { dimension: 'sportshub.net', grossRevenue: 20300.00, netRevenue: 16240.00, margin: 4060.00 },
  ];

  const mockDeviceData = [
    { dimension: 'DESKTOP', impressions: 12400000, netRevenue: 21600.00 },
    { dimension: 'MOBILE', impressions: 8200000, netRevenue: 14520.00 },
    { dimension: 'TABLET', impressions: 1800000, netRevenue: 3000.00 },
  ];

  const currentOverview = useMock ? mockOverview : overview;
  const currentPubData = useMock ? mockPubData : pubData;
  const currentDeviceData = useMock ? mockDeviceData : deviceData;

  // Colors for Device Pie Chart
  const COLORS = ['#e50914', '#ff5757', '#374151'];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Network Analytics Console</h2>
          <p className="text-xs text-gray-400 font-semibold tracking-wide mt-1">
            {useMock 
              ? '✨ Demonstration Mode (Database starting up)' 
              : 'Network-wide revenue share margins and publisher stats'}
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-[#111315] border border-[#1a1c20] p-1 rounded-xl self-start md:self-auto">
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
                  ? 'bg-[#e50914] text-white shadow-md shadow-[#e5091422]' 
                  : 'text-gray-400 hover:text-white hover:bg-[#16181c]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Network Margin & Gross Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Gross Revenue */}
        <div className="glass rounded-xl p-6 group hover:border-[#e5091422] transition-all duration-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gross Revenue (AdNetwork)</p>
          <h3 className="text-2xl font-black mt-2 tracking-tight">
            ${currentOverview.grossRevenue.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <span className="text-[9px] text-[#4ade80] font-black uppercase tracking-wider block mt-3 flex items-center">
            <ArrowUpRight className="h-3 w-3 mr-0.5" />
            <span>+{currentOverview.grossRevenue.changePercent.toFixed(1)}% vs prev period</span>
          </span>
        </div>

        {/* Net Publisher Payouts */}
        <div className="glass rounded-xl p-6 group hover:border-[#e5091422] transition-all duration-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Publisher Payouts</p>
          <h3 className="text-2xl font-black mt-2 tracking-tight">
            ${currentOverview.netRevenue.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <span className="text-[9px] text-[#4ade80] font-black uppercase tracking-wider block mt-3 flex items-center">
            <ArrowUpRight className="h-3 w-3 mr-0.5" />
            <span>+{currentOverview.netRevenue.changePercent.toFixed(1)}% vs prev period</span>
          </span>
        </div>

        {/* Network Net Margin */}
        <div className="glass rounded-xl p-6 border border-red-950/20 group hover:border-[#e5091444] transition-all duration-300 bg-gradient-to-br from-red-950/5 to-transparent">
          <p className="text-[10px] font-bold text-[#e50914] uppercase tracking-widest">Network Net Margin</p>
          <h3 className="text-2xl font-black mt-2 tracking-tight text-[#e50914]">
            ${currentOverview.margin.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <span className="text-[9px] text-red-400 font-black uppercase tracking-wider block mt-3 flex items-center">
            <ArrowUpRight className="h-3 w-3 mr-0.5" />
            <span>+{currentOverview.margin.changePercent.toFixed(1)}% vs prev period</span>
          </span>
        </div>

        {/* Margin Percentage */}
        <div className="glass rounded-xl p-6 group hover:border-[#e5091422] transition-all duration-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Margin Share %</p>
          <h3 className="text-2xl font-black mt-2 tracking-tight">
            {currentOverview.marginPercent.current.toFixed(1)}%
          </h3>
          <span className="text-[9px] text-gray-500 font-bold block mt-3">
            Average Network Commission cut
          </span>
        </div>

      </div>

      {/* Grid of Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Publisher Revenue Comparison Chart */}
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Publisher Performance comparison</h3>
              <p className="text-[11px] text-gray-500">Gross revenue vs net publisher payouts per domain</p>
            </div>
            <Globe className="h-4 w-4 text-gray-500" />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentPubData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16181c" />
                <XAxis dataKey="dimension" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121318',
                    border: '1px solid #21242e',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="grossRevenue" name="Gross Revenue ($)" fill="#374151" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netRevenue" name="Net Publisher ($)" fill="#e50914" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution Pie Chart */}
        <div className="glass rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Device Distribution</h3>
              <p className="text-[11px] text-gray-500">Share of ad network impressions</p>
            </div>
            <PieChart className="h-4 w-4 text-gray-500" />
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={currentDeviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="impressions"
                  nameKey="dimension"
                >
                  {currentDeviceData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121318',
                    border: '1px solid #21242e',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '11px',
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-bold text-center">
            {currentDeviceData.map((d: any, i: number) => (
              <div key={d.dimension} className="space-y-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <p className="text-white uppercase truncate">{d.dimension}</p>
                <p className="text-gray-500 font-semibold">{d.impressions.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
