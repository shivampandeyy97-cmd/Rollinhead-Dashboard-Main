'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { Loader2, Upload, FileText, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminUploadsPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries upload history logs
  const { data: logs, isLoading: logsLoading, isFetching: logsFetching } = useQuery({
    queryKey: ['admin-upload-logs'],
    queryFn: () => api.get('/uploads/logs'),
    retry: false,
    refetchInterval: 5000, // Auto refresh logs every 5 seconds to track background jobs!
  });

  const useMock = !logs || logs.length === 0;

  // Mock fallbacks
  const mockLogs = [
    {
      id: 'log-1',
      fileName: 'demand_partners_report_may.csv',
      status: 'COMPLETED',
      rowsProcessed: 180,
      rowsFailed: 0,
      createdAt: new Date().toISOString(),
      uploader: { name: 'Rollinhead Operations' },
    },
    {
      id: 'log-2',
      fileName: 'partner_error_test.csv',
      status: 'FAILED',
      rowsProcessed: 15,
      rowsFailed: 3,
      errorDetails: "Row 12: Website domain 'unregisteredblog.com' is not registered in our system\nRow 15: Website domain 'sportshub.net' belongs to another publisher and cannot be uploaded under Publisher 'Publisher 1'",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      uploader: { name: 'Rollinhead Operations' },
    },
  ];

  const currentLogs = useMock ? mockLogs : logs;

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/uploads', formData),
    onSuccess: (data) => {
      setFile(null);
      setUploadFeedback({
        type: 'success',
        text: `File uploaded successfully! ${data.rowCount} rows are being processed in the background. Check logs below.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-upload-logs'] });
    },
    onError: (err: any) => {
      setUploadFeedback({
        type: 'error',
        text: err.message || 'File upload failed. Ensure the format is CSV.',
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setUploadFeedback(null);
    } else {
      setUploadFeedback({ type: 'error', text: 'Only CSV files are allowed!' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadFeedback(null);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  // Helper to download a sample template CSV
  const handleDownloadSample = () => {
    const headers = 'Date,Publisher,Website,Revenue,Impressions,CPM\n';
    const row1 = '2026-06-04,Publisher 1,website-a.com,150.00,100000,1.50\n';
    const row2 = '2026-06-04,Publisher 2,website-b.com,240.00,120000,2.00\n';
    const csvContent = headers + row1 + row2;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_demand_ingestion.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Demand Partner Ingestion</h2>
          <p className="text-xs text-slate-500 font-semibold tracking-wide mt-1">
            Upload CSV reports from ad networks (adx, prebid) to auto-apply revenue shares and validate margins.
          </p>
        </div>
        
        {logsFetching && (
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
            <RefreshCw className="h-3 w-3 animate-spin text-[#e50914]" />
            <span>Syncing background processing...</span>
          </div>
        )}
      </div>

      {/* Upload Zone & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form Box */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-6 relative shadow-sm">
          <h3 className="text-xs font-black uppercase text-[#e50914] tracking-wider mb-4">Ingest CSV Spreadsheet</h3>
          
          {uploadFeedback && (
            <div className={`mb-5 p-4 rounded-lg border text-xs font-semibold leading-relaxed ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {uploadFeedback.text}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-6">
            
            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                dragOver 
                  ? 'border-[#e50914] bg-red-50/50' 
                  : file 
                  ? 'border-emerald-300 bg-emerald-50/30' 
                  : 'border-slate-200 hover:border-[#e50914] hover:bg-slate-50 bg-white'
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full border border-emerald-100">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 max-w-xs truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-[10px] font-bold text-[#e50914] hover:text-[#ff5757] transition-all cursor-pointer"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="bg-red-50 text-red-500 p-4 rounded-full border border-red-100/50">
                    <Upload className="h-8 w-8 text-[#e50914]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Drag & drop your report CSV here</p>
                    <p className="text-xs text-slate-400 mt-1">or click to browse local files</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    style={{ display: file ? 'none' : 'block' }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] text-white py-3 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-[#e5091422] hover:shadow-[#e5091444] disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-400"
            >
              {uploadMutation.isPending ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ingesting File Data...</span>
                </span>
              ) : (
                'Process Demand partner CSV'
              )}
            </button>

          </form>
        </div>

        {/* Guideline Box */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-xs font-black uppercase text-[#e50914] tracking-wider mb-4">Required CSV Scheme</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              To guarantee successful uploads, format the CSV file headers exactly as defined below:
            </p>
            
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-2 font-mono text-[10px] text-slate-600 select-all">
              <div className="text-[#e50914] font-bold">Date,Publisher,Website,Revenue,Impressions,CPM</div>
              <div>2026-06-04,Publisher 1,website-a.com,150.00,100000,1.50</div>
              <div>2026-06-04,Publisher 2,website-b.com,240.00,120000,2.00</div>
            </div>

            <ul className="mt-5 space-y-2 text-[10px] text-slate-500 font-semibold">
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-slate-700">Date:</strong> YYYY-MM-DD format (e.g. 2026-06-04).</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-slate-700">Publisher:</strong> Registered publisher company name or email.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-slate-700">Website:</strong> Domain domain (e.g. website-a.com). Must belong to the publisher.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-slate-700">Revenue:</strong> Gross partner revenue ($).</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-slate-700">Impressions:</strong> Total impressions.</span>
              </li>
            </ul>

            <button
              onClick={handleDownloadSample}
              className="mt-5 w-full flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4 text-[#e50914]" />
              <span>Download Sample CSV Template</span>
            </button>
          </div>

          <div className="bg-red-50 border border-red-100 p-3.5 rounded-lg text-[10px] text-red-800 leading-relaxed mt-6">
            Our engine automatically verifies relationships, matches the website domain with the specified publisher, fetches the active revenue share/margin percentage, and records the adjusted revenues instantly.
          </div>
        </div>

      </div>

      {/* Upload Logs History */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden relative shadow-sm">
        {logsLoading && (
          <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
          </div>
        )}
        
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ingestion Logs & History</h3>
          <span className="text-[10px] text-slate-400 font-bold">Auto-syncing active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4">Uploader</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Processed Rows</th>
                <th className="px-6 py-4">Failed Rows</th>
                <th className="px-6 py-4">Upload Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {currentLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4 font-bold text-slate-800 max-w-md">
                    <div className="truncate">{log.fileName}</div>
                    
                    {/* Expandable error block if failed */}
                    {log.status === 'FAILED' && log.errorDetails && (
                      <pre className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-[10px] font-mono text-red-800 whitespace-pre-wrap leading-relaxed select-all">
                        {log.errorDetails}
                      </pre>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{log.uploader?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      log.status === 'COMPLETED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : log.status === 'PROCESSING'
                        ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{log.rowsProcessed}</td>
                  <td className={`px-6 py-4 ${log.rowsFailed > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>{log.rowsFailed}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
