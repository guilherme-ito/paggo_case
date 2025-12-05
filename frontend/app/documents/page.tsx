'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { documentsApi } from '@/lib/api';
import type { Document } from '@/lib/types';
import { Upload, FileText, LogOut, RefreshCw, X, Search, Trash2, ArrowUpDown, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const ITEMS_PER_PAGE = 12;

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('DATE_DESC');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsApi.getAll();
      setDocuments(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load documents');
      if (err.response?.status === 401) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/auth/login');
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter((doc) => {
      // Search filter - search in filename, summary, and OCR text
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = doc.originalName.toLowerCase().includes(query);
        const matchesSummary = doc.ocrResult?.summary?.toLowerCase().includes(query);
        const matchesText = doc.ocrResult?.extractedText?.toLowerCase().includes(query);
        
        if (!matchesName && !matchesSummary && !matchesText) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter !== 'ALL' && doc.uploadStatus !== statusFilter) {
        return false;
      }
      
      // Type filter
      if (typeFilter === 'PDF' && doc.mimeType !== 'application/pdf') {
        return false;
      }
      if (typeFilter === 'IMAGE' && !doc.mimeType.startsWith('image/')) {
        return false;
      }
      
      return true;
    });

    // Sort documents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'DATE_DESC':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'DATE_ASC':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'NAME_ASC':
          return a.originalName.localeCompare(b.originalName);
        case 'NAME_DESC':
          return b.originalName.localeCompare(a.originalName);
        case 'SIZE_DESC':
          return b.fileSize - a.fileSize;
        case 'SIZE_ASC':
          return a.fileSize - b.fileSize;
        case 'STATUS':
          return a.uploadStatus.localeCompare(b.uploadStatus);
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, searchQuery, statusFilter, typeFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedDocuments, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // Bulk operations
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedDocuments.map(doc => doc.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} document(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkDeleting(true);
      await Promise.all(Array.from(selectedIds).map(id => documentsApi.delete(id)));
      setDocuments(documents.filter(doc => !selectedIds.has(doc.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete documents');
    } finally {
      setBulkDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSortBy('DATE_DESC');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(id);
      await documentsApi.delete(id);
      // Remove from local state
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  // Load sort preference from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('documentSort');
    if (savedSort) {
      setSortBy(savedSort);
    }
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem('documentSort', sortBy);
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Paggo OCR
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Documents
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and process your documents with AI-powered OCR
              </p>
            </div>
            <Link
              href="/documents/upload"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Document
            </Link>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 mb-4">
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="PROCESSING">Processing</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="PDF">PDF</option>
                <option value="IMAGE">Image</option>
              </select>

              {/* Clear Filters */}
              {(searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' || sortBy !== 'DATE_DESC') && (
                <button
                  onClick={clearFilters}
                  className="flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </button>
              )}
            </div>

            {/* Results count, Bulk actions, and Sort */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {filteredAndSortedDocuments.length !== documents.length && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredAndSortedDocuments.length} of {documents.length} documents
                  </p>
                )}
                {paginatedDocuments.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {selectedIds.size === paginatedDocuments.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Select All
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedIds.size} selected
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {bulkDeleting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete Selected
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DATE_DESC">Newest First</option>
                  <option value="DATE_ASC">Oldest First</option>
                  <option value="NAME_ASC">Name (A-Z)</option>
                  <option value="NAME_DESC">Name (Z-A)</option>
                  <option value="SIZE_DESC">Largest First</option>
                  <option value="SIZE_ASC">Smallest First</option>
                  <option value="STATUS">By Status</option>
                </select>
              </div>
            </div>
          </div>

          {loading && documents.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 card animate-fade-in">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No documents yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Get started by uploading your first document. We&apos;ll extract the text and help you interact with it using AI.
              </p>
              <Link
                href="/documents/upload"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Your First Document
              </Link>
            </div>
          ) : filteredAndSortedDocuments.length === 0 ? (
            <div className="text-center py-16 card animate-fade-in">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No documents found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Try adjusting your filters or search query.
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedDocuments.map((doc, index) => (
                <div
                  key={doc.id}
                  className={`card hover:shadow-2xl transform hover:scale-105 transition-all duration-200 animate-slide-up relative group ${
                    selectedIds.has(doc.id) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSelect(doc.id);
                      }}
                      className="p-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Select document"
                    >
                      {selectedIds.has(doc.id) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <Link
                    href={`/documents/${doc.id}`}
                    className="block"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              doc.uploadStatus
                            )}`}
                          >
                            {doc.uploadStatus}
                          </span>
                          {/* Delete Button */}
                          <button
                            onClick={(e) => handleDelete(doc.id, e)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-10"
                            aria-label="Delete document"
                          >
                            {deletingId === doc.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {doc.originalName}
                      </h3>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📄 {(doc.fileSize / 1024).toFixed(2)} KB
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📅 {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                        {doc._count && doc._count.llmInteractions > 0 && (
                          <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                            💬 {doc._count.llmInteractions} AI interaction{doc._count.llmInteractions > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {doc.ocrResult && doc.ocrResult.status === 'COMPLETED' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          {doc.ocrResult.summary ? (
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 font-medium">
                              {doc.ocrResult.summary}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                              {doc.ocrResult.extractedText.substring(0, 150)}...
                            </p>
                          )}
                          {doc.ocrResult.confidence && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                              ✓ {doc.ocrResult.confidence.toFixed(1)}% confidence
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    if (!showPage && page === 2) {
                      return <span key={page} className="px-2 text-gray-500">...</span>;
                    }
                    if (!showPage && page === totalPages - 1) {
                      return <span key={page} className="px-2 text-gray-500">...</span>;
                    }
                    if (!showPage) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 border rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
