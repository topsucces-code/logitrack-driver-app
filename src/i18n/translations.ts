export type Language = 'fr' | 'en';

export interface Translations {
  // Common
  loading: string;
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
  edit: string;
  back: string;
  next: string;
  done: string;
  error: string;
  success: string;
  retry: string;
  close: string;
  search: string;
  filter: string;
  share: string;

  // Navigation
  home: string;
  dashboard: string;
  deliveries: string;
  earnings: string;
  profile: string;
  settings: string;
  history: string;
  analytics: string;
  reports: string;
  challenges: string;

  // Auth
  login: string;
  logout: string;
  register: string;
  phone: string;
  password: string;
  forgotPassword: string;
  createAccount: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;

  // Dashboard
  welcome: string;
  availableDeliveries: string;
  noDeliveries: string;
  yourEarnings: string;
  todayEarnings: string;
  weeklyEarnings: string;
  monthlyEarnings: string;
  totalDeliveries: string;
  averageRating: string;
  online: string;
  offline: string;
  goOnline: string;
  goOffline: string;

  // Delivery
  newDelivery: string;
  acceptDelivery: string;
  rejectDelivery: string;
  startPickup: string;
  confirmPickup: string;
  startDelivery: string;
  confirmDelivery: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupInstructions: string;
  deliveryInstructions: string;
  packageDetails: string;
  earnings_label: string;
  distance: string;
  estimatedTime: string;
  trackingCode: string;
  proofOfDelivery: string;
  takePhoto: string;
  recipientName: string;
  deliveryCompleted: string;
  reportIssue: string;
  clientAbsent: string;

  // Navigation
  navigate: string;
  openInMaps: string;
  call: string;

  // SOS
  sosButton: string;
  sosAlert: string;
  sosDescription: string;
  emergencyContacts: string;
  callPolice: string;
  callAmbulance: string;
  callSupport: string;

  // Settings
  deliverySettings: string;
  appearance: string;
  lightMode: string;
  darkMode: string;
  systemMode: string;
  notifications: string;
  pushNotifications: string;
  newDeliveriesMessages: string;
  language: string;
  autoAccept: string;
  autoAcceptDescription: string;
  maxDistance: string;
  receiveDeliveriesWithinRadius: string;
  support: string;
  chatWithSupport: string;
  realtimeAssistance: string;
  helpFAQ: string;
  termsOfService: string;
  privacyPolicy: string;
  version: string;
  saving: string;

  // Challenges
  challengesAndRewards: string;
  dailyChallenges: string;
  weeklyChallenges: string;
  badges: string;
  leaderboard: string;
  level: string;
  xp: string;
  nextLevel: string;
  claimReward: string;
  rewardClaimed: string;
  completed: string;
  inProgress: string;
  yourPosition: string;
  day: string;
  week: string;
  month: string;
  categoryDeliveries: string;
  categoryEarnings: string;
  categoryRating: string;
  categoryStreak: string;
  categoryDistance: string;

  // Tools
  tools: string;
  qrScanner: string;
  scanPackageCode: string;
  weeklyStats: string;
  detailedDashboard: string;
  earnBonuses: string;

  // Route optimization
  routeOptimization: string;
  optimizeRoute: string;
  optimizedRoute: string;
  stops: string;
  totalDuration: string;
  suggestedOrder: string;
  currentOrder: string;
  applyOptimization: string;
  savingsEstimate: string;

  // Ratings
  rateCustomer: string;
  howWasDelivery: string;
  excellent: string;
  good: string;
  okay: string;
  poor: string;
  terrible: string;
  submitRating: string;
  skipRating: string;

  // Reports
  weeklyReport: string;
  monthlyReport: string;
  totalDistance: string;
  averagePerDelivery: string;
  comparedToLastWeek: string;
  busiestDay: string;
  peakHours: string;
  topZone: string;

  // Errors
  connectionError: string;
  serverError: string;
  invalidCredentials: string;
  sessionExpired: string;
  permissionDenied: string;
  locationRequired: string;
  cameraRequired: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    // Common
    loading: 'Chargement...',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    back: 'Retour',
    next: 'Suivant',
    done: 'Terminé',
    error: 'Erreur',
    success: 'Succès',
    retry: 'Réessayer',
    close: 'Fermer',
    search: 'Rechercher',
    filter: 'Filtrer',
    share: 'Partager',

    // Navigation
    home: 'Accueil',
    dashboard: 'Tableau de bord',
    deliveries: 'Livraisons',
    earnings: 'Gains',
    profile: 'Profil',
    settings: 'Paramètres',
    history: 'Historique',
    analytics: 'Analytiques',
    reports: 'Rapports',
    challenges: 'Défis',

    // Auth
    login: 'Connexion',
    logout: 'Déconnexion',
    register: 'Inscription',
    phone: 'Téléphone',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    createAccount: 'Créer un compte',
    alreadyHaveAccount: 'Déjà un compte ?',
    dontHaveAccount: 'Pas encore de compte ?',

    // Dashboard
    welcome: 'Bienvenue',
    availableDeliveries: 'Livraisons disponibles',
    noDeliveries: 'Aucune livraison disponible',
    yourEarnings: 'Vos gains',
    todayEarnings: 'Gains du jour',
    weeklyEarnings: 'Gains de la semaine',
    monthlyEarnings: 'Gains du mois',
    totalDeliveries: 'Total livraisons',
    averageRating: 'Note moyenne',
    online: 'En ligne',
    offline: 'Hors ligne',
    goOnline: 'Passer en ligne',
    goOffline: 'Passer hors ligne',

    // Delivery
    newDelivery: 'Nouvelle livraison',
    acceptDelivery: 'Accepter',
    rejectDelivery: 'Refuser',
    startPickup: 'En route vers le pickup',
    confirmPickup: 'Colis récupéré',
    startDelivery: 'En route vers la livraison',
    confirmDelivery: 'Confirmer la livraison',
    pickupAddress: 'Adresse de collecte',
    deliveryAddress: 'Adresse de livraison',
    pickupInstructions: 'Instructions de collecte',
    deliveryInstructions: 'Instructions de livraison',
    packageDetails: 'Détails du colis',
    earnings_label: 'Gains',
    distance: 'Distance',
    estimatedTime: 'Temps estimé',
    trackingCode: 'Code de suivi',
    proofOfDelivery: 'Preuve de livraison',
    takePhoto: 'Prendre une photo',
    recipientName: 'Nom du destinataire',
    deliveryCompleted: 'Livraison terminée',
    reportIssue: 'Signaler un problème',
    clientAbsent: 'Client absent',

    // Navigation
    navigate: 'Naviguer',
    openInMaps: 'Ouvrir dans Maps',
    call: 'Appeler',

    // SOS
    sosButton: 'SOS',
    sosAlert: 'Alerte SOS',
    sosDescription: 'Maintenez appuyé pour envoyer une alerte',
    emergencyContacts: 'Contacts d\'urgence',
    callPolice: 'Appeler la police',
    callAmbulance: 'Appeler le SAMU',
    callSupport: 'Appeler le support',

    // Settings
    deliverySettings: 'Paramètres de livraison',
    appearance: 'Apparence',
    lightMode: 'Clair',
    darkMode: 'Sombre',
    systemMode: 'Système',
    notifications: 'Notifications',
    pushNotifications: 'Notifications push',
    newDeliveriesMessages: 'Nouvelles courses, messages',
    language: 'Langue',
    autoAccept: 'Acceptation auto',
    autoAcceptDescription: 'Accepter automatiquement les courses',
    maxDistance: 'Distance maximale',
    receiveDeliveriesWithinRadius: 'Recevez les courses dans un rayon de',
    support: 'Support',
    chatWithSupport: 'Chat avec le support',
    realtimeAssistance: 'Assistance en temps réel',
    helpFAQ: 'Aide et FAQ',
    termsOfService: 'Conditions d\'utilisation',
    privacyPolicy: 'Politique de confidentialité',
    version: 'Version',
    saving: 'Enregistrement...',

    // Challenges
    challengesAndRewards: 'Défis & Récompenses',
    dailyChallenges: 'Défis du jour',
    weeklyChallenges: 'Défis de la semaine',
    badges: 'Badges',
    leaderboard: 'Classement',
    level: 'Niveau',
    xp: 'XP',
    nextLevel: 'Prochain niveau',
    claimReward: 'Réclamer la récompense',
    rewardClaimed: 'Récompense réclamée',
    completed: 'Terminé',
    inProgress: 'En cours',
    yourPosition: 'Votre position',
    day: 'Jour',
    week: 'Semaine',
    month: 'Mois',
    categoryDeliveries: 'Livraisons',
    categoryEarnings: 'Gains',
    categoryRating: 'Note',
    categoryStreak: 'Série',
    categoryDistance: 'Distance',

    // Tools
    tools: 'Outils',
    qrScanner: 'Scanner QR',
    scanPackageCode: 'Scanner un code colis',
    weeklyStats: 'Statistiques hebdomadaires',
    detailedDashboard: 'Tableau de bord détaillé',
    earnBonuses: 'Gagnez des bonus',

    // Route optimization
    routeOptimization: 'Optimisation d\'itinéraire',
    optimizeRoute: 'Optimiser l\'itinéraire',
    optimizedRoute: 'Itinéraire optimisé',
    stops: 'arrêts',
    totalDuration: 'Durée totale',
    suggestedOrder: 'Ordre suggéré',
    currentOrder: 'Ordre actuel',
    applyOptimization: 'Appliquer l\'optimisation',
    savingsEstimate: 'Économie estimée',

    // Ratings
    rateCustomer: 'Évaluer le client',
    howWasDelivery: 'Comment s\'est passée cette livraison ?',
    excellent: 'Excellent',
    good: 'Bien',
    okay: 'Correct',
    poor: 'Mauvais',
    terrible: 'Très mauvais',
    submitRating: 'Envoyer l\'évaluation',
    skipRating: 'Passer',

    // Reports
    weeklyReport: 'Rapport hebdomadaire',
    monthlyReport: 'Rapport mensuel',
    totalDistance: 'Distance totale',
    averagePerDelivery: 'Moyenne par livraison',
    comparedToLastWeek: 'Par rapport à la semaine dernière',
    busiestDay: 'Jour le plus actif',
    peakHours: 'Heures de pointe',
    topZone: 'Zone principale',

    // Errors
    connectionError: 'Erreur de connexion',
    serverError: 'Erreur serveur',
    invalidCredentials: 'Identifiants invalides',
    sessionExpired: 'Session expirée',
    permissionDenied: 'Permission refusée',
    locationRequired: 'Localisation requise',
    cameraRequired: 'Caméra requise',
  },

  en: {
    // Common
    loading: 'Loading...',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    share: 'Share',

    // Navigation
    home: 'Home',
    dashboard: 'Dashboard',
    deliveries: 'Deliveries',
    earnings: 'Earnings',
    profile: 'Profile',
    settings: 'Settings',
    history: 'History',
    analytics: 'Analytics',
    reports: 'Reports',
    challenges: 'Challenges',

    // Auth
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    phone: 'Phone',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    createAccount: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: 'Don\'t have an account?',

    // Dashboard
    welcome: 'Welcome',
    availableDeliveries: 'Available deliveries',
    noDeliveries: 'No deliveries available',
    yourEarnings: 'Your earnings',
    todayEarnings: 'Today\'s earnings',
    weeklyEarnings: 'Weekly earnings',
    monthlyEarnings: 'Monthly earnings',
    totalDeliveries: 'Total deliveries',
    averageRating: 'Average rating',
    online: 'Online',
    offline: 'Offline',
    goOnline: 'Go online',
    goOffline: 'Go offline',

    // Delivery
    newDelivery: 'New delivery',
    acceptDelivery: 'Accept',
    rejectDelivery: 'Reject',
    startPickup: 'On the way to pickup',
    confirmPickup: 'Package picked up',
    startDelivery: 'On the way to delivery',
    confirmDelivery: 'Confirm delivery',
    pickupAddress: 'Pickup address',
    deliveryAddress: 'Delivery address',
    pickupInstructions: 'Pickup instructions',
    deliveryInstructions: 'Delivery instructions',
    packageDetails: 'Package details',
    earnings_label: 'Earnings',
    distance: 'Distance',
    estimatedTime: 'Estimated time',
    trackingCode: 'Tracking code',
    proofOfDelivery: 'Proof of delivery',
    takePhoto: 'Take a photo',
    recipientName: 'Recipient name',
    deliveryCompleted: 'Delivery completed',
    reportIssue: 'Report an issue',
    clientAbsent: 'Client absent',

    // Navigation
    navigate: 'Navigate',
    openInMaps: 'Open in Maps',
    call: 'Call',

    // SOS
    sosButton: 'SOS',
    sosAlert: 'SOS Alert',
    sosDescription: 'Hold to send an alert',
    emergencyContacts: 'Emergency contacts',
    callPolice: 'Call police',
    callAmbulance: 'Call ambulance',
    callSupport: 'Call support',

    // Settings
    deliverySettings: 'Delivery settings',
    appearance: 'Appearance',
    lightMode: 'Light',
    darkMode: 'Dark',
    systemMode: 'System',
    notifications: 'Notifications',
    pushNotifications: 'Push notifications',
    newDeliveriesMessages: 'New deliveries, messages',
    language: 'Language',
    autoAccept: 'Auto accept',
    autoAcceptDescription: 'Automatically accept deliveries',
    maxDistance: 'Maximum distance',
    receiveDeliveriesWithinRadius: 'Receive deliveries within a radius of',
    support: 'Support',
    chatWithSupport: 'Chat with support',
    realtimeAssistance: 'Real-time assistance',
    helpFAQ: 'Help & FAQ',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    version: 'Version',
    saving: 'Saving...',

    // Challenges
    challengesAndRewards: 'Challenges & Rewards',
    dailyChallenges: 'Daily challenges',
    weeklyChallenges: 'Weekly challenges',
    badges: 'Badges',
    leaderboard: 'Leaderboard',
    level: 'Level',
    xp: 'XP',
    nextLevel: 'Next level',
    claimReward: 'Claim reward',
    rewardClaimed: 'Reward claimed',
    completed: 'Completed',
    inProgress: 'In progress',
    yourPosition: 'Your position',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    categoryDeliveries: 'Deliveries',
    categoryEarnings: 'Earnings',
    categoryRating: 'Rating',
    categoryStreak: 'Streak',
    categoryDistance: 'Distance',

    // Tools
    tools: 'Tools',
    qrScanner: 'QR Scanner',
    scanPackageCode: 'Scan package code',
    weeklyStats: 'Weekly statistics',
    detailedDashboard: 'Detailed dashboard',
    earnBonuses: 'Earn bonuses',

    // Route optimization
    routeOptimization: 'Route optimization',
    optimizeRoute: 'Optimize route',
    optimizedRoute: 'Optimized route',
    stops: 'stops',
    totalDuration: 'Total duration',
    suggestedOrder: 'Suggested order',
    currentOrder: 'Current order',
    applyOptimization: 'Apply optimization',
    savingsEstimate: 'Estimated savings',

    // Ratings
    rateCustomer: 'Rate customer',
    howWasDelivery: 'How was this delivery?',
    excellent: 'Excellent',
    good: 'Good',
    okay: 'Okay',
    poor: 'Poor',
    terrible: 'Terrible',
    submitRating: 'Submit rating',
    skipRating: 'Skip',

    // Reports
    weeklyReport: 'Weekly report',
    monthlyReport: 'Monthly report',
    totalDistance: 'Total distance',
    averagePerDelivery: 'Average per delivery',
    comparedToLastWeek: 'Compared to last week',
    busiestDay: 'Busiest day',
    peakHours: 'Peak hours',
    topZone: 'Top zone',

    // Errors
    connectionError: 'Connection error',
    serverError: 'Server error',
    invalidCredentials: 'Invalid credentials',
    sessionExpired: 'Session expired',
    permissionDenied: 'Permission denied',
    locationRequired: 'Location required',
    cameraRequired: 'Camera required',
  },
};

export const languageNames: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
};
