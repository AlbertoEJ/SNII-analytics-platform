export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div
        className="h-8 w-8 rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
