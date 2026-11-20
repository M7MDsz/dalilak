import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  reactStrictMode: true,
  // A second production build for measuring, beside the stage one: DALILAK_DIST_DIR=.next/perf (unset: .next as always).
  distDir: process.env.DALILAK_DIST_DIR || ".next",
  devIndicators: false,
  // This folder is the whole project (a parent folder holds unrelated lockfiles).
  turbopack: { root },
  // CV parsing libraries run on the server only; keep them out of the bundler.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default config;
