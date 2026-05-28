/**
 * Custom entry point. Runs BEFORE expo-router/entry so JS error handlers
 * are in place before ANY other module-level code has a chance to throw.
 *
 * Crash chain we're defending against (symbolicated from Build 22 dSYM):
 *   any uncaught JS error
 *     → React Native's default ErrorUtils global handler
 *     → NativeModules.RCTExceptionsManager.reportException({isFatal:true})
 *     → RCTExceptionsManager.reportFatal:
 *     → RCTFormatError
 *     → abort()
 *
 * We replace BOTH paths into reportException so no JS error can ever
 * reach the native fatal-reporter. CommonJS-only, inline — no TS or
 * ESM/CJS interop concerns; this is the very first JS to run in the
 * bundle and it must not itself throw.
 */

(function installErrorHandlers() {
  try {
    var g = global || this;

    // ---- Synchronous JS throws + bubbled event/render errors ----
    if (g.ErrorUtils && typeof g.ErrorUtils.setGlobalHandler === 'function') {
      g.ErrorUtils.setGlobalHandler(function (error, isFatal) {
        try {
          var tag = isFatal ? '[FATAL]' : '[error]';
          var msg = (error && error.message) || String(error);
          var stack = (error && error.stack) || '';
          // eslint-disable-next-line no-console
          console.warn(
            '[global-error] ' +
              tag +
              ' ' +
              msg +
              '\n' +
              stack.split('\n').slice(0, 5).join('\n')
          );
        } catch (e) {
          // Swallow any error in logging itself.
        }
        // CRITICAL: do not call any function that would bridge to native
        // RCTExceptionsManager.reportException — that is the abort path.
      });
    }

    // ---- Unhandled promise rejections ----
    if (
      g.HermesInternal &&
      typeof g.HermesInternal.enablePromiseRejectionTracker === 'function'
    ) {
      g.HermesInternal.enablePromiseRejectionTracker({
        allRejections: true,
        onUnhandled: function (id, reason) {
          try {
            // eslint-disable-next-line no-console
            console.warn('[unhandled rejection ' + id + ']', reason);
          } catch (e) {
            // ignore
          }
        },
        onHandled: function () {
          // no-op
        },
      });
    }
  } catch (e) {
    // If even installing the handlers throws, log + carry on. We absolutely
    // must NOT let this file itself crash the app.
    try {
      // eslint-disable-next-line no-console
      console.warn('[install-error-handlers] failed:', e);
    } catch (_) {
      // last resort: silent
    }
  }
})();

require('expo-router/entry');
