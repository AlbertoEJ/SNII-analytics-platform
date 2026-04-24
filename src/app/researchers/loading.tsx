import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <Card className="lg:sticky lg:top-16 lg:self-start py-0 overflow-hidden">
          <CardHeader className="py-3 border-b">
            <Skeleton className="h-3 w-16" />
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
            <Skeleton className="h-7 w-full rounded-md" />
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="py-0 overflow-hidden">
          <ul className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-3 pl-5 pr-4 py-3"
              >
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-3xl" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
