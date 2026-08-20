import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

test("uses Supabase for class BGM data and storage", () => {
  assert.match(page, /CLASS_BGM_TABLE/);
  assert.match(page, /CLASS_BGM_BUCKET/);
  assert.match(page, /migration_state/);
  assert.equal(packageJson.dependencies.firebase, undefined);
});

test("does not eagerly download every audio file", () => {
  assert.doesNotMatch(page, /Promise\.all\(\[warmNext/);
  assert.doesNotMatch(page, /URL\.createObjectURL/);
  assert.match(page, /preload = "metadata"/);
});

test("allows content management without administrator authentication", () => {
  assert.doesNotMatch(page, /playwell_site_admins/);
  assert.doesNotMatch(page, /signInWithOAuth/);
  assert.doesNotMatch(page, /isAdmin/);
  assert.match(page, /새 버튼 추가/);
  assert.match(page, /onClick=\{\(\) => openEdit\(button\)\}/);
  assert.match(page, /\.delete\(\)/);
});
