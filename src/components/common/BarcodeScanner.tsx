import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Keyboard, AlertTriangle } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  /**
   * When true, the scanner stays open after a successful scan so multiple
   * codes can be captured (caller decides when to close). Default: false.
   */
  continuous?: boolean;
}

// Barcode formats most relevant to retail. BarcodeDetector supports all of these on Chromium.
const SUPPORTED_FORMATS = [
  'aztec',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'data_matrix',
  'ean_13',
  'ean_8',
  'itf',
  'pdf417',
  'qr_code',
  'upc_a',
  'upc_e',
];

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

export default function BarcodeScanner({
  open,
  onClose,
  onScan,
  title = 'Scan a barcode',
  continuous = false,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const start = async () => {
      setError(null);
      const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      setSupported(hasDetector);

      if (!hasDetector) {
        setManualMode(true);
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
      } catch {
        detectorRef.current = new window.BarcodeDetector();
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        scanLoop();
      } catch (err: any) {
        setError(err?.name === 'NotAllowedError'
          ? 'Camera permission denied. You can type the barcode manually.'
          : 'Could not access camera. You can type the barcode manually.');
        setManualMode(true);
      }
    };

    const scanLoop = async () => {
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector || cancelled) return;

      try {
        if (video.readyState >= 2) {
          const results = await detector.detect(video);
          if (results && results.length > 0) {
            const code = String(results[0].rawValue || '').trim();
            if (code) {
              const now = Date.now();
              // Debounce duplicate scans within 1.5s
              if (!lastCodeRef.current || lastCodeRef.current.code !== code || now - lastCodeRef.current.at > 1500) {
                lastCodeRef.current = { code, at: now };
                try {
                  navigator.vibrate?.(80);
                } catch {}
                onScan(code);
                if (!continuous) return;
              }
            }
          }
        }
      } catch {
        // Ignore transient decode errors
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    };

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      detectorRef.current = null;
      lastCodeRef.current = null;
    };
  }, [open, continuous, onScan]);

  useEffect(() => {
    if (!open) {
      setManualMode(false);
      setManualCode('');
      setError(null);
      setSupported(null);
    }
  }, [open]);

  if (!open) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) onScan(code);
  };

  const content = (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-4 w-4" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!manualMode && (
          <div className="relative aspect-[4/3] bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* Scan guide overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-4/5 h-1/3 border-2 border-blue-400 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>
            {error && (
              <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {manualMode && (
          <div className="p-4 space-y-3">
            {supported === false && (
              <div className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-md p-2 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Your browser doesn&apos;t support in-browser barcode scanning. Type the barcode manually, or use Chrome on Android for camera scanning.</span>
              </div>
            )}
            {error && (
              <div className="text-red-300 text-xs bg-red-500/10 border border-red-500/30 rounded-md p-2 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <label className="text-xs text-gray-300">Enter barcode</label>
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 6009880050122"
                className="w-full px-3 py-2 rounded-md bg-gray-800 text-white text-sm border border-white/10 focus:border-blue-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
              >
                Use this code
              </button>
            </form>
          </div>
        )}

        <div className="px-4 py-2.5 bg-black/40 flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {manualMode ? 'Manual entry' : 'Point the camera at the barcode'}
          </span>
          <button
            type="button"
            onClick={() => setManualMode((v) => !v)}
            className="text-blue-300 hover:text-blue-200 flex items-center gap-1"
          >
            <Keyboard className="h-3.5 w-3.5" />
            {manualMode ? 'Use camera' : 'Type manually'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
