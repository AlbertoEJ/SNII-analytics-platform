import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </header>

      <Card className="py-0">
        <CardContent className="p-5 flex items-baseline gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Skeleton className="h-9 w-96 rounded-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="py-0">
              <CardContent className="p-3 space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="py-0">
          <CardContent className="p-0">
            <ul className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
