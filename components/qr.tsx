'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ScanResult = {
  text: string;
  timestamp: number;
};

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup function to stop the stream when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setResult(null);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure you have granted camera permissions.');
      console.error('Error accessing camera:', err);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = async () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0) {
      requestAnimationFrame(scanFrame);
      return;
    }

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Import QR code scanner library dynamically to reduce initial bundle size
      const jsQR = (await import('jsqr')).default;

      // Get image data for QR code detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Attempt to detect QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        // QR code detected
        setResult({
          text: code.data,
          timestamp: Date.now()
        });
        stopScanning();
      } else {
        // Continue scanning
        requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error('Error scanning QR code:', err);
      setError('Error scanning QR code. Please try again.');
      stopScanning();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>QR Code Scanner</CardTitle>
        <CardDescription>
          Scan any QR code using your device camera
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            {scanning ? (
              <>
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 h-full w-full hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={stopScanning}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={startScanning}
                >
                  <Camera className="h-4 w-4" />
                  Start Scanning
                </Button>
              </div>
            )}
          </div>

          {result && (
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Scanned Result:</h3>
              <p className="mt-2 break-all">{result.text}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scanned at: {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QRScanner;
