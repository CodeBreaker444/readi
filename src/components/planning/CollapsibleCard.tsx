"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  defaultOpen?: boolean;
  collapsible?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export default function CollapsibleCard({
  title,
  subtitle,
  isDark,
  defaultOpen = false,
  collapsible = true,
  headerRight,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "overflow-hidden",
          isDark
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200"
        )}
      >
        <CardHeader className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={cn(
                  "text-sm font-semibold",
                  isDark ? "text-white" : "text-slate-900"
                )}
              >
                {title}
              </h2>
              {subtitle && (
                <p className={cn("text-xs mt-0.5", textMuted)}>{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {headerRight}
              {collapsible && (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs gap-1.5",
                      isDark
                        ? "border-slate-600 hover:bg-slate-700 text-slate-300"
                        : "border-slate-300 hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    {open ? "Hide" : "Show"}
                    {open ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent
            className={cn(
              "px-0 pb-0 border-t",
              isDark ? "border-slate-700" : "border-slate-200"
            )}
          >
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function inputClasses(isDark: boolean) {
  return cn(
    "w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none",
    "focus:ring-2 focus:ring-violet-500 focus:border-transparent",
    isDark
      ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
  );
}