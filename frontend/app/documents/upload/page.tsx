'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { documentsApi } from '@/lib/api';
import { Upload, X, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (selectedFile: File) => {
    setError('');
    setSuccess(false);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload an image (JPG, PNG, GIF) or PDF.');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      const document = await documentsApi.upload(file);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/documents/${document.id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMessage = 
        err.response?.data?.message || 
        err.response?.data?.error ||
        err.message || 
        'Upload failed. Please try again.';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link
                href="/documents"
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Upload Document
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <form onSubmit={handleSubmit}>
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
              } card`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-96 mx-auto rounded-lg shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : file ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-center">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl">
                      <Upload className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-center">
                    <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl">
                      <Upload className="h-16 w-16 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      Select a file
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <p className="text-base text-gray-700 dark:text-gray-300 font-medium">
                      or drag and drop an image or PDF here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">PNG, JPG, GIF, PDF up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 flex items-start animate-slide-up">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 flex items-start animate-slide-up">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800 dark:text-green-300">
                  Document uploaded successfully! Redirecting...
                </div>
              </div>
            )}

            {file && !success && (
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {uploading ? (
                    <>
                      <Upload className="h-5 w-5 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
