"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface Props {
  strings: { count: string; place: string; field: string };
  count: ReactNode;
  place: ReactNode;
  field: ReactNode;
}

export function QuestionTabs({ strings, count, place, field }: Props) {
  return (
    <Tabs defaultValue="count">
      <TabsList className="h-10 gap-1">
        <TabsTrigger value="count" className="text-base px-4">{strings.count}</TabsTrigger>
        <TabsTrigger value="place" className="text-base px-4">{strings.place}</TabsTrigger>
        <TabsTrigger value="field" className="text-base px-4">{strings.field}</TabsTrigger>
      </TabsList>
      <TabsContent value="count" className="mt-4">{count}</TabsContent>
      <TabsContent value="place" className="mt-4">{place}</TabsContent>
      <TabsContent value="field" className="mt-4">{field}</TabsContent>
    </Tabs>
  );
}
