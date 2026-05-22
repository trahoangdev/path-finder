"use client";

import * as React from "react";
import {
  AlertTriangle,
  EyeOff,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/contexts/locale-context";
import {
  type HonestModePreset,
  HONEST_PRESETS,
  useHonestMode,
} from "./honest-mode";

/**
 * Live Honest Mode control — toggles + sliders for the trust thresholds
 * powering every recommendation card. Designed for the demo: a judge can
 * flip from "permissive" to "strict" and watch low-evidence cards collapse
 * into "Not enough data" placeholders in real time.
 */
export function HonestModeControl() {
  const t = useTranslations();
  const { thresholds, setThresholds, preset, setPreset, stats } =
    useHonestMode();

  return (
    <Card className="border-primary/20 bg-linear-to-br from-background to-primary/5">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Sliders className="size-3.5" />
          {t("pathfinder.honestControl.description")}
        </CardDescription>
        <CardTitle className="text-base">
          {t("pathfinder.honestControl.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("pathfinder.honestControl.subtitle")}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* ─── Preset toggle ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(HONEST_PRESETS) as HonestModePreset[]).map((key) => {
            const active = preset === key;
            return (
              <Button
                key={key}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => setPreset(key)}
                className="gap-1.5"
              >
                {key === "permissive" ? (
                  <Sparkles className="size-3.5" />
                ) : key === "strict" ? (
                  <ShieldCheck className="size-3.5" />
                ) : (
                  <Sliders className="size-3.5" />
                )}
                {t(`pathfinder.honestControl.preset.${key}`)}
              </Button>
            );
          })}
          {preset === "custom" ? (
            <Badge variant="outline" className="self-center font-mono text-[10px]">
              {t("pathfinder.honestControl.preset.custom")}
            </Badge>
          ) : null}
        </div>

        {/* ─── Sliders ─────────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ThresholdSlider
            label={t("pathfinder.honestControl.hideAt")}
            help={t("pathfinder.honestControl.hideHelp")}
            min={0}
            max={Math.max(50, thresholds.warn - 1)}
            value={thresholds.hide}
            onChange={(v) => {
              setThresholds({
                ...thresholds,
                hide: Math.min(v, thresholds.warn - 1),
              });
            }}
            tone="rose"
          />
          <ThresholdSlider
            label={t("pathfinder.honestControl.warnAt")}
            help={t("pathfinder.honestControl.warnHelp")}
            min={Math.max(2, thresholds.hide + 1)}
            max={Math.max(150, thresholds.trustworthy)}
            value={thresholds.warn}
            onChange={(v) => {
              setThresholds({
                ...thresholds,
                warn: Math.max(v, thresholds.hide + 1),
              });
            }}
            tone="amber"
          />
        </div>

        {/* ─── Live counter ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <Stat
            tone="rose"
            icon={<EyeOff className="size-3.5" />}
            label={t("pathfinder.honestControl.hidden")}
            value={stats.hidden}
            total={stats.total}
          />
          <Stat
            tone="amber"
            icon={<AlertTriangle className="size-3.5" />}
            label={t("pathfinder.honestControl.lowConfidence")}
            value={stats.lowConfidence}
            total={stats.total}
          />
          <Stat
            tone="emerald"
            icon={<ShieldCheck className="size-3.5" />}
            label={t("pathfinder.honestControl.trustworthy")}
            value={stats.trustworthy}
            total={stats.total}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface ThresholdSliderProps {
  label: string;
  help: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  tone: "rose" | "amber";
}

function ThresholdSlider({
  label,
  help,
  min,
  max,
  value,
  onChange,
  tone,
}: ThresholdSliderProps) {
  const accent =
    tone === "rose"
      ? "accent-rose-500"
      : "accent-amber-500";
  const valueClass =
    tone === "rose"
      ? "text-rose-700 dark:text-rose-300"
      : "text-amber-700 dark:text-amber-300";
  return (
    <label className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className={`font-mono text-sm tabular-nums ${valueClass}`}>
          N &lt; {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className={`h-1.5 w-full cursor-pointer ${accent}`}
        aria-label={label}
      />
      <span className="text-[11px] leading-tight text-muted-foreground">
        {help}
      </span>
    </label>
  );
}

interface StatProps {
  tone: "rose" | "amber" | "emerald";
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
}

function Stat({ tone, icon, label, value, total }: StatProps) {
  const palette = {
    rose: "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    amber:
      "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    emerald:
      "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  }[tone];
  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-2.5 ${palette}`}>
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-90">
        {icon}
        {label}
      </span>
      <span className="font-mono text-lg leading-none tabular-nums">
        {value}
        <span className="ml-1 text-xs opacity-60">/ {total}</span>
      </span>
    </div>
  );
}
