import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Investigador no encontrado / Researcher not found</h1>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
        No existe un investigador con ese CVU en el padrón actual.
      </p>
      <Link
        href="/researchers"
        className="px-4 py-2 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium"
      >
        Volver a la lista / Back to list
      </Link>
    </div>
  );
}
