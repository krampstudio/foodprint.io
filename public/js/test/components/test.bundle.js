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

_qunitjs2.default.module('Component API');

_qunitjs2.default.test('factory', function (assert) {
    assert.equal(typeof _search2.default === 'undefined' ? 'undefined' : _typeof(_search2.default), 'function', 'The component module expose a function');
    assert.equal(_typeof((0, _search2.default)()), 'object', 'The component factory creates an object');
    assert.notDeepEqual((0, _search2.default)(), (0, _search2.default)(), 'The component factory creates new objects');
});

},{"../../src/components/search.js":2,"qunitjs":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcXVuaXRqcy9xdW5pdC9xdW5pdC5qcyIsInB1YmxpYy9qcy9zcmMvY29tcG9uZW50cy9zZWFyY2guanMiLCJwdWJsaWMvanMvdGVzdC9jb21wb25lbnRzL3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQzdoSUEsSUFBTSxrQkFBa0IsU0FBUyxlQUFULEdBQTJCOztBQUUvQyxXQUFPO0FBQ0gsc0NBQVU7QUFDTiwrV0FETTtTQURQO0FBWUgsOEJBQU07QUFDRixnQkFBTSxPQUFPLFNBQVMsYUFBVCxDQUF1QixLQUF2QixDQUFQLENBREo7QUFFRixpQkFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixNQUFuQixFQUZFO0FBR0YsaUJBQUssU0FBTCxHQUFpQixLQUFLLFFBQUwsRUFBakIsQ0FIRTs7QUFLRixpQkFBSyxRQUFMLEdBQWdCLFNBQVMsc0JBQVQsRUFBaEIsQ0FMRTtBQU1GLGlCQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTBCLElBQTFCLEVBTkU7O0FBUUYsZ0JBQU0sU0FBUyxLQUFLLFFBQUwsQ0FBYyxhQUFkLENBQTRCLG9CQUE1QixDQUFULENBUko7QUFTRixnQkFBTSxjQUFjLEtBQUssUUFBTCxDQUFjLGFBQWQsQ0FBNEIsb0JBQTVCLENBQWQsQ0FUSjs7QUFXRixtQkFBTyxnQkFBUCxDQUF3QixPQUF4QixFQUFpQyxhQUFLOztBQUVsQyx1QkFBTyxPQUFQLENBQWUsR0FBZixDQUFtQixDQUFuQixFQUFzQixZQUFZLEtBQVosQ0FBdEIsQ0FGa0M7YUFBTCxDQUFqQyxDQVhFO0FBZUYsbUJBQU8sSUFBUCxDQWZFO1NBWkg7QUE4QkgsZ0NBQU8sV0FBVTtBQUNiLGdCQUFHLEtBQUssUUFBTCxJQUFpQixxQkFBcUIsV0FBckIsRUFBaUM7QUFDakQsMEJBQVUsV0FBVixDQUFzQixLQUFLLFFBQUwsQ0FBYyxhQUFkLENBQTRCLFdBQTVCLENBQXRCLEVBRGlEO2FBQXJEO0FBR0EsbUJBQU8sSUFBUCxDQUphO1NBOUJkO0tBQVAsQ0FGK0M7Q0FBM0I7O2tCQXlDVDs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN0Q2Ysa0JBQU0sTUFBTixDQUFhLGVBQWI7O0FBRUEsa0JBQU0sSUFBTixDQUFXLFNBQVgsRUFBc0Isa0JBQVU7QUFDNUIsV0FBTyxLQUFQLG9GQUFzQyxVQUF0QyxFQUFrRCx3Q0FBbEQsRUFENEI7QUFFNUIsV0FBTyxLQUFQLFNBQXFCLHdCQUFyQixFQUF3QyxRQUF4QyxFQUFrRCx5Q0FBbEQsRUFGNEI7QUFHNUIsV0FBTyxZQUFQLENBQW9CLHVCQUFwQixFQUF1Qyx1QkFBdkMsRUFBMEQsMkNBQTFELEVBSDRCO0NBQVYsQ0FBdEIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gKiBRVW5pdCAxLjIxLjBcbiAqIGh0dHBzOi8vcXVuaXRqcy5jb20vXG4gKlxuICogQ29weXJpZ2h0IGpRdWVyeSBGb3VuZGF0aW9uIGFuZCBvdGhlciBjb250cmlidXRvcnNcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9qcXVlcnkub3JnL2xpY2Vuc2VcbiAqXG4gKiBEYXRlOiAyMDE2LTAyLTAxVDEzOjA3WlxuICovXG5cbihmdW5jdGlvbiggZ2xvYmFsICkge1xuXG52YXIgUVVuaXQgPSB7fTtcblxudmFyIERhdGUgPSBnbG9iYWwuRGF0ZTtcbnZhciBub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufTtcblxudmFyIHNldFRpbWVvdXQgPSBnbG9iYWwuc2V0VGltZW91dDtcbnZhciBjbGVhclRpbWVvdXQgPSBnbG9iYWwuY2xlYXJUaW1lb3V0O1xuXG4vLyBTdG9yZSBhIGxvY2FsIHdpbmRvdyBmcm9tIHRoZSBnbG9iYWwgdG8gYWxsb3cgZGlyZWN0IHJlZmVyZW5jZXMuXG52YXIgd2luZG93ID0gZ2xvYmFsLndpbmRvdztcblxudmFyIGRlZmluZWQgPSB7XG5cdGRvY3VtZW50OiB3aW5kb3cgJiYgd2luZG93LmRvY3VtZW50ICE9PSB1bmRlZmluZWQsXG5cdHNldFRpbWVvdXQ6IHNldFRpbWVvdXQgIT09IHVuZGVmaW5lZCxcblx0c2Vzc2lvblN0b3JhZ2U6IChmdW5jdGlvbigpIHtcblx0XHR2YXIgeCA9IFwicXVuaXQtdGVzdC1zdHJpbmdcIjtcblx0XHR0cnkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSggeCwgeCApO1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSggeCApO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9KCkgKVxufTtcblxudmFyIGZpbGVOYW1lID0gKCBzb3VyY2VGcm9tU3RhY2t0cmFjZSggMCApIHx8IFwiXCIgKS5yZXBsYWNlKCAvKDpcXGQrKStcXCk/LywgXCJcIiApLnJlcGxhY2UoIC8uK1xcLy8sIFwiXCIgKTtcbnZhciBnbG9iYWxTdGFydENhbGxlZCA9IGZhbHNlO1xudmFyIHJ1blN0YXJ0ZWQgPSBmYWxzZTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcblx0aGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gcmV0dXJucyBhIG5ldyBBcnJheSB3aXRoIHRoZSBlbGVtZW50cyB0aGF0IGFyZSBpbiBhIGJ1dCBub3QgaW4gYlxuZnVuY3Rpb24gZGlmZiggYSwgYiApIHtcblx0dmFyIGksIGosXG5cdFx0cmVzdWx0ID0gYS5zbGljZSgpO1xuXG5cdGZvciAoIGkgPSAwOyBpIDwgcmVzdWx0Lmxlbmd0aDsgaSsrICkge1xuXHRcdGZvciAoIGogPSAwOyBqIDwgYi5sZW5ndGg7IGorKyApIHtcblx0XHRcdGlmICggcmVzdWx0WyBpIF0gPT09IGJbIGogXSApIHtcblx0XHRcdFx0cmVzdWx0LnNwbGljZSggaSwgMSApO1xuXHRcdFx0XHRpLS07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBmcm9tIGpxdWVyeS5qc1xuZnVuY3Rpb24gaW5BcnJheSggZWxlbSwgYXJyYXkgKSB7XG5cdGlmICggYXJyYXkuaW5kZXhPZiApIHtcblx0XHRyZXR1cm4gYXJyYXkuaW5kZXhPZiggZWxlbSApO1xuXHR9XG5cblx0Zm9yICggdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRpZiAoIGFycmF5WyBpIF0gPT09IGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gaTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gLTE7XG59XG5cbi8qKlxuICogTWFrZXMgYSBjbG9uZSBvZiBhbiBvYmplY3QgdXNpbmcgb25seSBBcnJheSBvciBPYmplY3QgYXMgYmFzZSxcbiAqIGFuZCBjb3BpZXMgb3ZlciB0aGUgb3duIGVudW1lcmFibGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE5ldyBvYmplY3Qgd2l0aCBvbmx5IHRoZSBvd24gcHJvcGVydGllcyAocmVjdXJzaXZlbHkpLlxuICovXG5mdW5jdGlvbiBvYmplY3RWYWx1ZXMgKCBvYmogKSB7XG5cdHZhciBrZXksIHZhbCxcblx0XHR2YWxzID0gUVVuaXQuaXMoIFwiYXJyYXlcIiwgb2JqICkgPyBbXSA6IHt9O1xuXHRmb3IgKCBrZXkgaW4gb2JqICkge1xuXHRcdGlmICggaGFzT3duLmNhbGwoIG9iaiwga2V5ICkgKSB7XG5cdFx0XHR2YWwgPSBvYmpbIGtleSBdO1xuXHRcdFx0dmFsc1sga2V5IF0gPSB2YWwgPT09IE9iamVjdCggdmFsICkgPyBvYmplY3RWYWx1ZXMoIHZhbCApIDogdmFsO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gdmFscztcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKCBhLCBiLCB1bmRlZk9ubHkgKSB7XG5cdGZvciAoIHZhciBwcm9wIGluIGIgKSB7XG5cdFx0aWYgKCBoYXNPd24uY2FsbCggYiwgcHJvcCApICkge1xuXG5cdFx0XHQvLyBBdm9pZCBcIk1lbWJlciBub3QgZm91bmRcIiBlcnJvciBpbiBJRTggY2F1c2VkIGJ5IG1lc3Npbmcgd2l0aCB3aW5kb3cuY29uc3RydWN0b3Jcblx0XHRcdC8vIFRoaXMgYmxvY2sgcnVucyBvbiBldmVyeSBlbnZpcm9ubWVudCwgc28gYGdsb2JhbGAgaXMgYmVpbmcgdXNlZCBpbnN0ZWFkIG9mIGB3aW5kb3dgXG5cdFx0XHQvLyB0byBhdm9pZCBlcnJvcnMgb24gbm9kZS5cblx0XHRcdGlmICggcHJvcCAhPT0gXCJjb25zdHJ1Y3RvclwiIHx8IGEgIT09IGdsb2JhbCApIHtcblx0XHRcdFx0aWYgKCBiWyBwcm9wIF0gPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHRkZWxldGUgYVsgcHJvcCBdO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAhKCB1bmRlZk9ubHkgJiYgdHlwZW9mIGFbIHByb3AgXSAhPT0gXCJ1bmRlZmluZWRcIiApICkge1xuXHRcdFx0XHRcdGFbIHByb3AgXSA9IGJbIHByb3AgXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhO1xufVxuXG5mdW5jdGlvbiBvYmplY3RUeXBlKCBvYmogKSB7XG5cdGlmICggdHlwZW9mIG9iaiA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRyZXR1cm4gXCJ1bmRlZmluZWRcIjtcblx0fVxuXG5cdC8vIENvbnNpZGVyOiB0eXBlb2YgbnVsbCA9PT0gb2JqZWN0XG5cdGlmICggb2JqID09PSBudWxsICkge1xuXHRcdHJldHVybiBcIm51bGxcIjtcblx0fVxuXG5cdHZhciBtYXRjaCA9IHRvU3RyaW5nLmNhbGwoIG9iaiApLm1hdGNoKCAvXlxcW29iamVjdFxccyguKilcXF0kLyApLFxuXHRcdHR5cGUgPSBtYXRjaCAmJiBtYXRjaFsgMSBdO1xuXG5cdHN3aXRjaCAoIHR5cGUgKSB7XG5cdFx0Y2FzZSBcIk51bWJlclwiOlxuXHRcdFx0aWYgKCBpc05hTiggb2JqICkgKSB7XG5cdFx0XHRcdHJldHVybiBcIm5hblwiO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFwibnVtYmVyXCI7XG5cdFx0Y2FzZSBcIlN0cmluZ1wiOlxuXHRcdGNhc2UgXCJCb29sZWFuXCI6XG5cdFx0Y2FzZSBcIkFycmF5XCI6XG5cdFx0Y2FzZSBcIlNldFwiOlxuXHRcdGNhc2UgXCJNYXBcIjpcblx0XHRjYXNlIFwiRGF0ZVwiOlxuXHRcdGNhc2UgXCJSZWdFeHBcIjpcblx0XHRjYXNlIFwiRnVuY3Rpb25cIjpcblx0XHRjYXNlIFwiU3ltYm9sXCI6XG5cdFx0XHRyZXR1cm4gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHR9XG5cdGlmICggdHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRyZXR1cm4gXCJvYmplY3RcIjtcblx0fVxufVxuXG4vLyBTYWZlIG9iamVjdCB0eXBlIGNoZWNraW5nXG5mdW5jdGlvbiBpcyggdHlwZSwgb2JqICkge1xuXHRyZXR1cm4gUVVuaXQub2JqZWN0VHlwZSggb2JqICkgPT09IHR5cGU7XG59XG5cbnZhciBnZXRVcmxQYXJhbXMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGksIGN1cnJlbnQ7XG5cdHZhciB1cmxQYXJhbXMgPSB7fTtcblx0dmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuXHR2YXIgcGFyYW1zID0gbG9jYXRpb24uc2VhcmNoLnNsaWNlKCAxICkuc3BsaXQoIFwiJlwiICk7XG5cdHZhciBsZW5ndGggPSBwYXJhbXMubGVuZ3RoO1xuXG5cdGlmICggcGFyYW1zWyAwIF0gKSB7XG5cdFx0Zm9yICggaSA9IDA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdGN1cnJlbnQgPSBwYXJhbXNbIGkgXS5zcGxpdCggXCI9XCIgKTtcblx0XHRcdGN1cnJlbnRbIDAgXSA9IGRlY29kZVVSSUNvbXBvbmVudCggY3VycmVudFsgMCBdICk7XG5cblx0XHRcdC8vIGFsbG93IGp1c3QgYSBrZXkgdG8gdHVybiBvbiBhIGZsYWcsIGUuZy4sIHRlc3QuaHRtbD9ub2dsb2JhbHNcblx0XHRcdGN1cnJlbnRbIDEgXSA9IGN1cnJlbnRbIDEgXSA/IGRlY29kZVVSSUNvbXBvbmVudCggY3VycmVudFsgMSBdICkgOiB0cnVlO1xuXHRcdFx0aWYgKCB1cmxQYXJhbXNbIGN1cnJlbnRbIDAgXSBdICkge1xuXHRcdFx0XHR1cmxQYXJhbXNbIGN1cnJlbnRbIDAgXSBdID0gW10uY29uY2F0KCB1cmxQYXJhbXNbIGN1cnJlbnRbIDAgXSBdLCBjdXJyZW50WyAxIF0gKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHVybFBhcmFtc1sgY3VycmVudFsgMCBdIF0gPSBjdXJyZW50WyAxIF07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHVybFBhcmFtcztcbn07XG5cbi8vIERvZXNuJ3Qgc3VwcG9ydCBJRTYgdG8gSUU5LCBpdCB3aWxsIHJldHVybiB1bmRlZmluZWQgb24gdGhlc2UgYnJvd3NlcnNcbi8vIFNlZSBhbHNvIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Vycm9yL1N0YWNrXG5mdW5jdGlvbiBleHRyYWN0U3RhY2t0cmFjZSggZSwgb2Zmc2V0ICkge1xuXHRvZmZzZXQgPSBvZmZzZXQgPT09IHVuZGVmaW5lZCA/IDQgOiBvZmZzZXQ7XG5cblx0dmFyIHN0YWNrLCBpbmNsdWRlLCBpO1xuXG5cdGlmICggZS5zdGFjayApIHtcblx0XHRzdGFjayA9IGUuc3RhY2suc3BsaXQoIFwiXFxuXCIgKTtcblx0XHRpZiAoIC9eZXJyb3IkL2kudGVzdCggc3RhY2tbIDAgXSApICkge1xuXHRcdFx0c3RhY2suc2hpZnQoKTtcblx0XHR9XG5cdFx0aWYgKCBmaWxlTmFtZSApIHtcblx0XHRcdGluY2x1ZGUgPSBbXTtcblx0XHRcdGZvciAoIGkgPSBvZmZzZXQ7IGkgPCBzdGFjay5sZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0aWYgKCBzdGFja1sgaSBdLmluZGV4T2YoIGZpbGVOYW1lICkgIT09IC0xICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGluY2x1ZGUucHVzaCggc3RhY2tbIGkgXSApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBpbmNsdWRlLmxlbmd0aCApIHtcblx0XHRcdFx0cmV0dXJuIGluY2x1ZGUuam9pbiggXCJcXG5cIiApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gc3RhY2tbIG9mZnNldCBdO1xuXG5cdC8vIFN1cHBvcnQ6IFNhZmFyaSA8PTYgb25seVxuXHR9IGVsc2UgaWYgKCBlLnNvdXJjZVVSTCApIHtcblxuXHRcdC8vIGV4Y2x1ZGUgdXNlbGVzcyBzZWxmLXJlZmVyZW5jZSBmb3IgZ2VuZXJhdGVkIEVycm9yIG9iamVjdHNcblx0XHRpZiAoIC9xdW5pdC5qcyQvLnRlc3QoIGUuc291cmNlVVJMICkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gZm9yIGFjdHVhbCBleGNlcHRpb25zLCB0aGlzIGlzIHVzZWZ1bFxuXHRcdHJldHVybiBlLnNvdXJjZVVSTCArIFwiOlwiICsgZS5saW5lO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNvdXJjZUZyb21TdGFja3RyYWNlKCBvZmZzZXQgKSB7XG5cdHZhciBlcnJvciA9IG5ldyBFcnJvcigpO1xuXG5cdC8vIFN1cHBvcnQ6IFNhZmFyaSA8PTcgb25seSwgSUUgPD0xMCAtIDExIG9ubHlcblx0Ly8gTm90IGFsbCBicm93c2VycyBnZW5lcmF0ZSB0aGUgYHN0YWNrYCBwcm9wZXJ0eSBmb3IgYG5ldyBFcnJvcigpYCwgc2VlIGFsc28gIzYzNlxuXHRpZiAoICFlcnJvci5zdGFjayApIHtcblx0XHR0cnkge1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fSBjYXRjaCAoIGVyciApIHtcblx0XHRcdGVycm9yID0gZXJyO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBleHRyYWN0U3RhY2t0cmFjZSggZXJyb3IsIG9mZnNldCApO1xufVxuXG4vKipcbiAqIENvbmZpZyBvYmplY3Q6IE1haW50YWluIGludGVybmFsIHN0YXRlXG4gKiBMYXRlciBleHBvc2VkIGFzIFFVbml0LmNvbmZpZ1xuICogYGNvbmZpZ2AgaW5pdGlhbGl6ZWQgYXQgdG9wIG9mIHNjb3BlXG4gKi9cbnZhciBjb25maWcgPSB7XG5cdC8vIFRoZSBxdWV1ZSBvZiB0ZXN0cyB0byBydW5cblx0cXVldWU6IFtdLFxuXG5cdC8vIGJsb2NrIHVudGlsIGRvY3VtZW50IHJlYWR5XG5cdGJsb2NraW5nOiB0cnVlLFxuXG5cdC8vIGJ5IGRlZmF1bHQsIHJ1biBwcmV2aW91c2x5IGZhaWxlZCB0ZXN0cyBmaXJzdFxuXHQvLyB2ZXJ5IHVzZWZ1bCBpbiBjb21iaW5hdGlvbiB3aXRoIFwiSGlkZSBwYXNzZWQgdGVzdHNcIiBjaGVja2VkXG5cdHJlb3JkZXI6IHRydWUsXG5cblx0Ly8gYnkgZGVmYXVsdCwgbW9kaWZ5IGRvY3VtZW50LnRpdGxlIHdoZW4gc3VpdGUgaXMgZG9uZVxuXHRhbHRlcnRpdGxlOiB0cnVlLFxuXG5cdC8vIEhUTUwgUmVwb3J0ZXI6IGNvbGxhcHNlIGV2ZXJ5IHRlc3QgZXhjZXB0IHRoZSBmaXJzdCBmYWlsaW5nIHRlc3Rcblx0Ly8gSWYgZmFsc2UsIGFsbCBmYWlsaW5nIHRlc3RzIHdpbGwgYmUgZXhwYW5kZWRcblx0Y29sbGFwc2U6IHRydWUsXG5cblx0Ly8gYnkgZGVmYXVsdCwgc2Nyb2xsIHRvIHRvcCBvZiB0aGUgcGFnZSB3aGVuIHN1aXRlIGlzIGRvbmVcblx0c2Nyb2xsdG9wOiB0cnVlLFxuXG5cdC8vIGRlcHRoIHVwLXRvIHdoaWNoIG9iamVjdCB3aWxsIGJlIGR1bXBlZFxuXHRtYXhEZXB0aDogNSxcblxuXHQvLyB3aGVuIGVuYWJsZWQsIGFsbCB0ZXN0cyBtdXN0IGNhbGwgZXhwZWN0KClcblx0cmVxdWlyZUV4cGVjdHM6IGZhbHNlLFxuXG5cdC8vIGFkZCBjaGVja2JveGVzIHRoYXQgYXJlIHBlcnNpc3RlZCBpbiB0aGUgcXVlcnktc3RyaW5nXG5cdC8vIHdoZW4gZW5hYmxlZCwgdGhlIGlkIGlzIHNldCB0byBgdHJ1ZWAgYXMgYSBgUVVuaXQuY29uZmlnYCBwcm9wZXJ0eVxuXHR1cmxDb25maWc6IFtcblx0XHR7XG5cdFx0XHRpZDogXCJoaWRlcGFzc2VkXCIsXG5cdFx0XHRsYWJlbDogXCJIaWRlIHBhc3NlZCB0ZXN0c1wiLFxuXHRcdFx0dG9vbHRpcDogXCJPbmx5IHNob3cgdGVzdHMgYW5kIGFzc2VydGlvbnMgdGhhdCBmYWlsLiBTdG9yZWQgYXMgcXVlcnktc3RyaW5ncy5cIlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aWQ6IFwibm9nbG9iYWxzXCIsXG5cdFx0XHRsYWJlbDogXCJDaGVjayBmb3IgR2xvYmFsc1wiLFxuXHRcdFx0dG9vbHRpcDogXCJFbmFibGluZyB0aGlzIHdpbGwgdGVzdCBpZiBhbnkgdGVzdCBpbnRyb2R1Y2VzIG5ldyBwcm9wZXJ0aWVzIG9uIHRoZSBcIiArXG5cdFx0XHRcdFwiZ2xvYmFsIG9iamVjdCAoYHdpbmRvd2AgaW4gQnJvd3NlcnMpLiBTdG9yZWQgYXMgcXVlcnktc3RyaW5ncy5cIlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aWQ6IFwibm90cnljYXRjaFwiLFxuXHRcdFx0bGFiZWw6IFwiTm8gdHJ5LWNhdGNoXCIsXG5cdFx0XHR0b29sdGlwOiBcIkVuYWJsaW5nIHRoaXMgd2lsbCBydW4gdGVzdHMgb3V0c2lkZSBvZiBhIHRyeS1jYXRjaCBibG9jay4gTWFrZXMgZGVidWdnaW5nIFwiICtcblx0XHRcdFx0XCJleGNlcHRpb25zIGluIElFIHJlYXNvbmFibGUuIFN0b3JlZCBhcyBxdWVyeS1zdHJpbmdzLlwiXG5cdFx0fVxuXHRdLFxuXG5cdC8vIFNldCBvZiBhbGwgbW9kdWxlcy5cblx0bW9kdWxlczogW10sXG5cblx0Ly8gU3RhY2sgb2YgbmVzdGVkIG1vZHVsZXNcblx0bW9kdWxlU3RhY2s6IFtdLFxuXG5cdC8vIFRoZSBmaXJzdCB1bm5hbWVkIG1vZHVsZVxuXHRjdXJyZW50TW9kdWxlOiB7XG5cdFx0bmFtZTogXCJcIixcblx0XHR0ZXN0czogW11cblx0fSxcblxuXHRjYWxsYmFja3M6IHt9XG59O1xuXG52YXIgdXJsUGFyYW1zID0gZGVmaW5lZC5kb2N1bWVudCA/IGdldFVybFBhcmFtcygpIDoge307XG5cbi8vIFB1c2ggYSBsb29zZSB1bm5hbWVkIG1vZHVsZSB0byB0aGUgbW9kdWxlcyBjb2xsZWN0aW9uXG5jb25maWcubW9kdWxlcy5wdXNoKCBjb25maWcuY3VycmVudE1vZHVsZSApO1xuXG5pZiAoIHVybFBhcmFtcy5maWx0ZXIgPT09IHRydWUgKSB7XG5cdGRlbGV0ZSB1cmxQYXJhbXMuZmlsdGVyO1xufVxuXG4vLyBTdHJpbmcgc2VhcmNoIGFueXdoZXJlIGluIG1vZHVsZU5hbWUrdGVzdE5hbWVcbmNvbmZpZy5maWx0ZXIgPSB1cmxQYXJhbXMuZmlsdGVyO1xuXG5jb25maWcudGVzdElkID0gW107XG5pZiAoIHVybFBhcmFtcy50ZXN0SWQgKSB7XG5cdC8vIEVuc3VyZSB0aGF0IHVybFBhcmFtcy50ZXN0SWQgaXMgYW4gYXJyYXlcblx0dXJsUGFyYW1zLnRlc3RJZCA9IGRlY29kZVVSSUNvbXBvbmVudCggdXJsUGFyYW1zLnRlc3RJZCApLnNwbGl0KCBcIixcIiApO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHVybFBhcmFtcy50ZXN0SWQubGVuZ3RoOyBpKysgKSB7XG5cdFx0Y29uZmlnLnRlc3RJZC5wdXNoKCB1cmxQYXJhbXMudGVzdElkWyBpIF0gKTtcblx0fVxufVxuXG52YXIgbG9nZ2luZ0NhbGxiYWNrcyA9IHt9O1xuXG4vLyBSZWdpc3RlciBsb2dnaW5nIGNhbGxiYWNrc1xuZnVuY3Rpb24gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2tzKCBvYmogKSB7XG5cdHZhciBpLCBsLCBrZXksXG5cdFx0Y2FsbGJhY2tOYW1lcyA9IFsgXCJiZWdpblwiLCBcImRvbmVcIiwgXCJsb2dcIiwgXCJ0ZXN0U3RhcnRcIiwgXCJ0ZXN0RG9uZVwiLFxuXHRcdFx0XCJtb2R1bGVTdGFydFwiLCBcIm1vZHVsZURvbmVcIiBdO1xuXG5cdGZ1bmN0aW9uIHJlZ2lzdGVyTG9nZ2luZ0NhbGxiYWNrKCBrZXkgKSB7XG5cdFx0dmFyIGxvZ2dpbmdDYWxsYmFjayA9IGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHRcdGlmICggb2JqZWN0VHlwZSggY2FsbGJhY2sgKSAhPT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHRcdFx0XCJRVW5pdCBsb2dnaW5nIG1ldGhvZHMgcmVxdWlyZSBhIGNhbGxiYWNrIGZ1bmN0aW9uIGFzIHRoZWlyIGZpcnN0IHBhcmFtZXRlcnMuXCJcblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0Y29uZmlnLmNhbGxiYWNrc1sga2V5IF0ucHVzaCggY2FsbGJhY2sgKTtcblx0XHR9O1xuXG5cdFx0Ly8gREVQUkVDQVRFRDogVGhpcyB3aWxsIGJlIHJlbW92ZWQgb24gUVVuaXQgMi4wLjArXG5cdFx0Ly8gU3RvcmVzIHRoZSByZWdpc3RlcmVkIGZ1bmN0aW9ucyBhbGxvd2luZyByZXN0b3Jpbmdcblx0XHQvLyBhdCB2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCkgaWYgbW9kaWZpZWRcblx0XHRsb2dnaW5nQ2FsbGJhY2tzWyBrZXkgXSA9IGxvZ2dpbmdDYWxsYmFjaztcblxuXHRcdHJldHVybiBsb2dnaW5nQ2FsbGJhY2s7XG5cdH1cblxuXHRmb3IgKCBpID0gMCwgbCA9IGNhbGxiYWNrTmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdGtleSA9IGNhbGxiYWNrTmFtZXNbIGkgXTtcblxuXHRcdC8vIEluaXRpYWxpemUga2V5IGNvbGxlY3Rpb24gb2YgbG9nZ2luZyBjYWxsYmFja1xuXHRcdGlmICggb2JqZWN0VHlwZSggY29uZmlnLmNhbGxiYWNrc1sga2V5IF0gKSA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdGNvbmZpZy5jYWxsYmFja3NbIGtleSBdID0gW107XG5cdFx0fVxuXG5cdFx0b2JqWyBrZXkgXSA9IHJlZ2lzdGVyTG9nZ2luZ0NhbGxiYWNrKCBrZXkgKTtcblx0fVxufVxuXG5mdW5jdGlvbiBydW5Mb2dnaW5nQ2FsbGJhY2tzKCBrZXksIGFyZ3MgKSB7XG5cdHZhciBpLCBsLCBjYWxsYmFja3M7XG5cblx0Y2FsbGJhY2tzID0gY29uZmlnLmNhbGxiYWNrc1sga2V5IF07XG5cdGZvciAoIGkgPSAwLCBsID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRjYWxsYmFja3NbIGkgXSggYXJncyApO1xuXHR9XG59XG5cbi8vIERFUFJFQ0FURUQ6IFRoaXMgd2lsbCBiZSByZW1vdmVkIG9uIDIuMC4wK1xuLy8gVGhpcyBmdW5jdGlvbiB2ZXJpZmllcyBpZiB0aGUgbG9nZ2luZ0NhbGxiYWNrcyB3ZXJlIG1vZGlmaWVkIGJ5IHRoZSB1c2VyXG4vLyBJZiBzbywgaXQgd2lsbCByZXN0b3JlIGl0LCBhc3NpZ24gdGhlIGdpdmVuIGNhbGxiYWNrIGFuZCBwcmludCBhIGNvbnNvbGUgd2FybmluZ1xuZnVuY3Rpb24gdmVyaWZ5TG9nZ2luZ0NhbGxiYWNrcygpIHtcblx0dmFyIGxvZ2dpbmdDYWxsYmFjaywgdXNlckNhbGxiYWNrO1xuXG5cdGZvciAoIGxvZ2dpbmdDYWxsYmFjayBpbiBsb2dnaW5nQ2FsbGJhY2tzICkge1xuXHRcdGlmICggUVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdICE9PSBsb2dnaW5nQ2FsbGJhY2tzWyBsb2dnaW5nQ2FsbGJhY2sgXSApIHtcblxuXHRcdFx0dXNlckNhbGxiYWNrID0gUVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdO1xuXG5cdFx0XHQvLyBSZXN0b3JlIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuXHRcdFx0UVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdID0gbG9nZ2luZ0NhbGxiYWNrc1sgbG9nZ2luZ0NhbGxiYWNrIF07XG5cblx0XHRcdC8vIEFzc2lnbiB0aGUgZGVwcmVjYXRlZCBnaXZlbiBjYWxsYmFja1xuXHRcdFx0UVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdKCB1c2VyQ2FsbGJhY2sgKTtcblxuXHRcdFx0aWYgKCBnbG9iYWwuY29uc29sZSAmJiBnbG9iYWwuY29uc29sZS53YXJuICkge1xuXHRcdFx0XHRnbG9iYWwuY29uc29sZS53YXJuKFxuXHRcdFx0XHRcdFwiUVVuaXQuXCIgKyBsb2dnaW5nQ2FsbGJhY2sgKyBcIiB3YXMgcmVwbGFjZWQgd2l0aCBhIG5ldyB2YWx1ZS5cXG5cIiArXG5cdFx0XHRcdFx0XCJQbGVhc2UsIGNoZWNrIG91dCB0aGUgZG9jdW1lbnRhdGlvbiBvbiBob3cgdG8gYXBwbHkgbG9nZ2luZyBjYWxsYmFja3MuXFxuXCIgK1xuXHRcdFx0XHRcdFwiUmVmZXJlbmNlOiBodHRwczovL2FwaS5xdW5pdGpzLmNvbS9jYXRlZ29yeS9jYWxsYmFja3MvXCJcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuKCBmdW5jdGlvbigpIHtcblx0aWYgKCAhZGVmaW5lZC5kb2N1bWVudCApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBgb25FcnJvckZuUHJldmAgaW5pdGlhbGl6ZWQgYXQgdG9wIG9mIHNjb3BlXG5cdC8vIFByZXNlcnZlIG90aGVyIGhhbmRsZXJzXG5cdHZhciBvbkVycm9yRm5QcmV2ID0gd2luZG93Lm9uZXJyb3I7XG5cblx0Ly8gQ292ZXIgdW5jYXVnaHQgZXhjZXB0aW9uc1xuXHQvLyBSZXR1cm5pbmcgdHJ1ZSB3aWxsIHN1cHByZXNzIHRoZSBkZWZhdWx0IGJyb3dzZXIgaGFuZGxlcixcblx0Ly8gcmV0dXJuaW5nIGZhbHNlIHdpbGwgbGV0IGl0IHJ1bi5cblx0d2luZG93Lm9uZXJyb3IgPSBmdW5jdGlvbiggZXJyb3IsIGZpbGVQYXRoLCBsaW5lck5yICkge1xuXHRcdHZhciByZXQgPSBmYWxzZTtcblx0XHRpZiAoIG9uRXJyb3JGblByZXYgKSB7XG5cdFx0XHRyZXQgPSBvbkVycm9yRm5QcmV2KCBlcnJvciwgZmlsZVBhdGgsIGxpbmVyTnIgKTtcblx0XHR9XG5cblx0XHQvLyBUcmVhdCByZXR1cm4gdmFsdWUgYXMgd2luZG93Lm9uZXJyb3IgaXRzZWxmIGRvZXMsXG5cdFx0Ly8gT25seSBkbyBvdXIgaGFuZGxpbmcgaWYgbm90IHN1cHByZXNzZWQuXG5cdFx0aWYgKCByZXQgIT09IHRydWUgKSB7XG5cdFx0XHRpZiAoIFFVbml0LmNvbmZpZy5jdXJyZW50ICkge1xuXHRcdFx0XHRpZiAoIFFVbml0LmNvbmZpZy5jdXJyZW50Lmlnbm9yZUdsb2JhbEVycm9ycyApIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZSggZXJyb3IsIGZpbGVQYXRoICsgXCI6XCIgKyBsaW5lck5yICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRRVW5pdC50ZXN0KCBcImdsb2JhbCBmYWlsdXJlXCIsIGV4dGVuZChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZSggZXJyb3IsIGZpbGVQYXRoICsgXCI6XCIgKyBsaW5lck5yICk7XG5cdFx0XHRcdH0sIHsgdmFsaWRUZXN0OiB0cnVlIH0gKSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXQ7XG5cdH07XG59ICkoKTtcblxuUVVuaXQudXJsUGFyYW1zID0gdXJsUGFyYW1zO1xuXG4vLyBGaWd1cmUgb3V0IGlmIHdlJ3JlIHJ1bm5pbmcgdGhlIHRlc3RzIGZyb20gYSBzZXJ2ZXIgb3Igbm90XG5RVW5pdC5pc0xvY2FsID0gISggZGVmaW5lZC5kb2N1bWVudCAmJiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgIT09IFwiZmlsZTpcIiApO1xuXG4vLyBFeHBvc2UgdGhlIGN1cnJlbnQgUVVuaXQgdmVyc2lvblxuUVVuaXQudmVyc2lvbiA9IFwiMS4yMS4wXCI7XG5cbmV4dGVuZCggUVVuaXQsIHtcblxuXHQvLyBjYWxsIG9uIHN0YXJ0IG9mIG1vZHVsZSB0ZXN0IHRvIHByZXBlbmQgbmFtZSB0byBhbGwgdGVzdHNcblx0bW9kdWxlOiBmdW5jdGlvbiggbmFtZSwgdGVzdEVudmlyb25tZW50LCBleGVjdXRlTm93ICkge1xuXHRcdHZhciBtb2R1bGUsIG1vZHVsZUZucztcblx0XHR2YXIgY3VycmVudE1vZHVsZSA9IGNvbmZpZy5jdXJyZW50TW9kdWxlO1xuXG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdFx0aWYgKCB0ZXN0RW52aXJvbm1lbnQgaW5zdGFuY2VvZiBGdW5jdGlvbiApIHtcblx0XHRcdFx0ZXhlY3V0ZU5vdyA9IHRlc3RFbnZpcm9ubWVudDtcblx0XHRcdFx0dGVzdEVudmlyb25tZW50ID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIERFUFJFQ0FURUQ6IGhhbmRsZXMgc2V0dXAvdGVhcmRvd24gZnVuY3Rpb25zLFxuXHRcdC8vIGJlZm9yZUVhY2ggYW5kIGFmdGVyRWFjaCBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkXG5cdFx0aWYgKCB0ZXN0RW52aXJvbm1lbnQgJiYgdGVzdEVudmlyb25tZW50LnNldHVwICkge1xuXHRcdFx0dGVzdEVudmlyb25tZW50LmJlZm9yZUVhY2ggPSB0ZXN0RW52aXJvbm1lbnQuc2V0dXA7XG5cdFx0XHRkZWxldGUgdGVzdEVudmlyb25tZW50LnNldHVwO1xuXHRcdH1cblx0XHRpZiAoIHRlc3RFbnZpcm9ubWVudCAmJiB0ZXN0RW52aXJvbm1lbnQudGVhcmRvd24gKSB7XG5cdFx0XHR0ZXN0RW52aXJvbm1lbnQuYWZ0ZXJFYWNoID0gdGVzdEVudmlyb25tZW50LnRlYXJkb3duO1xuXHRcdFx0ZGVsZXRlIHRlc3RFbnZpcm9ubWVudC50ZWFyZG93bjtcblx0XHR9XG5cblx0XHRtb2R1bGUgPSBjcmVhdGVNb2R1bGUoKTtcblxuXHRcdG1vZHVsZUZucyA9IHtcblx0XHRcdGJlZm9yZUVhY2g6IHNldEhvb2soIG1vZHVsZSwgXCJiZWZvcmVFYWNoXCIgKSxcblx0XHRcdGFmdGVyRWFjaDogc2V0SG9vayggbW9kdWxlLCBcImFmdGVyRWFjaFwiIClcblx0XHR9O1xuXG5cdFx0aWYgKCBleGVjdXRlTm93IGluc3RhbmNlb2YgRnVuY3Rpb24gKSB7XG5cdFx0XHRjb25maWcubW9kdWxlU3RhY2sucHVzaCggbW9kdWxlICk7XG5cdFx0XHRzZXRDdXJyZW50TW9kdWxlKCBtb2R1bGUgKTtcblx0XHRcdGV4ZWN1dGVOb3cuY2FsbCggbW9kdWxlLnRlc3RFbnZpcm9ubWVudCwgbW9kdWxlRm5zICk7XG5cdFx0XHRjb25maWcubW9kdWxlU3RhY2sucG9wKCk7XG5cdFx0XHRtb2R1bGUgPSBtb2R1bGUucGFyZW50TW9kdWxlIHx8IGN1cnJlbnRNb2R1bGU7XG5cdFx0fVxuXG5cdFx0c2V0Q3VycmVudE1vZHVsZSggbW9kdWxlICk7XG5cblx0XHRmdW5jdGlvbiBjcmVhdGVNb2R1bGUoKSB7XG5cdFx0XHR2YXIgcGFyZW50TW9kdWxlID0gY29uZmlnLm1vZHVsZVN0YWNrLmxlbmd0aCA/XG5cdFx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5zbGljZSggLTEgKVsgMCBdIDogbnVsbDtcblx0XHRcdHZhciBtb2R1bGVOYW1lID0gcGFyZW50TW9kdWxlICE9PSBudWxsID9cblx0XHRcdFx0WyBwYXJlbnRNb2R1bGUubmFtZSwgbmFtZSBdLmpvaW4oIFwiID4gXCIgKSA6IG5hbWU7XG5cdFx0XHR2YXIgbW9kdWxlID0ge1xuXHRcdFx0XHRuYW1lOiBtb2R1bGVOYW1lLFxuXHRcdFx0XHRwYXJlbnRNb2R1bGU6IHBhcmVudE1vZHVsZSxcblx0XHRcdFx0dGVzdHM6IFtdXG5cdFx0XHR9O1xuXG5cdFx0XHR2YXIgZW52ID0ge307XG5cdFx0XHRpZiAoIHBhcmVudE1vZHVsZSApIHtcblx0XHRcdFx0ZXh0ZW5kKCBlbnYsIHBhcmVudE1vZHVsZS50ZXN0RW52aXJvbm1lbnQgKTtcblx0XHRcdFx0ZGVsZXRlIGVudi5iZWZvcmVFYWNoO1xuXHRcdFx0XHRkZWxldGUgZW52LmFmdGVyRWFjaDtcblx0XHRcdH1cblx0XHRcdGV4dGVuZCggZW52LCB0ZXN0RW52aXJvbm1lbnQgKTtcblx0XHRcdG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgPSBlbnY7XG5cblx0XHRcdGNvbmZpZy5tb2R1bGVzLnB1c2goIG1vZHVsZSApO1xuXHRcdFx0cmV0dXJuIG1vZHVsZTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXRDdXJyZW50TW9kdWxlKCBtb2R1bGUgKSB7XG5cdFx0XHRjb25maWcuY3VycmVudE1vZHVsZSA9IG1vZHVsZTtcblx0XHR9XG5cblx0fSxcblxuXHQvLyBERVBSRUNBVEVEOiBRVW5pdC5hc3luY1Rlc3QoKSB3aWxsIGJlIHJlbW92ZWQgaW4gUVVuaXQgMi4wLlxuXHRhc3luY1Rlc3Q6IGFzeW5jVGVzdCxcblxuXHR0ZXN0OiB0ZXN0LFxuXG5cdHNraXA6IHNraXAsXG5cblx0b25seTogb25seSxcblxuXHQvLyBERVBSRUNBVEVEOiBUaGUgZnVuY3Rpb25hbGl0eSBvZiBRVW5pdC5zdGFydCgpIHdpbGwgYmUgYWx0ZXJlZCBpbiBRVW5pdCAyLjAuXG5cdC8vIEluIFFVbml0IDIuMCwgaW52b2tpbmcgaXQgd2lsbCBPTkxZIGFmZmVjdCB0aGUgYFFVbml0LmNvbmZpZy5hdXRvc3RhcnRgIGJsb2NraW5nIGJlaGF2aW9yLlxuXHRzdGFydDogZnVuY3Rpb24oIGNvdW50ICkge1xuXHRcdHZhciBnbG9iYWxTdGFydEFscmVhZHlDYWxsZWQgPSBnbG9iYWxTdGFydENhbGxlZDtcblxuXHRcdGlmICggIWNvbmZpZy5jdXJyZW50ICkge1xuXHRcdFx0Z2xvYmFsU3RhcnRDYWxsZWQgPSB0cnVlO1xuXG5cdFx0XHRpZiAoIHJ1blN0YXJ0ZWQgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RhcnQoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0IHdoaWxlIGFscmVhZHkgc3RhcnRlZFwiICk7XG5cdFx0XHR9IGVsc2UgaWYgKCBnbG9iYWxTdGFydEFscmVhZHlDYWxsZWQgfHwgY291bnQgPiAxICkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiQ2FsbGVkIHN0YXJ0KCkgb3V0c2lkZSBvZiBhIHRlc3QgY29udGV4dCB0b28gbWFueSB0aW1lc1wiICk7XG5cdFx0XHR9IGVsc2UgaWYgKCBjb25maWcuYXV0b3N0YXJ0ICkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiQ2FsbGVkIHN0YXJ0KCkgb3V0c2lkZSBvZiBhIHRlc3QgY29udGV4dCB3aGVuIFwiICtcblx0XHRcdFx0XHRcIlFVbml0LmNvbmZpZy5hdXRvc3RhcnQgd2FzIHRydWVcIiApO1xuXHRcdFx0fSBlbHNlIGlmICggIWNvbmZpZy5wYWdlTG9hZGVkICkge1xuXG5cdFx0XHRcdC8vIFRoZSBwYWdlIGlzbid0IGNvbXBsZXRlbHkgbG9hZGVkIHlldCwgc28gYmFpbCBvdXQgYW5kIGxldCBgUVVuaXQubG9hZGAgaGFuZGxlIGl0XG5cdFx0XHRcdGNvbmZpZy5hdXRvc3RhcnQgPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0Ly8gSWYgYSB0ZXN0IGlzIHJ1bm5pbmcsIGFkanVzdCBpdHMgc2VtYXBob3JlXG5cdFx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgLT0gY291bnQgfHwgMTtcblxuXHRcdFx0Ly8gSWYgc2VtYXBob3JlIGlzIG5vbi1udW1lcmljLCB0aHJvdyBlcnJvclxuXHRcdFx0aWYgKCBpc05hTiggY29uZmlnLmN1cnJlbnQuc2VtYXBob3JlICkgKSB7XG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA9IDA7XG5cblx0XHRcdFx0UVVuaXQucHVzaEZhaWx1cmUoXG5cdFx0XHRcdFx0XCJDYWxsZWQgc3RhcnQoKSB3aXRoIGEgbm9uLW51bWVyaWMgZGVjcmVtZW50LlwiLFxuXHRcdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyIClcblx0XHRcdFx0KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEb24ndCBzdGFydCB1bnRpbCBlcXVhbCBudW1iZXIgb2Ygc3RvcC1jYWxsc1xuXHRcdFx0aWYgKCBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPiAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRocm93IGFuIEVycm9yIGlmIHN0YXJ0IGlzIGNhbGxlZCBtb3JlIG9mdGVuIHRoYW4gc3RvcFxuXHRcdFx0aWYgKCBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPCAwICkge1xuXHRcdFx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPSAwO1xuXG5cdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKFxuXHRcdFx0XHRcdFwiQ2FsbGVkIHN0YXJ0KCkgd2hpbGUgYWxyZWFkeSBzdGFydGVkICh0ZXN0J3Mgc2VtYXBob3JlIHdhcyAwIGFscmVhZHkpXCIsXG5cdFx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmVzdW1lUHJvY2Vzc2luZygpO1xuXHR9LFxuXG5cdC8vIERFUFJFQ0FURUQ6IFFVbml0LnN0b3AoKSB3aWxsIGJlIHJlbW92ZWQgaW4gUVVuaXQgMi4wLlxuXHRzdG9wOiBmdW5jdGlvbiggY291bnQgKSB7XG5cblx0XHQvLyBJZiB0aGVyZSBpc24ndCBhIHRlc3QgcnVubmluZywgZG9uJ3QgYWxsb3cgUVVuaXQuc3RvcCgpIHRvIGJlIGNhbGxlZFxuXHRcdGlmICggIWNvbmZpZy5jdXJyZW50ICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIkNhbGxlZCBzdG9wKCkgb3V0c2lkZSBvZiBhIHRlc3QgY29udGV4dFwiICk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgYSB0ZXN0IGlzIHJ1bm5pbmcsIGFkanVzdCBpdHMgc2VtYXBob3JlXG5cdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlICs9IGNvdW50IHx8IDE7XG5cblx0XHRwYXVzZVByb2Nlc3NpbmcoKTtcblx0fSxcblxuXHRjb25maWc6IGNvbmZpZyxcblxuXHRpczogaXMsXG5cblx0b2JqZWN0VHlwZTogb2JqZWN0VHlwZSxcblxuXHRleHRlbmQ6IGV4dGVuZCxcblxuXHRsb2FkOiBmdW5jdGlvbigpIHtcblx0XHRjb25maWcucGFnZUxvYWRlZCA9IHRydWU7XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnNcblx0XHRleHRlbmQoIGNvbmZpZywge1xuXHRcdFx0c3RhdHM6IHsgYWxsOiAwLCBiYWQ6IDAgfSxcblx0XHRcdG1vZHVsZVN0YXRzOiB7IGFsbDogMCwgYmFkOiAwIH0sXG5cdFx0XHRzdGFydGVkOiAwLFxuXHRcdFx0dXBkYXRlUmF0ZTogMTAwMCxcblx0XHRcdGF1dG9zdGFydDogdHJ1ZSxcblx0XHRcdGZpbHRlcjogXCJcIlxuXHRcdH0sIHRydWUgKTtcblxuXHRcdGNvbmZpZy5ibG9ja2luZyA9IGZhbHNlO1xuXG5cdFx0aWYgKCBjb25maWcuYXV0b3N0YXJ0ICkge1xuXHRcdFx0cmVzdW1lUHJvY2Vzc2luZygpO1xuXHRcdH1cblx0fSxcblxuXHRzdGFjazogZnVuY3Rpb24oIG9mZnNldCApIHtcblx0XHRvZmZzZXQgPSAoIG9mZnNldCB8fCAwICkgKyAyO1xuXHRcdHJldHVybiBzb3VyY2VGcm9tU3RhY2t0cmFjZSggb2Zmc2V0ICk7XG5cdH1cbn0pO1xuXG5yZWdpc3RlckxvZ2dpbmdDYWxsYmFja3MoIFFVbml0ICk7XG5cbmZ1bmN0aW9uIGJlZ2luKCkge1xuXHR2YXIgaSwgbCxcblx0XHRtb2R1bGVzTG9nID0gW107XG5cblx0Ly8gSWYgdGhlIHRlc3QgcnVuIGhhc24ndCBvZmZpY2lhbGx5IGJlZ3VuIHlldFxuXHRpZiAoICFjb25maWcuc3RhcnRlZCApIHtcblxuXHRcdC8vIFJlY29yZCB0aGUgdGltZSBvZiB0aGUgdGVzdCBydW4ncyBiZWdpbm5pbmdcblx0XHRjb25maWcuc3RhcnRlZCA9IG5vdygpO1xuXG5cdFx0dmVyaWZ5TG9nZ2luZ0NhbGxiYWNrcygpO1xuXG5cdFx0Ly8gRGVsZXRlIHRoZSBsb29zZSB1bm5hbWVkIG1vZHVsZSBpZiB1bnVzZWQuXG5cdFx0aWYgKCBjb25maWcubW9kdWxlc1sgMCBdLm5hbWUgPT09IFwiXCIgJiYgY29uZmlnLm1vZHVsZXNbIDAgXS50ZXN0cy5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRjb25maWcubW9kdWxlcy5zaGlmdCgpO1xuXHRcdH1cblxuXHRcdC8vIEF2b2lkIHVubmVjZXNzYXJ5IGluZm9ybWF0aW9uIGJ5IG5vdCBsb2dnaW5nIG1vZHVsZXMnIHRlc3QgZW52aXJvbm1lbnRzXG5cdFx0Zm9yICggaSA9IDAsIGwgPSBjb25maWcubW9kdWxlcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRtb2R1bGVzTG9nLnB1c2goe1xuXHRcdFx0XHRuYW1lOiBjb25maWcubW9kdWxlc1sgaSBdLm5hbWUsXG5cdFx0XHRcdHRlc3RzOiBjb25maWcubW9kdWxlc1sgaSBdLnRlc3RzXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBUaGUgdGVzdCBydW4gaXMgb2ZmaWNpYWxseSBiZWdpbm5pbmcgbm93XG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJiZWdpblwiLCB7XG5cdFx0XHR0b3RhbFRlc3RzOiBUZXN0LmNvdW50LFxuXHRcdFx0bW9kdWxlczogbW9kdWxlc0xvZ1xuXHRcdH0pO1xuXHR9XG5cblx0Y29uZmlnLmJsb2NraW5nID0gZmFsc2U7XG5cdHByb2Nlc3MoIHRydWUgKTtcbn1cblxuZnVuY3Rpb24gcHJvY2VzcyggbGFzdCApIHtcblx0ZnVuY3Rpb24gbmV4dCgpIHtcblx0XHRwcm9jZXNzKCBsYXN0ICk7XG5cdH1cblx0dmFyIHN0YXJ0ID0gbm93KCk7XG5cdGNvbmZpZy5kZXB0aCA9ICggY29uZmlnLmRlcHRoIHx8IDAgKSArIDE7XG5cblx0d2hpbGUgKCBjb25maWcucXVldWUubGVuZ3RoICYmICFjb25maWcuYmxvY2tpbmcgKSB7XG5cdFx0aWYgKCAhZGVmaW5lZC5zZXRUaW1lb3V0IHx8IGNvbmZpZy51cGRhdGVSYXRlIDw9IDAgfHxcblx0XHRcdFx0KCAoIG5vdygpIC0gc3RhcnQgKSA8IGNvbmZpZy51cGRhdGVSYXRlICkgKSB7XG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50ICkge1xuXG5cdFx0XHRcdC8vIFJlc2V0IGFzeW5jIHRyYWNraW5nIGZvciBlYWNoIHBoYXNlIG9mIHRoZSBUZXN0IGxpZmVjeWNsZVxuXHRcdFx0XHRjb25maWcuY3VycmVudC51c2VkQXN5bmMgPSBmYWxzZTtcblx0XHRcdH1cblx0XHRcdGNvbmZpZy5xdWV1ZS5zaGlmdCgpKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNldFRpbWVvdXQoIG5leHQsIDEzICk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblx0Y29uZmlnLmRlcHRoLS07XG5cdGlmICggbGFzdCAmJiAhY29uZmlnLmJsb2NraW5nICYmICFjb25maWcucXVldWUubGVuZ3RoICYmIGNvbmZpZy5kZXB0aCA9PT0gMCApIHtcblx0XHRkb25lKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcGF1c2VQcm9jZXNzaW5nKCkge1xuXHRjb25maWcuYmxvY2tpbmcgPSB0cnVlO1xuXG5cdGlmICggY29uZmlnLnRlc3RUaW1lb3V0ICYmIGRlZmluZWQuc2V0VGltZW91dCApIHtcblx0XHRjbGVhclRpbWVvdXQoIGNvbmZpZy50aW1lb3V0ICk7XG5cdFx0Y29uZmlnLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBjb25maWcuY3VycmVudCApIHtcblx0XHRcdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID0gMDtcblx0XHRcdFx0UVVuaXQucHVzaEZhaWx1cmUoIFwiVGVzdCB0aW1lZCBvdXRcIiwgc291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIlRlc3QgdGltZWQgb3V0XCIgKTtcblx0XHRcdH1cblx0XHRcdHJlc3VtZVByb2Nlc3NpbmcoKTtcblx0XHR9LCBjb25maWcudGVzdFRpbWVvdXQgKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZXN1bWVQcm9jZXNzaW5nKCkge1xuXHRydW5TdGFydGVkID0gdHJ1ZTtcblxuXHQvLyBBIHNsaWdodCBkZWxheSB0byBhbGxvdyB0aGlzIGl0ZXJhdGlvbiBvZiB0aGUgZXZlbnQgbG9vcCB0byBmaW5pc2ggKG1vcmUgYXNzZXJ0aW9ucywgZXRjLilcblx0aWYgKCBkZWZpbmVkLnNldFRpbWVvdXQgKSB7XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdGlmICggY29uZmlnLmN1cnJlbnQgJiYgY29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID4gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBjb25maWcudGltZW91dCApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KCBjb25maWcudGltZW91dCApO1xuXHRcdFx0fVxuXG5cdFx0XHRiZWdpbigpO1xuXHRcdH0sIDEzICk7XG5cdH0gZWxzZSB7XG5cdFx0YmVnaW4oKTtcblx0fVxufVxuXG5mdW5jdGlvbiBkb25lKCkge1xuXHR2YXIgcnVudGltZSwgcGFzc2VkO1xuXG5cdGNvbmZpZy5hdXRvcnVuID0gdHJ1ZTtcblxuXHQvLyBMb2cgdGhlIGxhc3QgbW9kdWxlIHJlc3VsdHNcblx0aWYgKCBjb25maWcucHJldmlvdXNNb2R1bGUgKSB7XG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJtb2R1bGVEb25lXCIsIHtcblx0XHRcdG5hbWU6IGNvbmZpZy5wcmV2aW91c01vZHVsZS5uYW1lLFxuXHRcdFx0dGVzdHM6IGNvbmZpZy5wcmV2aW91c01vZHVsZS50ZXN0cyxcblx0XHRcdGZhaWxlZDogY29uZmlnLm1vZHVsZVN0YXRzLmJhZCxcblx0XHRcdHBhc3NlZDogY29uZmlnLm1vZHVsZVN0YXRzLmFsbCAtIGNvbmZpZy5tb2R1bGVTdGF0cy5iYWQsXG5cdFx0XHR0b3RhbDogY29uZmlnLm1vZHVsZVN0YXRzLmFsbCxcblx0XHRcdHJ1bnRpbWU6IG5vdygpIC0gY29uZmlnLm1vZHVsZVN0YXRzLnN0YXJ0ZWRcblx0XHR9KTtcblx0fVxuXHRkZWxldGUgY29uZmlnLnByZXZpb3VzTW9kdWxlO1xuXG5cdHJ1bnRpbWUgPSBub3coKSAtIGNvbmZpZy5zdGFydGVkO1xuXHRwYXNzZWQgPSBjb25maWcuc3RhdHMuYWxsIC0gY29uZmlnLnN0YXRzLmJhZDtcblxuXHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcImRvbmVcIiwge1xuXHRcdGZhaWxlZDogY29uZmlnLnN0YXRzLmJhZCxcblx0XHRwYXNzZWQ6IHBhc3NlZCxcblx0XHR0b3RhbDogY29uZmlnLnN0YXRzLmFsbCxcblx0XHRydW50aW1lOiBydW50aW1lXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRIb29rKCBtb2R1bGUsIGhvb2tOYW1lICkge1xuXHRpZiAoIG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgPT09IHVuZGVmaW5lZCApIHtcblx0XHRtb2R1bGUudGVzdEVudmlyb25tZW50ID0ge307XG5cdH1cblxuXHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuXHRcdG1vZHVsZS50ZXN0RW52aXJvbm1lbnRbIGhvb2tOYW1lIF0gPSBjYWxsYmFjaztcblx0fTtcbn1cblxudmFyIGZvY3VzZWQgPSBmYWxzZTtcbnZhciBwcmlvcml0eUNvdW50ID0gMDtcblxuZnVuY3Rpb24gVGVzdCggc2V0dGluZ3MgKSB7XG5cdHZhciBpLCBsO1xuXG5cdCsrVGVzdC5jb3VudDtcblxuXHRleHRlbmQoIHRoaXMsIHNldHRpbmdzICk7XG5cdHRoaXMuYXNzZXJ0aW9ucyA9IFtdO1xuXHR0aGlzLnNlbWFwaG9yZSA9IDA7XG5cdHRoaXMudXNlZEFzeW5jID0gZmFsc2U7XG5cdHRoaXMubW9kdWxlID0gY29uZmlnLmN1cnJlbnRNb2R1bGU7XG5cdHRoaXMuc3RhY2sgPSBzb3VyY2VGcm9tU3RhY2t0cmFjZSggMyApO1xuXG5cdC8vIFJlZ2lzdGVyIHVuaXF1ZSBzdHJpbmdzXG5cdGZvciAoIGkgPSAwLCBsID0gdGhpcy5tb2R1bGUudGVzdHM7IGkgPCBsLmxlbmd0aDsgaSsrICkge1xuXHRcdGlmICggdGhpcy5tb2R1bGUudGVzdHNbIGkgXS5uYW1lID09PSB0aGlzLnRlc3ROYW1lICkge1xuXHRcdFx0dGhpcy50ZXN0TmFtZSArPSBcIiBcIjtcblx0XHR9XG5cdH1cblxuXHR0aGlzLnRlc3RJZCA9IGdlbmVyYXRlSGFzaCggdGhpcy5tb2R1bGUubmFtZSwgdGhpcy50ZXN0TmFtZSApO1xuXG5cdHRoaXMubW9kdWxlLnRlc3RzLnB1c2goe1xuXHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0dGVzdElkOiB0aGlzLnRlc3RJZFxuXHR9KTtcblxuXHRpZiAoIHNldHRpbmdzLnNraXAgKSB7XG5cblx0XHQvLyBTa2lwcGVkIHRlc3RzIHdpbGwgZnVsbHkgaWdub3JlIGFueSBzZW50IGNhbGxiYWNrXG5cdFx0dGhpcy5jYWxsYmFjayA9IGZ1bmN0aW9uKCkge307XG5cdFx0dGhpcy5hc3luYyA9IGZhbHNlO1xuXHRcdHRoaXMuZXhwZWN0ZWQgPSAwO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuYXNzZXJ0ID0gbmV3IEFzc2VydCggdGhpcyApO1xuXHR9XG59XG5cblRlc3QuY291bnQgPSAwO1xuXG5UZXN0LnByb3RvdHlwZSA9IHtcblx0YmVmb3JlOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoXG5cblx0XHRcdC8vIEVtaXQgbW9kdWxlU3RhcnQgd2hlbiB3ZSdyZSBzd2l0Y2hpbmcgZnJvbSBvbmUgbW9kdWxlIHRvIGFub3RoZXJcblx0XHRcdHRoaXMubW9kdWxlICE9PSBjb25maWcucHJldmlvdXNNb2R1bGUgfHxcblxuXHRcdFx0XHQvLyBUaGV5IGNvdWxkIGJlIGVxdWFsIChib3RoIHVuZGVmaW5lZCkgYnV0IGlmIHRoZSBwcmV2aW91c01vZHVsZSBwcm9wZXJ0eSBkb2Vzbid0XG5cdFx0XHRcdC8vIHlldCBleGlzdCBpdCBtZWFucyB0aGlzIGlzIHRoZSBmaXJzdCB0ZXN0IGluIGEgc3VpdGUgdGhhdCBpc24ndCB3cmFwcGVkIGluIGFcblx0XHRcdFx0Ly8gbW9kdWxlLCBpbiB3aGljaCBjYXNlIHdlJ2xsIGp1c3QgZW1pdCBhIG1vZHVsZVN0YXJ0IGV2ZW50IGZvciAndW5kZWZpbmVkJy5cblx0XHRcdFx0Ly8gV2l0aG91dCB0aGlzLCByZXBvcnRlcnMgY2FuIGdldCB0ZXN0U3RhcnQgYmVmb3JlIG1vZHVsZVN0YXJ0ICB3aGljaCBpcyBhIHByb2JsZW0uXG5cdFx0XHRcdCFoYXNPd24uY2FsbCggY29uZmlnLCBcInByZXZpb3VzTW9kdWxlXCIgKVxuXHRcdCkge1xuXHRcdFx0aWYgKCBoYXNPd24uY2FsbCggY29uZmlnLCBcInByZXZpb3VzTW9kdWxlXCIgKSApIHtcblx0XHRcdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJtb2R1bGVEb25lXCIsIHtcblx0XHRcdFx0XHRuYW1lOiBjb25maWcucHJldmlvdXNNb2R1bGUubmFtZSxcblx0XHRcdFx0XHR0ZXN0czogY29uZmlnLnByZXZpb3VzTW9kdWxlLnRlc3RzLFxuXHRcdFx0XHRcdGZhaWxlZDogY29uZmlnLm1vZHVsZVN0YXRzLmJhZCxcblx0XHRcdFx0XHRwYXNzZWQ6IGNvbmZpZy5tb2R1bGVTdGF0cy5hbGwgLSBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0XHRcdHRvdGFsOiBjb25maWcubW9kdWxlU3RhdHMuYWxsLFxuXHRcdFx0XHRcdHJ1bnRpbWU6IG5vdygpIC0gY29uZmlnLm1vZHVsZVN0YXRzLnN0YXJ0ZWRcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRjb25maWcucHJldmlvdXNNb2R1bGUgPSB0aGlzLm1vZHVsZTtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGF0cyA9IHsgYWxsOiAwLCBiYWQ6IDAsIHN0YXJ0ZWQ6IG5vdygpIH07XG5cdFx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZVN0YXJ0XCIsIHtcblx0XHRcdFx0bmFtZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdFx0dGVzdHM6IHRoaXMubW9kdWxlLnRlc3RzXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25maWcuY3VycmVudCA9IHRoaXM7XG5cblx0XHRpZiAoIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudCApIHtcblx0XHRcdGRlbGV0ZSB0aGlzLm1vZHVsZS50ZXN0RW52aXJvbm1lbnQuYmVmb3JlRWFjaDtcblx0XHRcdGRlbGV0ZSB0aGlzLm1vZHVsZS50ZXN0RW52aXJvbm1lbnQuYWZ0ZXJFYWNoO1xuXHRcdH1cblx0XHR0aGlzLnRlc3RFbnZpcm9ubWVudCA9IGV4dGVuZCgge30sIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudCApO1xuXG5cdFx0dGhpcy5zdGFydGVkID0gbm93KCk7XG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJ0ZXN0U3RhcnRcIiwge1xuXHRcdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHRcdG1vZHVsZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdHRlc3RJZDogdGhpcy50ZXN0SWRcblx0XHR9KTtcblxuXHRcdGlmICggIWNvbmZpZy5wb2xsdXRpb24gKSB7XG5cdFx0XHRzYXZlR2xvYmFsKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHJ1bjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHByb21pc2U7XG5cblx0XHRjb25maWcuY3VycmVudCA9IHRoaXM7XG5cblx0XHRpZiAoIHRoaXMuYXN5bmMgKSB7XG5cdFx0XHRRVW5pdC5zdG9wKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5jYWxsYmFja1N0YXJ0ZWQgPSBub3coKTtcblxuXHRcdGlmICggY29uZmlnLm5vdHJ5Y2F0Y2ggKSB7XG5cdFx0XHRydW5UZXN0KCB0aGlzICk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdHJ1blRlc3QoIHRoaXMgKTtcblx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdHRoaXMucHVzaEZhaWx1cmUoIFwiRGllZCBvbiB0ZXN0ICNcIiArICggdGhpcy5hc3NlcnRpb25zLmxlbmd0aCArIDEgKSArIFwiIFwiICtcblx0XHRcdFx0dGhpcy5zdGFjayArIFwiOiBcIiArICggZS5tZXNzYWdlIHx8IGUgKSwgZXh0cmFjdFN0YWNrdHJhY2UoIGUsIDAgKSApO1xuXG5cdFx0XHQvLyBlbHNlIG5leHQgdGVzdCB3aWxsIGNhcnJ5IHRoZSByZXNwb25zaWJpbGl0eVxuXHRcdFx0c2F2ZUdsb2JhbCgpO1xuXG5cdFx0XHQvLyBSZXN0YXJ0IHRoZSB0ZXN0cyBpZiB0aGV5J3JlIGJsb2NraW5nXG5cdFx0XHRpZiAoIGNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRcdFx0UVVuaXQuc3RhcnQoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBydW5UZXN0KCB0ZXN0ICkge1xuXHRcdFx0cHJvbWlzZSA9IHRlc3QuY2FsbGJhY2suY2FsbCggdGVzdC50ZXN0RW52aXJvbm1lbnQsIHRlc3QuYXNzZXJ0ICk7XG5cdFx0XHR0ZXN0LnJlc29sdmVQcm9taXNlKCBwcm9taXNlICk7XG5cdFx0fVxuXHR9LFxuXG5cdGFmdGVyOiBmdW5jdGlvbigpIHtcblx0XHRjaGVja1BvbGx1dGlvbigpO1xuXHR9LFxuXG5cdHF1ZXVlSG9vazogZnVuY3Rpb24oIGhvb2ssIGhvb2tOYW1lICkge1xuXHRcdHZhciBwcm9taXNlLFxuXHRcdFx0dGVzdCA9IHRoaXM7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uIHJ1bkhvb2soKSB7XG5cdFx0XHRjb25maWcuY3VycmVudCA9IHRlc3Q7XG5cdFx0XHRpZiAoIGNvbmZpZy5ub3RyeWNhdGNoICkge1xuXHRcdFx0XHRjYWxsSG9vaygpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjYWxsSG9vaygpO1xuXHRcdFx0fSBjYXRjaCAoIGVycm9yICkge1xuXHRcdFx0XHR0ZXN0LnB1c2hGYWlsdXJlKCBob29rTmFtZSArIFwiIGZhaWxlZCBvbiBcIiArIHRlc3QudGVzdE5hbWUgKyBcIjogXCIgK1xuXHRcdFx0XHQoIGVycm9yLm1lc3NhZ2UgfHwgZXJyb3IgKSwgZXh0cmFjdFN0YWNrdHJhY2UoIGVycm9yLCAwICkgKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gY2FsbEhvb2soKSB7XG5cdFx0XHRcdHByb21pc2UgPSBob29rLmNhbGwoIHRlc3QudGVzdEVudmlyb25tZW50LCB0ZXN0LmFzc2VydCApO1xuXHRcdFx0XHR0ZXN0LnJlc29sdmVQcm9taXNlKCBwcm9taXNlLCBob29rTmFtZSApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0sXG5cblx0Ly8gQ3VycmVudGx5IG9ubHkgdXNlZCBmb3IgbW9kdWxlIGxldmVsIGhvb2tzLCBjYW4gYmUgdXNlZCB0byBhZGQgZ2xvYmFsIGxldmVsIG9uZXNcblx0aG9va3M6IGZ1bmN0aW9uKCBoYW5kbGVyICkge1xuXHRcdHZhciBob29rcyA9IFtdO1xuXG5cdFx0ZnVuY3Rpb24gcHJvY2Vzc0hvb2tzKCB0ZXN0LCBtb2R1bGUgKSB7XG5cdFx0XHRpZiAoIG1vZHVsZS5wYXJlbnRNb2R1bGUgKSB7XG5cdFx0XHRcdHByb2Nlc3NIb29rcyggdGVzdCwgbW9kdWxlLnBhcmVudE1vZHVsZSApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBtb2R1bGUudGVzdEVudmlyb25tZW50ICYmXG5cdFx0XHRcdFFVbml0Lm9iamVjdFR5cGUoIG1vZHVsZS50ZXN0RW52aXJvbm1lbnRbIGhhbmRsZXIgXSApID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdGhvb2tzLnB1c2goIHRlc3QucXVldWVIb29rKCBtb2R1bGUudGVzdEVudmlyb25tZW50WyBoYW5kbGVyIF0sIGhhbmRsZXIgKSApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEhvb2tzIGFyZSBpZ25vcmVkIG9uIHNraXBwZWQgdGVzdHNcblx0XHRpZiAoICF0aGlzLnNraXAgKSB7XG5cdFx0XHRwcm9jZXNzSG9va3MoIHRoaXMsIHRoaXMubW9kdWxlICk7XG5cdFx0fVxuXHRcdHJldHVybiBob29rcztcblx0fSxcblxuXHRmaW5pc2g6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblx0XHRpZiAoIGNvbmZpZy5yZXF1aXJlRXhwZWN0cyAmJiB0aGlzLmV4cGVjdGVkID09PSBudWxsICkge1xuXHRcdFx0dGhpcy5wdXNoRmFpbHVyZSggXCJFeHBlY3RlZCBudW1iZXIgb2YgYXNzZXJ0aW9ucyB0byBiZSBkZWZpbmVkLCBidXQgZXhwZWN0KCkgd2FzIFwiICtcblx0XHRcdFx0XCJub3QgY2FsbGVkLlwiLCB0aGlzLnN0YWNrICk7XG5cdFx0fSBlbHNlIGlmICggdGhpcy5leHBlY3RlZCAhPT0gbnVsbCAmJiB0aGlzLmV4cGVjdGVkICE9PSB0aGlzLmFzc2VydGlvbnMubGVuZ3RoICkge1xuXHRcdFx0dGhpcy5wdXNoRmFpbHVyZSggXCJFeHBlY3RlZCBcIiArIHRoaXMuZXhwZWN0ZWQgKyBcIiBhc3NlcnRpb25zLCBidXQgXCIgK1xuXHRcdFx0XHR0aGlzLmFzc2VydGlvbnMubGVuZ3RoICsgXCIgd2VyZSBydW5cIiwgdGhpcy5zdGFjayApO1xuXHRcdH0gZWxzZSBpZiAoIHRoaXMuZXhwZWN0ZWQgPT09IG51bGwgJiYgIXRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIGF0IGxlYXN0IG9uZSBhc3NlcnRpb24sIGJ1dCBub25lIHdlcmUgcnVuIC0gY2FsbCBcIiArXG5cdFx0XHRcdFwiZXhwZWN0KDApIHRvIGFjY2VwdCB6ZXJvIGFzc2VydGlvbnMuXCIsIHRoaXMuc3RhY2sgKTtcblx0XHR9XG5cblx0XHR2YXIgaSxcblx0XHRcdGJhZCA9IDA7XG5cblx0XHR0aGlzLnJ1bnRpbWUgPSBub3coKSAtIHRoaXMuc3RhcnRlZDtcblx0XHRjb25maWcuc3RhdHMuYWxsICs9IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7XG5cdFx0Y29uZmlnLm1vZHVsZVN0YXRzLmFsbCArPSB0aGlzLmFzc2VydGlvbnMubGVuZ3RoO1xuXG5cdFx0Zm9yICggaSA9IDA7IGkgPCB0aGlzLmFzc2VydGlvbnMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRpZiAoICF0aGlzLmFzc2VydGlvbnNbIGkgXS5yZXN1bHQgKSB7XG5cdFx0XHRcdGJhZCsrO1xuXHRcdFx0XHRjb25maWcuc3RhdHMuYmFkKys7XG5cdFx0XHRcdGNvbmZpZy5tb2R1bGVTdGF0cy5iYWQrKztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcInRlc3REb25lXCIsIHtcblx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRza2lwcGVkOiAhIXRoaXMuc2tpcCxcblx0XHRcdGZhaWxlZDogYmFkLFxuXHRcdFx0cGFzc2VkOiB0aGlzLmFzc2VydGlvbnMubGVuZ3RoIC0gYmFkLFxuXHRcdFx0dG90YWw6IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGgsXG5cdFx0XHRydW50aW1lOiB0aGlzLnJ1bnRpbWUsXG5cblx0XHRcdC8vIEhUTUwgUmVwb3J0ZXIgdXNlXG5cdFx0XHRhc3NlcnRpb25zOiB0aGlzLmFzc2VydGlvbnMsXG5cdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkLFxuXG5cdFx0XHQvLyBTb3VyY2Ugb2YgVGVzdFxuXHRcdFx0c291cmNlOiB0aGlzLnN0YWNrLFxuXG5cdFx0XHQvLyBERVBSRUNBVEVEOiB0aGlzIHByb3BlcnR5IHdpbGwgYmUgcmVtb3ZlZCBpbiAyLjAuMCwgdXNlIHJ1bnRpbWUgaW5zdGVhZFxuXHRcdFx0ZHVyYXRpb246IHRoaXMucnVudGltZVxuXHRcdH0pO1xuXG5cdFx0Ly8gUVVuaXQucmVzZXQoKSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlcGxhY2VkIGZvciBhIG5ld1xuXHRcdC8vIGZpeHR1cmUgcmVzZXQgZnVuY3Rpb24gb24gUVVuaXQgMi4wLzIuMS5cblx0XHQvLyBJdCdzIHN0aWxsIGNhbGxlZCBoZXJlIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBoYW5kbGluZ1xuXHRcdFFVbml0LnJlc2V0KCk7XG5cblx0XHRjb25maWcuY3VycmVudCA9IHVuZGVmaW5lZDtcblx0fSxcblxuXHRxdWV1ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHByaW9yaXR5LFxuXHRcdFx0dGVzdCA9IHRoaXM7XG5cblx0XHRpZiAoICF0aGlzLnZhbGlkKCkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcnVuKCkge1xuXG5cdFx0XHQvLyBlYWNoIG9mIHRoZXNlIGNhbiBieSBhc3luY1xuXHRcdFx0c3luY2hyb25pemUoW1xuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0ZXN0LmJlZm9yZSgpO1xuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHRlc3QuaG9va3MoIFwiYmVmb3JlRWFjaFwiICksXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QucnVuKCk7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0dGVzdC5ob29rcyggXCJhZnRlckVhY2hcIiApLnJldmVyc2UoKSxcblxuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0ZXN0LmFmdGVyKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QuZmluaXNoKCk7XG5cdFx0XHRcdH1cblx0XHRcdF0pO1xuXHRcdH1cblxuXHRcdC8vIFByaW9yaXRpemUgcHJldmlvdXNseSBmYWlsZWQgdGVzdHMsIGRldGVjdGVkIGZyb20gc2Vzc2lvblN0b3JhZ2Vcblx0XHRwcmlvcml0eSA9IFFVbml0LmNvbmZpZy5yZW9yZGVyICYmIGRlZmluZWQuc2Vzc2lvblN0b3JhZ2UgJiZcblx0XHRcdFx0K3Nlc3Npb25TdG9yYWdlLmdldEl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIHRoaXMubW9kdWxlLm5hbWUgKyBcIi1cIiArIHRoaXMudGVzdE5hbWUgKTtcblxuXHRcdHJldHVybiBzeW5jaHJvbml6ZSggcnVuLCBwcmlvcml0eSApO1xuXHR9LFxuXG5cdHB1c2g6IGZ1bmN0aW9uKCByZXN1bHQsIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG5lZ2F0aXZlICkge1xuXHRcdHZhciBzb3VyY2UsXG5cdFx0XHRkZXRhaWxzID0ge1xuXHRcdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRcdHJlc3VsdDogcmVzdWx0LFxuXHRcdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkLFxuXHRcdFx0XHRuZWdhdGl2ZTogbmVnYXRpdmUgfHwgZmFsc2UsXG5cdFx0XHRcdHJ1bnRpbWU6IG5vdygpIC0gdGhpcy5zdGFydGVkXG5cdFx0XHR9O1xuXG5cdFx0aWYgKCAhcmVzdWx0ICkge1xuXHRcdFx0c291cmNlID0gc291cmNlRnJvbVN0YWNrdHJhY2UoKTtcblxuXHRcdFx0aWYgKCBzb3VyY2UgKSB7XG5cdFx0XHRcdGRldGFpbHMuc291cmNlID0gc291cmNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwibG9nXCIsIGRldGFpbHMgKTtcblxuXHRcdHRoaXMuYXNzZXJ0aW9ucy5wdXNoKHtcblx0XHRcdHJlc3VsdDogISFyZXN1bHQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSk7XG5cdH0sXG5cblx0cHVzaEZhaWx1cmU6IGZ1bmN0aW9uKCBtZXNzYWdlLCBzb3VyY2UsIGFjdHVhbCApIHtcblx0XHRpZiAoICEoIHRoaXMgaW5zdGFuY2VvZiBUZXN0ICkgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwicHVzaEZhaWx1cmUoKSBhc3NlcnRpb24gb3V0c2lkZSB0ZXN0IGNvbnRleHQsIHdhcyBcIiArXG5cdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0XHR9XG5cblx0XHR2YXIgZGV0YWlscyA9IHtcblx0XHRcdFx0bW9kdWxlOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0XHRuYW1lOiB0aGlzLnRlc3ROYW1lLFxuXHRcdFx0XHRyZXN1bHQ6IGZhbHNlLFxuXHRcdFx0XHRtZXNzYWdlOiBtZXNzYWdlIHx8IFwiZXJyb3JcIixcblx0XHRcdFx0YWN0dWFsOiBhY3R1YWwgfHwgbnVsbCxcblx0XHRcdFx0dGVzdElkOiB0aGlzLnRlc3RJZCxcblx0XHRcdFx0cnVudGltZTogbm93KCkgLSB0aGlzLnN0YXJ0ZWRcblx0XHRcdH07XG5cblx0XHRpZiAoIHNvdXJjZSApIHtcblx0XHRcdGRldGFpbHMuc291cmNlID0gc291cmNlO1xuXHRcdH1cblxuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwibG9nXCIsIGRldGFpbHMgKTtcblxuXHRcdHRoaXMuYXNzZXJ0aW9ucy5wdXNoKHtcblx0XHRcdHJlc3VsdDogZmFsc2UsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSk7XG5cdH0sXG5cblx0cmVzb2x2ZVByb21pc2U6IGZ1bmN0aW9uKCBwcm9taXNlLCBwaGFzZSApIHtcblx0XHR2YXIgdGhlbiwgbWVzc2FnZSxcblx0XHRcdHRlc3QgPSB0aGlzO1xuXHRcdGlmICggcHJvbWlzZSAhPSBudWxsICkge1xuXHRcdFx0dGhlbiA9IHByb21pc2UudGhlbjtcblx0XHRcdGlmICggUVVuaXQub2JqZWN0VHlwZSggdGhlbiApID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdFFVbml0LnN0b3AoKTtcblx0XHRcdFx0dGhlbi5jYWxsKFxuXHRcdFx0XHRcdHByb21pc2UsXG5cdFx0XHRcdFx0ZnVuY3Rpb24oKSB7IFFVbml0LnN0YXJ0KCk7IH0sXG5cdFx0XHRcdFx0ZnVuY3Rpb24oIGVycm9yICkge1xuXHRcdFx0XHRcdFx0bWVzc2FnZSA9IFwiUHJvbWlzZSByZWplY3RlZCBcIiArXG5cdFx0XHRcdFx0XHRcdCggIXBoYXNlID8gXCJkdXJpbmdcIiA6IHBoYXNlLnJlcGxhY2UoIC9FYWNoJC8sIFwiXCIgKSApICtcblx0XHRcdFx0XHRcdFx0XCIgXCIgKyB0ZXN0LnRlc3ROYW1lICsgXCI6IFwiICsgKCBlcnJvci5tZXNzYWdlIHx8IGVycm9yICk7XG5cdFx0XHRcdFx0XHR0ZXN0LnB1c2hGYWlsdXJlKCBtZXNzYWdlLCBleHRyYWN0U3RhY2t0cmFjZSggZXJyb3IsIDAgKSApO1xuXG5cdFx0XHRcdFx0XHQvLyBlbHNlIG5leHQgdGVzdCB3aWxsIGNhcnJ5IHRoZSByZXNwb25zaWJpbGl0eVxuXHRcdFx0XHRcdFx0c2F2ZUdsb2JhbCgpO1xuXG5cdFx0XHRcdFx0XHQvLyBVbmJsb2NrXG5cdFx0XHRcdFx0XHRRVW5pdC5zdGFydCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0dmFsaWQ6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmaWx0ZXIgPSBjb25maWcuZmlsdGVyLFxuXHRcdFx0cmVnZXhGaWx0ZXIgPSAvXighPylcXC8oW1xcd1xcV10qKVxcLyhpPyQpLy5leGVjKCBmaWx0ZXIgKSxcblx0XHRcdG1vZHVsZSA9IFFVbml0LnVybFBhcmFtcy5tb2R1bGUgJiYgUVVuaXQudXJsUGFyYW1zLm1vZHVsZS50b0xvd2VyQ2FzZSgpLFxuXHRcdFx0ZnVsbE5hbWUgPSAoIHRoaXMubW9kdWxlLm5hbWUgKyBcIjogXCIgKyB0aGlzLnRlc3ROYW1lICk7XG5cblx0XHRmdW5jdGlvbiB0ZXN0SW5Nb2R1bGVDaGFpbiggdGVzdE1vZHVsZSApIHtcblx0XHRcdHZhciB0ZXN0TW9kdWxlTmFtZSA9IHRlc3RNb2R1bGUubmFtZSA/IHRlc3RNb2R1bGUubmFtZS50b0xvd2VyQ2FzZSgpIDogbnVsbDtcblx0XHRcdGlmICggdGVzdE1vZHVsZU5hbWUgPT09IG1vZHVsZSApIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9IGVsc2UgaWYgKCB0ZXN0TW9kdWxlLnBhcmVudE1vZHVsZSApIHtcblx0XHRcdFx0cmV0dXJuIHRlc3RJbk1vZHVsZUNoYWluKCB0ZXN0TW9kdWxlLnBhcmVudE1vZHVsZSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEludGVybmFsbHktZ2VuZXJhdGVkIHRlc3RzIGFyZSBhbHdheXMgdmFsaWRcblx0XHRpZiAoIHRoaXMuY2FsbGJhY2sgJiYgdGhpcy5jYWxsYmFjay52YWxpZFRlc3QgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoIGNvbmZpZy50ZXN0SWQubGVuZ3RoID4gMCAmJiBpbkFycmF5KCB0aGlzLnRlc3RJZCwgY29uZmlnLnRlc3RJZCApIDwgMCApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZiAoIG1vZHVsZSAmJiAhdGVzdEluTW9kdWxlQ2hhaW4oIHRoaXMubW9kdWxlICkgKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYgKCAhZmlsdGVyICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlZ2V4RmlsdGVyID9cblx0XHRcdHRoaXMucmVnZXhGaWx0ZXIoICEhcmVnZXhGaWx0ZXJbMV0sIHJlZ2V4RmlsdGVyWzJdLCByZWdleEZpbHRlclszXSwgZnVsbE5hbWUgKSA6XG5cdFx0XHR0aGlzLnN0cmluZ0ZpbHRlciggZmlsdGVyLCBmdWxsTmFtZSApO1xuXHR9LFxuXG5cdHJlZ2V4RmlsdGVyOiBmdW5jdGlvbiggZXhjbHVkZSwgcGF0dGVybiwgZmxhZ3MsIGZ1bGxOYW1lICkge1xuXHRcdHZhciByZWdleCA9IG5ldyBSZWdFeHAoIHBhdHRlcm4sIGZsYWdzICk7XG5cdFx0dmFyIG1hdGNoID0gcmVnZXgudGVzdCggZnVsbE5hbWUgKTtcblxuXHRcdHJldHVybiBtYXRjaCAhPT0gZXhjbHVkZTtcblx0fSxcblxuXHRzdHJpbmdGaWx0ZXI6IGZ1bmN0aW9uKCBmaWx0ZXIsIGZ1bGxOYW1lICkge1xuXHRcdGZpbHRlciA9IGZpbHRlci50b0xvd2VyQ2FzZSgpO1xuXHRcdGZ1bGxOYW1lID0gZnVsbE5hbWUudG9Mb3dlckNhc2UoKTtcblxuXHRcdHZhciBpbmNsdWRlID0gZmlsdGVyLmNoYXJBdCggMCApICE9PSBcIiFcIjtcblx0XHRpZiAoICFpbmNsdWRlICkge1xuXHRcdFx0ZmlsdGVyID0gZmlsdGVyLnNsaWNlKCAxICk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgdGhlIGZpbHRlciBtYXRjaGVzLCB3ZSBuZWVkIHRvIGhvbm91ciBpbmNsdWRlXG5cdFx0aWYgKCBmdWxsTmFtZS5pbmRleE9mKCBmaWx0ZXIgKSAhPT0gLTEgKSB7XG5cdFx0XHRyZXR1cm4gaW5jbHVkZTtcblx0XHR9XG5cblx0XHQvLyBPdGhlcndpc2UsIGRvIHRoZSBvcHBvc2l0ZVxuXHRcdHJldHVybiAhaW5jbHVkZTtcblx0fVxufTtcblxuLy8gUmVzZXRzIHRoZSB0ZXN0IHNldHVwLiBVc2VmdWwgZm9yIHRlc3RzIHRoYXQgbW9kaWZ5IHRoZSBET00uXG4vKlxuREVQUkVDQVRFRDogVXNlIG11bHRpcGxlIHRlc3RzIGluc3RlYWQgb2YgcmVzZXR0aW5nIGluc2lkZSBhIHRlc3QuXG5Vc2UgdGVzdFN0YXJ0IG9yIHRlc3REb25lIGZvciBjdXN0b20gY2xlYW51cC5cblRoaXMgbWV0aG9kIHdpbGwgdGhyb3cgYW4gZXJyb3IgaW4gMi4wLCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIDIuMVxuKi9cblFVbml0LnJlc2V0ID0gZnVuY3Rpb24oKSB7XG5cblx0Ly8gUmV0dXJuIG9uIG5vbi1icm93c2VyIGVudmlyb25tZW50c1xuXHQvLyBUaGlzIGlzIG5lY2Vzc2FyeSB0byBub3QgYnJlYWsgb24gbm9kZSB0ZXN0c1xuXHRpZiAoICFkZWZpbmVkLmRvY3VtZW50ICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHZhciBmaXh0dXJlID0gZGVmaW5lZC5kb2N1bWVudCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCAmJlxuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwicXVuaXQtZml4dHVyZVwiICk7XG5cblx0aWYgKCBmaXh0dXJlICkge1xuXHRcdGZpeHR1cmUuaW5uZXJIVE1MID0gY29uZmlnLmZpeHR1cmU7XG5cdH1cbn07XG5cblFVbml0LnB1c2hGYWlsdXJlID0gZnVuY3Rpb24oKSB7XG5cdGlmICggIVFVbml0LmNvbmZpZy5jdXJyZW50ICkge1xuXHRcdHRocm93IG5ldyBFcnJvciggXCJwdXNoRmFpbHVyZSgpIGFzc2VydGlvbiBvdXRzaWRlIHRlc3QgY29udGV4dCwgaW4gXCIgK1xuXHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHR9XG5cblx0Ly8gR2V0cyBjdXJyZW50IHRlc3Qgb2JqXG5cdHZhciBjdXJyZW50VGVzdCA9IFFVbml0LmNvbmZpZy5jdXJyZW50O1xuXG5cdHJldHVybiBjdXJyZW50VGVzdC5wdXNoRmFpbHVyZS5hcHBseSggY3VycmVudFRlc3QsIGFyZ3VtZW50cyApO1xufTtcblxuLy8gQmFzZWQgb24gSmF2YSdzIFN0cmluZy5oYXNoQ29kZSwgYSBzaW1wbGUgYnV0IG5vdFxuLy8gcmlnb3JvdXNseSBjb2xsaXNpb24gcmVzaXN0YW50IGhhc2hpbmcgZnVuY3Rpb25cbmZ1bmN0aW9uIGdlbmVyYXRlSGFzaCggbW9kdWxlLCB0ZXN0TmFtZSApIHtcblx0dmFyIGhleCxcblx0XHRpID0gMCxcblx0XHRoYXNoID0gMCxcblx0XHRzdHIgPSBtb2R1bGUgKyBcIlxceDFDXCIgKyB0ZXN0TmFtZSxcblx0XHRsZW4gPSBzdHIubGVuZ3RoO1xuXG5cdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdGhhc2ggID0gKCAoIGhhc2ggPDwgNSApIC0gaGFzaCApICsgc3RyLmNoYXJDb2RlQXQoIGkgKTtcblx0XHRoYXNoIHw9IDA7XG5cdH1cblxuXHQvLyBDb252ZXJ0IHRoZSBwb3NzaWJseSBuZWdhdGl2ZSBpbnRlZ2VyIGhhc2ggY29kZSBpbnRvIGFuIDggY2hhcmFjdGVyIGhleCBzdHJpbmcsIHdoaWNoIGlzbid0XG5cdC8vIHN0cmljdGx5IG5lY2Vzc2FyeSBidXQgaW5jcmVhc2VzIHVzZXIgdW5kZXJzdGFuZGluZyB0aGF0IHRoZSBpZCBpcyBhIFNIQS1saWtlIGhhc2hcblx0aGV4ID0gKCAweDEwMDAwMDAwMCArIGhhc2ggKS50b1N0cmluZyggMTYgKTtcblx0aWYgKCBoZXgubGVuZ3RoIDwgOCApIHtcblx0XHRoZXggPSBcIjAwMDAwMDBcIiArIGhleDtcblx0fVxuXG5cdHJldHVybiBoZXguc2xpY2UoIC04ICk7XG59XG5cbmZ1bmN0aW9uIHN5bmNocm9uaXplKCBjYWxsYmFjaywgcHJpb3JpdHkgKSB7XG5cdHZhciBsYXN0ID0gIXByaW9yaXR5O1xuXG5cdGlmICggUVVuaXQub2JqZWN0VHlwZSggY2FsbGJhY2sgKSA9PT0gXCJhcnJheVwiICkge1xuXHRcdHdoaWxlICggY2FsbGJhY2subGVuZ3RoICkge1xuXHRcdFx0c3luY2hyb25pemUoIGNhbGxiYWNrLnNoaWZ0KCkgKTtcblx0XHR9XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKCBwcmlvcml0eSApIHtcblx0XHRjb25maWcucXVldWUuc3BsaWNlKCBwcmlvcml0eUNvdW50KyssIDAsIGNhbGxiYWNrICk7XG5cdH0gZWxzZSB7XG5cdFx0Y29uZmlnLnF1ZXVlLnB1c2goIGNhbGxiYWNrICk7XG5cdH1cblxuXHRpZiAoIGNvbmZpZy5hdXRvcnVuICYmICFjb25maWcuYmxvY2tpbmcgKSB7XG5cdFx0cHJvY2VzcyggbGFzdCApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNhdmVHbG9iYWwoKSB7XG5cdGNvbmZpZy5wb2xsdXRpb24gPSBbXTtcblxuXHRpZiAoIGNvbmZpZy5ub2dsb2JhbHMgKSB7XG5cdFx0Zm9yICggdmFyIGtleSBpbiBnbG9iYWwgKSB7XG5cdFx0XHRpZiAoIGhhc093bi5jYWxsKCBnbG9iYWwsIGtleSApICkge1xuXG5cdFx0XHRcdC8vIGluIE9wZXJhIHNvbWV0aW1lcyBET00gZWxlbWVudCBpZHMgc2hvdyB1cCBoZXJlLCBpZ25vcmUgdGhlbVxuXHRcdFx0XHRpZiAoIC9ecXVuaXQtdGVzdC1vdXRwdXQvLnRlc3QoIGtleSApICkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbmZpZy5wb2xsdXRpb24ucHVzaCgga2V5ICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGNoZWNrUG9sbHV0aW9uKCkge1xuXHR2YXIgbmV3R2xvYmFscyxcblx0XHRkZWxldGVkR2xvYmFscyxcblx0XHRvbGQgPSBjb25maWcucG9sbHV0aW9uO1xuXG5cdHNhdmVHbG9iYWwoKTtcblxuXHRuZXdHbG9iYWxzID0gZGlmZiggY29uZmlnLnBvbGx1dGlvbiwgb2xkICk7XG5cdGlmICggbmV3R2xvYmFscy5sZW5ndGggPiAwICkge1xuXHRcdFFVbml0LnB1c2hGYWlsdXJlKCBcIkludHJvZHVjZWQgZ2xvYmFsIHZhcmlhYmxlKHMpOiBcIiArIG5ld0dsb2JhbHMuam9pbiggXCIsIFwiICkgKTtcblx0fVxuXG5cdGRlbGV0ZWRHbG9iYWxzID0gZGlmZiggb2xkLCBjb25maWcucG9sbHV0aW9uICk7XG5cdGlmICggZGVsZXRlZEdsb2JhbHMubGVuZ3RoID4gMCApIHtcblx0XHRRVW5pdC5wdXNoRmFpbHVyZSggXCJEZWxldGVkIGdsb2JhbCB2YXJpYWJsZShzKTogXCIgKyBkZWxldGVkR2xvYmFscy5qb2luKCBcIiwgXCIgKSApO1xuXHR9XG59XG5cbi8vIFdpbGwgYmUgZXhwb3NlZCBhcyBRVW5pdC5hc3luY1Rlc3RcbmZ1bmN0aW9uIGFzeW5jVGVzdCggdGVzdE5hbWUsIGV4cGVjdGVkLCBjYWxsYmFjayApIHtcblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdGNhbGxiYWNrID0gZXhwZWN0ZWQ7XG5cdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHR9XG5cblx0UVVuaXQudGVzdCggdGVzdE5hbWUsIGV4cGVjdGVkLCBjYWxsYmFjaywgdHJ1ZSApO1xufVxuXG4vLyBXaWxsIGJlIGV4cG9zZWQgYXMgUVVuaXQudGVzdFxuZnVuY3Rpb24gdGVzdCggdGVzdE5hbWUsIGV4cGVjdGVkLCBjYWxsYmFjaywgYXN5bmMgKSB7XG5cdGlmICggZm9jdXNlZCApICB7IHJldHVybjsgfVxuXG5cdHZhciBuZXdUZXN0O1xuXG5cdGlmICggYXJndW1lbnRzLmxlbmd0aCA9PT0gMiApIHtcblx0XHRjYWxsYmFjayA9IGV4cGVjdGVkO1xuXHRcdGV4cGVjdGVkID0gbnVsbDtcblx0fVxuXG5cdG5ld1Rlc3QgPSBuZXcgVGVzdCh7XG5cdFx0dGVzdE5hbWU6IHRlc3ROYW1lLFxuXHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRhc3luYzogYXN5bmMsXG5cdFx0Y2FsbGJhY2s6IGNhbGxiYWNrXG5cdH0pO1xuXG5cdG5ld1Rlc3QucXVldWUoKTtcbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0LnNraXBcbmZ1bmN0aW9uIHNraXAoIHRlc3ROYW1lICkge1xuXHRpZiAoIGZvY3VzZWQgKSAgeyByZXR1cm47IH1cblxuXHR2YXIgdGVzdCA9IG5ldyBUZXN0KHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0c2tpcDogdHJ1ZVxuXHR9KTtcblxuXHR0ZXN0LnF1ZXVlKCk7XG59XG5cbi8vIFdpbGwgYmUgZXhwb3NlZCBhcyBRVW5pdC5vbmx5XG5mdW5jdGlvbiBvbmx5KCB0ZXN0TmFtZSwgZXhwZWN0ZWQsIGNhbGxiYWNrLCBhc3luYyApIHtcblx0dmFyIG5ld1Rlc3Q7XG5cblx0aWYgKCBmb2N1c2VkICkgIHsgcmV0dXJuOyB9XG5cblx0UVVuaXQuY29uZmlnLnF1ZXVlLmxlbmd0aCA9IDA7XG5cdGZvY3VzZWQgPSB0cnVlO1xuXG5cdGlmICggYXJndW1lbnRzLmxlbmd0aCA9PT0gMiApIHtcblx0XHRjYWxsYmFjayA9IGV4cGVjdGVkO1xuXHRcdGV4cGVjdGVkID0gbnVsbDtcblx0fVxuXG5cdG5ld1Rlc3QgPSBuZXcgVGVzdCh7XG5cdFx0dGVzdE5hbWU6IHRlc3ROYW1lLFxuXHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRhc3luYzogYXN5bmMsXG5cdFx0Y2FsbGJhY2s6IGNhbGxiYWNrXG5cdH0pO1xuXG5cdG5ld1Rlc3QucXVldWUoKTtcbn1cblxuZnVuY3Rpb24gQXNzZXJ0KCB0ZXN0Q29udGV4dCApIHtcblx0dGhpcy50ZXN0ID0gdGVzdENvbnRleHQ7XG59XG5cbi8vIEFzc2VydCBoZWxwZXJzXG5RVW5pdC5hc3NlcnQgPSBBc3NlcnQucHJvdG90eXBlID0ge1xuXG5cdC8vIFNwZWNpZnkgdGhlIG51bWJlciBvZiBleHBlY3RlZCBhc3NlcnRpb25zIHRvIGd1YXJhbnRlZSB0aGF0IGZhaWxlZCB0ZXN0XG5cdC8vIChubyBhc3NlcnRpb25zIGFyZSBydW4gYXQgYWxsKSBkb24ndCBzbGlwIHRocm91Z2guXG5cdGV4cGVjdDogZnVuY3Rpb24oIGFzc2VydHMgKSB7XG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAxICkge1xuXHRcdFx0dGhpcy50ZXN0LmV4cGVjdGVkID0gYXNzZXJ0cztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMudGVzdC5leHBlY3RlZDtcblx0XHR9XG5cdH0sXG5cblx0Ly8gSW5jcmVtZW50IHRoaXMgVGVzdCdzIHNlbWFwaG9yZSBjb3VudGVyLCB0aGVuIHJldHVybiBhIGZ1bmN0aW9uIHRoYXRcblx0Ly8gZGVjcmVtZW50cyB0aGF0IGNvdW50ZXIgYSBtYXhpbXVtIG9mIG9uY2UuXG5cdGFzeW5jOiBmdW5jdGlvbiggY291bnQgKSB7XG5cdFx0dmFyIHRlc3QgPSB0aGlzLnRlc3QsXG5cdFx0XHRwb3BwZWQgPSBmYWxzZSxcblx0XHRcdGFjY2VwdENhbGxDb3VudCA9IGNvdW50O1xuXG5cdFx0aWYgKCB0eXBlb2YgYWNjZXB0Q2FsbENvdW50ID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0YWNjZXB0Q2FsbENvdW50ID0gMTtcblx0XHR9XG5cblx0XHR0ZXN0LnNlbWFwaG9yZSArPSAxO1xuXHRcdHRlc3QudXNlZEFzeW5jID0gdHJ1ZTtcblx0XHRwYXVzZVByb2Nlc3NpbmcoKTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiBkb25lKCkge1xuXG5cdFx0XHRpZiAoIHBvcHBlZCApIHtcblx0XHRcdFx0dGVzdC5wdXNoRmFpbHVyZSggXCJUb28gbWFueSBjYWxscyB0byB0aGUgYGFzc2VydC5hc3luY2AgY2FsbGJhY2tcIixcblx0XHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGFjY2VwdENhbGxDb3VudCAtPSAxO1xuXHRcdFx0aWYgKCBhY2NlcHRDYWxsQ291bnQgPiAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRlc3Quc2VtYXBob3JlIC09IDE7XG5cdFx0XHRwb3BwZWQgPSB0cnVlO1xuXHRcdFx0cmVzdW1lUHJvY2Vzc2luZygpO1xuXHRcdH07XG5cdH0sXG5cblx0Ly8gRXhwb3J0cyB0ZXN0LnB1c2goKSB0byB0aGUgdXNlciBBUElcblx0cHVzaDogZnVuY3Rpb24oIC8qIHJlc3VsdCwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgbmVnYXRpdmUgKi8gKSB7XG5cdFx0dmFyIGFzc2VydCA9IHRoaXMsXG5cdFx0XHRjdXJyZW50VGVzdCA9ICggYXNzZXJ0IGluc3RhbmNlb2YgQXNzZXJ0ICYmIGFzc2VydC50ZXN0ICkgfHwgUVVuaXQuY29uZmlnLmN1cnJlbnQ7XG5cblx0XHQvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBmaXguXG5cdFx0Ly8gQWxsb3dzIHRoZSBkaXJlY3QgdXNlIG9mIGdsb2JhbCBleHBvcnRlZCBhc3NlcnRpb25zIGFuZCBRVW5pdC5hc3NlcnQuKlxuXHRcdC8vIEFsdGhvdWdoLCBpdCdzIHVzZSBpcyBub3QgcmVjb21tZW5kZWQgYXMgaXQgY2FuIGxlYWsgYXNzZXJ0aW9uc1xuXHRcdC8vIHRvIG90aGVyIHRlc3RzIGZyb20gYXN5bmMgdGVzdHMsIGJlY2F1c2Ugd2Ugb25seSBnZXQgYSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgdGVzdCxcblx0XHQvLyBub3QgZXhhY3RseSB0aGUgdGVzdCB3aGVyZSBhc3NlcnRpb24gd2VyZSBpbnRlbmRlZCB0byBiZSBjYWxsZWQuXG5cdFx0aWYgKCAhY3VycmVudFRlc3QgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiYXNzZXJ0aW9uIG91dHNpZGUgdGVzdCBjb250ZXh0LCBpbiBcIiArIHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0XHR9XG5cblx0XHRpZiAoIGN1cnJlbnRUZXN0LnVzZWRBc3luYyA9PT0gdHJ1ZSAmJiBjdXJyZW50VGVzdC5zZW1hcGhvcmUgPT09IDAgKSB7XG5cdFx0XHRjdXJyZW50VGVzdC5wdXNoRmFpbHVyZSggXCJBc3NlcnRpb24gYWZ0ZXIgdGhlIGZpbmFsIGBhc3NlcnQuYXN5bmNgIHdhcyByZXNvbHZlZFwiLFxuXHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cblx0XHRcdC8vIEFsbG93IHRoaXMgYXNzZXJ0aW9uIHRvIGNvbnRpbnVlIHJ1bm5pbmcgYW55d2F5Li4uXG5cdFx0fVxuXG5cdFx0aWYgKCAhKCBhc3NlcnQgaW5zdGFuY2VvZiBBc3NlcnQgKSApIHtcblx0XHRcdGFzc2VydCA9IGN1cnJlbnRUZXN0LmFzc2VydDtcblx0XHR9XG5cdFx0cmV0dXJuIGFzc2VydC50ZXN0LnB1c2guYXBwbHkoIGFzc2VydC50ZXN0LCBhcmd1bWVudHMgKTtcblx0fSxcblxuXHRvazogZnVuY3Rpb24oIHJlc3VsdCwgbWVzc2FnZSApIHtcblx0XHRtZXNzYWdlID0gbWVzc2FnZSB8fCAoIHJlc3VsdCA/IFwib2theVwiIDogXCJmYWlsZWQsIGV4cGVjdGVkIGFyZ3VtZW50IHRvIGJlIHRydXRoeSwgd2FzOiBcIiArXG5cdFx0XHRRVW5pdC5kdW1wLnBhcnNlKCByZXN1bHQgKSApO1xuXHRcdHRoaXMucHVzaCggISFyZXN1bHQsIHJlc3VsdCwgdHJ1ZSwgbWVzc2FnZSApO1xuXHR9LFxuXG5cdG5vdE9rOiBmdW5jdGlvbiggcmVzdWx0LCBtZXNzYWdlICkge1xuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlIHx8ICggIXJlc3VsdCA/IFwib2theVwiIDogXCJmYWlsZWQsIGV4cGVjdGVkIGFyZ3VtZW50IHRvIGJlIGZhbHN5LCB3YXM6IFwiICtcblx0XHRcdFFVbml0LmR1bXAucGFyc2UoIHJlc3VsdCApICk7XG5cdFx0dGhpcy5wdXNoKCAhcmVzdWx0LCByZXN1bHQsIGZhbHNlLCBtZXNzYWdlICk7XG5cdH0sXG5cblx0ZXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdC8qanNoaW50IGVxZXFlcTpmYWxzZSAqL1xuXHRcdHRoaXMucHVzaCggZXhwZWN0ZWQgPT0gYWN0dWFsLCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICk7XG5cdH0sXG5cblx0bm90RXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdC8qanNoaW50IGVxZXFlcTpmYWxzZSAqL1xuXHRcdHRoaXMucHVzaCggZXhwZWN0ZWQgIT0gYWN0dWFsLCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCB0cnVlICk7XG5cdH0sXG5cblx0cHJvcEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHRhY3R1YWwgPSBvYmplY3RWYWx1ZXMoIGFjdHVhbCApO1xuXHRcdGV4cGVjdGVkID0gb2JqZWN0VmFsdWVzKCBleHBlY3RlZCApO1xuXHRcdHRoaXMucHVzaCggUVVuaXQuZXF1aXYoIGFjdHVhbCwgZXhwZWN0ZWQgKSwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApO1xuXHR9LFxuXG5cdG5vdFByb3BFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0YWN0dWFsID0gb2JqZWN0VmFsdWVzKCBhY3R1YWwgKTtcblx0XHRleHBlY3RlZCA9IG9iamVjdFZhbHVlcyggZXhwZWN0ZWQgKTtcblx0XHR0aGlzLnB1c2goICFRVW5pdC5lcXVpdiggYWN0dWFsLCBleHBlY3RlZCApLCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCB0cnVlICk7XG5cdH0sXG5cblx0ZGVlcEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR0aGlzLnB1c2goIFFVbml0LmVxdWl2KCBhY3R1YWwsIGV4cGVjdGVkICksIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKTtcblx0fSxcblxuXHRub3REZWVwRXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHRoaXMucHVzaCggIVFVbml0LmVxdWl2KCBhY3R1YWwsIGV4cGVjdGVkICksIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIHRydWUgKTtcblx0fSxcblxuXHRzdHJpY3RFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dGhpcy5wdXNoKCBleHBlY3RlZCA9PT0gYWN0dWFsLCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICk7XG5cdH0sXG5cblx0bm90U3RyaWN0RXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHRoaXMucHVzaCggZXhwZWN0ZWQgIT09IGFjdHVhbCwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgdHJ1ZSApO1xuXHR9LFxuXG5cdFwidGhyb3dzXCI6IGZ1bmN0aW9uKCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dmFyIGFjdHVhbCwgZXhwZWN0ZWRUeXBlLFxuXHRcdFx0ZXhwZWN0ZWRPdXRwdXQgPSBleHBlY3RlZCxcblx0XHRcdG9rID0gZmFsc2UsXG5cdFx0XHRjdXJyZW50VGVzdCA9ICggdGhpcyBpbnN0YW5jZW9mIEFzc2VydCAmJiB0aGlzLnRlc3QgKSB8fCBRVW5pdC5jb25maWcuY3VycmVudDtcblxuXHRcdC8vICdleHBlY3RlZCcgaXMgb3B0aW9uYWwgdW5sZXNzIGRvaW5nIHN0cmluZyBjb21wYXJpc29uXG5cdFx0aWYgKCBtZXNzYWdlID09IG51bGwgJiYgdHlwZW9mIGV4cGVjdGVkID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0bWVzc2FnZSA9IGV4cGVjdGVkO1xuXHRcdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHRcdH1cblxuXHRcdGN1cnJlbnRUZXN0Lmlnbm9yZUdsb2JhbEVycm9ycyA9IHRydWU7XG5cdFx0dHJ5IHtcblx0XHRcdGJsb2NrLmNhbGwoIGN1cnJlbnRUZXN0LnRlc3RFbnZpcm9ubWVudCApO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGFjdHVhbCA9IGU7XG5cdFx0fVxuXHRcdGN1cnJlbnRUZXN0Lmlnbm9yZUdsb2JhbEVycm9ycyA9IGZhbHNlO1xuXG5cdFx0aWYgKCBhY3R1YWwgKSB7XG5cdFx0XHRleHBlY3RlZFR5cGUgPSBRVW5pdC5vYmplY3RUeXBlKCBleHBlY3RlZCApO1xuXG5cdFx0XHQvLyB3ZSBkb24ndCB3YW50IHRvIHZhbGlkYXRlIHRocm93biBlcnJvclxuXHRcdFx0aWYgKCAhZXhwZWN0ZWQgKSB7XG5cdFx0XHRcdG9rID0gdHJ1ZTtcblx0XHRcdFx0ZXhwZWN0ZWRPdXRwdXQgPSBudWxsO1xuXG5cdFx0XHQvLyBleHBlY3RlZCBpcyBhIHJlZ2V4cFxuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcInJlZ2V4cFwiICkge1xuXHRcdFx0XHRvayA9IGV4cGVjdGVkLnRlc3QoIGVycm9yU3RyaW5nKCBhY3R1YWwgKSApO1xuXG5cdFx0XHQvLyBleHBlY3RlZCBpcyBhIHN0cmluZ1xuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRvayA9IGV4cGVjdGVkID09PSBlcnJvclN0cmluZyggYWN0dWFsICk7XG5cblx0XHRcdC8vIGV4cGVjdGVkIGlzIGEgY29uc3RydWN0b3IsIG1heWJlIGFuIEVycm9yIGNvbnN0cnVjdG9yXG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwiZnVuY3Rpb25cIiAmJiBhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZCApIHtcblx0XHRcdFx0b2sgPSB0cnVlO1xuXG5cdFx0XHQvLyBleHBlY3RlZCBpcyBhbiBFcnJvciBvYmplY3Rcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdFx0b2sgPSBhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZC5jb25zdHJ1Y3RvciAmJlxuXHRcdFx0XHRcdGFjdHVhbC5uYW1lID09PSBleHBlY3RlZC5uYW1lICYmXG5cdFx0XHRcdFx0YWN0dWFsLm1lc3NhZ2UgPT09IGV4cGVjdGVkLm1lc3NhZ2U7XG5cblx0XHRcdC8vIGV4cGVjdGVkIGlzIGEgdmFsaWRhdGlvbiBmdW5jdGlvbiB3aGljaCByZXR1cm5zIHRydWUgaWYgdmFsaWRhdGlvbiBwYXNzZWRcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJmdW5jdGlvblwiICYmIGV4cGVjdGVkLmNhbGwoIHt9LCBhY3R1YWwgKSA9PT0gdHJ1ZSApIHtcblx0XHRcdFx0ZXhwZWN0ZWRPdXRwdXQgPSBudWxsO1xuXHRcdFx0XHRvayA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y3VycmVudFRlc3QuYXNzZXJ0LnB1c2goIG9rLCBhY3R1YWwsIGV4cGVjdGVkT3V0cHV0LCBtZXNzYWdlICk7XG5cdH1cbn07XG5cbi8vIFByb3ZpZGUgYW4gYWx0ZXJuYXRpdmUgdG8gYXNzZXJ0LnRocm93cygpLCBmb3IgZW52aXJvbm1lbnRzIHRoYXQgY29uc2lkZXIgdGhyb3dzIGEgcmVzZXJ2ZWQgd29yZFxuLy8gS25vd24gdG8gdXMgYXJlOiBDbG9zdXJlIENvbXBpbGVyLCBOYXJ3aGFsXG4oZnVuY3Rpb24oKSB7XG5cdC8qanNoaW50IHN1Yjp0cnVlICovXG5cdEFzc2VydC5wcm90b3R5cGUucmFpc2VzID0gQXNzZXJ0LnByb3RvdHlwZVsgXCJ0aHJvd3NcIiBdO1xufSgpKTtcblxuZnVuY3Rpb24gZXJyb3JTdHJpbmcoIGVycm9yICkge1xuXHR2YXIgbmFtZSwgbWVzc2FnZSxcblx0XHRyZXN1bHRFcnJvclN0cmluZyA9IGVycm9yLnRvU3RyaW5nKCk7XG5cdGlmICggcmVzdWx0RXJyb3JTdHJpbmcuc3Vic3RyaW5nKCAwLCA3ICkgPT09IFwiW29iamVjdFwiICkge1xuXHRcdG5hbWUgPSBlcnJvci5uYW1lID8gZXJyb3IubmFtZS50b1N0cmluZygpIDogXCJFcnJvclwiO1xuXHRcdG1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlID8gZXJyb3IubWVzc2FnZS50b1N0cmluZygpIDogXCJcIjtcblx0XHRpZiAoIG5hbWUgJiYgbWVzc2FnZSApIHtcblx0XHRcdHJldHVybiBuYW1lICsgXCI6IFwiICsgbWVzc2FnZTtcblx0XHR9IGVsc2UgaWYgKCBuYW1lICkge1xuXHRcdFx0cmV0dXJuIG5hbWU7XG5cdFx0fSBlbHNlIGlmICggbWVzc2FnZSApIHtcblx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gXCJFcnJvclwiO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gcmVzdWx0RXJyb3JTdHJpbmc7XG5cdH1cbn1cblxuLy8gVGVzdCBmb3IgZXF1YWxpdHkgYW55IEphdmFTY3JpcHQgdHlwZS5cbi8vIEF1dGhvcjogUGhpbGlwcGUgUmF0aMOpIDxwcmF0aGVAZ21haWwuY29tPlxuUVVuaXQuZXF1aXYgPSAoZnVuY3Rpb24oKSB7XG5cblx0Ly8gU3RhY2sgdG8gZGVjaWRlIGJldHdlZW4gc2tpcC9hYm9ydCBmdW5jdGlvbnNcblx0dmFyIGNhbGxlcnMgPSBbXTtcblxuXHQvLyBTdGFjayB0byBhdm9pZGluZyBsb29wcyBmcm9tIGNpcmN1bGFyIHJlZmVyZW5jaW5nXG5cdHZhciBwYXJlbnRzID0gW107XG5cdHZhciBwYXJlbnRzQiA9IFtdO1xuXG5cdHZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiggb2JqICkge1xuXG5cdFx0Lypqc2hpbnQgcHJvdG86IHRydWUgKi9cblx0XHRyZXR1cm4gb2JqLl9fcHJvdG9fXztcblx0fTtcblxuXHRmdW5jdGlvbiB1c2VTdHJpY3RFcXVhbGl0eSggYiwgYSApIHtcblxuXHRcdC8vIFRvIGNhdGNoIHNob3J0IGFubm90YXRpb24gVlMgJ25ldycgYW5ub3RhdGlvbiBvZiBhIGRlY2xhcmF0aW9uLiBlLmcuOlxuXHRcdC8vIGB2YXIgaSA9IDE7YFxuXHRcdC8vIGB2YXIgaiA9IG5ldyBOdW1iZXIoMSk7YFxuXHRcdGlmICggdHlwZW9mIGEgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRhID0gYS52YWx1ZU9mKCk7XG5cdFx0fVxuXHRcdGlmICggdHlwZW9mIGIgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRiID0gYi52YWx1ZU9mKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGEgPT09IGI7XG5cdH1cblxuXHRmdW5jdGlvbiBjb21wYXJlQ29uc3RydWN0b3JzKCBhLCBiICkge1xuXHRcdHZhciBwcm90b0EgPSBnZXRQcm90byggYSApO1xuXHRcdHZhciBwcm90b0IgPSBnZXRQcm90byggYiApO1xuXG5cdFx0Ly8gQ29tcGFyaW5nIGNvbnN0cnVjdG9ycyBpcyBtb3JlIHN0cmljdCB0aGFuIHVzaW5nIGBpbnN0YW5jZW9mYFxuXHRcdGlmICggYS5jb25zdHJ1Y3RvciA9PT0gYi5jb25zdHJ1Y3RvciApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIFJlZiAjODUxXG5cdFx0Ly8gSWYgdGhlIG9iaiBwcm90b3R5cGUgZGVzY2VuZHMgZnJvbSBhIG51bGwgY29uc3RydWN0b3IsIHRyZWF0IGl0XG5cdFx0Ly8gYXMgYSBudWxsIHByb3RvdHlwZS5cblx0XHRpZiAoIHByb3RvQSAmJiBwcm90b0EuY29uc3RydWN0b3IgPT09IG51bGwgKSB7XG5cdFx0XHRwcm90b0EgPSBudWxsO1xuXHRcdH1cblx0XHRpZiAoIHByb3RvQiAmJiBwcm90b0IuY29uc3RydWN0b3IgPT09IG51bGwgKSB7XG5cdFx0XHRwcm90b0IgPSBudWxsO1xuXHRcdH1cblxuXHRcdC8vIEFsbG93IG9iamVjdHMgd2l0aCBubyBwcm90b3R5cGUgdG8gYmUgZXF1aXZhbGVudCB0b1xuXHRcdC8vIG9iamVjdHMgd2l0aCBPYmplY3QgYXMgdGhlaXIgY29uc3RydWN0b3IuXG5cdFx0aWYgKCAoIHByb3RvQSA9PT0gbnVsbCAmJiBwcm90b0IgPT09IE9iamVjdC5wcm90b3R5cGUgKSB8fFxuXHRcdFx0XHQoIHByb3RvQiA9PT0gbnVsbCAmJiBwcm90b0EgPT09IE9iamVjdC5wcm90b3R5cGUgKSApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldFJlZ0V4cEZsYWdzKCByZWdleHAgKSB7XG5cdFx0cmV0dXJuIFwiZmxhZ3NcIiBpbiByZWdleHAgPyByZWdleHAuZmxhZ3MgOiByZWdleHAudG9TdHJpbmcoKS5tYXRjaCggL1tnaW11eV0qJC8gKVsgMCBdO1xuXHR9XG5cblx0dmFyIGNhbGxiYWNrcyA9IHtcblx0XHRcInN0cmluZ1wiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcImJvb2xlYW5cIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJudW1iZXJcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJudWxsXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwidW5kZWZpbmVkXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwic3ltYm9sXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwiZGF0ZVwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblxuXHRcdFwibmFuXCI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdFwicmVnZXhwXCI6IGZ1bmN0aW9uKCBiLCBhICkge1xuXHRcdFx0cmV0dXJuIGEuc291cmNlID09PSBiLnNvdXJjZSAmJlxuXG5cdFx0XHRcdC8vIEluY2x1ZGUgZmxhZ3MgaW4gdGhlIGNvbXBhcmlzb25cblx0XHRcdFx0Z2V0UmVnRXhwRmxhZ3MoIGEgKSA9PT0gZ2V0UmVnRXhwRmxhZ3MoIGIgKTtcblx0XHR9LFxuXG5cdFx0Ly8gLSBza2lwIHdoZW4gdGhlIHByb3BlcnR5IGlzIGEgbWV0aG9kIG9mIGFuIGluc3RhbmNlIChPT1ApXG5cdFx0Ly8gLSBhYm9ydCBvdGhlcndpc2UsXG5cdFx0Ly8gaW5pdGlhbCA9PT0gd291bGQgaGF2ZSBjYXRjaCBpZGVudGljYWwgcmVmZXJlbmNlcyBhbnl3YXlcblx0XHRcImZ1bmN0aW9uXCI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNhbGxlciA9IGNhbGxlcnNbIGNhbGxlcnMubGVuZ3RoIC0gMSBdO1xuXHRcdFx0cmV0dXJuIGNhbGxlciAhPT0gT2JqZWN0ICYmIHR5cGVvZiBjYWxsZXIgIT09IFwidW5kZWZpbmVkXCI7XG5cdFx0fSxcblxuXHRcdFwiYXJyYXlcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHR2YXIgaSwgaiwgbGVuLCBsb29wLCBhQ2lyY3VsYXIsIGJDaXJjdWxhcjtcblxuXHRcdFx0bGVuID0gYS5sZW5ndGg7XG5cdFx0XHRpZiAoIGxlbiAhPT0gYi5sZW5ndGggKSB7XG5cdFx0XHRcdC8vIHNhZmUgYW5kIGZhc3RlclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRyYWNrIHJlZmVyZW5jZSB0byBhdm9pZCBjaXJjdWxhciByZWZlcmVuY2VzXG5cdFx0XHRwYXJlbnRzLnB1c2goIGEgKTtcblx0XHRcdHBhcmVudHNCLnB1c2goIGIgKTtcblx0XHRcdGZvciAoIGkgPSAwOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0XHRcdGxvb3AgPSBmYWxzZTtcblx0XHRcdFx0Zm9yICggaiA9IDA7IGogPCBwYXJlbnRzLmxlbmd0aDsgaisrICkge1xuXHRcdFx0XHRcdGFDaXJjdWxhciA9IHBhcmVudHNbIGogXSA9PT0gYVsgaSBdO1xuXHRcdFx0XHRcdGJDaXJjdWxhciA9IHBhcmVudHNCWyBqIF0gPT09IGJbIGkgXTtcblx0XHRcdFx0XHRpZiAoIGFDaXJjdWxhciB8fCBiQ2lyY3VsYXIgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIGFbIGkgXSA9PT0gYlsgaSBdIHx8IGFDaXJjdWxhciAmJiBiQ2lyY3VsYXIgKSB7XG5cdFx0XHRcdFx0XHRcdGxvb3AgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0cGFyZW50cy5wb3AoKTtcblx0XHRcdFx0XHRcdFx0cGFyZW50c0IucG9wKCk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAhbG9vcCAmJiAhaW5uZXJFcXVpdiggYVsgaSBdLCBiWyBpIF0gKSApIHtcblx0XHRcdFx0XHRwYXJlbnRzLnBvcCgpO1xuXHRcdFx0XHRcdHBhcmVudHNCLnBvcCgpO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cGFyZW50cy5wb3AoKTtcblx0XHRcdHBhcmVudHNCLnBvcCgpO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdFwic2V0XCI6IGZ1bmN0aW9uKCBiLCBhICkge1xuXHRcdFx0dmFyIGFBcnJheSwgYkFycmF5O1xuXG5cdFx0XHRhQXJyYXkgPSBbXTtcblx0XHRcdGEuZm9yRWFjaCggZnVuY3Rpb24oIHYgKSB7XG5cdFx0XHRcdGFBcnJheS5wdXNoKCB2ICk7XG5cdFx0XHR9KTtcblx0XHRcdGJBcnJheSA9IFtdO1xuXHRcdFx0Yi5mb3JFYWNoKCBmdW5jdGlvbiggdiApIHtcblx0XHRcdFx0YkFycmF5LnB1c2goIHYgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gaW5uZXJFcXVpdiggYkFycmF5LCBhQXJyYXkgKTtcblx0XHR9LFxuXG5cdFx0XCJtYXBcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHR2YXIgYUFycmF5LCBiQXJyYXk7XG5cblx0XHRcdGFBcnJheSA9IFtdO1xuXHRcdFx0YS5mb3JFYWNoKCBmdW5jdGlvbiggdiwgayApIHtcblx0XHRcdFx0YUFycmF5LnB1c2goIFsgaywgdiBdICk7XG5cdFx0XHR9KTtcblx0XHRcdGJBcnJheSA9IFtdO1xuXHRcdFx0Yi5mb3JFYWNoKCBmdW5jdGlvbiggdiwgayApIHtcblx0XHRcdFx0YkFycmF5LnB1c2goIFsgaywgdiBdICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGlubmVyRXF1aXYoIGJBcnJheSwgYUFycmF5ICk7XG5cdFx0fSxcblxuXHRcdFwib2JqZWN0XCI6IGZ1bmN0aW9uKCBiLCBhICkge1xuXHRcdFx0dmFyIGksIGosIGxvb3AsIGFDaXJjdWxhciwgYkNpcmN1bGFyO1xuXG5cdFx0XHQvLyBEZWZhdWx0IHRvIHRydWVcblx0XHRcdHZhciBlcSA9IHRydWU7XG5cdFx0XHR2YXIgYVByb3BlcnRpZXMgPSBbXTtcblx0XHRcdHZhciBiUHJvcGVydGllcyA9IFtdO1xuXG5cdFx0XHRpZiAoIGNvbXBhcmVDb25zdHJ1Y3RvcnMoIGEsIGIgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU3RhY2sgY29uc3RydWN0b3IgYmVmb3JlIHRyYXZlcnNpbmcgcHJvcGVydGllc1xuXHRcdFx0Y2FsbGVycy5wdXNoKCBhLmNvbnN0cnVjdG9yICk7XG5cblx0XHRcdC8vIFRyYWNrIHJlZmVyZW5jZSB0byBhdm9pZCBjaXJjdWxhciByZWZlcmVuY2VzXG5cdFx0XHRwYXJlbnRzLnB1c2goIGEgKTtcblx0XHRcdHBhcmVudHNCLnB1c2goIGIgKTtcblxuXHRcdFx0Ly8gQmUgc3RyaWN0OiBkb24ndCBlbnN1cmUgaGFzT3duUHJvcGVydHkgYW5kIGdvIGRlZXBcblx0XHRcdGZvciAoIGkgaW4gYSApIHtcblx0XHRcdFx0bG9vcCA9IGZhbHNlO1xuXHRcdFx0XHRmb3IgKCBqID0gMDsgaiA8IHBhcmVudHMubGVuZ3RoOyBqKysgKSB7XG5cdFx0XHRcdFx0YUNpcmN1bGFyID0gcGFyZW50c1sgaiBdID09PSBhWyBpIF07XG5cdFx0XHRcdFx0YkNpcmN1bGFyID0gcGFyZW50c0JbIGogXSA9PT0gYlsgaSBdO1xuXHRcdFx0XHRcdGlmICggYUNpcmN1bGFyIHx8IGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdGlmICggYVsgaSBdID09PSBiWyBpIF0gfHwgYUNpcmN1bGFyICYmIGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdFx0bG9vcCA9IHRydWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRlcSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YVByb3BlcnRpZXMucHVzaCggaSApO1xuXHRcdFx0XHRpZiAoICFsb29wICYmICFpbm5lckVxdWl2KCBhWyBpIF0sIGJbIGkgXSApICkge1xuXHRcdFx0XHRcdGVxID0gZmFsc2U7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cGFyZW50cy5wb3AoKTtcblx0XHRcdHBhcmVudHNCLnBvcCgpO1xuXG5cdFx0XHQvLyBVbnN0YWNrLCB3ZSBhcmUgZG9uZVxuXHRcdFx0Y2FsbGVycy5wb3AoKTtcblxuXHRcdFx0Zm9yICggaSBpbiBiICkge1xuXG5cdFx0XHRcdC8vIENvbGxlY3QgYidzIHByb3BlcnRpZXNcblx0XHRcdFx0YlByb3BlcnRpZXMucHVzaCggaSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBFbnN1cmVzIGlkZW50aWNhbCBwcm9wZXJ0aWVzIG5hbWVcblx0XHRcdHJldHVybiBlcSAmJiBpbm5lckVxdWl2KCBhUHJvcGVydGllcy5zb3J0KCksIGJQcm9wZXJ0aWVzLnNvcnQoKSApO1xuXHRcdH1cblx0fTtcblxuXHRmdW5jdGlvbiB0eXBlRXF1aXYoIGEsIGIgKSB7XG5cdFx0dmFyIHR5cGUgPSBRVW5pdC5vYmplY3RUeXBlKCBhICk7XG5cdFx0cmV0dXJuIFFVbml0Lm9iamVjdFR5cGUoIGIgKSA9PT0gdHlwZSAmJiBjYWxsYmFja3NbIHR5cGUgXSggYiwgYSApO1xuXHR9XG5cblx0Ly8gVGhlIHJlYWwgZXF1aXYgZnVuY3Rpb25cblx0ZnVuY3Rpb24gaW5uZXJFcXVpdiggYSwgYiApIHtcblxuXHRcdC8vIFdlJ3JlIGRvbmUgd2hlbiB0aGVyZSdzIG5vdGhpbmcgbW9yZSB0byBjb21wYXJlXG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoIDwgMiApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIFJlcXVpcmUgdHlwZS1zcGVjaWZpYyBlcXVhbGl0eVxuXHRcdHJldHVybiAoIGEgPT09IGIgfHwgdHlwZUVxdWl2KCBhLCBiICkgKSAmJlxuXG5cdFx0XHQvLyAuLi5hY3Jvc3MgYWxsIGNvbnNlY3V0aXZlIGFyZ3VtZW50IHBhaXJzXG5cdFx0XHQoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgfHwgaW5uZXJFcXVpdi5hcHBseSggdGhpcywgW10uc2xpY2UuY2FsbCggYXJndW1lbnRzLCAxICkgKSApO1xuXHR9XG5cblx0cmV0dXJuIGlubmVyRXF1aXY7XG59KCkpO1xuXG4vLyBCYXNlZCBvbiBqc0R1bXAgYnkgQXJpZWwgRmxlc2xlclxuLy8gaHR0cDovL2ZsZXNsZXIuYmxvZ3Nwb3QuY29tLzIwMDgvMDUvanNkdW1wLXByZXR0eS1kdW1wLW9mLWFueS1qYXZhc2NyaXB0Lmh0bWxcblFVbml0LmR1bXAgPSAoZnVuY3Rpb24oKSB7XG5cdGZ1bmN0aW9uIHF1b3RlKCBzdHIgKSB7XG5cdFx0cmV0dXJuIFwiXFxcIlwiICsgc3RyLnRvU3RyaW5nKCkucmVwbGFjZSggL1xcXFwvZywgXCJcXFxcXFxcXFwiICkucmVwbGFjZSggL1wiL2csIFwiXFxcXFxcXCJcIiApICsgXCJcXFwiXCI7XG5cdH1cblx0ZnVuY3Rpb24gbGl0ZXJhbCggbyApIHtcblx0XHRyZXR1cm4gbyArIFwiXCI7XG5cdH1cblx0ZnVuY3Rpb24gam9pbiggcHJlLCBhcnIsIHBvc3QgKSB7XG5cdFx0dmFyIHMgPSBkdW1wLnNlcGFyYXRvcigpLFxuXHRcdFx0YmFzZSA9IGR1bXAuaW5kZW50KCksXG5cdFx0XHRpbm5lciA9IGR1bXAuaW5kZW50KCAxICk7XG5cdFx0aWYgKCBhcnIuam9pbiApIHtcblx0XHRcdGFyciA9IGFyci5qb2luKCBcIixcIiArIHMgKyBpbm5lciApO1xuXHRcdH1cblx0XHRpZiAoICFhcnIgKSB7XG5cdFx0XHRyZXR1cm4gcHJlICsgcG9zdDtcblx0XHR9XG5cdFx0cmV0dXJuIFsgcHJlLCBpbm5lciArIGFyciwgYmFzZSArIHBvc3QgXS5qb2luKCBzICk7XG5cdH1cblx0ZnVuY3Rpb24gYXJyYXkoIGFyciwgc3RhY2sgKSB7XG5cdFx0dmFyIGkgPSBhcnIubGVuZ3RoLFxuXHRcdFx0cmV0ID0gbmV3IEFycmF5KCBpICk7XG5cblx0XHRpZiAoIGR1bXAubWF4RGVwdGggJiYgZHVtcC5kZXB0aCA+IGR1bXAubWF4RGVwdGggKSB7XG5cdFx0XHRyZXR1cm4gXCJbb2JqZWN0IEFycmF5XVwiO1xuXHRcdH1cblxuXHRcdHRoaXMudXAoKTtcblx0XHR3aGlsZSAoIGktLSApIHtcblx0XHRcdHJldFsgaSBdID0gdGhpcy5wYXJzZSggYXJyWyBpIF0sIHVuZGVmaW5lZCwgc3RhY2sgKTtcblx0XHR9XG5cdFx0dGhpcy5kb3duKCk7XG5cdFx0cmV0dXJuIGpvaW4oIFwiW1wiLCByZXQsIFwiXVwiICk7XG5cdH1cblxuXHR2YXIgcmVOYW1lID0gL15mdW5jdGlvbiAoXFx3KykvLFxuXHRcdGR1bXAgPSB7XG5cblx0XHRcdC8vIG9ialR5cGUgaXMgdXNlZCBtb3N0bHkgaW50ZXJuYWxseSwgeW91IGNhbiBmaXggYSAoY3VzdG9tKSB0eXBlIGluIGFkdmFuY2Vcblx0XHRcdHBhcnNlOiBmdW5jdGlvbiggb2JqLCBvYmpUeXBlLCBzdGFjayApIHtcblx0XHRcdFx0c3RhY2sgPSBzdGFjayB8fCBbXTtcblx0XHRcdFx0dmFyIHJlcywgcGFyc2VyLCBwYXJzZXJUeXBlLFxuXHRcdFx0XHRcdGluU3RhY2sgPSBpbkFycmF5KCBvYmosIHN0YWNrICk7XG5cblx0XHRcdFx0aWYgKCBpblN0YWNrICE9PSAtMSApIHtcblx0XHRcdFx0XHRyZXR1cm4gXCJyZWN1cnNpb24oXCIgKyAoIGluU3RhY2sgLSBzdGFjay5sZW5ndGggKSArIFwiKVwiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0b2JqVHlwZSA9IG9ialR5cGUgfHwgdGhpcy50eXBlT2YoIG9iaiAgKTtcblx0XHRcdFx0cGFyc2VyID0gdGhpcy5wYXJzZXJzWyBvYmpUeXBlIF07XG5cdFx0XHRcdHBhcnNlclR5cGUgPSB0eXBlb2YgcGFyc2VyO1xuXG5cdFx0XHRcdGlmICggcGFyc2VyVHlwZSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHRcdHN0YWNrLnB1c2goIG9iaiApO1xuXHRcdFx0XHRcdHJlcyA9IHBhcnNlci5jYWxsKCB0aGlzLCBvYmosIHN0YWNrICk7XG5cdFx0XHRcdFx0c3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0cmV0dXJuIHJlcztcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gKCBwYXJzZXJUeXBlID09PSBcInN0cmluZ1wiICkgPyBwYXJzZXIgOiB0aGlzLnBhcnNlcnMuZXJyb3I7XG5cdFx0XHR9LFxuXHRcdFx0dHlwZU9mOiBmdW5jdGlvbiggb2JqICkge1xuXHRcdFx0XHR2YXIgdHlwZTtcblx0XHRcdFx0aWYgKCBvYmogPT09IG51bGwgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwibnVsbFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCB0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcInVuZGVmaW5lZFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBRVW5pdC5pcyggXCJyZWdleHBcIiwgb2JqICkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwicmVnZXhwXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIFFVbml0LmlzKCBcImRhdGVcIiwgb2JqICkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiZGF0ZVwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBRVW5pdC5pcyggXCJmdW5jdGlvblwiLCBvYmogKSApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJmdW5jdGlvblwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBvYmouc2V0SW50ZXJ2YWwgIT09IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdFx0b2JqLmRvY3VtZW50ICE9PSB1bmRlZmluZWQgJiZcblx0XHRcdFx0XHRcdG9iai5ub2RlVHlwZSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcIndpbmRvd1wiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBvYmoubm9kZVR5cGUgPT09IDkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiZG9jdW1lbnRcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggb2JqLm5vZGVUeXBlICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcIm5vZGVcIjtcblx0XHRcdFx0fSBlbHNlIGlmIChcblxuXHRcdFx0XHRcdC8vIG5hdGl2ZSBhcnJheXNcblx0XHRcdFx0XHR0b1N0cmluZy5jYWxsKCBvYmogKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiIHx8XG5cblx0XHRcdFx0XHQvLyBOb2RlTGlzdCBvYmplY3RzXG5cdFx0XHRcdFx0KCB0eXBlb2Ygb2JqLmxlbmd0aCA9PT0gXCJudW1iZXJcIiAmJiBvYmouaXRlbSAhPT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0KCBvYmoubGVuZ3RoID8gb2JqLml0ZW0oIDAgKSA9PT0gb2JqWyAwIF0gOiAoIG9iai5pdGVtKCAwICkgPT09IG51bGwgJiZcblx0XHRcdFx0XHRvYmpbIDAgXSA9PT0gdW5kZWZpbmVkICkgKSApXG5cdFx0XHRcdCkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImFycmF5XCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG9iai5jb25zdHJ1Y3RvciA9PT0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImVycm9yXCI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dHlwZSA9IHR5cGVvZiBvYmo7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHR5cGU7XG5cdFx0XHR9LFxuXHRcdFx0c2VwYXJhdG9yOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMubXVsdGlsaW5lID8gdGhpcy5IVE1MID8gXCI8YnIgLz5cIiA6IFwiXFxuXCIgOiB0aGlzLkhUTUwgPyBcIiYjMTYwO1wiIDogXCIgXCI7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gZXh0cmEgY2FuIGJlIGEgbnVtYmVyLCBzaG9ydGN1dCBmb3IgaW5jcmVhc2luZy1jYWxsaW5nLWRlY3JlYXNpbmdcblx0XHRcdGluZGVudDogZnVuY3Rpb24oIGV4dHJhICkge1xuXHRcdFx0XHRpZiAoICF0aGlzLm11bHRpbGluZSApIHtcblx0XHRcdFx0XHRyZXR1cm4gXCJcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgY2hyID0gdGhpcy5pbmRlbnRDaGFyO1xuXHRcdFx0XHRpZiAoIHRoaXMuSFRNTCApIHtcblx0XHRcdFx0XHRjaHIgPSBjaHIucmVwbGFjZSggL1xcdC9nLCBcIiAgIFwiICkucmVwbGFjZSggLyAvZywgXCImIzE2MDtcIiApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBuZXcgQXJyYXkoIHRoaXMuZGVwdGggKyAoIGV4dHJhIHx8IDAgKSApLmpvaW4oIGNociApO1xuXHRcdFx0fSxcblx0XHRcdHVwOiBmdW5jdGlvbiggYSApIHtcblx0XHRcdFx0dGhpcy5kZXB0aCArPSBhIHx8IDE7XG5cdFx0XHR9LFxuXHRcdFx0ZG93bjogZnVuY3Rpb24oIGEgKSB7XG5cdFx0XHRcdHRoaXMuZGVwdGggLT0gYSB8fCAxO1xuXHRcdFx0fSxcblx0XHRcdHNldFBhcnNlcjogZnVuY3Rpb24oIG5hbWUsIHBhcnNlciApIHtcblx0XHRcdFx0dGhpcy5wYXJzZXJzWyBuYW1lIF0gPSBwYXJzZXI7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gVGhlIG5leHQgMyBhcmUgZXhwb3NlZCBzbyB5b3UgY2FuIHVzZSB0aGVtXG5cdFx0XHRxdW90ZTogcXVvdGUsXG5cdFx0XHRsaXRlcmFsOiBsaXRlcmFsLFxuXHRcdFx0am9pbjogam9pbixcblx0XHRcdC8vXG5cdFx0XHRkZXB0aDogMSxcblx0XHRcdG1heERlcHRoOiBRVW5pdC5jb25maWcubWF4RGVwdGgsXG5cblx0XHRcdC8vIFRoaXMgaXMgdGhlIGxpc3Qgb2YgcGFyc2VycywgdG8gbW9kaWZ5IHRoZW0sIHVzZSBkdW1wLnNldFBhcnNlclxuXHRcdFx0cGFyc2Vyczoge1xuXHRcdFx0XHR3aW5kb3c6IFwiW1dpbmRvd11cIixcblx0XHRcdFx0ZG9jdW1lbnQ6IFwiW0RvY3VtZW50XVwiLFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGVycm9yICkge1xuXHRcdFx0XHRcdHJldHVybiBcIkVycm9yKFxcXCJcIiArIGVycm9yLm1lc3NhZ2UgKyBcIlxcXCIpXCI7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHVua25vd246IFwiW1Vua25vd25dXCIsXG5cdFx0XHRcdFwibnVsbFwiOiBcIm51bGxcIixcblx0XHRcdFx0XCJ1bmRlZmluZWRcIjogXCJ1bmRlZmluZWRcIixcblx0XHRcdFx0XCJmdW5jdGlvblwiOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRcdFx0dmFyIHJldCA9IFwiZnVuY3Rpb25cIixcblxuXHRcdFx0XHRcdFx0Ly8gZnVuY3Rpb25zIG5ldmVyIGhhdmUgbmFtZSBpbiBJRVxuXHRcdFx0XHRcdFx0bmFtZSA9IFwibmFtZVwiIGluIGZuID8gZm4ubmFtZSA6ICggcmVOYW1lLmV4ZWMoIGZuICkgfHwgW10gKVsgMSBdO1xuXG5cdFx0XHRcdFx0aWYgKCBuYW1lICkge1xuXHRcdFx0XHRcdFx0cmV0ICs9IFwiIFwiICsgbmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0ICs9IFwiKCBcIjtcblxuXHRcdFx0XHRcdHJldCA9IFsgcmV0LCBkdW1wLnBhcnNlKCBmbiwgXCJmdW5jdGlvbkFyZ3NcIiApLCBcIil7XCIgXS5qb2luKCBcIlwiICk7XG5cdFx0XHRcdFx0cmV0dXJuIGpvaW4oIHJldCwgZHVtcC5wYXJzZSggZm4sIFwiZnVuY3Rpb25Db2RlXCIgKSwgXCJ9XCIgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0YXJyYXk6IGFycmF5LFxuXHRcdFx0XHRub2RlbGlzdDogYXJyYXksXG5cdFx0XHRcdFwiYXJndW1lbnRzXCI6IGFycmF5LFxuXHRcdFx0XHRvYmplY3Q6IGZ1bmN0aW9uKCBtYXAsIHN0YWNrICkge1xuXHRcdFx0XHRcdHZhciBrZXlzLCBrZXksIHZhbCwgaSwgbm9uRW51bWVyYWJsZVByb3BlcnRpZXMsXG5cdFx0XHRcdFx0XHRyZXQgPSBbXTtcblxuXHRcdFx0XHRcdGlmICggZHVtcC5tYXhEZXB0aCAmJiBkdW1wLmRlcHRoID4gZHVtcC5tYXhEZXB0aCApIHtcblx0XHRcdFx0XHRcdHJldHVybiBcIltvYmplY3QgT2JqZWN0XVwiO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGR1bXAudXAoKTtcblx0XHRcdFx0XHRrZXlzID0gW107XG5cdFx0XHRcdFx0Zm9yICgga2V5IGluIG1hcCApIHtcblx0XHRcdFx0XHRcdGtleXMucHVzaCgga2V5ICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gU29tZSBwcm9wZXJ0aWVzIGFyZSBub3QgYWx3YXlzIGVudW1lcmFibGUgb24gRXJyb3Igb2JqZWN0cy5cblx0XHRcdFx0XHRub25FbnVtZXJhYmxlUHJvcGVydGllcyA9IFsgXCJtZXNzYWdlXCIsIFwibmFtZVwiIF07XG5cdFx0XHRcdFx0Zm9yICggaSBpbiBub25FbnVtZXJhYmxlUHJvcGVydGllcyApIHtcblx0XHRcdFx0XHRcdGtleSA9IG5vbkVudW1lcmFibGVQcm9wZXJ0aWVzWyBpIF07XG5cdFx0XHRcdFx0XHRpZiAoIGtleSBpbiBtYXAgJiYgaW5BcnJheSgga2V5LCBrZXlzICkgPCAwICkge1xuXHRcdFx0XHRcdFx0XHRrZXlzLnB1c2goIGtleSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRrZXlzLnNvcnQoKTtcblx0XHRcdFx0XHRmb3IgKCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSBrZXlzWyBpIF07XG5cdFx0XHRcdFx0XHR2YWwgPSBtYXBbIGtleSBdO1xuXHRcdFx0XHRcdFx0cmV0LnB1c2goIGR1bXAucGFyc2UoIGtleSwgXCJrZXlcIiApICsgXCI6IFwiICtcblx0XHRcdFx0XHRcdFx0ZHVtcC5wYXJzZSggdmFsLCB1bmRlZmluZWQsIHN0YWNrICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZHVtcC5kb3duKCk7XG5cdFx0XHRcdFx0cmV0dXJuIGpvaW4oIFwie1wiLCByZXQsIFwifVwiICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG5vZGU6IGZ1bmN0aW9uKCBub2RlICkge1xuXHRcdFx0XHRcdHZhciBsZW4sIGksIHZhbCxcblx0XHRcdFx0XHRcdG9wZW4gPSBkdW1wLkhUTUwgPyBcIiZsdDtcIiA6IFwiPFwiLFxuXHRcdFx0XHRcdFx0Y2xvc2UgPSBkdW1wLkhUTUwgPyBcIiZndDtcIiA6IFwiPlwiLFxuXHRcdFx0XHRcdFx0dGFnID0gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpLFxuXHRcdFx0XHRcdFx0cmV0ID0gb3BlbiArIHRhZyxcblx0XHRcdFx0XHRcdGF0dHJzID0gbm9kZS5hdHRyaWJ1dGVzO1xuXG5cdFx0XHRcdFx0aWYgKCBhdHRycyApIHtcblx0XHRcdFx0XHRcdGZvciAoIGkgPSAwLCBsZW4gPSBhdHRycy5sZW5ndGg7IGkgPCBsZW47IGkrKyApIHtcblx0XHRcdFx0XHRcdFx0dmFsID0gYXR0cnNbIGkgXS5ub2RlVmFsdWU7XG5cblx0XHRcdFx0XHRcdFx0Ly8gSUU2IGluY2x1ZGVzIGFsbCBhdHRyaWJ1dGVzIGluIC5hdHRyaWJ1dGVzLCBldmVuIG9uZXMgbm90IGV4cGxpY2l0bHlcblx0XHRcdFx0XHRcdFx0Ly8gc2V0LiBUaG9zZSBoYXZlIHZhbHVlcyBsaWtlIHVuZGVmaW5lZCwgbnVsbCwgMCwgZmFsc2UsIFwiXCIgb3Jcblx0XHRcdFx0XHRcdFx0Ly8gXCJpbmhlcml0XCIuXG5cdFx0XHRcdFx0XHRcdGlmICggdmFsICYmIHZhbCAhPT0gXCJpbmhlcml0XCIgKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0ICs9IFwiIFwiICsgYXR0cnNbIGkgXS5ub2RlTmFtZSArIFwiPVwiICtcblx0XHRcdFx0XHRcdFx0XHRcdGR1bXAucGFyc2UoIHZhbCwgXCJhdHRyaWJ1dGVcIiApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldCArPSBjbG9zZTtcblxuXHRcdFx0XHRcdC8vIFNob3cgY29udGVudCBvZiBUZXh0Tm9kZSBvciBDREFUQVNlY3Rpb25cblx0XHRcdFx0XHRpZiAoIG5vZGUubm9kZVR5cGUgPT09IDMgfHwgbm9kZS5ub2RlVHlwZSA9PT0gNCApIHtcblx0XHRcdFx0XHRcdHJldCArPSBub2RlLm5vZGVWYWx1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gcmV0ICsgb3BlbiArIFwiL1wiICsgdGFnICsgY2xvc2U7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Ly8gZnVuY3Rpb24gY2FsbHMgaXQgaW50ZXJuYWxseSwgaXQncyB0aGUgYXJndW1lbnRzIHBhcnQgb2YgdGhlIGZ1bmN0aW9uXG5cdFx0XHRcdGZ1bmN0aW9uQXJnczogZnVuY3Rpb24oIGZuICkge1xuXHRcdFx0XHRcdHZhciBhcmdzLFxuXHRcdFx0XHRcdFx0bCA9IGZuLmxlbmd0aDtcblxuXHRcdFx0XHRcdGlmICggIWwgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJcIjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRhcmdzID0gbmV3IEFycmF5KCBsICk7XG5cdFx0XHRcdFx0d2hpbGUgKCBsLS0gKSB7XG5cblx0XHRcdFx0XHRcdC8vIDk3IGlzICdhJ1xuXHRcdFx0XHRcdFx0YXJnc1sgbCBdID0gU3RyaW5nLmZyb21DaGFyQ29kZSggOTcgKyBsICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBcIiBcIiArIGFyZ3Muam9pbiggXCIsIFwiICkgKyBcIiBcIjtcblx0XHRcdFx0fSxcblx0XHRcdFx0Ly8gb2JqZWN0IGNhbGxzIGl0IGludGVybmFsbHksIHRoZSBrZXkgcGFydCBvZiBhbiBpdGVtIGluIGEgbWFwXG5cdFx0XHRcdGtleTogcXVvdGUsXG5cdFx0XHRcdC8vIGZ1bmN0aW9uIGNhbGxzIGl0IGludGVybmFsbHksIGl0J3MgdGhlIGNvbnRlbnQgb2YgdGhlIGZ1bmN0aW9uXG5cdFx0XHRcdGZ1bmN0aW9uQ29kZTogXCJbY29kZV1cIixcblx0XHRcdFx0Ly8gbm9kZSBjYWxscyBpdCBpbnRlcm5hbGx5LCBpdCdzIGEgaHRtbCBhdHRyaWJ1dGUgdmFsdWVcblx0XHRcdFx0YXR0cmlidXRlOiBxdW90ZSxcblx0XHRcdFx0c3RyaW5nOiBxdW90ZSxcblx0XHRcdFx0ZGF0ZTogcXVvdGUsXG5cdFx0XHRcdHJlZ2V4cDogbGl0ZXJhbCxcblx0XHRcdFx0bnVtYmVyOiBsaXRlcmFsLFxuXHRcdFx0XHRcImJvb2xlYW5cIjogbGl0ZXJhbFxuXHRcdFx0fSxcblx0XHRcdC8vIGlmIHRydWUsIGVudGl0aWVzIGFyZSBlc2NhcGVkICggPCwgPiwgXFx0LCBzcGFjZSBhbmQgXFxuIClcblx0XHRcdEhUTUw6IGZhbHNlLFxuXHRcdFx0Ly8gaW5kZW50YXRpb24gdW5pdFxuXHRcdFx0aW5kZW50Q2hhcjogXCIgIFwiLFxuXHRcdFx0Ly8gaWYgdHJ1ZSwgaXRlbXMgaW4gYSBjb2xsZWN0aW9uLCBhcmUgc2VwYXJhdGVkIGJ5IGEgXFxuLCBlbHNlIGp1c3QgYSBzcGFjZS5cblx0XHRcdG11bHRpbGluZTogdHJ1ZVxuXHRcdH07XG5cblx0cmV0dXJuIGR1bXA7XG59KCkpO1xuXG4vLyBiYWNrIGNvbXBhdFxuUVVuaXQuanNEdW1wID0gUVVuaXQuZHVtcDtcblxuLy8gRm9yIGJyb3dzZXIsIGV4cG9ydCBvbmx5IHNlbGVjdCBnbG9iYWxzXG5pZiAoIGRlZmluZWQuZG9jdW1lbnQgKSB7XG5cblx0Ly8gRGVwcmVjYXRlZFxuXHQvLyBFeHRlbmQgYXNzZXJ0IG1ldGhvZHMgdG8gUVVuaXQgYW5kIEdsb2JhbCBzY29wZSB0aHJvdWdoIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG5cdChmdW5jdGlvbigpIHtcblx0XHR2YXIgaSxcblx0XHRcdGFzc2VydGlvbnMgPSBBc3NlcnQucHJvdG90eXBlO1xuXG5cdFx0ZnVuY3Rpb24gYXBwbHlDdXJyZW50KCBjdXJyZW50ICkge1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgYXNzZXJ0ID0gbmV3IEFzc2VydCggUVVuaXQuY29uZmlnLmN1cnJlbnQgKTtcblx0XHRcdFx0Y3VycmVudC5hcHBseSggYXNzZXJ0LCBhcmd1bWVudHMgKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Zm9yICggaSBpbiBhc3NlcnRpb25zICkge1xuXHRcdFx0UVVuaXRbIGkgXSA9IGFwcGx5Q3VycmVudCggYXNzZXJ0aW9uc1sgaSBdICk7XG5cdFx0fVxuXHR9KSgpO1xuXG5cdChmdW5jdGlvbigpIHtcblx0XHR2YXIgaSwgbCxcblx0XHRcdGtleXMgPSBbXG5cdFx0XHRcdFwidGVzdFwiLFxuXHRcdFx0XHRcIm1vZHVsZVwiLFxuXHRcdFx0XHRcImV4cGVjdFwiLFxuXHRcdFx0XHRcImFzeW5jVGVzdFwiLFxuXHRcdFx0XHRcInN0YXJ0XCIsXG5cdFx0XHRcdFwic3RvcFwiLFxuXHRcdFx0XHRcIm9rXCIsXG5cdFx0XHRcdFwibm90T2tcIixcblx0XHRcdFx0XCJlcXVhbFwiLFxuXHRcdFx0XHRcIm5vdEVxdWFsXCIsXG5cdFx0XHRcdFwicHJvcEVxdWFsXCIsXG5cdFx0XHRcdFwibm90UHJvcEVxdWFsXCIsXG5cdFx0XHRcdFwiZGVlcEVxdWFsXCIsXG5cdFx0XHRcdFwibm90RGVlcEVxdWFsXCIsXG5cdFx0XHRcdFwic3RyaWN0RXF1YWxcIixcblx0XHRcdFx0XCJub3RTdHJpY3RFcXVhbFwiLFxuXHRcdFx0XHRcInRocm93c1wiLFxuXHRcdFx0XHRcInJhaXNlc1wiXG5cdFx0XHRdO1xuXG5cdFx0Zm9yICggaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdHdpbmRvd1sga2V5c1sgaSBdIF0gPSBRVW5pdFsga2V5c1sgaSBdIF07XG5cdFx0fVxuXHR9KSgpO1xuXG5cdHdpbmRvdy5RVW5pdCA9IFFVbml0O1xufVxuXG4vLyBGb3Igbm9kZWpzXG5pZiAoIHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlICYmIG1vZHVsZS5leHBvcnRzICkge1xuXHRtb2R1bGUuZXhwb3J0cyA9IFFVbml0O1xuXG5cdC8vIEZvciBjb25zaXN0ZW5jeSB3aXRoIENvbW1vbkpTIGVudmlyb25tZW50cycgZXhwb3J0c1xuXHRtb2R1bGUuZXhwb3J0cy5RVW5pdCA9IFFVbml0O1xufVxuXG4vLyBGb3IgQ29tbW9uSlMgd2l0aCBleHBvcnRzLCBidXQgd2l0aG91dCBtb2R1bGUuZXhwb3J0cywgbGlrZSBSaGlub1xuaWYgKCB0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBleHBvcnRzICkge1xuXHRleHBvcnRzLlFVbml0ID0gUVVuaXQ7XG59XG5cbmlmICggdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQgKSB7XG5cdGRlZmluZSggZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFFVbml0O1xuXHR9ICk7XG5cdFFVbml0LmNvbmZpZy5hdXRvc3RhcnQgPSBmYWxzZTtcbn1cblxuLypcbiAqIFRoaXMgZmlsZSBpcyBhIG1vZGlmaWVkIHZlcnNpb24gb2YgZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gncyBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uXG4gKiAoaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC9zb3VyY2UvYnJvd3NlL3RydW5rL2phdmFzY3JpcHQvZGlmZl9tYXRjaF9wYXRjaF91bmNvbXByZXNzZWQuanMpLFxuICogbW9kaWZpY2F0aW9ucyBhcmUgbGljZW5zZWQgYXMgbW9yZSBmdWxseSBzZXQgZm9ydGggaW4gTElDRU5TRS50eHQuXG4gKlxuICogVGhlIG9yaWdpbmFsIHNvdXJjZSBvZiBnb29nbGUtZGlmZi1tYXRjaC1wYXRjaCBpcyBhdHRyaWJ1dGFibGUgYW5kIGxpY2Vuc2VkIGFzIGZvbGxvd3M6XG4gKlxuICogQ29weXJpZ2h0IDIwMDYgR29vZ2xlIEluYy5cbiAqIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHBzOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIE1vcmUgSW5mbzpcbiAqICBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL1xuICpcbiAqIFVzYWdlOiBRVW5pdC5kaWZmKGV4cGVjdGVkLCBhY3R1YWwpXG4gKlxuICovXG5RVW5pdC5kaWZmID0gKCBmdW5jdGlvbigpIHtcblx0ZnVuY3Rpb24gRGlmZk1hdGNoUGF0Y2goKSB7XG5cdH1cblxuXHQvLyAgRElGRiBGVU5DVElPTlNcblxuXHQvKipcblx0ICogVGhlIGRhdGEgc3RydWN0dXJlIHJlcHJlc2VudGluZyBhIGRpZmYgaXMgYW4gYXJyYXkgb2YgdHVwbGVzOlxuXHQgKiBbW0RJRkZfREVMRVRFLCAnSGVsbG8nXSwgW0RJRkZfSU5TRVJULCAnR29vZGJ5ZSddLCBbRElGRl9FUVVBTCwgJyB3b3JsZC4nXV1cblx0ICogd2hpY2ggbWVhbnM6IGRlbGV0ZSAnSGVsbG8nLCBhZGQgJ0dvb2RieWUnIGFuZCBrZWVwICcgd29ybGQuJ1xuXHQgKi9cblx0dmFyIERJRkZfREVMRVRFID0gLTEsXG5cdFx0RElGRl9JTlNFUlQgPSAxLFxuXHRcdERJRkZfRVFVQUwgPSAwO1xuXG5cdC8qKlxuXHQgKiBGaW5kIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHR3byB0ZXh0cy4gIFNpbXBsaWZpZXMgdGhlIHByb2JsZW0gYnkgc3RyaXBwaW5nXG5cdCAqIGFueSBjb21tb24gcHJlZml4IG9yIHN1ZmZpeCBvZmYgdGhlIHRleHRzIGJlZm9yZSBkaWZmaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgT2xkIHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBOZXcgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtib29sZWFuPX0gb3B0Q2hlY2tsaW5lcyBPcHRpb25hbCBzcGVlZHVwIGZsYWcuIElmIHByZXNlbnQgYW5kIGZhbHNlLFxuXHQgKiAgICAgdGhlbiBkb24ndCBydW4gYSBsaW5lLWxldmVsIGRpZmYgZmlyc3QgdG8gaWRlbnRpZnkgdGhlIGNoYW5nZWQgYXJlYXMuXG5cdCAqICAgICBEZWZhdWx0cyB0byB0cnVlLCB3aGljaCBkb2VzIGEgZmFzdGVyLCBzbGlnaHRseSBsZXNzIG9wdGltYWwgZGlmZi5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLkRpZmZNYWluID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0Miwgb3B0Q2hlY2tsaW5lcyApIHtcblx0XHR2YXIgZGVhZGxpbmUsIGNoZWNrbGluZXMsIGNvbW1vbmxlbmd0aCxcblx0XHRcdGNvbW1vbnByZWZpeCwgY29tbW9uc3VmZml4LCBkaWZmcztcblxuXHRcdC8vIFRoZSBkaWZmIG11c3QgYmUgY29tcGxldGUgaW4gdXAgdG8gMSBzZWNvbmQuXG5cdFx0ZGVhZGxpbmUgPSAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCkgKyAxMDAwO1xuXG5cdFx0Ly8gQ2hlY2sgZm9yIG51bGwgaW5wdXRzLlxuXHRcdGlmICggdGV4dDEgPT09IG51bGwgfHwgdGV4dDIgPT09IG51bGwgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiTnVsbCBpbnB1dC4gKERpZmZNYWluKVwiICk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgZm9yIGVxdWFsaXR5IChzcGVlZHVwKS5cblx0XHRpZiAoIHRleHQxID09PSB0ZXh0MiApIHtcblx0XHRcdGlmICggdGV4dDEgKSB7XG5cdFx0XHRcdHJldHVybiBbXG5cdFx0XHRcdFx0WyBESUZGX0VRVUFMLCB0ZXh0MSBdXG5cdFx0XHRcdF07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXG5cdFx0aWYgKCB0eXBlb2Ygb3B0Q2hlY2tsaW5lcyA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdG9wdENoZWNrbGluZXMgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGNoZWNrbGluZXMgPSBvcHRDaGVja2xpbmVzO1xuXG5cdFx0Ly8gVHJpbSBvZmYgY29tbW9uIHByZWZpeCAoc3BlZWR1cCkuXG5cdFx0Y29tbW9ubGVuZ3RoID0gdGhpcy5kaWZmQ29tbW9uUHJlZml4KCB0ZXh0MSwgdGV4dDIgKTtcblx0XHRjb21tb25wcmVmaXggPSB0ZXh0MS5zdWJzdHJpbmcoIDAsIGNvbW1vbmxlbmd0aCApO1xuXHRcdHRleHQxID0gdGV4dDEuc3Vic3RyaW5nKCBjb21tb25sZW5ndGggKTtcblx0XHR0ZXh0MiA9IHRleHQyLnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cblx0XHQvLyBUcmltIG9mZiBjb21tb24gc3VmZml4IChzcGVlZHVwKS5cblx0XHRjb21tb25sZW5ndGggPSB0aGlzLmRpZmZDb21tb25TdWZmaXgoIHRleHQxLCB0ZXh0MiApO1xuXHRcdGNvbW1vbnN1ZmZpeCA9IHRleHQxLnN1YnN0cmluZyggdGV4dDEubGVuZ3RoIC0gY29tbW9ubGVuZ3RoICk7XG5cdFx0dGV4dDEgPSB0ZXh0MS5zdWJzdHJpbmcoIDAsIHRleHQxLmxlbmd0aCAtIGNvbW1vbmxlbmd0aCApO1xuXHRcdHRleHQyID0gdGV4dDIuc3Vic3RyaW5nKCAwLCB0ZXh0Mi5sZW5ndGggLSBjb21tb25sZW5ndGggKTtcblxuXHRcdC8vIENvbXB1dGUgdGhlIGRpZmYgb24gdGhlIG1pZGRsZSBibG9jay5cblx0XHRkaWZmcyA9IHRoaXMuZGlmZkNvbXB1dGUoIHRleHQxLCB0ZXh0MiwgY2hlY2tsaW5lcywgZGVhZGxpbmUgKTtcblxuXHRcdC8vIFJlc3RvcmUgdGhlIHByZWZpeCBhbmQgc3VmZml4LlxuXHRcdGlmICggY29tbW9ucHJlZml4ICkge1xuXHRcdFx0ZGlmZnMudW5zaGlmdCggWyBESUZGX0VRVUFMLCBjb21tb25wcmVmaXggXSApO1xuXHRcdH1cblx0XHRpZiAoIGNvbW1vbnN1ZmZpeCApIHtcblx0XHRcdGRpZmZzLnB1c2goIFsgRElGRl9FUVVBTCwgY29tbW9uc3VmZml4IF0gKTtcblx0XHR9XG5cdFx0dGhpcy5kaWZmQ2xlYW51cE1lcmdlKCBkaWZmcyApO1xuXHRcdHJldHVybiBkaWZmcztcblx0fTtcblxuXHQvKipcblx0ICogUmVkdWNlIHRoZSBudW1iZXIgb2YgZWRpdHMgYnkgZWxpbWluYXRpbmcgb3BlcmF0aW9uYWxseSB0cml2aWFsIGVxdWFsaXRpZXMuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDbGVhbnVwRWZmaWNpZW5jeSA9IGZ1bmN0aW9uKCBkaWZmcyApIHtcblx0XHR2YXIgY2hhbmdlcywgZXF1YWxpdGllcywgZXF1YWxpdGllc0xlbmd0aCwgbGFzdGVxdWFsaXR5LFxuXHRcdFx0cG9pbnRlciwgcHJlSW5zLCBwcmVEZWwsIHBvc3RJbnMsIHBvc3REZWw7XG5cdFx0Y2hhbmdlcyA9IGZhbHNlO1xuXHRcdGVxdWFsaXRpZXMgPSBbXTsgLy8gU3RhY2sgb2YgaW5kaWNlcyB3aGVyZSBlcXVhbGl0aWVzIGFyZSBmb3VuZC5cblx0XHRlcXVhbGl0aWVzTGVuZ3RoID0gMDsgLy8gS2VlcGluZyBvdXIgb3duIGxlbmd0aCB2YXIgaXMgZmFzdGVyIGluIEpTLlxuXHRcdC8qKiBAdHlwZSB7P3N0cmluZ30gKi9cblx0XHRsYXN0ZXF1YWxpdHkgPSBudWxsO1xuXHRcdC8vIEFsd2F5cyBlcXVhbCB0byBkaWZmc1tlcXVhbGl0aWVzW2VxdWFsaXRpZXNMZW5ndGggLSAxXV1bMV1cblx0XHRwb2ludGVyID0gMDsgLy8gSW5kZXggb2YgY3VycmVudCBwb3NpdGlvbi5cblx0XHQvLyBJcyB0aGVyZSBhbiBpbnNlcnRpb24gb3BlcmF0aW9uIGJlZm9yZSB0aGUgbGFzdCBlcXVhbGl0eS5cblx0XHRwcmVJbnMgPSBmYWxzZTtcblx0XHQvLyBJcyB0aGVyZSBhIGRlbGV0aW9uIG9wZXJhdGlvbiBiZWZvcmUgdGhlIGxhc3QgZXF1YWxpdHkuXG5cdFx0cHJlRGVsID0gZmFsc2U7XG5cdFx0Ly8gSXMgdGhlcmUgYW4gaW5zZXJ0aW9uIG9wZXJhdGlvbiBhZnRlciB0aGUgbGFzdCBlcXVhbGl0eS5cblx0XHRwb3N0SW5zID0gZmFsc2U7XG5cdFx0Ly8gSXMgdGhlcmUgYSBkZWxldGlvbiBvcGVyYXRpb24gYWZ0ZXIgdGhlIGxhc3QgZXF1YWxpdHkuXG5cdFx0cG9zdERlbCA9IGZhbHNlO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblxuXHRcdFx0Ly8gRXF1YWxpdHkgZm91bmQuXG5cdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9FUVVBTCApIHtcblx0XHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAxIF0ubGVuZ3RoIDwgNCAmJiAoIHBvc3RJbnMgfHwgcG9zdERlbCApICkge1xuXG5cdFx0XHRcdFx0Ly8gQ2FuZGlkYXRlIGZvdW5kLlxuXHRcdFx0XHRcdGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGgrKyBdID0gcG9pbnRlcjtcblx0XHRcdFx0XHRwcmVJbnMgPSBwb3N0SW5zO1xuXHRcdFx0XHRcdHByZURlbCA9IHBvc3REZWw7XG5cdFx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0Ly8gTm90IGEgY2FuZGlkYXRlLCBhbmQgY2FuIG5ldmVyIGJlY29tZSBvbmUuXG5cdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aCA9IDA7XG5cdFx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHRwb3N0SW5zID0gcG9zdERlbCA9IGZhbHNlO1xuXG5cdFx0XHQvLyBBbiBpbnNlcnRpb24gb3IgZGVsZXRpb24uXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0RFTEVURSApIHtcblx0XHRcdFx0XHRwb3N0RGVsID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwb3N0SW5zID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8qXG5cdFx0XHRcdCAqIEZpdmUgdHlwZXMgdG8gYmUgc3BsaXQ6XG5cdFx0XHRcdCAqIDxpbnM+QTwvaW5zPjxkZWw+QjwvZGVsPlhZPGlucz5DPC9pbnM+PGRlbD5EPC9kZWw+XG5cdFx0XHRcdCAqIDxpbnM+QTwvaW5zPlg8aW5zPkM8L2lucz48ZGVsPkQ8L2RlbD5cblx0XHRcdFx0ICogPGlucz5BPC9pbnM+PGRlbD5CPC9kZWw+WDxpbnM+QzwvaW5zPlxuXHRcdFx0XHQgKiA8aW5zPkE8L2RlbD5YPGlucz5DPC9pbnM+PGRlbD5EPC9kZWw+XG5cdFx0XHRcdCAqIDxpbnM+QTwvaW5zPjxkZWw+QjwvZGVsPlg8ZGVsPkM8L2RlbD5cblx0XHRcdFx0ICovXG5cdFx0XHRcdGlmICggbGFzdGVxdWFsaXR5ICYmICggKCBwcmVJbnMgJiYgcHJlRGVsICYmIHBvc3RJbnMgJiYgcG9zdERlbCApIHx8XG5cdFx0XHRcdFx0XHQoICggbGFzdGVxdWFsaXR5Lmxlbmd0aCA8IDIgKSAmJlxuXHRcdFx0XHRcdFx0KCBwcmVJbnMgKyBwcmVEZWwgKyBwb3N0SW5zICsgcG9zdERlbCApID09PSAzICkgKSApIHtcblxuXHRcdFx0XHRcdC8vIER1cGxpY2F0ZSByZWNvcmQuXG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKFxuXHRcdFx0XHRcdFx0ZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSxcblx0XHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0XHRbIERJRkZfREVMRVRFLCBsYXN0ZXF1YWxpdHkgXVxuXHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHQvLyBDaGFuZ2Ugc2Vjb25kIGNvcHkgdG8gaW5zZXJ0LlxuXHRcdFx0XHRcdGRpZmZzWyBlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdICsgMSBdWyAwIF0gPSBESUZGX0lOU0VSVDtcblx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoLS07IC8vIFRocm93IGF3YXkgdGhlIGVxdWFsaXR5IHdlIGp1c3QgZGVsZXRlZDtcblx0XHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBudWxsO1xuXHRcdFx0XHRcdGlmICggcHJlSW5zICYmIHByZURlbCApIHtcblx0XHRcdFx0XHRcdC8vIE5vIGNoYW5nZXMgbWFkZSB3aGljaCBjb3VsZCBhZmZlY3QgcHJldmlvdXMgZW50cnksIGtlZXAgZ29pbmcuXG5cdFx0XHRcdFx0XHRwb3N0SW5zID0gcG9zdERlbCA9IHRydWU7XG5cdFx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoID0gMDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tOyAvLyBUaHJvdyBhd2F5IHRoZSBwcmV2aW91cyBlcXVhbGl0eS5cblx0XHRcdFx0XHRcdHBvaW50ZXIgPSBlcXVhbGl0aWVzTGVuZ3RoID4gMCA/IGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gOiAtMTtcblx0XHRcdFx0XHRcdHBvc3RJbnMgPSBwb3N0RGVsID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNoYW5nZXMgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXG5cdFx0aWYgKCBjaGFuZ2VzICkge1xuXHRcdFx0dGhpcy5kaWZmQ2xlYW51cE1lcmdlKCBkaWZmcyApO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogQ29udmVydCBhIGRpZmYgYXJyYXkgaW50byBhIHByZXR0eSBIVE1MIHJlcG9ydC5cblx0ICogQHBhcmFtIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gZGlmZnMgQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwYXJhbSB7aW50ZWdlcn0gc3RyaW5nIHRvIGJlIGJlYXV0aWZpZWQuXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCByZXByZXNlbnRhdGlvbi5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmUHJldHR5SHRtbCA9IGZ1bmN0aW9uKCBkaWZmcyApIHtcblx0XHR2YXIgb3AsIGRhdGEsIHgsXG5cdFx0XHRodG1sID0gW107XG5cdFx0Zm9yICggeCA9IDA7IHggPCBkaWZmcy5sZW5ndGg7IHgrKyApIHtcblx0XHRcdG9wID0gZGlmZnNbIHggXVsgMCBdOyAvLyBPcGVyYXRpb24gKGluc2VydCwgZGVsZXRlLCBlcXVhbClcblx0XHRcdGRhdGEgPSBkaWZmc1sgeCBdWyAxIF07IC8vIFRleHQgb2YgY2hhbmdlLlxuXHRcdFx0c3dpdGNoICggb3AgKSB7XG5cdFx0XHRjYXNlIERJRkZfSU5TRVJUOlxuXHRcdFx0XHRodG1sWyB4IF0gPSBcIjxpbnM+XCIgKyBkYXRhICsgXCI8L2lucz5cIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfREVMRVRFOlxuXHRcdFx0XHRodG1sWyB4IF0gPSBcIjxkZWw+XCIgKyBkYXRhICsgXCI8L2RlbD5cIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfRVFVQUw6XG5cdFx0XHRcdGh0bWxbIHggXSA9IFwiPHNwYW4+XCIgKyBkYXRhICsgXCI8L3NwYW4+XCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gaHRtbC5qb2luKCBcIlwiICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIERldGVybWluZSB0aGUgY29tbW9uIHByZWZpeCBvZiB0d28gc3RyaW5ncy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge251bWJlcn0gVGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIGNvbW1vbiB0byB0aGUgc3RhcnQgb2YgZWFjaFxuXHQgKiAgICAgc3RyaW5nLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDb21tb25QcmVmaXggPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciBwb2ludGVybWlkLCBwb2ludGVybWF4LCBwb2ludGVybWluLCBwb2ludGVyc3RhcnQ7XG5cdFx0Ly8gUXVpY2sgY2hlY2sgZm9yIGNvbW1vbiBudWxsIGNhc2VzLlxuXHRcdGlmICggIXRleHQxIHx8ICF0ZXh0MiB8fCB0ZXh0MS5jaGFyQXQoIDAgKSAhPT0gdGV4dDIuY2hhckF0KCAwICkgKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0Ly8gQmluYXJ5IHNlYXJjaC5cblx0XHQvLyBQZXJmb3JtYW5jZSBhbmFseXNpczogaHR0cHM6Ly9uZWlsLmZyYXNlci5uYW1lL25ld3MvMjAwNy8xMC8wOS9cblx0XHRwb2ludGVybWluID0gMDtcblx0XHRwb2ludGVybWF4ID0gTWF0aC5taW4oIHRleHQxLmxlbmd0aCwgdGV4dDIubGVuZ3RoICk7XG5cdFx0cG9pbnRlcm1pZCA9IHBvaW50ZXJtYXg7XG5cdFx0cG9pbnRlcnN0YXJ0ID0gMDtcblx0XHR3aGlsZSAoIHBvaW50ZXJtaW4gPCBwb2ludGVybWlkICkge1xuXHRcdFx0aWYgKCB0ZXh0MS5zdWJzdHJpbmcoIHBvaW50ZXJzdGFydCwgcG9pbnRlcm1pZCApID09PVxuXHRcdFx0XHRcdHRleHQyLnN1YnN0cmluZyggcG9pbnRlcnN0YXJ0LCBwb2ludGVybWlkICkgKSB7XG5cdFx0XHRcdHBvaW50ZXJtaW4gPSBwb2ludGVybWlkO1xuXHRcdFx0XHRwb2ludGVyc3RhcnQgPSBwb2ludGVybWluO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cG9pbnRlcm1heCA9IHBvaW50ZXJtaWQ7XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVybWlkID0gTWF0aC5mbG9vciggKCBwb2ludGVybWF4IC0gcG9pbnRlcm1pbiApIC8gMiArIHBvaW50ZXJtaW4gKTtcblx0XHR9XG5cdFx0cmV0dXJuIHBvaW50ZXJtaWQ7XG5cdH07XG5cblx0LyoqXG5cdCAqIERldGVybWluZSB0aGUgY29tbW9uIHN1ZmZpeCBvZiB0d28gc3RyaW5ncy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge251bWJlcn0gVGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIGNvbW1vbiB0byB0aGUgZW5kIG9mIGVhY2ggc3RyaW5nLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDb21tb25TdWZmaXggPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciBwb2ludGVybWlkLCBwb2ludGVybWF4LCBwb2ludGVybWluLCBwb2ludGVyZW5kO1xuXHRcdC8vIFF1aWNrIGNoZWNrIGZvciBjb21tb24gbnVsbCBjYXNlcy5cblx0XHRpZiAoICF0ZXh0MSB8fFxuXHRcdFx0XHQhdGV4dDIgfHxcblx0XHRcdFx0dGV4dDEuY2hhckF0KCB0ZXh0MS5sZW5ndGggLSAxICkgIT09IHRleHQyLmNoYXJBdCggdGV4dDIubGVuZ3RoIC0gMSApICkge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdC8vIEJpbmFyeSBzZWFyY2guXG5cdFx0Ly8gUGVyZm9ybWFuY2UgYW5hbHlzaXM6IGh0dHBzOi8vbmVpbC5mcmFzZXIubmFtZS9uZXdzLzIwMDcvMTAvMDkvXG5cdFx0cG9pbnRlcm1pbiA9IDA7XG5cdFx0cG9pbnRlcm1heCA9IE1hdGgubWluKCB0ZXh0MS5sZW5ndGgsIHRleHQyLmxlbmd0aCApO1xuXHRcdHBvaW50ZXJtaWQgPSBwb2ludGVybWF4O1xuXHRcdHBvaW50ZXJlbmQgPSAwO1xuXHRcdHdoaWxlICggcG9pbnRlcm1pbiA8IHBvaW50ZXJtaWQgKSB7XG5cdFx0XHRpZiAoIHRleHQxLnN1YnN0cmluZyggdGV4dDEubGVuZ3RoIC0gcG9pbnRlcm1pZCwgdGV4dDEubGVuZ3RoIC0gcG9pbnRlcmVuZCApID09PVxuXHRcdFx0XHRcdHRleHQyLnN1YnN0cmluZyggdGV4dDIubGVuZ3RoIC0gcG9pbnRlcm1pZCwgdGV4dDIubGVuZ3RoIC0gcG9pbnRlcmVuZCApICkge1xuXHRcdFx0XHRwb2ludGVybWluID0gcG9pbnRlcm1pZDtcblx0XHRcdFx0cG9pbnRlcmVuZCA9IHBvaW50ZXJtaW47XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwb2ludGVybWF4ID0gcG9pbnRlcm1pZDtcblx0XHRcdH1cblx0XHRcdHBvaW50ZXJtaWQgPSBNYXRoLmZsb29yKCAoIHBvaW50ZXJtYXggLSBwb2ludGVybWluICkgLyAyICsgcG9pbnRlcm1pbiApO1xuXHRcdH1cblx0XHRyZXR1cm4gcG9pbnRlcm1pZDtcblx0fTtcblxuXHQvKipcblx0ICogRmluZCB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0d28gdGV4dHMuICBBc3N1bWVzIHRoYXQgdGhlIHRleHRzIGRvIG5vdFxuXHQgKiBoYXZlIGFueSBjb21tb24gcHJlZml4IG9yIHN1ZmZpeC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gY2hlY2tsaW5lcyBTcGVlZHVwIGZsYWcuICBJZiBmYWxzZSwgdGhlbiBkb24ndCBydW4gYVxuXHQgKiAgICAgbGluZS1sZXZlbCBkaWZmIGZpcnN0IHRvIGlkZW50aWZ5IHRoZSBjaGFuZ2VkIGFyZWFzLlxuXHQgKiAgICAgSWYgdHJ1ZSwgdGhlbiBydW4gYSBmYXN0ZXIsIHNsaWdodGx5IGxlc3Mgb3B0aW1hbCBkaWZmLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVhZGxpbmUgVGltZSB3aGVuIHRoZSBkaWZmIHNob3VsZCBiZSBjb21wbGV0ZSBieS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDb21wdXRlID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgY2hlY2tsaW5lcywgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIGRpZmZzLCBsb25ndGV4dCwgc2hvcnR0ZXh0LCBpLCBobSxcblx0XHRcdHRleHQxQSwgdGV4dDJBLCB0ZXh0MUIsIHRleHQyQixcblx0XHRcdG1pZENvbW1vbiwgZGlmZnNBLCBkaWZmc0I7XG5cblx0XHRpZiAoICF0ZXh0MSApIHtcblx0XHRcdC8vIEp1c3QgYWRkIHNvbWUgdGV4dCAoc3BlZWR1cCkuXG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHRbIERJRkZfSU5TRVJULCB0ZXh0MiBdXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdGlmICggIXRleHQyICkge1xuXHRcdFx0Ly8gSnVzdCBkZWxldGUgc29tZSB0ZXh0IChzcGVlZHVwKS5cblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdFsgRElGRl9ERUxFVEUsIHRleHQxIF1cblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0bG9uZ3RleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MSA6IHRleHQyO1xuXHRcdHNob3J0dGV4dCA9IHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCA/IHRleHQyIDogdGV4dDE7XG5cdFx0aSA9IGxvbmd0ZXh0LmluZGV4T2YoIHNob3J0dGV4dCApO1xuXHRcdGlmICggaSAhPT0gLTEgKSB7XG5cdFx0XHQvLyBTaG9ydGVyIHRleHQgaXMgaW5zaWRlIHRoZSBsb25nZXIgdGV4dCAoc3BlZWR1cCkuXG5cdFx0XHRkaWZmcyA9IFtcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgbG9uZ3RleHQuc3Vic3RyaW5nKCAwLCBpICkgXSxcblx0XHRcdFx0WyBESUZGX0VRVUFMLCBzaG9ydHRleHQgXSxcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgbG9uZ3RleHQuc3Vic3RyaW5nKCBpICsgc2hvcnR0ZXh0Lmxlbmd0aCApIF1cblx0XHRcdF07XG5cdFx0XHQvLyBTd2FwIGluc2VydGlvbnMgZm9yIGRlbGV0aW9ucyBpZiBkaWZmIGlzIHJldmVyc2VkLlxuXHRcdFx0aWYgKCB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggKSB7XG5cdFx0XHRcdGRpZmZzWyAwIF1bIDAgXSA9IGRpZmZzWyAyIF1bIDAgXSA9IERJRkZfREVMRVRFO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGRpZmZzO1xuXHRcdH1cblxuXHRcdGlmICggc2hvcnR0ZXh0Lmxlbmd0aCA9PT0gMSApIHtcblx0XHRcdC8vIFNpbmdsZSBjaGFyYWN0ZXIgc3RyaW5nLlxuXHRcdFx0Ly8gQWZ0ZXIgdGhlIHByZXZpb3VzIHNwZWVkdXAsIHRoZSBjaGFyYWN0ZXIgY2FuJ3QgYmUgYW4gZXF1YWxpdHkuXG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0MSBdLFxuXHRcdFx0XHRbIERJRkZfSU5TRVJULCB0ZXh0MiBdXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgcHJvYmxlbSBjYW4gYmUgc3BsaXQgaW4gdHdvLlxuXHRcdGhtID0gdGhpcy5kaWZmSGFsZk1hdGNoKCB0ZXh0MSwgdGV4dDIgKTtcblx0XHRpZiAoIGhtICkge1xuXHRcdFx0Ly8gQSBoYWxmLW1hdGNoIHdhcyBmb3VuZCwgc29ydCBvdXQgdGhlIHJldHVybiBkYXRhLlxuXHRcdFx0dGV4dDFBID0gaG1bIDAgXTtcblx0XHRcdHRleHQxQiA9IGhtWyAxIF07XG5cdFx0XHR0ZXh0MkEgPSBobVsgMiBdO1xuXHRcdFx0dGV4dDJCID0gaG1bIDMgXTtcblx0XHRcdG1pZENvbW1vbiA9IGhtWyA0IF07XG5cdFx0XHQvLyBTZW5kIGJvdGggcGFpcnMgb2ZmIGZvciBzZXBhcmF0ZSBwcm9jZXNzaW5nLlxuXHRcdFx0ZGlmZnNBID0gdGhpcy5EaWZmTWFpbiggdGV4dDFBLCB0ZXh0MkEsIGNoZWNrbGluZXMsIGRlYWRsaW5lICk7XG5cdFx0XHRkaWZmc0IgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MUIsIHRleHQyQiwgY2hlY2tsaW5lcywgZGVhZGxpbmUgKTtcblx0XHRcdC8vIE1lcmdlIHRoZSByZXN1bHRzLlxuXHRcdFx0cmV0dXJuIGRpZmZzQS5jb25jYXQoIFtcblx0XHRcdFx0WyBESUZGX0VRVUFMLCBtaWRDb21tb24gXVxuXHRcdFx0XSwgZGlmZnNCICk7XG5cdFx0fVxuXG5cdFx0aWYgKCBjaGVja2xpbmVzICYmIHRleHQxLmxlbmd0aCA+IDEwMCAmJiB0ZXh0Mi5sZW5ndGggPiAxMDAgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kaWZmTGluZU1vZGUoIHRleHQxLCB0ZXh0MiwgZGVhZGxpbmUgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5kaWZmQmlzZWN0KCB0ZXh0MSwgdGV4dDIsIGRlYWRsaW5lICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIERvIHRoZSB0d28gdGV4dHMgc2hhcmUgYSBzdWJzdHJpbmcgd2hpY2ggaXMgYXQgbGVhc3QgaGFsZiB0aGUgbGVuZ3RoIG9mIHRoZVxuXHQgKiBsb25nZXIgdGV4dD9cblx0ICogVGhpcyBzcGVlZHVwIGNhbiBwcm9kdWNlIG5vbi1taW5pbWFsIGRpZmZzLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59IEZpdmUgZWxlbWVudCBBcnJheSwgY29udGFpbmluZyB0aGUgcHJlZml4IG9mXG5cdCAqICAgICB0ZXh0MSwgdGhlIHN1ZmZpeCBvZiB0ZXh0MSwgdGhlIHByZWZpeCBvZiB0ZXh0MiwgdGhlIHN1ZmZpeCBvZlxuXHQgKiAgICAgdGV4dDIgYW5kIHRoZSBjb21tb24gbWlkZGxlLiAgT3IgbnVsbCBpZiB0aGVyZSB3YXMgbm8gbWF0Y2guXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkhhbGZNYXRjaCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIGxvbmd0ZXh0LCBzaG9ydHRleHQsIGRtcCxcblx0XHRcdHRleHQxQSwgdGV4dDJCLCB0ZXh0MkEsIHRleHQxQiwgbWlkQ29tbW9uLFxuXHRcdFx0aG0xLCBobTIsIGhtO1xuXG5cdFx0bG9uZ3RleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MSA6IHRleHQyO1xuXHRcdHNob3J0dGV4dCA9IHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCA/IHRleHQyIDogdGV4dDE7XG5cdFx0aWYgKCBsb25ndGV4dC5sZW5ndGggPCA0IHx8IHNob3J0dGV4dC5sZW5ndGggKiAyIDwgbG9uZ3RleHQubGVuZ3RoICkge1xuXHRcdFx0cmV0dXJuIG51bGw7IC8vIFBvaW50bGVzcy5cblx0XHR9XG5cdFx0ZG1wID0gdGhpczsgLy8gJ3RoaXMnIGJlY29tZXMgJ3dpbmRvdycgaW4gYSBjbG9zdXJlLlxuXG5cdFx0LyoqXG5cdFx0ICogRG9lcyBhIHN1YnN0cmluZyBvZiBzaG9ydHRleHQgZXhpc3Qgd2l0aGluIGxvbmd0ZXh0IHN1Y2ggdGhhdCB0aGUgc3Vic3RyaW5nXG5cdFx0ICogaXMgYXQgbGVhc3QgaGFsZiB0aGUgbGVuZ3RoIG9mIGxvbmd0ZXh0P1xuXHRcdCAqIENsb3N1cmUsIGJ1dCBkb2VzIG5vdCByZWZlcmVuY2UgYW55IGV4dGVybmFsIHZhcmlhYmxlcy5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gbG9uZ3RleHQgTG9uZ2VyIHN0cmluZy5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gc2hvcnR0ZXh0IFNob3J0ZXIgc3RyaW5nLlxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBpIFN0YXJ0IGluZGV4IG9mIHF1YXJ0ZXIgbGVuZ3RoIHN1YnN0cmluZyB3aXRoaW4gbG9uZ3RleHQuXG5cdFx0ICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59IEZpdmUgZWxlbWVudCBBcnJheSwgY29udGFpbmluZyB0aGUgcHJlZml4IG9mXG5cdFx0ICogICAgIGxvbmd0ZXh0LCB0aGUgc3VmZml4IG9mIGxvbmd0ZXh0LCB0aGUgcHJlZml4IG9mIHNob3J0dGV4dCwgdGhlIHN1ZmZpeFxuXHRcdCAqICAgICBvZiBzaG9ydHRleHQgYW5kIHRoZSBjb21tb24gbWlkZGxlLiAgT3IgbnVsbCBpZiB0aGVyZSB3YXMgbm8gbWF0Y2guXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkaWZmSGFsZk1hdGNoSSggbG9uZ3RleHQsIHNob3J0dGV4dCwgaSApIHtcblx0XHRcdHZhciBzZWVkLCBqLCBiZXN0Q29tbW9uLCBwcmVmaXhMZW5ndGgsIHN1ZmZpeExlbmd0aCxcblx0XHRcdFx0YmVzdExvbmd0ZXh0QSwgYmVzdExvbmd0ZXh0QiwgYmVzdFNob3J0dGV4dEEsIGJlc3RTaG9ydHRleHRCO1xuXHRcdFx0Ly8gU3RhcnQgd2l0aCBhIDEvNCBsZW5ndGggc3Vic3RyaW5nIGF0IHBvc2l0aW9uIGkgYXMgYSBzZWVkLlxuXHRcdFx0c2VlZCA9IGxvbmd0ZXh0LnN1YnN0cmluZyggaSwgaSArIE1hdGguZmxvb3IoIGxvbmd0ZXh0Lmxlbmd0aCAvIDQgKSApO1xuXHRcdFx0aiA9IC0xO1xuXHRcdFx0YmVzdENvbW1vbiA9IFwiXCI7XG5cdFx0XHR3aGlsZSAoICggaiA9IHNob3J0dGV4dC5pbmRleE9mKCBzZWVkLCBqICsgMSApICkgIT09IC0xICkge1xuXHRcdFx0XHRwcmVmaXhMZW5ndGggPSBkbXAuZGlmZkNvbW1vblByZWZpeCggbG9uZ3RleHQuc3Vic3RyaW5nKCBpICksXG5cdFx0XHRcdFx0c2hvcnR0ZXh0LnN1YnN0cmluZyggaiApICk7XG5cdFx0XHRcdHN1ZmZpeExlbmd0aCA9IGRtcC5kaWZmQ29tbW9uU3VmZml4KCBsb25ndGV4dC5zdWJzdHJpbmcoIDAsIGkgKSxcblx0XHRcdFx0XHRzaG9ydHRleHQuc3Vic3RyaW5nKCAwLCBqICkgKTtcblx0XHRcdFx0aWYgKCBiZXN0Q29tbW9uLmxlbmd0aCA8IHN1ZmZpeExlbmd0aCArIHByZWZpeExlbmd0aCApIHtcblx0XHRcdFx0XHRiZXN0Q29tbW9uID0gc2hvcnR0ZXh0LnN1YnN0cmluZyggaiAtIHN1ZmZpeExlbmd0aCwgaiApICtcblx0XHRcdFx0XHRcdHNob3J0dGV4dC5zdWJzdHJpbmcoIGosIGogKyBwcmVmaXhMZW5ndGggKTtcblx0XHRcdFx0XHRiZXN0TG9uZ3RleHRBID0gbG9uZ3RleHQuc3Vic3RyaW5nKCAwLCBpIC0gc3VmZml4TGVuZ3RoICk7XG5cdFx0XHRcdFx0YmVzdExvbmd0ZXh0QiA9IGxvbmd0ZXh0LnN1YnN0cmluZyggaSArIHByZWZpeExlbmd0aCApO1xuXHRcdFx0XHRcdGJlc3RTaG9ydHRleHRBID0gc2hvcnR0ZXh0LnN1YnN0cmluZyggMCwgaiAtIHN1ZmZpeExlbmd0aCApO1xuXHRcdFx0XHRcdGJlc3RTaG9ydHRleHRCID0gc2hvcnR0ZXh0LnN1YnN0cmluZyggaiArIHByZWZpeExlbmd0aCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGJlc3RDb21tb24ubGVuZ3RoICogMiA+PSBsb25ndGV4dC5sZW5ndGggKSB7XG5cdFx0XHRcdHJldHVybiBbIGJlc3RMb25ndGV4dEEsIGJlc3RMb25ndGV4dEIsXG5cdFx0XHRcdFx0YmVzdFNob3J0dGV4dEEsIGJlc3RTaG9ydHRleHRCLCBiZXN0Q29tbW9uXG5cdFx0XHRcdF07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBGaXJzdCBjaGVjayBpZiB0aGUgc2Vjb25kIHF1YXJ0ZXIgaXMgdGhlIHNlZWQgZm9yIGEgaGFsZi1tYXRjaC5cblx0XHRobTEgPSBkaWZmSGFsZk1hdGNoSSggbG9uZ3RleHQsIHNob3J0dGV4dCxcblx0XHRcdE1hdGguY2VpbCggbG9uZ3RleHQubGVuZ3RoIC8gNCApICk7XG5cdFx0Ly8gQ2hlY2sgYWdhaW4gYmFzZWQgb24gdGhlIHRoaXJkIHF1YXJ0ZXIuXG5cdFx0aG0yID0gZGlmZkhhbGZNYXRjaEkoIGxvbmd0ZXh0LCBzaG9ydHRleHQsXG5cdFx0XHRNYXRoLmNlaWwoIGxvbmd0ZXh0Lmxlbmd0aCAvIDIgKSApO1xuXHRcdGlmICggIWhtMSAmJiAhaG0yICkge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSBlbHNlIGlmICggIWhtMiApIHtcblx0XHRcdGhtID0gaG0xO1xuXHRcdH0gZWxzZSBpZiAoICFobTEgKSB7XG5cdFx0XHRobSA9IGhtMjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gQm90aCBtYXRjaGVkLiAgU2VsZWN0IHRoZSBsb25nZXN0LlxuXHRcdFx0aG0gPSBobTFbIDQgXS5sZW5ndGggPiBobTJbIDQgXS5sZW5ndGggPyBobTEgOiBobTI7XG5cdFx0fVxuXG5cdFx0Ly8gQSBoYWxmLW1hdGNoIHdhcyBmb3VuZCwgc29ydCBvdXQgdGhlIHJldHVybiBkYXRhLlxuXHRcdHRleHQxQSwgdGV4dDFCLCB0ZXh0MkEsIHRleHQyQjtcblx0XHRpZiAoIHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCApIHtcblx0XHRcdHRleHQxQSA9IGhtWyAwIF07XG5cdFx0XHR0ZXh0MUIgPSBobVsgMSBdO1xuXHRcdFx0dGV4dDJBID0gaG1bIDIgXTtcblx0XHRcdHRleHQyQiA9IGhtWyAzIF07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRleHQyQSA9IGhtWyAwIF07XG5cdFx0XHR0ZXh0MkIgPSBobVsgMSBdO1xuXHRcdFx0dGV4dDFBID0gaG1bIDIgXTtcblx0XHRcdHRleHQxQiA9IGhtWyAzIF07XG5cdFx0fVxuXHRcdG1pZENvbW1vbiA9IGhtWyA0IF07XG5cdFx0cmV0dXJuIFsgdGV4dDFBLCB0ZXh0MUIsIHRleHQyQSwgdGV4dDJCLCBtaWRDb21tb24gXTtcblx0fTtcblxuXHQvKipcblx0ICogRG8gYSBxdWljayBsaW5lLWxldmVsIGRpZmYgb24gYm90aCBzdHJpbmdzLCB0aGVuIHJlZGlmZiB0aGUgcGFydHMgZm9yXG5cdCAqIGdyZWF0ZXIgYWNjdXJhY3kuXG5cdCAqIFRoaXMgc3BlZWR1cCBjYW4gcHJvZHVjZSBub24tbWluaW1hbCBkaWZmcy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIHdoZW4gdGhlIGRpZmYgc2hvdWxkIGJlIGNvbXBsZXRlIGJ5LlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkxpbmVNb2RlID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIGEsIGRpZmZzLCBsaW5lYXJyYXksIHBvaW50ZXIsIGNvdW50SW5zZXJ0LFxuXHRcdFx0Y291bnREZWxldGUsIHRleHRJbnNlcnQsIHRleHREZWxldGUsIGo7XG5cdFx0Ly8gU2NhbiB0aGUgdGV4dCBvbiBhIGxpbmUtYnktbGluZSBiYXNpcyBmaXJzdC5cblx0XHRhID0gdGhpcy5kaWZmTGluZXNUb0NoYXJzKCB0ZXh0MSwgdGV4dDIgKTtcblx0XHR0ZXh0MSA9IGEuY2hhcnMxO1xuXHRcdHRleHQyID0gYS5jaGFyczI7XG5cdFx0bGluZWFycmF5ID0gYS5saW5lQXJyYXk7XG5cblx0XHRkaWZmcyA9IHRoaXMuRGlmZk1haW4oIHRleHQxLCB0ZXh0MiwgZmFsc2UsIGRlYWRsaW5lICk7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBkaWZmIGJhY2sgdG8gb3JpZ2luYWwgdGV4dC5cblx0XHR0aGlzLmRpZmZDaGFyc1RvTGluZXMoIGRpZmZzLCBsaW5lYXJyYXkgKTtcblx0XHQvLyBFbGltaW5hdGUgZnJlYWsgbWF0Y2hlcyAoZS5nLiBibGFuayBsaW5lcylcblx0XHR0aGlzLmRpZmZDbGVhbnVwU2VtYW50aWMoIGRpZmZzICk7XG5cblx0XHQvLyBSZWRpZmYgYW55IHJlcGxhY2VtZW50IGJsb2NrcywgdGhpcyB0aW1lIGNoYXJhY3Rlci1ieS1jaGFyYWN0ZXIuXG5cdFx0Ly8gQWRkIGEgZHVtbXkgZW50cnkgYXQgdGhlIGVuZC5cblx0XHRkaWZmcy5wdXNoKCBbIERJRkZfRVFVQUwsIFwiXCIgXSApO1xuXHRcdHBvaW50ZXIgPSAwO1xuXHRcdGNvdW50RGVsZXRlID0gMDtcblx0XHRjb3VudEluc2VydCA9IDA7XG5cdFx0dGV4dERlbGV0ZSA9IFwiXCI7XG5cdFx0dGV4dEluc2VydCA9IFwiXCI7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXHRcdFx0c3dpdGNoICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdICkge1xuXHRcdFx0Y2FzZSBESUZGX0lOU0VSVDpcblx0XHRcdFx0Y291bnRJbnNlcnQrKztcblx0XHRcdFx0dGV4dEluc2VydCArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0RFTEVURTpcblx0XHRcdFx0Y291bnREZWxldGUrKztcblx0XHRcdFx0dGV4dERlbGV0ZSArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0VRVUFMOlxuXHRcdFx0XHQvLyBVcG9uIHJlYWNoaW5nIGFuIGVxdWFsaXR5LCBjaGVjayBmb3IgcHJpb3IgcmVkdW5kYW5jaWVzLlxuXHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlID49IDEgJiYgY291bnRJbnNlcnQgPj0gMSApIHtcblx0XHRcdFx0XHQvLyBEZWxldGUgdGhlIG9mZmVuZGluZyByZWNvcmRzIGFuZCBhZGQgdGhlIG1lcmdlZCBvbmVzLlxuXHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0ICk7XG5cdFx0XHRcdFx0cG9pbnRlciA9IHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0O1xuXHRcdFx0XHRcdGEgPSB0aGlzLkRpZmZNYWluKCB0ZXh0RGVsZXRlLCB0ZXh0SW5zZXJ0LCBmYWxzZSwgZGVhZGxpbmUgKTtcblx0XHRcdFx0XHRmb3IgKCBqID0gYS5sZW5ndGggLSAxOyBqID49IDA7IGotLSApIHtcblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciwgMCwgYVsgaiBdICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHBvaW50ZXIgPSBwb2ludGVyICsgYS5sZW5ndGg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnRJbnNlcnQgPSAwO1xuXHRcdFx0XHRjb3VudERlbGV0ZSA9IDA7XG5cdFx0XHRcdHRleHREZWxldGUgPSBcIlwiO1xuXHRcdFx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXHRcdGRpZmZzLnBvcCgpOyAvLyBSZW1vdmUgdGhlIGR1bW15IGVudHJ5IGF0IHRoZSBlbmQuXG5cblx0XHRyZXR1cm4gZGlmZnM7XG5cdH07XG5cblx0LyoqXG5cdCAqIEZpbmQgdGhlICdtaWRkbGUgc25ha2UnIG9mIGEgZGlmZiwgc3BsaXQgdGhlIHByb2JsZW0gaW4gdHdvXG5cdCAqIGFuZCByZXR1cm4gdGhlIHJlY3Vyc2l2ZWx5IGNvbnN0cnVjdGVkIGRpZmYuXG5cdCAqIFNlZSBNeWVycyAxOTg2IHBhcGVyOiBBbiBPKE5EKSBEaWZmZXJlbmNlIEFsZ29yaXRobSBhbmQgSXRzIFZhcmlhdGlvbnMuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVhZGxpbmUgVGltZSBhdCB3aGljaCB0byBiYWlsIGlmIG5vdCB5ZXQgY29tcGxldGUuXG5cdCAqIEByZXR1cm4geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQmlzZWN0ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIHRleHQxTGVuZ3RoLCB0ZXh0Mkxlbmd0aCwgbWF4RCwgdk9mZnNldCwgdkxlbmd0aCxcblx0XHRcdHYxLCB2MiwgeCwgZGVsdGEsIGZyb250LCBrMXN0YXJ0LCBrMWVuZCwgazJzdGFydCxcblx0XHRcdGsyZW5kLCBrMk9mZnNldCwgazFPZmZzZXQsIHgxLCB4MiwgeTEsIHkyLCBkLCBrMSwgazI7XG5cdFx0Ly8gQ2FjaGUgdGhlIHRleHQgbGVuZ3RocyB0byBwcmV2ZW50IG11bHRpcGxlIGNhbGxzLlxuXHRcdHRleHQxTGVuZ3RoID0gdGV4dDEubGVuZ3RoO1xuXHRcdHRleHQyTGVuZ3RoID0gdGV4dDIubGVuZ3RoO1xuXHRcdG1heEQgPSBNYXRoLmNlaWwoICggdGV4dDFMZW5ndGggKyB0ZXh0Mkxlbmd0aCApIC8gMiApO1xuXHRcdHZPZmZzZXQgPSBtYXhEO1xuXHRcdHZMZW5ndGggPSAyICogbWF4RDtcblx0XHR2MSA9IG5ldyBBcnJheSggdkxlbmd0aCApO1xuXHRcdHYyID0gbmV3IEFycmF5KCB2TGVuZ3RoICk7XG5cdFx0Ly8gU2V0dGluZyBhbGwgZWxlbWVudHMgdG8gLTEgaXMgZmFzdGVyIGluIENocm9tZSAmIEZpcmVmb3ggdGhhbiBtaXhpbmdcblx0XHQvLyBpbnRlZ2VycyBhbmQgdW5kZWZpbmVkLlxuXHRcdGZvciAoIHggPSAwOyB4IDwgdkxlbmd0aDsgeCsrICkge1xuXHRcdFx0djFbIHggXSA9IC0xO1xuXHRcdFx0djJbIHggXSA9IC0xO1xuXHRcdH1cblx0XHR2MVsgdk9mZnNldCArIDEgXSA9IDA7XG5cdFx0djJbIHZPZmZzZXQgKyAxIF0gPSAwO1xuXHRcdGRlbHRhID0gdGV4dDFMZW5ndGggLSB0ZXh0Mkxlbmd0aDtcblx0XHQvLyBJZiB0aGUgdG90YWwgbnVtYmVyIG9mIGNoYXJhY3RlcnMgaXMgb2RkLCB0aGVuIHRoZSBmcm9udCBwYXRoIHdpbGwgY29sbGlkZVxuXHRcdC8vIHdpdGggdGhlIHJldmVyc2UgcGF0aC5cblx0XHRmcm9udCA9ICggZGVsdGEgJSAyICE9PSAwICk7XG5cdFx0Ly8gT2Zmc2V0cyBmb3Igc3RhcnQgYW5kIGVuZCBvZiBrIGxvb3AuXG5cdFx0Ly8gUHJldmVudHMgbWFwcGluZyBvZiBzcGFjZSBiZXlvbmQgdGhlIGdyaWQuXG5cdFx0azFzdGFydCA9IDA7XG5cdFx0azFlbmQgPSAwO1xuXHRcdGsyc3RhcnQgPSAwO1xuXHRcdGsyZW5kID0gMDtcblx0XHRmb3IgKCBkID0gMDsgZCA8IG1heEQ7IGQrKyApIHtcblx0XHRcdC8vIEJhaWwgb3V0IGlmIGRlYWRsaW5lIGlzIHJlYWNoZWQuXG5cdFx0XHRpZiAoICggbmV3IERhdGUoKSApLmdldFRpbWUoKSA+IGRlYWRsaW5lICkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0Ly8gV2FsayB0aGUgZnJvbnQgcGF0aCBvbmUgc3RlcC5cblx0XHRcdGZvciAoIGsxID0gLWQgKyBrMXN0YXJ0OyBrMSA8PSBkIC0gazFlbmQ7IGsxICs9IDIgKSB7XG5cdFx0XHRcdGsxT2Zmc2V0ID0gdk9mZnNldCArIGsxO1xuXHRcdFx0XHRpZiAoIGsxID09PSAtZCB8fCAoIGsxICE9PSBkICYmIHYxWyBrMU9mZnNldCAtIDEgXSA8IHYxWyBrMU9mZnNldCArIDEgXSApICkge1xuXHRcdFx0XHRcdHgxID0gdjFbIGsxT2Zmc2V0ICsgMSBdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHgxID0gdjFbIGsxT2Zmc2V0IC0gMSBdICsgMTtcblx0XHRcdFx0fVxuXHRcdFx0XHR5MSA9IHgxIC0gazE7XG5cdFx0XHRcdHdoaWxlICggeDEgPCB0ZXh0MUxlbmd0aCAmJiB5MSA8IHRleHQyTGVuZ3RoICYmXG5cdFx0XHRcdFx0dGV4dDEuY2hhckF0KCB4MSApID09PSB0ZXh0Mi5jaGFyQXQoIHkxICkgKSB7XG5cdFx0XHRcdFx0eDErKztcblx0XHRcdFx0XHR5MSsrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHYxWyBrMU9mZnNldCBdID0geDE7XG5cdFx0XHRcdGlmICggeDEgPiB0ZXh0MUxlbmd0aCApIHtcblx0XHRcdFx0XHQvLyBSYW4gb2ZmIHRoZSByaWdodCBvZiB0aGUgZ3JhcGguXG5cdFx0XHRcdFx0azFlbmQgKz0gMjtcblx0XHRcdFx0fSBlbHNlIGlmICggeTEgPiB0ZXh0Mkxlbmd0aCApIHtcblx0XHRcdFx0XHQvLyBSYW4gb2ZmIHRoZSBib3R0b20gb2YgdGhlIGdyYXBoLlxuXHRcdFx0XHRcdGsxc3RhcnQgKz0gMjtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJvbnQgKSB7XG5cdFx0XHRcdFx0azJPZmZzZXQgPSB2T2Zmc2V0ICsgZGVsdGEgLSBrMTtcblx0XHRcdFx0XHRpZiAoIGsyT2Zmc2V0ID49IDAgJiYgazJPZmZzZXQgPCB2TGVuZ3RoICYmIHYyWyBrMk9mZnNldCBdICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdC8vIE1pcnJvciB4MiBvbnRvIHRvcC1sZWZ0IGNvb3JkaW5hdGUgc3lzdGVtLlxuXHRcdFx0XHRcdFx0eDIgPSB0ZXh0MUxlbmd0aCAtIHYyWyBrMk9mZnNldCBdO1xuXHRcdFx0XHRcdFx0aWYgKCB4MSA+PSB4MiApIHtcblx0XHRcdFx0XHRcdFx0Ly8gT3ZlcmxhcCBkZXRlY3RlZC5cblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlmZkJpc2VjdFNwbGl0KCB0ZXh0MSwgdGV4dDIsIHgxLCB5MSwgZGVhZGxpbmUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gV2FsayB0aGUgcmV2ZXJzZSBwYXRoIG9uZSBzdGVwLlxuXHRcdFx0Zm9yICggazIgPSAtZCArIGsyc3RhcnQ7IGsyIDw9IGQgLSBrMmVuZDsgazIgKz0gMiApIHtcblx0XHRcdFx0azJPZmZzZXQgPSB2T2Zmc2V0ICsgazI7XG5cdFx0XHRcdGlmICggazIgPT09IC1kIHx8ICggazIgIT09IGQgJiYgdjJbIGsyT2Zmc2V0IC0gMSBdIDwgdjJbIGsyT2Zmc2V0ICsgMSBdICkgKSB7XG5cdFx0XHRcdFx0eDIgPSB2MlsgazJPZmZzZXQgKyAxIF07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0eDIgPSB2MlsgazJPZmZzZXQgLSAxIF0gKyAxO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHkyID0geDIgLSBrMjtcblx0XHRcdFx0d2hpbGUgKCB4MiA8IHRleHQxTGVuZ3RoICYmIHkyIDwgdGV4dDJMZW5ndGggJiZcblx0XHRcdFx0XHR0ZXh0MS5jaGFyQXQoIHRleHQxTGVuZ3RoIC0geDIgLSAxICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuY2hhckF0KCB0ZXh0Mkxlbmd0aCAtIHkyIC0gMSApICkge1xuXHRcdFx0XHRcdHgyKys7XG5cdFx0XHRcdFx0eTIrKztcblx0XHRcdFx0fVxuXHRcdFx0XHR2MlsgazJPZmZzZXQgXSA9IHgyO1xuXHRcdFx0XHRpZiAoIHgyID4gdGV4dDFMZW5ndGggKSB7XG5cdFx0XHRcdFx0Ly8gUmFuIG9mZiB0aGUgbGVmdCBvZiB0aGUgZ3JhcGguXG5cdFx0XHRcdFx0azJlbmQgKz0gMjtcblx0XHRcdFx0fSBlbHNlIGlmICggeTIgPiB0ZXh0Mkxlbmd0aCApIHtcblx0XHRcdFx0XHQvLyBSYW4gb2ZmIHRoZSB0b3Agb2YgdGhlIGdyYXBoLlxuXHRcdFx0XHRcdGsyc3RhcnQgKz0gMjtcblx0XHRcdFx0fSBlbHNlIGlmICggIWZyb250ICkge1xuXHRcdFx0XHRcdGsxT2Zmc2V0ID0gdk9mZnNldCArIGRlbHRhIC0gazI7XG5cdFx0XHRcdFx0aWYgKCBrMU9mZnNldCA+PSAwICYmIGsxT2Zmc2V0IDwgdkxlbmd0aCAmJiB2MVsgazFPZmZzZXQgXSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0XHR4MSA9IHYxWyBrMU9mZnNldCBdO1xuXHRcdFx0XHRcdFx0eTEgPSB2T2Zmc2V0ICsgeDEgLSBrMU9mZnNldDtcblx0XHRcdFx0XHRcdC8vIE1pcnJvciB4MiBvbnRvIHRvcC1sZWZ0IGNvb3JkaW5hdGUgc3lzdGVtLlxuXHRcdFx0XHRcdFx0eDIgPSB0ZXh0MUxlbmd0aCAtIHgyO1xuXHRcdFx0XHRcdFx0aWYgKCB4MSA+PSB4MiApIHtcblx0XHRcdFx0XHRcdFx0Ly8gT3ZlcmxhcCBkZXRlY3RlZC5cblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlmZkJpc2VjdFNwbGl0KCB0ZXh0MSwgdGV4dDIsIHgxLCB5MSwgZGVhZGxpbmUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gRGlmZiB0b29rIHRvbyBsb25nIGFuZCBoaXQgdGhlIGRlYWRsaW5lIG9yXG5cdFx0Ly8gbnVtYmVyIG9mIGRpZmZzIGVxdWFscyBudW1iZXIgb2YgY2hhcmFjdGVycywgbm8gY29tbW9uYWxpdHkgYXQgYWxsLlxuXHRcdHJldHVybiBbXG5cdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0MSBdLFxuXHRcdFx0WyBESUZGX0lOU0VSVCwgdGV4dDIgXVxuXHRcdF07XG5cdH07XG5cblx0LyoqXG5cdCAqIEdpdmVuIHRoZSBsb2NhdGlvbiBvZiB0aGUgJ21pZGRsZSBzbmFrZScsIHNwbGl0IHRoZSBkaWZmIGluIHR3byBwYXJ0c1xuXHQgKiBhbmQgcmVjdXJzZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB4IEluZGV4IG9mIHNwbGl0IHBvaW50IGluIHRleHQxLlxuXHQgKiBAcGFyYW0ge251bWJlcn0geSBJbmRleCBvZiBzcGxpdCBwb2ludCBpbiB0ZXh0Mi5cblx0ICogQHBhcmFtIHtudW1iZXJ9IGRlYWRsaW5lIFRpbWUgYXQgd2hpY2ggdG8gYmFpbCBpZiBub3QgeWV0IGNvbXBsZXRlLlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkJpc2VjdFNwbGl0ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgeCwgeSwgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIHRleHQxYSwgdGV4dDFiLCB0ZXh0MmEsIHRleHQyYiwgZGlmZnMsIGRpZmZzYjtcblx0XHR0ZXh0MWEgPSB0ZXh0MS5zdWJzdHJpbmcoIDAsIHggKTtcblx0XHR0ZXh0MmEgPSB0ZXh0Mi5zdWJzdHJpbmcoIDAsIHkgKTtcblx0XHR0ZXh0MWIgPSB0ZXh0MS5zdWJzdHJpbmcoIHggKTtcblx0XHR0ZXh0MmIgPSB0ZXh0Mi5zdWJzdHJpbmcoIHkgKTtcblxuXHRcdC8vIENvbXB1dGUgYm90aCBkaWZmcyBzZXJpYWxseS5cblx0XHRkaWZmcyA9IHRoaXMuRGlmZk1haW4oIHRleHQxYSwgdGV4dDJhLCBmYWxzZSwgZGVhZGxpbmUgKTtcblx0XHRkaWZmc2IgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MWIsIHRleHQyYiwgZmFsc2UsIGRlYWRsaW5lICk7XG5cblx0XHRyZXR1cm4gZGlmZnMuY29uY2F0KCBkaWZmc2IgKTtcblx0fTtcblxuXHQvKipcblx0ICogUmVkdWNlIHRoZSBudW1iZXIgb2YgZWRpdHMgYnkgZWxpbWluYXRpbmcgc2VtYW50aWNhbGx5IHRyaXZpYWwgZXF1YWxpdGllcy5cblx0ICogQHBhcmFtIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gZGlmZnMgQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNsZWFudXBTZW1hbnRpYyA9IGZ1bmN0aW9uKCBkaWZmcyApIHtcblx0XHR2YXIgY2hhbmdlcywgZXF1YWxpdGllcywgZXF1YWxpdGllc0xlbmd0aCwgbGFzdGVxdWFsaXR5LFxuXHRcdFx0cG9pbnRlciwgbGVuZ3RoSW5zZXJ0aW9uczIsIGxlbmd0aERlbGV0aW9uczIsIGxlbmd0aEluc2VydGlvbnMxLFxuXHRcdFx0bGVuZ3RoRGVsZXRpb25zMSwgZGVsZXRpb24sIGluc2VydGlvbiwgb3ZlcmxhcExlbmd0aDEsIG92ZXJsYXBMZW5ndGgyO1xuXHRcdGNoYW5nZXMgPSBmYWxzZTtcblx0XHRlcXVhbGl0aWVzID0gW107IC8vIFN0YWNrIG9mIGluZGljZXMgd2hlcmUgZXF1YWxpdGllcyBhcmUgZm91bmQuXG5cdFx0ZXF1YWxpdGllc0xlbmd0aCA9IDA7IC8vIEtlZXBpbmcgb3VyIG93biBsZW5ndGggdmFyIGlzIGZhc3RlciBpbiBKUy5cblx0XHQvKiogQHR5cGUgez9zdHJpbmd9ICovXG5cdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblx0XHQvLyBBbHdheXMgZXF1YWwgdG8gZGlmZnNbZXF1YWxpdGllc1tlcXVhbGl0aWVzTGVuZ3RoIC0gMV1dWzFdXG5cdFx0cG9pbnRlciA9IDA7IC8vIEluZGV4IG9mIGN1cnJlbnQgcG9zaXRpb24uXG5cdFx0Ly8gTnVtYmVyIG9mIGNoYXJhY3RlcnMgdGhhdCBjaGFuZ2VkIHByaW9yIHRvIHRoZSBlcXVhbGl0eS5cblx0XHRsZW5ndGhJbnNlcnRpb25zMSA9IDA7XG5cdFx0bGVuZ3RoRGVsZXRpb25zMSA9IDA7XG5cdFx0Ly8gTnVtYmVyIG9mIGNoYXJhY3RlcnMgdGhhdCBjaGFuZ2VkIGFmdGVyIHRoZSBlcXVhbGl0eS5cblx0XHRsZW5ndGhJbnNlcnRpb25zMiA9IDA7XG5cdFx0bGVuZ3RoRGVsZXRpb25zMiA9IDA7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfRVFVQUwgKSB7IC8vIEVxdWFsaXR5IGZvdW5kLlxuXHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoKysgXSA9IHBvaW50ZXI7XG5cdFx0XHRcdGxlbmd0aEluc2VydGlvbnMxID0gbGVuZ3RoSW5zZXJ0aW9uczI7XG5cdFx0XHRcdGxlbmd0aERlbGV0aW9uczEgPSBsZW5ndGhEZWxldGlvbnMyO1xuXHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMiA9IDA7XG5cdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgPSAwO1xuXHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHR9IGVsc2UgeyAvLyBBbiBpbnNlcnRpb24gb3IgZGVsZXRpb24uXG5cdFx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0lOU0VSVCApIHtcblx0XHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMiArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF0ubGVuZ3RoO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdLmxlbmd0aDtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBFbGltaW5hdGUgYW4gZXF1YWxpdHkgdGhhdCBpcyBzbWFsbGVyIG9yIGVxdWFsIHRvIHRoZSBlZGl0cyBvbiBib3RoXG5cdFx0XHRcdC8vIHNpZGVzIG9mIGl0LlxuXHRcdFx0XHRpZiAoIGxhc3RlcXVhbGl0eSAmJiAoIGxhc3RlcXVhbGl0eS5sZW5ndGggPD1cblx0XHRcdFx0XHRcdE1hdGgubWF4KCBsZW5ndGhJbnNlcnRpb25zMSwgbGVuZ3RoRGVsZXRpb25zMSApICkgJiZcblx0XHRcdFx0XHRcdCggbGFzdGVxdWFsaXR5Lmxlbmd0aCA8PSBNYXRoLm1heCggbGVuZ3RoSW5zZXJ0aW9uczIsXG5cdFx0XHRcdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgKSApICkge1xuXG5cdFx0XHRcdFx0Ly8gRHVwbGljYXRlIHJlY29yZC5cblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdLFxuXHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFsgRElGRl9ERUxFVEUsIGxhc3RlcXVhbGl0eSBdXG5cdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdC8vIENoYW5nZSBzZWNvbmQgY29weSB0byBpbnNlcnQuXG5cdFx0XHRcdFx0ZGlmZnNbIGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gKyAxIF1bIDAgXSA9IERJRkZfSU5TRVJUO1xuXG5cdFx0XHRcdFx0Ly8gVGhyb3cgYXdheSB0aGUgZXF1YWxpdHkgd2UganVzdCBkZWxldGVkLlxuXHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGgtLTtcblxuXHRcdFx0XHRcdC8vIFRocm93IGF3YXkgdGhlIHByZXZpb3VzIGVxdWFsaXR5IChpdCBuZWVkcyB0byBiZSByZWV2YWx1YXRlZCkuXG5cdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tO1xuXHRcdFx0XHRcdHBvaW50ZXIgPSBlcXVhbGl0aWVzTGVuZ3RoID4gMCA/IGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gOiAtMTtcblxuXHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb3VudGVycy5cblx0XHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMSA9IDA7XG5cdFx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMSA9IDA7XG5cdFx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczIgPSAwO1xuXHRcdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgPSAwO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0XHRcdFx0Y2hhbmdlcyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cblx0XHQvLyBOb3JtYWxpemUgdGhlIGRpZmYuXG5cdFx0aWYgKCBjaGFuZ2VzICkge1xuXHRcdFx0dGhpcy5kaWZmQ2xlYW51cE1lcmdlKCBkaWZmcyApO1xuXHRcdH1cblxuXHRcdC8vIEZpbmQgYW55IG92ZXJsYXBzIGJldHdlZW4gZGVsZXRpb25zIGFuZCBpbnNlcnRpb25zLlxuXHRcdC8vIGUuZzogPGRlbD5hYmN4eHg8L2RlbD48aW5zPnh4eGRlZjwvaW5zPlxuXHRcdC8vICAgLT4gPGRlbD5hYmM8L2RlbD54eHg8aW5zPmRlZjwvaW5zPlxuXHRcdC8vIGUuZzogPGRlbD54eHhhYmM8L2RlbD48aW5zPmRlZnh4eDwvaW5zPlxuXHRcdC8vICAgLT4gPGlucz5kZWY8L2lucz54eHg8ZGVsPmFiYzwvZGVsPlxuXHRcdC8vIE9ubHkgZXh0cmFjdCBhbiBvdmVybGFwIGlmIGl0IGlzIGFzIGJpZyBhcyB0aGUgZWRpdCBhaGVhZCBvciBiZWhpbmQgaXQuXG5cdFx0cG9pbnRlciA9IDE7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMCBdID09PSBESUZGX0RFTEVURSAmJlxuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9JTlNFUlQgKSB7XG5cdFx0XHRcdGRlbGV0aW9uID0gZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXTtcblx0XHRcdFx0aW5zZXJ0aW9uID0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRvdmVybGFwTGVuZ3RoMSA9IHRoaXMuZGlmZkNvbW1vbk92ZXJsYXAoIGRlbGV0aW9uLCBpbnNlcnRpb24gKTtcblx0XHRcdFx0b3ZlcmxhcExlbmd0aDIgPSB0aGlzLmRpZmZDb21tb25PdmVybGFwKCBpbnNlcnRpb24sIGRlbGV0aW9uICk7XG5cdFx0XHRcdGlmICggb3ZlcmxhcExlbmd0aDEgPj0gb3ZlcmxhcExlbmd0aDIgKSB7XG5cdFx0XHRcdFx0aWYgKCBvdmVybGFwTGVuZ3RoMSA+PSBkZWxldGlvbi5sZW5ndGggLyAyIHx8XG5cdFx0XHRcdFx0XHRcdG92ZXJsYXBMZW5ndGgxID49IGluc2VydGlvbi5sZW5ndGggLyAyICkge1xuXHRcdFx0XHRcdFx0Ly8gT3ZlcmxhcCBmb3VuZC4gIEluc2VydCBhbiBlcXVhbGl0eSBhbmQgdHJpbSB0aGUgc3Vycm91bmRpbmcgZWRpdHMuXG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRcdHBvaW50ZXIsXG5cdFx0XHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0XHRcdFsgRElGRl9FUVVBTCwgaW5zZXJ0aW9uLnN1YnN0cmluZyggMCwgb3ZlcmxhcExlbmd0aDEgKSBdXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRcdGRlbGV0aW9uLnN1YnN0cmluZyggMCwgZGVsZXRpb24ubGVuZ3RoIC0gb3ZlcmxhcExlbmd0aDEgKTtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0gPSBpbnNlcnRpb24uc3Vic3RyaW5nKCBvdmVybGFwTGVuZ3RoMSApO1xuXHRcdFx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAoIG92ZXJsYXBMZW5ndGgyID49IGRlbGV0aW9uLmxlbmd0aCAvIDIgfHxcblx0XHRcdFx0XHRcdFx0b3ZlcmxhcExlbmd0aDIgPj0gaW5zZXJ0aW9uLmxlbmd0aCAvIDIgKSB7XG5cblx0XHRcdFx0XHRcdC8vIFJldmVyc2Ugb3ZlcmxhcCBmb3VuZC5cblx0XHRcdFx0XHRcdC8vIEluc2VydCBhbiBlcXVhbGl0eSBhbmQgc3dhcCBhbmQgdHJpbSB0aGUgc3Vycm91bmRpbmcgZWRpdHMuXG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRcdHBvaW50ZXIsXG5cdFx0XHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0XHRcdFsgRElGRl9FUVVBTCwgZGVsZXRpb24uc3Vic3RyaW5nKCAwLCBvdmVybGFwTGVuZ3RoMiApIF1cblx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAwIF0gPSBESUZGX0lOU0VSVDtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gPVxuXHRcdFx0XHRcdFx0XHRpbnNlcnRpb24uc3Vic3RyaW5nKCAwLCBpbnNlcnRpb24ubGVuZ3RoIC0gb3ZlcmxhcExlbmd0aDIgKTtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAwIF0gPSBESUZGX0RFTEVURTtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0gPVxuXHRcdFx0XHRcdFx0XHRkZWxldGlvbi5zdWJzdHJpbmcoIG92ZXJsYXBMZW5ndGgyICk7XG5cdFx0XHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIERldGVybWluZSBpZiB0aGUgc3VmZml4IG9mIG9uZSBzdHJpbmcgaXMgdGhlIHByZWZpeCBvZiBhbm90aGVyLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7bnVtYmVyfSBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgY29tbW9uIHRvIHRoZSBlbmQgb2YgdGhlIGZpcnN0XG5cdCAqICAgICBzdHJpbmcgYW5kIHRoZSBzdGFydCBvZiB0aGUgc2Vjb25kIHN0cmluZy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ29tbW9uT3ZlcmxhcCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIHRleHQxTGVuZ3RoLCB0ZXh0Mkxlbmd0aCwgdGV4dExlbmd0aCxcblx0XHRcdGJlc3QsIGxlbmd0aCwgcGF0dGVybiwgZm91bmQ7XG5cdFx0Ly8gQ2FjaGUgdGhlIHRleHQgbGVuZ3RocyB0byBwcmV2ZW50IG11bHRpcGxlIGNhbGxzLlxuXHRcdHRleHQxTGVuZ3RoID0gdGV4dDEubGVuZ3RoO1xuXHRcdHRleHQyTGVuZ3RoID0gdGV4dDIubGVuZ3RoO1xuXHRcdC8vIEVsaW1pbmF0ZSB0aGUgbnVsbCBjYXNlLlxuXHRcdGlmICggdGV4dDFMZW5ndGggPT09IDAgfHwgdGV4dDJMZW5ndGggPT09IDAgKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0Ly8gVHJ1bmNhdGUgdGhlIGxvbmdlciBzdHJpbmcuXG5cdFx0aWYgKCB0ZXh0MUxlbmd0aCA+IHRleHQyTGVuZ3RoICkge1xuXHRcdFx0dGV4dDEgPSB0ZXh0MS5zdWJzdHJpbmcoIHRleHQxTGVuZ3RoIC0gdGV4dDJMZW5ndGggKTtcblx0XHR9IGVsc2UgaWYgKCB0ZXh0MUxlbmd0aCA8IHRleHQyTGVuZ3RoICkge1xuXHRcdFx0dGV4dDIgPSB0ZXh0Mi5zdWJzdHJpbmcoIDAsIHRleHQxTGVuZ3RoICk7XG5cdFx0fVxuXHRcdHRleHRMZW5ndGggPSBNYXRoLm1pbiggdGV4dDFMZW5ndGgsIHRleHQyTGVuZ3RoICk7XG5cdFx0Ly8gUXVpY2sgY2hlY2sgZm9yIHRoZSB3b3JzdCBjYXNlLlxuXHRcdGlmICggdGV4dDEgPT09IHRleHQyICkge1xuXHRcdFx0cmV0dXJuIHRleHRMZW5ndGg7XG5cdFx0fVxuXG5cdFx0Ly8gU3RhcnQgYnkgbG9va2luZyBmb3IgYSBzaW5nbGUgY2hhcmFjdGVyIG1hdGNoXG5cdFx0Ly8gYW5kIGluY3JlYXNlIGxlbmd0aCB1bnRpbCBubyBtYXRjaCBpcyBmb3VuZC5cblx0XHQvLyBQZXJmb3JtYW5jZSBhbmFseXNpczogaHR0cHM6Ly9uZWlsLmZyYXNlci5uYW1lL25ld3MvMjAxMC8xMS8wNC9cblx0XHRiZXN0ID0gMDtcblx0XHRsZW5ndGggPSAxO1xuXHRcdHdoaWxlICggdHJ1ZSApIHtcblx0XHRcdHBhdHRlcm4gPSB0ZXh0MS5zdWJzdHJpbmcoIHRleHRMZW5ndGggLSBsZW5ndGggKTtcblx0XHRcdGZvdW5kID0gdGV4dDIuaW5kZXhPZiggcGF0dGVybiApO1xuXHRcdFx0aWYgKCBmb3VuZCA9PT0gLTEgKSB7XG5cdFx0XHRcdHJldHVybiBiZXN0O1xuXHRcdFx0fVxuXHRcdFx0bGVuZ3RoICs9IGZvdW5kO1xuXHRcdFx0aWYgKCBmb3VuZCA9PT0gMCB8fCB0ZXh0MS5zdWJzdHJpbmcoIHRleHRMZW5ndGggLSBsZW5ndGggKSA9PT1cblx0XHRcdFx0XHR0ZXh0Mi5zdWJzdHJpbmcoIDAsIGxlbmd0aCApICkge1xuXHRcdFx0XHRiZXN0ID0gbGVuZ3RoO1xuXHRcdFx0XHRsZW5ndGgrKztcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIFNwbGl0IHR3byB0ZXh0cyBpbnRvIGFuIGFycmF5IG9mIHN0cmluZ3MuICBSZWR1Y2UgdGhlIHRleHRzIHRvIGEgc3RyaW5nIG9mXG5cdCAqIGhhc2hlcyB3aGVyZSBlYWNoIFVuaWNvZGUgY2hhcmFjdGVyIHJlcHJlc2VudHMgb25lIGxpbmUuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHt7Y2hhcnMxOiBzdHJpbmcsIGNoYXJzMjogc3RyaW5nLCBsaW5lQXJyYXk6ICFBcnJheS48c3RyaW5nPn19XG5cdCAqICAgICBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgZW5jb2RlZCB0ZXh0MSwgdGhlIGVuY29kZWQgdGV4dDIgYW5kXG5cdCAqICAgICB0aGUgYXJyYXkgb2YgdW5pcXVlIHN0cmluZ3MuXG5cdCAqICAgICBUaGUgemVyb3RoIGVsZW1lbnQgb2YgdGhlIGFycmF5IG9mIHVuaXF1ZSBzdHJpbmdzIGlzIGludGVudGlvbmFsbHkgYmxhbmsuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkxpbmVzVG9DaGFycyA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIGxpbmVBcnJheSwgbGluZUhhc2gsIGNoYXJzMSwgY2hhcnMyO1xuXHRcdGxpbmVBcnJheSA9IFtdOyAvLyBlLmcuIGxpbmVBcnJheVs0XSA9PT0gJ0hlbGxvXFxuJ1xuXHRcdGxpbmVIYXNoID0ge307IC8vIGUuZy4gbGluZUhhc2hbJ0hlbGxvXFxuJ10gPT09IDRcblxuXHRcdC8vICdcXHgwMCcgaXMgYSB2YWxpZCBjaGFyYWN0ZXIsIGJ1dCB2YXJpb3VzIGRlYnVnZ2VycyBkb24ndCBsaWtlIGl0LlxuXHRcdC8vIFNvIHdlJ2xsIGluc2VydCBhIGp1bmsgZW50cnkgdG8gYXZvaWQgZ2VuZXJhdGluZyBhIG51bGwgY2hhcmFjdGVyLlxuXHRcdGxpbmVBcnJheVsgMCBdID0gXCJcIjtcblxuXHRcdC8qKlxuXHRcdCAqIFNwbGl0IGEgdGV4dCBpbnRvIGFuIGFycmF5IG9mIHN0cmluZ3MuICBSZWR1Y2UgdGhlIHRleHRzIHRvIGEgc3RyaW5nIG9mXG5cdFx0ICogaGFzaGVzIHdoZXJlIGVhY2ggVW5pY29kZSBjaGFyYWN0ZXIgcmVwcmVzZW50cyBvbmUgbGluZS5cblx0XHQgKiBNb2RpZmllcyBsaW5lYXJyYXkgYW5kIGxpbmVoYXNoIHRocm91Z2ggYmVpbmcgYSBjbG9zdXJlLlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFN0cmluZyB0byBlbmNvZGUuXG5cdFx0ICogQHJldHVybiB7c3RyaW5nfSBFbmNvZGVkIHN0cmluZy5cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRpZmZMaW5lc1RvQ2hhcnNNdW5nZSggdGV4dCApIHtcblx0XHRcdHZhciBjaGFycywgbGluZVN0YXJ0LCBsaW5lRW5kLCBsaW5lQXJyYXlMZW5ndGgsIGxpbmU7XG5cdFx0XHRjaGFycyA9IFwiXCI7XG5cdFx0XHQvLyBXYWxrIHRoZSB0ZXh0LCBwdWxsaW5nIG91dCBhIHN1YnN0cmluZyBmb3IgZWFjaCBsaW5lLlxuXHRcdFx0Ly8gdGV4dC5zcGxpdCgnXFxuJykgd291bGQgd291bGQgdGVtcG9yYXJpbHkgZG91YmxlIG91ciBtZW1vcnkgZm9vdHByaW50LlxuXHRcdFx0Ly8gTW9kaWZ5aW5nIHRleHQgd291bGQgY3JlYXRlIG1hbnkgbGFyZ2Ugc3RyaW5ncyB0byBnYXJiYWdlIGNvbGxlY3QuXG5cdFx0XHRsaW5lU3RhcnQgPSAwO1xuXHRcdFx0bGluZUVuZCA9IC0xO1xuXHRcdFx0Ly8gS2VlcGluZyBvdXIgb3duIGxlbmd0aCB2YXJpYWJsZSBpcyBmYXN0ZXIgdGhhbiBsb29raW5nIGl0IHVwLlxuXHRcdFx0bGluZUFycmF5TGVuZ3RoID0gbGluZUFycmF5Lmxlbmd0aDtcblx0XHRcdHdoaWxlICggbGluZUVuZCA8IHRleHQubGVuZ3RoIC0gMSApIHtcblx0XHRcdFx0bGluZUVuZCA9IHRleHQuaW5kZXhPZiggXCJcXG5cIiwgbGluZVN0YXJ0ICk7XG5cdFx0XHRcdGlmICggbGluZUVuZCA9PT0gLTEgKSB7XG5cdFx0XHRcdFx0bGluZUVuZCA9IHRleHQubGVuZ3RoIC0gMTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsaW5lID0gdGV4dC5zdWJzdHJpbmcoIGxpbmVTdGFydCwgbGluZUVuZCArIDEgKTtcblx0XHRcdFx0bGluZVN0YXJ0ID0gbGluZUVuZCArIDE7XG5cblx0XHRcdFx0aWYgKCBsaW5lSGFzaC5oYXNPd25Qcm9wZXJ0eSA/IGxpbmVIYXNoLmhhc093blByb3BlcnR5KCBsaW5lICkgOlxuXHRcdFx0XHRcdFx0XHQoIGxpbmVIYXNoWyBsaW5lIF0gIT09IHVuZGVmaW5lZCApICkge1xuXHRcdFx0XHRcdGNoYXJzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoIGxpbmVIYXNoWyBsaW5lIF0gKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjaGFycyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCBsaW5lQXJyYXlMZW5ndGggKTtcblx0XHRcdFx0XHRsaW5lSGFzaFsgbGluZSBdID0gbGluZUFycmF5TGVuZ3RoO1xuXHRcdFx0XHRcdGxpbmVBcnJheVsgbGluZUFycmF5TGVuZ3RoKysgXSA9IGxpbmU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBjaGFycztcblx0XHR9XG5cblx0XHRjaGFyczEgPSBkaWZmTGluZXNUb0NoYXJzTXVuZ2UoIHRleHQxICk7XG5cdFx0Y2hhcnMyID0gZGlmZkxpbmVzVG9DaGFyc011bmdlKCB0ZXh0MiApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRjaGFyczE6IGNoYXJzMSxcblx0XHRcdGNoYXJzMjogY2hhcnMyLFxuXHRcdFx0bGluZUFycmF5OiBsaW5lQXJyYXlcblx0XHR9O1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZWh5ZHJhdGUgdGhlIHRleHQgaW4gYSBkaWZmIGZyb20gYSBzdHJpbmcgb2YgbGluZSBoYXNoZXMgdG8gcmVhbCBsaW5lcyBvZlxuXHQgKiB0ZXh0LlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHBhcmFtIHshQXJyYXkuPHN0cmluZz59IGxpbmVBcnJheSBBcnJheSBvZiB1bmlxdWUgc3RyaW5ncy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ2hhcnNUb0xpbmVzID0gZnVuY3Rpb24oIGRpZmZzLCBsaW5lQXJyYXkgKSB7XG5cdFx0dmFyIHgsIGNoYXJzLCB0ZXh0LCB5O1xuXHRcdGZvciAoIHggPSAwOyB4IDwgZGlmZnMubGVuZ3RoOyB4KysgKSB7XG5cdFx0XHRjaGFycyA9IGRpZmZzWyB4IF1bIDEgXTtcblx0XHRcdHRleHQgPSBbXTtcblx0XHRcdGZvciAoIHkgPSAwOyB5IDwgY2hhcnMubGVuZ3RoOyB5KysgKSB7XG5cdFx0XHRcdHRleHRbIHkgXSA9IGxpbmVBcnJheVsgY2hhcnMuY2hhckNvZGVBdCggeSApIF07XG5cdFx0XHR9XG5cdFx0XHRkaWZmc1sgeCBdWyAxIF0gPSB0ZXh0LmpvaW4oIFwiXCIgKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlb3JkZXIgYW5kIG1lcmdlIGxpa2UgZWRpdCBzZWN0aW9ucy4gIE1lcmdlIGVxdWFsaXRpZXMuXG5cdCAqIEFueSBlZGl0IHNlY3Rpb24gY2FuIG1vdmUgYXMgbG9uZyBhcyBpdCBkb2Vzbid0IGNyb3NzIGFuIGVxdWFsaXR5LlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ2xlYW51cE1lcmdlID0gZnVuY3Rpb24oIGRpZmZzICkge1xuXHRcdHZhciBwb2ludGVyLCBjb3VudERlbGV0ZSwgY291bnRJbnNlcnQsIHRleHRJbnNlcnQsIHRleHREZWxldGUsXG5cdFx0XHRjb21tb25sZW5ndGgsIGNoYW5nZXMsIGRpZmZQb2ludGVyLCBwb3NpdGlvbjtcblx0XHRkaWZmcy5wdXNoKCBbIERJRkZfRVFVQUwsIFwiXCIgXSApOyAvLyBBZGQgYSBkdW1teSBlbnRyeSBhdCB0aGUgZW5kLlxuXHRcdHBvaW50ZXIgPSAwO1xuXHRcdGNvdW50RGVsZXRlID0gMDtcblx0XHRjb3VudEluc2VydCA9IDA7XG5cdFx0dGV4dERlbGV0ZSA9IFwiXCI7XG5cdFx0dGV4dEluc2VydCA9IFwiXCI7XG5cdFx0Y29tbW9ubGVuZ3RoO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblx0XHRcdHN3aXRjaCAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSApIHtcblx0XHRcdGNhc2UgRElGRl9JTlNFUlQ6XG5cdFx0XHRcdGNvdW50SW5zZXJ0Kys7XG5cdFx0XHRcdHRleHRJbnNlcnQgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0RFTEVURTpcblx0XHRcdFx0Y291bnREZWxldGUrKztcblx0XHRcdFx0dGV4dERlbGV0ZSArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfRVFVQUw6XG5cdFx0XHRcdC8vIFVwb24gcmVhY2hpbmcgYW4gZXF1YWxpdHksIGNoZWNrIGZvciBwcmlvciByZWR1bmRhbmNpZXMuXG5cdFx0XHRcdGlmICggY291bnREZWxldGUgKyBjb3VudEluc2VydCA+IDEgKSB7XG5cdFx0XHRcdFx0aWYgKCBjb3VudERlbGV0ZSAhPT0gMCAmJiBjb3VudEluc2VydCAhPT0gMCApIHtcblx0XHRcdFx0XHRcdC8vIEZhY3RvciBvdXQgYW55IGNvbW1vbiBwcmVmaXhlcy5cblx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCA9IHRoaXMuZGlmZkNvbW1vblByZWZpeCggdGV4dEluc2VydCwgdGV4dERlbGV0ZSApO1xuXHRcdFx0XHRcdFx0aWYgKCBjb21tb25sZW5ndGggIT09IDAgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggKCBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCApID4gMCAmJlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0IC0gMSBdWyAwIF0gPT09XG5cdFx0XHRcdFx0XHRcdFx0XHRESUZGX0VRVUFMICkge1xuXHRcdFx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCAtIDEgXVsgMSBdICs9XG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0LnN1YnN0cmluZyggMCwgY29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCAwLCAwLCBbIERJRkZfRVFVQUwsXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0LnN1YnN0cmluZyggMCwgY29tbW9ubGVuZ3RoIClcblx0XHRcdFx0XHRcdFx0XHRdICk7XG5cdFx0XHRcdFx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHRleHRJbnNlcnQgPSB0ZXh0SW5zZXJ0LnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHRcdHRleHREZWxldGUgPSB0ZXh0RGVsZXRlLnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBGYWN0b3Igb3V0IGFueSBjb21tb24gc3VmZml4aWVzLlxuXHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoID0gdGhpcy5kaWZmQ29tbW9uU3VmZml4KCB0ZXh0SW5zZXJ0LCB0ZXh0RGVsZXRlICk7XG5cdFx0XHRcdFx0XHRpZiAoIGNvbW1vbmxlbmd0aCAhPT0gMCApIHtcblx0XHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdID0gdGV4dEluc2VydC5zdWJzdHJpbmcoIHRleHRJbnNlcnQubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCApICsgZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0ID0gdGV4dEluc2VydC5zdWJzdHJpbmcoIDAsIHRleHRJbnNlcnQubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0XHRjb21tb25sZW5ndGggKTtcblx0XHRcdFx0XHRcdFx0dGV4dERlbGV0ZSA9IHRleHREZWxldGUuc3Vic3RyaW5nKCAwLCB0ZXh0RGVsZXRlLmxlbmd0aCAtXG5cdFx0XHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIERlbGV0ZSB0aGUgb2ZmZW5kaW5nIHJlY29yZHMgYW5kIGFkZCB0aGUgbWVyZ2VkIG9uZXMuXG5cdFx0XHRcdFx0aWYgKCBjb3VudERlbGV0ZSA9PT0gMCApIHtcblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciAtIGNvdW50SW5zZXJ0LFxuXHRcdFx0XHRcdFx0XHRjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0LCBbIERJRkZfSU5TRVJULCB0ZXh0SW5zZXJ0IF0gKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCBjb3VudEluc2VydCA9PT0gMCApIHtcblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciAtIGNvdW50RGVsZXRlLFxuXHRcdFx0XHRcdFx0XHRjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0LCBbIERJRkZfREVMRVRFLCB0ZXh0RGVsZXRlIF0gKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKFxuXHRcdFx0XHRcdFx0XHRwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCxcblx0XHRcdFx0XHRcdFx0Y291bnREZWxldGUgKyBjb3VudEluc2VydCxcblx0XHRcdFx0XHRcdFx0WyBESUZGX0RFTEVURSwgdGV4dERlbGV0ZSBdLCBbIERJRkZfSU5TRVJULCB0ZXh0SW5zZXJ0IF1cblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHBvaW50ZXIgPSBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCArXG5cdFx0XHRcdFx0XHQoIGNvdW50RGVsZXRlID8gMSA6IDAgKSArICggY291bnRJbnNlcnQgPyAxIDogMCApICsgMTtcblx0XHRcdFx0fSBlbHNlIGlmICggcG9pbnRlciAhPT0gMCAmJiBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMCBdID09PSBESUZGX0VRVUFMICkge1xuXG5cdFx0XHRcdFx0Ly8gTWVyZ2UgdGhpcyBlcXVhbGl0eSB3aXRoIHRoZSBwcmV2aW91cyBvbmUuXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyLCAxICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvdW50SW5zZXJ0ID0gMDtcblx0XHRcdFx0Y291bnREZWxldGUgPSAwO1xuXHRcdFx0XHR0ZXh0RGVsZXRlID0gXCJcIjtcblx0XHRcdFx0dGV4dEluc2VydCA9IFwiXCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIGRpZmZzWyBkaWZmcy5sZW5ndGggLSAxIF1bIDEgXSA9PT0gXCJcIiApIHtcblx0XHRcdGRpZmZzLnBvcCgpOyAvLyBSZW1vdmUgdGhlIGR1bW15IGVudHJ5IGF0IHRoZSBlbmQuXG5cdFx0fVxuXG5cdFx0Ly8gU2Vjb25kIHBhc3M6IGxvb2sgZm9yIHNpbmdsZSBlZGl0cyBzdXJyb3VuZGVkIG9uIGJvdGggc2lkZXMgYnkgZXF1YWxpdGllc1xuXHRcdC8vIHdoaWNoIGNhbiBiZSBzaGlmdGVkIHNpZGV3YXlzIHRvIGVsaW1pbmF0ZSBhbiBlcXVhbGl0eS5cblx0XHQvLyBlLmc6IEE8aW5zPkJBPC9pbnM+QyAtPiA8aW5zPkFCPC9pbnM+QUNcblx0XHRjaGFuZ2VzID0gZmFsc2U7XG5cdFx0cG9pbnRlciA9IDE7XG5cblx0XHQvLyBJbnRlbnRpb25hbGx5IGlnbm9yZSB0aGUgZmlyc3QgYW5kIGxhc3QgZWxlbWVudCAoZG9uJ3QgbmVlZCBjaGVja2luZykuXG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoIC0gMSApIHtcblx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDAgXSA9PT0gRElGRl9FUVVBTCAmJlxuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAwIF0gPT09IERJRkZfRVFVQUwgKSB7XG5cblx0XHRcdFx0ZGlmZlBvaW50ZXIgPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdHBvc2l0aW9uID0gZGlmZlBvaW50ZXIuc3Vic3RyaW5nKFxuXHRcdFx0XHRcdGRpZmZQb2ludGVyLmxlbmd0aCAtIGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0ubGVuZ3RoXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Ly8gVGhpcyBpcyBhIHNpbmdsZSBlZGl0IHN1cnJvdW5kZWQgYnkgZXF1YWxpdGllcy5cblx0XHRcdFx0aWYgKCBwb3NpdGlvbiA9PT0gZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSApIHtcblxuXHRcdFx0XHRcdC8vIFNoaWZ0IHRoZSBlZGl0IG92ZXIgdGhlIHByZXZpb3VzIGVxdWFsaXR5LlxuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXSA9IGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gK1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdLnN1YnN0cmluZyggMCwgZGlmZnNbIHBvaW50ZXIgXVsgMSBdLmxlbmd0aCAtXG5cdFx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0ubGVuZ3RoICk7XG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICsgZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXTtcblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgLSAxLCAxICk7XG5cdFx0XHRcdFx0Y2hhbmdlcyA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGRpZmZQb2ludGVyLnN1YnN0cmluZyggMCwgZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXS5sZW5ndGggKSA9PT1cblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0gKSB7XG5cblx0XHRcdFx0XHQvLyBTaGlmdCB0aGUgZWRpdCBvdmVyIHRoZSBuZXh0IGVxdWFsaXR5LlxuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gKz0gZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXTtcblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0gPVxuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdLnN1YnN0cmluZyggZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXS5sZW5ndGggKSArXG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdO1xuXHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciArIDEsIDEgKTtcblx0XHRcdFx0XHRjaGFuZ2VzID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblx0XHQvLyBJZiBzaGlmdHMgd2VyZSBtYWRlLCB0aGUgZGlmZiBuZWVkcyByZW9yZGVyaW5nIGFuZCBhbm90aGVyIHNoaWZ0IHN3ZWVwLlxuXHRcdGlmICggY2hhbmdlcyApIHtcblx0XHRcdHRoaXMuZGlmZkNsZWFudXBNZXJnZSggZGlmZnMgKTtcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIGZ1bmN0aW9uKCBvLCBuICkge1xuXHRcdHZhciBkaWZmLCBvdXRwdXQsIHRleHQ7XG5cdFx0ZGlmZiA9IG5ldyBEaWZmTWF0Y2hQYXRjaCgpO1xuXHRcdG91dHB1dCA9IGRpZmYuRGlmZk1haW4oIG8sIG4gKTtcblx0XHRkaWZmLmRpZmZDbGVhbnVwRWZmaWNpZW5jeSggb3V0cHV0ICk7XG5cdFx0dGV4dCA9IGRpZmYuZGlmZlByZXR0eUh0bWwoIG91dHB1dCApO1xuXG5cdFx0cmV0dXJuIHRleHQ7XG5cdH07XG59KCkgKTtcblxuLy8gR2V0IGEgcmVmZXJlbmNlIHRvIHRoZSBnbG9iYWwgb2JqZWN0LCBsaWtlIHdpbmRvdyBpbiBicm93c2Vyc1xufSggKGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcztcbn0pKCkgKSk7XG5cbihmdW5jdGlvbigpIHtcblxuLy8gRG9uJ3QgbG9hZCB0aGUgSFRNTCBSZXBvcnRlciBvbiBub24tQnJvd3NlciBlbnZpcm9ubWVudHNcbmlmICggdHlwZW9mIHdpbmRvdyA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhd2luZG93LmRvY3VtZW50ICkge1xuXHRyZXR1cm47XG59XG5cbi8vIERlcHJlY2F0ZWQgUVVuaXQuaW5pdCAtIFJlZiAjNTMwXG4vLyBSZS1pbml0aWFsaXplIHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnNcblFVbml0LmluaXQgPSBmdW5jdGlvbigpIHtcblx0dmFyIHRlc3RzLCBiYW5uZXIsIHJlc3VsdCwgcXVuaXQsXG5cdFx0Y29uZmlnID0gUVVuaXQuY29uZmlnO1xuXG5cdGNvbmZpZy5zdGF0cyA9IHsgYWxsOiAwLCBiYWQ6IDAgfTtcblx0Y29uZmlnLm1vZHVsZVN0YXRzID0geyBhbGw6IDAsIGJhZDogMCB9O1xuXHRjb25maWcuc3RhcnRlZCA9IDA7XG5cdGNvbmZpZy51cGRhdGVSYXRlID0gMTAwMDtcblx0Y29uZmlnLmJsb2NraW5nID0gZmFsc2U7XG5cdGNvbmZpZy5hdXRvc3RhcnQgPSB0cnVlO1xuXHRjb25maWcuYXV0b3J1biA9IGZhbHNlO1xuXHRjb25maWcuZmlsdGVyID0gXCJcIjtcblx0Y29uZmlnLnF1ZXVlID0gW107XG5cblx0Ly8gUmV0dXJuIG9uIG5vbi1icm93c2VyIGVudmlyb25tZW50c1xuXHQvLyBUaGlzIGlzIG5lY2Vzc2FyeSB0byBub3QgYnJlYWsgb24gbm9kZSB0ZXN0c1xuXHRpZiAoIHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0cXVuaXQgPSBpZCggXCJxdW5pdFwiICk7XG5cdGlmICggcXVuaXQgKSB7XG5cdFx0cXVuaXQuaW5uZXJIVE1MID1cblx0XHRcdFwiPGgxIGlkPSdxdW5pdC1oZWFkZXInPlwiICsgZXNjYXBlVGV4dCggZG9jdW1lbnQudGl0bGUgKSArIFwiPC9oMT5cIiArXG5cdFx0XHRcIjxoMiBpZD0ncXVuaXQtYmFubmVyJz48L2gyPlwiICtcblx0XHRcdFwiPGRpdiBpZD0ncXVuaXQtdGVzdHJ1bm5lci10b29sYmFyJz48L2Rpdj5cIiArXG5cdFx0XHRcIjxoMiBpZD0ncXVuaXQtdXNlckFnZW50Jz48L2gyPlwiICtcblx0XHRcdFwiPG9sIGlkPSdxdW5pdC10ZXN0cyc+PC9vbD5cIjtcblx0fVxuXG5cdHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApO1xuXHRiYW5uZXIgPSBpZCggXCJxdW5pdC1iYW5uZXJcIiApO1xuXHRyZXN1bHQgPSBpZCggXCJxdW5pdC10ZXN0cmVzdWx0XCIgKTtcblxuXHRpZiAoIHRlc3RzICkge1xuXHRcdHRlc3RzLmlubmVySFRNTCA9IFwiXCI7XG5cdH1cblxuXHRpZiAoIGJhbm5lciApIHtcblx0XHRiYW5uZXIuY2xhc3NOYW1lID0gXCJcIjtcblx0fVxuXG5cdGlmICggcmVzdWx0ICkge1xuXHRcdHJlc3VsdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKCByZXN1bHQgKTtcblx0fVxuXG5cdGlmICggdGVzdHMgKSB7XG5cdFx0cmVzdWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJwXCIgKTtcblx0XHRyZXN1bHQuaWQgPSBcInF1bml0LXRlc3RyZXN1bHRcIjtcblx0XHRyZXN1bHQuY2xhc3NOYW1lID0gXCJyZXN1bHRcIjtcblx0XHR0ZXN0cy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSggcmVzdWx0LCB0ZXN0cyApO1xuXHRcdHJlc3VsdC5pbm5lckhUTUwgPSBcIlJ1bm5pbmcuLi48YnIgLz4mIzE2MDtcIjtcblx0fVxufTtcblxudmFyIGNvbmZpZyA9IFFVbml0LmNvbmZpZyxcblx0Y29sbGFwc2VOZXh0ID0gZmFsc2UsXG5cdGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG5cdGRlZmluZWQgPSB7XG5cdFx0ZG9jdW1lbnQ6IHdpbmRvdy5kb2N1bWVudCAhPT0gdW5kZWZpbmVkLFxuXHRcdHNlc3Npb25TdG9yYWdlOiAoZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgeCA9IFwicXVuaXQtdGVzdC1zdHJpbmdcIjtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oIHgsIHggKTtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSggeCApO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSgpKVxuXHR9LFxuXHRtb2R1bGVzTGlzdCA9IFtdO1xuXG4vKipcbiogRXNjYXBlIHRleHQgZm9yIGF0dHJpYnV0ZSBvciB0ZXh0IGNvbnRlbnQuXG4qL1xuZnVuY3Rpb24gZXNjYXBlVGV4dCggcyApIHtcblx0aWYgKCAhcyApIHtcblx0XHRyZXR1cm4gXCJcIjtcblx0fVxuXHRzID0gcyArIFwiXCI7XG5cblx0Ly8gQm90aCBzaW5nbGUgcXVvdGVzIGFuZCBkb3VibGUgcXVvdGVzIChmb3IgYXR0cmlidXRlcylcblx0cmV0dXJuIHMucmVwbGFjZSggL1snXCI8PiZdL2csIGZ1bmN0aW9uKCBzICkge1xuXHRcdHN3aXRjaCAoIHMgKSB7XG5cdFx0Y2FzZSBcIidcIjpcblx0XHRcdHJldHVybiBcIiYjMDM5O1wiO1xuXHRcdGNhc2UgXCJcXFwiXCI6XG5cdFx0XHRyZXR1cm4gXCImcXVvdDtcIjtcblx0XHRjYXNlIFwiPFwiOlxuXHRcdFx0cmV0dXJuIFwiJmx0O1wiO1xuXHRcdGNhc2UgXCI+XCI6XG5cdFx0XHRyZXR1cm4gXCImZ3Q7XCI7XG5cdFx0Y2FzZSBcIiZcIjpcblx0XHRcdHJldHVybiBcIiZhbXA7XCI7XG5cdFx0fVxuXHR9KTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuZnVuY3Rpb24gYWRkRXZlbnQoIGVsZW0sIHR5cGUsIGZuICkge1xuXHRpZiAoIGVsZW0uYWRkRXZlbnRMaXN0ZW5lciApIHtcblxuXHRcdC8vIFN0YW5kYXJkcy1iYXNlZCBicm93c2Vyc1xuXHRcdGVsZW0uYWRkRXZlbnRMaXN0ZW5lciggdHlwZSwgZm4sIGZhbHNlICk7XG5cdH0gZWxzZSBpZiAoIGVsZW0uYXR0YWNoRXZlbnQgKSB7XG5cblx0XHQvLyBzdXBwb3J0OiBJRSA8OVxuXHRcdGVsZW0uYXR0YWNoRXZlbnQoIFwib25cIiArIHR5cGUsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50ID0gd2luZG93LmV2ZW50O1xuXHRcdFx0aWYgKCAhZXZlbnQudGFyZ2V0ICkge1xuXHRcdFx0XHRldmVudC50YXJnZXQgPSBldmVudC5zcmNFbGVtZW50IHx8IGRvY3VtZW50O1xuXHRcdFx0fVxuXG5cdFx0XHRmbi5jYWxsKCBlbGVtLCBldmVudCApO1xuXHRcdH0pO1xuXHR9XG59XG5cbi8qKlxuICogQHBhcmFtIHtBcnJheXxOb2RlTGlzdH0gZWxlbXNcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICovXG5mdW5jdGlvbiBhZGRFdmVudHMoIGVsZW1zLCB0eXBlLCBmbiApIHtcblx0dmFyIGkgPSBlbGVtcy5sZW5ndGg7XG5cdHdoaWxlICggaS0tICkge1xuXHRcdGFkZEV2ZW50KCBlbGVtc1sgaSBdLCB0eXBlLCBmbiApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKCBlbGVtLCBuYW1lICkge1xuXHRyZXR1cm4gKCBcIiBcIiArIGVsZW0uY2xhc3NOYW1lICsgXCIgXCIgKS5pbmRleE9mKCBcIiBcIiArIG5hbWUgKyBcIiBcIiApID49IDA7XG59XG5cbmZ1bmN0aW9uIGFkZENsYXNzKCBlbGVtLCBuYW1lICkge1xuXHRpZiAoICFoYXNDbGFzcyggZWxlbSwgbmFtZSApICkge1xuXHRcdGVsZW0uY2xhc3NOYW1lICs9ICggZWxlbS5jbGFzc05hbWUgPyBcIiBcIiA6IFwiXCIgKSArIG5hbWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gdG9nZ2xlQ2xhc3MoIGVsZW0sIG5hbWUgKSB7XG5cdGlmICggaGFzQ2xhc3MoIGVsZW0sIG5hbWUgKSApIHtcblx0XHRyZW1vdmVDbGFzcyggZWxlbSwgbmFtZSApO1xuXHR9IGVsc2Uge1xuXHRcdGFkZENsYXNzKCBlbGVtLCBuYW1lICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoIGVsZW0sIG5hbWUgKSB7XG5cdHZhciBzZXQgPSBcIiBcIiArIGVsZW0uY2xhc3NOYW1lICsgXCIgXCI7XG5cblx0Ly8gQ2xhc3MgbmFtZSBtYXkgYXBwZWFyIG11bHRpcGxlIHRpbWVzXG5cdHdoaWxlICggc2V0LmluZGV4T2YoIFwiIFwiICsgbmFtZSArIFwiIFwiICkgPj0gMCApIHtcblx0XHRzZXQgPSBzZXQucmVwbGFjZSggXCIgXCIgKyBuYW1lICsgXCIgXCIsIFwiIFwiICk7XG5cdH1cblxuXHQvLyB0cmltIGZvciBwcmV0dGluZXNzXG5cdGVsZW0uY2xhc3NOYW1lID0gdHlwZW9mIHNldC50cmltID09PSBcImZ1bmN0aW9uXCIgPyBzZXQudHJpbSgpIDogc2V0LnJlcGxhY2UoIC9eXFxzK3xcXHMrJC9nLCBcIlwiICk7XG59XG5cbmZ1bmN0aW9uIGlkKCBuYW1lICkge1xuXHRyZXR1cm4gZGVmaW5lZC5kb2N1bWVudCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggbmFtZSApO1xufVxuXG5mdW5jdGlvbiBnZXRVcmxDb25maWdIdG1sKCkge1xuXHR2YXIgaSwgaiwgdmFsLFxuXHRcdGVzY2FwZWQsIGVzY2FwZWRUb29sdGlwLFxuXHRcdHNlbGVjdGlvbiA9IGZhbHNlLFxuXHRcdGxlbiA9IGNvbmZpZy51cmxDb25maWcubGVuZ3RoLFxuXHRcdHVybENvbmZpZ0h0bWwgPSBcIlwiO1xuXG5cdGZvciAoIGkgPSAwOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0dmFsID0gY29uZmlnLnVybENvbmZpZ1sgaSBdO1xuXHRcdGlmICggdHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHZhbCA9IHtcblx0XHRcdFx0aWQ6IHZhbCxcblx0XHRcdFx0bGFiZWw6IHZhbFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRlc2NhcGVkID0gZXNjYXBlVGV4dCggdmFsLmlkICk7XG5cdFx0ZXNjYXBlZFRvb2x0aXAgPSBlc2NhcGVUZXh0KCB2YWwudG9vbHRpcCApO1xuXG5cdFx0aWYgKCBjb25maWdbIHZhbC5pZCBdID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRjb25maWdbIHZhbC5pZCBdID0gUVVuaXQudXJsUGFyYW1zWyB2YWwuaWQgXTtcblx0XHR9XG5cblx0XHRpZiAoICF2YWwudmFsdWUgfHwgdHlwZW9mIHZhbC52YWx1ZSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8aW5wdXQgaWQ9J3F1bml0LXVybGNvbmZpZy1cIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcIicgbmFtZT0nXCIgKyBlc2NhcGVkICsgXCInIHR5cGU9J2NoZWNrYm94J1wiICtcblx0XHRcdFx0KCB2YWwudmFsdWUgPyBcIiB2YWx1ZT0nXCIgKyBlc2NhcGVUZXh0KCB2YWwudmFsdWUgKSArIFwiJ1wiIDogXCJcIiApICtcblx0XHRcdFx0KCBjb25maWdbIHZhbC5pZCBdID8gXCIgY2hlY2tlZD0nY2hlY2tlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcdFwiIHRpdGxlPSdcIiArIGVzY2FwZWRUb29sdGlwICsgXCInIC8+PGxhYmVsIGZvcj0ncXVuaXQtdXJsY29uZmlnLVwiICsgZXNjYXBlZCArXG5cdFx0XHRcdFwiJyB0aXRsZT0nXCIgKyBlc2NhcGVkVG9vbHRpcCArIFwiJz5cIiArIHZhbC5sYWJlbCArIFwiPC9sYWJlbD5cIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxsYWJlbCBmb3I9J3F1bml0LXVybGNvbmZpZy1cIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcIicgdGl0bGU9J1wiICsgZXNjYXBlZFRvb2x0aXAgKyBcIic+XCIgKyB2YWwubGFiZWwgK1xuXHRcdFx0XHRcIjogPC9sYWJlbD48c2VsZWN0IGlkPSdxdW5pdC11cmxjb25maWctXCIgKyBlc2NhcGVkICtcblx0XHRcdFx0XCInIG5hbWU9J1wiICsgZXNjYXBlZCArIFwiJyB0aXRsZT0nXCIgKyBlc2NhcGVkVG9vbHRpcCArIFwiJz48b3B0aW9uPjwvb3B0aW9uPlwiO1xuXG5cdFx0XHRpZiAoIFFVbml0LmlzKCBcImFycmF5XCIsIHZhbC52YWx1ZSApICkge1xuXHRcdFx0XHRmb3IgKCBqID0gMDsgaiA8IHZhbC52YWx1ZS5sZW5ndGg7IGorKyApIHtcblx0XHRcdFx0XHRlc2NhcGVkID0gZXNjYXBlVGV4dCggdmFsLnZhbHVlWyBqIF0gKTtcblx0XHRcdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPG9wdGlvbiB2YWx1ZT0nXCIgKyBlc2NhcGVkICsgXCInXCIgK1xuXHRcdFx0XHRcdFx0KCBjb25maWdbIHZhbC5pZCBdID09PSB2YWwudmFsdWVbIGogXSA/XG5cdFx0XHRcdFx0XHRcdCggc2VsZWN0aW9uID0gdHJ1ZSApICYmIFwiIHNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcdFx0XHRcIj5cIiArIGVzY2FwZWQgKyBcIjwvb3B0aW9uPlwiO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKCBqIGluIHZhbC52YWx1ZSApIHtcblx0XHRcdFx0XHRpZiAoIGhhc093bi5jYWxsKCB2YWwudmFsdWUsIGogKSApIHtcblx0XHRcdFx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArIGVzY2FwZVRleHQoIGogKSArIFwiJ1wiICtcblx0XHRcdFx0XHRcdFx0KCBjb25maWdbIHZhbC5pZCBdID09PSBqID9cblx0XHRcdFx0XHRcdFx0XHQoIHNlbGVjdGlvbiA9IHRydWUgKSAmJiBcIiBzZWxlY3RlZD0nc2VsZWN0ZWQnXCIgOiBcIlwiICkgK1xuXHRcdFx0XHRcdFx0XHRcIj5cIiArIGVzY2FwZVRleHQoIHZhbC52YWx1ZVsgaiBdICkgKyBcIjwvb3B0aW9uPlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCBjb25maWdbIHZhbC5pZCBdICYmICFzZWxlY3Rpb24gKSB7XG5cdFx0XHRcdGVzY2FwZWQgPSBlc2NhcGVUZXh0KCBjb25maWdbIHZhbC5pZCBdICk7XG5cdFx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcdFwiJyBzZWxlY3RlZD0nc2VsZWN0ZWQnIGRpc2FibGVkPSdkaXNhYmxlZCc+XCIgKyBlc2NhcGVkICsgXCI8L29wdGlvbj5cIjtcblx0XHRcdH1cblx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8L3NlbGVjdD5cIjtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdXJsQ29uZmlnSHRtbDtcbn1cblxuLy8gSGFuZGxlIFwiY2xpY2tcIiBldmVudHMgb24gdG9vbGJhciBjaGVja2JveGVzIGFuZCBcImNoYW5nZVwiIGZvciBzZWxlY3QgbWVudXMuXG4vLyBVcGRhdGVzIHRoZSBVUkwgd2l0aCB0aGUgbmV3IHN0YXRlIG9mIGBjb25maWcudXJsQ29uZmlnYCB2YWx1ZXMuXG5mdW5jdGlvbiB0b29sYmFyQ2hhbmdlZCgpIHtcblx0dmFyIHVwZGF0ZWRVcmwsIHZhbHVlLFxuXHRcdGZpZWxkID0gdGhpcyxcblx0XHRwYXJhbXMgPSB7fTtcblxuXHQvLyBEZXRlY3QgaWYgZmllbGQgaXMgYSBzZWxlY3QgbWVudSBvciBhIGNoZWNrYm94XG5cdGlmICggXCJzZWxlY3RlZEluZGV4XCIgaW4gZmllbGQgKSB7XG5cdFx0dmFsdWUgPSBmaWVsZC5vcHRpb25zWyBmaWVsZC5zZWxlY3RlZEluZGV4IF0udmFsdWUgfHwgdW5kZWZpbmVkO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gZmllbGQuY2hlY2tlZCA/ICggZmllbGQuZGVmYXVsdFZhbHVlIHx8IHRydWUgKSA6IHVuZGVmaW5lZDtcblx0fVxuXG5cdHBhcmFtc1sgZmllbGQubmFtZSBdID0gdmFsdWU7XG5cdHVwZGF0ZWRVcmwgPSBzZXRVcmwoIHBhcmFtcyApO1xuXG5cdGlmICggXCJoaWRlcGFzc2VkXCIgPT09IGZpZWxkLm5hbWUgJiYgXCJyZXBsYWNlU3RhdGVcIiBpbiB3aW5kb3cuaGlzdG9yeSApIHtcblx0XHRjb25maWdbIGZpZWxkLm5hbWUgXSA9IHZhbHVlIHx8IGZhbHNlO1xuXHRcdGlmICggdmFsdWUgKSB7XG5cdFx0XHRhZGRDbGFzcyggaWQoIFwicXVuaXQtdGVzdHNcIiApLCBcImhpZGVwYXNzXCIgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVtb3ZlQ2xhc3MoIGlkKCBcInF1bml0LXRlc3RzXCIgKSwgXCJoaWRlcGFzc1wiICk7XG5cdFx0fVxuXG5cdFx0Ly8gSXQgaXMgbm90IG5lY2Vzc2FyeSB0byByZWZyZXNoIHRoZSB3aG9sZSBwYWdlXG5cdFx0d2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKCBudWxsLCBcIlwiLCB1cGRhdGVkVXJsICk7XG5cdH0gZWxzZSB7XG5cdFx0d2luZG93LmxvY2F0aW9uID0gdXBkYXRlZFVybDtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXRVcmwoIHBhcmFtcyApIHtcblx0dmFyIGtleSxcblx0XHRxdWVyeXN0cmluZyA9IFwiP1wiO1xuXG5cdHBhcmFtcyA9IFFVbml0LmV4dGVuZCggUVVuaXQuZXh0ZW5kKCB7fSwgUVVuaXQudXJsUGFyYW1zICksIHBhcmFtcyApO1xuXG5cdGZvciAoIGtleSBpbiBwYXJhbXMgKSB7XG5cdFx0aWYgKCBoYXNPd24uY2FsbCggcGFyYW1zLCBrZXkgKSApIHtcblx0XHRcdGlmICggcGFyYW1zWyBrZXkgXSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdHF1ZXJ5c3RyaW5nICs9IGVuY29kZVVSSUNvbXBvbmVudCgga2V5ICk7XG5cdFx0XHRpZiAoIHBhcmFtc1sga2V5IF0gIT09IHRydWUgKSB7XG5cdFx0XHRcdHF1ZXJ5c3RyaW5nICs9IFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KCBwYXJhbXNbIGtleSBdICk7XG5cdFx0XHR9XG5cdFx0XHRxdWVyeXN0cmluZyArPSBcIiZcIjtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgbG9jYXRpb24uaG9zdCArXG5cdFx0bG9jYXRpb24ucGF0aG5hbWUgKyBxdWVyeXN0cmluZy5zbGljZSggMCwgLTEgKTtcbn1cblxuZnVuY3Rpb24gYXBwbHlVcmxQYXJhbXMoKSB7XG5cdHZhciBzZWxlY3RlZE1vZHVsZSxcblx0XHRtb2R1bGVzTGlzdCA9IGlkKCBcInF1bml0LW1vZHVsZWZpbHRlclwiICksXG5cdFx0ZmlsdGVyID0gaWQoIFwicXVuaXQtZmlsdGVyLWlucHV0XCIgKS52YWx1ZTtcblxuXHRzZWxlY3RlZE1vZHVsZSA9IG1vZHVsZXNMaXN0ID9cblx0XHRkZWNvZGVVUklDb21wb25lbnQoIG1vZHVsZXNMaXN0Lm9wdGlvbnNbIG1vZHVsZXNMaXN0LnNlbGVjdGVkSW5kZXggXS52YWx1ZSApIDpcblx0XHR1bmRlZmluZWQ7XG5cblx0d2luZG93LmxvY2F0aW9uID0gc2V0VXJsKHtcblx0XHRtb2R1bGU6ICggc2VsZWN0ZWRNb2R1bGUgPT09IFwiXCIgKSA/IHVuZGVmaW5lZCA6IHNlbGVjdGVkTW9kdWxlLFxuXHRcdGZpbHRlcjogKCBmaWx0ZXIgPT09IFwiXCIgKSA/IHVuZGVmaW5lZCA6IGZpbHRlcixcblxuXHRcdC8vIFJlbW92ZSB0ZXN0SWQgZmlsdGVyXG5cdFx0dGVzdElkOiB1bmRlZmluZWRcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHRvb2xiYXJVcmxDb25maWdDb250YWluZXIoKSB7XG5cdHZhciB1cmxDb25maWdDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInNwYW5cIiApO1xuXG5cdHVybENvbmZpZ0NvbnRhaW5lci5pbm5lckhUTUwgPSBnZXRVcmxDb25maWdIdG1sKCk7XG5cdGFkZENsYXNzKCB1cmxDb25maWdDb250YWluZXIsIFwicXVuaXQtdXJsLWNvbmZpZ1wiICk7XG5cblx0Ly8gRm9yIG9sZElFIHN1cHBvcnQ6XG5cdC8vICogQWRkIGhhbmRsZXJzIHRvIHRoZSBpbmRpdmlkdWFsIGVsZW1lbnRzIGluc3RlYWQgb2YgdGhlIGNvbnRhaW5lclxuXHQvLyAqIFVzZSBcImNsaWNrXCIgaW5zdGVhZCBvZiBcImNoYW5nZVwiIGZvciBjaGVja2JveGVzXG5cdGFkZEV2ZW50cyggdXJsQ29uZmlnQ29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcImlucHV0XCIgKSwgXCJjbGlja1wiLCB0b29sYmFyQ2hhbmdlZCApO1xuXHRhZGRFdmVudHMoIHVybENvbmZpZ0NvbnRhaW5lci5nZXRFbGVtZW50c0J5VGFnTmFtZSggXCJzZWxlY3RcIiApLCBcImNoYW5nZVwiLCB0b29sYmFyQ2hhbmdlZCApO1xuXG5cdHJldHVybiB1cmxDb25maWdDb250YWluZXI7XG59XG5cbmZ1bmN0aW9uIHRvb2xiYXJMb29zZUZpbHRlcigpIHtcblx0dmFyIGZpbHRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZm9ybVwiICksXG5cdFx0bGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImxhYmVsXCIgKSxcblx0XHRpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiaW5wdXRcIiApLFxuXHRcdGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiYnV0dG9uXCIgKTtcblxuXHRhZGRDbGFzcyggZmlsdGVyLCBcInF1bml0LWZpbHRlclwiICk7XG5cblx0bGFiZWwuaW5uZXJIVE1MID0gXCJGaWx0ZXI6IFwiO1xuXG5cdGlucHV0LnR5cGUgPSBcInRleHRcIjtcblx0aW5wdXQudmFsdWUgPSBjb25maWcuZmlsdGVyIHx8IFwiXCI7XG5cdGlucHV0Lm5hbWUgPSBcImZpbHRlclwiO1xuXHRpbnB1dC5pZCA9IFwicXVuaXQtZmlsdGVyLWlucHV0XCI7XG5cblx0YnV0dG9uLmlubmVySFRNTCA9IFwiR29cIjtcblxuXHRsYWJlbC5hcHBlbmRDaGlsZCggaW5wdXQgKTtcblxuXHRmaWx0ZXIuYXBwZW5kQ2hpbGQoIGxhYmVsICk7XG5cdGZpbHRlci5hcHBlbmRDaGlsZCggYnV0dG9uICk7XG5cdGFkZEV2ZW50KCBmaWx0ZXIsIFwic3VibWl0XCIsIGZ1bmN0aW9uKCBldiApIHtcblx0XHRhcHBseVVybFBhcmFtcygpO1xuXG5cdFx0aWYgKCBldiAmJiBldi5wcmV2ZW50RGVmYXVsdCApIHtcblx0XHRcdGV2LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KTtcblxuXHRyZXR1cm4gZmlsdGVyO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyTW9kdWxlRmlsdGVySHRtbCgpIHtcblx0dmFyIGksXG5cdFx0bW9kdWxlRmlsdGVySHRtbCA9IFwiXCI7XG5cblx0aWYgKCAhbW9kdWxlc0xpc3QubGVuZ3RoICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdG1vZHVsZXNMaXN0LnNvcnQoZnVuY3Rpb24oIGEsIGIgKSB7XG5cdFx0cmV0dXJuIGEubG9jYWxlQ29tcGFyZSggYiApO1xuXHR9KTtcblxuXHRtb2R1bGVGaWx0ZXJIdG1sICs9IFwiPGxhYmVsIGZvcj0ncXVuaXQtbW9kdWxlZmlsdGVyJz5Nb2R1bGU6IDwvbGFiZWw+XCIgK1xuXHRcdFwiPHNlbGVjdCBpZD0ncXVuaXQtbW9kdWxlZmlsdGVyJyBuYW1lPSdtb2R1bGVmaWx0ZXInPjxvcHRpb24gdmFsdWU9JycgXCIgK1xuXHRcdCggUVVuaXQudXJsUGFyYW1zLm1vZHVsZSA9PT0gdW5kZWZpbmVkID8gXCJzZWxlY3RlZD0nc2VsZWN0ZWQnXCIgOiBcIlwiICkgK1xuXHRcdFwiPjwgQWxsIE1vZHVsZXMgPjwvb3B0aW9uPlwiO1xuXG5cdGZvciAoIGkgPSAwOyBpIDwgbW9kdWxlc0xpc3QubGVuZ3RoOyBpKysgKSB7XG5cdFx0bW9kdWxlRmlsdGVySHRtbCArPSBcIjxvcHRpb24gdmFsdWU9J1wiICtcblx0XHRcdGVzY2FwZVRleHQoIGVuY29kZVVSSUNvbXBvbmVudCggbW9kdWxlc0xpc3RbIGkgXSApICkgKyBcIicgXCIgK1xuXHRcdFx0KCBRVW5pdC51cmxQYXJhbXMubW9kdWxlID09PSBtb2R1bGVzTGlzdFsgaSBdID8gXCJzZWxlY3RlZD0nc2VsZWN0ZWQnXCIgOiBcIlwiICkgK1xuXHRcdFx0XCI+XCIgKyBlc2NhcGVUZXh0KCBtb2R1bGVzTGlzdFsgaSBdICkgKyBcIjwvb3B0aW9uPlwiO1xuXHR9XG5cdG1vZHVsZUZpbHRlckh0bWwgKz0gXCI8L3NlbGVjdD5cIjtcblxuXHRyZXR1cm4gbW9kdWxlRmlsdGVySHRtbDtcbn1cblxuZnVuY3Rpb24gdG9vbGJhck1vZHVsZUZpbHRlcigpIHtcblx0dmFyIHRvb2xiYXIgPSBpZCggXCJxdW5pdC10ZXN0cnVubmVyLXRvb2xiYXJcIiApLFxuXHRcdG1vZHVsZUZpbHRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwic3BhblwiICksXG5cdFx0bW9kdWxlRmlsdGVySHRtbCA9IHRvb2xiYXJNb2R1bGVGaWx0ZXJIdG1sKCk7XG5cblx0aWYgKCAhdG9vbGJhciB8fCAhbW9kdWxlRmlsdGVySHRtbCApIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRtb2R1bGVGaWx0ZXIuc2V0QXR0cmlidXRlKCBcImlkXCIsIFwicXVuaXQtbW9kdWxlZmlsdGVyLWNvbnRhaW5lclwiICk7XG5cdG1vZHVsZUZpbHRlci5pbm5lckhUTUwgPSBtb2R1bGVGaWx0ZXJIdG1sO1xuXG5cdGFkZEV2ZW50KCBtb2R1bGVGaWx0ZXIubGFzdENoaWxkLCBcImNoYW5nZVwiLCBhcHBseVVybFBhcmFtcyApO1xuXG5cdHRvb2xiYXIuYXBwZW5kQ2hpbGQoIG1vZHVsZUZpbHRlciApO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRUb29sYmFyKCkge1xuXHR2YXIgdG9vbGJhciA9IGlkKCBcInF1bml0LXRlc3RydW5uZXItdG9vbGJhclwiICk7XG5cblx0aWYgKCB0b29sYmFyICkge1xuXHRcdHRvb2xiYXIuYXBwZW5kQ2hpbGQoIHRvb2xiYXJVcmxDb25maWdDb250YWluZXIoKSApO1xuXHRcdHRvb2xiYXIuYXBwZW5kQ2hpbGQoIHRvb2xiYXJMb29zZUZpbHRlcigpICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kSGVhZGVyKCkge1xuXHR2YXIgaGVhZGVyID0gaWQoIFwicXVuaXQtaGVhZGVyXCIgKTtcblxuXHRpZiAoIGhlYWRlciApIHtcblx0XHRoZWFkZXIuaW5uZXJIVE1MID0gXCI8YSBocmVmPSdcIiArXG5cdFx0XHRzZXRVcmwoeyBmaWx0ZXI6IHVuZGVmaW5lZCwgbW9kdWxlOiB1bmRlZmluZWQsIHRlc3RJZDogdW5kZWZpbmVkIH0pICtcblx0XHRcdFwiJz5cIiArIGhlYWRlci5pbm5lckhUTUwgKyBcIjwvYT4gXCI7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kQmFubmVyKCkge1xuXHR2YXIgYmFubmVyID0gaWQoIFwicXVuaXQtYmFubmVyXCIgKTtcblxuXHRpZiAoIGJhbm5lciApIHtcblx0XHRiYW5uZXIuY2xhc3NOYW1lID0gXCJcIjtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRUZXN0UmVzdWx0cygpIHtcblx0dmFyIHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApLFxuXHRcdHJlc3VsdCA9IGlkKCBcInF1bml0LXRlc3RyZXN1bHRcIiApO1xuXG5cdGlmICggcmVzdWx0ICkge1xuXHRcdHJlc3VsdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKCByZXN1bHQgKTtcblx0fVxuXG5cdGlmICggdGVzdHMgKSB7XG5cdFx0dGVzdHMuaW5uZXJIVE1MID0gXCJcIjtcblx0XHRyZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInBcIiApO1xuXHRcdHJlc3VsdC5pZCA9IFwicXVuaXQtdGVzdHJlc3VsdFwiO1xuXHRcdHJlc3VsdC5jbGFzc05hbWUgPSBcInJlc3VsdFwiO1xuXHRcdHRlc3RzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKCByZXN1bHQsIHRlc3RzICk7XG5cdFx0cmVzdWx0LmlubmVySFRNTCA9IFwiUnVubmluZy4uLjxiciAvPiYjMTYwO1wiO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHN0b3JlRml4dHVyZSgpIHtcblx0dmFyIGZpeHR1cmUgPSBpZCggXCJxdW5pdC1maXh0dXJlXCIgKTtcblx0aWYgKCBmaXh0dXJlICkge1xuXHRcdGNvbmZpZy5maXh0dXJlID0gZml4dHVyZS5pbm5lckhUTUw7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kRmlsdGVyZWRUZXN0KCkge1xuXHR2YXIgdGVzdElkID0gUVVuaXQuY29uZmlnLnRlc3RJZDtcblx0aWYgKCAhdGVzdElkIHx8IHRlc3RJZC5sZW5ndGggPD0gMCApIHtcblx0XHRyZXR1cm4gXCJcIjtcblx0fVxuXHRyZXR1cm4gXCI8ZGl2IGlkPSdxdW5pdC1maWx0ZXJlZFRlc3QnPlJlcnVubmluZyBzZWxlY3RlZCB0ZXN0czogXCIgKyB0ZXN0SWQuam9pbihcIiwgXCIpICtcblx0XHRcIiA8YSBpZD0ncXVuaXQtY2xlYXJGaWx0ZXInIGhyZWY9J1wiICtcblx0XHRzZXRVcmwoeyBmaWx0ZXI6IHVuZGVmaW5lZCwgbW9kdWxlOiB1bmRlZmluZWQsIHRlc3RJZDogdW5kZWZpbmVkIH0pICtcblx0XHRcIic+XCIgKyBcIlJ1biBhbGwgdGVzdHNcIiArIFwiPC9hPjwvZGl2PlwiO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRVc2VyQWdlbnQoKSB7XG5cdHZhciB1c2VyQWdlbnQgPSBpZCggXCJxdW5pdC11c2VyQWdlbnRcIiApO1xuXG5cdGlmICggdXNlckFnZW50ICkge1xuXHRcdHVzZXJBZ2VudC5pbm5lckhUTUwgPSBcIlwiO1xuXHRcdHVzZXJBZ2VudC5hcHBlbmRDaGlsZChcblx0XHRcdGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxuXHRcdFx0XHRcIlFVbml0IFwiICsgUVVuaXQudmVyc2lvbiArIFwiOyBcIiArIG5hdmlnYXRvci51c2VyQWdlbnRcblx0XHRcdClcblx0XHQpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRlc3RzTGlzdCggbW9kdWxlcyApIHtcblx0dmFyIGksIGwsIHgsIHosIHRlc3QsIG1vZHVsZU9iajtcblxuXHRmb3IgKCBpID0gMCwgbCA9IG1vZHVsZXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdG1vZHVsZU9iaiA9IG1vZHVsZXNbIGkgXTtcblxuXHRcdGlmICggbW9kdWxlT2JqLm5hbWUgKSB7XG5cdFx0XHRtb2R1bGVzTGlzdC5wdXNoKCBtb2R1bGVPYmoubmFtZSApO1xuXHRcdH1cblxuXHRcdGZvciAoIHggPSAwLCB6ID0gbW9kdWxlT2JqLnRlc3RzLmxlbmd0aDsgeCA8IHo7IHgrKyApIHtcblx0XHRcdHRlc3QgPSBtb2R1bGVPYmoudGVzdHNbIHggXTtcblxuXHRcdFx0YXBwZW5kVGVzdCggdGVzdC5uYW1lLCB0ZXN0LnRlc3RJZCwgbW9kdWxlT2JqLm5hbWUgKTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kVGVzdCggbmFtZSwgdGVzdElkLCBtb2R1bGVOYW1lICkge1xuXHR2YXIgdGl0bGUsIHJlcnVuVHJpZ2dlciwgdGVzdEJsb2NrLCBhc3NlcnRMaXN0LFxuXHRcdHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApO1xuXG5cdGlmICggIXRlc3RzICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJzdHJvbmdcIiApO1xuXHR0aXRsZS5pbm5lckhUTUwgPSBnZXROYW1lSHRtbCggbmFtZSwgbW9kdWxlTmFtZSApO1xuXG5cdHJlcnVuVHJpZ2dlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiYVwiICk7XG5cdHJlcnVuVHJpZ2dlci5pbm5lckhUTUwgPSBcIlJlcnVuXCI7XG5cdHJlcnVuVHJpZ2dlci5ocmVmID0gc2V0VXJsKHsgdGVzdElkOiB0ZXN0SWQgfSk7XG5cblx0dGVzdEJsb2NrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJsaVwiICk7XG5cdHRlc3RCbG9jay5hcHBlbmRDaGlsZCggdGl0bGUgKTtcblx0dGVzdEJsb2NrLmFwcGVuZENoaWxkKCByZXJ1blRyaWdnZXIgKTtcblx0dGVzdEJsb2NrLmlkID0gXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIHRlc3RJZDtcblxuXHRhc3NlcnRMaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJvbFwiICk7XG5cdGFzc2VydExpc3QuY2xhc3NOYW1lID0gXCJxdW5pdC1hc3NlcnQtbGlzdFwiO1xuXG5cdHRlc3RCbG9jay5hcHBlbmRDaGlsZCggYXNzZXJ0TGlzdCApO1xuXG5cdHRlc3RzLmFwcGVuZENoaWxkKCB0ZXN0QmxvY2sgKTtcbn1cblxuLy8gSFRNTCBSZXBvcnRlciBpbml0aWFsaXphdGlvbiBhbmQgbG9hZFxuUVVuaXQuYmVnaW4oZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBxdW5pdCA9IGlkKCBcInF1bml0XCIgKTtcblxuXHQvLyBGaXh0dXJlIGlzIHRoZSBvbmx5IG9uZSBuZWNlc3NhcnkgdG8gcnVuIHdpdGhvdXQgdGhlICNxdW5pdCBlbGVtZW50XG5cdHN0b3JlRml4dHVyZSgpO1xuXG5cdGlmICggcXVuaXQgKSB7XG5cdFx0cXVuaXQuaW5uZXJIVE1MID1cblx0XHRcdFwiPGgxIGlkPSdxdW5pdC1oZWFkZXInPlwiICsgZXNjYXBlVGV4dCggZG9jdW1lbnQudGl0bGUgKSArIFwiPC9oMT5cIiArXG5cdFx0XHRcIjxoMiBpZD0ncXVuaXQtYmFubmVyJz48L2gyPlwiICtcblx0XHRcdFwiPGRpdiBpZD0ncXVuaXQtdGVzdHJ1bm5lci10b29sYmFyJz48L2Rpdj5cIiArXG5cdFx0XHRhcHBlbmRGaWx0ZXJlZFRlc3QoKSArXG5cdFx0XHRcIjxoMiBpZD0ncXVuaXQtdXNlckFnZW50Jz48L2gyPlwiICtcblx0XHRcdFwiPG9sIGlkPSdxdW5pdC10ZXN0cyc+PC9vbD5cIjtcblx0fVxuXG5cdGFwcGVuZEhlYWRlcigpO1xuXHRhcHBlbmRCYW5uZXIoKTtcblx0YXBwZW5kVGVzdFJlc3VsdHMoKTtcblx0YXBwZW5kVXNlckFnZW50KCk7XG5cdGFwcGVuZFRvb2xiYXIoKTtcblx0YXBwZW5kVGVzdHNMaXN0KCBkZXRhaWxzLm1vZHVsZXMgKTtcblx0dG9vbGJhck1vZHVsZUZpbHRlcigpO1xuXG5cdGlmICggcXVuaXQgJiYgY29uZmlnLmhpZGVwYXNzZWQgKSB7XG5cdFx0YWRkQ2xhc3MoIHF1bml0Lmxhc3RDaGlsZCwgXCJoaWRlcGFzc1wiICk7XG5cdH1cbn0pO1xuXG5RVW5pdC5kb25lKGZ1bmN0aW9uKCBkZXRhaWxzICkge1xuXHR2YXIgaSwga2V5LFxuXHRcdGJhbm5lciA9IGlkKCBcInF1bml0LWJhbm5lclwiICksXG5cdFx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICksXG5cdFx0aHRtbCA9IFtcblx0XHRcdFwiVGVzdHMgY29tcGxldGVkIGluIFwiLFxuXHRcdFx0ZGV0YWlscy5ydW50aW1lLFxuXHRcdFx0XCIgbWlsbGlzZWNvbmRzLjxiciAvPlwiLFxuXHRcdFx0XCI8c3BhbiBjbGFzcz0ncGFzc2VkJz5cIixcblx0XHRcdGRldGFpbHMucGFzc2VkLFxuXHRcdFx0XCI8L3NwYW4+IGFzc2VydGlvbnMgb2YgPHNwYW4gY2xhc3M9J3RvdGFsJz5cIixcblx0XHRcdGRldGFpbHMudG90YWwsXG5cdFx0XHRcIjwvc3Bhbj4gcGFzc2VkLCA8c3BhbiBjbGFzcz0nZmFpbGVkJz5cIixcblx0XHRcdGRldGFpbHMuZmFpbGVkLFxuXHRcdFx0XCI8L3NwYW4+IGZhaWxlZC5cIlxuXHRcdF0uam9pbiggXCJcIiApO1xuXG5cdGlmICggYmFubmVyICkge1xuXHRcdGJhbm5lci5jbGFzc05hbWUgPSBkZXRhaWxzLmZhaWxlZCA/IFwicXVuaXQtZmFpbFwiIDogXCJxdW5pdC1wYXNzXCI7XG5cdH1cblxuXHRpZiAoIHRlc3RzICkge1xuXHRcdGlkKCBcInF1bml0LXRlc3RyZXN1bHRcIiApLmlubmVySFRNTCA9IGh0bWw7XG5cdH1cblxuXHRpZiAoIGNvbmZpZy5hbHRlcnRpdGxlICYmIGRlZmluZWQuZG9jdW1lbnQgJiYgZG9jdW1lbnQudGl0bGUgKSB7XG5cblx0XHQvLyBzaG93IOKcliBmb3IgZ29vZCwg4pyUIGZvciBiYWQgc3VpdGUgcmVzdWx0IGluIHRpdGxlXG5cdFx0Ly8gdXNlIGVzY2FwZSBzZXF1ZW5jZXMgaW4gY2FzZSBmaWxlIGdldHMgbG9hZGVkIHdpdGggbm9uLXV0Zi04LWNoYXJzZXRcblx0XHRkb2N1bWVudC50aXRsZSA9IFtcblx0XHRcdCggZGV0YWlscy5mYWlsZWQgPyBcIlxcdTI3MTZcIiA6IFwiXFx1MjcxNFwiICksXG5cdFx0XHRkb2N1bWVudC50aXRsZS5yZXBsYWNlKCAvXltcXHUyNzE0XFx1MjcxNl0gL2ksIFwiXCIgKVxuXHRcdF0uam9pbiggXCIgXCIgKTtcblx0fVxuXG5cdC8vIGNsZWFyIG93biBzZXNzaW9uU3RvcmFnZSBpdGVtcyBpZiBhbGwgdGVzdHMgcGFzc2VkXG5cdGlmICggY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSAmJiBkZXRhaWxzLmZhaWxlZCA9PT0gMCApIHtcblx0XHRmb3IgKCBpID0gMDsgaSA8IHNlc3Npb25TdG9yYWdlLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0a2V5ID0gc2Vzc2lvblN0b3JhZ2Uua2V5KCBpKysgKTtcblx0XHRcdGlmICgga2V5LmluZGV4T2YoIFwicXVuaXQtdGVzdC1cIiApID09PSAwICkge1xuXHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCBrZXkgKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBzY3JvbGwgYmFjayB0byB0b3AgdG8gc2hvdyByZXN1bHRzXG5cdGlmICggY29uZmlnLnNjcm9sbHRvcCAmJiB3aW5kb3cuc2Nyb2xsVG8gKSB7XG5cdFx0d2luZG93LnNjcm9sbFRvKCAwLCAwICk7XG5cdH1cbn0pO1xuXG5mdW5jdGlvbiBnZXROYW1lSHRtbCggbmFtZSwgbW9kdWxlICkge1xuXHR2YXIgbmFtZUh0bWwgPSBcIlwiO1xuXG5cdGlmICggbW9kdWxlICkge1xuXHRcdG5hbWVIdG1sID0gXCI8c3BhbiBjbGFzcz0nbW9kdWxlLW5hbWUnPlwiICsgZXNjYXBlVGV4dCggbW9kdWxlICkgKyBcIjwvc3Bhbj46IFwiO1xuXHR9XG5cblx0bmFtZUh0bWwgKz0gXCI8c3BhbiBjbGFzcz0ndGVzdC1uYW1lJz5cIiArIGVzY2FwZVRleHQoIG5hbWUgKSArIFwiPC9zcGFuPlwiO1xuXG5cdHJldHVybiBuYW1lSHRtbDtcbn1cblxuUVVuaXQudGVzdFN0YXJ0KGZ1bmN0aW9uKCBkZXRhaWxzICkge1xuXHR2YXIgcnVubmluZywgdGVzdEJsb2NrLCBiYWQ7XG5cblx0dGVzdEJsb2NrID0gaWQoIFwicXVuaXQtdGVzdC1vdXRwdXQtXCIgKyBkZXRhaWxzLnRlc3RJZCApO1xuXHRpZiAoIHRlc3RCbG9jayApIHtcblx0XHR0ZXN0QmxvY2suY2xhc3NOYW1lID0gXCJydW5uaW5nXCI7XG5cdH0gZWxzZSB7XG5cblx0XHQvLyBSZXBvcnQgbGF0ZXIgcmVnaXN0ZXJlZCB0ZXN0c1xuXHRcdGFwcGVuZFRlc3QoIGRldGFpbHMubmFtZSwgZGV0YWlscy50ZXN0SWQsIGRldGFpbHMubW9kdWxlICk7XG5cdH1cblxuXHRydW5uaW5nID0gaWQoIFwicXVuaXQtdGVzdHJlc3VsdFwiICk7XG5cdGlmICggcnVubmluZyApIHtcblx0XHRiYWQgPSBRVW5pdC5jb25maWcucmVvcmRlciAmJiBkZWZpbmVkLnNlc3Npb25TdG9yYWdlICYmXG5cdFx0XHQrc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSggXCJxdW5pdC10ZXN0LVwiICsgZGV0YWlscy5tb2R1bGUgKyBcIi1cIiArIGRldGFpbHMubmFtZSApO1xuXG5cdFx0cnVubmluZy5pbm5lckhUTUwgPSAoIGJhZCA/XG5cdFx0XHRcIlJlcnVubmluZyBwcmV2aW91c2x5IGZhaWxlZCB0ZXN0OiA8YnIgLz5cIiA6XG5cdFx0XHRcIlJ1bm5pbmc6IDxiciAvPlwiICkgK1xuXHRcdFx0Z2V0TmFtZUh0bWwoIGRldGFpbHMubmFtZSwgZGV0YWlscy5tb2R1bGUgKTtcblx0fVxuXG59KTtcblxuZnVuY3Rpb24gc3RyaXBIdG1sKCBzdHJpbmcgKSB7XG5cdC8vIHN0cmlwIHRhZ3MsIGh0bWwgZW50aXR5IGFuZCB3aGl0ZXNwYWNlc1xuXHRyZXR1cm4gc3RyaW5nLnJlcGxhY2UoLzxcXC8/W14+XSsoPnwkKS9nLCBcIlwiKS5yZXBsYWNlKC9cXCZxdW90Oy9nLCBcIlwiKS5yZXBsYWNlKC9cXHMrL2csIFwiXCIpO1xufVxuXG5RVW5pdC5sb2coZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBhc3NlcnRMaXN0LCBhc3NlcnRMaSxcblx0XHRtZXNzYWdlLCBleHBlY3RlZCwgYWN0dWFsLCBkaWZmLFxuXHRcdHNob3dEaWZmID0gZmFsc2UsXG5cdFx0dGVzdEl0ZW0gPSBpZCggXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIGRldGFpbHMudGVzdElkICk7XG5cblx0aWYgKCAhdGVzdEl0ZW0gKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bWVzc2FnZSA9IGVzY2FwZVRleHQoIGRldGFpbHMubWVzc2FnZSApIHx8ICggZGV0YWlscy5yZXN1bHQgPyBcIm9rYXlcIiA6IFwiZmFpbGVkXCIgKTtcblx0bWVzc2FnZSA9IFwiPHNwYW4gY2xhc3M9J3Rlc3QtbWVzc2FnZSc+XCIgKyBtZXNzYWdlICsgXCI8L3NwYW4+XCI7XG5cdG1lc3NhZ2UgKz0gXCI8c3BhbiBjbGFzcz0ncnVudGltZSc+QCBcIiArIGRldGFpbHMucnVudGltZSArIFwiIG1zPC9zcGFuPlwiO1xuXG5cdC8vIHB1c2hGYWlsdXJlIGRvZXNuJ3QgcHJvdmlkZSBkZXRhaWxzLmV4cGVjdGVkXG5cdC8vIHdoZW4gaXQgY2FsbHMsIGl0J3MgaW1wbGljaXQgdG8gYWxzbyBub3Qgc2hvdyBleHBlY3RlZCBhbmQgZGlmZiBzdHVmZlxuXHQvLyBBbHNvLCB3ZSBuZWVkIHRvIGNoZWNrIGRldGFpbHMuZXhwZWN0ZWQgZXhpc3RlbmNlLCBhcyBpdCBjYW4gZXhpc3QgYW5kIGJlIHVuZGVmaW5lZFxuXHRpZiAoICFkZXRhaWxzLnJlc3VsdCAmJiBoYXNPd24uY2FsbCggZGV0YWlscywgXCJleHBlY3RlZFwiICkgKSB7XG5cdFx0aWYgKCBkZXRhaWxzLm5lZ2F0aXZlICkge1xuXHRcdFx0ZXhwZWN0ZWQgPSBlc2NhcGVUZXh0KCBcIk5PVCBcIiArIFFVbml0LmR1bXAucGFyc2UoIGRldGFpbHMuZXhwZWN0ZWQgKSApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRleHBlY3RlZCA9IGVzY2FwZVRleHQoIFFVbml0LmR1bXAucGFyc2UoIGRldGFpbHMuZXhwZWN0ZWQgKSApO1xuXHRcdH1cblxuXHRcdGFjdHVhbCA9IGVzY2FwZVRleHQoIFFVbml0LmR1bXAucGFyc2UoIGRldGFpbHMuYWN0dWFsICkgKTtcblx0XHRtZXNzYWdlICs9IFwiPHRhYmxlPjx0ciBjbGFzcz0ndGVzdC1leHBlY3RlZCc+PHRoPkV4cGVjdGVkOiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdGV4cGVjdGVkICtcblx0XHRcdFwiPC9wcmU+PC90ZD48L3RyPlwiO1xuXG5cdFx0aWYgKCBhY3R1YWwgIT09IGV4cGVjdGVkICkge1xuXG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LWFjdHVhbCc+PHRoPlJlc3VsdDogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRcdGFjdHVhbCArIFwiPC9wcmU+PC90ZD48L3RyPlwiO1xuXG5cdFx0XHQvLyBEb24ndCBzaG93IGRpZmYgaWYgYWN0dWFsIG9yIGV4cGVjdGVkIGFyZSBib29sZWFuc1xuXHRcdFx0aWYgKCAhKCAvXih0cnVlfGZhbHNlKSQvLnRlc3QoIGFjdHVhbCApICkgJiZcblx0XHRcdFx0XHQhKCAvXih0cnVlfGZhbHNlKSQvLnRlc3QoIGV4cGVjdGVkICkgKSApIHtcblx0XHRcdFx0ZGlmZiA9IFFVbml0LmRpZmYoIGV4cGVjdGVkLCBhY3R1YWwgKTtcblx0XHRcdFx0c2hvd0RpZmYgPSBzdHJpcEh0bWwoIGRpZmYgKS5sZW5ndGggIT09XG5cdFx0XHRcdFx0c3RyaXBIdG1sKCBleHBlY3RlZCApLmxlbmd0aCArXG5cdFx0XHRcdFx0c3RyaXBIdG1sKCBhY3R1YWwgKS5sZW5ndGg7XG5cdFx0XHR9XG5cblx0XHRcdC8vIERvbid0IHNob3cgZGlmZiBpZiBleHBlY3RlZCBhbmQgYWN0dWFsIGFyZSB0b3RhbGx5IGRpZmZlcmVudFxuXHRcdFx0aWYgKCBzaG93RGlmZiApIHtcblx0XHRcdFx0bWVzc2FnZSArPSBcIjx0ciBjbGFzcz0ndGVzdC1kaWZmJz48dGg+RGlmZjogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRcdFx0ZGlmZiArIFwiPC9wcmU+PC90ZD48L3RyPlwiO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkLmluZGV4T2YoIFwiW29iamVjdCBBcnJheV1cIiApICE9PSAtMSB8fFxuXHRcdFx0XHRleHBlY3RlZC5pbmRleE9mKCBcIltvYmplY3QgT2JqZWN0XVwiICkgIT09IC0xICkge1xuXHRcdFx0bWVzc2FnZSArPSBcIjx0ciBjbGFzcz0ndGVzdC1tZXNzYWdlJz48dGg+TWVzc2FnZTogPC90aD48dGQ+XCIgK1xuXHRcdFx0XHRcIkRpZmYgc3VwcHJlc3NlZCBhcyB0aGUgZGVwdGggb2Ygb2JqZWN0IGlzIG1vcmUgdGhhbiBjdXJyZW50IG1heCBkZXB0aCAoXCIgK1xuXHRcdFx0XHRRVW5pdC5jb25maWcubWF4RGVwdGggKyBcIikuPHA+SGludDogVXNlIDxjb2RlPlFVbml0LmR1bXAubWF4RGVwdGg8L2NvZGU+IHRvIFwiICtcblx0XHRcdFx0XCIgcnVuIHdpdGggYSBoaWdoZXIgbWF4IGRlcHRoIG9yIDxhIGhyZWY9J1wiICsgc2V0VXJsKHsgbWF4RGVwdGg6IC0xIH0pICsgXCInPlwiICtcblx0XHRcdFx0XCJSZXJ1bjwvYT4gd2l0aG91dCBtYXggZGVwdGguPC9wPjwvdGQ+PC90cj5cIjtcblx0XHR9XG5cblx0XHRpZiAoIGRldGFpbHMuc291cmNlICkge1xuXHRcdFx0bWVzc2FnZSArPSBcIjx0ciBjbGFzcz0ndGVzdC1zb3VyY2UnPjx0aD5Tb3VyY2U6IDwvdGg+PHRkPjxwcmU+XCIgK1xuXHRcdFx0XHRlc2NhcGVUZXh0KCBkZXRhaWxzLnNvdXJjZSApICsgXCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cdFx0fVxuXG5cdFx0bWVzc2FnZSArPSBcIjwvdGFibGU+XCI7XG5cblx0Ly8gdGhpcyBvY2N1cnMgd2hlbiBwdXNoRmFpbHVyZSBpcyBzZXQgYW5kIHdlIGhhdmUgYW4gZXh0cmFjdGVkIHN0YWNrIHRyYWNlXG5cdH0gZWxzZSBpZiAoICFkZXRhaWxzLnJlc3VsdCAmJiBkZXRhaWxzLnNvdXJjZSApIHtcblx0XHRtZXNzYWdlICs9IFwiPHRhYmxlPlwiICtcblx0XHRcdFwiPHRyIGNsYXNzPSd0ZXN0LXNvdXJjZSc+PHRoPlNvdXJjZTogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRlc2NhcGVUZXh0KCBkZXRhaWxzLnNvdXJjZSApICsgXCI8L3ByZT48L3RkPjwvdHI+XCIgK1xuXHRcdFx0XCI8L3RhYmxlPlwiO1xuXHR9XG5cblx0YXNzZXJ0TGlzdCA9IHRlc3RJdGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcIm9sXCIgKVsgMCBdO1xuXG5cdGFzc2VydExpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJsaVwiICk7XG5cdGFzc2VydExpLmNsYXNzTmFtZSA9IGRldGFpbHMucmVzdWx0ID8gXCJwYXNzXCIgOiBcImZhaWxcIjtcblx0YXNzZXJ0TGkuaW5uZXJIVE1MID0gbWVzc2FnZTtcblx0YXNzZXJ0TGlzdC5hcHBlbmRDaGlsZCggYXNzZXJ0TGkgKTtcbn0pO1xuXG5RVW5pdC50ZXN0RG9uZShmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIHRlc3RUaXRsZSwgdGltZSwgdGVzdEl0ZW0sIGFzc2VydExpc3QsXG5cdFx0Z29vZCwgYmFkLCB0ZXN0Q291bnRzLCBza2lwcGVkLCBzb3VyY2VOYW1lLFxuXHRcdHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApO1xuXG5cdGlmICggIXRlc3RzICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRlc3RJdGVtID0gaWQoIFwicXVuaXQtdGVzdC1vdXRwdXQtXCIgKyBkZXRhaWxzLnRlc3RJZCApO1xuXG5cdGFzc2VydExpc3QgPSB0ZXN0SXRlbS5nZXRFbGVtZW50c0J5VGFnTmFtZSggXCJvbFwiIClbIDAgXTtcblxuXHRnb29kID0gZGV0YWlscy5wYXNzZWQ7XG5cdGJhZCA9IGRldGFpbHMuZmFpbGVkO1xuXG5cdC8vIHN0b3JlIHJlc3VsdCB3aGVuIHBvc3NpYmxlXG5cdGlmICggY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSApIHtcblx0XHRpZiAoIGJhZCApIHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIGRldGFpbHMubW9kdWxlICsgXCItXCIgKyBkZXRhaWxzLm5hbWUsIGJhZCApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCBcInF1bml0LXRlc3QtXCIgKyBkZXRhaWxzLm1vZHVsZSArIFwiLVwiICsgZGV0YWlscy5uYW1lICk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKCBiYWQgPT09IDAgKSB7XG5cblx0XHQvLyBDb2xsYXBzZSB0aGUgcGFzc2luZyB0ZXN0c1xuXHRcdGFkZENsYXNzKCBhc3NlcnRMaXN0LCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdH0gZWxzZSBpZiAoIGJhZCAmJiBjb25maWcuY29sbGFwc2UgJiYgIWNvbGxhcHNlTmV4dCApIHtcblxuXHRcdC8vIFNraXAgY29sbGFwc2luZyB0aGUgZmlyc3QgZmFpbGluZyB0ZXN0XG5cdFx0Y29sbGFwc2VOZXh0ID0gdHJ1ZTtcblx0fSBlbHNlIHtcblxuXHRcdC8vIENvbGxhcHNlIHJlbWFpbmluZyB0ZXN0c1xuXHRcdGFkZENsYXNzKCBhc3NlcnRMaXN0LCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdH1cblxuXHQvLyB0ZXN0SXRlbS5maXJzdENoaWxkIGlzIHRoZSB0ZXN0IG5hbWVcblx0dGVzdFRpdGxlID0gdGVzdEl0ZW0uZmlyc3RDaGlsZDtcblxuXHR0ZXN0Q291bnRzID0gYmFkID9cblx0XHRcIjxiIGNsYXNzPSdmYWlsZWQnPlwiICsgYmFkICsgXCI8L2I+LCBcIiArIFwiPGIgY2xhc3M9J3Bhc3NlZCc+XCIgKyBnb29kICsgXCI8L2I+LCBcIiA6XG5cdFx0XCJcIjtcblxuXHR0ZXN0VGl0bGUuaW5uZXJIVE1MICs9IFwiIDxiIGNsYXNzPSdjb3VudHMnPihcIiArIHRlc3RDb3VudHMgK1xuXHRcdGRldGFpbHMuYXNzZXJ0aW9ucy5sZW5ndGggKyBcIik8L2I+XCI7XG5cblx0aWYgKCBkZXRhaWxzLnNraXBwZWQgKSB7XG5cdFx0dGVzdEl0ZW0uY2xhc3NOYW1lID0gXCJza2lwcGVkXCI7XG5cdFx0c2tpcHBlZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZW1cIiApO1xuXHRcdHNraXBwZWQuY2xhc3NOYW1lID0gXCJxdW5pdC1za2lwcGVkLWxhYmVsXCI7XG5cdFx0c2tpcHBlZC5pbm5lckhUTUwgPSBcInNraXBwZWRcIjtcblx0XHR0ZXN0SXRlbS5pbnNlcnRCZWZvcmUoIHNraXBwZWQsIHRlc3RUaXRsZSApO1xuXHR9IGVsc2Uge1xuXHRcdGFkZEV2ZW50KCB0ZXN0VGl0bGUsIFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR0b2dnbGVDbGFzcyggYXNzZXJ0TGlzdCwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHRcdH0pO1xuXG5cdFx0dGVzdEl0ZW0uY2xhc3NOYW1lID0gYmFkID8gXCJmYWlsXCIgOiBcInBhc3NcIjtcblxuXHRcdHRpbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInNwYW5cIiApO1xuXHRcdHRpbWUuY2xhc3NOYW1lID0gXCJydW50aW1lXCI7XG5cdFx0dGltZS5pbm5lckhUTUwgPSBkZXRhaWxzLnJ1bnRpbWUgKyBcIiBtc1wiO1xuXHRcdHRlc3RJdGVtLmluc2VydEJlZm9yZSggdGltZSwgYXNzZXJ0TGlzdCApO1xuXHR9XG5cblx0Ly8gU2hvdyB0aGUgc291cmNlIG9mIHRoZSB0ZXN0IHdoZW4gc2hvd2luZyBhc3NlcnRpb25zXG5cdGlmICggZGV0YWlscy5zb3VyY2UgKSB7XG5cdFx0c291cmNlTmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwicFwiICk7XG5cdFx0c291cmNlTmFtZS5pbm5lckhUTUwgPSBcIjxzdHJvbmc+U291cmNlOiA8L3N0cm9uZz5cIiArIGRldGFpbHMuc291cmNlO1xuXHRcdGFkZENsYXNzKCBzb3VyY2VOYW1lLCBcInF1bml0LXNvdXJjZVwiICk7XG5cdFx0aWYgKCBiYWQgPT09IDAgKSB7XG5cdFx0XHRhZGRDbGFzcyggc291cmNlTmFtZSwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHRcdH1cblx0XHRhZGRFdmVudCggdGVzdFRpdGxlLCBcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dG9nZ2xlQ2xhc3MoIHNvdXJjZU5hbWUsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0XHR9KTtcblx0XHR0ZXN0SXRlbS5hcHBlbmRDaGlsZCggc291cmNlTmFtZSApO1xuXHR9XG59KTtcblxuaWYgKCBkZWZpbmVkLmRvY3VtZW50ICkge1xuXG5cdC8vIEF2b2lkIHJlYWR5U3RhdGUgaXNzdWUgd2l0aCBwaGFudG9tanNcblx0Ly8gUmVmOiAjODE4XG5cdHZhciBub3RQaGFudG9tID0gKCBmdW5jdGlvbiggcCApIHtcblx0XHRyZXR1cm4gISggcCAmJiBwLnZlcnNpb24gJiYgcC52ZXJzaW9uLm1ham9yID4gMCApO1xuXHR9ICkoIHdpbmRvdy5waGFudG9tICk7XG5cblx0aWYgKCBub3RQaGFudG9tICYmIGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIiApIHtcblx0XHRRVW5pdC5sb2FkKCk7XG5cdH0gZWxzZSB7XG5cdFx0YWRkRXZlbnQoIHdpbmRvdywgXCJsb2FkXCIsIFFVbml0LmxvYWQgKTtcblx0fVxufSBlbHNlIHtcblx0Y29uZmlnLnBhZ2VMb2FkZWQgPSB0cnVlO1xuXHRjb25maWcuYXV0b3J1biA9IHRydWU7XG59XG5cbn0pKCk7XG4iLCJjb25zdCBzZWFyY2hDb21wb25lbnQgPSBmdW5jdGlvbiBzZWFyY2hDb21wb25lbnQgKCl7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0ZW1wbGF0ZSgpe1xuICAgICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgICAgICA8Zm9ybT5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cInNlYXJjaFwiPldoYXQgZGlkIHlvdSBlYXQgdG9kYXkgPzwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwic2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJUYWNvcywgY29mZmVlLCBiYW5uYW5hLCAuLi5cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cIlNlYXJjaFwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZm9ybT5gO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluaXQoKXtcbiAgICAgICAgICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHJvb3QuY2xhc3NMaXN0LmFkZCgncm9vdCcpO1xuICAgICAgICAgICAgcm9vdC5pbm5lckhUTUwgPSB0aGlzLnRlbXBsYXRlKCk7XG5cbiAgICAgICAgICAgIHRoaXMuZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKHJvb3QpO1xuXG4gICAgICAgICAgICBjb25zdCBidXR0b24gPSB0aGlzLmZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9YnV0dG9uXScpO1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoRmllbGQgPSB0aGlzLmZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W25hbWU9c2VhcmNoXScpO1xuXG4gICAgICAgICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLmxvZyhlLCBzZWFyY2hGaWVsZC52YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlcihjb250YWluZXIpe1xuICAgICAgICAgICAgaWYodGhpcy5mcmFnbWVudCAmJiBjb250YWluZXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCl7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZnJhZ21lbnQucXVlcnlTZWxlY3RvcignLnJvb3QgPiAqJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgc2VhcmNoQ29tcG9uZW50O1xuIiwiaW1wb3J0IFFVbml0IGZyb20gJ3F1bml0anMnO1xuaW1wb3J0IHNlYXJjaENvbXBvbmVudCBmcm9tICcuLi8uLi9zcmMvY29tcG9uZW50cy9zZWFyY2guanMnO1xuXG5RVW5pdC5tb2R1bGUoJ0NvbXBvbmVudCBBUEknKTtcblxuUVVuaXQudGVzdCgnZmFjdG9yeScsIGFzc2VydCA9PiB7XG4gICAgYXNzZXJ0LmVxdWFsKCB0eXBlb2Ygc2VhcmNoQ29tcG9uZW50LCAnZnVuY3Rpb24nLCAnVGhlIGNvbXBvbmVudCBtb2R1bGUgZXhwb3NlIGEgZnVuY3Rpb24nKTtcbiAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBzZWFyY2hDb21wb25lbnQoKSwgJ29iamVjdCcsICdUaGUgY29tcG9uZW50IGZhY3RvcnkgY3JlYXRlcyBhbiBvYmplY3QnKTtcbiAgICBhc3NlcnQubm90RGVlcEVxdWFsKHNlYXJjaENvbXBvbmVudCgpLCBzZWFyY2hDb21wb25lbnQoKSwgJ1RoZSBjb21wb25lbnQgZmFjdG9yeSBjcmVhdGVzIG5ldyBvYmplY3RzJyk7XG59KTtcbiJdfQ==
