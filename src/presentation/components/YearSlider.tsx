"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  availableYears: number[];
  value: number;
  labels: { label: string; play: string; pause: string; speedLabel: string };
}

const SPEEDS = [1, 2, 4] as const;

export function YearSlider({ availableYears, value, labels }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const [year, setYear] = useState(value);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<typeof SPEEDS[number]>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const min = availableYears[0] ?? 1984;
  const max = availableYears.at(-1) ?? 2026;
  const present = new Set(availableYears);

  useEffect(() => setYear(value), [value]);

  // Push URL update, debounced.
  function pushYear(y: number) {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      next.set("year", String(y));
      router.replace(`${path}?${next.toString()}`, { scroll: false });
    }, 300);
  }

  function commit(y: number) {
    setYear(y);
    pushYear(y);
  }

  // Play loop.
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    const period = 1500 / speed;
    intervalRef.current = setInterval(() => {
      setYear((cur) => {
        let next = cur + 1;
        while (next <= max && !present.has(next)) next++;
        if (next > max) {
          setPlaying(false);
          return cur;
        }
        pushYear(next);
        return next;
      });
    }, period);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, max]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="py-3">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{labels.label}</span>
          <span className="text-lg font-semibold tabular-nums">{year}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant={playing ? "default" : "outline"} onClick={() => setPlaying((p) => !p)}>
              {playing ? labels.pause : labels.play}
            </Button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{labels.speedLabel}</span>
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                        className={`px-2 py-0.5 rounded ${speed === s ? "bg-foreground text-background" : "bg-muted"}`}>
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
        <Slider
          value={[year]}
          min={min} max={max} step={1}
          onValueChange={(v) => {
            const y = (v as number[])[0];
            // snap to nearest present year if user lands on a missing one.
            let snap = y;
            if (!present.has(y)) {
              let down = y, up = y;
              while (down >= min && !present.has(down)) down--;
              while (up <= max && !present.has(up)) up++;
              snap = (y - down <= up - y) ? down : up;
            }
            commit(snap);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              let n = year - 1; while (n >= min && !present.has(n)) n--;
              if (n >= min) commit(n);
            } else if (e.key === "ArrowRight") {
              let n = year + 1; while (n <= max && !present.has(n)) n++;
              if (n <= max) commit(n);
            }
          }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          {[1984, 1990, 2000, 2010, 2020, 2026].filter((t) => t >= min && t <= max).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
