import { useEffect, useState } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, FileText, Copy, Check, Quote, Maximize2 } from 'lucide-react';
import { getFileContentUrl, getPageDetails } from '../../lib/api';

interface DocumentViewerModalProps {
  filename: string;
  initialPage?: number;
  section?: string;
  evidence?: string;
  onClose: () => void;
}

export function DocumentViewerModal({
  filename,
  initialPage = 1,
  section,
  evidence,
  onClose,
}: DocumentViewerModalProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [copied, setCopied] = useState(false);
  const [pageData, setPageData] = useState<{ page_number: number; text: string; blocks: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const isPdf = filename.toLowerCase().endsWith('.pdf');
  const fileUrl = getFileContentUrl(filename);
  const pdfPageUrl = `${fileUrl}#page=${currentPage}`;

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPageDetails(filename, currentPage)
      .then(data => {
        if (mounted) setPageData(data);
      })
      .catch(() => {
        if (mounted) setPageData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filename, currentPage]);

  const copyEvidence = () => {
    if (evidence) {
      navigator.clipboard.writeText(evidence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#080D1D]/95 shadow-2xl shadow-indigo-950/60 backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-6 py-4 bg-[#0B1124]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate max-w-xs sm:max-w-md" title={filename}>
                  {filename}
                </h2>
                <span className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                  Page {currentPage}
                </span>
                {section && (
                  <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 hidden sm:inline-block">
                    {section}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Grounded Source Verification & Citation Proof</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Page navigation */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition rounded-lg hover:bg-white/5"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2.5 text-xs font-medium text-slate-200 font-mono">P. {currentPage}</span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/5"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
              Open Original
            </a>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Close modal (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content body: split viewer */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Main Viewer Area (PDF / Text) */}
          <div className="flex-1 bg-[#040711] flex flex-col relative overflow-hidden">
            {isPdf ? (
              <iframe
                key={pdfPageUrl}
                src={pdfPageUrl}
                title="PDF Document Viewer"
                className="h-full w-full border-none"
              />
            ) : (
              <div className="h-full overflow-y-auto p-6 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {pageData?.text || 'Loading document content...'}
              </div>
            )}
          </div>

          {/* Evidence Sidebar */}
          <div className="w-full lg:w-88 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#070D1E]/95 p-5 flex flex-col gap-4 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  <Quote className="h-3.5 w-3.5 text-indigo-400" />
                  Grounded Evidence
                </span>
                {evidence && (
                  <button
                    onClick={copyEvidence}
                    className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-400 hover:bg-white/5 hover:text-white transition"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy Quote'}
                  </button>
                )}
              </div>
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs leading-relaxed text-slate-200 shadow-inner">
                {evidence ? (
                  <p className="italic font-serif leading-6 text-slate-200">"{evidence}"</p>
                ) : (
                  <p className="text-slate-400">Viewing page {currentPage} of {filename}</p>
                )}
              </div>
            </div>

            {/* Extracted Page Text Highlights */}
            {pageData && pageData.text && (
              <div className="flex-1 flex flex-col min-h-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Page {currentPage} Raw Extract
                </span>
                <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#040814] p-3 text-[11px] text-slate-300 leading-relaxed font-mono whitespace-pre-wrap select-text">
                  {pageData.text}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
