import { useCallback, useState } from "react";
import { QRScanner } from "@/components/qr/QRScanner";
import { QRCodeGenerator } from "@/components/qr/QRCodeGenerator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Loader2, ScanLine, ShieldCheck } from "lucide-react";

type VerificationResult = {
  status: "valid" | "warning" | "invalid";
  title: string;
  message: string;
  reference: string;
  processedAt: string;
  extraDetails: Array<{ label: string; value: string }>;
};

const DEMO_QR_PAYLOAD = "ENCRYPTED::SEGMENT-ALPHA-1234567890";

const statusCopy: Record<
  VerificationResult["status"],
  { label: string; badgeVariant: "default" | "secondary" | "destructive" }
> = {
  valid: { label: "Verified", badgeVariant: "default" },
  warning: { label: "Needs Attention", badgeVariant: "secondary" },
  invalid: { label: "Rejected", badgeVariant: "destructive" },
};

const mockSubmitScan = async (
  encryptedText: string,
): Promise<VerificationResult> => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const score = encryptedText.length % 3;
  if (score === 0) {
    return {
      status: "valid",
      title: "Shipment Verified",
      message:
        "The QR payload matched a valid shipment segment. You can continue the process.",
      reference: `SEG-${encryptedText.slice(0, 6).toUpperCase()}`,
      processedAt: new Date().toISOString(),
      extraDetails: [
        { label: "Segment Status", value: "IN_TRANSIT" },
        { label: "Temperature Lock", value: "Active" },
      ],
    };
  }
  if (score === 1) {
    return {
      status: "warning",
      title: "Verification Warning",
      message:
        "The payload is valid but requires manual confirmation due to unusual routing.",
      reference: `CHK-${encryptedText.slice(-6).toUpperCase()}`,
      processedAt: new Date().toISOString(),
      extraDetails: [
        { label: "Flag", value: "Route deviation" },
        { label: "Action", value: "Confirm with dispatcher" },
      ],
    };
  }
  return {
    status: "invalid",
    title: "Verification Failed",
    message:
      "The encrypted data did not match any shipment on record. Please retry or escalate.",
    reference: `ERR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    processedAt: new Date().toISOString(),
    extraDetails: [
      { label: "Reason", value: "Unknown payload signature" },
      { label: "Suggested Next Step", value: "Re-scan QR or contact support" },
    ],
  };
};

export default function QRScannerPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleScan = useCallback(async (payload: string) => {
    setScannerOpen(false);
    setDialogOpen(true);
    setIsSubmitting(true);
    setLastScannedValue(payload);
    setSubmissionError(null);
    setVerificationResult(null);
    try {
      const response = await mockSubmitScan(payload);
      setVerificationResult(response);
    } catch (error) {
      console.error("Failed to submit QR payload", error);
      setSubmissionError("Unable to reach verification service. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleDialogChange = (open: boolean) => {
    if (isSubmitting) return;
    setDialogOpen(open);
    if (!open) {
      setVerificationResult(null);
      setSubmissionError(null);
    }
  };

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background via-background to-muted p-4 sm:p-6 lg:p-8 shadow-sm">
      <div className="absolute inset-0 -z-10 opacity-70 blur-3xl" />
      <div className="flex flex-col gap-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Trusted QR Validation
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            All-in-one QR verification hub
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Scan encrypted payloads, confirm authenticity, and keep handovers moving.
            Built for every role, optimized for the devices your teams already use.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card className="border-none bg-card/80 shadow-lg shadow-primary/5 backdrop-blur">
            <CardHeader className="space-y-1 pb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Step 1
              </p>
              <CardTitle className="text-2xl">Scan encrypted QR</CardTitle>
              <CardDescription>
                Works across mobile and desktop. Submit encrypted data to validate shipment
                movement instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground">Ready to scan?</p>
                    <p className="text-xs text-muted-foreground">
                      Tap the button and point your camera at the encrypted QR label.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gap-2"
                    onClick={() => setScannerOpen(true)}
                  >
                    <ScanLine className="h-5 w-5" />
                    Launch scanner
                  </Button>
                </div>
              </div>
              {lastScannedValue ? (
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm">
                  <p className="text-muted-foreground">Last encrypted payload:</p>
                  <p className="font-mono break-all text-primary text-xs sm:text-sm">
                    {lastScannedValue}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  No scans yet. Your encrypted payload will appear here after the first scan.
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-background/90 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">Quick flow</p>
                    <p className="text-xs text-muted-foreground">
                      Designed so field teams can operate confidently in seconds.
                    </p>
                  </div>
                </div>
                <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Point the camera at the QR label or paste the string manually.</li>
                  <li>Keep the device steady for best recognition results.</li>
                  <li>Wait for the verification popup to confirm the segment status.</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* <Card className="border-none bg-card/80 shadow-lg shadow-primary/5 backdrop-blur">
              <CardHeader className="pb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Step 2
                </p>
                <CardTitle className="text-2xl">Demo QR for testing</CardTitle>
                <CardDescription>
                  Scan or copy the encrypted payload to preview the verification experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 flex flex-col items-center gap-4">
                  <QRCodeGenerator data={DEMO_QR_PAYLOAD} title="Demo QR" size={200} />
                  <div className="w-full rounded-xl border border-border/60 bg-background/90 p-3 font-mono text-xs sm:text-sm break-all text-center">
                    {DEMO_QR_PAYLOAD}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    On a single device? Paste the payload into the scanner modal to simulate a camera scan.
                  </p>
                </div>
              </CardContent>
            </Card> */}

            <Card className="border-none bg-card/80 shadow-lg shadow-primary/5 backdrop-blur">
              <CardHeader className="pb-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Step 3
                </p>
                <CardTitle className="text-2xl">Recent verifications</CardTitle>
                <CardDescription>
                  Quick glance at the latest backend responses.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Response timeline
                </p>
                <Separator />
                <p>
                  Verification details appear in a popup immediately after the payload is submitted.
                  This works seamlessly on mobile, tablet, and desktop.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {scannerOpen ? (
        <QRScanner
          onScan={handleScan}
          onClose={() => setScannerOpen(false)}
          title="Scan encrypted QR"
        />
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="mx-4 sm:max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle>Verification Response</DialogTitle>
            <DialogDescription>
              {isSubmitting
                ? "Submitting encrypted payload to backend..."
                : "Latest response from the verification endpoint."}
            </DialogDescription>
          </DialogHeader>

          {isSubmitting ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Waiting for backend response. This usually takes a few seconds.
              </p>
            </div>
          ) : submissionError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">Submission failed</p>
              </div>
              <p className="text-sm text-destructive">{submissionError}</p>
            </div>
          ) : verificationResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {verificationResult.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(verificationResult.processedAt).toLocaleString()}
                  </p>
                </div>
                <Badge variant={statusCopy[verificationResult.status].badgeVariant}>
                  {statusCopy[verificationResult.status].label}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {verificationResult.message}
              </p>

              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="text-muted-foreground">Reference</p>
                <p className="font-medium">{verificationResult.reference}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Additional details
                </p>
                <div className="grid gap-2">
                  {verificationResult.extraDetails.map((detail) => (
                    <div
                      key={detail.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {detail.label}
                      </span>
                      <span className="font-medium">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scan a QR code to view verification feedback.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
