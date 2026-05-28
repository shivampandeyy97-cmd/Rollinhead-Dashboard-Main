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
      errorDetails: "Row 12: Domain 'unregisteredblog.com' is not registered in our system\nRow 15: Invalid date format: '2026-13-45'",
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

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Demand Partner Ingestion</h2>
          <p className="text-xs text-gray-400 font-semibold tracking-wide mt-1">
            Upload CSV reports from ad networks (adx, prebid) to auto-apply revenue shares
          </p>
        </div>
        
        {logsFetching && (
          <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-black uppercase tracking-wider">
            <RefreshCw className="h-3 w-3 animate-spin text-[#e50914]" />
            <span>Syncing background processing...</span>
          </div>
        )}
      </div>

      {/* Upload Zone & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form Box */}
        <div className="lg:col-span-2 glass rounded-xl p-6 relative">
          <h3 className="text-xs font-black uppercase text-[#e50914] tracking-wider mb-4">Ingest CSV Spreadsheet</h3>
          
          {uploadFeedback && (
            <div className={`mb-5 p-4 rounded-lg border text-xs font-semibold leading-relaxed ${
              uploadFeedback.type === 'success'
                ? 'bg-green-950/20 border-green-800/30 text-[#4ade80]'
                : 'bg-red-950/20 border-red-800/30 text-[#f87171]'
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
                  ? 'border-[#e50914] bg-[#e5091405]' 
                  : file 
                  ? 'border-green-700/50 bg-[#15803d05]' 
                  : 'border-[#21242e] hover:border-[#e5091422] bg-[#16181e55]'
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="bg-green-950/20 text-[#4ade80] p-4 rounded-full border border-green-800/30">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white max-w-xs truncate">{file.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
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
                  <div className="bg-[#1c1d24] text-gray-400 p-4 rounded-full border border-[#2d313c]">
                    <Upload className="h-8 w-8 text-[#e50914]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Drag & drop your report CSV here</p>
                    <p className="text-xs text-gray-500 mt-1">or click to browse local files</p>
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
              className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] text-white py-3 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-[#e5091422] hover:shadow-[#e5091444] disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500"
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
        <div className="glass rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-[#e50914] tracking-wider mb-4">Required CSV Scheme</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              To guarantee successful uploads, format the CSV file headers exactly as defined:
            </p>
            
            <div className="bg-[#090a0c] border border-[#21242e] rounded-lg p-3.5 space-y-2 font-mono text-[9px] text-gray-500 select-all">
              <div className="text-[#e50914] font-bold">domain,date,country,device,impressions,pageviews,clicks,gross_revenue</div>
              <div>techblog.com,2026-05-28,USA,DESKTOP,250000,280000,4200,420.50</div>
              <div>sportshub.net,2026-05-28,GBR,MOBILE,180000,200000,3100,310.20</div>
            </div>

            <ul className="mt-5 space-y-2 text-[10px] text-gray-400 font-semibold">
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-white">domain:</strong> must be registered in website inventory.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-white">date:</strong> YYYY-MM-DD format.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#e50914] mt-0.5">•</span>
                <span><strong className="text-white">revenue:</strong> raw partner revenue ($).</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#e5091408] border border-[#e5091422] p-3 rounded-lg text-[9px] text-[#ff6b6b] leading-relaxed mt-6">
            Our engine automatically matches the website domain, resolves its publisher owner, fetches the active revenue share percentage for the report date, applies the cut, and writes the metrics instantly!
          </div>
        </div>

      </div>

      {/* Upload Logs History */}
      <div className="glass rounded-xl overflow-hidden relative">
        {logsLoading && (
          <div className="absolute inset-0 bg-[#090a0c99] z-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
          </div>
        )}
        
        <div className="px-6 py-5 border-b border-[#16181c] flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ingestion Logs & history</h3>
          <span className="text-[10px] text-gray-500 font-bold">Auto-syncing active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1a1c20] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4">Uploader</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Processed Rows</th>
                <th className="px-6 py-4">Failed Rows</th>
                <th className="px-6 py-4">Upload Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16181c] text-xs font-semibold">
              {currentLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-[#121318] transition-all">
                  <td className="px-6 py-4 font-bold text-white max-w-xs truncate">
                    <div>{log.fileName}</div>
                    
                    {/* Expandable error block if failed */}
                    {log.status === 'FAILED' && log.errorDetails && (
                      <pre className="mt-2 p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-[9px] font-mono text-red-400 whitespace-pre-wrap leading-relaxed select-all">
                        {log.errorDetails}
                      </pre>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{log.uploader?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      log.status === 'COMPLETED'
                        ? 'bg-green-950/20 border-green-800/30 text-[#4ade80]'
                        : log.status === 'PROCESSING'
                        ? 'bg-blue-950/20 border-blue-800/30 text-blue-400 animate-pulse'
                        : 'bg-red-950/20 border-red-800/30 text-[#f87171]'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{log.rowsProcessed}</td>
                  <td className={`px-6 py-4 ${log.rowsFailed > 0 ? 'text-[#f87171] font-bold' : 'text-gray-500'}`}>{log.rowsFailed}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
