"use client";

import { HelpCircle, Lightbulb } from "lucide-react";

import {
  getHelpModule,
  type HelpModuleKey,
} from "@allativa/lib/help-content";
import { Button } from "@allativa/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@allativa/components/ui/sheet";
import { cn } from "@allativa/lib/utils";

interface HelpButtonProps {
  moduleKey: HelpModuleKey;
  className?: string;
  /** Rótulo acessível; padrão: "Ajuda deste módulo" */
  label?: string;
}

/**
 * Ícone de ajuda contextual. Abre um painel lateral (Sheet)
 * com explicações e exemplos do módulo, sem sair da página.
 */
export function HelpButton({
  moduleKey,
  className,
  label = "Ajuda deste módulo",
}: HelpButtonProps) {
  const content = getHelpModule(moduleKey);

  if (!content) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          className={cn(
            "h-9 w-9 shrink-0 text-[#034742] hover:bg-[#034742]/10 hover:text-[#034742]",
            className
          )}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-2 border-b border-slate-200 bg-[#034742]/[0.04] px-6 py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#034742]/10 text-[#034742]">
              <HelpCircle className="h-4 w-4" />
            </span>
            <SheetTitle className="font-serif text-xl text-slate-900">
              {content.title}
            </SheetTitle>
          </div>
          <SheetDescription className="text-sm leading-relaxed text-slate-600">
            {content.summary}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#034742]">
              Campos explicados
            </h3>
            <ul className="space-y-4">
              {content.fields.map((field) => (
                <li
                  key={field.name}
                  className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {field.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {field.description}
                  </p>
                  {field.example ? (
                    <p className="mt-2 rounded-md bg-[#034742]/[0.06] px-2.5 py-1.5 text-xs leading-relaxed text-[#034742]">
                      <span className="font-semibold">Exemplo: </span>
                      {field.example}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {content.tips && content.tips.length > 0 ? (
            <section className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#034742]">
                <Lightbulb className="h-3.5 w-3.5" />
                Dicas práticas
              </h3>
              <ul className="space-y-2">
                {content.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-2 text-sm leading-relaxed text-slate-600"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#034742]"
                      aria-hidden
                    />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
