import { useCallback, useRef, useState } from "react";
import { QRScanner } from "@/components/qr/QRScanner";
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
import { api } from "@/services/api";

type PackageStatusResponse = {
  package?: {
    package_uuid?: string;
    package_accepted?: string;
    batch_id?: string;
    created_at?: string;
    product?: {
      name?: string;
      type?: string;
      temperature_requirements?: { min?: string; max?: string };
    };
  };
  shipment_chain?: Array<{
    shipment_id?: string;
    manufacturer_uuid?: string;
    consumer_uuid?: string;
    status?: string;
    shipment_date?: string;
    segments?: Array<{
      segment_id?: string;
      from_location?: { name?: string; state?: string; country?: string };
      to_location?: { name?: string; state?: string; country?: string };
      status?: string;
      carrier?: string | null;
      expected_ship_date?: string;
      estimated_arrival_date?: string;
      segment_order?: number;
      start_timestamp?: string;
      end_timestamp?: string;
    }>;
  }>;
  breaches?: {
    statistics?: {
      total?: number;
      resolved?: number;
      active?: number;
      byType?: Record<string, number>;
      bySeverity?: Record<string, number>;
    };
    records?: Array<{
      breach_uuid?: string;
      breach_type?: string;
      severity?: string;
      status?: string;
      detected_at?: string;
      resolved_at?: string | null;
      detected_value?: string;
      threshold?: { min?: string | null; max?: string | null };
      location?: { latitude?: string; longitude?: string };
      blockchain?: { tx_hash?: string; ipfs_cid?: string | null };
    }>;
  };
};

type PdfLine = {
  text: string;
  color?: [number, number, number];
  font?: "regular" | "bold";
  size?: number;
  gapBefore?: number;
};

const sanitizeToAscii = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();

const wrapLine = (line: PdfLine, limit = 86): PdfLine[] => {
  const safe = sanitizeToAscii(line.text);
  if (!safe) return [];

  const words = safe.split(/\s+/);
  const wrapped: PdfLine[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > limit && current) {
      wrapped.push({ ...line, text: current, gapBefore: line.gapBefore });
      current = word;
      line.gapBefore = 0;
    } else {
      current = candidate;
    }
  });

  if (current) {
    wrapped.push({ ...line, text: current, gapBefore: line.gapBefore });
  }

  return wrapped;
};

const splitIntoPages = (lines: PdfLine[]) => {
  const pages: PdfLine[][] = [];
  const maxHeight = 740;
  let current: PdfLine[] = [];
  let currentHeight = 0;

  const heightForLine = (line: PdfLine) =>
    (line.size ?? 11) + 3 + (line.gapBefore ?? 0);

  lines.forEach((line) => {
    const lineHeight = heightForLine(line);
    if (currentHeight + lineHeight > maxHeight && current.length) {
      pages.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(line);
    currentHeight += lineHeight;
  });

  if (current.length) {
    pages.push(current);
  }

  return pages;
};

const escapePdfText = (text: string) =>
  sanitizeToAscii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildPdfContentStream = (pageLines: PdfLine[]) => {
  const topPaddingLines = 2;
  const paddingHeight = topPaddingLines * 14; // approximate line height
  const startY = 787 - paddingHeight; // add two-line top padding
  const commands: string[] = ["BT", "/F1 11 Tf", "0 0 0 rg", `50 ${startY} Td`];

  pageLines.forEach((line, idx) => {
    const size = line.size ?? 11;
    const color = line.color ?? [0.15, 0.15, 0.18];
    const font = line.font === "bold" ? "/F2" : "/F1";
    const gap = line.gapBefore ?? 0;
    const moveY = idx === 0 ? 0 : size + 3 + gap;

    commands.push(`0 -${moveY} Td`);
    commands.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    commands.push(`${font} ${size} Tf`);
    commands.push(`(${escapePdfText(line.text)}) Tj`);
  });

  commands.push("ET");
  return commands.join("\n");
};

const buildPdfBlob = (pages: PdfLine[][]) => {
  if (!pages.length) return null;

  const pageObjectsStart = 5;
  const contentObjectsStart = pageObjectsStart + pages.length;
  const lastObjectId = contentObjectsStart + pages.length - 1;

  const pdfObjects: Record<number, string> = {
    1: `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`,
    3: `3 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`,
    4: `4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj`,
  };

  pages.forEach((pageLines, idx) => {
    const pageObjectId = pageObjectsStart + idx;
    const contentObjectId = contentObjectsStart + idx;
    const contentStream = buildPdfContentStream(pageLines);

    pdfObjects[pageObjectId] = `${pageObjectId} 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjectId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>
endobj`;

    pdfObjects[contentObjectId] = `${contentObjectId} 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}
endstream
endobj`;
  });

  const kids = pages
    .map((_, idx) => `${pageObjectsStart + idx} 0 R`)
    .join(" ");

  pdfObjects[2] = `2 0 obj
<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>
endobj`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let id = 1; id <= lastObjectId; id++) {
    const obj = pdfObjects[id];
    if (!obj) continue;
    offsets[id] = pdf.length;
    pdf += `${obj}\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref
0 ${lastObjectId + 1}
0000000000 65535 f 
`;

  for (let id = 1; id <= lastObjectId; id++) {
    const offset = offsets[id] ?? 0;
    pdf += `${String(offset).padStart(10, "0")} 00000 n 
`;
  }

  pdf += `trailer
<< /Size ${lastObjectId + 1} /Root 1 0 R >>
startxref
${xrefStart}
%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

export default function QRScannerPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<PackageStatusResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const handleScan = useCallback(async (payload: string) => {
    setScannerOpen(false);
    setDialogOpen(true);
    setIsSubmitting(true);
    setLastScannedValue(payload);
    setSubmissionError(null);
    setStatusResult(null);
    try {
      const normalized = payload.trim();
      const response = await api.get(`/api/package-status/${normalized}`);
      const data = response.data?.data ?? response.data;
      setStatusResult(data ?? null);
    } catch (error) {
      console.error("Failed to submit QR payload", error);
      setSubmissionError("Unable to reach package status service. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleDialogChange = (open: boolean) => {
    if (isSubmitting) return;
    setDialogOpen(open);
    if (!open) {
      setStatusResult(null);
      setSubmissionError(null);
    }
  };

  const handleDownloadPdf = () => {
    if (!printRef.current || !statusResult) return;

    const primary: [number, number, number] = [0.14, 0.32, 0.63];
    const secondary: [number, number, number] = [0.25, 0.55, 0.38];
    const muted: [number, number, number] = [0.38, 0.42, 0.48];
    const lines: PdfLine[] = [];

    const add = (text: string, opts: Partial<PdfLine> = {}) => {
      const wrapped = wrapLine({ text, ...opts });
      lines.push(...wrapped);
    };

    const addSection = (title: string) => {
      add(title, { font: "bold", size: 13, color: primary, gapBefore: 12 });
    };

    add("Package Status Report", { font: "bold", size: 16, color: primary });
    add(`Generated: ${new Date().toLocaleString()}`, { size: 10, color: muted, gapBefore: 4 });
    add(`Payload: ${lastScannedValue ?? "N/A"}`, { size: 10, color: muted, gapBefore: 4 });

    addSection("Package");
    add(`UUID: ${statusResult.package?.package_uuid ?? "N/A"}`, { font: "bold" });
    add(`Status: ${statusResult.package?.package_accepted ?? "N/A"}`, { color: secondary });
    add(`Batch: ${statusResult.package?.batch_id ?? "N/A"}`);
    add(
      `Created: ${
        statusResult.package?.created_at
          ? new Date(statusResult.package.created_at).toLocaleString()
          : "N/A"
      }`
    );

    addSection("Product");
    add(`Name: ${statusResult.package?.product?.name ?? "Unknown product"}`, { font: "bold" });
    add(`Type: ${statusResult.package?.product?.type ?? "N/A"}`);
    if (statusResult.package?.product?.temperature_requirements) {
      add(
        `Temp Range: ${statusResult.package.product.temperature_requirements.min ?? "N/A"} to ${statusResult.package.product.temperature_requirements.max ?? "N/A"}`
      );
    }

    addSection("Shipment Chain");
    if (statusResult.shipment_chain?.length) {
      statusResult.shipment_chain.forEach((shipment, idx) => {
        add(`Shipment ${idx + 1}: ${shipment.shipment_id ?? "N/A"}`, {
          font: "bold",
          color: primary,
          gapBefore: idx === 0 ? 6 : 10,
        });
        add(`Status: ${shipment.status ?? "N/A"}`, { color: secondary });
        add(
          `Date: ${
            shipment.shipment_date ? new Date(shipment.shipment_date).toLocaleString() : "N/A"
          }`
        );
        if (shipment.segments?.length) {
          shipment.segments.forEach((segment) => {
            add(
              `• Segment ${segment.segment_order ?? "-"}: ${segment.status ?? "N/A"}`,
              { gapBefore: 6, font: "bold", size: 12 }
            );
            add(
              `  From ${segment.from_location?.name ?? "Unknown"} -> ${segment.to_location?.name ?? "Unknown"}`
            );
            add(
              `  ETA: ${
                segment.estimated_arrival_date
                  ? new Date(segment.estimated_arrival_date).toLocaleString()
                  : "N/A"
              }`
            );
          });
        }
      });
    } else {
      add("No shipment records available.", { color: muted });
    }

    addSection("Breaches");
    const stats = statusResult.breaches?.statistics;
    if (stats) {
      add(
        `Totals -> Active: ${stats.active ?? 0}, Resolved: ${stats.resolved ?? 0}, Overall: ${
          stats.total ?? 0
        }`,
        { color: secondary }
      );
    }

    if (statusResult.breaches?.records?.length) {
      statusResult.breaches.records.forEach((breach, idx) => {
        add(
          `#${idx + 1} ${breach.breach_type ?? "Breach"}`,
          { font: "bold", color: primary, gapBefore: idx === 0 ? 6 : 8 }
        );
        add(`Severity: ${breach.severity ?? "N/A"}`, { color: secondary });
        add(
          `Detected: ${
            breach.detected_at ? new Date(breach.detected_at).toLocaleString() : "N/A"
          }`
        );
        add(`Status: ${breach.status ?? "N/A"}`);
        if (breach.threshold) {
          add(
            `Threshold -> Min: ${breach.threshold.min ?? "N/A"}, Max: ${breach.threshold.max ?? "N/A"}`
          );
        }
      });
    } else {
      add("No breach records reported.", { color: muted });
    }

    const pages = splitIntoPages(lines);
    const pdfBlob = buildPdfBlob(pages);
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = statusResult.package?.package_uuid
      ? `package-${statusResult.package.package_uuid}.pdf`
      : "package-status.pdf";
    link.click();
    URL.revokeObjectURL(url);
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
        <DialogContent className="mx-4 sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle>Package status</DialogTitle>
            <DialogDescription>
              {isSubmitting
                ? "Submitting encrypted payload to backend..."
                : "Latest response from the status endpoint."}
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
          ) : statusResult ? (
            <div className="space-y-4" ref={printRef}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    Package UUID: {statusResult.package?.package_uuid ?? "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {statusResult.package?.package_accepted ?? "N/A"}
                  </p>
                </div>
                <Badge>{statusResult.package?.product?.name ?? "Package"}</Badge>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Product</p>
                <p className="font-medium">{statusResult.package?.product?.name ?? "Unknown product"}</p>
                <p className="text-muted-foreground">{statusResult.package?.product?.type ?? "Type N/A"}</p>
                {statusResult.package?.product?.temperature_requirements ? (
                  <p className="text-xs text-muted-foreground">
                    Temp: {statusResult.package.product.temperature_requirements.min ?? "N/A"} to{" "}
                    {statusResult.package.product.temperature_requirements.max ?? "N/A"}
                  </p>
                ) : null}
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Shipment chain</p>
                  <p className="text-xs text-muted-foreground">
                    {statusResult.shipment_chain?.length ?? 0} shipment(s)
                  </p>
                </div>
                <div className="space-y-3">
                  {statusResult.shipment_chain?.map((shipment, idx) => (
                    <div key={shipment.shipment_id ?? idx} className="rounded-md border border-border/70 bg-background/60 p-2">
                      <p className="text-xs text-muted-foreground">
                        Shipment ID: <span className="font-medium text-foreground">{shipment.shipment_id ?? "N/A"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: <span className="font-medium text-foreground">{shipment.status ?? "N/A"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Date:{" "}
                        <span className="font-medium text-foreground">
                          {shipment.shipment_date ? new Date(shipment.shipment_date).toLocaleString() : "N/A"}
                        </span>
                      </p>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        {shipment.segments?.map((segment) => (
                          <div
                            key={segment.segment_id}
                            className="rounded border border-border/50 bg-muted/30 p-2 text-xs text-muted-foreground"
                          >
                            <div className="flex justify-between">
                              <span>Segment {segment.segment_order ?? "-"}</span>
                              <span className="font-medium text-foreground">{segment.status ?? "N/A"}</span>
                            </div>
                            <p>From: {segment.from_location?.name ?? "Unknown"}</p>
                            <p>To: {segment.to_location?.name ?? "Unknown"}</p>
                            <p>
                              ETA:{" "}
                              {segment.estimated_arrival_date
                                ? new Date(segment.estimated_arrival_date).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Breach summary</p>
                  <Badge variant="secondary">
                    {statusResult.breaches?.statistics?.active ?? 0} active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {statusResult.breaches?.statistics?.total ?? 0} | Resolved:{" "}
                  {statusResult.breaches?.statistics?.resolved ?? 0}
                </p>
                <div className="space-y-1">
                  {statusResult.breaches?.records?.slice(0, 3).map((breach) => (
                    <div
                      key={breach.breach_uuid}
                      className="rounded border border-border/50 bg-background/60 p-2 text-xs text-muted-foreground"
                    >
                      <div className="flex justify-between">
                        <span>{breach.breach_type ?? "Breach"}</span>
                        <span className="font-medium text-foreground">{breach.severity ?? "N/A"}</span>
                      </div>
                      <p>Detected: {breach.detected_at ? new Date(breach.detected_at).toLocaleString() : "N/A"}</p>
                      <p>Status: {breach.status ?? "N/A"}</p>
                    </div>
                  ))}
                  {(statusResult.breaches?.records?.length ?? 0) > 3 ? (
                    <p className="text-xs text-muted-foreground">
                      +{(statusResult.breaches?.records?.length ?? 0) - 3} more breach records
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scan a QR code to view verification feedback.
            </p>
          )}

          {statusResult && !isSubmitting ? (
            <div className="flex justify-end">
              <Button variant="secondary" className="gap-2" onClick={handleDownloadPdf}>
                Download as PDF
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
