import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBillingAnniversary,
  getDueBillingAnniversaries,
  getLatestBillingAnniversary,
  getNextBillingAnniversary,
} from "./aiCredits";

const utc = (value: string): Date => new Date(value);
const iso = (dates: Date[]): string[] =>
  dates.map((date) => date.toISOString());

describe("getBillingAnniversary", () => {
  const fixtures: Array<[string, number, string]> = [
    ["2026-01-01T12:34:56.789Z", 1, "2026-02-01T12:34:56.789Z"],
    ["2026-01-28T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2026-01-29T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2024-01-29T00:00:00.000Z", 1, "2024-02-29T00:00:00.000Z"],
    ["2026-01-30T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2026-01-31T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2026-01-31T00:00:00.000Z", 2, "2026-03-31T00:00:00.000Z"],
    ["2024-02-29T00:00:00.000Z", 12, "2025-02-28T00:00:00.000Z"],
  ];

  for (const [start, offset, expected] of fixtures) {
    it(`anchors ${start} plus ${offset} month(s)`, () => {
      assert.equal(
        getBillingAnniversary(utc(start), offset)?.toISOString(),
        expected,
      );
    });
  }

  it("rejects invalid dates and offsets", () => {
    assert.equal(getBillingAnniversary(new Date("invalid"), 1), null);
    assert.equal(
      getBillingAnniversary(utc("2026-01-01T00:00:00.000Z"), -1),
      null,
    );
    assert.equal(
      getBillingAnniversary(utc("2026-01-01T00:00:00.000Z"), 1.5),
      null,
    );
  });
});

describe("getDueBillingAnniversaries", () => {
  it("returns every ungranted monthly anniversary in an annual paid period", () => {
    assert.deepEqual(
      iso(
        getDueBillingAnniversaries(
          utc("2026-01-31T00:00:00.000Z"),
          utc("2027-01-31T00:00:00.000Z"),
          utc("2026-01-31T00:00:00.000Z"),
          utc("2026-05-31T00:00:00.000Z"),
        ),
      ),
      [
        "2026-02-28T00:00:00.000Z",
        "2026-03-31T00:00:00.000Z",
        "2026-04-30T00:00:00.000Z",
        "2026-05-31T00:00:00.000Z",
      ],
    );
  });

  it("excludes the period-end boundary and future anniversaries", () => {
    assert.deepEqual(
      iso(
        getDueBillingAnniversaries(
          utc("2026-01-01T00:00:00.000Z"),
          utc("2026-04-01T00:00:00.000Z"),
          utc("2026-01-01T00:00:00.000Z"),
          utc("2027-01-01T00:00:00.000Z"),
        ),
      ),
      ["2026-02-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z"],
    );
  });

  it("returns no dates for missing, invalid, or reversed periods", () => {
    const valid = utc("2026-01-01T00:00:00.000Z");
    assert.deepEqual(getDueBillingAnniversaries(null, valid, valid, valid), []);
    assert.deepEqual(
      getDueBillingAnniversaries(new Date("invalid"), valid, valid, valid),
      [],
    );
    assert.deepEqual(
      getDueBillingAnniversaries(
        utc("2026-02-01T00:00:00.000Z"),
        valid,
        valid,
        valid,
      ),
      [],
    );
  });
});

describe("billing cursor helpers", () => {
  it("finds the latest anniversary without historical backfill", () => {
    assert.equal(
      getLatestBillingAnniversary(
        utc("2026-01-31T00:00:00.000Z"),
        utc("2027-01-31T00:00:00.000Z"),
        utc("2026-04-15T00:00:00.000Z"),
      ).toISOString(),
      "2026-03-31T00:00:00.000Z",
    );
  });

  it("finds the next anniversary strictly after the grant cursor", () => {
    assert.equal(
      getNextBillingAnniversary(
        utc("2026-01-31T00:00:00.000Z"),
        utc("2026-05-31T00:00:00.000Z"),
        utc("2026-02-28T00:00:00.000Z"),
      )?.toISOString(),
      "2026-03-31T00:00:00.000Z",
    );
  });
});
