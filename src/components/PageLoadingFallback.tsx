export default function PageLoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-primary-500">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Chargement...</p>
      </div>
    </div>
  );
}
