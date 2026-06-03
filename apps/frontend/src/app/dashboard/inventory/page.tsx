'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import { Loader2, Globe, Tag, Copy, Check, ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function InventoryPage() {
  const user = useAuthStore((state) => state.user);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [placementId, setPlacementId] = useState('');
  const [tagType, setTagType] = useState('DISPLAY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const addTagMutation = useMutation({
    mutationFn: (data: { websiteId: string; placementId: string; tagType: string; config?: any }) => 
      api.post(`/websites/${data.websiteId}/tags`, {
        placementId: data.placementId,
        tagType: data.tagType,
        config: data.config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites-inventory'] });
      setFeedback('Ad placement tag added successfully!');
      setIsModalOpen(false);
      setPlacementId('');
      setTagType('DISPLAY');
      setCode('');
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: any) => {
      setFeedback(err.message || 'Failed to add tag placement.');
      setTimeout(() => setFeedback(null), 4000);
    }
  });

  const { data: websites, isLoading, error } = useQuery({
    queryKey: ['websites-inventory'],
    queryFn: () => api.get('/websites'),
    retry: false,
  });

  const isPublisher = user?.role === 'PUBLISHER';
  const useMock = false;

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

  const currentWebsites = useMock ? mockWebsites : (Array.isArray(websites) ? websites : []);

  const handleCopyCode = (tag: any) => {
    const codeSnippet = tag.config?.code || `<!-- Rollinhead Ad Placement Tag -->
<div id="${tag.placementId}"></div>
<script async src="https://cdn.rollinhead.com/tag.js" data-placement="${tag.placementId}"></script>`;
    
    navigator.clipboard.writeText(codeSnippet);
    setCopiedId(tag.placementId);
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
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Website Inventory & Ad Tags</h2>
        <p className="text-xs text-slate-500 font-semibold tracking-wide mt-1">
          Manage your registered domains and embed ad tag code placements
        </p>
      </div>

      {useMock && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>Showing publisher demonstration preview. Real domains and tags can be managed by Rollinhead administrators.</span>
        </div>
      )}

      {feedback && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-bold flex items-center space-x-2 animate-fade-in shadow-sm mb-6">
          <CheckCircle2 className="h-5 w-5" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Websites Grid */}
      {currentWebsites.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <Globe className="h-12 w-12 mx-auto text-slate-300 animate-pulse" />
          <h3 className="text-base font-black text-slate-900">No Registered Websites</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {isPublisher ? (
              <>
                Your publisher account does not have any active websites or ad placement tags configured yet. 
                Please reach out to support at <span className="text-[#e50914] font-bold">contact@rollinhead.com</span> to link your domains and generate tags!
              </>
            ) : (
              <>
                There are no registered website domains or ad placement tags in the network directory yet. 
                You can add websites for publishers inside the <span className="text-[#e50914] font-bold">Publisher Directory</span> dashboard!
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {currentWebsites.map((site: any) => (
            <div key={site.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-red-100 transition-all duration-300 shadow-sm">
              
              {/* Website Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-50 p-2 rounded-lg text-[#e50914] border border-red-100/30">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      {/* Web tags badges present in front of name */}
                      {site.tags && site.tags.length > 0 && (
                        <div className="flex gap-0.5">
                          {site.tags.map((t: any) => (
                            <span
                              key={t.id}
                              className={`text-[7px] font-extrabold px-1 rounded uppercase tracking-tighter ${
                                t.tagType === 'VIDEO'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200/35'
                                  : 'bg-red-50 text-[#e50914] border border-red-100/30'
                              }`}
                              title={t.placementId}
                            >
                              {t.tagType === 'VIDEO' ? 'Vid' : 'Disp'}
                            </span>
                          ))}
                        </div>
                      )}
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">{site.domain}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-block text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold tracking-wider uppercase">
                        {site.category}
                      </span>
                      {site.publisher?.companyName && (
                        <span className="inline-block text-[9px] bg-red-50 text-[#e50914] px-2 py-0.5 rounded border border-red-100/30 font-bold">
                          {site.publisher.companyName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${
                  site.isActive 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {site.isActive ? 'Active' : 'Suspended'}
                </span>
              </div>

              {/* Ad Tags Placements */}
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Placements</h4>
                  {!isPublisher && (
                    <button
                      onClick={() => {
                        setSelectedSite(site);
                        setPlacementId(`pb-${site.domain.split('.')[0]}-${Math.random().toString(36).substring(2, 6)}`);
                        setTagType('DISPLAY');
                        setIsModalOpen(true);
                      }}
                      className="text-[10px] bg-red-50 hover:bg-red-100 text-[#e50914] border border-red-100/30 px-2.5 py-1.5 rounded font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1"
                      title="Add Ad Placement Tag"
                    >
                      <span>+ Add Ad Tag</span>
                    </button>
                  )}
                </div>
                
                {site.tags.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium">
                    No active ad tags configured for this website yet.
                  </div>
                ) : (
                  site.tags.map((tag: any) => (
                    <div key={tag.id} className="border border-slate-100 rounded-xl p-4 space-y-4 hover:bg-slate-50/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-[#e50914]" />
                          <span className="text-xs font-bold text-slate-800">{tag.placementId}</span>
                        </div>
                        
                        <span className="text-[9px] bg-red-50 text-[#e50914] border border-red-100/30 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                          {tag.tagType}
                        </span>
                      </div>

                      {/* Embedding Snippet */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 relative group">
                        <pre className="text-[10px] text-slate-600 font-mono overflow-x-auto whitespace-pre-wrap select-all leading-relaxed">
                          {tag.config?.code || `<!-- Rollinhead Placement Tag -->
<div id="${tag.placementId}"></div>
<script async src="https://cdn.rollinhead.com/tag.js" data-placement="${tag.placementId}"></script>`}
                        </pre>
                        
                        <button
                          onClick={() => handleCopyCode(tag)}
                          className="absolute top-2 right-2 p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer focus:outline-none"
                        >
                          {copiedId === tag.placementId ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
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
      )}

      {/* --- Add Tag Modal --- */}
      {isModalOpen && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-2xl p-6 relative shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-slate-955 tracking-tight mb-4 flex items-center space-x-2">
              <Tag className="h-5 w-5 text-[#e50914]" />
              <span>Create Ad Placement Tag</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mb-4">
              Website: <span className="text-slate-950 font-bold">{selectedSite.domain}</span>
            </p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              addTagMutation.mutate({ websiteId: selectedSite.id, placementId, tagType, config: { code } });
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Placement ID</label>
                <input
                  type="text"
                  required
                  placeholder="pb-domain-placement"
                  value={placementId}
                  onChange={(e) => setPlacementId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tag Placement Type</label>
                <select
                  value={tagType}
                  onChange={(e) => setTagType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs cursor-pointer"
                >
                  <option value="DISPLAY">Display Banner</option>
                  <option value="VIDEO">Outstream Video</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Embed Code (Custom Tag HTML/JS)</label>
                <textarea
                  required
                  rows={4}
                  placeholder="<script>...</script>"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2 px-3 text-xs font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTagMutation.isPending}
                  className="w-1/2 bg-[#e50914] hover:bg-[#c20811] text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {addTagMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{addTagMutation.isPending ? 'Creating...' : 'Create Tag'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
