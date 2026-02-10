// Style Google Maps optimisé pour la conduite
// - POI masqués (moins de distraction)
// - Transit masqué
// - Routes mises en valeur
// - Style clair (lisibilité en plein soleil)

export const NAVIGATION_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // Masquer les POI labels
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  // Masquer les POI business
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  // Masquer le transit
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  // Routes principales - couleur accentuée
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f8c967' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b5230' }],
  },
  // Routes artérielles
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#d6d6d6' }],
  },
  // Routes locales
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e0e0e0' }],
  },
  // Fond de carte atténué
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f0efe9' }],
  },
  // Eau
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e4f0' }],
  },
  // Labels de route lisibles
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a4a4a' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }, { weight: 3 }],
  },
];
