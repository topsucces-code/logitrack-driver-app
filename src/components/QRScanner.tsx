import { useState, useEffect, useRef } from "react";
import { QrCode, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";
import {
  isScanningSupported,
  requestScanPermission,
  parseTrackingCode,
  validateDeliveryCode,
} from "../services/qrScannerService";
import { useToast } from "../contexts/ToastContext";
import {
  hapticSuccess,
  hapticError,
  hapticLight,
} from "../hooks/useHapticFeedback";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: string, parsed: ReturnType<typeof parseTrackingCode>) => void;
  onClose: () => void;
  deliveryId?: string;
  trackingCode?: string;
  mode?: "scan" | "verify";
}

export function QRScanner({
  onScan,
  onClose,
  deliveryId,
  trackingCode,
  mode = "scan",
}: QRScannerProps) {
  const { showSuccess, showError } = useToast();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    async function checkSupport() {
      const isSupported = await isScanningSupported();
      setSupported(isSupported);
    }
    checkSupport();
  }, []);

  // Start camera scanning when supported
  useEffect(() => {
    if (supported !== true) return;

    let mounted = true;

    async function initScanner() {
      const hasPermission = await requestScanPermission();
      if (!hasPermission || !mounted) {
        if (mounted) setScanError("Permission caméra refusée");
        return;
      }

      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        setScanning(true);

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (processedRef.current) return;
            processedRef.current = true;
            handleScanResult(decodedText);
          },
          () => {
            // QR code not found in frame — ignore
          },
        );
      } catch (err) {
        if (mounted) {
          setScanError("Impossible de démarrer la caméra");
          setScanning(false);
        }
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [supported]);

  const handleScanResult = (decodedText: string) => {
    const parsed = parseTrackingCode(decodedText);

    // Stop scanner
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);

    if (mode === "verify" && deliveryId) {
      const validation = validateDeliveryCode(
        decodedText,
        deliveryId,
        trackingCode,
      );

      if (validation.isValid) {
        hapticSuccess();
        showSuccess("Code vérifié avec succès !");
        onScan(decodedText, parsed);
      } else {
        hapticError();
        showError("Ce code ne correspond pas à cette livraison");
        // Allow re-scan
        processedRef.current = false;
        restartScanner();
      }
    } else {
      hapticSuccess();
      onScan(decodedText, parsed);
    }
  };

  const restartScanner = async () => {
    try {
      if (scannerRef.current) {
        setScanning(true);
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          (decodedText) => {
            if (processedRef.current) return;
            processedRef.current = true;
            handleScanResult(decodedText);
          },
          () => {},
        );
      }
    } catch {
      setScanning(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      showError("Veuillez entrer un code");
      return;
    }

    hapticLight();
    const parsed = parseTrackingCode(manualCode.trim());

    if (mode === "verify" && deliveryId) {
      const validation = validateDeliveryCode(
        manualCode.trim(),
        deliveryId,
        trackingCode,
      );

      if (validation.isValid) {
        hapticSuccess();
        showSuccess("Code vérifié avec succès !");
        onScan(manualCode.trim(), parsed);
      } else {
        hapticError();
        showError("Ce code ne correspond pas à cette livraison");
      }
    } else {
      onScan(manualCode.trim(), parsed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4 safe-bottom max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {mode === "verify" ? "Vérifier le colis" : "Scanner un code"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {mode === "verify"
                  ? "Scannez le code QR du colis"
                  : "QR Code ou code-barres"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Expected Code (Verify Mode) */}
        {mode === "verify" && trackingCode && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Code attendu
            </p>
            <p className="font-mono font-bold text-base text-gray-900 dark:text-white">
              {trackingCode}
            </p>
          </div>
        )}

        {/* Camera Scanner */}
        {supported === null ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : supported ? (
          <div className="mb-4">
            <div
              id="qr-reader"
              ref={readerRef}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: "250px" }}
            />
            {scanning && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                Pointez la caméra vers le code QR...
              </p>
            )}
            {scanError && (
              <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">{scanError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-yellow-800 dark:text-yellow-300">
                  Scanner non disponible
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                  La caméra n'est pas accessible. Utilisez la saisie manuelle.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ou entrez manuellement
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Code du colis"
              className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono uppercase text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              OK
            </Button>
          </div>
        </div>

        {/* Cancel */}
        <Button onClick={onClose} variant="ghost" fullWidth>
          Annuler
        </Button>
      </div>
    </div>
  );
}

export default QRScanner;
