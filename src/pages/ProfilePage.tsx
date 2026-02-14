import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Truck,
  Star,
  Package,
  MapPin,
  Shield,
  ChevronRight,
  Camera,
  History,
  Settings,
  HelpCircle,
  Building2,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { supabase, calculateRating } from "../lib/supabase";
import { SUPPORT_CONFIG } from "../config/app.config";
import { Capacitor } from "@capacitor/core";
import {
  Camera as CapCamera,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";
import type { VehicleType, MomoProvider } from "../types/shared-types";

interface EditData {
  full_name: string;
  vehicle_type: VehicleType;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: string;
  momo_provider: MomoProvider;
  momo_number: string;
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "moto", label: "Moto" },
  { value: "velo", label: "Vélo" },
  { value: "tricycle", label: "Tricycle" },
  { value: "voiture", label: "Voiture" },
  { value: "camionnette", label: "Camionnette" },
];

const MOMO_PROVIDERS: { value: MomoProvider; label: string }[] = [
  { value: "orange", label: "Orange Money" },
  { value: "mtn", label: "MTN MoMo" },
  { value: "moov", label: "Moov Money" },
  { value: "wave", label: "Wave" },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { driver, signOut, isVerified, refreshDriver } = useAuth();
  const { showError, showSuccess } = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    full_name: "",
    vehicle_type: "moto",
    vehicle_plate: "",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_year: "",
    momo_provider: "orange",
    momo_number: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    if (!driver) return;
    setEditData({
      full_name: driver.full_name || "",
      vehicle_type: (driver.vehicle_type as VehicleType) || "moto",
      vehicle_plate: driver.vehicle_plate || "",
      vehicle_brand: driver.vehicle_brand || "",
      vehicle_model: driver.vehicle_model || "",
      vehicle_year: String(driver.vehicle_year || ""),
      momo_provider: (driver.momo_provider as MomoProvider) || "orange",
      momo_number: driver.momo_number || "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function saveProfile() {
    if (!driver) return;
    if (!editData.full_name.trim()) {
      showError("Le nom est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("logitrack_drivers")
        .update({
          full_name: editData.full_name.trim(),
          vehicle_type: editData.vehicle_type,
          vehicle_plate: editData.vehicle_plate.trim() || null,
          vehicle_brand: editData.vehicle_brand.trim() || null,
          vehicle_model: editData.vehicle_model.trim() || null,
          vehicle_year: editData.vehicle_year.trim() || null,
          momo_provider: editData.momo_provider,
          momo_number: editData.momo_number.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driver.id);

      if (error) throw error;
      await refreshDriver();
      setEditing(false);
      showSuccess("Profil mis à jour");
    } catch (err) {
      showError("Erreur lors de la mise à jour du profil");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoCapture() {
    try {
      let base64: string | null = null;

      if (Capacitor.isNativePlatform()) {
        const photo = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
        });
        if (photo.base64String) {
          base64 = `data:image/jpeg;base64,${photo.base64String}`;
        }
      } else {
        fileInputRef.current?.click();
        return;
      }

      if (base64) await uploadPhoto(base64);
    } catch (err) {
      showError("Erreur lors de la capture photo");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => uploadPhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function uploadPhoto(base64: string) {
    if (!driver) return;
    setUploadingPhoto(true);
    try {
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const path = `${driver.user_id}/profile.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("driver-photos")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("driver-photos")
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("logitrack_drivers")
        .update({
          photo_url: urlData.publicUrl + "?t=" + Date.now(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", driver.id);

      if (updateError) throw updateError;

      await refreshDriver();
    } catch (err) {
      showError("Erreur lors de l'upload de la photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (!driver) return null;

  // Calculate rating
  const rating = calculateRating(driver.rating_sum, driver.rating_count);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-3 py-2.5 flex items-center gap-2.5">
        <button
          onClick={() => (editing ? cancelEditing() : navigate("/"))}
          aria-label={editing ? "Annuler" : "Retour"}
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
        >
          {editing ? (
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>
        <h1 className="flex-1 text-base font-bold text-gray-900 dark:text-white">
          Mon profil
        </h1>
        {editing ? (
          <button
            onClick={saveProfile}
            disabled={saving}
            aria-label="Enregistrer"
            className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
          </button>
        ) : (
          <button
            onClick={startEditing}
            aria-label="Modifier le profil"
            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <Pencil className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        )}
      </header>

      {/* Hidden file input for web */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 p-4 text-center">
          <div className="relative inline-block mb-3">
            {driver.photo_url ? (
              <img
                src={driver.photo_url}
                alt={driver.full_name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-primary-600" />
              </div>
            )}
            <button
              type="button"
              onTouchEnd={(e) => {
                e.preventDefault();
                handlePhotoCapture();
              }}
              onClick={handlePhotoCapture}
              disabled={uploadingPhoto}
              aria-label="Changer la photo"
              className="absolute bottom-0 right-0 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-white disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {editing ? (
            <input
              type="text"
              value={editData.full_name}
              onChange={(e) =>
                setEditData({ ...editData, full_name: e.target.value })
              }
              className="text-base font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-center w-full max-w-[250px]"
              placeholder="Nom complet"
            />
          ) : (
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {driver.full_name}
            </h2>
          )}
          <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span>{rating.toFixed(1)}</span>
            <span>•</span>
            <span>{driver.total_deliveries} livraisons</span>
          </div>

          {/* Driver Type Badge */}
          {driver.company_id && (
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              <Building2 className="w-4 h-4" />
              Livreur entreprise
            </span>
          )}

          {/* Verification Badge */}
          {isVerified ? (
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <Shield className="w-3.5 h-3.5" />
              Compte vérifié
            </span>
          ) : driver.verification_status === "rejected" ? (
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              <Shield className="w-3.5 h-3.5" />
              Vérification refusée
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
              <Shield className="w-3.5 h-3.5" />
              En attente de vérification
            </span>
          )}
        </div>

        {/* Info Sections */}
        <div className="p-3 space-y-3">
          {/* Contact Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            <div className="px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Téléphone
                </p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {driver.phone}
                </p>
              </div>
            </div>
            {driver.email && (
              <div className="px-3 py-2.5 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500">Email</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {driver.email}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Money */}
          <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            <div className="px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-yellow-600">MM</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Opérateur MoMo
                </p>
                {editing ? (
                  <select
                    value={editData.momo_provider}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        momo_provider: e.target.value as MomoProvider,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    {MOMO_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {MOMO_PROVIDERS.find(
                      (p) => p.value === driver.momo_provider,
                    )?.label ||
                      driver.momo_provider ||
                      "Non défini"}
                  </p>
                )}
              </div>
            </div>
            <div className="px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Numéro MoMo
                </p>
                {editing ? (
                  <input
                    type="tel"
                    value={editData.momo_number}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        momo_number: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    placeholder="Numéro Mobile Money"
                  />
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {driver.momo_number || "Non défini"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            <div className="px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Truck className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Type de véhicule
                </p>
                {editing ? (
                  <select
                    value={editData.vehicle_type}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        vehicle_type: e.target.value as VehicleType,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white text-sm capitalize">
                    {driver.vehicle_type}
                  </p>
                )}
              </div>
            </div>
            {(editing || driver.vehicle_plate) && (
              <div className="px-3 py-2.5 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    CI
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Plaque d'immatriculation
                  </p>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.vehicle_plate}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          vehicle_plate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                      placeholder="AB 1234 CD"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {driver.vehicle_plate}
                    </p>
                  )}
                </div>
              </div>
            )}
            {(editing || driver.vehicle_brand) && (
              <div className="px-3 py-2.5 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Truck className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Véhicule
                  </p>
                  {editing ? (
                    <div className="space-y-2 mt-1">
                      <input
                        type="text"
                        value={editData.vehicle_brand}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            vehicle_brand: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                        placeholder="Marque"
                      />
                      <input
                        type="text"
                        value={editData.vehicle_model}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            vehicle_model: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                        placeholder="Modèle"
                      />
                      <input
                        type="text"
                        value={editData.vehicle_year}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            vehicle_year: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                        placeholder="Année"
                      />
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {driver.vehicle_brand} {driver.vehicle_model}{" "}
                      {driver.vehicle_year && `(${driver.vehicle_year})`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Zones */}
          {driver.secondary_zones && driver.secondary_zones.length > 0 && (
            <div className="bg-white rounded-lg p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Zones de livraison
                  </p>
                  <p className="text-xs text-gray-500">
                    {driver.secondary_zones.length + 1} zones configurées
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {driver.primary_zone_id && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full font-medium">
                    Zone principale
                  </span>
                )}
                {driver.secondary_zones.map((zone, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    Zone {i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
              Statistiques
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {driver.total_deliveries}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Livraisons
                </p>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {driver.acceptance_rate?.toFixed(0) || 100}%
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Acceptation
                </p>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {driver.completion_rate?.toFixed(0) || 100}%
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Complétion
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            <button
              onClick={() => navigate("/history")}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <History className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  Historique
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Voir vos anciennes livraisons
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  Paramètres
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Configuration du compte
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => window.open(SUPPORT_CONFIG.whatsappUrl, "_blank")}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  Aide & Support
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Contactez notre équipe
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={signOut}
            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-sm rounded-lg"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
