import { useState, useEffect } from 'react';
import { QrCode, X, Camera, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import {
  startScan,
  isScanningSupported,
  parseTrackingCode,
  validateDeliveryCode,
  ScanResult,
} from '../services/qrScannerService';
import { useToast } from '../contexts/ToastContext';
import { hapticSuccess, hapticError, hapticLight } from '../hooks/useHapticFeedback';
import { Capacitor } from '@capacitor/core';

interface QRScannerProps {
  onScan: (data: string, parsed: ReturnType<typeof parseTrackingCode>) => void;
  onClose: () => void;
  deliveryId?: string;
  trackingCode?: string;
  mode?: 'scan' | 'verify';
}

export function QRScanner({
  onScan,
  onClose,
  deliveryId,
  trackingCode,
  mode = 'scan',
}: QRScannerProps) {
  const { showSuccess, showError } = useToast();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    async function checkSupport() {
      const isSupported = await isScanningSupported();
      setSupported(isSupported);
    }
    checkSupport();
  }, []);

  const handleScan = async () => {
    hapticLight();
    setScanning(true);
    setResult(null);

    const scanResult = await startScan();
    setResult(scanResult);
    setScanning(false);

    if (scanResult.success && scanResult.data) {
      const parsed = parseTrackingCode(scanResult.data);

      // Verify mode: check if code matches delivery
      if (mode === 'verify' && deliveryId) {
        const validation = validateDeliveryCode(
          scanResult.data,
          deliveryId,
          trackingCode
        );

        if (validation.isValid) {
          hapticSuccess();
          showSuccess('Code vérifié avec succès !');
          onScan(scanResult.data, parsed);
        } else {
          hapticError();
          showError('Ce code ne correspond pas à cette livraison');
        }
      } else {
        hapticSuccess();
        onScan(scanResult.data, parsed);
      }
    } else if (scanResult.error) {
      hapticError();
      showError(scanResult.error);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      showError('Veuillez entrer un code');
      return;
    }

    hapticLight();
    const parsed = parseTrackingCode(manualCode.trim());

    if (mode === 'verify' && deliveryId) {
      const validation = validateDeliveryCode(
        manualCode.trim(),
        deliveryId,
        trackingCode
      );

      if (validation.isValid) {
        hapticSuccess();
        showSuccess('Code vérifié avec succès !');
        onScan(manualCode.trim(), parsed);
      } else {
        hapticError();
        showError('Ce code ne correspond pas à cette livraison');
      }
    } else {
      onScan(manualCode.trim(), parsed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {mode === 'verify' ? 'Vérifier le colis' : 'Scanner un code'}
              </h2>
              <p className="text-sm text-gray-500">
                {mode === 'verify'
                  ? 'Scannez le code QR du colis'
                  : 'QR Code ou code-barres'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Expected Code (Verify Mode) */}
        {mode === 'verify' && trackingCode && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Code attendu</p>
            <p className="font-mono font-bold text-lg text-gray-900">
              {trackingCode}
            </p>
          </div>
        )}

        {/* Scan Button */}
        {supported === null ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : supported ? (
          <div className="mb-6">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                  <span className="text-primary-600 font-medium">
                    Scanning en cours...
                  </span>
                </>
              ) : (
                <>
                  <Camera className="w-12 h-12 text-gray-400" />
                  <span className="text-gray-600 font-medium">
                    Appuyez pour scanner
                  </span>
                </>
              )}
            </button>

            {/* Scan Result */}
            {result && !result.success && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{result.error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  Scanner non disponible
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {Capacitor.isNativePlatform()
                    ? 'Le scanner de code n\'est pas disponible sur cet appareil'
                    : 'Le scanner n\'est disponible que sur l\'application mobile'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500">ou entrez manuellement</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Code du colis"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono uppercase"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              icon={<CheckCircle className="w-5 h-5" />}
            >
              Vérifier
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
