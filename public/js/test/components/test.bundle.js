(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * QUnit 1.22.0
 * https://qunitjs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2016-02-23T15:57Z
 */

(function( global ) {

var QUnit = {};

var Date = global.Date;
var now = Date.now || function() {
	return new Date().getTime();
};

var setTimeout = global.setTimeout;
var clearTimeout = global.clearTimeout;

// Store a local window from the global to allow direct references.
var window = global.window;

var defined = {
	document: window && window.document !== undefined,
	setTimeout: setTimeout !== undefined,
	sessionStorage: (function() {
		var x = "qunit-test-string";
		try {
			sessionStorage.setItem( x, x );
			sessionStorage.removeItem( x );
			return true;
		} catch ( e ) {
			return false;
		}
	}() )
};

var fileName = ( sourceFromStacktrace( 0 ) || "" ).replace( /(:\d+)+\)?/, "" ).replace( /.+\//, "" );
var globalStartCalled = false;
var runStarted = false;

var toString = Object.prototype.toString,
	hasOwn = Object.prototype.hasOwnProperty;

// returns a new Array with the elements that are in a but not in b
function diff( a, b ) {
	var i, j,
		result = a.slice();

	for ( i = 0; i < result.length; i++ ) {
		for ( j = 0; j < b.length; j++ ) {
			if ( result[ i ] === b[ j ] ) {
				result.splice( i, 1 );
				i--;
				break;
			}
		}
	}
	return result;
}

// from jquery.js
function inArray( elem, array ) {
	if ( array.indexOf ) {
		return array.indexOf( elem );
	}

	for ( var i = 0, length = array.length; i < length; i++ ) {
		if ( array[ i ] === elem ) {
			return i;
		}
	}

	return -1;
}

/**
 * Makes a clone of an object using only Array or Object as base,
 * and copies over the own enumerable properties.
 *
 * @param {Object} obj
 * @return {Object} New object with only the own properties (recursively).
 */
function objectValues ( obj ) {
	var key, val,
		vals = QUnit.is( "array", obj ) ? [] : {};
	for ( key in obj ) {
		if ( hasOwn.call( obj, key ) ) {
			val = obj[ key ];
			vals[ key ] = val === Object( val ) ? objectValues( val ) : val;
		}
	}
	return vals;
}

function extend( a, b, undefOnly ) {
	for ( var prop in b ) {
		if ( hasOwn.call( b, prop ) ) {

			// Avoid "Member not found" error in IE8 caused by messing with window.constructor
			// This block runs on every environment, so `global` is being used instead of `window`
			// to avoid errors on node.
			if ( prop !== "constructor" || a !== global ) {
				if ( b[ prop ] === undefined ) {
					delete a[ prop ];
				} else if ( !( undefOnly && typeof a[ prop ] !== "undefined" ) ) {
					a[ prop ] = b[ prop ];
				}
			}
		}
	}

	return a;
}

function objectType( obj ) {
	if ( typeof obj === "undefined" ) {
		return "undefined";
	}

	// Consider: typeof null === object
	if ( obj === null ) {
		return "null";
	}

	var match = toString.call( obj ).match( /^\[object\s(.*)\]$/ ),
		type = match && match[ 1 ];

	switch ( type ) {
		case "Number":
			if ( isNaN( obj ) ) {
				return "nan";
			}
			return "number";
		case "String":
		case "Boolean":
		case "Array":
		case "Set":
		case "Map":
		case "Date":
		case "RegExp":
		case "Function":
		case "Symbol":
			return type.toLowerCase();
	}
	if ( typeof obj === "object" ) {
		return "object";
	}
}

// Safe object type checking
function is( type, obj ) {
	return QUnit.objectType( obj ) === type;
}

var getUrlParams = function() {
	var i, param, name, value;
	var urlParams = {};
	var location = window.location;
	var params = location.search.slice( 1 ).split( "&" );
	var length = params.length;

	for ( i = 0; i < length; i++ ) {
		if ( params[ i ] ) {
			param = params[ i ].split( "=" );
			name = decodeURIComponent( param[ 0 ] );

			// allow just a key to turn on a flag, e.g., test.html?noglobals
			value = param.length === 1 ||
				decodeURIComponent( param.slice( 1 ).join( "=" ) ) ;
			if ( urlParams[ name ] ) {
				urlParams[ name ] = [].concat( urlParams[ name ], value );
			} else {
				urlParams[ name ] = value;
			}
		}
	}

	return urlParams;
};

// Doesn't support IE6 to IE9, it will return undefined on these browsers
// See also https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error/Stack
function extractStacktrace( e, offset ) {
	offset = offset === undefined ? 4 : offset;

	var stack, include, i;

	if ( e.stack ) {
		stack = e.stack.split( "\n" );
		if ( /^error$/i.test( stack[ 0 ] ) ) {
			stack.shift();
		}
		if ( fileName ) {
			include = [];
			for ( i = offset; i < stack.length; i++ ) {
				if ( stack[ i ].indexOf( fileName ) !== -1 ) {
					break;
				}
				include.push( stack[ i ] );
			}
			if ( include.length ) {
				return include.join( "\n" );
			}
		}
		return stack[ offset ];

	// Support: Safari <=6 only
	} else if ( e.sourceURL ) {

		// exclude useless self-reference for generated Error objects
		if ( /qunit.js$/.test( e.sourceURL ) ) {
			return;
		}

		// for actual exceptions, this is useful
		return e.sourceURL + ":" + e.line;
	}
}

function sourceFromStacktrace( offset ) {
	var error = new Error();

	// Support: Safari <=7 only, IE <=10 - 11 only
	// Not all browsers generate the `stack` property for `new Error()`, see also #636
	if ( !error.stack ) {
		try {
			throw error;
		} catch ( err ) {
			error = err;
		}
	}

	return extractStacktrace( error, offset );
}

/**
 * Config object: Maintain internal state
 * Later exposed as QUnit.config
 * `config` initialized at top of scope
 */
var config = {
	// The queue of tests to run
	queue: [],

	// block until document ready
	blocking: true,

	// by default, run previously failed tests first
	// very useful in combination with "Hide passed tests" checked
	reorder: true,

	// by default, modify document.title when suite is done
	altertitle: true,

	// HTML Reporter: collapse every test except the first failing test
	// If false, all failing tests will be expanded
	collapse: true,

	// by default, scroll to top of the page when suite is done
	scrolltop: true,

	// depth up-to which object will be dumped
	maxDepth: 5,

	// when enabled, all tests must call expect()
	requireExpects: false,

	// add checkboxes that are persisted in the query-string
	// when enabled, the id is set to `true` as a `QUnit.config` property
	urlConfig: [
		{
			id: "hidepassed",
			label: "Hide passed tests",
			tooltip: "Only show tests and assertions that fail. Stored as query-strings."
		},
		{
			id: "noglobals",
			label: "Check for Globals",
			tooltip: "Enabling this will test if any test introduces new properties on the " +
				"global object (`window` in Browsers). Stored as query-strings."
		},
		{
			id: "notrycatch",
			label: "No try-catch",
			tooltip: "Enabling this will run tests outside of a try-catch block. Makes debugging " +
				"exceptions in IE reasonable. Stored as query-strings."
		}
	],

	// Set of all modules.
	modules: [],

	// Stack of nested modules
	moduleStack: [],

	// The first unnamed module
	currentModule: {
		name: "",
		tests: []
	},

	callbacks: {}
};

var urlParams = defined.document ? getUrlParams() : {};

// Push a loose unnamed module to the modules collection
config.modules.push( config.currentModule );

if ( urlParams.filter === true ) {
	delete urlParams.filter;
}

// String search anywhere in moduleName+testName
config.filter = urlParams.filter;

config.testId = [];
if ( urlParams.testId ) {
	// Ensure that urlParams.testId is an array
	urlParams.testId = decodeURIComponent( urlParams.testId ).split( "," );
	for (var i = 0; i < urlParams.testId.length; i++ ) {
		config.testId.push( urlParams.testId[ i ] );
	}
}

var loggingCallbacks = {};

// Register logging callbacks
function registerLoggingCallbacks( obj ) {
	var i, l, key,
		callbackNames = [ "begin", "done", "log", "testStart", "testDone",
			"moduleStart", "moduleDone" ];

	function registerLoggingCallback( key ) {
		var loggingCallback = function( callback ) {
			if ( objectType( callback ) !== "function" ) {
				throw new Error(
					"QUnit logging methods require a callback function as their first parameters."
				);
			}

			config.callbacks[ key ].push( callback );
		};

		// DEPRECATED: This will be removed on QUnit 2.0.0+
		// Stores the registered functions allowing restoring
		// at verifyLoggingCallbacks() if modified
		loggingCallbacks[ key ] = loggingCallback;

		return loggingCallback;
	}

	for ( i = 0, l = callbackNames.length; i < l; i++ ) {
		key = callbackNames[ i ];

		// Initialize key collection of logging callback
		if ( objectType( config.callbacks[ key ] ) === "undefined" ) {
			config.callbacks[ key ] = [];
		}

		obj[ key ] = registerLoggingCallback( key );
	}
}

function runLoggingCallbacks( key, args ) {
	var i, l, callbacks;

	callbacks = config.callbacks[ key ];
	for ( i = 0, l = callbacks.length; i < l; i++ ) {
		callbacks[ i ]( args );
	}
}

// DEPRECATED: This will be removed on 2.0.0+
// This function verifies if the loggingCallbacks were modified by the user
// If so, it will restore it, assign the given callback and print a console warning
function verifyLoggingCallbacks() {
	var loggingCallback, userCallback;

	for ( loggingCallback in loggingCallbacks ) {
		if ( QUnit[ loggingCallback ] !== loggingCallbacks[ loggingCallback ] ) {

			userCallback = QUnit[ loggingCallback ];

			// Restore the callback function
			QUnit[ loggingCallback ] = loggingCallbacks[ loggingCallback ];

			// Assign the deprecated given callback
			QUnit[ loggingCallback ]( userCallback );

			if ( global.console && global.console.warn ) {
				global.console.warn(
					"QUnit." + loggingCallback + " was replaced with a new value.\n" +
					"Please, check out the documentation on how to apply logging callbacks.\n" +
					"Reference: https://api.qunitjs.com/category/callbacks/"
				);
			}
		}
	}
}

( function() {
	if ( !defined.document ) {
		return;
	}

	// `onErrorFnPrev` initialized at top of scope
	// Preserve other handlers
	var onErrorFnPrev = window.onerror;

	// Cover uncaught exceptions
	// Returning true will suppress the default browser handler,
	// returning false will let it run.
	window.onerror = function( error, filePath, linerNr ) {
		var ret = false;
		if ( onErrorFnPrev ) {
			ret = onErrorFnPrev( error, filePath, linerNr );
		}

		// Treat return value as window.onerror itself does,
		// Only do our handling if not suppressed.
		if ( ret !== true ) {
			if ( QUnit.config.current ) {
				if ( QUnit.config.current.ignoreGlobalErrors ) {
					return true;
				}
				QUnit.pushFailure( error, filePath + ":" + linerNr );
			} else {
				QUnit.test( "global failure", extend(function() {
					QUnit.pushFailure( error, filePath + ":" + linerNr );
				}, { validTest: true } ) );
			}
			return false;
		}

		return ret;
	};
} )();

QUnit.urlParams = urlParams;

// Figure out if we're running the tests from a server or not
QUnit.isLocal = !( defined.document && window.location.protocol !== "file:" );

// Expose the current QUnit version
QUnit.version = "1.22.0";

extend( QUnit, {

	// call on start of module test to prepend name to all tests
	module: function( name, testEnvironment, executeNow ) {
		var module, moduleFns;
		var currentModule = config.currentModule;

		if ( arguments.length === 2 ) {
			if ( testEnvironment instanceof Function ) {
				executeNow = testEnvironment;
				testEnvironment = undefined;
			}
		}

		// DEPRECATED: handles setup/teardown functions,
		// beforeEach and afterEach should be used instead
		if ( testEnvironment && testEnvironment.setup ) {
			testEnvironment.beforeEach = testEnvironment.setup;
			delete testEnvironment.setup;
		}
		if ( testEnvironment && testEnvironment.teardown ) {
			testEnvironment.afterEach = testEnvironment.teardown;
			delete testEnvironment.teardown;
		}

		module = createModule();

		moduleFns = {
			beforeEach: setHook( module, "beforeEach" ),
			afterEach: setHook( module, "afterEach" )
		};

		if ( executeNow instanceof Function ) {
			config.moduleStack.push( module );
			setCurrentModule( module );
			executeNow.call( module.testEnvironment, moduleFns );
			config.moduleStack.pop();
			module = module.parentModule || currentModule;
		}

		setCurrentModule( module );

		function createModule() {
			var parentModule = config.moduleStack.length ?
				config.moduleStack.slice( -1 )[ 0 ] : null;
			var moduleName = parentModule !== null ?
				[ parentModule.name, name ].join( " > " ) : name;
			var module = {
				name: moduleName,
				parentModule: parentModule,
				tests: []
			};

			var env = {};
			if ( parentModule ) {
				extend( env, parentModule.testEnvironment );
				delete env.beforeEach;
				delete env.afterEach;
			}
			extend( env, testEnvironment );
			module.testEnvironment = env;

			config.modules.push( module );
			return module;
		}

		function setCurrentModule( module ) {
			config.currentModule = module;
		}

	},

	// DEPRECATED: QUnit.asyncTest() will be removed in QUnit 2.0.
	asyncTest: asyncTest,

	test: test,

	skip: skip,

	only: only,

	// DEPRECATED: The functionality of QUnit.start() will be altered in QUnit 2.0.
	// In QUnit 2.0, invoking it will ONLY affect the `QUnit.config.autostart` blocking behavior.
	start: function( count ) {
		var globalStartAlreadyCalled = globalStartCalled;

		if ( !config.current ) {
			globalStartCalled = true;

			if ( runStarted ) {
				throw new Error( "Called start() outside of a test context while already started" );
			} else if ( globalStartAlreadyCalled || count > 1 ) {
				throw new Error( "Called start() outside of a test context too many times" );
			} else if ( config.autostart ) {
				throw new Error( "Called start() outside of a test context when " +
					"QUnit.config.autostart was true" );
			} else if ( !config.pageLoaded ) {

				// The page isn't completely loaded yet, so bail out and let `QUnit.load` handle it
				config.autostart = true;
				return;
			}
		} else {

			// If a test is running, adjust its semaphore
			config.current.semaphore -= count || 1;

			// If semaphore is non-numeric, throw error
			if ( isNaN( config.current.semaphore ) ) {
				config.current.semaphore = 0;

				QUnit.pushFailure(
					"Called start() with a non-numeric decrement.",
					sourceFromStacktrace( 2 )
				);
				return;
			}

			// Don't start until equal number of stop-calls
			if ( config.current.semaphore > 0 ) {
				return;
			}

			// throw an Error if start is called more often than stop
			if ( config.current.semaphore < 0 ) {
				config.current.semaphore = 0;

				QUnit.pushFailure(
					"Called start() while already started (test's semaphore was 0 already)",
					sourceFromStacktrace( 2 )
				);
				return;
			}
		}

		resumeProcessing();
	},

	// DEPRECATED: QUnit.stop() will be removed in QUnit 2.0.
	stop: function( count ) {

		// If there isn't a test running, don't allow QUnit.stop() to be called
		if ( !config.current ) {
			throw new Error( "Called stop() outside of a test context" );
		}

		// If a test is running, adjust its semaphore
		config.current.semaphore += count || 1;

		pauseProcessing();
	},

	config: config,

	is: is,

	objectType: objectType,

	extend: extend,

	load: function() {
		config.pageLoaded = true;

		// Initialize the configuration options
		extend( config, {
			stats: { all: 0, bad: 0 },
			moduleStats: { all: 0, bad: 0 },
			started: 0,
			updateRate: 1000,
			autostart: true,
			filter: ""
		}, true );

		config.blocking = false;

		if ( config.autostart ) {
			resumeProcessing();
		}
	},

	stack: function( offset ) {
		offset = ( offset || 0 ) + 2;
		return sourceFromStacktrace( offset );
	}
});

registerLoggingCallbacks( QUnit );

function begin() {
	var i, l,
		modulesLog = [];

	// If the test run hasn't officially begun yet
	if ( !config.started ) {

		// Record the time of the test run's beginning
		config.started = now();

		verifyLoggingCallbacks();

		// Delete the loose unnamed module if unused.
		if ( config.modules[ 0 ].name === "" && config.modules[ 0 ].tests.length === 0 ) {
			config.modules.shift();
		}

		// Avoid unnecessary information by not logging modules' test environments
		for ( i = 0, l = config.modules.length; i < l; i++ ) {
			modulesLog.push({
				name: config.modules[ i ].name,
				tests: config.modules[ i ].tests
			});
		}

		// The test run is officially beginning now
		runLoggingCallbacks( "begin", {
			totalTests: Test.count,
			modules: modulesLog
		});
	}

	config.blocking = false;
	process( true );
}

function process( last ) {
	function next() {
		process( last );
	}
	var start = now();
	config.depth = ( config.depth || 0 ) + 1;

	while ( config.queue.length && !config.blocking ) {
		if ( !defined.setTimeout || config.updateRate <= 0 ||
				( ( now() - start ) < config.updateRate ) ) {
			if ( config.current ) {

				// Reset async tracking for each phase of the Test lifecycle
				config.current.usedAsync = false;
			}
			config.queue.shift()();
		} else {
			setTimeout( next, 13 );
			break;
		}
	}
	config.depth--;
	if ( last && !config.blocking && !config.queue.length && config.depth === 0 ) {
		done();
	}
}

function pauseProcessing() {
	config.blocking = true;

	if ( config.testTimeout && defined.setTimeout ) {
		clearTimeout( config.timeout );
		config.timeout = setTimeout(function() {
			if ( config.current ) {
				config.current.semaphore = 0;
				QUnit.pushFailure( "Test timed out", sourceFromStacktrace( 2 ) );
			} else {
				throw new Error( "Test timed out" );
			}
			resumeProcessing();
		}, config.testTimeout );
	}
}

function resumeProcessing() {
	runStarted = true;

	// A slight delay to allow this iteration of the event loop to finish (more assertions, etc.)
	if ( defined.setTimeout ) {
		setTimeout(function() {
			if ( config.current && config.current.semaphore > 0 ) {
				return;
			}
			if ( config.timeout ) {
				clearTimeout( config.timeout );
			}

			begin();
		}, 13 );
	} else {
		begin();
	}
}

function done() {
	var runtime, passed;

	config.autorun = true;

	// Log the last module results
	if ( config.previousModule ) {
		runLoggingCallbacks( "moduleDone", {
			name: config.previousModule.name,
			tests: config.previousModule.tests,
			failed: config.moduleStats.bad,
			passed: config.moduleStats.all - config.moduleStats.bad,
			total: config.moduleStats.all,
			runtime: now() - config.moduleStats.started
		});
	}
	delete config.previousModule;

	runtime = now() - config.started;
	passed = config.stats.all - config.stats.bad;

	runLoggingCallbacks( "done", {
		failed: config.stats.bad,
		passed: passed,
		total: config.stats.all,
		runtime: runtime
	});
}

function setHook( module, hookName ) {
	if ( module.testEnvironment === undefined ) {
		module.testEnvironment = {};
	}

	return function( callback ) {
		module.testEnvironment[ hookName ] = callback;
	};
}

var focused = false;
var priorityCount = 0;

function Test( settings ) {
	var i, l;

	++Test.count;

	extend( this, settings );
	this.assertions = [];
	this.semaphore = 0;
	this.usedAsync = false;
	this.module = config.currentModule;
	this.stack = sourceFromStacktrace( 3 );

	// Register unique strings
	for ( i = 0, l = this.module.tests; i < l.length; i++ ) {
		if ( this.module.tests[ i ].name === this.testName ) {
			this.testName += " ";
		}
	}

	this.testId = generateHash( this.module.name, this.testName );

	this.module.tests.push({
		name: this.testName,
		testId: this.testId
	});

	if ( settings.skip ) {

		// Skipped tests will fully ignore any sent callback
		this.callback = function() {};
		this.async = false;
		this.expected = 0;
	} else {
		this.assert = new Assert( this );
	}
}

Test.count = 0;

Test.prototype = {
	before: function() {
		if (

			// Emit moduleStart when we're switching from one module to another
			this.module !== config.previousModule ||

				// They could be equal (both undefined) but if the previousModule property doesn't
				// yet exist it means this is the first test in a suite that isn't wrapped in a
				// module, in which case we'll just emit a moduleStart event for 'undefined'.
				// Without this, reporters can get testStart before moduleStart  which is a problem.
				!hasOwn.call( config, "previousModule" )
		) {
			if ( hasOwn.call( config, "previousModule" ) ) {
				runLoggingCallbacks( "moduleDone", {
					name: config.previousModule.name,
					tests: config.previousModule.tests,
					failed: config.moduleStats.bad,
					passed: config.moduleStats.all - config.moduleStats.bad,
					total: config.moduleStats.all,
					runtime: now() - config.moduleStats.started
				});
			}
			config.previousModule = this.module;
			config.moduleStats = { all: 0, bad: 0, started: now() };
			runLoggingCallbacks( "moduleStart", {
				name: this.module.name,
				tests: this.module.tests
			});
		}

		config.current = this;

		if ( this.module.testEnvironment ) {
			delete this.module.testEnvironment.beforeEach;
			delete this.module.testEnvironment.afterEach;
		}
		this.testEnvironment = extend( {}, this.module.testEnvironment );

		this.started = now();
		runLoggingCallbacks( "testStart", {
			name: this.testName,
			module: this.module.name,
			testId: this.testId
		});

		if ( !config.pollution ) {
			saveGlobal();
		}
	},

	run: function() {
		var promise;

		config.current = this;

		if ( this.async ) {
			QUnit.stop();
		}

		this.callbackStarted = now();

		if ( config.notrycatch ) {
			runTest( this );
			return;
		}

		try {
			runTest( this );
		} catch ( e ) {
			this.pushFailure( "Died on test #" + ( this.assertions.length + 1 ) + " " +
				this.stack + ": " + ( e.message || e ), extractStacktrace( e, 0 ) );

			// else next test will carry the responsibility
			saveGlobal();

			// Restart the tests if they're blocking
			if ( config.blocking ) {
				QUnit.start();
			}
		}

		function runTest( test ) {
			promise = test.callback.call( test.testEnvironment, test.assert );
			test.resolvePromise( promise );
		}
	},

	after: function() {
		checkPollution();
	},

	queueHook: function( hook, hookName ) {
		var promise,
			test = this;
		return function runHook() {
			config.current = test;
			if ( config.notrycatch ) {
				callHook();
				return;
			}
			try {
				callHook();
			} catch ( error ) {
				test.pushFailure( hookName + " failed on " + test.testName + ": " +
				( error.message || error ), extractStacktrace( error, 0 ) );
			}

			function callHook() {
				promise = hook.call( test.testEnvironment, test.assert );
				test.resolvePromise( promise, hookName );
			}
		};
	},

	// Currently only used for module level hooks, can be used to add global level ones
	hooks: function( handler ) {
		var hooks = [];

		function processHooks( test, module ) {
			if ( module.parentModule ) {
				processHooks( test, module.parentModule );
			}
			if ( module.testEnvironment &&
				QUnit.objectType( module.testEnvironment[ handler ] ) === "function" ) {
				hooks.push( test.queueHook( module.testEnvironment[ handler ], handler ) );
			}
		}

		// Hooks are ignored on skipped tests
		if ( !this.skip ) {
			processHooks( this, this.module );
		}
		return hooks;
	},

	finish: function() {
		config.current = this;
		if ( config.requireExpects && this.expected === null ) {
			this.pushFailure( "Expected number of assertions to be defined, but expect() was " +
				"not called.", this.stack );
		} else if ( this.expected !== null && this.expected !== this.assertions.length ) {
			this.pushFailure( "Expected " + this.expected + " assertions, but " +
				this.assertions.length + " were run", this.stack );
		} else if ( this.expected === null && !this.assertions.length ) {
			this.pushFailure( "Expected at least one assertion, but none were run - call " +
				"expect(0) to accept zero assertions.", this.stack );
		}

		var i,
			bad = 0;

		this.runtime = now() - this.started;
		config.stats.all += this.assertions.length;
		config.moduleStats.all += this.assertions.length;

		for ( i = 0; i < this.assertions.length; i++ ) {
			if ( !this.assertions[ i ].result ) {
				bad++;
				config.stats.bad++;
				config.moduleStats.bad++;
			}
		}

		runLoggingCallbacks( "testDone", {
			name: this.testName,
			module: this.module.name,
			skipped: !!this.skip,
			failed: bad,
			passed: this.assertions.length - bad,
			total: this.assertions.length,
			runtime: this.runtime,

			// HTML Reporter use
			assertions: this.assertions,
			testId: this.testId,

			// Source of Test
			source: this.stack,

			// DEPRECATED: this property will be removed in 2.0.0, use runtime instead
			duration: this.runtime
		});

		// QUnit.reset() is deprecated and will be replaced for a new
		// fixture reset function on QUnit 2.0/2.1.
		// It's still called here for backwards compatibility handling
		QUnit.reset();

		config.current = undefined;
	},

	queue: function() {
		var priority,
			test = this;

		if ( !this.valid() ) {
			return;
		}

		function run() {

			// each of these can by async
			synchronize([
				function() {
					test.before();
				},

				test.hooks( "beforeEach" ),
				function() {
					test.run();
				},

				test.hooks( "afterEach" ).reverse(),

				function() {
					test.after();
				},
				function() {
					test.finish();
				}
			]);
		}

		// Prioritize previously failed tests, detected from sessionStorage
		priority = QUnit.config.reorder && defined.sessionStorage &&
				+sessionStorage.getItem( "qunit-test-" + this.module.name + "-" + this.testName );

		return synchronize( run, priority );
	},

	pushResult: function( resultInfo ) {

		// resultInfo = { result, actual, expected, message, negative }
		var source,
			details = {
				module: this.module.name,
				name: this.testName,
				result: resultInfo.result,
				message: resultInfo.message,
				actual: resultInfo.actual,
				expected: resultInfo.expected,
				testId: this.testId,
				negative: resultInfo.negative || false,
				runtime: now() - this.started
			};

		if ( !resultInfo.result ) {
			source = sourceFromStacktrace();

			if ( source ) {
				details.source = source;
			}
		}

		runLoggingCallbacks( "log", details );

		this.assertions.push({
			result: !!resultInfo.result,
			message: resultInfo.message
		});
	},

	pushFailure: function( message, source, actual ) {
		if ( !( this instanceof Test ) ) {
			throw new Error( "pushFailure() assertion outside test context, was " +
				sourceFromStacktrace( 2 ) );
		}

		var details = {
				module: this.module.name,
				name: this.testName,
				result: false,
				message: message || "error",
				actual: actual || null,
				testId: this.testId,
				runtime: now() - this.started
			};

		if ( source ) {
			details.source = source;
		}

		runLoggingCallbacks( "log", details );

		this.assertions.push({
			result: false,
			message: message
		});
	},

	resolvePromise: function( promise, phase ) {
		var then, message,
			test = this;
		if ( promise != null ) {
			then = promise.then;
			if ( QUnit.objectType( then ) === "function" ) {
				QUnit.stop();
				then.call(
					promise,
					function() { QUnit.start(); },
					function( error ) {
						message = "Promise rejected " +
							( !phase ? "during" : phase.replace( /Each$/, "" ) ) +
							" " + test.testName + ": " + ( error.message || error );
						test.pushFailure( message, extractStacktrace( error, 0 ) );

						// else next test will carry the responsibility
						saveGlobal();

						// Unblock
						QUnit.start();
					}
				);
			}
		}
	},

	valid: function() {
		var filter = config.filter,
			regexFilter = /^(!?)\/([\w\W]*)\/(i?$)/.exec( filter ),
			module = QUnit.urlParams.module && QUnit.urlParams.module.toLowerCase(),
			fullName = ( this.module.name + ": " + this.testName );

		function testInModuleChain( testModule ) {
			var testModuleName = testModule.name ? testModule.name.toLowerCase() : null;
			if ( testModuleName === module ) {
				return true;
			} else if ( testModule.parentModule ) {
				return testInModuleChain( testModule.parentModule );
			} else {
				return false;
			}
		}

		// Internally-generated tests are always valid
		if ( this.callback && this.callback.validTest ) {
			return true;
		}

		if ( config.testId.length > 0 && inArray( this.testId, config.testId ) < 0 ) {
			return false;
		}

		if ( module && !testInModuleChain( this.module ) ) {
			return false;
		}

		if ( !filter ) {
			return true;
		}

		return regexFilter ?
			this.regexFilter( !!regexFilter[1], regexFilter[2], regexFilter[3], fullName ) :
			this.stringFilter( filter, fullName );
	},

	regexFilter: function( exclude, pattern, flags, fullName ) {
		var regex = new RegExp( pattern, flags );
		var match = regex.test( fullName );

		return match !== exclude;
	},

	stringFilter: function( filter, fullName ) {
		filter = filter.toLowerCase();
		fullName = fullName.toLowerCase();

		var include = filter.charAt( 0 ) !== "!";
		if ( !include ) {
			filter = filter.slice( 1 );
		}

		// If the filter matches, we need to honour include
		if ( fullName.indexOf( filter ) !== -1 ) {
			return include;
		}

		// Otherwise, do the opposite
		return !include;
	}
};

// Resets the test setup. Useful for tests that modify the DOM.
/*
DEPRECATED: Use multiple tests instead of resetting inside a test.
Use testStart or testDone for custom cleanup.
This method will throw an error in 2.0, and will be removed in 2.1
*/
QUnit.reset = function() {

	// Return on non-browser environments
	// This is necessary to not break on node tests
	if ( !defined.document ) {
		return;
	}

	var fixture = defined.document && document.getElementById &&
			document.getElementById( "qunit-fixture" );

	if ( fixture ) {
		fixture.innerHTML = config.fixture;
	}
};

QUnit.pushFailure = function() {
	if ( !QUnit.config.current ) {
		throw new Error( "pushFailure() assertion outside test context, in " +
			sourceFromStacktrace( 2 ) );
	}

	// Gets current test obj
	var currentTest = QUnit.config.current;

	return currentTest.pushFailure.apply( currentTest, arguments );
};

// Based on Java's String.hashCode, a simple but not
// rigorously collision resistant hashing function
function generateHash( module, testName ) {
	var hex,
		i = 0,
		hash = 0,
		str = module + "\x1C" + testName,
		len = str.length;

	for ( ; i < len; i++ ) {
		hash  = ( ( hash << 5 ) - hash ) + str.charCodeAt( i );
		hash |= 0;
	}

	// Convert the possibly negative integer hash code into an 8 character hex string, which isn't
	// strictly necessary but increases user understanding that the id is a SHA-like hash
	hex = ( 0x100000000 + hash ).toString( 16 );
	if ( hex.length < 8 ) {
		hex = "0000000" + hex;
	}

	return hex.slice( -8 );
}

function synchronize( callback, priority ) {
	var last = !priority;

	if ( QUnit.objectType( callback ) === "array" ) {
		while ( callback.length ) {
			synchronize( callback.shift() );
		}
		return;
	}

	if ( priority ) {
		config.queue.splice( priorityCount++, 0, callback );
	} else {
		config.queue.push( callback );
	}

	if ( config.autorun && !config.blocking ) {
		process( last );
	}
}

function saveGlobal() {
	config.pollution = [];

	if ( config.noglobals ) {
		for ( var key in global ) {
			if ( hasOwn.call( global, key ) ) {

				// in Opera sometimes DOM element ids show up here, ignore them
				if ( /^qunit-test-output/.test( key ) ) {
					continue;
				}
				config.pollution.push( key );
			}
		}
	}
}

function checkPollution() {
	var newGlobals,
		deletedGlobals,
		old = config.pollution;

	saveGlobal();

	newGlobals = diff( config.pollution, old );
	if ( newGlobals.length > 0 ) {
		QUnit.pushFailure( "Introduced global variable(s): " + newGlobals.join( ", " ) );
	}

	deletedGlobals = diff( old, config.pollution );
	if ( deletedGlobals.length > 0 ) {
		QUnit.pushFailure( "Deleted global variable(s): " + deletedGlobals.join( ", " ) );
	}
}

// Will be exposed as QUnit.asyncTest
function asyncTest( testName, expected, callback ) {
	if ( arguments.length === 2 ) {
		callback = expected;
		expected = null;
	}

	QUnit.test( testName, expected, callback, true );
}

// Will be exposed as QUnit.test
function test( testName, expected, callback, async ) {
	if ( focused )  { return; }

	var newTest;

	if ( arguments.length === 2 ) {
		callback = expected;
		expected = null;
	}

	newTest = new Test({
		testName: testName,
		expected: expected,
		async: async,
		callback: callback
	});

	newTest.queue();
}

// Will be exposed as QUnit.skip
function skip( testName ) {
	if ( focused )  { return; }

	var test = new Test({
		testName: testName,
		skip: true
	});

	test.queue();
}

// Will be exposed as QUnit.only
function only( testName, expected, callback, async ) {
	var newTest;

	if ( focused )  { return; }

	QUnit.config.queue.length = 0;
	focused = true;

	if ( arguments.length === 2 ) {
		callback = expected;
		expected = null;
	}

	newTest = new Test({
		testName: testName,
		expected: expected,
		async: async,
		callback: callback
	});

	newTest.queue();
}

function Assert( testContext ) {
	this.test = testContext;
}

// Assert helpers
QUnit.assert = Assert.prototype = {

	// Specify the number of expected assertions to guarantee that failed test
	// (no assertions are run at all) don't slip through.
	expect: function( asserts ) {
		if ( arguments.length === 1 ) {
			this.test.expected = asserts;
		} else {
			return this.test.expected;
		}
	},

	// Increment this Test's semaphore counter, then return a function that
	// decrements that counter a maximum of once.
	async: function( count ) {
		var test = this.test,
			popped = false,
			acceptCallCount = count;

		if ( typeof acceptCallCount === "undefined" ) {
			acceptCallCount = 1;
		}

		test.semaphore += 1;
		test.usedAsync = true;
		pauseProcessing();

		return function done() {

			if ( popped ) {
				test.pushFailure( "Too many calls to the `assert.async` callback",
					sourceFromStacktrace( 2 ) );
				return;
			}
			acceptCallCount -= 1;
			if ( acceptCallCount > 0 ) {
				return;
			}

			test.semaphore -= 1;
			popped = true;
			resumeProcessing();
		};
	},

	// Exports test.push() to the user API
	// Alias of pushResult.
	push: function( result, actual, expected, message, negative ) {
		var currentAssert = this instanceof Assert ? this : QUnit.config.current.assert;
		return currentAssert.pushResult( {
			result: result,
			actual: actual,
			expected: expected,
			message: message,
			negative: negative
		} );
	},

	pushResult: function( resultInfo ) {

		// resultInfo = { result, actual, expected, message, negative }
		var assert = this,
			currentTest = ( assert instanceof Assert && assert.test ) || QUnit.config.current;

		// Backwards compatibility fix.
		// Allows the direct use of global exported assertions and QUnit.assert.*
		// Although, it's use is not recommended as it can leak assertions
		// to other tests from async tests, because we only get a reference to the current test,
		// not exactly the test where assertion were intended to be called.
		if ( !currentTest ) {
			throw new Error( "assertion outside test context, in " + sourceFromStacktrace( 2 ) );
		}

		if ( currentTest.usedAsync === true && currentTest.semaphore === 0 ) {
			currentTest.pushFailure( "Assertion after the final `assert.async` was resolved",
				sourceFromStacktrace( 2 ) );

			// Allow this assertion to continue running anyway...
		}

		if ( !( assert instanceof Assert ) ) {
			assert = currentTest.assert;
		}

		return assert.test.pushResult( resultInfo );
	},

	ok: function( result, message ) {
		message = message || ( result ? "okay" : "failed, expected argument to be truthy, was: " +
			QUnit.dump.parse( result ) );
		this.pushResult( {
			result: !!result,
			actual: result,
			expected: true,
			message: message
		} );
	},

	notOk: function( result, message ) {
		message = message || ( !result ? "okay" : "failed, expected argument to be falsy, was: " +
			QUnit.dump.parse( result ) );
		this.pushResult( {
			result: !result,
			actual: result,
			expected: false,
			message: message
		} );
	},

	equal: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.pushResult( {
			result: expected == actual,
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notEqual: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.pushResult( {
			result: expected != actual,
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	propEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.pushResult( {
			result: QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notPropEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.pushResult( {
			result: !QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	deepEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notDeepEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: !QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	strictEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: expected === actual,
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notStrictEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: expected !== actual,
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	"throws": function( block, expected, message ) {
		var actual, expectedType,
			expectedOutput = expected,
			ok = false,
			currentTest = ( this instanceof Assert && this.test ) || QUnit.config.current;

		// 'expected' is optional unless doing string comparison
		if ( message == null && typeof expected === "string" ) {
			message = expected;
			expected = null;
		}

		currentTest.ignoreGlobalErrors = true;
		try {
			block.call( currentTest.testEnvironment );
		} catch (e) {
			actual = e;
		}
		currentTest.ignoreGlobalErrors = false;

		if ( actual ) {
			expectedType = QUnit.objectType( expected );

			// we don't want to validate thrown error
			if ( !expected ) {
				ok = true;
				expectedOutput = null;

			// expected is a regexp
			} else if ( expectedType === "regexp" ) {
				ok = expected.test( errorString( actual ) );

			// expected is a string
			} else if ( expectedType === "string" ) {
				ok = expected === errorString( actual );

			// expected is a constructor, maybe an Error constructor
			} else if ( expectedType === "function" && actual instanceof expected ) {
				ok = true;

			// expected is an Error object
			} else if ( expectedType === "object" ) {
				ok = actual instanceof expected.constructor &&
					actual.name === expected.name &&
					actual.message === expected.message;

			// expected is a validation function which returns true if validation passed
			} else if ( expectedType === "function" && expected.call( {}, actual ) === true ) {
				expectedOutput = null;
				ok = true;
			}
		}

		currentTest.assert.pushResult( {
			result: ok,
			actual: actual,
			expected: expectedOutput,
			message: message
		} );
	}
};

// Provide an alternative to assert.throws(), for environments that consider throws a reserved word
// Known to us are: Closure Compiler, Narwhal
(function() {
	/*jshint sub:true */
	Assert.prototype.raises = Assert.prototype[ "throws" ];
}());

function errorString( error ) {
	var name, message,
		resultErrorString = error.toString();
	if ( resultErrorString.substring( 0, 7 ) === "[object" ) {
		name = error.name ? error.name.toString() : "Error";
		message = error.message ? error.message.toString() : "";
		if ( name && message ) {
			return name + ": " + message;
		} else if ( name ) {
			return name;
		} else if ( message ) {
			return message;
		} else {
			return "Error";
		}
	} else {
		return resultErrorString;
	}
}

// Test for equality any JavaScript type.
// Author: Philippe Rathé <prathe@gmail.com>
QUnit.equiv = (function() {

	// Stack to decide between skip/abort functions
	var callers = [];

	// Stack to avoiding loops from circular referencing
	var parents = [];
	var parentsB = [];

	var getProto = Object.getPrototypeOf || function( obj ) {

		/*jshint proto: true */
		return obj.__proto__;
	};

	function useStrictEquality( b, a ) {

		// To catch short annotation VS 'new' annotation of a declaration. e.g.:
		// `var i = 1;`
		// `var j = new Number(1);`
		if ( typeof a === "object" ) {
			a = a.valueOf();
		}
		if ( typeof b === "object" ) {
			b = b.valueOf();
		}

		return a === b;
	}

	function compareConstructors( a, b ) {
		var protoA = getProto( a );
		var protoB = getProto( b );

		// Comparing constructors is more strict than using `instanceof`
		if ( a.constructor === b.constructor ) {
			return true;
		}

		// Ref #851
		// If the obj prototype descends from a null constructor, treat it
		// as a null prototype.
		if ( protoA && protoA.constructor === null ) {
			protoA = null;
		}
		if ( protoB && protoB.constructor === null ) {
			protoB = null;
		}

		// Allow objects with no prototype to be equivalent to
		// objects with Object as their constructor.
		if ( ( protoA === null && protoB === Object.prototype ) ||
				( protoB === null && protoA === Object.prototype ) ) {
			return true;
		}

		return false;
	}

	function getRegExpFlags( regexp ) {
		return "flags" in regexp ? regexp.flags : regexp.toString().match( /[gimuy]*$/ )[ 0 ];
	}

	var callbacks = {
		"string": useStrictEquality,
		"boolean": useStrictEquality,
		"number": useStrictEquality,
		"null": useStrictEquality,
		"undefined": useStrictEquality,
		"symbol": useStrictEquality,
		"date": useStrictEquality,

		"nan": function() {
			return true;
		},

		"regexp": function( b, a ) {
			return a.source === b.source &&

				// Include flags in the comparison
				getRegExpFlags( a ) === getRegExpFlags( b );
		},

		// - skip when the property is a method of an instance (OOP)
		// - abort otherwise,
		// initial === would have catch identical references anyway
		"function": function() {
			var caller = callers[ callers.length - 1 ];
			return caller !== Object && typeof caller !== "undefined";
		},

		"array": function( b, a ) {
			var i, j, len, loop, aCircular, bCircular;

			len = a.length;
			if ( len !== b.length ) {
				// safe and faster
				return false;
			}

			// Track reference to avoid circular references
			parents.push( a );
			parentsB.push( b );
			for ( i = 0; i < len; i++ ) {
				loop = false;
				for ( j = 0; j < parents.length; j++ ) {
					aCircular = parents[ j ] === a[ i ];
					bCircular = parentsB[ j ] === b[ i ];
					if ( aCircular || bCircular ) {
						if ( a[ i ] === b[ i ] || aCircular && bCircular ) {
							loop = true;
						} else {
							parents.pop();
							parentsB.pop();
							return false;
						}
					}
				}
				if ( !loop && !innerEquiv( a[ i ], b[ i ] ) ) {
					parents.pop();
					parentsB.pop();
					return false;
				}
			}
			parents.pop();
			parentsB.pop();
			return true;
		},

		"set": function( b, a ) {
			var aArray, bArray;

			aArray = [];
			a.forEach( function( v ) {
				aArray.push( v );
			});
			bArray = [];
			b.forEach( function( v ) {
				bArray.push( v );
			});

			return innerEquiv( bArray, aArray );
		},

		"map": function( b, a ) {
			var aArray, bArray;

			aArray = [];
			a.forEach( function( v, k ) {
				aArray.push( [ k, v ] );
			});
			bArray = [];
			b.forEach( function( v, k ) {
				bArray.push( [ k, v ] );
			});

			return innerEquiv( bArray, aArray );
		},

		"object": function( b, a ) {
			var i, j, loop, aCircular, bCircular;

			// Default to true
			var eq = true;
			var aProperties = [];
			var bProperties = [];

			if ( compareConstructors( a, b ) === false ) {
				return false;
			}

			// Stack constructor before traversing properties
			callers.push( a.constructor );

			// Track reference to avoid circular references
			parents.push( a );
			parentsB.push( b );

			// Be strict: don't ensure hasOwnProperty and go deep
			for ( i in a ) {
				loop = false;
				for ( j = 0; j < parents.length; j++ ) {
					aCircular = parents[ j ] === a[ i ];
					bCircular = parentsB[ j ] === b[ i ];
					if ( aCircular || bCircular ) {
						if ( a[ i ] === b[ i ] || aCircular && bCircular ) {
							loop = true;
						} else {
							eq = false;
							break;
						}
					}
				}
				aProperties.push( i );
				if ( !loop && !innerEquiv( a[ i ], b[ i ] ) ) {
					eq = false;
					break;
				}
			}

			parents.pop();
			parentsB.pop();

			// Unstack, we are done
			callers.pop();

			for ( i in b ) {

				// Collect b's properties
				bProperties.push( i );
			}

			// Ensures identical properties name
			return eq && innerEquiv( aProperties.sort(), bProperties.sort() );
		}
	};

	function typeEquiv( a, b ) {
		var type = QUnit.objectType( a );
		return QUnit.objectType( b ) === type && callbacks[ type ]( b, a );
	}

	// The real equiv function
	function innerEquiv( a, b ) {

		// We're done when there's nothing more to compare
		if ( arguments.length < 2 ) {
			return true;
		}

		// Require type-specific equality
		return ( a === b || typeEquiv( a, b ) ) &&

			// ...across all consecutive argument pairs
			( arguments.length === 2 || innerEquiv.apply( this, [].slice.call( arguments, 1 ) ) );
	}

	return innerEquiv;
}());

// Based on jsDump by Ariel Flesler
// http://flesler.blogspot.com/2008/05/jsdump-pretty-dump-of-any-javascript.html
QUnit.dump = (function() {
	function quote( str ) {
		return "\"" + str.toString().replace( /\\/g, "\\\\" ).replace( /"/g, "\\\"" ) + "\"";
	}
	function literal( o ) {
		return o + "";
	}
	function join( pre, arr, post ) {
		var s = dump.separator(),
			base = dump.indent(),
			inner = dump.indent( 1 );
		if ( arr.join ) {
			arr = arr.join( "," + s + inner );
		}
		if ( !arr ) {
			return pre + post;
		}
		return [ pre, inner + arr, base + post ].join( s );
	}
	function array( arr, stack ) {
		var i = arr.length,
			ret = new Array( i );

		if ( dump.maxDepth && dump.depth > dump.maxDepth ) {
			return "[object Array]";
		}

		this.up();
		while ( i-- ) {
			ret[ i ] = this.parse( arr[ i ], undefined, stack );
		}
		this.down();
		return join( "[", ret, "]" );
	}

	var reName = /^function (\w+)/,
		dump = {

			// objType is used mostly internally, you can fix a (custom) type in advance
			parse: function( obj, objType, stack ) {
				stack = stack || [];
				var res, parser, parserType,
					inStack = inArray( obj, stack );

				if ( inStack !== -1 ) {
					return "recursion(" + ( inStack - stack.length ) + ")";
				}

				objType = objType || this.typeOf( obj  );
				parser = this.parsers[ objType ];
				parserType = typeof parser;

				if ( parserType === "function" ) {
					stack.push( obj );
					res = parser.call( this, obj, stack );
					stack.pop();
					return res;
				}
				return ( parserType === "string" ) ? parser : this.parsers.error;
			},
			typeOf: function( obj ) {
				var type;
				if ( obj === null ) {
					type = "null";
				} else if ( typeof obj === "undefined" ) {
					type = "undefined";
				} else if ( QUnit.is( "regexp", obj ) ) {
					type = "regexp";
				} else if ( QUnit.is( "date", obj ) ) {
					type = "date";
				} else if ( QUnit.is( "function", obj ) ) {
					type = "function";
				} else if ( obj.setInterval !== undefined &&
						obj.document !== undefined &&
						obj.nodeType === undefined ) {
					type = "window";
				} else if ( obj.nodeType === 9 ) {
					type = "document";
				} else if ( obj.nodeType ) {
					type = "node";
				} else if (

					// native arrays
					toString.call( obj ) === "[object Array]" ||

					// NodeList objects
					( typeof obj.length === "number" && obj.item !== undefined &&
					( obj.length ? obj.item( 0 ) === obj[ 0 ] : ( obj.item( 0 ) === null &&
					obj[ 0 ] === undefined ) ) )
				) {
					type = "array";
				} else if ( obj.constructor === Error.prototype.constructor ) {
					type = "error";
				} else {
					type = typeof obj;
				}
				return type;
			},
			separator: function() {
				return this.multiline ? this.HTML ? "<br />" : "\n" : this.HTML ? "&#160;" : " ";
			},
			// extra can be a number, shortcut for increasing-calling-decreasing
			indent: function( extra ) {
				if ( !this.multiline ) {
					return "";
				}
				var chr = this.indentChar;
				if ( this.HTML ) {
					chr = chr.replace( /\t/g, "   " ).replace( / /g, "&#160;" );
				}
				return new Array( this.depth + ( extra || 0 ) ).join( chr );
			},
			up: function( a ) {
				this.depth += a || 1;
			},
			down: function( a ) {
				this.depth -= a || 1;
			},
			setParser: function( name, parser ) {
				this.parsers[ name ] = parser;
			},
			// The next 3 are exposed so you can use them
			quote: quote,
			literal: literal,
			join: join,
			//
			depth: 1,
			maxDepth: QUnit.config.maxDepth,

			// This is the list of parsers, to modify them, use dump.setParser
			parsers: {
				window: "[Window]",
				document: "[Document]",
				error: function( error ) {
					return "Error(\"" + error.message + "\")";
				},
				unknown: "[Unknown]",
				"null": "null",
				"undefined": "undefined",
				"function": function( fn ) {
					var ret = "function",

						// functions never have name in IE
						name = "name" in fn ? fn.name : ( reName.exec( fn ) || [] )[ 1 ];

					if ( name ) {
						ret += " " + name;
					}
					ret += "( ";

					ret = [ ret, dump.parse( fn, "functionArgs" ), "){" ].join( "" );
					return join( ret, dump.parse( fn, "functionCode" ), "}" );
				},
				array: array,
				nodelist: array,
				"arguments": array,
				object: function( map, stack ) {
					var keys, key, val, i, nonEnumerableProperties,
						ret = [];

					if ( dump.maxDepth && dump.depth > dump.maxDepth ) {
						return "[object Object]";
					}

					dump.up();
					keys = [];
					for ( key in map ) {
						keys.push( key );
					}

					// Some properties are not always enumerable on Error objects.
					nonEnumerableProperties = [ "message", "name" ];
					for ( i in nonEnumerableProperties ) {
						key = nonEnumerableProperties[ i ];
						if ( key in map && inArray( key, keys ) < 0 ) {
							keys.push( key );
						}
					}
					keys.sort();
					for ( i = 0; i < keys.length; i++ ) {
						key = keys[ i ];
						val = map[ key ];
						ret.push( dump.parse( key, "key" ) + ": " +
							dump.parse( val, undefined, stack ) );
					}
					dump.down();
					return join( "{", ret, "}" );
				},
				node: function( node ) {
					var len, i, val,
						open = dump.HTML ? "&lt;" : "<",
						close = dump.HTML ? "&gt;" : ">",
						tag = node.nodeName.toLowerCase(),
						ret = open + tag,
						attrs = node.attributes;

					if ( attrs ) {
						for ( i = 0, len = attrs.length; i < len; i++ ) {
							val = attrs[ i ].nodeValue;

							// IE6 includes all attributes in .attributes, even ones not explicitly
							// set. Those have values like undefined, null, 0, false, "" or
							// "inherit".
							if ( val && val !== "inherit" ) {
								ret += " " + attrs[ i ].nodeName + "=" +
									dump.parse( val, "attribute" );
							}
						}
					}
					ret += close;

					// Show content of TextNode or CDATASection
					if ( node.nodeType === 3 || node.nodeType === 4 ) {
						ret += node.nodeValue;
					}

					return ret + open + "/" + tag + close;
				},

				// function calls it internally, it's the arguments part of the function
				functionArgs: function( fn ) {
					var args,
						l = fn.length;

					if ( !l ) {
						return "";
					}

					args = new Array( l );
					while ( l-- ) {

						// 97 is 'a'
						args[ l ] = String.fromCharCode( 97 + l );
					}
					return " " + args.join( ", " ) + " ";
				},
				// object calls it internally, the key part of an item in a map
				key: quote,
				// function calls it internally, it's the content of the function
				functionCode: "[code]",
				// node calls it internally, it's a html attribute value
				attribute: quote,
				string: quote,
				date: quote,
				regexp: literal,
				number: literal,
				"boolean": literal
			},
			// if true, entities are escaped ( <, >, \t, space and \n )
			HTML: false,
			// indentation unit
			indentChar: "  ",
			// if true, items in a collection, are separated by a \n, else just a space.
			multiline: true
		};

	return dump;
}());

// back compat
QUnit.jsDump = QUnit.dump;

// Deprecated
// Extend assert methods to QUnit for Backwards compatibility
(function() {
	var i,
		assertions = Assert.prototype;

	function applyCurrent( current ) {
		return function() {
			var assert = new Assert( QUnit.config.current );
			current.apply( assert, arguments );
		};
	}

	for ( i in assertions ) {
		QUnit[ i ] = applyCurrent( assertions[ i ] );
	}
})();

// For browser, export only select globals
if ( defined.document ) {

	(function() {
		var i, l,
			keys = [
				"test",
				"module",
				"expect",
				"asyncTest",
				"start",
				"stop",
				"ok",
				"notOk",
				"equal",
				"notEqual",
				"propEqual",
				"notPropEqual",
				"deepEqual",
				"notDeepEqual",
				"strictEqual",
				"notStrictEqual",
				"throws",
				"raises"
			];

		for ( i = 0, l = keys.length; i < l; i++ ) {
			window[ keys[ i ] ] = QUnit[ keys[ i ] ];
		}
	})();

	window.QUnit = QUnit;
}

// For nodejs
if ( typeof module !== "undefined" && module && module.exports ) {
	module.exports = QUnit;

	// For consistency with CommonJS environments' exports
	module.exports.QUnit = QUnit;
}

// For CommonJS with exports, but without module.exports, like Rhino
if ( typeof exports !== "undefined" && exports ) {
	exports.QUnit = QUnit;
}

if ( typeof define === "function" && define.amd ) {
	define( function() {
		return QUnit;
	} );
	QUnit.config.autostart = false;
}

/*
 * This file is a modified version of google-diff-match-patch's JavaScript implementation
 * (https://code.google.com/p/google-diff-match-patch/source/browse/trunk/javascript/diff_match_patch_uncompressed.js),
 * modifications are licensed as more fully set forth in LICENSE.txt.
 *
 * The original source of google-diff-match-patch is attributable and licensed as follows:
 *
 * Copyright 2006 Google Inc.
 * https://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * More Info:
 *  https://code.google.com/p/google-diff-match-patch/
 *
 * Usage: QUnit.diff(expected, actual)
 *
 */
QUnit.diff = ( function() {
	function DiffMatchPatch() {
	}

	//  DIFF FUNCTIONS

	/**
	 * The data structure representing a diff is an array of tuples:
	 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
	 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
	 */
	var DIFF_DELETE = -1,
		DIFF_INSERT = 1,
		DIFF_EQUAL = 0;

	/**
	 * Find the differences between two texts.  Simplifies the problem by stripping
	 * any common prefix or suffix off the texts before diffing.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {boolean=} optChecklines Optional speedup flag. If present and false,
	 *     then don't run a line-level diff first to identify the changed areas.
	 *     Defaults to true, which does a faster, slightly less optimal diff.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 */
	DiffMatchPatch.prototype.DiffMain = function( text1, text2, optChecklines ) {
		var deadline, checklines, commonlength,
			commonprefix, commonsuffix, diffs;

		// The diff must be complete in up to 1 second.
		deadline = ( new Date() ).getTime() + 1000;

		// Check for null inputs.
		if ( text1 === null || text2 === null ) {
			throw new Error( "Null input. (DiffMain)" );
		}

		// Check for equality (speedup).
		if ( text1 === text2 ) {
			if ( text1 ) {
				return [
					[ DIFF_EQUAL, text1 ]
				];
			}
			return [];
		}

		if ( typeof optChecklines === "undefined" ) {
			optChecklines = true;
		}

		checklines = optChecklines;

		// Trim off common prefix (speedup).
		commonlength = this.diffCommonPrefix( text1, text2 );
		commonprefix = text1.substring( 0, commonlength );
		text1 = text1.substring( commonlength );
		text2 = text2.substring( commonlength );

		// Trim off common suffix (speedup).
		commonlength = this.diffCommonSuffix( text1, text2 );
		commonsuffix = text1.substring( text1.length - commonlength );
		text1 = text1.substring( 0, text1.length - commonlength );
		text2 = text2.substring( 0, text2.length - commonlength );

		// Compute the diff on the middle block.
		diffs = this.diffCompute( text1, text2, checklines, deadline );

		// Restore the prefix and suffix.
		if ( commonprefix ) {
			diffs.unshift( [ DIFF_EQUAL, commonprefix ] );
		}
		if ( commonsuffix ) {
			diffs.push( [ DIFF_EQUAL, commonsuffix ] );
		}
		this.diffCleanupMerge( diffs );
		return diffs;
	};

	/**
	 * Reduce the number of edits by eliminating operationally trivial equalities.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 */
	DiffMatchPatch.prototype.diffCleanupEfficiency = function( diffs ) {
		var changes, equalities, equalitiesLength, lastequality,
			pointer, preIns, preDel, postIns, postDel;
		changes = false;
		equalities = []; // Stack of indices where equalities are found.
		equalitiesLength = 0; // Keeping our own length var is faster in JS.
		/** @type {?string} */
		lastequality = null;
		// Always equal to diffs[equalities[equalitiesLength - 1]][1]
		pointer = 0; // Index of current position.
		// Is there an insertion operation before the last equality.
		preIns = false;
		// Is there a deletion operation before the last equality.
		preDel = false;
		// Is there an insertion operation after the last equality.
		postIns = false;
		// Is there a deletion operation after the last equality.
		postDel = false;
		while ( pointer < diffs.length ) {

			// Equality found.
			if ( diffs[ pointer ][ 0 ] === DIFF_EQUAL ) {
				if ( diffs[ pointer ][ 1 ].length < 4 && ( postIns || postDel ) ) {

					// Candidate found.
					equalities[ equalitiesLength++ ] = pointer;
					preIns = postIns;
					preDel = postDel;
					lastequality = diffs[ pointer ][ 1 ];
				} else {

					// Not a candidate, and can never become one.
					equalitiesLength = 0;
					lastequality = null;
				}
				postIns = postDel = false;

			// An insertion or deletion.
			} else {

				if ( diffs[ pointer ][ 0 ] === DIFF_DELETE ) {
					postDel = true;
				} else {
					postIns = true;
				}

				/*
				 * Five types to be split:
				 * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
				 * <ins>A</ins>X<ins>C</ins><del>D</del>
				 * <ins>A</ins><del>B</del>X<ins>C</ins>
				 * <ins>A</del>X<ins>C</ins><del>D</del>
				 * <ins>A</ins><del>B</del>X<del>C</del>
				 */
				if ( lastequality && ( ( preIns && preDel && postIns && postDel ) ||
						( ( lastequality.length < 2 ) &&
						( preIns + preDel + postIns + postDel ) === 3 ) ) ) {

					// Duplicate record.
					diffs.splice(
						equalities[ equalitiesLength - 1 ],
						0,
						[ DIFF_DELETE, lastequality ]
					);

					// Change second copy to insert.
					diffs[ equalities[ equalitiesLength - 1 ] + 1 ][ 0 ] = DIFF_INSERT;
					equalitiesLength--; // Throw away the equality we just deleted;
					lastequality = null;
					if ( preIns && preDel ) {
						// No changes made which could affect previous entry, keep going.
						postIns = postDel = true;
						equalitiesLength = 0;
					} else {
						equalitiesLength--; // Throw away the previous equality.
						pointer = equalitiesLength > 0 ? equalities[ equalitiesLength - 1 ] : -1;
						postIns = postDel = false;
					}
					changes = true;
				}
			}
			pointer++;
		}

		if ( changes ) {
			this.diffCleanupMerge( diffs );
		}
	};

	/**
	 * Convert a diff array into a pretty HTML report.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 * @param {integer} string to be beautified.
	 * @return {string} HTML representation.
	 */
	DiffMatchPatch.prototype.diffPrettyHtml = function( diffs ) {
		var op, data, x,
			html = [];
		for ( x = 0; x < diffs.length; x++ ) {
			op = diffs[ x ][ 0 ]; // Operation (insert, delete, equal)
			data = diffs[ x ][ 1 ]; // Text of change.
			switch ( op ) {
			case DIFF_INSERT:
				html[ x ] = "<ins>" + data + "</ins>";
				break;
			case DIFF_DELETE:
				html[ x ] = "<del>" + data + "</del>";
				break;
			case DIFF_EQUAL:
				html[ x ] = "<span>" + data + "</span>";
				break;
			}
		}
		return html.join( "" );
	};

	/**
	 * Determine the common prefix of two strings.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {number} The number of characters common to the start of each
	 *     string.
	 */
	DiffMatchPatch.prototype.diffCommonPrefix = function( text1, text2 ) {
		var pointermid, pointermax, pointermin, pointerstart;
		// Quick check for common null cases.
		if ( !text1 || !text2 || text1.charAt( 0 ) !== text2.charAt( 0 ) ) {
			return 0;
		}
		// Binary search.
		// Performance analysis: https://neil.fraser.name/news/2007/10/09/
		pointermin = 0;
		pointermax = Math.min( text1.length, text2.length );
		pointermid = pointermax;
		pointerstart = 0;
		while ( pointermin < pointermid ) {
			if ( text1.substring( pointerstart, pointermid ) ===
					text2.substring( pointerstart, pointermid ) ) {
				pointermin = pointermid;
				pointerstart = pointermin;
			} else {
				pointermax = pointermid;
			}
			pointermid = Math.floor( ( pointermax - pointermin ) / 2 + pointermin );
		}
		return pointermid;
	};

	/**
	 * Determine the common suffix of two strings.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {number} The number of characters common to the end of each string.
	 */
	DiffMatchPatch.prototype.diffCommonSuffix = function( text1, text2 ) {
		var pointermid, pointermax, pointermin, pointerend;
		// Quick check for common null cases.
		if ( !text1 ||
				!text2 ||
				text1.charAt( text1.length - 1 ) !== text2.charAt( text2.length - 1 ) ) {
			return 0;
		}
		// Binary search.
		// Performance analysis: https://neil.fraser.name/news/2007/10/09/
		pointermin = 0;
		pointermax = Math.min( text1.length, text2.length );
		pointermid = pointermax;
		pointerend = 0;
		while ( pointermin < pointermid ) {
			if ( text1.substring( text1.length - pointermid, text1.length - pointerend ) ===
					text2.substring( text2.length - pointermid, text2.length - pointerend ) ) {
				pointermin = pointermid;
				pointerend = pointermin;
			} else {
				pointermax = pointermid;
			}
			pointermid = Math.floor( ( pointermax - pointermin ) / 2 + pointermin );
		}
		return pointermid;
	};

	/**
	 * Find the differences between two texts.  Assumes that the texts do not
	 * have any common prefix or suffix.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {boolean} checklines Speedup flag.  If false, then don't run a
	 *     line-level diff first to identify the changed areas.
	 *     If true, then run a faster, slightly less optimal diff.
	 * @param {number} deadline Time when the diff should be complete by.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffCompute = function( text1, text2, checklines, deadline ) {
		var diffs, longtext, shorttext, i, hm,
			text1A, text2A, text1B, text2B,
			midCommon, diffsA, diffsB;

		if ( !text1 ) {
			// Just add some text (speedup).
			return [
				[ DIFF_INSERT, text2 ]
			];
		}

		if ( !text2 ) {
			// Just delete some text (speedup).
			return [
				[ DIFF_DELETE, text1 ]
			];
		}

		longtext = text1.length > text2.length ? text1 : text2;
		shorttext = text1.length > text2.length ? text2 : text1;
		i = longtext.indexOf( shorttext );
		if ( i !== -1 ) {
			// Shorter text is inside the longer text (speedup).
			diffs = [
				[ DIFF_INSERT, longtext.substring( 0, i ) ],
				[ DIFF_EQUAL, shorttext ],
				[ DIFF_INSERT, longtext.substring( i + shorttext.length ) ]
			];
			// Swap insertions for deletions if diff is reversed.
			if ( text1.length > text2.length ) {
				diffs[ 0 ][ 0 ] = diffs[ 2 ][ 0 ] = DIFF_DELETE;
			}
			return diffs;
		}

		if ( shorttext.length === 1 ) {
			// Single character string.
			// After the previous speedup, the character can't be an equality.
			return [
				[ DIFF_DELETE, text1 ],
				[ DIFF_INSERT, text2 ]
			];
		}

		// Check to see if the problem can be split in two.
		hm = this.diffHalfMatch( text1, text2 );
		if ( hm ) {
			// A half-match was found, sort out the return data.
			text1A = hm[ 0 ];
			text1B = hm[ 1 ];
			text2A = hm[ 2 ];
			text2B = hm[ 3 ];
			midCommon = hm[ 4 ];
			// Send both pairs off for separate processing.
			diffsA = this.DiffMain( text1A, text2A, checklines, deadline );
			diffsB = this.DiffMain( text1B, text2B, checklines, deadline );
			// Merge the results.
			return diffsA.concat( [
				[ DIFF_EQUAL, midCommon ]
			], diffsB );
		}

		if ( checklines && text1.length > 100 && text2.length > 100 ) {
			return this.diffLineMode( text1, text2, deadline );
		}

		return this.diffBisect( text1, text2, deadline );
	};

	/**
	 * Do the two texts share a substring which is at least half the length of the
	 * longer text?
	 * This speedup can produce non-minimal diffs.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {Array.<string>} Five element Array, containing the prefix of
	 *     text1, the suffix of text1, the prefix of text2, the suffix of
	 *     text2 and the common middle.  Or null if there was no match.
	 * @private
	 */
	DiffMatchPatch.prototype.diffHalfMatch = function( text1, text2 ) {
		var longtext, shorttext, dmp,
			text1A, text2B, text2A, text1B, midCommon,
			hm1, hm2, hm;

		longtext = text1.length > text2.length ? text1 : text2;
		shorttext = text1.length > text2.length ? text2 : text1;
		if ( longtext.length < 4 || shorttext.length * 2 < longtext.length ) {
			return null; // Pointless.
		}
		dmp = this; // 'this' becomes 'window' in a closure.

		/**
		 * Does a substring of shorttext exist within longtext such that the substring
		 * is at least half the length of longtext?
		 * Closure, but does not reference any external variables.
		 * @param {string} longtext Longer string.
		 * @param {string} shorttext Shorter string.
		 * @param {number} i Start index of quarter length substring within longtext.
		 * @return {Array.<string>} Five element Array, containing the prefix of
		 *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
		 *     of shorttext and the common middle.  Or null if there was no match.
		 * @private
		 */
		function diffHalfMatchI( longtext, shorttext, i ) {
			var seed, j, bestCommon, prefixLength, suffixLength,
				bestLongtextA, bestLongtextB, bestShorttextA, bestShorttextB;
			// Start with a 1/4 length substring at position i as a seed.
			seed = longtext.substring( i, i + Math.floor( longtext.length / 4 ) );
			j = -1;
			bestCommon = "";
			while ( ( j = shorttext.indexOf( seed, j + 1 ) ) !== -1 ) {
				prefixLength = dmp.diffCommonPrefix( longtext.substring( i ),
					shorttext.substring( j ) );
				suffixLength = dmp.diffCommonSuffix( longtext.substring( 0, i ),
					shorttext.substring( 0, j ) );
				if ( bestCommon.length < suffixLength + prefixLength ) {
					bestCommon = shorttext.substring( j - suffixLength, j ) +
						shorttext.substring( j, j + prefixLength );
					bestLongtextA = longtext.substring( 0, i - suffixLength );
					bestLongtextB = longtext.substring( i + prefixLength );
					bestShorttextA = shorttext.substring( 0, j - suffixLength );
					bestShorttextB = shorttext.substring( j + prefixLength );
				}
			}
			if ( bestCommon.length * 2 >= longtext.length ) {
				return [ bestLongtextA, bestLongtextB,
					bestShorttextA, bestShorttextB, bestCommon
				];
			} else {
				return null;
			}
		}

		// First check if the second quarter is the seed for a half-match.
		hm1 = diffHalfMatchI( longtext, shorttext,
			Math.ceil( longtext.length / 4 ) );
		// Check again based on the third quarter.
		hm2 = diffHalfMatchI( longtext, shorttext,
			Math.ceil( longtext.length / 2 ) );
		if ( !hm1 && !hm2 ) {
			return null;
		} else if ( !hm2 ) {
			hm = hm1;
		} else if ( !hm1 ) {
			hm = hm2;
		} else {
			// Both matched.  Select the longest.
			hm = hm1[ 4 ].length > hm2[ 4 ].length ? hm1 : hm2;
		}

		// A half-match was found, sort out the return data.
		text1A, text1B, text2A, text2B;
		if ( text1.length > text2.length ) {
			text1A = hm[ 0 ];
			text1B = hm[ 1 ];
			text2A = hm[ 2 ];
			text2B = hm[ 3 ];
		} else {
			text2A = hm[ 0 ];
			text2B = hm[ 1 ];
			text1A = hm[ 2 ];
			text1B = hm[ 3 ];
		}
		midCommon = hm[ 4 ];
		return [ text1A, text1B, text2A, text2B, midCommon ];
	};

	/**
	 * Do a quick line-level diff on both strings, then rediff the parts for
	 * greater accuracy.
	 * This speedup can produce non-minimal diffs.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {number} deadline Time when the diff should be complete by.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffLineMode = function( text1, text2, deadline ) {
		var a, diffs, linearray, pointer, countInsert,
			countDelete, textInsert, textDelete, j;
		// Scan the text on a line-by-line basis first.
		a = this.diffLinesToChars( text1, text2 );
		text1 = a.chars1;
		text2 = a.chars2;
		linearray = a.lineArray;

		diffs = this.DiffMain( text1, text2, false, deadline );

		// Convert the diff back to original text.
		this.diffCharsToLines( diffs, linearray );
		// Eliminate freak matches (e.g. blank lines)
		this.diffCleanupSemantic( diffs );

		// Rediff any replacement blocks, this time character-by-character.
		// Add a dummy entry at the end.
		diffs.push( [ DIFF_EQUAL, "" ] );
		pointer = 0;
		countDelete = 0;
		countInsert = 0;
		textDelete = "";
		textInsert = "";
		while ( pointer < diffs.length ) {
			switch ( diffs[ pointer ][ 0 ] ) {
			case DIFF_INSERT:
				countInsert++;
				textInsert += diffs[ pointer ][ 1 ];
				break;
			case DIFF_DELETE:
				countDelete++;
				textDelete += diffs[ pointer ][ 1 ];
				break;
			case DIFF_EQUAL:
				// Upon reaching an equality, check for prior redundancies.
				if ( countDelete >= 1 && countInsert >= 1 ) {
					// Delete the offending records and add the merged ones.
					diffs.splice( pointer - countDelete - countInsert,
						countDelete + countInsert );
					pointer = pointer - countDelete - countInsert;
					a = this.DiffMain( textDelete, textInsert, false, deadline );
					for ( j = a.length - 1; j >= 0; j-- ) {
						diffs.splice( pointer, 0, a[ j ] );
					}
					pointer = pointer + a.length;
				}
				countInsert = 0;
				countDelete = 0;
				textDelete = "";
				textInsert = "";
				break;
			}
			pointer++;
		}
		diffs.pop(); // Remove the dummy entry at the end.

		return diffs;
	};

	/**
	 * Find the 'middle snake' of a diff, split the problem in two
	 * and return the recursively constructed diff.
	 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {number} deadline Time at which to bail if not yet complete.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffBisect = function( text1, text2, deadline ) {
		var text1Length, text2Length, maxD, vOffset, vLength,
			v1, v2, x, delta, front, k1start, k1end, k2start,
			k2end, k2Offset, k1Offset, x1, x2, y1, y2, d, k1, k2;
		// Cache the text lengths to prevent multiple calls.
		text1Length = text1.length;
		text2Length = text2.length;
		maxD = Math.ceil( ( text1Length + text2Length ) / 2 );
		vOffset = maxD;
		vLength = 2 * maxD;
		v1 = new Array( vLength );
		v2 = new Array( vLength );
		// Setting all elements to -1 is faster in Chrome & Firefox than mixing
		// integers and undefined.
		for ( x = 0; x < vLength; x++ ) {
			v1[ x ] = -1;
			v2[ x ] = -1;
		}
		v1[ vOffset + 1 ] = 0;
		v2[ vOffset + 1 ] = 0;
		delta = text1Length - text2Length;
		// If the total number of characters is odd, then the front path will collide
		// with the reverse path.
		front = ( delta % 2 !== 0 );
		// Offsets for start and end of k loop.
		// Prevents mapping of space beyond the grid.
		k1start = 0;
		k1end = 0;
		k2start = 0;
		k2end = 0;
		for ( d = 0; d < maxD; d++ ) {
			// Bail out if deadline is reached.
			if ( ( new Date() ).getTime() > deadline ) {
				break;
			}

			// Walk the front path one step.
			for ( k1 = -d + k1start; k1 <= d - k1end; k1 += 2 ) {
				k1Offset = vOffset + k1;
				if ( k1 === -d || ( k1 !== d && v1[ k1Offset - 1 ] < v1[ k1Offset + 1 ] ) ) {
					x1 = v1[ k1Offset + 1 ];
				} else {
					x1 = v1[ k1Offset - 1 ] + 1;
				}
				y1 = x1 - k1;
				while ( x1 < text1Length && y1 < text2Length &&
					text1.charAt( x1 ) === text2.charAt( y1 ) ) {
					x1++;
					y1++;
				}
				v1[ k1Offset ] = x1;
				if ( x1 > text1Length ) {
					// Ran off the right of the graph.
					k1end += 2;
				} else if ( y1 > text2Length ) {
					// Ran off the bottom of the graph.
					k1start += 2;
				} else if ( front ) {
					k2Offset = vOffset + delta - k1;
					if ( k2Offset >= 0 && k2Offset < vLength && v2[ k2Offset ] !== -1 ) {
						// Mirror x2 onto top-left coordinate system.
						x2 = text1Length - v2[ k2Offset ];
						if ( x1 >= x2 ) {
							// Overlap detected.
							return this.diffBisectSplit( text1, text2, x1, y1, deadline );
						}
					}
				}
			}

			// Walk the reverse path one step.
			for ( k2 = -d + k2start; k2 <= d - k2end; k2 += 2 ) {
				k2Offset = vOffset + k2;
				if ( k2 === -d || ( k2 !== d && v2[ k2Offset - 1 ] < v2[ k2Offset + 1 ] ) ) {
					x2 = v2[ k2Offset + 1 ];
				} else {
					x2 = v2[ k2Offset - 1 ] + 1;
				}
				y2 = x2 - k2;
				while ( x2 < text1Length && y2 < text2Length &&
					text1.charAt( text1Length - x2 - 1 ) ===
					text2.charAt( text2Length - y2 - 1 ) ) {
					x2++;
					y2++;
				}
				v2[ k2Offset ] = x2;
				if ( x2 > text1Length ) {
					// Ran off the left of the graph.
					k2end += 2;
				} else if ( y2 > text2Length ) {
					// Ran off the top of the graph.
					k2start += 2;
				} else if ( !front ) {
					k1Offset = vOffset + delta - k2;
					if ( k1Offset >= 0 && k1Offset < vLength && v1[ k1Offset ] !== -1 ) {
						x1 = v1[ k1Offset ];
						y1 = vOffset + x1 - k1Offset;
						// Mirror x2 onto top-left coordinate system.
						x2 = text1Length - x2;
						if ( x1 >= x2 ) {
							// Overlap detected.
							return this.diffBisectSplit( text1, text2, x1, y1, deadline );
						}
					}
				}
			}
		}
		// Diff took too long and hit the deadline or
		// number of diffs equals number of characters, no commonality at all.
		return [
			[ DIFF_DELETE, text1 ],
			[ DIFF_INSERT, text2 ]
		];
	};

	/**
	 * Given the location of the 'middle snake', split the diff in two parts
	 * and recurse.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {number} x Index of split point in text1.
	 * @param {number} y Index of split point in text2.
	 * @param {number} deadline Time at which to bail if not yet complete.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffBisectSplit = function( text1, text2, x, y, deadline ) {
		var text1a, text1b, text2a, text2b, diffs, diffsb;
		text1a = text1.substring( 0, x );
		text2a = text2.substring( 0, y );
		text1b = text1.substring( x );
		text2b = text2.substring( y );

		// Compute both diffs serially.
		diffs = this.DiffMain( text1a, text2a, false, deadline );
		diffsb = this.DiffMain( text1b, text2b, false, deadline );

		return diffs.concat( diffsb );
	};

	/**
	 * Reduce the number of edits by eliminating semantically trivial equalities.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 */
	DiffMatchPatch.prototype.diffCleanupSemantic = function( diffs ) {
		var changes, equalities, equalitiesLength, lastequality,
			pointer, lengthInsertions2, lengthDeletions2, lengthInsertions1,
			lengthDeletions1, deletion, insertion, overlapLength1, overlapLength2;
		changes = false;
		equalities = []; // Stack of indices where equalities are found.
		equalitiesLength = 0; // Keeping our own length var is faster in JS.
		/** @type {?string} */
		lastequality = null;
		// Always equal to diffs[equalities[equalitiesLength - 1]][1]
		pointer = 0; // Index of current position.
		// Number of characters that changed prior to the equality.
		lengthInsertions1 = 0;
		lengthDeletions1 = 0;
		// Number of characters that changed after the equality.
		lengthInsertions2 = 0;
		lengthDeletions2 = 0;
		while ( pointer < diffs.length ) {
			if ( diffs[ pointer ][ 0 ] === DIFF_EQUAL ) { // Equality found.
				equalities[ equalitiesLength++ ] = pointer;
				lengthInsertions1 = lengthInsertions2;
				lengthDeletions1 = lengthDeletions2;
				lengthInsertions2 = 0;
				lengthDeletions2 = 0;
				lastequality = diffs[ pointer ][ 1 ];
			} else { // An insertion or deletion.
				if ( diffs[ pointer ][ 0 ] === DIFF_INSERT ) {
					lengthInsertions2 += diffs[ pointer ][ 1 ].length;
				} else {
					lengthDeletions2 += diffs[ pointer ][ 1 ].length;
				}
				// Eliminate an equality that is smaller or equal to the edits on both
				// sides of it.
				if ( lastequality && ( lastequality.length <=
						Math.max( lengthInsertions1, lengthDeletions1 ) ) &&
						( lastequality.length <= Math.max( lengthInsertions2,
							lengthDeletions2 ) ) ) {

					// Duplicate record.
					diffs.splice(
						equalities[ equalitiesLength - 1 ],
						0,
						[ DIFF_DELETE, lastequality ]
					);

					// Change second copy to insert.
					diffs[ equalities[ equalitiesLength - 1 ] + 1 ][ 0 ] = DIFF_INSERT;

					// Throw away the equality we just deleted.
					equalitiesLength--;

					// Throw away the previous equality (it needs to be reevaluated).
					equalitiesLength--;
					pointer = equalitiesLength > 0 ? equalities[ equalitiesLength - 1 ] : -1;

					// Reset the counters.
					lengthInsertions1 = 0;
					lengthDeletions1 = 0;
					lengthInsertions2 = 0;
					lengthDeletions2 = 0;
					lastequality = null;
					changes = true;
				}
			}
			pointer++;
		}

		// Normalize the diff.
		if ( changes ) {
			this.diffCleanupMerge( diffs );
		}

		// Find any overlaps between deletions and insertions.
		// e.g: <del>abcxxx</del><ins>xxxdef</ins>
		//   -> <del>abc</del>xxx<ins>def</ins>
		// e.g: <del>xxxabc</del><ins>defxxx</ins>
		//   -> <ins>def</ins>xxx<del>abc</del>
		// Only extract an overlap if it is as big as the edit ahead or behind it.
		pointer = 1;
		while ( pointer < diffs.length ) {
			if ( diffs[ pointer - 1 ][ 0 ] === DIFF_DELETE &&
					diffs[ pointer ][ 0 ] === DIFF_INSERT ) {
				deletion = diffs[ pointer - 1 ][ 1 ];
				insertion = diffs[ pointer ][ 1 ];
				overlapLength1 = this.diffCommonOverlap( deletion, insertion );
				overlapLength2 = this.diffCommonOverlap( insertion, deletion );
				if ( overlapLength1 >= overlapLength2 ) {
					if ( overlapLength1 >= deletion.length / 2 ||
							overlapLength1 >= insertion.length / 2 ) {
						// Overlap found.  Insert an equality and trim the surrounding edits.
						diffs.splice(
							pointer,
							0,
							[ DIFF_EQUAL, insertion.substring( 0, overlapLength1 ) ]
						);
						diffs[ pointer - 1 ][ 1 ] =
							deletion.substring( 0, deletion.length - overlapLength1 );
						diffs[ pointer + 1 ][ 1 ] = insertion.substring( overlapLength1 );
						pointer++;
					}
				} else {
					if ( overlapLength2 >= deletion.length / 2 ||
							overlapLength2 >= insertion.length / 2 ) {

						// Reverse overlap found.
						// Insert an equality and swap and trim the surrounding edits.
						diffs.splice(
							pointer,
							0,
							[ DIFF_EQUAL, deletion.substring( 0, overlapLength2 ) ]
						);

						diffs[ pointer - 1 ][ 0 ] = DIFF_INSERT;
						diffs[ pointer - 1 ][ 1 ] =
							insertion.substring( 0, insertion.length - overlapLength2 );
						diffs[ pointer + 1 ][ 0 ] = DIFF_DELETE;
						diffs[ pointer + 1 ][ 1 ] =
							deletion.substring( overlapLength2 );
						pointer++;
					}
				}
				pointer++;
			}
			pointer++;
		}
	};

	/**
	 * Determine if the suffix of one string is the prefix of another.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {number} The number of characters common to the end of the first
	 *     string and the start of the second string.
	 * @private
	 */
	DiffMatchPatch.prototype.diffCommonOverlap = function( text1, text2 ) {
		var text1Length, text2Length, textLength,
			best, length, pattern, found;
		// Cache the text lengths to prevent multiple calls.
		text1Length = text1.length;
		text2Length = text2.length;
		// Eliminate the null case.
		if ( text1Length === 0 || text2Length === 0 ) {
			return 0;
		}
		// Truncate the longer string.
		if ( text1Length > text2Length ) {
			text1 = text1.substring( text1Length - text2Length );
		} else if ( text1Length < text2Length ) {
			text2 = text2.substring( 0, text1Length );
		}
		textLength = Math.min( text1Length, text2Length );
		// Quick check for the worst case.
		if ( text1 === text2 ) {
			return textLength;
		}

		// Start by looking for a single character match
		// and increase length until no match is found.
		// Performance analysis: https://neil.fraser.name/news/2010/11/04/
		best = 0;
		length = 1;
		while ( true ) {
			pattern = text1.substring( textLength - length );
			found = text2.indexOf( pattern );
			if ( found === -1 ) {
				return best;
			}
			length += found;
			if ( found === 0 || text1.substring( textLength - length ) ===
					text2.substring( 0, length ) ) {
				best = length;
				length++;
			}
		}
	};

	/**
	 * Split two texts into an array of strings.  Reduce the texts to a string of
	 * hashes where each Unicode character represents one line.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
	 *     An object containing the encoded text1, the encoded text2 and
	 *     the array of unique strings.
	 *     The zeroth element of the array of unique strings is intentionally blank.
	 * @private
	 */
	DiffMatchPatch.prototype.diffLinesToChars = function( text1, text2 ) {
		var lineArray, lineHash, chars1, chars2;
		lineArray = []; // e.g. lineArray[4] === 'Hello\n'
		lineHash = {}; // e.g. lineHash['Hello\n'] === 4

		// '\x00' is a valid character, but various debuggers don't like it.
		// So we'll insert a junk entry to avoid generating a null character.
		lineArray[ 0 ] = "";

		/**
		 * Split a text into an array of strings.  Reduce the texts to a string of
		 * hashes where each Unicode character represents one line.
		 * Modifies linearray and linehash through being a closure.
		 * @param {string} text String to encode.
		 * @return {string} Encoded string.
		 * @private
		 */
		function diffLinesToCharsMunge( text ) {
			var chars, lineStart, lineEnd, lineArrayLength, line;
			chars = "";
			// Walk the text, pulling out a substring for each line.
			// text.split('\n') would would temporarily double our memory footprint.
			// Modifying text would create many large strings to garbage collect.
			lineStart = 0;
			lineEnd = -1;
			// Keeping our own length variable is faster than looking it up.
			lineArrayLength = lineArray.length;
			while ( lineEnd < text.length - 1 ) {
				lineEnd = text.indexOf( "\n", lineStart );
				if ( lineEnd === -1 ) {
					lineEnd = text.length - 1;
				}
				line = text.substring( lineStart, lineEnd + 1 );
				lineStart = lineEnd + 1;

				if ( lineHash.hasOwnProperty ? lineHash.hasOwnProperty( line ) :
							( lineHash[ line ] !== undefined ) ) {
					chars += String.fromCharCode( lineHash[ line ] );
				} else {
					chars += String.fromCharCode( lineArrayLength );
					lineHash[ line ] = lineArrayLength;
					lineArray[ lineArrayLength++ ] = line;
				}
			}
			return chars;
		}

		chars1 = diffLinesToCharsMunge( text1 );
		chars2 = diffLinesToCharsMunge( text2 );
		return {
			chars1: chars1,
			chars2: chars2,
			lineArray: lineArray
		};
	};

	/**
	 * Rehydrate the text in a diff from a string of line hashes to real lines of
	 * text.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 * @param {!Array.<string>} lineArray Array of unique strings.
	 * @private
	 */
	DiffMatchPatch.prototype.diffCharsToLines = function( diffs, lineArray ) {
		var x, chars, text, y;
		for ( x = 0; x < diffs.length; x++ ) {
			chars = diffs[ x ][ 1 ];
			text = [];
			for ( y = 0; y < chars.length; y++ ) {
				text[ y ] = lineArray[ chars.charCodeAt( y ) ];
			}
			diffs[ x ][ 1 ] = text.join( "" );
		}
	};

	/**
	 * Reorder and merge like edit sections.  Merge equalities.
	 * Any edit section can move as long as it doesn't cross an equality.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 */
	DiffMatchPatch.prototype.diffCleanupMerge = function( diffs ) {
		var pointer, countDelete, countInsert, textInsert, textDelete,
			commonlength, changes, diffPointer, position;
		diffs.push( [ DIFF_EQUAL, "" ] ); // Add a dummy entry at the end.
		pointer = 0;
		countDelete = 0;
		countInsert = 0;
		textDelete = "";
		textInsert = "";
		commonlength;
		while ( pointer < diffs.length ) {
			switch ( diffs[ pointer ][ 0 ] ) {
			case DIFF_INSERT:
				countInsert++;
				textInsert += diffs[ pointer ][ 1 ];
				pointer++;
				break;
			case DIFF_DELETE:
				countDelete++;
				textDelete += diffs[ pointer ][ 1 ];
				pointer++;
				break;
			case DIFF_EQUAL:
				// Upon reaching an equality, check for prior redundancies.
				if ( countDelete + countInsert > 1 ) {
					if ( countDelete !== 0 && countInsert !== 0 ) {
						// Factor out any common prefixes.
						commonlength = this.diffCommonPrefix( textInsert, textDelete );
						if ( commonlength !== 0 ) {
							if ( ( pointer - countDelete - countInsert ) > 0 &&
									diffs[ pointer - countDelete - countInsert - 1 ][ 0 ] ===
									DIFF_EQUAL ) {
								diffs[ pointer - countDelete - countInsert - 1 ][ 1 ] +=
									textInsert.substring( 0, commonlength );
							} else {
								diffs.splice( 0, 0, [ DIFF_EQUAL,
									textInsert.substring( 0, commonlength )
								] );
								pointer++;
							}
							textInsert = textInsert.substring( commonlength );
							textDelete = textDelete.substring( commonlength );
						}
						// Factor out any common suffixies.
						commonlength = this.diffCommonSuffix( textInsert, textDelete );
						if ( commonlength !== 0 ) {
							diffs[ pointer ][ 1 ] = textInsert.substring( textInsert.length -
									commonlength ) + diffs[ pointer ][ 1 ];
							textInsert = textInsert.substring( 0, textInsert.length -
								commonlength );
							textDelete = textDelete.substring( 0, textDelete.length -
								commonlength );
						}
					}
					// Delete the offending records and add the merged ones.
					if ( countDelete === 0 ) {
						diffs.splice( pointer - countInsert,
							countDelete + countInsert, [ DIFF_INSERT, textInsert ] );
					} else if ( countInsert === 0 ) {
						diffs.splice( pointer - countDelete,
							countDelete + countInsert, [ DIFF_DELETE, textDelete ] );
					} else {
						diffs.splice(
							pointer - countDelete - countInsert,
							countDelete + countInsert,
							[ DIFF_DELETE, textDelete ], [ DIFF_INSERT, textInsert ]
						);
					}
					pointer = pointer - countDelete - countInsert +
						( countDelete ? 1 : 0 ) + ( countInsert ? 1 : 0 ) + 1;
				} else if ( pointer !== 0 && diffs[ pointer - 1 ][ 0 ] === DIFF_EQUAL ) {

					// Merge this equality with the previous one.
					diffs[ pointer - 1 ][ 1 ] += diffs[ pointer ][ 1 ];
					diffs.splice( pointer, 1 );
				} else {
					pointer++;
				}
				countInsert = 0;
				countDelete = 0;
				textDelete = "";
				textInsert = "";
				break;
			}
		}
		if ( diffs[ diffs.length - 1 ][ 1 ] === "" ) {
			diffs.pop(); // Remove the dummy entry at the end.
		}

		// Second pass: look for single edits surrounded on both sides by equalities
		// which can be shifted sideways to eliminate an equality.
		// e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
		changes = false;
		pointer = 1;

		// Intentionally ignore the first and last element (don't need checking).
		while ( pointer < diffs.length - 1 ) {
			if ( diffs[ pointer - 1 ][ 0 ] === DIFF_EQUAL &&
					diffs[ pointer + 1 ][ 0 ] === DIFF_EQUAL ) {

				diffPointer = diffs[ pointer ][ 1 ];
				position = diffPointer.substring(
					diffPointer.length - diffs[ pointer - 1 ][ 1 ].length
				);

				// This is a single edit surrounded by equalities.
				if ( position === diffs[ pointer - 1 ][ 1 ] ) {

					// Shift the edit over the previous equality.
					diffs[ pointer ][ 1 ] = diffs[ pointer - 1 ][ 1 ] +
						diffs[ pointer ][ 1 ].substring( 0, diffs[ pointer ][ 1 ].length -
							diffs[ pointer - 1 ][ 1 ].length );
					diffs[ pointer + 1 ][ 1 ] =
						diffs[ pointer - 1 ][ 1 ] + diffs[ pointer + 1 ][ 1 ];
					diffs.splice( pointer - 1, 1 );
					changes = true;
				} else if ( diffPointer.substring( 0, diffs[ pointer + 1 ][ 1 ].length ) ===
						diffs[ pointer + 1 ][ 1 ] ) {

					// Shift the edit over the next equality.
					diffs[ pointer - 1 ][ 1 ] += diffs[ pointer + 1 ][ 1 ];
					diffs[ pointer ][ 1 ] =
						diffs[ pointer ][ 1 ].substring( diffs[ pointer + 1 ][ 1 ].length ) +
						diffs[ pointer + 1 ][ 1 ];
					diffs.splice( pointer + 1, 1 );
					changes = true;
				}
			}
			pointer++;
		}
		// If shifts were made, the diff needs reordering and another shift sweep.
		if ( changes ) {
			this.diffCleanupMerge( diffs );
		}
	};

	return function( o, n ) {
		var diff, output, text;
		diff = new DiffMatchPatch();
		output = diff.DiffMain( o, n );
		diff.diffCleanupEfficiency( output );
		text = diff.diffPrettyHtml( output );

		return text;
	};
}() );

// Get a reference to the global object, like window in browsers
}( (function() {
	return this;
})() ));

(function() {

// Don't load the HTML Reporter on non-Browser environments
if ( typeof window === "undefined" || !window.document ) {
	return;
}

// Deprecated QUnit.init - Ref #530
// Re-initialize the configuration options
QUnit.init = function() {
	var tests, banner, result, qunit,
		config = QUnit.config;

	config.stats = { all: 0, bad: 0 };
	config.moduleStats = { all: 0, bad: 0 };
	config.started = 0;
	config.updateRate = 1000;
	config.blocking = false;
	config.autostart = true;
	config.autorun = false;
	config.filter = "";
	config.queue = [];

	// Return on non-browser environments
	// This is necessary to not break on node tests
	if ( typeof window === "undefined" ) {
		return;
	}

	qunit = id( "qunit" );
	if ( qunit ) {
		qunit.innerHTML =
			"<h1 id='qunit-header'>" + escapeText( document.title ) + "</h1>" +
			"<h2 id='qunit-banner'></h2>" +
			"<div id='qunit-testrunner-toolbar'></div>" +
			"<h2 id='qunit-userAgent'></h2>" +
			"<ol id='qunit-tests'></ol>";
	}

	tests = id( "qunit-tests" );
	banner = id( "qunit-banner" );
	result = id( "qunit-testresult" );

	if ( tests ) {
		tests.innerHTML = "";
	}

	if ( banner ) {
		banner.className = "";
	}

	if ( result ) {
		result.parentNode.removeChild( result );
	}

	if ( tests ) {
		result = document.createElement( "p" );
		result.id = "qunit-testresult";
		result.className = "result";
		tests.parentNode.insertBefore( result, tests );
		result.innerHTML = "Running...<br />&#160;";
	}
};

var config = QUnit.config,
	collapseNext = false,
	hasOwn = Object.prototype.hasOwnProperty,
	defined = {
		document: window.document !== undefined,
		sessionStorage: (function() {
			var x = "qunit-test-string";
			try {
				sessionStorage.setItem( x, x );
				sessionStorage.removeItem( x );
				return true;
			} catch ( e ) {
				return false;
			}
		}())
	},
	modulesList = [];

/**
* Escape text for attribute or text content.
*/
function escapeText( s ) {
	if ( !s ) {
		return "";
	}
	s = s + "";

	// Both single quotes and double quotes (for attributes)
	return s.replace( /['"<>&]/g, function( s ) {
		switch ( s ) {
		case "'":
			return "&#039;";
		case "\"":
			return "&quot;";
		case "<":
			return "&lt;";
		case ">":
			return "&gt;";
		case "&":
			return "&amp;";
		}
	});
}

/**
 * @param {HTMLElement} elem
 * @param {string} type
 * @param {Function} fn
 */
function addEvent( elem, type, fn ) {
	if ( elem.addEventListener ) {

		// Standards-based browsers
		elem.addEventListener( type, fn, false );
	} else if ( elem.attachEvent ) {

		// support: IE <9
		elem.attachEvent( "on" + type, function() {
			var event = window.event;
			if ( !event.target ) {
				event.target = event.srcElement || document;
			}

			fn.call( elem, event );
		});
	}
}

/**
 * @param {Array|NodeList} elems
 * @param {string} type
 * @param {Function} fn
 */
function addEvents( elems, type, fn ) {
	var i = elems.length;
	while ( i-- ) {
		addEvent( elems[ i ], type, fn );
	}
}

function hasClass( elem, name ) {
	return ( " " + elem.className + " " ).indexOf( " " + name + " " ) >= 0;
}

function addClass( elem, name ) {
	if ( !hasClass( elem, name ) ) {
		elem.className += ( elem.className ? " " : "" ) + name;
	}
}

function toggleClass( elem, name ) {
	if ( hasClass( elem, name ) ) {
		removeClass( elem, name );
	} else {
		addClass( elem, name );
	}
}

function removeClass( elem, name ) {
	var set = " " + elem.className + " ";

	// Class name may appear multiple times
	while ( set.indexOf( " " + name + " " ) >= 0 ) {
		set = set.replace( " " + name + " ", " " );
	}

	// trim for prettiness
	elem.className = typeof set.trim === "function" ? set.trim() : set.replace( /^\s+|\s+$/g, "" );
}

function id( name ) {
	return defined.document && document.getElementById && document.getElementById( name );
}

function getUrlConfigHtml() {
	var i, j, val,
		escaped, escapedTooltip,
		selection = false,
		len = config.urlConfig.length,
		urlConfigHtml = "";

	for ( i = 0; i < len; i++ ) {
		val = config.urlConfig[ i ];
		if ( typeof val === "string" ) {
			val = {
				id: val,
				label: val
			};
		}

		escaped = escapeText( val.id );
		escapedTooltip = escapeText( val.tooltip );

		if ( config[ val.id ] === undefined ) {
			config[ val.id ] = QUnit.urlParams[ val.id ];
		}

		if ( !val.value || typeof val.value === "string" ) {
			urlConfigHtml += "<input id='qunit-urlconfig-" + escaped +
				"' name='" + escaped + "' type='checkbox'" +
				( val.value ? " value='" + escapeText( val.value ) + "'" : "" ) +
				( config[ val.id ] ? " checked='checked'" : "" ) +
				" title='" + escapedTooltip + "' /><label for='qunit-urlconfig-" + escaped +
				"' title='" + escapedTooltip + "'>" + val.label + "</label>";
		} else {
			urlConfigHtml += "<label for='qunit-urlconfig-" + escaped +
				"' title='" + escapedTooltip + "'>" + val.label +
				": </label><select id='qunit-urlconfig-" + escaped +
				"' name='" + escaped + "' title='" + escapedTooltip + "'><option></option>";

			if ( QUnit.is( "array", val.value ) ) {
				for ( j = 0; j < val.value.length; j++ ) {
					escaped = escapeText( val.value[ j ] );
					urlConfigHtml += "<option value='" + escaped + "'" +
						( config[ val.id ] === val.value[ j ] ?
							( selection = true ) && " selected='selected'" : "" ) +
						">" + escaped + "</option>";
				}
			} else {
				for ( j in val.value ) {
					if ( hasOwn.call( val.value, j ) ) {
						urlConfigHtml += "<option value='" + escapeText( j ) + "'" +
							( config[ val.id ] === j ?
								( selection = true ) && " selected='selected'" : "" ) +
							">" + escapeText( val.value[ j ] ) + "</option>";
					}
				}
			}
			if ( config[ val.id ] && !selection ) {
				escaped = escapeText( config[ val.id ] );
				urlConfigHtml += "<option value='" + escaped +
					"' selected='selected' disabled='disabled'>" + escaped + "</option>";
			}
			urlConfigHtml += "</select>";
		}
	}

	return urlConfigHtml;
}

// Handle "click" events on toolbar checkboxes and "change" for select menus.
// Updates the URL with the new state of `config.urlConfig` values.
function toolbarChanged() {
	var updatedUrl, value,
		field = this,
		params = {};

	// Detect if field is a select menu or a checkbox
	if ( "selectedIndex" in field ) {
		value = field.options[ field.selectedIndex ].value || undefined;
	} else {
		value = field.checked ? ( field.defaultValue || true ) : undefined;
	}

	params[ field.name ] = value;
	updatedUrl = setUrl( params );

	if ( "hidepassed" === field.name && "replaceState" in window.history ) {
		config[ field.name ] = value || false;
		if ( value ) {
			addClass( id( "qunit-tests" ), "hidepass" );
		} else {
			removeClass( id( "qunit-tests" ), "hidepass" );
		}

		// It is not necessary to refresh the whole page
		window.history.replaceState( null, "", updatedUrl );
	} else {
		window.location = updatedUrl;
	}
}

function setUrl( params ) {
	var key,
		querystring = "?";

	params = QUnit.extend( QUnit.extend( {}, QUnit.urlParams ), params );

	for ( key in params ) {
		if ( hasOwn.call( params, key ) ) {
			if ( params[ key ] === undefined ) {
				continue;
			}
			querystring += encodeURIComponent( key );
			if ( params[ key ] !== true ) {
				querystring += "=" + encodeURIComponent( params[ key ] );
			}
			querystring += "&";
		}
	}
	return location.protocol + "//" + location.host +
		location.pathname + querystring.slice( 0, -1 );
}

function applyUrlParams() {
	var selectedModule,
		modulesList = id( "qunit-modulefilter" ),
		filter = id( "qunit-filter-input" ).value;

	selectedModule = modulesList ?
		decodeURIComponent( modulesList.options[ modulesList.selectedIndex ].value ) :
		undefined;

	window.location = setUrl({
		module: ( selectedModule === "" ) ? undefined : selectedModule,
		filter: ( filter === "" ) ? undefined : filter,

		// Remove testId filter
		testId: undefined
	});
}

function toolbarUrlConfigContainer() {
	var urlConfigContainer = document.createElement( "span" );

	urlConfigContainer.innerHTML = getUrlConfigHtml();
	addClass( urlConfigContainer, "qunit-url-config" );

	// For oldIE support:
	// * Add handlers to the individual elements instead of the container
	// * Use "click" instead of "change" for checkboxes
	addEvents( urlConfigContainer.getElementsByTagName( "input" ), "click", toolbarChanged );
	addEvents( urlConfigContainer.getElementsByTagName( "select" ), "change", toolbarChanged );

	return urlConfigContainer;
}

function toolbarLooseFilter() {
	var filter = document.createElement( "form" ),
		label = document.createElement( "label" ),
		input = document.createElement( "input" ),
		button = document.createElement( "button" );

	addClass( filter, "qunit-filter" );

	label.innerHTML = "Filter: ";

	input.type = "text";
	input.value = config.filter || "";
	input.name = "filter";
	input.id = "qunit-filter-input";

	button.innerHTML = "Go";

	label.appendChild( input );

	filter.appendChild( label );
	filter.appendChild( button );
	addEvent( filter, "submit", function( ev ) {
		applyUrlParams();

		if ( ev && ev.preventDefault ) {
			ev.preventDefault();
		}

		return false;
	});

	return filter;
}

function toolbarModuleFilterHtml() {
	var i,
		moduleFilterHtml = "";

	if ( !modulesList.length ) {
		return false;
	}

	modulesList.sort(function( a, b ) {
		return a.localeCompare( b );
	});

	moduleFilterHtml += "<label for='qunit-modulefilter'>Module: </label>" +
		"<select id='qunit-modulefilter' name='modulefilter'><option value='' " +
		( QUnit.urlParams.module === undefined ? "selected='selected'" : "" ) +
		">< All Modules ></option>";

	for ( i = 0; i < modulesList.length; i++ ) {
		moduleFilterHtml += "<option value='" +
			escapeText( encodeURIComponent( modulesList[ i ] ) ) + "' " +
			( QUnit.urlParams.module === modulesList[ i ] ? "selected='selected'" : "" ) +
			">" + escapeText( modulesList[ i ] ) + "</option>";
	}
	moduleFilterHtml += "</select>";

	return moduleFilterHtml;
}

function toolbarModuleFilter() {
	var toolbar = id( "qunit-testrunner-toolbar" ),
		moduleFilter = document.createElement( "span" ),
		moduleFilterHtml = toolbarModuleFilterHtml();

	if ( !toolbar || !moduleFilterHtml ) {
		return false;
	}

	moduleFilter.setAttribute( "id", "qunit-modulefilter-container" );
	moduleFilter.innerHTML = moduleFilterHtml;

	addEvent( moduleFilter.lastChild, "change", applyUrlParams );

	toolbar.appendChild( moduleFilter );
}

function appendToolbar() {
	var toolbar = id( "qunit-testrunner-toolbar" );

	if ( toolbar ) {
		toolbar.appendChild( toolbarUrlConfigContainer() );
		toolbar.appendChild( toolbarLooseFilter() );
	}
}

function appendHeader() {
	var header = id( "qunit-header" );

	if ( header ) {
		header.innerHTML = "<a href='" +
			escapeText( setUrl( { filter: undefined, module: undefined, testId: undefined } ) ) +
			"'>" + header.innerHTML + "</a> ";
	}
}

function appendBanner() {
	var banner = id( "qunit-banner" );

	if ( banner ) {
		banner.className = "";
	}
}

function appendTestResults() {
	var tests = id( "qunit-tests" ),
		result = id( "qunit-testresult" );

	if ( result ) {
		result.parentNode.removeChild( result );
	}

	if ( tests ) {
		tests.innerHTML = "";
		result = document.createElement( "p" );
		result.id = "qunit-testresult";
		result.className = "result";
		tests.parentNode.insertBefore( result, tests );
		result.innerHTML = "Running...<br />&#160;";
	}
}

function storeFixture() {
	var fixture = id( "qunit-fixture" );
	if ( fixture ) {
		config.fixture = fixture.innerHTML;
	}
}

function appendFilteredTest() {
	var testId = QUnit.config.testId;
	if ( !testId || testId.length <= 0 ) {
		return "";
	}
	return "<div id='qunit-filteredTest'>Rerunning selected tests: " +
		escapeText( testId.join(", ") ) +
		" <a id='qunit-clearFilter' href='" +
		escapeText( setUrl( { filter: undefined, module: undefined, testId: undefined } ) ) +
		"'>" + "Run all tests" + "</a></div>";
}

function appendUserAgent() {
	var userAgent = id( "qunit-userAgent" );

	if ( userAgent ) {
		userAgent.innerHTML = "";
		userAgent.appendChild(
			document.createTextNode(
				"QUnit " + QUnit.version + "; " + navigator.userAgent
			)
		);
	}
}

function appendTestsList( modules ) {
	var i, l, x, z, test, moduleObj;

	for ( i = 0, l = modules.length; i < l; i++ ) {
		moduleObj = modules[ i ];

		if ( moduleObj.name ) {
			modulesList.push( moduleObj.name );
		}

		for ( x = 0, z = moduleObj.tests.length; x < z; x++ ) {
			test = moduleObj.tests[ x ];

			appendTest( test.name, test.testId, moduleObj.name );
		}
	}
}

function appendTest( name, testId, moduleName ) {
	var title, rerunTrigger, testBlock, assertList,
		tests = id( "qunit-tests" );

	if ( !tests ) {
		return;
	}

	title = document.createElement( "strong" );
	title.innerHTML = getNameHtml( name, moduleName );

	rerunTrigger = document.createElement( "a" );
	rerunTrigger.innerHTML = "Rerun";
	rerunTrigger.href = setUrl({ testId: testId });

	testBlock = document.createElement( "li" );
	testBlock.appendChild( title );
	testBlock.appendChild( rerunTrigger );
	testBlock.id = "qunit-test-output-" + testId;

	assertList = document.createElement( "ol" );
	assertList.className = "qunit-assert-list";

	testBlock.appendChild( assertList );

	tests.appendChild( testBlock );
}

// HTML Reporter initialization and load
QUnit.begin(function( details ) {
	var qunit = id( "qunit" );

	// Fixture is the only one necessary to run without the #qunit element
	storeFixture();

	if ( qunit ) {
		qunit.innerHTML =
			"<h1 id='qunit-header'>" + escapeText( document.title ) + "</h1>" +
			"<h2 id='qunit-banner'></h2>" +
			"<div id='qunit-testrunner-toolbar'></div>" +
			appendFilteredTest() +
			"<h2 id='qunit-userAgent'></h2>" +
			"<ol id='qunit-tests'></ol>";
	}

	appendHeader();
	appendBanner();
	appendTestResults();
	appendUserAgent();
	appendToolbar();
	appendTestsList( details.modules );
	toolbarModuleFilter();

	if ( qunit && config.hidepassed ) {
		addClass( qunit.lastChild, "hidepass" );
	}
});

QUnit.done(function( details ) {
	var i, key,
		banner = id( "qunit-banner" ),
		tests = id( "qunit-tests" ),
		html = [
			"Tests completed in ",
			details.runtime,
			" milliseconds.<br />",
			"<span class='passed'>",
			details.passed,
			"</span> assertions of <span class='total'>",
			details.total,
			"</span> passed, <span class='failed'>",
			details.failed,
			"</span> failed."
		].join( "" );

	if ( banner ) {
		banner.className = details.failed ? "qunit-fail" : "qunit-pass";
	}

	if ( tests ) {
		id( "qunit-testresult" ).innerHTML = html;
	}

	if ( config.altertitle && defined.document && document.title ) {

		// show ✖ for good, ✔ for bad suite result in title
		// use escape sequences in case file gets loaded with non-utf-8-charset
		document.title = [
			( details.failed ? "\u2716" : "\u2714" ),
			document.title.replace( /^[\u2714\u2716] /i, "" )
		].join( " " );
	}

	// clear own sessionStorage items if all tests passed
	if ( config.reorder && defined.sessionStorage && details.failed === 0 ) {
		for ( i = 0; i < sessionStorage.length; i++ ) {
			key = sessionStorage.key( i++ );
			if ( key.indexOf( "qunit-test-" ) === 0 ) {
				sessionStorage.removeItem( key );
			}
		}
	}

	// scroll back to top to show results
	if ( config.scrolltop && window.scrollTo ) {
		window.scrollTo( 0, 0 );
	}
});

function getNameHtml( name, module ) {
	var nameHtml = "";

	if ( module ) {
		nameHtml = "<span class='module-name'>" + escapeText( module ) + "</span>: ";
	}

	nameHtml += "<span class='test-name'>" + escapeText( name ) + "</span>";

	return nameHtml;
}

QUnit.testStart(function( details ) {
	var running, testBlock, bad;

	testBlock = id( "qunit-test-output-" + details.testId );
	if ( testBlock ) {
		testBlock.className = "running";
	} else {

		// Report later registered tests
		appendTest( details.name, details.testId, details.module );
	}

	running = id( "qunit-testresult" );
	if ( running ) {
		bad = QUnit.config.reorder && defined.sessionStorage &&
			+sessionStorage.getItem( "qunit-test-" + details.module + "-" + details.name );

		running.innerHTML = ( bad ?
			"Rerunning previously failed test: <br />" :
			"Running: <br />" ) +
			getNameHtml( details.name, details.module );
	}

});

function stripHtml( string ) {
	// strip tags, html entity and whitespaces
	return string.replace(/<\/?[^>]+(>|$)/g, "").replace(/\&quot;/g, "").replace(/\s+/g, "");
}

QUnit.log(function( details ) {
	var assertList, assertLi,
		message, expected, actual, diff,
		showDiff = false,
		testItem = id( "qunit-test-output-" + details.testId );

	if ( !testItem ) {
		return;
	}

	message = escapeText( details.message ) || ( details.result ? "okay" : "failed" );
	message = "<span class='test-message'>" + message + "</span>";
	message += "<span class='runtime'>@ " + details.runtime + " ms</span>";

	// pushFailure doesn't provide details.expected
	// when it calls, it's implicit to also not show expected and diff stuff
	// Also, we need to check details.expected existence, as it can exist and be undefined
	if ( !details.result && hasOwn.call( details, "expected" ) ) {
		if ( details.negative ) {
			expected = escapeText( "NOT " + QUnit.dump.parse( details.expected ) );
		} else {
			expected = escapeText( QUnit.dump.parse( details.expected ) );
		}

		actual = escapeText( QUnit.dump.parse( details.actual ) );
		message += "<table><tr class='test-expected'><th>Expected: </th><td><pre>" +
			expected +
			"</pre></td></tr>";

		if ( actual !== expected ) {

			message += "<tr class='test-actual'><th>Result: </th><td><pre>" +
				actual + "</pre></td></tr>";

			// Don't show diff if actual or expected are booleans
			if ( !( /^(true|false)$/.test( actual ) ) &&
					!( /^(true|false)$/.test( expected ) ) ) {
				diff = QUnit.diff( expected, actual );
				showDiff = stripHtml( diff ).length !==
					stripHtml( expected ).length +
					stripHtml( actual ).length;
			}

			// Don't show diff if expected and actual are totally different
			if ( showDiff ) {
				message += "<tr class='test-diff'><th>Diff: </th><td><pre>" +
					diff + "</pre></td></tr>";
			}
		} else if ( expected.indexOf( "[object Array]" ) !== -1 ||
				expected.indexOf( "[object Object]" ) !== -1 ) {
			message += "<tr class='test-message'><th>Message: </th><td>" +
				"Diff suppressed as the depth of object is more than current max depth (" +
				QUnit.config.maxDepth + ").<p>Hint: Use <code>QUnit.dump.maxDepth</code> to " +
				" run with a higher max depth or <a href='" +
				escapeText( setUrl( { maxDepth: -1 } ) ) + "'>" +
				"Rerun</a> without max depth.</p></td></tr>";
		}

		if ( details.source ) {
			message += "<tr class='test-source'><th>Source: </th><td><pre>" +
				escapeText( details.source ) + "</pre></td></tr>";
		}

		message += "</table>";

	// this occurs when pushFailure is set and we have an extracted stack trace
	} else if ( !details.result && details.source ) {
		message += "<table>" +
			"<tr class='test-source'><th>Source: </th><td><pre>" +
			escapeText( details.source ) + "</pre></td></tr>" +
			"</table>";
	}

	assertList = testItem.getElementsByTagName( "ol" )[ 0 ];

	assertLi = document.createElement( "li" );
	assertLi.className = details.result ? "pass" : "fail";
	assertLi.innerHTML = message;
	assertList.appendChild( assertLi );
});

QUnit.testDone(function( details ) {
	var testTitle, time, testItem, assertList,
		good, bad, testCounts, skipped, sourceName,
		tests = id( "qunit-tests" );

	if ( !tests ) {
		return;
	}

	testItem = id( "qunit-test-output-" + details.testId );

	assertList = testItem.getElementsByTagName( "ol" )[ 0 ];

	good = details.passed;
	bad = details.failed;

	// store result when possible
	if ( config.reorder && defined.sessionStorage ) {
		if ( bad ) {
			sessionStorage.setItem( "qunit-test-" + details.module + "-" + details.name, bad );
		} else {
			sessionStorage.removeItem( "qunit-test-" + details.module + "-" + details.name );
		}
	}

	if ( bad === 0 ) {

		// Collapse the passing tests
		addClass( assertList, "qunit-collapsed" );
	} else if ( bad && config.collapse && !collapseNext ) {

		// Skip collapsing the first failing test
		collapseNext = true;
	} else {

		// Collapse remaining tests
		addClass( assertList, "qunit-collapsed" );
	}

	// testItem.firstChild is the test name
	testTitle = testItem.firstChild;

	testCounts = bad ?
		"<b class='failed'>" + bad + "</b>, " + "<b class='passed'>" + good + "</b>, " :
		"";

	testTitle.innerHTML += " <b class='counts'>(" + testCounts +
		details.assertions.length + ")</b>";

	if ( details.skipped ) {
		testItem.className = "skipped";
		skipped = document.createElement( "em" );
		skipped.className = "qunit-skipped-label";
		skipped.innerHTML = "skipped";
		testItem.insertBefore( skipped, testTitle );
	} else {
		addEvent( testTitle, "click", function() {
			toggleClass( assertList, "qunit-collapsed" );
		});

		testItem.className = bad ? "fail" : "pass";

		time = document.createElement( "span" );
		time.className = "runtime";
		time.innerHTML = details.runtime + " ms";
		testItem.insertBefore( time, assertList );
	}

	// Show the source of the test when showing assertions
	if ( details.source ) {
		sourceName = document.createElement( "p" );
		sourceName.innerHTML = "<strong>Source: </strong>" + details.source;
		addClass( sourceName, "qunit-source" );
		if ( bad === 0 ) {
			addClass( sourceName, "qunit-collapsed" );
		}
		addEvent( testTitle, "click", function() {
			toggleClass( sourceName, "qunit-collapsed" );
		});
		testItem.appendChild( sourceName );
	}
});

if ( defined.document ) {

	// Avoid readyState issue with phantomjs
	// Ref: #818
	var notPhantom = ( function( p ) {
		return !( p && p.version && p.version.major > 0 );
	} )( window.phantom );

	if ( notPhantom && document.readyState === "complete" ) {
		QUnit.load();
	} else {
		addEvent( window, "load", QUnit.load );
	}
} else {
	config.pageLoaded = true;
	config.autorun = true;
}

})();

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var searchComponent = function searchComponent() {

    return {
        template: function template() {
            return '\n                <form>\n                    <label for="search">What did you eat today ?</label>\n                    <div>\n                        <input type="text" name="search" placeholder="Tacos, coffee, bannana, ..." />\n                        <input type="button" value="Search" />\n                    </div>\n                </form>';
        },
        init: function init() {
            var root = document.createElement('div');
            root.classList.add('root');
            root.innerHTML = this.template();

            this.fragment = document.createDocumentFragment();
            this.fragment.appendChild(root);

            var button = this.fragment.querySelector('input[type=button]');
            var searchField = this.fragment.querySelector('input[name=search]');

            button.addEventListener('click', function (e) {

                window.console.log(e, searchField.value);
            });
            return this;
        },
        render: function render(container) {
            if (this.fragment && container instanceof HTMLElement) {
                container.appendChild(this.fragment.querySelector('.root > *'));
            }
            return this;
        }
    };
};

exports.default = searchComponent;

},{}],3:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _qunitjs = require('qunitjs');

var _qunitjs2 = _interopRequireDefault(_qunitjs);

var _search = require('../../src/components/search.js');

var _search2 = _interopRequireDefault(_search);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_qunitjs2.default.module('API');

_qunitjs2.default.test('factory', function (assert) {
    assert.equal(typeof _search2.default === 'undefined' ? 'undefined' : _typeof(_search2.default), 'function', 'The component module expose a function');
    assert.equal(_typeof((0, _search2.default)()), 'object', 'The component factory creates an object');
    assert.notDeepEqual((0, _search2.default)(), (0, _search2.default)(), 'The component factory creates new objects');
});

_qunitjs2.default.test('component', function (assert) {
    var component = (0, _search2.default)();
    assert.equal(_typeof(component.init), 'function', 'The component exposes an init method');
    assert.equal(_typeof(component.render), 'function', 'The component exposes a render method');
});

},{"../../src/components/search.js":2,"qunitjs":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcXVuaXRqcy9xdW5pdC9xdW5pdC5qcyIsInB1YmxpYy9qcy9zcmMvY29tcG9uZW50cy9zZWFyY2guanMiLCJwdWJsaWMvanMvdGVzdC9jb21wb25lbnRzL3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7O0FDNW1JQSxJQUFNLGtCQUFrQixTQUFTLGVBQVQsR0FBMkI7O0FBRS9DLFdBQU87QUFDSCxzQ0FBVTtBQUNOLCtXQURNO1NBRFA7QUFZSCw4QkFBTTtBQUNGLGdCQUFNLE9BQU8sU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQVAsQ0FESjtBQUVGLGlCQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE1BQW5CLEVBRkU7QUFHRixpQkFBSyxTQUFMLEdBQWlCLEtBQUssUUFBTCxFQUFqQixDQUhFOztBQUtGLGlCQUFLLFFBQUwsR0FBZ0IsU0FBUyxzQkFBVCxFQUFoQixDQUxFO0FBTUYsaUJBQUssUUFBTCxDQUFjLFdBQWQsQ0FBMEIsSUFBMUIsRUFORTs7QUFRRixnQkFBTSxTQUFTLEtBQUssUUFBTCxDQUFjLGFBQWQsQ0FBNEIsb0JBQTVCLENBQVQsQ0FSSjtBQVNGLGdCQUFNLGNBQWMsS0FBSyxRQUFMLENBQWMsYUFBZCxDQUE0QixvQkFBNUIsQ0FBZCxDQVRKOztBQVdGLG1CQUFPLGdCQUFQLENBQXdCLE9BQXhCLEVBQWlDLGFBQUs7O0FBRWxDLHVCQUFPLE9BQVAsQ0FBZSxHQUFmLENBQW1CLENBQW5CLEVBQXNCLFlBQVksS0FBWixDQUF0QixDQUZrQzthQUFMLENBQWpDLENBWEU7QUFlRixtQkFBTyxJQUFQLENBZkU7U0FaSDtBQThCSCxnQ0FBTyxXQUFVO0FBQ2IsZ0JBQUcsS0FBSyxRQUFMLElBQWlCLHFCQUFxQixXQUFyQixFQUFpQztBQUNqRCwwQkFBVSxXQUFWLENBQXNCLEtBQUssUUFBTCxDQUFjLGFBQWQsQ0FBNEIsV0FBNUIsQ0FBdEIsRUFEaUQ7YUFBckQ7QUFHQSxtQkFBTyxJQUFQLENBSmE7U0E5QmQ7S0FBUCxDQUYrQztDQUEzQjs7a0JBeUNUOzs7Ozs7O0FDekNmOzs7O0FBQ0E7Ozs7OztBQUVBLGtCQUFNLE1BQU4sQ0FBYSxLQUFiOztBQUVBLGtCQUFNLElBQU4sQ0FBVyxTQUFYLEVBQXNCLGtCQUFVO0FBQzVCLFdBQU8sS0FBUCxvRkFBc0MsVUFBdEMsRUFBa0Qsd0NBQWxELEVBRDRCO0FBRTVCLFdBQU8sS0FBUCxTQUFxQix3QkFBckIsRUFBd0MsUUFBeEMsRUFBa0QseUNBQWxELEVBRjRCO0FBRzVCLFdBQU8sWUFBUCxDQUFvQix1QkFBcEIsRUFBdUMsdUJBQXZDLEVBQTBELDJDQUExRCxFQUg0QjtDQUFWLENBQXRCOztBQU1BLGtCQUFNLElBQU4sQ0FBVyxXQUFYLEVBQXdCLGtCQUFVO0FBQzlCLFFBQUksWUFBWSx1QkFBWixDQUQwQjtBQUU5QixXQUFPLEtBQVAsU0FBcUIsVUFBVSxJQUFWLENBQXJCLEVBQXFDLFVBQXJDLEVBQWlELHNDQUFqRCxFQUY4QjtBQUc5QixXQUFPLEtBQVAsU0FBcUIsVUFBVSxNQUFWLENBQXJCLEVBQXVDLFVBQXZDLEVBQW1ELHVDQUFuRCxFQUg4QjtDQUFWLENBQXhCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogUVVuaXQgMS4yMi4wXG4gKiBodHRwczovL3F1bml0anMuY29tL1xuICpcbiAqIENvcHlyaWdodCBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vanF1ZXJ5Lm9yZy9saWNlbnNlXG4gKlxuICogRGF0ZTogMjAxNi0wMi0yM1QxNTo1N1pcbiAqL1xuXG4oZnVuY3Rpb24oIGdsb2JhbCApIHtcblxudmFyIFFVbml0ID0ge307XG5cbnZhciBEYXRlID0gZ2xvYmFsLkRhdGU7XG52YXIgbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbn07XG5cbnZhciBzZXRUaW1lb3V0ID0gZ2xvYmFsLnNldFRpbWVvdXQ7XG52YXIgY2xlYXJUaW1lb3V0ID0gZ2xvYmFsLmNsZWFyVGltZW91dDtcblxuLy8gU3RvcmUgYSBsb2NhbCB3aW5kb3cgZnJvbSB0aGUgZ2xvYmFsIHRvIGFsbG93IGRpcmVjdCByZWZlcmVuY2VzLlxudmFyIHdpbmRvdyA9IGdsb2JhbC53aW5kb3c7XG5cbnZhciBkZWZpbmVkID0ge1xuXHRkb2N1bWVudDogd2luZG93ICYmIHdpbmRvdy5kb2N1bWVudCAhPT0gdW5kZWZpbmVkLFxuXHRzZXRUaW1lb3V0OiBzZXRUaW1lb3V0ICE9PSB1bmRlZmluZWQsXG5cdHNlc3Npb25TdG9yYWdlOiAoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHggPSBcInF1bml0LXRlc3Qtc3RyaW5nXCI7XG5cdFx0dHJ5IHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oIHgsIHggKTtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIHggKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fSgpIClcbn07XG5cbnZhciBmaWxlTmFtZSA9ICggc291cmNlRnJvbVN0YWNrdHJhY2UoIDAgKSB8fCBcIlwiICkucmVwbGFjZSggLyg6XFxkKykrXFwpPy8sIFwiXCIgKS5yZXBsYWNlKCAvLitcXC8vLCBcIlwiICk7XG52YXIgZ2xvYmFsU3RhcnRDYWxsZWQgPSBmYWxzZTtcbnZhciBydW5TdGFydGVkID0gZmFsc2U7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIHJldHVybnMgYSBuZXcgQXJyYXkgd2l0aCB0aGUgZWxlbWVudHMgdGhhdCBhcmUgaW4gYSBidXQgbm90IGluIGJcbmZ1bmN0aW9uIGRpZmYoIGEsIGIgKSB7XG5cdHZhciBpLCBqLFxuXHRcdHJlc3VsdCA9IGEuc2xpY2UoKTtcblxuXHRmb3IgKCBpID0gMDsgaSA8IHJlc3VsdC5sZW5ndGg7IGkrKyApIHtcblx0XHRmb3IgKCBqID0gMDsgaiA8IGIubGVuZ3RoOyBqKysgKSB7XG5cdFx0XHRpZiAoIHJlc3VsdFsgaSBdID09PSBiWyBqIF0gKSB7XG5cdFx0XHRcdHJlc3VsdC5zcGxpY2UoIGksIDEgKTtcblx0XHRcdFx0aS0tO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gZnJvbSBqcXVlcnkuanNcbmZ1bmN0aW9uIGluQXJyYXkoIGVsZW0sIGFycmF5ICkge1xuXHRpZiAoIGFycmF5LmluZGV4T2YgKSB7XG5cdFx0cmV0dXJuIGFycmF5LmluZGV4T2YoIGVsZW0gKTtcblx0fVxuXG5cdGZvciAoIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0aWYgKCBhcnJheVsgaSBdID09PSBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIE1ha2VzIGEgY2xvbmUgb2YgYW4gb2JqZWN0IHVzaW5nIG9ubHkgQXJyYXkgb3IgT2JqZWN0IGFzIGJhc2UsXG4gKiBhbmQgY29waWVzIG92ZXIgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fSBOZXcgb2JqZWN0IHdpdGggb25seSB0aGUgb3duIHByb3BlcnRpZXMgKHJlY3Vyc2l2ZWx5KS5cbiAqL1xuZnVuY3Rpb24gb2JqZWN0VmFsdWVzICggb2JqICkge1xuXHR2YXIga2V5LCB2YWwsXG5cdFx0dmFscyA9IFFVbml0LmlzKCBcImFycmF5XCIsIG9iaiApID8gW10gOiB7fTtcblx0Zm9yICgga2V5IGluIG9iaiApIHtcblx0XHRpZiAoIGhhc093bi5jYWxsKCBvYmosIGtleSApICkge1xuXHRcdFx0dmFsID0gb2JqWyBrZXkgXTtcblx0XHRcdHZhbHNbIGtleSBdID0gdmFsID09PSBPYmplY3QoIHZhbCApID8gb2JqZWN0VmFsdWVzKCB2YWwgKSA6IHZhbDtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHZhbHM7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZCggYSwgYiwgdW5kZWZPbmx5ICkge1xuXHRmb3IgKCB2YXIgcHJvcCBpbiBiICkge1xuXHRcdGlmICggaGFzT3duLmNhbGwoIGIsIHByb3AgKSApIHtcblxuXHRcdFx0Ly8gQXZvaWQgXCJNZW1iZXIgbm90IGZvdW5kXCIgZXJyb3IgaW4gSUU4IGNhdXNlZCBieSBtZXNzaW5nIHdpdGggd2luZG93LmNvbnN0cnVjdG9yXG5cdFx0XHQvLyBUaGlzIGJsb2NrIHJ1bnMgb24gZXZlcnkgZW52aXJvbm1lbnQsIHNvIGBnbG9iYWxgIGlzIGJlaW5nIHVzZWQgaW5zdGVhZCBvZiBgd2luZG93YFxuXHRcdFx0Ly8gdG8gYXZvaWQgZXJyb3JzIG9uIG5vZGUuXG5cdFx0XHRpZiAoIHByb3AgIT09IFwiY29uc3RydWN0b3JcIiB8fCBhICE9PSBnbG9iYWwgKSB7XG5cdFx0XHRcdGlmICggYlsgcHJvcCBdID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIGFbIHByb3AgXTtcblx0XHRcdFx0fSBlbHNlIGlmICggISggdW5kZWZPbmx5ICYmIHR5cGVvZiBhWyBwcm9wIF0gIT09IFwidW5kZWZpbmVkXCIgKSApIHtcblx0XHRcdFx0XHRhWyBwcm9wIF0gPSBiWyBwcm9wIF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gYTtcbn1cblxuZnVuY3Rpb24gb2JqZWN0VHlwZSggb2JqICkge1xuXHRpZiAoIHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0cmV0dXJuIFwidW5kZWZpbmVkXCI7XG5cdH1cblxuXHQvLyBDb25zaWRlcjogdHlwZW9mIG51bGwgPT09IG9iamVjdFxuXHRpZiAoIG9iaiA9PT0gbnVsbCApIHtcblx0XHRyZXR1cm4gXCJudWxsXCI7XG5cdH1cblxuXHR2YXIgbWF0Y2ggPSB0b1N0cmluZy5jYWxsKCBvYmogKS5tYXRjaCggL15cXFtvYmplY3RcXHMoLiopXFxdJC8gKSxcblx0XHR0eXBlID0gbWF0Y2ggJiYgbWF0Y2hbIDEgXTtcblxuXHRzd2l0Y2ggKCB0eXBlICkge1xuXHRcdGNhc2UgXCJOdW1iZXJcIjpcblx0XHRcdGlmICggaXNOYU4oIG9iaiApICkge1xuXHRcdFx0XHRyZXR1cm4gXCJuYW5cIjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBcIm51bWJlclwiO1xuXHRcdGNhc2UgXCJTdHJpbmdcIjpcblx0XHRjYXNlIFwiQm9vbGVhblwiOlxuXHRcdGNhc2UgXCJBcnJheVwiOlxuXHRcdGNhc2UgXCJTZXRcIjpcblx0XHRjYXNlIFwiTWFwXCI6XG5cdFx0Y2FzZSBcIkRhdGVcIjpcblx0XHRjYXNlIFwiUmVnRXhwXCI6XG5cdFx0Y2FzZSBcIkZ1bmN0aW9uXCI6XG5cdFx0Y2FzZSBcIlN5bWJvbFwiOlxuXHRcdFx0cmV0dXJuIHR5cGUudG9Mb3dlckNhc2UoKTtcblx0fVxuXHRpZiAoIHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0cmV0dXJuIFwib2JqZWN0XCI7XG5cdH1cbn1cblxuLy8gU2FmZSBvYmplY3QgdHlwZSBjaGVja2luZ1xuZnVuY3Rpb24gaXMoIHR5cGUsIG9iaiApIHtcblx0cmV0dXJuIFFVbml0Lm9iamVjdFR5cGUoIG9iaiApID09PSB0eXBlO1xufVxuXG52YXIgZ2V0VXJsUGFyYW1zID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpLCBwYXJhbSwgbmFtZSwgdmFsdWU7XG5cdHZhciB1cmxQYXJhbXMgPSB7fTtcblx0dmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuXHR2YXIgcGFyYW1zID0gbG9jYXRpb24uc2VhcmNoLnNsaWNlKCAxICkuc3BsaXQoIFwiJlwiICk7XG5cdHZhciBsZW5ndGggPSBwYXJhbXMubGVuZ3RoO1xuXG5cdGZvciAoIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0aWYgKCBwYXJhbXNbIGkgXSApIHtcblx0XHRcdHBhcmFtID0gcGFyYW1zWyBpIF0uc3BsaXQoIFwiPVwiICk7XG5cdFx0XHRuYW1lID0gZGVjb2RlVVJJQ29tcG9uZW50KCBwYXJhbVsgMCBdICk7XG5cblx0XHRcdC8vIGFsbG93IGp1c3QgYSBrZXkgdG8gdHVybiBvbiBhIGZsYWcsIGUuZy4sIHRlc3QuaHRtbD9ub2dsb2JhbHNcblx0XHRcdHZhbHVlID0gcGFyYW0ubGVuZ3RoID09PSAxIHx8XG5cdFx0XHRcdGRlY29kZVVSSUNvbXBvbmVudCggcGFyYW0uc2xpY2UoIDEgKS5qb2luKCBcIj1cIiApICkgO1xuXHRcdFx0aWYgKCB1cmxQYXJhbXNbIG5hbWUgXSApIHtcblx0XHRcdFx0dXJsUGFyYW1zWyBuYW1lIF0gPSBbXS5jb25jYXQoIHVybFBhcmFtc1sgbmFtZSBdLCB2YWx1ZSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dXJsUGFyYW1zWyBuYW1lIF0gPSB2YWx1ZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdXJsUGFyYW1zO1xufTtcblxuLy8gRG9lc24ndCBzdXBwb3J0IElFNiB0byBJRTksIGl0IHdpbGwgcmV0dXJuIHVuZGVmaW5lZCBvbiB0aGVzZSBicm93c2Vyc1xuLy8gU2VlIGFsc28gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRXJyb3IvU3RhY2tcbmZ1bmN0aW9uIGV4dHJhY3RTdGFja3RyYWNlKCBlLCBvZmZzZXQgKSB7XG5cdG9mZnNldCA9IG9mZnNldCA9PT0gdW5kZWZpbmVkID8gNCA6IG9mZnNldDtcblxuXHR2YXIgc3RhY2ssIGluY2x1ZGUsIGk7XG5cblx0aWYgKCBlLnN0YWNrICkge1xuXHRcdHN0YWNrID0gZS5zdGFjay5zcGxpdCggXCJcXG5cIiApO1xuXHRcdGlmICggL15lcnJvciQvaS50ZXN0KCBzdGFja1sgMCBdICkgKSB7XG5cdFx0XHRzdGFjay5zaGlmdCgpO1xuXHRcdH1cblx0XHRpZiAoIGZpbGVOYW1lICkge1xuXHRcdFx0aW5jbHVkZSA9IFtdO1xuXHRcdFx0Zm9yICggaSA9IG9mZnNldDsgaSA8IHN0YWNrLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIHN0YWNrWyBpIF0uaW5kZXhPZiggZmlsZU5hbWUgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0aW5jbHVkZS5wdXNoKCBzdGFja1sgaSBdICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGluY2x1ZGUubGVuZ3RoICkge1xuXHRcdFx0XHRyZXR1cm4gaW5jbHVkZS5qb2luKCBcIlxcblwiICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBzdGFja1sgb2Zmc2V0IF07XG5cblx0Ly8gU3VwcG9ydDogU2FmYXJpIDw9NiBvbmx5XG5cdH0gZWxzZSBpZiAoIGUuc291cmNlVVJMICkge1xuXG5cdFx0Ly8gZXhjbHVkZSB1c2VsZXNzIHNlbGYtcmVmZXJlbmNlIGZvciBnZW5lcmF0ZWQgRXJyb3Igb2JqZWN0c1xuXHRcdGlmICggL3F1bml0LmpzJC8udGVzdCggZS5zb3VyY2VVUkwgKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBmb3IgYWN0dWFsIGV4Y2VwdGlvbnMsIHRoaXMgaXMgdXNlZnVsXG5cdFx0cmV0dXJuIGUuc291cmNlVVJMICsgXCI6XCIgKyBlLmxpbmU7XG5cdH1cbn1cblxuZnVuY3Rpb24gc291cmNlRnJvbVN0YWNrdHJhY2UoIG9mZnNldCApIHtcblx0dmFyIGVycm9yID0gbmV3IEVycm9yKCk7XG5cblx0Ly8gU3VwcG9ydDogU2FmYXJpIDw9NyBvbmx5LCBJRSA8PTEwIC0gMTEgb25seVxuXHQvLyBOb3QgYWxsIGJyb3dzZXJzIGdlbmVyYXRlIHRoZSBgc3RhY2tgIHByb3BlcnR5IGZvciBgbmV3IEVycm9yKClgLCBzZWUgYWxzbyAjNjM2XG5cdGlmICggIWVycm9yLnN0YWNrICkge1xuXHRcdHRyeSB7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9IGNhdGNoICggZXJyICkge1xuXHRcdFx0ZXJyb3IgPSBlcnI7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGV4dHJhY3RTdGFja3RyYWNlKCBlcnJvciwgb2Zmc2V0ICk7XG59XG5cbi8qKlxuICogQ29uZmlnIG9iamVjdDogTWFpbnRhaW4gaW50ZXJuYWwgc3RhdGVcbiAqIExhdGVyIGV4cG9zZWQgYXMgUVVuaXQuY29uZmlnXG4gKiBgY29uZmlnYCBpbml0aWFsaXplZCBhdCB0b3Agb2Ygc2NvcGVcbiAqL1xudmFyIGNvbmZpZyA9IHtcblx0Ly8gVGhlIHF1ZXVlIG9mIHRlc3RzIHRvIHJ1blxuXHRxdWV1ZTogW10sXG5cblx0Ly8gYmxvY2sgdW50aWwgZG9jdW1lbnQgcmVhZHlcblx0YmxvY2tpbmc6IHRydWUsXG5cblx0Ly8gYnkgZGVmYXVsdCwgcnVuIHByZXZpb3VzbHkgZmFpbGVkIHRlc3RzIGZpcnN0XG5cdC8vIHZlcnkgdXNlZnVsIGluIGNvbWJpbmF0aW9uIHdpdGggXCJIaWRlIHBhc3NlZCB0ZXN0c1wiIGNoZWNrZWRcblx0cmVvcmRlcjogdHJ1ZSxcblxuXHQvLyBieSBkZWZhdWx0LCBtb2RpZnkgZG9jdW1lbnQudGl0bGUgd2hlbiBzdWl0ZSBpcyBkb25lXG5cdGFsdGVydGl0bGU6IHRydWUsXG5cblx0Ly8gSFRNTCBSZXBvcnRlcjogY29sbGFwc2UgZXZlcnkgdGVzdCBleGNlcHQgdGhlIGZpcnN0IGZhaWxpbmcgdGVzdFxuXHQvLyBJZiBmYWxzZSwgYWxsIGZhaWxpbmcgdGVzdHMgd2lsbCBiZSBleHBhbmRlZFxuXHRjb2xsYXBzZTogdHJ1ZSxcblxuXHQvLyBieSBkZWZhdWx0LCBzY3JvbGwgdG8gdG9wIG9mIHRoZSBwYWdlIHdoZW4gc3VpdGUgaXMgZG9uZVxuXHRzY3JvbGx0b3A6IHRydWUsXG5cblx0Ly8gZGVwdGggdXAtdG8gd2hpY2ggb2JqZWN0IHdpbGwgYmUgZHVtcGVkXG5cdG1heERlcHRoOiA1LFxuXG5cdC8vIHdoZW4gZW5hYmxlZCwgYWxsIHRlc3RzIG11c3QgY2FsbCBleHBlY3QoKVxuXHRyZXF1aXJlRXhwZWN0czogZmFsc2UsXG5cblx0Ly8gYWRkIGNoZWNrYm94ZXMgdGhhdCBhcmUgcGVyc2lzdGVkIGluIHRoZSBxdWVyeS1zdHJpbmdcblx0Ly8gd2hlbiBlbmFibGVkLCB0aGUgaWQgaXMgc2V0IHRvIGB0cnVlYCBhcyBhIGBRVW5pdC5jb25maWdgIHByb3BlcnR5XG5cdHVybENvbmZpZzogW1xuXHRcdHtcblx0XHRcdGlkOiBcImhpZGVwYXNzZWRcIixcblx0XHRcdGxhYmVsOiBcIkhpZGUgcGFzc2VkIHRlc3RzXCIsXG5cdFx0XHR0b29sdGlwOiBcIk9ubHkgc2hvdyB0ZXN0cyBhbmQgYXNzZXJ0aW9ucyB0aGF0IGZhaWwuIFN0b3JlZCBhcyBxdWVyeS1zdHJpbmdzLlwiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRpZDogXCJub2dsb2JhbHNcIixcblx0XHRcdGxhYmVsOiBcIkNoZWNrIGZvciBHbG9iYWxzXCIsXG5cdFx0XHR0b29sdGlwOiBcIkVuYWJsaW5nIHRoaXMgd2lsbCB0ZXN0IGlmIGFueSB0ZXN0IGludHJvZHVjZXMgbmV3IHByb3BlcnRpZXMgb24gdGhlIFwiICtcblx0XHRcdFx0XCJnbG9iYWwgb2JqZWN0IChgd2luZG93YCBpbiBCcm93c2VycykuIFN0b3JlZCBhcyBxdWVyeS1zdHJpbmdzLlwiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRpZDogXCJub3RyeWNhdGNoXCIsXG5cdFx0XHRsYWJlbDogXCJObyB0cnktY2F0Y2hcIixcblx0XHRcdHRvb2x0aXA6IFwiRW5hYmxpbmcgdGhpcyB3aWxsIHJ1biB0ZXN0cyBvdXRzaWRlIG9mIGEgdHJ5LWNhdGNoIGJsb2NrLiBNYWtlcyBkZWJ1Z2dpbmcgXCIgK1xuXHRcdFx0XHRcImV4Y2VwdGlvbnMgaW4gSUUgcmVhc29uYWJsZS4gU3RvcmVkIGFzIHF1ZXJ5LXN0cmluZ3MuXCJcblx0XHR9XG5cdF0sXG5cblx0Ly8gU2V0IG9mIGFsbCBtb2R1bGVzLlxuXHRtb2R1bGVzOiBbXSxcblxuXHQvLyBTdGFjayBvZiBuZXN0ZWQgbW9kdWxlc1xuXHRtb2R1bGVTdGFjazogW10sXG5cblx0Ly8gVGhlIGZpcnN0IHVubmFtZWQgbW9kdWxlXG5cdGN1cnJlbnRNb2R1bGU6IHtcblx0XHRuYW1lOiBcIlwiLFxuXHRcdHRlc3RzOiBbXVxuXHR9LFxuXG5cdGNhbGxiYWNrczoge31cbn07XG5cbnZhciB1cmxQYXJhbXMgPSBkZWZpbmVkLmRvY3VtZW50ID8gZ2V0VXJsUGFyYW1zKCkgOiB7fTtcblxuLy8gUHVzaCBhIGxvb3NlIHVubmFtZWQgbW9kdWxlIHRvIHRoZSBtb2R1bGVzIGNvbGxlY3Rpb25cbmNvbmZpZy5tb2R1bGVzLnB1c2goIGNvbmZpZy5jdXJyZW50TW9kdWxlICk7XG5cbmlmICggdXJsUGFyYW1zLmZpbHRlciA9PT0gdHJ1ZSApIHtcblx0ZGVsZXRlIHVybFBhcmFtcy5maWx0ZXI7XG59XG5cbi8vIFN0cmluZyBzZWFyY2ggYW55d2hlcmUgaW4gbW9kdWxlTmFtZSt0ZXN0TmFtZVxuY29uZmlnLmZpbHRlciA9IHVybFBhcmFtcy5maWx0ZXI7XG5cbmNvbmZpZy50ZXN0SWQgPSBbXTtcbmlmICggdXJsUGFyYW1zLnRlc3RJZCApIHtcblx0Ly8gRW5zdXJlIHRoYXQgdXJsUGFyYW1zLnRlc3RJZCBpcyBhbiBhcnJheVxuXHR1cmxQYXJhbXMudGVzdElkID0gZGVjb2RlVVJJQ29tcG9uZW50KCB1cmxQYXJhbXMudGVzdElkICkuc3BsaXQoIFwiLFwiICk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdXJsUGFyYW1zLnRlc3RJZC5sZW5ndGg7IGkrKyApIHtcblx0XHRjb25maWcudGVzdElkLnB1c2goIHVybFBhcmFtcy50ZXN0SWRbIGkgXSApO1xuXHR9XG59XG5cbnZhciBsb2dnaW5nQ2FsbGJhY2tzID0ge307XG5cbi8vIFJlZ2lzdGVyIGxvZ2dpbmcgY2FsbGJhY2tzXG5mdW5jdGlvbiByZWdpc3RlckxvZ2dpbmdDYWxsYmFja3MoIG9iaiApIHtcblx0dmFyIGksIGwsIGtleSxcblx0XHRjYWxsYmFja05hbWVzID0gWyBcImJlZ2luXCIsIFwiZG9uZVwiLCBcImxvZ1wiLCBcInRlc3RTdGFydFwiLCBcInRlc3REb25lXCIsXG5cdFx0XHRcIm1vZHVsZVN0YXJ0XCIsIFwibW9kdWxlRG9uZVwiIF07XG5cblx0ZnVuY3Rpb24gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2soIGtleSApIHtcblx0XHR2YXIgbG9nZ2luZ0NhbGxiYWNrID0gZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuXHRcdFx0aWYgKCBvYmplY3RUeXBlKCBjYWxsYmFjayApICE9PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0XHRcIlFVbml0IGxvZ2dpbmcgbWV0aG9kcyByZXF1aXJlIGEgY2FsbGJhY2sgZnVuY3Rpb24gYXMgdGhlaXIgZmlyc3QgcGFyYW1ldGVycy5cIlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25maWcuY2FsbGJhY2tzWyBrZXkgXS5wdXNoKCBjYWxsYmFjayApO1xuXHRcdH07XG5cblx0XHQvLyBERVBSRUNBVEVEOiBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBvbiBRVW5pdCAyLjAuMCtcblx0XHQvLyBTdG9yZXMgdGhlIHJlZ2lzdGVyZWQgZnVuY3Rpb25zIGFsbG93aW5nIHJlc3RvcmluZ1xuXHRcdC8vIGF0IHZlcmlmeUxvZ2dpbmdDYWxsYmFja3MoKSBpZiBtb2RpZmllZFxuXHRcdGxvZ2dpbmdDYWxsYmFja3NbIGtleSBdID0gbG9nZ2luZ0NhbGxiYWNrO1xuXG5cdFx0cmV0dXJuIGxvZ2dpbmdDYWxsYmFjaztcblx0fVxuXG5cdGZvciAoIGkgPSAwLCBsID0gY2FsbGJhY2tOYW1lcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0a2V5ID0gY2FsbGJhY2tOYW1lc1sgaSBdO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSBrZXkgY29sbGVjdGlvbiBvZiBsb2dnaW5nIGNhbGxiYWNrXG5cdFx0aWYgKCBvYmplY3RUeXBlKCBjb25maWcuY2FsbGJhY2tzWyBrZXkgXSApID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0Y29uZmlnLmNhbGxiYWNrc1sga2V5IF0gPSBbXTtcblx0XHR9XG5cblx0XHRvYmpbIGtleSBdID0gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2soIGtleSApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJ1bkxvZ2dpbmdDYWxsYmFja3MoIGtleSwgYXJncyApIHtcblx0dmFyIGksIGwsIGNhbGxiYWNrcztcblxuXHRjYWxsYmFja3MgPSBjb25maWcuY2FsbGJhY2tzWyBrZXkgXTtcblx0Zm9yICggaSA9IDAsIGwgPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdGNhbGxiYWNrc1sgaSBdKCBhcmdzICk7XG5cdH1cbn1cblxuLy8gREVQUkVDQVRFRDogVGhpcyB3aWxsIGJlIHJlbW92ZWQgb24gMi4wLjArXG4vLyBUaGlzIGZ1bmN0aW9uIHZlcmlmaWVzIGlmIHRoZSBsb2dnaW5nQ2FsbGJhY2tzIHdlcmUgbW9kaWZpZWQgYnkgdGhlIHVzZXJcbi8vIElmIHNvLCBpdCB3aWxsIHJlc3RvcmUgaXQsIGFzc2lnbiB0aGUgZ2l2ZW4gY2FsbGJhY2sgYW5kIHByaW50IGEgY29uc29sZSB3YXJuaW5nXG5mdW5jdGlvbiB2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCkge1xuXHR2YXIgbG9nZ2luZ0NhbGxiYWNrLCB1c2VyQ2FsbGJhY2s7XG5cblx0Zm9yICggbG9nZ2luZ0NhbGxiYWNrIGluIGxvZ2dpbmdDYWxsYmFja3MgKSB7XG5cdFx0aWYgKCBRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0gIT09IGxvZ2dpbmdDYWxsYmFja3NbIGxvZ2dpbmdDYWxsYmFjayBdICkge1xuXG5cdFx0XHR1c2VyQ2FsbGJhY2sgPSBRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF07XG5cblx0XHRcdC8vIFJlc3RvcmUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdFx0XHRRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0gPSBsb2dnaW5nQ2FsbGJhY2tzWyBsb2dnaW5nQ2FsbGJhY2sgXTtcblxuXHRcdFx0Ly8gQXNzaWduIHRoZSBkZXByZWNhdGVkIGdpdmVuIGNhbGxiYWNrXG5cdFx0XHRRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0oIHVzZXJDYWxsYmFjayApO1xuXG5cdFx0XHRpZiAoIGdsb2JhbC5jb25zb2xlICYmIGdsb2JhbC5jb25zb2xlLndhcm4gKSB7XG5cdFx0XHRcdGdsb2JhbC5jb25zb2xlLndhcm4oXG5cdFx0XHRcdFx0XCJRVW5pdC5cIiArIGxvZ2dpbmdDYWxsYmFjayArIFwiIHdhcyByZXBsYWNlZCB3aXRoIGEgbmV3IHZhbHVlLlxcblwiICtcblx0XHRcdFx0XHRcIlBsZWFzZSwgY2hlY2sgb3V0IHRoZSBkb2N1bWVudGF0aW9uIG9uIGhvdyB0byBhcHBseSBsb2dnaW5nIGNhbGxiYWNrcy5cXG5cIiArXG5cdFx0XHRcdFx0XCJSZWZlcmVuY2U6IGh0dHBzOi8vYXBpLnF1bml0anMuY29tL2NhdGVnb3J5L2NhbGxiYWNrcy9cIlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4oIGZ1bmN0aW9uKCkge1xuXHRpZiAoICFkZWZpbmVkLmRvY3VtZW50ICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIGBvbkVycm9yRm5QcmV2YCBpbml0aWFsaXplZCBhdCB0b3Agb2Ygc2NvcGVcblx0Ly8gUHJlc2VydmUgb3RoZXIgaGFuZGxlcnNcblx0dmFyIG9uRXJyb3JGblByZXYgPSB3aW5kb3cub25lcnJvcjtcblxuXHQvLyBDb3ZlciB1bmNhdWdodCBleGNlcHRpb25zXG5cdC8vIFJldHVybmluZyB0cnVlIHdpbGwgc3VwcHJlc3MgdGhlIGRlZmF1bHQgYnJvd3NlciBoYW5kbGVyLFxuXHQvLyByZXR1cm5pbmcgZmFsc2Ugd2lsbCBsZXQgaXQgcnVuLlxuXHR3aW5kb3cub25lcnJvciA9IGZ1bmN0aW9uKCBlcnJvciwgZmlsZVBhdGgsIGxpbmVyTnIgKSB7XG5cdFx0dmFyIHJldCA9IGZhbHNlO1xuXHRcdGlmICggb25FcnJvckZuUHJldiApIHtcblx0XHRcdHJldCA9IG9uRXJyb3JGblByZXYoIGVycm9yLCBmaWxlUGF0aCwgbGluZXJOciApO1xuXHRcdH1cblxuXHRcdC8vIFRyZWF0IHJldHVybiB2YWx1ZSBhcyB3aW5kb3cub25lcnJvciBpdHNlbGYgZG9lcyxcblx0XHQvLyBPbmx5IGRvIG91ciBoYW5kbGluZyBpZiBub3Qgc3VwcHJlc3NlZC5cblx0XHRpZiAoIHJldCAhPT0gdHJ1ZSApIHtcblx0XHRcdGlmICggUVVuaXQuY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHRcdGlmICggUVVuaXQuY29uZmlnLmN1cnJlbnQuaWdub3JlR2xvYmFsRXJyb3JzICkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKCBlcnJvciwgZmlsZVBhdGggKyBcIjpcIiArIGxpbmVyTnIgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFFVbml0LnRlc3QoIFwiZ2xvYmFsIGZhaWx1cmVcIiwgZXh0ZW5kKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKCBlcnJvciwgZmlsZVBhdGggKyBcIjpcIiArIGxpbmVyTnIgKTtcblx0XHRcdFx0fSwgeyB2YWxpZFRlc3Q6IHRydWUgfSApICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldDtcblx0fTtcbn0gKSgpO1xuXG5RVW5pdC51cmxQYXJhbXMgPSB1cmxQYXJhbXM7XG5cbi8vIEZpZ3VyZSBvdXQgaWYgd2UncmUgcnVubmluZyB0aGUgdGVzdHMgZnJvbSBhIHNlcnZlciBvciBub3RcblFVbml0LmlzTG9jYWwgPSAhKCBkZWZpbmVkLmRvY3VtZW50ICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gXCJmaWxlOlwiICk7XG5cbi8vIEV4cG9zZSB0aGUgY3VycmVudCBRVW5pdCB2ZXJzaW9uXG5RVW5pdC52ZXJzaW9uID0gXCIxLjIyLjBcIjtcblxuZXh0ZW5kKCBRVW5pdCwge1xuXG5cdC8vIGNhbGwgb24gc3RhcnQgb2YgbW9kdWxlIHRlc3QgdG8gcHJlcGVuZCBuYW1lIHRvIGFsbCB0ZXN0c1xuXHRtb2R1bGU6IGZ1bmN0aW9uKCBuYW1lLCB0ZXN0RW52aXJvbm1lbnQsIGV4ZWN1dGVOb3cgKSB7XG5cdFx0dmFyIG1vZHVsZSwgbW9kdWxlRm5zO1xuXHRcdHZhciBjdXJyZW50TW9kdWxlID0gY29uZmlnLmN1cnJlbnRNb2R1bGU7XG5cblx0XHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgKSB7XG5cdFx0XHRpZiAoIHRlc3RFbnZpcm9ubWVudCBpbnN0YW5jZW9mIEZ1bmN0aW9uICkge1xuXHRcdFx0XHRleGVjdXRlTm93ID0gdGVzdEVudmlyb25tZW50O1xuXHRcdFx0XHR0ZXN0RW52aXJvbm1lbnQgPSB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gREVQUkVDQVRFRDogaGFuZGxlcyBzZXR1cC90ZWFyZG93biBmdW5jdGlvbnMsXG5cdFx0Ly8gYmVmb3JlRWFjaCBhbmQgYWZ0ZXJFYWNoIHNob3VsZCBiZSB1c2VkIGluc3RlYWRcblx0XHRpZiAoIHRlc3RFbnZpcm9ubWVudCAmJiB0ZXN0RW52aXJvbm1lbnQuc2V0dXAgKSB7XG5cdFx0XHR0ZXN0RW52aXJvbm1lbnQuYmVmb3JlRWFjaCA9IHRlc3RFbnZpcm9ubWVudC5zZXR1cDtcblx0XHRcdGRlbGV0ZSB0ZXN0RW52aXJvbm1lbnQuc2V0dXA7XG5cdFx0fVxuXHRcdGlmICggdGVzdEVudmlyb25tZW50ICYmIHRlc3RFbnZpcm9ubWVudC50ZWFyZG93biApIHtcblx0XHRcdHRlc3RFbnZpcm9ubWVudC5hZnRlckVhY2ggPSB0ZXN0RW52aXJvbm1lbnQudGVhcmRvd247XG5cdFx0XHRkZWxldGUgdGVzdEVudmlyb25tZW50LnRlYXJkb3duO1xuXHRcdH1cblxuXHRcdG1vZHVsZSA9IGNyZWF0ZU1vZHVsZSgpO1xuXG5cdFx0bW9kdWxlRm5zID0ge1xuXHRcdFx0YmVmb3JlRWFjaDogc2V0SG9vayggbW9kdWxlLCBcImJlZm9yZUVhY2hcIiApLFxuXHRcdFx0YWZ0ZXJFYWNoOiBzZXRIb29rKCBtb2R1bGUsIFwiYWZ0ZXJFYWNoXCIgKVxuXHRcdH07XG5cblx0XHRpZiAoIGV4ZWN1dGVOb3cgaW5zdGFuY2VvZiBGdW5jdGlvbiApIHtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5wdXNoKCBtb2R1bGUgKTtcblx0XHRcdHNldEN1cnJlbnRNb2R1bGUoIG1vZHVsZSApO1xuXHRcdFx0ZXhlY3V0ZU5vdy5jYWxsKCBtb2R1bGUudGVzdEVudmlyb25tZW50LCBtb2R1bGVGbnMgKTtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5wb3AoKTtcblx0XHRcdG1vZHVsZSA9IG1vZHVsZS5wYXJlbnRNb2R1bGUgfHwgY3VycmVudE1vZHVsZTtcblx0XHR9XG5cblx0XHRzZXRDdXJyZW50TW9kdWxlKCBtb2R1bGUgKTtcblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZU1vZHVsZSgpIHtcblx0XHRcdHZhciBwYXJlbnRNb2R1bGUgPSBjb25maWcubW9kdWxlU3RhY2subGVuZ3RoID9cblx0XHRcdFx0Y29uZmlnLm1vZHVsZVN0YWNrLnNsaWNlKCAtMSApWyAwIF0gOiBudWxsO1xuXHRcdFx0dmFyIG1vZHVsZU5hbWUgPSBwYXJlbnRNb2R1bGUgIT09IG51bGwgP1xuXHRcdFx0XHRbIHBhcmVudE1vZHVsZS5uYW1lLCBuYW1lIF0uam9pbiggXCIgPiBcIiApIDogbmFtZTtcblx0XHRcdHZhciBtb2R1bGUgPSB7XG5cdFx0XHRcdG5hbWU6IG1vZHVsZU5hbWUsXG5cdFx0XHRcdHBhcmVudE1vZHVsZTogcGFyZW50TW9kdWxlLFxuXHRcdFx0XHR0ZXN0czogW11cblx0XHRcdH07XG5cblx0XHRcdHZhciBlbnYgPSB7fTtcblx0XHRcdGlmICggcGFyZW50TW9kdWxlICkge1xuXHRcdFx0XHRleHRlbmQoIGVudiwgcGFyZW50TW9kdWxlLnRlc3RFbnZpcm9ubWVudCApO1xuXHRcdFx0XHRkZWxldGUgZW52LmJlZm9yZUVhY2g7XG5cdFx0XHRcdGRlbGV0ZSBlbnYuYWZ0ZXJFYWNoO1xuXHRcdFx0fVxuXHRcdFx0ZXh0ZW5kKCBlbnYsIHRlc3RFbnZpcm9ubWVudCApO1xuXHRcdFx0bW9kdWxlLnRlc3RFbnZpcm9ubWVudCA9IGVudjtcblxuXHRcdFx0Y29uZmlnLm1vZHVsZXMucHVzaCggbW9kdWxlICk7XG5cdFx0XHRyZXR1cm4gbW9kdWxlO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldEN1cnJlbnRNb2R1bGUoIG1vZHVsZSApIHtcblx0XHRcdGNvbmZpZy5jdXJyZW50TW9kdWxlID0gbW9kdWxlO1xuXHRcdH1cblxuXHR9LFxuXG5cdC8vIERFUFJFQ0FURUQ6IFFVbml0LmFzeW5jVGVzdCgpIHdpbGwgYmUgcmVtb3ZlZCBpbiBRVW5pdCAyLjAuXG5cdGFzeW5jVGVzdDogYXN5bmNUZXN0LFxuXG5cdHRlc3Q6IHRlc3QsXG5cblx0c2tpcDogc2tpcCxcblxuXHRvbmx5OiBvbmx5LFxuXG5cdC8vIERFUFJFQ0FURUQ6IFRoZSBmdW5jdGlvbmFsaXR5IG9mIFFVbml0LnN0YXJ0KCkgd2lsbCBiZSBhbHRlcmVkIGluIFFVbml0IDIuMC5cblx0Ly8gSW4gUVVuaXQgMi4wLCBpbnZva2luZyBpdCB3aWxsIE9OTFkgYWZmZWN0IHRoZSBgUVVuaXQuY29uZmlnLmF1dG9zdGFydGAgYmxvY2tpbmcgYmVoYXZpb3IuXG5cdHN0YXJ0OiBmdW5jdGlvbiggY291bnQgKSB7XG5cdFx0dmFyIGdsb2JhbFN0YXJ0QWxyZWFkeUNhbGxlZCA9IGdsb2JhbFN0YXJ0Q2FsbGVkO1xuXG5cdFx0aWYgKCAhY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHRnbG9iYWxTdGFydENhbGxlZCA9IHRydWU7XG5cblx0XHRcdGlmICggcnVuU3RhcnRlZCApIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIkNhbGxlZCBzdGFydCgpIG91dHNpZGUgb2YgYSB0ZXN0IGNvbnRleHQgd2hpbGUgYWxyZWFkeSBzdGFydGVkXCIgKTtcblx0XHRcdH0gZWxzZSBpZiAoIGdsb2JhbFN0YXJ0QWxyZWFkeUNhbGxlZCB8fCBjb3VudCA+IDEgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RhcnQoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0IHRvbyBtYW55IHRpbWVzXCIgKTtcblx0XHRcdH0gZWxzZSBpZiAoIGNvbmZpZy5hdXRvc3RhcnQgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RhcnQoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0IHdoZW4gXCIgK1xuXHRcdFx0XHRcdFwiUVVuaXQuY29uZmlnLmF1dG9zdGFydCB3YXMgdHJ1ZVwiICk7XG5cdFx0XHR9IGVsc2UgaWYgKCAhY29uZmlnLnBhZ2VMb2FkZWQgKSB7XG5cblx0XHRcdFx0Ly8gVGhlIHBhZ2UgaXNuJ3QgY29tcGxldGVseSBsb2FkZWQgeWV0LCBzbyBiYWlsIG91dCBhbmQgbGV0IGBRVW5pdC5sb2FkYCBoYW5kbGUgaXRcblx0XHRcdFx0Y29uZmlnLmF1dG9zdGFydCA9IHRydWU7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHQvLyBJZiBhIHRlc3QgaXMgcnVubmluZywgYWRqdXN0IGl0cyBzZW1hcGhvcmVcblx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSAtPSBjb3VudCB8fCAxO1xuXG5cdFx0XHQvLyBJZiBzZW1hcGhvcmUgaXMgbm9uLW51bWVyaWMsIHRocm93IGVycm9yXG5cdFx0XHRpZiAoIGlzTmFOKCBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgKSApIHtcblx0XHRcdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID0gMDtcblxuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZShcblx0XHRcdFx0XHRcIkNhbGxlZCBzdGFydCgpIHdpdGggYSBub24tbnVtZXJpYyBkZWNyZW1lbnQuXCIsXG5cdFx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIERvbid0IHN0YXJ0IHVudGlsIGVxdWFsIG51bWJlciBvZiBzdG9wLWNhbGxzXG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA+IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gdGhyb3cgYW4gRXJyb3IgaWYgc3RhcnQgaXMgY2FsbGVkIG1vcmUgb2Z0ZW4gdGhhbiBzdG9wXG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA8IDAgKSB7XG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA9IDA7XG5cblx0XHRcdFx0UVVuaXQucHVzaEZhaWx1cmUoXG5cdFx0XHRcdFx0XCJDYWxsZWQgc3RhcnQoKSB3aGlsZSBhbHJlYWR5IHN0YXJ0ZWQgKHRlc3QncyBzZW1hcGhvcmUgd2FzIDAgYWxyZWFkeSlcIixcblx0XHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApXG5cdFx0XHRcdCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdH0sXG5cblx0Ly8gREVQUkVDQVRFRDogUVVuaXQuc3RvcCgpIHdpbGwgYmUgcmVtb3ZlZCBpbiBRVW5pdCAyLjAuXG5cdHN0b3A6IGZ1bmN0aW9uKCBjb3VudCApIHtcblxuXHRcdC8vIElmIHRoZXJlIGlzbid0IGEgdGVzdCBydW5uaW5nLCBkb24ndCBhbGxvdyBRVW5pdC5zdG9wKCkgdG8gYmUgY2FsbGVkXG5cdFx0aWYgKCAhY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiQ2FsbGVkIHN0b3AoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0XCIgKTtcblx0XHR9XG5cblx0XHQvLyBJZiBhIHRlc3QgaXMgcnVubmluZywgYWRqdXN0IGl0cyBzZW1hcGhvcmVcblx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgKz0gY291bnQgfHwgMTtcblxuXHRcdHBhdXNlUHJvY2Vzc2luZygpO1xuXHR9LFxuXG5cdGNvbmZpZzogY29uZmlnLFxuXG5cdGlzOiBpcyxcblxuXHRvYmplY3RUeXBlOiBvYmplY3RUeXBlLFxuXG5cdGV4dGVuZDogZXh0ZW5kLFxuXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbmZpZy5wYWdlTG9hZGVkID0gdHJ1ZTtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuXHRcdGV4dGVuZCggY29uZmlnLCB7XG5cdFx0XHRzdGF0czogeyBhbGw6IDAsIGJhZDogMCB9LFxuXHRcdFx0bW9kdWxlU3RhdHM6IHsgYWxsOiAwLCBiYWQ6IDAgfSxcblx0XHRcdHN0YXJ0ZWQ6IDAsXG5cdFx0XHR1cGRhdGVSYXRlOiAxMDAwLFxuXHRcdFx0YXV0b3N0YXJ0OiB0cnVlLFxuXHRcdFx0ZmlsdGVyOiBcIlwiXG5cdFx0fSwgdHJ1ZSApO1xuXG5cdFx0Y29uZmlnLmJsb2NraW5nID0gZmFsc2U7XG5cblx0XHRpZiAoIGNvbmZpZy5hdXRvc3RhcnQgKSB7XG5cdFx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHN0YWNrOiBmdW5jdGlvbiggb2Zmc2V0ICkge1xuXHRcdG9mZnNldCA9ICggb2Zmc2V0IHx8IDAgKSArIDI7XG5cdFx0cmV0dXJuIHNvdXJjZUZyb21TdGFja3RyYWNlKCBvZmZzZXQgKTtcblx0fVxufSk7XG5cbnJlZ2lzdGVyTG9nZ2luZ0NhbGxiYWNrcyggUVVuaXQgKTtcblxuZnVuY3Rpb24gYmVnaW4oKSB7XG5cdHZhciBpLCBsLFxuXHRcdG1vZHVsZXNMb2cgPSBbXTtcblxuXHQvLyBJZiB0aGUgdGVzdCBydW4gaGFzbid0IG9mZmljaWFsbHkgYmVndW4geWV0XG5cdGlmICggIWNvbmZpZy5zdGFydGVkICkge1xuXG5cdFx0Ly8gUmVjb3JkIHRoZSB0aW1lIG9mIHRoZSB0ZXN0IHJ1bidzIGJlZ2lubmluZ1xuXHRcdGNvbmZpZy5zdGFydGVkID0gbm93KCk7XG5cblx0XHR2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCk7XG5cblx0XHQvLyBEZWxldGUgdGhlIGxvb3NlIHVubmFtZWQgbW9kdWxlIGlmIHVudXNlZC5cblx0XHRpZiAoIGNvbmZpZy5tb2R1bGVzWyAwIF0ubmFtZSA9PT0gXCJcIiAmJiBjb25maWcubW9kdWxlc1sgMCBdLnRlc3RzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdGNvbmZpZy5tb2R1bGVzLnNoaWZ0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gQXZvaWQgdW5uZWNlc3NhcnkgaW5mb3JtYXRpb24gYnkgbm90IGxvZ2dpbmcgbW9kdWxlcycgdGVzdCBlbnZpcm9ubWVudHNcblx0XHRmb3IgKCBpID0gMCwgbCA9IGNvbmZpZy5tb2R1bGVzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdG1vZHVsZXNMb2cucHVzaCh7XG5cdFx0XHRcdG5hbWU6IGNvbmZpZy5tb2R1bGVzWyBpIF0ubmFtZSxcblx0XHRcdFx0dGVzdHM6IGNvbmZpZy5tb2R1bGVzWyBpIF0udGVzdHNcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIFRoZSB0ZXN0IHJ1biBpcyBvZmZpY2lhbGx5IGJlZ2lubmluZyBub3dcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcImJlZ2luXCIsIHtcblx0XHRcdHRvdGFsVGVzdHM6IFRlc3QuY291bnQsXG5cdFx0XHRtb2R1bGVzOiBtb2R1bGVzTG9nXG5cdFx0fSk7XG5cdH1cblxuXHRjb25maWcuYmxvY2tpbmcgPSBmYWxzZTtcblx0cHJvY2VzcyggdHJ1ZSApO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzKCBsYXN0ICkge1xuXHRmdW5jdGlvbiBuZXh0KCkge1xuXHRcdHByb2Nlc3MoIGxhc3QgKTtcblx0fVxuXHR2YXIgc3RhcnQgPSBub3coKTtcblx0Y29uZmlnLmRlcHRoID0gKCBjb25maWcuZGVwdGggfHwgMCApICsgMTtcblxuXHR3aGlsZSAoIGNvbmZpZy5xdWV1ZS5sZW5ndGggJiYgIWNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRpZiAoICFkZWZpbmVkLnNldFRpbWVvdXQgfHwgY29uZmlnLnVwZGF0ZVJhdGUgPD0gMCB8fFxuXHRcdFx0XHQoICggbm93KCkgLSBzdGFydCApIDwgY29uZmlnLnVwZGF0ZVJhdGUgKSApIHtcblx0XHRcdGlmICggY29uZmlnLmN1cnJlbnQgKSB7XG5cblx0XHRcdFx0Ly8gUmVzZXQgYXN5bmMgdHJhY2tpbmcgZm9yIGVhY2ggcGhhc2Ugb2YgdGhlIFRlc3QgbGlmZWN5Y2xlXG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnVzZWRBc3luYyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0Y29uZmlnLnF1ZXVlLnNoaWZ0KCkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2V0VGltZW91dCggbmV4dCwgMTMgKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXHRjb25maWcuZGVwdGgtLTtcblx0aWYgKCBsYXN0ICYmICFjb25maWcuYmxvY2tpbmcgJiYgIWNvbmZpZy5xdWV1ZS5sZW5ndGggJiYgY29uZmlnLmRlcHRoID09PSAwICkge1xuXHRcdGRvbmUoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXVzZVByb2Nlc3NpbmcoKSB7XG5cdGNvbmZpZy5ibG9ja2luZyA9IHRydWU7XG5cblx0aWYgKCBjb25maWcudGVzdFRpbWVvdXQgJiYgZGVmaW5lZC5zZXRUaW1lb3V0ICkge1xuXHRcdGNsZWFyVGltZW91dCggY29uZmlnLnRpbWVvdXQgKTtcblx0XHRjb25maWcudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50ICkge1xuXHRcdFx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPSAwO1xuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZSggXCJUZXN0IHRpbWVkIG91dFwiLCBzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiVGVzdCB0aW1lZCBvdXRcIiApO1xuXHRcdFx0fVxuXHRcdFx0cmVzdW1lUHJvY2Vzc2luZygpO1xuXHRcdH0sIGNvbmZpZy50ZXN0VGltZW91dCApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlc3VtZVByb2Nlc3NpbmcoKSB7XG5cdHJ1blN0YXJ0ZWQgPSB0cnVlO1xuXG5cdC8vIEEgc2xpZ2h0IGRlbGF5IHRvIGFsbG93IHRoaXMgaXRlcmF0aW9uIG9mIHRoZSBldmVudCBsb29wIHRvIGZpbmlzaCAobW9yZSBhc3NlcnRpb25zLCBldGMuKVxuXHRpZiAoIGRlZmluZWQuc2V0VGltZW91dCApIHtcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBjb25maWcuY3VycmVudCAmJiBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPiAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGNvbmZpZy50aW1lb3V0ICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQoIGNvbmZpZy50aW1lb3V0ICk7XG5cdFx0XHR9XG5cblx0XHRcdGJlZ2luKCk7XG5cdFx0fSwgMTMgKTtcblx0fSBlbHNlIHtcblx0XHRiZWdpbigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGRvbmUoKSB7XG5cdHZhciBydW50aW1lLCBwYXNzZWQ7XG5cblx0Y29uZmlnLmF1dG9ydW4gPSB0cnVlO1xuXG5cdC8vIExvZyB0aGUgbGFzdCBtb2R1bGUgcmVzdWx0c1xuXHRpZiAoIGNvbmZpZy5wcmV2aW91c01vZHVsZSApIHtcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZURvbmVcIiwge1xuXHRcdFx0bmFtZTogY29uZmlnLnByZXZpb3VzTW9kdWxlLm5hbWUsXG5cdFx0XHR0ZXN0czogY29uZmlnLnByZXZpb3VzTW9kdWxlLnRlc3RzLFxuXHRcdFx0ZmFpbGVkOiBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0cGFzc2VkOiBjb25maWcubW9kdWxlU3RhdHMuYWxsIC0gY29uZmlnLm1vZHVsZVN0YXRzLmJhZCxcblx0XHRcdHRvdGFsOiBjb25maWcubW9kdWxlU3RhdHMuYWxsLFxuXHRcdFx0cnVudGltZTogbm93KCkgLSBjb25maWcubW9kdWxlU3RhdHMuc3RhcnRlZFxuXHRcdH0pO1xuXHR9XG5cdGRlbGV0ZSBjb25maWcucHJldmlvdXNNb2R1bGU7XG5cblx0cnVudGltZSA9IG5vdygpIC0gY29uZmlnLnN0YXJ0ZWQ7XG5cdHBhc3NlZCA9IGNvbmZpZy5zdGF0cy5hbGwgLSBjb25maWcuc3RhdHMuYmFkO1xuXG5cdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwiZG9uZVwiLCB7XG5cdFx0ZmFpbGVkOiBjb25maWcuc3RhdHMuYmFkLFxuXHRcdHBhc3NlZDogcGFzc2VkLFxuXHRcdHRvdGFsOiBjb25maWcuc3RhdHMuYWxsLFxuXHRcdHJ1bnRpbWU6IHJ1bnRpbWVcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldEhvb2soIG1vZHVsZSwgaG9va05hbWUgKSB7XG5cdGlmICggbW9kdWxlLnRlc3RFbnZpcm9ubWVudCA9PT0gdW5kZWZpbmVkICkge1xuXHRcdG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgPSB7fTtcblx0fVxuXG5cdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2sgKSB7XG5cdFx0bW9kdWxlLnRlc3RFbnZpcm9ubWVudFsgaG9va05hbWUgXSA9IGNhbGxiYWNrO1xuXHR9O1xufVxuXG52YXIgZm9jdXNlZCA9IGZhbHNlO1xudmFyIHByaW9yaXR5Q291bnQgPSAwO1xuXG5mdW5jdGlvbiBUZXN0KCBzZXR0aW5ncyApIHtcblx0dmFyIGksIGw7XG5cblx0KytUZXN0LmNvdW50O1xuXG5cdGV4dGVuZCggdGhpcywgc2V0dGluZ3MgKTtcblx0dGhpcy5hc3NlcnRpb25zID0gW107XG5cdHRoaXMuc2VtYXBob3JlID0gMDtcblx0dGhpcy51c2VkQXN5bmMgPSBmYWxzZTtcblx0dGhpcy5tb2R1bGUgPSBjb25maWcuY3VycmVudE1vZHVsZTtcblx0dGhpcy5zdGFjayA9IHNvdXJjZUZyb21TdGFja3RyYWNlKCAzICk7XG5cblx0Ly8gUmVnaXN0ZXIgdW5pcXVlIHN0cmluZ3Ncblx0Zm9yICggaSA9IDAsIGwgPSB0aGlzLm1vZHVsZS50ZXN0czsgaSA8IGwubGVuZ3RoOyBpKysgKSB7XG5cdFx0aWYgKCB0aGlzLm1vZHVsZS50ZXN0c1sgaSBdLm5hbWUgPT09IHRoaXMudGVzdE5hbWUgKSB7XG5cdFx0XHR0aGlzLnRlc3ROYW1lICs9IFwiIFwiO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMudGVzdElkID0gZ2VuZXJhdGVIYXNoKCB0aGlzLm1vZHVsZS5uYW1lLCB0aGlzLnRlc3ROYW1lICk7XG5cblx0dGhpcy5tb2R1bGUudGVzdHMucHVzaCh7XG5cdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkXG5cdH0pO1xuXG5cdGlmICggc2V0dGluZ3Muc2tpcCApIHtcblxuXHRcdC8vIFNraXBwZWQgdGVzdHMgd2lsbCBmdWxseSBpZ25vcmUgYW55IHNlbnQgY2FsbGJhY2tcblx0XHR0aGlzLmNhbGxiYWNrID0gZnVuY3Rpb24oKSB7fTtcblx0XHR0aGlzLmFzeW5jID0gZmFsc2U7XG5cdFx0dGhpcy5leHBlY3RlZCA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5hc3NlcnQgPSBuZXcgQXNzZXJ0KCB0aGlzICk7XG5cdH1cbn1cblxuVGVzdC5jb3VudCA9IDA7XG5cblRlc3QucHJvdG90eXBlID0ge1xuXHRiZWZvcmU6IGZ1bmN0aW9uKCkge1xuXHRcdGlmIChcblxuXHRcdFx0Ly8gRW1pdCBtb2R1bGVTdGFydCB3aGVuIHdlJ3JlIHN3aXRjaGluZyBmcm9tIG9uZSBtb2R1bGUgdG8gYW5vdGhlclxuXHRcdFx0dGhpcy5tb2R1bGUgIT09IGNvbmZpZy5wcmV2aW91c01vZHVsZSB8fFxuXG5cdFx0XHRcdC8vIFRoZXkgY291bGQgYmUgZXF1YWwgKGJvdGggdW5kZWZpbmVkKSBidXQgaWYgdGhlIHByZXZpb3VzTW9kdWxlIHByb3BlcnR5IGRvZXNuJ3Rcblx0XHRcdFx0Ly8geWV0IGV4aXN0IGl0IG1lYW5zIHRoaXMgaXMgdGhlIGZpcnN0IHRlc3QgaW4gYSBzdWl0ZSB0aGF0IGlzbid0IHdyYXBwZWQgaW4gYVxuXHRcdFx0XHQvLyBtb2R1bGUsIGluIHdoaWNoIGNhc2Ugd2UnbGwganVzdCBlbWl0IGEgbW9kdWxlU3RhcnQgZXZlbnQgZm9yICd1bmRlZmluZWQnLlxuXHRcdFx0XHQvLyBXaXRob3V0IHRoaXMsIHJlcG9ydGVycyBjYW4gZ2V0IHRlc3RTdGFydCBiZWZvcmUgbW9kdWxlU3RhcnQgIHdoaWNoIGlzIGEgcHJvYmxlbS5cblx0XHRcdFx0IWhhc093bi5jYWxsKCBjb25maWcsIFwicHJldmlvdXNNb2R1bGVcIiApXG5cdFx0KSB7XG5cdFx0XHRpZiAoIGhhc093bi5jYWxsKCBjb25maWcsIFwicHJldmlvdXNNb2R1bGVcIiApICkge1xuXHRcdFx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZURvbmVcIiwge1xuXHRcdFx0XHRcdG5hbWU6IGNvbmZpZy5wcmV2aW91c01vZHVsZS5uYW1lLFxuXHRcdFx0XHRcdHRlc3RzOiBjb25maWcucHJldmlvdXNNb2R1bGUudGVzdHMsXG5cdFx0XHRcdFx0ZmFpbGVkOiBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0XHRcdHBhc3NlZDogY29uZmlnLm1vZHVsZVN0YXRzLmFsbCAtIGNvbmZpZy5tb2R1bGVTdGF0cy5iYWQsXG5cdFx0XHRcdFx0dG90YWw6IGNvbmZpZy5tb2R1bGVTdGF0cy5hbGwsXG5cdFx0XHRcdFx0cnVudGltZTogbm93KCkgLSBjb25maWcubW9kdWxlU3RhdHMuc3RhcnRlZFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNvbmZpZy5wcmV2aW91c01vZHVsZSA9IHRoaXMubW9kdWxlO1xuXHRcdFx0Y29uZmlnLm1vZHVsZVN0YXRzID0geyBhbGw6IDAsIGJhZDogMCwgc3RhcnRlZDogbm93KCkgfTtcblx0XHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwibW9kdWxlU3RhcnRcIiwge1xuXHRcdFx0XHRuYW1lOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0XHR0ZXN0czogdGhpcy5tb2R1bGUudGVzdHNcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblxuXHRcdGlmICggdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50ICkge1xuXHRcdFx0ZGVsZXRlIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudC5iZWZvcmVFYWNoO1xuXHRcdFx0ZGVsZXRlIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudC5hZnRlckVhY2g7XG5cdFx0fVxuXHRcdHRoaXMudGVzdEVudmlyb25tZW50ID0gZXh0ZW5kKCB7fSwgdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50ICk7XG5cblx0XHR0aGlzLnN0YXJ0ZWQgPSBub3coKTtcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcInRlc3RTdGFydFwiLCB7XG5cdFx0XHRuYW1lOiB0aGlzLnRlc3ROYW1lLFxuXHRcdFx0bW9kdWxlOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0dGVzdElkOiB0aGlzLnRlc3RJZFxuXHRcdH0pO1xuXG5cdFx0aWYgKCAhY29uZmlnLnBvbGx1dGlvbiApIHtcblx0XHRcdHNhdmVHbG9iYWwoKTtcblx0XHR9XG5cdH0sXG5cblx0cnVuOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcHJvbWlzZTtcblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblxuXHRcdGlmICggdGhpcy5hc3luYyApIHtcblx0XHRcdFFVbml0LnN0b3AoKTtcblx0XHR9XG5cblx0XHR0aGlzLmNhbGxiYWNrU3RhcnRlZCA9IG5vdygpO1xuXG5cdFx0aWYgKCBjb25maWcubm90cnljYXRjaCApIHtcblx0XHRcdHJ1blRlc3QoIHRoaXMgKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0cnVuVGVzdCggdGhpcyApO1xuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0dGhpcy5wdXNoRmFpbHVyZSggXCJEaWVkIG9uIHRlc3QgI1wiICsgKCB0aGlzLmFzc2VydGlvbnMubGVuZ3RoICsgMSApICsgXCIgXCIgK1xuXHRcdFx0XHR0aGlzLnN0YWNrICsgXCI6IFwiICsgKCBlLm1lc3NhZ2UgfHwgZSApLCBleHRyYWN0U3RhY2t0cmFjZSggZSwgMCApICk7XG5cblx0XHRcdC8vIGVsc2UgbmV4dCB0ZXN0IHdpbGwgY2FycnkgdGhlIHJlc3BvbnNpYmlsaXR5XG5cdFx0XHRzYXZlR2xvYmFsKCk7XG5cblx0XHRcdC8vIFJlc3RhcnQgdGhlIHRlc3RzIGlmIHRoZXkncmUgYmxvY2tpbmdcblx0XHRcdGlmICggY29uZmlnLmJsb2NraW5nICkge1xuXHRcdFx0XHRRVW5pdC5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJ1blRlc3QoIHRlc3QgKSB7XG5cdFx0XHRwcm9taXNlID0gdGVzdC5jYWxsYmFjay5jYWxsKCB0ZXN0LnRlc3RFbnZpcm9ubWVudCwgdGVzdC5hc3NlcnQgKTtcblx0XHRcdHRlc3QucmVzb2x2ZVByb21pc2UoIHByb21pc2UgKTtcblx0XHR9XG5cdH0sXG5cblx0YWZ0ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdGNoZWNrUG9sbHV0aW9uKCk7XG5cdH0sXG5cblx0cXVldWVIb29rOiBmdW5jdGlvbiggaG9vaywgaG9va05hbWUgKSB7XG5cdFx0dmFyIHByb21pc2UsXG5cdFx0XHR0ZXN0ID0gdGhpcztcblx0XHRyZXR1cm4gZnVuY3Rpb24gcnVuSG9vaygpIHtcblx0XHRcdGNvbmZpZy5jdXJyZW50ID0gdGVzdDtcblx0XHRcdGlmICggY29uZmlnLm5vdHJ5Y2F0Y2ggKSB7XG5cdFx0XHRcdGNhbGxIb29rKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNhbGxIb29rKCk7XG5cdFx0XHR9IGNhdGNoICggZXJyb3IgKSB7XG5cdFx0XHRcdHRlc3QucHVzaEZhaWx1cmUoIGhvb2tOYW1lICsgXCIgZmFpbGVkIG9uIFwiICsgdGVzdC50ZXN0TmFtZSArIFwiOiBcIiArXG5cdFx0XHRcdCggZXJyb3IubWVzc2FnZSB8fCBlcnJvciApLCBleHRyYWN0U3RhY2t0cmFjZSggZXJyb3IsIDAgKSApO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBjYWxsSG9vaygpIHtcblx0XHRcdFx0cHJvbWlzZSA9IGhvb2suY2FsbCggdGVzdC50ZXN0RW52aXJvbm1lbnQsIHRlc3QuYXNzZXJ0ICk7XG5cdFx0XHRcdHRlc3QucmVzb2x2ZVByb21pc2UoIHByb21pc2UsIGhvb2tOYW1lICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSxcblxuXHQvLyBDdXJyZW50bHkgb25seSB1c2VkIGZvciBtb2R1bGUgbGV2ZWwgaG9va3MsIGNhbiBiZSB1c2VkIHRvIGFkZCBnbG9iYWwgbGV2ZWwgb25lc1xuXHRob29rczogZnVuY3Rpb24oIGhhbmRsZXIgKSB7XG5cdFx0dmFyIGhvb2tzID0gW107XG5cblx0XHRmdW5jdGlvbiBwcm9jZXNzSG9va3MoIHRlc3QsIG1vZHVsZSApIHtcblx0XHRcdGlmICggbW9kdWxlLnBhcmVudE1vZHVsZSApIHtcblx0XHRcdFx0cHJvY2Vzc0hvb2tzKCB0ZXN0LCBtb2R1bGUucGFyZW50TW9kdWxlICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgJiZcblx0XHRcdFx0UVVuaXQub2JqZWN0VHlwZSggbW9kdWxlLnRlc3RFbnZpcm9ubWVudFsgaGFuZGxlciBdICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0aG9va3MucHVzaCggdGVzdC5xdWV1ZUhvb2soIG1vZHVsZS50ZXN0RW52aXJvbm1lbnRbIGhhbmRsZXIgXSwgaGFuZGxlciApICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSG9va3MgYXJlIGlnbm9yZWQgb24gc2tpcHBlZCB0ZXN0c1xuXHRcdGlmICggIXRoaXMuc2tpcCApIHtcblx0XHRcdHByb2Nlc3NIb29rcyggdGhpcywgdGhpcy5tb2R1bGUgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGhvb2tzO1xuXHR9LFxuXG5cdGZpbmlzaDogZnVuY3Rpb24oKSB7XG5cdFx0Y29uZmlnLmN1cnJlbnQgPSB0aGlzO1xuXHRcdGlmICggY29uZmlnLnJlcXVpcmVFeHBlY3RzICYmIHRoaXMuZXhwZWN0ZWQgPT09IG51bGwgKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIG51bWJlciBvZiBhc3NlcnRpb25zIHRvIGJlIGRlZmluZWQsIGJ1dCBleHBlY3QoKSB3YXMgXCIgK1xuXHRcdFx0XHRcIm5vdCBjYWxsZWQuXCIsIHRoaXMuc3RhY2sgKTtcblx0XHR9IGVsc2UgaWYgKCB0aGlzLmV4cGVjdGVkICE9PSBudWxsICYmIHRoaXMuZXhwZWN0ZWQgIT09IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIFwiICsgdGhpcy5leHBlY3RlZCArIFwiIGFzc2VydGlvbnMsIGJ1dCBcIiArXG5cdFx0XHRcdHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKyBcIiB3ZXJlIHJ1blwiLCB0aGlzLnN0YWNrICk7XG5cdFx0fSBlbHNlIGlmICggdGhpcy5leHBlY3RlZCA9PT0gbnVsbCAmJiAhdGhpcy5hc3NlcnRpb25zLmxlbmd0aCApIHtcblx0XHRcdHRoaXMucHVzaEZhaWx1cmUoIFwiRXhwZWN0ZWQgYXQgbGVhc3Qgb25lIGFzc2VydGlvbiwgYnV0IG5vbmUgd2VyZSBydW4gLSBjYWxsIFwiICtcblx0XHRcdFx0XCJleHBlY3QoMCkgdG8gYWNjZXB0IHplcm8gYXNzZXJ0aW9ucy5cIiwgdGhpcy5zdGFjayApO1xuXHRcdH1cblxuXHRcdHZhciBpLFxuXHRcdFx0YmFkID0gMDtcblxuXHRcdHRoaXMucnVudGltZSA9IG5vdygpIC0gdGhpcy5zdGFydGVkO1xuXHRcdGNvbmZpZy5zdGF0cy5hbGwgKz0gdGhpcy5hc3NlcnRpb25zLmxlbmd0aDtcblx0XHRjb25maWcubW9kdWxlU3RhdHMuYWxsICs9IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7XG5cblx0XHRmb3IgKCBpID0gMDsgaSA8IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdGlmICggIXRoaXMuYXNzZXJ0aW9uc1sgaSBdLnJlc3VsdCApIHtcblx0XHRcdFx0YmFkKys7XG5cdFx0XHRcdGNvbmZpZy5zdGF0cy5iYWQrKztcblx0XHRcdFx0Y29uZmlnLm1vZHVsZVN0YXRzLmJhZCsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwidGVzdERvbmVcIiwge1xuXHRcdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHRcdG1vZHVsZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdHNraXBwZWQ6ICEhdGhpcy5za2lwLFxuXHRcdFx0ZmFpbGVkOiBiYWQsXG5cdFx0XHRwYXNzZWQ6IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggLSBiYWQsXG5cdFx0XHR0b3RhbDogdGhpcy5hc3NlcnRpb25zLmxlbmd0aCxcblx0XHRcdHJ1bnRpbWU6IHRoaXMucnVudGltZSxcblxuXHRcdFx0Ly8gSFRNTCBSZXBvcnRlciB1c2Vcblx0XHRcdGFzc2VydGlvbnM6IHRoaXMuYXNzZXJ0aW9ucyxcblx0XHRcdHRlc3RJZDogdGhpcy50ZXN0SWQsXG5cblx0XHRcdC8vIFNvdXJjZSBvZiBUZXN0XG5cdFx0XHRzb3VyY2U6IHRoaXMuc3RhY2ssXG5cblx0XHRcdC8vIERFUFJFQ0FURUQ6IHRoaXMgcHJvcGVydHkgd2lsbCBiZSByZW1vdmVkIGluIDIuMC4wLCB1c2UgcnVudGltZSBpbnN0ZWFkXG5cdFx0XHRkdXJhdGlvbjogdGhpcy5ydW50aW1lXG5cdFx0fSk7XG5cblx0XHQvLyBRVW5pdC5yZXNldCgpIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVwbGFjZWQgZm9yIGEgbmV3XG5cdFx0Ly8gZml4dHVyZSByZXNldCBmdW5jdGlvbiBvbiBRVW5pdCAyLjAvMi4xLlxuXHRcdC8vIEl0J3Mgc3RpbGwgY2FsbGVkIGhlcmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGhhbmRsaW5nXG5cdFx0UVVuaXQucmVzZXQoKTtcblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdW5kZWZpbmVkO1xuXHR9LFxuXG5cdHF1ZXVlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcHJpb3JpdHksXG5cdFx0XHR0ZXN0ID0gdGhpcztcblxuXHRcdGlmICggIXRoaXMudmFsaWQoKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBydW4oKSB7XG5cblx0XHRcdC8vIGVhY2ggb2YgdGhlc2UgY2FuIGJ5IGFzeW5jXG5cdFx0XHRzeW5jaHJvbml6ZShbXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QuYmVmb3JlKCk7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0dGVzdC5ob29rcyggXCJiZWZvcmVFYWNoXCIgKSxcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5ydW4oKTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHR0ZXN0Lmhvb2tzKCBcImFmdGVyRWFjaFwiICkucmV2ZXJzZSgpLFxuXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QuYWZ0ZXIoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5maW5pc2goKTtcblx0XHRcdFx0fVxuXHRcdFx0XSk7XG5cdFx0fVxuXG5cdFx0Ly8gUHJpb3JpdGl6ZSBwcmV2aW91c2x5IGZhaWxlZCB0ZXN0cywgZGV0ZWN0ZWQgZnJvbSBzZXNzaW9uU3RvcmFnZVxuXHRcdHByaW9yaXR5ID0gUVVuaXQuY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSAmJlxuXHRcdFx0XHQrc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSggXCJxdW5pdC10ZXN0LVwiICsgdGhpcy5tb2R1bGUubmFtZSArIFwiLVwiICsgdGhpcy50ZXN0TmFtZSApO1xuXG5cdFx0cmV0dXJuIHN5bmNocm9uaXplKCBydW4sIHByaW9yaXR5ICk7XG5cdH0sXG5cblx0cHVzaFJlc3VsdDogZnVuY3Rpb24oIHJlc3VsdEluZm8gKSB7XG5cblx0XHQvLyByZXN1bHRJbmZvID0geyByZXN1bHQsIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG5lZ2F0aXZlIH1cblx0XHR2YXIgc291cmNlLFxuXHRcdFx0ZGV0YWlscyA9IHtcblx0XHRcdFx0bW9kdWxlOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0XHRuYW1lOiB0aGlzLnRlc3ROYW1lLFxuXHRcdFx0XHRyZXN1bHQ6IHJlc3VsdEluZm8ucmVzdWx0LFxuXHRcdFx0XHRtZXNzYWdlOiByZXN1bHRJbmZvLm1lc3NhZ2UsXG5cdFx0XHRcdGFjdHVhbDogcmVzdWx0SW5mby5hY3R1YWwsXG5cdFx0XHRcdGV4cGVjdGVkOiByZXN1bHRJbmZvLmV4cGVjdGVkLFxuXHRcdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkLFxuXHRcdFx0XHRuZWdhdGl2ZTogcmVzdWx0SW5mby5uZWdhdGl2ZSB8fCBmYWxzZSxcblx0XHRcdFx0cnVudGltZTogbm93KCkgLSB0aGlzLnN0YXJ0ZWRcblx0XHRcdH07XG5cblx0XHRpZiAoICFyZXN1bHRJbmZvLnJlc3VsdCApIHtcblx0XHRcdHNvdXJjZSA9IHNvdXJjZUZyb21TdGFja3RyYWNlKCk7XG5cblx0XHRcdGlmICggc291cmNlICkge1xuXHRcdFx0XHRkZXRhaWxzLnNvdXJjZSA9IHNvdXJjZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcImxvZ1wiLCBkZXRhaWxzICk7XG5cblx0XHR0aGlzLmFzc2VydGlvbnMucHVzaCh7XG5cdFx0XHRyZXN1bHQ6ICEhcmVzdWx0SW5mby5yZXN1bHQsXG5cdFx0XHRtZXNzYWdlOiByZXN1bHRJbmZvLm1lc3NhZ2Vcblx0XHR9KTtcblx0fSxcblxuXHRwdXNoRmFpbHVyZTogZnVuY3Rpb24oIG1lc3NhZ2UsIHNvdXJjZSwgYWN0dWFsICkge1xuXHRcdGlmICggISggdGhpcyBpbnN0YW5jZW9mIFRlc3QgKSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJwdXNoRmFpbHVyZSgpIGFzc2VydGlvbiBvdXRzaWRlIHRlc3QgY29udGV4dCwgd2FzIFwiICtcblx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdH1cblxuXHRcdHZhciBkZXRhaWxzID0ge1xuXHRcdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRcdHJlc3VsdDogZmFsc2UsXG5cdFx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UgfHwgXCJlcnJvclwiLFxuXHRcdFx0XHRhY3R1YWw6IGFjdHVhbCB8fCBudWxsLFxuXHRcdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkLFxuXHRcdFx0XHRydW50aW1lOiBub3coKSAtIHRoaXMuc3RhcnRlZFxuXHRcdFx0fTtcblxuXHRcdGlmICggc291cmNlICkge1xuXHRcdFx0ZGV0YWlscy5zb3VyY2UgPSBzb3VyY2U7XG5cdFx0fVxuXG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJsb2dcIiwgZGV0YWlscyApO1xuXG5cdFx0dGhpcy5hc3NlcnRpb25zLnB1c2goe1xuXHRcdFx0cmVzdWx0OiBmYWxzZSxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9KTtcblx0fSxcblxuXHRyZXNvbHZlUHJvbWlzZTogZnVuY3Rpb24oIHByb21pc2UsIHBoYXNlICkge1xuXHRcdHZhciB0aGVuLCBtZXNzYWdlLFxuXHRcdFx0dGVzdCA9IHRoaXM7XG5cdFx0aWYgKCBwcm9taXNlICE9IG51bGwgKSB7XG5cdFx0XHR0aGVuID0gcHJvbWlzZS50aGVuO1xuXHRcdFx0aWYgKCBRVW5pdC5vYmplY3RUeXBlKCB0aGVuICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0UVVuaXQuc3RvcCgpO1xuXHRcdFx0XHR0aGVuLmNhbGwoXG5cdFx0XHRcdFx0cHJvbWlzZSxcblx0XHRcdFx0XHRmdW5jdGlvbigpIHsgUVVuaXQuc3RhcnQoKTsgfSxcblx0XHRcdFx0XHRmdW5jdGlvbiggZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHRtZXNzYWdlID0gXCJQcm9taXNlIHJlamVjdGVkIFwiICtcblx0XHRcdFx0XHRcdFx0KCAhcGhhc2UgPyBcImR1cmluZ1wiIDogcGhhc2UucmVwbGFjZSggL0VhY2gkLywgXCJcIiApICkgK1xuXHRcdFx0XHRcdFx0XHRcIiBcIiArIHRlc3QudGVzdE5hbWUgKyBcIjogXCIgKyAoIGVycm9yLm1lc3NhZ2UgfHwgZXJyb3IgKTtcblx0XHRcdFx0XHRcdHRlc3QucHVzaEZhaWx1cmUoIG1lc3NhZ2UsIGV4dHJhY3RTdGFja3RyYWNlKCBlcnJvciwgMCApICk7XG5cblx0XHRcdFx0XHRcdC8vIGVsc2UgbmV4dCB0ZXN0IHdpbGwgY2FycnkgdGhlIHJlc3BvbnNpYmlsaXR5XG5cdFx0XHRcdFx0XHRzYXZlR2xvYmFsKCk7XG5cblx0XHRcdFx0XHRcdC8vIFVuYmxvY2tcblx0XHRcdFx0XHRcdFFVbml0LnN0YXJ0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHR2YWxpZDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZpbHRlciA9IGNvbmZpZy5maWx0ZXIsXG5cdFx0XHRyZWdleEZpbHRlciA9IC9eKCE/KVxcLyhbXFx3XFxXXSopXFwvKGk/JCkvLmV4ZWMoIGZpbHRlciApLFxuXHRcdFx0bW9kdWxlID0gUVVuaXQudXJsUGFyYW1zLm1vZHVsZSAmJiBRVW5pdC51cmxQYXJhbXMubW9kdWxlLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRmdWxsTmFtZSA9ICggdGhpcy5tb2R1bGUubmFtZSArIFwiOiBcIiArIHRoaXMudGVzdE5hbWUgKTtcblxuXHRcdGZ1bmN0aW9uIHRlc3RJbk1vZHVsZUNoYWluKCB0ZXN0TW9kdWxlICkge1xuXHRcdFx0dmFyIHRlc3RNb2R1bGVOYW1lID0gdGVzdE1vZHVsZS5uYW1lID8gdGVzdE1vZHVsZS5uYW1lLnRvTG93ZXJDYXNlKCkgOiBudWxsO1xuXHRcdFx0aWYgKCB0ZXN0TW9kdWxlTmFtZSA9PT0gbW9kdWxlICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAoIHRlc3RNb2R1bGUucGFyZW50TW9kdWxlICkge1xuXHRcdFx0XHRyZXR1cm4gdGVzdEluTW9kdWxlQ2hhaW4oIHRlc3RNb2R1bGUucGFyZW50TW9kdWxlICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSW50ZXJuYWxseS1nZW5lcmF0ZWQgdGVzdHMgYXJlIGFsd2F5cyB2YWxpZFxuXHRcdGlmICggdGhpcy5jYWxsYmFjayAmJiB0aGlzLmNhbGxiYWNrLnZhbGlkVGVzdCApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICggY29uZmlnLnRlc3RJZC5sZW5ndGggPiAwICYmIGluQXJyYXkoIHRoaXMudGVzdElkLCBjb25maWcudGVzdElkICkgPCAwICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmICggbW9kdWxlICYmICF0ZXN0SW5Nb2R1bGVDaGFpbiggdGhpcy5tb2R1bGUgKSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZiAoICFmaWx0ZXIgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVnZXhGaWx0ZXIgP1xuXHRcdFx0dGhpcy5yZWdleEZpbHRlciggISFyZWdleEZpbHRlclsxXSwgcmVnZXhGaWx0ZXJbMl0sIHJlZ2V4RmlsdGVyWzNdLCBmdWxsTmFtZSApIDpcblx0XHRcdHRoaXMuc3RyaW5nRmlsdGVyKCBmaWx0ZXIsIGZ1bGxOYW1lICk7XG5cdH0sXG5cblx0cmVnZXhGaWx0ZXI6IGZ1bmN0aW9uKCBleGNsdWRlLCBwYXR0ZXJuLCBmbGFncywgZnVsbE5hbWUgKSB7XG5cdFx0dmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCggcGF0dGVybiwgZmxhZ3MgKTtcblx0XHR2YXIgbWF0Y2ggPSByZWdleC50ZXN0KCBmdWxsTmFtZSApO1xuXG5cdFx0cmV0dXJuIG1hdGNoICE9PSBleGNsdWRlO1xuXHR9LFxuXG5cdHN0cmluZ0ZpbHRlcjogZnVuY3Rpb24oIGZpbHRlciwgZnVsbE5hbWUgKSB7XG5cdFx0ZmlsdGVyID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XG5cdFx0ZnVsbE5hbWUgPSBmdWxsTmFtZS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0dmFyIGluY2x1ZGUgPSBmaWx0ZXIuY2hhckF0KCAwICkgIT09IFwiIVwiO1xuXHRcdGlmICggIWluY2x1ZGUgKSB7XG5cdFx0XHRmaWx0ZXIgPSBmaWx0ZXIuc2xpY2UoIDEgKTtcblx0XHR9XG5cblx0XHQvLyBJZiB0aGUgZmlsdGVyIG1hdGNoZXMsIHdlIG5lZWQgdG8gaG9ub3VyIGluY2x1ZGVcblx0XHRpZiAoIGZ1bGxOYW1lLmluZGV4T2YoIGZpbHRlciApICE9PSAtMSApIHtcblx0XHRcdHJldHVybiBpbmNsdWRlO1xuXHRcdH1cblxuXHRcdC8vIE90aGVyd2lzZSwgZG8gdGhlIG9wcG9zaXRlXG5cdFx0cmV0dXJuICFpbmNsdWRlO1xuXHR9XG59O1xuXG4vLyBSZXNldHMgdGhlIHRlc3Qgc2V0dXAuIFVzZWZ1bCBmb3IgdGVzdHMgdGhhdCBtb2RpZnkgdGhlIERPTS5cbi8qXG5ERVBSRUNBVEVEOiBVc2UgbXVsdGlwbGUgdGVzdHMgaW5zdGVhZCBvZiByZXNldHRpbmcgaW5zaWRlIGEgdGVzdC5cblVzZSB0ZXN0U3RhcnQgb3IgdGVzdERvbmUgZm9yIGN1c3RvbSBjbGVhbnVwLlxuVGhpcyBtZXRob2Qgd2lsbCB0aHJvdyBhbiBlcnJvciBpbiAyLjAsIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gMi4xXG4qL1xuUVVuaXQucmVzZXQgPSBmdW5jdGlvbigpIHtcblxuXHQvLyBSZXR1cm4gb24gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRzXG5cdC8vIFRoaXMgaXMgbmVjZXNzYXJ5IHRvIG5vdCBicmVhayBvbiBub2RlIHRlc3RzXG5cdGlmICggIWRlZmluZWQuZG9jdW1lbnQgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIGZpeHR1cmUgPSBkZWZpbmVkLmRvY3VtZW50ICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICYmXG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJxdW5pdC1maXh0dXJlXCIgKTtcblxuXHRpZiAoIGZpeHR1cmUgKSB7XG5cdFx0Zml4dHVyZS5pbm5lckhUTUwgPSBjb25maWcuZml4dHVyZTtcblx0fVxufTtcblxuUVVuaXQucHVzaEZhaWx1cmUgPSBmdW5jdGlvbigpIHtcblx0aWYgKCAhUVVuaXQuY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCBcInB1c2hGYWlsdXJlKCkgYXNzZXJ0aW9uIG91dHNpZGUgdGVzdCBjb250ZXh0LCBpbiBcIiArXG5cdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cdH1cblxuXHQvLyBHZXRzIGN1cnJlbnQgdGVzdCBvYmpcblx0dmFyIGN1cnJlbnRUZXN0ID0gUVVuaXQuY29uZmlnLmN1cnJlbnQ7XG5cblx0cmV0dXJuIGN1cnJlbnRUZXN0LnB1c2hGYWlsdXJlLmFwcGx5KCBjdXJyZW50VGVzdCwgYXJndW1lbnRzICk7XG59O1xuXG4vLyBCYXNlZCBvbiBKYXZhJ3MgU3RyaW5nLmhhc2hDb2RlLCBhIHNpbXBsZSBidXQgbm90XG4vLyByaWdvcm91c2x5IGNvbGxpc2lvbiByZXNpc3RhbnQgaGFzaGluZyBmdW5jdGlvblxuZnVuY3Rpb24gZ2VuZXJhdGVIYXNoKCBtb2R1bGUsIHRlc3ROYW1lICkge1xuXHR2YXIgaGV4LFxuXHRcdGkgPSAwLFxuXHRcdGhhc2ggPSAwLFxuXHRcdHN0ciA9IG1vZHVsZSArIFwiXFx4MUNcIiArIHRlc3ROYW1lLFxuXHRcdGxlbiA9IHN0ci5sZW5ndGg7XG5cblx0Zm9yICggOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0aGFzaCAgPSAoICggaGFzaCA8PCA1ICkgLSBoYXNoICkgKyBzdHIuY2hhckNvZGVBdCggaSApO1xuXHRcdGhhc2ggfD0gMDtcblx0fVxuXG5cdC8vIENvbnZlcnQgdGhlIHBvc3NpYmx5IG5lZ2F0aXZlIGludGVnZXIgaGFzaCBjb2RlIGludG8gYW4gOCBjaGFyYWN0ZXIgaGV4IHN0cmluZywgd2hpY2ggaXNuJ3Rcblx0Ly8gc3RyaWN0bHkgbmVjZXNzYXJ5IGJ1dCBpbmNyZWFzZXMgdXNlciB1bmRlcnN0YW5kaW5nIHRoYXQgdGhlIGlkIGlzIGEgU0hBLWxpa2UgaGFzaFxuXHRoZXggPSAoIDB4MTAwMDAwMDAwICsgaGFzaCApLnRvU3RyaW5nKCAxNiApO1xuXHRpZiAoIGhleC5sZW5ndGggPCA4ICkge1xuXHRcdGhleCA9IFwiMDAwMDAwMFwiICsgaGV4O1xuXHR9XG5cblx0cmV0dXJuIGhleC5zbGljZSggLTggKTtcbn1cblxuZnVuY3Rpb24gc3luY2hyb25pemUoIGNhbGxiYWNrLCBwcmlvcml0eSApIHtcblx0dmFyIGxhc3QgPSAhcHJpb3JpdHk7XG5cblx0aWYgKCBRVW5pdC5vYmplY3RUeXBlKCBjYWxsYmFjayApID09PSBcImFycmF5XCIgKSB7XG5cdFx0d2hpbGUgKCBjYWxsYmFjay5sZW5ndGggKSB7XG5cdFx0XHRzeW5jaHJvbml6ZSggY2FsbGJhY2suc2hpZnQoKSApO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoIHByaW9yaXR5ICkge1xuXHRcdGNvbmZpZy5xdWV1ZS5zcGxpY2UoIHByaW9yaXR5Q291bnQrKywgMCwgY2FsbGJhY2sgKTtcblx0fSBlbHNlIHtcblx0XHRjb25maWcucXVldWUucHVzaCggY2FsbGJhY2sgKTtcblx0fVxuXG5cdGlmICggY29uZmlnLmF1dG9ydW4gJiYgIWNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRwcm9jZXNzKCBsYXN0ICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2F2ZUdsb2JhbCgpIHtcblx0Y29uZmlnLnBvbGx1dGlvbiA9IFtdO1xuXG5cdGlmICggY29uZmlnLm5vZ2xvYmFscyApIHtcblx0XHRmb3IgKCB2YXIga2V5IGluIGdsb2JhbCApIHtcblx0XHRcdGlmICggaGFzT3duLmNhbGwoIGdsb2JhbCwga2V5ICkgKSB7XG5cblx0XHRcdFx0Ly8gaW4gT3BlcmEgc29tZXRpbWVzIERPTSBlbGVtZW50IGlkcyBzaG93IHVwIGhlcmUsIGlnbm9yZSB0aGVtXG5cdFx0XHRcdGlmICggL15xdW5pdC10ZXN0LW91dHB1dC8udGVzdCgga2V5ICkgKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uZmlnLnBvbGx1dGlvbi5wdXNoKCBrZXkgKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gY2hlY2tQb2xsdXRpb24oKSB7XG5cdHZhciBuZXdHbG9iYWxzLFxuXHRcdGRlbGV0ZWRHbG9iYWxzLFxuXHRcdG9sZCA9IGNvbmZpZy5wb2xsdXRpb247XG5cblx0c2F2ZUdsb2JhbCgpO1xuXG5cdG5ld0dsb2JhbHMgPSBkaWZmKCBjb25maWcucG9sbHV0aW9uLCBvbGQgKTtcblx0aWYgKCBuZXdHbG9iYWxzLmxlbmd0aCA+IDAgKSB7XG5cdFx0UVVuaXQucHVzaEZhaWx1cmUoIFwiSW50cm9kdWNlZCBnbG9iYWwgdmFyaWFibGUocyk6IFwiICsgbmV3R2xvYmFscy5qb2luKCBcIiwgXCIgKSApO1xuXHR9XG5cblx0ZGVsZXRlZEdsb2JhbHMgPSBkaWZmKCBvbGQsIGNvbmZpZy5wb2xsdXRpb24gKTtcblx0aWYgKCBkZWxldGVkR2xvYmFscy5sZW5ndGggPiAwICkge1xuXHRcdFFVbml0LnB1c2hGYWlsdXJlKCBcIkRlbGV0ZWQgZ2xvYmFsIHZhcmlhYmxlKHMpOiBcIiArIGRlbGV0ZWRHbG9iYWxzLmpvaW4oIFwiLCBcIiApICk7XG5cdH1cbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0LmFzeW5jVGVzdFxuZnVuY3Rpb24gYXN5bmNUZXN0KCB0ZXN0TmFtZSwgZXhwZWN0ZWQsIGNhbGxiYWNrICkge1xuXHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgKSB7XG5cdFx0Y2FsbGJhY2sgPSBleHBlY3RlZDtcblx0XHRleHBlY3RlZCA9IG51bGw7XG5cdH1cblxuXHRRVW5pdC50ZXN0KCB0ZXN0TmFtZSwgZXhwZWN0ZWQsIGNhbGxiYWNrLCB0cnVlICk7XG59XG5cbi8vIFdpbGwgYmUgZXhwb3NlZCBhcyBRVW5pdC50ZXN0XG5mdW5jdGlvbiB0ZXN0KCB0ZXN0TmFtZSwgZXhwZWN0ZWQsIGNhbGxiYWNrLCBhc3luYyApIHtcblx0aWYgKCBmb2N1c2VkICkgIHsgcmV0dXJuOyB9XG5cblx0dmFyIG5ld1Rlc3Q7XG5cblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdGNhbGxiYWNrID0gZXhwZWN0ZWQ7XG5cdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHR9XG5cblx0bmV3VGVzdCA9IG5ldyBUZXN0KHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdGFzeW5jOiBhc3luYyxcblx0XHRjYWxsYmFjazogY2FsbGJhY2tcblx0fSk7XG5cblx0bmV3VGVzdC5xdWV1ZSgpO1xufVxuXG4vLyBXaWxsIGJlIGV4cG9zZWQgYXMgUVVuaXQuc2tpcFxuZnVuY3Rpb24gc2tpcCggdGVzdE5hbWUgKSB7XG5cdGlmICggZm9jdXNlZCApICB7IHJldHVybjsgfVxuXG5cdHZhciB0ZXN0ID0gbmV3IFRlc3Qoe1xuXHRcdHRlc3ROYW1lOiB0ZXN0TmFtZSxcblx0XHRza2lwOiB0cnVlXG5cdH0pO1xuXG5cdHRlc3QucXVldWUoKTtcbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0Lm9ubHlcbmZ1bmN0aW9uIG9ubHkoIHRlc3ROYW1lLCBleHBlY3RlZCwgY2FsbGJhY2ssIGFzeW5jICkge1xuXHR2YXIgbmV3VGVzdDtcblxuXHRpZiAoIGZvY3VzZWQgKSAgeyByZXR1cm47IH1cblxuXHRRVW5pdC5jb25maWcucXVldWUubGVuZ3RoID0gMDtcblx0Zm9jdXNlZCA9IHRydWU7XG5cblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdGNhbGxiYWNrID0gZXhwZWN0ZWQ7XG5cdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHR9XG5cblx0bmV3VGVzdCA9IG5ldyBUZXN0KHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdGFzeW5jOiBhc3luYyxcblx0XHRjYWxsYmFjazogY2FsbGJhY2tcblx0fSk7XG5cblx0bmV3VGVzdC5xdWV1ZSgpO1xufVxuXG5mdW5jdGlvbiBBc3NlcnQoIHRlc3RDb250ZXh0ICkge1xuXHR0aGlzLnRlc3QgPSB0ZXN0Q29udGV4dDtcbn1cblxuLy8gQXNzZXJ0IGhlbHBlcnNcblFVbml0LmFzc2VydCA9IEFzc2VydC5wcm90b3R5cGUgPSB7XG5cblx0Ly8gU3BlY2lmeSB0aGUgbnVtYmVyIG9mIGV4cGVjdGVkIGFzc2VydGlvbnMgdG8gZ3VhcmFudGVlIHRoYXQgZmFpbGVkIHRlc3Rcblx0Ly8gKG5vIGFzc2VydGlvbnMgYXJlIHJ1biBhdCBhbGwpIGRvbid0IHNsaXAgdGhyb3VnaC5cblx0ZXhwZWN0OiBmdW5jdGlvbiggYXNzZXJ0cyApIHtcblx0XHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgKSB7XG5cdFx0XHR0aGlzLnRlc3QuZXhwZWN0ZWQgPSBhc3NlcnRzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50ZXN0LmV4cGVjdGVkO1xuXHRcdH1cblx0fSxcblxuXHQvLyBJbmNyZW1lbnQgdGhpcyBUZXN0J3Mgc2VtYXBob3JlIGNvdW50ZXIsIHRoZW4gcmV0dXJuIGEgZnVuY3Rpb24gdGhhdFxuXHQvLyBkZWNyZW1lbnRzIHRoYXQgY291bnRlciBhIG1heGltdW0gb2Ygb25jZS5cblx0YXN5bmM6IGZ1bmN0aW9uKCBjb3VudCApIHtcblx0XHR2YXIgdGVzdCA9IHRoaXMudGVzdCxcblx0XHRcdHBvcHBlZCA9IGZhbHNlLFxuXHRcdFx0YWNjZXB0Q2FsbENvdW50ID0gY291bnQ7XG5cblx0XHRpZiAoIHR5cGVvZiBhY2NlcHRDYWxsQ291bnQgPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHRhY2NlcHRDYWxsQ291bnQgPSAxO1xuXHRcdH1cblxuXHRcdHRlc3Quc2VtYXBob3JlICs9IDE7XG5cdFx0dGVzdC51c2VkQXN5bmMgPSB0cnVlO1xuXHRcdHBhdXNlUHJvY2Vzc2luZygpO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIGRvbmUoKSB7XG5cblx0XHRcdGlmICggcG9wcGVkICkge1xuXHRcdFx0XHR0ZXN0LnB1c2hGYWlsdXJlKCBcIlRvbyBtYW55IGNhbGxzIHRvIHRoZSBgYXNzZXJ0LmFzeW5jYCBjYWxsYmFja1wiLFxuXHRcdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0YWNjZXB0Q2FsbENvdW50IC09IDE7XG5cdFx0XHRpZiAoIGFjY2VwdENhbGxDb3VudCA+IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGVzdC5zZW1hcGhvcmUgLT0gMTtcblx0XHRcdHBvcHBlZCA9IHRydWU7XG5cdFx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdFx0fTtcblx0fSxcblxuXHQvLyBFeHBvcnRzIHRlc3QucHVzaCgpIHRvIHRoZSB1c2VyIEFQSVxuXHQvLyBBbGlhcyBvZiBwdXNoUmVzdWx0LlxuXHRwdXNoOiBmdW5jdGlvbiggcmVzdWx0LCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBuZWdhdGl2ZSApIHtcblx0XHR2YXIgY3VycmVudEFzc2VydCA9IHRoaXMgaW5zdGFuY2VvZiBBc3NlcnQgPyB0aGlzIDogUVVuaXQuY29uZmlnLmN1cnJlbnQuYXNzZXJ0O1xuXHRcdHJldHVybiBjdXJyZW50QXNzZXJ0LnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogcmVzdWx0LFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0bmVnYXRpdmU6IG5lZ2F0aXZlXG5cdFx0fSApO1xuXHR9LFxuXG5cdHB1c2hSZXN1bHQ6IGZ1bmN0aW9uKCByZXN1bHRJbmZvICkge1xuXG5cdFx0Ly8gcmVzdWx0SW5mbyA9IHsgcmVzdWx0LCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBuZWdhdGl2ZSB9XG5cdFx0dmFyIGFzc2VydCA9IHRoaXMsXG5cdFx0XHRjdXJyZW50VGVzdCA9ICggYXNzZXJ0IGluc3RhbmNlb2YgQXNzZXJ0ICYmIGFzc2VydC50ZXN0ICkgfHwgUVVuaXQuY29uZmlnLmN1cnJlbnQ7XG5cblx0XHQvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmaXguXG5cdFx0Ly8gQWxsb3dzIHRoZSBkaXJlY3QgdXNlIG9mIGdsb2JhbCBleHBvcnRlZCBhc3NlcnRpb25zIGFuZCBRVW5pdC5hc3NlcnQuKlxuXHRcdC8vIEFsdGhvdWdoLCBpdCdzIHVzZSBpcyBub3QgcmVjb21tZW5kZWQgYXMgaXQgY2FuIGxlYWsgYXNzZXJ0aW9uc1xuXHRcdC8vIHRvIG90aGVyIHRlc3RzIGZyb20gYXN5bmMgdGVzdHMsIGJlY2F1c2Ugd2Ugb25seSBnZXQgYSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgdGVzdCxcblx0XHQvLyBub3QgZXhhY3RseSB0aGUgdGVzdCB3aGVyZSBhc3NlcnRpb24gd2VyZSBpbnRlbmRlZCB0byBiZSBjYWxsZWQuXG5cdFx0aWYgKCAhY3VycmVudFRlc3QgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiYXNzZXJ0aW9uIG91dHNpZGUgdGVzdCBjb250ZXh0LCBpbiBcIiArIHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0XHR9XG5cblx0XHRpZiAoIGN1cnJlbnRUZXN0LnVzZWRBc3luYyA9PT0gdHJ1ZSAmJiBjdXJyZW50VGVzdC5zZW1hcGhvcmUgPT09IDAgKSB7XG5cdFx0XHRjdXJyZW50VGVzdC5wdXNoRmFpbHVyZSggXCJBc3NlcnRpb24gYWZ0ZXIgdGhlIGZpbmFsIGBhc3NlcnQuYXN5bmNgIHdhcyByZXNvbHZlZFwiLFxuXHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cblx0XHRcdC8vIEFsbG93IHRoaXMgYXNzZXJ0aW9uIHRvIGNvbnRpbnVlIHJ1bm5pbmcgYW55d2F5Li4uXG5cdFx0fVxuXG5cdFx0aWYgKCAhKCBhc3NlcnQgaW5zdGFuY2VvZiBBc3NlcnQgKSApIHtcblx0XHRcdGFzc2VydCA9IGN1cnJlbnRUZXN0LmFzc2VydDtcblx0XHR9XG5cblx0XHRyZXR1cm4gYXNzZXJ0LnRlc3QucHVzaFJlc3VsdCggcmVzdWx0SW5mbyApO1xuXHR9LFxuXG5cdG9rOiBmdW5jdGlvbiggcmVzdWx0LCBtZXNzYWdlICkge1xuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlIHx8ICggcmVzdWx0ID8gXCJva2F5XCIgOiBcImZhaWxlZCwgZXhwZWN0ZWQgYXJndW1lbnQgdG8gYmUgdHJ1dGh5LCB3YXM6IFwiICtcblx0XHRcdFFVbml0LmR1bXAucGFyc2UoIHJlc3VsdCApICk7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6ICEhcmVzdWx0LFxuXHRcdFx0YWN0dWFsOiByZXN1bHQsXG5cdFx0XHRleHBlY3RlZDogdHJ1ZSxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9ICk7XG5cdH0sXG5cblx0bm90T2s6IGZ1bmN0aW9uKCByZXN1bHQsIG1lc3NhZ2UgKSB7XG5cdFx0bWVzc2FnZSA9IG1lc3NhZ2UgfHwgKCAhcmVzdWx0ID8gXCJva2F5XCIgOiBcImZhaWxlZCwgZXhwZWN0ZWQgYXJndW1lbnQgdG8gYmUgZmFsc3ksIHdhczogXCIgK1xuXHRcdFx0UVVuaXQuZHVtcC5wYXJzZSggcmVzdWx0ICkgKTtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogIXJlc3VsdCxcblx0XHRcdGFjdHVhbDogcmVzdWx0LFxuXHRcdFx0ZXhwZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRlcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0Lypqc2hpbnQgZXFlcWVxOmZhbHNlICovXG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IGV4cGVjdGVkID09IGFjdHVhbCxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRub3RFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0Lypqc2hpbnQgZXFlcWVxOmZhbHNlICovXG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IGV4cGVjdGVkICE9IGFjdHVhbCxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5lZ2F0aXZlOiB0cnVlXG5cdFx0fSApO1xuXHR9LFxuXG5cdHByb3BFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0YWN0dWFsID0gb2JqZWN0VmFsdWVzKCBhY3R1YWwgKTtcblx0XHRleHBlY3RlZCA9IG9iamVjdFZhbHVlcyggZXhwZWN0ZWQgKTtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogUVVuaXQuZXF1aXYoIGFjdHVhbCwgZXhwZWN0ZWQgKSxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRub3RQcm9wRXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdGFjdHVhbCA9IG9iamVjdFZhbHVlcyggYWN0dWFsICk7XG5cdFx0ZXhwZWN0ZWQgPSBvYmplY3RWYWx1ZXMoIGV4cGVjdGVkICk7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6ICFRVW5pdC5lcXVpdiggYWN0dWFsLCBleHBlY3RlZCApLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0bmVnYXRpdmU6IHRydWVcblx0XHR9ICk7XG5cdH0sXG5cblx0ZGVlcEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogUVVuaXQuZXF1aXYoIGFjdHVhbCwgZXhwZWN0ZWQgKSxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRub3REZWVwRXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiAhUVVuaXQuZXF1aXYoIGFjdHVhbCwgZXhwZWN0ZWQgKSxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5lZ2F0aXZlOiB0cnVlXG5cdFx0fSApO1xuXHR9LFxuXG5cdHN0cmljdEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogZXhwZWN0ZWQgPT09IGFjdHVhbCxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRub3RTdHJpY3RFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IGV4cGVjdGVkICE9PSBhY3R1YWwsXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRuZWdhdGl2ZTogdHJ1ZVxuXHRcdH0gKTtcblx0fSxcblxuXHRcInRocm93c1wiOiBmdW5jdGlvbiggYmxvY2ssIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHZhciBhY3R1YWwsIGV4cGVjdGVkVHlwZSxcblx0XHRcdGV4cGVjdGVkT3V0cHV0ID0gZXhwZWN0ZWQsXG5cdFx0XHRvayA9IGZhbHNlLFxuXHRcdFx0Y3VycmVudFRlc3QgPSAoIHRoaXMgaW5zdGFuY2VvZiBBc3NlcnQgJiYgdGhpcy50ZXN0ICkgfHwgUVVuaXQuY29uZmlnLmN1cnJlbnQ7XG5cblx0XHQvLyAnZXhwZWN0ZWQnIGlzIG9wdGlvbmFsIHVubGVzcyBkb2luZyBzdHJpbmcgY29tcGFyaXNvblxuXHRcdGlmICggbWVzc2FnZSA9PSBudWxsICYmIHR5cGVvZiBleHBlY3RlZCA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdG1lc3NhZ2UgPSBleHBlY3RlZDtcblx0XHRcdGV4cGVjdGVkID0gbnVsbDtcblx0XHR9XG5cblx0XHRjdXJyZW50VGVzdC5pZ25vcmVHbG9iYWxFcnJvcnMgPSB0cnVlO1xuXHRcdHRyeSB7XG5cdFx0XHRibG9jay5jYWxsKCBjdXJyZW50VGVzdC50ZXN0RW52aXJvbm1lbnQgKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRhY3R1YWwgPSBlO1xuXHRcdH1cblx0XHRjdXJyZW50VGVzdC5pZ25vcmVHbG9iYWxFcnJvcnMgPSBmYWxzZTtcblxuXHRcdGlmICggYWN0dWFsICkge1xuXHRcdFx0ZXhwZWN0ZWRUeXBlID0gUVVuaXQub2JqZWN0VHlwZSggZXhwZWN0ZWQgKTtcblxuXHRcdFx0Ly8gd2UgZG9uJ3Qgd2FudCB0byB2YWxpZGF0ZSB0aHJvd24gZXJyb3Jcblx0XHRcdGlmICggIWV4cGVjdGVkICkge1xuXHRcdFx0XHRvayA9IHRydWU7XG5cdFx0XHRcdGV4cGVjdGVkT3V0cHV0ID0gbnVsbDtcblxuXHRcdFx0Ly8gZXhwZWN0ZWQgaXMgYSByZWdleHBcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJyZWdleHBcIiApIHtcblx0XHRcdFx0b2sgPSBleHBlY3RlZC50ZXN0KCBlcnJvclN0cmluZyggYWN0dWFsICkgKTtcblxuXHRcdFx0Ly8gZXhwZWN0ZWQgaXMgYSBzdHJpbmdcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0b2sgPSBleHBlY3RlZCA9PT0gZXJyb3JTdHJpbmcoIGFjdHVhbCApO1xuXG5cdFx0XHQvLyBleHBlY3RlZCBpcyBhIGNvbnN0cnVjdG9yLCBtYXliZSBhbiBFcnJvciBjb25zdHJ1Y3RvclxuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcImZ1bmN0aW9uXCIgJiYgYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQgKSB7XG5cdFx0XHRcdG9rID0gdHJ1ZTtcblxuXHRcdFx0Ly8gZXhwZWN0ZWQgaXMgYW4gRXJyb3Igb2JqZWN0XG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRcdG9rID0gYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQuY29uc3RydWN0b3IgJiZcblx0XHRcdFx0XHRhY3R1YWwubmFtZSA9PT0gZXhwZWN0ZWQubmFtZSAmJlxuXHRcdFx0XHRcdGFjdHVhbC5tZXNzYWdlID09PSBleHBlY3RlZC5tZXNzYWdlO1xuXG5cdFx0XHQvLyBleHBlY3RlZCBpcyBhIHZhbGlkYXRpb24gZnVuY3Rpb24gd2hpY2ggcmV0dXJucyB0cnVlIGlmIHZhbGlkYXRpb24gcGFzc2VkXG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwiZnVuY3Rpb25cIiAmJiBleHBlY3RlZC5jYWxsKCB7fSwgYWN0dWFsICkgPT09IHRydWUgKSB7XG5cdFx0XHRcdGV4cGVjdGVkT3V0cHV0ID0gbnVsbDtcblx0XHRcdFx0b2sgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGN1cnJlbnRUZXN0LmFzc2VydC5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IG9rLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWRPdXRwdXQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9XG59O1xuXG4vLyBQcm92aWRlIGFuIGFsdGVybmF0aXZlIHRvIGFzc2VydC50aHJvd3MoKSwgZm9yIGVudmlyb25tZW50cyB0aGF0IGNvbnNpZGVyIHRocm93cyBhIHJlc2VydmVkIHdvcmRcbi8vIEtub3duIHRvIHVzIGFyZTogQ2xvc3VyZSBDb21waWxlciwgTmFyd2hhbFxuKGZ1bmN0aW9uKCkge1xuXHQvKmpzaGludCBzdWI6dHJ1ZSAqL1xuXHRBc3NlcnQucHJvdG90eXBlLnJhaXNlcyA9IEFzc2VydC5wcm90b3R5cGVbIFwidGhyb3dzXCIgXTtcbn0oKSk7XG5cbmZ1bmN0aW9uIGVycm9yU3RyaW5nKCBlcnJvciApIHtcblx0dmFyIG5hbWUsIG1lc3NhZ2UsXG5cdFx0cmVzdWx0RXJyb3JTdHJpbmcgPSBlcnJvci50b1N0cmluZygpO1xuXHRpZiAoIHJlc3VsdEVycm9yU3RyaW5nLnN1YnN0cmluZyggMCwgNyApID09PSBcIltvYmplY3RcIiApIHtcblx0XHRuYW1lID0gZXJyb3IubmFtZSA/IGVycm9yLm5hbWUudG9TdHJpbmcoKSA6IFwiRXJyb3JcIjtcblx0XHRtZXNzYWdlID0gZXJyb3IubWVzc2FnZSA/IGVycm9yLm1lc3NhZ2UudG9TdHJpbmcoKSA6IFwiXCI7XG5cdFx0aWYgKCBuYW1lICYmIG1lc3NhZ2UgKSB7XG5cdFx0XHRyZXR1cm4gbmFtZSArIFwiOiBcIiArIG1lc3NhZ2U7XG5cdFx0fSBlbHNlIGlmICggbmFtZSApIHtcblx0XHRcdHJldHVybiBuYW1lO1xuXHRcdH0gZWxzZSBpZiAoIG1lc3NhZ2UgKSB7XG5cdFx0XHRyZXR1cm4gbWVzc2FnZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwiRXJyb3JcIjtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHJlc3VsdEVycm9yU3RyaW5nO1xuXHR9XG59XG5cbi8vIFRlc3QgZm9yIGVxdWFsaXR5IGFueSBKYXZhU2NyaXB0IHR5cGUuXG4vLyBBdXRob3I6IFBoaWxpcHBlIFJhdGjDqSA8cHJhdGhlQGdtYWlsLmNvbT5cblFVbml0LmVxdWl2ID0gKGZ1bmN0aW9uKCkge1xuXG5cdC8vIFN0YWNrIHRvIGRlY2lkZSBiZXR3ZWVuIHNraXAvYWJvcnQgZnVuY3Rpb25zXG5cdHZhciBjYWxsZXJzID0gW107XG5cblx0Ly8gU3RhY2sgdG8gYXZvaWRpbmcgbG9vcHMgZnJvbSBjaXJjdWxhciByZWZlcmVuY2luZ1xuXHR2YXIgcGFyZW50cyA9IFtdO1xuXHR2YXIgcGFyZW50c0IgPSBbXTtcblxuXHR2YXIgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24oIG9iaiApIHtcblxuXHRcdC8qanNoaW50IHByb3RvOiB0cnVlICovXG5cdFx0cmV0dXJuIG9iai5fX3Byb3RvX187XG5cdH07XG5cblx0ZnVuY3Rpb24gdXNlU3RyaWN0RXF1YWxpdHkoIGIsIGEgKSB7XG5cblx0XHQvLyBUbyBjYXRjaCBzaG9ydCBhbm5vdGF0aW9uIFZTICduZXcnIGFubm90YXRpb24gb2YgYSBkZWNsYXJhdGlvbi4gZS5nLjpcblx0XHQvLyBgdmFyIGkgPSAxO2Bcblx0XHQvLyBgdmFyIGogPSBuZXcgTnVtYmVyKDEpO2Bcblx0XHRpZiAoIHR5cGVvZiBhID09PSBcIm9iamVjdFwiICkge1xuXHRcdFx0YSA9IGEudmFsdWVPZigpO1xuXHRcdH1cblx0XHRpZiAoIHR5cGVvZiBiID09PSBcIm9iamVjdFwiICkge1xuXHRcdFx0YiA9IGIudmFsdWVPZigpO1xuXHRcdH1cblxuXHRcdHJldHVybiBhID09PSBiO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29tcGFyZUNvbnN0cnVjdG9ycyggYSwgYiApIHtcblx0XHR2YXIgcHJvdG9BID0gZ2V0UHJvdG8oIGEgKTtcblx0XHR2YXIgcHJvdG9CID0gZ2V0UHJvdG8oIGIgKTtcblxuXHRcdC8vIENvbXBhcmluZyBjb25zdHJ1Y3RvcnMgaXMgbW9yZSBzdHJpY3QgdGhhbiB1c2luZyBgaW5zdGFuY2VvZmBcblx0XHRpZiAoIGEuY29uc3RydWN0b3IgPT09IGIuY29uc3RydWN0b3IgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBSZWYgIzg1MVxuXHRcdC8vIElmIHRoZSBvYmogcHJvdG90eXBlIGRlc2NlbmRzIGZyb20gYSBudWxsIGNvbnN0cnVjdG9yLCB0cmVhdCBpdFxuXHRcdC8vIGFzIGEgbnVsbCBwcm90b3R5cGUuXG5cdFx0aWYgKCBwcm90b0EgJiYgcHJvdG9BLmNvbnN0cnVjdG9yID09PSBudWxsICkge1xuXHRcdFx0cHJvdG9BID0gbnVsbDtcblx0XHR9XG5cdFx0aWYgKCBwcm90b0IgJiYgcHJvdG9CLmNvbnN0cnVjdG9yID09PSBudWxsICkge1xuXHRcdFx0cHJvdG9CID0gbnVsbDtcblx0XHR9XG5cblx0XHQvLyBBbGxvdyBvYmplY3RzIHdpdGggbm8gcHJvdG90eXBlIHRvIGJlIGVxdWl2YWxlbnQgdG9cblx0XHQvLyBvYmplY3RzIHdpdGggT2JqZWN0IGFzIHRoZWlyIGNvbnN0cnVjdG9yLlxuXHRcdGlmICggKCBwcm90b0EgPT09IG51bGwgJiYgcHJvdG9CID09PSBPYmplY3QucHJvdG90eXBlICkgfHxcblx0XHRcdFx0KCBwcm90b0IgPT09IG51bGwgJiYgcHJvdG9BID09PSBPYmplY3QucHJvdG90eXBlICkgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRSZWdFeHBGbGFncyggcmVnZXhwICkge1xuXHRcdHJldHVybiBcImZsYWdzXCIgaW4gcmVnZXhwID8gcmVnZXhwLmZsYWdzIDogcmVnZXhwLnRvU3RyaW5nKCkubWF0Y2goIC9bZ2ltdXldKiQvIClbIDAgXTtcblx0fVxuXG5cdHZhciBjYWxsYmFja3MgPSB7XG5cdFx0XCJzdHJpbmdcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJib29sZWFuXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwibnVtYmVyXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwibnVsbFwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcInVuZGVmaW5lZFwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcInN5bWJvbFwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcImRhdGVcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cblx0XHRcIm5hblwiOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0sXG5cblx0XHRcInJlZ2V4cFwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHJldHVybiBhLnNvdXJjZSA9PT0gYi5zb3VyY2UgJiZcblxuXHRcdFx0XHQvLyBJbmNsdWRlIGZsYWdzIGluIHRoZSBjb21wYXJpc29uXG5cdFx0XHRcdGdldFJlZ0V4cEZsYWdzKCBhICkgPT09IGdldFJlZ0V4cEZsYWdzKCBiICk7XG5cdFx0fSxcblxuXHRcdC8vIC0gc2tpcCB3aGVuIHRoZSBwcm9wZXJ0eSBpcyBhIG1ldGhvZCBvZiBhbiBpbnN0YW5jZSAoT09QKVxuXHRcdC8vIC0gYWJvcnQgb3RoZXJ3aXNlLFxuXHRcdC8vIGluaXRpYWwgPT09IHdvdWxkIGhhdmUgY2F0Y2ggaWRlbnRpY2FsIHJlZmVyZW5jZXMgYW55d2F5XG5cdFx0XCJmdW5jdGlvblwiOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjYWxsZXIgPSBjYWxsZXJzWyBjYWxsZXJzLmxlbmd0aCAtIDEgXTtcblx0XHRcdHJldHVybiBjYWxsZXIgIT09IE9iamVjdCAmJiB0eXBlb2YgY2FsbGVyICE9PSBcInVuZGVmaW5lZFwiO1xuXHRcdH0sXG5cblx0XHRcImFycmF5XCI6IGZ1bmN0aW9uKCBiLCBhICkge1xuXHRcdFx0dmFyIGksIGosIGxlbiwgbG9vcCwgYUNpcmN1bGFyLCBiQ2lyY3VsYXI7XG5cblx0XHRcdGxlbiA9IGEubGVuZ3RoO1xuXHRcdFx0aWYgKCBsZW4gIT09IGIubGVuZ3RoICkge1xuXHRcdFx0XHQvLyBzYWZlIGFuZCBmYXN0ZXJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUcmFjayByZWZlcmVuY2UgdG8gYXZvaWQgY2lyY3VsYXIgcmVmZXJlbmNlc1xuXHRcdFx0cGFyZW50cy5wdXNoKCBhICk7XG5cdFx0XHRwYXJlbnRzQi5wdXNoKCBiICk7XG5cdFx0XHRmb3IgKCBpID0gMDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHRsb29wID0gZmFsc2U7XG5cdFx0XHRcdGZvciAoIGogPSAwOyBqIDwgcGFyZW50cy5sZW5ndGg7IGorKyApIHtcblx0XHRcdFx0XHRhQ2lyY3VsYXIgPSBwYXJlbnRzWyBqIF0gPT09IGFbIGkgXTtcblx0XHRcdFx0XHRiQ2lyY3VsYXIgPSBwYXJlbnRzQlsgaiBdID09PSBiWyBpIF07XG5cdFx0XHRcdFx0aWYgKCBhQ2lyY3VsYXIgfHwgYkNpcmN1bGFyICkge1xuXHRcdFx0XHRcdFx0aWYgKCBhWyBpIF0gPT09IGJbIGkgXSB8fCBhQ2lyY3VsYXIgJiYgYkNpcmN1bGFyICkge1xuXHRcdFx0XHRcdFx0XHRsb29wID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRcdFx0XHRcdHBhcmVudHNCLnBvcCgpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggIWxvb3AgJiYgIWlubmVyRXF1aXYoIGFbIGkgXSwgYlsgaSBdICkgKSB7XG5cdFx0XHRcdFx0cGFyZW50cy5wb3AoKTtcblx0XHRcdFx0XHRwYXJlbnRzQi5wb3AoKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRwYXJlbnRzQi5wb3AoKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0sXG5cblx0XHRcInNldFwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBhQXJyYXksIGJBcnJheTtcblxuXHRcdFx0YUFycmF5ID0gW107XG5cdFx0XHRhLmZvckVhY2goIGZ1bmN0aW9uKCB2ICkge1xuXHRcdFx0XHRhQXJyYXkucHVzaCggdiApO1xuXHRcdFx0fSk7XG5cdFx0XHRiQXJyYXkgPSBbXTtcblx0XHRcdGIuZm9yRWFjaCggZnVuY3Rpb24oIHYgKSB7XG5cdFx0XHRcdGJBcnJheS5wdXNoKCB2ICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGlubmVyRXF1aXYoIGJBcnJheSwgYUFycmF5ICk7XG5cdFx0fSxcblxuXHRcdFwibWFwXCI6IGZ1bmN0aW9uKCBiLCBhICkge1xuXHRcdFx0dmFyIGFBcnJheSwgYkFycmF5O1xuXG5cdFx0XHRhQXJyYXkgPSBbXTtcblx0XHRcdGEuZm9yRWFjaCggZnVuY3Rpb24oIHYsIGsgKSB7XG5cdFx0XHRcdGFBcnJheS5wdXNoKCBbIGssIHYgXSApO1xuXHRcdFx0fSk7XG5cdFx0XHRiQXJyYXkgPSBbXTtcblx0XHRcdGIuZm9yRWFjaCggZnVuY3Rpb24oIHYsIGsgKSB7XG5cdFx0XHRcdGJBcnJheS5wdXNoKCBbIGssIHYgXSApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBpbm5lckVxdWl2KCBiQXJyYXksIGFBcnJheSApO1xuXHRcdH0sXG5cblx0XHRcIm9iamVjdFwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBpLCBqLCBsb29wLCBhQ2lyY3VsYXIsIGJDaXJjdWxhcjtcblxuXHRcdFx0Ly8gRGVmYXVsdCB0byB0cnVlXG5cdFx0XHR2YXIgZXEgPSB0cnVlO1xuXHRcdFx0dmFyIGFQcm9wZXJ0aWVzID0gW107XG5cdFx0XHR2YXIgYlByb3BlcnRpZXMgPSBbXTtcblxuXHRcdFx0aWYgKCBjb21wYXJlQ29uc3RydWN0b3JzKCBhLCBiICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFN0YWNrIGNvbnN0cnVjdG9yIGJlZm9yZSB0cmF2ZXJzaW5nIHByb3BlcnRpZXNcblx0XHRcdGNhbGxlcnMucHVzaCggYS5jb25zdHJ1Y3RvciApO1xuXG5cdFx0XHQvLyBUcmFjayByZWZlcmVuY2UgdG8gYXZvaWQgY2lyY3VsYXIgcmVmZXJlbmNlc1xuXHRcdFx0cGFyZW50cy5wdXNoKCBhICk7XG5cdFx0XHRwYXJlbnRzQi5wdXNoKCBiICk7XG5cblx0XHRcdC8vIEJlIHN0cmljdDogZG9uJ3QgZW5zdXJlIGhhc093blByb3BlcnR5IGFuZCBnbyBkZWVwXG5cdFx0XHRmb3IgKCBpIGluIGEgKSB7XG5cdFx0XHRcdGxvb3AgPSBmYWxzZTtcblx0XHRcdFx0Zm9yICggaiA9IDA7IGogPCBwYXJlbnRzLmxlbmd0aDsgaisrICkge1xuXHRcdFx0XHRcdGFDaXJjdWxhciA9IHBhcmVudHNbIGogXSA9PT0gYVsgaSBdO1xuXHRcdFx0XHRcdGJDaXJjdWxhciA9IHBhcmVudHNCWyBqIF0gPT09IGJbIGkgXTtcblx0XHRcdFx0XHRpZiAoIGFDaXJjdWxhciB8fCBiQ2lyY3VsYXIgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIGFbIGkgXSA9PT0gYlsgaSBdIHx8IGFDaXJjdWxhciAmJiBiQ2lyY3VsYXIgKSB7XG5cdFx0XHRcdFx0XHRcdGxvb3AgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZXEgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGFQcm9wZXJ0aWVzLnB1c2goIGkgKTtcblx0XHRcdFx0aWYgKCAhbG9vcCAmJiAhaW5uZXJFcXVpdiggYVsgaSBdLCBiWyBpIF0gKSApIHtcblx0XHRcdFx0XHRlcSA9IGZhbHNlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRwYXJlbnRzQi5wb3AoKTtcblxuXHRcdFx0Ly8gVW5zdGFjaywgd2UgYXJlIGRvbmVcblx0XHRcdGNhbGxlcnMucG9wKCk7XG5cblx0XHRcdGZvciAoIGkgaW4gYiApIHtcblxuXHRcdFx0XHQvLyBDb2xsZWN0IGIncyBwcm9wZXJ0aWVzXG5cdFx0XHRcdGJQcm9wZXJ0aWVzLnB1c2goIGkgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRW5zdXJlcyBpZGVudGljYWwgcHJvcGVydGllcyBuYW1lXG5cdFx0XHRyZXR1cm4gZXEgJiYgaW5uZXJFcXVpdiggYVByb3BlcnRpZXMuc29ydCgpLCBiUHJvcGVydGllcy5zb3J0KCkgKTtcblx0XHR9XG5cdH07XG5cblx0ZnVuY3Rpb24gdHlwZUVxdWl2KCBhLCBiICkge1xuXHRcdHZhciB0eXBlID0gUVVuaXQub2JqZWN0VHlwZSggYSApO1xuXHRcdHJldHVybiBRVW5pdC5vYmplY3RUeXBlKCBiICkgPT09IHR5cGUgJiYgY2FsbGJhY2tzWyB0eXBlIF0oIGIsIGEgKTtcblx0fVxuXG5cdC8vIFRoZSByZWFsIGVxdWl2IGZ1bmN0aW9uXG5cdGZ1bmN0aW9uIGlubmVyRXF1aXYoIGEsIGIgKSB7XG5cblx0XHQvLyBXZSdyZSBkb25lIHdoZW4gdGhlcmUncyBub3RoaW5nIG1vcmUgdG8gY29tcGFyZVxuXHRcdGlmICggYXJndW1lbnRzLmxlbmd0aCA8IDIgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBSZXF1aXJlIHR5cGUtc3BlY2lmaWMgZXF1YWxpdHlcblx0XHRyZXR1cm4gKCBhID09PSBiIHx8IHR5cGVFcXVpdiggYSwgYiApICkgJiZcblxuXHRcdFx0Ly8gLi4uYWNyb3NzIGFsbCBjb25zZWN1dGl2ZSBhcmd1bWVudCBwYWlyc1xuXHRcdFx0KCBhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGlubmVyRXF1aXYuYXBwbHkoIHRoaXMsIFtdLnNsaWNlLmNhbGwoIGFyZ3VtZW50cywgMSApICkgKTtcblx0fVxuXG5cdHJldHVybiBpbm5lckVxdWl2O1xufSgpKTtcblxuLy8gQmFzZWQgb24ganNEdW1wIGJ5IEFyaWVsIEZsZXNsZXJcbi8vIGh0dHA6Ly9mbGVzbGVyLmJsb2dzcG90LmNvbS8yMDA4LzA1L2pzZHVtcC1wcmV0dHktZHVtcC1vZi1hbnktamF2YXNjcmlwdC5odG1sXG5RVW5pdC5kdW1wID0gKGZ1bmN0aW9uKCkge1xuXHRmdW5jdGlvbiBxdW90ZSggc3RyICkge1xuXHRcdHJldHVybiBcIlxcXCJcIiArIHN0ci50b1N0cmluZygpLnJlcGxhY2UoIC9cXFxcL2csIFwiXFxcXFxcXFxcIiApLnJlcGxhY2UoIC9cIi9nLCBcIlxcXFxcXFwiXCIgKSArIFwiXFxcIlwiO1xuXHR9XG5cdGZ1bmN0aW9uIGxpdGVyYWwoIG8gKSB7XG5cdFx0cmV0dXJuIG8gKyBcIlwiO1xuXHR9XG5cdGZ1bmN0aW9uIGpvaW4oIHByZSwgYXJyLCBwb3N0ICkge1xuXHRcdHZhciBzID0gZHVtcC5zZXBhcmF0b3IoKSxcblx0XHRcdGJhc2UgPSBkdW1wLmluZGVudCgpLFxuXHRcdFx0aW5uZXIgPSBkdW1wLmluZGVudCggMSApO1xuXHRcdGlmICggYXJyLmpvaW4gKSB7XG5cdFx0XHRhcnIgPSBhcnIuam9pbiggXCIsXCIgKyBzICsgaW5uZXIgKTtcblx0XHR9XG5cdFx0aWYgKCAhYXJyICkge1xuXHRcdFx0cmV0dXJuIHByZSArIHBvc3Q7XG5cdFx0fVxuXHRcdHJldHVybiBbIHByZSwgaW5uZXIgKyBhcnIsIGJhc2UgKyBwb3N0IF0uam9pbiggcyApO1xuXHR9XG5cdGZ1bmN0aW9uIGFycmF5KCBhcnIsIHN0YWNrICkge1xuXHRcdHZhciBpID0gYXJyLmxlbmd0aCxcblx0XHRcdHJldCA9IG5ldyBBcnJheSggaSApO1xuXG5cdFx0aWYgKCBkdW1wLm1heERlcHRoICYmIGR1bXAuZGVwdGggPiBkdW1wLm1heERlcHRoICkge1xuXHRcdFx0cmV0dXJuIFwiW29iamVjdCBBcnJheV1cIjtcblx0XHR9XG5cblx0XHR0aGlzLnVwKCk7XG5cdFx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0XHRyZXRbIGkgXSA9IHRoaXMucGFyc2UoIGFyclsgaSBdLCB1bmRlZmluZWQsIHN0YWNrICk7XG5cdFx0fVxuXHRcdHRoaXMuZG93bigpO1xuXHRcdHJldHVybiBqb2luKCBcIltcIiwgcmV0LCBcIl1cIiApO1xuXHR9XG5cblx0dmFyIHJlTmFtZSA9IC9eZnVuY3Rpb24gKFxcdyspLyxcblx0XHRkdW1wID0ge1xuXG5cdFx0XHQvLyBvYmpUeXBlIGlzIHVzZWQgbW9zdGx5IGludGVybmFsbHksIHlvdSBjYW4gZml4IGEgKGN1c3RvbSkgdHlwZSBpbiBhZHZhbmNlXG5cdFx0XHRwYXJzZTogZnVuY3Rpb24oIG9iaiwgb2JqVHlwZSwgc3RhY2sgKSB7XG5cdFx0XHRcdHN0YWNrID0gc3RhY2sgfHwgW107XG5cdFx0XHRcdHZhciByZXMsIHBhcnNlciwgcGFyc2VyVHlwZSxcblx0XHRcdFx0XHRpblN0YWNrID0gaW5BcnJheSggb2JqLCBzdGFjayApO1xuXG5cdFx0XHRcdGlmICggaW5TdGFjayAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFwicmVjdXJzaW9uKFwiICsgKCBpblN0YWNrIC0gc3RhY2subGVuZ3RoICkgKyBcIilcIjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9ialR5cGUgPSBvYmpUeXBlIHx8IHRoaXMudHlwZU9mKCBvYmogICk7XG5cdFx0XHRcdHBhcnNlciA9IHRoaXMucGFyc2Vyc1sgb2JqVHlwZSBdO1xuXHRcdFx0XHRwYXJzZXJUeXBlID0gdHlwZW9mIHBhcnNlcjtcblxuXHRcdFx0XHRpZiAoIHBhcnNlclR5cGUgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0XHRzdGFjay5wdXNoKCBvYmogKTtcblx0XHRcdFx0XHRyZXMgPSBwYXJzZXIuY2FsbCggdGhpcywgb2JqLCBzdGFjayApO1xuXHRcdFx0XHRcdHN0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdHJldHVybiByZXM7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuICggcGFyc2VyVHlwZSA9PT0gXCJzdHJpbmdcIiApID8gcGFyc2VyIDogdGhpcy5wYXJzZXJzLmVycm9yO1xuXHRcdFx0fSxcblx0XHRcdHR5cGVPZjogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRcdFx0dmFyIHR5cGU7XG5cdFx0XHRcdGlmICggb2JqID09PSBudWxsICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcIm51bGxcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggdHlwZW9mIG9iaiA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJ1bmRlZmluZWRcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggUVVuaXQuaXMoIFwicmVnZXhwXCIsIG9iaiApICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcInJlZ2V4cFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBRVW5pdC5pcyggXCJkYXRlXCIsIG9iaiApICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImRhdGVcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggUVVuaXQuaXMoIFwiZnVuY3Rpb25cIiwgb2JqICkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiZnVuY3Rpb25cIjtcblx0XHRcdFx0fSBlbHNlIGlmICggb2JqLnNldEludGVydmFsICE9PSB1bmRlZmluZWQgJiZcblx0XHRcdFx0XHRcdG9iai5kb2N1bWVudCAhPT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0XHRvYmoubm9kZVR5cGUgPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJ3aW5kb3dcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggb2JqLm5vZGVUeXBlID09PSA5ICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImRvY3VtZW50XCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG9iai5ub2RlVHlwZSApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJub2RlXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoXG5cblx0XHRcdFx0XHQvLyBuYXRpdmUgYXJyYXlzXG5cdFx0XHRcdFx0dG9TdHJpbmcuY2FsbCggb2JqICkgPT09IFwiW29iamVjdCBBcnJheV1cIiB8fFxuXG5cdFx0XHRcdFx0Ly8gTm9kZUxpc3Qgb2JqZWN0c1xuXHRcdFx0XHRcdCggdHlwZW9mIG9iai5sZW5ndGggPT09IFwibnVtYmVyXCIgJiYgb2JqLml0ZW0gIT09IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdCggb2JqLmxlbmd0aCA/IG9iai5pdGVtKCAwICkgPT09IG9ialsgMCBdIDogKCBvYmouaXRlbSggMCApID09PSBudWxsICYmXG5cdFx0XHRcdFx0b2JqWyAwIF0gPT09IHVuZGVmaW5lZCApICkgKVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHR0eXBlID0gXCJhcnJheVwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBvYmouY29uc3RydWN0b3IgPT09IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJlcnJvclwiO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHR5cGUgPSB0eXBlb2Ygb2JqO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0eXBlO1xuXHRcdFx0fSxcblx0XHRcdHNlcGFyYXRvcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLm11bHRpbGluZSA/IHRoaXMuSFRNTCA/IFwiPGJyIC8+XCIgOiBcIlxcblwiIDogdGhpcy5IVE1MID8gXCImIzE2MDtcIiA6IFwiIFwiO1xuXHRcdFx0fSxcblx0XHRcdC8vIGV4dHJhIGNhbiBiZSBhIG51bWJlciwgc2hvcnRjdXQgZm9yIGluY3JlYXNpbmctY2FsbGluZy1kZWNyZWFzaW5nXG5cdFx0XHRpbmRlbnQ6IGZ1bmN0aW9uKCBleHRyYSApIHtcblx0XHRcdFx0aWYgKCAhdGhpcy5tdWx0aWxpbmUgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGNociA9IHRoaXMuaW5kZW50Q2hhcjtcblx0XHRcdFx0aWYgKCB0aGlzLkhUTUwgKSB7XG5cdFx0XHRcdFx0Y2hyID0gY2hyLnJlcGxhY2UoIC9cXHQvZywgXCIgICBcIiApLnJlcGxhY2UoIC8gL2csIFwiJiMxNjA7XCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbmV3IEFycmF5KCB0aGlzLmRlcHRoICsgKCBleHRyYSB8fCAwICkgKS5qb2luKCBjaHIgKTtcblx0XHRcdH0sXG5cdFx0XHR1cDogZnVuY3Rpb24oIGEgKSB7XG5cdFx0XHRcdHRoaXMuZGVwdGggKz0gYSB8fCAxO1xuXHRcdFx0fSxcblx0XHRcdGRvd246IGZ1bmN0aW9uKCBhICkge1xuXHRcdFx0XHR0aGlzLmRlcHRoIC09IGEgfHwgMTtcblx0XHRcdH0sXG5cdFx0XHRzZXRQYXJzZXI6IGZ1bmN0aW9uKCBuYW1lLCBwYXJzZXIgKSB7XG5cdFx0XHRcdHRoaXMucGFyc2Vyc1sgbmFtZSBdID0gcGFyc2VyO1xuXHRcdFx0fSxcblx0XHRcdC8vIFRoZSBuZXh0IDMgYXJlIGV4cG9zZWQgc28geW91IGNhbiB1c2UgdGhlbVxuXHRcdFx0cXVvdGU6IHF1b3RlLFxuXHRcdFx0bGl0ZXJhbDogbGl0ZXJhbCxcblx0XHRcdGpvaW46IGpvaW4sXG5cdFx0XHQvL1xuXHRcdFx0ZGVwdGg6IDEsXG5cdFx0XHRtYXhEZXB0aDogUVVuaXQuY29uZmlnLm1heERlcHRoLFxuXG5cdFx0XHQvLyBUaGlzIGlzIHRoZSBsaXN0IG9mIHBhcnNlcnMsIHRvIG1vZGlmeSB0aGVtLCB1c2UgZHVtcC5zZXRQYXJzZXJcblx0XHRcdHBhcnNlcnM6IHtcblx0XHRcdFx0d2luZG93OiBcIltXaW5kb3ddXCIsXG5cdFx0XHRcdGRvY3VtZW50OiBcIltEb2N1bWVudF1cIixcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBlcnJvciApIHtcblx0XHRcdFx0XHRyZXR1cm4gXCJFcnJvcihcXFwiXCIgKyBlcnJvci5tZXNzYWdlICsgXCJcXFwiKVwiO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR1bmtub3duOiBcIltVbmtub3duXVwiLFxuXHRcdFx0XHRcIm51bGxcIjogXCJudWxsXCIsXG5cdFx0XHRcdFwidW5kZWZpbmVkXCI6IFwidW5kZWZpbmVkXCIsXG5cdFx0XHRcdFwiZnVuY3Rpb25cIjogZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0XHRcdHZhciByZXQgPSBcImZ1bmN0aW9uXCIsXG5cblx0XHRcdFx0XHRcdC8vIGZ1bmN0aW9ucyBuZXZlciBoYXZlIG5hbWUgaW4gSUVcblx0XHRcdFx0XHRcdG5hbWUgPSBcIm5hbWVcIiBpbiBmbiA/IGZuLm5hbWUgOiAoIHJlTmFtZS5leGVjKCBmbiApIHx8IFtdIClbIDEgXTtcblxuXHRcdFx0XHRcdGlmICggbmFtZSApIHtcblx0XHRcdFx0XHRcdHJldCArPSBcIiBcIiArIG5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldCArPSBcIiggXCI7XG5cblx0XHRcdFx0XHRyZXQgPSBbIHJldCwgZHVtcC5wYXJzZSggZm4sIFwiZnVuY3Rpb25BcmdzXCIgKSwgXCIpe1wiIF0uam9pbiggXCJcIiApO1xuXHRcdFx0XHRcdHJldHVybiBqb2luKCByZXQsIGR1bXAucGFyc2UoIGZuLCBcImZ1bmN0aW9uQ29kZVwiICksIFwifVwiICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFycmF5OiBhcnJheSxcblx0XHRcdFx0bm9kZWxpc3Q6IGFycmF5LFxuXHRcdFx0XHRcImFyZ3VtZW50c1wiOiBhcnJheSxcblx0XHRcdFx0b2JqZWN0OiBmdW5jdGlvbiggbWFwLCBzdGFjayApIHtcblx0XHRcdFx0XHR2YXIga2V5cywga2V5LCB2YWwsIGksIG5vbkVudW1lcmFibGVQcm9wZXJ0aWVzLFxuXHRcdFx0XHRcdFx0cmV0ID0gW107XG5cblx0XHRcdFx0XHRpZiAoIGR1bXAubWF4RGVwdGggJiYgZHVtcC5kZXB0aCA+IGR1bXAubWF4RGVwdGggKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJbb2JqZWN0IE9iamVjdF1cIjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRkdW1wLnVwKCk7XG5cdFx0XHRcdFx0a2V5cyA9IFtdO1xuXHRcdFx0XHRcdGZvciAoIGtleSBpbiBtYXAgKSB7XG5cdFx0XHRcdFx0XHRrZXlzLnB1c2goIGtleSApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFNvbWUgcHJvcGVydGllcyBhcmUgbm90IGFsd2F5cyBlbnVtZXJhYmxlIG9uIEVycm9yIG9iamVjdHMuXG5cdFx0XHRcdFx0bm9uRW51bWVyYWJsZVByb3BlcnRpZXMgPSBbIFwibWVzc2FnZVwiLCBcIm5hbWVcIiBdO1xuXHRcdFx0XHRcdGZvciAoIGkgaW4gbm9uRW51bWVyYWJsZVByb3BlcnRpZXMgKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSBub25FbnVtZXJhYmxlUHJvcGVydGllc1sgaSBdO1xuXHRcdFx0XHRcdFx0aWYgKCBrZXkgaW4gbWFwICYmIGluQXJyYXkoIGtleSwga2V5cyApIDwgMCApIHtcblx0XHRcdFx0XHRcdFx0a2V5cy5wdXNoKCBrZXkgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0a2V5cy5zb3J0KCk7XG5cdFx0XHRcdFx0Zm9yICggaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRcdFx0a2V5ID0ga2V5c1sgaSBdO1xuXHRcdFx0XHRcdFx0dmFsID0gbWFwWyBrZXkgXTtcblx0XHRcdFx0XHRcdHJldC5wdXNoKCBkdW1wLnBhcnNlKCBrZXksIFwia2V5XCIgKSArIFwiOiBcIiArXG5cdFx0XHRcdFx0XHRcdGR1bXAucGFyc2UoIHZhbCwgdW5kZWZpbmVkLCBzdGFjayApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGR1bXAuZG93bigpO1xuXHRcdFx0XHRcdHJldHVybiBqb2luKCBcIntcIiwgcmV0LCBcIn1cIiApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRub2RlOiBmdW5jdGlvbiggbm9kZSApIHtcblx0XHRcdFx0XHR2YXIgbGVuLCBpLCB2YWwsXG5cdFx0XHRcdFx0XHRvcGVuID0gZHVtcC5IVE1MID8gXCImbHQ7XCIgOiBcIjxcIixcblx0XHRcdFx0XHRcdGNsb3NlID0gZHVtcC5IVE1MID8gXCImZ3Q7XCIgOiBcIj5cIixcblx0XHRcdFx0XHRcdHRhZyA9IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSxcblx0XHRcdFx0XHRcdHJldCA9IG9wZW4gKyB0YWcsXG5cdFx0XHRcdFx0XHRhdHRycyA9IG5vZGUuYXR0cmlidXRlcztcblxuXHRcdFx0XHRcdGlmICggYXR0cnMgKSB7XG5cdFx0XHRcdFx0XHRmb3IgKCBpID0gMCwgbGVuID0gYXR0cnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0XHRcdFx0XHRcdHZhbCA9IGF0dHJzWyBpIF0ubm9kZVZhbHVlO1xuXG5cdFx0XHRcdFx0XHRcdC8vIElFNiBpbmNsdWRlcyBhbGwgYXR0cmlidXRlcyBpbiAuYXR0cmlidXRlcywgZXZlbiBvbmVzIG5vdCBleHBsaWNpdGx5XG5cdFx0XHRcdFx0XHRcdC8vIHNldC4gVGhvc2UgaGF2ZSB2YWx1ZXMgbGlrZSB1bmRlZmluZWQsIG51bGwsIDAsIGZhbHNlLCBcIlwiIG9yXG5cdFx0XHRcdFx0XHRcdC8vIFwiaW5oZXJpdFwiLlxuXHRcdFx0XHRcdFx0XHRpZiAoIHZhbCAmJiB2YWwgIT09IFwiaW5oZXJpdFwiICkge1xuXHRcdFx0XHRcdFx0XHRcdHJldCArPSBcIiBcIiArIGF0dHJzWyBpIF0ubm9kZU5hbWUgKyBcIj1cIiArXG5cdFx0XHRcdFx0XHRcdFx0XHRkdW1wLnBhcnNlKCB2YWwsIFwiYXR0cmlidXRlXCIgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXQgKz0gY2xvc2U7XG5cblx0XHRcdFx0XHQvLyBTaG93IGNvbnRlbnQgb2YgVGV4dE5vZGUgb3IgQ0RBVEFTZWN0aW9uXG5cdFx0XHRcdFx0aWYgKCBub2RlLm5vZGVUeXBlID09PSAzIHx8IG5vZGUubm9kZVR5cGUgPT09IDQgKSB7XG5cdFx0XHRcdFx0XHRyZXQgKz0gbm9kZS5ub2RlVmFsdWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIHJldCArIG9wZW4gKyBcIi9cIiArIHRhZyArIGNsb3NlO1xuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdC8vIGZ1bmN0aW9uIGNhbGxzIGl0IGludGVybmFsbHksIGl0J3MgdGhlIGFyZ3VtZW50cyBwYXJ0IG9mIHRoZSBmdW5jdGlvblxuXHRcdFx0XHRmdW5jdGlvbkFyZ3M6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0XHR2YXIgYXJncyxcblx0XHRcdFx0XHRcdGwgPSBmbi5sZW5ndGg7XG5cblx0XHRcdFx0XHRpZiAoICFsICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YXJncyA9IG5ldyBBcnJheSggbCApO1xuXHRcdFx0XHRcdHdoaWxlICggbC0tICkge1xuXG5cdFx0XHRcdFx0XHQvLyA5NyBpcyAnYSdcblx0XHRcdFx0XHRcdGFyZ3NbIGwgXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoIDk3ICsgbCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gXCIgXCIgKyBhcmdzLmpvaW4oIFwiLCBcIiApICsgXCIgXCI7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdC8vIG9iamVjdCBjYWxscyBpdCBpbnRlcm5hbGx5LCB0aGUga2V5IHBhcnQgb2YgYW4gaXRlbSBpbiBhIG1hcFxuXHRcdFx0XHRrZXk6IHF1b3RlLFxuXHRcdFx0XHQvLyBmdW5jdGlvbiBjYWxscyBpdCBpbnRlcm5hbGx5LCBpdCdzIHRoZSBjb250ZW50IG9mIHRoZSBmdW5jdGlvblxuXHRcdFx0XHRmdW5jdGlvbkNvZGU6IFwiW2NvZGVdXCIsXG5cdFx0XHRcdC8vIG5vZGUgY2FsbHMgaXQgaW50ZXJuYWxseSwgaXQncyBhIGh0bWwgYXR0cmlidXRlIHZhbHVlXG5cdFx0XHRcdGF0dHJpYnV0ZTogcXVvdGUsXG5cdFx0XHRcdHN0cmluZzogcXVvdGUsXG5cdFx0XHRcdGRhdGU6IHF1b3RlLFxuXHRcdFx0XHRyZWdleHA6IGxpdGVyYWwsXG5cdFx0XHRcdG51bWJlcjogbGl0ZXJhbCxcblx0XHRcdFx0XCJib29sZWFuXCI6IGxpdGVyYWxcblx0XHRcdH0sXG5cdFx0XHQvLyBpZiB0cnVlLCBlbnRpdGllcyBhcmUgZXNjYXBlZCAoIDwsID4sIFxcdCwgc3BhY2UgYW5kIFxcbiApXG5cdFx0XHRIVE1MOiBmYWxzZSxcblx0XHRcdC8vIGluZGVudGF0aW9uIHVuaXRcblx0XHRcdGluZGVudENoYXI6IFwiICBcIixcblx0XHRcdC8vIGlmIHRydWUsIGl0ZW1zIGluIGEgY29sbGVjdGlvbiwgYXJlIHNlcGFyYXRlZCBieSBhIFxcbiwgZWxzZSBqdXN0IGEgc3BhY2UuXG5cdFx0XHRtdWx0aWxpbmU6IHRydWVcblx0XHR9O1xuXG5cdHJldHVybiBkdW1wO1xufSgpKTtcblxuLy8gYmFjayBjb21wYXRcblFVbml0LmpzRHVtcCA9IFFVbml0LmR1bXA7XG5cbi8vIERlcHJlY2F0ZWRcbi8vIEV4dGVuZCBhc3NlcnQgbWV0aG9kcyB0byBRVW5pdCBmb3IgQmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbihmdW5jdGlvbigpIHtcblx0dmFyIGksXG5cdFx0YXNzZXJ0aW9ucyA9IEFzc2VydC5wcm90b3R5cGU7XG5cblx0ZnVuY3Rpb24gYXBwbHlDdXJyZW50KCBjdXJyZW50ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhc3NlcnQgPSBuZXcgQXNzZXJ0KCBRVW5pdC5jb25maWcuY3VycmVudCApO1xuXHRcdFx0Y3VycmVudC5hcHBseSggYXNzZXJ0LCBhcmd1bWVudHMgKTtcblx0XHR9O1xuXHR9XG5cblx0Zm9yICggaSBpbiBhc3NlcnRpb25zICkge1xuXHRcdFFVbml0WyBpIF0gPSBhcHBseUN1cnJlbnQoIGFzc2VydGlvbnNbIGkgXSApO1xuXHR9XG59KSgpO1xuXG4vLyBGb3IgYnJvd3NlciwgZXhwb3J0IG9ubHkgc2VsZWN0IGdsb2JhbHNcbmlmICggZGVmaW5lZC5kb2N1bWVudCApIHtcblxuXHQoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGksIGwsXG5cdFx0XHRrZXlzID0gW1xuXHRcdFx0XHRcInRlc3RcIixcblx0XHRcdFx0XCJtb2R1bGVcIixcblx0XHRcdFx0XCJleHBlY3RcIixcblx0XHRcdFx0XCJhc3luY1Rlc3RcIixcblx0XHRcdFx0XCJzdGFydFwiLFxuXHRcdFx0XHRcInN0b3BcIixcblx0XHRcdFx0XCJva1wiLFxuXHRcdFx0XHRcIm5vdE9rXCIsXG5cdFx0XHRcdFwiZXF1YWxcIixcblx0XHRcdFx0XCJub3RFcXVhbFwiLFxuXHRcdFx0XHRcInByb3BFcXVhbFwiLFxuXHRcdFx0XHRcIm5vdFByb3BFcXVhbFwiLFxuXHRcdFx0XHRcImRlZXBFcXVhbFwiLFxuXHRcdFx0XHRcIm5vdERlZXBFcXVhbFwiLFxuXHRcdFx0XHRcInN0cmljdEVxdWFsXCIsXG5cdFx0XHRcdFwibm90U3RyaWN0RXF1YWxcIixcblx0XHRcdFx0XCJ0aHJvd3NcIixcblx0XHRcdFx0XCJyYWlzZXNcIlxuXHRcdFx0XTtcblxuXHRcdGZvciAoIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHR3aW5kb3dbIGtleXNbIGkgXSBdID0gUVVuaXRbIGtleXNbIGkgXSBdO1xuXHRcdH1cblx0fSkoKTtcblxuXHR3aW5kb3cuUVVuaXQgPSBRVW5pdDtcbn1cblxuLy8gRm9yIG5vZGVqc1xuaWYgKCB0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyApIHtcblx0bW9kdWxlLmV4cG9ydHMgPSBRVW5pdDtcblxuXHQvLyBGb3IgY29uc2lzdGVuY3kgd2l0aCBDb21tb25KUyBlbnZpcm9ubWVudHMnIGV4cG9ydHNcblx0bW9kdWxlLmV4cG9ydHMuUVVuaXQgPSBRVW5pdDtcbn1cblxuLy8gRm9yIENvbW1vbkpTIHdpdGggZXhwb3J0cywgYnV0IHdpdGhvdXQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgUmhpbm9cbmlmICggdHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIgJiYgZXhwb3J0cyApIHtcblx0ZXhwb3J0cy5RVW5pdCA9IFFVbml0O1xufVxuXG5pZiAoIHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kICkge1xuXHRkZWZpbmUoIGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBRVW5pdDtcblx0fSApO1xuXHRRVW5pdC5jb25maWcuYXV0b3N0YXJ0ID0gZmFsc2U7XG59XG5cbi8qXG4gKiBUaGlzIGZpbGUgaXMgYSBtb2RpZmllZCB2ZXJzaW9uIG9mIGdvb2dsZS1kaWZmLW1hdGNoLXBhdGNoJ3MgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvblxuICogKGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvc291cmNlL2Jyb3dzZS90cnVuay9qYXZhc2NyaXB0L2RpZmZfbWF0Y2hfcGF0Y2hfdW5jb21wcmVzc2VkLmpzKSxcbiAqIG1vZGlmaWNhdGlvbnMgYXJlIGxpY2Vuc2VkIGFzIG1vcmUgZnVsbHkgc2V0IGZvcnRoIGluIExJQ0VOU0UudHh0LlxuICpcbiAqIFRoZSBvcmlnaW5hbCBzb3VyY2Ugb2YgZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2ggaXMgYXR0cmlidXRhYmxlIGFuZCBsaWNlbnNlZCBhcyBmb2xsb3dzOlxuICpcbiAqIENvcHlyaWdodCAyMDA2IEdvb2dsZSBJbmMuXG4gKiBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwczovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBNb3JlIEluZm86XG4gKiAgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC9cbiAqXG4gKiBVc2FnZTogUVVuaXQuZGlmZihleHBlY3RlZCwgYWN0dWFsKVxuICpcbiAqL1xuUVVuaXQuZGlmZiA9ICggZnVuY3Rpb24oKSB7XG5cdGZ1bmN0aW9uIERpZmZNYXRjaFBhdGNoKCkge1xuXHR9XG5cblx0Ly8gIERJRkYgRlVOQ1RJT05TXG5cblx0LyoqXG5cdCAqIFRoZSBkYXRhIHN0cnVjdHVyZSByZXByZXNlbnRpbmcgYSBkaWZmIGlzIGFuIGFycmF5IG9mIHR1cGxlczpcblx0ICogW1tESUZGX0RFTEVURSwgJ0hlbGxvJ10sIFtESUZGX0lOU0VSVCwgJ0dvb2RieWUnXSwgW0RJRkZfRVFVQUwsICcgd29ybGQuJ11dXG5cdCAqIHdoaWNoIG1lYW5zOiBkZWxldGUgJ0hlbGxvJywgYWRkICdHb29kYnllJyBhbmQga2VlcCAnIHdvcmxkLidcblx0ICovXG5cdHZhciBESUZGX0RFTEVURSA9IC0xLFxuXHRcdERJRkZfSU5TRVJUID0gMSxcblx0XHRESUZGX0VRVUFMID0gMDtcblxuXHQvKipcblx0ICogRmluZCB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0d28gdGV4dHMuICBTaW1wbGlmaWVzIHRoZSBwcm9ibGVtIGJ5IHN0cmlwcGluZ1xuXHQgKiBhbnkgY29tbW9uIHByZWZpeCBvciBzdWZmaXggb2ZmIHRoZSB0ZXh0cyBiZWZvcmUgZGlmZmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbj19IG9wdENoZWNrbGluZXMgT3B0aW9uYWwgc3BlZWR1cCBmbGFnLiBJZiBwcmVzZW50IGFuZCBmYWxzZSxcblx0ICogICAgIHRoZW4gZG9uJ3QgcnVuIGEgbGluZS1sZXZlbCBkaWZmIGZpcnN0IHRvIGlkZW50aWZ5IHRoZSBjaGFuZ2VkIGFyZWFzLlxuXHQgKiAgICAgRGVmYXVsdHMgdG8gdHJ1ZSwgd2hpY2ggZG9lcyBhIGZhc3Rlciwgc2xpZ2h0bHkgbGVzcyBvcHRpbWFsIGRpZmYuXG5cdCAqIEByZXR1cm4geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5EaWZmTWFpbiA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIG9wdENoZWNrbGluZXMgKSB7XG5cdFx0dmFyIGRlYWRsaW5lLCBjaGVja2xpbmVzLCBjb21tb25sZW5ndGgsXG5cdFx0XHRjb21tb25wcmVmaXgsIGNvbW1vbnN1ZmZpeCwgZGlmZnM7XG5cblx0XHQvLyBUaGUgZGlmZiBtdXN0IGJlIGNvbXBsZXRlIGluIHVwIHRvIDEgc2Vjb25kLlxuXHRcdGRlYWRsaW5lID0gKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpICsgMTAwMDtcblxuXHRcdC8vIENoZWNrIGZvciBudWxsIGlucHV0cy5cblx0XHRpZiAoIHRleHQxID09PSBudWxsIHx8IHRleHQyID09PSBudWxsICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIk51bGwgaW5wdXQuIChEaWZmTWFpbilcIiApO1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIGZvciBlcXVhbGl0eSAoc3BlZWR1cCkuXG5cdFx0aWYgKCB0ZXh0MSA9PT0gdGV4dDIgKSB7XG5cdFx0XHRpZiAoIHRleHQxICkge1xuXHRcdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHRcdFsgRElGRl9FUVVBTCwgdGV4dDEgXVxuXHRcdFx0XHRdO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFtdO1xuXHRcdH1cblxuXHRcdGlmICggdHlwZW9mIG9wdENoZWNrbGluZXMgPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHRvcHRDaGVja2xpbmVzID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRjaGVja2xpbmVzID0gb3B0Q2hlY2tsaW5lcztcblxuXHRcdC8vIFRyaW0gb2ZmIGNvbW1vbiBwcmVmaXggKHNwZWVkdXApLlxuXHRcdGNvbW1vbmxlbmd0aCA9IHRoaXMuZGlmZkNvbW1vblByZWZpeCggdGV4dDEsIHRleHQyICk7XG5cdFx0Y29tbW9ucHJlZml4ID0gdGV4dDEuc3Vic3RyaW5nKCAwLCBjb21tb25sZW5ndGggKTtcblx0XHR0ZXh0MSA9IHRleHQxLnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cdFx0dGV4dDIgPSB0ZXh0Mi5zdWJzdHJpbmcoIGNvbW1vbmxlbmd0aCApO1xuXG5cdFx0Ly8gVHJpbSBvZmYgY29tbW9uIHN1ZmZpeCAoc3BlZWR1cCkuXG5cdFx0Y29tbW9ubGVuZ3RoID0gdGhpcy5kaWZmQ29tbW9uU3VmZml4KCB0ZXh0MSwgdGV4dDIgKTtcblx0XHRjb21tb25zdWZmaXggPSB0ZXh0MS5zdWJzdHJpbmcoIHRleHQxLmxlbmd0aCAtIGNvbW1vbmxlbmd0aCApO1xuXHRcdHRleHQxID0gdGV4dDEuc3Vic3RyaW5nKCAwLCB0ZXh0MS5sZW5ndGggLSBjb21tb25sZW5ndGggKTtcblx0XHR0ZXh0MiA9IHRleHQyLnN1YnN0cmluZyggMCwgdGV4dDIubGVuZ3RoIC0gY29tbW9ubGVuZ3RoICk7XG5cblx0XHQvLyBDb21wdXRlIHRoZSBkaWZmIG9uIHRoZSBtaWRkbGUgYmxvY2suXG5cdFx0ZGlmZnMgPSB0aGlzLmRpZmZDb21wdXRlKCB0ZXh0MSwgdGV4dDIsIGNoZWNrbGluZXMsIGRlYWRsaW5lICk7XG5cblx0XHQvLyBSZXN0b3JlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cblx0XHRpZiAoIGNvbW1vbnByZWZpeCApIHtcblx0XHRcdGRpZmZzLnVuc2hpZnQoIFsgRElGRl9FUVVBTCwgY29tbW9ucHJlZml4IF0gKTtcblx0XHR9XG5cdFx0aWYgKCBjb21tb25zdWZmaXggKSB7XG5cdFx0XHRkaWZmcy5wdXNoKCBbIERJRkZfRVFVQUwsIGNvbW1vbnN1ZmZpeCBdICk7XG5cdFx0fVxuXHRcdHRoaXMuZGlmZkNsZWFudXBNZXJnZSggZGlmZnMgKTtcblx0XHRyZXR1cm4gZGlmZnM7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlZHVjZSB0aGUgbnVtYmVyIG9mIGVkaXRzIGJ5IGVsaW1pbmF0aW5nIG9wZXJhdGlvbmFsbHkgdHJpdmlhbCBlcXVhbGl0aWVzLlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ2xlYW51cEVmZmljaWVuY3kgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIGNoYW5nZXMsIGVxdWFsaXRpZXMsIGVxdWFsaXRpZXNMZW5ndGgsIGxhc3RlcXVhbGl0eSxcblx0XHRcdHBvaW50ZXIsIHByZUlucywgcHJlRGVsLCBwb3N0SW5zLCBwb3N0RGVsO1xuXHRcdGNoYW5nZXMgPSBmYWxzZTtcblx0XHRlcXVhbGl0aWVzID0gW107IC8vIFN0YWNrIG9mIGluZGljZXMgd2hlcmUgZXF1YWxpdGllcyBhcmUgZm91bmQuXG5cdFx0ZXF1YWxpdGllc0xlbmd0aCA9IDA7IC8vIEtlZXBpbmcgb3VyIG93biBsZW5ndGggdmFyIGlzIGZhc3RlciBpbiBKUy5cblx0XHQvKiogQHR5cGUgez9zdHJpbmd9ICovXG5cdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblx0XHQvLyBBbHdheXMgZXF1YWwgdG8gZGlmZnNbZXF1YWxpdGllc1tlcXVhbGl0aWVzTGVuZ3RoIC0gMV1dWzFdXG5cdFx0cG9pbnRlciA9IDA7IC8vIEluZGV4IG9mIGN1cnJlbnQgcG9zaXRpb24uXG5cdFx0Ly8gSXMgdGhlcmUgYW4gaW5zZXJ0aW9uIG9wZXJhdGlvbiBiZWZvcmUgdGhlIGxhc3QgZXF1YWxpdHkuXG5cdFx0cHJlSW5zID0gZmFsc2U7XG5cdFx0Ly8gSXMgdGhlcmUgYSBkZWxldGlvbiBvcGVyYXRpb24gYmVmb3JlIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHByZURlbCA9IGZhbHNlO1xuXHRcdC8vIElzIHRoZXJlIGFuIGluc2VydGlvbiBvcGVyYXRpb24gYWZ0ZXIgdGhlIGxhc3QgZXF1YWxpdHkuXG5cdFx0cG9zdElucyA9IGZhbHNlO1xuXHRcdC8vIElzIHRoZXJlIGEgZGVsZXRpb24gb3BlcmF0aW9uIGFmdGVyIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHBvc3REZWwgPSBmYWxzZTtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cblx0XHRcdC8vIEVxdWFsaXR5IGZvdW5kLlxuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfRVFVQUwgKSB7XG5cdFx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMSBdLmxlbmd0aCA8IDQgJiYgKCBwb3N0SW5zIHx8IHBvc3REZWwgKSApIHtcblxuXHRcdFx0XHRcdC8vIENhbmRpZGF0ZSBmb3VuZC5cblx0XHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoKysgXSA9IHBvaW50ZXI7XG5cdFx0XHRcdFx0cHJlSW5zID0gcG9zdElucztcblx0XHRcdFx0XHRwcmVEZWwgPSBwb3N0RGVsO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRcdC8vIE5vdCBhIGNhbmRpZGF0ZSwgYW5kIGNhbiBuZXZlciBiZWNvbWUgb25lLlxuXHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGggPSAwO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdFx0cG9zdElucyA9IHBvc3REZWwgPSBmYWxzZTtcblxuXHRcdFx0Ly8gQW4gaW5zZXJ0aW9uIG9yIGRlbGV0aW9uLlxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9ERUxFVEUgKSB7XG5cdFx0XHRcdFx0cG9zdERlbCA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cG9zdElucyA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvKlxuXHRcdFx0XHQgKiBGaXZlIHR5cGVzIHRvIGJlIHNwbGl0OlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz48ZGVsPkI8L2RlbD5YWTxpbnM+QzwvaW5zPjxkZWw+RDwvZGVsPlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz5YPGlucz5DPC9pbnM+PGRlbD5EPC9kZWw+XG5cdFx0XHRcdCAqIDxpbnM+QTwvaW5zPjxkZWw+QjwvZGVsPlg8aW5zPkM8L2lucz5cblx0XHRcdFx0ICogPGlucz5BPC9kZWw+WDxpbnM+QzwvaW5zPjxkZWw+RDwvZGVsPlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz48ZGVsPkI8L2RlbD5YPGRlbD5DPC9kZWw+XG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRpZiAoIGxhc3RlcXVhbGl0eSAmJiAoICggcHJlSW5zICYmIHByZURlbCAmJiBwb3N0SW5zICYmIHBvc3REZWwgKSB8fFxuXHRcdFx0XHRcdFx0KCAoIGxhc3RlcXVhbGl0eS5sZW5ndGggPCAyICkgJiZcblx0XHRcdFx0XHRcdCggcHJlSW5zICsgcHJlRGVsICsgcG9zdElucyArIHBvc3REZWwgKSA9PT0gMyApICkgKSB7XG5cblx0XHRcdFx0XHQvLyBEdXBsaWNhdGUgcmVjb3JkLlxuXHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0sXG5cdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0WyBESUZGX0RFTEVURSwgbGFzdGVxdWFsaXR5IF1cblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0Ly8gQ2hhbmdlIHNlY29uZCBjb3B5IHRvIGluc2VydC5cblx0XHRcdFx0XHRkaWZmc1sgZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSArIDEgXVsgMCBdID0gRElGRl9JTlNFUlQ7XG5cdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tOyAvLyBUaHJvdyBhd2F5IHRoZSBlcXVhbGl0eSB3ZSBqdXN0IGRlbGV0ZWQ7XG5cdFx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblx0XHRcdFx0XHRpZiAoIHByZUlucyAmJiBwcmVEZWwgKSB7XG5cdFx0XHRcdFx0XHQvLyBObyBjaGFuZ2VzIG1hZGUgd2hpY2ggY291bGQgYWZmZWN0IHByZXZpb3VzIGVudHJ5LCBrZWVwIGdvaW5nLlxuXHRcdFx0XHRcdFx0cG9zdElucyA9IHBvc3REZWwgPSB0cnVlO1xuXHRcdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aCA9IDA7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGgtLTsgLy8gVGhyb3cgYXdheSB0aGUgcHJldmlvdXMgZXF1YWxpdHkuXG5cdFx0XHRcdFx0XHRwb2ludGVyID0gZXF1YWxpdGllc0xlbmd0aCA+IDAgPyBlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdIDogLTE7XG5cdFx0XHRcdFx0XHRwb3N0SW5zID0gcG9zdERlbCA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjaGFuZ2VzID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblxuXHRcdGlmICggY2hhbmdlcyApIHtcblx0XHRcdHRoaXMuZGlmZkNsZWFudXBNZXJnZSggZGlmZnMgKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIENvbnZlcnQgYSBkaWZmIGFycmF5IGludG8gYSBwcmV0dHkgSFRNTCByZXBvcnQuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcGFyYW0ge2ludGVnZXJ9IHN0cmluZyB0byBiZSBiZWF1dGlmaWVkLlxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IEhUTUwgcmVwcmVzZW50YXRpb24uXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZlByZXR0eUh0bWwgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIG9wLCBkYXRhLCB4LFxuXHRcdFx0aHRtbCA9IFtdO1xuXHRcdGZvciAoIHggPSAwOyB4IDwgZGlmZnMubGVuZ3RoOyB4KysgKSB7XG5cdFx0XHRvcCA9IGRpZmZzWyB4IF1bIDAgXTsgLy8gT3BlcmF0aW9uIChpbnNlcnQsIGRlbGV0ZSwgZXF1YWwpXG5cdFx0XHRkYXRhID0gZGlmZnNbIHggXVsgMSBdOyAvLyBUZXh0IG9mIGNoYW5nZS5cblx0XHRcdHN3aXRjaCAoIG9wICkge1xuXHRcdFx0Y2FzZSBESUZGX0lOU0VSVDpcblx0XHRcdFx0aHRtbFsgeCBdID0gXCI8aW5zPlwiICsgZGF0YSArIFwiPC9pbnM+XCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0RFTEVURTpcblx0XHRcdFx0aHRtbFsgeCBdID0gXCI8ZGVsPlwiICsgZGF0YSArIFwiPC9kZWw+XCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0VRVUFMOlxuXHRcdFx0XHRodG1sWyB4IF0gPSBcIjxzcGFuPlwiICsgZGF0YSArIFwiPC9zcGFuPlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGh0bWwuam9pbiggXCJcIiApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgdGhlIGNvbW1vbiBwcmVmaXggb2YgdHdvIHN0cmluZ3MuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBjb21tb24gdG8gdGhlIHN0YXJ0IG9mIGVhY2hcblx0ICogICAgIHN0cmluZy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ29tbW9uUHJlZml4ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgcG9pbnRlcm1pZCwgcG9pbnRlcm1heCwgcG9pbnRlcm1pbiwgcG9pbnRlcnN0YXJ0O1xuXHRcdC8vIFF1aWNrIGNoZWNrIGZvciBjb21tb24gbnVsbCBjYXNlcy5cblx0XHRpZiAoICF0ZXh0MSB8fCAhdGV4dDIgfHwgdGV4dDEuY2hhckF0KCAwICkgIT09IHRleHQyLmNoYXJBdCggMCApICkge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdC8vIEJpbmFyeSBzZWFyY2guXG5cdFx0Ly8gUGVyZm9ybWFuY2UgYW5hbHlzaXM6IGh0dHBzOi8vbmVpbC5mcmFzZXIubmFtZS9uZXdzLzIwMDcvMTAvMDkvXG5cdFx0cG9pbnRlcm1pbiA9IDA7XG5cdFx0cG9pbnRlcm1heCA9IE1hdGgubWluKCB0ZXh0MS5sZW5ndGgsIHRleHQyLmxlbmd0aCApO1xuXHRcdHBvaW50ZXJtaWQgPSBwb2ludGVybWF4O1xuXHRcdHBvaW50ZXJzdGFydCA9IDA7XG5cdFx0d2hpbGUgKCBwb2ludGVybWluIDwgcG9pbnRlcm1pZCApIHtcblx0XHRcdGlmICggdGV4dDEuc3Vic3RyaW5nKCBwb2ludGVyc3RhcnQsIHBvaW50ZXJtaWQgKSA9PT1cblx0XHRcdFx0XHR0ZXh0Mi5zdWJzdHJpbmcoIHBvaW50ZXJzdGFydCwgcG9pbnRlcm1pZCApICkge1xuXHRcdFx0XHRwb2ludGVybWluID0gcG9pbnRlcm1pZDtcblx0XHRcdFx0cG9pbnRlcnN0YXJ0ID0gcG9pbnRlcm1pbjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBvaW50ZXJtYXggPSBwb2ludGVybWlkO1xuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcm1pZCA9IE1hdGguZmxvb3IoICggcG9pbnRlcm1heCAtIHBvaW50ZXJtaW4gKSAvIDIgKyBwb2ludGVybWluICk7XG5cdFx0fVxuXHRcdHJldHVybiBwb2ludGVybWlkO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgdGhlIGNvbW1vbiBzdWZmaXggb2YgdHdvIHN0cmluZ3MuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBjb21tb24gdG8gdGhlIGVuZCBvZiBlYWNoIHN0cmluZy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ29tbW9uU3VmZml4ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgcG9pbnRlcm1pZCwgcG9pbnRlcm1heCwgcG9pbnRlcm1pbiwgcG9pbnRlcmVuZDtcblx0XHQvLyBRdWljayBjaGVjayBmb3IgY29tbW9uIG51bGwgY2FzZXMuXG5cdFx0aWYgKCAhdGV4dDEgfHxcblx0XHRcdFx0IXRleHQyIHx8XG5cdFx0XHRcdHRleHQxLmNoYXJBdCggdGV4dDEubGVuZ3RoIC0gMSApICE9PSB0ZXh0Mi5jaGFyQXQoIHRleHQyLmxlbmd0aCAtIDEgKSApIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHQvLyBCaW5hcnkgc2VhcmNoLlxuXHRcdC8vIFBlcmZvcm1hbmNlIGFuYWx5c2lzOiBodHRwczovL25laWwuZnJhc2VyLm5hbWUvbmV3cy8yMDA3LzEwLzA5L1xuXHRcdHBvaW50ZXJtaW4gPSAwO1xuXHRcdHBvaW50ZXJtYXggPSBNYXRoLm1pbiggdGV4dDEubGVuZ3RoLCB0ZXh0Mi5sZW5ndGggKTtcblx0XHRwb2ludGVybWlkID0gcG9pbnRlcm1heDtcblx0XHRwb2ludGVyZW5kID0gMDtcblx0XHR3aGlsZSAoIHBvaW50ZXJtaW4gPCBwb2ludGVybWlkICkge1xuXHRcdFx0aWYgKCB0ZXh0MS5zdWJzdHJpbmcoIHRleHQxLmxlbmd0aCAtIHBvaW50ZXJtaWQsIHRleHQxLmxlbmd0aCAtIHBvaW50ZXJlbmQgKSA9PT1cblx0XHRcdFx0XHR0ZXh0Mi5zdWJzdHJpbmcoIHRleHQyLmxlbmd0aCAtIHBvaW50ZXJtaWQsIHRleHQyLmxlbmd0aCAtIHBvaW50ZXJlbmQgKSApIHtcblx0XHRcdFx0cG9pbnRlcm1pbiA9IHBvaW50ZXJtaWQ7XG5cdFx0XHRcdHBvaW50ZXJlbmQgPSBwb2ludGVybWluO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cG9pbnRlcm1heCA9IHBvaW50ZXJtaWQ7XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVybWlkID0gTWF0aC5mbG9vciggKCBwb2ludGVybWF4IC0gcG9pbnRlcm1pbiApIC8gMiArIHBvaW50ZXJtaW4gKTtcblx0XHR9XG5cdFx0cmV0dXJuIHBvaW50ZXJtaWQ7XG5cdH07XG5cblx0LyoqXG5cdCAqIEZpbmQgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gdHdvIHRleHRzLiAgQXNzdW1lcyB0aGF0IHRoZSB0ZXh0cyBkbyBub3Rcblx0ICogaGF2ZSBhbnkgY29tbW9uIHByZWZpeCBvciBzdWZmaXguXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IGNoZWNrbGluZXMgU3BlZWR1cCBmbGFnLiAgSWYgZmFsc2UsIHRoZW4gZG9uJ3QgcnVuIGFcblx0ICogICAgIGxpbmUtbGV2ZWwgZGlmZiBmaXJzdCB0byBpZGVudGlmeSB0aGUgY2hhbmdlZCBhcmVhcy5cblx0ICogICAgIElmIHRydWUsIHRoZW4gcnVuIGEgZmFzdGVyLCBzbGlnaHRseSBsZXNzIG9wdGltYWwgZGlmZi5cblx0ICogQHBhcmFtIHtudW1iZXJ9IGRlYWRsaW5lIFRpbWUgd2hlbiB0aGUgZGlmZiBzaG91bGQgYmUgY29tcGxldGUgYnkuXG5cdCAqIEByZXR1cm4geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ29tcHV0ZSA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIGNoZWNrbGluZXMsIGRlYWRsaW5lICkge1xuXHRcdHZhciBkaWZmcywgbG9uZ3RleHQsIHNob3J0dGV4dCwgaSwgaG0sXG5cdFx0XHR0ZXh0MUEsIHRleHQyQSwgdGV4dDFCLCB0ZXh0MkIsXG5cdFx0XHRtaWRDb21tb24sIGRpZmZzQSwgZGlmZnNCO1xuXG5cdFx0aWYgKCAhdGV4dDEgKSB7XG5cdFx0XHQvLyBKdXN0IGFkZCBzb21lIHRleHQgKHNwZWVkdXApLlxuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgdGV4dDIgXVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZiAoICF0ZXh0MiApIHtcblx0XHRcdC8vIEp1c3QgZGVsZXRlIHNvbWUgdGV4dCAoc3BlZWR1cCkuXG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0MSBdXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdGxvbmd0ZXh0ID0gdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoID8gdGV4dDEgOiB0ZXh0Mjtcblx0XHRzaG9ydHRleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MiA6IHRleHQxO1xuXHRcdGkgPSBsb25ndGV4dC5pbmRleE9mKCBzaG9ydHRleHQgKTtcblx0XHRpZiAoIGkgIT09IC0xICkge1xuXHRcdFx0Ly8gU2hvcnRlciB0ZXh0IGlzIGluc2lkZSB0aGUgbG9uZ2VyIHRleHQgKHNwZWVkdXApLlxuXHRcdFx0ZGlmZnMgPSBbXG5cdFx0XHRcdFsgRElGRl9JTlNFUlQsIGxvbmd0ZXh0LnN1YnN0cmluZyggMCwgaSApIF0sXG5cdFx0XHRcdFsgRElGRl9FUVVBTCwgc2hvcnR0ZXh0IF0sXG5cdFx0XHRcdFsgRElGRl9JTlNFUlQsIGxvbmd0ZXh0LnN1YnN0cmluZyggaSArIHNob3J0dGV4dC5sZW5ndGggKSBdXG5cdFx0XHRdO1xuXHRcdFx0Ly8gU3dhcCBpbnNlcnRpb25zIGZvciBkZWxldGlvbnMgaWYgZGlmZiBpcyByZXZlcnNlZC5cblx0XHRcdGlmICggdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoICkge1xuXHRcdFx0XHRkaWZmc1sgMCBdWyAwIF0gPSBkaWZmc1sgMiBdWyAwIF0gPSBESUZGX0RFTEVURTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkaWZmcztcblx0XHR9XG5cblx0XHRpZiAoIHNob3J0dGV4dC5sZW5ndGggPT09IDEgKSB7XG5cdFx0XHQvLyBTaW5nbGUgY2hhcmFjdGVyIHN0cmluZy5cblx0XHRcdC8vIEFmdGVyIHRoZSBwcmV2aW91cyBzcGVlZHVwLCB0aGUgY2hhcmFjdGVyIGNhbid0IGJlIGFuIGVxdWFsaXR5LlxuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0WyBESUZGX0RFTEVURSwgdGV4dDEgXSxcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgdGV4dDIgXVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHQvLyBDaGVjayB0byBzZWUgaWYgdGhlIHByb2JsZW0gY2FuIGJlIHNwbGl0IGluIHR3by5cblx0XHRobSA9IHRoaXMuZGlmZkhhbGZNYXRjaCggdGV4dDEsIHRleHQyICk7XG5cdFx0aWYgKCBobSApIHtcblx0XHRcdC8vIEEgaGFsZi1tYXRjaCB3YXMgZm91bmQsIHNvcnQgb3V0IHRoZSByZXR1cm4gZGF0YS5cblx0XHRcdHRleHQxQSA9IGhtWyAwIF07XG5cdFx0XHR0ZXh0MUIgPSBobVsgMSBdO1xuXHRcdFx0dGV4dDJBID0gaG1bIDIgXTtcblx0XHRcdHRleHQyQiA9IGhtWyAzIF07XG5cdFx0XHRtaWRDb21tb24gPSBobVsgNCBdO1xuXHRcdFx0Ly8gU2VuZCBib3RoIHBhaXJzIG9mZiBmb3Igc2VwYXJhdGUgcHJvY2Vzc2luZy5cblx0XHRcdGRpZmZzQSA9IHRoaXMuRGlmZk1haW4oIHRleHQxQSwgdGV4dDJBLCBjaGVja2xpbmVzLCBkZWFkbGluZSApO1xuXHRcdFx0ZGlmZnNCID0gdGhpcy5EaWZmTWFpbiggdGV4dDFCLCB0ZXh0MkIsIGNoZWNrbGluZXMsIGRlYWRsaW5lICk7XG5cdFx0XHQvLyBNZXJnZSB0aGUgcmVzdWx0cy5cblx0XHRcdHJldHVybiBkaWZmc0EuY29uY2F0KCBbXG5cdFx0XHRcdFsgRElGRl9FUVVBTCwgbWlkQ29tbW9uIF1cblx0XHRcdF0sIGRpZmZzQiApO1xuXHRcdH1cblxuXHRcdGlmICggY2hlY2tsaW5lcyAmJiB0ZXh0MS5sZW5ndGggPiAxMDAgJiYgdGV4dDIubGVuZ3RoID4gMTAwICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZGlmZkxpbmVNb2RlKCB0ZXh0MSwgdGV4dDIsIGRlYWRsaW5lICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuZGlmZkJpc2VjdCggdGV4dDEsIHRleHQyLCBkZWFkbGluZSApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEbyB0aGUgdHdvIHRleHRzIHNoYXJlIGEgc3Vic3RyaW5nIHdoaWNoIGlzIGF0IGxlYXN0IGhhbGYgdGhlIGxlbmd0aCBvZiB0aGVcblx0ICogbG9uZ2VyIHRleHQ/XG5cdCAqIFRoaXMgc3BlZWR1cCBjYW4gcHJvZHVjZSBub24tbWluaW1hbCBkaWZmcy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSBGaXZlIGVsZW1lbnQgQXJyYXksIGNvbnRhaW5pbmcgdGhlIHByZWZpeCBvZlxuXHQgKiAgICAgdGV4dDEsIHRoZSBzdWZmaXggb2YgdGV4dDEsIHRoZSBwcmVmaXggb2YgdGV4dDIsIHRoZSBzdWZmaXggb2Zcblx0ICogICAgIHRleHQyIGFuZCB0aGUgY29tbW9uIG1pZGRsZS4gIE9yIG51bGwgaWYgdGhlcmUgd2FzIG5vIG1hdGNoLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZIYWxmTWF0Y2ggPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciBsb25ndGV4dCwgc2hvcnR0ZXh0LCBkbXAsXG5cdFx0XHR0ZXh0MUEsIHRleHQyQiwgdGV4dDJBLCB0ZXh0MUIsIG1pZENvbW1vbixcblx0XHRcdGhtMSwgaG0yLCBobTtcblxuXHRcdGxvbmd0ZXh0ID0gdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoID8gdGV4dDEgOiB0ZXh0Mjtcblx0XHRzaG9ydHRleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MiA6IHRleHQxO1xuXHRcdGlmICggbG9uZ3RleHQubGVuZ3RoIDwgNCB8fCBzaG9ydHRleHQubGVuZ3RoICogMiA8IGxvbmd0ZXh0Lmxlbmd0aCApIHtcblx0XHRcdHJldHVybiBudWxsOyAvLyBQb2ludGxlc3MuXG5cdFx0fVxuXHRcdGRtcCA9IHRoaXM7IC8vICd0aGlzJyBiZWNvbWVzICd3aW5kb3cnIGluIGEgY2xvc3VyZS5cblxuXHRcdC8qKlxuXHRcdCAqIERvZXMgYSBzdWJzdHJpbmcgb2Ygc2hvcnR0ZXh0IGV4aXN0IHdpdGhpbiBsb25ndGV4dCBzdWNoIHRoYXQgdGhlIHN1YnN0cmluZ1xuXHRcdCAqIGlzIGF0IGxlYXN0IGhhbGYgdGhlIGxlbmd0aCBvZiBsb25ndGV4dD9cblx0XHQgKiBDbG9zdXJlLCBidXQgZG9lcyBub3QgcmVmZXJlbmNlIGFueSBleHRlcm5hbCB2YXJpYWJsZXMuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGxvbmd0ZXh0IExvbmdlciBzdHJpbmcuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHNob3J0dGV4dCBTaG9ydGVyIHN0cmluZy5cblx0XHQgKiBAcGFyYW0ge251bWJlcn0gaSBTdGFydCBpbmRleCBvZiBxdWFydGVyIGxlbmd0aCBzdWJzdHJpbmcgd2l0aGluIGxvbmd0ZXh0LlxuXHRcdCAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSBGaXZlIGVsZW1lbnQgQXJyYXksIGNvbnRhaW5pbmcgdGhlIHByZWZpeCBvZlxuXHRcdCAqICAgICBsb25ndGV4dCwgdGhlIHN1ZmZpeCBvZiBsb25ndGV4dCwgdGhlIHByZWZpeCBvZiBzaG9ydHRleHQsIHRoZSBzdWZmaXhcblx0XHQgKiAgICAgb2Ygc2hvcnR0ZXh0IGFuZCB0aGUgY29tbW9uIG1pZGRsZS4gIE9yIG51bGwgaWYgdGhlcmUgd2FzIG5vIG1hdGNoLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGlmZkhhbGZNYXRjaEkoIGxvbmd0ZXh0LCBzaG9ydHRleHQsIGkgKSB7XG5cdFx0XHR2YXIgc2VlZCwgaiwgYmVzdENvbW1vbiwgcHJlZml4TGVuZ3RoLCBzdWZmaXhMZW5ndGgsXG5cdFx0XHRcdGJlc3RMb25ndGV4dEEsIGJlc3RMb25ndGV4dEIsIGJlc3RTaG9ydHRleHRBLCBiZXN0U2hvcnR0ZXh0Qjtcblx0XHRcdC8vIFN0YXJ0IHdpdGggYSAxLzQgbGVuZ3RoIHN1YnN0cmluZyBhdCBwb3NpdGlvbiBpIGFzIGEgc2VlZC5cblx0XHRcdHNlZWQgPSBsb25ndGV4dC5zdWJzdHJpbmcoIGksIGkgKyBNYXRoLmZsb29yKCBsb25ndGV4dC5sZW5ndGggLyA0ICkgKTtcblx0XHRcdGogPSAtMTtcblx0XHRcdGJlc3RDb21tb24gPSBcIlwiO1xuXHRcdFx0d2hpbGUgKCAoIGogPSBzaG9ydHRleHQuaW5kZXhPZiggc2VlZCwgaiArIDEgKSApICE9PSAtMSApIHtcblx0XHRcdFx0cHJlZml4TGVuZ3RoID0gZG1wLmRpZmZDb21tb25QcmVmaXgoIGxvbmd0ZXh0LnN1YnN0cmluZyggaSApLFxuXHRcdFx0XHRcdHNob3J0dGV4dC5zdWJzdHJpbmcoIGogKSApO1xuXHRcdFx0XHRzdWZmaXhMZW5ndGggPSBkbXAuZGlmZkNvbW1vblN1ZmZpeCggbG9uZ3RleHQuc3Vic3RyaW5nKCAwLCBpICksXG5cdFx0XHRcdFx0c2hvcnR0ZXh0LnN1YnN0cmluZyggMCwgaiApICk7XG5cdFx0XHRcdGlmICggYmVzdENvbW1vbi5sZW5ndGggPCBzdWZmaXhMZW5ndGggKyBwcmVmaXhMZW5ndGggKSB7XG5cdFx0XHRcdFx0YmVzdENvbW1vbiA9IHNob3J0dGV4dC5zdWJzdHJpbmcoIGogLSBzdWZmaXhMZW5ndGgsIGogKSArXG5cdFx0XHRcdFx0XHRzaG9ydHRleHQuc3Vic3RyaW5nKCBqLCBqICsgcHJlZml4TGVuZ3RoICk7XG5cdFx0XHRcdFx0YmVzdExvbmd0ZXh0QSA9IGxvbmd0ZXh0LnN1YnN0cmluZyggMCwgaSAtIHN1ZmZpeExlbmd0aCApO1xuXHRcdFx0XHRcdGJlc3RMb25ndGV4dEIgPSBsb25ndGV4dC5zdWJzdHJpbmcoIGkgKyBwcmVmaXhMZW5ndGggKTtcblx0XHRcdFx0XHRiZXN0U2hvcnR0ZXh0QSA9IHNob3J0dGV4dC5zdWJzdHJpbmcoIDAsIGogLSBzdWZmaXhMZW5ndGggKTtcblx0XHRcdFx0XHRiZXN0U2hvcnR0ZXh0QiA9IHNob3J0dGV4dC5zdWJzdHJpbmcoIGogKyBwcmVmaXhMZW5ndGggKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCBiZXN0Q29tbW9uLmxlbmd0aCAqIDIgPj0gbG9uZ3RleHQubGVuZ3RoICkge1xuXHRcdFx0XHRyZXR1cm4gWyBiZXN0TG9uZ3RleHRBLCBiZXN0TG9uZ3RleHRCLFxuXHRcdFx0XHRcdGJlc3RTaG9ydHRleHRBLCBiZXN0U2hvcnR0ZXh0QiwgYmVzdENvbW1vblxuXHRcdFx0XHRdO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gRmlyc3QgY2hlY2sgaWYgdGhlIHNlY29uZCBxdWFydGVyIGlzIHRoZSBzZWVkIGZvciBhIGhhbGYtbWF0Y2guXG5cdFx0aG0xID0gZGlmZkhhbGZNYXRjaEkoIGxvbmd0ZXh0LCBzaG9ydHRleHQsXG5cdFx0XHRNYXRoLmNlaWwoIGxvbmd0ZXh0Lmxlbmd0aCAvIDQgKSApO1xuXHRcdC8vIENoZWNrIGFnYWluIGJhc2VkIG9uIHRoZSB0aGlyZCBxdWFydGVyLlxuXHRcdGhtMiA9IGRpZmZIYWxmTWF0Y2hJKCBsb25ndGV4dCwgc2hvcnR0ZXh0LFxuXHRcdFx0TWF0aC5jZWlsKCBsb25ndGV4dC5sZW5ndGggLyAyICkgKTtcblx0XHRpZiAoICFobTEgJiYgIWhtMiApIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH0gZWxzZSBpZiAoICFobTIgKSB7XG5cdFx0XHRobSA9IGhtMTtcblx0XHR9IGVsc2UgaWYgKCAhaG0xICkge1xuXHRcdFx0aG0gPSBobTI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEJvdGggbWF0Y2hlZC4gIFNlbGVjdCB0aGUgbG9uZ2VzdC5cblx0XHRcdGhtID0gaG0xWyA0IF0ubGVuZ3RoID4gaG0yWyA0IF0ubGVuZ3RoID8gaG0xIDogaG0yO1xuXHRcdH1cblxuXHRcdC8vIEEgaGFsZi1tYXRjaCB3YXMgZm91bmQsIHNvcnQgb3V0IHRoZSByZXR1cm4gZGF0YS5cblx0XHR0ZXh0MUEsIHRleHQxQiwgdGV4dDJBLCB0ZXh0MkI7XG5cdFx0aWYgKCB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggKSB7XG5cdFx0XHR0ZXh0MUEgPSBobVsgMCBdO1xuXHRcdFx0dGV4dDFCID0gaG1bIDEgXTtcblx0XHRcdHRleHQyQSA9IGhtWyAyIF07XG5cdFx0XHR0ZXh0MkIgPSBobVsgMyBdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0ZXh0MkEgPSBobVsgMCBdO1xuXHRcdFx0dGV4dDJCID0gaG1bIDEgXTtcblx0XHRcdHRleHQxQSA9IGhtWyAyIF07XG5cdFx0XHR0ZXh0MUIgPSBobVsgMyBdO1xuXHRcdH1cblx0XHRtaWRDb21tb24gPSBobVsgNCBdO1xuXHRcdHJldHVybiBbIHRleHQxQSwgdGV4dDFCLCB0ZXh0MkEsIHRleHQyQiwgbWlkQ29tbW9uIF07XG5cdH07XG5cblx0LyoqXG5cdCAqIERvIGEgcXVpY2sgbGluZS1sZXZlbCBkaWZmIG9uIGJvdGggc3RyaW5ncywgdGhlbiByZWRpZmYgdGhlIHBhcnRzIGZvclxuXHQgKiBncmVhdGVyIGFjY3VyYWN5LlxuXHQgKiBUaGlzIHNwZWVkdXAgY2FuIHByb2R1Y2Ugbm9uLW1pbmltYWwgZGlmZnMuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVhZGxpbmUgVGltZSB3aGVuIHRoZSBkaWZmIHNob3VsZCBiZSBjb21wbGV0ZSBieS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZMaW5lTW9kZSA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIGRlYWRsaW5lICkge1xuXHRcdHZhciBhLCBkaWZmcywgbGluZWFycmF5LCBwb2ludGVyLCBjb3VudEluc2VydCxcblx0XHRcdGNvdW50RGVsZXRlLCB0ZXh0SW5zZXJ0LCB0ZXh0RGVsZXRlLCBqO1xuXHRcdC8vIFNjYW4gdGhlIHRleHQgb24gYSBsaW5lLWJ5LWxpbmUgYmFzaXMgZmlyc3QuXG5cdFx0YSA9IHRoaXMuZGlmZkxpbmVzVG9DaGFycyggdGV4dDEsIHRleHQyICk7XG5cdFx0dGV4dDEgPSBhLmNoYXJzMTtcblx0XHR0ZXh0MiA9IGEuY2hhcnMyO1xuXHRcdGxpbmVhcnJheSA9IGEubGluZUFycmF5O1xuXG5cdFx0ZGlmZnMgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MSwgdGV4dDIsIGZhbHNlLCBkZWFkbGluZSApO1xuXG5cdFx0Ly8gQ29udmVydCB0aGUgZGlmZiBiYWNrIHRvIG9yaWdpbmFsIHRleHQuXG5cdFx0dGhpcy5kaWZmQ2hhcnNUb0xpbmVzKCBkaWZmcywgbGluZWFycmF5ICk7XG5cdFx0Ly8gRWxpbWluYXRlIGZyZWFrIG1hdGNoZXMgKGUuZy4gYmxhbmsgbGluZXMpXG5cdFx0dGhpcy5kaWZmQ2xlYW51cFNlbWFudGljKCBkaWZmcyApO1xuXG5cdFx0Ly8gUmVkaWZmIGFueSByZXBsYWNlbWVudCBibG9ja3MsIHRoaXMgdGltZSBjaGFyYWN0ZXItYnktY2hhcmFjdGVyLlxuXHRcdC8vIEFkZCBhIGR1bW15IGVudHJ5IGF0IHRoZSBlbmQuXG5cdFx0ZGlmZnMucHVzaCggWyBESUZGX0VRVUFMLCBcIlwiIF0gKTtcblx0XHRwb2ludGVyID0gMDtcblx0XHRjb3VudERlbGV0ZSA9IDA7XG5cdFx0Y291bnRJbnNlcnQgPSAwO1xuXHRcdHRleHREZWxldGUgPSBcIlwiO1xuXHRcdHRleHRJbnNlcnQgPSBcIlwiO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblx0XHRcdHN3aXRjaCAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSApIHtcblx0XHRcdGNhc2UgRElGRl9JTlNFUlQ6XG5cdFx0XHRcdGNvdW50SW5zZXJ0Kys7XG5cdFx0XHRcdHRleHRJbnNlcnQgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9ERUxFVEU6XG5cdFx0XHRcdGNvdW50RGVsZXRlKys7XG5cdFx0XHRcdHRleHREZWxldGUgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9FUVVBTDpcblx0XHRcdFx0Ly8gVXBvbiByZWFjaGluZyBhbiBlcXVhbGl0eSwgY2hlY2sgZm9yIHByaW9yIHJlZHVuZGFuY2llcy5cblx0XHRcdFx0aWYgKCBjb3VudERlbGV0ZSA+PSAxICYmIGNvdW50SW5zZXJ0ID49IDEgKSB7XG5cdFx0XHRcdFx0Ly8gRGVsZXRlIHRoZSBvZmZlbmRpbmcgcmVjb3JkcyBhbmQgYWRkIHRoZSBtZXJnZWQgb25lcy5cblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0LFxuXHRcdFx0XHRcdFx0Y291bnREZWxldGUgKyBjb3VudEluc2VydCApO1xuXHRcdFx0XHRcdHBvaW50ZXIgPSBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydDtcblx0XHRcdFx0XHRhID0gdGhpcy5EaWZmTWFpbiggdGV4dERlbGV0ZSwgdGV4dEluc2VydCwgZmFsc2UsIGRlYWRsaW5lICk7XG5cdFx0XHRcdFx0Zm9yICggaiA9IGEubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0gKSB7XG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIsIDAsIGFbIGogXSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwb2ludGVyID0gcG9pbnRlciArIGEubGVuZ3RoO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50SW5zZXJ0ID0gMDtcblx0XHRcdFx0Y291bnREZWxldGUgPSAwO1xuXHRcdFx0XHR0ZXh0RGVsZXRlID0gXCJcIjtcblx0XHRcdFx0dGV4dEluc2VydCA9IFwiXCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblx0XHRkaWZmcy5wb3AoKTsgLy8gUmVtb3ZlIHRoZSBkdW1teSBlbnRyeSBhdCB0aGUgZW5kLlxuXG5cdFx0cmV0dXJuIGRpZmZzO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBGaW5kIHRoZSAnbWlkZGxlIHNuYWtlJyBvZiBhIGRpZmYsIHNwbGl0IHRoZSBwcm9ibGVtIGluIHR3b1xuXHQgKiBhbmQgcmV0dXJuIHRoZSByZWN1cnNpdmVseSBjb25zdHJ1Y3RlZCBkaWZmLlxuXHQgKiBTZWUgTXllcnMgMTk4NiBwYXBlcjogQW4gTyhORCkgRGlmZmVyZW5jZSBBbGdvcml0aG0gYW5kIEl0cyBWYXJpYXRpb25zLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgT2xkIHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBOZXcgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtudW1iZXJ9IGRlYWRsaW5lIFRpbWUgYXQgd2hpY2ggdG8gYmFpbCBpZiBub3QgeWV0IGNvbXBsZXRlLlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkJpc2VjdCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIGRlYWRsaW5lICkge1xuXHRcdHZhciB0ZXh0MUxlbmd0aCwgdGV4dDJMZW5ndGgsIG1heEQsIHZPZmZzZXQsIHZMZW5ndGgsXG5cdFx0XHR2MSwgdjIsIHgsIGRlbHRhLCBmcm9udCwgazFzdGFydCwgazFlbmQsIGsyc3RhcnQsXG5cdFx0XHRrMmVuZCwgazJPZmZzZXQsIGsxT2Zmc2V0LCB4MSwgeDIsIHkxLCB5MiwgZCwgazEsIGsyO1xuXHRcdC8vIENhY2hlIHRoZSB0ZXh0IGxlbmd0aHMgdG8gcHJldmVudCBtdWx0aXBsZSBjYWxscy5cblx0XHR0ZXh0MUxlbmd0aCA9IHRleHQxLmxlbmd0aDtcblx0XHR0ZXh0Mkxlbmd0aCA9IHRleHQyLmxlbmd0aDtcblx0XHRtYXhEID0gTWF0aC5jZWlsKCAoIHRleHQxTGVuZ3RoICsgdGV4dDJMZW5ndGggKSAvIDIgKTtcblx0XHR2T2Zmc2V0ID0gbWF4RDtcblx0XHR2TGVuZ3RoID0gMiAqIG1heEQ7XG5cdFx0djEgPSBuZXcgQXJyYXkoIHZMZW5ndGggKTtcblx0XHR2MiA9IG5ldyBBcnJheSggdkxlbmd0aCApO1xuXHRcdC8vIFNldHRpbmcgYWxsIGVsZW1lbnRzIHRvIC0xIGlzIGZhc3RlciBpbiBDaHJvbWUgJiBGaXJlZm94IHRoYW4gbWl4aW5nXG5cdFx0Ly8gaW50ZWdlcnMgYW5kIHVuZGVmaW5lZC5cblx0XHRmb3IgKCB4ID0gMDsgeCA8IHZMZW5ndGg7IHgrKyApIHtcblx0XHRcdHYxWyB4IF0gPSAtMTtcblx0XHRcdHYyWyB4IF0gPSAtMTtcblx0XHR9XG5cdFx0djFbIHZPZmZzZXQgKyAxIF0gPSAwO1xuXHRcdHYyWyB2T2Zmc2V0ICsgMSBdID0gMDtcblx0XHRkZWx0YSA9IHRleHQxTGVuZ3RoIC0gdGV4dDJMZW5ndGg7XG5cdFx0Ly8gSWYgdGhlIHRvdGFsIG51bWJlciBvZiBjaGFyYWN0ZXJzIGlzIG9kZCwgdGhlbiB0aGUgZnJvbnQgcGF0aCB3aWxsIGNvbGxpZGVcblx0XHQvLyB3aXRoIHRoZSByZXZlcnNlIHBhdGguXG5cdFx0ZnJvbnQgPSAoIGRlbHRhICUgMiAhPT0gMCApO1xuXHRcdC8vIE9mZnNldHMgZm9yIHN0YXJ0IGFuZCBlbmQgb2YgayBsb29wLlxuXHRcdC8vIFByZXZlbnRzIG1hcHBpbmcgb2Ygc3BhY2UgYmV5b25kIHRoZSBncmlkLlxuXHRcdGsxc3RhcnQgPSAwO1xuXHRcdGsxZW5kID0gMDtcblx0XHRrMnN0YXJ0ID0gMDtcblx0XHRrMmVuZCA9IDA7XG5cdFx0Zm9yICggZCA9IDA7IGQgPCBtYXhEOyBkKysgKSB7XG5cdFx0XHQvLyBCYWlsIG91dCBpZiBkZWFkbGluZSBpcyByZWFjaGVkLlxuXHRcdFx0aWYgKCAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCkgPiBkZWFkbGluZSApIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFdhbGsgdGhlIGZyb250IHBhdGggb25lIHN0ZXAuXG5cdFx0XHRmb3IgKCBrMSA9IC1kICsgazFzdGFydDsgazEgPD0gZCAtIGsxZW5kOyBrMSArPSAyICkge1xuXHRcdFx0XHRrMU9mZnNldCA9IHZPZmZzZXQgKyBrMTtcblx0XHRcdFx0aWYgKCBrMSA9PT0gLWQgfHwgKCBrMSAhPT0gZCAmJiB2MVsgazFPZmZzZXQgLSAxIF0gPCB2MVsgazFPZmZzZXQgKyAxIF0gKSApIHtcblx0XHRcdFx0XHR4MSA9IHYxWyBrMU9mZnNldCArIDEgXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR4MSA9IHYxWyBrMU9mZnNldCAtIDEgXSArIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0eTEgPSB4MSAtIGsxO1xuXHRcdFx0XHR3aGlsZSAoIHgxIDwgdGV4dDFMZW5ndGggJiYgeTEgPCB0ZXh0Mkxlbmd0aCAmJlxuXHRcdFx0XHRcdHRleHQxLmNoYXJBdCggeDEgKSA9PT0gdGV4dDIuY2hhckF0KCB5MSApICkge1xuXHRcdFx0XHRcdHgxKys7XG5cdFx0XHRcdFx0eTErKztcblx0XHRcdFx0fVxuXHRcdFx0XHR2MVsgazFPZmZzZXQgXSA9IHgxO1xuXHRcdFx0XHRpZiAoIHgxID4gdGV4dDFMZW5ndGggKSB7XG5cdFx0XHRcdFx0Ly8gUmFuIG9mZiB0aGUgcmlnaHQgb2YgdGhlIGdyYXBoLlxuXHRcdFx0XHRcdGsxZW5kICs9IDI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIHkxID4gdGV4dDJMZW5ndGggKSB7XG5cdFx0XHRcdFx0Ly8gUmFuIG9mZiB0aGUgYm90dG9tIG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMXN0YXJ0ICs9IDI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyb250ICkge1xuXHRcdFx0XHRcdGsyT2Zmc2V0ID0gdk9mZnNldCArIGRlbHRhIC0gazE7XG5cdFx0XHRcdFx0aWYgKCBrMk9mZnNldCA+PSAwICYmIGsyT2Zmc2V0IDwgdkxlbmd0aCAmJiB2MlsgazJPZmZzZXQgXSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0XHQvLyBNaXJyb3IgeDIgb250byB0b3AtbGVmdCBjb29yZGluYXRlIHN5c3RlbS5cblx0XHRcdFx0XHRcdHgyID0gdGV4dDFMZW5ndGggLSB2MlsgazJPZmZzZXQgXTtcblx0XHRcdFx0XHRcdGlmICggeDEgPj0geDIgKSB7XG5cdFx0XHRcdFx0XHRcdC8vIE92ZXJsYXAgZGV0ZWN0ZWQuXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRpZmZCaXNlY3RTcGxpdCggdGV4dDEsIHRleHQyLCB4MSwgeTEsIGRlYWRsaW5lICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIFdhbGsgdGhlIHJldmVyc2UgcGF0aCBvbmUgc3RlcC5cblx0XHRcdGZvciAoIGsyID0gLWQgKyBrMnN0YXJ0OyBrMiA8PSBkIC0gazJlbmQ7IGsyICs9IDIgKSB7XG5cdFx0XHRcdGsyT2Zmc2V0ID0gdk9mZnNldCArIGsyO1xuXHRcdFx0XHRpZiAoIGsyID09PSAtZCB8fCAoIGsyICE9PSBkICYmIHYyWyBrMk9mZnNldCAtIDEgXSA8IHYyWyBrMk9mZnNldCArIDEgXSApICkge1xuXHRcdFx0XHRcdHgyID0gdjJbIGsyT2Zmc2V0ICsgMSBdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHgyID0gdjJbIGsyT2Zmc2V0IC0gMSBdICsgMTtcblx0XHRcdFx0fVxuXHRcdFx0XHR5MiA9IHgyIC0gazI7XG5cdFx0XHRcdHdoaWxlICggeDIgPCB0ZXh0MUxlbmd0aCAmJiB5MiA8IHRleHQyTGVuZ3RoICYmXG5cdFx0XHRcdFx0dGV4dDEuY2hhckF0KCB0ZXh0MUxlbmd0aCAtIHgyIC0gMSApID09PVxuXHRcdFx0XHRcdHRleHQyLmNoYXJBdCggdGV4dDJMZW5ndGggLSB5MiAtIDEgKSApIHtcblx0XHRcdFx0XHR4MisrO1xuXHRcdFx0XHRcdHkyKys7XG5cdFx0XHRcdH1cblx0XHRcdFx0djJbIGsyT2Zmc2V0IF0gPSB4Mjtcblx0XHRcdFx0aWYgKCB4MiA+IHRleHQxTGVuZ3RoICkge1xuXHRcdFx0XHRcdC8vIFJhbiBvZmYgdGhlIGxlZnQgb2YgdGhlIGdyYXBoLlxuXHRcdFx0XHRcdGsyZW5kICs9IDI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIHkyID4gdGV4dDJMZW5ndGggKSB7XG5cdFx0XHRcdFx0Ly8gUmFuIG9mZiB0aGUgdG9wIG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMnN0YXJ0ICs9IDI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICFmcm9udCApIHtcblx0XHRcdFx0XHRrMU9mZnNldCA9IHZPZmZzZXQgKyBkZWx0YSAtIGsyO1xuXHRcdFx0XHRcdGlmICggazFPZmZzZXQgPj0gMCAmJiBrMU9mZnNldCA8IHZMZW5ndGggJiYgdjFbIGsxT2Zmc2V0IF0gIT09IC0xICkge1xuXHRcdFx0XHRcdFx0eDEgPSB2MVsgazFPZmZzZXQgXTtcblx0XHRcdFx0XHRcdHkxID0gdk9mZnNldCArIHgxIC0gazFPZmZzZXQ7XG5cdFx0XHRcdFx0XHQvLyBNaXJyb3IgeDIgb250byB0b3AtbGVmdCBjb29yZGluYXRlIHN5c3RlbS5cblx0XHRcdFx0XHRcdHgyID0gdGV4dDFMZW5ndGggLSB4Mjtcblx0XHRcdFx0XHRcdGlmICggeDEgPj0geDIgKSB7XG5cdFx0XHRcdFx0XHRcdC8vIE92ZXJsYXAgZGV0ZWN0ZWQuXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRpZmZCaXNlY3RTcGxpdCggdGV4dDEsIHRleHQyLCB4MSwgeTEsIGRlYWRsaW5lICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIERpZmYgdG9vayB0b28gbG9uZyBhbmQgaGl0IHRoZSBkZWFkbGluZSBvclxuXHRcdC8vIG51bWJlciBvZiBkaWZmcyBlcXVhbHMgbnVtYmVyIG9mIGNoYXJhY3RlcnMsIG5vIGNvbW1vbmFsaXR5IGF0IGFsbC5cblx0XHRyZXR1cm4gW1xuXHRcdFx0WyBESUZGX0RFTEVURSwgdGV4dDEgXSxcblx0XHRcdFsgRElGRl9JTlNFUlQsIHRleHQyIF1cblx0XHRdO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBHaXZlbiB0aGUgbG9jYXRpb24gb2YgdGhlICdtaWRkbGUgc25ha2UnLCBzcGxpdCB0aGUgZGlmZiBpbiB0d28gcGFydHNcblx0ICogYW5kIHJlY3Vyc2UuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge251bWJlcn0geCBJbmRleCBvZiBzcGxpdCBwb2ludCBpbiB0ZXh0MS5cblx0ICogQHBhcmFtIHtudW1iZXJ9IHkgSW5kZXggb2Ygc3BsaXQgcG9pbnQgaW4gdGV4dDIuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIGF0IHdoaWNoIHRvIGJhaWwgaWYgbm90IHlldCBjb21wbGV0ZS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZCaXNlY3RTcGxpdCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIHgsIHksIGRlYWRsaW5lICkge1xuXHRcdHZhciB0ZXh0MWEsIHRleHQxYiwgdGV4dDJhLCB0ZXh0MmIsIGRpZmZzLCBkaWZmc2I7XG5cdFx0dGV4dDFhID0gdGV4dDEuc3Vic3RyaW5nKCAwLCB4ICk7XG5cdFx0dGV4dDJhID0gdGV4dDIuc3Vic3RyaW5nKCAwLCB5ICk7XG5cdFx0dGV4dDFiID0gdGV4dDEuc3Vic3RyaW5nKCB4ICk7XG5cdFx0dGV4dDJiID0gdGV4dDIuc3Vic3RyaW5nKCB5ICk7XG5cblx0XHQvLyBDb21wdXRlIGJvdGggZGlmZnMgc2VyaWFsbHkuXG5cdFx0ZGlmZnMgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MWEsIHRleHQyYSwgZmFsc2UsIGRlYWRsaW5lICk7XG5cdFx0ZGlmZnNiID0gdGhpcy5EaWZmTWFpbiggdGV4dDFiLCB0ZXh0MmIsIGZhbHNlLCBkZWFkbGluZSApO1xuXG5cdFx0cmV0dXJuIGRpZmZzLmNvbmNhdCggZGlmZnNiICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlZHVjZSB0aGUgbnVtYmVyIG9mIGVkaXRzIGJ5IGVsaW1pbmF0aW5nIHNlbWFudGljYWxseSB0cml2aWFsIGVxdWFsaXRpZXMuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDbGVhbnVwU2VtYW50aWMgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIGNoYW5nZXMsIGVxdWFsaXRpZXMsIGVxdWFsaXRpZXNMZW5ndGgsIGxhc3RlcXVhbGl0eSxcblx0XHRcdHBvaW50ZXIsIGxlbmd0aEluc2VydGlvbnMyLCBsZW5ndGhEZWxldGlvbnMyLCBsZW5ndGhJbnNlcnRpb25zMSxcblx0XHRcdGxlbmd0aERlbGV0aW9uczEsIGRlbGV0aW9uLCBpbnNlcnRpb24sIG92ZXJsYXBMZW5ndGgxLCBvdmVybGFwTGVuZ3RoMjtcblx0XHRjaGFuZ2VzID0gZmFsc2U7XG5cdFx0ZXF1YWxpdGllcyA9IFtdOyAvLyBTdGFjayBvZiBpbmRpY2VzIHdoZXJlIGVxdWFsaXRpZXMgYXJlIGZvdW5kLlxuXHRcdGVxdWFsaXRpZXNMZW5ndGggPSAwOyAvLyBLZWVwaW5nIG91ciBvd24gbGVuZ3RoIHZhciBpcyBmYXN0ZXIgaW4gSlMuXG5cdFx0LyoqIEB0eXBlIHs/c3RyaW5nfSAqL1xuXHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0Ly8gQWx3YXlzIGVxdWFsIHRvIGRpZmZzW2VxdWFsaXRpZXNbZXF1YWxpdGllc0xlbmd0aCAtIDFdXVsxXVxuXHRcdHBvaW50ZXIgPSAwOyAvLyBJbmRleCBvZiBjdXJyZW50IHBvc2l0aW9uLlxuXHRcdC8vIE51bWJlciBvZiBjaGFyYWN0ZXJzIHRoYXQgY2hhbmdlZCBwcmlvciB0byB0aGUgZXF1YWxpdHkuXG5cdFx0bGVuZ3RoSW5zZXJ0aW9uczEgPSAwO1xuXHRcdGxlbmd0aERlbGV0aW9uczEgPSAwO1xuXHRcdC8vIE51bWJlciBvZiBjaGFyYWN0ZXJzIHRoYXQgY2hhbmdlZCBhZnRlciB0aGUgZXF1YWxpdHkuXG5cdFx0bGVuZ3RoSW5zZXJ0aW9uczIgPSAwO1xuXHRcdGxlbmd0aERlbGV0aW9uczIgPSAwO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0VRVUFMICkgeyAvLyBFcXVhbGl0eSBmb3VuZC5cblx0XHRcdFx0ZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCsrIF0gPSBwb2ludGVyO1xuXHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMSA9IGxlbmd0aEluc2VydGlvbnMyO1xuXHRcdFx0XHRsZW5ndGhEZWxldGlvbnMxID0gbGVuZ3RoRGVsZXRpb25zMjtcblx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczIgPSAwO1xuXHRcdFx0XHRsZW5ndGhEZWxldGlvbnMyID0gMDtcblx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0fSBlbHNlIHsgLy8gQW4gaW5zZXJ0aW9uIG9yIGRlbGV0aW9uLlxuXHRcdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9JTlNFUlQgKSB7XG5cdFx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczIgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdLmxlbmd0aDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRsZW5ndGhEZWxldGlvbnMyICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXS5sZW5ndGg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gRWxpbWluYXRlIGFuIGVxdWFsaXR5IHRoYXQgaXMgc21hbGxlciBvciBlcXVhbCB0byB0aGUgZWRpdHMgb24gYm90aFxuXHRcdFx0XHQvLyBzaWRlcyBvZiBpdC5cblx0XHRcdFx0aWYgKCBsYXN0ZXF1YWxpdHkgJiYgKCBsYXN0ZXF1YWxpdHkubGVuZ3RoIDw9XG5cdFx0XHRcdFx0XHRNYXRoLm1heCggbGVuZ3RoSW5zZXJ0aW9uczEsIGxlbmd0aERlbGV0aW9uczEgKSApICYmXG5cdFx0XHRcdFx0XHQoIGxhc3RlcXVhbGl0eS5sZW5ndGggPD0gTWF0aC5tYXgoIGxlbmd0aEluc2VydGlvbnMyLFxuXHRcdFx0XHRcdFx0XHRsZW5ndGhEZWxldGlvbnMyICkgKSApIHtcblxuXHRcdFx0XHRcdC8vIER1cGxpY2F0ZSByZWNvcmQuXG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKFxuXHRcdFx0XHRcdFx0ZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSxcblx0XHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0XHRbIERJRkZfREVMRVRFLCBsYXN0ZXF1YWxpdHkgXVxuXHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHQvLyBDaGFuZ2Ugc2Vjb25kIGNvcHkgdG8gaW5zZXJ0LlxuXHRcdFx0XHRcdGRpZmZzWyBlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdICsgMSBdWyAwIF0gPSBESUZGX0lOU0VSVDtcblxuXHRcdFx0XHRcdC8vIFRocm93IGF3YXkgdGhlIGVxdWFsaXR5IHdlIGp1c3QgZGVsZXRlZC5cblx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoLS07XG5cblx0XHRcdFx0XHQvLyBUaHJvdyBhd2F5IHRoZSBwcmV2aW91cyBlcXVhbGl0eSAoaXQgbmVlZHMgdG8gYmUgcmVldmFsdWF0ZWQpLlxuXHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGgtLTtcblx0XHRcdFx0XHRwb2ludGVyID0gZXF1YWxpdGllc0xlbmd0aCA+IDAgPyBlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdIDogLTE7XG5cblx0XHRcdFx0XHQvLyBSZXNldCB0aGUgY291bnRlcnMuXG5cdFx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczEgPSAwO1xuXHRcdFx0XHRcdGxlbmd0aERlbGV0aW9uczEgPSAwO1xuXHRcdFx0XHRcdGxlbmd0aEluc2VydGlvbnMyID0gMDtcblx0XHRcdFx0XHRsZW5ndGhEZWxldGlvbnMyID0gMDtcblx0XHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBudWxsO1xuXHRcdFx0XHRcdGNoYW5nZXMgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXG5cdFx0Ly8gTm9ybWFsaXplIHRoZSBkaWZmLlxuXHRcdGlmICggY2hhbmdlcyApIHtcblx0XHRcdHRoaXMuZGlmZkNsZWFudXBNZXJnZSggZGlmZnMgKTtcblx0XHR9XG5cblx0XHQvLyBGaW5kIGFueSBvdmVybGFwcyBiZXR3ZWVuIGRlbGV0aW9ucyBhbmQgaW5zZXJ0aW9ucy5cblx0XHQvLyBlLmc6IDxkZWw+YWJjeHh4PC9kZWw+PGlucz54eHhkZWY8L2lucz5cblx0XHQvLyAgIC0+IDxkZWw+YWJjPC9kZWw+eHh4PGlucz5kZWY8L2lucz5cblx0XHQvLyBlLmc6IDxkZWw+eHh4YWJjPC9kZWw+PGlucz5kZWZ4eHg8L2lucz5cblx0XHQvLyAgIC0+IDxpbnM+ZGVmPC9pbnM+eHh4PGRlbD5hYmM8L2RlbD5cblx0XHQvLyBPbmx5IGV4dHJhY3QgYW4gb3ZlcmxhcCBpZiBpdCBpcyBhcyBiaWcgYXMgdGhlIGVkaXQgYWhlYWQgb3IgYmVoaW5kIGl0LlxuXHRcdHBvaW50ZXIgPSAxO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDAgXSA9PT0gRElGRl9ERUxFVEUgJiZcblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfSU5TRVJUICkge1xuXHRcdFx0XHRkZWxldGlvbiA9IGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF07XG5cdFx0XHRcdGluc2VydGlvbiA9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0b3ZlcmxhcExlbmd0aDEgPSB0aGlzLmRpZmZDb21tb25PdmVybGFwKCBkZWxldGlvbiwgaW5zZXJ0aW9uICk7XG5cdFx0XHRcdG92ZXJsYXBMZW5ndGgyID0gdGhpcy5kaWZmQ29tbW9uT3ZlcmxhcCggaW5zZXJ0aW9uLCBkZWxldGlvbiApO1xuXHRcdFx0XHRpZiAoIG92ZXJsYXBMZW5ndGgxID49IG92ZXJsYXBMZW5ndGgyICkge1xuXHRcdFx0XHRcdGlmICggb3ZlcmxhcExlbmd0aDEgPj0gZGVsZXRpb24ubGVuZ3RoIC8gMiB8fFxuXHRcdFx0XHRcdFx0XHRvdmVybGFwTGVuZ3RoMSA+PSBpbnNlcnRpb24ubGVuZ3RoIC8gMiApIHtcblx0XHRcdFx0XHRcdC8vIE92ZXJsYXAgZm91bmQuICBJbnNlcnQgYW4gZXF1YWxpdHkgYW5kIHRyaW0gdGhlIHN1cnJvdW5kaW5nIGVkaXRzLlxuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKFxuXHRcdFx0XHRcdFx0XHRwb2ludGVyLFxuXHRcdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0XHRbIERJRkZfRVFVQUwsIGluc2VydGlvbi5zdWJzdHJpbmcoIDAsIG92ZXJsYXBMZW5ndGgxICkgXVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gPVxuXHRcdFx0XHRcdFx0XHRkZWxldGlvbi5zdWJzdHJpbmcoIDAsIGRlbGV0aW9uLmxlbmd0aCAtIG92ZXJsYXBMZW5ndGgxICk7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdID0gaW5zZXJ0aW9uLnN1YnN0cmluZyggb3ZlcmxhcExlbmd0aDEgKTtcblx0XHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKCBvdmVybGFwTGVuZ3RoMiA+PSBkZWxldGlvbi5sZW5ndGggLyAyIHx8XG5cdFx0XHRcdFx0XHRcdG92ZXJsYXBMZW5ndGgyID49IGluc2VydGlvbi5sZW5ndGggLyAyICkge1xuXG5cdFx0XHRcdFx0XHQvLyBSZXZlcnNlIG92ZXJsYXAgZm91bmQuXG5cdFx0XHRcdFx0XHQvLyBJbnNlcnQgYW4gZXF1YWxpdHkgYW5kIHN3YXAgYW5kIHRyaW0gdGhlIHN1cnJvdW5kaW5nIGVkaXRzLlxuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKFxuXHRcdFx0XHRcdFx0XHRwb2ludGVyLFxuXHRcdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0XHRbIERJRkZfRVFVQUwsIGRlbGV0aW9uLnN1YnN0cmluZyggMCwgb3ZlcmxhcExlbmd0aDIgKSBdXG5cdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMCBdID0gRElGRl9JTlNFUlQ7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdFx0aW5zZXJ0aW9uLnN1YnN0cmluZyggMCwgaW5zZXJ0aW9uLmxlbmd0aCAtIG92ZXJsYXBMZW5ndGgyICk7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMCBdID0gRElGRl9ERUxFVEU7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdFx0ZGVsZXRpb24uc3Vic3RyaW5nKCBvdmVybGFwTGVuZ3RoMiApO1xuXHRcdFx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgaWYgdGhlIHN1ZmZpeCBvZiBvbmUgc3RyaW5nIGlzIHRoZSBwcmVmaXggb2YgYW5vdGhlci5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge251bWJlcn0gVGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIGNvbW1vbiB0byB0aGUgZW5kIG9mIHRoZSBmaXJzdFxuXHQgKiAgICAgc3RyaW5nIGFuZCB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzdHJpbmcuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNvbW1vbk92ZXJsYXAgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciB0ZXh0MUxlbmd0aCwgdGV4dDJMZW5ndGgsIHRleHRMZW5ndGgsXG5cdFx0XHRiZXN0LCBsZW5ndGgsIHBhdHRlcm4sIGZvdW5kO1xuXHRcdC8vIENhY2hlIHRoZSB0ZXh0IGxlbmd0aHMgdG8gcHJldmVudCBtdWx0aXBsZSBjYWxscy5cblx0XHR0ZXh0MUxlbmd0aCA9IHRleHQxLmxlbmd0aDtcblx0XHR0ZXh0Mkxlbmd0aCA9IHRleHQyLmxlbmd0aDtcblx0XHQvLyBFbGltaW5hdGUgdGhlIG51bGwgY2FzZS5cblx0XHRpZiAoIHRleHQxTGVuZ3RoID09PSAwIHx8IHRleHQyTGVuZ3RoID09PSAwICkge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdC8vIFRydW5jYXRlIHRoZSBsb25nZXIgc3RyaW5nLlxuXHRcdGlmICggdGV4dDFMZW5ndGggPiB0ZXh0Mkxlbmd0aCApIHtcblx0XHRcdHRleHQxID0gdGV4dDEuc3Vic3RyaW5nKCB0ZXh0MUxlbmd0aCAtIHRleHQyTGVuZ3RoICk7XG5cdFx0fSBlbHNlIGlmICggdGV4dDFMZW5ndGggPCB0ZXh0Mkxlbmd0aCApIHtcblx0XHRcdHRleHQyID0gdGV4dDIuc3Vic3RyaW5nKCAwLCB0ZXh0MUxlbmd0aCApO1xuXHRcdH1cblx0XHR0ZXh0TGVuZ3RoID0gTWF0aC5taW4oIHRleHQxTGVuZ3RoLCB0ZXh0Mkxlbmd0aCApO1xuXHRcdC8vIFF1aWNrIGNoZWNrIGZvciB0aGUgd29yc3QgY2FzZS5cblx0XHRpZiAoIHRleHQxID09PSB0ZXh0MiApIHtcblx0XHRcdHJldHVybiB0ZXh0TGVuZ3RoO1xuXHRcdH1cblxuXHRcdC8vIFN0YXJ0IGJ5IGxvb2tpbmcgZm9yIGEgc2luZ2xlIGNoYXJhY3RlciBtYXRjaFxuXHRcdC8vIGFuZCBpbmNyZWFzZSBsZW5ndGggdW50aWwgbm8gbWF0Y2ggaXMgZm91bmQuXG5cdFx0Ly8gUGVyZm9ybWFuY2UgYW5hbHlzaXM6IGh0dHBzOi8vbmVpbC5mcmFzZXIubmFtZS9uZXdzLzIwMTAvMTEvMDQvXG5cdFx0YmVzdCA9IDA7XG5cdFx0bGVuZ3RoID0gMTtcblx0XHR3aGlsZSAoIHRydWUgKSB7XG5cdFx0XHRwYXR0ZXJuID0gdGV4dDEuc3Vic3RyaW5nKCB0ZXh0TGVuZ3RoIC0gbGVuZ3RoICk7XG5cdFx0XHRmb3VuZCA9IHRleHQyLmluZGV4T2YoIHBhdHRlcm4gKTtcblx0XHRcdGlmICggZm91bmQgPT09IC0xICkge1xuXHRcdFx0XHRyZXR1cm4gYmVzdDtcblx0XHRcdH1cblx0XHRcdGxlbmd0aCArPSBmb3VuZDtcblx0XHRcdGlmICggZm91bmQgPT09IDAgfHwgdGV4dDEuc3Vic3RyaW5nKCB0ZXh0TGVuZ3RoIC0gbGVuZ3RoICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuc3Vic3RyaW5nKCAwLCBsZW5ndGggKSApIHtcblx0XHRcdFx0YmVzdCA9IGxlbmd0aDtcblx0XHRcdFx0bGVuZ3RoKys7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBTcGxpdCB0d28gdGV4dHMgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzLiAgUmVkdWNlIHRoZSB0ZXh0cyB0byBhIHN0cmluZyBvZlxuXHQgKiBoYXNoZXMgd2hlcmUgZWFjaCBVbmljb2RlIGNoYXJhY3RlciByZXByZXNlbnRzIG9uZSBsaW5lLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7e2NoYXJzMTogc3RyaW5nLCBjaGFyczI6IHN0cmluZywgbGluZUFycmF5OiAhQXJyYXkuPHN0cmluZz59fVxuXHQgKiAgICAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVuY29kZWQgdGV4dDEsIHRoZSBlbmNvZGVkIHRleHQyIGFuZFxuXHQgKiAgICAgdGhlIGFycmF5IG9mIHVuaXF1ZSBzdHJpbmdzLlxuXHQgKiAgICAgVGhlIHplcm90aCBlbGVtZW50IG9mIHRoZSBhcnJheSBvZiB1bmlxdWUgc3RyaW5ncyBpcyBpbnRlbnRpb25hbGx5IGJsYW5rLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZMaW5lc1RvQ2hhcnMgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciBsaW5lQXJyYXksIGxpbmVIYXNoLCBjaGFyczEsIGNoYXJzMjtcblx0XHRsaW5lQXJyYXkgPSBbXTsgLy8gZS5nLiBsaW5lQXJyYXlbNF0gPT09ICdIZWxsb1xcbidcblx0XHRsaW5lSGFzaCA9IHt9OyAvLyBlLmcuIGxpbmVIYXNoWydIZWxsb1xcbiddID09PSA0XG5cblx0XHQvLyAnXFx4MDAnIGlzIGEgdmFsaWQgY2hhcmFjdGVyLCBidXQgdmFyaW91cyBkZWJ1Z2dlcnMgZG9uJ3QgbGlrZSBpdC5cblx0XHQvLyBTbyB3ZSdsbCBpbnNlcnQgYSBqdW5rIGVudHJ5IHRvIGF2b2lkIGdlbmVyYXRpbmcgYSBudWxsIGNoYXJhY3Rlci5cblx0XHRsaW5lQXJyYXlbIDAgXSA9IFwiXCI7XG5cblx0XHQvKipcblx0XHQgKiBTcGxpdCBhIHRleHQgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzLiAgUmVkdWNlIHRoZSB0ZXh0cyB0byBhIHN0cmluZyBvZlxuXHRcdCAqIGhhc2hlcyB3aGVyZSBlYWNoIFVuaWNvZGUgY2hhcmFjdGVyIHJlcHJlc2VudHMgb25lIGxpbmUuXG5cdFx0ICogTW9kaWZpZXMgbGluZWFycmF5IGFuZCBsaW5laGFzaCB0aHJvdWdoIGJlaW5nIGEgY2xvc3VyZS5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBTdHJpbmcgdG8gZW5jb2RlLlxuXHRcdCAqIEByZXR1cm4ge3N0cmluZ30gRW5jb2RlZCBzdHJpbmcuXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkaWZmTGluZXNUb0NoYXJzTXVuZ2UoIHRleHQgKSB7XG5cdFx0XHR2YXIgY2hhcnMsIGxpbmVTdGFydCwgbGluZUVuZCwgbGluZUFycmF5TGVuZ3RoLCBsaW5lO1xuXHRcdFx0Y2hhcnMgPSBcIlwiO1xuXHRcdFx0Ly8gV2FsayB0aGUgdGV4dCwgcHVsbGluZyBvdXQgYSBzdWJzdHJpbmcgZm9yIGVhY2ggbGluZS5cblx0XHRcdC8vIHRleHQuc3BsaXQoJ1xcbicpIHdvdWxkIHdvdWxkIHRlbXBvcmFyaWx5IGRvdWJsZSBvdXIgbWVtb3J5IGZvb3RwcmludC5cblx0XHRcdC8vIE1vZGlmeWluZyB0ZXh0IHdvdWxkIGNyZWF0ZSBtYW55IGxhcmdlIHN0cmluZ3MgdG8gZ2FyYmFnZSBjb2xsZWN0LlxuXHRcdFx0bGluZVN0YXJ0ID0gMDtcblx0XHRcdGxpbmVFbmQgPSAtMTtcblx0XHRcdC8vIEtlZXBpbmcgb3VyIG93biBsZW5ndGggdmFyaWFibGUgaXMgZmFzdGVyIHRoYW4gbG9va2luZyBpdCB1cC5cblx0XHRcdGxpbmVBcnJheUxlbmd0aCA9IGxpbmVBcnJheS5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoIGxpbmVFbmQgPCB0ZXh0Lmxlbmd0aCAtIDEgKSB7XG5cdFx0XHRcdGxpbmVFbmQgPSB0ZXh0LmluZGV4T2YoIFwiXFxuXCIsIGxpbmVTdGFydCApO1xuXHRcdFx0XHRpZiAoIGxpbmVFbmQgPT09IC0xICkge1xuXHRcdFx0XHRcdGxpbmVFbmQgPSB0ZXh0Lmxlbmd0aCAtIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGluZSA9IHRleHQuc3Vic3RyaW5nKCBsaW5lU3RhcnQsIGxpbmVFbmQgKyAxICk7XG5cdFx0XHRcdGxpbmVTdGFydCA9IGxpbmVFbmQgKyAxO1xuXG5cdFx0XHRcdGlmICggbGluZUhhc2guaGFzT3duUHJvcGVydHkgPyBsaW5lSGFzaC5oYXNPd25Qcm9wZXJ0eSggbGluZSApIDpcblx0XHRcdFx0XHRcdFx0KCBsaW5lSGFzaFsgbGluZSBdICE9PSB1bmRlZmluZWQgKSApIHtcblx0XHRcdFx0XHRjaGFycyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCBsaW5lSGFzaFsgbGluZSBdICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2hhcnMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSggbGluZUFycmF5TGVuZ3RoICk7XG5cdFx0XHRcdFx0bGluZUhhc2hbIGxpbmUgXSA9IGxpbmVBcnJheUxlbmd0aDtcblx0XHRcdFx0XHRsaW5lQXJyYXlbIGxpbmVBcnJheUxlbmd0aCsrIF0gPSBsaW5lO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gY2hhcnM7XG5cdFx0fVxuXG5cdFx0Y2hhcnMxID0gZGlmZkxpbmVzVG9DaGFyc011bmdlKCB0ZXh0MSApO1xuXHRcdGNoYXJzMiA9IGRpZmZMaW5lc1RvQ2hhcnNNdW5nZSggdGV4dDIgKTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y2hhcnMxOiBjaGFyczEsXG5cdFx0XHRjaGFyczI6IGNoYXJzMixcblx0XHRcdGxpbmVBcnJheTogbGluZUFycmF5XG5cdFx0fTtcblx0fTtcblxuXHQvKipcblx0ICogUmVoeWRyYXRlIHRoZSB0ZXh0IGluIGEgZGlmZiBmcm9tIGEgc3RyaW5nIG9mIGxpbmUgaGFzaGVzIHRvIHJlYWwgbGluZXMgb2Zcblx0ICogdGV4dC5cblx0ICogQHBhcmFtIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gZGlmZnMgQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjxzdHJpbmc+fSBsaW5lQXJyYXkgQXJyYXkgb2YgdW5pcXVlIHN0cmluZ3MuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNoYXJzVG9MaW5lcyA9IGZ1bmN0aW9uKCBkaWZmcywgbGluZUFycmF5ICkge1xuXHRcdHZhciB4LCBjaGFycywgdGV4dCwgeTtcblx0XHRmb3IgKCB4ID0gMDsgeCA8IGRpZmZzLmxlbmd0aDsgeCsrICkge1xuXHRcdFx0Y2hhcnMgPSBkaWZmc1sgeCBdWyAxIF07XG5cdFx0XHR0ZXh0ID0gW107XG5cdFx0XHRmb3IgKCB5ID0gMDsgeSA8IGNoYXJzLmxlbmd0aDsgeSsrICkge1xuXHRcdFx0XHR0ZXh0WyB5IF0gPSBsaW5lQXJyYXlbIGNoYXJzLmNoYXJDb2RlQXQoIHkgKSBdO1xuXHRcdFx0fVxuXHRcdFx0ZGlmZnNbIHggXVsgMSBdID0gdGV4dC5qb2luKCBcIlwiICk7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZW9yZGVyIGFuZCBtZXJnZSBsaWtlIGVkaXQgc2VjdGlvbnMuICBNZXJnZSBlcXVhbGl0aWVzLlxuXHQgKiBBbnkgZWRpdCBzZWN0aW9uIGNhbiBtb3ZlIGFzIGxvbmcgYXMgaXQgZG9lc24ndCBjcm9zcyBhbiBlcXVhbGl0eS5cblx0ICogQHBhcmFtIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gZGlmZnMgQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNsZWFudXBNZXJnZSA9IGZ1bmN0aW9uKCBkaWZmcyApIHtcblx0XHR2YXIgcG9pbnRlciwgY291bnREZWxldGUsIGNvdW50SW5zZXJ0LCB0ZXh0SW5zZXJ0LCB0ZXh0RGVsZXRlLFxuXHRcdFx0Y29tbW9ubGVuZ3RoLCBjaGFuZ2VzLCBkaWZmUG9pbnRlciwgcG9zaXRpb247XG5cdFx0ZGlmZnMucHVzaCggWyBESUZGX0VRVUFMLCBcIlwiIF0gKTsgLy8gQWRkIGEgZHVtbXkgZW50cnkgYXQgdGhlIGVuZC5cblx0XHRwb2ludGVyID0gMDtcblx0XHRjb3VudERlbGV0ZSA9IDA7XG5cdFx0Y291bnRJbnNlcnQgPSAwO1xuXHRcdHRleHREZWxldGUgPSBcIlwiO1xuXHRcdHRleHRJbnNlcnQgPSBcIlwiO1xuXHRcdGNvbW1vbmxlbmd0aDtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cdFx0XHRzd2l0Y2ggKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gKSB7XG5cdFx0XHRjYXNlIERJRkZfSU5TRVJUOlxuXHRcdFx0XHRjb3VudEluc2VydCsrO1xuXHRcdFx0XHR0ZXh0SW5zZXJ0ICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9ERUxFVEU6XG5cdFx0XHRcdGNvdW50RGVsZXRlKys7XG5cdFx0XHRcdHRleHREZWxldGUgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0VRVUFMOlxuXHRcdFx0XHQvLyBVcG9uIHJlYWNoaW5nIGFuIGVxdWFsaXR5LCBjaGVjayBmb3IgcHJpb3IgcmVkdW5kYW5jaWVzLlxuXHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQgPiAxICkge1xuXHRcdFx0XHRcdGlmICggY291bnREZWxldGUgIT09IDAgJiYgY291bnRJbnNlcnQgIT09IDAgKSB7XG5cdFx0XHRcdFx0XHQvLyBGYWN0b3Igb3V0IGFueSBjb21tb24gcHJlZml4ZXMuXG5cdFx0XHRcdFx0XHRjb21tb25sZW5ndGggPSB0aGlzLmRpZmZDb21tb25QcmVmaXgoIHRleHRJbnNlcnQsIHRleHREZWxldGUgKTtcblx0XHRcdFx0XHRcdGlmICggY29tbW9ubGVuZ3RoICE9PSAwICkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICggcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQgKSA+IDAgJiZcblx0XHRcdFx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCAtIDEgXVsgMCBdID09PVxuXHRcdFx0XHRcdFx0XHRcdFx0RElGRl9FUVVBTCApIHtcblx0XHRcdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQgLSAxIF1bIDEgXSArPVxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dEluc2VydC5zdWJzdHJpbmcoIDAsIGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZSggMCwgMCwgWyBESUZGX0VRVUFMLFxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dEluc2VydC5zdWJzdHJpbmcoIDAsIGNvbW1vbmxlbmd0aCApXG5cdFx0XHRcdFx0XHRcdFx0XSApO1xuXHRcdFx0XHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0ID0gdGV4dEluc2VydC5zdWJzdHJpbmcoIGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0XHR0ZXh0RGVsZXRlID0gdGV4dERlbGV0ZS5zdWJzdHJpbmcoIGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gRmFjdG9yIG91dCBhbnkgY29tbW9uIHN1ZmZpeGllcy5cblx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCA9IHRoaXMuZGlmZkNvbW1vblN1ZmZpeCggdGV4dEluc2VydCwgdGV4dERlbGV0ZSApO1xuXHRcdFx0XHRcdFx0aWYgKCBjb21tb25sZW5ndGggIT09IDAgKSB7XG5cdFx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXSA9IHRleHRJbnNlcnQuc3Vic3RyaW5nKCB0ZXh0SW5zZXJ0Lmxlbmd0aCAtXG5cdFx0XHRcdFx0XHRcdFx0XHRjb21tb25sZW5ndGggKSArIGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0XHRcdFx0dGV4dEluc2VydCA9IHRleHRJbnNlcnQuc3Vic3RyaW5nKCAwLCB0ZXh0SW5zZXJ0Lmxlbmd0aCAtXG5cdFx0XHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHRcdHRleHREZWxldGUgPSB0ZXh0RGVsZXRlLnN1YnN0cmluZyggMCwgdGV4dERlbGV0ZS5sZW5ndGggLVxuXHRcdFx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBEZWxldGUgdGhlIG9mZmVuZGluZyByZWNvcmRzIGFuZCBhZGQgdGhlIG1lcmdlZCBvbmVzLlxuXHRcdFx0XHRcdGlmICggY291bnREZWxldGUgPT09IDAgKSB7XG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgLSBjb3VudEluc2VydCxcblx0XHRcdFx0XHRcdFx0Y291bnREZWxldGUgKyBjb3VudEluc2VydCwgWyBESUZGX0lOU0VSVCwgdGV4dEluc2VydCBdICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggY291bnRJbnNlcnQgPT09IDAgKSB7XG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgLSBjb3VudERlbGV0ZSxcblx0XHRcdFx0XHRcdFx0Y291bnREZWxldGUgKyBjb3VudEluc2VydCwgWyBESUZGX0RFTEVURSwgdGV4dERlbGV0ZSBdICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdFx0cG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRcdFsgRElGRl9ERUxFVEUsIHRleHREZWxldGUgXSwgWyBESUZGX0lOU0VSVCwgdGV4dEluc2VydCBdXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwb2ludGVyID0gcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQgK1xuXHRcdFx0XHRcdFx0KCBjb3VudERlbGV0ZSA/IDEgOiAwICkgKyAoIGNvdW50SW5zZXJ0ID8gMSA6IDAgKSArIDE7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIHBvaW50ZXIgIT09IDAgJiYgZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDAgXSA9PT0gRElGRl9FUVVBTCApIHtcblxuXHRcdFx0XHRcdC8vIE1lcmdlIHRoaXMgZXF1YWxpdHkgd2l0aCB0aGUgcHJldmlvdXMgb25lLlxuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciwgMSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3VudEluc2VydCA9IDA7XG5cdFx0XHRcdGNvdW50RGVsZXRlID0gMDtcblx0XHRcdFx0dGV4dERlbGV0ZSA9IFwiXCI7XG5cdFx0XHRcdHRleHRJbnNlcnQgPSBcIlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCBkaWZmc1sgZGlmZnMubGVuZ3RoIC0gMSBdWyAxIF0gPT09IFwiXCIgKSB7XG5cdFx0XHRkaWZmcy5wb3AoKTsgLy8gUmVtb3ZlIHRoZSBkdW1teSBlbnRyeSBhdCB0aGUgZW5kLlxuXHRcdH1cblxuXHRcdC8vIFNlY29uZCBwYXNzOiBsb29rIGZvciBzaW5nbGUgZWRpdHMgc3Vycm91bmRlZCBvbiBib3RoIHNpZGVzIGJ5IGVxdWFsaXRpZXNcblx0XHQvLyB3aGljaCBjYW4gYmUgc2hpZnRlZCBzaWRld2F5cyB0byBlbGltaW5hdGUgYW4gZXF1YWxpdHkuXG5cdFx0Ly8gZS5nOiBBPGlucz5CQTwvaW5zPkMgLT4gPGlucz5BQjwvaW5zPkFDXG5cdFx0Y2hhbmdlcyA9IGZhbHNlO1xuXHRcdHBvaW50ZXIgPSAxO1xuXG5cdFx0Ly8gSW50ZW50aW9uYWxseSBpZ25vcmUgdGhlIGZpcnN0IGFuZCBsYXN0IGVsZW1lbnQgKGRvbid0IG5lZWQgY2hlY2tpbmcpLlxuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCAtIDEgKSB7XG5cdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIC0gMSBdWyAwIF0gPT09IERJRkZfRVFVQUwgJiZcblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMCBdID09PSBESUZGX0VRVUFMICkge1xuXG5cdFx0XHRcdGRpZmZQb2ludGVyID0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRwb3NpdGlvbiA9IGRpZmZQb2ludGVyLnN1YnN0cmluZyhcblx0XHRcdFx0XHRkaWZmUG9pbnRlci5sZW5ndGggLSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdLmxlbmd0aFxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdC8vIFRoaXMgaXMgYSBzaW5nbGUgZWRpdCBzdXJyb3VuZGVkIGJ5IGVxdWFsaXRpZXMuXG5cdFx0XHRcdGlmICggcG9zaXRpb24gPT09IGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gKSB7XG5cblx0XHRcdFx0XHQvLyBTaGlmdCB0aGUgZWRpdCBvdmVyIHRoZSBwcmV2aW91cyBlcXVhbGl0eS5cblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0gPSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXS5zdWJzdHJpbmcoIDAsIGRpZmZzWyBwb2ludGVyIF1bIDEgXS5sZW5ndGggLVxuXHRcdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdLmxlbmd0aCApO1xuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0gPVxuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSArIGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF07XG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gMSwgMSApO1xuXHRcdFx0XHRcdGNoYW5nZXMgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBkaWZmUG9pbnRlci5zdWJzdHJpbmcoIDAsIGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0ubGVuZ3RoICkgPT09XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdICkge1xuXG5cdFx0XHRcdFx0Ly8gU2hpZnQgdGhlIGVkaXQgb3ZlciB0aGUgbmV4dCBlcXVhbGl0eS5cblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICs9IGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF07XG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdID1cblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXS5zdWJzdHJpbmcoIGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0ubGVuZ3RoICkgK1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXTtcblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgKyAxLCAxICk7XG5cdFx0XHRcdFx0Y2hhbmdlcyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cdFx0Ly8gSWYgc2hpZnRzIHdlcmUgbWFkZSwgdGhlIGRpZmYgbmVlZHMgcmVvcmRlcmluZyBhbmQgYW5vdGhlciBzaGlmdCBzd2VlcC5cblx0XHRpZiAoIGNoYW5nZXMgKSB7XG5cdFx0XHR0aGlzLmRpZmZDbGVhbnVwTWVyZ2UoIGRpZmZzICk7XG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiBmdW5jdGlvbiggbywgbiApIHtcblx0XHR2YXIgZGlmZiwgb3V0cHV0LCB0ZXh0O1xuXHRcdGRpZmYgPSBuZXcgRGlmZk1hdGNoUGF0Y2goKTtcblx0XHRvdXRwdXQgPSBkaWZmLkRpZmZNYWluKCBvLCBuICk7XG5cdFx0ZGlmZi5kaWZmQ2xlYW51cEVmZmljaWVuY3koIG91dHB1dCApO1xuXHRcdHRleHQgPSBkaWZmLmRpZmZQcmV0dHlIdG1sKCBvdXRwdXQgKTtcblxuXHRcdHJldHVybiB0ZXh0O1xuXHR9O1xufSgpICk7XG5cbi8vIEdldCBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdCwgbGlrZSB3aW5kb3cgaW4gYnJvd3NlcnNcbn0oIChmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXM7XG59KSgpICkpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbi8vIERvbid0IGxvYWQgdGhlIEhUTUwgUmVwb3J0ZXIgb24gbm9uLUJyb3dzZXIgZW52aXJvbm1lbnRzXG5pZiAoIHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIgfHwgIXdpbmRvdy5kb2N1bWVudCApIHtcblx0cmV0dXJuO1xufVxuXG4vLyBEZXByZWNhdGVkIFFVbml0LmluaXQgLSBSZWYgIzUzMFxuLy8gUmUtaW5pdGlhbGl6ZSB0aGUgY29uZmlndXJhdGlvbiBvcHRpb25zXG5RVW5pdC5pbml0ID0gZnVuY3Rpb24oKSB7XG5cdHZhciB0ZXN0cywgYmFubmVyLCByZXN1bHQsIHF1bml0LFxuXHRcdGNvbmZpZyA9IFFVbml0LmNvbmZpZztcblxuXHRjb25maWcuc3RhdHMgPSB7IGFsbDogMCwgYmFkOiAwIH07XG5cdGNvbmZpZy5tb2R1bGVTdGF0cyA9IHsgYWxsOiAwLCBiYWQ6IDAgfTtcblx0Y29uZmlnLnN0YXJ0ZWQgPSAwO1xuXHRjb25maWcudXBkYXRlUmF0ZSA9IDEwMDA7XG5cdGNvbmZpZy5ibG9ja2luZyA9IGZhbHNlO1xuXHRjb25maWcuYXV0b3N0YXJ0ID0gdHJ1ZTtcblx0Y29uZmlnLmF1dG9ydW4gPSBmYWxzZTtcblx0Y29uZmlnLmZpbHRlciA9IFwiXCI7XG5cdGNvbmZpZy5xdWV1ZSA9IFtdO1xuXG5cdC8vIFJldHVybiBvbiBub24tYnJvd3NlciBlbnZpcm9ubWVudHNcblx0Ly8gVGhpcyBpcyBuZWNlc3NhcnkgdG8gbm90IGJyZWFrIG9uIG5vZGUgdGVzdHNcblx0aWYgKCB0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHF1bml0ID0gaWQoIFwicXVuaXRcIiApO1xuXHRpZiAoIHF1bml0ICkge1xuXHRcdHF1bml0LmlubmVySFRNTCA9XG5cdFx0XHRcIjxoMSBpZD0ncXVuaXQtaGVhZGVyJz5cIiArIGVzY2FwZVRleHQoIGRvY3VtZW50LnRpdGxlICkgKyBcIjwvaDE+XCIgK1xuXHRcdFx0XCI8aDIgaWQ9J3F1bml0LWJhbm5lcic+PC9oMj5cIiArXG5cdFx0XHRcIjxkaXYgaWQ9J3F1bml0LXRlc3RydW5uZXItdG9vbGJhcic+PC9kaXY+XCIgK1xuXHRcdFx0XCI8aDIgaWQ9J3F1bml0LXVzZXJBZ2VudCc+PC9oMj5cIiArXG5cdFx0XHRcIjxvbCBpZD0ncXVuaXQtdGVzdHMnPjwvb2w+XCI7XG5cdH1cblxuXHR0ZXN0cyA9IGlkKCBcInF1bml0LXRlc3RzXCIgKTtcblx0YmFubmVyID0gaWQoIFwicXVuaXQtYmFubmVyXCIgKTtcblx0cmVzdWx0ID0gaWQoIFwicXVuaXQtdGVzdHJlc3VsdFwiICk7XG5cblx0aWYgKCB0ZXN0cyApIHtcblx0XHR0ZXN0cy5pbm5lckhUTUwgPSBcIlwiO1xuXHR9XG5cblx0aWYgKCBiYW5uZXIgKSB7XG5cdFx0YmFubmVyLmNsYXNzTmFtZSA9IFwiXCI7XG5cdH1cblxuXHRpZiAoIHJlc3VsdCApIHtcblx0XHRyZXN1bHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCggcmVzdWx0ICk7XG5cdH1cblxuXHRpZiAoIHRlc3RzICkge1xuXHRcdHJlc3VsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwicFwiICk7XG5cdFx0cmVzdWx0LmlkID0gXCJxdW5pdC10ZXN0cmVzdWx0XCI7XG5cdFx0cmVzdWx0LmNsYXNzTmFtZSA9IFwicmVzdWx0XCI7XG5cdFx0dGVzdHMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoIHJlc3VsdCwgdGVzdHMgKTtcblx0XHRyZXN1bHQuaW5uZXJIVE1MID0gXCJSdW5uaW5nLi4uPGJyIC8+JiMxNjA7XCI7XG5cdH1cbn07XG5cbnZhciBjb25maWcgPSBRVW5pdC5jb25maWcsXG5cdGNvbGxhcHNlTmV4dCA9IGZhbHNlLFxuXHRoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuXHRkZWZpbmVkID0ge1xuXHRcdGRvY3VtZW50OiB3aW5kb3cuZG9jdW1lbnQgIT09IHVuZGVmaW5lZCxcblx0XHRzZXNzaW9uU3RvcmFnZTogKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHggPSBcInF1bml0LXRlc3Qtc3RyaW5nXCI7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCB4LCB4ICk7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIHggKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0oKSlcblx0fSxcblx0bW9kdWxlc0xpc3QgPSBbXTtcblxuLyoqXG4qIEVzY2FwZSB0ZXh0IGZvciBhdHRyaWJ1dGUgb3IgdGV4dCBjb250ZW50LlxuKi9cbmZ1bmN0aW9uIGVzY2FwZVRleHQoIHMgKSB7XG5cdGlmICggIXMgKSB7XG5cdFx0cmV0dXJuIFwiXCI7XG5cdH1cblx0cyA9IHMgKyBcIlwiO1xuXG5cdC8vIEJvdGggc2luZ2xlIHF1b3RlcyBhbmQgZG91YmxlIHF1b3RlcyAoZm9yIGF0dHJpYnV0ZXMpXG5cdHJldHVybiBzLnJlcGxhY2UoIC9bJ1wiPD4mXS9nLCBmdW5jdGlvbiggcyApIHtcblx0XHRzd2l0Y2ggKCBzICkge1xuXHRcdGNhc2UgXCInXCI6XG5cdFx0XHRyZXR1cm4gXCImIzAzOTtcIjtcblx0XHRjYXNlIFwiXFxcIlwiOlxuXHRcdFx0cmV0dXJuIFwiJnF1b3Q7XCI7XG5cdFx0Y2FzZSBcIjxcIjpcblx0XHRcdHJldHVybiBcIiZsdDtcIjtcblx0XHRjYXNlIFwiPlwiOlxuXHRcdFx0cmV0dXJuIFwiJmd0O1wiO1xuXHRcdGNhc2UgXCImXCI6XG5cdFx0XHRyZXR1cm4gXCImYW1wO1wiO1xuXHRcdH1cblx0fSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbVxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cbmZ1bmN0aW9uIGFkZEV2ZW50KCBlbGVtLCB0eXBlLCBmbiApIHtcblx0aWYgKCBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgKSB7XG5cblx0XHQvLyBTdGFuZGFyZHMtYmFzZWQgYnJvd3NlcnNcblx0XHRlbGVtLmFkZEV2ZW50TGlzdGVuZXIoIHR5cGUsIGZuLCBmYWxzZSApO1xuXHR9IGVsc2UgaWYgKCBlbGVtLmF0dGFjaEV2ZW50ICkge1xuXG5cdFx0Ly8gc3VwcG9ydDogSUUgPDlcblx0XHRlbGVtLmF0dGFjaEV2ZW50KCBcIm9uXCIgKyB0eXBlLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudCA9IHdpbmRvdy5ldmVudDtcblx0XHRcdGlmICggIWV2ZW50LnRhcmdldCApIHtcblx0XHRcdFx0ZXZlbnQudGFyZ2V0ID0gZXZlbnQuc3JjRWxlbWVudCB8fCBkb2N1bWVudDtcblx0XHRcdH1cblxuXHRcdFx0Zm4uY2FsbCggZWxlbSwgZXZlbnQgKTtcblx0XHR9KTtcblx0fVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl8Tm9kZUxpc3R9IGVsZW1zXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuZnVuY3Rpb24gYWRkRXZlbnRzKCBlbGVtcywgdHlwZSwgZm4gKSB7XG5cdHZhciBpID0gZWxlbXMubGVuZ3RoO1xuXHR3aGlsZSAoIGktLSApIHtcblx0XHRhZGRFdmVudCggZWxlbXNbIGkgXSwgdHlwZSwgZm4gKTtcblx0fVxufVxuXG5mdW5jdGlvbiBoYXNDbGFzcyggZWxlbSwgbmFtZSApIHtcblx0cmV0dXJuICggXCIgXCIgKyBlbGVtLmNsYXNzTmFtZSArIFwiIFwiICkuaW5kZXhPZiggXCIgXCIgKyBuYW1lICsgXCIgXCIgKSA+PSAwO1xufVxuXG5mdW5jdGlvbiBhZGRDbGFzcyggZWxlbSwgbmFtZSApIHtcblx0aWYgKCAhaGFzQ2xhc3MoIGVsZW0sIG5hbWUgKSApIHtcblx0XHRlbGVtLmNsYXNzTmFtZSArPSAoIGVsZW0uY2xhc3NOYW1lID8gXCIgXCIgOiBcIlwiICkgKyBuYW1lO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUNsYXNzKCBlbGVtLCBuYW1lICkge1xuXHRpZiAoIGhhc0NsYXNzKCBlbGVtLCBuYW1lICkgKSB7XG5cdFx0cmVtb3ZlQ2xhc3MoIGVsZW0sIG5hbWUgKTtcblx0fSBlbHNlIHtcblx0XHRhZGRDbGFzcyggZWxlbSwgbmFtZSApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNsYXNzKCBlbGVtLCBuYW1lICkge1xuXHR2YXIgc2V0ID0gXCIgXCIgKyBlbGVtLmNsYXNzTmFtZSArIFwiIFwiO1xuXG5cdC8vIENsYXNzIG5hbWUgbWF5IGFwcGVhciBtdWx0aXBsZSB0aW1lc1xuXHR3aGlsZSAoIHNldC5pbmRleE9mKCBcIiBcIiArIG5hbWUgKyBcIiBcIiApID49IDAgKSB7XG5cdFx0c2V0ID0gc2V0LnJlcGxhY2UoIFwiIFwiICsgbmFtZSArIFwiIFwiLCBcIiBcIiApO1xuXHR9XG5cblx0Ly8gdHJpbSBmb3IgcHJldHRpbmVzc1xuXHRlbGVtLmNsYXNzTmFtZSA9IHR5cGVvZiBzZXQudHJpbSA9PT0gXCJmdW5jdGlvblwiID8gc2V0LnRyaW0oKSA6IHNldC5yZXBsYWNlKCAvXlxccyt8XFxzKyQvZywgXCJcIiApO1xufVxuXG5mdW5jdGlvbiBpZCggbmFtZSApIHtcblx0cmV0dXJuIGRlZmluZWQuZG9jdW1lbnQgJiYgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQgJiYgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIG5hbWUgKTtcbn1cblxuZnVuY3Rpb24gZ2V0VXJsQ29uZmlnSHRtbCgpIHtcblx0dmFyIGksIGosIHZhbCxcblx0XHRlc2NhcGVkLCBlc2NhcGVkVG9vbHRpcCxcblx0XHRzZWxlY3Rpb24gPSBmYWxzZSxcblx0XHRsZW4gPSBjb25maWcudXJsQ29uZmlnLmxlbmd0aCxcblx0XHR1cmxDb25maWdIdG1sID0gXCJcIjtcblxuXHRmb3IgKCBpID0gMDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdHZhbCA9IGNvbmZpZy51cmxDb25maWdbIGkgXTtcblx0XHRpZiAoIHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHR2YWwgPSB7XG5cdFx0XHRcdGlkOiB2YWwsXG5cdFx0XHRcdGxhYmVsOiB2YWxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0ZXNjYXBlZCA9IGVzY2FwZVRleHQoIHZhbC5pZCApO1xuXHRcdGVzY2FwZWRUb29sdGlwID0gZXNjYXBlVGV4dCggdmFsLnRvb2x0aXAgKTtcblxuXHRcdGlmICggY29uZmlnWyB2YWwuaWQgXSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0Y29uZmlnWyB2YWwuaWQgXSA9IFFVbml0LnVybFBhcmFtc1sgdmFsLmlkIF07XG5cdFx0fVxuXG5cdFx0aWYgKCAhdmFsLnZhbHVlIHx8IHR5cGVvZiB2YWwudmFsdWUgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPGlucHV0IGlkPSdxdW5pdC11cmxjb25maWctXCIgKyBlc2NhcGVkICtcblx0XHRcdFx0XCInIG5hbWU9J1wiICsgZXNjYXBlZCArIFwiJyB0eXBlPSdjaGVja2JveCdcIiArXG5cdFx0XHRcdCggdmFsLnZhbHVlID8gXCIgdmFsdWU9J1wiICsgZXNjYXBlVGV4dCggdmFsLnZhbHVlICkgKyBcIidcIiA6IFwiXCIgKSArXG5cdFx0XHRcdCggY29uZmlnWyB2YWwuaWQgXSA/IFwiIGNoZWNrZWQ9J2NoZWNrZWQnXCIgOiBcIlwiICkgK1xuXHRcdFx0XHRcIiB0aXRsZT0nXCIgKyBlc2NhcGVkVG9vbHRpcCArIFwiJyAvPjxsYWJlbCBmb3I9J3F1bml0LXVybGNvbmZpZy1cIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcIicgdGl0bGU9J1wiICsgZXNjYXBlZFRvb2x0aXAgKyBcIic+XCIgKyB2YWwubGFiZWwgKyBcIjwvbGFiZWw+XCI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8bGFiZWwgZm9yPSdxdW5pdC11cmxjb25maWctXCIgKyBlc2NhcGVkICtcblx0XHRcdFx0XCInIHRpdGxlPSdcIiArIGVzY2FwZWRUb29sdGlwICsgXCInPlwiICsgdmFsLmxhYmVsICtcblx0XHRcdFx0XCI6IDwvbGFiZWw+PHNlbGVjdCBpZD0ncXVuaXQtdXJsY29uZmlnLVwiICsgZXNjYXBlZCArXG5cdFx0XHRcdFwiJyBuYW1lPSdcIiArIGVzY2FwZWQgKyBcIicgdGl0bGU9J1wiICsgZXNjYXBlZFRvb2x0aXAgKyBcIic+PG9wdGlvbj48L29wdGlvbj5cIjtcblxuXHRcdFx0aWYgKCBRVW5pdC5pcyggXCJhcnJheVwiLCB2YWwudmFsdWUgKSApIHtcblx0XHRcdFx0Zm9yICggaiA9IDA7IGogPCB2YWwudmFsdWUubGVuZ3RoOyBqKysgKSB7XG5cdFx0XHRcdFx0ZXNjYXBlZCA9IGVzY2FwZVRleHQoIHZhbC52YWx1ZVsgaiBdICk7XG5cdFx0XHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxvcHRpb24gdmFsdWU9J1wiICsgZXNjYXBlZCArIFwiJ1wiICtcblx0XHRcdFx0XHRcdCggY29uZmlnWyB2YWwuaWQgXSA9PT0gdmFsLnZhbHVlWyBqIF0gP1xuXHRcdFx0XHRcdFx0XHQoIHNlbGVjdGlvbiA9IHRydWUgKSAmJiBcIiBzZWxlY3RlZD0nc2VsZWN0ZWQnXCIgOiBcIlwiICkgK1xuXHRcdFx0XHRcdFx0XCI+XCIgKyBlc2NhcGVkICsgXCI8L29wdGlvbj5cIjtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICggaiBpbiB2YWwudmFsdWUgKSB7XG5cdFx0XHRcdFx0aWYgKCBoYXNPd24uY2FsbCggdmFsLnZhbHVlLCBqICkgKSB7XG5cdFx0XHRcdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPG9wdGlvbiB2YWx1ZT0nXCIgKyBlc2NhcGVUZXh0KCBqICkgKyBcIidcIiArXG5cdFx0XHRcdFx0XHRcdCggY29uZmlnWyB2YWwuaWQgXSA9PT0gaiA/XG5cdFx0XHRcdFx0XHRcdFx0KCBzZWxlY3Rpb24gPSB0cnVlICkgJiYgXCIgc2VsZWN0ZWQ9J3NlbGVjdGVkJ1wiIDogXCJcIiApICtcblx0XHRcdFx0XHRcdFx0XCI+XCIgKyBlc2NhcGVUZXh0KCB2YWwudmFsdWVbIGogXSApICsgXCI8L29wdGlvbj5cIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICggY29uZmlnWyB2YWwuaWQgXSAmJiAhc2VsZWN0aW9uICkge1xuXHRcdFx0XHRlc2NhcGVkID0gZXNjYXBlVGV4dCggY29uZmlnWyB2YWwuaWQgXSApO1xuXHRcdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPG9wdGlvbiB2YWx1ZT0nXCIgKyBlc2NhcGVkICtcblx0XHRcdFx0XHRcIicgc2VsZWN0ZWQ9J3NlbGVjdGVkJyBkaXNhYmxlZD0nZGlzYWJsZWQnPlwiICsgZXNjYXBlZCArIFwiPC9vcHRpb24+XCI7XG5cdFx0XHR9XG5cdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPC9zZWxlY3Q+XCI7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHVybENvbmZpZ0h0bWw7XG59XG5cbi8vIEhhbmRsZSBcImNsaWNrXCIgZXZlbnRzIG9uIHRvb2xiYXIgY2hlY2tib3hlcyBhbmQgXCJjaGFuZ2VcIiBmb3Igc2VsZWN0IG1lbnVzLlxuLy8gVXBkYXRlcyB0aGUgVVJMIHdpdGggdGhlIG5ldyBzdGF0ZSBvZiBgY29uZmlnLnVybENvbmZpZ2AgdmFsdWVzLlxuZnVuY3Rpb24gdG9vbGJhckNoYW5nZWQoKSB7XG5cdHZhciB1cGRhdGVkVXJsLCB2YWx1ZSxcblx0XHRmaWVsZCA9IHRoaXMsXG5cdFx0cGFyYW1zID0ge307XG5cblx0Ly8gRGV0ZWN0IGlmIGZpZWxkIGlzIGEgc2VsZWN0IG1lbnUgb3IgYSBjaGVja2JveFxuXHRpZiAoIFwic2VsZWN0ZWRJbmRleFwiIGluIGZpZWxkICkge1xuXHRcdHZhbHVlID0gZmllbGQub3B0aW9uc1sgZmllbGQuc2VsZWN0ZWRJbmRleCBdLnZhbHVlIHx8IHVuZGVmaW5lZDtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IGZpZWxkLmNoZWNrZWQgPyAoIGZpZWxkLmRlZmF1bHRWYWx1ZSB8fCB0cnVlICkgOiB1bmRlZmluZWQ7XG5cdH1cblxuXHRwYXJhbXNbIGZpZWxkLm5hbWUgXSA9IHZhbHVlO1xuXHR1cGRhdGVkVXJsID0gc2V0VXJsKCBwYXJhbXMgKTtcblxuXHRpZiAoIFwiaGlkZXBhc3NlZFwiID09PSBmaWVsZC5uYW1lICYmIFwicmVwbGFjZVN0YXRlXCIgaW4gd2luZG93Lmhpc3RvcnkgKSB7XG5cdFx0Y29uZmlnWyBmaWVsZC5uYW1lIF0gPSB2YWx1ZSB8fCBmYWxzZTtcblx0XHRpZiAoIHZhbHVlICkge1xuXHRcdFx0YWRkQ2xhc3MoIGlkKCBcInF1bml0LXRlc3RzXCIgKSwgXCJoaWRlcGFzc1wiICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlbW92ZUNsYXNzKCBpZCggXCJxdW5pdC10ZXN0c1wiICksIFwiaGlkZXBhc3NcIiApO1xuXHRcdH1cblxuXHRcdC8vIEl0IGlzIG5vdCBuZWNlc3NhcnkgdG8gcmVmcmVzaCB0aGUgd2hvbGUgcGFnZVxuXHRcdHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSggbnVsbCwgXCJcIiwgdXBkYXRlZFVybCApO1xuXHR9IGVsc2Uge1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IHVwZGF0ZWRVcmw7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2V0VXJsKCBwYXJhbXMgKSB7XG5cdHZhciBrZXksXG5cdFx0cXVlcnlzdHJpbmcgPSBcIj9cIjtcblxuXHRwYXJhbXMgPSBRVW5pdC5leHRlbmQoIFFVbml0LmV4dGVuZCgge30sIFFVbml0LnVybFBhcmFtcyApLCBwYXJhbXMgKTtcblxuXHRmb3IgKCBrZXkgaW4gcGFyYW1zICkge1xuXHRcdGlmICggaGFzT3duLmNhbGwoIHBhcmFtcywga2V5ICkgKSB7XG5cdFx0XHRpZiAoIHBhcmFtc1sga2V5IF0gPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRxdWVyeXN0cmluZyArPSBlbmNvZGVVUklDb21wb25lbnQoIGtleSApO1xuXHRcdFx0aWYgKCBwYXJhbXNbIGtleSBdICE9PSB0cnVlICkge1xuXHRcdFx0XHRxdWVyeXN0cmluZyArPSBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCggcGFyYW1zWyBrZXkgXSApO1xuXHRcdFx0fVxuXHRcdFx0cXVlcnlzdHJpbmcgKz0gXCImXCI7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3QgK1xuXHRcdGxvY2F0aW9uLnBhdGhuYW1lICsgcXVlcnlzdHJpbmcuc2xpY2UoIDAsIC0xICk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5VXJsUGFyYW1zKCkge1xuXHR2YXIgc2VsZWN0ZWRNb2R1bGUsXG5cdFx0bW9kdWxlc0xpc3QgPSBpZCggXCJxdW5pdC1tb2R1bGVmaWx0ZXJcIiApLFxuXHRcdGZpbHRlciA9IGlkKCBcInF1bml0LWZpbHRlci1pbnB1dFwiICkudmFsdWU7XG5cblx0c2VsZWN0ZWRNb2R1bGUgPSBtb2R1bGVzTGlzdCA/XG5cdFx0ZGVjb2RlVVJJQ29tcG9uZW50KCBtb2R1bGVzTGlzdC5vcHRpb25zWyBtb2R1bGVzTGlzdC5zZWxlY3RlZEluZGV4IF0udmFsdWUgKSA6XG5cdFx0dW5kZWZpbmVkO1xuXG5cdHdpbmRvdy5sb2NhdGlvbiA9IHNldFVybCh7XG5cdFx0bW9kdWxlOiAoIHNlbGVjdGVkTW9kdWxlID09PSBcIlwiICkgPyB1bmRlZmluZWQgOiBzZWxlY3RlZE1vZHVsZSxcblx0XHRmaWx0ZXI6ICggZmlsdGVyID09PSBcIlwiICkgPyB1bmRlZmluZWQgOiBmaWx0ZXIsXG5cblx0XHQvLyBSZW1vdmUgdGVzdElkIGZpbHRlclxuXHRcdHRlc3RJZDogdW5kZWZpbmVkXG5cdH0pO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyVXJsQ29uZmlnQ29udGFpbmVyKCkge1xuXHR2YXIgdXJsQ29uZmlnQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJzcGFuXCIgKTtcblxuXHR1cmxDb25maWdDb250YWluZXIuaW5uZXJIVE1MID0gZ2V0VXJsQ29uZmlnSHRtbCgpO1xuXHRhZGRDbGFzcyggdXJsQ29uZmlnQ29udGFpbmVyLCBcInF1bml0LXVybC1jb25maWdcIiApO1xuXG5cdC8vIEZvciBvbGRJRSBzdXBwb3J0OlxuXHQvLyAqIEFkZCBoYW5kbGVycyB0byB0aGUgaW5kaXZpZHVhbCBlbGVtZW50cyBpbnN0ZWFkIG9mIHRoZSBjb250YWluZXJcblx0Ly8gKiBVc2UgXCJjbGlja1wiIGluc3RlYWQgb2YgXCJjaGFuZ2VcIiBmb3IgY2hlY2tib3hlc1xuXHRhZGRFdmVudHMoIHVybENvbmZpZ0NvbnRhaW5lci5nZXRFbGVtZW50c0J5VGFnTmFtZSggXCJpbnB1dFwiICksIFwiY2xpY2tcIiwgdG9vbGJhckNoYW5nZWQgKTtcblx0YWRkRXZlbnRzKCB1cmxDb25maWdDb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwic2VsZWN0XCIgKSwgXCJjaGFuZ2VcIiwgdG9vbGJhckNoYW5nZWQgKTtcblxuXHRyZXR1cm4gdXJsQ29uZmlnQ29udGFpbmVyO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyTG9vc2VGaWx0ZXIoKSB7XG5cdHZhciBmaWx0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImZvcm1cIiApLFxuXHRcdGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJsYWJlbFwiICksXG5cdFx0aW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImlucHV0XCIgKSxcblx0XHRidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImJ1dHRvblwiICk7XG5cblx0YWRkQ2xhc3MoIGZpbHRlciwgXCJxdW5pdC1maWx0ZXJcIiApO1xuXG5cdGxhYmVsLmlubmVySFRNTCA9IFwiRmlsdGVyOiBcIjtcblxuXHRpbnB1dC50eXBlID0gXCJ0ZXh0XCI7XG5cdGlucHV0LnZhbHVlID0gY29uZmlnLmZpbHRlciB8fCBcIlwiO1xuXHRpbnB1dC5uYW1lID0gXCJmaWx0ZXJcIjtcblx0aW5wdXQuaWQgPSBcInF1bml0LWZpbHRlci1pbnB1dFwiO1xuXG5cdGJ1dHRvbi5pbm5lckhUTUwgPSBcIkdvXCI7XG5cblx0bGFiZWwuYXBwZW5kQ2hpbGQoIGlucHV0ICk7XG5cblx0ZmlsdGVyLmFwcGVuZENoaWxkKCBsYWJlbCApO1xuXHRmaWx0ZXIuYXBwZW5kQ2hpbGQoIGJ1dHRvbiApO1xuXHRhZGRFdmVudCggZmlsdGVyLCBcInN1Ym1pdFwiLCBmdW5jdGlvbiggZXYgKSB7XG5cdFx0YXBwbHlVcmxQYXJhbXMoKTtcblxuXHRcdGlmICggZXYgJiYgZXYucHJldmVudERlZmF1bHQgKSB7XG5cdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSk7XG5cblx0cmV0dXJuIGZpbHRlcjtcbn1cblxuZnVuY3Rpb24gdG9vbGJhck1vZHVsZUZpbHRlckh0bWwoKSB7XG5cdHZhciBpLFxuXHRcdG1vZHVsZUZpbHRlckh0bWwgPSBcIlwiO1xuXG5cdGlmICggIW1vZHVsZXNMaXN0Lmxlbmd0aCApIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRtb2R1bGVzTGlzdC5zb3J0KGZ1bmN0aW9uKCBhLCBiICkge1xuXHRcdHJldHVybiBhLmxvY2FsZUNvbXBhcmUoIGIgKTtcblx0fSk7XG5cblx0bW9kdWxlRmlsdGVySHRtbCArPSBcIjxsYWJlbCBmb3I9J3F1bml0LW1vZHVsZWZpbHRlcic+TW9kdWxlOiA8L2xhYmVsPlwiICtcblx0XHRcIjxzZWxlY3QgaWQ9J3F1bml0LW1vZHVsZWZpbHRlcicgbmFtZT0nbW9kdWxlZmlsdGVyJz48b3B0aW9uIHZhbHVlPScnIFwiICtcblx0XHQoIFFVbml0LnVybFBhcmFtcy5tb2R1bGUgPT09IHVuZGVmaW5lZCA/IFwic2VsZWN0ZWQ9J3NlbGVjdGVkJ1wiIDogXCJcIiApICtcblx0XHRcIj48IEFsbCBNb2R1bGVzID48L29wdGlvbj5cIjtcblxuXHRmb3IgKCBpID0gMDsgaSA8IG1vZHVsZXNMaXN0Lmxlbmd0aDsgaSsrICkge1xuXHRcdG1vZHVsZUZpbHRlckh0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArXG5cdFx0XHRlc2NhcGVUZXh0KCBlbmNvZGVVUklDb21wb25lbnQoIG1vZHVsZXNMaXN0WyBpIF0gKSApICsgXCInIFwiICtcblx0XHRcdCggUVVuaXQudXJsUGFyYW1zLm1vZHVsZSA9PT0gbW9kdWxlc0xpc3RbIGkgXSA/IFwic2VsZWN0ZWQ9J3NlbGVjdGVkJ1wiIDogXCJcIiApICtcblx0XHRcdFwiPlwiICsgZXNjYXBlVGV4dCggbW9kdWxlc0xpc3RbIGkgXSApICsgXCI8L29wdGlvbj5cIjtcblx0fVxuXHRtb2R1bGVGaWx0ZXJIdG1sICs9IFwiPC9zZWxlY3Q+XCI7XG5cblx0cmV0dXJuIG1vZHVsZUZpbHRlckh0bWw7XG59XG5cbmZ1bmN0aW9uIHRvb2xiYXJNb2R1bGVGaWx0ZXIoKSB7XG5cdHZhciB0b29sYmFyID0gaWQoIFwicXVuaXQtdGVzdHJ1bm5lci10b29sYmFyXCIgKSxcblx0XHRtb2R1bGVGaWx0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInNwYW5cIiApLFxuXHRcdG1vZHVsZUZpbHRlckh0bWwgPSB0b29sYmFyTW9kdWxlRmlsdGVySHRtbCgpO1xuXG5cdGlmICggIXRvb2xiYXIgfHwgIW1vZHVsZUZpbHRlckh0bWwgKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0bW9kdWxlRmlsdGVyLnNldEF0dHJpYnV0ZSggXCJpZFwiLCBcInF1bml0LW1vZHVsZWZpbHRlci1jb250YWluZXJcIiApO1xuXHRtb2R1bGVGaWx0ZXIuaW5uZXJIVE1MID0gbW9kdWxlRmlsdGVySHRtbDtcblxuXHRhZGRFdmVudCggbW9kdWxlRmlsdGVyLmxhc3RDaGlsZCwgXCJjaGFuZ2VcIiwgYXBwbHlVcmxQYXJhbXMgKTtcblxuXHR0b29sYmFyLmFwcGVuZENoaWxkKCBtb2R1bGVGaWx0ZXIgKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kVG9vbGJhcigpIHtcblx0dmFyIHRvb2xiYXIgPSBpZCggXCJxdW5pdC10ZXN0cnVubmVyLXRvb2xiYXJcIiApO1xuXG5cdGlmICggdG9vbGJhciApIHtcblx0XHR0b29sYmFyLmFwcGVuZENoaWxkKCB0b29sYmFyVXJsQ29uZmlnQ29udGFpbmVyKCkgKTtcblx0XHR0b29sYmFyLmFwcGVuZENoaWxkKCB0b29sYmFyTG9vc2VGaWx0ZXIoKSApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZEhlYWRlcigpIHtcblx0dmFyIGhlYWRlciA9IGlkKCBcInF1bml0LWhlYWRlclwiICk7XG5cblx0aWYgKCBoZWFkZXIgKSB7XG5cdFx0aGVhZGVyLmlubmVySFRNTCA9IFwiPGEgaHJlZj0nXCIgK1xuXHRcdFx0ZXNjYXBlVGV4dCggc2V0VXJsKCB7IGZpbHRlcjogdW5kZWZpbmVkLCBtb2R1bGU6IHVuZGVmaW5lZCwgdGVzdElkOiB1bmRlZmluZWQgfSApICkgK1xuXHRcdFx0XCInPlwiICsgaGVhZGVyLmlubmVySFRNTCArIFwiPC9hPiBcIjtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRCYW5uZXIoKSB7XG5cdHZhciBiYW5uZXIgPSBpZCggXCJxdW5pdC1iYW5uZXJcIiApO1xuXG5cdGlmICggYmFubmVyICkge1xuXHRcdGJhbm5lci5jbGFzc05hbWUgPSBcIlwiO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRlc3RSZXN1bHRzKCkge1xuXHR2YXIgdGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICksXG5cdFx0cmVzdWx0ID0gaWQoIFwicXVuaXQtdGVzdHJlc3VsdFwiICk7XG5cblx0aWYgKCByZXN1bHQgKSB7XG5cdFx0cmVzdWx0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoIHJlc3VsdCApO1xuXHR9XG5cblx0aWYgKCB0ZXN0cyApIHtcblx0XHR0ZXN0cy5pbm5lckhUTUwgPSBcIlwiO1xuXHRcdHJlc3VsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwicFwiICk7XG5cdFx0cmVzdWx0LmlkID0gXCJxdW5pdC10ZXN0cmVzdWx0XCI7XG5cdFx0cmVzdWx0LmNsYXNzTmFtZSA9IFwicmVzdWx0XCI7XG5cdFx0dGVzdHMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoIHJlc3VsdCwgdGVzdHMgKTtcblx0XHRyZXN1bHQuaW5uZXJIVE1MID0gXCJSdW5uaW5nLi4uPGJyIC8+JiMxNjA7XCI7XG5cdH1cbn1cblxuZnVuY3Rpb24gc3RvcmVGaXh0dXJlKCkge1xuXHR2YXIgZml4dHVyZSA9IGlkKCBcInF1bml0LWZpeHR1cmVcIiApO1xuXHRpZiAoIGZpeHR1cmUgKSB7XG5cdFx0Y29uZmlnLmZpeHR1cmUgPSBmaXh0dXJlLmlubmVySFRNTDtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRGaWx0ZXJlZFRlc3QoKSB7XG5cdHZhciB0ZXN0SWQgPSBRVW5pdC5jb25maWcudGVzdElkO1xuXHRpZiAoICF0ZXN0SWQgfHwgdGVzdElkLmxlbmd0aCA8PSAwICkge1xuXHRcdHJldHVybiBcIlwiO1xuXHR9XG5cdHJldHVybiBcIjxkaXYgaWQ9J3F1bml0LWZpbHRlcmVkVGVzdCc+UmVydW5uaW5nIHNlbGVjdGVkIHRlc3RzOiBcIiArXG5cdFx0ZXNjYXBlVGV4dCggdGVzdElkLmpvaW4oXCIsIFwiKSApICtcblx0XHRcIiA8YSBpZD0ncXVuaXQtY2xlYXJGaWx0ZXInIGhyZWY9J1wiICtcblx0XHRlc2NhcGVUZXh0KCBzZXRVcmwoIHsgZmlsdGVyOiB1bmRlZmluZWQsIG1vZHVsZTogdW5kZWZpbmVkLCB0ZXN0SWQ6IHVuZGVmaW5lZCB9ICkgKSArXG5cdFx0XCInPlwiICsgXCJSdW4gYWxsIHRlc3RzXCIgKyBcIjwvYT48L2Rpdj5cIjtcbn1cblxuZnVuY3Rpb24gYXBwZW5kVXNlckFnZW50KCkge1xuXHR2YXIgdXNlckFnZW50ID0gaWQoIFwicXVuaXQtdXNlckFnZW50XCIgKTtcblxuXHRpZiAoIHVzZXJBZ2VudCApIHtcblx0XHR1c2VyQWdlbnQuaW5uZXJIVE1MID0gXCJcIjtcblx0XHR1c2VyQWdlbnQuYXBwZW5kQ2hpbGQoXG5cdFx0XHRkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcblx0XHRcdFx0XCJRVW5pdCBcIiArIFFVbml0LnZlcnNpb24gKyBcIjsgXCIgKyBuYXZpZ2F0b3IudXNlckFnZW50XG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRUZXN0c0xpc3QoIG1vZHVsZXMgKSB7XG5cdHZhciBpLCBsLCB4LCB6LCB0ZXN0LCBtb2R1bGVPYmo7XG5cblx0Zm9yICggaSA9IDAsIGwgPSBtb2R1bGVzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRtb2R1bGVPYmogPSBtb2R1bGVzWyBpIF07XG5cblx0XHRpZiAoIG1vZHVsZU9iai5uYW1lICkge1xuXHRcdFx0bW9kdWxlc0xpc3QucHVzaCggbW9kdWxlT2JqLm5hbWUgKTtcblx0XHR9XG5cblx0XHRmb3IgKCB4ID0gMCwgeiA9IG1vZHVsZU9iai50ZXN0cy5sZW5ndGg7IHggPCB6OyB4KysgKSB7XG5cdFx0XHR0ZXN0ID0gbW9kdWxlT2JqLnRlc3RzWyB4IF07XG5cblx0XHRcdGFwcGVuZFRlc3QoIHRlc3QubmFtZSwgdGVzdC50ZXN0SWQsIG1vZHVsZU9iai5uYW1lICk7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRlc3QoIG5hbWUsIHRlc3RJZCwgbW9kdWxlTmFtZSApIHtcblx0dmFyIHRpdGxlLCByZXJ1blRyaWdnZXIsIHRlc3RCbG9jaywgYXNzZXJ0TGlzdCxcblx0XHR0ZXN0cyA9IGlkKCBcInF1bml0LXRlc3RzXCIgKTtcblxuXHRpZiAoICF0ZXN0cyApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwic3Ryb25nXCIgKTtcblx0dGl0bGUuaW5uZXJIVE1MID0gZ2V0TmFtZUh0bWwoIG5hbWUsIG1vZHVsZU5hbWUgKTtcblxuXHRyZXJ1blRyaWdnZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImFcIiApO1xuXHRyZXJ1blRyaWdnZXIuaW5uZXJIVE1MID0gXCJSZXJ1blwiO1xuXHRyZXJ1blRyaWdnZXIuaHJlZiA9IHNldFVybCh7IHRlc3RJZDogdGVzdElkIH0pO1xuXG5cdHRlc3RCbG9jayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwibGlcIiApO1xuXHR0ZXN0QmxvY2suYXBwZW5kQ2hpbGQoIHRpdGxlICk7XG5cdHRlc3RCbG9jay5hcHBlbmRDaGlsZCggcmVydW5UcmlnZ2VyICk7XG5cdHRlc3RCbG9jay5pZCA9IFwicXVuaXQtdGVzdC1vdXRwdXQtXCIgKyB0ZXN0SWQ7XG5cblx0YXNzZXJ0TGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwib2xcIiApO1xuXHRhc3NlcnRMaXN0LmNsYXNzTmFtZSA9IFwicXVuaXQtYXNzZXJ0LWxpc3RcIjtcblxuXHR0ZXN0QmxvY2suYXBwZW5kQ2hpbGQoIGFzc2VydExpc3QgKTtcblxuXHR0ZXN0cy5hcHBlbmRDaGlsZCggdGVzdEJsb2NrICk7XG59XG5cbi8vIEhUTUwgUmVwb3J0ZXIgaW5pdGlhbGl6YXRpb24gYW5kIGxvYWRcblFVbml0LmJlZ2luKGZ1bmN0aW9uKCBkZXRhaWxzICkge1xuXHR2YXIgcXVuaXQgPSBpZCggXCJxdW5pdFwiICk7XG5cblx0Ly8gRml4dHVyZSBpcyB0aGUgb25seSBvbmUgbmVjZXNzYXJ5IHRvIHJ1biB3aXRob3V0IHRoZSAjcXVuaXQgZWxlbWVudFxuXHRzdG9yZUZpeHR1cmUoKTtcblxuXHRpZiAoIHF1bml0ICkge1xuXHRcdHF1bml0LmlubmVySFRNTCA9XG5cdFx0XHRcIjxoMSBpZD0ncXVuaXQtaGVhZGVyJz5cIiArIGVzY2FwZVRleHQoIGRvY3VtZW50LnRpdGxlICkgKyBcIjwvaDE+XCIgK1xuXHRcdFx0XCI8aDIgaWQ9J3F1bml0LWJhbm5lcic+PC9oMj5cIiArXG5cdFx0XHRcIjxkaXYgaWQ9J3F1bml0LXRlc3RydW5uZXItdG9vbGJhcic+PC9kaXY+XCIgK1xuXHRcdFx0YXBwZW5kRmlsdGVyZWRUZXN0KCkgK1xuXHRcdFx0XCI8aDIgaWQ9J3F1bml0LXVzZXJBZ2VudCc+PC9oMj5cIiArXG5cdFx0XHRcIjxvbCBpZD0ncXVuaXQtdGVzdHMnPjwvb2w+XCI7XG5cdH1cblxuXHRhcHBlbmRIZWFkZXIoKTtcblx0YXBwZW5kQmFubmVyKCk7XG5cdGFwcGVuZFRlc3RSZXN1bHRzKCk7XG5cdGFwcGVuZFVzZXJBZ2VudCgpO1xuXHRhcHBlbmRUb29sYmFyKCk7XG5cdGFwcGVuZFRlc3RzTGlzdCggZGV0YWlscy5tb2R1bGVzICk7XG5cdHRvb2xiYXJNb2R1bGVGaWx0ZXIoKTtcblxuXHRpZiAoIHF1bml0ICYmIGNvbmZpZy5oaWRlcGFzc2VkICkge1xuXHRcdGFkZENsYXNzKCBxdW5pdC5sYXN0Q2hpbGQsIFwiaGlkZXBhc3NcIiApO1xuXHR9XG59KTtcblxuUVVuaXQuZG9uZShmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIGksIGtleSxcblx0XHRiYW5uZXIgPSBpZCggXCJxdW5pdC1iYW5uZXJcIiApLFxuXHRcdHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApLFxuXHRcdGh0bWwgPSBbXG5cdFx0XHRcIlRlc3RzIGNvbXBsZXRlZCBpbiBcIixcblx0XHRcdGRldGFpbHMucnVudGltZSxcblx0XHRcdFwiIG1pbGxpc2Vjb25kcy48YnIgLz5cIixcblx0XHRcdFwiPHNwYW4gY2xhc3M9J3Bhc3NlZCc+XCIsXG5cdFx0XHRkZXRhaWxzLnBhc3NlZCxcblx0XHRcdFwiPC9zcGFuPiBhc3NlcnRpb25zIG9mIDxzcGFuIGNsYXNzPSd0b3RhbCc+XCIsXG5cdFx0XHRkZXRhaWxzLnRvdGFsLFxuXHRcdFx0XCI8L3NwYW4+IHBhc3NlZCwgPHNwYW4gY2xhc3M9J2ZhaWxlZCc+XCIsXG5cdFx0XHRkZXRhaWxzLmZhaWxlZCxcblx0XHRcdFwiPC9zcGFuPiBmYWlsZWQuXCJcblx0XHRdLmpvaW4oIFwiXCIgKTtcblxuXHRpZiAoIGJhbm5lciApIHtcblx0XHRiYW5uZXIuY2xhc3NOYW1lID0gZGV0YWlscy5mYWlsZWQgPyBcInF1bml0LWZhaWxcIiA6IFwicXVuaXQtcGFzc1wiO1xuXHR9XG5cblx0aWYgKCB0ZXN0cyApIHtcblx0XHRpZCggXCJxdW5pdC10ZXN0cmVzdWx0XCIgKS5pbm5lckhUTUwgPSBodG1sO1xuXHR9XG5cblx0aWYgKCBjb25maWcuYWx0ZXJ0aXRsZSAmJiBkZWZpbmVkLmRvY3VtZW50ICYmIGRvY3VtZW50LnRpdGxlICkge1xuXG5cdFx0Ly8gc2hvdyDinJYgZm9yIGdvb2QsIOKclCBmb3IgYmFkIHN1aXRlIHJlc3VsdCBpbiB0aXRsZVxuXHRcdC8vIHVzZSBlc2NhcGUgc2VxdWVuY2VzIGluIGNhc2UgZmlsZSBnZXRzIGxvYWRlZCB3aXRoIG5vbi11dGYtOC1jaGFyc2V0XG5cdFx0ZG9jdW1lbnQudGl0bGUgPSBbXG5cdFx0XHQoIGRldGFpbHMuZmFpbGVkID8gXCJcXHUyNzE2XCIgOiBcIlxcdTI3MTRcIiApLFxuXHRcdFx0ZG9jdW1lbnQudGl0bGUucmVwbGFjZSggL15bXFx1MjcxNFxcdTI3MTZdIC9pLCBcIlwiIClcblx0XHRdLmpvaW4oIFwiIFwiICk7XG5cdH1cblxuXHQvLyBjbGVhciBvd24gc2Vzc2lvblN0b3JhZ2UgaXRlbXMgaWYgYWxsIHRlc3RzIHBhc3NlZFxuXHRpZiAoIGNvbmZpZy5yZW9yZGVyICYmIGRlZmluZWQuc2Vzc2lvblN0b3JhZ2UgJiYgZGV0YWlscy5mYWlsZWQgPT09IDAgKSB7XG5cdFx0Zm9yICggaSA9IDA7IGkgPCBzZXNzaW9uU3RvcmFnZS5sZW5ndGg7IGkrKyApIHtcblx0XHRcdGtleSA9IHNlc3Npb25TdG9yYWdlLmtleSggaSsrICk7XG5cdFx0XHRpZiAoIGtleS5pbmRleE9mKCBcInF1bml0LXRlc3QtXCIgKSA9PT0gMCApIHtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSgga2V5ICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gc2Nyb2xsIGJhY2sgdG8gdG9wIHRvIHNob3cgcmVzdWx0c1xuXHRpZiAoIGNvbmZpZy5zY3JvbGx0b3AgJiYgd2luZG93LnNjcm9sbFRvICkge1xuXHRcdHdpbmRvdy5zY3JvbGxUbyggMCwgMCApO1xuXHR9XG59KTtcblxuZnVuY3Rpb24gZ2V0TmFtZUh0bWwoIG5hbWUsIG1vZHVsZSApIHtcblx0dmFyIG5hbWVIdG1sID0gXCJcIjtcblxuXHRpZiAoIG1vZHVsZSApIHtcblx0XHRuYW1lSHRtbCA9IFwiPHNwYW4gY2xhc3M9J21vZHVsZS1uYW1lJz5cIiArIGVzY2FwZVRleHQoIG1vZHVsZSApICsgXCI8L3NwYW4+OiBcIjtcblx0fVxuXG5cdG5hbWVIdG1sICs9IFwiPHNwYW4gY2xhc3M9J3Rlc3QtbmFtZSc+XCIgKyBlc2NhcGVUZXh0KCBuYW1lICkgKyBcIjwvc3Bhbj5cIjtcblxuXHRyZXR1cm4gbmFtZUh0bWw7XG59XG5cblFVbml0LnRlc3RTdGFydChmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIHJ1bm5pbmcsIHRlc3RCbG9jaywgYmFkO1xuXG5cdHRlc3RCbG9jayA9IGlkKCBcInF1bml0LXRlc3Qtb3V0cHV0LVwiICsgZGV0YWlscy50ZXN0SWQgKTtcblx0aWYgKCB0ZXN0QmxvY2sgKSB7XG5cdFx0dGVzdEJsb2NrLmNsYXNzTmFtZSA9IFwicnVubmluZ1wiO1xuXHR9IGVsc2Uge1xuXG5cdFx0Ly8gUmVwb3J0IGxhdGVyIHJlZ2lzdGVyZWQgdGVzdHNcblx0XHRhcHBlbmRUZXN0KCBkZXRhaWxzLm5hbWUsIGRldGFpbHMudGVzdElkLCBkZXRhaWxzLm1vZHVsZSApO1xuXHR9XG5cblx0cnVubmluZyA9IGlkKCBcInF1bml0LXRlc3RyZXN1bHRcIiApO1xuXHRpZiAoIHJ1bm5pbmcgKSB7XG5cdFx0YmFkID0gUVVuaXQuY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSAmJlxuXHRcdFx0K3Nlc3Npb25TdG9yYWdlLmdldEl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIGRldGFpbHMubW9kdWxlICsgXCItXCIgKyBkZXRhaWxzLm5hbWUgKTtcblxuXHRcdHJ1bm5pbmcuaW5uZXJIVE1MID0gKCBiYWQgP1xuXHRcdFx0XCJSZXJ1bm5pbmcgcHJldmlvdXNseSBmYWlsZWQgdGVzdDogPGJyIC8+XCIgOlxuXHRcdFx0XCJSdW5uaW5nOiA8YnIgLz5cIiApICtcblx0XHRcdGdldE5hbWVIdG1sKCBkZXRhaWxzLm5hbWUsIGRldGFpbHMubW9kdWxlICk7XG5cdH1cblxufSk7XG5cbmZ1bmN0aW9uIHN0cmlwSHRtbCggc3RyaW5nICkge1xuXHQvLyBzdHJpcCB0YWdzLCBodG1sIGVudGl0eSBhbmQgd2hpdGVzcGFjZXNcblx0cmV0dXJuIHN0cmluZy5yZXBsYWNlKC88XFwvP1tePl0rKD58JCkvZywgXCJcIikucmVwbGFjZSgvXFwmcXVvdDsvZywgXCJcIikucmVwbGFjZSgvXFxzKy9nLCBcIlwiKTtcbn1cblxuUVVuaXQubG9nKGZ1bmN0aW9uKCBkZXRhaWxzICkge1xuXHR2YXIgYXNzZXJ0TGlzdCwgYXNzZXJ0TGksXG5cdFx0bWVzc2FnZSwgZXhwZWN0ZWQsIGFjdHVhbCwgZGlmZixcblx0XHRzaG93RGlmZiA9IGZhbHNlLFxuXHRcdHRlc3RJdGVtID0gaWQoIFwicXVuaXQtdGVzdC1vdXRwdXQtXCIgKyBkZXRhaWxzLnRlc3RJZCApO1xuXG5cdGlmICggIXRlc3RJdGVtICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdG1lc3NhZ2UgPSBlc2NhcGVUZXh0KCBkZXRhaWxzLm1lc3NhZ2UgKSB8fCAoIGRldGFpbHMucmVzdWx0ID8gXCJva2F5XCIgOiBcImZhaWxlZFwiICk7XG5cdG1lc3NhZ2UgPSBcIjxzcGFuIGNsYXNzPSd0ZXN0LW1lc3NhZ2UnPlwiICsgbWVzc2FnZSArIFwiPC9zcGFuPlwiO1xuXHRtZXNzYWdlICs9IFwiPHNwYW4gY2xhc3M9J3J1bnRpbWUnPkAgXCIgKyBkZXRhaWxzLnJ1bnRpbWUgKyBcIiBtczwvc3Bhbj5cIjtcblxuXHQvLyBwdXNoRmFpbHVyZSBkb2Vzbid0IHByb3ZpZGUgZGV0YWlscy5leHBlY3RlZFxuXHQvLyB3aGVuIGl0IGNhbGxzLCBpdCdzIGltcGxpY2l0IHRvIGFsc28gbm90IHNob3cgZXhwZWN0ZWQgYW5kIGRpZmYgc3R1ZmZcblx0Ly8gQWxzbywgd2UgbmVlZCB0byBjaGVjayBkZXRhaWxzLmV4cGVjdGVkIGV4aXN0ZW5jZSwgYXMgaXQgY2FuIGV4aXN0IGFuZCBiZSB1bmRlZmluZWRcblx0aWYgKCAhZGV0YWlscy5yZXN1bHQgJiYgaGFzT3duLmNhbGwoIGRldGFpbHMsIFwiZXhwZWN0ZWRcIiApICkge1xuXHRcdGlmICggZGV0YWlscy5uZWdhdGl2ZSApIHtcblx0XHRcdGV4cGVjdGVkID0gZXNjYXBlVGV4dCggXCJOT1QgXCIgKyBRVW5pdC5kdW1wLnBhcnNlKCBkZXRhaWxzLmV4cGVjdGVkICkgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXhwZWN0ZWQgPSBlc2NhcGVUZXh0KCBRVW5pdC5kdW1wLnBhcnNlKCBkZXRhaWxzLmV4cGVjdGVkICkgKTtcblx0XHR9XG5cblx0XHRhY3R1YWwgPSBlc2NhcGVUZXh0KCBRVW5pdC5kdW1wLnBhcnNlKCBkZXRhaWxzLmFjdHVhbCApICk7XG5cdFx0bWVzc2FnZSArPSBcIjx0YWJsZT48dHIgY2xhc3M9J3Rlc3QtZXhwZWN0ZWQnPjx0aD5FeHBlY3RlZDogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRleHBlY3RlZCArXG5cdFx0XHRcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblxuXHRcdGlmICggYWN0dWFsICE9PSBleHBlY3RlZCApIHtcblxuXHRcdFx0bWVzc2FnZSArPSBcIjx0ciBjbGFzcz0ndGVzdC1hY3R1YWwnPjx0aD5SZXN1bHQ6IDwvdGg+PHRkPjxwcmU+XCIgK1xuXHRcdFx0XHRhY3R1YWwgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblxuXHRcdFx0Ly8gRG9uJ3Qgc2hvdyBkaWZmIGlmIGFjdHVhbCBvciBleHBlY3RlZCBhcmUgYm9vbGVhbnNcblx0XHRcdGlmICggISggL14odHJ1ZXxmYWxzZSkkLy50ZXN0KCBhY3R1YWwgKSApICYmXG5cdFx0XHRcdFx0ISggL14odHJ1ZXxmYWxzZSkkLy50ZXN0KCBleHBlY3RlZCApICkgKSB7XG5cdFx0XHRcdGRpZmYgPSBRVW5pdC5kaWZmKCBleHBlY3RlZCwgYWN0dWFsICk7XG5cdFx0XHRcdHNob3dEaWZmID0gc3RyaXBIdG1sKCBkaWZmICkubGVuZ3RoICE9PVxuXHRcdFx0XHRcdHN0cmlwSHRtbCggZXhwZWN0ZWQgKS5sZW5ndGggK1xuXHRcdFx0XHRcdHN0cmlwSHRtbCggYWN0dWFsICkubGVuZ3RoO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEb24ndCBzaG93IGRpZmYgaWYgZXhwZWN0ZWQgYW5kIGFjdHVhbCBhcmUgdG90YWxseSBkaWZmZXJlbnRcblx0XHRcdGlmICggc2hvd0RpZmYgKSB7XG5cdFx0XHRcdG1lc3NhZ2UgKz0gXCI8dHIgY2xhc3M9J3Rlc3QtZGlmZic+PHRoPkRpZmY6IDwvdGg+PHRkPjxwcmU+XCIgK1xuXHRcdFx0XHRcdGRpZmYgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZC5pbmRleE9mKCBcIltvYmplY3QgQXJyYXldXCIgKSAhPT0gLTEgfHxcblx0XHRcdFx0ZXhwZWN0ZWQuaW5kZXhPZiggXCJbb2JqZWN0IE9iamVjdF1cIiApICE9PSAtMSApIHtcblx0XHRcdG1lc3NhZ2UgKz0gXCI8dHIgY2xhc3M9J3Rlc3QtbWVzc2FnZSc+PHRoPk1lc3NhZ2U6IDwvdGg+PHRkPlwiICtcblx0XHRcdFx0XCJEaWZmIHN1cHByZXNzZWQgYXMgdGhlIGRlcHRoIG9mIG9iamVjdCBpcyBtb3JlIHRoYW4gY3VycmVudCBtYXggZGVwdGggKFwiICtcblx0XHRcdFx0UVVuaXQuY29uZmlnLm1heERlcHRoICsgXCIpLjxwPkhpbnQ6IFVzZSA8Y29kZT5RVW5pdC5kdW1wLm1heERlcHRoPC9jb2RlPiB0byBcIiArXG5cdFx0XHRcdFwiIHJ1biB3aXRoIGEgaGlnaGVyIG1heCBkZXB0aCBvciA8YSBocmVmPSdcIiArXG5cdFx0XHRcdGVzY2FwZVRleHQoIHNldFVybCggeyBtYXhEZXB0aDogLTEgfSApICkgKyBcIic+XCIgK1xuXHRcdFx0XHRcIlJlcnVuPC9hPiB3aXRob3V0IG1heCBkZXB0aC48L3A+PC90ZD48L3RyPlwiO1xuXHRcdH1cblxuXHRcdGlmICggZGV0YWlscy5zb3VyY2UgKSB7XG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LXNvdXJjZSc+PHRoPlNvdXJjZTogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRcdGVzY2FwZVRleHQoIGRldGFpbHMuc291cmNlICkgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblx0XHR9XG5cblx0XHRtZXNzYWdlICs9IFwiPC90YWJsZT5cIjtcblxuXHQvLyB0aGlzIG9jY3VycyB3aGVuIHB1c2hGYWlsdXJlIGlzIHNldCBhbmQgd2UgaGF2ZSBhbiBleHRyYWN0ZWQgc3RhY2sgdHJhY2Vcblx0fSBlbHNlIGlmICggIWRldGFpbHMucmVzdWx0ICYmIGRldGFpbHMuc291cmNlICkge1xuXHRcdG1lc3NhZ2UgKz0gXCI8dGFibGU+XCIgK1xuXHRcdFx0XCI8dHIgY2xhc3M9J3Rlc3Qtc291cmNlJz48dGg+U291cmNlOiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdGVzY2FwZVRleHQoIGRldGFpbHMuc291cmNlICkgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIiArXG5cdFx0XHRcIjwvdGFibGU+XCI7XG5cdH1cblxuXHRhc3NlcnRMaXN0ID0gdGVzdEl0ZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwib2xcIiApWyAwIF07XG5cblx0YXNzZXJ0TGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImxpXCIgKTtcblx0YXNzZXJ0TGkuY2xhc3NOYW1lID0gZGV0YWlscy5yZXN1bHQgPyBcInBhc3NcIiA6IFwiZmFpbFwiO1xuXHRhc3NlcnRMaS5pbm5lckhUTUwgPSBtZXNzYWdlO1xuXHRhc3NlcnRMaXN0LmFwcGVuZENoaWxkKCBhc3NlcnRMaSApO1xufSk7XG5cblFVbml0LnRlc3REb25lKGZ1bmN0aW9uKCBkZXRhaWxzICkge1xuXHR2YXIgdGVzdFRpdGxlLCB0aW1lLCB0ZXN0SXRlbSwgYXNzZXJ0TGlzdCxcblx0XHRnb29kLCBiYWQsIHRlc3RDb3VudHMsIHNraXBwZWQsIHNvdXJjZU5hbWUsXG5cdFx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cblx0aWYgKCAhdGVzdHMgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGVzdEl0ZW0gPSBpZCggXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIGRldGFpbHMudGVzdElkICk7XG5cblx0YXNzZXJ0TGlzdCA9IHRlc3RJdGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcIm9sXCIgKVsgMCBdO1xuXG5cdGdvb2QgPSBkZXRhaWxzLnBhc3NlZDtcblx0YmFkID0gZGV0YWlscy5mYWlsZWQ7XG5cblx0Ly8gc3RvcmUgcmVzdWx0IHdoZW4gcG9zc2libGVcblx0aWYgKCBjb25maWcucmVvcmRlciAmJiBkZWZpbmVkLnNlc3Npb25TdG9yYWdlICkge1xuXHRcdGlmICggYmFkICkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSggXCJxdW5pdC10ZXN0LVwiICsgZGV0YWlscy5tb2R1bGUgKyBcIi1cIiArIGRldGFpbHMubmFtZSwgYmFkICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIGRldGFpbHMubW9kdWxlICsgXCItXCIgKyBkZXRhaWxzLm5hbWUgKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIGJhZCA9PT0gMCApIHtcblxuXHRcdC8vIENvbGxhcHNlIHRoZSBwYXNzaW5nIHRlc3RzXG5cdFx0YWRkQ2xhc3MoIGFzc2VydExpc3QsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0fSBlbHNlIGlmICggYmFkICYmIGNvbmZpZy5jb2xsYXBzZSAmJiAhY29sbGFwc2VOZXh0ICkge1xuXG5cdFx0Ly8gU2tpcCBjb2xsYXBzaW5nIHRoZSBmaXJzdCBmYWlsaW5nIHRlc3Rcblx0XHRjb2xsYXBzZU5leHQgPSB0cnVlO1xuXHR9IGVsc2Uge1xuXG5cdFx0Ly8gQ29sbGFwc2UgcmVtYWluaW5nIHRlc3RzXG5cdFx0YWRkQ2xhc3MoIGFzc2VydExpc3QsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0fVxuXG5cdC8vIHRlc3RJdGVtLmZpcnN0Q2hpbGQgaXMgdGhlIHRlc3QgbmFtZVxuXHR0ZXN0VGl0bGUgPSB0ZXN0SXRlbS5maXJzdENoaWxkO1xuXG5cdHRlc3RDb3VudHMgPSBiYWQgP1xuXHRcdFwiPGIgY2xhc3M9J2ZhaWxlZCc+XCIgKyBiYWQgKyBcIjwvYj4sIFwiICsgXCI8YiBjbGFzcz0ncGFzc2VkJz5cIiArIGdvb2QgKyBcIjwvYj4sIFwiIDpcblx0XHRcIlwiO1xuXG5cdHRlc3RUaXRsZS5pbm5lckhUTUwgKz0gXCIgPGIgY2xhc3M9J2NvdW50cyc+KFwiICsgdGVzdENvdW50cyArXG5cdFx0ZGV0YWlscy5hc3NlcnRpb25zLmxlbmd0aCArIFwiKTwvYj5cIjtcblxuXHRpZiAoIGRldGFpbHMuc2tpcHBlZCApIHtcblx0XHR0ZXN0SXRlbS5jbGFzc05hbWUgPSBcInNraXBwZWRcIjtcblx0XHRza2lwcGVkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJlbVwiICk7XG5cdFx0c2tpcHBlZC5jbGFzc05hbWUgPSBcInF1bml0LXNraXBwZWQtbGFiZWxcIjtcblx0XHRza2lwcGVkLmlubmVySFRNTCA9IFwic2tpcHBlZFwiO1xuXHRcdHRlc3RJdGVtLmluc2VydEJlZm9yZSggc2tpcHBlZCwgdGVzdFRpdGxlICk7XG5cdH0gZWxzZSB7XG5cdFx0YWRkRXZlbnQoIHRlc3RUaXRsZSwgXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHRvZ2dsZUNsYXNzKCBhc3NlcnRMaXN0LCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdFx0fSk7XG5cblx0XHR0ZXN0SXRlbS5jbGFzc05hbWUgPSBiYWQgPyBcImZhaWxcIiA6IFwicGFzc1wiO1xuXG5cdFx0dGltZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwic3BhblwiICk7XG5cdFx0dGltZS5jbGFzc05hbWUgPSBcInJ1bnRpbWVcIjtcblx0XHR0aW1lLmlubmVySFRNTCA9IGRldGFpbHMucnVudGltZSArIFwiIG1zXCI7XG5cdFx0dGVzdEl0ZW0uaW5zZXJ0QmVmb3JlKCB0aW1lLCBhc3NlcnRMaXN0ICk7XG5cdH1cblxuXHQvLyBTaG93IHRoZSBzb3VyY2Ugb2YgdGhlIHRlc3Qgd2hlbiBzaG93aW5nIGFzc2VydGlvbnNcblx0aWYgKCBkZXRhaWxzLnNvdXJjZSApIHtcblx0XHRzb3VyY2VOYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJwXCIgKTtcblx0XHRzb3VyY2VOYW1lLmlubmVySFRNTCA9IFwiPHN0cm9uZz5Tb3VyY2U6IDwvc3Ryb25nPlwiICsgZGV0YWlscy5zb3VyY2U7XG5cdFx0YWRkQ2xhc3MoIHNvdXJjZU5hbWUsIFwicXVuaXQtc291cmNlXCIgKTtcblx0XHRpZiAoIGJhZCA9PT0gMCApIHtcblx0XHRcdGFkZENsYXNzKCBzb3VyY2VOYW1lLCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdFx0fVxuXHRcdGFkZEV2ZW50KCB0ZXN0VGl0bGUsIFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR0b2dnbGVDbGFzcyggc291cmNlTmFtZSwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHRcdH0pO1xuXHRcdHRlc3RJdGVtLmFwcGVuZENoaWxkKCBzb3VyY2VOYW1lICk7XG5cdH1cbn0pO1xuXG5pZiAoIGRlZmluZWQuZG9jdW1lbnQgKSB7XG5cblx0Ly8gQXZvaWQgcmVhZHlTdGF0ZSBpc3N1ZSB3aXRoIHBoYW50b21qc1xuXHQvLyBSZWY6ICM4MThcblx0dmFyIG5vdFBoYW50b20gPSAoIGZ1bmN0aW9uKCBwICkge1xuXHRcdHJldHVybiAhKCBwICYmIHAudmVyc2lvbiAmJiBwLnZlcnNpb24ubWFqb3IgPiAwICk7XG5cdH0gKSggd2luZG93LnBoYW50b20gKTtcblxuXHRpZiAoIG5vdFBoYW50b20gJiYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiICkge1xuXHRcdFFVbml0LmxvYWQoKTtcblx0fSBlbHNlIHtcblx0XHRhZGRFdmVudCggd2luZG93LCBcImxvYWRcIiwgUVVuaXQubG9hZCApO1xuXHR9XG59IGVsc2Uge1xuXHRjb25maWcucGFnZUxvYWRlZCA9IHRydWU7XG5cdGNvbmZpZy5hdXRvcnVuID0gdHJ1ZTtcbn1cblxufSkoKTtcbiIsImNvbnN0IHNlYXJjaENvbXBvbmVudCA9IGZ1bmN0aW9uIHNlYXJjaENvbXBvbmVudCAoKXtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHRlbXBsYXRlKCl7XG4gICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICAgIDxmb3JtPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwic2VhcmNoXCI+V2hhdCBkaWQgeW91IGVhdCB0b2RheSA/PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJzZWFyY2hcIiBwbGFjZWhvbGRlcj1cIlRhY29zLCBjb2ZmZWUsIGJhbm5hbmEsIC4uLlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImJ1dHRvblwiIHZhbHVlPVwiU2VhcmNoXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9mb3JtPmA7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdCgpe1xuICAgICAgICAgICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgcm9vdC5jbGFzc0xpc3QuYWRkKCdyb290Jyk7XG4gICAgICAgICAgICByb290LmlubmVySFRNTCA9IHRoaXMudGVtcGxhdGUoKTtcblxuICAgICAgICAgICAgdGhpcy5mcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQocm9vdCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJ1dHRvbiA9IHRoaXMuZnJhZ21lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1idXR0b25dJyk7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hGaWVsZCA9IHRoaXMuZnJhZ21lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbbmFtZT1zZWFyY2hdJyk7XG5cbiAgICAgICAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuXG4gICAgICAgICAgICAgICAgd2luZG93LmNvbnNvbGUubG9nKGUsIHNlYXJjaEZpZWxkLnZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVuZGVyKGNvbnRhaW5lcil7XG4gICAgICAgICAgICBpZih0aGlzLmZyYWdtZW50ICYmIGNvbnRhaW5lciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KXtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5mcmFnbWVudC5xdWVyeVNlbGVjdG9yKCcucm9vdCA+IConKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5leHBvcnQgZGVmYXVsdCBzZWFyY2hDb21wb25lbnQ7XG4iLCJpbXBvcnQgUVVuaXQgZnJvbSAncXVuaXRqcyc7XG5pbXBvcnQgc2VhcmNoQ29tcG9uZW50IGZyb20gJy4uLy4uL3NyYy9jb21wb25lbnRzL3NlYXJjaC5qcyc7XG5cblFVbml0Lm1vZHVsZSgnQVBJJyk7XG5cblFVbml0LnRlc3QoJ2ZhY3RvcnknLCBhc3NlcnQgPT4ge1xuICAgIGFzc2VydC5lcXVhbCggdHlwZW9mIHNlYXJjaENvbXBvbmVudCwgJ2Z1bmN0aW9uJywgJ1RoZSBjb21wb25lbnQgbW9kdWxlIGV4cG9zZSBhIGZ1bmN0aW9uJyk7XG4gICAgYXNzZXJ0LmVxdWFsKCB0eXBlb2Ygc2VhcmNoQ29tcG9uZW50KCksICdvYmplY3QnLCAnVGhlIGNvbXBvbmVudCBmYWN0b3J5IGNyZWF0ZXMgYW4gb2JqZWN0Jyk7XG4gICAgYXNzZXJ0Lm5vdERlZXBFcXVhbChzZWFyY2hDb21wb25lbnQoKSwgc2VhcmNoQ29tcG9uZW50KCksICdUaGUgY29tcG9uZW50IGZhY3RvcnkgY3JlYXRlcyBuZXcgb2JqZWN0cycpO1xufSk7XG5cblFVbml0LnRlc3QoJ2NvbXBvbmVudCcsIGFzc2VydCA9PiB7XG4gICAgdmFyIGNvbXBvbmVudCA9IHNlYXJjaENvbXBvbmVudCgpO1xuICAgIGFzc2VydC5lcXVhbCggdHlwZW9mIGNvbXBvbmVudC5pbml0LCAnZnVuY3Rpb24nLCAnVGhlIGNvbXBvbmVudCBleHBvc2VzIGFuIGluaXQgbWV0aG9kJyk7XG4gICAgYXNzZXJ0LmVxdWFsKCB0eXBlb2YgY29tcG9uZW50LnJlbmRlciwgJ2Z1bmN0aW9uJywgJ1RoZSBjb21wb25lbnQgZXhwb3NlcyBhIHJlbmRlciBtZXRob2QnKTtcbn0pO1xuIl19
