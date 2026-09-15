import React, { useRef, useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onEmailsExtracted: (emails: string[]) => void;
  maxFileSizeMB?: number;
}

interface ParseResult {
  valid: string[];
  invalid: number;
  duplicates: number;
  total: number;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function parseCSVContent(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const allEmails: string[] = [];
  const invalidCount: string[] = [];

  for (const line of lines) {
    const matches = line.match(EMAIL_REGEX);
    if (matches) {
      allEmails.push(...matches);
    } else {
      // Skip header-like lines
      const lower = line.toLowerCase().trim();
      if (
        lower !== 'email' &&
        lower !== 'name,email' &&
        lower !== 'email,name' &&
        !lower.startsWith('name') &&
        !lower.startsWith('#') &&
        lower.length > 0
      ) {
        invalidCount.push(line.trim());
      }
    }
  }

  // Normalize and deduplicate
  const normalized = allEmails.map((e) => e.trim().toLowerCase());
  const uniqueSet = new Set(normalized);
  const unique = Array.from(uniqueSet);
  const duplicates = normalized.length - unique.length;

  return {
    valid: unique,
    invalid: invalidCount.length,
    duplicates,
    total: normalized.length,
  };
}

export function FileUploader({
  onEmailsExtracted,
  maxFileSizeMB = 5,
}: FileUploaderProps) {
  const [mode, setMode] = useState<'csv' | 'manual'>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = (file: File) => {
    // Validate file size
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${maxFileSizeMB}MB.`);
      return;
    }

    // Validate file type
    const validTypes = [
      'text/csv',
      'text/plain',
      'application/vnd.ms-excel',
      'application/csv',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|txt)$/i)) {
      setError('Please upload a CSV or text file.');
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSVContent(content);

      if (result.valid.length === 0) {
        setError('No valid email addresses found in the file.');
        setParseResult(null);
        return;
      }

      setParseResult(result);
      onEmailsExtracted(result.valid);
    };

    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
    };

    reader.readAsText(file);
  };

  const handleManualChange = (text: string) => {
    setManualText(text);
    if (!text.trim()) {
      setParseResult(null);
      setError(null);
      onEmailsExtracted([]);
      return;
    }

    const result = parseCSVContent(text);
    if (result.valid.length === 0) {
      setError('No valid email addresses found yet.');
    } else {
      setError(null);
    }
    setParseResult(result);
    onEmailsExtracted(result.valid);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    setParseResult(null);
    setError(null);
    onEmailsExtracted([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text-primary">
          Recipients
        </label>
        <div className="flex rounded-md bg-gray-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('csv');
              if (fileName && parseResult) onEmailsExtracted(parseResult.valid);
            }}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              mode === 'csv'
                ? 'bg-white text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Upload CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              if (manualText) handleManualChange(manualText);
            }}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-white text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Paste Emails
          </button>
        </div>
      </div>

      {mode === 'manual' ? (
        <div className="space-y-2">
          <textarea
            value={manualText}
            onChange={(e) => handleManualChange(e.target.value)}
            placeholder="Paste or type emails separated by commas or line breaks&#10;e.g. john@example.com, alice@example.com"
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-btn border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          {parseResult && parseResult.valid.length > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-xs text-success-dark font-medium">
                {parseResult.valid.length} valid recipient{parseResult.valid.length !== 1 ? 's' : ''} detected
              </span>
            </div>
          )}
        </div>
      ) : !fileName ? (
        <div
          className={`border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-primary bg-primary-light'
              : 'border-border hover:border-primary hover:bg-primary-light/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          role="button"
          aria-label="Upload CSV file"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
        >
          <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-text-primary">
            Drop a CSV file or click to browse
          </p>
          <p className="text-xs text-text-muted mt-1">
            Supports .csv and .txt files up to {maxFileSizeMB}MB
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-text-primary">
                {fileName}
              </span>
            </div>
            <button
              onClick={clearFile}
              className="p-1 rounded hover:bg-gray-100 text-text-secondary"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {parseResult && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm text-success-dark font-medium">
                  {parseResult.valid.length} valid email{parseResult.valid.length !== 1 ? 's' : ''} detected
                </span>
              </div>
              {parseResult.duplicates > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="text-sm text-warning-dark">
                    {parseResult.duplicates} duplicate{parseResult.duplicates !== 1 ? 's' : ''} removed
                  </span>
                </div>
              )}
              {parseResult.invalid > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-error" />
                  <span className="text-sm text-error-dark">
                    {parseResult.invalid} invalid row{parseResult.invalid !== 1 ? 's' : ''} skipped
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-error">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
