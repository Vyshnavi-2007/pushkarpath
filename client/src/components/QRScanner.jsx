import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Image as ImageIcon, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function QRScanner({
  onScan,
  onError,
  isPaused = false,
  className = '',
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerId = 'qr-reader-viewport';

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCam ? backCam.id : devices[0].id);
        } else {
          setScannerError('No camera found on this device. You can upload a photo instead.');
        }
      })
      .catch((err) => {
        console.warn('Camera permission or availability warning:', err);
        setScannerError('Camera access unavailable. You can upload a pass photo instead.');
      });

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (selectedCamera && !isPaused) {
      startScanner(selectedCamera);
    } else if (isPaused) {
      stopScanner();
    }
  }, [selectedCamera, isPaused]);

  const startScanner = async (cameraId) => {
    try {
      setScannerError(null);
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // Ignore
        }
      }

      const scanner = new Html5Qrcode(containerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setLastScanned(decodedText);
          if (onScan) onScan(decodedText);
        },
        (errorMessage) => {
          // Non-critical frame error
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.warn('Failed to start scanner:', err);
      setIsScanning(false);
      setScannerError('Could not start camera. Please verify camera permissions or upload an image.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      const scanner = html5QrCodeRef.current || new Html5Qrcode(containerId);
      html5QrCodeRef.current = scanner;
      const decodedText = await scanner.scanFile(file, true);
      setLastScanned(decodedText);
      if (onScan) onScan(decodedText);
    } catch (err) {
      setScannerError('Could not read a valid QR code from the uploaded image. Please try another photo.');
      if (onError) onError(err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-stone-900 rounded-2xl overflow-hidden shadow-lg border border-stone-800 ${className}`}>
      {/* Viewfinder Area */}
      <div className="relative w-full aspect-square max-h-[380px] bg-black flex items-center justify-center overflow-hidden">
        <div id={containerId} className="w-full h-full" />

        {/* Viewfinder Target Graphic */}
        {isScanning && !isPaused && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-turmeric/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-marigold rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-marigold rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-marigold rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-marigold rounded-br-lg" />
              {/* Scanning laser line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-turmeric to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        {/* Fallback info when camera stopped */}
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-stone-300 bg-stone-900/90 z-20">
            <Camera className="w-12 h-12 text-turmeric mb-3" />
            <p className="text-sm font-medium">Camera Viewfinder Paused</p>
            {scannerError ? (
              <p className="text-xs text-rose-300 mt-2 max-w-xs">{scannerError}</p>
            ) : (
              <p className="text-xs text-stone-400 mt-1">Ready to scan pilgrim passes</p>
            )}
            {selectedCamera && (
              <button
                type="button"
                onClick={() => startScanner(selectedCamera)}
                className="mt-4 px-4 py-2 bg-maroon hover:bg-maroon-light text-white text-xs font-semibold rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Start Camera
              </button>
            )}
          </div>
        )}
      </div>

      {/* Control Toolbar */}
      <div className="p-4 bg-stone-950 flex flex-wrap items-center justify-between gap-3 text-white border-t border-stone-800">
        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <Camera className="w-4 h-4 text-turmeric" />
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="bg-stone-900 text-stone-200 border border-stone-700 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-marigold"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scan a photo fallback button */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="qr-file-upload"
          />
          <label
            htmlFor="qr-file-upload"
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors focus:ring-2 focus:ring-marigold"
          >
            <ImageIcon className="w-3.5 h-3.5 text-turmeric" />
            Scan a photo
          </label>
        </div>
      </div>
    </div>
  );
}
