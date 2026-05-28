'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import { Loader2, Globe, Tag, Code, Copy, Check, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

export default function InventoryPage() {
  const user = useAuthStore((state) => state.user);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: websites, isLoading, error } = useQuery({
    queryKey: ['websites-inventory'],
    queryFn: () => api.get('/websites'),
    retry: false,
  });

  const useMock = error || !websites || websites.length === 0;

  // Mock data fallbacks
  const mockWebsites = [
    {
      id: 'web-1',
      domain: 'techblog.com',
      category: 'TECH',
      isActive: true,
      tags: [
        { id: 'tag-1', tagType: 'DISPLAY', placementId: 'pb-techblog-sidebar-300x250', isActive: true },
        { id: 'tag-2', tagType: 'VIDEO', placementId: 'pb-techblog-outstream-video', isActive: true },
      ],
    },
    {
      id: 'web-2',
      domain: 'sportshub.net',
      category: 'SPORTS',
      isActive: true,
      tags: [
        { id: 'tag-3', tagType: 'DISPLAY', placementId: 'pb-sportshub-leaderboard-728x90', isActive: true },
      ],
    },
  ];

  const currentWebsites = useMock ? mockWebsites : websites;

  const handleCopyCode = (placementId: string) => {
    const codeSnippet = `<!-- Rollinhead Ad Placement Tag -->
<div id="${placementId}"></div>
<script async src="https://cdn.rollinhead.com/tag.js" data-placement="${placementId}"></script>`;
    
    navigator.clipboard.writeText(codeSnippet);
    setCopiedId(placementId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Website Inventory & Ad Tags</h2>
        <p className="text-xs text-gray-400 font-semibold tracking-wide mt-1">
          Manage your registered domains and embed ad tag code placements
        </p>
      </div>

      {useMock && (
        <div className="bg-[#e509140c] border border-[#e5091422] p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold text-[#f87171]">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>Showing publisher demonstration preview. Real domains and tags can be managed by Rollinhead administrators.</span>
        </div>
      )}

      {/* Websites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {currentWebsites.map((site: any) => (
          <div key={site.id} className="glass rounded-xl overflow-hidden hover:border-[#e5091422] transition-all duration-300">
            
            {/* Website Header */}
            <div className="px-6 py-5 border-b border-[#16181c] bg-[#111315] flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[#e5091415] p-2 rounded-lg text-[#e50914] border border-[#e5091422]">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{site.domain}</h3>
                  <span className="inline-block mt-1 text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                    {site.category}
                  </span>
                </div>
              </div>
              
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                site.isActive 
                  ? 'bg-green-950/20 border-green-800/30 text-[#4ade80]' 
                  : 'bg-red-950/20 border-red-800/30 text-[#f87171]'
              }`}>
                {site.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>

            {/* Ad Tags Placements */}
            <div className="p-6 space-y-6">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Placements</h4>
              
              {site.tags.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 font-medium">
                  No active ad tags configured for this website yet.
                </div>
              ) : (
                site.tags.map((tag: any) => (
                  <div key={tag.id} className="border border-[#1a1c20] rounded-xl p-4 space-y-4 hover:bg-[#121318] transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-[#e50914]" />
                        <span className="text-xs font-bold text-white">{tag.placementId}</span>
                      </div>
                      
                      <span className="text-[9px] bg-[#e5091415] text-[#e50914] border border-[#e5091433] px-2 py-0.5 rounded uppercase font-black tracking-wider">
                        {tag.tagType}
                      </span>
                    </div>

                    {/* Embedding Snippet */}
                    <div className="bg-[#090a0c] border border-[#1a1c20] rounded-lg p-3 relative group">
                      <pre className="text-[10px] text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap select-all">
                        {`<!-- Rollinhead Placement Tag -->
<div id="${tag.placementId}"></div>
<script async src="https://cdn.rollinhead.com/tag.js" data-placement="${tag.placementId}"></script>`}
                      </pre>
                      
                      <button
                        onClick={() => handleCopyCode(tag.placementId)}
                        className="absolute top-2 right-2 p-1.5 rounded bg-[#16181c] border border-[#21242e] text-gray-400 hover:text-white hover:bg-black transition-all cursor-pointer focus:outline-none"
                      >
                        {copiedId === tag.placementId ? (
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
