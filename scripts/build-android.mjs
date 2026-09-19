#!/usr/bin/env node
/**
 * Bundle Cluckyard as a local-asset Android app (Capacitor).
 * Output: dist-android/ + android/app/build/outputs/apk/debug/app-debug.apk
 */
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "/opt/android-sdk";
const javaHome = process.env.JAVA_HOME || (existsSync("/opt/jdk21") ? "/opt/jdk21" : "");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ANDROID_HOME: androidHome,
      ANDROID_SDK_ROOT: androidHome,
      ...(javaHome ? { JAVA_HOME: javaHome } : {}),
      PATH: `${javaHome ? `${javaHome}/bin:` : ""}${androidHome}/cmdline-tools/latest/bin:${androidHome}/platform-tools:${androidHome}/build-tools/35.0.0:${process.env.PATH}`,
    },
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("[android] building web bundle");
run("npx", ["vite", "build", "--config", "vite.android.config.ts"]);

const dist = join(root, "dist-android");
const builtHtml = join(dist, "android.html");
const indexHtml = join(dist, "index.html");
if (existsSync(builtHtml)) {
  const html = readFileSync(builtHtml, "utf8");
  writeFileSync(indexHtml, html);
}

if (!existsSync(indexHtml)) {
  console.error("[android] dist-android/index.html missing");
  process.exit(1);
}

const androidDir = join(root, "android");
if (!existsSync(androidDir)) {
  console.log("[android] adding Capacitor Android platform");
  run("npx", ["cap", "add", "android"]);
} else {
  console.log("[android] syncing");
  run("npx", ["cap", "sync", "android"]);
}

const localProps = join(androidDir, "local.properties");
writeFileSync(localProps, `sdk.dir=${androidHome.replace(/\\/g, "/")}\n`);

console.log("[android] assembling debug APK");
run("./gradlew", ["assembleDebug", "--no-daemon"], { cwd: androidDir });

const apk = join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
if (!existsSync(apk)) {
  console.error("[android] APK missing:", apk);
  process.exit(1);
}

const pack = join(root, "artifacts", "Games", "Cluckyard");
mkdirSync(pack, { recursive: true });
copyFileSync(apk, join(pack, "Cluckyard.apk"));
copyFileSync(join(root, "README-ANDROID.md"), join(pack, "README.txt"));
console.log("[android] APK ->", join(pack, "Cluckyard.apk"));
