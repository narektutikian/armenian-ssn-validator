# armenia-ssn-validator

Armenian Social Security Number (SSN) validator and generator written in TypeScript for frontend and backend projects. Provide a birth date plus an SSN to validate, or generate a deterministic SSN for QA based on a birth date.

## Install

```bash
npm install armenia-ssn-validator
```

## Usage

```ts
import { validateSSN, generateSSN } from "armenia-ssn-validator";

const birthDate = "1990-06-15";
const ssn = "2506901238";

validateSSN(ssn, birthDate); // true

const generated = generateSSN(birthDate, { sex: "female" });
validateSSN(generated, birthDate); // true
```

### Using CommonJS

The package ships ESM and CJS bundles. In CJS environments:

```js
const { validateSSN, generateSSN } = require("armenia-ssn-validator");

const birthDate = "1990-06-15";
const ssn = "2506901238";
console.log(validateSSN(ssn, birthDate));
```

### Check digit behavior

The official check-digit algorithm is not published. The validator accepts any numeric check digit by default. You can provide your own validation or generation strategy to enforce a specific rule:

```ts
const checkDigit = (base: string) => {
  const sum = base.split("").reduce((acc, digit) => acc + Number(digit), 0);
  return String(sum % 10);
};

const candidate = generateSSN(birthDate, { checkDigitGenerator: checkDigit });
validateSSN(candidate, birthDate, {
  checkDigitValidator: (base, digit) => digit === checkDigit(base)
}); // true
```

### Rules covered

- 10 numeric digits
- Day/sex (first two digits): 11-41 for males, 51-81 for females
- Month/century (digits 3-4): 01-12 (20th c.), 21-32 (21st c.), 41-52 (22nd c.), 61-72 (23rd c.), 81-92 (19th c.)
- Birth year (digits 5-6): last two digits of the year
- Sequence (digits 7-9): 001-999
- Check digit (digit 10): user-configurable, numeric by default
- Disallows three consecutive sixes anywhere in the number

## Scripts

- `npm run build` — compile to `dist/`
- `npm test` — run unit tests (Vitest)
- `npm run lint` — type-check the sources
