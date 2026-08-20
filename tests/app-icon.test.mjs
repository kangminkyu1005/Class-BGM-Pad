import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const manifest = JSON.parse(
  readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
);

test("publishes shortcut and home-screen icon metadata", () => {
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(layout, /\/favicon-32\.png/);
  assert.match(layout, /\/apple-touch-icon\.png/);
  assert.match(layout, /themeColor: "#067772"/);
  assert.equal(manifest.name, "PLAYWELL Class BGM");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(
    manifest.icons.map(({ sizes }) => sizes),
    ["192x192", "512x512"],
  );
});
