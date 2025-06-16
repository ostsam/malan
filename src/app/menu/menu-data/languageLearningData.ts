export interface LanguageOption {
  value: string;
  label: string;
  interlocutors: {
    male: string;
    female: string;
  };
}

export const languageLearningData: LanguageOption[] = [
  {
    value: "en",
    label: "English",
    interlocutors: { male: "John", female: "Angela" },
  },
  {
    value: "es",
    label: "Español / Spanish",
    interlocutors: { male: "Mateo", female: "Sofía" },
  },
  {
    value: "fr",
    label: "Français / French",
    interlocutors: { male: "Antoine", female: "Chloé" },
  },
  {
    value: "de",
    label: "Deutsch / German",
    interlocutors: { male: "Lukas", female: "Hannah" },
  },
  {
    value: "ja",
    label: "日本語 / Japanese",
    interlocutors: { male: "陽翔 (Haruto)", female: "結衣 (Yui)" },
  },
  {
    value: "zh",
    label: "中文 / Chinese",
    interlocutors: { male: "鵬 (Péng)", female: "明 (Míng)" },
  },
];
