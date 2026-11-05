import assert from "node:assert";
import { test } from "node:test";
import { easternTime, initials, money } from "./format.ts";
import { MONTHLY_CENTS, quote } from "./plans.ts";
import { checkPassword, decrypt, decryptText, encrypt, encryptText, hashPassword } from "./secure.ts";

process.env.APP_SECRET = "x".repeat(40);

test("prices come out as the home page says", () => {
  assert.equal(money(MONTHLY_CENTS), "$270.00");
  assert.equal(quote("monthly").recurring, true);
  assert.equal(money(quote("catchup", 3).amountCents), "$660.00");
  for (const bad of [[null], ["catchup", 0], ["catchup", 121], ["catchup", null], ["growth", 1]]) assert.equal(quote(...bad), null);
});

test("Eastern time handles both sides of daylight saving, and rejects dates that do not exist", () => {
  assert.equal(easternTime("07/01/2026", "14:00").toISOString(), "2026-07-01T18:00:00.000Z");
  assert.equal(easternTime("12/01/2026", "14:00").toISOString(), "2026-12-01T19:00:00.000Z");
  for (const [date, time] of [["02/31/2026", "14:00"], ["2026-12-01", "14:00"], ["12/01/2026", "2pm"]]) assert.equal(easternTime(date, time), null);
});

test("passwords verify, wrong and missing ones do not", () => {
  const stored = hashPassword("correct horse battery");
  assert.ok(checkPassword("correct horse battery", stored));
  assert.ok(!checkPassword("wrong", stored));
  assert.ok(!checkPassword("anything", null));
});

test("encryption round trips and tampering is caught", () => {
  assert.equal(decryptText(encryptText("12-3456789")), "12-3456789");
  const box = encrypt(Buffer.from("statement"));
  assert.ok(!box.includes("statement"));
  box[box.length - 1] ^= 1;
  assert.throws(() => decrypt(box));
});

test("initials ignore punctuation", () => {
  assert.equal(initials("Cedar & Pine Studio"), "CP");
  assert.equal(initials(""), "?");
});
