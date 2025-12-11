import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, CameraOff, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
}

export const QRScanner = ({ onScan, onClose, title = "Scan QR Code" }: QRScannerProps) => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const webcamRef = useRef<Webcam>(null);
  const rafRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopScanLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  };

  const captureFrame = useCallback(() => {
    const video = webcamRef.current?.video as HTMLVideoElement | undefined;
    if (!video || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      rafRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) {
      rafRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, width, height);

    if (code) {
      stopScanLoop();
      onScan(code.data);
      toast({
        title: "QR Code Scanned",
        description: "Successfully scanned QR code",
      });
    } else {
      rafRef.current = requestAnimationFrame(captureFrame);
    }
  }, [onScan]);

  const startCamera = () => {
    setIsCameraOn(true);
    stopScanLoop();
    rafRef.current = requestAnimationFrame(captureFrame);
  };

  const stopCamera = () => {
    setIsCameraOn(false);
    stopScanLoop();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      toast({
        title: "Manual Input",
        description: "Product ID entered manually",
      });
    }
  };

  // Ensure scan loop stops if the component unmounts.
  useEffect(() => stopScanLoop, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Section */}
          <div className="space-y-4">
            <div className="text-center">
              {!isCameraOn ? (
                <Button onClick={startCamera} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Start Camera
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                      }}
                      className="w-full rounded-lg"
                    />
                  </div>
                  <Button 
                    onClick={stopCamera} 
                    variant="outline"
                    className="gap-2"
                  >
                    <CameraOff className="h-4 w-4" />
                    Stop Camera
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter manually
              </span>
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <Label htmlFor="manual-input">Product ID</Label>
            <div className="flex gap-2">
              <Input
                id="manual-input"
                placeholder="Enter product ID"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button 
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
              >
                Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
