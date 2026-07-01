"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-gray-500 mb-2 text-sm">Ocurrió un error inesperado</p>
        <p className="text-xs text-gray-400 mb-8 font-mono bg-gray-50 rounded-lg p-3 truncate">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-medium hover:opacity-90 transition-opacity"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
