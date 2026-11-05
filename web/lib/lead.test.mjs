import assert from "node:assert";
import { test } from "node:test";
import { formatPhone, validateLead } from "./lead.ts";

const good = { "lead-first-name": " Ada ", "lead-last-name": "Lovelace", "lead-email": "ada@example.com", "lead-phone": "(415) 555-0132" };

test("a valid lead is trimmed and mapped", () => {
  assert.deepEqual(validateLead(good).lead, { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: "(415) 555-0132" });
});

test("bad input is rejected with the right field named", () => {
  for (const input of [null, [], "x", 7, {}]) assert.equal(validateLead(input).lead, null);
  const cases = [
    ["lead-first-name", 7],
    ["lead-first-name", "   "],
    ["lead-last-name", "x".repeat(101)],
    ["lead-email", "nope"],
    ["lead-email", "a@b.c"],
    ["lead-email", `${"x".repeat(250)}@example.com`],
    ["lead-phone", "123"],
    ["lead-phone", "4155550132"],
  ];
  for (const [field, value] of cases) {
    assert.ok(validateLead({ ...good, [field]: value }).errors?.[field], `${field}=${value}`);
  }
});

test("phone mask builds the format the validator accepts", () => {
  assert.equal(formatPhone(""), "");
  assert.equal(formatPhone("41"), "(41");
  assert.equal(formatPhone("41555"), "(415) 55");
  assert.equal(formatPhone("4155550132999"), "(415) 555-0132");
  assert.ok(validateLead({ ...good, "lead-phone": formatPhone("415.555.0132") }).lead);
});
