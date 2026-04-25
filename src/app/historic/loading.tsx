export default function Loading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="h-8 w-72 bg-muted animate-pulse rounded" />
      <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 bg-muted animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
