(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * QUnit 1.21.0
 * https://qunitjs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2016-02-01T13:07Z
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
	var i, current;
	var urlParams = {};
	var location = window.location;
	var params = location.search.slice( 1 ).split( "&" );
	var length = params.length;

	if ( params[ 0 ] ) {
		for ( i = 0; i < length; i++ ) {
			current = params[ i ].split( "=" );
			current[ 0 ] = decodeURIComponent( current[ 0 ] );

			// allow just a key to turn on a flag, e.g., test.html?noglobals
			current[ 1 ] = current[ 1 ] ? decodeURIComponent( current[ 1 ] ) : true;
			if ( urlParams[ current[ 0 ] ] ) {
				urlParams[ current[ 0 ] ] = [].concat( urlParams[ current[ 0 ] ], current[ 1 ] );
			} else {
				urlParams[ current[ 0 ] ] = current[ 1 ];
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
QUnit.version = "1.21.0";

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

	push: function( result, actual, expected, message, negative ) {
		var source,
			details = {
				module: this.module.name,
				name: this.testName,
				result: result,
				message: message,
				actual: actual,
				expected: expected,
				testId: this.testId,
				negative: negative || false,
				runtime: now() - this.started
			};

		if ( !result ) {
			source = sourceFromStacktrace();

			if ( source ) {
				details.source = source;
			}
		}

		runLoggingCallbacks( "log", details );

		this.assertions.push({
			result: !!result,
			message: message
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
	push: function( /* result, actual, expected, message, negative */ ) {
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
		return assert.test.push.apply( assert.test, arguments );
	},

	ok: function( result, message ) {
		message = message || ( result ? "okay" : "failed, expected argument to be truthy, was: " +
			QUnit.dump.parse( result ) );
		this.push( !!result, result, true, message );
	},

	notOk: function( result, message ) {
		message = message || ( !result ? "okay" : "failed, expected argument to be falsy, was: " +
			QUnit.dump.parse( result ) );
		this.push( !result, result, false, message );
	},

	equal: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.push( expected == actual, actual, expected, message );
	},

	notEqual: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.push( expected != actual, actual, expected, message, true );
	},

	propEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.push( QUnit.equiv( actual, expected ), actual, expected, message );
	},

	notPropEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.push( !QUnit.equiv( actual, expected ), actual, expected, message, true );
	},

	deepEqual: function( actual, expected, message ) {
		this.push( QUnit.equiv( actual, expected ), actual, expected, message );
	},

	notDeepEqual: function( actual, expected, message ) {
		this.push( !QUnit.equiv( actual, expected ), actual, expected, message, true );
	},

	strictEqual: function( actual, expected, message ) {
		this.push( expected === actual, actual, expected, message );
	},

	notStrictEqual: function( actual, expected, message ) {
		this.push( expected !== actual, actual, expected, message, true );
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

		currentTest.assert.push( ok, actual, expectedOutput, message );
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

// For browser, export only select globals
if ( defined.document ) {

	// Deprecated
	// Extend assert methods to QUnit and Global scope through Backwards compatibility
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
			setUrl({ filter: undefined, module: undefined, testId: undefined }) +
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
	return "<div id='qunit-filteredTest'>Rerunning selected tests: " + testId.join(", ") +
		" <a id='qunit-clearFilter' href='" +
		setUrl({ filter: undefined, module: undefined, testId: undefined }) +
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
				" run with a higher max depth or <a href='" + setUrl({ maxDepth: -1 }) + "'>" +
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

            searchField.style.borderColor = 'red';

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
    assert.ok(true, 'a useful test');
});

},{"../../src/components/search.js":2,"qunitjs":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcXVuaXRqcy9xdW5pdC9xdW5pdC5qcyIsInB1YmxpYy9qcy9zcmMvY29tcG9uZW50cy9zZWFyY2guanMiLCJwdWJsaWMvanMvdGVzdC9jb21wb25lbnRzL3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQzdoSUEsSUFBTSxrQkFBa0IsU0FBUyxlQUFULEdBQTJCOztBQUUvQyxXQUFPO0FBQ0gsc0NBQVU7QUFDTiwrV0FETTtTQURQO0FBWUgsOEJBQU07QUFDRixnQkFBTSxPQUFPLFNBQVMsYUFBVCxDQUF1QixLQUF2QixDQUFQLENBREo7QUFFRixpQkFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixNQUFuQixFQUZFO0FBR0YsaUJBQUssU0FBTCxHQUFpQixLQUFLLFFBQUwsRUFBakIsQ0FIRTs7QUFLRixpQkFBSyxRQUFMLEdBQWdCLFNBQVMsc0JBQVQsRUFBaEIsQ0FMRTtBQU1GLGlCQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTBCLElBQTFCLEVBTkU7O0FBUUYsZ0JBQU0sU0FBUyxLQUFLLFFBQUwsQ0FBYyxhQUFkLENBQTRCLG9CQUE1QixDQUFULENBUko7QUFTRixnQkFBTSxjQUFjLEtBQUssUUFBTCxDQUFjLGFBQWQsQ0FBNEIsb0JBQTVCLENBQWQsQ0FUSjs7QUFXRixtQkFBTyxnQkFBUCxDQUF3QixPQUF4QixFQUFpQyxhQUFLOztBQUVsQyx1QkFBTyxPQUFQLENBQWUsR0FBZixDQUFtQixDQUFuQixFQUFzQixZQUFZLEtBQVosQ0FBdEIsQ0FGa0M7YUFBTCxDQUFqQyxDQVhFOztBQWdCRix3QkFBWSxLQUFaLENBQWtCLFdBQWxCLEdBQWdDLEtBQWhDLENBaEJFOztBQWtCRixtQkFBTyxJQUFQLENBbEJFO1NBWkg7QUFpQ0gsZ0NBQU8sV0FBVTtBQUNiLGdCQUFHLEtBQUssUUFBTCxJQUFpQixxQkFBcUIsV0FBckIsRUFBaUM7QUFDakQsMEJBQVUsV0FBVixDQUFzQixLQUFLLFFBQUwsQ0FBYyxhQUFkLENBQTRCLFdBQTVCLENBQXRCLEVBRGlEO2FBQXJEO0FBR0EsbUJBQU8sSUFBUCxDQUphO1NBakNkO0tBQVAsQ0FGK0M7Q0FBM0I7O2tCQTRDVDs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN6Q2Ysa0JBQU0sTUFBTixDQUFhLEtBQWI7O0FBRUEsa0JBQU0sSUFBTixDQUFXLFNBQVgsRUFBc0Isa0JBQVU7QUFDNUIsV0FBTyxLQUFQLG9GQUFzQyxVQUF0QyxFQUFrRCx3Q0FBbEQsRUFENEI7QUFFNUIsV0FBTyxLQUFQLFNBQXFCLHdCQUFyQixFQUF3QyxRQUF4QyxFQUFrRCx5Q0FBbEQsRUFGNEI7QUFHNUIsV0FBTyxZQUFQLENBQW9CLHVCQUFwQixFQUF1Qyx1QkFBdkMsRUFBMEQsMkNBQTFELEVBSDRCO0NBQVYsQ0FBdEI7O0FBTUEsa0JBQU0sSUFBTixDQUFXLFdBQVgsRUFBd0Isa0JBQVU7QUFDOUIsUUFBSSxZQUFZLHVCQUFaLENBRDBCO0FBRTlCLFdBQU8sS0FBUCxTQUFxQixVQUFVLElBQVYsQ0FBckIsRUFBcUMsVUFBckMsRUFBaUQsc0NBQWpELEVBRjhCO0FBRzlCLFdBQU8sS0FBUCxTQUFxQixVQUFVLE1BQVYsQ0FBckIsRUFBdUMsVUFBdkMsRUFBbUQsdUNBQW5ELEVBSDhCO0FBSTlCLFdBQU8sRUFBUCxDQUFXLElBQVgsRUFBaUIsZUFBakIsRUFKOEI7Q0FBVixDQUF4QiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiFcbiAqIFFVbml0IDEuMjEuMFxuICogaHR0cHM6Ly9xdW5pdGpzLmNvbS9cbiAqXG4gKiBDb3B5cmlnaHQgalF1ZXJ5IEZvdW5kYXRpb24gYW5kIG90aGVyIGNvbnRyaWJ1dG9yc1xuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL2pxdWVyeS5vcmcvbGljZW5zZVxuICpcbiAqIERhdGU6IDIwMTYtMDItMDFUMTM6MDdaXG4gKi9cblxuKGZ1bmN0aW9uKCBnbG9iYWwgKSB7XG5cbnZhciBRVW5pdCA9IHt9O1xuXG52YXIgRGF0ZSA9IGdsb2JhbC5EYXRlO1xudmFyIG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG59O1xuXG52YXIgc2V0VGltZW91dCA9IGdsb2JhbC5zZXRUaW1lb3V0O1xudmFyIGNsZWFyVGltZW91dCA9IGdsb2JhbC5jbGVhclRpbWVvdXQ7XG5cbi8vIFN0b3JlIGEgbG9jYWwgd2luZG93IGZyb20gdGhlIGdsb2JhbCB0byBhbGxvdyBkaXJlY3QgcmVmZXJlbmNlcy5cbnZhciB3aW5kb3cgPSBnbG9iYWwud2luZG93O1xuXG52YXIgZGVmaW5lZCA9IHtcblx0ZG9jdW1lbnQ6IHdpbmRvdyAmJiB3aW5kb3cuZG9jdW1lbnQgIT09IHVuZGVmaW5lZCxcblx0c2V0VGltZW91dDogc2V0VGltZW91dCAhPT0gdW5kZWZpbmVkLFxuXHRzZXNzaW9uU3RvcmFnZTogKGZ1bmN0aW9uKCkge1xuXHRcdHZhciB4ID0gXCJxdW5pdC10ZXN0LXN0cmluZ1wiO1xuXHRcdHRyeSB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCB4LCB4ICk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCB4ICk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH0oKSApXG59O1xuXG52YXIgZmlsZU5hbWUgPSAoIHNvdXJjZUZyb21TdGFja3RyYWNlKCAwICkgfHwgXCJcIiApLnJlcGxhY2UoIC8oOlxcZCspK1xcKT8vLCBcIlwiICkucmVwbGFjZSggLy4rXFwvLywgXCJcIiApO1xudmFyIGdsb2JhbFN0YXJ0Q2FsbGVkID0gZmFsc2U7XG52YXIgcnVuU3RhcnRlZCA9IGZhbHNlO1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuXHRoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyByZXR1cm5zIGEgbmV3IEFycmF5IHdpdGggdGhlIGVsZW1lbnRzIHRoYXQgYXJlIGluIGEgYnV0IG5vdCBpbiBiXG5mdW5jdGlvbiBkaWZmKCBhLCBiICkge1xuXHR2YXIgaSwgaixcblx0XHRyZXN1bHQgPSBhLnNsaWNlKCk7XG5cblx0Zm9yICggaSA9IDA7IGkgPCByZXN1bHQubGVuZ3RoOyBpKysgKSB7XG5cdFx0Zm9yICggaiA9IDA7IGogPCBiLmxlbmd0aDsgaisrICkge1xuXHRcdFx0aWYgKCByZXN1bHRbIGkgXSA9PT0gYlsgaiBdICkge1xuXHRcdFx0XHRyZXN1bHQuc3BsaWNlKCBpLCAxICk7XG5cdFx0XHRcdGktLTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbi8vIGZyb20ganF1ZXJ5LmpzXG5mdW5jdGlvbiBpbkFycmF5KCBlbGVtLCBhcnJheSApIHtcblx0aWYgKCBhcnJheS5pbmRleE9mICkge1xuXHRcdHJldHVybiBhcnJheS5pbmRleE9mKCBlbGVtICk7XG5cdH1cblxuXHRmb3IgKCB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdGlmICggYXJyYXlbIGkgXSA9PT0gZWxlbSApIHtcblx0XHRcdHJldHVybiBpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBNYWtlcyBhIGNsb25lIG9mIGFuIG9iamVjdCB1c2luZyBvbmx5IEFycmF5IG9yIE9iamVjdCBhcyBiYXNlLFxuICogYW5kIGNvcGllcyBvdmVyIHRoZSBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3IG9iamVjdCB3aXRoIG9ubHkgdGhlIG93biBwcm9wZXJ0aWVzIChyZWN1cnNpdmVseSkuXG4gKi9cbmZ1bmN0aW9uIG9iamVjdFZhbHVlcyAoIG9iaiApIHtcblx0dmFyIGtleSwgdmFsLFxuXHRcdHZhbHMgPSBRVW5pdC5pcyggXCJhcnJheVwiLCBvYmogKSA/IFtdIDoge307XG5cdGZvciAoIGtleSBpbiBvYmogKSB7XG5cdFx0aWYgKCBoYXNPd24uY2FsbCggb2JqLCBrZXkgKSApIHtcblx0XHRcdHZhbCA9IG9ialsga2V5IF07XG5cdFx0XHR2YWxzWyBrZXkgXSA9IHZhbCA9PT0gT2JqZWN0KCB2YWwgKSA/IG9iamVjdFZhbHVlcyggdmFsICkgOiB2YWw7XG5cdFx0fVxuXHR9XG5cdHJldHVybiB2YWxzO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoIGEsIGIsIHVuZGVmT25seSApIHtcblx0Zm9yICggdmFyIHByb3AgaW4gYiApIHtcblx0XHRpZiAoIGhhc093bi5jYWxsKCBiLCBwcm9wICkgKSB7XG5cblx0XHRcdC8vIEF2b2lkIFwiTWVtYmVyIG5vdCBmb3VuZFwiIGVycm9yIGluIElFOCBjYXVzZWQgYnkgbWVzc2luZyB3aXRoIHdpbmRvdy5jb25zdHJ1Y3RvclxuXHRcdFx0Ly8gVGhpcyBibG9jayBydW5zIG9uIGV2ZXJ5IGVudmlyb25tZW50LCBzbyBgZ2xvYmFsYCBpcyBiZWluZyB1c2VkIGluc3RlYWQgb2YgYHdpbmRvd2Bcblx0XHRcdC8vIHRvIGF2b2lkIGVycm9ycyBvbiBub2RlLlxuXHRcdFx0aWYgKCBwcm9wICE9PSBcImNvbnN0cnVjdG9yXCIgfHwgYSAhPT0gZ2xvYmFsICkge1xuXHRcdFx0XHRpZiAoIGJbIHByb3AgXSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdGRlbGV0ZSBhWyBwcm9wIF07XG5cdFx0XHRcdH0gZWxzZSBpZiAoICEoIHVuZGVmT25seSAmJiB0eXBlb2YgYVsgcHJvcCBdICE9PSBcInVuZGVmaW5lZFwiICkgKSB7XG5cdFx0XHRcdFx0YVsgcHJvcCBdID0gYlsgcHJvcCBdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGE7XG59XG5cbmZ1bmN0aW9uIG9iamVjdFR5cGUoIG9iaiApIHtcblx0aWYgKCB0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdHJldHVybiBcInVuZGVmaW5lZFwiO1xuXHR9XG5cblx0Ly8gQ29uc2lkZXI6IHR5cGVvZiBudWxsID09PSBvYmplY3Rcblx0aWYgKCBvYmogPT09IG51bGwgKSB7XG5cdFx0cmV0dXJuIFwibnVsbFwiO1xuXHR9XG5cblx0dmFyIG1hdGNoID0gdG9TdHJpbmcuY2FsbCggb2JqICkubWF0Y2goIC9eXFxbb2JqZWN0XFxzKC4qKVxcXSQvICksXG5cdFx0dHlwZSA9IG1hdGNoICYmIG1hdGNoWyAxIF07XG5cblx0c3dpdGNoICggdHlwZSApIHtcblx0XHRjYXNlIFwiTnVtYmVyXCI6XG5cdFx0XHRpZiAoIGlzTmFOKCBvYmogKSApIHtcblx0XHRcdFx0cmV0dXJuIFwibmFuXCI7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gXCJudW1iZXJcIjtcblx0XHRjYXNlIFwiU3RyaW5nXCI6XG5cdFx0Y2FzZSBcIkJvb2xlYW5cIjpcblx0XHRjYXNlIFwiQXJyYXlcIjpcblx0XHRjYXNlIFwiU2V0XCI6XG5cdFx0Y2FzZSBcIk1hcFwiOlxuXHRcdGNhc2UgXCJEYXRlXCI6XG5cdFx0Y2FzZSBcIlJlZ0V4cFwiOlxuXHRcdGNhc2UgXCJGdW5jdGlvblwiOlxuXHRcdGNhc2UgXCJTeW1ib2xcIjpcblx0XHRcdHJldHVybiB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdH1cblx0aWYgKCB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICkge1xuXHRcdHJldHVybiBcIm9iamVjdFwiO1xuXHR9XG59XG5cbi8vIFNhZmUgb2JqZWN0IHR5cGUgY2hlY2tpbmdcbmZ1bmN0aW9uIGlzKCB0eXBlLCBvYmogKSB7XG5cdHJldHVybiBRVW5pdC5vYmplY3RUeXBlKCBvYmogKSA9PT0gdHlwZTtcbn1cblxudmFyIGdldFVybFBhcmFtcyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaSwgY3VycmVudDtcblx0dmFyIHVybFBhcmFtcyA9IHt9O1xuXHR2YXIgbG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XG5cdHZhciBwYXJhbXMgPSBsb2NhdGlvbi5zZWFyY2guc2xpY2UoIDEgKS5zcGxpdCggXCImXCIgKTtcblx0dmFyIGxlbmd0aCA9IHBhcmFtcy5sZW5ndGg7XG5cblx0aWYgKCBwYXJhbXNbIDAgXSApIHtcblx0XHRmb3IgKCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0Y3VycmVudCA9IHBhcmFtc1sgaSBdLnNwbGl0KCBcIj1cIiApO1xuXHRcdFx0Y3VycmVudFsgMCBdID0gZGVjb2RlVVJJQ29tcG9uZW50KCBjdXJyZW50WyAwIF0gKTtcblxuXHRcdFx0Ly8gYWxsb3cganVzdCBhIGtleSB0byB0dXJuIG9uIGEgZmxhZywgZS5nLiwgdGVzdC5odG1sP25vZ2xvYmFsc1xuXHRcdFx0Y3VycmVudFsgMSBdID0gY3VycmVudFsgMSBdID8gZGVjb2RlVVJJQ29tcG9uZW50KCBjdXJyZW50WyAxIF0gKSA6IHRydWU7XG5cdFx0XHRpZiAoIHVybFBhcmFtc1sgY3VycmVudFsgMCBdIF0gKSB7XG5cdFx0XHRcdHVybFBhcmFtc1sgY3VycmVudFsgMCBdIF0gPSBbXS5jb25jYXQoIHVybFBhcmFtc1sgY3VycmVudFsgMCBdIF0sIGN1cnJlbnRbIDEgXSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dXJsUGFyYW1zWyBjdXJyZW50WyAwIF0gXSA9IGN1cnJlbnRbIDEgXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdXJsUGFyYW1zO1xufTtcblxuLy8gRG9lc24ndCBzdXBwb3J0IElFNiB0byBJRTksIGl0IHdpbGwgcmV0dXJuIHVuZGVmaW5lZCBvbiB0aGVzZSBicm93c2Vyc1xuLy8gU2VlIGFsc28gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRXJyb3IvU3RhY2tcbmZ1bmN0aW9uIGV4dHJhY3RTdGFja3RyYWNlKCBlLCBvZmZzZXQgKSB7XG5cdG9mZnNldCA9IG9mZnNldCA9PT0gdW5kZWZpbmVkID8gNCA6IG9mZnNldDtcblxuXHR2YXIgc3RhY2ssIGluY2x1ZGUsIGk7XG5cblx0aWYgKCBlLnN0YWNrICkge1xuXHRcdHN0YWNrID0gZS5zdGFjay5zcGxpdCggXCJcXG5cIiApO1xuXHRcdGlmICggL15lcnJvciQvaS50ZXN0KCBzdGFja1sgMCBdICkgKSB7XG5cdFx0XHRzdGFjay5zaGlmdCgpO1xuXHRcdH1cblx0XHRpZiAoIGZpbGVOYW1lICkge1xuXHRcdFx0aW5jbHVkZSA9IFtdO1xuXHRcdFx0Zm9yICggaSA9IG9mZnNldDsgaSA8IHN0YWNrLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIHN0YWNrWyBpIF0uaW5kZXhPZiggZmlsZU5hbWUgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0aW5jbHVkZS5wdXNoKCBzdGFja1sgaSBdICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGluY2x1ZGUubGVuZ3RoICkge1xuXHRcdFx0XHRyZXR1cm4gaW5jbHVkZS5qb2luKCBcIlxcblwiICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBzdGFja1sgb2Zmc2V0IF07XG5cblx0Ly8gU3VwcG9ydDogU2FmYXJpIDw9NiBvbmx5XG5cdH0gZWxzZSBpZiAoIGUuc291cmNlVVJMICkge1xuXG5cdFx0Ly8gZXhjbHVkZSB1c2VsZXNzIHNlbGYtcmVmZXJlbmNlIGZvciBnZW5lcmF0ZWQgRXJyb3Igb2JqZWN0c1xuXHRcdGlmICggL3F1bml0LmpzJC8udGVzdCggZS5zb3VyY2VVUkwgKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBmb3IgYWN0dWFsIGV4Y2VwdGlvbnMsIHRoaXMgaXMgdXNlZnVsXG5cdFx0cmV0dXJuIGUuc291cmNlVVJMICsgXCI6XCIgKyBlLmxpbmU7XG5cdH1cbn1cblxuZnVuY3Rpb24gc291cmNlRnJvbVN0YWNrdHJhY2UoIG9mZnNldCApIHtcblx0dmFyIGVycm9yID0gbmV3IEVycm9yKCk7XG5cblx0Ly8gU3VwcG9ydDogU2FmYXJpIDw9NyBvbmx5LCBJRSA8PTEwIC0gMTEgb25seVxuXHQvLyBOb3QgYWxsIGJyb3dzZXJzIGdlbmVyYXRlIHRoZSBgc3RhY2tgIHByb3BlcnR5IGZvciBgbmV3IEVycm9yKClgLCBzZWUgYWxzbyAjNjM2XG5cdGlmICggIWVycm9yLnN0YWNrICkge1xuXHRcdHRyeSB7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9IGNhdGNoICggZXJyICkge1xuXHRcdFx0ZXJyb3IgPSBlcnI7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGV4dHJhY3RTdGFja3RyYWNlKCBlcnJvciwgb2Zmc2V0ICk7XG59XG5cbi8qKlxuICogQ29uZmlnIG9iamVjdDogTWFpbnRhaW4gaW50ZXJuYWwgc3RhdGVcbiAqIExhdGVyIGV4cG9zZWQgYXMgUVVuaXQuY29uZmlnXG4gKiBgY29uZmlnYCBpbml0aWFsaXplZCBhdCB0b3Agb2Ygc2NvcGVcbiAqL1xudmFyIGNvbmZpZyA9IHtcblx0Ly8gVGhlIHF1ZXVlIG9mIHRlc3RzIHRvIHJ1blxuXHRxdWV1ZTogW10sXG5cblx0Ly8gYmxvY2sgdW50aWwgZG9jdW1lbnQgcmVhZHlcblx0YmxvY2tpbmc6IHRydWUsXG5cblx0Ly8gYnkgZGVmYXVsdCwgcnVuIHByZXZpb3VzbHkgZmFpbGVkIHRlc3RzIGZpcnN0XG5cdC8vIHZlcnkgdXNlZnVsIGluIGNvbWJpbmF0aW9uIHdpdGggXCJIaWRlIHBhc3NlZCB0ZXN0c1wiIGNoZWNrZWRcblx0cmVvcmRlcjogdHJ1ZSxcblxuXHQvLyBieSBkZWZhdWx0LCBtb2RpZnkgZG9jdW1lbnQudGl0bGUgd2hlbiBzdWl0ZSBpcyBkb25lXG5cdGFsdGVydGl0bGU6IHRydWUsXG5cblx0Ly8gSFRNTCBSZXBvcnRlcjogY29sbGFwc2UgZXZlcnkgdGVzdCBleGNlcHQgdGhlIGZpcnN0IGZhaWxpbmcgdGVzdFxuXHQvLyBJZiBmYWxzZSwgYWxsIGZhaWxpbmcgdGVzdHMgd2lsbCBiZSBleHBhbmRlZFxuXHRjb2xsYXBzZTogdHJ1ZSxcblxuXHQvLyBieSBkZWZhdWx0LCBzY3JvbGwgdG8gdG9wIG9mIHRoZSBwYWdlIHdoZW4gc3VpdGUgaXMgZG9uZVxuXHRzY3JvbGx0b3A6IHRydWUsXG5cblx0Ly8gZGVwdGggdXAtdG8gd2hpY2ggb2JqZWN0IHdpbGwgYmUgZHVtcGVkXG5cdG1heERlcHRoOiA1LFxuXG5cdC8vIHdoZW4gZW5hYmxlZCwgYWxsIHRlc3RzIG11c3QgY2FsbCBleHBlY3QoKVxuXHRyZXF1aXJlRXhwZWN0czogZmFsc2UsXG5cblx0Ly8gYWRkIGNoZWNrYm94ZXMgdGhhdCBhcmUgcGVyc2lzdGVkIGluIHRoZSBxdWVyeS1zdHJpbmdcblx0Ly8gd2hlbiBlbmFibGVkLCB0aGUgaWQgaXMgc2V0IHRvIGB0cnVlYCBhcyBhIGBRVW5pdC5jb25maWdgIHByb3BlcnR5XG5cdHVybENvbmZpZzogW1xuXHRcdHtcblx0XHRcdGlkOiBcImhpZGVwYXNzZWRcIixcblx0XHRcdGxhYmVsOiBcIkhpZGUgcGFzc2VkIHRlc3RzXCIsXG5cdFx0XHR0b29sdGlwOiBcIk9ubHkgc2hvdyB0ZXN0cyBhbmQgYXNzZXJ0aW9ucyB0aGF0IGZhaWwuIFN0b3JlZCBhcyBxdWVyeS1zdHJpbmdzLlwiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRpZDogXCJub2dsb2JhbHNcIixcblx0XHRcdGxhYmVsOiBcIkNoZWNrIGZvciBHbG9iYWxzXCIsXG5cdFx0XHR0b29sdGlwOiBcIkVuYWJsaW5nIHRoaXMgd2lsbCB0ZXN0IGlmIGFueSB0ZXN0IGludHJvZHVjZXMgbmV3IHByb3BlcnRpZXMgb24gdGhlIFwiICtcblx0XHRcdFx0XCJnbG9iYWwgb2JqZWN0IChgd2luZG93YCBpbiBCcm93c2VycykuIFN0b3JlZCBhcyBxdWVyeS1zdHJpbmdzLlwiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRpZDogXCJub3RyeWNhdGNoXCIsXG5cdFx0XHRsYWJlbDogXCJObyB0cnktY2F0Y2hcIixcblx0XHRcdHRvb2x0aXA6IFwiRW5hYmxpbmcgdGhpcyB3aWxsIHJ1biB0ZXN0cyBvdXRzaWRlIG9mIGEgdHJ5LWNhdGNoIGJsb2NrLiBNYWtlcyBkZWJ1Z2dpbmcgXCIgK1xuXHRcdFx0XHRcImV4Y2VwdGlvbnMgaW4gSUUgcmVhc29uYWJsZS4gU3RvcmVkIGFzIHF1ZXJ5LXN0cmluZ3MuXCJcblx0XHR9XG5cdF0sXG5cblx0Ly8gU2V0IG9mIGFsbCBtb2R1bGVzLlxuXHRtb2R1bGVzOiBbXSxcblxuXHQvLyBTdGFjayBvZiBuZXN0ZWQgbW9kdWxlc1xuXHRtb2R1bGVTdGFjazogW10sXG5cblx0Ly8gVGhlIGZpcnN0IHVubmFtZWQgbW9kdWxlXG5cdGN1cnJlbnRNb2R1bGU6IHtcblx0XHRuYW1lOiBcIlwiLFxuXHRcdHRlc3RzOiBbXVxuXHR9LFxuXG5cdGNhbGxiYWNrczoge31cbn07XG5cbnZhciB1cmxQYXJhbXMgPSBkZWZpbmVkLmRvY3VtZW50ID8gZ2V0VXJsUGFyYW1zKCkgOiB7fTtcblxuLy8gUHVzaCBhIGxvb3NlIHVubmFtZWQgbW9kdWxlIHRvIHRoZSBtb2R1bGVzIGNvbGxlY3Rpb25cbmNvbmZpZy5tb2R1bGVzLnB1c2goIGNvbmZpZy5jdXJyZW50TW9kdWxlICk7XG5cbmlmICggdXJsUGFyYW1zLmZpbHRlciA9PT0gdHJ1ZSApIHtcblx0ZGVsZXRlIHVybFBhcmFtcy5maWx0ZXI7XG59XG5cbi8vIFN0cmluZyBzZWFyY2ggYW55d2hlcmUgaW4gbW9kdWxlTmFtZSt0ZXN0TmFtZVxuY29uZmlnLmZpbHRlciA9IHVybFBhcmFtcy5maWx0ZXI7XG5cbmNvbmZpZy50ZXN0SWQgPSBbXTtcbmlmICggdXJsUGFyYW1zLnRlc3RJZCApIHtcblx0Ly8gRW5zdXJlIHRoYXQgdXJsUGFyYW1zLnRlc3RJZCBpcyBhbiBhcnJheVxuXHR1cmxQYXJhbXMudGVzdElkID0gZGVjb2RlVVJJQ29tcG9uZW50KCB1cmxQYXJhbXMudGVzdElkICkuc3BsaXQoIFwiLFwiICk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdXJsUGFyYW1zLnRlc3RJZC5sZW5ndGg7IGkrKyApIHtcblx0XHRjb25maWcudGVzdElkLnB1c2goIHVybFBhcmFtcy50ZXN0SWRbIGkgXSApO1xuXHR9XG59XG5cbnZhciBsb2dnaW5nQ2FsbGJhY2tzID0ge307XG5cbi8vIFJlZ2lzdGVyIGxvZ2dpbmcgY2FsbGJhY2tzXG5mdW5jdGlvbiByZWdpc3RlckxvZ2dpbmdDYWxsYmFja3MoIG9iaiApIHtcblx0dmFyIGksIGwsIGtleSxcblx0XHRjYWxsYmFja05hbWVzID0gWyBcImJlZ2luXCIsIFwiZG9uZVwiLCBcImxvZ1wiLCBcInRlc3RTdGFydFwiLCBcInRlc3REb25lXCIsXG5cdFx0XHRcIm1vZHVsZVN0YXJ0XCIsIFwibW9kdWxlRG9uZVwiIF07XG5cblx0ZnVuY3Rpb24gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2soIGtleSApIHtcblx0XHR2YXIgbG9nZ2luZ0NhbGxiYWNrID0gZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuXHRcdFx0aWYgKCBvYmplY3RUeXBlKCBjYWxsYmFjayApICE9PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0XHRcIlFVbml0IGxvZ2dpbmcgbWV0aG9kcyByZXF1aXJlIGEgY2FsbGJhY2sgZnVuY3Rpb24gYXMgdGhlaXIgZmlyc3QgcGFyYW1ldGVycy5cIlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25maWcuY2FsbGJhY2tzWyBrZXkgXS5wdXNoKCBjYWxsYmFjayApO1xuXHRcdH07XG5cblx0XHQvLyBERVBSRUNBVEVEOiBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBvbiBRVW5pdCAyLjAuMCtcblx0XHQvLyBTdG9yZXMgdGhlIHJlZ2lzdGVyZWQgZnVuY3Rpb25zIGFsbG93aW5nIHJlc3RvcmluZ1xuXHRcdC8vIGF0IHZlcmlmeUxvZ2dpbmdDYWxsYmFja3MoKSBpZiBtb2RpZmllZFxuXHRcdGxvZ2dpbmdDYWxsYmFja3NbIGtleSBdID0gbG9nZ2luZ0NhbGxiYWNrO1xuXG5cdFx0cmV0dXJuIGxvZ2dpbmdDYWxsYmFjaztcblx0fVxuXG5cdGZvciAoIGkgPSAwLCBsID0gY2FsbGJhY2tOYW1lcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0a2V5ID0gY2FsbGJhY2tOYW1lc1sgaSBdO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSBrZXkgY29sbGVjdGlvbiBvZiBsb2dnaW5nIGNhbGxiYWNrXG5cdFx0aWYgKCBvYmplY3RUeXBlKCBjb25maWcuY2FsbGJhY2tzWyBrZXkgXSApID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0Y29uZmlnLmNhbGxiYWNrc1sga2V5IF0gPSBbXTtcblx0XHR9XG5cblx0XHRvYmpbIGtleSBdID0gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2soIGtleSApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJ1bkxvZ2dpbmdDYWxsYmFja3MoIGtleSwgYXJncyApIHtcblx0dmFyIGksIGwsIGNhbGxiYWNrcztcblxuXHRjYWxsYmFja3MgPSBjb25maWcuY2FsbGJhY2tzWyBrZXkgXTtcblx0Zm9yICggaSA9IDAsIGwgPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdGNhbGxiYWNrc1sgaSBdKCBhcmdzICk7XG5cdH1cbn1cblxuLy8gREVQUkVDQVRFRDogVGhpcyB3aWxsIGJlIHJlbW92ZWQgb24gMi4wLjArXG4vLyBUaGlzIGZ1bmN0aW9uIHZlcmlmaWVzIGlmIHRoZSBsb2dnaW5nQ2FsbGJhY2tzIHdlcmUgbW9kaWZpZWQgYnkgdGhlIHVzZXJcbi8vIElmIHNvLCBpdCB3aWxsIHJlc3RvcmUgaXQsIGFzc2lnbiB0aGUgZ2l2ZW4gY2FsbGJhY2sgYW5kIHByaW50IGEgY29uc29sZSB3YXJuaW5nXG5mdW5jdGlvbiB2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCkge1xuXHR2YXIgbG9nZ2luZ0NhbGxiYWNrLCB1c2VyQ2FsbGJhY2s7XG5cblx0Zm9yICggbG9nZ2luZ0NhbGxiYWNrIGluIGxvZ2dpbmdDYWxsYmFja3MgKSB7XG5cdFx0aWYgKCBRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0gIT09IGxvZ2dpbmdDYWxsYmFja3NbIGxvZ2dpbmdDYWxsYmFjayBdICkge1xuXG5cdFx0XHR1c2VyQ2FsbGJhY2sgPSBRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF07XG5cblx0XHRcdC8vIFJlc3RvcmUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdFx0XHRRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0gPSBsb2dnaW5nQ2FsbGJhY2tzWyBsb2dnaW5nQ2FsbGJhY2sgXTtcblxuXHRcdFx0Ly8gQXNzaWduIHRoZSBkZXByZWNhdGVkIGdpdmVuIGNhbGxiYWNrXG5cdFx0XHRRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0oIHVzZXJDYWxsYmFjayApO1xuXG5cdFx0XHRpZiAoIGdsb2JhbC5jb25zb2xlICYmIGdsb2JhbC5jb25zb2xlLndhcm4gKSB7XG5cdFx0XHRcdGdsb2JhbC5jb25zb2xlLndhcm4oXG5cdFx0XHRcdFx0XCJRVW5pdC5cIiArIGxvZ2dpbmdDYWxsYmFjayArIFwiIHdhcyByZXBsYWNlZCB3aXRoIGEgbmV3IHZhbHVlLlxcblwiICtcblx0XHRcdFx0XHRcIlBsZWFzZSwgY2hlY2sgb3V0IHRoZSBkb2N1bWVudGF0aW9uIG9uIGhvdyB0byBhcHBseSBsb2dnaW5nIGNhbGxiYWNrcy5cXG5cIiArXG5cdFx0XHRcdFx0XCJSZWZlcmVuY2U6IGh0dHBzOi8vYXBpLnF1bml0anMuY29tL2NhdGVnb3J5L2NhbGxiYWNrcy9cIlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4oIGZ1bmN0aW9uKCkge1xuXHRpZiAoICFkZWZpbmVkLmRvY3VtZW50ICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIGBvbkVycm9yRm5QcmV2YCBpbml0aWFsaXplZCBhdCB0b3Agb2Ygc2NvcGVcblx0Ly8gUHJlc2VydmUgb3RoZXIgaGFuZGxlcnNcblx0dmFyIG9uRXJyb3JGblByZXYgPSB3aW5kb3cub25lcnJvcjtcblxuXHQvLyBDb3ZlciB1bmNhdWdodCBleGNlcHRpb25zXG5cdC8vIFJldHVybmluZyB0cnVlIHdpbGwgc3VwcHJlc3MgdGhlIGRlZmF1bHQgYnJvd3NlciBoYW5kbGVyLFxuXHQvLyByZXR1cm5pbmcgZmFsc2Ugd2lsbCBsZXQgaXQgcnVuLlxuXHR3aW5kb3cub25lcnJvciA9IGZ1bmN0aW9uKCBlcnJvciwgZmlsZVBhdGgsIGxpbmVyTnIgKSB7XG5cdFx0dmFyIHJldCA9IGZhbHNlO1xuXHRcdGlmICggb25FcnJvckZuUHJldiApIHtcblx0XHRcdHJldCA9IG9uRXJyb3JGblByZXYoIGVycm9yLCBmaWxlUGF0aCwgbGluZXJOciApO1xuXHRcdH1cblxuXHRcdC8vIFRyZWF0IHJldHVybiB2YWx1ZSBhcyB3aW5kb3cub25lcnJvciBpdHNlbGYgZG9lcyxcblx0XHQvLyBPbmx5IGRvIG91ciBoYW5kbGluZyBpZiBub3Qgc3VwcHJlc3NlZC5cblx0XHRpZiAoIHJldCAhPT0gdHJ1ZSApIHtcblx0XHRcdGlmICggUVVuaXQuY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHRcdGlmICggUVVuaXQuY29uZmlnLmN1cnJlbnQuaWdub3JlR2xvYmFsRXJyb3JzICkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKCBlcnJvciwgZmlsZVBhdGggKyBcIjpcIiArIGxpbmVyTnIgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFFVbml0LnRlc3QoIFwiZ2xvYmFsIGZhaWx1cmVcIiwgZXh0ZW5kKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKCBlcnJvciwgZmlsZVBhdGggKyBcIjpcIiArIGxpbmVyTnIgKTtcblx0XHRcdFx0fSwgeyB2YWxpZFRlc3Q6IHRydWUgfSApICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldDtcblx0fTtcbn0gKSgpO1xuXG5RVW5pdC51cmxQYXJhbXMgPSB1cmxQYXJhbXM7XG5cbi8vIEZpZ3VyZSBvdXQgaWYgd2UncmUgcnVubmluZyB0aGUgdGVzdHMgZnJvbSBhIHNlcnZlciBvciBub3RcblFVbml0LmlzTG9jYWwgPSAhKCBkZWZpbmVkLmRvY3VtZW50ICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gXCJmaWxlOlwiICk7XG5cbi8vIEV4cG9zZSB0aGUgY3VycmVudCBRVW5pdCB2ZXJzaW9uXG5RVW5pdC52ZXJzaW9uID0gXCIxLjIxLjBcIjtcblxuZXh0ZW5kKCBRVW5pdCwge1xuXG5cdC8vIGNhbGwgb24gc3RhcnQgb2YgbW9kdWxlIHRlc3QgdG8gcHJlcGVuZCBuYW1lIHRvIGFsbCB0ZXN0c1xuXHRtb2R1bGU6IGZ1bmN0aW9uKCBuYW1lLCB0ZXN0RW52aXJvbm1lbnQsIGV4ZWN1dGVOb3cgKSB7XG5cdFx0dmFyIG1vZHVsZSwgbW9kdWxlRm5zO1xuXHRcdHZhciBjdXJyZW50TW9kdWxlID0gY29uZmlnLmN1cnJlbnRNb2R1bGU7XG5cblx0XHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgKSB7XG5cdFx0XHRpZiAoIHRlc3RFbnZpcm9ubWVudCBpbnN0YW5jZW9mIEZ1bmN0aW9uICkge1xuXHRcdFx0XHRleGVjdXRlTm93ID0gdGVzdEVudmlyb25tZW50O1xuXHRcdFx0XHR0ZXN0RW52aXJvbm1lbnQgPSB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gREVQUkVDQVRFRDogaGFuZGxlcyBzZXR1cC90ZWFyZG93biBmdW5jdGlvbnMsXG5cdFx0Ly8gYmVmb3JlRWFjaCBhbmQgYWZ0ZXJFYWNoIHNob3VsZCBiZSB1c2VkIGluc3RlYWRcblx0XHRpZiAoIHRlc3RFbnZpcm9ubWVudCAmJiB0ZXN0RW52aXJvbm1lbnQuc2V0dXAgKSB7XG5cdFx0XHR0ZXN0RW52aXJvbm1lbnQuYmVmb3JlRWFjaCA9IHRlc3RFbnZpcm9ubWVudC5zZXR1cDtcblx0XHRcdGRlbGV0ZSB0ZXN0RW52aXJvbm1lbnQuc2V0dXA7XG5cdFx0fVxuXHRcdGlmICggdGVzdEVudmlyb25tZW50ICYmIHRlc3RFbnZpcm9ubWVudC50ZWFyZG93biApIHtcblx0XHRcdHRlc3RFbnZpcm9ubWVudC5hZnRlckVhY2ggPSB0ZXN0RW52aXJvbm1lbnQudGVhcmRvd247XG5cdFx0XHRkZWxldGUgdGVzdEVudmlyb25tZW50LnRlYXJkb3duO1xuXHRcdH1cblxuXHRcdG1vZHVsZSA9IGNyZWF0ZU1vZHVsZSgpO1xuXG5cdFx0bW9kdWxlRm5zID0ge1xuXHRcdFx0YmVmb3JlRWFjaDogc2V0SG9vayggbW9kdWxlLCBcImJlZm9yZUVhY2hcIiApLFxuXHRcdFx0YWZ0ZXJFYWNoOiBzZXRIb29rKCBtb2R1bGUsIFwiYWZ0ZXJFYWNoXCIgKVxuXHRcdH07XG5cblx0XHRpZiAoIGV4ZWN1dGVOb3cgaW5zdGFuY2VvZiBGdW5jdGlvbiApIHtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5wdXNoKCBtb2R1bGUgKTtcblx0XHRcdHNldEN1cnJlbnRNb2R1bGUoIG1vZHVsZSApO1xuXHRcdFx0ZXhlY3V0ZU5vdy5jYWxsKCBtb2R1bGUudGVzdEVudmlyb25tZW50LCBtb2R1bGVGbnMgKTtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5wb3AoKTtcblx0XHRcdG1vZHVsZSA9IG1vZHVsZS5wYXJlbnRNb2R1bGUgfHwgY3VycmVudE1vZHVsZTtcblx0XHR9XG5cblx0XHRzZXRDdXJyZW50TW9kdWxlKCBtb2R1bGUgKTtcblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZU1vZHVsZSgpIHtcblx0XHRcdHZhciBwYXJlbnRNb2R1bGUgPSBjb25maWcubW9kdWxlU3RhY2subGVuZ3RoID9cblx0XHRcdFx0Y29uZmlnLm1vZHVsZVN0YWNrLnNsaWNlKCAtMSApWyAwIF0gOiBudWxsO1xuXHRcdFx0dmFyIG1vZHVsZU5hbWUgPSBwYXJlbnRNb2R1bGUgIT09IG51bGwgP1xuXHRcdFx0XHRbIHBhcmVudE1vZHVsZS5uYW1lLCBuYW1lIF0uam9pbiggXCIgPiBcIiApIDogbmFtZTtcblx0XHRcdHZhciBtb2R1bGUgPSB7XG5cdFx0XHRcdG5hbWU6IG1vZHVsZU5hbWUsXG5cdFx0XHRcdHBhcmVudE1vZHVsZTogcGFyZW50TW9kdWxlLFxuXHRcdFx0XHR0ZXN0czogW11cblx0XHRcdH07XG5cblx0XHRcdHZhciBlbnYgPSB7fTtcblx0XHRcdGlmICggcGFyZW50TW9kdWxlICkge1xuXHRcdFx0XHRleHRlbmQoIGVudiwgcGFyZW50TW9kdWxlLnRlc3RFbnZpcm9ubWVudCApO1xuXHRcdFx0XHRkZWxldGUgZW52LmJlZm9yZUVhY2g7XG5cdFx0XHRcdGRlbGV0ZSBlbnYuYWZ0ZXJFYWNoO1xuXHRcdFx0fVxuXHRcdFx0ZXh0ZW5kKCBlbnYsIHRlc3RFbnZpcm9ubWVudCApO1xuXHRcdFx0bW9kdWxlLnRlc3RFbnZpcm9ubWVudCA9IGVudjtcblxuXHRcdFx0Y29uZmlnLm1vZHVsZXMucHVzaCggbW9kdWxlICk7XG5cdFx0XHRyZXR1cm4gbW9kdWxlO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldEN1cnJlbnRNb2R1bGUoIG1vZHVsZSApIHtcblx0XHRcdGNvbmZpZy5jdXJyZW50TW9kdWxlID0gbW9kdWxlO1xuXHRcdH1cblxuXHR9LFxuXG5cdC8vIERFUFJFQ0FURUQ6IFFVbml0LmFzeW5jVGVzdCgpIHdpbGwgYmUgcmVtb3ZlZCBpbiBRVW5pdCAyLjAuXG5cdGFzeW5jVGVzdDogYXN5bmNUZXN0LFxuXG5cdHRlc3Q6IHRlc3QsXG5cblx0c2tpcDogc2tpcCxcblxuXHRvbmx5OiBvbmx5LFxuXG5cdC8vIERFUFJFQ0FURUQ6IFRoZSBmdW5jdGlvbmFsaXR5IG9mIFFVbml0LnN0YXJ0KCkgd2lsbCBiZSBhbHRlcmVkIGluIFFVbml0IDIuMC5cblx0Ly8gSW4gUVVuaXQgMi4wLCBpbnZva2luZyBpdCB3aWxsIE9OTFkgYWZmZWN0IHRoZSBgUVVuaXQuY29uZmlnLmF1dG9zdGFydGAgYmxvY2tpbmcgYmVoYXZpb3IuXG5cdHN0YXJ0OiBmdW5jdGlvbiggY291bnQgKSB7XG5cdFx0dmFyIGdsb2JhbFN0YXJ0QWxyZWFkeUNhbGxlZCA9IGdsb2JhbFN0YXJ0Q2FsbGVkO1xuXG5cdFx0aWYgKCAhY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHRnbG9iYWxTdGFydENhbGxlZCA9IHRydWU7XG5cblx0XHRcdGlmICggcnVuU3RhcnRlZCApIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIkNhbGxlZCBzdGFydCgpIG91dHNpZGUgb2YgYSB0ZXN0IGNvbnRleHQgd2hpbGUgYWxyZWFkeSBzdGFydGVkXCIgKTtcblx0XHRcdH0gZWxzZSBpZiAoIGdsb2JhbFN0YXJ0QWxyZWFkeUNhbGxlZCB8fCBjb3VudCA+IDEgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RhcnQoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0IHRvbyBtYW55IHRpbWVzXCIgKTtcblx0XHRcdH0gZWxzZSBpZiAoIGNvbmZpZy5hdXRvc3RhcnQgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RhcnQoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0IHdoZW4gXCIgK1xuXHRcdFx0XHRcdFwiUVVuaXQuY29uZmlnLmF1dG9zdGFydCB3YXMgdHJ1ZVwiICk7XG5cdFx0XHR9IGVsc2UgaWYgKCAhY29uZmlnLnBhZ2VMb2FkZWQgKSB7XG5cblx0XHRcdFx0Ly8gVGhlIHBhZ2UgaXNuJ3QgY29tcGxldGVseSBsb2FkZWQgeWV0LCBzbyBiYWlsIG91dCBhbmQgbGV0IGBRVW5pdC5sb2FkYCBoYW5kbGUgaXRcblx0XHRcdFx0Y29uZmlnLmF1dG9zdGFydCA9IHRydWU7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHQvLyBJZiBhIHRlc3QgaXMgcnVubmluZywgYWRqdXN0IGl0cyBzZW1hcGhvcmVcblx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSAtPSBjb3VudCB8fCAxO1xuXG5cdFx0XHQvLyBJZiBzZW1hcGhvcmUgaXMgbm9uLW51bWVyaWMsIHRocm93IGVycm9yXG5cdFx0XHRpZiAoIGlzTmFOKCBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgKSApIHtcblx0XHRcdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID0gMDtcblxuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZShcblx0XHRcdFx0XHRcIkNhbGxlZCBzdGFydCgpIHdpdGggYSBub24tbnVtZXJpYyBkZWNyZW1lbnQuXCIsXG5cdFx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIERvbid0IHN0YXJ0IHVudGlsIGVxdWFsIG51bWJlciBvZiBzdG9wLWNhbGxzXG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA+IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gdGhyb3cgYW4gRXJyb3IgaWYgc3RhcnQgaXMgY2FsbGVkIG1vcmUgb2Z0ZW4gdGhhbiBzdG9wXG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA8IDAgKSB7XG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA9IDA7XG5cblx0XHRcdFx0UVVuaXQucHVzaEZhaWx1cmUoXG5cdFx0XHRcdFx0XCJDYWxsZWQgc3RhcnQoKSB3aGlsZSBhbHJlYWR5IHN0YXJ0ZWQgKHRlc3QncyBzZW1hcGhvcmUgd2FzIDAgYWxyZWFkeSlcIixcblx0XHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApXG5cdFx0XHRcdCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdH0sXG5cblx0Ly8gREVQUkVDQVRFRDogUVVuaXQuc3RvcCgpIHdpbGwgYmUgcmVtb3ZlZCBpbiBRVW5pdCAyLjAuXG5cdHN0b3A6IGZ1bmN0aW9uKCBjb3VudCApIHtcblxuXHRcdC8vIElmIHRoZXJlIGlzbid0IGEgdGVzdCBydW5uaW5nLCBkb24ndCBhbGxvdyBRVW5pdC5zdG9wKCkgdG8gYmUgY2FsbGVkXG5cdFx0aWYgKCAhY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiQ2FsbGVkIHN0b3AoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0XCIgKTtcblx0XHR9XG5cblx0XHQvLyBJZiBhIHRlc3QgaXMgcnVubmluZywgYWRqdXN0IGl0cyBzZW1hcGhvcmVcblx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgKz0gY291bnQgfHwgMTtcblxuXHRcdHBhdXNlUHJvY2Vzc2luZygpO1xuXHR9LFxuXG5cdGNvbmZpZzogY29uZmlnLFxuXG5cdGlzOiBpcyxcblxuXHRvYmplY3RUeXBlOiBvYmplY3RUeXBlLFxuXG5cdGV4dGVuZDogZXh0ZW5kLFxuXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbmZpZy5wYWdlTG9hZGVkID0gdHJ1ZTtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuXHRcdGV4dGVuZCggY29uZmlnLCB7XG5cdFx0XHRzdGF0czogeyBhbGw6IDAsIGJhZDogMCB9LFxuXHRcdFx0bW9kdWxlU3RhdHM6IHsgYWxsOiAwLCBiYWQ6IDAgfSxcblx0XHRcdHN0YXJ0ZWQ6IDAsXG5cdFx0XHR1cGRhdGVSYXRlOiAxMDAwLFxuXHRcdFx0YXV0b3N0YXJ0OiB0cnVlLFxuXHRcdFx0ZmlsdGVyOiBcIlwiXG5cdFx0fSwgdHJ1ZSApO1xuXG5cdFx0Y29uZmlnLmJsb2NraW5nID0gZmFsc2U7XG5cblx0XHRpZiAoIGNvbmZpZy5hdXRvc3RhcnQgKSB7XG5cdFx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHN0YWNrOiBmdW5jdGlvbiggb2Zmc2V0ICkge1xuXHRcdG9mZnNldCA9ICggb2Zmc2V0IHx8IDAgKSArIDI7XG5cdFx0cmV0dXJuIHNvdXJjZUZyb21TdGFja3RyYWNlKCBvZmZzZXQgKTtcblx0fVxufSk7XG5cbnJlZ2lzdGVyTG9nZ2luZ0NhbGxiYWNrcyggUVVuaXQgKTtcblxuZnVuY3Rpb24gYmVnaW4oKSB7XG5cdHZhciBpLCBsLFxuXHRcdG1vZHVsZXNMb2cgPSBbXTtcblxuXHQvLyBJZiB0aGUgdGVzdCBydW4gaGFzbid0IG9mZmljaWFsbHkgYmVndW4geWV0XG5cdGlmICggIWNvbmZpZy5zdGFydGVkICkge1xuXG5cdFx0Ly8gUmVjb3JkIHRoZSB0aW1lIG9mIHRoZSB0ZXN0IHJ1bidzIGJlZ2lubmluZ1xuXHRcdGNvbmZpZy5zdGFydGVkID0gbm93KCk7XG5cblx0XHR2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCk7XG5cblx0XHQvLyBEZWxldGUgdGhlIGxvb3NlIHVubmFtZWQgbW9kdWxlIGlmIHVudXNlZC5cblx0XHRpZiAoIGNvbmZpZy5tb2R1bGVzWyAwIF0ubmFtZSA9PT0gXCJcIiAmJiBjb25maWcubW9kdWxlc1sgMCBdLnRlc3RzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdGNvbmZpZy5tb2R1bGVzLnNoaWZ0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gQXZvaWQgdW5uZWNlc3NhcnkgaW5mb3JtYXRpb24gYnkgbm90IGxvZ2dpbmcgbW9kdWxlcycgdGVzdCBlbnZpcm9ubWVudHNcblx0XHRmb3IgKCBpID0gMCwgbCA9IGNvbmZpZy5tb2R1bGVzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdG1vZHVsZXNMb2cucHVzaCh7XG5cdFx0XHRcdG5hbWU6IGNvbmZpZy5tb2R1bGVzWyBpIF0ubmFtZSxcblx0XHRcdFx0dGVzdHM6IGNvbmZpZy5tb2R1bGVzWyBpIF0udGVzdHNcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIFRoZSB0ZXN0IHJ1biBpcyBvZmZpY2lhbGx5IGJlZ2lubmluZyBub3dcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcImJlZ2luXCIsIHtcblx0XHRcdHRvdGFsVGVzdHM6IFRlc3QuY291bnQsXG5cdFx0XHRtb2R1bGVzOiBtb2R1bGVzTG9nXG5cdFx0fSk7XG5cdH1cblxuXHRjb25maWcuYmxvY2tpbmcgPSBmYWxzZTtcblx0cHJvY2VzcyggdHJ1ZSApO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzKCBsYXN0ICkge1xuXHRmdW5jdGlvbiBuZXh0KCkge1xuXHRcdHByb2Nlc3MoIGxhc3QgKTtcblx0fVxuXHR2YXIgc3RhcnQgPSBub3coKTtcblx0Y29uZmlnLmRlcHRoID0gKCBjb25maWcuZGVwdGggfHwgMCApICsgMTtcblxuXHR3aGlsZSAoIGNvbmZpZy5xdWV1ZS5sZW5ndGggJiYgIWNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRpZiAoICFkZWZpbmVkLnNldFRpbWVvdXQgfHwgY29uZmlnLnVwZGF0ZVJhdGUgPD0gMCB8fFxuXHRcdFx0XHQoICggbm93KCkgLSBzdGFydCApIDwgY29uZmlnLnVwZGF0ZVJhdGUgKSApIHtcblx0XHRcdGlmICggY29uZmlnLmN1cnJlbnQgKSB7XG5cblx0XHRcdFx0Ly8gUmVzZXQgYXN5bmMgdHJhY2tpbmcgZm9yIGVhY2ggcGhhc2Ugb2YgdGhlIFRlc3QgbGlmZWN5Y2xlXG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnVzZWRBc3luYyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0Y29uZmlnLnF1ZXVlLnNoaWZ0KCkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2V0VGltZW91dCggbmV4dCwgMTMgKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXHRjb25maWcuZGVwdGgtLTtcblx0aWYgKCBsYXN0ICYmICFjb25maWcuYmxvY2tpbmcgJiYgIWNvbmZpZy5xdWV1ZS5sZW5ndGggJiYgY29uZmlnLmRlcHRoID09PSAwICkge1xuXHRcdGRvbmUoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXVzZVByb2Nlc3NpbmcoKSB7XG5cdGNvbmZpZy5ibG9ja2luZyA9IHRydWU7XG5cblx0aWYgKCBjb25maWcudGVzdFRpbWVvdXQgJiYgZGVmaW5lZC5zZXRUaW1lb3V0ICkge1xuXHRcdGNsZWFyVGltZW91dCggY29uZmlnLnRpbWVvdXQgKTtcblx0XHRjb25maWcudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50ICkge1xuXHRcdFx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPSAwO1xuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZSggXCJUZXN0IHRpbWVkIG91dFwiLCBzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiVGVzdCB0aW1lZCBvdXRcIiApO1xuXHRcdFx0fVxuXHRcdFx0cmVzdW1lUHJvY2Vzc2luZygpO1xuXHRcdH0sIGNvbmZpZy50ZXN0VGltZW91dCApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlc3VtZVByb2Nlc3NpbmcoKSB7XG5cdHJ1blN0YXJ0ZWQgPSB0cnVlO1xuXG5cdC8vIEEgc2xpZ2h0IGRlbGF5IHRvIGFsbG93IHRoaXMgaXRlcmF0aW9uIG9mIHRoZSBldmVudCBsb29wIHRvIGZpbmlzaCAobW9yZSBhc3NlcnRpb25zLCBldGMuKVxuXHRpZiAoIGRlZmluZWQuc2V0VGltZW91dCApIHtcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBjb25maWcuY3VycmVudCAmJiBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPiAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGNvbmZpZy50aW1lb3V0ICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQoIGNvbmZpZy50aW1lb3V0ICk7XG5cdFx0XHR9XG5cblx0XHRcdGJlZ2luKCk7XG5cdFx0fSwgMTMgKTtcblx0fSBlbHNlIHtcblx0XHRiZWdpbigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGRvbmUoKSB7XG5cdHZhciBydW50aW1lLCBwYXNzZWQ7XG5cblx0Y29uZmlnLmF1dG9ydW4gPSB0cnVlO1xuXG5cdC8vIExvZyB0aGUgbGFzdCBtb2R1bGUgcmVzdWx0c1xuXHRpZiAoIGNvbmZpZy5wcmV2aW91c01vZHVsZSApIHtcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZURvbmVcIiwge1xuXHRcdFx0bmFtZTogY29uZmlnLnByZXZpb3VzTW9kdWxlLm5hbWUsXG5cdFx0XHR0ZXN0czogY29uZmlnLnByZXZpb3VzTW9kdWxlLnRlc3RzLFxuXHRcdFx0ZmFpbGVkOiBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0cGFzc2VkOiBjb25maWcubW9kdWxlU3RhdHMuYWxsIC0gY29uZmlnLm1vZHVsZVN0YXRzLmJhZCxcblx0XHRcdHRvdGFsOiBjb25maWcubW9kdWxlU3RhdHMuYWxsLFxuXHRcdFx0cnVudGltZTogbm93KCkgLSBjb25maWcubW9kdWxlU3RhdHMuc3RhcnRlZFxuXHRcdH0pO1xuXHR9XG5cdGRlbGV0ZSBjb25maWcucHJldmlvdXNNb2R1bGU7XG5cblx0cnVudGltZSA9IG5vdygpIC0gY29uZmlnLnN0YXJ0ZWQ7XG5cdHBhc3NlZCA9IGNvbmZpZy5zdGF0cy5hbGwgLSBjb25maWcuc3RhdHMuYmFkO1xuXG5cdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwiZG9uZVwiLCB7XG5cdFx0ZmFpbGVkOiBjb25maWcuc3RhdHMuYmFkLFxuXHRcdHBhc3NlZDogcGFzc2VkLFxuXHRcdHRvdGFsOiBjb25maWcuc3RhdHMuYWxsLFxuXHRcdHJ1bnRpbWU6IHJ1bnRpbWVcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldEhvb2soIG1vZHVsZSwgaG9va05hbWUgKSB7XG5cdGlmICggbW9kdWxlLnRlc3RFbnZpcm9ubWVudCA9PT0gdW5kZWZpbmVkICkge1xuXHRcdG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgPSB7fTtcblx0fVxuXG5cdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2sgKSB7XG5cdFx0bW9kdWxlLnRlc3RFbnZpcm9ubWVudFsgaG9va05hbWUgXSA9IGNhbGxiYWNrO1xuXHR9O1xufVxuXG52YXIgZm9jdXNlZCA9IGZhbHNlO1xudmFyIHByaW9yaXR5Q291bnQgPSAwO1xuXG5mdW5jdGlvbiBUZXN0KCBzZXR0aW5ncyApIHtcblx0dmFyIGksIGw7XG5cblx0KytUZXN0LmNvdW50O1xuXG5cdGV4dGVuZCggdGhpcywgc2V0dGluZ3MgKTtcblx0dGhpcy5hc3NlcnRpb25zID0gW107XG5cdHRoaXMuc2VtYXBob3JlID0gMDtcblx0dGhpcy51c2VkQXN5bmMgPSBmYWxzZTtcblx0dGhpcy5tb2R1bGUgPSBjb25maWcuY3VycmVudE1vZHVsZTtcblx0dGhpcy5zdGFjayA9IHNvdXJjZUZyb21TdGFja3RyYWNlKCAzICk7XG5cblx0Ly8gUmVnaXN0ZXIgdW5pcXVlIHN0cmluZ3Ncblx0Zm9yICggaSA9IDAsIGwgPSB0aGlzLm1vZHVsZS50ZXN0czsgaSA8IGwubGVuZ3RoOyBpKysgKSB7XG5cdFx0aWYgKCB0aGlzLm1vZHVsZS50ZXN0c1sgaSBdLm5hbWUgPT09IHRoaXMudGVzdE5hbWUgKSB7XG5cdFx0XHR0aGlzLnRlc3ROYW1lICs9IFwiIFwiO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMudGVzdElkID0gZ2VuZXJhdGVIYXNoKCB0aGlzLm1vZHVsZS5uYW1lLCB0aGlzLnRlc3ROYW1lICk7XG5cblx0dGhpcy5tb2R1bGUudGVzdHMucHVzaCh7XG5cdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkXG5cdH0pO1xuXG5cdGlmICggc2V0dGluZ3Muc2tpcCApIHtcblxuXHRcdC8vIFNraXBwZWQgdGVzdHMgd2lsbCBmdWxseSBpZ25vcmUgYW55IHNlbnQgY2FsbGJhY2tcblx0XHR0aGlzLmNhbGxiYWNrID0gZnVuY3Rpb24oKSB7fTtcblx0XHR0aGlzLmFzeW5jID0gZmFsc2U7XG5cdFx0dGhpcy5leHBlY3RlZCA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5hc3NlcnQgPSBuZXcgQXNzZXJ0KCB0aGlzICk7XG5cdH1cbn1cblxuVGVzdC5jb3VudCA9IDA7XG5cblRlc3QucHJvdG90eXBlID0ge1xuXHRiZWZvcmU6IGZ1bmN0aW9uKCkge1xuXHRcdGlmIChcblxuXHRcdFx0Ly8gRW1pdCBtb2R1bGVTdGFydCB3aGVuIHdlJ3JlIHN3aXRjaGluZyBmcm9tIG9uZSBtb2R1bGUgdG8gYW5vdGhlclxuXHRcdFx0dGhpcy5tb2R1bGUgIT09IGNvbmZpZy5wcmV2aW91c01vZHVsZSB8fFxuXG5cdFx0XHRcdC8vIFRoZXkgY291bGQgYmUgZXF1YWwgKGJvdGggdW5kZWZpbmVkKSBidXQgaWYgdGhlIHByZXZpb3VzTW9kdWxlIHByb3BlcnR5IGRvZXNuJ3Rcblx0XHRcdFx0Ly8geWV0IGV4aXN0IGl0IG1lYW5zIHRoaXMgaXMgdGhlIGZpcnN0IHRlc3QgaW4gYSBzdWl0ZSB0aGF0IGlzbid0IHdyYXBwZWQgaW4gYVxuXHRcdFx0XHQvLyBtb2R1bGUsIGluIHdoaWNoIGNhc2Ugd2UnbGwganVzdCBlbWl0IGEgbW9kdWxlU3RhcnQgZXZlbnQgZm9yICd1bmRlZmluZWQnLlxuXHRcdFx0XHQvLyBXaXRob3V0IHRoaXMsIHJlcG9ydGVycyBjYW4gZ2V0IHRlc3RTdGFydCBiZWZvcmUgbW9kdWxlU3RhcnQgIHdoaWNoIGlzIGEgcHJvYmxlbS5cblx0XHRcdFx0IWhhc093bi5jYWxsKCBjb25maWcsIFwicHJldmlvdXNNb2R1bGVcIiApXG5cdFx0KSB7XG5cdFx0XHRpZiAoIGhhc093bi5jYWxsKCBjb25maWcsIFwicHJldmlvdXNNb2R1bGVcIiApICkge1xuXHRcdFx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZURvbmVcIiwge1xuXHRcdFx0XHRcdG5hbWU6IGNvbmZpZy5wcmV2aW91c01vZHVsZS5uYW1lLFxuXHRcdFx0XHRcdHRlc3RzOiBjb25maWcucHJldmlvdXNNb2R1bGUudGVzdHMsXG5cdFx0XHRcdFx0ZmFpbGVkOiBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0XHRcdHBhc3NlZDogY29uZmlnLm1vZHVsZVN0YXRzLmFsbCAtIGNvbmZpZy5tb2R1bGVTdGF0cy5iYWQsXG5cdFx0XHRcdFx0dG90YWw6IGNvbmZpZy5tb2R1bGVTdGF0cy5hbGwsXG5cdFx0XHRcdFx0cnVudGltZTogbm93KCkgLSBjb25maWcubW9kdWxlU3RhdHMuc3RhcnRlZFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNvbmZpZy5wcmV2aW91c01vZHVsZSA9IHRoaXMubW9kdWxlO1xuXHRcdFx0Y29uZmlnLm1vZHVsZVN0YXRzID0geyBhbGw6IDAsIGJhZDogMCwgc3RhcnRlZDogbm93KCkgfTtcblx0XHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwibW9kdWxlU3RhcnRcIiwge1xuXHRcdFx0XHRuYW1lOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0XHR0ZXN0czogdGhpcy5tb2R1bGUudGVzdHNcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblxuXHRcdGlmICggdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50ICkge1xuXHRcdFx0ZGVsZXRlIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudC5iZWZvcmVFYWNoO1xuXHRcdFx0ZGVsZXRlIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudC5hZnRlckVhY2g7XG5cdFx0fVxuXHRcdHRoaXMudGVzdEVudmlyb25tZW50ID0gZXh0ZW5kKCB7fSwgdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50ICk7XG5cblx0XHR0aGlzLnN0YXJ0ZWQgPSBub3coKTtcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcInRlc3RTdGFydFwiLCB7XG5cdFx0XHRuYW1lOiB0aGlzLnRlc3ROYW1lLFxuXHRcdFx0bW9kdWxlOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0dGVzdElkOiB0aGlzLnRlc3RJZFxuXHRcdH0pO1xuXG5cdFx0aWYgKCAhY29uZmlnLnBvbGx1dGlvbiApIHtcblx0XHRcdHNhdmVHbG9iYWwoKTtcblx0XHR9XG5cdH0sXG5cblx0cnVuOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcHJvbWlzZTtcblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblxuXHRcdGlmICggdGhpcy5hc3luYyApIHtcblx0XHRcdFFVbml0LnN0b3AoKTtcblx0XHR9XG5cblx0XHR0aGlzLmNhbGxiYWNrU3RhcnRlZCA9IG5vdygpO1xuXG5cdFx0aWYgKCBjb25maWcubm90cnljYXRjaCApIHtcblx0XHRcdHJ1blRlc3QoIHRoaXMgKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0cnVuVGVzdCggdGhpcyApO1xuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0dGhpcy5wdXNoRmFpbHVyZSggXCJEaWVkIG9uIHRlc3QgI1wiICsgKCB0aGlzLmFzc2VydGlvbnMubGVuZ3RoICsgMSApICsgXCIgXCIgK1xuXHRcdFx0XHR0aGlzLnN0YWNrICsgXCI6IFwiICsgKCBlLm1lc3NhZ2UgfHwgZSApLCBleHRyYWN0U3RhY2t0cmFjZSggZSwgMCApICk7XG5cblx0XHRcdC8vIGVsc2UgbmV4dCB0ZXN0IHdpbGwgY2FycnkgdGhlIHJlc3BvbnNpYmlsaXR5XG5cdFx0XHRzYXZlR2xvYmFsKCk7XG5cblx0XHRcdC8vIFJlc3RhcnQgdGhlIHRlc3RzIGlmIHRoZXkncmUgYmxvY2tpbmdcblx0XHRcdGlmICggY29uZmlnLmJsb2NraW5nICkge1xuXHRcdFx0XHRRVW5pdC5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJ1blRlc3QoIHRlc3QgKSB7XG5cdFx0XHRwcm9taXNlID0gdGVzdC5jYWxsYmFjay5jYWxsKCB0ZXN0LnRlc3RFbnZpcm9ubWVudCwgdGVzdC5hc3NlcnQgKTtcblx0XHRcdHRlc3QucmVzb2x2ZVByb21pc2UoIHByb21pc2UgKTtcblx0XHR9XG5cdH0sXG5cblx0YWZ0ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdGNoZWNrUG9sbHV0aW9uKCk7XG5cdH0sXG5cblx0cXVldWVIb29rOiBmdW5jdGlvbiggaG9vaywgaG9va05hbWUgKSB7XG5cdFx0dmFyIHByb21pc2UsXG5cdFx0XHR0ZXN0ID0gdGhpcztcblx0XHRyZXR1cm4gZnVuY3Rpb24gcnVuSG9vaygpIHtcblx0XHRcdGNvbmZpZy5jdXJyZW50ID0gdGVzdDtcblx0XHRcdGlmICggY29uZmlnLm5vdHJ5Y2F0Y2ggKSB7XG5cdFx0XHRcdGNhbGxIb29rKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNhbGxIb29rKCk7XG5cdFx0XHR9IGNhdGNoICggZXJyb3IgKSB7XG5cdFx0XHRcdHRlc3QucHVzaEZhaWx1cmUoIGhvb2tOYW1lICsgXCIgZmFpbGVkIG9uIFwiICsgdGVzdC50ZXN0TmFtZSArIFwiOiBcIiArXG5cdFx0XHRcdCggZXJyb3IubWVzc2FnZSB8fCBlcnJvciApLCBleHRyYWN0U3RhY2t0cmFjZSggZXJyb3IsIDAgKSApO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBjYWxsSG9vaygpIHtcblx0XHRcdFx0cHJvbWlzZSA9IGhvb2suY2FsbCggdGVzdC50ZXN0RW52aXJvbm1lbnQsIHRlc3QuYXNzZXJ0ICk7XG5cdFx0XHRcdHRlc3QucmVzb2x2ZVByb21pc2UoIHByb21pc2UsIGhvb2tOYW1lICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSxcblxuXHQvLyBDdXJyZW50bHkgb25seSB1c2VkIGZvciBtb2R1bGUgbGV2ZWwgaG9va3MsIGNhbiBiZSB1c2VkIHRvIGFkZCBnbG9iYWwgbGV2ZWwgb25lc1xuXHRob29rczogZnVuY3Rpb24oIGhhbmRsZXIgKSB7XG5cdFx0dmFyIGhvb2tzID0gW107XG5cblx0XHRmdW5jdGlvbiBwcm9jZXNzSG9va3MoIHRlc3QsIG1vZHVsZSApIHtcblx0XHRcdGlmICggbW9kdWxlLnBhcmVudE1vZHVsZSApIHtcblx0XHRcdFx0cHJvY2Vzc0hvb2tzKCB0ZXN0LCBtb2R1bGUucGFyZW50TW9kdWxlICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgJiZcblx0XHRcdFx0UVVuaXQub2JqZWN0VHlwZSggbW9kdWxlLnRlc3RFbnZpcm9ubWVudFsgaGFuZGxlciBdICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0aG9va3MucHVzaCggdGVzdC5xdWV1ZUhvb2soIG1vZHVsZS50ZXN0RW52aXJvbm1lbnRbIGhhbmRsZXIgXSwgaGFuZGxlciApICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSG9va3MgYXJlIGlnbm9yZWQgb24gc2tpcHBlZCB0ZXN0c1xuXHRcdGlmICggIXRoaXMuc2tpcCApIHtcblx0XHRcdHByb2Nlc3NIb29rcyggdGhpcywgdGhpcy5tb2R1bGUgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGhvb2tzO1xuXHR9LFxuXG5cdGZpbmlzaDogZnVuY3Rpb24oKSB7XG5cdFx0Y29uZmlnLmN1cnJlbnQgPSB0aGlzO1xuXHRcdGlmICggY29uZmlnLnJlcXVpcmVFeHBlY3RzICYmIHRoaXMuZXhwZWN0ZWQgPT09IG51bGwgKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIG51bWJlciBvZiBhc3NlcnRpb25zIHRvIGJlIGRlZmluZWQsIGJ1dCBleHBlY3QoKSB3YXMgXCIgK1xuXHRcdFx0XHRcIm5vdCBjYWxsZWQuXCIsIHRoaXMuc3RhY2sgKTtcblx0XHR9IGVsc2UgaWYgKCB0aGlzLmV4cGVjdGVkICE9PSBudWxsICYmIHRoaXMuZXhwZWN0ZWQgIT09IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIFwiICsgdGhpcy5leHBlY3RlZCArIFwiIGFzc2VydGlvbnMsIGJ1dCBcIiArXG5cdFx0XHRcdHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKyBcIiB3ZXJlIHJ1blwiLCB0aGlzLnN0YWNrICk7XG5cdFx0fSBlbHNlIGlmICggdGhpcy5leHBlY3RlZCA9PT0gbnVsbCAmJiAhdGhpcy5hc3NlcnRpb25zLmxlbmd0aCApIHtcblx0XHRcdHRoaXMucHVzaEZhaWx1cmUoIFwiRXhwZWN0ZWQgYXQgbGVhc3Qgb25lIGFzc2VydGlvbiwgYnV0IG5vbmUgd2VyZSBydW4gLSBjYWxsIFwiICtcblx0XHRcdFx0XCJleHBlY3QoMCkgdG8gYWNjZXB0IHplcm8gYXNzZXJ0aW9ucy5cIiwgdGhpcy5zdGFjayApO1xuXHRcdH1cblxuXHRcdHZhciBpLFxuXHRcdFx0YmFkID0gMDtcblxuXHRcdHRoaXMucnVudGltZSA9IG5vdygpIC0gdGhpcy5zdGFydGVkO1xuXHRcdGNvbmZpZy5zdGF0cy5hbGwgKz0gdGhpcy5hc3NlcnRpb25zLmxlbmd0aDtcblx0XHRjb25maWcubW9kdWxlU3RhdHMuYWxsICs9IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7XG5cblx0XHRmb3IgKCBpID0gMDsgaSA8IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdGlmICggIXRoaXMuYXNzZXJ0aW9uc1sgaSBdLnJlc3VsdCApIHtcblx0XHRcdFx0YmFkKys7XG5cdFx0XHRcdGNvbmZpZy5zdGF0cy5iYWQrKztcblx0XHRcdFx0Y29uZmlnLm1vZHVsZVN0YXRzLmJhZCsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwidGVzdERvbmVcIiwge1xuXHRcdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHRcdG1vZHVsZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdHNraXBwZWQ6ICEhdGhpcy5za2lwLFxuXHRcdFx0ZmFpbGVkOiBiYWQsXG5cdFx0XHRwYXNzZWQ6IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggLSBiYWQsXG5cdFx0XHR0b3RhbDogdGhpcy5hc3NlcnRpb25zLmxlbmd0aCxcblx0XHRcdHJ1bnRpbWU6IHRoaXMucnVudGltZSxcblxuXHRcdFx0Ly8gSFRNTCBSZXBvcnRlciB1c2Vcblx0XHRcdGFzc2VydGlvbnM6IHRoaXMuYXNzZXJ0aW9ucyxcblx0XHRcdHRlc3RJZDogdGhpcy50ZXN0SWQsXG5cblx0XHRcdC8vIFNvdXJjZSBvZiBUZXN0XG5cdFx0XHRzb3VyY2U6IHRoaXMuc3RhY2ssXG5cblx0XHRcdC8vIERFUFJFQ0FURUQ6IHRoaXMgcHJvcGVydHkgd2lsbCBiZSByZW1vdmVkIGluIDIuMC4wLCB1c2UgcnVudGltZSBpbnN0ZWFkXG5cdFx0XHRkdXJhdGlvbjogdGhpcy5ydW50aW1lXG5cdFx0fSk7XG5cblx0XHQvLyBRVW5pdC5yZXNldCgpIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVwbGFjZWQgZm9yIGEgbmV3XG5cdFx0Ly8gZml4dHVyZSByZXNldCBmdW5jdGlvbiBvbiBRVW5pdCAyLjAvMi4xLlxuXHRcdC8vIEl0J3Mgc3RpbGwgY2FsbGVkIGhlcmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGhhbmRsaW5nXG5cdFx0UVVuaXQucmVzZXQoKTtcblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdW5kZWZpbmVkO1xuXHR9LFxuXG5cdHF1ZXVlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcHJpb3JpdHksXG5cdFx0XHR0ZXN0ID0gdGhpcztcblxuXHRcdGlmICggIXRoaXMudmFsaWQoKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBydW4oKSB7XG5cblx0XHRcdC8vIGVhY2ggb2YgdGhlc2UgY2FuIGJ5IGFzeW5jXG5cdFx0XHRzeW5jaHJvbml6ZShbXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QuYmVmb3JlKCk7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0dGVzdC5ob29rcyggXCJiZWZvcmVFYWNoXCIgKSxcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5ydW4oKTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHR0ZXN0Lmhvb2tzKCBcImFmdGVyRWFjaFwiICkucmV2ZXJzZSgpLFxuXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QuYWZ0ZXIoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5maW5pc2goKTtcblx0XHRcdFx0fVxuXHRcdFx0XSk7XG5cdFx0fVxuXG5cdFx0Ly8gUHJpb3JpdGl6ZSBwcmV2aW91c2x5IGZhaWxlZCB0ZXN0cywgZGV0ZWN0ZWQgZnJvbSBzZXNzaW9uU3RvcmFnZVxuXHRcdHByaW9yaXR5ID0gUVVuaXQuY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSAmJlxuXHRcdFx0XHQrc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSggXCJxdW5pdC10ZXN0LVwiICsgdGhpcy5tb2R1bGUubmFtZSArIFwiLVwiICsgdGhpcy50ZXN0TmFtZSApO1xuXG5cdFx0cmV0dXJuIHN5bmNocm9uaXplKCBydW4sIHByaW9yaXR5ICk7XG5cdH0sXG5cblx0cHVzaDogZnVuY3Rpb24oIHJlc3VsdCwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgbmVnYXRpdmUgKSB7XG5cdFx0dmFyIHNvdXJjZSxcblx0XHRcdGRldGFpbHMgPSB7XG5cdFx0XHRcdG1vZHVsZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHRcdFx0cmVzdWx0OiByZXN1bHQsXG5cdFx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRcdHRlc3RJZDogdGhpcy50ZXN0SWQsXG5cdFx0XHRcdG5lZ2F0aXZlOiBuZWdhdGl2ZSB8fCBmYWxzZSxcblx0XHRcdFx0cnVudGltZTogbm93KCkgLSB0aGlzLnN0YXJ0ZWRcblx0XHRcdH07XG5cblx0XHRpZiAoICFyZXN1bHQgKSB7XG5cdFx0XHRzb3VyY2UgPSBzb3VyY2VGcm9tU3RhY2t0cmFjZSgpO1xuXG5cdFx0XHRpZiAoIHNvdXJjZSApIHtcblx0XHRcdFx0ZGV0YWlscy5zb3VyY2UgPSBzb3VyY2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJsb2dcIiwgZGV0YWlscyApO1xuXG5cdFx0dGhpcy5hc3NlcnRpb25zLnB1c2goe1xuXHRcdFx0cmVzdWx0OiAhIXJlc3VsdCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9KTtcblx0fSxcblxuXHRwdXNoRmFpbHVyZTogZnVuY3Rpb24oIG1lc3NhZ2UsIHNvdXJjZSwgYWN0dWFsICkge1xuXHRcdGlmICggISggdGhpcyBpbnN0YW5jZW9mIFRlc3QgKSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJwdXNoRmFpbHVyZSgpIGFzc2VydGlvbiBvdXRzaWRlIHRlc3QgY29udGV4dCwgd2FzIFwiICtcblx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdH1cblxuXHRcdHZhciBkZXRhaWxzID0ge1xuXHRcdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRcdHJlc3VsdDogZmFsc2UsXG5cdFx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UgfHwgXCJlcnJvclwiLFxuXHRcdFx0XHRhY3R1YWw6IGFjdHVhbCB8fCBudWxsLFxuXHRcdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkLFxuXHRcdFx0XHRydW50aW1lOiBub3coKSAtIHRoaXMuc3RhcnRlZFxuXHRcdFx0fTtcblxuXHRcdGlmICggc291cmNlICkge1xuXHRcdFx0ZGV0YWlscy5zb3VyY2UgPSBzb3VyY2U7XG5cdFx0fVxuXG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJsb2dcIiwgZGV0YWlscyApO1xuXG5cdFx0dGhpcy5hc3NlcnRpb25zLnB1c2goe1xuXHRcdFx0cmVzdWx0OiBmYWxzZSxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9KTtcblx0fSxcblxuXHRyZXNvbHZlUHJvbWlzZTogZnVuY3Rpb24oIHByb21pc2UsIHBoYXNlICkge1xuXHRcdHZhciB0aGVuLCBtZXNzYWdlLFxuXHRcdFx0dGVzdCA9IHRoaXM7XG5cdFx0aWYgKCBwcm9taXNlICE9IG51bGwgKSB7XG5cdFx0XHR0aGVuID0gcHJvbWlzZS50aGVuO1xuXHRcdFx0aWYgKCBRVW5pdC5vYmplY3RUeXBlKCB0aGVuICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0UVVuaXQuc3RvcCgpO1xuXHRcdFx0XHR0aGVuLmNhbGwoXG5cdFx0XHRcdFx0cHJvbWlzZSxcblx0XHRcdFx0XHRmdW5jdGlvbigpIHsgUVVuaXQuc3RhcnQoKTsgfSxcblx0XHRcdFx0XHRmdW5jdGlvbiggZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHRtZXNzYWdlID0gXCJQcm9taXNlIHJlamVjdGVkIFwiICtcblx0XHRcdFx0XHRcdFx0KCAhcGhhc2UgPyBcImR1cmluZ1wiIDogcGhhc2UucmVwbGFjZSggL0VhY2gkLywgXCJcIiApICkgK1xuXHRcdFx0XHRcdFx0XHRcIiBcIiArIHRlc3QudGVzdE5hbWUgKyBcIjogXCIgKyAoIGVycm9yLm1lc3NhZ2UgfHwgZXJyb3IgKTtcblx0XHRcdFx0XHRcdHRlc3QucHVzaEZhaWx1cmUoIG1lc3NhZ2UsIGV4dHJhY3RTdGFja3RyYWNlKCBlcnJvciwgMCApICk7XG5cblx0XHRcdFx0XHRcdC8vIGVsc2UgbmV4dCB0ZXN0IHdpbGwgY2FycnkgdGhlIHJlc3BvbnNpYmlsaXR5XG5cdFx0XHRcdFx0XHRzYXZlR2xvYmFsKCk7XG5cblx0XHRcdFx0XHRcdC8vIFVuYmxvY2tcblx0XHRcdFx0XHRcdFFVbml0LnN0YXJ0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHR2YWxpZDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZpbHRlciA9IGNvbmZpZy5maWx0ZXIsXG5cdFx0XHRyZWdleEZpbHRlciA9IC9eKCE/KVxcLyhbXFx3XFxXXSopXFwvKGk/JCkvLmV4ZWMoIGZpbHRlciApLFxuXHRcdFx0bW9kdWxlID0gUVVuaXQudXJsUGFyYW1zLm1vZHVsZSAmJiBRVW5pdC51cmxQYXJhbXMubW9kdWxlLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRmdWxsTmFtZSA9ICggdGhpcy5tb2R1bGUubmFtZSArIFwiOiBcIiArIHRoaXMudGVzdE5hbWUgKTtcblxuXHRcdGZ1bmN0aW9uIHRlc3RJbk1vZHVsZUNoYWluKCB0ZXN0TW9kdWxlICkge1xuXHRcdFx0dmFyIHRlc3RNb2R1bGVOYW1lID0gdGVzdE1vZHVsZS5uYW1lID8gdGVzdE1vZHVsZS5uYW1lLnRvTG93ZXJDYXNlKCkgOiBudWxsO1xuXHRcdFx0aWYgKCB0ZXN0TW9kdWxlTmFtZSA9PT0gbW9kdWxlICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAoIHRlc3RNb2R1bGUucGFyZW50TW9kdWxlICkge1xuXHRcdFx0XHRyZXR1cm4gdGVzdEluTW9kdWxlQ2hhaW4oIHRlc3RNb2R1bGUucGFyZW50TW9kdWxlICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSW50ZXJuYWxseS1nZW5lcmF0ZWQgdGVzdHMgYXJlIGFsd2F5cyB2YWxpZFxuXHRcdGlmICggdGhpcy5jYWxsYmFjayAmJiB0aGlzLmNhbGxiYWNrLnZhbGlkVGVzdCApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICggY29uZmlnLnRlc3RJZC5sZW5ndGggPiAwICYmIGluQXJyYXkoIHRoaXMudGVzdElkLCBjb25maWcudGVzdElkICkgPCAwICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmICggbW9kdWxlICYmICF0ZXN0SW5Nb2R1bGVDaGFpbiggdGhpcy5tb2R1bGUgKSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZiAoICFmaWx0ZXIgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVnZXhGaWx0ZXIgP1xuXHRcdFx0dGhpcy5yZWdleEZpbHRlciggISFyZWdleEZpbHRlclsxXSwgcmVnZXhGaWx0ZXJbMl0sIHJlZ2V4RmlsdGVyWzNdLCBmdWxsTmFtZSApIDpcblx0XHRcdHRoaXMuc3RyaW5nRmlsdGVyKCBmaWx0ZXIsIGZ1bGxOYW1lICk7XG5cdH0sXG5cblx0cmVnZXhGaWx0ZXI6IGZ1bmN0aW9uKCBleGNsdWRlLCBwYXR0ZXJuLCBmbGFncywgZnVsbE5hbWUgKSB7XG5cdFx0dmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCggcGF0dGVybiwgZmxhZ3MgKTtcblx0XHR2YXIgbWF0Y2ggPSByZWdleC50ZXN0KCBmdWxsTmFtZSApO1xuXG5cdFx0cmV0dXJuIG1hdGNoICE9PSBleGNsdWRlO1xuXHR9LFxuXG5cdHN0cmluZ0ZpbHRlcjogZnVuY3Rpb24oIGZpbHRlciwgZnVsbE5hbWUgKSB7XG5cdFx0ZmlsdGVyID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XG5cdFx0ZnVsbE5hbWUgPSBmdWxsTmFtZS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0dmFyIGluY2x1ZGUgPSBmaWx0ZXIuY2hhckF0KCAwICkgIT09IFwiIVwiO1xuXHRcdGlmICggIWluY2x1ZGUgKSB7XG5cdFx0XHRmaWx0ZXIgPSBmaWx0ZXIuc2xpY2UoIDEgKTtcblx0XHR9XG5cblx0XHQvLyBJZiB0aGUgZmlsdGVyIG1hdGNoZXMsIHdlIG5lZWQgdG8gaG9ub3VyIGluY2x1ZGVcblx0XHRpZiAoIGZ1bGxOYW1lLmluZGV4T2YoIGZpbHRlciApICE9PSAtMSApIHtcblx0XHRcdHJldHVybiBpbmNsdWRlO1xuXHRcdH1cblxuXHRcdC8vIE90aGVyd2lzZSwgZG8gdGhlIG9wcG9zaXRlXG5cdFx0cmV0dXJuICFpbmNsdWRlO1xuXHR9XG59O1xuXG4vLyBSZXNldHMgdGhlIHRlc3Qgc2V0dXAuIFVzZWZ1bCBmb3IgdGVzdHMgdGhhdCBtb2RpZnkgdGhlIERPTS5cbi8qXG5ERVBSRUNBVEVEOiBVc2UgbXVsdGlwbGUgdGVzdHMgaW5zdGVhZCBvZiByZXNldHRpbmcgaW5zaWRlIGEgdGVzdC5cblVzZSB0ZXN0U3RhcnQgb3IgdGVzdERvbmUgZm9yIGN1c3RvbSBjbGVhbnVwLlxuVGhpcyBtZXRob2Qgd2lsbCB0aHJvdyBhbiBlcnJvciBpbiAyLjAsIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gMi4xXG4qL1xuUVVuaXQucmVzZXQgPSBmdW5jdGlvbigpIHtcblxuXHQvLyBSZXR1cm4gb24gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRzXG5cdC8vIFRoaXMgaXMgbmVjZXNzYXJ5IHRvIG5vdCBicmVhayBvbiBub2RlIHRlc3RzXG5cdGlmICggIWRlZmluZWQuZG9jdW1lbnQgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIGZpeHR1cmUgPSBkZWZpbmVkLmRvY3VtZW50ICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICYmXG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggXCJxdW5pdC1maXh0dXJlXCIgKTtcblxuXHRpZiAoIGZpeHR1cmUgKSB7XG5cdFx0Zml4dHVyZS5pbm5lckhUTUwgPSBjb25maWcuZml4dHVyZTtcblx0fVxufTtcblxuUVVuaXQucHVzaEZhaWx1cmUgPSBmdW5jdGlvbigpIHtcblx0aWYgKCAhUVVuaXQuY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCBcInB1c2hGYWlsdXJlKCkgYXNzZXJ0aW9uIG91dHNpZGUgdGVzdCBjb250ZXh0LCBpbiBcIiArXG5cdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cdH1cblxuXHQvLyBHZXRzIGN1cnJlbnQgdGVzdCBvYmpcblx0dmFyIGN1cnJlbnRUZXN0ID0gUVVuaXQuY29uZmlnLmN1cnJlbnQ7XG5cblx0cmV0dXJuIGN1cnJlbnRUZXN0LnB1c2hGYWlsdXJlLmFwcGx5KCBjdXJyZW50VGVzdCwgYXJndW1lbnRzICk7XG59O1xuXG4vLyBCYXNlZCBvbiBKYXZhJ3MgU3RyaW5nLmhhc2hDb2RlLCBhIHNpbXBsZSBidXQgbm90XG4vLyByaWdvcm91c2x5IGNvbGxpc2lvbiByZXNpc3RhbnQgaGFzaGluZyBmdW5jdGlvblxuZnVuY3Rpb24gZ2VuZXJhdGVIYXNoKCBtb2R1bGUsIHRlc3ROYW1lICkge1xuXHR2YXIgaGV4LFxuXHRcdGkgPSAwLFxuXHRcdGhhc2ggPSAwLFxuXHRcdHN0ciA9IG1vZHVsZSArIFwiXFx4MUNcIiArIHRlc3ROYW1lLFxuXHRcdGxlbiA9IHN0ci5sZW5ndGg7XG5cblx0Zm9yICggOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0aGFzaCAgPSAoICggaGFzaCA8PCA1ICkgLSBoYXNoICkgKyBzdHIuY2hhckNvZGVBdCggaSApO1xuXHRcdGhhc2ggfD0gMDtcblx0fVxuXG5cdC8vIENvbnZlcnQgdGhlIHBvc3NpYmx5IG5lZ2F0aXZlIGludGVnZXIgaGFzaCBjb2RlIGludG8gYW4gOCBjaGFyYWN0ZXIgaGV4IHN0cmluZywgd2hpY2ggaXNuJ3Rcblx0Ly8gc3RyaWN0bHkgbmVjZXNzYXJ5IGJ1dCBpbmNyZWFzZXMgdXNlciB1bmRlcnN0YW5kaW5nIHRoYXQgdGhlIGlkIGlzIGEgU0hBLWxpa2UgaGFzaFxuXHRoZXggPSAoIDB4MTAwMDAwMDAwICsgaGFzaCApLnRvU3RyaW5nKCAxNiApO1xuXHRpZiAoIGhleC5sZW5ndGggPCA4ICkge1xuXHRcdGhleCA9IFwiMDAwMDAwMFwiICsgaGV4O1xuXHR9XG5cblx0cmV0dXJuIGhleC5zbGljZSggLTggKTtcbn1cblxuZnVuY3Rpb24gc3luY2hyb25pemUoIGNhbGxiYWNrLCBwcmlvcml0eSApIHtcblx0dmFyIGxhc3QgPSAhcHJpb3JpdHk7XG5cblx0aWYgKCBRVW5pdC5vYmplY3RUeXBlKCBjYWxsYmFjayApID09PSBcImFycmF5XCIgKSB7XG5cdFx0d2hpbGUgKCBjYWxsYmFjay5sZW5ndGggKSB7XG5cdFx0XHRzeW5jaHJvbml6ZSggY2FsbGJhY2suc2hpZnQoKSApO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoIHByaW9yaXR5ICkge1xuXHRcdGNvbmZpZy5xdWV1ZS5zcGxpY2UoIHByaW9yaXR5Q291bnQrKywgMCwgY2FsbGJhY2sgKTtcblx0fSBlbHNlIHtcblx0XHRjb25maWcucXVldWUucHVzaCggY2FsbGJhY2sgKTtcblx0fVxuXG5cdGlmICggY29uZmlnLmF1dG9ydW4gJiYgIWNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRwcm9jZXNzKCBsYXN0ICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2F2ZUdsb2JhbCgpIHtcblx0Y29uZmlnLnBvbGx1dGlvbiA9IFtdO1xuXG5cdGlmICggY29uZmlnLm5vZ2xvYmFscyApIHtcblx0XHRmb3IgKCB2YXIga2V5IGluIGdsb2JhbCApIHtcblx0XHRcdGlmICggaGFzT3duLmNhbGwoIGdsb2JhbCwga2V5ICkgKSB7XG5cblx0XHRcdFx0Ly8gaW4gT3BlcmEgc29tZXRpbWVzIERPTSBlbGVtZW50IGlkcyBzaG93IHVwIGhlcmUsIGlnbm9yZSB0aGVtXG5cdFx0XHRcdGlmICggL15xdW5pdC10ZXN0LW91dHB1dC8udGVzdCgga2V5ICkgKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uZmlnLnBvbGx1dGlvbi5wdXNoKCBrZXkgKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gY2hlY2tQb2xsdXRpb24oKSB7XG5cdHZhciBuZXdHbG9iYWxzLFxuXHRcdGRlbGV0ZWRHbG9iYWxzLFxuXHRcdG9sZCA9IGNvbmZpZy5wb2xsdXRpb247XG5cblx0c2F2ZUdsb2JhbCgpO1xuXG5cdG5ld0dsb2JhbHMgPSBkaWZmKCBjb25maWcucG9sbHV0aW9uLCBvbGQgKTtcblx0aWYgKCBuZXdHbG9iYWxzLmxlbmd0aCA+IDAgKSB7XG5cdFx0UVVuaXQucHVzaEZhaWx1cmUoIFwiSW50cm9kdWNlZCBnbG9iYWwgdmFyaWFibGUocyk6IFwiICsgbmV3R2xvYmFscy5qb2luKCBcIiwgXCIgKSApO1xuXHR9XG5cblx0ZGVsZXRlZEdsb2JhbHMgPSBkaWZmKCBvbGQsIGNvbmZpZy5wb2xsdXRpb24gKTtcblx0aWYgKCBkZWxldGVkR2xvYmFscy5sZW5ndGggPiAwICkge1xuXHRcdFFVbml0LnB1c2hGYWlsdXJlKCBcIkRlbGV0ZWQgZ2xvYmFsIHZhcmlhYmxlKHMpOiBcIiArIGRlbGV0ZWRHbG9iYWxzLmpvaW4oIFwiLCBcIiApICk7XG5cdH1cbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0LmFzeW5jVGVzdFxuZnVuY3Rpb24gYXN5bmNUZXN0KCB0ZXN0TmFtZSwgZXhwZWN0ZWQsIGNhbGxiYWNrICkge1xuXHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgKSB7XG5cdFx0Y2FsbGJhY2sgPSBleHBlY3RlZDtcblx0XHRleHBlY3RlZCA9IG51bGw7XG5cdH1cblxuXHRRVW5pdC50ZXN0KCB0ZXN0TmFtZSwgZXhwZWN0ZWQsIGNhbGxiYWNrLCB0cnVlICk7XG59XG5cbi8vIFdpbGwgYmUgZXhwb3NlZCBhcyBRVW5pdC50ZXN0XG5mdW5jdGlvbiB0ZXN0KCB0ZXN0TmFtZSwgZXhwZWN0ZWQsIGNhbGxiYWNrLCBhc3luYyApIHtcblx0aWYgKCBmb2N1c2VkICkgIHsgcmV0dXJuOyB9XG5cblx0dmFyIG5ld1Rlc3Q7XG5cblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdGNhbGxiYWNrID0gZXhwZWN0ZWQ7XG5cdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHR9XG5cblx0bmV3VGVzdCA9IG5ldyBUZXN0KHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdGFzeW5jOiBhc3luYyxcblx0XHRjYWxsYmFjazogY2FsbGJhY2tcblx0fSk7XG5cblx0bmV3VGVzdC5xdWV1ZSgpO1xufVxuXG4vLyBXaWxsIGJlIGV4cG9zZWQgYXMgUVVuaXQuc2tpcFxuZnVuY3Rpb24gc2tpcCggdGVzdE5hbWUgKSB7XG5cdGlmICggZm9jdXNlZCApICB7IHJldHVybjsgfVxuXG5cdHZhciB0ZXN0ID0gbmV3IFRlc3Qoe1xuXHRcdHRlc3ROYW1lOiB0ZXN0TmFtZSxcblx0XHRza2lwOiB0cnVlXG5cdH0pO1xuXG5cdHRlc3QucXVldWUoKTtcbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0Lm9ubHlcbmZ1bmN0aW9uIG9ubHkoIHRlc3ROYW1lLCBleHBlY3RlZCwgY2FsbGJhY2ssIGFzeW5jICkge1xuXHR2YXIgbmV3VGVzdDtcblxuXHRpZiAoIGZvY3VzZWQgKSAgeyByZXR1cm47IH1cblxuXHRRVW5pdC5jb25maWcucXVldWUubGVuZ3RoID0gMDtcblx0Zm9jdXNlZCA9IHRydWU7XG5cblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdGNhbGxiYWNrID0gZXhwZWN0ZWQ7XG5cdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHR9XG5cblx0bmV3VGVzdCA9IG5ldyBUZXN0KHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdGFzeW5jOiBhc3luYyxcblx0XHRjYWxsYmFjazogY2FsbGJhY2tcblx0fSk7XG5cblx0bmV3VGVzdC5xdWV1ZSgpO1xufVxuXG5mdW5jdGlvbiBBc3NlcnQoIHRlc3RDb250ZXh0ICkge1xuXHR0aGlzLnRlc3QgPSB0ZXN0Q29udGV4dDtcbn1cblxuLy8gQXNzZXJ0IGhlbHBlcnNcblFVbml0LmFzc2VydCA9IEFzc2VydC5wcm90b3R5cGUgPSB7XG5cblx0Ly8gU3BlY2lmeSB0aGUgbnVtYmVyIG9mIGV4cGVjdGVkIGFzc2VydGlvbnMgdG8gZ3VhcmFudGVlIHRoYXQgZmFpbGVkIHRlc3Rcblx0Ly8gKG5vIGFzc2VydGlvbnMgYXJlIHJ1biBhdCBhbGwpIGRvbid0IHNsaXAgdGhyb3VnaC5cblx0ZXhwZWN0OiBmdW5jdGlvbiggYXNzZXJ0cyApIHtcblx0XHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgKSB7XG5cdFx0XHR0aGlzLnRlc3QuZXhwZWN0ZWQgPSBhc3NlcnRzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50ZXN0LmV4cGVjdGVkO1xuXHRcdH1cblx0fSxcblxuXHQvLyBJbmNyZW1lbnQgdGhpcyBUZXN0J3Mgc2VtYXBob3JlIGNvdW50ZXIsIHRoZW4gcmV0dXJuIGEgZnVuY3Rpb24gdGhhdFxuXHQvLyBkZWNyZW1lbnRzIHRoYXQgY291bnRlciBhIG1heGltdW0gb2Ygb25jZS5cblx0YXN5bmM6IGZ1bmN0aW9uKCBjb3VudCApIHtcblx0XHR2YXIgdGVzdCA9IHRoaXMudGVzdCxcblx0XHRcdHBvcHBlZCA9IGZhbHNlLFxuXHRcdFx0YWNjZXB0Q2FsbENvdW50ID0gY291bnQ7XG5cblx0XHRpZiAoIHR5cGVvZiBhY2NlcHRDYWxsQ291bnQgPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHRhY2NlcHRDYWxsQ291bnQgPSAxO1xuXHRcdH1cblxuXHRcdHRlc3Quc2VtYXBob3JlICs9IDE7XG5cdFx0dGVzdC51c2VkQXN5bmMgPSB0cnVlO1xuXHRcdHBhdXNlUHJvY2Vzc2luZygpO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIGRvbmUoKSB7XG5cblx0XHRcdGlmICggcG9wcGVkICkge1xuXHRcdFx0XHR0ZXN0LnB1c2hGYWlsdXJlKCBcIlRvbyBtYW55IGNhbGxzIHRvIHRoZSBgYXNzZXJ0LmFzeW5jYCBjYWxsYmFja1wiLFxuXHRcdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0YWNjZXB0Q2FsbENvdW50IC09IDE7XG5cdFx0XHRpZiAoIGFjY2VwdENhbGxDb3VudCA+IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGVzdC5zZW1hcGhvcmUgLT0gMTtcblx0XHRcdHBvcHBlZCA9IHRydWU7XG5cdFx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdFx0fTtcblx0fSxcblxuXHQvLyBFeHBvcnRzIHRlc3QucHVzaCgpIHRvIHRoZSB1c2VyIEFQSVxuXHRwdXNoOiBmdW5jdGlvbiggLyogcmVzdWx0LCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBuZWdhdGl2ZSAqLyApIHtcblx0XHR2YXIgYXNzZXJ0ID0gdGhpcyxcblx0XHRcdGN1cnJlbnRUZXN0ID0gKCBhc3NlcnQgaW5zdGFuY2VvZiBBc3NlcnQgJiYgYXNzZXJ0LnRlc3QgKSB8fCBRVW5pdC5jb25maWcuY3VycmVudDtcblxuXHRcdC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGZpeC5cblx0XHQvLyBBbGxvd3MgdGhlIGRpcmVjdCB1c2Ugb2YgZ2xvYmFsIGV4cG9ydGVkIGFzc2VydGlvbnMgYW5kIFFVbml0LmFzc2VydC4qXG5cdFx0Ly8gQWx0aG91Z2gsIGl0J3MgdXNlIGlzIG5vdCByZWNvbW1lbmRlZCBhcyBpdCBjYW4gbGVhayBhc3NlcnRpb25zXG5cdFx0Ly8gdG8gb3RoZXIgdGVzdHMgZnJvbSBhc3luYyB0ZXN0cywgYmVjYXVzZSB3ZSBvbmx5IGdldCBhIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCB0ZXN0LFxuXHRcdC8vIG5vdCBleGFjdGx5IHRoZSB0ZXN0IHdoZXJlIGFzc2VydGlvbiB3ZXJlIGludGVuZGVkIHRvIGJlIGNhbGxlZC5cblx0XHRpZiAoICFjdXJyZW50VGVzdCApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJhc3NlcnRpb24gb3V0c2lkZSB0ZXN0IGNvbnRleHQsIGluIFwiICsgc291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdH1cblxuXHRcdGlmICggY3VycmVudFRlc3QudXNlZEFzeW5jID09PSB0cnVlICYmIGN1cnJlbnRUZXN0LnNlbWFwaG9yZSA9PT0gMCApIHtcblx0XHRcdGN1cnJlbnRUZXN0LnB1c2hGYWlsdXJlKCBcIkFzc2VydGlvbiBhZnRlciB0aGUgZmluYWwgYGFzc2VydC5hc3luY2Agd2FzIHJlc29sdmVkXCIsXG5cdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblxuXHRcdFx0Ly8gQWxsb3cgdGhpcyBhc3NlcnRpb24gdG8gY29udGludWUgcnVubmluZyBhbnl3YXkuLi5cblx0XHR9XG5cblx0XHRpZiAoICEoIGFzc2VydCBpbnN0YW5jZW9mIEFzc2VydCApICkge1xuXHRcdFx0YXNzZXJ0ID0gY3VycmVudFRlc3QuYXNzZXJ0O1xuXHRcdH1cblx0XHRyZXR1cm4gYXNzZXJ0LnRlc3QucHVzaC5hcHBseSggYXNzZXJ0LnRlc3QsIGFyZ3VtZW50cyApO1xuXHR9LFxuXG5cdG9rOiBmdW5jdGlvbiggcmVzdWx0LCBtZXNzYWdlICkge1xuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlIHx8ICggcmVzdWx0ID8gXCJva2F5XCIgOiBcImZhaWxlZCwgZXhwZWN0ZWQgYXJndW1lbnQgdG8gYmUgdHJ1dGh5LCB3YXM6IFwiICtcblx0XHRcdFFVbml0LmR1bXAucGFyc2UoIHJlc3VsdCApICk7XG5cdFx0dGhpcy5wdXNoKCAhIXJlc3VsdCwgcmVzdWx0LCB0cnVlLCBtZXNzYWdlICk7XG5cdH0sXG5cblx0bm90T2s6IGZ1bmN0aW9uKCByZXN1bHQsIG1lc3NhZ2UgKSB7XG5cdFx0bWVzc2FnZSA9IG1lc3NhZ2UgfHwgKCAhcmVzdWx0ID8gXCJva2F5XCIgOiBcImZhaWxlZCwgZXhwZWN0ZWQgYXJndW1lbnQgdG8gYmUgZmFsc3ksIHdhczogXCIgK1xuXHRcdFx0UVVuaXQuZHVtcC5wYXJzZSggcmVzdWx0ICkgKTtcblx0XHR0aGlzLnB1c2goICFyZXN1bHQsIHJlc3VsdCwgZmFsc2UsIG1lc3NhZ2UgKTtcblx0fSxcblxuXHRlcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0Lypqc2hpbnQgZXFlcWVxOmZhbHNlICovXG5cdFx0dGhpcy5wdXNoKCBleHBlY3RlZCA9PSBhY3R1YWwsIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKTtcblx0fSxcblxuXHRub3RFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0Lypqc2hpbnQgZXFlcWVxOmZhbHNlICovXG5cdFx0dGhpcy5wdXNoKCBleHBlY3RlZCAhPSBhY3R1YWwsIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIHRydWUgKTtcblx0fSxcblxuXHRwcm9wRXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdGFjdHVhbCA9IG9iamVjdFZhbHVlcyggYWN0dWFsICk7XG5cdFx0ZXhwZWN0ZWQgPSBvYmplY3RWYWx1ZXMoIGV4cGVjdGVkICk7XG5cdFx0dGhpcy5wdXNoKCBRVW5pdC5lcXVpdiggYWN0dWFsLCBleHBlY3RlZCApLCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICk7XG5cdH0sXG5cblx0bm90UHJvcEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHRhY3R1YWwgPSBvYmplY3RWYWx1ZXMoIGFjdHVhbCApO1xuXHRcdGV4cGVjdGVkID0gb2JqZWN0VmFsdWVzKCBleHBlY3RlZCApO1xuXHRcdHRoaXMucHVzaCggIVFVbml0LmVxdWl2KCBhY3R1YWwsIGV4cGVjdGVkICksIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIHRydWUgKTtcblx0fSxcblxuXHRkZWVwRXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHRoaXMucHVzaCggUVVuaXQuZXF1aXYoIGFjdHVhbCwgZXhwZWN0ZWQgKSwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApO1xuXHR9LFxuXG5cdG5vdERlZXBFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dGhpcy5wdXNoKCAhUVVuaXQuZXF1aXYoIGFjdHVhbCwgZXhwZWN0ZWQgKSwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgdHJ1ZSApO1xuXHR9LFxuXG5cdHN0cmljdEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR0aGlzLnB1c2goIGV4cGVjdGVkID09PSBhY3R1YWwsIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKTtcblx0fSxcblxuXHRub3RTdHJpY3RFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dGhpcy5wdXNoKCBleHBlY3RlZCAhPT0gYWN0dWFsLCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCB0cnVlICk7XG5cdH0sXG5cblx0XCJ0aHJvd3NcIjogZnVuY3Rpb24oIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR2YXIgYWN0dWFsLCBleHBlY3RlZFR5cGUsXG5cdFx0XHRleHBlY3RlZE91dHB1dCA9IGV4cGVjdGVkLFxuXHRcdFx0b2sgPSBmYWxzZSxcblx0XHRcdGN1cnJlbnRUZXN0ID0gKCB0aGlzIGluc3RhbmNlb2YgQXNzZXJ0ICYmIHRoaXMudGVzdCApIHx8IFFVbml0LmNvbmZpZy5jdXJyZW50O1xuXG5cdFx0Ly8gJ2V4cGVjdGVkJyBpcyBvcHRpb25hbCB1bmxlc3MgZG9pbmcgc3RyaW5nIGNvbXBhcmlzb25cblx0XHRpZiAoIG1lc3NhZ2UgPT0gbnVsbCAmJiB0eXBlb2YgZXhwZWN0ZWQgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRtZXNzYWdlID0gZXhwZWN0ZWQ7XG5cdFx0XHRleHBlY3RlZCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0Y3VycmVudFRlc3QuaWdub3JlR2xvYmFsRXJyb3JzID0gdHJ1ZTtcblx0XHR0cnkge1xuXHRcdFx0YmxvY2suY2FsbCggY3VycmVudFRlc3QudGVzdEVudmlyb25tZW50ICk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0YWN0dWFsID0gZTtcblx0XHR9XG5cdFx0Y3VycmVudFRlc3QuaWdub3JlR2xvYmFsRXJyb3JzID0gZmFsc2U7XG5cblx0XHRpZiAoIGFjdHVhbCApIHtcblx0XHRcdGV4cGVjdGVkVHlwZSA9IFFVbml0Lm9iamVjdFR5cGUoIGV4cGVjdGVkICk7XG5cblx0XHRcdC8vIHdlIGRvbid0IHdhbnQgdG8gdmFsaWRhdGUgdGhyb3duIGVycm9yXG5cdFx0XHRpZiAoICFleHBlY3RlZCApIHtcblx0XHRcdFx0b2sgPSB0cnVlO1xuXHRcdFx0XHRleHBlY3RlZE91dHB1dCA9IG51bGw7XG5cblx0XHRcdC8vIGV4cGVjdGVkIGlzIGEgcmVnZXhwXG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwicmVnZXhwXCIgKSB7XG5cdFx0XHRcdG9rID0gZXhwZWN0ZWQudGVzdCggZXJyb3JTdHJpbmcoIGFjdHVhbCApICk7XG5cblx0XHRcdC8vIGV4cGVjdGVkIGlzIGEgc3RyaW5nXG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdG9rID0gZXhwZWN0ZWQgPT09IGVycm9yU3RyaW5nKCBhY3R1YWwgKTtcblxuXHRcdFx0Ly8gZXhwZWN0ZWQgaXMgYSBjb25zdHJ1Y3RvciwgbWF5YmUgYW4gRXJyb3IgY29uc3RydWN0b3Jcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJmdW5jdGlvblwiICYmIGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkICkge1xuXHRcdFx0XHRvayA9IHRydWU7XG5cblx0XHRcdC8vIGV4cGVjdGVkIGlzIGFuIEVycm9yIG9iamVjdFxuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcIm9iamVjdFwiICkge1xuXHRcdFx0XHRvayA9IGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkLmNvbnN0cnVjdG9yICYmXG5cdFx0XHRcdFx0YWN0dWFsLm5hbWUgPT09IGV4cGVjdGVkLm5hbWUgJiZcblx0XHRcdFx0XHRhY3R1YWwubWVzc2FnZSA9PT0gZXhwZWN0ZWQubWVzc2FnZTtcblxuXHRcdFx0Ly8gZXhwZWN0ZWQgaXMgYSB2YWxpZGF0aW9uIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdHJ1ZSBpZiB2YWxpZGF0aW9uIHBhc3NlZFxuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcImZ1bmN0aW9uXCIgJiYgZXhwZWN0ZWQuY2FsbCgge30sIGFjdHVhbCApID09PSB0cnVlICkge1xuXHRcdFx0XHRleHBlY3RlZE91dHB1dCA9IG51bGw7XG5cdFx0XHRcdG9rID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjdXJyZW50VGVzdC5hc3NlcnQucHVzaCggb2ssIGFjdHVhbCwgZXhwZWN0ZWRPdXRwdXQsIG1lc3NhZ2UgKTtcblx0fVxufTtcblxuLy8gUHJvdmlkZSBhbiBhbHRlcm5hdGl2ZSB0byBhc3NlcnQudGhyb3dzKCksIGZvciBlbnZpcm9ubWVudHMgdGhhdCBjb25zaWRlciB0aHJvd3MgYSByZXNlcnZlZCB3b3JkXG4vLyBLbm93biB0byB1cyBhcmU6IENsb3N1cmUgQ29tcGlsZXIsIE5hcndoYWxcbihmdW5jdGlvbigpIHtcblx0Lypqc2hpbnQgc3ViOnRydWUgKi9cblx0QXNzZXJ0LnByb3RvdHlwZS5yYWlzZXMgPSBBc3NlcnQucHJvdG90eXBlWyBcInRocm93c1wiIF07XG59KCkpO1xuXG5mdW5jdGlvbiBlcnJvclN0cmluZyggZXJyb3IgKSB7XG5cdHZhciBuYW1lLCBtZXNzYWdlLFxuXHRcdHJlc3VsdEVycm9yU3RyaW5nID0gZXJyb3IudG9TdHJpbmcoKTtcblx0aWYgKCByZXN1bHRFcnJvclN0cmluZy5zdWJzdHJpbmcoIDAsIDcgKSA9PT0gXCJbb2JqZWN0XCIgKSB7XG5cdFx0bmFtZSA9IGVycm9yLm5hbWUgPyBlcnJvci5uYW1lLnRvU3RyaW5nKCkgOiBcIkVycm9yXCI7XG5cdFx0bWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgPyBlcnJvci5tZXNzYWdlLnRvU3RyaW5nKCkgOiBcIlwiO1xuXHRcdGlmICggbmFtZSAmJiBtZXNzYWdlICkge1xuXHRcdFx0cmV0dXJuIG5hbWUgKyBcIjogXCIgKyBtZXNzYWdlO1xuXHRcdH0gZWxzZSBpZiAoIG5hbWUgKSB7XG5cdFx0XHRyZXR1cm4gbmFtZTtcblx0XHR9IGVsc2UgaWYgKCBtZXNzYWdlICkge1xuXHRcdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcIkVycm9yXCI7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHJldHVybiByZXN1bHRFcnJvclN0cmluZztcblx0fVxufVxuXG4vLyBUZXN0IGZvciBlcXVhbGl0eSBhbnkgSmF2YVNjcmlwdCB0eXBlLlxuLy8gQXV0aG9yOiBQaGlsaXBwZSBSYXRow6kgPHByYXRoZUBnbWFpbC5jb20+XG5RVW5pdC5lcXVpdiA9IChmdW5jdGlvbigpIHtcblxuXHQvLyBTdGFjayB0byBkZWNpZGUgYmV0d2VlbiBza2lwL2Fib3J0IGZ1bmN0aW9uc1xuXHR2YXIgY2FsbGVycyA9IFtdO1xuXG5cdC8vIFN0YWNrIHRvIGF2b2lkaW5nIGxvb3BzIGZyb20gY2lyY3VsYXIgcmVmZXJlbmNpbmdcblx0dmFyIHBhcmVudHMgPSBbXTtcblx0dmFyIHBhcmVudHNCID0gW107XG5cblx0dmFyIGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uKCBvYmogKSB7XG5cblx0XHQvKmpzaGludCBwcm90bzogdHJ1ZSAqL1xuXHRcdHJldHVybiBvYmouX19wcm90b19fO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHVzZVN0cmljdEVxdWFsaXR5KCBiLCBhICkge1xuXG5cdFx0Ly8gVG8gY2F0Y2ggc2hvcnQgYW5ub3RhdGlvbiBWUyAnbmV3JyBhbm5vdGF0aW9uIG9mIGEgZGVjbGFyYXRpb24uIGUuZy46XG5cdFx0Ly8gYHZhciBpID0gMTtgXG5cdFx0Ly8gYHZhciBqID0gbmV3IE51bWJlcigxKTtgXG5cdFx0aWYgKCB0eXBlb2YgYSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdGEgPSBhLnZhbHVlT2YoKTtcblx0XHR9XG5cdFx0aWYgKCB0eXBlb2YgYiA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdGIgPSBiLnZhbHVlT2YoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYSA9PT0gYjtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbXBhcmVDb25zdHJ1Y3RvcnMoIGEsIGIgKSB7XG5cdFx0dmFyIHByb3RvQSA9IGdldFByb3RvKCBhICk7XG5cdFx0dmFyIHByb3RvQiA9IGdldFByb3RvKCBiICk7XG5cblx0XHQvLyBDb21wYXJpbmcgY29uc3RydWN0b3JzIGlzIG1vcmUgc3RyaWN0IHRoYW4gdXNpbmcgYGluc3RhbmNlb2ZgXG5cdFx0aWYgKCBhLmNvbnN0cnVjdG9yID09PSBiLmNvbnN0cnVjdG9yICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gUmVmICM4NTFcblx0XHQvLyBJZiB0aGUgb2JqIHByb3RvdHlwZSBkZXNjZW5kcyBmcm9tIGEgbnVsbCBjb25zdHJ1Y3RvciwgdHJlYXQgaXRcblx0XHQvLyBhcyBhIG51bGwgcHJvdG90eXBlLlxuXHRcdGlmICggcHJvdG9BICYmIHByb3RvQS5jb25zdHJ1Y3RvciA9PT0gbnVsbCApIHtcblx0XHRcdHByb3RvQSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmICggcHJvdG9CICYmIHByb3RvQi5jb25zdHJ1Y3RvciA9PT0gbnVsbCApIHtcblx0XHRcdHByb3RvQiA9IG51bGw7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsb3cgb2JqZWN0cyB3aXRoIG5vIHByb3RvdHlwZSB0byBiZSBlcXVpdmFsZW50IHRvXG5cdFx0Ly8gb2JqZWN0cyB3aXRoIE9iamVjdCBhcyB0aGVpciBjb25zdHJ1Y3Rvci5cblx0XHRpZiAoICggcHJvdG9BID09PSBudWxsICYmIHByb3RvQiA9PT0gT2JqZWN0LnByb3RvdHlwZSApIHx8XG5cdFx0XHRcdCggcHJvdG9CID09PSBudWxsICYmIHByb3RvQSA9PT0gT2JqZWN0LnByb3RvdHlwZSApICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UmVnRXhwRmxhZ3MoIHJlZ2V4cCApIHtcblx0XHRyZXR1cm4gXCJmbGFnc1wiIGluIHJlZ2V4cCA/IHJlZ2V4cC5mbGFncyA6IHJlZ2V4cC50b1N0cmluZygpLm1hdGNoKCAvW2dpbXV5XSokLyApWyAwIF07XG5cdH1cblxuXHR2YXIgY2FsbGJhY2tzID0ge1xuXHRcdFwic3RyaW5nXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwiYm9vbGVhblwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcIm51bWJlclwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcIm51bGxcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJ1bmRlZmluZWRcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJzeW1ib2xcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJkYXRlXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXG5cdFx0XCJuYW5cIjogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0XCJyZWdleHBcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHRyZXR1cm4gYS5zb3VyY2UgPT09IGIuc291cmNlICYmXG5cblx0XHRcdFx0Ly8gSW5jbHVkZSBmbGFncyBpbiB0aGUgY29tcGFyaXNvblxuXHRcdFx0XHRnZXRSZWdFeHBGbGFncyggYSApID09PSBnZXRSZWdFeHBGbGFncyggYiApO1xuXHRcdH0sXG5cblx0XHQvLyAtIHNraXAgd2hlbiB0aGUgcHJvcGVydHkgaXMgYSBtZXRob2Qgb2YgYW4gaW5zdGFuY2UgKE9PUClcblx0XHQvLyAtIGFib3J0IG90aGVyd2lzZSxcblx0XHQvLyBpbml0aWFsID09PSB3b3VsZCBoYXZlIGNhdGNoIGlkZW50aWNhbCByZWZlcmVuY2VzIGFueXdheVxuXHRcdFwiZnVuY3Rpb25cIjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY2FsbGVyID0gY2FsbGVyc1sgY2FsbGVycy5sZW5ndGggLSAxIF07XG5cdFx0XHRyZXR1cm4gY2FsbGVyICE9PSBPYmplY3QgJiYgdHlwZW9mIGNhbGxlciAhPT0gXCJ1bmRlZmluZWRcIjtcblx0XHR9LFxuXG5cdFx0XCJhcnJheVwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBpLCBqLCBsZW4sIGxvb3AsIGFDaXJjdWxhciwgYkNpcmN1bGFyO1xuXG5cdFx0XHRsZW4gPSBhLmxlbmd0aDtcblx0XHRcdGlmICggbGVuICE9PSBiLmxlbmd0aCApIHtcblx0XHRcdFx0Ly8gc2FmZSBhbmQgZmFzdGVyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVHJhY2sgcmVmZXJlbmNlIHRvIGF2b2lkIGNpcmN1bGFyIHJlZmVyZW5jZXNcblx0XHRcdHBhcmVudHMucHVzaCggYSApO1xuXHRcdFx0cGFyZW50c0IucHVzaCggYiApO1xuXHRcdFx0Zm9yICggaSA9IDA7IGkgPCBsZW47IGkrKyApIHtcblx0XHRcdFx0bG9vcCA9IGZhbHNlO1xuXHRcdFx0XHRmb3IgKCBqID0gMDsgaiA8IHBhcmVudHMubGVuZ3RoOyBqKysgKSB7XG5cdFx0XHRcdFx0YUNpcmN1bGFyID0gcGFyZW50c1sgaiBdID09PSBhWyBpIF07XG5cdFx0XHRcdFx0YkNpcmN1bGFyID0gcGFyZW50c0JbIGogXSA9PT0gYlsgaSBdO1xuXHRcdFx0XHRcdGlmICggYUNpcmN1bGFyIHx8IGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdGlmICggYVsgaSBdID09PSBiWyBpIF0gfHwgYUNpcmN1bGFyICYmIGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdFx0bG9vcCA9IHRydWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRwYXJlbnRzLnBvcCgpO1xuXHRcdFx0XHRcdFx0XHRwYXJlbnRzQi5wb3AoKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICFsb29wICYmICFpbm5lckVxdWl2KCBhWyBpIF0sIGJbIGkgXSApICkge1xuXHRcdFx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRcdFx0cGFyZW50c0IucG9wKCk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRwYXJlbnRzLnBvcCgpO1xuXHRcdFx0cGFyZW50c0IucG9wKCk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0XCJzZXRcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHR2YXIgYUFycmF5LCBiQXJyYXk7XG5cblx0XHRcdGFBcnJheSA9IFtdO1xuXHRcdFx0YS5mb3JFYWNoKCBmdW5jdGlvbiggdiApIHtcblx0XHRcdFx0YUFycmF5LnB1c2goIHYgKTtcblx0XHRcdH0pO1xuXHRcdFx0YkFycmF5ID0gW107XG5cdFx0XHRiLmZvckVhY2goIGZ1bmN0aW9uKCB2ICkge1xuXHRcdFx0XHRiQXJyYXkucHVzaCggdiApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBpbm5lckVxdWl2KCBiQXJyYXksIGFBcnJheSApO1xuXHRcdH0sXG5cblx0XHRcIm1hcFwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBhQXJyYXksIGJBcnJheTtcblxuXHRcdFx0YUFycmF5ID0gW107XG5cdFx0XHRhLmZvckVhY2goIGZ1bmN0aW9uKCB2LCBrICkge1xuXHRcdFx0XHRhQXJyYXkucHVzaCggWyBrLCB2IF0gKTtcblx0XHRcdH0pO1xuXHRcdFx0YkFycmF5ID0gW107XG5cdFx0XHRiLmZvckVhY2goIGZ1bmN0aW9uKCB2LCBrICkge1xuXHRcdFx0XHRiQXJyYXkucHVzaCggWyBrLCB2IF0gKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gaW5uZXJFcXVpdiggYkFycmF5LCBhQXJyYXkgKTtcblx0XHR9LFxuXG5cdFx0XCJvYmplY3RcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHR2YXIgaSwgaiwgbG9vcCwgYUNpcmN1bGFyLCBiQ2lyY3VsYXI7XG5cblx0XHRcdC8vIERlZmF1bHQgdG8gdHJ1ZVxuXHRcdFx0dmFyIGVxID0gdHJ1ZTtcblx0XHRcdHZhciBhUHJvcGVydGllcyA9IFtdO1xuXHRcdFx0dmFyIGJQcm9wZXJ0aWVzID0gW107XG5cblx0XHRcdGlmICggY29tcGFyZUNvbnN0cnVjdG9ycyggYSwgYiApID09PSBmYWxzZSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTdGFjayBjb25zdHJ1Y3RvciBiZWZvcmUgdHJhdmVyc2luZyBwcm9wZXJ0aWVzXG5cdFx0XHRjYWxsZXJzLnB1c2goIGEuY29uc3RydWN0b3IgKTtcblxuXHRcdFx0Ly8gVHJhY2sgcmVmZXJlbmNlIHRvIGF2b2lkIGNpcmN1bGFyIHJlZmVyZW5jZXNcblx0XHRcdHBhcmVudHMucHVzaCggYSApO1xuXHRcdFx0cGFyZW50c0IucHVzaCggYiApO1xuXG5cdFx0XHQvLyBCZSBzdHJpY3Q6IGRvbid0IGVuc3VyZSBoYXNPd25Qcm9wZXJ0eSBhbmQgZ28gZGVlcFxuXHRcdFx0Zm9yICggaSBpbiBhICkge1xuXHRcdFx0XHRsb29wID0gZmFsc2U7XG5cdFx0XHRcdGZvciAoIGogPSAwOyBqIDwgcGFyZW50cy5sZW5ndGg7IGorKyApIHtcblx0XHRcdFx0XHRhQ2lyY3VsYXIgPSBwYXJlbnRzWyBqIF0gPT09IGFbIGkgXTtcblx0XHRcdFx0XHRiQ2lyY3VsYXIgPSBwYXJlbnRzQlsgaiBdID09PSBiWyBpIF07XG5cdFx0XHRcdFx0aWYgKCBhQ2lyY3VsYXIgfHwgYkNpcmN1bGFyICkge1xuXHRcdFx0XHRcdFx0aWYgKCBhWyBpIF0gPT09IGJbIGkgXSB8fCBhQ2lyY3VsYXIgJiYgYkNpcmN1bGFyICkge1xuXHRcdFx0XHRcdFx0XHRsb29wID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGVxID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRhUHJvcGVydGllcy5wdXNoKCBpICk7XG5cdFx0XHRcdGlmICggIWxvb3AgJiYgIWlubmVyRXF1aXYoIGFbIGkgXSwgYlsgaSBdICkgKSB7XG5cdFx0XHRcdFx0ZXEgPSBmYWxzZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRwYXJlbnRzLnBvcCgpO1xuXHRcdFx0cGFyZW50c0IucG9wKCk7XG5cblx0XHRcdC8vIFVuc3RhY2ssIHdlIGFyZSBkb25lXG5cdFx0XHRjYWxsZXJzLnBvcCgpO1xuXG5cdFx0XHRmb3IgKCBpIGluIGIgKSB7XG5cblx0XHRcdFx0Ly8gQ29sbGVjdCBiJ3MgcHJvcGVydGllc1xuXHRcdFx0XHRiUHJvcGVydGllcy5wdXNoKCBpICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEVuc3VyZXMgaWRlbnRpY2FsIHByb3BlcnRpZXMgbmFtZVxuXHRcdFx0cmV0dXJuIGVxICYmIGlubmVyRXF1aXYoIGFQcm9wZXJ0aWVzLnNvcnQoKSwgYlByb3BlcnRpZXMuc29ydCgpICk7XG5cdFx0fVxuXHR9O1xuXG5cdGZ1bmN0aW9uIHR5cGVFcXVpdiggYSwgYiApIHtcblx0XHR2YXIgdHlwZSA9IFFVbml0Lm9iamVjdFR5cGUoIGEgKTtcblx0XHRyZXR1cm4gUVVuaXQub2JqZWN0VHlwZSggYiApID09PSB0eXBlICYmIGNhbGxiYWNrc1sgdHlwZSBdKCBiLCBhICk7XG5cdH1cblxuXHQvLyBUaGUgcmVhbCBlcXVpdiBmdW5jdGlvblxuXHRmdW5jdGlvbiBpbm5lckVxdWl2KCBhLCBiICkge1xuXG5cdFx0Ly8gV2UncmUgZG9uZSB3aGVuIHRoZXJlJ3Mgbm90aGluZyBtb3JlIHRvIGNvbXBhcmVcblx0XHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPCAyICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gUmVxdWlyZSB0eXBlLXNwZWNpZmljIGVxdWFsaXR5XG5cdFx0cmV0dXJuICggYSA9PT0gYiB8fCB0eXBlRXF1aXYoIGEsIGIgKSApICYmXG5cblx0XHRcdC8vIC4uLmFjcm9zcyBhbGwgY29uc2VjdXRpdmUgYXJndW1lbnQgcGFpcnNcblx0XHRcdCggYXJndW1lbnRzLmxlbmd0aCA9PT0gMiB8fCBpbm5lckVxdWl2LmFwcGx5KCB0aGlzLCBbXS5zbGljZS5jYWxsKCBhcmd1bWVudHMsIDEgKSApICk7XG5cdH1cblxuXHRyZXR1cm4gaW5uZXJFcXVpdjtcbn0oKSk7XG5cbi8vIEJhc2VkIG9uIGpzRHVtcCBieSBBcmllbCBGbGVzbGVyXG4vLyBodHRwOi8vZmxlc2xlci5ibG9nc3BvdC5jb20vMjAwOC8wNS9qc2R1bXAtcHJldHR5LWR1bXAtb2YtYW55LWphdmFzY3JpcHQuaHRtbFxuUVVuaXQuZHVtcCA9IChmdW5jdGlvbigpIHtcblx0ZnVuY3Rpb24gcXVvdGUoIHN0ciApIHtcblx0XHRyZXR1cm4gXCJcXFwiXCIgKyBzdHIudG9TdHJpbmcoKS5yZXBsYWNlKCAvXFxcXC9nLCBcIlxcXFxcXFxcXCIgKS5yZXBsYWNlKCAvXCIvZywgXCJcXFxcXFxcIlwiICkgKyBcIlxcXCJcIjtcblx0fVxuXHRmdW5jdGlvbiBsaXRlcmFsKCBvICkge1xuXHRcdHJldHVybiBvICsgXCJcIjtcblx0fVxuXHRmdW5jdGlvbiBqb2luKCBwcmUsIGFyciwgcG9zdCApIHtcblx0XHR2YXIgcyA9IGR1bXAuc2VwYXJhdG9yKCksXG5cdFx0XHRiYXNlID0gZHVtcC5pbmRlbnQoKSxcblx0XHRcdGlubmVyID0gZHVtcC5pbmRlbnQoIDEgKTtcblx0XHRpZiAoIGFyci5qb2luICkge1xuXHRcdFx0YXJyID0gYXJyLmpvaW4oIFwiLFwiICsgcyArIGlubmVyICk7XG5cdFx0fVxuXHRcdGlmICggIWFyciApIHtcblx0XHRcdHJldHVybiBwcmUgKyBwb3N0O1xuXHRcdH1cblx0XHRyZXR1cm4gWyBwcmUsIGlubmVyICsgYXJyLCBiYXNlICsgcG9zdCBdLmpvaW4oIHMgKTtcblx0fVxuXHRmdW5jdGlvbiBhcnJheSggYXJyLCBzdGFjayApIHtcblx0XHR2YXIgaSA9IGFyci5sZW5ndGgsXG5cdFx0XHRyZXQgPSBuZXcgQXJyYXkoIGkgKTtcblxuXHRcdGlmICggZHVtcC5tYXhEZXB0aCAmJiBkdW1wLmRlcHRoID4gZHVtcC5tYXhEZXB0aCApIHtcblx0XHRcdHJldHVybiBcIltvYmplY3QgQXJyYXldXCI7XG5cdFx0fVxuXG5cdFx0dGhpcy51cCgpO1xuXHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0cmV0WyBpIF0gPSB0aGlzLnBhcnNlKCBhcnJbIGkgXSwgdW5kZWZpbmVkLCBzdGFjayApO1xuXHRcdH1cblx0XHR0aGlzLmRvd24oKTtcblx0XHRyZXR1cm4gam9pbiggXCJbXCIsIHJldCwgXCJdXCIgKTtcblx0fVxuXG5cdHZhciByZU5hbWUgPSAvXmZ1bmN0aW9uIChcXHcrKS8sXG5cdFx0ZHVtcCA9IHtcblxuXHRcdFx0Ly8gb2JqVHlwZSBpcyB1c2VkIG1vc3RseSBpbnRlcm5hbGx5LCB5b3UgY2FuIGZpeCBhIChjdXN0b20pIHR5cGUgaW4gYWR2YW5jZVxuXHRcdFx0cGFyc2U6IGZ1bmN0aW9uKCBvYmosIG9ialR5cGUsIHN0YWNrICkge1xuXHRcdFx0XHRzdGFjayA9IHN0YWNrIHx8IFtdO1xuXHRcdFx0XHR2YXIgcmVzLCBwYXJzZXIsIHBhcnNlclR5cGUsXG5cdFx0XHRcdFx0aW5TdGFjayA9IGluQXJyYXkoIG9iaiwgc3RhY2sgKTtcblxuXHRcdFx0XHRpZiAoIGluU3RhY2sgIT09IC0xICkge1xuXHRcdFx0XHRcdHJldHVybiBcInJlY3Vyc2lvbihcIiArICggaW5TdGFjayAtIHN0YWNrLmxlbmd0aCApICsgXCIpXCI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvYmpUeXBlID0gb2JqVHlwZSB8fCB0aGlzLnR5cGVPZiggb2JqICApO1xuXHRcdFx0XHRwYXJzZXIgPSB0aGlzLnBhcnNlcnNbIG9ialR5cGUgXTtcblx0XHRcdFx0cGFyc2VyVHlwZSA9IHR5cGVvZiBwYXJzZXI7XG5cblx0XHRcdFx0aWYgKCBwYXJzZXJUeXBlID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdFx0c3RhY2sucHVzaCggb2JqICk7XG5cdFx0XHRcdFx0cmVzID0gcGFyc2VyLmNhbGwoIHRoaXMsIG9iaiwgc3RhY2sgKTtcblx0XHRcdFx0XHRzdGFjay5wb3AoKTtcblx0XHRcdFx0XHRyZXR1cm4gcmVzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiAoIHBhcnNlclR5cGUgPT09IFwic3RyaW5nXCIgKSA/IHBhcnNlciA6IHRoaXMucGFyc2Vycy5lcnJvcjtcblx0XHRcdH0sXG5cdFx0XHR0eXBlT2Y6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0XHRcdHZhciB0eXBlO1xuXHRcdFx0XHRpZiAoIG9iaiA9PT0gbnVsbCApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJudWxsXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwidW5kZWZpbmVkXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIFFVbml0LmlzKCBcInJlZ2V4cFwiLCBvYmogKSApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJyZWdleHBcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggUVVuaXQuaXMoIFwiZGF0ZVwiLCBvYmogKSApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJkYXRlXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIFFVbml0LmlzKCBcImZ1bmN0aW9uXCIsIG9iaiApICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImZ1bmN0aW9uXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG9iai5zZXRJbnRlcnZhbCAhPT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0XHRvYmouZG9jdW1lbnQgIT09IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdFx0b2JqLm5vZGVUeXBlID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwid2luZG93XCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG9iai5ub2RlVHlwZSA9PT0gOSApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJkb2N1bWVudFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBvYmoubm9kZVR5cGUgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwibm9kZVwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKFxuXG5cdFx0XHRcdFx0Ly8gbmF0aXZlIGFycmF5c1xuXHRcdFx0XHRcdHRvU3RyaW5nLmNhbGwoIG9iaiApID09PSBcIltvYmplY3QgQXJyYXldXCIgfHxcblxuXHRcdFx0XHRcdC8vIE5vZGVMaXN0IG9iamVjdHNcblx0XHRcdFx0XHQoIHR5cGVvZiBvYmoubGVuZ3RoID09PSBcIm51bWJlclwiICYmIG9iai5pdGVtICE9PSB1bmRlZmluZWQgJiZcblx0XHRcdFx0XHQoIG9iai5sZW5ndGggPyBvYmouaXRlbSggMCApID09PSBvYmpbIDAgXSA6ICggb2JqLml0ZW0oIDAgKSA9PT0gbnVsbCAmJlxuXHRcdFx0XHRcdG9ialsgMCBdID09PSB1bmRlZmluZWQgKSApIClcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiYXJyYXlcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggb2JqLmNvbnN0cnVjdG9yID09PSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiZXJyb3JcIjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0eXBlID0gdHlwZW9mIG9iajtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdHlwZTtcblx0XHRcdH0sXG5cdFx0XHRzZXBhcmF0b3I6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5tdWx0aWxpbmUgPyB0aGlzLkhUTUwgPyBcIjxiciAvPlwiIDogXCJcXG5cIiA6IHRoaXMuSFRNTCA/IFwiJiMxNjA7XCIgOiBcIiBcIjtcblx0XHRcdH0sXG5cdFx0XHQvLyBleHRyYSBjYW4gYmUgYSBudW1iZXIsIHNob3J0Y3V0IGZvciBpbmNyZWFzaW5nLWNhbGxpbmctZGVjcmVhc2luZ1xuXHRcdFx0aW5kZW50OiBmdW5jdGlvbiggZXh0cmEgKSB7XG5cdFx0XHRcdGlmICggIXRoaXMubXVsdGlsaW5lICkge1xuXHRcdFx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjaHIgPSB0aGlzLmluZGVudENoYXI7XG5cdFx0XHRcdGlmICggdGhpcy5IVE1MICkge1xuXHRcdFx0XHRcdGNociA9IGNoci5yZXBsYWNlKCAvXFx0L2csIFwiICAgXCIgKS5yZXBsYWNlKCAvIC9nLCBcIiYjMTYwO1wiICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG5ldyBBcnJheSggdGhpcy5kZXB0aCArICggZXh0cmEgfHwgMCApICkuam9pbiggY2hyICk7XG5cdFx0XHR9LFxuXHRcdFx0dXA6IGZ1bmN0aW9uKCBhICkge1xuXHRcdFx0XHR0aGlzLmRlcHRoICs9IGEgfHwgMTtcblx0XHRcdH0sXG5cdFx0XHRkb3duOiBmdW5jdGlvbiggYSApIHtcblx0XHRcdFx0dGhpcy5kZXB0aCAtPSBhIHx8IDE7XG5cdFx0XHR9LFxuXHRcdFx0c2V0UGFyc2VyOiBmdW5jdGlvbiggbmFtZSwgcGFyc2VyICkge1xuXHRcdFx0XHR0aGlzLnBhcnNlcnNbIG5hbWUgXSA9IHBhcnNlcjtcblx0XHRcdH0sXG5cdFx0XHQvLyBUaGUgbmV4dCAzIGFyZSBleHBvc2VkIHNvIHlvdSBjYW4gdXNlIHRoZW1cblx0XHRcdHF1b3RlOiBxdW90ZSxcblx0XHRcdGxpdGVyYWw6IGxpdGVyYWwsXG5cdFx0XHRqb2luOiBqb2luLFxuXHRcdFx0Ly9cblx0XHRcdGRlcHRoOiAxLFxuXHRcdFx0bWF4RGVwdGg6IFFVbml0LmNvbmZpZy5tYXhEZXB0aCxcblxuXHRcdFx0Ly8gVGhpcyBpcyB0aGUgbGlzdCBvZiBwYXJzZXJzLCB0byBtb2RpZnkgdGhlbSwgdXNlIGR1bXAuc2V0UGFyc2VyXG5cdFx0XHRwYXJzZXJzOiB7XG5cdFx0XHRcdHdpbmRvdzogXCJbV2luZG93XVwiLFxuXHRcdFx0XHRkb2N1bWVudDogXCJbRG9jdW1lbnRdXCIsXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbiggZXJyb3IgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFwiRXJyb3IoXFxcIlwiICsgZXJyb3IubWVzc2FnZSArIFwiXFxcIilcIjtcblx0XHRcdFx0fSxcblx0XHRcdFx0dW5rbm93bjogXCJbVW5rbm93bl1cIixcblx0XHRcdFx0XCJudWxsXCI6IFwibnVsbFwiLFxuXHRcdFx0XHRcInVuZGVmaW5lZFwiOiBcInVuZGVmaW5lZFwiLFxuXHRcdFx0XHRcImZ1bmN0aW9uXCI6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0XHR2YXIgcmV0ID0gXCJmdW5jdGlvblwiLFxuXG5cdFx0XHRcdFx0XHQvLyBmdW5jdGlvbnMgbmV2ZXIgaGF2ZSBuYW1lIGluIElFXG5cdFx0XHRcdFx0XHRuYW1lID0gXCJuYW1lXCIgaW4gZm4gPyBmbi5uYW1lIDogKCByZU5hbWUuZXhlYyggZm4gKSB8fCBbXSApWyAxIF07XG5cblx0XHRcdFx0XHRpZiAoIG5hbWUgKSB7XG5cdFx0XHRcdFx0XHRyZXQgKz0gXCIgXCIgKyBuYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXQgKz0gXCIoIFwiO1xuXG5cdFx0XHRcdFx0cmV0ID0gWyByZXQsIGR1bXAucGFyc2UoIGZuLCBcImZ1bmN0aW9uQXJnc1wiICksIFwiKXtcIiBdLmpvaW4oIFwiXCIgKTtcblx0XHRcdFx0XHRyZXR1cm4gam9pbiggcmV0LCBkdW1wLnBhcnNlKCBmbiwgXCJmdW5jdGlvbkNvZGVcIiApLCBcIn1cIiApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhcnJheTogYXJyYXksXG5cdFx0XHRcdG5vZGVsaXN0OiBhcnJheSxcblx0XHRcdFx0XCJhcmd1bWVudHNcIjogYXJyYXksXG5cdFx0XHRcdG9iamVjdDogZnVuY3Rpb24oIG1hcCwgc3RhY2sgKSB7XG5cdFx0XHRcdFx0dmFyIGtleXMsIGtleSwgdmFsLCBpLCBub25FbnVtZXJhYmxlUHJvcGVydGllcyxcblx0XHRcdFx0XHRcdHJldCA9IFtdO1xuXG5cdFx0XHRcdFx0aWYgKCBkdW1wLm1heERlcHRoICYmIGR1bXAuZGVwdGggPiBkdW1wLm1heERlcHRoICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFwiW29iamVjdCBPYmplY3RdXCI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZHVtcC51cCgpO1xuXHRcdFx0XHRcdGtleXMgPSBbXTtcblx0XHRcdFx0XHRmb3IgKCBrZXkgaW4gbWFwICkge1xuXHRcdFx0XHRcdFx0a2V5cy5wdXNoKCBrZXkgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBTb21lIHByb3BlcnRpZXMgYXJlIG5vdCBhbHdheXMgZW51bWVyYWJsZSBvbiBFcnJvciBvYmplY3RzLlxuXHRcdFx0XHRcdG5vbkVudW1lcmFibGVQcm9wZXJ0aWVzID0gWyBcIm1lc3NhZ2VcIiwgXCJuYW1lXCIgXTtcblx0XHRcdFx0XHRmb3IgKCBpIGluIG5vbkVudW1lcmFibGVQcm9wZXJ0aWVzICkge1xuXHRcdFx0XHRcdFx0a2V5ID0gbm9uRW51bWVyYWJsZVByb3BlcnRpZXNbIGkgXTtcblx0XHRcdFx0XHRcdGlmICgga2V5IGluIG1hcCAmJiBpbkFycmF5KCBrZXksIGtleXMgKSA8IDAgKSB7XG5cdFx0XHRcdFx0XHRcdGtleXMucHVzaCgga2V5ICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGtleXMuc29ydCgpO1xuXHRcdFx0XHRcdGZvciAoIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0XHRcdGtleSA9IGtleXNbIGkgXTtcblx0XHRcdFx0XHRcdHZhbCA9IG1hcFsga2V5IF07XG5cdFx0XHRcdFx0XHRyZXQucHVzaCggZHVtcC5wYXJzZSgga2V5LCBcImtleVwiICkgKyBcIjogXCIgK1xuXHRcdFx0XHRcdFx0XHRkdW1wLnBhcnNlKCB2YWwsIHVuZGVmaW5lZCwgc3RhY2sgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkdW1wLmRvd24oKTtcblx0XHRcdFx0XHRyZXR1cm4gam9pbiggXCJ7XCIsIHJldCwgXCJ9XCIgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bm9kZTogZnVuY3Rpb24oIG5vZGUgKSB7XG5cdFx0XHRcdFx0dmFyIGxlbiwgaSwgdmFsLFxuXHRcdFx0XHRcdFx0b3BlbiA9IGR1bXAuSFRNTCA/IFwiJmx0O1wiIDogXCI8XCIsXG5cdFx0XHRcdFx0XHRjbG9zZSA9IGR1bXAuSFRNTCA/IFwiJmd0O1wiIDogXCI+XCIsXG5cdFx0XHRcdFx0XHR0YWcgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRcdFx0XHRyZXQgPSBvcGVuICsgdGFnLFxuXHRcdFx0XHRcdFx0YXR0cnMgPSBub2RlLmF0dHJpYnV0ZXM7XG5cblx0XHRcdFx0XHRpZiAoIGF0dHJzICkge1xuXHRcdFx0XHRcdFx0Zm9yICggaSA9IDAsIGxlbiA9IGF0dHJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHRcdFx0XHR2YWwgPSBhdHRyc1sgaSBdLm5vZGVWYWx1ZTtcblxuXHRcdFx0XHRcdFx0XHQvLyBJRTYgaW5jbHVkZXMgYWxsIGF0dHJpYnV0ZXMgaW4gLmF0dHJpYnV0ZXMsIGV2ZW4gb25lcyBub3QgZXhwbGljaXRseVxuXHRcdFx0XHRcdFx0XHQvLyBzZXQuIFRob3NlIGhhdmUgdmFsdWVzIGxpa2UgdW5kZWZpbmVkLCBudWxsLCAwLCBmYWxzZSwgXCJcIiBvclxuXHRcdFx0XHRcdFx0XHQvLyBcImluaGVyaXRcIi5cblx0XHRcdFx0XHRcdFx0aWYgKCB2YWwgJiYgdmFsICE9PSBcImluaGVyaXRcIiApIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQgKz0gXCIgXCIgKyBhdHRyc1sgaSBdLm5vZGVOYW1lICsgXCI9XCIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0ZHVtcC5wYXJzZSggdmFsLCBcImF0dHJpYnV0ZVwiICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0ICs9IGNsb3NlO1xuXG5cdFx0XHRcdFx0Ly8gU2hvdyBjb250ZW50IG9mIFRleHROb2RlIG9yIENEQVRBU2VjdGlvblxuXHRcdFx0XHRcdGlmICggbm9kZS5ub2RlVHlwZSA9PT0gMyB8fCBub2RlLm5vZGVUeXBlID09PSA0ICkge1xuXHRcdFx0XHRcdFx0cmV0ICs9IG5vZGUubm9kZVZhbHVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiByZXQgKyBvcGVuICsgXCIvXCIgKyB0YWcgKyBjbG9zZTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHQvLyBmdW5jdGlvbiBjYWxscyBpdCBpbnRlcm5hbGx5LCBpdCdzIHRoZSBhcmd1bWVudHMgcGFydCBvZiB0aGUgZnVuY3Rpb25cblx0XHRcdFx0ZnVuY3Rpb25BcmdzOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRcdFx0dmFyIGFyZ3MsXG5cdFx0XHRcdFx0XHRsID0gZm4ubGVuZ3RoO1xuXG5cdFx0XHRcdFx0aWYgKCAhbCApIHtcblx0XHRcdFx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGFyZ3MgPSBuZXcgQXJyYXkoIGwgKTtcblx0XHRcdFx0XHR3aGlsZSAoIGwtLSApIHtcblxuXHRcdFx0XHRcdFx0Ly8gOTcgaXMgJ2EnXG5cdFx0XHRcdFx0XHRhcmdzWyBsIF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCA5NyArIGwgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIFwiIFwiICsgYXJncy5qb2luKCBcIiwgXCIgKSArIFwiIFwiO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBvYmplY3QgY2FsbHMgaXQgaW50ZXJuYWxseSwgdGhlIGtleSBwYXJ0IG9mIGFuIGl0ZW0gaW4gYSBtYXBcblx0XHRcdFx0a2V5OiBxdW90ZSxcblx0XHRcdFx0Ly8gZnVuY3Rpb24gY2FsbHMgaXQgaW50ZXJuYWxseSwgaXQncyB0aGUgY29udGVudCBvZiB0aGUgZnVuY3Rpb25cblx0XHRcdFx0ZnVuY3Rpb25Db2RlOiBcIltjb2RlXVwiLFxuXHRcdFx0XHQvLyBub2RlIGNhbGxzIGl0IGludGVybmFsbHksIGl0J3MgYSBodG1sIGF0dHJpYnV0ZSB2YWx1ZVxuXHRcdFx0XHRhdHRyaWJ1dGU6IHF1b3RlLFxuXHRcdFx0XHRzdHJpbmc6IHF1b3RlLFxuXHRcdFx0XHRkYXRlOiBxdW90ZSxcblx0XHRcdFx0cmVnZXhwOiBsaXRlcmFsLFxuXHRcdFx0XHRudW1iZXI6IGxpdGVyYWwsXG5cdFx0XHRcdFwiYm9vbGVhblwiOiBsaXRlcmFsXG5cdFx0XHR9LFxuXHRcdFx0Ly8gaWYgdHJ1ZSwgZW50aXRpZXMgYXJlIGVzY2FwZWQgKCA8LCA+LCBcXHQsIHNwYWNlIGFuZCBcXG4gKVxuXHRcdFx0SFRNTDogZmFsc2UsXG5cdFx0XHQvLyBpbmRlbnRhdGlvbiB1bml0XG5cdFx0XHRpbmRlbnRDaGFyOiBcIiAgXCIsXG5cdFx0XHQvLyBpZiB0cnVlLCBpdGVtcyBpbiBhIGNvbGxlY3Rpb24sIGFyZSBzZXBhcmF0ZWQgYnkgYSBcXG4sIGVsc2UganVzdCBhIHNwYWNlLlxuXHRcdFx0bXVsdGlsaW5lOiB0cnVlXG5cdFx0fTtcblxuXHRyZXR1cm4gZHVtcDtcbn0oKSk7XG5cbi8vIGJhY2sgY29tcGF0XG5RVW5pdC5qc0R1bXAgPSBRVW5pdC5kdW1wO1xuXG4vLyBGb3IgYnJvd3NlciwgZXhwb3J0IG9ubHkgc2VsZWN0IGdsb2JhbHNcbmlmICggZGVmaW5lZC5kb2N1bWVudCApIHtcblxuXHQvLyBEZXByZWNhdGVkXG5cdC8vIEV4dGVuZCBhc3NlcnQgbWV0aG9kcyB0byBRVW5pdCBhbmQgR2xvYmFsIHNjb3BlIHRocm91Z2ggQmFja3dhcmRzIGNvbXBhdGliaWxpdHlcblx0KGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpLFxuXHRcdFx0YXNzZXJ0aW9ucyA9IEFzc2VydC5wcm90b3R5cGU7XG5cblx0XHRmdW5jdGlvbiBhcHBseUN1cnJlbnQoIGN1cnJlbnQgKSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBhc3NlcnQgPSBuZXcgQXNzZXJ0KCBRVW5pdC5jb25maWcuY3VycmVudCApO1xuXHRcdFx0XHRjdXJyZW50LmFwcGx5KCBhc3NlcnQsIGFyZ3VtZW50cyApO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRmb3IgKCBpIGluIGFzc2VydGlvbnMgKSB7XG5cdFx0XHRRVW5pdFsgaSBdID0gYXBwbHlDdXJyZW50KCBhc3NlcnRpb25zWyBpIF0gKTtcblx0XHR9XG5cdH0pKCk7XG5cblx0KGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpLCBsLFxuXHRcdFx0a2V5cyA9IFtcblx0XHRcdFx0XCJ0ZXN0XCIsXG5cdFx0XHRcdFwibW9kdWxlXCIsXG5cdFx0XHRcdFwiZXhwZWN0XCIsXG5cdFx0XHRcdFwiYXN5bmNUZXN0XCIsXG5cdFx0XHRcdFwic3RhcnRcIixcblx0XHRcdFx0XCJzdG9wXCIsXG5cdFx0XHRcdFwib2tcIixcblx0XHRcdFx0XCJub3RPa1wiLFxuXHRcdFx0XHRcImVxdWFsXCIsXG5cdFx0XHRcdFwibm90RXF1YWxcIixcblx0XHRcdFx0XCJwcm9wRXF1YWxcIixcblx0XHRcdFx0XCJub3RQcm9wRXF1YWxcIixcblx0XHRcdFx0XCJkZWVwRXF1YWxcIixcblx0XHRcdFx0XCJub3REZWVwRXF1YWxcIixcblx0XHRcdFx0XCJzdHJpY3RFcXVhbFwiLFxuXHRcdFx0XHRcIm5vdFN0cmljdEVxdWFsXCIsXG5cdFx0XHRcdFwidGhyb3dzXCIsXG5cdFx0XHRcdFwicmFpc2VzXCJcblx0XHRcdF07XG5cblx0XHRmb3IgKCBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0d2luZG93WyBrZXlzWyBpIF0gXSA9IFFVbml0WyBrZXlzWyBpIF0gXTtcblx0XHR9XG5cdH0pKCk7XG5cblx0d2luZG93LlFVbml0ID0gUVVuaXQ7XG59XG5cbi8vIEZvciBub2RlanNcbmlmICggdHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMgKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gUVVuaXQ7XG5cblx0Ly8gRm9yIGNvbnNpc3RlbmN5IHdpdGggQ29tbW9uSlMgZW52aXJvbm1lbnRzJyBleHBvcnRzXG5cdG1vZHVsZS5leHBvcnRzLlFVbml0ID0gUVVuaXQ7XG59XG5cbi8vIEZvciBDb21tb25KUyB3aXRoIGV4cG9ydHMsIGJ1dCB3aXRob3V0IG1vZHVsZS5leHBvcnRzLCBsaWtlIFJoaW5vXG5pZiAoIHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiICYmIGV4cG9ydHMgKSB7XG5cdGV4cG9ydHMuUVVuaXQgPSBRVW5pdDtcbn1cblxuaWYgKCB0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCApIHtcblx0ZGVmaW5lKCBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gUVVuaXQ7XG5cdH0gKTtcblx0UVVuaXQuY29uZmlnLmF1dG9zdGFydCA9IGZhbHNlO1xufVxuXG4vKlxuICogVGhpcyBmaWxlIGlzIGEgbW9kaWZpZWQgdmVyc2lvbiBvZiBnb29nbGUtZGlmZi1tYXRjaC1wYXRjaCdzIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb25cbiAqIChodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL3NvdXJjZS9icm93c2UvdHJ1bmsvamF2YXNjcmlwdC9kaWZmX21hdGNoX3BhdGNoX3VuY29tcHJlc3NlZC5qcyksXG4gKiBtb2RpZmljYXRpb25zIGFyZSBsaWNlbnNlZCBhcyBtb3JlIGZ1bGx5IHNldCBmb3J0aCBpbiBMSUNFTlNFLnR4dC5cbiAqXG4gKiBUaGUgb3JpZ2luYWwgc291cmNlIG9mIGdvb2dsZS1kaWZmLW1hdGNoLXBhdGNoIGlzIGF0dHJpYnV0YWJsZSBhbmQgbGljZW5zZWQgYXMgZm9sbG93czpcbiAqXG4gKiBDb3B5cmlnaHQgMjAwNiBHb29nbGUgSW5jLlxuICogaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC9cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cHM6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogTW9yZSBJbmZvOlxuICogIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvXG4gKlxuICogVXNhZ2U6IFFVbml0LmRpZmYoZXhwZWN0ZWQsIGFjdHVhbClcbiAqXG4gKi9cblFVbml0LmRpZmYgPSAoIGZ1bmN0aW9uKCkge1xuXHRmdW5jdGlvbiBEaWZmTWF0Y2hQYXRjaCgpIHtcblx0fVxuXG5cdC8vICBESUZGIEZVTkNUSU9OU1xuXG5cdC8qKlxuXHQgKiBUaGUgZGF0YSBzdHJ1Y3R1cmUgcmVwcmVzZW50aW5nIGEgZGlmZiBpcyBhbiBhcnJheSBvZiB0dXBsZXM6XG5cdCAqIFtbRElGRl9ERUxFVEUsICdIZWxsbyddLCBbRElGRl9JTlNFUlQsICdHb29kYnllJ10sIFtESUZGX0VRVUFMLCAnIHdvcmxkLiddXVxuXHQgKiB3aGljaCBtZWFuczogZGVsZXRlICdIZWxsbycsIGFkZCAnR29vZGJ5ZScgYW5kIGtlZXAgJyB3b3JsZC4nXG5cdCAqL1xuXHR2YXIgRElGRl9ERUxFVEUgPSAtMSxcblx0XHRESUZGX0lOU0VSVCA9IDEsXG5cdFx0RElGRl9FUVVBTCA9IDA7XG5cblx0LyoqXG5cdCAqIEZpbmQgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gdHdvIHRleHRzLiAgU2ltcGxpZmllcyB0aGUgcHJvYmxlbSBieSBzdHJpcHBpbmdcblx0ICogYW55IGNvbW1vbiBwcmVmaXggb3Igc3VmZml4IG9mZiB0aGUgdGV4dHMgYmVmb3JlIGRpZmZpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge2Jvb2xlYW49fSBvcHRDaGVja2xpbmVzIE9wdGlvbmFsIHNwZWVkdXAgZmxhZy4gSWYgcHJlc2VudCBhbmQgZmFsc2UsXG5cdCAqICAgICB0aGVuIGRvbid0IHJ1biBhIGxpbmUtbGV2ZWwgZGlmZiBmaXJzdCB0byBpZGVudGlmeSB0aGUgY2hhbmdlZCBhcmVhcy5cblx0ICogICAgIERlZmF1bHRzIHRvIHRydWUsIHdoaWNoIGRvZXMgYSBmYXN0ZXIsIHNsaWdodGx5IGxlc3Mgb3B0aW1hbCBkaWZmLlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuRGlmZk1haW4gPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyLCBvcHRDaGVja2xpbmVzICkge1xuXHRcdHZhciBkZWFkbGluZSwgY2hlY2tsaW5lcywgY29tbW9ubGVuZ3RoLFxuXHRcdFx0Y29tbW9ucHJlZml4LCBjb21tb25zdWZmaXgsIGRpZmZzO1xuXG5cdFx0Ly8gVGhlIGRpZmYgbXVzdCBiZSBjb21wbGV0ZSBpbiB1cCB0byAxIHNlY29uZC5cblx0XHRkZWFkbGluZSA9ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSArIDEwMDA7XG5cblx0XHQvLyBDaGVjayBmb3IgbnVsbCBpbnB1dHMuXG5cdFx0aWYgKCB0ZXh0MSA9PT0gbnVsbCB8fCB0ZXh0MiA9PT0gbnVsbCApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJOdWxsIGlucHV0LiAoRGlmZk1haW4pXCIgKTtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBmb3IgZXF1YWxpdHkgKHNwZWVkdXApLlxuXHRcdGlmICggdGV4dDEgPT09IHRleHQyICkge1xuXHRcdFx0aWYgKCB0ZXh0MSApIHtcblx0XHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0XHRbIERJRkZfRVFVQUwsIHRleHQxIF1cblx0XHRcdFx0XTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cblx0XHRpZiAoIHR5cGVvZiBvcHRDaGVja2xpbmVzID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0b3B0Q2hlY2tsaW5lcyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0Y2hlY2tsaW5lcyA9IG9wdENoZWNrbGluZXM7XG5cblx0XHQvLyBUcmltIG9mZiBjb21tb24gcHJlZml4IChzcGVlZHVwKS5cblx0XHRjb21tb25sZW5ndGggPSB0aGlzLmRpZmZDb21tb25QcmVmaXgoIHRleHQxLCB0ZXh0MiApO1xuXHRcdGNvbW1vbnByZWZpeCA9IHRleHQxLnN1YnN0cmluZyggMCwgY29tbW9ubGVuZ3RoICk7XG5cdFx0dGV4dDEgPSB0ZXh0MS5zdWJzdHJpbmcoIGNvbW1vbmxlbmd0aCApO1xuXHRcdHRleHQyID0gdGV4dDIuc3Vic3RyaW5nKCBjb21tb25sZW5ndGggKTtcblxuXHRcdC8vIFRyaW0gb2ZmIGNvbW1vbiBzdWZmaXggKHNwZWVkdXApLlxuXHRcdGNvbW1vbmxlbmd0aCA9IHRoaXMuZGlmZkNvbW1vblN1ZmZpeCggdGV4dDEsIHRleHQyICk7XG5cdFx0Y29tbW9uc3VmZml4ID0gdGV4dDEuc3Vic3RyaW5nKCB0ZXh0MS5sZW5ndGggLSBjb21tb25sZW5ndGggKTtcblx0XHR0ZXh0MSA9IHRleHQxLnN1YnN0cmluZyggMCwgdGV4dDEubGVuZ3RoIC0gY29tbW9ubGVuZ3RoICk7XG5cdFx0dGV4dDIgPSB0ZXh0Mi5zdWJzdHJpbmcoIDAsIHRleHQyLmxlbmd0aCAtIGNvbW1vbmxlbmd0aCApO1xuXG5cdFx0Ly8gQ29tcHV0ZSB0aGUgZGlmZiBvbiB0aGUgbWlkZGxlIGJsb2NrLlxuXHRcdGRpZmZzID0gdGhpcy5kaWZmQ29tcHV0ZSggdGV4dDEsIHRleHQyLCBjaGVja2xpbmVzLCBkZWFkbGluZSApO1xuXG5cdFx0Ly8gUmVzdG9yZSB0aGUgcHJlZml4IGFuZCBzdWZmaXguXG5cdFx0aWYgKCBjb21tb25wcmVmaXggKSB7XG5cdFx0XHRkaWZmcy51bnNoaWZ0KCBbIERJRkZfRVFVQUwsIGNvbW1vbnByZWZpeCBdICk7XG5cdFx0fVxuXHRcdGlmICggY29tbW9uc3VmZml4ICkge1xuXHRcdFx0ZGlmZnMucHVzaCggWyBESUZGX0VRVUFMLCBjb21tb25zdWZmaXggXSApO1xuXHRcdH1cblx0XHR0aGlzLmRpZmZDbGVhbnVwTWVyZ2UoIGRpZmZzICk7XG5cdFx0cmV0dXJuIGRpZmZzO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZWR1Y2UgdGhlIG51bWJlciBvZiBlZGl0cyBieSBlbGltaW5hdGluZyBvcGVyYXRpb25hbGx5IHRyaXZpYWwgZXF1YWxpdGllcy5cblx0ICogQHBhcmFtIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gZGlmZnMgQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNsZWFudXBFZmZpY2llbmN5ID0gZnVuY3Rpb24oIGRpZmZzICkge1xuXHRcdHZhciBjaGFuZ2VzLCBlcXVhbGl0aWVzLCBlcXVhbGl0aWVzTGVuZ3RoLCBsYXN0ZXF1YWxpdHksXG5cdFx0XHRwb2ludGVyLCBwcmVJbnMsIHByZURlbCwgcG9zdElucywgcG9zdERlbDtcblx0XHRjaGFuZ2VzID0gZmFsc2U7XG5cdFx0ZXF1YWxpdGllcyA9IFtdOyAvLyBTdGFjayBvZiBpbmRpY2VzIHdoZXJlIGVxdWFsaXRpZXMgYXJlIGZvdW5kLlxuXHRcdGVxdWFsaXRpZXNMZW5ndGggPSAwOyAvLyBLZWVwaW5nIG91ciBvd24gbGVuZ3RoIHZhciBpcyBmYXN0ZXIgaW4gSlMuXG5cdFx0LyoqIEB0eXBlIHs/c3RyaW5nfSAqL1xuXHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0Ly8gQWx3YXlzIGVxdWFsIHRvIGRpZmZzW2VxdWFsaXRpZXNbZXF1YWxpdGllc0xlbmd0aCAtIDFdXVsxXVxuXHRcdHBvaW50ZXIgPSAwOyAvLyBJbmRleCBvZiBjdXJyZW50IHBvc2l0aW9uLlxuXHRcdC8vIElzIHRoZXJlIGFuIGluc2VydGlvbiBvcGVyYXRpb24gYmVmb3JlIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHByZUlucyA9IGZhbHNlO1xuXHRcdC8vIElzIHRoZXJlIGEgZGVsZXRpb24gb3BlcmF0aW9uIGJlZm9yZSB0aGUgbGFzdCBlcXVhbGl0eS5cblx0XHRwcmVEZWwgPSBmYWxzZTtcblx0XHQvLyBJcyB0aGVyZSBhbiBpbnNlcnRpb24gb3BlcmF0aW9uIGFmdGVyIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHBvc3RJbnMgPSBmYWxzZTtcblx0XHQvLyBJcyB0aGVyZSBhIGRlbGV0aW9uIG9wZXJhdGlvbiBhZnRlciB0aGUgbGFzdCBlcXVhbGl0eS5cblx0XHRwb3N0RGVsID0gZmFsc2U7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXG5cdFx0XHQvLyBFcXVhbGl0eSBmb3VuZC5cblx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0VRVUFMICkge1xuXHRcdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDEgXS5sZW5ndGggPCA0ICYmICggcG9zdElucyB8fCBwb3N0RGVsICkgKSB7XG5cblx0XHRcdFx0XHQvLyBDYW5kaWRhdGUgZm91bmQuXG5cdFx0XHRcdFx0ZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCsrIF0gPSBwb2ludGVyO1xuXHRcdFx0XHRcdHByZUlucyA9IHBvc3RJbnM7XG5cdFx0XHRcdFx0cHJlRGVsID0gcG9zdERlbDtcblx0XHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHQvLyBOb3QgYSBjYW5kaWRhdGUsIGFuZCBjYW4gbmV2ZXIgYmVjb21lIG9uZS5cblx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoID0gMDtcblx0XHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBvc3RJbnMgPSBwb3N0RGVsID0gZmFsc2U7XG5cblx0XHRcdC8vIEFuIGluc2VydGlvbiBvciBkZWxldGlvbi5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfREVMRVRFICkge1xuXHRcdFx0XHRcdHBvc3REZWwgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBvc3RJbnMgPSB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Lypcblx0XHRcdFx0ICogRml2ZSB0eXBlcyB0byBiZSBzcGxpdDpcblx0XHRcdFx0ICogPGlucz5BPC9pbnM+PGRlbD5CPC9kZWw+WFk8aW5zPkM8L2lucz48ZGVsPkQ8L2RlbD5cblx0XHRcdFx0ICogPGlucz5BPC9pbnM+WDxpbnM+QzwvaW5zPjxkZWw+RDwvZGVsPlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz48ZGVsPkI8L2RlbD5YPGlucz5DPC9pbnM+XG5cdFx0XHRcdCAqIDxpbnM+QTwvZGVsPlg8aW5zPkM8L2lucz48ZGVsPkQ8L2RlbD5cblx0XHRcdFx0ICogPGlucz5BPC9pbnM+PGRlbD5CPC9kZWw+WDxkZWw+QzwvZGVsPlxuXHRcdFx0XHQgKi9cblx0XHRcdFx0aWYgKCBsYXN0ZXF1YWxpdHkgJiYgKCAoIHByZUlucyAmJiBwcmVEZWwgJiYgcG9zdElucyAmJiBwb3N0RGVsICkgfHxcblx0XHRcdFx0XHRcdCggKCBsYXN0ZXF1YWxpdHkubGVuZ3RoIDwgMiApICYmXG5cdFx0XHRcdFx0XHQoIHByZUlucyArIHByZURlbCArIHBvc3RJbnMgKyBwb3N0RGVsICkgPT09IDMgKSApICkge1xuXG5cdFx0XHRcdFx0Ly8gRHVwbGljYXRlIHJlY29yZC5cblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdLFxuXHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFsgRElGRl9ERUxFVEUsIGxhc3RlcXVhbGl0eSBdXG5cdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdC8vIENoYW5nZSBzZWNvbmQgY29weSB0byBpbnNlcnQuXG5cdFx0XHRcdFx0ZGlmZnNbIGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gKyAxIF1bIDAgXSA9IERJRkZfSU5TRVJUO1xuXHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGgtLTsgLy8gVGhyb3cgYXdheSB0aGUgZXF1YWxpdHkgd2UganVzdCBkZWxldGVkO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0XHRcdFx0aWYgKCBwcmVJbnMgJiYgcHJlRGVsICkge1xuXHRcdFx0XHRcdFx0Ly8gTm8gY2hhbmdlcyBtYWRlIHdoaWNoIGNvdWxkIGFmZmVjdCBwcmV2aW91cyBlbnRyeSwga2VlcCBnb2luZy5cblx0XHRcdFx0XHRcdHBvc3RJbnMgPSBwb3N0RGVsID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGggPSAwO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoLS07IC8vIFRocm93IGF3YXkgdGhlIHByZXZpb3VzIGVxdWFsaXR5LlxuXHRcdFx0XHRcdFx0cG9pbnRlciA9IGVxdWFsaXRpZXNMZW5ndGggPiAwID8gZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSA6IC0xO1xuXHRcdFx0XHRcdFx0cG9zdElucyA9IHBvc3REZWwgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2hhbmdlcyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cblx0XHRpZiAoIGNoYW5nZXMgKSB7XG5cdFx0XHR0aGlzLmRpZmZDbGVhbnVwTWVyZ2UoIGRpZmZzICk7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBDb252ZXJ0IGEgZGlmZiBhcnJheSBpbnRvIGEgcHJldHR5IEhUTUwgcmVwb3J0LlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHBhcmFtIHtpbnRlZ2VyfSBzdHJpbmcgdG8gYmUgYmVhdXRpZmllZC5cblx0ICogQHJldHVybiB7c3RyaW5nfSBIVE1MIHJlcHJlc2VudGF0aW9uLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZQcmV0dHlIdG1sID0gZnVuY3Rpb24oIGRpZmZzICkge1xuXHRcdHZhciBvcCwgZGF0YSwgeCxcblx0XHRcdGh0bWwgPSBbXTtcblx0XHRmb3IgKCB4ID0gMDsgeCA8IGRpZmZzLmxlbmd0aDsgeCsrICkge1xuXHRcdFx0b3AgPSBkaWZmc1sgeCBdWyAwIF07IC8vIE9wZXJhdGlvbiAoaW5zZXJ0LCBkZWxldGUsIGVxdWFsKVxuXHRcdFx0ZGF0YSA9IGRpZmZzWyB4IF1bIDEgXTsgLy8gVGV4dCBvZiBjaGFuZ2UuXG5cdFx0XHRzd2l0Y2ggKCBvcCApIHtcblx0XHRcdGNhc2UgRElGRl9JTlNFUlQ6XG5cdFx0XHRcdGh0bWxbIHggXSA9IFwiPGlucz5cIiArIGRhdGEgKyBcIjwvaW5zPlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9ERUxFVEU6XG5cdFx0XHRcdGh0bWxbIHggXSA9IFwiPGRlbD5cIiArIGRhdGEgKyBcIjwvZGVsPlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9FUVVBTDpcblx0XHRcdFx0aHRtbFsgeCBdID0gXCI8c3Bhbj5cIiArIGRhdGEgKyBcIjwvc3Bhbj5cIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBodG1sLmpvaW4oIFwiXCIgKTtcblx0fTtcblxuXHQvKipcblx0ICogRGV0ZXJtaW5lIHRoZSBjb21tb24gcHJlZml4IG9mIHR3byBzdHJpbmdzLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7bnVtYmVyfSBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgY29tbW9uIHRvIHRoZSBzdGFydCBvZiBlYWNoXG5cdCAqICAgICBzdHJpbmcuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNvbW1vblByZWZpeCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIHBvaW50ZXJtaWQsIHBvaW50ZXJtYXgsIHBvaW50ZXJtaW4sIHBvaW50ZXJzdGFydDtcblx0XHQvLyBRdWljayBjaGVjayBmb3IgY29tbW9uIG51bGwgY2FzZXMuXG5cdFx0aWYgKCAhdGV4dDEgfHwgIXRleHQyIHx8IHRleHQxLmNoYXJBdCggMCApICE9PSB0ZXh0Mi5jaGFyQXQoIDAgKSApIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHQvLyBCaW5hcnkgc2VhcmNoLlxuXHRcdC8vIFBlcmZvcm1hbmNlIGFuYWx5c2lzOiBodHRwczovL25laWwuZnJhc2VyLm5hbWUvbmV3cy8yMDA3LzEwLzA5L1xuXHRcdHBvaW50ZXJtaW4gPSAwO1xuXHRcdHBvaW50ZXJtYXggPSBNYXRoLm1pbiggdGV4dDEubGVuZ3RoLCB0ZXh0Mi5sZW5ndGggKTtcblx0XHRwb2ludGVybWlkID0gcG9pbnRlcm1heDtcblx0XHRwb2ludGVyc3RhcnQgPSAwO1xuXHRcdHdoaWxlICggcG9pbnRlcm1pbiA8IHBvaW50ZXJtaWQgKSB7XG5cdFx0XHRpZiAoIHRleHQxLnN1YnN0cmluZyggcG9pbnRlcnN0YXJ0LCBwb2ludGVybWlkICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuc3Vic3RyaW5nKCBwb2ludGVyc3RhcnQsIHBvaW50ZXJtaWQgKSApIHtcblx0XHRcdFx0cG9pbnRlcm1pbiA9IHBvaW50ZXJtaWQ7XG5cdFx0XHRcdHBvaW50ZXJzdGFydCA9IHBvaW50ZXJtaW47XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwb2ludGVybWF4ID0gcG9pbnRlcm1pZDtcblx0XHRcdH1cblx0XHRcdHBvaW50ZXJtaWQgPSBNYXRoLmZsb29yKCAoIHBvaW50ZXJtYXggLSBwb2ludGVybWluICkgLyAyICsgcG9pbnRlcm1pbiApO1xuXHRcdH1cblx0XHRyZXR1cm4gcG9pbnRlcm1pZDtcblx0fTtcblxuXHQvKipcblx0ICogRGV0ZXJtaW5lIHRoZSBjb21tb24gc3VmZml4IG9mIHR3byBzdHJpbmdzLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7bnVtYmVyfSBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgY29tbW9uIHRvIHRoZSBlbmQgb2YgZWFjaCBzdHJpbmcuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNvbW1vblN1ZmZpeCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIHBvaW50ZXJtaWQsIHBvaW50ZXJtYXgsIHBvaW50ZXJtaW4sIHBvaW50ZXJlbmQ7XG5cdFx0Ly8gUXVpY2sgY2hlY2sgZm9yIGNvbW1vbiBudWxsIGNhc2VzLlxuXHRcdGlmICggIXRleHQxIHx8XG5cdFx0XHRcdCF0ZXh0MiB8fFxuXHRcdFx0XHR0ZXh0MS5jaGFyQXQoIHRleHQxLmxlbmd0aCAtIDEgKSAhPT0gdGV4dDIuY2hhckF0KCB0ZXh0Mi5sZW5ndGggLSAxICkgKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0Ly8gQmluYXJ5IHNlYXJjaC5cblx0XHQvLyBQZXJmb3JtYW5jZSBhbmFseXNpczogaHR0cHM6Ly9uZWlsLmZyYXNlci5uYW1lL25ld3MvMjAwNy8xMC8wOS9cblx0XHRwb2ludGVybWluID0gMDtcblx0XHRwb2ludGVybWF4ID0gTWF0aC5taW4oIHRleHQxLmxlbmd0aCwgdGV4dDIubGVuZ3RoICk7XG5cdFx0cG9pbnRlcm1pZCA9IHBvaW50ZXJtYXg7XG5cdFx0cG9pbnRlcmVuZCA9IDA7XG5cdFx0d2hpbGUgKCBwb2ludGVybWluIDwgcG9pbnRlcm1pZCApIHtcblx0XHRcdGlmICggdGV4dDEuc3Vic3RyaW5nKCB0ZXh0MS5sZW5ndGggLSBwb2ludGVybWlkLCB0ZXh0MS5sZW5ndGggLSBwb2ludGVyZW5kICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuc3Vic3RyaW5nKCB0ZXh0Mi5sZW5ndGggLSBwb2ludGVybWlkLCB0ZXh0Mi5sZW5ndGggLSBwb2ludGVyZW5kICkgKSB7XG5cdFx0XHRcdHBvaW50ZXJtaW4gPSBwb2ludGVybWlkO1xuXHRcdFx0XHRwb2ludGVyZW5kID0gcG9pbnRlcm1pbjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBvaW50ZXJtYXggPSBwb2ludGVybWlkO1xuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcm1pZCA9IE1hdGguZmxvb3IoICggcG9pbnRlcm1heCAtIHBvaW50ZXJtaW4gKSAvIDIgKyBwb2ludGVybWluICk7XG5cdFx0fVxuXHRcdHJldHVybiBwb2ludGVybWlkO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBGaW5kIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHR3byB0ZXh0cy4gIEFzc3VtZXMgdGhhdCB0aGUgdGV4dHMgZG8gbm90XG5cdCAqIGhhdmUgYW55IGNvbW1vbiBwcmVmaXggb3Igc3VmZml4LlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgT2xkIHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBOZXcgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtib29sZWFufSBjaGVja2xpbmVzIFNwZWVkdXAgZmxhZy4gIElmIGZhbHNlLCB0aGVuIGRvbid0IHJ1biBhXG5cdCAqICAgICBsaW5lLWxldmVsIGRpZmYgZmlyc3QgdG8gaWRlbnRpZnkgdGhlIGNoYW5nZWQgYXJlYXMuXG5cdCAqICAgICBJZiB0cnVlLCB0aGVuIHJ1biBhIGZhc3Rlciwgc2xpZ2h0bHkgbGVzcyBvcHRpbWFsIGRpZmYuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIHdoZW4gdGhlIGRpZmYgc2hvdWxkIGJlIGNvbXBsZXRlIGJ5LlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNvbXB1dGUgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyLCBjaGVja2xpbmVzLCBkZWFkbGluZSApIHtcblx0XHR2YXIgZGlmZnMsIGxvbmd0ZXh0LCBzaG9ydHRleHQsIGksIGhtLFxuXHRcdFx0dGV4dDFBLCB0ZXh0MkEsIHRleHQxQiwgdGV4dDJCLFxuXHRcdFx0bWlkQ29tbW9uLCBkaWZmc0EsIGRpZmZzQjtcblxuXHRcdGlmICggIXRleHQxICkge1xuXHRcdFx0Ly8gSnVzdCBhZGQgc29tZSB0ZXh0IChzcGVlZHVwKS5cblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdFsgRElGRl9JTlNFUlQsIHRleHQyIF1cblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0aWYgKCAhdGV4dDIgKSB7XG5cdFx0XHQvLyBKdXN0IGRlbGV0ZSBzb21lIHRleHQgKHNwZWVkdXApLlxuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0WyBESUZGX0RFTEVURSwgdGV4dDEgXVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRsb25ndGV4dCA9IHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCA/IHRleHQxIDogdGV4dDI7XG5cdFx0c2hvcnR0ZXh0ID0gdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoID8gdGV4dDIgOiB0ZXh0MTtcblx0XHRpID0gbG9uZ3RleHQuaW5kZXhPZiggc2hvcnR0ZXh0ICk7XG5cdFx0aWYgKCBpICE9PSAtMSApIHtcblx0XHRcdC8vIFNob3J0ZXIgdGV4dCBpcyBpbnNpZGUgdGhlIGxvbmdlciB0ZXh0IChzcGVlZHVwKS5cblx0XHRcdGRpZmZzID0gW1xuXHRcdFx0XHRbIERJRkZfSU5TRVJULCBsb25ndGV4dC5zdWJzdHJpbmcoIDAsIGkgKSBdLFxuXHRcdFx0XHRbIERJRkZfRVFVQUwsIHNob3J0dGV4dCBdLFxuXHRcdFx0XHRbIERJRkZfSU5TRVJULCBsb25ndGV4dC5zdWJzdHJpbmcoIGkgKyBzaG9ydHRleHQubGVuZ3RoICkgXVxuXHRcdFx0XTtcblx0XHRcdC8vIFN3YXAgaW5zZXJ0aW9ucyBmb3IgZGVsZXRpb25zIGlmIGRpZmYgaXMgcmV2ZXJzZWQuXG5cdFx0XHRpZiAoIHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCApIHtcblx0XHRcdFx0ZGlmZnNbIDAgXVsgMCBdID0gZGlmZnNbIDIgXVsgMCBdID0gRElGRl9ERUxFVEU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZGlmZnM7XG5cdFx0fVxuXG5cdFx0aWYgKCBzaG9ydHRleHQubGVuZ3RoID09PSAxICkge1xuXHRcdFx0Ly8gU2luZ2xlIGNoYXJhY3RlciBzdHJpbmcuXG5cdFx0XHQvLyBBZnRlciB0aGUgcHJldmlvdXMgc3BlZWR1cCwgdGhlIGNoYXJhY3RlciBjYW4ndCBiZSBhbiBlcXVhbGl0eS5cblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdFsgRElGRl9ERUxFVEUsIHRleHQxIF0sXG5cdFx0XHRcdFsgRElGRl9JTlNFUlQsIHRleHQyIF1cblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBwcm9ibGVtIGNhbiBiZSBzcGxpdCBpbiB0d28uXG5cdFx0aG0gPSB0aGlzLmRpZmZIYWxmTWF0Y2goIHRleHQxLCB0ZXh0MiApO1xuXHRcdGlmICggaG0gKSB7XG5cdFx0XHQvLyBBIGhhbGYtbWF0Y2ggd2FzIGZvdW5kLCBzb3J0IG91dCB0aGUgcmV0dXJuIGRhdGEuXG5cdFx0XHR0ZXh0MUEgPSBobVsgMCBdO1xuXHRcdFx0dGV4dDFCID0gaG1bIDEgXTtcblx0XHRcdHRleHQyQSA9IGhtWyAyIF07XG5cdFx0XHR0ZXh0MkIgPSBobVsgMyBdO1xuXHRcdFx0bWlkQ29tbW9uID0gaG1bIDQgXTtcblx0XHRcdC8vIFNlbmQgYm90aCBwYWlycyBvZmYgZm9yIHNlcGFyYXRlIHByb2Nlc3NpbmcuXG5cdFx0XHRkaWZmc0EgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MUEsIHRleHQyQSwgY2hlY2tsaW5lcywgZGVhZGxpbmUgKTtcblx0XHRcdGRpZmZzQiA9IHRoaXMuRGlmZk1haW4oIHRleHQxQiwgdGV4dDJCLCBjaGVja2xpbmVzLCBkZWFkbGluZSApO1xuXHRcdFx0Ly8gTWVyZ2UgdGhlIHJlc3VsdHMuXG5cdFx0XHRyZXR1cm4gZGlmZnNBLmNvbmNhdCggW1xuXHRcdFx0XHRbIERJRkZfRVFVQUwsIG1pZENvbW1vbiBdXG5cdFx0XHRdLCBkaWZmc0IgKTtcblx0XHR9XG5cblx0XHRpZiAoIGNoZWNrbGluZXMgJiYgdGV4dDEubGVuZ3RoID4gMTAwICYmIHRleHQyLmxlbmd0aCA+IDEwMCApIHtcblx0XHRcdHJldHVybiB0aGlzLmRpZmZMaW5lTW9kZSggdGV4dDEsIHRleHQyLCBkZWFkbGluZSApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmRpZmZCaXNlY3QoIHRleHQxLCB0ZXh0MiwgZGVhZGxpbmUgKTtcblx0fTtcblxuXHQvKipcblx0ICogRG8gdGhlIHR3byB0ZXh0cyBzaGFyZSBhIHN1YnN0cmluZyB3aGljaCBpcyBhdCBsZWFzdCBoYWxmIHRoZSBsZW5ndGggb2YgdGhlXG5cdCAqIGxvbmdlciB0ZXh0P1xuXHQgKiBUaGlzIHNwZWVkdXAgY2FuIHByb2R1Y2Ugbm9uLW1pbmltYWwgZGlmZnMuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gRml2ZSBlbGVtZW50IEFycmF5LCBjb250YWluaW5nIHRoZSBwcmVmaXggb2Zcblx0ICogICAgIHRleHQxLCB0aGUgc3VmZml4IG9mIHRleHQxLCB0aGUgcHJlZml4IG9mIHRleHQyLCB0aGUgc3VmZml4IG9mXG5cdCAqICAgICB0ZXh0MiBhbmQgdGhlIGNvbW1vbiBtaWRkbGUuICBPciBudWxsIGlmIHRoZXJlIHdhcyBubyBtYXRjaC5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmSGFsZk1hdGNoID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgbG9uZ3RleHQsIHNob3J0dGV4dCwgZG1wLFxuXHRcdFx0dGV4dDFBLCB0ZXh0MkIsIHRleHQyQSwgdGV4dDFCLCBtaWRDb21tb24sXG5cdFx0XHRobTEsIGhtMiwgaG07XG5cblx0XHRsb25ndGV4dCA9IHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCA/IHRleHQxIDogdGV4dDI7XG5cdFx0c2hvcnR0ZXh0ID0gdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoID8gdGV4dDIgOiB0ZXh0MTtcblx0XHRpZiAoIGxvbmd0ZXh0Lmxlbmd0aCA8IDQgfHwgc2hvcnR0ZXh0Lmxlbmd0aCAqIDIgPCBsb25ndGV4dC5sZW5ndGggKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDsgLy8gUG9pbnRsZXNzLlxuXHRcdH1cblx0XHRkbXAgPSB0aGlzOyAvLyAndGhpcycgYmVjb21lcyAnd2luZG93JyBpbiBhIGNsb3N1cmUuXG5cblx0XHQvKipcblx0XHQgKiBEb2VzIGEgc3Vic3RyaW5nIG9mIHNob3J0dGV4dCBleGlzdCB3aXRoaW4gbG9uZ3RleHQgc3VjaCB0aGF0IHRoZSBzdWJzdHJpbmdcblx0XHQgKiBpcyBhdCBsZWFzdCBoYWxmIHRoZSBsZW5ndGggb2YgbG9uZ3RleHQ/XG5cdFx0ICogQ2xvc3VyZSwgYnV0IGRvZXMgbm90IHJlZmVyZW5jZSBhbnkgZXh0ZXJuYWwgdmFyaWFibGVzLlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBsb25ndGV4dCBMb25nZXIgc3RyaW5nLlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBzaG9ydHRleHQgU2hvcnRlciBzdHJpbmcuXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IGkgU3RhcnQgaW5kZXggb2YgcXVhcnRlciBsZW5ndGggc3Vic3RyaW5nIHdpdGhpbiBsb25ndGV4dC5cblx0XHQgKiBAcmV0dXJuIHtBcnJheS48c3RyaW5nPn0gRml2ZSBlbGVtZW50IEFycmF5LCBjb250YWluaW5nIHRoZSBwcmVmaXggb2Zcblx0XHQgKiAgICAgbG9uZ3RleHQsIHRoZSBzdWZmaXggb2YgbG9uZ3RleHQsIHRoZSBwcmVmaXggb2Ygc2hvcnR0ZXh0LCB0aGUgc3VmZml4XG5cdFx0ICogICAgIG9mIHNob3J0dGV4dCBhbmQgdGhlIGNvbW1vbiBtaWRkbGUuICBPciBudWxsIGlmIHRoZXJlIHdhcyBubyBtYXRjaC5cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRpZmZIYWxmTWF0Y2hJKCBsb25ndGV4dCwgc2hvcnR0ZXh0LCBpICkge1xuXHRcdFx0dmFyIHNlZWQsIGosIGJlc3RDb21tb24sIHByZWZpeExlbmd0aCwgc3VmZml4TGVuZ3RoLFxuXHRcdFx0XHRiZXN0TG9uZ3RleHRBLCBiZXN0TG9uZ3RleHRCLCBiZXN0U2hvcnR0ZXh0QSwgYmVzdFNob3J0dGV4dEI7XG5cdFx0XHQvLyBTdGFydCB3aXRoIGEgMS80IGxlbmd0aCBzdWJzdHJpbmcgYXQgcG9zaXRpb24gaSBhcyBhIHNlZWQuXG5cdFx0XHRzZWVkID0gbG9uZ3RleHQuc3Vic3RyaW5nKCBpLCBpICsgTWF0aC5mbG9vciggbG9uZ3RleHQubGVuZ3RoIC8gNCApICk7XG5cdFx0XHRqID0gLTE7XG5cdFx0XHRiZXN0Q29tbW9uID0gXCJcIjtcblx0XHRcdHdoaWxlICggKCBqID0gc2hvcnR0ZXh0LmluZGV4T2YoIHNlZWQsIGogKyAxICkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdHByZWZpeExlbmd0aCA9IGRtcC5kaWZmQ29tbW9uUHJlZml4KCBsb25ndGV4dC5zdWJzdHJpbmcoIGkgKSxcblx0XHRcdFx0XHRzaG9ydHRleHQuc3Vic3RyaW5nKCBqICkgKTtcblx0XHRcdFx0c3VmZml4TGVuZ3RoID0gZG1wLmRpZmZDb21tb25TdWZmaXgoIGxvbmd0ZXh0LnN1YnN0cmluZyggMCwgaSApLFxuXHRcdFx0XHRcdHNob3J0dGV4dC5zdWJzdHJpbmcoIDAsIGogKSApO1xuXHRcdFx0XHRpZiAoIGJlc3RDb21tb24ubGVuZ3RoIDwgc3VmZml4TGVuZ3RoICsgcHJlZml4TGVuZ3RoICkge1xuXHRcdFx0XHRcdGJlc3RDb21tb24gPSBzaG9ydHRleHQuc3Vic3RyaW5nKCBqIC0gc3VmZml4TGVuZ3RoLCBqICkgK1xuXHRcdFx0XHRcdFx0c2hvcnR0ZXh0LnN1YnN0cmluZyggaiwgaiArIHByZWZpeExlbmd0aCApO1xuXHRcdFx0XHRcdGJlc3RMb25ndGV4dEEgPSBsb25ndGV4dC5zdWJzdHJpbmcoIDAsIGkgLSBzdWZmaXhMZW5ndGggKTtcblx0XHRcdFx0XHRiZXN0TG9uZ3RleHRCID0gbG9uZ3RleHQuc3Vic3RyaW5nKCBpICsgcHJlZml4TGVuZ3RoICk7XG5cdFx0XHRcdFx0YmVzdFNob3J0dGV4dEEgPSBzaG9ydHRleHQuc3Vic3RyaW5nKCAwLCBqIC0gc3VmZml4TGVuZ3RoICk7XG5cdFx0XHRcdFx0YmVzdFNob3J0dGV4dEIgPSBzaG9ydHRleHQuc3Vic3RyaW5nKCBqICsgcHJlZml4TGVuZ3RoICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICggYmVzdENvbW1vbi5sZW5ndGggKiAyID49IGxvbmd0ZXh0Lmxlbmd0aCApIHtcblx0XHRcdFx0cmV0dXJuIFsgYmVzdExvbmd0ZXh0QSwgYmVzdExvbmd0ZXh0Qixcblx0XHRcdFx0XHRiZXN0U2hvcnR0ZXh0QSwgYmVzdFNob3J0dGV4dEIsIGJlc3RDb21tb25cblx0XHRcdFx0XTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEZpcnN0IGNoZWNrIGlmIHRoZSBzZWNvbmQgcXVhcnRlciBpcyB0aGUgc2VlZCBmb3IgYSBoYWxmLW1hdGNoLlxuXHRcdGhtMSA9IGRpZmZIYWxmTWF0Y2hJKCBsb25ndGV4dCwgc2hvcnR0ZXh0LFxuXHRcdFx0TWF0aC5jZWlsKCBsb25ndGV4dC5sZW5ndGggLyA0ICkgKTtcblx0XHQvLyBDaGVjayBhZ2FpbiBiYXNlZCBvbiB0aGUgdGhpcmQgcXVhcnRlci5cblx0XHRobTIgPSBkaWZmSGFsZk1hdGNoSSggbG9uZ3RleHQsIHNob3J0dGV4dCxcblx0XHRcdE1hdGguY2VpbCggbG9uZ3RleHQubGVuZ3RoIC8gMiApICk7XG5cdFx0aWYgKCAhaG0xICYmICFobTIgKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9IGVsc2UgaWYgKCAhaG0yICkge1xuXHRcdFx0aG0gPSBobTE7XG5cdFx0fSBlbHNlIGlmICggIWhtMSApIHtcblx0XHRcdGhtID0gaG0yO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBCb3RoIG1hdGNoZWQuICBTZWxlY3QgdGhlIGxvbmdlc3QuXG5cdFx0XHRobSA9IGhtMVsgNCBdLmxlbmd0aCA+IGhtMlsgNCBdLmxlbmd0aCA/IGhtMSA6IGhtMjtcblx0XHR9XG5cblx0XHQvLyBBIGhhbGYtbWF0Y2ggd2FzIGZvdW5kLCBzb3J0IG91dCB0aGUgcmV0dXJuIGRhdGEuXG5cdFx0dGV4dDFBLCB0ZXh0MUIsIHRleHQyQSwgdGV4dDJCO1xuXHRcdGlmICggdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoICkge1xuXHRcdFx0dGV4dDFBID0gaG1bIDAgXTtcblx0XHRcdHRleHQxQiA9IGhtWyAxIF07XG5cdFx0XHR0ZXh0MkEgPSBobVsgMiBdO1xuXHRcdFx0dGV4dDJCID0gaG1bIDMgXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGV4dDJBID0gaG1bIDAgXTtcblx0XHRcdHRleHQyQiA9IGhtWyAxIF07XG5cdFx0XHR0ZXh0MUEgPSBobVsgMiBdO1xuXHRcdFx0dGV4dDFCID0gaG1bIDMgXTtcblx0XHR9XG5cdFx0bWlkQ29tbW9uID0gaG1bIDQgXTtcblx0XHRyZXR1cm4gWyB0ZXh0MUEsIHRleHQxQiwgdGV4dDJBLCB0ZXh0MkIsIG1pZENvbW1vbiBdO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEbyBhIHF1aWNrIGxpbmUtbGV2ZWwgZGlmZiBvbiBib3RoIHN0cmluZ3MsIHRoZW4gcmVkaWZmIHRoZSBwYXJ0cyBmb3Jcblx0ICogZ3JlYXRlciBhY2N1cmFjeS5cblx0ICogVGhpcyBzcGVlZHVwIGNhbiBwcm9kdWNlIG5vbi1taW5pbWFsIGRpZmZzLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgT2xkIHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBOZXcgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtudW1iZXJ9IGRlYWRsaW5lIFRpbWUgd2hlbiB0aGUgZGlmZiBzaG91bGQgYmUgY29tcGxldGUgYnkuXG5cdCAqIEByZXR1cm4geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmTGluZU1vZGUgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyLCBkZWFkbGluZSApIHtcblx0XHR2YXIgYSwgZGlmZnMsIGxpbmVhcnJheSwgcG9pbnRlciwgY291bnRJbnNlcnQsXG5cdFx0XHRjb3VudERlbGV0ZSwgdGV4dEluc2VydCwgdGV4dERlbGV0ZSwgajtcblx0XHQvLyBTY2FuIHRoZSB0ZXh0IG9uIGEgbGluZS1ieS1saW5lIGJhc2lzIGZpcnN0LlxuXHRcdGEgPSB0aGlzLmRpZmZMaW5lc1RvQ2hhcnMoIHRleHQxLCB0ZXh0MiApO1xuXHRcdHRleHQxID0gYS5jaGFyczE7XG5cdFx0dGV4dDIgPSBhLmNoYXJzMjtcblx0XHRsaW5lYXJyYXkgPSBhLmxpbmVBcnJheTtcblxuXHRcdGRpZmZzID0gdGhpcy5EaWZmTWFpbiggdGV4dDEsIHRleHQyLCBmYWxzZSwgZGVhZGxpbmUgKTtcblxuXHRcdC8vIENvbnZlcnQgdGhlIGRpZmYgYmFjayB0byBvcmlnaW5hbCB0ZXh0LlxuXHRcdHRoaXMuZGlmZkNoYXJzVG9MaW5lcyggZGlmZnMsIGxpbmVhcnJheSApO1xuXHRcdC8vIEVsaW1pbmF0ZSBmcmVhayBtYXRjaGVzIChlLmcuIGJsYW5rIGxpbmVzKVxuXHRcdHRoaXMuZGlmZkNsZWFudXBTZW1hbnRpYyggZGlmZnMgKTtcblxuXHRcdC8vIFJlZGlmZiBhbnkgcmVwbGFjZW1lbnQgYmxvY2tzLCB0aGlzIHRpbWUgY2hhcmFjdGVyLWJ5LWNoYXJhY3Rlci5cblx0XHQvLyBBZGQgYSBkdW1teSBlbnRyeSBhdCB0aGUgZW5kLlxuXHRcdGRpZmZzLnB1c2goIFsgRElGRl9FUVVBTCwgXCJcIiBdICk7XG5cdFx0cG9pbnRlciA9IDA7XG5cdFx0Y291bnREZWxldGUgPSAwO1xuXHRcdGNvdW50SW5zZXJ0ID0gMDtcblx0XHR0ZXh0RGVsZXRlID0gXCJcIjtcblx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cdFx0XHRzd2l0Y2ggKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gKSB7XG5cdFx0XHRjYXNlIERJRkZfSU5TRVJUOlxuXHRcdFx0XHRjb3VudEluc2VydCsrO1xuXHRcdFx0XHR0ZXh0SW5zZXJ0ICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfREVMRVRFOlxuXHRcdFx0XHRjb3VudERlbGV0ZSsrO1xuXHRcdFx0XHR0ZXh0RGVsZXRlICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfRVFVQUw6XG5cdFx0XHRcdC8vIFVwb24gcmVhY2hpbmcgYW4gZXF1YWxpdHksIGNoZWNrIGZvciBwcmlvciByZWR1bmRhbmNpZXMuXG5cdFx0XHRcdGlmICggY291bnREZWxldGUgPj0gMSAmJiBjb3VudEluc2VydCA+PSAxICkge1xuXHRcdFx0XHRcdC8vIERlbGV0ZSB0aGUgb2ZmZW5kaW5nIHJlY29yZHMgYW5kIGFkZCB0aGUgbWVyZ2VkIG9uZXMuXG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCxcblx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQgKTtcblx0XHRcdFx0XHRwb2ludGVyID0gcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQ7XG5cdFx0XHRcdFx0YSA9IHRoaXMuRGlmZk1haW4oIHRleHREZWxldGUsIHRleHRJbnNlcnQsIGZhbHNlLCBkZWFkbGluZSApO1xuXHRcdFx0XHRcdGZvciAoIGogPSBhLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tICkge1xuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyLCAwLCBhWyBqIF0gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cG9pbnRlciA9IHBvaW50ZXIgKyBhLmxlbmd0aDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3VudEluc2VydCA9IDA7XG5cdFx0XHRcdGNvdW50RGVsZXRlID0gMDtcblx0XHRcdFx0dGV4dERlbGV0ZSA9IFwiXCI7XG5cdFx0XHRcdHRleHRJbnNlcnQgPSBcIlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cdFx0ZGlmZnMucG9wKCk7IC8vIFJlbW92ZSB0aGUgZHVtbXkgZW50cnkgYXQgdGhlIGVuZC5cblxuXHRcdHJldHVybiBkaWZmcztcblx0fTtcblxuXHQvKipcblx0ICogRmluZCB0aGUgJ21pZGRsZSBzbmFrZScgb2YgYSBkaWZmLCBzcGxpdCB0aGUgcHJvYmxlbSBpbiB0d29cblx0ICogYW5kIHJldHVybiB0aGUgcmVjdXJzaXZlbHkgY29uc3RydWN0ZWQgZGlmZi5cblx0ICogU2VlIE15ZXJzIDE5ODYgcGFwZXI6IEFuIE8oTkQpIERpZmZlcmVuY2UgQWxnb3JpdGhtIGFuZCBJdHMgVmFyaWF0aW9ucy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIGF0IHdoaWNoIHRvIGJhaWwgaWYgbm90IHlldCBjb21wbGV0ZS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZCaXNlY3QgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyLCBkZWFkbGluZSApIHtcblx0XHR2YXIgdGV4dDFMZW5ndGgsIHRleHQyTGVuZ3RoLCBtYXhELCB2T2Zmc2V0LCB2TGVuZ3RoLFxuXHRcdFx0djEsIHYyLCB4LCBkZWx0YSwgZnJvbnQsIGsxc3RhcnQsIGsxZW5kLCBrMnN0YXJ0LFxuXHRcdFx0azJlbmQsIGsyT2Zmc2V0LCBrMU9mZnNldCwgeDEsIHgyLCB5MSwgeTIsIGQsIGsxLCBrMjtcblx0XHQvLyBDYWNoZSB0aGUgdGV4dCBsZW5ndGhzIHRvIHByZXZlbnQgbXVsdGlwbGUgY2FsbHMuXG5cdFx0dGV4dDFMZW5ndGggPSB0ZXh0MS5sZW5ndGg7XG5cdFx0dGV4dDJMZW5ndGggPSB0ZXh0Mi5sZW5ndGg7XG5cdFx0bWF4RCA9IE1hdGguY2VpbCggKCB0ZXh0MUxlbmd0aCArIHRleHQyTGVuZ3RoICkgLyAyICk7XG5cdFx0dk9mZnNldCA9IG1heEQ7XG5cdFx0dkxlbmd0aCA9IDIgKiBtYXhEO1xuXHRcdHYxID0gbmV3IEFycmF5KCB2TGVuZ3RoICk7XG5cdFx0djIgPSBuZXcgQXJyYXkoIHZMZW5ndGggKTtcblx0XHQvLyBTZXR0aW5nIGFsbCBlbGVtZW50cyB0byAtMSBpcyBmYXN0ZXIgaW4gQ2hyb21lICYgRmlyZWZveCB0aGFuIG1peGluZ1xuXHRcdC8vIGludGVnZXJzIGFuZCB1bmRlZmluZWQuXG5cdFx0Zm9yICggeCA9IDA7IHggPCB2TGVuZ3RoOyB4KysgKSB7XG5cdFx0XHR2MVsgeCBdID0gLTE7XG5cdFx0XHR2MlsgeCBdID0gLTE7XG5cdFx0fVxuXHRcdHYxWyB2T2Zmc2V0ICsgMSBdID0gMDtcblx0XHR2Mlsgdk9mZnNldCArIDEgXSA9IDA7XG5cdFx0ZGVsdGEgPSB0ZXh0MUxlbmd0aCAtIHRleHQyTGVuZ3RoO1xuXHRcdC8vIElmIHRoZSB0b3RhbCBudW1iZXIgb2YgY2hhcmFjdGVycyBpcyBvZGQsIHRoZW4gdGhlIGZyb250IHBhdGggd2lsbCBjb2xsaWRlXG5cdFx0Ly8gd2l0aCB0aGUgcmV2ZXJzZSBwYXRoLlxuXHRcdGZyb250ID0gKCBkZWx0YSAlIDIgIT09IDAgKTtcblx0XHQvLyBPZmZzZXRzIGZvciBzdGFydCBhbmQgZW5kIG9mIGsgbG9vcC5cblx0XHQvLyBQcmV2ZW50cyBtYXBwaW5nIG9mIHNwYWNlIGJleW9uZCB0aGUgZ3JpZC5cblx0XHRrMXN0YXJ0ID0gMDtcblx0XHRrMWVuZCA9IDA7XG5cdFx0azJzdGFydCA9IDA7XG5cdFx0azJlbmQgPSAwO1xuXHRcdGZvciAoIGQgPSAwOyBkIDwgbWF4RDsgZCsrICkge1xuXHRcdFx0Ly8gQmFpbCBvdXQgaWYgZGVhZGxpbmUgaXMgcmVhY2hlZC5cblx0XHRcdGlmICggKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpID4gZGVhZGxpbmUgKSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBXYWxrIHRoZSBmcm9udCBwYXRoIG9uZSBzdGVwLlxuXHRcdFx0Zm9yICggazEgPSAtZCArIGsxc3RhcnQ7IGsxIDw9IGQgLSBrMWVuZDsgazEgKz0gMiApIHtcblx0XHRcdFx0azFPZmZzZXQgPSB2T2Zmc2V0ICsgazE7XG5cdFx0XHRcdGlmICggazEgPT09IC1kIHx8ICggazEgIT09IGQgJiYgdjFbIGsxT2Zmc2V0IC0gMSBdIDwgdjFbIGsxT2Zmc2V0ICsgMSBdICkgKSB7XG5cdFx0XHRcdFx0eDEgPSB2MVsgazFPZmZzZXQgKyAxIF07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0eDEgPSB2MVsgazFPZmZzZXQgLSAxIF0gKyAxO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHkxID0geDEgLSBrMTtcblx0XHRcdFx0d2hpbGUgKCB4MSA8IHRleHQxTGVuZ3RoICYmIHkxIDwgdGV4dDJMZW5ndGggJiZcblx0XHRcdFx0XHR0ZXh0MS5jaGFyQXQoIHgxICkgPT09IHRleHQyLmNoYXJBdCggeTEgKSApIHtcblx0XHRcdFx0XHR4MSsrO1xuXHRcdFx0XHRcdHkxKys7XG5cdFx0XHRcdH1cblx0XHRcdFx0djFbIGsxT2Zmc2V0IF0gPSB4MTtcblx0XHRcdFx0aWYgKCB4MSA+IHRleHQxTGVuZ3RoICkge1xuXHRcdFx0XHRcdC8vIFJhbiBvZmYgdGhlIHJpZ2h0IG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMWVuZCArPSAyO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCB5MSA+IHRleHQyTGVuZ3RoICkge1xuXHRcdFx0XHRcdC8vIFJhbiBvZmYgdGhlIGJvdHRvbSBvZiB0aGUgZ3JhcGguXG5cdFx0XHRcdFx0azFzdGFydCArPSAyO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcm9udCApIHtcblx0XHRcdFx0XHRrMk9mZnNldCA9IHZPZmZzZXQgKyBkZWx0YSAtIGsxO1xuXHRcdFx0XHRcdGlmICggazJPZmZzZXQgPj0gMCAmJiBrMk9mZnNldCA8IHZMZW5ndGggJiYgdjJbIGsyT2Zmc2V0IF0gIT09IC0xICkge1xuXHRcdFx0XHRcdFx0Ly8gTWlycm9yIHgyIG9udG8gdG9wLWxlZnQgY29vcmRpbmF0ZSBzeXN0ZW0uXG5cdFx0XHRcdFx0XHR4MiA9IHRleHQxTGVuZ3RoIC0gdjJbIGsyT2Zmc2V0IF07XG5cdFx0XHRcdFx0XHRpZiAoIHgxID49IHgyICkge1xuXHRcdFx0XHRcdFx0XHQvLyBPdmVybGFwIGRldGVjdGVkLlxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaWZmQmlzZWN0U3BsaXQoIHRleHQxLCB0ZXh0MiwgeDEsIHkxLCBkZWFkbGluZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBXYWxrIHRoZSByZXZlcnNlIHBhdGggb25lIHN0ZXAuXG5cdFx0XHRmb3IgKCBrMiA9IC1kICsgazJzdGFydDsgazIgPD0gZCAtIGsyZW5kOyBrMiArPSAyICkge1xuXHRcdFx0XHRrMk9mZnNldCA9IHZPZmZzZXQgKyBrMjtcblx0XHRcdFx0aWYgKCBrMiA9PT0gLWQgfHwgKCBrMiAhPT0gZCAmJiB2MlsgazJPZmZzZXQgLSAxIF0gPCB2MlsgazJPZmZzZXQgKyAxIF0gKSApIHtcblx0XHRcdFx0XHR4MiA9IHYyWyBrMk9mZnNldCArIDEgXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR4MiA9IHYyWyBrMk9mZnNldCAtIDEgXSArIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0eTIgPSB4MiAtIGsyO1xuXHRcdFx0XHR3aGlsZSAoIHgyIDwgdGV4dDFMZW5ndGggJiYgeTIgPCB0ZXh0Mkxlbmd0aCAmJlxuXHRcdFx0XHRcdHRleHQxLmNoYXJBdCggdGV4dDFMZW5ndGggLSB4MiAtIDEgKSA9PT1cblx0XHRcdFx0XHR0ZXh0Mi5jaGFyQXQoIHRleHQyTGVuZ3RoIC0geTIgLSAxICkgKSB7XG5cdFx0XHRcdFx0eDIrKztcblx0XHRcdFx0XHR5MisrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHYyWyBrMk9mZnNldCBdID0geDI7XG5cdFx0XHRcdGlmICggeDIgPiB0ZXh0MUxlbmd0aCApIHtcblx0XHRcdFx0XHQvLyBSYW4gb2ZmIHRoZSBsZWZ0IG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMmVuZCArPSAyO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCB5MiA+IHRleHQyTGVuZ3RoICkge1xuXHRcdFx0XHRcdC8vIFJhbiBvZmYgdGhlIHRvcCBvZiB0aGUgZ3JhcGguXG5cdFx0XHRcdFx0azJzdGFydCArPSAyO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAhZnJvbnQgKSB7XG5cdFx0XHRcdFx0azFPZmZzZXQgPSB2T2Zmc2V0ICsgZGVsdGEgLSBrMjtcblx0XHRcdFx0XHRpZiAoIGsxT2Zmc2V0ID49IDAgJiYgazFPZmZzZXQgPCB2TGVuZ3RoICYmIHYxWyBrMU9mZnNldCBdICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdHgxID0gdjFbIGsxT2Zmc2V0IF07XG5cdFx0XHRcdFx0XHR5MSA9IHZPZmZzZXQgKyB4MSAtIGsxT2Zmc2V0O1xuXHRcdFx0XHRcdFx0Ly8gTWlycm9yIHgyIG9udG8gdG9wLWxlZnQgY29vcmRpbmF0ZSBzeXN0ZW0uXG5cdFx0XHRcdFx0XHR4MiA9IHRleHQxTGVuZ3RoIC0geDI7XG5cdFx0XHRcdFx0XHRpZiAoIHgxID49IHgyICkge1xuXHRcdFx0XHRcdFx0XHQvLyBPdmVybGFwIGRldGVjdGVkLlxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaWZmQmlzZWN0U3BsaXQoIHRleHQxLCB0ZXh0MiwgeDEsIHkxLCBkZWFkbGluZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBEaWZmIHRvb2sgdG9vIGxvbmcgYW5kIGhpdCB0aGUgZGVhZGxpbmUgb3Jcblx0XHQvLyBudW1iZXIgb2YgZGlmZnMgZXF1YWxzIG51bWJlciBvZiBjaGFyYWN0ZXJzLCBubyBjb21tb25hbGl0eSBhdCBhbGwuXG5cdFx0cmV0dXJuIFtcblx0XHRcdFsgRElGRl9ERUxFVEUsIHRleHQxIF0sXG5cdFx0XHRbIERJRkZfSU5TRVJULCB0ZXh0MiBdXG5cdFx0XTtcblx0fTtcblxuXHQvKipcblx0ICogR2l2ZW4gdGhlIGxvY2F0aW9uIG9mIHRoZSAnbWlkZGxlIHNuYWtlJywgc3BsaXQgdGhlIGRpZmYgaW4gdHdvIHBhcnRzXG5cdCAqIGFuZCByZWN1cnNlLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgT2xkIHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBOZXcgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtudW1iZXJ9IHggSW5kZXggb2Ygc3BsaXQgcG9pbnQgaW4gdGV4dDEuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB5IEluZGV4IG9mIHNwbGl0IHBvaW50IGluIHRleHQyLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVhZGxpbmUgVGltZSBhdCB3aGljaCB0byBiYWlsIGlmIG5vdCB5ZXQgY29tcGxldGUuXG5cdCAqIEByZXR1cm4geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQmlzZWN0U3BsaXQgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyLCB4LCB5LCBkZWFkbGluZSApIHtcblx0XHR2YXIgdGV4dDFhLCB0ZXh0MWIsIHRleHQyYSwgdGV4dDJiLCBkaWZmcywgZGlmZnNiO1xuXHRcdHRleHQxYSA9IHRleHQxLnN1YnN0cmluZyggMCwgeCApO1xuXHRcdHRleHQyYSA9IHRleHQyLnN1YnN0cmluZyggMCwgeSApO1xuXHRcdHRleHQxYiA9IHRleHQxLnN1YnN0cmluZyggeCApO1xuXHRcdHRleHQyYiA9IHRleHQyLnN1YnN0cmluZyggeSApO1xuXG5cdFx0Ly8gQ29tcHV0ZSBib3RoIGRpZmZzIHNlcmlhbGx5LlxuXHRcdGRpZmZzID0gdGhpcy5EaWZmTWFpbiggdGV4dDFhLCB0ZXh0MmEsIGZhbHNlLCBkZWFkbGluZSApO1xuXHRcdGRpZmZzYiA9IHRoaXMuRGlmZk1haW4oIHRleHQxYiwgdGV4dDJiLCBmYWxzZSwgZGVhZGxpbmUgKTtcblxuXHRcdHJldHVybiBkaWZmcy5jb25jYXQoIGRpZmZzYiApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZWR1Y2UgdGhlIG51bWJlciBvZiBlZGl0cyBieSBlbGltaW5hdGluZyBzZW1hbnRpY2FsbHkgdHJpdmlhbCBlcXVhbGl0aWVzLlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ2xlYW51cFNlbWFudGljID0gZnVuY3Rpb24oIGRpZmZzICkge1xuXHRcdHZhciBjaGFuZ2VzLCBlcXVhbGl0aWVzLCBlcXVhbGl0aWVzTGVuZ3RoLCBsYXN0ZXF1YWxpdHksXG5cdFx0XHRwb2ludGVyLCBsZW5ndGhJbnNlcnRpb25zMiwgbGVuZ3RoRGVsZXRpb25zMiwgbGVuZ3RoSW5zZXJ0aW9uczEsXG5cdFx0XHRsZW5ndGhEZWxldGlvbnMxLCBkZWxldGlvbiwgaW5zZXJ0aW9uLCBvdmVybGFwTGVuZ3RoMSwgb3ZlcmxhcExlbmd0aDI7XG5cdFx0Y2hhbmdlcyA9IGZhbHNlO1xuXHRcdGVxdWFsaXRpZXMgPSBbXTsgLy8gU3RhY2sgb2YgaW5kaWNlcyB3aGVyZSBlcXVhbGl0aWVzIGFyZSBmb3VuZC5cblx0XHRlcXVhbGl0aWVzTGVuZ3RoID0gMDsgLy8gS2VlcGluZyBvdXIgb3duIGxlbmd0aCB2YXIgaXMgZmFzdGVyIGluIEpTLlxuXHRcdC8qKiBAdHlwZSB7P3N0cmluZ30gKi9cblx0XHRsYXN0ZXF1YWxpdHkgPSBudWxsO1xuXHRcdC8vIEFsd2F5cyBlcXVhbCB0byBkaWZmc1tlcXVhbGl0aWVzW2VxdWFsaXRpZXNMZW5ndGggLSAxXV1bMV1cblx0XHRwb2ludGVyID0gMDsgLy8gSW5kZXggb2YgY3VycmVudCBwb3NpdGlvbi5cblx0XHQvLyBOdW1iZXIgb2YgY2hhcmFjdGVycyB0aGF0IGNoYW5nZWQgcHJpb3IgdG8gdGhlIGVxdWFsaXR5LlxuXHRcdGxlbmd0aEluc2VydGlvbnMxID0gMDtcblx0XHRsZW5ndGhEZWxldGlvbnMxID0gMDtcblx0XHQvLyBOdW1iZXIgb2YgY2hhcmFjdGVycyB0aGF0IGNoYW5nZWQgYWZ0ZXIgdGhlIGVxdWFsaXR5LlxuXHRcdGxlbmd0aEluc2VydGlvbnMyID0gMDtcblx0XHRsZW5ndGhEZWxldGlvbnMyID0gMDtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9FUVVBTCApIHsgLy8gRXF1YWxpdHkgZm91bmQuXG5cdFx0XHRcdGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGgrKyBdID0gcG9pbnRlcjtcblx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczEgPSBsZW5ndGhJbnNlcnRpb25zMjtcblx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMSA9IGxlbmd0aERlbGV0aW9uczI7XG5cdFx0XHRcdGxlbmd0aEluc2VydGlvbnMyID0gMDtcblx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMiA9IDA7XG5cdFx0XHRcdGxhc3RlcXVhbGl0eSA9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdH0gZWxzZSB7IC8vIEFuIGluc2VydGlvbiBvciBkZWxldGlvbi5cblx0XHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfSU5TRVJUICkge1xuXHRcdFx0XHRcdGxlbmd0aEluc2VydGlvbnMyICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXS5sZW5ndGg7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMiArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF0ubGVuZ3RoO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIEVsaW1pbmF0ZSBhbiBlcXVhbGl0eSB0aGF0IGlzIHNtYWxsZXIgb3IgZXF1YWwgdG8gdGhlIGVkaXRzIG9uIGJvdGhcblx0XHRcdFx0Ly8gc2lkZXMgb2YgaXQuXG5cdFx0XHRcdGlmICggbGFzdGVxdWFsaXR5ICYmICggbGFzdGVxdWFsaXR5Lmxlbmd0aCA8PVxuXHRcdFx0XHRcdFx0TWF0aC5tYXgoIGxlbmd0aEluc2VydGlvbnMxLCBsZW5ndGhEZWxldGlvbnMxICkgKSAmJlxuXHRcdFx0XHRcdFx0KCBsYXN0ZXF1YWxpdHkubGVuZ3RoIDw9IE1hdGgubWF4KCBsZW5ndGhJbnNlcnRpb25zMixcblx0XHRcdFx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMiApICkgKSB7XG5cblx0XHRcdFx0XHQvLyBEdXBsaWNhdGUgcmVjb3JkLlxuXHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0sXG5cdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0WyBESUZGX0RFTEVURSwgbGFzdGVxdWFsaXR5IF1cblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0Ly8gQ2hhbmdlIHNlY29uZCBjb3B5IHRvIGluc2VydC5cblx0XHRcdFx0XHRkaWZmc1sgZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSArIDEgXVsgMCBdID0gRElGRl9JTlNFUlQ7XG5cblx0XHRcdFx0XHQvLyBUaHJvdyBhd2F5IHRoZSBlcXVhbGl0eSB3ZSBqdXN0IGRlbGV0ZWQuXG5cdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tO1xuXG5cdFx0XHRcdFx0Ly8gVGhyb3cgYXdheSB0aGUgcHJldmlvdXMgZXF1YWxpdHkgKGl0IG5lZWRzIHRvIGJlIHJlZXZhbHVhdGVkKS5cblx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoLS07XG5cdFx0XHRcdFx0cG9pbnRlciA9IGVxdWFsaXRpZXNMZW5ndGggPiAwID8gZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSA6IC0xO1xuXG5cdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvdW50ZXJzLlxuXHRcdFx0XHRcdGxlbmd0aEluc2VydGlvbnMxID0gMDtcblx0XHRcdFx0XHRsZW5ndGhEZWxldGlvbnMxID0gMDtcblx0XHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMiA9IDA7XG5cdFx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMiA9IDA7XG5cdFx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblx0XHRcdFx0XHRjaGFuZ2VzID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblxuXHRcdC8vIE5vcm1hbGl6ZSB0aGUgZGlmZi5cblx0XHRpZiAoIGNoYW5nZXMgKSB7XG5cdFx0XHR0aGlzLmRpZmZDbGVhbnVwTWVyZ2UoIGRpZmZzICk7XG5cdFx0fVxuXG5cdFx0Ly8gRmluZCBhbnkgb3ZlcmxhcHMgYmV0d2VlbiBkZWxldGlvbnMgYW5kIGluc2VydGlvbnMuXG5cdFx0Ly8gZS5nOiA8ZGVsPmFiY3h4eDwvZGVsPjxpbnM+eHh4ZGVmPC9pbnM+XG5cdFx0Ly8gICAtPiA8ZGVsPmFiYzwvZGVsPnh4eDxpbnM+ZGVmPC9pbnM+XG5cdFx0Ly8gZS5nOiA8ZGVsPnh4eGFiYzwvZGVsPjxpbnM+ZGVmeHh4PC9pbnM+XG5cdFx0Ly8gICAtPiA8aW5zPmRlZjwvaW5zPnh4eDxkZWw+YWJjPC9kZWw+XG5cdFx0Ly8gT25seSBleHRyYWN0IGFuIG92ZXJsYXAgaWYgaXQgaXMgYXMgYmlnIGFzIHRoZSBlZGl0IGFoZWFkIG9yIGJlaGluZCBpdC5cblx0XHRwb2ludGVyID0gMTtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIC0gMSBdWyAwIF0gPT09IERJRkZfREVMRVRFICYmXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0lOU0VSVCApIHtcblx0XHRcdFx0ZGVsZXRpb24gPSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdO1xuXHRcdFx0XHRpbnNlcnRpb24gPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdG92ZXJsYXBMZW5ndGgxID0gdGhpcy5kaWZmQ29tbW9uT3ZlcmxhcCggZGVsZXRpb24sIGluc2VydGlvbiApO1xuXHRcdFx0XHRvdmVybGFwTGVuZ3RoMiA9IHRoaXMuZGlmZkNvbW1vbk92ZXJsYXAoIGluc2VydGlvbiwgZGVsZXRpb24gKTtcblx0XHRcdFx0aWYgKCBvdmVybGFwTGVuZ3RoMSA+PSBvdmVybGFwTGVuZ3RoMiApIHtcblx0XHRcdFx0XHRpZiAoIG92ZXJsYXBMZW5ndGgxID49IGRlbGV0aW9uLmxlbmd0aCAvIDIgfHxcblx0XHRcdFx0XHRcdFx0b3ZlcmxhcExlbmd0aDEgPj0gaW5zZXJ0aW9uLmxlbmd0aCAvIDIgKSB7XG5cdFx0XHRcdFx0XHQvLyBPdmVybGFwIGZvdW5kLiAgSW5zZXJ0IGFuIGVxdWFsaXR5IGFuZCB0cmltIHRoZSBzdXJyb3VuZGluZyBlZGl0cy5cblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdFx0cG9pbnRlcixcblx0XHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFx0WyBESUZGX0VRVUFMLCBpbnNlcnRpb24uc3Vic3RyaW5nKCAwLCBvdmVybGFwTGVuZ3RoMSApIF1cblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdFx0ZGVsZXRpb24uc3Vic3RyaW5nKCAwLCBkZWxldGlvbi5sZW5ndGggLSBvdmVybGFwTGVuZ3RoMSApO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXSA9IGluc2VydGlvbi5zdWJzdHJpbmcoIG92ZXJsYXBMZW5ndGgxICk7XG5cdFx0XHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmICggb3ZlcmxhcExlbmd0aDIgPj0gZGVsZXRpb24ubGVuZ3RoIC8gMiB8fFxuXHRcdFx0XHRcdFx0XHRvdmVybGFwTGVuZ3RoMiA+PSBpbnNlcnRpb24ubGVuZ3RoIC8gMiApIHtcblxuXHRcdFx0XHRcdFx0Ly8gUmV2ZXJzZSBvdmVybGFwIGZvdW5kLlxuXHRcdFx0XHRcdFx0Ly8gSW5zZXJ0IGFuIGVxdWFsaXR5IGFuZCBzd2FwIGFuZCB0cmltIHRoZSBzdXJyb3VuZGluZyBlZGl0cy5cblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdFx0cG9pbnRlcixcblx0XHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFx0WyBESUZGX0VRVUFMLCBkZWxldGlvbi5zdWJzdHJpbmcoIDAsIG92ZXJsYXBMZW5ndGgyICkgXVxuXHRcdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDAgXSA9IERJRkZfSU5TRVJUO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRcdGluc2VydGlvbi5zdWJzdHJpbmcoIDAsIGluc2VydGlvbi5sZW5ndGggLSBvdmVybGFwTGVuZ3RoMiApO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDAgXSA9IERJRkZfREVMRVRFO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRcdGRlbGV0aW9uLnN1YnN0cmluZyggb3ZlcmxhcExlbmd0aDIgKTtcblx0XHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogRGV0ZXJtaW5lIGlmIHRoZSBzdWZmaXggb2Ygb25lIHN0cmluZyBpcyB0aGUgcHJlZml4IG9mIGFub3RoZXIuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBjb21tb24gdG8gdGhlIGVuZCBvZiB0aGUgZmlyc3Rcblx0ICogICAgIHN0cmluZyBhbmQgdGhlIHN0YXJ0IG9mIHRoZSBzZWNvbmQgc3RyaW5nLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDb21tb25PdmVybGFwID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgdGV4dDFMZW5ndGgsIHRleHQyTGVuZ3RoLCB0ZXh0TGVuZ3RoLFxuXHRcdFx0YmVzdCwgbGVuZ3RoLCBwYXR0ZXJuLCBmb3VuZDtcblx0XHQvLyBDYWNoZSB0aGUgdGV4dCBsZW5ndGhzIHRvIHByZXZlbnQgbXVsdGlwbGUgY2FsbHMuXG5cdFx0dGV4dDFMZW5ndGggPSB0ZXh0MS5sZW5ndGg7XG5cdFx0dGV4dDJMZW5ndGggPSB0ZXh0Mi5sZW5ndGg7XG5cdFx0Ly8gRWxpbWluYXRlIHRoZSBudWxsIGNhc2UuXG5cdFx0aWYgKCB0ZXh0MUxlbmd0aCA9PT0gMCB8fCB0ZXh0Mkxlbmd0aCA9PT0gMCApIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHQvLyBUcnVuY2F0ZSB0aGUgbG9uZ2VyIHN0cmluZy5cblx0XHRpZiAoIHRleHQxTGVuZ3RoID4gdGV4dDJMZW5ndGggKSB7XG5cdFx0XHR0ZXh0MSA9IHRleHQxLnN1YnN0cmluZyggdGV4dDFMZW5ndGggLSB0ZXh0Mkxlbmd0aCApO1xuXHRcdH0gZWxzZSBpZiAoIHRleHQxTGVuZ3RoIDwgdGV4dDJMZW5ndGggKSB7XG5cdFx0XHR0ZXh0MiA9IHRleHQyLnN1YnN0cmluZyggMCwgdGV4dDFMZW5ndGggKTtcblx0XHR9XG5cdFx0dGV4dExlbmd0aCA9IE1hdGgubWluKCB0ZXh0MUxlbmd0aCwgdGV4dDJMZW5ndGggKTtcblx0XHQvLyBRdWljayBjaGVjayBmb3IgdGhlIHdvcnN0IGNhc2UuXG5cdFx0aWYgKCB0ZXh0MSA9PT0gdGV4dDIgKSB7XG5cdFx0XHRyZXR1cm4gdGV4dExlbmd0aDtcblx0XHR9XG5cblx0XHQvLyBTdGFydCBieSBsb29raW5nIGZvciBhIHNpbmdsZSBjaGFyYWN0ZXIgbWF0Y2hcblx0XHQvLyBhbmQgaW5jcmVhc2UgbGVuZ3RoIHVudGlsIG5vIG1hdGNoIGlzIGZvdW5kLlxuXHRcdC8vIFBlcmZvcm1hbmNlIGFuYWx5c2lzOiBodHRwczovL25laWwuZnJhc2VyLm5hbWUvbmV3cy8yMDEwLzExLzA0L1xuXHRcdGJlc3QgPSAwO1xuXHRcdGxlbmd0aCA9IDE7XG5cdFx0d2hpbGUgKCB0cnVlICkge1xuXHRcdFx0cGF0dGVybiA9IHRleHQxLnN1YnN0cmluZyggdGV4dExlbmd0aCAtIGxlbmd0aCApO1xuXHRcdFx0Zm91bmQgPSB0ZXh0Mi5pbmRleE9mKCBwYXR0ZXJuICk7XG5cdFx0XHRpZiAoIGZvdW5kID09PSAtMSApIHtcblx0XHRcdFx0cmV0dXJuIGJlc3Q7XG5cdFx0XHR9XG5cdFx0XHRsZW5ndGggKz0gZm91bmQ7XG5cdFx0XHRpZiAoIGZvdW5kID09PSAwIHx8IHRleHQxLnN1YnN0cmluZyggdGV4dExlbmd0aCAtIGxlbmd0aCApID09PVxuXHRcdFx0XHRcdHRleHQyLnN1YnN0cmluZyggMCwgbGVuZ3RoICkgKSB7XG5cdFx0XHRcdGJlc3QgPSBsZW5ndGg7XG5cdFx0XHRcdGxlbmd0aCsrO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogU3BsaXQgdHdvIHRleHRzIGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncy4gIFJlZHVjZSB0aGUgdGV4dHMgdG8gYSBzdHJpbmcgb2Zcblx0ICogaGFzaGVzIHdoZXJlIGVhY2ggVW5pY29kZSBjaGFyYWN0ZXIgcmVwcmVzZW50cyBvbmUgbGluZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge3tjaGFyczE6IHN0cmluZywgY2hhcnMyOiBzdHJpbmcsIGxpbmVBcnJheTogIUFycmF5LjxzdHJpbmc+fX1cblx0ICogICAgIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBlbmNvZGVkIHRleHQxLCB0aGUgZW5jb2RlZCB0ZXh0MiBhbmRcblx0ICogICAgIHRoZSBhcnJheSBvZiB1bmlxdWUgc3RyaW5ncy5cblx0ICogICAgIFRoZSB6ZXJvdGggZWxlbWVudCBvZiB0aGUgYXJyYXkgb2YgdW5pcXVlIHN0cmluZ3MgaXMgaW50ZW50aW9uYWxseSBibGFuay5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmTGluZXNUb0NoYXJzID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgbGluZUFycmF5LCBsaW5lSGFzaCwgY2hhcnMxLCBjaGFyczI7XG5cdFx0bGluZUFycmF5ID0gW107IC8vIGUuZy4gbGluZUFycmF5WzRdID09PSAnSGVsbG9cXG4nXG5cdFx0bGluZUhhc2ggPSB7fTsgLy8gZS5nLiBsaW5lSGFzaFsnSGVsbG9cXG4nXSA9PT0gNFxuXG5cdFx0Ly8gJ1xceDAwJyBpcyBhIHZhbGlkIGNoYXJhY3RlciwgYnV0IHZhcmlvdXMgZGVidWdnZXJzIGRvbid0IGxpa2UgaXQuXG5cdFx0Ly8gU28gd2UnbGwgaW5zZXJ0IGEganVuayBlbnRyeSB0byBhdm9pZCBnZW5lcmF0aW5nIGEgbnVsbCBjaGFyYWN0ZXIuXG5cdFx0bGluZUFycmF5WyAwIF0gPSBcIlwiO1xuXG5cdFx0LyoqXG5cdFx0ICogU3BsaXQgYSB0ZXh0IGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncy4gIFJlZHVjZSB0aGUgdGV4dHMgdG8gYSBzdHJpbmcgb2Zcblx0XHQgKiBoYXNoZXMgd2hlcmUgZWFjaCBVbmljb2RlIGNoYXJhY3RlciByZXByZXNlbnRzIG9uZSBsaW5lLlxuXHRcdCAqIE1vZGlmaWVzIGxpbmVhcnJheSBhbmQgbGluZWhhc2ggdGhyb3VnaCBiZWluZyBhIGNsb3N1cmUuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQgU3RyaW5nIHRvIGVuY29kZS5cblx0XHQgKiBAcmV0dXJuIHtzdHJpbmd9IEVuY29kZWQgc3RyaW5nLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGlmZkxpbmVzVG9DaGFyc011bmdlKCB0ZXh0ICkge1xuXHRcdFx0dmFyIGNoYXJzLCBsaW5lU3RhcnQsIGxpbmVFbmQsIGxpbmVBcnJheUxlbmd0aCwgbGluZTtcblx0XHRcdGNoYXJzID0gXCJcIjtcblx0XHRcdC8vIFdhbGsgdGhlIHRleHQsIHB1bGxpbmcgb3V0IGEgc3Vic3RyaW5nIGZvciBlYWNoIGxpbmUuXG5cdFx0XHQvLyB0ZXh0LnNwbGl0KCdcXG4nKSB3b3VsZCB3b3VsZCB0ZW1wb3JhcmlseSBkb3VibGUgb3VyIG1lbW9yeSBmb290cHJpbnQuXG5cdFx0XHQvLyBNb2RpZnlpbmcgdGV4dCB3b3VsZCBjcmVhdGUgbWFueSBsYXJnZSBzdHJpbmdzIHRvIGdhcmJhZ2UgY29sbGVjdC5cblx0XHRcdGxpbmVTdGFydCA9IDA7XG5cdFx0XHRsaW5lRW5kID0gLTE7XG5cdFx0XHQvLyBLZWVwaW5nIG91ciBvd24gbGVuZ3RoIHZhcmlhYmxlIGlzIGZhc3RlciB0aGFuIGxvb2tpbmcgaXQgdXAuXG5cdFx0XHRsaW5lQXJyYXlMZW5ndGggPSBsaW5lQXJyYXkubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKCBsaW5lRW5kIDwgdGV4dC5sZW5ndGggLSAxICkge1xuXHRcdFx0XHRsaW5lRW5kID0gdGV4dC5pbmRleE9mKCBcIlxcblwiLCBsaW5lU3RhcnQgKTtcblx0XHRcdFx0aWYgKCBsaW5lRW5kID09PSAtMSApIHtcblx0XHRcdFx0XHRsaW5lRW5kID0gdGV4dC5sZW5ndGggLSAxO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxpbmUgPSB0ZXh0LnN1YnN0cmluZyggbGluZVN0YXJ0LCBsaW5lRW5kICsgMSApO1xuXHRcdFx0XHRsaW5lU3RhcnQgPSBsaW5lRW5kICsgMTtcblxuXHRcdFx0XHRpZiAoIGxpbmVIYXNoLmhhc093blByb3BlcnR5ID8gbGluZUhhc2guaGFzT3duUHJvcGVydHkoIGxpbmUgKSA6XG5cdFx0XHRcdFx0XHRcdCggbGluZUhhc2hbIGxpbmUgXSAhPT0gdW5kZWZpbmVkICkgKSB7XG5cdFx0XHRcdFx0Y2hhcnMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSggbGluZUhhc2hbIGxpbmUgXSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNoYXJzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoIGxpbmVBcnJheUxlbmd0aCApO1xuXHRcdFx0XHRcdGxpbmVIYXNoWyBsaW5lIF0gPSBsaW5lQXJyYXlMZW5ndGg7XG5cdFx0XHRcdFx0bGluZUFycmF5WyBsaW5lQXJyYXlMZW5ndGgrKyBdID0gbGluZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGNoYXJzO1xuXHRcdH1cblxuXHRcdGNoYXJzMSA9IGRpZmZMaW5lc1RvQ2hhcnNNdW5nZSggdGV4dDEgKTtcblx0XHRjaGFyczIgPSBkaWZmTGluZXNUb0NoYXJzTXVuZ2UoIHRleHQyICk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNoYXJzMTogY2hhcnMxLFxuXHRcdFx0Y2hhcnMyOiBjaGFyczIsXG5cdFx0XHRsaW5lQXJyYXk6IGxpbmVBcnJheVxuXHRcdH07XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlaHlkcmF0ZSB0aGUgdGV4dCBpbiBhIGRpZmYgZnJvbSBhIHN0cmluZyBvZiBsaW5lIGhhc2hlcyB0byByZWFsIGxpbmVzIG9mXG5cdCAqIHRleHQuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcGFyYW0geyFBcnJheS48c3RyaW5nPn0gbGluZUFycmF5IEFycmF5IG9mIHVuaXF1ZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDaGFyc1RvTGluZXMgPSBmdW5jdGlvbiggZGlmZnMsIGxpbmVBcnJheSApIHtcblx0XHR2YXIgeCwgY2hhcnMsIHRleHQsIHk7XG5cdFx0Zm9yICggeCA9IDA7IHggPCBkaWZmcy5sZW5ndGg7IHgrKyApIHtcblx0XHRcdGNoYXJzID0gZGlmZnNbIHggXVsgMSBdO1xuXHRcdFx0dGV4dCA9IFtdO1xuXHRcdFx0Zm9yICggeSA9IDA7IHkgPCBjaGFycy5sZW5ndGg7IHkrKyApIHtcblx0XHRcdFx0dGV4dFsgeSBdID0gbGluZUFycmF5WyBjaGFycy5jaGFyQ29kZUF0KCB5ICkgXTtcblx0XHRcdH1cblx0XHRcdGRpZmZzWyB4IF1bIDEgXSA9IHRleHQuam9pbiggXCJcIiApO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogUmVvcmRlciBhbmQgbWVyZ2UgbGlrZSBlZGl0IHNlY3Rpb25zLiAgTWVyZ2UgZXF1YWxpdGllcy5cblx0ICogQW55IGVkaXQgc2VjdGlvbiBjYW4gbW92ZSBhcyBsb25nIGFzIGl0IGRvZXNuJ3QgY3Jvc3MgYW4gZXF1YWxpdHkuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDbGVhbnVwTWVyZ2UgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIHBvaW50ZXIsIGNvdW50RGVsZXRlLCBjb3VudEluc2VydCwgdGV4dEluc2VydCwgdGV4dERlbGV0ZSxcblx0XHRcdGNvbW1vbmxlbmd0aCwgY2hhbmdlcywgZGlmZlBvaW50ZXIsIHBvc2l0aW9uO1xuXHRcdGRpZmZzLnB1c2goIFsgRElGRl9FUVVBTCwgXCJcIiBdICk7IC8vIEFkZCBhIGR1bW15IGVudHJ5IGF0IHRoZSBlbmQuXG5cdFx0cG9pbnRlciA9IDA7XG5cdFx0Y291bnREZWxldGUgPSAwO1xuXHRcdGNvdW50SW5zZXJ0ID0gMDtcblx0XHR0ZXh0RGVsZXRlID0gXCJcIjtcblx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHRjb21tb25sZW5ndGg7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXHRcdFx0c3dpdGNoICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdICkge1xuXHRcdFx0Y2FzZSBESUZGX0lOU0VSVDpcblx0XHRcdFx0Y291bnRJbnNlcnQrKztcblx0XHRcdFx0dGV4dEluc2VydCArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfREVMRVRFOlxuXHRcdFx0XHRjb3VudERlbGV0ZSsrO1xuXHRcdFx0XHR0ZXh0RGVsZXRlICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9FUVVBTDpcblx0XHRcdFx0Ly8gVXBvbiByZWFjaGluZyBhbiBlcXVhbGl0eSwgY2hlY2sgZm9yIHByaW9yIHJlZHVuZGFuY2llcy5cblx0XHRcdFx0aWYgKCBjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0ID4gMSApIHtcblx0XHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlICE9PSAwICYmIGNvdW50SW5zZXJ0ICE9PSAwICkge1xuXHRcdFx0XHRcdFx0Ly8gRmFjdG9yIG91dCBhbnkgY29tbW9uIHByZWZpeGVzLlxuXHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoID0gdGhpcy5kaWZmQ29tbW9uUHJlZml4KCB0ZXh0SW5zZXJ0LCB0ZXh0RGVsZXRlICk7XG5cdFx0XHRcdFx0XHRpZiAoIGNvbW1vbmxlbmd0aCAhPT0gMCApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAoIHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0ICkgPiAwICYmXG5cdFx0XHRcdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQgLSAxIF1bIDAgXSA9PT1cblx0XHRcdFx0XHRcdFx0XHRcdERJRkZfRVFVQUwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0IC0gMSBdWyAxIF0gKz1cblx0XHRcdFx0XHRcdFx0XHRcdHRleHRJbnNlcnQuc3Vic3RyaW5nKCAwLCBjb21tb25sZW5ndGggKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIDAsIDAsIFsgRElGRl9FUVVBTCxcblx0XHRcdFx0XHRcdFx0XHRcdHRleHRJbnNlcnQuc3Vic3RyaW5nKCAwLCBjb21tb25sZW5ndGggKVxuXHRcdFx0XHRcdFx0XHRcdF0gKTtcblx0XHRcdFx0XHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dGV4dEluc2VydCA9IHRleHRJbnNlcnQuc3Vic3RyaW5nKCBjb21tb25sZW5ndGggKTtcblx0XHRcdFx0XHRcdFx0dGV4dERlbGV0ZSA9IHRleHREZWxldGUuc3Vic3RyaW5nKCBjb21tb25sZW5ndGggKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIEZhY3RvciBvdXQgYW55IGNvbW1vbiBzdWZmaXhpZXMuXG5cdFx0XHRcdFx0XHRjb21tb25sZW5ndGggPSB0aGlzLmRpZmZDb21tb25TdWZmaXgoIHRleHRJbnNlcnQsIHRleHREZWxldGUgKTtcblx0XHRcdFx0XHRcdGlmICggY29tbW9ubGVuZ3RoICE9PSAwICkge1xuXHRcdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0gPSB0ZXh0SW5zZXJ0LnN1YnN0cmluZyggdGV4dEluc2VydC5sZW5ndGggLVxuXHRcdFx0XHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoICkgKyBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdFx0XHRcdHRleHRJbnNlcnQgPSB0ZXh0SW5zZXJ0LnN1YnN0cmluZyggMCwgdGV4dEluc2VydC5sZW5ndGggLVxuXHRcdFx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0XHR0ZXh0RGVsZXRlID0gdGV4dERlbGV0ZS5zdWJzdHJpbmcoIDAsIHRleHREZWxldGUubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0XHRjb21tb25sZW5ndGggKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gRGVsZXRlIHRoZSBvZmZlbmRpbmcgcmVjb3JkcyBhbmQgYWRkIHRoZSBtZXJnZWQgb25lcy5cblx0XHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlID09PSAwICkge1xuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQsIFsgRElGRl9JTlNFUlQsIHRleHRJbnNlcnQgXSApO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIGNvdW50SW5zZXJ0ID09PSAwICkge1xuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gY291bnREZWxldGUsXG5cdFx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQsIFsgRElGRl9ERUxFVEUsIHRleHREZWxldGUgXSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRcdHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0LFxuXHRcdFx0XHRcdFx0XHRjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0LFxuXHRcdFx0XHRcdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0RGVsZXRlIF0sIFsgRElGRl9JTlNFUlQsIHRleHRJbnNlcnQgXVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cG9pbnRlciA9IHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0ICtcblx0XHRcdFx0XHRcdCggY291bnREZWxldGUgPyAxIDogMCApICsgKCBjb3VudEluc2VydCA/IDEgOiAwICkgKyAxO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBwb2ludGVyICE9PSAwICYmIGRpZmZzWyBwb2ludGVyIC0gMSBdWyAwIF0gPT09IERJRkZfRVFVQUwgKSB7XG5cblx0XHRcdFx0XHQvLyBNZXJnZSB0aGlzIGVxdWFsaXR5IHdpdGggdGhlIHByZXZpb3VzIG9uZS5cblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIsIDEgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnRJbnNlcnQgPSAwO1xuXHRcdFx0XHRjb3VudERlbGV0ZSA9IDA7XG5cdFx0XHRcdHRleHREZWxldGUgPSBcIlwiO1xuXHRcdFx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICggZGlmZnNbIGRpZmZzLmxlbmd0aCAtIDEgXVsgMSBdID09PSBcIlwiICkge1xuXHRcdFx0ZGlmZnMucG9wKCk7IC8vIFJlbW92ZSB0aGUgZHVtbXkgZW50cnkgYXQgdGhlIGVuZC5cblx0XHR9XG5cblx0XHQvLyBTZWNvbmQgcGFzczogbG9vayBmb3Igc2luZ2xlIGVkaXRzIHN1cnJvdW5kZWQgb24gYm90aCBzaWRlcyBieSBlcXVhbGl0aWVzXG5cdFx0Ly8gd2hpY2ggY2FuIGJlIHNoaWZ0ZWQgc2lkZXdheXMgdG8gZWxpbWluYXRlIGFuIGVxdWFsaXR5LlxuXHRcdC8vIGUuZzogQTxpbnM+QkE8L2lucz5DIC0+IDxpbnM+QUI8L2lucz5BQ1xuXHRcdGNoYW5nZXMgPSBmYWxzZTtcblx0XHRwb2ludGVyID0gMTtcblxuXHRcdC8vIEludGVudGlvbmFsbHkgaWdub3JlIHRoZSBmaXJzdCBhbmQgbGFzdCBlbGVtZW50IChkb24ndCBuZWVkIGNoZWNraW5nKS5cblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggLSAxICkge1xuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMCBdID09PSBESUZGX0VRVUFMICYmXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDAgXSA9PT0gRElGRl9FUVVBTCApIHtcblxuXHRcdFx0XHRkaWZmUG9pbnRlciA9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0cG9zaXRpb24gPSBkaWZmUG9pbnRlci5zdWJzdHJpbmcoXG5cdFx0XHRcdFx0ZGlmZlBvaW50ZXIubGVuZ3RoIC0gZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXS5sZW5ndGhcblx0XHRcdFx0KTtcblxuXHRcdFx0XHQvLyBUaGlzIGlzIGEgc2luZ2xlIGVkaXQgc3Vycm91bmRlZCBieSBlcXVhbGl0aWVzLlxuXHRcdFx0XHRpZiAoIHBvc2l0aW9uID09PSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICkge1xuXG5cdFx0XHRcdFx0Ly8gU2hpZnQgdGhlIGVkaXQgb3ZlciB0aGUgcHJldmlvdXMgZXF1YWxpdHkuXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdID0gZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSArXG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0uc3Vic3RyaW5nKCAwLCBkaWZmc1sgcG9pbnRlciBdWyAxIF0ubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXS5sZW5ndGggKTtcblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gKyBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdO1xuXHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciAtIDEsIDEgKTtcblx0XHRcdFx0XHRjaGFuZ2VzID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmICggZGlmZlBvaW50ZXIuc3Vic3RyaW5nKCAwLCBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdLmxlbmd0aCApID09PVxuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXSApIHtcblxuXHRcdFx0XHRcdC8vIFNoaWZ0IHRoZSBlZGl0IG92ZXIgdGhlIG5leHQgZXF1YWxpdHkuXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSArPSBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdO1xuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0uc3Vic3RyaW5nKCBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdLmxlbmd0aCApICtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF07XG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyICsgMSwgMSApO1xuXHRcdFx0XHRcdGNoYW5nZXMgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXHRcdC8vIElmIHNoaWZ0cyB3ZXJlIG1hZGUsIHRoZSBkaWZmIG5lZWRzIHJlb3JkZXJpbmcgYW5kIGFub3RoZXIgc2hpZnQgc3dlZXAuXG5cdFx0aWYgKCBjaGFuZ2VzICkge1xuXHRcdFx0dGhpcy5kaWZmQ2xlYW51cE1lcmdlKCBkaWZmcyApO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gZnVuY3Rpb24oIG8sIG4gKSB7XG5cdFx0dmFyIGRpZmYsIG91dHB1dCwgdGV4dDtcblx0XHRkaWZmID0gbmV3IERpZmZNYXRjaFBhdGNoKCk7XG5cdFx0b3V0cHV0ID0gZGlmZi5EaWZmTWFpbiggbywgbiApO1xuXHRcdGRpZmYuZGlmZkNsZWFudXBFZmZpY2llbmN5KCBvdXRwdXQgKTtcblx0XHR0ZXh0ID0gZGlmZi5kaWZmUHJldHR5SHRtbCggb3V0cHV0ICk7XG5cblx0XHRyZXR1cm4gdGV4dDtcblx0fTtcbn0oKSApO1xuXG4vLyBHZXQgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QsIGxpa2Ugd2luZG93IGluIGJyb3dzZXJzXG59KCAoZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzO1xufSkoKSApKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4vLyBEb24ndCBsb2FkIHRoZSBIVE1MIFJlcG9ydGVyIG9uIG5vbi1Ccm93c2VyIGVudmlyb25tZW50c1xuaWYgKCB0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiIHx8ICF3aW5kb3cuZG9jdW1lbnQgKSB7XG5cdHJldHVybjtcbn1cblxuLy8gRGVwcmVjYXRlZCBRVW5pdC5pbml0IC0gUmVmICM1MzBcbi8vIFJlLWluaXRpYWxpemUgdGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuUVVuaXQuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgdGVzdHMsIGJhbm5lciwgcmVzdWx0LCBxdW5pdCxcblx0XHRjb25maWcgPSBRVW5pdC5jb25maWc7XG5cblx0Y29uZmlnLnN0YXRzID0geyBhbGw6IDAsIGJhZDogMCB9O1xuXHRjb25maWcubW9kdWxlU3RhdHMgPSB7IGFsbDogMCwgYmFkOiAwIH07XG5cdGNvbmZpZy5zdGFydGVkID0gMDtcblx0Y29uZmlnLnVwZGF0ZVJhdGUgPSAxMDAwO1xuXHRjb25maWcuYmxvY2tpbmcgPSBmYWxzZTtcblx0Y29uZmlnLmF1dG9zdGFydCA9IHRydWU7XG5cdGNvbmZpZy5hdXRvcnVuID0gZmFsc2U7XG5cdGNvbmZpZy5maWx0ZXIgPSBcIlwiO1xuXHRjb25maWcucXVldWUgPSBbXTtcblxuXHQvLyBSZXR1cm4gb24gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRzXG5cdC8vIFRoaXMgaXMgbmVjZXNzYXJ5IHRvIG5vdCBicmVhayBvbiBub2RlIHRlc3RzXG5cdGlmICggdHlwZW9mIHdpbmRvdyA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRxdW5pdCA9IGlkKCBcInF1bml0XCIgKTtcblx0aWYgKCBxdW5pdCApIHtcblx0XHRxdW5pdC5pbm5lckhUTUwgPVxuXHRcdFx0XCI8aDEgaWQ9J3F1bml0LWhlYWRlcic+XCIgKyBlc2NhcGVUZXh0KCBkb2N1bWVudC50aXRsZSApICsgXCI8L2gxPlwiICtcblx0XHRcdFwiPGgyIGlkPSdxdW5pdC1iYW5uZXInPjwvaDI+XCIgK1xuXHRcdFx0XCI8ZGl2IGlkPSdxdW5pdC10ZXN0cnVubmVyLXRvb2xiYXInPjwvZGl2PlwiICtcblx0XHRcdFwiPGgyIGlkPSdxdW5pdC11c2VyQWdlbnQnPjwvaDI+XCIgK1xuXHRcdFx0XCI8b2wgaWQ9J3F1bml0LXRlc3RzJz48L29sPlwiO1xuXHR9XG5cblx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cdGJhbm5lciA9IGlkKCBcInF1bml0LWJhbm5lclwiICk7XG5cdHJlc3VsdCA9IGlkKCBcInF1bml0LXRlc3RyZXN1bHRcIiApO1xuXG5cdGlmICggdGVzdHMgKSB7XG5cdFx0dGVzdHMuaW5uZXJIVE1MID0gXCJcIjtcblx0fVxuXG5cdGlmICggYmFubmVyICkge1xuXHRcdGJhbm5lci5jbGFzc05hbWUgPSBcIlwiO1xuXHR9XG5cblx0aWYgKCByZXN1bHQgKSB7XG5cdFx0cmVzdWx0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoIHJlc3VsdCApO1xuXHR9XG5cblx0aWYgKCB0ZXN0cyApIHtcblx0XHRyZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInBcIiApO1xuXHRcdHJlc3VsdC5pZCA9IFwicXVuaXQtdGVzdHJlc3VsdFwiO1xuXHRcdHJlc3VsdC5jbGFzc05hbWUgPSBcInJlc3VsdFwiO1xuXHRcdHRlc3RzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKCByZXN1bHQsIHRlc3RzICk7XG5cdFx0cmVzdWx0LmlubmVySFRNTCA9IFwiUnVubmluZy4uLjxiciAvPiYjMTYwO1wiO1xuXHR9XG59O1xuXG52YXIgY29uZmlnID0gUVVuaXQuY29uZmlnLFxuXHRjb2xsYXBzZU5leHQgPSBmYWxzZSxcblx0aGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0ZGVmaW5lZCA9IHtcblx0XHRkb2N1bWVudDogd2luZG93LmRvY3VtZW50ICE9PSB1bmRlZmluZWQsXG5cdFx0c2Vzc2lvblN0b3JhZ2U6IChmdW5jdGlvbigpIHtcblx0XHRcdHZhciB4ID0gXCJxdW5pdC10ZXN0LXN0cmluZ1wiO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSggeCwgeCApO1xuXHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCB4ICk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9KCkpXG5cdH0sXG5cdG1vZHVsZXNMaXN0ID0gW107XG5cbi8qKlxuKiBFc2NhcGUgdGV4dCBmb3IgYXR0cmlidXRlIG9yIHRleHQgY29udGVudC5cbiovXG5mdW5jdGlvbiBlc2NhcGVUZXh0KCBzICkge1xuXHRpZiAoICFzICkge1xuXHRcdHJldHVybiBcIlwiO1xuXHR9XG5cdHMgPSBzICsgXCJcIjtcblxuXHQvLyBCb3RoIHNpbmdsZSBxdW90ZXMgYW5kIGRvdWJsZSBxdW90ZXMgKGZvciBhdHRyaWJ1dGVzKVxuXHRyZXR1cm4gcy5yZXBsYWNlKCAvWydcIjw+Jl0vZywgZnVuY3Rpb24oIHMgKSB7XG5cdFx0c3dpdGNoICggcyApIHtcblx0XHRjYXNlIFwiJ1wiOlxuXHRcdFx0cmV0dXJuIFwiJiMwMzk7XCI7XG5cdFx0Y2FzZSBcIlxcXCJcIjpcblx0XHRcdHJldHVybiBcIiZxdW90O1wiO1xuXHRcdGNhc2UgXCI8XCI6XG5cdFx0XHRyZXR1cm4gXCImbHQ7XCI7XG5cdFx0Y2FzZSBcIj5cIjpcblx0XHRcdHJldHVybiBcIiZndDtcIjtcblx0XHRjYXNlIFwiJlwiOlxuXHRcdFx0cmV0dXJuIFwiJmFtcDtcIjtcblx0XHR9XG5cdH0pO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICovXG5mdW5jdGlvbiBhZGRFdmVudCggZWxlbSwgdHlwZSwgZm4gKSB7XG5cdGlmICggZWxlbS5hZGRFdmVudExpc3RlbmVyICkge1xuXG5cdFx0Ly8gU3RhbmRhcmRzLWJhc2VkIGJyb3dzZXJzXG5cdFx0ZWxlbS5hZGRFdmVudExpc3RlbmVyKCB0eXBlLCBmbiwgZmFsc2UgKTtcblx0fSBlbHNlIGlmICggZWxlbS5hdHRhY2hFdmVudCApIHtcblxuXHRcdC8vIHN1cHBvcnQ6IElFIDw5XG5cdFx0ZWxlbS5hdHRhY2hFdmVudCggXCJvblwiICsgdHlwZSwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSB3aW5kb3cuZXZlbnQ7XG5cdFx0XHRpZiAoICFldmVudC50YXJnZXQgKSB7XG5cdFx0XHRcdGV2ZW50LnRhcmdldCA9IGV2ZW50LnNyY0VsZW1lbnQgfHwgZG9jdW1lbnQ7XG5cdFx0XHR9XG5cblx0XHRcdGZuLmNhbGwoIGVsZW0sIGV2ZW50ICk7XG5cdFx0fSk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5fE5vZGVMaXN0fSBlbGVtc1xuICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cbmZ1bmN0aW9uIGFkZEV2ZW50cyggZWxlbXMsIHR5cGUsIGZuICkge1xuXHR2YXIgaSA9IGVsZW1zLmxlbmd0aDtcblx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0YWRkRXZlbnQoIGVsZW1zWyBpIF0sIHR5cGUsIGZuICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFzQ2xhc3MoIGVsZW0sIG5hbWUgKSB7XG5cdHJldHVybiAoIFwiIFwiICsgZWxlbS5jbGFzc05hbWUgKyBcIiBcIiApLmluZGV4T2YoIFwiIFwiICsgbmFtZSArIFwiIFwiICkgPj0gMDtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MoIGVsZW0sIG5hbWUgKSB7XG5cdGlmICggIWhhc0NsYXNzKCBlbGVtLCBuYW1lICkgKSB7XG5cdFx0ZWxlbS5jbGFzc05hbWUgKz0gKCBlbGVtLmNsYXNzTmFtZSA/IFwiIFwiIDogXCJcIiApICsgbmFtZTtcblx0fVxufVxuXG5mdW5jdGlvbiB0b2dnbGVDbGFzcyggZWxlbSwgbmFtZSApIHtcblx0aWYgKCBoYXNDbGFzcyggZWxlbSwgbmFtZSApICkge1xuXHRcdHJlbW92ZUNsYXNzKCBlbGVtLCBuYW1lICk7XG5cdH0gZWxzZSB7XG5cdFx0YWRkQ2xhc3MoIGVsZW0sIG5hbWUgKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyggZWxlbSwgbmFtZSApIHtcblx0dmFyIHNldCA9IFwiIFwiICsgZWxlbS5jbGFzc05hbWUgKyBcIiBcIjtcblxuXHQvLyBDbGFzcyBuYW1lIG1heSBhcHBlYXIgbXVsdGlwbGUgdGltZXNcblx0d2hpbGUgKCBzZXQuaW5kZXhPZiggXCIgXCIgKyBuYW1lICsgXCIgXCIgKSA+PSAwICkge1xuXHRcdHNldCA9IHNldC5yZXBsYWNlKCBcIiBcIiArIG5hbWUgKyBcIiBcIiwgXCIgXCIgKTtcblx0fVxuXG5cdC8vIHRyaW0gZm9yIHByZXR0aW5lc3Ncblx0ZWxlbS5jbGFzc05hbWUgPSB0eXBlb2Ygc2V0LnRyaW0gPT09IFwiZnVuY3Rpb25cIiA/IHNldC50cmltKCkgOiBzZXQucmVwbGFjZSggL15cXHMrfFxccyskL2csIFwiXCIgKTtcbn1cblxuZnVuY3Rpb24gaWQoIG5hbWUgKSB7XG5cdHJldHVybiBkZWZpbmVkLmRvY3VtZW50ICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBuYW1lICk7XG59XG5cbmZ1bmN0aW9uIGdldFVybENvbmZpZ0h0bWwoKSB7XG5cdHZhciBpLCBqLCB2YWwsXG5cdFx0ZXNjYXBlZCwgZXNjYXBlZFRvb2x0aXAsXG5cdFx0c2VsZWN0aW9uID0gZmFsc2UsXG5cdFx0bGVuID0gY29uZmlnLnVybENvbmZpZy5sZW5ndGgsXG5cdFx0dXJsQ29uZmlnSHRtbCA9IFwiXCI7XG5cblx0Zm9yICggaSA9IDA7IGkgPCBsZW47IGkrKyApIHtcblx0XHR2YWwgPSBjb25maWcudXJsQ29uZmlnWyBpIF07XG5cdFx0aWYgKCB0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0dmFsID0ge1xuXHRcdFx0XHRpZDogdmFsLFxuXHRcdFx0XHRsYWJlbDogdmFsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGVzY2FwZWQgPSBlc2NhcGVUZXh0KCB2YWwuaWQgKTtcblx0XHRlc2NhcGVkVG9vbHRpcCA9IGVzY2FwZVRleHQoIHZhbC50b29sdGlwICk7XG5cblx0XHRpZiAoIGNvbmZpZ1sgdmFsLmlkIF0gPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdGNvbmZpZ1sgdmFsLmlkIF0gPSBRVW5pdC51cmxQYXJhbXNbIHZhbC5pZCBdO1xuXHRcdH1cblxuXHRcdGlmICggIXZhbC52YWx1ZSB8fCB0eXBlb2YgdmFsLnZhbHVlID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxpbnB1dCBpZD0ncXVuaXQtdXJsY29uZmlnLVwiICsgZXNjYXBlZCArXG5cdFx0XHRcdFwiJyBuYW1lPSdcIiArIGVzY2FwZWQgKyBcIicgdHlwZT0nY2hlY2tib3gnXCIgK1xuXHRcdFx0XHQoIHZhbC52YWx1ZSA/IFwiIHZhbHVlPSdcIiArIGVzY2FwZVRleHQoIHZhbC52YWx1ZSApICsgXCInXCIgOiBcIlwiICkgK1xuXHRcdFx0XHQoIGNvbmZpZ1sgdmFsLmlkIF0gPyBcIiBjaGVja2VkPSdjaGVja2VkJ1wiIDogXCJcIiApICtcblx0XHRcdFx0XCIgdGl0bGU9J1wiICsgZXNjYXBlZFRvb2x0aXAgKyBcIicgLz48bGFiZWwgZm9yPSdxdW5pdC11cmxjb25maWctXCIgKyBlc2NhcGVkICtcblx0XHRcdFx0XCInIHRpdGxlPSdcIiArIGVzY2FwZWRUb29sdGlwICsgXCInPlwiICsgdmFsLmxhYmVsICsgXCI8L2xhYmVsPlwiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPGxhYmVsIGZvcj0ncXVuaXQtdXJsY29uZmlnLVwiICsgZXNjYXBlZCArXG5cdFx0XHRcdFwiJyB0aXRsZT0nXCIgKyBlc2NhcGVkVG9vbHRpcCArIFwiJz5cIiArIHZhbC5sYWJlbCArXG5cdFx0XHRcdFwiOiA8L2xhYmVsPjxzZWxlY3QgaWQ9J3F1bml0LXVybGNvbmZpZy1cIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcIicgbmFtZT0nXCIgKyBlc2NhcGVkICsgXCInIHRpdGxlPSdcIiArIGVzY2FwZWRUb29sdGlwICsgXCInPjxvcHRpb24+PC9vcHRpb24+XCI7XG5cblx0XHRcdGlmICggUVVuaXQuaXMoIFwiYXJyYXlcIiwgdmFsLnZhbHVlICkgKSB7XG5cdFx0XHRcdGZvciAoIGogPSAwOyBqIDwgdmFsLnZhbHVlLmxlbmd0aDsgaisrICkge1xuXHRcdFx0XHRcdGVzY2FwZWQgPSBlc2NhcGVUZXh0KCB2YWwudmFsdWVbIGogXSApO1xuXHRcdFx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArIGVzY2FwZWQgKyBcIidcIiArXG5cdFx0XHRcdFx0XHQoIGNvbmZpZ1sgdmFsLmlkIF0gPT09IHZhbC52YWx1ZVsgaiBdID9cblx0XHRcdFx0XHRcdFx0KCBzZWxlY3Rpb24gPSB0cnVlICkgJiYgXCIgc2VsZWN0ZWQ9J3NlbGVjdGVkJ1wiIDogXCJcIiApICtcblx0XHRcdFx0XHRcdFwiPlwiICsgZXNjYXBlZCArIFwiPC9vcHRpb24+XCI7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoIGogaW4gdmFsLnZhbHVlICkge1xuXHRcdFx0XHRcdGlmICggaGFzT3duLmNhbGwoIHZhbC52YWx1ZSwgaiApICkge1xuXHRcdFx0XHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxvcHRpb24gdmFsdWU9J1wiICsgZXNjYXBlVGV4dCggaiApICsgXCInXCIgK1xuXHRcdFx0XHRcdFx0XHQoIGNvbmZpZ1sgdmFsLmlkIF0gPT09IGogP1xuXHRcdFx0XHRcdFx0XHRcdCggc2VsZWN0aW9uID0gdHJ1ZSApICYmIFwiIHNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcdFx0XHRcdFwiPlwiICsgZXNjYXBlVGV4dCggdmFsLnZhbHVlWyBqIF0gKSArIFwiPC9vcHRpb24+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGNvbmZpZ1sgdmFsLmlkIF0gJiYgIXNlbGVjdGlvbiApIHtcblx0XHRcdFx0ZXNjYXBlZCA9IGVzY2FwZVRleHQoIGNvbmZpZ1sgdmFsLmlkIF0gKTtcblx0XHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxvcHRpb24gdmFsdWU9J1wiICsgZXNjYXBlZCArXG5cdFx0XHRcdFx0XCInIHNlbGVjdGVkPSdzZWxlY3RlZCcgZGlzYWJsZWQ9J2Rpc2FibGVkJz5cIiArIGVzY2FwZWQgKyBcIjwvb3B0aW9uPlwiO1xuXHRcdFx0fVxuXHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjwvc2VsZWN0PlwiO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB1cmxDb25maWdIdG1sO1xufVxuXG4vLyBIYW5kbGUgXCJjbGlja1wiIGV2ZW50cyBvbiB0b29sYmFyIGNoZWNrYm94ZXMgYW5kIFwiY2hhbmdlXCIgZm9yIHNlbGVjdCBtZW51cy5cbi8vIFVwZGF0ZXMgdGhlIFVSTCB3aXRoIHRoZSBuZXcgc3RhdGUgb2YgYGNvbmZpZy51cmxDb25maWdgIHZhbHVlcy5cbmZ1bmN0aW9uIHRvb2xiYXJDaGFuZ2VkKCkge1xuXHR2YXIgdXBkYXRlZFVybCwgdmFsdWUsXG5cdFx0ZmllbGQgPSB0aGlzLFxuXHRcdHBhcmFtcyA9IHt9O1xuXG5cdC8vIERldGVjdCBpZiBmaWVsZCBpcyBhIHNlbGVjdCBtZW51IG9yIGEgY2hlY2tib3hcblx0aWYgKCBcInNlbGVjdGVkSW5kZXhcIiBpbiBmaWVsZCApIHtcblx0XHR2YWx1ZSA9IGZpZWxkLm9wdGlvbnNbIGZpZWxkLnNlbGVjdGVkSW5kZXggXS52YWx1ZSB8fCB1bmRlZmluZWQ7XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSBmaWVsZC5jaGVja2VkID8gKCBmaWVsZC5kZWZhdWx0VmFsdWUgfHwgdHJ1ZSApIDogdW5kZWZpbmVkO1xuXHR9XG5cblx0cGFyYW1zWyBmaWVsZC5uYW1lIF0gPSB2YWx1ZTtcblx0dXBkYXRlZFVybCA9IHNldFVybCggcGFyYW1zICk7XG5cblx0aWYgKCBcImhpZGVwYXNzZWRcIiA9PT0gZmllbGQubmFtZSAmJiBcInJlcGxhY2VTdGF0ZVwiIGluIHdpbmRvdy5oaXN0b3J5ICkge1xuXHRcdGNvbmZpZ1sgZmllbGQubmFtZSBdID0gdmFsdWUgfHwgZmFsc2U7XG5cdFx0aWYgKCB2YWx1ZSApIHtcblx0XHRcdGFkZENsYXNzKCBpZCggXCJxdW5pdC10ZXN0c1wiICksIFwiaGlkZXBhc3NcIiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZW1vdmVDbGFzcyggaWQoIFwicXVuaXQtdGVzdHNcIiApLCBcImhpZGVwYXNzXCIgKTtcblx0XHR9XG5cblx0XHQvLyBJdCBpcyBub3QgbmVjZXNzYXJ5IHRvIHJlZnJlc2ggdGhlIHdob2xlIHBhZ2Vcblx0XHR3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoIG51bGwsIFwiXCIsIHVwZGF0ZWRVcmwgKTtcblx0fSBlbHNlIHtcblx0XHR3aW5kb3cubG9jYXRpb24gPSB1cGRhdGVkVXJsO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldFVybCggcGFyYW1zICkge1xuXHR2YXIga2V5LFxuXHRcdHF1ZXJ5c3RyaW5nID0gXCI/XCI7XG5cblx0cGFyYW1zID0gUVVuaXQuZXh0ZW5kKCBRVW5pdC5leHRlbmQoIHt9LCBRVW5pdC51cmxQYXJhbXMgKSwgcGFyYW1zICk7XG5cblx0Zm9yICgga2V5IGluIHBhcmFtcyApIHtcblx0XHRpZiAoIGhhc093bi5jYWxsKCBwYXJhbXMsIGtleSApICkge1xuXHRcdFx0aWYgKCBwYXJhbXNbIGtleSBdID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0cXVlcnlzdHJpbmcgKz0gZW5jb2RlVVJJQ29tcG9uZW50KCBrZXkgKTtcblx0XHRcdGlmICggcGFyYW1zWyBrZXkgXSAhPT0gdHJ1ZSApIHtcblx0XHRcdFx0cXVlcnlzdHJpbmcgKz0gXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoIHBhcmFtc1sga2V5IF0gKTtcblx0XHRcdH1cblx0XHRcdHF1ZXJ5c3RyaW5nICs9IFwiJlwiO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0ICtcblx0XHRsb2NhdGlvbi5wYXRobmFtZSArIHF1ZXJ5c3RyaW5nLnNsaWNlKCAwLCAtMSApO1xufVxuXG5mdW5jdGlvbiBhcHBseVVybFBhcmFtcygpIHtcblx0dmFyIHNlbGVjdGVkTW9kdWxlLFxuXHRcdG1vZHVsZXNMaXN0ID0gaWQoIFwicXVuaXQtbW9kdWxlZmlsdGVyXCIgKSxcblx0XHRmaWx0ZXIgPSBpZCggXCJxdW5pdC1maWx0ZXItaW5wdXRcIiApLnZhbHVlO1xuXG5cdHNlbGVjdGVkTW9kdWxlID0gbW9kdWxlc0xpc3QgP1xuXHRcdGRlY29kZVVSSUNvbXBvbmVudCggbW9kdWxlc0xpc3Qub3B0aW9uc1sgbW9kdWxlc0xpc3Quc2VsZWN0ZWRJbmRleCBdLnZhbHVlICkgOlxuXHRcdHVuZGVmaW5lZDtcblxuXHR3aW5kb3cubG9jYXRpb24gPSBzZXRVcmwoe1xuXHRcdG1vZHVsZTogKCBzZWxlY3RlZE1vZHVsZSA9PT0gXCJcIiApID8gdW5kZWZpbmVkIDogc2VsZWN0ZWRNb2R1bGUsXG5cdFx0ZmlsdGVyOiAoIGZpbHRlciA9PT0gXCJcIiApID8gdW5kZWZpbmVkIDogZmlsdGVyLFxuXG5cdFx0Ly8gUmVtb3ZlIHRlc3RJZCBmaWx0ZXJcblx0XHR0ZXN0SWQ6IHVuZGVmaW5lZFxuXHR9KTtcbn1cblxuZnVuY3Rpb24gdG9vbGJhclVybENvbmZpZ0NvbnRhaW5lcigpIHtcblx0dmFyIHVybENvbmZpZ0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwic3BhblwiICk7XG5cblx0dXJsQ29uZmlnQ29udGFpbmVyLmlubmVySFRNTCA9IGdldFVybENvbmZpZ0h0bWwoKTtcblx0YWRkQ2xhc3MoIHVybENvbmZpZ0NvbnRhaW5lciwgXCJxdW5pdC11cmwtY29uZmlnXCIgKTtcblxuXHQvLyBGb3Igb2xkSUUgc3VwcG9ydDpcblx0Ly8gKiBBZGQgaGFuZGxlcnMgdG8gdGhlIGluZGl2aWR1YWwgZWxlbWVudHMgaW5zdGVhZCBvZiB0aGUgY29udGFpbmVyXG5cdC8vICogVXNlIFwiY2xpY2tcIiBpbnN0ZWFkIG9mIFwiY2hhbmdlXCIgZm9yIGNoZWNrYm94ZXNcblx0YWRkRXZlbnRzKCB1cmxDb25maWdDb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwiaW5wdXRcIiApLCBcImNsaWNrXCIsIHRvb2xiYXJDaGFuZ2VkICk7XG5cdGFkZEV2ZW50cyggdXJsQ29uZmlnQ29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcInNlbGVjdFwiICksIFwiY2hhbmdlXCIsIHRvb2xiYXJDaGFuZ2VkICk7XG5cblx0cmV0dXJuIHVybENvbmZpZ0NvbnRhaW5lcjtcbn1cblxuZnVuY3Rpb24gdG9vbGJhckxvb3NlRmlsdGVyKCkge1xuXHR2YXIgZmlsdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJmb3JtXCIgKSxcblx0XHRsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwibGFiZWxcIiApLFxuXHRcdGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJpbnB1dFwiICksXG5cdFx0YnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJidXR0b25cIiApO1xuXG5cdGFkZENsYXNzKCBmaWx0ZXIsIFwicXVuaXQtZmlsdGVyXCIgKTtcblxuXHRsYWJlbC5pbm5lckhUTUwgPSBcIkZpbHRlcjogXCI7XG5cblx0aW5wdXQudHlwZSA9IFwidGV4dFwiO1xuXHRpbnB1dC52YWx1ZSA9IGNvbmZpZy5maWx0ZXIgfHwgXCJcIjtcblx0aW5wdXQubmFtZSA9IFwiZmlsdGVyXCI7XG5cdGlucHV0LmlkID0gXCJxdW5pdC1maWx0ZXItaW5wdXRcIjtcblxuXHRidXR0b24uaW5uZXJIVE1MID0gXCJHb1wiO1xuXG5cdGxhYmVsLmFwcGVuZENoaWxkKCBpbnB1dCApO1xuXG5cdGZpbHRlci5hcHBlbmRDaGlsZCggbGFiZWwgKTtcblx0ZmlsdGVyLmFwcGVuZENoaWxkKCBidXR0b24gKTtcblx0YWRkRXZlbnQoIGZpbHRlciwgXCJzdWJtaXRcIiwgZnVuY3Rpb24oIGV2ICkge1xuXHRcdGFwcGx5VXJsUGFyYW1zKCk7XG5cblx0XHRpZiAoIGV2ICYmIGV2LnByZXZlbnREZWZhdWx0ICkge1xuXHRcdFx0ZXYucHJldmVudERlZmF1bHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0pO1xuXG5cdHJldHVybiBmaWx0ZXI7XG59XG5cbmZ1bmN0aW9uIHRvb2xiYXJNb2R1bGVGaWx0ZXJIdG1sKCkge1xuXHR2YXIgaSxcblx0XHRtb2R1bGVGaWx0ZXJIdG1sID0gXCJcIjtcblxuXHRpZiAoICFtb2R1bGVzTGlzdC5sZW5ndGggKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0bW9kdWxlc0xpc3Quc29ydChmdW5jdGlvbiggYSwgYiApIHtcblx0XHRyZXR1cm4gYS5sb2NhbGVDb21wYXJlKCBiICk7XG5cdH0pO1xuXG5cdG1vZHVsZUZpbHRlckh0bWwgKz0gXCI8bGFiZWwgZm9yPSdxdW5pdC1tb2R1bGVmaWx0ZXInPk1vZHVsZTogPC9sYWJlbD5cIiArXG5cdFx0XCI8c2VsZWN0IGlkPSdxdW5pdC1tb2R1bGVmaWx0ZXInIG5hbWU9J21vZHVsZWZpbHRlcic+PG9wdGlvbiB2YWx1ZT0nJyBcIiArXG5cdFx0KCBRVW5pdC51cmxQYXJhbXMubW9kdWxlID09PSB1bmRlZmluZWQgPyBcInNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XCI+PCBBbGwgTW9kdWxlcyA+PC9vcHRpb24+XCI7XG5cblx0Zm9yICggaSA9IDA7IGkgPCBtb2R1bGVzTGlzdC5sZW5ndGg7IGkrKyApIHtcblx0XHRtb2R1bGVGaWx0ZXJIdG1sICs9IFwiPG9wdGlvbiB2YWx1ZT0nXCIgK1xuXHRcdFx0ZXNjYXBlVGV4dCggZW5jb2RlVVJJQ29tcG9uZW50KCBtb2R1bGVzTGlzdFsgaSBdICkgKSArIFwiJyBcIiArXG5cdFx0XHQoIFFVbml0LnVybFBhcmFtcy5tb2R1bGUgPT09IG1vZHVsZXNMaXN0WyBpIF0gPyBcInNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcIj5cIiArIGVzY2FwZVRleHQoIG1vZHVsZXNMaXN0WyBpIF0gKSArIFwiPC9vcHRpb24+XCI7XG5cdH1cblx0bW9kdWxlRmlsdGVySHRtbCArPSBcIjwvc2VsZWN0PlwiO1xuXG5cdHJldHVybiBtb2R1bGVGaWx0ZXJIdG1sO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyTW9kdWxlRmlsdGVyKCkge1xuXHR2YXIgdG9vbGJhciA9IGlkKCBcInF1bml0LXRlc3RydW5uZXItdG9vbGJhclwiICksXG5cdFx0bW9kdWxlRmlsdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJzcGFuXCIgKSxcblx0XHRtb2R1bGVGaWx0ZXJIdG1sID0gdG9vbGJhck1vZHVsZUZpbHRlckh0bWwoKTtcblxuXHRpZiAoICF0b29sYmFyIHx8ICFtb2R1bGVGaWx0ZXJIdG1sICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdG1vZHVsZUZpbHRlci5zZXRBdHRyaWJ1dGUoIFwiaWRcIiwgXCJxdW5pdC1tb2R1bGVmaWx0ZXItY29udGFpbmVyXCIgKTtcblx0bW9kdWxlRmlsdGVyLmlubmVySFRNTCA9IG1vZHVsZUZpbHRlckh0bWw7XG5cblx0YWRkRXZlbnQoIG1vZHVsZUZpbHRlci5sYXN0Q2hpbGQsIFwiY2hhbmdlXCIsIGFwcGx5VXJsUGFyYW1zICk7XG5cblx0dG9vbGJhci5hcHBlbmRDaGlsZCggbW9kdWxlRmlsdGVyICk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRvb2xiYXIoKSB7XG5cdHZhciB0b29sYmFyID0gaWQoIFwicXVuaXQtdGVzdHJ1bm5lci10b29sYmFyXCIgKTtcblxuXHRpZiAoIHRvb2xiYXIgKSB7XG5cdFx0dG9vbGJhci5hcHBlbmRDaGlsZCggdG9vbGJhclVybENvbmZpZ0NvbnRhaW5lcigpICk7XG5cdFx0dG9vbGJhci5hcHBlbmRDaGlsZCggdG9vbGJhckxvb3NlRmlsdGVyKCkgKTtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRIZWFkZXIoKSB7XG5cdHZhciBoZWFkZXIgPSBpZCggXCJxdW5pdC1oZWFkZXJcIiApO1xuXG5cdGlmICggaGVhZGVyICkge1xuXHRcdGhlYWRlci5pbm5lckhUTUwgPSBcIjxhIGhyZWY9J1wiICtcblx0XHRcdHNldFVybCh7IGZpbHRlcjogdW5kZWZpbmVkLCBtb2R1bGU6IHVuZGVmaW5lZCwgdGVzdElkOiB1bmRlZmluZWQgfSkgK1xuXHRcdFx0XCInPlwiICsgaGVhZGVyLmlubmVySFRNTCArIFwiPC9hPiBcIjtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRCYW5uZXIoKSB7XG5cdHZhciBiYW5uZXIgPSBpZCggXCJxdW5pdC1iYW5uZXJcIiApO1xuXG5cdGlmICggYmFubmVyICkge1xuXHRcdGJhbm5lci5jbGFzc05hbWUgPSBcIlwiO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRlc3RSZXN1bHRzKCkge1xuXHR2YXIgdGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICksXG5cdFx0cmVzdWx0ID0gaWQoIFwicXVuaXQtdGVzdHJlc3VsdFwiICk7XG5cblx0aWYgKCByZXN1bHQgKSB7XG5cdFx0cmVzdWx0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoIHJlc3VsdCApO1xuXHR9XG5cblx0aWYgKCB0ZXN0cyApIHtcblx0XHR0ZXN0cy5pbm5lckhUTUwgPSBcIlwiO1xuXHRcdHJlc3VsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwicFwiICk7XG5cdFx0cmVzdWx0LmlkID0gXCJxdW5pdC10ZXN0cmVzdWx0XCI7XG5cdFx0cmVzdWx0LmNsYXNzTmFtZSA9IFwicmVzdWx0XCI7XG5cdFx0dGVzdHMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoIHJlc3VsdCwgdGVzdHMgKTtcblx0XHRyZXN1bHQuaW5uZXJIVE1MID0gXCJSdW5uaW5nLi4uPGJyIC8+JiMxNjA7XCI7XG5cdH1cbn1cblxuZnVuY3Rpb24gc3RvcmVGaXh0dXJlKCkge1xuXHR2YXIgZml4dHVyZSA9IGlkKCBcInF1bml0LWZpeHR1cmVcIiApO1xuXHRpZiAoIGZpeHR1cmUgKSB7XG5cdFx0Y29uZmlnLmZpeHR1cmUgPSBmaXh0dXJlLmlubmVySFRNTDtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRGaWx0ZXJlZFRlc3QoKSB7XG5cdHZhciB0ZXN0SWQgPSBRVW5pdC5jb25maWcudGVzdElkO1xuXHRpZiAoICF0ZXN0SWQgfHwgdGVzdElkLmxlbmd0aCA8PSAwICkge1xuXHRcdHJldHVybiBcIlwiO1xuXHR9XG5cdHJldHVybiBcIjxkaXYgaWQ9J3F1bml0LWZpbHRlcmVkVGVzdCc+UmVydW5uaW5nIHNlbGVjdGVkIHRlc3RzOiBcIiArIHRlc3RJZC5qb2luKFwiLCBcIikgK1xuXHRcdFwiIDxhIGlkPSdxdW5pdC1jbGVhckZpbHRlcicgaHJlZj0nXCIgK1xuXHRcdHNldFVybCh7IGZpbHRlcjogdW5kZWZpbmVkLCBtb2R1bGU6IHVuZGVmaW5lZCwgdGVzdElkOiB1bmRlZmluZWQgfSkgK1xuXHRcdFwiJz5cIiArIFwiUnVuIGFsbCB0ZXN0c1wiICsgXCI8L2E+PC9kaXY+XCI7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFVzZXJBZ2VudCgpIHtcblx0dmFyIHVzZXJBZ2VudCA9IGlkKCBcInF1bml0LXVzZXJBZ2VudFwiICk7XG5cblx0aWYgKCB1c2VyQWdlbnQgKSB7XG5cdFx0dXNlckFnZW50LmlubmVySFRNTCA9IFwiXCI7XG5cdFx0dXNlckFnZW50LmFwcGVuZENoaWxkKFxuXHRcdFx0ZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXG5cdFx0XHRcdFwiUVVuaXQgXCIgKyBRVW5pdC52ZXJzaW9uICsgXCI7IFwiICsgbmF2aWdhdG9yLnVzZXJBZ2VudFxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kVGVzdHNMaXN0KCBtb2R1bGVzICkge1xuXHR2YXIgaSwgbCwgeCwgeiwgdGVzdCwgbW9kdWxlT2JqO1xuXG5cdGZvciAoIGkgPSAwLCBsID0gbW9kdWxlcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0bW9kdWxlT2JqID0gbW9kdWxlc1sgaSBdO1xuXG5cdFx0aWYgKCBtb2R1bGVPYmoubmFtZSApIHtcblx0XHRcdG1vZHVsZXNMaXN0LnB1c2goIG1vZHVsZU9iai5uYW1lICk7XG5cdFx0fVxuXG5cdFx0Zm9yICggeCA9IDAsIHogPSBtb2R1bGVPYmoudGVzdHMubGVuZ3RoOyB4IDwgejsgeCsrICkge1xuXHRcdFx0dGVzdCA9IG1vZHVsZU9iai50ZXN0c1sgeCBdO1xuXG5cdFx0XHRhcHBlbmRUZXN0KCB0ZXN0Lm5hbWUsIHRlc3QudGVzdElkLCBtb2R1bGVPYmoubmFtZSApO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRUZXN0KCBuYW1lLCB0ZXN0SWQsIG1vZHVsZU5hbWUgKSB7XG5cdHZhciB0aXRsZSwgcmVydW5UcmlnZ2VyLCB0ZXN0QmxvY2ssIGFzc2VydExpc3QsXG5cdFx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cblx0aWYgKCAhdGVzdHMgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInN0cm9uZ1wiICk7XG5cdHRpdGxlLmlubmVySFRNTCA9IGdldE5hbWVIdG1sKCBuYW1lLCBtb2R1bGVOYW1lICk7XG5cblx0cmVydW5UcmlnZ2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJhXCIgKTtcblx0cmVydW5UcmlnZ2VyLmlubmVySFRNTCA9IFwiUmVydW5cIjtcblx0cmVydW5UcmlnZ2VyLmhyZWYgPSBzZXRVcmwoeyB0ZXN0SWQ6IHRlc3RJZCB9KTtcblxuXHR0ZXN0QmxvY2sgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImxpXCIgKTtcblx0dGVzdEJsb2NrLmFwcGVuZENoaWxkKCB0aXRsZSApO1xuXHR0ZXN0QmxvY2suYXBwZW5kQ2hpbGQoIHJlcnVuVHJpZ2dlciApO1xuXHR0ZXN0QmxvY2suaWQgPSBcInF1bml0LXRlc3Qtb3V0cHV0LVwiICsgdGVzdElkO1xuXG5cdGFzc2VydExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcIm9sXCIgKTtcblx0YXNzZXJ0TGlzdC5jbGFzc05hbWUgPSBcInF1bml0LWFzc2VydC1saXN0XCI7XG5cblx0dGVzdEJsb2NrLmFwcGVuZENoaWxkKCBhc3NlcnRMaXN0ICk7XG5cblx0dGVzdHMuYXBwZW5kQ2hpbGQoIHRlc3RCbG9jayApO1xufVxuXG4vLyBIVE1MIFJlcG9ydGVyIGluaXRpYWxpemF0aW9uIGFuZCBsb2FkXG5RVW5pdC5iZWdpbihmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIHF1bml0ID0gaWQoIFwicXVuaXRcIiApO1xuXG5cdC8vIEZpeHR1cmUgaXMgdGhlIG9ubHkgb25lIG5lY2Vzc2FyeSB0byBydW4gd2l0aG91dCB0aGUgI3F1bml0IGVsZW1lbnRcblx0c3RvcmVGaXh0dXJlKCk7XG5cblx0aWYgKCBxdW5pdCApIHtcblx0XHRxdW5pdC5pbm5lckhUTUwgPVxuXHRcdFx0XCI8aDEgaWQ9J3F1bml0LWhlYWRlcic+XCIgKyBlc2NhcGVUZXh0KCBkb2N1bWVudC50aXRsZSApICsgXCI8L2gxPlwiICtcblx0XHRcdFwiPGgyIGlkPSdxdW5pdC1iYW5uZXInPjwvaDI+XCIgK1xuXHRcdFx0XCI8ZGl2IGlkPSdxdW5pdC10ZXN0cnVubmVyLXRvb2xiYXInPjwvZGl2PlwiICtcblx0XHRcdGFwcGVuZEZpbHRlcmVkVGVzdCgpICtcblx0XHRcdFwiPGgyIGlkPSdxdW5pdC11c2VyQWdlbnQnPjwvaDI+XCIgK1xuXHRcdFx0XCI8b2wgaWQ9J3F1bml0LXRlc3RzJz48L29sPlwiO1xuXHR9XG5cblx0YXBwZW5kSGVhZGVyKCk7XG5cdGFwcGVuZEJhbm5lcigpO1xuXHRhcHBlbmRUZXN0UmVzdWx0cygpO1xuXHRhcHBlbmRVc2VyQWdlbnQoKTtcblx0YXBwZW5kVG9vbGJhcigpO1xuXHRhcHBlbmRUZXN0c0xpc3QoIGRldGFpbHMubW9kdWxlcyApO1xuXHR0b29sYmFyTW9kdWxlRmlsdGVyKCk7XG5cblx0aWYgKCBxdW5pdCAmJiBjb25maWcuaGlkZXBhc3NlZCApIHtcblx0XHRhZGRDbGFzcyggcXVuaXQubGFzdENoaWxkLCBcImhpZGVwYXNzXCIgKTtcblx0fVxufSk7XG5cblFVbml0LmRvbmUoZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBpLCBrZXksXG5cdFx0YmFubmVyID0gaWQoIFwicXVuaXQtYmFubmVyXCIgKSxcblx0XHR0ZXN0cyA9IGlkKCBcInF1bml0LXRlc3RzXCIgKSxcblx0XHRodG1sID0gW1xuXHRcdFx0XCJUZXN0cyBjb21wbGV0ZWQgaW4gXCIsXG5cdFx0XHRkZXRhaWxzLnJ1bnRpbWUsXG5cdFx0XHRcIiBtaWxsaXNlY29uZHMuPGJyIC8+XCIsXG5cdFx0XHRcIjxzcGFuIGNsYXNzPSdwYXNzZWQnPlwiLFxuXHRcdFx0ZGV0YWlscy5wYXNzZWQsXG5cdFx0XHRcIjwvc3Bhbj4gYXNzZXJ0aW9ucyBvZiA8c3BhbiBjbGFzcz0ndG90YWwnPlwiLFxuXHRcdFx0ZGV0YWlscy50b3RhbCxcblx0XHRcdFwiPC9zcGFuPiBwYXNzZWQsIDxzcGFuIGNsYXNzPSdmYWlsZWQnPlwiLFxuXHRcdFx0ZGV0YWlscy5mYWlsZWQsXG5cdFx0XHRcIjwvc3Bhbj4gZmFpbGVkLlwiXG5cdFx0XS5qb2luKCBcIlwiICk7XG5cblx0aWYgKCBiYW5uZXIgKSB7XG5cdFx0YmFubmVyLmNsYXNzTmFtZSA9IGRldGFpbHMuZmFpbGVkID8gXCJxdW5pdC1mYWlsXCIgOiBcInF1bml0LXBhc3NcIjtcblx0fVxuXG5cdGlmICggdGVzdHMgKSB7XG5cdFx0aWQoIFwicXVuaXQtdGVzdHJlc3VsdFwiICkuaW5uZXJIVE1MID0gaHRtbDtcblx0fVxuXG5cdGlmICggY29uZmlnLmFsdGVydGl0bGUgJiYgZGVmaW5lZC5kb2N1bWVudCAmJiBkb2N1bWVudC50aXRsZSApIHtcblxuXHRcdC8vIHNob3cg4pyWIGZvciBnb29kLCDinJQgZm9yIGJhZCBzdWl0ZSByZXN1bHQgaW4gdGl0bGVcblx0XHQvLyB1c2UgZXNjYXBlIHNlcXVlbmNlcyBpbiBjYXNlIGZpbGUgZ2V0cyBsb2FkZWQgd2l0aCBub24tdXRmLTgtY2hhcnNldFxuXHRcdGRvY3VtZW50LnRpdGxlID0gW1xuXHRcdFx0KCBkZXRhaWxzLmZhaWxlZCA/IFwiXFx1MjcxNlwiIDogXCJcXHUyNzE0XCIgKSxcblx0XHRcdGRvY3VtZW50LnRpdGxlLnJlcGxhY2UoIC9eW1xcdTI3MTRcXHUyNzE2XSAvaSwgXCJcIiApXG5cdFx0XS5qb2luKCBcIiBcIiApO1xuXHR9XG5cblx0Ly8gY2xlYXIgb3duIHNlc3Npb25TdG9yYWdlIGl0ZW1zIGlmIGFsbCB0ZXN0cyBwYXNzZWRcblx0aWYgKCBjb25maWcucmVvcmRlciAmJiBkZWZpbmVkLnNlc3Npb25TdG9yYWdlICYmIGRldGFpbHMuZmFpbGVkID09PSAwICkge1xuXHRcdGZvciAoIGkgPSAwOyBpIDwgc2Vzc2lvblN0b3JhZ2UubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRrZXkgPSBzZXNzaW9uU3RvcmFnZS5rZXkoIGkrKyApO1xuXHRcdFx0aWYgKCBrZXkuaW5kZXhPZiggXCJxdW5pdC10ZXN0LVwiICkgPT09IDAgKSB7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIGtleSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIHNjcm9sbCBiYWNrIHRvIHRvcCB0byBzaG93IHJlc3VsdHNcblx0aWYgKCBjb25maWcuc2Nyb2xsdG9wICYmIHdpbmRvdy5zY3JvbGxUbyApIHtcblx0XHR3aW5kb3cuc2Nyb2xsVG8oIDAsIDAgKTtcblx0fVxufSk7XG5cbmZ1bmN0aW9uIGdldE5hbWVIdG1sKCBuYW1lLCBtb2R1bGUgKSB7XG5cdHZhciBuYW1lSHRtbCA9IFwiXCI7XG5cblx0aWYgKCBtb2R1bGUgKSB7XG5cdFx0bmFtZUh0bWwgPSBcIjxzcGFuIGNsYXNzPSdtb2R1bGUtbmFtZSc+XCIgKyBlc2NhcGVUZXh0KCBtb2R1bGUgKSArIFwiPC9zcGFuPjogXCI7XG5cdH1cblxuXHRuYW1lSHRtbCArPSBcIjxzcGFuIGNsYXNzPSd0ZXN0LW5hbWUnPlwiICsgZXNjYXBlVGV4dCggbmFtZSApICsgXCI8L3NwYW4+XCI7XG5cblx0cmV0dXJuIG5hbWVIdG1sO1xufVxuXG5RVW5pdC50ZXN0U3RhcnQoZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBydW5uaW5nLCB0ZXN0QmxvY2ssIGJhZDtcblxuXHR0ZXN0QmxvY2sgPSBpZCggXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIGRldGFpbHMudGVzdElkICk7XG5cdGlmICggdGVzdEJsb2NrICkge1xuXHRcdHRlc3RCbG9jay5jbGFzc05hbWUgPSBcInJ1bm5pbmdcIjtcblx0fSBlbHNlIHtcblxuXHRcdC8vIFJlcG9ydCBsYXRlciByZWdpc3RlcmVkIHRlc3RzXG5cdFx0YXBwZW5kVGVzdCggZGV0YWlscy5uYW1lLCBkZXRhaWxzLnRlc3RJZCwgZGV0YWlscy5tb2R1bGUgKTtcblx0fVxuXG5cdHJ1bm5pbmcgPSBpZCggXCJxdW5pdC10ZXN0cmVzdWx0XCIgKTtcblx0aWYgKCBydW5uaW5nICkge1xuXHRcdGJhZCA9IFFVbml0LmNvbmZpZy5yZW9yZGVyICYmIGRlZmluZWQuc2Vzc2lvblN0b3JhZ2UgJiZcblx0XHRcdCtzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKCBcInF1bml0LXRlc3QtXCIgKyBkZXRhaWxzLm1vZHVsZSArIFwiLVwiICsgZGV0YWlscy5uYW1lICk7XG5cblx0XHRydW5uaW5nLmlubmVySFRNTCA9ICggYmFkID9cblx0XHRcdFwiUmVydW5uaW5nIHByZXZpb3VzbHkgZmFpbGVkIHRlc3Q6IDxiciAvPlwiIDpcblx0XHRcdFwiUnVubmluZzogPGJyIC8+XCIgKSArXG5cdFx0XHRnZXROYW1lSHRtbCggZGV0YWlscy5uYW1lLCBkZXRhaWxzLm1vZHVsZSApO1xuXHR9XG5cbn0pO1xuXG5mdW5jdGlvbiBzdHJpcEh0bWwoIHN0cmluZyApIHtcblx0Ly8gc3RyaXAgdGFncywgaHRtbCBlbnRpdHkgYW5kIHdoaXRlc3BhY2VzXG5cdHJldHVybiBzdHJpbmcucmVwbGFjZSgvPFxcLz9bXj5dKyg+fCQpL2csIFwiXCIpLnJlcGxhY2UoL1xcJnF1b3Q7L2csIFwiXCIpLnJlcGxhY2UoL1xccysvZywgXCJcIik7XG59XG5cblFVbml0LmxvZyhmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIGFzc2VydExpc3QsIGFzc2VydExpLFxuXHRcdG1lc3NhZ2UsIGV4cGVjdGVkLCBhY3R1YWwsIGRpZmYsXG5cdFx0c2hvd0RpZmYgPSBmYWxzZSxcblx0XHR0ZXN0SXRlbSA9IGlkKCBcInF1bml0LXRlc3Qtb3V0cHV0LVwiICsgZGV0YWlscy50ZXN0SWQgKTtcblxuXHRpZiAoICF0ZXN0SXRlbSApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRtZXNzYWdlID0gZXNjYXBlVGV4dCggZGV0YWlscy5tZXNzYWdlICkgfHwgKCBkZXRhaWxzLnJlc3VsdCA/IFwib2theVwiIDogXCJmYWlsZWRcIiApO1xuXHRtZXNzYWdlID0gXCI8c3BhbiBjbGFzcz0ndGVzdC1tZXNzYWdlJz5cIiArIG1lc3NhZ2UgKyBcIjwvc3Bhbj5cIjtcblx0bWVzc2FnZSArPSBcIjxzcGFuIGNsYXNzPSdydW50aW1lJz5AIFwiICsgZGV0YWlscy5ydW50aW1lICsgXCIgbXM8L3NwYW4+XCI7XG5cblx0Ly8gcHVzaEZhaWx1cmUgZG9lc24ndCBwcm92aWRlIGRldGFpbHMuZXhwZWN0ZWRcblx0Ly8gd2hlbiBpdCBjYWxscywgaXQncyBpbXBsaWNpdCB0byBhbHNvIG5vdCBzaG93IGV4cGVjdGVkIGFuZCBkaWZmIHN0dWZmXG5cdC8vIEFsc28sIHdlIG5lZWQgdG8gY2hlY2sgZGV0YWlscy5leHBlY3RlZCBleGlzdGVuY2UsIGFzIGl0IGNhbiBleGlzdCBhbmQgYmUgdW5kZWZpbmVkXG5cdGlmICggIWRldGFpbHMucmVzdWx0ICYmIGhhc093bi5jYWxsKCBkZXRhaWxzLCBcImV4cGVjdGVkXCIgKSApIHtcblx0XHRpZiAoIGRldGFpbHMubmVnYXRpdmUgKSB7XG5cdFx0XHRleHBlY3RlZCA9IGVzY2FwZVRleHQoIFwiTk9UIFwiICsgUVVuaXQuZHVtcC5wYXJzZSggZGV0YWlscy5leHBlY3RlZCApICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV4cGVjdGVkID0gZXNjYXBlVGV4dCggUVVuaXQuZHVtcC5wYXJzZSggZGV0YWlscy5leHBlY3RlZCApICk7XG5cdFx0fVxuXG5cdFx0YWN0dWFsID0gZXNjYXBlVGV4dCggUVVuaXQuZHVtcC5wYXJzZSggZGV0YWlscy5hY3R1YWwgKSApO1xuXHRcdG1lc3NhZ2UgKz0gXCI8dGFibGU+PHRyIGNsYXNzPSd0ZXN0LWV4cGVjdGVkJz48dGg+RXhwZWN0ZWQ6IDwvdGg+PHRkPjxwcmU+XCIgK1xuXHRcdFx0ZXhwZWN0ZWQgK1xuXHRcdFx0XCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cblx0XHRpZiAoIGFjdHVhbCAhPT0gZXhwZWN0ZWQgKSB7XG5cblx0XHRcdG1lc3NhZ2UgKz0gXCI8dHIgY2xhc3M9J3Rlc3QtYWN0dWFsJz48dGg+UmVzdWx0OiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdFx0YWN0dWFsICsgXCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cblx0XHRcdC8vIERvbid0IHNob3cgZGlmZiBpZiBhY3R1YWwgb3IgZXhwZWN0ZWQgYXJlIGJvb2xlYW5zXG5cdFx0XHRpZiAoICEoIC9eKHRydWV8ZmFsc2UpJC8udGVzdCggYWN0dWFsICkgKSAmJlxuXHRcdFx0XHRcdCEoIC9eKHRydWV8ZmFsc2UpJC8udGVzdCggZXhwZWN0ZWQgKSApICkge1xuXHRcdFx0XHRkaWZmID0gUVVuaXQuZGlmZiggZXhwZWN0ZWQsIGFjdHVhbCApO1xuXHRcdFx0XHRzaG93RGlmZiA9IHN0cmlwSHRtbCggZGlmZiApLmxlbmd0aCAhPT1cblx0XHRcdFx0XHRzdHJpcEh0bWwoIGV4cGVjdGVkICkubGVuZ3RoICtcblx0XHRcdFx0XHRzdHJpcEh0bWwoIGFjdHVhbCApLmxlbmd0aDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRG9uJ3Qgc2hvdyBkaWZmIGlmIGV4cGVjdGVkIGFuZCBhY3R1YWwgYXJlIHRvdGFsbHkgZGlmZmVyZW50XG5cdFx0XHRpZiAoIHNob3dEaWZmICkge1xuXHRcdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LWRpZmYnPjx0aD5EaWZmOiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdFx0XHRkaWZmICsgXCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICggZXhwZWN0ZWQuaW5kZXhPZiggXCJbb2JqZWN0IEFycmF5XVwiICkgIT09IC0xIHx8XG5cdFx0XHRcdGV4cGVjdGVkLmluZGV4T2YoIFwiW29iamVjdCBPYmplY3RdXCIgKSAhPT0gLTEgKSB7XG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LW1lc3NhZ2UnPjx0aD5NZXNzYWdlOiA8L3RoPjx0ZD5cIiArXG5cdFx0XHRcdFwiRGlmZiBzdXBwcmVzc2VkIGFzIHRoZSBkZXB0aCBvZiBvYmplY3QgaXMgbW9yZSB0aGFuIGN1cnJlbnQgbWF4IGRlcHRoIChcIiArXG5cdFx0XHRcdFFVbml0LmNvbmZpZy5tYXhEZXB0aCArIFwiKS48cD5IaW50OiBVc2UgPGNvZGU+UVVuaXQuZHVtcC5tYXhEZXB0aDwvY29kZT4gdG8gXCIgK1xuXHRcdFx0XHRcIiBydW4gd2l0aCBhIGhpZ2hlciBtYXggZGVwdGggb3IgPGEgaHJlZj0nXCIgKyBzZXRVcmwoeyBtYXhEZXB0aDogLTEgfSkgKyBcIic+XCIgK1xuXHRcdFx0XHRcIlJlcnVuPC9hPiB3aXRob3V0IG1heCBkZXB0aC48L3A+PC90ZD48L3RyPlwiO1xuXHRcdH1cblxuXHRcdGlmICggZGV0YWlscy5zb3VyY2UgKSB7XG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LXNvdXJjZSc+PHRoPlNvdXJjZTogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRcdGVzY2FwZVRleHQoIGRldGFpbHMuc291cmNlICkgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblx0XHR9XG5cblx0XHRtZXNzYWdlICs9IFwiPC90YWJsZT5cIjtcblxuXHQvLyB0aGlzIG9jY3VycyB3aGVuIHB1c2hGYWlsdXJlIGlzIHNldCBhbmQgd2UgaGF2ZSBhbiBleHRyYWN0ZWQgc3RhY2sgdHJhY2Vcblx0fSBlbHNlIGlmICggIWRldGFpbHMucmVzdWx0ICYmIGRldGFpbHMuc291cmNlICkge1xuXHRcdG1lc3NhZ2UgKz0gXCI8dGFibGU+XCIgK1xuXHRcdFx0XCI8dHIgY2xhc3M9J3Rlc3Qtc291cmNlJz48dGg+U291cmNlOiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdGVzY2FwZVRleHQoIGRldGFpbHMuc291cmNlICkgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIiArXG5cdFx0XHRcIjwvdGFibGU+XCI7XG5cdH1cblxuXHRhc3NlcnRMaXN0ID0gdGVzdEl0ZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwib2xcIiApWyAwIF07XG5cblx0YXNzZXJ0TGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImxpXCIgKTtcblx0YXNzZXJ0TGkuY2xhc3NOYW1lID0gZGV0YWlscy5yZXN1bHQgPyBcInBhc3NcIiA6IFwiZmFpbFwiO1xuXHRhc3NlcnRMaS5pbm5lckhUTUwgPSBtZXNzYWdlO1xuXHRhc3NlcnRMaXN0LmFwcGVuZENoaWxkKCBhc3NlcnRMaSApO1xufSk7XG5cblFVbml0LnRlc3REb25lKGZ1bmN0aW9uKCBkZXRhaWxzICkge1xuXHR2YXIgdGVzdFRpdGxlLCB0aW1lLCB0ZXN0SXRlbSwgYXNzZXJ0TGlzdCxcblx0XHRnb29kLCBiYWQsIHRlc3RDb3VudHMsIHNraXBwZWQsIHNvdXJjZU5hbWUsXG5cdFx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cblx0aWYgKCAhdGVzdHMgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGVzdEl0ZW0gPSBpZCggXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIGRldGFpbHMudGVzdElkICk7XG5cblx0YXNzZXJ0TGlzdCA9IHRlc3RJdGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcIm9sXCIgKVsgMCBdO1xuXG5cdGdvb2QgPSBkZXRhaWxzLnBhc3NlZDtcblx0YmFkID0gZGV0YWlscy5mYWlsZWQ7XG5cblx0Ly8gc3RvcmUgcmVzdWx0IHdoZW4gcG9zc2libGVcblx0aWYgKCBjb25maWcucmVvcmRlciAmJiBkZWZpbmVkLnNlc3Npb25TdG9yYWdlICkge1xuXHRcdGlmICggYmFkICkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSggXCJxdW5pdC10ZXN0LVwiICsgZGV0YWlscy5tb2R1bGUgKyBcIi1cIiArIGRldGFpbHMubmFtZSwgYmFkICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIGRldGFpbHMubW9kdWxlICsgXCItXCIgKyBkZXRhaWxzLm5hbWUgKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIGJhZCA9PT0gMCApIHtcblxuXHRcdC8vIENvbGxhcHNlIHRoZSBwYXNzaW5nIHRlc3RzXG5cdFx0YWRkQ2xhc3MoIGFzc2VydExpc3QsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0fSBlbHNlIGlmICggYmFkICYmIGNvbmZpZy5jb2xsYXBzZSAmJiAhY29sbGFwc2VOZXh0ICkge1xuXG5cdFx0Ly8gU2tpcCBjb2xsYXBzaW5nIHRoZSBmaXJzdCBmYWlsaW5nIHRlc3Rcblx0XHRjb2xsYXBzZU5leHQgPSB0cnVlO1xuXHR9IGVsc2Uge1xuXG5cdFx0Ly8gQ29sbGFwc2UgcmVtYWluaW5nIHRlc3RzXG5cdFx0YWRkQ2xhc3MoIGFzc2VydExpc3QsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0fVxuXG5cdC8vIHRlc3RJdGVtLmZpcnN0Q2hpbGQgaXMgdGhlIHRlc3QgbmFtZVxuXHR0ZXN0VGl0bGUgPSB0ZXN0SXRlbS5maXJzdENoaWxkO1xuXG5cdHRlc3RDb3VudHMgPSBiYWQgP1xuXHRcdFwiPGIgY2xhc3M9J2ZhaWxlZCc+XCIgKyBiYWQgKyBcIjwvYj4sIFwiICsgXCI8YiBjbGFzcz0ncGFzc2VkJz5cIiArIGdvb2QgKyBcIjwvYj4sIFwiIDpcblx0XHRcIlwiO1xuXG5cdHRlc3RUaXRsZS5pbm5lckhUTUwgKz0gXCIgPGIgY2xhc3M9J2NvdW50cyc+KFwiICsgdGVzdENvdW50cyArXG5cdFx0ZGV0YWlscy5hc3NlcnRpb25zLmxlbmd0aCArIFwiKTwvYj5cIjtcblxuXHRpZiAoIGRldGFpbHMuc2tpcHBlZCApIHtcblx0XHR0ZXN0SXRlbS5jbGFzc05hbWUgPSBcInNraXBwZWRcIjtcblx0XHRza2lwcGVkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJlbVwiICk7XG5cdFx0c2tpcHBlZC5jbGFzc05hbWUgPSBcInF1bml0LXNraXBwZWQtbGFiZWxcIjtcblx0XHRza2lwcGVkLmlubmVySFRNTCA9IFwic2tpcHBlZFwiO1xuXHRcdHRlc3RJdGVtLmluc2VydEJlZm9yZSggc2tpcHBlZCwgdGVzdFRpdGxlICk7XG5cdH0gZWxzZSB7XG5cdFx0YWRkRXZlbnQoIHRlc3RUaXRsZSwgXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHRvZ2dsZUNsYXNzKCBhc3NlcnRMaXN0LCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdFx0fSk7XG5cblx0XHR0ZXN0SXRlbS5jbGFzc05hbWUgPSBiYWQgPyBcImZhaWxcIiA6IFwicGFzc1wiO1xuXG5cdFx0dGltZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwic3BhblwiICk7XG5cdFx0dGltZS5jbGFzc05hbWUgPSBcInJ1bnRpbWVcIjtcblx0XHR0aW1lLmlubmVySFRNTCA9IGRldGFpbHMucnVudGltZSArIFwiIG1zXCI7XG5cdFx0dGVzdEl0ZW0uaW5zZXJ0QmVmb3JlKCB0aW1lLCBhc3NlcnRMaXN0ICk7XG5cdH1cblxuXHQvLyBTaG93IHRoZSBzb3VyY2Ugb2YgdGhlIHRlc3Qgd2hlbiBzaG93aW5nIGFzc2VydGlvbnNcblx0aWYgKCBkZXRhaWxzLnNvdXJjZSApIHtcblx0XHRzb3VyY2VOYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJwXCIgKTtcblx0XHRzb3VyY2VOYW1lLmlubmVySFRNTCA9IFwiPHN0cm9uZz5Tb3VyY2U6IDwvc3Ryb25nPlwiICsgZGV0YWlscy5zb3VyY2U7XG5cdFx0YWRkQ2xhc3MoIHNvdXJjZU5hbWUsIFwicXVuaXQtc291cmNlXCIgKTtcblx0XHRpZiAoIGJhZCA9PT0gMCApIHtcblx0XHRcdGFkZENsYXNzKCBzb3VyY2VOYW1lLCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdFx0fVxuXHRcdGFkZEV2ZW50KCB0ZXN0VGl0bGUsIFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR0b2dnbGVDbGFzcyggc291cmNlTmFtZSwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHRcdH0pO1xuXHRcdHRlc3RJdGVtLmFwcGVuZENoaWxkKCBzb3VyY2VOYW1lICk7XG5cdH1cbn0pO1xuXG5pZiAoIGRlZmluZWQuZG9jdW1lbnQgKSB7XG5cblx0Ly8gQXZvaWQgcmVhZHlTdGF0ZSBpc3N1ZSB3aXRoIHBoYW50b21qc1xuXHQvLyBSZWY6ICM4MThcblx0dmFyIG5vdFBoYW50b20gPSAoIGZ1bmN0aW9uKCBwICkge1xuXHRcdHJldHVybiAhKCBwICYmIHAudmVyc2lvbiAmJiBwLnZlcnNpb24ubWFqb3IgPiAwICk7XG5cdH0gKSggd2luZG93LnBoYW50b20gKTtcblxuXHRpZiAoIG5vdFBoYW50b20gJiYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiICkge1xuXHRcdFFVbml0LmxvYWQoKTtcblx0fSBlbHNlIHtcblx0XHRhZGRFdmVudCggd2luZG93LCBcImxvYWRcIiwgUVVuaXQubG9hZCApO1xuXHR9XG59IGVsc2Uge1xuXHRjb25maWcucGFnZUxvYWRlZCA9IHRydWU7XG5cdGNvbmZpZy5hdXRvcnVuID0gdHJ1ZTtcbn1cblxufSkoKTtcbiIsImNvbnN0IHNlYXJjaENvbXBvbmVudCA9IGZ1bmN0aW9uIHNlYXJjaENvbXBvbmVudCAoKXtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHRlbXBsYXRlKCl7XG4gICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICAgIDxmb3JtPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwic2VhcmNoXCI+V2hhdCBkaWQgeW91IGVhdCB0b2RheSA/PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJzZWFyY2hcIiBwbGFjZWhvbGRlcj1cIlRhY29zLCBjb2ZmZWUsIGJhbm5hbmEsIC4uLlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImJ1dHRvblwiIHZhbHVlPVwiU2VhcmNoXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9mb3JtPmA7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdCgpe1xuICAgICAgICAgICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgcm9vdC5jbGFzc0xpc3QuYWRkKCdyb290Jyk7XG4gICAgICAgICAgICByb290LmlubmVySFRNTCA9IHRoaXMudGVtcGxhdGUoKTtcblxuICAgICAgICAgICAgdGhpcy5mcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQocm9vdCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJ1dHRvbiA9IHRoaXMuZnJhZ21lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1idXR0b25dJyk7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hGaWVsZCA9IHRoaXMuZnJhZ21lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbbmFtZT1zZWFyY2hdJyk7XG5cbiAgICAgICAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuXG4gICAgICAgICAgICAgICAgd2luZG93LmNvbnNvbGUubG9nKGUsIHNlYXJjaEZpZWxkLnZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzZWFyY2hGaWVsZC5zdHlsZS5ib3JkZXJDb2xvciA9ICdyZWQnO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICByZW5kZXIoY29udGFpbmVyKXtcbiAgICAgICAgICAgIGlmKHRoaXMuZnJhZ21lbnQgJiYgY29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpe1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJy5yb290ID4gKicpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHNlYXJjaENvbXBvbmVudDtcbiIsImltcG9ydCBRVW5pdCBmcm9tICdxdW5pdGpzJztcbmltcG9ydCBzZWFyY2hDb21wb25lbnQgZnJvbSAnLi4vLi4vc3JjL2NvbXBvbmVudHMvc2VhcmNoLmpzJztcblxuUVVuaXQubW9kdWxlKCdBUEknKTtcblxuUVVuaXQudGVzdCgnZmFjdG9yeScsIGFzc2VydCA9PiB7XG4gICAgYXNzZXJ0LmVxdWFsKCB0eXBlb2Ygc2VhcmNoQ29tcG9uZW50LCAnZnVuY3Rpb24nLCAnVGhlIGNvbXBvbmVudCBtb2R1bGUgZXhwb3NlIGEgZnVuY3Rpb24nKTtcbiAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBzZWFyY2hDb21wb25lbnQoKSwgJ29iamVjdCcsICdUaGUgY29tcG9uZW50IGZhY3RvcnkgY3JlYXRlcyBhbiBvYmplY3QnKTtcbiAgICBhc3NlcnQubm90RGVlcEVxdWFsKHNlYXJjaENvbXBvbmVudCgpLCBzZWFyY2hDb21wb25lbnQoKSwgJ1RoZSBjb21wb25lbnQgZmFjdG9yeSBjcmVhdGVzIG5ldyBvYmplY3RzJyk7XG59KTtcblxuUVVuaXQudGVzdCgnY29tcG9uZW50JywgYXNzZXJ0ID0+IHtcbiAgICB2YXIgY29tcG9uZW50ID0gc2VhcmNoQ29tcG9uZW50KCk7XG4gICAgYXNzZXJ0LmVxdWFsKCB0eXBlb2YgY29tcG9uZW50LmluaXQsICdmdW5jdGlvbicsICdUaGUgY29tcG9uZW50IGV4cG9zZXMgYW4gaW5pdCBtZXRob2QnKTtcbiAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBjb21wb25lbnQucmVuZGVyLCAnZnVuY3Rpb24nLCAnVGhlIGNvbXBvbmVudCBleHBvc2VzIGEgcmVuZGVyIG1ldGhvZCcpO1xuICAgIGFzc2VydC5vayggdHJ1ZSwgJ2EgdXNlZnVsIHRlc3QnKTtcbn0pO1xuIl19
