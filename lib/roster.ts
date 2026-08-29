import type { NewPlayer } from "./db";

/**
 * One player per line. Everything after the name is optional:
 *
 *   Rohan Pillai
 *   Rohan Pillai, MBA24-118
 *   Rohan Pillai, MBA24-118, #9QRLPUYC
 *
 * Commas and tabs both split, so a block of cells copied straight out of a
 * registration spreadsheet works without anyone reformatting it first.
 *
 * A leading "#" on the game tag is dropped because people copy it
 * inconsistently and it is noise once the column is labelled. Extra commas
 * past the third field are ignored rather than treated as an error: a stray
 * trailing comma in a pasted sheet should not cost anyone a row.
 *
 * This lives outside app/admin/actions.ts because that file is "use server",
 * where every export has to be an async Server Action. Being a plain module
 * also means it can be unit-tested, which matters more than it sounds for
 * something whose only input is whatever a human pasted at 9pm.
 */
export function parseRoster(text: string): NewPlayer[] {
  return text
    .split("\n")
    .map((line) => {
      const [name = "", regNo = "", gameTag = ""] = line
        .split(/[\t,]/)
        .map((part) => part.trim());
      return {
        name,
        regNo: regNo || null,
        gameTag: gameTag.replace(/^#/, "") || null,
      };
    })
    .filter((p) => p.name.length > 0);
}
