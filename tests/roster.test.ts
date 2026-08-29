import { test, describe } from "node:test";
import { expect } from "./expect.ts";
import { parseRoster } from "../lib/roster.ts";

describe("parseRoster", () => {
  test("a bare name is enough", () => {
    expect(parseRoster("Rohan Pillai")).toEqual([
      { name: "Rohan Pillai", regNo: null, gameTag: null },
    ]);
  });

  test("takes roll number and game tag after commas", () => {
    expect(parseRoster("Aparna Nair, MBA24-118, #9QRLPUYC")).toEqual([
      { name: "Aparna Nair", regNo: "MBA24-118", gameTag: "9QRLPUYC" },
    ]);
  });

  test("strips the leading # people copy inconsistently", () => {
    const [withHash] = parseRoster("A, R1, #ABC");
    const [without] = parseRoster("A, R1, ABC");
    expect(withHash.gameTag).toBe("ABC");
    expect(without.gameTag).toBe("ABC");
  });

  test("splits on tabs, so a pasted spreadsheet column works", () => {
    expect(parseRoster("Kabir Sethi\tMBA24-203\t9QRLPUYC")).toEqual([
      { name: "Kabir Sethi", regNo: "MBA24-203", gameTag: "9QRLPUYC" },
    ]);
  });

  test("drops blank lines and trims whitespace", () => {
    const rows = parseRoster("  Meera  \n\n   \nZoya Qureshi\n");
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Meera");
    expect(rows[1].name).toBe("Zoya Qureshi");
  });

  test("a trailing comma does not cost anyone a row", () => {
    expect(parseRoster("Ishaan Bhatt,")).toEqual([
      { name: "Ishaan Bhatt", regNo: null, gameTag: null },
    ]);
  });

  test("a name with no roll number keeps its game tag out of the reg slot", () => {
    // Two commas with an empty middle means "no roll number, tag only".
    expect(parseRoster("Vedant Rao,,#XYZ")).toEqual([
      { name: "Vedant Rao", regNo: null, gameTag: "XYZ" },
    ]);
  });

  test("extra columns past the third are ignored, not an error", () => {
    expect(parseRoster("Naina, R2, TAG, sectionB, 2028")).toEqual([
      { name: "Naina", regNo: "R2", gameTag: "TAG" },
    ]);
  });

  test("handles a realistic multi-line paste", () => {
    const rows = parseRoster(
      [
        "Ritwik Sanyal, MBA24-101, #2PP0R8V",
        "Aparna Nair, MBA24-118",
        "Devansh Kothari",
        "",
        "Meghna Iyer\tMBA24-140\tYYQ0LGV",
      ].join("\n"),
    );
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.name)).toEqual([
      "Ritwik Sanyal",
      "Aparna Nair",
      "Devansh Kothari",
      "Meghna Iyer",
    ]);
    expect(rows[1].regNo).toBe("MBA24-118");
    expect(rows[1].gameTag).toBeNull();
    expect(rows[2].regNo).toBeNull();
    expect(rows[3].gameTag).toBe("YYQ0LGV");
  });
});
