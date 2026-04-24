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
      <TabsList>
        <TabsTrigger value="count">{strings.count}</TabsTrigger>
        <TabsTrigger value="place">{strings.place}</TabsTrigger>
        <TabsTrigger value="field">{strings.field}</TabsTrigger>
      </TabsList>
      <TabsContent value="count" className="mt-2">{count}</TabsContent>
      <TabsContent value="place" className="mt-2">{place}</TabsContent>
      <TabsContent value="field" className="mt-2">{field}</TabsContent>
    </Tabs>
  );
}
