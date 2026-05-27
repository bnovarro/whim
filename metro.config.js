const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ─── Fix: @supabase/supabase-js ESM build + Hermes incompatibility ───────────
// The .mjs build uses `import(OTEL_PKG)` — a dynamic import with a variable
// argument — which Hermes cannot parse at bundle time. The .cjs build uses
// `require(s)` instead, which Hermes handles fine.
// Force Metro to always resolve @supabase/supabase-js to its CJS build.
const SUPABASE_CJS = path.resolve(
  __dirname,
  'node_modules/@supabase/supabase-js/dist/index.cjs'
);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect supabase-js to CJS to avoid Hermes dynamic-import parse error
  if (moduleName === '@supabase/supabase-js') {
    return { filePath: SUPABASE_CJS, type: 'sourceFile' };
  }

  // Stub out OpenTelemetry — not needed at runtime in the mobile app
  if (
    moduleName === '@opentelemetry/api' ||
    moduleName.startsWith('@opentelemetry/')
  ) {
    return { type: 'empty' };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Make sure Metro can parse .cjs files (needed for the supabase CJS build)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts.filter((e) => e !== 'cjs'),
  'cjs',
];

module.exports = config;
