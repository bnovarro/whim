const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The @anthropic-ai/sdk package uses OpenTelemetry with a dynamic import()
// that Hermes (React Native's JS engine) cannot handle. Stub it out so the
// build succeeds — Whim calls the Anthropic API server-side anyway.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
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

module.exports = config;
