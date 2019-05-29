/* eslint-disable global-require, consistent-return */
const ErrorOverlay = require('react-error-overlay');
const launchEditorEndpoint = require('react-dev-utils/launchEditorEndpoint');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const stripAnsi = require('strip-ansi');

(function hotClientEntry() {
  // eslint-disable-next-line no-underscore-dangle
  if (window.__webpackHotClient__) {
    return;
  }

  // eslint-disable-next-line no-underscore-dangle
  window.__webpackHotClient__ = {};

  // this is piped in at runtime build via DefinePlugin in /lib/plugins.js
  // eslint-disable-next-line no-unused-vars, no-undef
  const options = __hotClientOptions__;

  const log = require('./log'); // eslint-disable-line import/order

  log.level = options.logLevel;

  const update = require('./hot');
  const socket = require('./socket');

  if (!options) {
    throw new Error(
      'Something went awry and __hotClientOptions__ is undefined. Possible bad build. HMR cannot be enabled.'
    );
  }

  let currentHash;
  let initial = true;
  let isUnloading;
  let hasCompileErrors = false;
  let hadRuntimeErrors = false;

  const clearOutdatedErrors = () => {
    // Clean up outdated compile errors, if any.
    if (typeof console !== 'undefined' && typeof console.clear === 'function') {
      if (hasCompileErrors) {
        console.clear();
      }
    }
  };

  let dismissOverlayRuntimeErrors;
  let enableOverlayRuntimeErrors;
  const tryDismissErrorOverlay = () => {
    try {
      ErrorOverlay.dismissBuildError();
    } catch (err) {}
  };

  if (process.env.ERROR_OVERLAY) {
    ErrorOverlay.setEditorHandler((errorLocation) => {
      fetch(
        `${launchEditorEndpoint}?fileName=${window.encodeURIComponent(
          errorLocation.fileName
        )}&lineNumber=${window.encodeURIComponent(
          errorLocation.lineNumber || 1
        )}&colNumber=${window.encodeURIComponent(errorLocation.colNumber || 1)}`
      );
    });

    dismissOverlayRuntimeErrors = () => {
      try {
        ErrorOverlay.stopReportingRuntimeErrors();
      } catch (err) {}
    };

    enableOverlayRuntimeErrors = () => {
      ErrorOverlay.startReportingRuntimeErrors({
        onError: function onError() {
          hadRuntimeErrors = true;
        },
      }); // eslint-disable-next-line no-underscore-dangle

      if (hasCompileErrors) {
        tryDismissErrorOverlay();
        hasCompileErrors = false;
      }
    };

    enableOverlayRuntimeErrors();
  }

  window.addEventListener('beforeunload', () => {
    isUnloading = true;
  });

  function reload() {
    if (isUnloading) {
      return;
    }

    if (options.hmr) {
      log.info('App Updated, Reloading Modules');
      if (hadRuntimeErrors) {
        window.location.reload();
        return;
      }

      if (process.env.ERROR_OVERLAY) {
        update(
          currentHash,
          options,
          dismissOverlayRuntimeErrors,
          enableOverlayRuntimeErrors
        );
      } else update(currentHash, options);
    } else if (options.reload) {
      log.info('Refreshing Page');
      window.location.reload();
    } else {
      log.warn('Please refresh the page manually.');
      log.info('The `hot` and `reload` options are set to false.');
    }
  }

  socket(options, {
    compile({ compilerName }) {
      log.info(`webpack: Compiling (${compilerName})`);
    },

    errors({ errors }) {
      log.error(
        'webpack: Encountered errors while compiling. Reload prevented.'
      );

      if (process.env.ERROR_OVERLAY) {
        clearOutdatedErrors();
        hasCompileErrors = true; // isFirstCompilation = false;
        // hasCompileErrors = true;
        // "Massage" webpack messages.

        const formatted = formatWebpackMessages({
          errors,
          warnings: [],
        });

        // Only show the first error.
        ErrorOverlay.reportBuildError(formatted.errors[0]);

        if (
          typeof console !== 'undefined' &&
          typeof console.error === 'function'
        ) {
          for (let i = 0; i < formatted.errors.length; i++) {
            console.error(stripAnsi(formatted.errors[i]));
          }
        }
      } else {
        for (let i = 0; i < errors.length; i++) {
          log.error(errors[i]);
        }
      }
    },

    hash({ hash }) {
      currentHash = hash;
    },

    invalid({ fileName }) {
      log.info(`App updated. Recompiling ${fileName}`);
    },

    ok() {
      clearOutdatedErrors();
      if (initial) {
        initial = false;
        return initial;
      }

      reload('ok');
    },

    'window-reload': () => {
      window.location.reload();
    },

    warnings({ warnings }) {
      log.warn('Warnings while compiling.');

      for (let i = 0; i < warnings.length; i++) {
        log.warn(warnings[i]);
      }

      if (initial) {
        initial = false;
        // return initial;
      }

      reload('warnings');
    },
  });
})();
