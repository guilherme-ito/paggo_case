'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { documentsApi } from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import type { Document, LLMInteraction } from '@/lib/types';
import {
  ArrowLeft,
  Download,
  MessageSquare,
  Sparkles,
  RefreshCw,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [query, setQuery] = useState('');
  const [queryError, setQueryError] = useState('');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await documentsApi.getOne(id);
      setDocument(data);
      setError('');
      
      // Load file preview with authentication
      if (data) {
        try {
          const response = await apiClient.get(`/documents/${data.id}/file`, {
            responseType: 'blob',
          });
          const blob = new Blob([response.data], { type: data.mimeType });
          const url = URL.createObjectURL(blob);
          setFilePreviewUrl(url);
        } catch (err) {
          console.error('Failed to load file preview:', err);
          // Don't set error, just don't show preview
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load document');
      if (err.response?.status === 401) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleReprocessOCR = async () => {
    if (!document) return;
    
    if (!confirm('Are you sure you want to re-process OCR for this document? The existing OCR results will be replaced.')) {
      return;
    }

    try {
      setReprocessing(true);
      setError('');
      await documentsApi.reprocessOCR(document.id);
      // Reload document after a short delay to see the processing status
      setTimeout(() => {
        loadDocument();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to re-process OCR');
    } finally {
      setReprocessing(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadDocument();
      // Poll for updates if document is still processing
      const interval = setInterval(() => {
        if (document?.uploadStatus === 'PROCESSING' || document?.ocrResult?.status === 'PROCESSING') {
          loadDocument();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const handleExplain = async () => {
    if (!document) return;

    setExplaining(true);
    setError('');

    try {
      const interaction = await documentsApi.explain(document.id);
      await loadDocument(); // Reload to get updated interactions
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate explanation');
    } finally {
      setExplaining(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !query.trim()) return;

    setQuerying(true);
    setQueryError('');

    try {
      const interaction = await documentsApi.query(document.id, query);
      setQuery('');
      await loadDocument(); // Reload to get updated interactions
    } catch (err: any) {
      setQueryError(err.response?.data?.message || 'Failed to process query');
    } finally {
      setQuerying(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      setError('');
      // Download as blob and extract filename from Content-Disposition header
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/documents/${document.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Extract filename from Content-Disposition header, or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const contentType = response.headers.get('Content-Type');
      
      // Determine default filename based on content type
      const isZip = contentType?.includes('application/zip');
      const baseName = document.originalName.replace(/\.[^/.]+$/, '');
      let filename = isZip 
        ? `${baseName}_with_extracted_data.zip`
        : `${baseName}_with_extracted_data.pdf`;
        
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Use window.document to avoid conflict with the 'document' variable
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      const errorMessage = 
        err.response?.data?.message || 
        err.message || 
        'Download failed. Please check the backend logs.';
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="mt-4 text-gray-600">Document not found</p>
          <Link href="/documents" className="mt-4 text-blue-600 hover:text-blue-700">
            Back to documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link
                href="/documents"
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <span className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md">
                {document.originalName}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 flex items-start animate-slide-up">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Document Preview */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Document Preview</h2>
              {loading || !filePreviewUrl ? (
                <div className="w-full h-[600px] rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading preview...</p>
                  </div>
                </div>
              ) : document.mimeType.startsWith('image/') ? (
                <div className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
                  <img
                    src={filePreviewUrl}
                    alt={document.originalName}
                    className="w-full h-auto max-h-[600px] object-contain"
                  />
                </div>
              ) : document.mimeType === 'application/pdf' ? (
                <div className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-900">
                  <iframe
                    src={filePreviewUrl}
                    className="w-full h-[600px] border-0"
                    title={document.originalName}
                    style={{ minHeight: '600px' }}
                  />
                  <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {document.originalName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">Document Preview</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{document.originalName}</p>
                </div>
              )}
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    document.uploadStatus === 'COMPLETED' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : document.uploadStatus === 'PROCESSING'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {document.uploadStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-medium text-gray-700 dark:text-gray-300">File Size:</span>
                  <span className="text-gray-600 dark:text-gray-400">{(document.fileSize / 1024).toFixed(2)} KB</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Uploaded:</span>
                  <span className="text-gray-600 dark:text-gray-400">{new Date(document.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* OCR Results */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Extracted Text</h2>
                {(document.ocrResult?.status === 'COMPLETED' || document.ocrResult?.status === 'FAILED') && (
                  <button
                    onClick={handleReprocessOCR}
                    disabled={reprocessing}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reprocessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Reprocessing...
                      </>
                    ) : (
                      <>
                        <RotateCw className="h-4 w-4" />
                        Re-process OCR
                      </>
                    )}
                  </button>
                )}
              </div>
              {document.ocrResult?.status === 'PROCESSING' ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Processing OCR...</span>
                </div>
              ) : document.ocrResult?.status === 'COMPLETED' ? (
                <div className="space-y-4">
                  {document.ocrResult.confidence && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">Confidence:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {document.ocrResult.confidence.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                      {document.ocrResult.extractedText || 'No text extracted'}
                    </pre>
                  </div>
                  <button
                    onClick={handleExplain}
                    disabled={explaining}
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {explaining ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate AI Explanation
                      </>
                    )}
                  </button>
                </div>
              ) : document.ocrResult?.status === 'FAILED' ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-300 font-medium">OCR processing failed</p>
                  {document.ocrResult.error && (
                    <p className="text-sm mt-2 text-red-600 dark:text-red-400">{document.ocrResult.error}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">OCR processing pending...</p>
                </div>
              )}
            </div>
          </div>

          {/* Query Section - Always at the top */}
          {document.ocrResult?.status === 'COMPLETED' && (
            <div className="mt-6 card p-6 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Ask a Question</h2>
              <form onSubmit={handleQuery}>
                {queryError && (
                  <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300 animate-slide-up">
                    {queryError}
                  </div>
                )}
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question about this document..."
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={querying}
                  />
                  <button
                    type="submit"
                    disabled={querying || !query.trim()}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {querying ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Ask
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* LLM Interactions */}
          {document.llmInteractions && document.llmInteractions.length > 0 && (
            <div className="mt-6 card p-6 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">AI Interactions</h2>
              <div className="space-y-6">
                {document.llmInteractions.map((interaction: LLMInteraction, index: number) => (
                  <div
                    key={interaction.id}
                    className="border-l-4 pl-4 animate-slide-up rounded-r-lg p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50"
                    style={{ 
                      borderColor: interaction.type === 'EXPLANATION' ? '#9333ea' : '#2563eb',
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div className="flex items-center mb-3">
                      {interaction.type === 'EXPLANATION' ? (
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                      ) : (
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {interaction.type === 'EXPLANATION' ? 'Explanation' : 'Query'}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {new Date(interaction.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {interaction.type === 'QUERY' && (
                      <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          <strong className="text-blue-600 dark:text-blue-400">Q:</strong> {interaction.prompt}
                        </p>
                      </div>
                    )}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {interaction.response}
                      </p>
                    </div>
                    {interaction.tokensUsed && (
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        🔢 Tokens used: {interaction.tokensUsed}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
