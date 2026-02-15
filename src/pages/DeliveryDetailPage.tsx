import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { deliveryLogger } from "../utils/logger";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Navigation,
  Package,
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  AlertTriangle,
  UserX,
  ChevronRight,
  SwitchCamera,
  Eraser,
  Pencil,
} from "lucide-react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useGoogleMaps } from "../components/GoogleMapsProvider";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { supabase, Delivery } from "../lib/supabase";
import { MAP_CONFIG } from "../config/app.config";
import {
  PICKUP_MARKER_URL,
  DELIVERY_MARKER_URL,
  DRIVER_MARKER_URL,
  MARKER_SIZE,
  MARKER_ANCHOR,
} from "../config/mapIcons";
import { useToast } from "../contexts/ToastContext";
import { useRealtimeSubscription } from "../hooks/useRealtimeSubscription";
import { SOSButton } from "../components/SOSButton";
import { NavigationButton } from "../components/NavigationButton";
import { NavigationMapView } from "../components/NavigationMapView";
import { Button } from "../components/ui/Button";
import { CustomerRating } from "../components/CustomerRating";
import { CommunicationButton } from "../components/DeliveryCommunication";
import { ShareTrackingButton } from "../components/ShareTracking";

// GPS proximity radius in meters for pickup/delivery validation
const GPS_PROXIMITY_RADIUS_M = 200;

/**
 * Calculate distance between two coordinates in meters using the Haversine formula.
 */
function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeMarkerIcon(url: string) {
  return {
    url,
    scaledSize: new google.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height),
    anchor: new google.maps.Point(MARKER_ANCHOR.x, MARKER_ANCHOR.y),
  };
}

function MiniMap({
  pickupCoords,
  deliveryCoords,
  driverPos,
  delivery,
}: {
  pickupCoords: { lat: number; lng: number } | null;
  deliveryCoords: { lat: number; lng: number } | null;
  driverPos: { lat: number; lng: number } | null;
  delivery: Delivery;
}) {
  const { isLoaded } = useGoogleMaps();
  const center = pickupCoords || deliveryCoords || MAP_CONFIG.defaultCenter;

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      const bounds = new google.maps.LatLngBounds();
      if (pickupCoords) bounds.extend(pickupCoords);
      if (deliveryCoords) bounds.extend(deliveryCoords);
      if (driverPos) bounds.extend(driverPos);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 30);
      }
    },
    [pickupCoords, deliveryCoords, driverPos],
  );

  if (!isLoaded) {
    return (
      <div className="h-36 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-36 relative">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={MAP_CONFIG.defaultZoom}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "none",
        }}
        onLoad={onLoad}
      >
        {pickupCoords && (
          <MarkerF
            position={pickupCoords}
            icon={makeMarkerIcon(PICKUP_MARKER_URL)}
            title={
              delivery.pickup_contact_name || delivery.vendor_name || "Pickup"
            }
          />
        )}
        {deliveryCoords && (
          <MarkerF
            position={deliveryCoords}
            icon={makeMarkerIcon(DELIVERY_MARKER_URL)}
            title={delivery.delivery_contact_name || "Livraison"}
          />
        )}
        {driverPos && (
          <MarkerF
            position={driverPos}
            icon={makeMarkerIcon(DRIVER_MARKER_URL)}
            title="Votre position"
          />
        )}
      </GoogleMap>
    </div>
  );
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshDriver } = useAuth();
  const { position, getCurrentPosition } = useLocation();
  const { showError, showSuccess } = useToast();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(() => {
    // Restore proof modal state after camera killed the WebView
    try {
      const saved = localStorage.getItem("proof_pending");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.deliveryId === id) return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  });
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(() => {
    try {
      const saved = localStorage.getItem("proof_pending");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.deliveryId === id) return parsed.recipientName || "";
      }
    } catch {
      /* ignore */
    }
    return "";
  });
  const [proofRestored, setProofRestored] = useState(() => {
    try {
      const saved = localStorage.getItem("proof_pending");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.deliveryId === id) return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  });
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [deliveryCompleted, setDeliveryCompleted] = useState(false);
  const [showNavigationMap, setShowNavigationMap] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<{
    coords: { lat: number; lng: number };
    label: string;
    type: "pickup" | "delivery";
  } | null>(null);

  // Fetch delivery
  useEffect(() => {
    if (!id) return;

    async function fetchDelivery() {
      const { data, error } = await supabase
        .from("logitrack_deliveries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        showError("Course introuvable");
        navigate("/");
        return;
      }

      setDelivery(data as Delivery);
      setLoading(false);
    }

    fetchDelivery();
  }, [id, navigate]);

  // Subscribe to updates with graceful cleanup
  useRealtimeSubscription({
    channelName: `logitrack-delivery-${id}`,
    table: "logitrack_deliveries",
    event: "UPDATE",
    filter: id ? `id=eq.${id}` : undefined,
    onPayload: useCallback((payload) => {
      setDelivery(payload.new as Delivery);
    }, []),
  });

  // Update delivery status
  async function updateStatus(
    newStatus: string,
    extraData?: Record<string, any>,
  ) {
    if (!delivery) return;

    // GPS proximity validation only for picked_up and delivered
    const needsGps = ["picked_up", "delivered"].includes(newStatus);

    // Try to get position: use cached position or fetch fresh one
    let currentPos = position;
    if (needsGps && !currentPos) {
      try {
        currentPos = await getCurrentPosition();
      } catch {
        // GPS fetch failed
      }
    }

    // GPS proximity check (soft: warn but don't block if GPS unavailable)
    if (needsGps && currentPos) {
      if (
        newStatus === "picked_up" &&
        delivery.pickup_latitude &&
        delivery.pickup_longitude
      ) {
        const dist = getDistanceMeters(
          currentPos.lat,
          currentPos.lng,
          Number(delivery.pickup_latitude),
          Number(delivery.pickup_longitude),
        );
        if (dist > GPS_PROXIMITY_RADIUS_M) {
          showError(
            `Vous êtes à ${Math.round(dist)}m du point de collecte. Rapprochez-vous (max ${GPS_PROXIMITY_RADIUS_M}m).`,
          );
          return;
        }
      }

      if (
        newStatus === "delivered" &&
        delivery.delivery_latitude &&
        delivery.delivery_longitude
      ) {
        const dist = getDistanceMeters(
          currentPos.lat,
          currentPos.lng,
          Number(delivery.delivery_latitude),
          Number(delivery.delivery_longitude),
        );
        if (dist > GPS_PROXIMITY_RADIUS_M) {
          showError(
            `Vous êtes à ${Math.round(dist)}m du point de livraison. Rapprochez-vous (max ${GPS_PROXIMITY_RADIUS_M}m).`,
          );
          return;
        }
      }
    }

    setUpdating(true);

    try {
      const { data, error } = await supabase.rpc("update_delivery_status", {
        p_delivery_id: delivery.id,
        p_status: newStatus,
        p_lat: currentPos?.lat || 0,
        p_lng: currentPos?.lng || 0,
        ...extraData,
      });

      if (error || !data?.success) {
        showError(
          data?.error || error?.message || "Erreur lors de la mise à jour",
        );
      } else {
        // Refresh delivery data immediately (don't wait for realtime)
        const { data: updated } = await supabase
          .from("logitrack_deliveries")
          .select("*")
          .eq("id", delivery.id)
          .single();
        if (updated) setDelivery(updated as Delivery);

        if (newStatus === "delivered") {
          refreshDriver();
          setDeliveryCompleted(true);
          setShowRatingModal(true);
        }
      }
    } catch (err) {
      showError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setUpdating(false);
    }
  }

  // Save proof state to localStorage (without photo - too large for localStorage)
  function saveProofState() {
    try {
      localStorage.setItem(
        "proof_pending",
        JSON.stringify({
          deliveryId: delivery?.id || id,
          recipientName,
        }),
      );
    } catch {
      /* quota exceeded or unavailable */
    }
  }

  // In-app camera state
  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const videoNodeRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Signature state
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  async function openCameraStream(facing: "environment" | "user") {
    // Stop any existing stream
    activeStreamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      activeStreamRef.current = stream;
      if (videoNodeRef.current) {
        videoNodeRef.current.srcObject = stream;
        videoNodeRef.current.play().catch(() => {});
      }
    } catch (err) {
      deliveryLogger.error("getUserMedia error", { error: err });
      showError("Impossible d'accéder à la caméra");
      setShowInAppCamera(false);
    }
  }

  function stopCameraStream() {
    activeStreamRef.current?.getTracks().forEach((t) => t.stop());
    activeStreamRef.current = null;
    setShowInAppCamera(false);
  }

  function switchCamera() {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    openCameraStream(newFacing);
  }

  function captureFrame() {
    const video = videoNodeRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setProofPhoto(dataUrl);
    setProofRestored(false);
    stopCameraStream();
  }

  // Open camera (in-app to avoid Android killing WebView)
  async function takePhoto() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });
      stream.getTracks().forEach((t) => t.stop());
      setShowInAppCamera(true);
      // Small delay to let the video element mount
      setTimeout(() => openCameraStream(facingMode), 100);
    } catch (err) {
      deliveryLogger.error("Camera permission denied", { error: err });
      showError("Autorisez l'accès à la caméra dans les paramètres");
    }
  }

  // Signature functions
  function getCanvasXY(e: React.MouseEvent | React.TouchEvent) {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasXY(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasXY(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (sigCanvasRef.current) {
      setSignatureData(sigCanvasRef.current.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  }

  // Upload proof and complete delivery
  async function completeDelivery() {
    if (!delivery || !proofPhoto) return;

    setUpdating(true);

    try {
      // Upload photo to storage
      const photoFileName = `${delivery.id}-${Date.now()}.jpg`;
      const base64Data = proofPhoto.replace(/^data:image\/\w+;base64,/, "");

      const { error: uploadError } = await supabase.storage
        .from("delivery-proofs")
        .upload(photoFileName, decode(base64Data), {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("delivery-proofs")
        .getPublicUrl(photoFileName);

      // Upload signature if present
      let signatureUrl: string | null = null;
      if (signatureData) {
        const sigFileName = `${delivery.id}-sig-${Date.now()}.png`;
        const sigBase64 = signatureData.replace(/^data:image\/\w+;base64,/, "");

        const { error: sigError } = await supabase.storage
          .from("delivery-proofs")
          .upload(sigFileName, decode(sigBase64), {
            contentType: "image/png",
          });

        if (!sigError) {
          const { data: sigUrl } = supabase.storage
            .from("delivery-proofs")
            .getPublicUrl(sigFileName);
          signatureUrl = sigUrl.publicUrl;
        }
      }

      // Update status with proof
      await updateStatus("delivered", {
        p_confirmation_photo_url: urlData.publicUrl,
        p_recipient_name: recipientName || null,
        ...(signatureUrl ? { p_signature_url: signatureUrl } : {}),
      });

      try {
        localStorage.removeItem("proof_pending");
      } catch {
        /* ignore */
      }
      setShowProofModal(false);
      setSignatureData(null);
    } catch (err) {
      deliveryLogger.error("Error completing delivery", { error: err });
      showError("Erreur lors de l'envoi de la preuve");
    }

    setUpdating(false);
  }

  // Call phone number
  function callPhone(phone: string) {
    window.open(`tel:${phone}`, "_system");
  }

  if (loading || !delivery) {
    return (
      <div className="h-mobile-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Get coordinates from the new schema
  const pickupCoords =
    delivery.pickup_latitude && delivery.pickup_longitude
      ? {
          lat: Number(delivery.pickup_latitude),
          lng: Number(delivery.pickup_longitude),
        }
      : null;
  const deliveryCoords =
    delivery.delivery_latitude && delivery.delivery_longitude
      ? {
          lat: Number(delivery.delivery_latitude),
          lng: Number(delivery.delivery_longitude),
        }
      : null;

  const trackingLabel = delivery.tracking_code
    ? `Détails #${delivery.tracking_code}`
    : "Détails";

  return (
    <div className="h-mobile-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb */}
      <nav className="bg-white dark:bg-gray-800 safe-top px-3 py-2 flex items-center text-xs">
        <button
          onClick={() => navigate("/")}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Accueil
        </button>
        <ChevronRight className="w-3 h-3 text-gray-400 mx-1 flex-shrink-0" />
        <button
          onClick={() => navigate("/history")}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Courses
        </button>
        <ChevronRight className="w-3 h-3 text-gray-400 mx-1 flex-shrink-0" />
        <span className="text-gray-900 dark:text-white font-medium truncate">
          {trackingLabel}
        </span>
      </nav>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 flex items-center gap-2.5">
        <button
          onClick={() => navigate("/")}
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900 dark:text-white text-sm">
            Course #{delivery.id.slice(0, 8)}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {delivery.status === "assigned" && "Nouvelle course assignée"}
            {delivery.status === "accepted" &&
              "Assignée - En route vers pickup"}
            {delivery.status === "picking_up" &&
              "En route vers le point de collecte"}
            {delivery.status === "picked_up" && "Colis récupéré"}
            {delivery.status === "in_transit" && "En transit vers le client"}
            {delivery.status === "arriving" && "Arrivé - Livraison en cours"}
          </p>
        </div>
        {delivery.is_express && (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
            <Zap className="w-3 h-3" />
            Express
          </span>
        )}
        {/* SOS Button */}
        <SOSButton deliveryId={delivery.id} compact />
      </header>

      {/* Map */}
      <MiniMap
        pickupCoords={pickupCoords}
        deliveryCoords={deliveryCoords}
        driverPos={position}
        delivery={delivery}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Pickup */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg p-3 ${
            ["assigned", "accepted", "picking_up"].includes(delivery.status)
              ? "border-2 border-green-500"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Point de collecte
              </p>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {delivery.pickup_contact_name ||
                  delivery.vendor_name ||
                  "Pickup"}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {delivery.pickup_address}
          </p>
          {delivery.pickup_instructions && (
            <p className="text-xs text-gray-500 italic mb-2">
              Instructions: {delivery.pickup_instructions}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() =>
                callPhone(
                  delivery.pickup_contact_phone || delivery.vendor_phone || "",
                )
              }
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
            >
              <Phone className="w-4 h-4" />
              Appeler
            </button>
            {pickupCoords && (
              <NavigationButton
                destination={{
                  latitude: pickupCoords.lat,
                  longitude: pickupCoords.lng,
                  label: delivery.pickup_address,
                }}
                variant="inline"
                onInAppNavigate={() => {
                  setNavigationTarget({
                    coords: pickupCoords,
                    label: delivery.pickup_address || "Point de collecte",
                    type: "pickup",
                  });
                  setShowNavigationMap(true);
                }}
              />
            )}
          </div>
        </div>

        {/* Delivery */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg p-3 ${
            ["picked_up", "in_transit", "arriving"].includes(delivery.status)
              ? "border-2 border-red-500"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Point de livraison
              </p>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {delivery.delivery_contact_name || "Destination"}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {delivery.delivery_address}
          </p>
          {delivery.delivery_instructions && (
            <p className="text-xs text-gray-500 italic mb-2">
              Instructions: {delivery.delivery_instructions}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => callPhone(delivery.delivery_contact_phone || "")}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
            >
              <Phone className="w-4 h-4" />
              Appeler
            </button>
            {deliveryCoords && (
              <NavigationButton
                destination={{
                  latitude: deliveryCoords.lat,
                  longitude: deliveryCoords.lng,
                  label: delivery.delivery_address,
                }}
                variant="inline"
                onInAppNavigate={() => {
                  setNavigationTarget({
                    coords: deliveryCoords,
                    label: delivery.delivery_address || "Point de livraison",
                    type: "delivery",
                  });
                  setShowNavigationMap(true);
                }}
              />
            )}
          </div>
          {/* Communication & Share */}
          <div className="flex gap-2 mt-2">
            <CommunicationButton
              deliveryId={delivery.id}
              recipientName={delivery.delivery_contact_name || "Client"}
              recipientPhone={delivery.delivery_contact_phone || ""}
            />
            <ShareTrackingButton
              deliveryId={delivery.id}
              recipientPhone={delivery.delivery_contact_phone}
              recipientName={delivery.delivery_contact_name}
            />
          </div>
        </div>

        {/* Package Info */}
        {delivery.package_description && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Package className="w-4 h-4 text-gray-400" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                Description du colis
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {delivery.package_description}
            </p>
            {delivery.package_size && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Taille:{" "}
                <span className="capitalize">{delivery.package_size}</span>
              </p>
            )}
          </div>
        )}

        {/* Earnings */}
        <div className="bg-primary-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary-700">Votre gain</p>
              <p className="text-xl font-bold text-primary-600">
                {delivery.driver_earnings?.toLocaleString()} FCFA
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{Number(delivery.distance_km)?.toFixed(1) || "?"} km</p>
              {delivery.tracking_code && <p>#{delivery.tracking_code}</p>}
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            navigate(`/delivery/${delivery.id}/report-incident`, {
              state: { trackingCode: delivery.id.slice(0, 8).toUpperCase() },
            })
          }
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
          Signaler un problème
        </button>
      </div>

      {/* Action Button - bottom bar for ALL statuses */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2 safe-bottom">
        {delivery.status === "assigned" && (
          <Button
            onClick={() => updateStatus("accepted")}
            loading={updating}
            fullWidth
            icon={<CheckCircle className="w-5 h-5" />}
            className="bg-primary-500 hover:bg-primary-600"
          >
            Accepter la course
          </Button>
        )}

        {delivery.status === "accepted" && (
          <Button
            onClick={() => updateStatus("picking_up")}
            loading={updating}
            fullWidth
            icon={<Navigation className="w-5 h-5" />}
            className="bg-green-500 hover:bg-green-600"
          >
            En route vers le pickup
          </Button>
        )}

        {delivery.status === "picking_up" && (
          <Button
            onClick={() => updateStatus("picked_up")}
            loading={updating}
            fullWidth
            icon={<Package className="w-5 h-5" />}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Colis récupéré
          </Button>
        )}

        {delivery.status === "picked_up" && (
          <Button
            onClick={() => updateStatus("in_transit")}
            loading={updating}
            fullWidth
            icon={<Navigation className="w-5 h-5" />}
            className="bg-orange-500 hover:bg-orange-600"
          >
            En route vers la livraison
          </Button>
        )}

        {delivery.status === "in_transit" && (
          <Button
            onClick={() => updateStatus("arriving")}
            loading={updating}
            fullWidth
            icon={<MapPin className="w-5 h-5" />}
            className="bg-purple-500 hover:bg-purple-600"
          >
            Arrivé sur place
          </Button>
        )}

        {delivery.status === "arriving" && (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <button
                onClick={() =>
                  navigate(`/delivery/${delivery.id}/client-absent`)
                }
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
                Client absent
              </button>
              <button
                onClick={() => setShowProofModal(true)}
                disabled={updating}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirmer livraison
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-App Camera */}
      {showInAppCamera && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          {/* Camera header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-3 pt-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
            <button
              type="button"
              onClick={stopCameraStream}
              className="p-2 rounded-full bg-black/40"
            >
              <XCircle className="w-6 h-6 text-white" />
            </button>
            <span className="text-white text-sm font-medium">
              Photo de preuve
            </span>
            <button
              type="button"
              onClick={switchCamera}
              className="p-2 rounded-full bg-black/40"
            >
              <SwitchCamera className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Video preview */}
          <video
            ref={videoNodeRef}
            autoPlay
            playsInline
            muted
            className="flex-1 object-cover w-full"
          />

          {/* Capture controls */}
          <div className="absolute bottom-0 left-0 right-0 pb-10 pt-6 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent">
            <button
              type="button"
              onClick={captureFrame}
              className="w-18 h-18 rounded-full border-[5px] border-white flex items-center justify-center active:scale-90 transition-transform"
              style={{ width: 72, height: 72 }}
            >
              <div
                className="w-14 h-14 rounded-full bg-white"
                style={{ width: 56, height: 56 }}
              />
            </button>
          </div>
        </div>
      )}

      {/* Proof Modal */}
      {showProofModal && !deliveryCompleted && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white dark:bg-gray-800 w-full rounded-t-xl safe-bottom max-h-[90dvh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Preuve de livraison
                </h2>
                <button
                  type="button"
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setShowProofModal(false);
                  }}
                  onClick={() => setShowProofModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-3">
              {/* Photo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  Photo du colis livré
                </label>
                {proofRestored && !proofPhoto && (
                  <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-medium">
                      Veuillez reprendre la photo
                    </p>
                  </div>
                )}
                {proofPhoto ? (
                  <div className="relative">
                    <img
                      src={proofPhoto}
                      alt="Proof"
                      className="w-full h-44 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        takePhoto();
                      }}
                      onClick={takePhoto}
                      className="absolute bottom-2 right-2 px-2.5 py-1.5 bg-black/60 text-white text-xs rounded-lg flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Reprendre
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      takePhoto();
                    }}
                    onClick={takePhoto}
                    className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 active:border-primary-500 active:text-primary-500"
                  >
                    <Camera className="w-7 h-7" />
                    <span className="text-sm font-medium">
                      Prendre une photo
                    </span>
                  </button>
                )}
              </div>

              {/* Recipient name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nom du destinataire (optionnel)
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Qui a reçu le colis ?"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Signature pad */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    Signature du client (optionnel)
                  </label>
                  {signatureData && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs text-red-500 flex items-center gap-1"
                    >
                      <Eraser className="w-3 h-3" />
                      Effacer
                    </button>
                  )}
                </div>
                <div
                  className="relative bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                  style={{ height: 120 }}
                >
                  <canvas
                    ref={sigCanvasRef}
                    width={700}
                    height={240}
                    className="w-full h-full touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        Signez ici avec le doigt
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm button */}
              <button
                type="button"
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (proofPhoto && !updating) completeDelivery();
                }}
                onClick={completeDelivery}
                disabled={!proofPhoto || updating}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Confirmer la livraison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Rating Modal */}
      {showRatingModal && deliveryCompleted && (
        <CustomerRating
          deliveryId={delivery.id}
          customerName={delivery.delivery_contact_name || "Client"}
          address={delivery.delivery_address}
          onClose={() => {
            setShowRatingModal(false);
            navigate("/");
          }}
          onSubmit={() => {
            setShowRatingModal(false);
            navigate("/");
          }}
        />
      )}

      {/* In-app Navigation Map Overlay */}
      {showNavigationMap && navigationTarget && (
        <NavigationMapView
          destination={navigationTarget.coords}
          destinationLabel={navigationTarget.label}
          destinationType={navigationTarget.type}
          onClose={() => setShowNavigationMap(false)}
        />
      )}
    </div>
  );
}

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  if (bytes.length === 0) {
    throw new Error("Photo invalide : données vides");
  }
  return bytes;
}
