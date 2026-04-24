"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong / Algo salió mal</h1>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
        An error occurred while loading this page. Please try again.
      </p>
      {error.digest && (
        <p className="text-xs text-zinc-500 font-mono">ref: {error.digest}</p>
      )}
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="px-4 py-2 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium"
        >
          Retry / Reintentar
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm"
        >
          Home / Inicio
        </Link>
      </div>
    </div>
  );
}
