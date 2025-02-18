'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';
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
  rawBytes: number[] | null;
  timestamp: number;
};

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // Start scanning for QR codes
  const startScanning = async () => {
    try {
      setError(null);
      setResult(null);

      const codeReader = new BrowserQRCodeReader();
      codeReaderRef.current = codeReader; // Store the codeReader instance
      const videoElement = videoRef.current;

      if (!videoElement) {
        throw new Error('Video element not found');
      }

      // Get video input devices using Web API
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoInputDevices.length === 0) {
        throw new Error('No video input devices found');
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;

      // Start decoding from the selected video device
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoElement,
        (result, error) => {
          if (result) {
            setResult({
              text: result.getText(),
              rawBytes: result.getRawBytes() ? Array.from(result.getRawBytes()) : null,
              timestamp: Date.now(),
            });
            stopScanning();
          }

          if (error) {
            console.error(error);
            setError('Error scanning QR code. Please try again.');
          }
        }
      );

      setScanning(true);
    } catch (err) {
      setError('Failed to access camera. Please ensure permissions are granted.');
      console.error('Error accessing camera:', err);
    }
  };

  // Stop scanning and release camera resources
  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current = null;
    }
    setScanning(false);
  };

  // Handle downloading binary data from the QR code
  const handleDownload = () => {
    if (!result?.rawBytes) return;

    const blob = new Blob([new Uint8Array(result.rawBytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-data-${result.timestamp}.bin`;
    a.click();
    URL.revokeObjectURL(url);
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
              {result.rawBytes ? (
                <div className="mt-2 space-y-2">
                  <p>Binary data detected ({result.rawBytes.length} bytes)</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    Download Binary Data
                  </Button>
                </div>
              ) : (
                <p className="mt-2 break-all">{result.text}</p>
              )}
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
