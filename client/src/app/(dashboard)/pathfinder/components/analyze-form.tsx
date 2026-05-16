"use client";

import * as React from "react";
import { Loader2, Play, RotateCcw, UserCog } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/contexts/locale-context";
import type { AnalyzeRequest } from "@/lib/pathfinder/types";
import { DEMO_PERSONAS, type DemoPersona } from "../sample-cv";

// PRD §11 / Phase 1: dropdown carries 12 preset target roles. Anything not in
// this list still works (the input is free-form), but presets are what the
// dataset has the most evidence for.
const TARGET_ROLE_PRESETS = [
  "AI Engineer",
  "Machine Learning Engineer",
  "Data Engineer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Solutions Architect",
  "Engineering Manager",
  "Mobile Engineer (React Native)",
  "Full-stack Engineer",
  "Embedded Engineer",
  "QA Automation Engineer",
  "Security Engineer",
];

interface AnalyzeFormProps {
  loading: boolean;
  onSubmit: (payload: AnalyzeRequest) => void;
  onReset: () => void;
}

export function AnalyzeForm({ loading, onSubmit, onReset }: AnalyzeFormProps) {
  const t = useTranslations();
  const [cvText, setCvText] = React.useState("");
  const [targetRole, setTargetRole] = React.useState("AI Engineer");
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

  const charCount = cvText.length;
  const charValid = charCount >= 50 && charCount <= 8000;

  const handleFillPersona = (persona: DemoPersona) => {
    setCvText(persona.cv_text);
    setTargetRole(persona.target_role);
    setValidationError(null);
  };

  const handleClear = () => {
    setCvText("");
    setTargetRole("AI Engineer");
    setValidationError(null);
    onReset();
  };

  const handleRun = (event: React.FormEvent) => {
    event.preventDefault();
    if (!charValid) {
      setValidationError(
        t("pathfinder.form.cvLengthError", { count: charCount }),
      );
      return;
    }
    if (!targetRole.trim()) {
      setValidationError(t("pathfinder.form.targetRoleRequired"));
      return;
    }
    setValidationError(null);
    onSubmit({ cv_text: cvText, target_role: targetRole.trim() });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {t("pathfinder.form.title")}
            </CardTitle>
            <CardDescription>{t("pathfinder.form.description")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DEMO_PERSONAS.map((persona) => (
              <Button
                key={persona.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFillPersona(persona)}
                disabled={loading}
                title={persona.pivot}
              >
                <UserCog className="size-4" />
                {persona.name}
                <span className="ml-1 hidden text-[10px] text-muted-foreground sm:inline">
                  · {persona.pivot}
                </span>
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={loading}
            >
              <RotateCcw className="size-4" />
              {t("common.reset")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRun} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cv">{t("pathfinder.form.cvLabel")}</Label>
              <span
                className={`text-xs tabular-nums ${
                  charValid ? "text-muted-foreground" : "text-destructive"
                }`}
              >
                {t("pathfinder.form.charCount", {
                  count: charCount.toLocaleString(),
                })}
              </span>
            </div>
            <Textarea
              id="cv"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder={t("pathfinder.form.cvPlaceholder")}
              className="min-h-[320px] resize-y font-mono text-xs leading-relaxed"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="target-role">{t("pathfinder.form.targetRole")}</Label>
              <Input
                id="target-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                disabled={loading}
                placeholder={t("pathfinder.form.targetRolePlaceholder")}
              />
              <Select
                value={
                  TARGET_ROLE_PRESETS.includes(targetRole) ? targetRole : ""
                }
                onValueChange={setTargetRole}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("pathfinder.form.pickPreset")} />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLE_PRESETS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                {t("pathfinder.form.pipelineTitle")}
              </p>
              <ul className="mt-2 space-y-1 list-disc pl-4">
                <li>
                  <Badge variant="secondary" className="font-mono">
                    gpt-4o-mini
                  </Badge>{" "}
                  {t("pathfinder.form.pipelineExtract")}
                </li>
                <li>
                  <Badge variant="secondary" className="font-mono">
                    text-embed-3-small
                  </Badge>{" "}
                  {t("pathfinder.form.pipelineEmbed")}
                </li>
                <li>
                  <Badge variant="secondary" className="font-mono">
                    Atlas Vector Search
                  </Badge>{" "}
                  {t("pathfinder.form.pipelineAtlas")}
                </li>
                <li>
                  <Badge variant="secondary" className="font-mono">
                    $graphLookup
                  </Badge>{" "}
                  {t("pathfinder.form.pipelineGraph")}
                </li>
                <li>
                  <Badge variant="secondary" className="font-mono">
                    $facet
                  </Badge>{" "}
                  {t("pathfinder.form.pipelineFacet")}
                </li>
              </ul>
            </div>

            <Button type="submit" disabled={loading || !charValid} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("pathfinder.form.running")}
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  {t("pathfinder.form.runAnalysis")}
                </>
              )}
            </Button>

            {validationError && (
              <p className="text-xs text-destructive">{validationError}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
