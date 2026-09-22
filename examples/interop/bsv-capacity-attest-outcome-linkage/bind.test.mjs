// Offline demonstration of the normative "Verifier requirements" (README).
// Runs with zero network: it uses only the pinned claim on disk, the vendored
// content-address + signature-recovery verifier, and the reference bind. No
// WhatsOnChain read. `node --test` picks it up automatically.
//
// The point it makes concrete: content addressing + signature recovery are
// BEARER checks (they pass for whoever holds the claim), and the claim becomes
// the verifier's OWN only once it is bound to the settlement the verifier paid.
// A different settlement, or no expected settlement at all, must be refused.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { verifyClaim } from "./bsv-claim.mjs";
import { bindClaim } from "./bind.mjs";

const claim = JSON.parse(
  await readFile(new URL("./claim_inference.json", import.meta.url), "utf8"),
);

test("bearer property: the claim's own checks verify for any holder", () => {
  // No payer/verifier identity is involved here: content address + signature
  // recovery hold for a copy of the claim in anyone's hands. That is exactly why
  // a bind is required.
  assert.deepEqual(verifyClaim(claim), { ok: true });
});

test("bound to the settlement the verifier paid: accepted", () => {
  const paid = { settlementRef: claim.settlementRef }; // from the verifier's own context
  assert.deepEqual(bindClaim(claim, paid), { ok: true });
});

test("bound to a DIFFERENT settlement (replay/transfer): refused", () => {
  const otherTxid = "0".repeat(64);
  assert.equal(bindClaim(claim, { settlementRef: otherTxid }).reason, "settlementRef_not_mine");
});

test("UNBOUND (no expected settlement supplied): refused, not silently passed", () => {
  assert.match(bindClaim(claim, {}).reason, /^unbound/);
  assert.match(bindClaim(claim).reason, /^unbound/);
});

test("bound with the wrong payer address (a transferred claim): refused", () => {
  const notMine = { settlementRef: claim.settlementRef, buyerAddress: "1SomeoneElseAddressxxxxxxxxxxxxxxx" };
  assert.equal(bindClaim(claim, notMine).reason, "buyerAddress_not_mine");
});

test("the whole acceptance rule: verify the claim, then bind it to my payment", () => {
  const v = verifyClaim(claim);
  assert.equal(v.ok, true);
  const b = bindClaim(claim, { settlementRef: claim.settlementRef, buyerAddress: claim.buyerAddress });
  assert.equal(b.ok, true);
});
