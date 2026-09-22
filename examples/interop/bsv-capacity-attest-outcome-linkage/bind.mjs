// Reference implementation of the normative "Verifier requirements" in the
// README: bind a content-addressed settlement attestation to the payment the
// verifier ITSELF made. A verified claim (content address + signature recovery)
// is still a bearer object; this is the step that makes it the verifier's own.
//
// The expected values MUST come from the verifier's own context (the txid it
// paid, the address it paid from), never be read back out of the claim. So an
// absent expected.settlementRef is a REFUSAL, not a skip. This mirrors
// verifySettlement({ ..., expected }) in the producer repo and bindX402Receipt()
// in @bsvkey/x402-bsv-client. Pure and offline: it checks the binding only, and
// does not itself read the chain (verifySettlement does that, once bound).
//
// Note the two comparison rules: a BSV txid is hex and compared
// case-insensitively; a base58 P2PKH address is case-SENSITIVE and compared
// exactly (lower-casing an address would accept a different address).
export function bindClaim(claim, expected = {}) {
  if (!expected || typeof expected !== "object" || !expected.settlementRef) {
    return { ok: false, reason: "unbound: verifier must supply the settlementRef it paid" };
  }
  if (String(claim.settlementRef).toLowerCase() !== String(expected.settlementRef).toLowerCase()) {
    return { ok: false, reason: "settlementRef_not_mine" };
  }
  if (expected.buyerAddress !== undefined && claim.buyerAddress !== expected.buyerAddress) {
    return { ok: false, reason: "buyerAddress_not_mine" };
  }
  if (expected.sellerAddress !== undefined && claim.sellerAddress !== expected.sellerAddress) {
    return { ok: false, reason: "sellerAddress_not_mine" };
  }
  return { ok: true };
}
