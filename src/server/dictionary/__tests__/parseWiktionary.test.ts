import { describe, it, expect } from "vitest";
import { parseWiktionary } from "../helpers";

describe("parseWiktionary", () => {
  it("extracts up to three definitions with examples", () => {
    const sample = {
      en: [
        {
          partOfSpeech: "noun",
          definitions: [
            { definition: "First meaning", examples: ["Ex 1"] },
            { definition: "Second meaning", examples: ["Ex 2"] },
            { definition: "Third meaning", examples: ["Ex 3"] },
            { definition: "Fourth meaning", examples: ["Ex 4"] },
          ],
        },
      ],
    };

    const defs = parseWiktionary(sample, "en");
    expect(defs.length).toBe(3);
    expect(defs[0]).toEqual({
      pos: "noun",
      sense: "First meaning",
      examples: ["Ex 1"],
    });
  });
});
