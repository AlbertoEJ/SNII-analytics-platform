import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <article className="space-y-5 max-w-5xl mx-auto">
      <Skeleton className="h-6 w-32" />

      <Card className="py-0 overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-5">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-3xl" />
                <Skeleton className="h-5 w-32 rounded-3xl" />
                <Skeleton className="h-5 w-24 rounded-3xl" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="py-0">
            <CardHeader className="py-3 border-b">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </article>
  );
}
