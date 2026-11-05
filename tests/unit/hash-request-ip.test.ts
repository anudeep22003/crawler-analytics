import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { hashRequestIp } from "../../supabase/functions/_shared/hash-request-ip.ts";

const TEST_IP = "203.0.113.42";
const EXPECTED_HASH = createHash("sha256").update(TEST_IP).digest("hex");

test("hashes the gateway IP into a deterministic 64-character digest", async () => {
  const headers = new Headers({ "cf-connecting-ip": ` ${TEST_IP} ` });
  assert.equal(await hashRequestIp(headers), EXPECTED_HASH);
  assert.match(EXPECTED_HASH, /^[a-f0-9]{64}$/);
});

test("prefers Cloudflare metadata over the fallback header", async () => {
  assert.equal(
    await hashRequestIp(
      new Headers({
        "cf-connecting-ip": TEST_IP,
        "x-real-ip": "192.0.2.1",
      }),
    ),
    EXPECTED_HASH,
  );
  assert.equal(
    await hashRequestIp(new Headers({ "x-real-ip": TEST_IP })),
    EXPECTED_HASH,
  );
});

test("normalizes equivalent IPv6 addresses", async () => {
  const expanded = await hashRequestIp(
    new Headers({
      "cf-connecting-ip": "2001:0DB8:0000:0000:0000:0000:0000:0001",
    }),
  );
  const compressed = await hashRequestIp(
    new Headers({ "cf-connecting-ip": "2001:db8::1" }),
  );
  assert.equal(expanded, compressed);
  assert.equal(
    compressed,
    createHash("sha256").update("2001:db8::1").digest("hex"),
  );
});

test("leaves missing, invalid, or ambiguous IP metadata unset", async () => {
  for (const value of [
    "",
    "unknown",
    "999.1.2.3",
    "203.0.113.42, 192.0.2.1",
    "203.0.113.42:443",
    "fe80::1%eth0",
  ]) {
    assert.equal(
      await hashRequestIp(new Headers({ "cf-connecting-ip": value })),
      null,
    );
  }
  assert.equal(await hashRequestIp(new Headers()), null);
  assert.equal(
    await hashRequestIp(new Headers({ "x-forwarded-for": TEST_IP })),
    null,
  );
});
