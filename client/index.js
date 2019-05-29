"use strict";

/* eslint-disable global-require, consistent-return */
var ErrorOverlay = require('react-error-overlay');

var launchEditorEndpoint = require('react-dev-utils/launchEditorEndpoint');

var formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

var stripAnsi = require('strip-ansi');

(function hotClientEntry() {
  // eslint-disable-next-line no-underscore-dangle
  if (window.__webpackHotClient__) {
    return;
  } // eslint-disable-next-line no-underscore-dangle


  window.__webpackHotClient__ = {}; // this is piped in at runtime build via DefinePlugin in /lib/plugins.js
  // eslint-disable-next-line no-unused-vars, no-undef

  var options = __hotClientOptions__;

  var log = require('./log'); // eslint-disable-line import/order


  log.level = options.logLevel;

  var update = require('./hot');

  var socket = require('./socket');

  if (!options) {
    throw new Error('Something went awry and __hotClientOptions__ is undefined. Possible bad build. HMR cannot be enabled.');
  }

  var currentHash;
  var initial = true;
  var isUnloading;
  var hasCompileErrors = false;
  var hadRuntimeErrors = false;

  var clearOutdatedErrors = function clearOutdatedErrors() {
    // Clean up outdated compile errors, if any.
    if (typeof console !== 'undefined' && typeof console.clear === 'function') {
      if (hasCompileErrors) {
        console.clear();
      }
    }
  };

  var dismissOverlayRuntimeErrors;
  var enableOverlayRuntimeErrors;

  var tryDismissErrorOverlay = function tryDismissErrorOverlay() {
    try {
      ErrorOverlay.dismissBuildError();
    } catch (err) {}
  };

  if (process.env.ERROR_OVERLAY) {
    ErrorOverlay.setEditorHandler(function (errorLocation) {
      fetch("".concat(launchEditorEndpoint, "?fileName=").concat(window.encodeURIComponent(errorLocation.fileName), "&lineNumber=").concat(window.encodeURIComponent(errorLocation.lineNumber || 1), "&colNumber=").concat(window.encodeURIComponent(errorLocation.colNumber || 1)));
    });

    dismissOverlayRuntimeErrors = function dismissOverlayRuntimeErrors() {
      try {
        ErrorOverlay.stopReportingRuntimeErrors();
      } catch (err) {}
    };

    enableOverlayRuntimeErrors = function enableOverlayRuntimeErrors() {
      ErrorOverlay.startReportingRuntimeErrors({
        onError: function onError() {
          hadRuntimeErrors = true;
        }
      }); // eslint-disable-next-line no-underscore-dangle

      if (hasCompileErrors) {
        tryDismissErrorOverlay();
        hasCompileErrors = false;
      }
    };

    enableOverlayRuntimeErrors();
  }

  window.addEventListener('beforeunload', function () {
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
        update(currentHash, options, dismissOverlayRuntimeErrors, enableOverlayRuntimeErrors);
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
    compile: function compile(_ref) {
      var compilerName = _ref.compilerName;
      log.info("webpack: Compiling (".concat(compilerName, ")"));
    },
    errors: function errors(_ref2) {
      var _errors = _ref2.errors;
      log.error('webpack: Encountered errors while compiling. Reload prevented.');

      if (process.env.ERROR_OVERLAY) {
        clearOutdatedErrors();
        hasCompileErrors = true; // isFirstCompilation = false;
        // hasCompileErrors = true;
        // "Massage" webpack messages.

        var formatted = formatWebpackMessages({
          errors: _errors,
          warnings: []
        }); // Only show the first error.

        ErrorOverlay.reportBuildError(formatted.errors[0]);

        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          for (var i = 0; i < formatted.errors.length; i++) {
            console.error(stripAnsi(formatted.errors[i]));
          }
        }
      } else {
        for (var _i = 0; _i < _errors.length; _i++) {
          log.error(_errors[_i]);
        }
      }
    },
    hash: function hash(_ref3) {
      var _hash = _ref3.hash;
      currentHash = _hash;
    },
    invalid: function invalid(_ref4) {
      var fileName = _ref4.fileName;
      log.info("App updated. Recompiling ".concat(fileName));
    },
    ok: function ok() {
      clearOutdatedErrors();

      if (initial) {
        initial = false;
        return initial;
      }

      reload('ok');
    },
    'window-reload': function windowReload() {
      window.location.reload();
    },
    warnings: function warnings(_ref5) {
      var _warnings = _ref5.warnings;
      log.warn('Warnings while compiling.');

      for (var i = 0; i < _warnings.length; i++) {
        log.warn(_warnings[i]);
      }

      if (initial) {
        initial = false; // return initial;
      }

      reload('warnings');
    }
  });
})();