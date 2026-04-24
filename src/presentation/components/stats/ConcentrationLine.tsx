import { Card, CardContent } from "@/components/ui/card";

export interface ConcentrationLineProps {
  /** Localized, fully-rendered sentence. Caller is responsible for i18n. */
  text: string;
}

/**
 * One-line, plain-language summary such as "Las 5 entidades con más investigadores concentran el 52% del total."
 * Accepts a pre-rendered string; i18n interpolation happens in the server component.
 */
export function ConcentrationLine({ text }: ConcentrationLineProps) {
  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <p className="text-sm text-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
