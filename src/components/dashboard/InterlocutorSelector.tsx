import { cn } from "@/lib/utils";
import { useRTL } from "@/app/hooks/useRTL";
import { interfaceColor } from "@/lib/theme";
import type { LanguageOption } from "@/app/dashboard/menu-data/languageLearningData";

interface InterlocutorSelectorProps {
  selectedLanguage: LanguageOption | undefined;
  interlocutor: string | undefined;
  onInterlocutorSelect: (interlocutor: string) => void;
}

export function InterlocutorSelector({
  selectedLanguage,
  interlocutor,
  onInterlocutorSelect,
}: InterlocutorSelectorProps) {
  const { rtlStyles, languageCode } = useRTL({
    selectedLanguage: selectedLanguage?.value,
    nativeLanguage: undefined,
  });

  if (!selectedLanguage) return null;

  return (
    <section className="glassmorphic p-3 rounded-xl bg-white/80 border border-slate-200 space-y-4 fade-in delay-3">
      <h2
        className="text-center text-base sm:text-lg font-medium"
        style={{ color: interfaceColor }}
      >
        Your Interlocutor
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {Object.entries(selectedLanguage.interlocutors ?? {}).map(
          ([gender, name]) => (
            <button
              key={gender}
              aria-pressed={interlocutor === name}
              onClick={() => onInterlocutorSelect(name)}
              className={cn(
                "group relative focus:outline-none focus-visible:ring-2 rounded-lg border transition-all cursor-pointer",
                interlocutor === name
                  ? "shadow-sm"
                  : "border-slate-200 bg-white"
              )}
              style={{
                borderColor: interlocutor === name ? interfaceColor : undefined,
                backgroundColor:
                  interlocutor === name ? `${interfaceColor}14` : undefined,
                minWidth: 90,
              }}
            >
              <span
                className="relative flex flex-col items-center px-4 py-2 rounded-lg"
                style={rtlStyles}
                lang={languageCode}
              >
                <span className="text-xs sm:text-sm text-slate-500 capitalize">
                  {gender}
                </span>
                <span
                  className="text-lg sm:text-xl font-semibold"
                  style={{ color: interfaceColor }}
                >
                  {name}
                </span>
              </span>
            </button>
          )
        )}
      </div>
    </section>
  );
}
