export interface Definition {
  /** Part of speech, e.g., noun, verb */
  pos: string;
  /** Concise definition or meaning of the word */
  sense: string;
  /** Example sentences illustrating the usage */
  examples: string[];
  /** Optional translated sense for bilingual wordlists */
  translatedSense?: string;
}

export interface FetchDefinitionParams {
  word: string;
  lang: string;
  targetLang?: string;
}
