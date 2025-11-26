import { describe, expect, it } from "vitest";
import { generateSSN, validateSSN } from "../src/index.js";

describe("validateSSN", () => {
  it("returns true for a valid SSN that matches the birth date", () => {
    const birthDate = "1990-06-15";
    const ssn = "2506901238"; // mod-10 check digit based on digits 1-9

    expect(validateSSN(ssn, birthDate)).toBe(true);
  });

  it("fails when the day/sex pair does not match the birth date", () => {
    const birthDate = "1990-06-15";
    const ssn = "5506901238"; // day pair expects 25 (male) or 65 (female)

    expect(validateSSN(ssn, birthDate)).toBe(false);
  });

  it("fails when the month/century pair does not match the birth date", () => {
    const birthDate = "2005-05-10";
    const ssn = "2005051238"; // should be 25 for 21st century May

    expect(validateSSN(ssn, birthDate)).toBe(false);
  });

  it("rejects any SSN containing three consecutive sixes", () => {
    const birthDate = "1990-06-15";
    const ssn = "2506906669"; // structurally correct but contains 666

    expect(validateSSN(ssn, birthDate)).toBe(false);
  });
});

describe("generateSSN", () => {
  it("generates a valid SSN for the provided birth date", () => {
    const birthDate = "1988-12-03";
    const mod10 = (base: string) =>
      String(
        base
          .split("")
          .reduce((acc, digit) => acc + Number(digit), 0) % 10
      );
    const ssn = generateSSN(birthDate, { sex: "male" });

    expect(
      validateSSN(ssn, birthDate, {
        checkDigitValidator: (base, digit) => digit === mod10(base)
      })
    ).toBe(true);
  });

  it("avoids triple six patterns even when a problematic sequence is supplied", () => {
    const birthDate = "1999-09-09";
    const ssn = generateSSN(birthDate, { sequence: 666 });

    expect(ssn.includes("666")).toBe(false);
    expect(validateSSN(ssn, birthDate)).toBe(true);
  });

  it("supports custom check digit strategies for validation and generation", () => {
    const birthDate = "1985-01-02";
    const checkDigit = (base: string) => "7";

    const ssn = generateSSN(birthDate, {
      sex: "female",
      sequence: 42,
      checkDigitGenerator: checkDigit
    });

    expect(
      validateSSN(ssn, birthDate, {
        checkDigitValidator: (base, digit) => digit === checkDigit(base)
      })
    ).toBe(true);
  });
});
