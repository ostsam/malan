import type { PopoverItem } from "../menu-components/CustomPopover";

export interface LanguageOption extends PopoverItem {
  rtl?: boolean;
  interlocutors: {
    male: string;
    female: string;
  };
}

export const languageLearningData: LanguageOption[] = [
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
    value: "it",
    label: "Italiano / Italian",
    interlocutors: { male: "Alessandro", female: "Giulia" },
  },
  {
    value: "zh",
    label: "中文 / Chinese",
    interlocutors: { male: "伟 (Wěi)", female: "芳 (Fāng)" },
  },
  {
    value: "ko",
    label: "한국어 / Korean",
    interlocutors: { male: "민준 (Min-jun)", female: "서연 (Seo-yeon)" },
  },
  {
    value: "ru",
    label: "Русский / Russian",
    interlocutors: { male: "Иван (Ivan)", female: "Лина (Lina)" },
  },
  {
    value: "pt",
    label: "Português / Portuguese",
    interlocutors: { male: "João", female: "Ana" },
  },
  {
    value: "ar",
    label: "العربية / Arabic",
    interlocutors: { male: "خالد (Khaled)", female: "عائشة (Aisha)" },
    rtl: true,
  },
  {
    value: "af",
    label: "Afrikaans",
    interlocutors: { male: "Jaco", female: "Anke" },
  },
  {
    value: "hy",
    label: "Հայերեն / Armenian",
    interlocutors: { male: "Davit (Դավիթ)", female: "Nare (Նարե)" },
  },
  {
    value: "az",
    label: "Azərbaycan dili / Azerbaijani",
    interlocutors: { male: "Yusif", female: "Zəhra" },
  },
  {
    value: "be",
    label: "Беларуская / Belarusian",
    interlocutors: { male: "Максім (Maksim)", female: "Алена (Alena)" },
  },
  {
    value: "bs",
    label: "Bosanski / Bosnian",
    interlocutors: { male: "Amar", female: "Lejla" },
  },
  {
    value: "bg",
    label: "Български / Bulgarian",
    interlocutors: { male: "Георги (Georgi)", female: "Мария (Maria)" },
  },
  {
    value: "ca",
    label: "Català / Catalan",
    interlocutors: { male: "Marc", female: "Laia" },
  },
  {
    value: "hr",
    label: "Hrvatski / Croatian",
    interlocutors: { male: "Luka", female: "Mia" },
  },
  {
    value: "cs",
    label: "Čeština / Czech",
    interlocutors: { male: "Jakub", female: "Eliška" },
  },
  {
    value: "cy",
    label: "Cymraeg / Welsh",
    interlocutors: { male: "Dylan", female: "Megan" },
  },
  {
    value: "da",
    label: "Dansk / Danish",
    interlocutors: { male: "Frederik", female: "Freja" },
  },
  {
    value: "nl",
    label: "Nederlands / Dutch",
    interlocutors: { male: "Sem", female: "Tess" },
  },
  {
    value: "en",
    label: "English",
    interlocutors: { male: "John", female: "Angela" },
  },
  {
    value: "et",
    label: "Eesti / Estonian",
    interlocutors: { male: "Markus", female: "Laura" },
  },
  {
    value: "fi",
    label: "Suomi / Finnish",
    interlocutors: { male: "Juhani", female: "Sofia" },
  },
  {
    value: "gl",
    label: "Galego / Galician",
    interlocutors: { male: "Brais", female: "Noa" },
  },
  {
    value: "el",
    label: "Ελληνικά / Greek",
    interlocutors: { male: "Γιώργος (Giorgos)", female: "Ελένη (Eleni)" },
  },
  {
    value: "he",
    label: "עברית / Hebrew",
    interlocutors: { male: "יוסף (Yosef)", female: "מאיה (Maya)" },
    rtl: true,
  },
  {
    value: "hi",
    label: "हिन्दी / Hindi",
    interlocutors: { male: "अर्जुन (Arjun)", female: "प्रिया (Priya)" },
  },
  {
    value: "hu",
    label: "Magyar / Hungarian",
    interlocutors: { male: "Bence", female: "Hanna" },
  },
  {
    value: "is",
    label: "Íslenska / Icelandic",
    interlocutors: { male: "Jón", female: "Guðrún" },
  },
  {
    value: "id",
    label: "Bahasa Indonesia / Indonesian",
    interlocutors: { male: "Budi", female: "Dewi" },
  },
  {
    value: "kn",
    label: "ಕನ್ನಡ / Kannada",
    interlocutors: { male: "ಆದಿ (Aadi)", female: "ಗೀತಾ (Geetha)" },
  },
  {
    value: "kk",
    label: "Қазақ тілі / Kazakh",
    interlocutors: { male: "Азамат (Azamat)", female: "Айзере (Aizere)" },
  },
  {
    value: "lv",
    label: "Latviešu / Latvian",
    interlocutors: { male: "Jānis", female: "Līga" },
  },
  {
    value: "lt",
    label: "Lietuvių / Lithuanian",
    interlocutors: { male: "Jonas", female: "Lina" },
  },
  {
    value: "mk",
    label: "Македонски / Macedonian",
    interlocutors: { male: "Александар (Aleksandar)", female: "Елена (Elena)" },
  },
  {
    value: "ms",
    label: "Bahasa Melayu / Malay",
    interlocutors: { male: "Ahmad", female: "Siti" },
  },
  {
    value: "mi",
    label: "Te Reo Māori / Maori",
    interlocutors: { male: "Manaia", female: "Aroha" },
  },
  {
    value: "mr",
    label: "मराठी / Marathi",
    interlocutors: { male: "आरव (Aarav)", female: "सायली (Sayali)" },
  },
  {
    value: "ne",
    label: "नेपाली / Nepali",
    interlocutors: { male: "हरि (Hari)", female: "सिता (Sita)" },
  },
  {
    value: "no",
    label: "Norsk / Norwegian",
    interlocutors: { male: "Kristian", female: "Ingrid" },
  },
  {
    value: "fa",
    label: "فارسی / Persian",
    interlocutors: { male: "امیر (Amir)", female: "زهرا (Zahra)" },
    rtl: true,
  },
  {
    value: "pl",
    label: "Polski / Polish",
    interlocutors: { male: "Jan", female: "Anna" },
  },
  {
    value: "ro",
    label: "Română / Romanian",
    interlocutors: { male: "Andrei", female: "Maria" },
  },
  {
    value: "sr",
    label: "Српски / Serbian",
    interlocutors: { male: "Никола (Nikola)", female: "Јована (Jovana)" },
  },
  {
    value: "sk",
    label: "Slovenčina / Slovak",
    interlocutors: { male: "Martin", female: "Katarína" },
  },
  {
    value: "sl",
    label: "Slovenščina / Slovenian",
    interlocutors: { male: "Luka", female: "Ana" },
  },
  {
    value: "sw",
    label: "Kiswahili / Swahili",
    interlocutors: { male: "Juma", female: "Asha" },
  },
  {
    value: "sv",
    label: "Svenska / Swedish",
    interlocutors: { male: "Erik", female: "Anna" },
  },
  {
    value: "tl",
    label: "Tagalog",
    interlocutors: { male: "Jose", female: "Maria" },
  },
  {
    value: "ta",
    label: "தமிழ் / Tamil",
    interlocutors: { male: "அருண் (Arun)", female: "പ്രിയ (Priya)" },
  },
  {
    value: "th",
    label: "ไทย / Thai",
    interlocutors: { male: "สมชาย (Somchai)", female: "สมหญิง (Somying)" },
  },
  {
    value: "tr",
    label: "Türkçe / Turkish",
    interlocutors: { male: "Mehmet", female: "Ayşe" },
  },
  {
    value: "uk",
    label: "Українська / Ukrainian",
    interlocutors: { male: "Олександр (Oleksandr)", female: "Олена (Olena)" },
  },
  {
    value: "ur",
    label: "اردو / Urdu",
    interlocutors: { male: "علی (Ali)", female: "فاطمہ (Fatima)" },
    rtl: true,
  },
  {
    value: "vi",
    label: "Tiếng Việt / Vietnamese",
    interlocutors: { male: "Sơn", female: "Hương" },
  },
];
