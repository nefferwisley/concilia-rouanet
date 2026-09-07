import { describe, expect, it } from "vitest";
import {
  mergeOfficialProject1961,
  mergeOfficialProject1961Dataset,
  resolveInitialActiveProjectId,
} from "./officialProject1961Migration";

describe("official Project 1961 migration", () => {
  it("replaces only the stale 1961 project", () => {
    const saved = [
      { id: "custom", value: "preserved" },
      { id: "proj-1961", value: "stale" },
    ];
    const official = [{ id: "proj-1961", value: "validated" }];
    expect(mergeOfficialProject1961(saved, official, true)).toEqual([
      { id: "custom", value: "preserved" },
      { id: "proj-1961", value: "validated" },
    ]);
  });

  it("replaces only the stale 1961 dataset", () => {
    const saved = {
      custom: [{ amount: 10 }],
      "proj-1961": [{ amount: 290.91 }],
    };
    const official = { "proj-1961": [{ amount: 897759.15 }] };
    expect(mergeOfficialProject1961Dataset(saved, official, true)).toEqual({
      custom: [{ amount: 10 }],
      "proj-1961": [{ amount: 897759.15 }],
    });
  });

  it("preserves later user changes after the migration version is recorded", () => {
    const saved = { "proj-1961": [{ amount: 123 }] };
    const official = { "proj-1961": [{ amount: 897759.15 }] };
    expect(mergeOfficialProject1961Dataset(saved, official, false)).toBe(saved);
  });

  it("opens 1961 once even when another project was saved as active", () => {
    expect(
      resolveInitialActiveProjectId(
        "proj-27o-etv",
        ["proj-27o-etv", "proj-1961"],
        true,
      ),
    ).toBe("proj-1961");
  });

  it("preserves the user's later project selection after the default was applied", () => {
    expect(
      resolveInitialActiveProjectId(
        "proj-27o-etv",
        ["proj-27o-etv", "proj-1961"],
        false,
      ),
    ).toBe("proj-27o-etv");
  });
});
