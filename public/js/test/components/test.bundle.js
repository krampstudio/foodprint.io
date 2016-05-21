(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * QUnit 1.23.1
 * https://qunitjs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2016-04-12T17:29Z
 */

( function( global ) {

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
	sessionStorage: ( function() {
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

// Returns a new Array with the elements that are in a but not in b
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

// From jquery.js
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

		// Exclude useless self-reference for generated Error objects
		if ( /qunit.js$/.test( e.sourceURL ) ) {
			return;
		}

		// For actual exceptions, this is useful
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

	// Block until document ready
	blocking: true,

	// By default, run previously failed tests first
	// very useful in combination with "Hide passed tests" checked
	reorder: true,

	// By default, modify document.title when suite is done
	altertitle: true,

	// HTML Reporter: collapse every test except the first failing test
	// If false, all failing tests will be expanded
	collapse: true,

	// By default, scroll to top of the page when suite is done
	scrolltop: true,

	// Depth up-to which object will be dumped
	maxDepth: 5,

	// When enabled, all tests must call expect()
	requireExpects: false,

	// Placeholder for user-configurable form-exposed URL parameters
	urlConfig: [],

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

// Push a loose unnamed module to the modules collection
config.modules.push( config.currentModule );

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
				QUnit.test( "global failure", extend( function() {
					QUnit.pushFailure( error, filePath + ":" + linerNr );
				}, { validTest: true } ) );
			}
			return false;
		}

		return ret;
	};
}() );

// Figure out if we're running the tests from a server or not
QUnit.isLocal = !( defined.document && window.location.protocol !== "file:" );

// Expose the current QUnit version
QUnit.version = "1.23.1";

extend( QUnit, {

	// Call on start of module test to prepend name to all tests
	module: function( name, testEnvironment, executeNow ) {
		var module, moduleFns;
		var currentModule = config.currentModule;

		if ( arguments.length === 2 ) {
			if ( objectType( testEnvironment ) === "function" ) {
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

		if ( objectType( executeNow ) === "function" ) {
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
				tests: [],
				moduleId: generateHash( moduleName )
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

			// Throw an Error if start is called more often than stop
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
} );

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
			modulesLog.push( {
				name: config.modules[ i ].name,
				tests: config.modules[ i ].tests
			} );
		}

		// The test run is officially beginning now
		runLoggingCallbacks( "begin", {
			totalTests: Test.count,
			modules: modulesLog
		} );
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
		config.timeout = setTimeout( function() {
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
		setTimeout( function() {
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
		} );
	}
	delete config.previousModule;

	runtime = now() - config.started;
	passed = config.stats.all - config.stats.bad;

	runLoggingCallbacks( "done", {
		failed: config.stats.bad,
		passed: passed,
		total: config.stats.all,
		runtime: runtime
	} );
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
var unitSampler;

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

	this.module.tests.push( {
		name: this.testName,
		testId: this.testId
	} );

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
				} );
			}
			config.previousModule = this.module;
			config.moduleStats = { all: 0, bad: 0, started: now() };
			runLoggingCallbacks( "moduleStart", {
				name: this.module.name,
				tests: this.module.tests
			} );
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
		} );

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

			// Else next test will carry the responsibility
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
		} );

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

			// Each of these can by async
			synchronize( [
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
			] );
		}

		// Prioritize previously failed tests, detected from sessionStorage
		priority = QUnit.config.reorder && defined.sessionStorage &&
				+sessionStorage.getItem( "qunit-test-" + this.module.name + "-" + this.testName );

		return synchronize( run, priority, config.seed );
	},

	pushResult: function( resultInfo ) {

		// Destructure of resultInfo = { result, actual, expected, message, negative }
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

		this.assertions.push( {
			result: !!resultInfo.result,
			message: resultInfo.message
		} );
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

		this.assertions.push( {
			result: false,
			message: message
		} );
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

						// Else next test will carry the responsibility
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
			module = config.module && config.module.toLowerCase(),
			fullName = ( this.module.name + ": " + this.testName );

		function moduleChainNameMatch( testModule ) {
			var testModuleName = testModule.name ? testModule.name.toLowerCase() : null;
			if ( testModuleName === module ) {
				return true;
			} else if ( testModule.parentModule ) {
				return moduleChainNameMatch( testModule.parentModule );
			} else {
				return false;
			}
		}

		function moduleChainIdMatch( testModule ) {
			return inArray( testModule.moduleId, config.moduleId ) > -1 ||
				testModule.parentModule && moduleChainIdMatch( testModule.parentModule );
		}

		// Internally-generated tests are always valid
		if ( this.callback && this.callback.validTest ) {
			return true;
		}

		if ( config.moduleId && config.moduleId.length > 0 &&
			!moduleChainIdMatch( this.module ) ) {

			return false;
		}

		if ( config.testId && config.testId.length > 0 &&
			inArray( this.testId, config.testId ) < 0 ) {

			return false;
		}

		if ( module && !moduleChainNameMatch( this.module ) ) {
			return false;
		}

		if ( !filter ) {
			return true;
		}

		return regexFilter ?
			this.regexFilter( !!regexFilter[ 1 ], regexFilter[ 2 ], regexFilter[ 3 ], fullName ) :
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

function synchronize( callback, priority, seed ) {
	var last = !priority,
		index;

	if ( QUnit.objectType( callback ) === "array" ) {
		while ( callback.length ) {
			synchronize( callback.shift() );
		}
		return;
	}

	if ( priority ) {
		config.queue.splice( priorityCount++, 0, callback );
	} else if ( seed ) {
		if ( !unitSampler ) {
			unitSampler = unitSamplerGenerator( seed );
		}

		// Insert into a random position after all priority items
		index = Math.floor( unitSampler() * ( config.queue.length - priorityCount + 1 ) );
		config.queue.splice( priorityCount + index, 0, callback );
	} else {
		config.queue.push( callback );
	}

	if ( config.autorun && !config.blocking ) {
		process( last );
	}
}

function unitSamplerGenerator( seed ) {

	// 32-bit xorshift, requires only a nonzero seed
	// http://excamera.com/sphinx/article-xorshift.html
	var sample = parseInt( generateHash( seed ), 16 ) || -1;
	return function() {
		sample ^= sample << 13;
		sample ^= sample >>> 17;
		sample ^= sample << 5;

		// ECMAScript has no unsigned number type
		if ( sample < 0 ) {
			sample += 0x100000000;
		}

		return sample / 0x100000000;
	};
}

function saveGlobal() {
	config.pollution = [];

	if ( config.noglobals ) {
		for ( var key in global ) {
			if ( hasOwn.call( global, key ) ) {

				// In Opera sometimes DOM element ids show up here, ignore them
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

	newTest = new Test( {
		testName: testName,
		expected: expected,
		async: async,
		callback: callback
	} );

	newTest.queue();
}

// Will be exposed as QUnit.skip
function skip( testName ) {
	if ( focused )  { return; }

	var test = new Test( {
		testName: testName,
		skip: true
	} );

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

	newTest = new Test( {
		testName: testName,
		expected: expected,
		async: async,
		callback: callback
	} );

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

		// Destructure of resultInfo = { result, actual, expected, message, negative }
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
		} catch ( e ) {
			actual = e;
		}
		currentTest.ignoreGlobalErrors = false;

		if ( actual ) {
			expectedType = QUnit.objectType( expected );

			// We don't want to validate thrown error
			if ( !expected ) {
				ok = true;
				expectedOutput = null;

			// Expected is a regexp
			} else if ( expectedType === "regexp" ) {
				ok = expected.test( errorString( actual ) );

			// Expected is a string
			} else if ( expectedType === "string" ) {
				ok = expected === errorString( actual );

			// Expected is a constructor, maybe an Error constructor
			} else if ( expectedType === "function" && actual instanceof expected ) {
				ok = true;

			// Expected is an Error object
			} else if ( expectedType === "object" ) {
				ok = actual instanceof expected.constructor &&
					actual.name === expected.name &&
					actual.message === expected.message;

			// Expected is a validation function which returns true if validation passed
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
( function() {
	/*jshint sub:true */
	Assert.prototype.raises = Assert.prototype [ "throws" ]; //jscs:ignore requireDotNotation
}() );

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
QUnit.equiv = ( function() {

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

				// Safe and faster
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
			var innerEq,
				outerEq = true;

			if ( a.size !== b.size ) {
				return false;
			}

			a.forEach( function( aVal ) {
				innerEq = false;

				b.forEach( function( bVal ) {
					if ( innerEquiv( bVal, aVal ) ) {
						innerEq = true;
					}
				} );

				if ( !innerEq ) {
					outerEq = false;
				}
			} );

			return outerEq;
		},

		"map": function( b, a ) {
			var innerEq,
				outerEq = true;

			if ( a.size !== b.size ) {
				return false;
			}

			a.forEach( function( aVal, aKey ) {
				innerEq = false;

				b.forEach( function( bVal, bKey ) {
					if ( innerEquiv( [ bVal, bKey ], [ aVal, aKey ] ) ) {
						innerEq = true;
					}
				} );

				if ( !innerEq ) {
					outerEq = false;
				}
			} );

			return outerEq;
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
}() );

// Based on jsDump by Ariel Flesler
// http://flesler.blogspot.com/2008/05/jsdump-pretty-dump-of-any-javascript.html
QUnit.dump = ( function() {
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

			// The objType is used mostly internally, you can fix a (custom) type in advance
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

					// Native arrays
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

			// Extra can be a number, shortcut for increasing-calling-decreasing
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

						// Functions never have name in IE
						name = "name" in fn ? fn.name : ( reName.exec( fn ) || [] )[ 1 ];

					if ( name ) {
						ret += " " + name;
					}
					ret += "(";

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

				// Function calls it internally, it's the arguments part of the function
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

				// Object calls it internally, the key part of an item in a map
				key: quote,

				// Function calls it internally, it's the content of the function
				functionCode: "[code]",

				// Node calls it internally, it's a html attribute value
				attribute: quote,
				string: quote,
				date: quote,
				regexp: literal,
				number: literal,
				"boolean": literal
			},

			// If true, entities are escaped ( <, >, \t, space and \n )
			HTML: false,

			// Indentation unit
			indentChar: "  ",

			// If true, items in a collection, are separated by a \n, else just a space.
			multiline: true
		};

	return dump;
}() );

// Back compat
QUnit.jsDump = QUnit.dump;

// Deprecated
// Extend assert methods to QUnit for Backwards compatibility
( function() {
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
}() );

// For browser, export only select globals
if ( defined.document ) {

	( function() {
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
	}() );

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

// Get a reference to the global object, like window in browsers
}( ( function() {
	return this;
}() ) ) );

( function() {

// Only interact with URLs via window.location
var location = typeof window !== "undefined" && window.location;
if ( !location ) {
	return;
}

var urlParams = getUrlParams();

QUnit.urlParams = urlParams;

// Match module/test by inclusion in an array
QUnit.config.moduleId = [].concat( urlParams.moduleId || [] );
QUnit.config.testId = [].concat( urlParams.testId || [] );

// Exact case-insensitive match of the module name
QUnit.config.module = urlParams.module;

// Regular expression or case-insenstive substring match against "moduleName: testName"
QUnit.config.filter = urlParams.filter;

// Test order randomization
if ( urlParams.seed === true ) {

	// Generate a random seed if the option is specified without a value
	QUnit.config.seed = Math.random().toString( 36 ).slice( 2 );
} else if ( urlParams.seed ) {
	QUnit.config.seed = urlParams.seed;
}

// Add URL-parameter-mapped config values with UI form rendering data
QUnit.config.urlConfig.push(
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
);

QUnit.begin( function() {
	var i, option,
		urlConfig = QUnit.config.urlConfig;

	for ( i = 0; i < urlConfig.length; i++ ) {

		// Options can be either strings or objects with nonempty "id" properties
		option = QUnit.config.urlConfig[ i ];
		if ( typeof option !== "string" ) {
			option = option.id;
		}

		if ( QUnit.config[ option ] === undefined ) {
			QUnit.config[ option ] = urlParams[ option ];
		}
	}
} );

function getUrlParams() {
	var i, param, name, value;
	var urlParams = {};
	var params = location.search.slice( 1 ).split( "&" );
	var length = params.length;

	for ( i = 0; i < length; i++ ) {
		if ( params[ i ] ) {
			param = params[ i ].split( "=" );
			name = decodeURIComponent( param[ 0 ] );

			// Allow just a key to turn on a flag, e.g., test.html?noglobals
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
}

// Don't load the HTML Reporter on non-browser environments
if ( typeof window === "undefined" || !window.document ) {
	return;
}

// Deprecated QUnit.init - Ref #530
// Re-initialize the configuration options
QUnit.init = function() {
	var config = QUnit.config;

	config.stats = { all: 0, bad: 0 };
	config.moduleStats = { all: 0, bad: 0 };
	config.started = 0;
	config.updateRate = 1000;
	config.blocking = false;
	config.autostart = true;
	config.autorun = false;
	config.filter = "";
	config.queue = [];

	appendInterface();
};

var config = QUnit.config,
	document = window.document,
	collapseNext = false,
	hasOwn = Object.prototype.hasOwnProperty,
	unfilteredUrl = setUrl( { filter: undefined, module: undefined,
		moduleId: undefined, testId: undefined } ),
	defined = {
		sessionStorage: ( function() {
			var x = "qunit-test-string";
			try {
				sessionStorage.setItem( x, x );
				sessionStorage.removeItem( x );
				return true;
			} catch ( e ) {
				return false;
			}
		}() )
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
	} );
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

		// Support: IE <9
		elem.attachEvent( "on" + type, function() {
			var event = window.event;
			if ( !event.target ) {
				event.target = event.srcElement || document;
			}

			fn.call( elem, event );
		} );
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

function toggleClass( elem, name, force ) {
	if ( force || typeof force === "undefined" && !hasClass( elem, name ) ) {
		addClass( elem, name );
	} else {
		removeClass( elem, name );
	}
}

function removeClass( elem, name ) {
	var set = " " + elem.className + " ";

	// Class name may appear multiple times
	while ( set.indexOf( " " + name + " " ) >= 0 ) {
		set = set.replace( " " + name + " ", " " );
	}

	// Trim for prettiness
	elem.className = typeof set.trim === "function" ? set.trim() : set.replace( /^\s+|\s+$/g, "" );
}

function id( name ) {
	return document.getElementById && document.getElementById( name );
}

function getUrlConfigHtml() {
	var i, j, val,
		escaped, escapedTooltip,
		selection = false,
		urlConfig = config.urlConfig,
		urlConfigHtml = "";

	for ( i = 0; i < urlConfig.length; i++ ) {

		// Options can be either strings or objects with nonempty "id" properties
		val = config.urlConfig[ i ];
		if ( typeof val === "string" ) {
			val = {
				id: val,
				label: val
			};
		}

		escaped = escapeText( val.id );
		escapedTooltip = escapeText( val.tooltip );

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
	var updatedUrl, value, tests,
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

	// Check if we can apply the change without a page refresh
	if ( "hidepassed" === field.name && "replaceState" in window.history ) {
		QUnit.urlParams[ field.name ] = value;
		config[ field.name ] = value || false;
		tests = id( "qunit-tests" );
		if ( tests ) {
			toggleClass( tests, "hidepass", value || false );
		}
		window.history.replaceState( null, "", updatedUrl );
	} else {
		window.location = updatedUrl;
	}
}

function setUrl( params ) {
	var key, arrValue, i,
		querystring = "?",
		location = window.location;

	params = QUnit.extend( QUnit.extend( {}, QUnit.urlParams ), params );

	for ( key in params ) {

		// Skip inherited or undefined properties
		if ( hasOwn.call( params, key ) && params[ key ] !== undefined ) {

			// Output a parameter for each value of this key (but usually just one)
			arrValue = [].concat( params[ key ] );
			for ( i = 0; i < arrValue.length; i++ ) {
				querystring += encodeURIComponent( key );
				if ( arrValue[ i ] !== true ) {
					querystring += "=" + encodeURIComponent( arrValue[ i ] );
				}
				querystring += "&";
			}
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

	window.location = setUrl( {
		module: ( selectedModule === "" ) ? undefined : selectedModule,
		filter: ( filter === "" ) ? undefined : filter,

		// Remove moduleId and testId filters
		moduleId: undefined,
		testId: undefined
	} );
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
	} );

	return filter;
}

function toolbarModuleFilterHtml() {
	var i,
		moduleFilterHtml = "";

	if ( !modulesList.length ) {
		return false;
	}

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
		toolbarModuleFilter();
	}
}

function appendHeader() {
	var header = id( "qunit-header" );

	if ( header ) {
		header.innerHTML = "<a href='" + escapeText( unfilteredUrl ) + "'>" + header.innerHTML +
			"</a> ";
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
		escapeText( testId.join( ", " ) ) +
		" <a id='qunit-clearFilter' href='" +
		escapeText( unfilteredUrl ) +
		"'>Run all tests</a></div>";
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

function appendInterface() {
	var qunit = id( "qunit" );

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
}

function appendTestsList( modules ) {
	var i, l, x, z, test, moduleObj;

	for ( i = 0, l = modules.length; i < l; i++ ) {
		moduleObj = modules[ i ];

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
	rerunTrigger.href = setUrl( { testId: testId } );

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
QUnit.begin( function( details ) {
	var i, moduleObj, tests;

	// Sort modules by name for the picker
	for ( i = 0; i < details.modules.length; i++ ) {
		moduleObj = details.modules[ i ];
		if ( moduleObj.name ) {
			modulesList.push( moduleObj.name );
		}
	}
	modulesList.sort( function( a, b ) {
		return a.localeCompare( b );
	} );

	// Capture fixture HTML from the page
	storeFixture();

	// Initialize QUnit elements
	appendInterface();
	appendTestsList( details.modules );
	tests = id( "qunit-tests" );
	if ( tests && config.hidepassed ) {
		addClass( tests, "hidepass" );
	}
} );

QUnit.done( function( details ) {
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

	if ( config.altertitle && document.title ) {

		// Show ✖ for good, ✔ for bad suite result in title
		// use escape sequences in case file gets loaded with non-utf-8-charset
		document.title = [
			( details.failed ? "\u2716" : "\u2714" ),
			document.title.replace( /^[\u2714\u2716] /i, "" )
		].join( " " );
	}

	// Clear own sessionStorage items if all tests passed
	if ( config.reorder && defined.sessionStorage && details.failed === 0 ) {
		for ( i = 0; i < sessionStorage.length; i++ ) {
			key = sessionStorage.key( i++ );
			if ( key.indexOf( "qunit-test-" ) === 0 ) {
				sessionStorage.removeItem( key );
			}
		}
	}

	// Scroll back to top to show results
	if ( config.scrolltop && window.scrollTo ) {
		window.scrollTo( 0, 0 );
	}
} );

function getNameHtml( name, module ) {
	var nameHtml = "";

	if ( module ) {
		nameHtml = "<span class='module-name'>" + escapeText( module ) + "</span>: ";
	}

	nameHtml += "<span class='test-name'>" + escapeText( name ) + "</span>";

	return nameHtml;
}

QUnit.testStart( function( details ) {
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

} );

function stripHtml( string ) {

	// Strip tags, html entity and whitespaces
	return string.replace( /<\/?[^>]+(>|$)/g, "" ).replace( /\&quot;/g, "" ).replace( /\s+/g, "" );
}

QUnit.log( function( details ) {
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

	// The pushFailure doesn't provide details.expected
	// when it calls, it's implicit to also not show expected and diff stuff
	// Also, we need to check details.expected existence, as it can exist and be undefined
	if ( !details.result && hasOwn.call( details, "expected" ) ) {
		if ( details.negative ) {
			expected = "NOT " + QUnit.dump.parse( details.expected );
		} else {
			expected = QUnit.dump.parse( details.expected );
		}

		actual = QUnit.dump.parse( details.actual );
		message += "<table><tr class='test-expected'><th>Expected: </th><td><pre>" +
			escapeText( expected ) +
			"</pre></td></tr>";

		if ( actual !== expected ) {

			message += "<tr class='test-actual'><th>Result: </th><td><pre>" +
				escapeText( actual ) + "</pre></td></tr>";

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
		} else {
			message += "<tr class='test-message'><th>Message: </th><td>" +
				"Diff suppressed as the expected and actual results have an equivalent" +
				" serialization</td></tr>";
		}

		if ( details.source ) {
			message += "<tr class='test-source'><th>Source: </th><td><pre>" +
				escapeText( details.source ) + "</pre></td></tr>";
		}

		message += "</table>";

	// This occurs when pushFailure is set and we have an extracted stack trace
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
} );

QUnit.testDone( function( details ) {
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

	// Store result when possible
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

	// The testItem.firstChild is the test name
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
		} );

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
		} );
		testItem.appendChild( sourceName );
	}
} );

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
				html[ x ] = "<ins>" + escapeText( data ) + "</ins>";
				break;
			case DIFF_DELETE:
				html[ x ] = "<del>" + escapeText( data ) + "</del>";
				break;
			case DIFF_EQUAL:
				html[ x ] = "<span>" + escapeText( data ) + "</span>";
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
		lineArray = []; // E.g. lineArray[4] === 'Hello\n'
		lineHash = {};  // E.g. lineHash['Hello\n'] === 4

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

}() );

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcXVuaXRqcy9xdW5pdC9xdW5pdC5qcyIsInB1YmxpYy9qcy9zcmMvY29tcG9uZW50cy9zZWFyY2guanMiLCJwdWJsaWMvanMvdGVzdC9jb21wb25lbnRzL3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7QUM5dUlBLElBQU0sa0JBQWtCLFNBQVMsZUFBVCxHQUEyQjs7QUFFL0MsV0FBTztBQUNILGdCQURHLHNCQUNPO0FBQ047QUFRSCxTQVZFO0FBWUgsWUFaRyxrQkFZRztBQUNGLGdCQUFNLE9BQU8sU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWI7QUFDQSxpQkFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixNQUFuQjtBQUNBLGlCQUFLLFNBQUwsR0FBaUIsS0FBSyxRQUFMLEVBQWpCOztBQUVBLGlCQUFLLFFBQUwsR0FBZ0IsU0FBUyxzQkFBVCxFQUFoQjtBQUNBLGlCQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTBCLElBQTFCOztBQUVBLGdCQUFNLFNBQVMsS0FBSyxRQUFMLENBQWMsYUFBZCxDQUE0QixvQkFBNUIsQ0FBZjtBQUNBLGdCQUFNLGNBQWMsS0FBSyxRQUFMLENBQWMsYUFBZCxDQUE0QixvQkFBNUIsQ0FBcEI7O0FBRUEsbUJBQU8sZ0JBQVAsQ0FBd0IsT0FBeEIsRUFBaUMsYUFBSzs7QUFFbEMsdUJBQU8sT0FBUCxDQUFlLEdBQWYsQ0FBbUIsQ0FBbkIsRUFBc0IsWUFBWSxLQUFsQztBQUNILGFBSEQ7QUFJQSxtQkFBTyxJQUFQO0FBQ0gsU0E1QkU7QUE4QkgsY0E5Qkcsa0JBOEJJLFNBOUJKLEVBOEJjO0FBQ2IsZ0JBQUcsS0FBSyxRQUFMLElBQWlCLHFCQUFxQixXQUF6QyxFQUFxRDtBQUNqRCwwQkFBVSxXQUFWLENBQXNCLEtBQUssUUFBTCxDQUFjLGFBQWQsQ0FBNEIsV0FBNUIsQ0FBdEI7QUFDSDtBQUNELG1CQUFPLElBQVA7QUFDSDtBQW5DRSxLQUFQO0FBcUNILENBdkNEOztrQkF5Q2UsZTs7Ozs7OztBQ3pDZjs7OztBQUNBOzs7Ozs7QUFFQSxrQkFBTSxNQUFOLENBQWEsS0FBYjs7QUFFQSxrQkFBTSxJQUFOLENBQVcsU0FBWCxFQUFzQixrQkFBVTtBQUM1QixXQUFPLEtBQVAsb0ZBQXNDLFVBQXRDLEVBQWtELHdDQUFsRDtBQUNBLFdBQU8sS0FBUCxTQUFxQix1QkFBckIsR0FBd0MsUUFBeEMsRUFBa0QseUNBQWxEO0FBQ0EsV0FBTyxZQUFQLENBQW9CLHVCQUFwQixFQUF1Qyx1QkFBdkMsRUFBMEQsMkNBQTFEO0FBQ0gsQ0FKRDs7QUFNQSxrQkFBTSxJQUFOLENBQVcsV0FBWCxFQUF3QixrQkFBVTtBQUM5QixRQUFJLFlBQVksdUJBQWhCO0FBQ0EsV0FBTyxLQUFQLFNBQXFCLFVBQVUsSUFBL0IsR0FBcUMsVUFBckMsRUFBaUQsc0NBQWpEO0FBQ0EsV0FBTyxLQUFQLFNBQXFCLFVBQVUsTUFBL0IsR0FBdUMsVUFBdkMsRUFBbUQsdUNBQW5EO0FBQ0gsQ0FKRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiFcbiAqIFFVbml0IDEuMjMuMVxuICogaHR0cHM6Ly9xdW5pdGpzLmNvbS9cbiAqXG4gKiBDb3B5cmlnaHQgalF1ZXJ5IEZvdW5kYXRpb24gYW5kIG90aGVyIGNvbnRyaWJ1dG9yc1xuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL2pxdWVyeS5vcmcvbGljZW5zZVxuICpcbiAqIERhdGU6IDIwMTYtMDQtMTJUMTc6MjlaXG4gKi9cblxuKCBmdW5jdGlvbiggZ2xvYmFsICkge1xuXG52YXIgUVVuaXQgPSB7fTtcblxudmFyIERhdGUgPSBnbG9iYWwuRGF0ZTtcbnZhciBub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufTtcblxudmFyIHNldFRpbWVvdXQgPSBnbG9iYWwuc2V0VGltZW91dDtcbnZhciBjbGVhclRpbWVvdXQgPSBnbG9iYWwuY2xlYXJUaW1lb3V0O1xuXG4vLyBTdG9yZSBhIGxvY2FsIHdpbmRvdyBmcm9tIHRoZSBnbG9iYWwgdG8gYWxsb3cgZGlyZWN0IHJlZmVyZW5jZXMuXG52YXIgd2luZG93ID0gZ2xvYmFsLndpbmRvdztcblxudmFyIGRlZmluZWQgPSB7XG5cdGRvY3VtZW50OiB3aW5kb3cgJiYgd2luZG93LmRvY3VtZW50ICE9PSB1bmRlZmluZWQsXG5cdHNldFRpbWVvdXQ6IHNldFRpbWVvdXQgIT09IHVuZGVmaW5lZCxcblx0c2Vzc2lvblN0b3JhZ2U6ICggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHggPSBcInF1bml0LXRlc3Qtc3RyaW5nXCI7XG5cdFx0dHJ5IHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oIHgsIHggKTtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIHggKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fSgpIClcbn07XG5cbnZhciBmaWxlTmFtZSA9ICggc291cmNlRnJvbVN0YWNrdHJhY2UoIDAgKSB8fCBcIlwiICkucmVwbGFjZSggLyg6XFxkKykrXFwpPy8sIFwiXCIgKS5yZXBsYWNlKCAvLitcXC8vLCBcIlwiICk7XG52YXIgZ2xvYmFsU3RhcnRDYWxsZWQgPSBmYWxzZTtcbnZhciBydW5TdGFydGVkID0gZmFsc2U7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIFJldHVybnMgYSBuZXcgQXJyYXkgd2l0aCB0aGUgZWxlbWVudHMgdGhhdCBhcmUgaW4gYSBidXQgbm90IGluIGJcbmZ1bmN0aW9uIGRpZmYoIGEsIGIgKSB7XG5cdHZhciBpLCBqLFxuXHRcdHJlc3VsdCA9IGEuc2xpY2UoKTtcblxuXHRmb3IgKCBpID0gMDsgaSA8IHJlc3VsdC5sZW5ndGg7IGkrKyApIHtcblx0XHRmb3IgKCBqID0gMDsgaiA8IGIubGVuZ3RoOyBqKysgKSB7XG5cdFx0XHRpZiAoIHJlc3VsdFsgaSBdID09PSBiWyBqIF0gKSB7XG5cdFx0XHRcdHJlc3VsdC5zcGxpY2UoIGksIDEgKTtcblx0XHRcdFx0aS0tO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gRnJvbSBqcXVlcnkuanNcbmZ1bmN0aW9uIGluQXJyYXkoIGVsZW0sIGFycmF5ICkge1xuXHRpZiAoIGFycmF5LmluZGV4T2YgKSB7XG5cdFx0cmV0dXJuIGFycmF5LmluZGV4T2YoIGVsZW0gKTtcblx0fVxuXG5cdGZvciAoIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0aWYgKCBhcnJheVsgaSBdID09PSBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIE1ha2VzIGEgY2xvbmUgb2YgYW4gb2JqZWN0IHVzaW5nIG9ubHkgQXJyYXkgb3IgT2JqZWN0IGFzIGJhc2UsXG4gKiBhbmQgY29waWVzIG92ZXIgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fSBOZXcgb2JqZWN0IHdpdGggb25seSB0aGUgb3duIHByb3BlcnRpZXMgKHJlY3Vyc2l2ZWx5KS5cbiAqL1xuZnVuY3Rpb24gb2JqZWN0VmFsdWVzICggb2JqICkge1xuXHR2YXIga2V5LCB2YWwsXG5cdFx0dmFscyA9IFFVbml0LmlzKCBcImFycmF5XCIsIG9iaiApID8gW10gOiB7fTtcblx0Zm9yICgga2V5IGluIG9iaiApIHtcblx0XHRpZiAoIGhhc093bi5jYWxsKCBvYmosIGtleSApICkge1xuXHRcdFx0dmFsID0gb2JqWyBrZXkgXTtcblx0XHRcdHZhbHNbIGtleSBdID0gdmFsID09PSBPYmplY3QoIHZhbCApID8gb2JqZWN0VmFsdWVzKCB2YWwgKSA6IHZhbDtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHZhbHM7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZCggYSwgYiwgdW5kZWZPbmx5ICkge1xuXHRmb3IgKCB2YXIgcHJvcCBpbiBiICkge1xuXHRcdGlmICggaGFzT3duLmNhbGwoIGIsIHByb3AgKSApIHtcblxuXHRcdFx0Ly8gQXZvaWQgXCJNZW1iZXIgbm90IGZvdW5kXCIgZXJyb3IgaW4gSUU4IGNhdXNlZCBieSBtZXNzaW5nIHdpdGggd2luZG93LmNvbnN0cnVjdG9yXG5cdFx0XHQvLyBUaGlzIGJsb2NrIHJ1bnMgb24gZXZlcnkgZW52aXJvbm1lbnQsIHNvIGBnbG9iYWxgIGlzIGJlaW5nIHVzZWQgaW5zdGVhZCBvZiBgd2luZG93YFxuXHRcdFx0Ly8gdG8gYXZvaWQgZXJyb3JzIG9uIG5vZGUuXG5cdFx0XHRpZiAoIHByb3AgIT09IFwiY29uc3RydWN0b3JcIiB8fCBhICE9PSBnbG9iYWwgKSB7XG5cdFx0XHRcdGlmICggYlsgcHJvcCBdID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIGFbIHByb3AgXTtcblx0XHRcdFx0fSBlbHNlIGlmICggISggdW5kZWZPbmx5ICYmIHR5cGVvZiBhWyBwcm9wIF0gIT09IFwidW5kZWZpbmVkXCIgKSApIHtcblx0XHRcdFx0XHRhWyBwcm9wIF0gPSBiWyBwcm9wIF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gYTtcbn1cblxuZnVuY3Rpb24gb2JqZWN0VHlwZSggb2JqICkge1xuXHRpZiAoIHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0cmV0dXJuIFwidW5kZWZpbmVkXCI7XG5cdH1cblxuXHQvLyBDb25zaWRlcjogdHlwZW9mIG51bGwgPT09IG9iamVjdFxuXHRpZiAoIG9iaiA9PT0gbnVsbCApIHtcblx0XHRyZXR1cm4gXCJudWxsXCI7XG5cdH1cblxuXHR2YXIgbWF0Y2ggPSB0b1N0cmluZy5jYWxsKCBvYmogKS5tYXRjaCggL15cXFtvYmplY3RcXHMoLiopXFxdJC8gKSxcblx0XHR0eXBlID0gbWF0Y2ggJiYgbWF0Y2hbIDEgXTtcblxuXHRzd2l0Y2ggKCB0eXBlICkge1xuXHRcdGNhc2UgXCJOdW1iZXJcIjpcblx0XHRcdGlmICggaXNOYU4oIG9iaiApICkge1xuXHRcdFx0XHRyZXR1cm4gXCJuYW5cIjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBcIm51bWJlclwiO1xuXHRcdGNhc2UgXCJTdHJpbmdcIjpcblx0XHRjYXNlIFwiQm9vbGVhblwiOlxuXHRcdGNhc2UgXCJBcnJheVwiOlxuXHRcdGNhc2UgXCJTZXRcIjpcblx0XHRjYXNlIFwiTWFwXCI6XG5cdFx0Y2FzZSBcIkRhdGVcIjpcblx0XHRjYXNlIFwiUmVnRXhwXCI6XG5cdFx0Y2FzZSBcIkZ1bmN0aW9uXCI6XG5cdFx0Y2FzZSBcIlN5bWJvbFwiOlxuXHRcdFx0cmV0dXJuIHR5cGUudG9Mb3dlckNhc2UoKTtcblx0fVxuXHRpZiAoIHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0cmV0dXJuIFwib2JqZWN0XCI7XG5cdH1cbn1cblxuLy8gU2FmZSBvYmplY3QgdHlwZSBjaGVja2luZ1xuZnVuY3Rpb24gaXMoIHR5cGUsIG9iaiApIHtcblx0cmV0dXJuIFFVbml0Lm9iamVjdFR5cGUoIG9iaiApID09PSB0eXBlO1xufVxuXG4vLyBEb2Vzbid0IHN1cHBvcnQgSUU2IHRvIElFOSwgaXQgd2lsbCByZXR1cm4gdW5kZWZpbmVkIG9uIHRoZXNlIGJyb3dzZXJzXG4vLyBTZWUgYWxzbyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvci9TdGFja1xuZnVuY3Rpb24gZXh0cmFjdFN0YWNrdHJhY2UoIGUsIG9mZnNldCApIHtcblx0b2Zmc2V0ID0gb2Zmc2V0ID09PSB1bmRlZmluZWQgPyA0IDogb2Zmc2V0O1xuXG5cdHZhciBzdGFjaywgaW5jbHVkZSwgaTtcblxuXHRpZiAoIGUuc3RhY2sgKSB7XG5cdFx0c3RhY2sgPSBlLnN0YWNrLnNwbGl0KCBcIlxcblwiICk7XG5cdFx0aWYgKCAvXmVycm9yJC9pLnRlc3QoIHN0YWNrWyAwIF0gKSApIHtcblx0XHRcdHN0YWNrLnNoaWZ0KCk7XG5cdFx0fVxuXHRcdGlmICggZmlsZU5hbWUgKSB7XG5cdFx0XHRpbmNsdWRlID0gW107XG5cdFx0XHRmb3IgKCBpID0gb2Zmc2V0OyBpIDwgc3RhY2subGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdGlmICggc3RhY2tbIGkgXS5pbmRleE9mKCBmaWxlTmFtZSApICE9PSAtMSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0XHRpbmNsdWRlLnB1c2goIHN0YWNrWyBpIF0gKTtcblx0XHRcdH1cblx0XHRcdGlmICggaW5jbHVkZS5sZW5ndGggKSB7XG5cdFx0XHRcdHJldHVybiBpbmNsdWRlLmpvaW4oIFwiXFxuXCIgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHN0YWNrWyBvZmZzZXQgXTtcblxuXHQvLyBTdXBwb3J0OiBTYWZhcmkgPD02IG9ubHlcblx0fSBlbHNlIGlmICggZS5zb3VyY2VVUkwgKSB7XG5cblx0XHQvLyBFeGNsdWRlIHVzZWxlc3Mgc2VsZi1yZWZlcmVuY2UgZm9yIGdlbmVyYXRlZCBFcnJvciBvYmplY3RzXG5cdFx0aWYgKCAvcXVuaXQuanMkLy50ZXN0KCBlLnNvdXJjZVVSTCApICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIEZvciBhY3R1YWwgZXhjZXB0aW9ucywgdGhpcyBpcyB1c2VmdWxcblx0XHRyZXR1cm4gZS5zb3VyY2VVUkwgKyBcIjpcIiArIGUubGluZTtcblx0fVxufVxuXG5mdW5jdGlvbiBzb3VyY2VGcm9tU3RhY2t0cmFjZSggb2Zmc2V0ICkge1xuXHR2YXIgZXJyb3IgPSBuZXcgRXJyb3IoKTtcblxuXHQvLyBTdXBwb3J0OiBTYWZhcmkgPD03IG9ubHksIElFIDw9MTAgLSAxMSBvbmx5XG5cdC8vIE5vdCBhbGwgYnJvd3NlcnMgZ2VuZXJhdGUgdGhlIGBzdGFja2AgcHJvcGVydHkgZm9yIGBuZXcgRXJyb3IoKWAsIHNlZSBhbHNvICM2MzZcblx0aWYgKCAhZXJyb3Iuc3RhY2sgKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH0gY2F0Y2ggKCBlcnIgKSB7XG5cdFx0XHRlcnJvciA9IGVycjtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZXh0cmFjdFN0YWNrdHJhY2UoIGVycm9yLCBvZmZzZXQgKTtcbn1cblxuLyoqXG4gKiBDb25maWcgb2JqZWN0OiBNYWludGFpbiBpbnRlcm5hbCBzdGF0ZVxuICogTGF0ZXIgZXhwb3NlZCBhcyBRVW5pdC5jb25maWdcbiAqIGBjb25maWdgIGluaXRpYWxpemVkIGF0IHRvcCBvZiBzY29wZVxuICovXG52YXIgY29uZmlnID0ge1xuXG5cdC8vIFRoZSBxdWV1ZSBvZiB0ZXN0cyB0byBydW5cblx0cXVldWU6IFtdLFxuXG5cdC8vIEJsb2NrIHVudGlsIGRvY3VtZW50IHJlYWR5XG5cdGJsb2NraW5nOiB0cnVlLFxuXG5cdC8vIEJ5IGRlZmF1bHQsIHJ1biBwcmV2aW91c2x5IGZhaWxlZCB0ZXN0cyBmaXJzdFxuXHQvLyB2ZXJ5IHVzZWZ1bCBpbiBjb21iaW5hdGlvbiB3aXRoIFwiSGlkZSBwYXNzZWQgdGVzdHNcIiBjaGVja2VkXG5cdHJlb3JkZXI6IHRydWUsXG5cblx0Ly8gQnkgZGVmYXVsdCwgbW9kaWZ5IGRvY3VtZW50LnRpdGxlIHdoZW4gc3VpdGUgaXMgZG9uZVxuXHRhbHRlcnRpdGxlOiB0cnVlLFxuXG5cdC8vIEhUTUwgUmVwb3J0ZXI6IGNvbGxhcHNlIGV2ZXJ5IHRlc3QgZXhjZXB0IHRoZSBmaXJzdCBmYWlsaW5nIHRlc3Rcblx0Ly8gSWYgZmFsc2UsIGFsbCBmYWlsaW5nIHRlc3RzIHdpbGwgYmUgZXhwYW5kZWRcblx0Y29sbGFwc2U6IHRydWUsXG5cblx0Ly8gQnkgZGVmYXVsdCwgc2Nyb2xsIHRvIHRvcCBvZiB0aGUgcGFnZSB3aGVuIHN1aXRlIGlzIGRvbmVcblx0c2Nyb2xsdG9wOiB0cnVlLFxuXG5cdC8vIERlcHRoIHVwLXRvIHdoaWNoIG9iamVjdCB3aWxsIGJlIGR1bXBlZFxuXHRtYXhEZXB0aDogNSxcblxuXHQvLyBXaGVuIGVuYWJsZWQsIGFsbCB0ZXN0cyBtdXN0IGNhbGwgZXhwZWN0KClcblx0cmVxdWlyZUV4cGVjdHM6IGZhbHNlLFxuXG5cdC8vIFBsYWNlaG9sZGVyIGZvciB1c2VyLWNvbmZpZ3VyYWJsZSBmb3JtLWV4cG9zZWQgVVJMIHBhcmFtZXRlcnNcblx0dXJsQ29uZmlnOiBbXSxcblxuXHQvLyBTZXQgb2YgYWxsIG1vZHVsZXMuXG5cdG1vZHVsZXM6IFtdLFxuXG5cdC8vIFN0YWNrIG9mIG5lc3RlZCBtb2R1bGVzXG5cdG1vZHVsZVN0YWNrOiBbXSxcblxuXHQvLyBUaGUgZmlyc3QgdW5uYW1lZCBtb2R1bGVcblx0Y3VycmVudE1vZHVsZToge1xuXHRcdG5hbWU6IFwiXCIsXG5cdFx0dGVzdHM6IFtdXG5cdH0sXG5cblx0Y2FsbGJhY2tzOiB7fVxufTtcblxuLy8gUHVzaCBhIGxvb3NlIHVubmFtZWQgbW9kdWxlIHRvIHRoZSBtb2R1bGVzIGNvbGxlY3Rpb25cbmNvbmZpZy5tb2R1bGVzLnB1c2goIGNvbmZpZy5jdXJyZW50TW9kdWxlICk7XG5cbnZhciBsb2dnaW5nQ2FsbGJhY2tzID0ge307XG5cbi8vIFJlZ2lzdGVyIGxvZ2dpbmcgY2FsbGJhY2tzXG5mdW5jdGlvbiByZWdpc3RlckxvZ2dpbmdDYWxsYmFja3MoIG9iaiApIHtcblx0dmFyIGksIGwsIGtleSxcblx0XHRjYWxsYmFja05hbWVzID0gWyBcImJlZ2luXCIsIFwiZG9uZVwiLCBcImxvZ1wiLCBcInRlc3RTdGFydFwiLCBcInRlc3REb25lXCIsXG5cdFx0XHRcIm1vZHVsZVN0YXJ0XCIsIFwibW9kdWxlRG9uZVwiIF07XG5cblx0ZnVuY3Rpb24gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2soIGtleSApIHtcblx0XHR2YXIgbG9nZ2luZ0NhbGxiYWNrID0gZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuXHRcdFx0aWYgKCBvYmplY3RUeXBlKCBjYWxsYmFjayApICE9PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0XHRcIlFVbml0IGxvZ2dpbmcgbWV0aG9kcyByZXF1aXJlIGEgY2FsbGJhY2sgZnVuY3Rpb24gYXMgdGhlaXIgZmlyc3QgcGFyYW1ldGVycy5cIlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25maWcuY2FsbGJhY2tzWyBrZXkgXS5wdXNoKCBjYWxsYmFjayApO1xuXHRcdH07XG5cblx0XHQvLyBERVBSRUNBVEVEOiBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBvbiBRVW5pdCAyLjAuMCtcblx0XHQvLyBTdG9yZXMgdGhlIHJlZ2lzdGVyZWQgZnVuY3Rpb25zIGFsbG93aW5nIHJlc3RvcmluZ1xuXHRcdC8vIGF0IHZlcmlmeUxvZ2dpbmdDYWxsYmFja3MoKSBpZiBtb2RpZmllZFxuXHRcdGxvZ2dpbmdDYWxsYmFja3NbIGtleSBdID0gbG9nZ2luZ0NhbGxiYWNrO1xuXG5cdFx0cmV0dXJuIGxvZ2dpbmdDYWxsYmFjaztcblx0fVxuXG5cdGZvciAoIGkgPSAwLCBsID0gY2FsbGJhY2tOYW1lcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0a2V5ID0gY2FsbGJhY2tOYW1lc1sgaSBdO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSBrZXkgY29sbGVjdGlvbiBvZiBsb2dnaW5nIGNhbGxiYWNrXG5cdFx0aWYgKCBvYmplY3RUeXBlKCBjb25maWcuY2FsbGJhY2tzWyBrZXkgXSApID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0Y29uZmlnLmNhbGxiYWNrc1sga2V5IF0gPSBbXTtcblx0XHR9XG5cblx0XHRvYmpbIGtleSBdID0gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2soIGtleSApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJ1bkxvZ2dpbmdDYWxsYmFja3MoIGtleSwgYXJncyApIHtcblx0dmFyIGksIGwsIGNhbGxiYWNrcztcblxuXHRjYWxsYmFja3MgPSBjb25maWcuY2FsbGJhY2tzWyBrZXkgXTtcblx0Zm9yICggaSA9IDAsIGwgPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdGNhbGxiYWNrc1sgaSBdKCBhcmdzICk7XG5cdH1cbn1cblxuLy8gREVQUkVDQVRFRDogVGhpcyB3aWxsIGJlIHJlbW92ZWQgb24gMi4wLjArXG4vLyBUaGlzIGZ1bmN0aW9uIHZlcmlmaWVzIGlmIHRoZSBsb2dnaW5nQ2FsbGJhY2tzIHdlcmUgbW9kaWZpZWQgYnkgdGhlIHVzZXJcbi8vIElmIHNvLCBpdCB3aWxsIHJlc3RvcmUgaXQsIGFzc2lnbiB0aGUgZ2l2ZW4gY2FsbGJhY2sgYW5kIHByaW50IGEgY29uc29sZSB3YXJuaW5nXG5mdW5jdGlvbiB2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCkge1xuXHR2YXIgbG9nZ2luZ0NhbGxiYWNrLCB1c2VyQ2FsbGJhY2s7XG5cblx0Zm9yICggbG9nZ2luZ0NhbGxiYWNrIGluIGxvZ2dpbmdDYWxsYmFja3MgKSB7XG5cdFx0aWYgKCBRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0gIT09IGxvZ2dpbmdDYWxsYmFja3NbIGxvZ2dpbmdDYWxsYmFjayBdICkge1xuXG5cdFx0XHR1c2VyQ2FsbGJhY2sgPSBRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF07XG5cblx0XHRcdC8vIFJlc3RvcmUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdFx0XHRRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0gPSBsb2dnaW5nQ2FsbGJhY2tzWyBsb2dnaW5nQ2FsbGJhY2sgXTtcblxuXHRcdFx0Ly8gQXNzaWduIHRoZSBkZXByZWNhdGVkIGdpdmVuIGNhbGxiYWNrXG5cdFx0XHRRVW5pdFsgbG9nZ2luZ0NhbGxiYWNrIF0oIHVzZXJDYWxsYmFjayApO1xuXG5cdFx0XHRpZiAoIGdsb2JhbC5jb25zb2xlICYmIGdsb2JhbC5jb25zb2xlLndhcm4gKSB7XG5cdFx0XHRcdGdsb2JhbC5jb25zb2xlLndhcm4oXG5cdFx0XHRcdFx0XCJRVW5pdC5cIiArIGxvZ2dpbmdDYWxsYmFjayArIFwiIHdhcyByZXBsYWNlZCB3aXRoIGEgbmV3IHZhbHVlLlxcblwiICtcblx0XHRcdFx0XHRcIlBsZWFzZSwgY2hlY2sgb3V0IHRoZSBkb2N1bWVudGF0aW9uIG9uIGhvdyB0byBhcHBseSBsb2dnaW5nIGNhbGxiYWNrcy5cXG5cIiArXG5cdFx0XHRcdFx0XCJSZWZlcmVuY2U6IGh0dHBzOi8vYXBpLnF1bml0anMuY29tL2NhdGVnb3J5L2NhbGxiYWNrcy9cIlxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4oIGZ1bmN0aW9uKCkge1xuXHRpZiAoICFkZWZpbmVkLmRvY3VtZW50ICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIGBvbkVycm9yRm5QcmV2YCBpbml0aWFsaXplZCBhdCB0b3Agb2Ygc2NvcGVcblx0Ly8gUHJlc2VydmUgb3RoZXIgaGFuZGxlcnNcblx0dmFyIG9uRXJyb3JGblByZXYgPSB3aW5kb3cub25lcnJvcjtcblxuXHQvLyBDb3ZlciB1bmNhdWdodCBleGNlcHRpb25zXG5cdC8vIFJldHVybmluZyB0cnVlIHdpbGwgc3VwcHJlc3MgdGhlIGRlZmF1bHQgYnJvd3NlciBoYW5kbGVyLFxuXHQvLyByZXR1cm5pbmcgZmFsc2Ugd2lsbCBsZXQgaXQgcnVuLlxuXHR3aW5kb3cub25lcnJvciA9IGZ1bmN0aW9uKCBlcnJvciwgZmlsZVBhdGgsIGxpbmVyTnIgKSB7XG5cdFx0dmFyIHJldCA9IGZhbHNlO1xuXHRcdGlmICggb25FcnJvckZuUHJldiApIHtcblx0XHRcdHJldCA9IG9uRXJyb3JGblByZXYoIGVycm9yLCBmaWxlUGF0aCwgbGluZXJOciApO1xuXHRcdH1cblxuXHRcdC8vIFRyZWF0IHJldHVybiB2YWx1ZSBhcyB3aW5kb3cub25lcnJvciBpdHNlbGYgZG9lcyxcblx0XHQvLyBPbmx5IGRvIG91ciBoYW5kbGluZyBpZiBub3Qgc3VwcHJlc3NlZC5cblx0XHRpZiAoIHJldCAhPT0gdHJ1ZSApIHtcblx0XHRcdGlmICggUVVuaXQuY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHRcdGlmICggUVVuaXQuY29uZmlnLmN1cnJlbnQuaWdub3JlR2xvYmFsRXJyb3JzICkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKCBlcnJvciwgZmlsZVBhdGggKyBcIjpcIiArIGxpbmVyTnIgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFFVbml0LnRlc3QoIFwiZ2xvYmFsIGZhaWx1cmVcIiwgZXh0ZW5kKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZSggZXJyb3IsIGZpbGVQYXRoICsgXCI6XCIgKyBsaW5lck5yICk7XG5cdFx0XHRcdH0sIHsgdmFsaWRUZXN0OiB0cnVlIH0gKSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXQ7XG5cdH07XG59KCkgKTtcblxuLy8gRmlndXJlIG91dCBpZiB3ZSdyZSBydW5uaW5nIHRoZSB0ZXN0cyBmcm9tIGEgc2VydmVyIG9yIG5vdFxuUVVuaXQuaXNMb2NhbCA9ICEoIGRlZmluZWQuZG9jdW1lbnQgJiYgd2luZG93LmxvY2F0aW9uLnByb3RvY29sICE9PSBcImZpbGU6XCIgKTtcblxuLy8gRXhwb3NlIHRoZSBjdXJyZW50IFFVbml0IHZlcnNpb25cblFVbml0LnZlcnNpb24gPSBcIjEuMjMuMVwiO1xuXG5leHRlbmQoIFFVbml0LCB7XG5cblx0Ly8gQ2FsbCBvbiBzdGFydCBvZiBtb2R1bGUgdGVzdCB0byBwcmVwZW5kIG5hbWUgdG8gYWxsIHRlc3RzXG5cdG1vZHVsZTogZnVuY3Rpb24oIG5hbWUsIHRlc3RFbnZpcm9ubWVudCwgZXhlY3V0ZU5vdyApIHtcblx0XHR2YXIgbW9kdWxlLCBtb2R1bGVGbnM7XG5cdFx0dmFyIGN1cnJlbnRNb2R1bGUgPSBjb25maWcuY3VycmVudE1vZHVsZTtcblxuXHRcdGlmICggYXJndW1lbnRzLmxlbmd0aCA9PT0gMiApIHtcblx0XHRcdGlmICggb2JqZWN0VHlwZSggdGVzdEVudmlyb25tZW50ICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0ZXhlY3V0ZU5vdyA9IHRlc3RFbnZpcm9ubWVudDtcblx0XHRcdFx0dGVzdEVudmlyb25tZW50ID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIERFUFJFQ0FURUQ6IGhhbmRsZXMgc2V0dXAvdGVhcmRvd24gZnVuY3Rpb25zLFxuXHRcdC8vIGJlZm9yZUVhY2ggYW5kIGFmdGVyRWFjaCBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkXG5cdFx0aWYgKCB0ZXN0RW52aXJvbm1lbnQgJiYgdGVzdEVudmlyb25tZW50LnNldHVwICkge1xuXHRcdFx0dGVzdEVudmlyb25tZW50LmJlZm9yZUVhY2ggPSB0ZXN0RW52aXJvbm1lbnQuc2V0dXA7XG5cdFx0XHRkZWxldGUgdGVzdEVudmlyb25tZW50LnNldHVwO1xuXHRcdH1cblx0XHRpZiAoIHRlc3RFbnZpcm9ubWVudCAmJiB0ZXN0RW52aXJvbm1lbnQudGVhcmRvd24gKSB7XG5cdFx0XHR0ZXN0RW52aXJvbm1lbnQuYWZ0ZXJFYWNoID0gdGVzdEVudmlyb25tZW50LnRlYXJkb3duO1xuXHRcdFx0ZGVsZXRlIHRlc3RFbnZpcm9ubWVudC50ZWFyZG93bjtcblx0XHR9XG5cblx0XHRtb2R1bGUgPSBjcmVhdGVNb2R1bGUoKTtcblxuXHRcdG1vZHVsZUZucyA9IHtcblx0XHRcdGJlZm9yZUVhY2g6IHNldEhvb2soIG1vZHVsZSwgXCJiZWZvcmVFYWNoXCIgKSxcblx0XHRcdGFmdGVyRWFjaDogc2V0SG9vayggbW9kdWxlLCBcImFmdGVyRWFjaFwiIClcblx0XHR9O1xuXG5cdFx0aWYgKCBvYmplY3RUeXBlKCBleGVjdXRlTm93ICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5wdXNoKCBtb2R1bGUgKTtcblx0XHRcdHNldEN1cnJlbnRNb2R1bGUoIG1vZHVsZSApO1xuXHRcdFx0ZXhlY3V0ZU5vdy5jYWxsKCBtb2R1bGUudGVzdEVudmlyb25tZW50LCBtb2R1bGVGbnMgKTtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5wb3AoKTtcblx0XHRcdG1vZHVsZSA9IG1vZHVsZS5wYXJlbnRNb2R1bGUgfHwgY3VycmVudE1vZHVsZTtcblx0XHR9XG5cblx0XHRzZXRDdXJyZW50TW9kdWxlKCBtb2R1bGUgKTtcblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZU1vZHVsZSgpIHtcblx0XHRcdHZhciBwYXJlbnRNb2R1bGUgPSBjb25maWcubW9kdWxlU3RhY2subGVuZ3RoID9cblx0XHRcdFx0Y29uZmlnLm1vZHVsZVN0YWNrLnNsaWNlKCAtMSApWyAwIF0gOiBudWxsO1xuXHRcdFx0dmFyIG1vZHVsZU5hbWUgPSBwYXJlbnRNb2R1bGUgIT09IG51bGwgP1xuXHRcdFx0XHRbIHBhcmVudE1vZHVsZS5uYW1lLCBuYW1lIF0uam9pbiggXCIgPiBcIiApIDogbmFtZTtcblx0XHRcdHZhciBtb2R1bGUgPSB7XG5cdFx0XHRcdG5hbWU6IG1vZHVsZU5hbWUsXG5cdFx0XHRcdHBhcmVudE1vZHVsZTogcGFyZW50TW9kdWxlLFxuXHRcdFx0XHR0ZXN0czogW10sXG5cdFx0XHRcdG1vZHVsZUlkOiBnZW5lcmF0ZUhhc2goIG1vZHVsZU5hbWUgKVxuXHRcdFx0fTtcblxuXHRcdFx0dmFyIGVudiA9IHt9O1xuXHRcdFx0aWYgKCBwYXJlbnRNb2R1bGUgKSB7XG5cdFx0XHRcdGV4dGVuZCggZW52LCBwYXJlbnRNb2R1bGUudGVzdEVudmlyb25tZW50ICk7XG5cdFx0XHRcdGRlbGV0ZSBlbnYuYmVmb3JlRWFjaDtcblx0XHRcdFx0ZGVsZXRlIGVudi5hZnRlckVhY2g7XG5cdFx0XHR9XG5cdFx0XHRleHRlbmQoIGVudiwgdGVzdEVudmlyb25tZW50ICk7XG5cdFx0XHRtb2R1bGUudGVzdEVudmlyb25tZW50ID0gZW52O1xuXG5cdFx0XHRjb25maWcubW9kdWxlcy5wdXNoKCBtb2R1bGUgKTtcblx0XHRcdHJldHVybiBtb2R1bGU7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0Q3VycmVudE1vZHVsZSggbW9kdWxlICkge1xuXHRcdFx0Y29uZmlnLmN1cnJlbnRNb2R1bGUgPSBtb2R1bGU7XG5cdFx0fVxuXG5cdH0sXG5cblx0Ly8gREVQUkVDQVRFRDogUVVuaXQuYXN5bmNUZXN0KCkgd2lsbCBiZSByZW1vdmVkIGluIFFVbml0IDIuMC5cblx0YXN5bmNUZXN0OiBhc3luY1Rlc3QsXG5cblx0dGVzdDogdGVzdCxcblxuXHRza2lwOiBza2lwLFxuXG5cdG9ubHk6IG9ubHksXG5cblx0Ly8gREVQUkVDQVRFRDogVGhlIGZ1bmN0aW9uYWxpdHkgb2YgUVVuaXQuc3RhcnQoKSB3aWxsIGJlIGFsdGVyZWQgaW4gUVVuaXQgMi4wLlxuXHQvLyBJbiBRVW5pdCAyLjAsIGludm9raW5nIGl0IHdpbGwgT05MWSBhZmZlY3QgdGhlIGBRVW5pdC5jb25maWcuYXV0b3N0YXJ0YCBibG9ja2luZyBiZWhhdmlvci5cblx0c3RhcnQ6IGZ1bmN0aW9uKCBjb3VudCApIHtcblx0XHR2YXIgZ2xvYmFsU3RhcnRBbHJlYWR5Q2FsbGVkID0gZ2xvYmFsU3RhcnRDYWxsZWQ7XG5cblx0XHRpZiAoICFjb25maWcuY3VycmVudCApIHtcblx0XHRcdGdsb2JhbFN0YXJ0Q2FsbGVkID0gdHJ1ZTtcblxuXHRcdFx0aWYgKCBydW5TdGFydGVkICkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiQ2FsbGVkIHN0YXJ0KCkgb3V0c2lkZSBvZiBhIHRlc3QgY29udGV4dCB3aGlsZSBhbHJlYWR5IHN0YXJ0ZWRcIiApO1xuXHRcdFx0fSBlbHNlIGlmICggZ2xvYmFsU3RhcnRBbHJlYWR5Q2FsbGVkIHx8IGNvdW50ID4gMSApIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIkNhbGxlZCBzdGFydCgpIG91dHNpZGUgb2YgYSB0ZXN0IGNvbnRleHQgdG9vIG1hbnkgdGltZXNcIiApO1xuXHRcdFx0fSBlbHNlIGlmICggY29uZmlnLmF1dG9zdGFydCApIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIkNhbGxlZCBzdGFydCgpIG91dHNpZGUgb2YgYSB0ZXN0IGNvbnRleHQgd2hlbiBcIiArXG5cdFx0XHRcdFx0XCJRVW5pdC5jb25maWcuYXV0b3N0YXJ0IHdhcyB0cnVlXCIgKTtcblx0XHRcdH0gZWxzZSBpZiAoICFjb25maWcucGFnZUxvYWRlZCApIHtcblxuXHRcdFx0XHQvLyBUaGUgcGFnZSBpc24ndCBjb21wbGV0ZWx5IGxvYWRlZCB5ZXQsIHNvIGJhaWwgb3V0IGFuZCBsZXQgYFFVbml0LmxvYWRgIGhhbmRsZSBpdFxuXHRcdFx0XHRjb25maWcuYXV0b3N0YXJ0ID0gdHJ1ZTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdC8vIElmIGEgdGVzdCBpcyBydW5uaW5nLCBhZGp1c3QgaXRzIHNlbWFwaG9yZVxuXHRcdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlIC09IGNvdW50IHx8IDE7XG5cblx0XHRcdC8vIElmIHNlbWFwaG9yZSBpcyBub24tbnVtZXJpYywgdGhyb3cgZXJyb3Jcblx0XHRcdGlmICggaXNOYU4oIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSApICkge1xuXHRcdFx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPSAwO1xuXG5cdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKFxuXHRcdFx0XHRcdFwiQ2FsbGVkIHN0YXJ0KCkgd2l0aCBhIG5vbi1udW1lcmljIGRlY3JlbWVudC5cIixcblx0XHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApXG5cdFx0XHRcdCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRG9uJ3Qgc3RhcnQgdW50aWwgZXF1YWwgbnVtYmVyIG9mIHN0b3AtY2FsbHNcblx0XHRcdGlmICggY29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID4gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUaHJvdyBhbiBFcnJvciBpZiBzdGFydCBpcyBjYWxsZWQgbW9yZSBvZnRlbiB0aGFuIHN0b3Bcblx0XHRcdGlmICggY29uZmlnLmN1cnJlbnQuc2VtYXBob3JlIDwgMCApIHtcblx0XHRcdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID0gMDtcblxuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZShcblx0XHRcdFx0XHRcIkNhbGxlZCBzdGFydCgpIHdoaWxlIGFscmVhZHkgc3RhcnRlZCAodGVzdCdzIHNlbWFwaG9yZSB3YXMgMCBhbHJlYWR5KVwiLFxuXHRcdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyIClcblx0XHRcdFx0KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJlc3VtZVByb2Nlc3NpbmcoKTtcblx0fSxcblxuXHQvLyBERVBSRUNBVEVEOiBRVW5pdC5zdG9wKCkgd2lsbCBiZSByZW1vdmVkIGluIFFVbml0IDIuMC5cblx0c3RvcDogZnVuY3Rpb24oIGNvdW50ICkge1xuXG5cdFx0Ly8gSWYgdGhlcmUgaXNuJ3QgYSB0ZXN0IHJ1bm5pbmcsIGRvbid0IGFsbG93IFFVbml0LnN0b3AoKSB0byBiZSBjYWxsZWRcblx0XHRpZiAoICFjb25maWcuY3VycmVudCApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RvcCgpIG91dHNpZGUgb2YgYSB0ZXN0IGNvbnRleHRcIiApO1xuXHRcdH1cblxuXHRcdC8vIElmIGEgdGVzdCBpcyBydW5uaW5nLCBhZGp1c3QgaXRzIHNlbWFwaG9yZVxuXHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSArPSBjb3VudCB8fCAxO1xuXG5cdFx0cGF1c2VQcm9jZXNzaW5nKCk7XG5cdH0sXG5cblx0Y29uZmlnOiBjb25maWcsXG5cblx0aXM6IGlzLFxuXG5cdG9iamVjdFR5cGU6IG9iamVjdFR5cGUsXG5cblx0ZXh0ZW5kOiBleHRlbmQsXG5cblx0bG9hZDogZnVuY3Rpb24oKSB7XG5cdFx0Y29uZmlnLnBhZ2VMb2FkZWQgPSB0cnVlO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0aGUgY29uZmlndXJhdGlvbiBvcHRpb25zXG5cdFx0ZXh0ZW5kKCBjb25maWcsIHtcblx0XHRcdHN0YXRzOiB7IGFsbDogMCwgYmFkOiAwIH0sXG5cdFx0XHRtb2R1bGVTdGF0czogeyBhbGw6IDAsIGJhZDogMCB9LFxuXHRcdFx0c3RhcnRlZDogMCxcblx0XHRcdHVwZGF0ZVJhdGU6IDEwMDAsXG5cdFx0XHRhdXRvc3RhcnQ6IHRydWUsXG5cdFx0XHRmaWx0ZXI6IFwiXCJcblx0XHR9LCB0cnVlICk7XG5cblx0XHRjb25maWcuYmxvY2tpbmcgPSBmYWxzZTtcblxuXHRcdGlmICggY29uZmlnLmF1dG9zdGFydCApIHtcblx0XHRcdHJlc3VtZVByb2Nlc3NpbmcoKTtcblx0XHR9XG5cdH0sXG5cblx0c3RhY2s6IGZ1bmN0aW9uKCBvZmZzZXQgKSB7XG5cdFx0b2Zmc2V0ID0gKCBvZmZzZXQgfHwgMCApICsgMjtcblx0XHRyZXR1cm4gc291cmNlRnJvbVN0YWNrdHJhY2UoIG9mZnNldCApO1xuXHR9XG59ICk7XG5cbnJlZ2lzdGVyTG9nZ2luZ0NhbGxiYWNrcyggUVVuaXQgKTtcblxuZnVuY3Rpb24gYmVnaW4oKSB7XG5cdHZhciBpLCBsLFxuXHRcdG1vZHVsZXNMb2cgPSBbXTtcblxuXHQvLyBJZiB0aGUgdGVzdCBydW4gaGFzbid0IG9mZmljaWFsbHkgYmVndW4geWV0XG5cdGlmICggIWNvbmZpZy5zdGFydGVkICkge1xuXG5cdFx0Ly8gUmVjb3JkIHRoZSB0aW1lIG9mIHRoZSB0ZXN0IHJ1bidzIGJlZ2lubmluZ1xuXHRcdGNvbmZpZy5zdGFydGVkID0gbm93KCk7XG5cblx0XHR2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCk7XG5cblx0XHQvLyBEZWxldGUgdGhlIGxvb3NlIHVubmFtZWQgbW9kdWxlIGlmIHVudXNlZC5cblx0XHRpZiAoIGNvbmZpZy5tb2R1bGVzWyAwIF0ubmFtZSA9PT0gXCJcIiAmJiBjb25maWcubW9kdWxlc1sgMCBdLnRlc3RzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdGNvbmZpZy5tb2R1bGVzLnNoaWZ0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gQXZvaWQgdW5uZWNlc3NhcnkgaW5mb3JtYXRpb24gYnkgbm90IGxvZ2dpbmcgbW9kdWxlcycgdGVzdCBlbnZpcm9ubWVudHNcblx0XHRmb3IgKCBpID0gMCwgbCA9IGNvbmZpZy5tb2R1bGVzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdG1vZHVsZXNMb2cucHVzaCgge1xuXHRcdFx0XHRuYW1lOiBjb25maWcubW9kdWxlc1sgaSBdLm5hbWUsXG5cdFx0XHRcdHRlc3RzOiBjb25maWcubW9kdWxlc1sgaSBdLnRlc3RzXG5cdFx0XHR9ICk7XG5cdFx0fVxuXG5cdFx0Ly8gVGhlIHRlc3QgcnVuIGlzIG9mZmljaWFsbHkgYmVnaW5uaW5nIG5vd1xuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwiYmVnaW5cIiwge1xuXHRcdFx0dG90YWxUZXN0czogVGVzdC5jb3VudCxcblx0XHRcdG1vZHVsZXM6IG1vZHVsZXNMb2dcblx0XHR9ICk7XG5cdH1cblxuXHRjb25maWcuYmxvY2tpbmcgPSBmYWxzZTtcblx0cHJvY2VzcyggdHJ1ZSApO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzKCBsYXN0ICkge1xuXHRmdW5jdGlvbiBuZXh0KCkge1xuXHRcdHByb2Nlc3MoIGxhc3QgKTtcblx0fVxuXHR2YXIgc3RhcnQgPSBub3coKTtcblx0Y29uZmlnLmRlcHRoID0gKCBjb25maWcuZGVwdGggfHwgMCApICsgMTtcblxuXHR3aGlsZSAoIGNvbmZpZy5xdWV1ZS5sZW5ndGggJiYgIWNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRpZiAoICFkZWZpbmVkLnNldFRpbWVvdXQgfHwgY29uZmlnLnVwZGF0ZVJhdGUgPD0gMCB8fFxuXHRcdFx0XHQoICggbm93KCkgLSBzdGFydCApIDwgY29uZmlnLnVwZGF0ZVJhdGUgKSApIHtcblx0XHRcdGlmICggY29uZmlnLmN1cnJlbnQgKSB7XG5cblx0XHRcdFx0Ly8gUmVzZXQgYXN5bmMgdHJhY2tpbmcgZm9yIGVhY2ggcGhhc2Ugb2YgdGhlIFRlc3QgbGlmZWN5Y2xlXG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnVzZWRBc3luYyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0Y29uZmlnLnF1ZXVlLnNoaWZ0KCkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2V0VGltZW91dCggbmV4dCwgMTMgKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXHRjb25maWcuZGVwdGgtLTtcblx0aWYgKCBsYXN0ICYmICFjb25maWcuYmxvY2tpbmcgJiYgIWNvbmZpZy5xdWV1ZS5sZW5ndGggJiYgY29uZmlnLmRlcHRoID09PSAwICkge1xuXHRcdGRvbmUoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXVzZVByb2Nlc3NpbmcoKSB7XG5cdGNvbmZpZy5ibG9ja2luZyA9IHRydWU7XG5cblx0aWYgKCBjb25maWcudGVzdFRpbWVvdXQgJiYgZGVmaW5lZC5zZXRUaW1lb3V0ICkge1xuXHRcdGNsZWFyVGltZW91dCggY29uZmlnLnRpbWVvdXQgKTtcblx0XHRjb25maWcudGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBjb25maWcuY3VycmVudCApIHtcblx0XHRcdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID0gMDtcblx0XHRcdFx0UVVuaXQucHVzaEZhaWx1cmUoIFwiVGVzdCB0aW1lZCBvdXRcIiwgc291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIlRlc3QgdGltZWQgb3V0XCIgKTtcblx0XHRcdH1cblx0XHRcdHJlc3VtZVByb2Nlc3NpbmcoKTtcblx0XHR9LCBjb25maWcudGVzdFRpbWVvdXQgKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZXN1bWVQcm9jZXNzaW5nKCkge1xuXHRydW5TdGFydGVkID0gdHJ1ZTtcblxuXHQvLyBBIHNsaWdodCBkZWxheSB0byBhbGxvdyB0aGlzIGl0ZXJhdGlvbiBvZiB0aGUgZXZlbnQgbG9vcCB0byBmaW5pc2ggKG1vcmUgYXNzZXJ0aW9ucywgZXRjLilcblx0aWYgKCBkZWZpbmVkLnNldFRpbWVvdXQgKSB7XG5cdFx0c2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50ICYmIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA+IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGlmICggY29uZmlnLnRpbWVvdXQgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCggY29uZmlnLnRpbWVvdXQgKTtcblx0XHRcdH1cblxuXHRcdFx0YmVnaW4oKTtcblx0XHR9LCAxMyApO1xuXHR9IGVsc2Uge1xuXHRcdGJlZ2luKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gZG9uZSgpIHtcblx0dmFyIHJ1bnRpbWUsIHBhc3NlZDtcblxuXHRjb25maWcuYXV0b3J1biA9IHRydWU7XG5cblx0Ly8gTG9nIHRoZSBsYXN0IG1vZHVsZSByZXN1bHRzXG5cdGlmICggY29uZmlnLnByZXZpb3VzTW9kdWxlICkge1xuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwibW9kdWxlRG9uZVwiLCB7XG5cdFx0XHRuYW1lOiBjb25maWcucHJldmlvdXNNb2R1bGUubmFtZSxcblx0XHRcdHRlc3RzOiBjb25maWcucHJldmlvdXNNb2R1bGUudGVzdHMsXG5cdFx0XHRmYWlsZWQ6IGNvbmZpZy5tb2R1bGVTdGF0cy5iYWQsXG5cdFx0XHRwYXNzZWQ6IGNvbmZpZy5tb2R1bGVTdGF0cy5hbGwgLSBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0dG90YWw6IGNvbmZpZy5tb2R1bGVTdGF0cy5hbGwsXG5cdFx0XHRydW50aW1lOiBub3coKSAtIGNvbmZpZy5tb2R1bGVTdGF0cy5zdGFydGVkXG5cdFx0fSApO1xuXHR9XG5cdGRlbGV0ZSBjb25maWcucHJldmlvdXNNb2R1bGU7XG5cblx0cnVudGltZSA9IG5vdygpIC0gY29uZmlnLnN0YXJ0ZWQ7XG5cdHBhc3NlZCA9IGNvbmZpZy5zdGF0cy5hbGwgLSBjb25maWcuc3RhdHMuYmFkO1xuXG5cdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwiZG9uZVwiLCB7XG5cdFx0ZmFpbGVkOiBjb25maWcuc3RhdHMuYmFkLFxuXHRcdHBhc3NlZDogcGFzc2VkLFxuXHRcdHRvdGFsOiBjb25maWcuc3RhdHMuYWxsLFxuXHRcdHJ1bnRpbWU6IHJ1bnRpbWVcblx0fSApO1xufVxuXG5mdW5jdGlvbiBzZXRIb29rKCBtb2R1bGUsIGhvb2tOYW1lICkge1xuXHRpZiAoIG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgPT09IHVuZGVmaW5lZCApIHtcblx0XHRtb2R1bGUudGVzdEVudmlyb25tZW50ID0ge307XG5cdH1cblxuXHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuXHRcdG1vZHVsZS50ZXN0RW52aXJvbm1lbnRbIGhvb2tOYW1lIF0gPSBjYWxsYmFjaztcblx0fTtcbn1cblxudmFyIGZvY3VzZWQgPSBmYWxzZTtcbnZhciBwcmlvcml0eUNvdW50ID0gMDtcbnZhciB1bml0U2FtcGxlcjtcblxuZnVuY3Rpb24gVGVzdCggc2V0dGluZ3MgKSB7XG5cdHZhciBpLCBsO1xuXG5cdCsrVGVzdC5jb3VudDtcblxuXHRleHRlbmQoIHRoaXMsIHNldHRpbmdzICk7XG5cdHRoaXMuYXNzZXJ0aW9ucyA9IFtdO1xuXHR0aGlzLnNlbWFwaG9yZSA9IDA7XG5cdHRoaXMudXNlZEFzeW5jID0gZmFsc2U7XG5cdHRoaXMubW9kdWxlID0gY29uZmlnLmN1cnJlbnRNb2R1bGU7XG5cdHRoaXMuc3RhY2sgPSBzb3VyY2VGcm9tU3RhY2t0cmFjZSggMyApO1xuXG5cdC8vIFJlZ2lzdGVyIHVuaXF1ZSBzdHJpbmdzXG5cdGZvciAoIGkgPSAwLCBsID0gdGhpcy5tb2R1bGUudGVzdHM7IGkgPCBsLmxlbmd0aDsgaSsrICkge1xuXHRcdGlmICggdGhpcy5tb2R1bGUudGVzdHNbIGkgXS5uYW1lID09PSB0aGlzLnRlc3ROYW1lICkge1xuXHRcdFx0dGhpcy50ZXN0TmFtZSArPSBcIiBcIjtcblx0XHR9XG5cdH1cblxuXHR0aGlzLnRlc3RJZCA9IGdlbmVyYXRlSGFzaCggdGhpcy5tb2R1bGUubmFtZSwgdGhpcy50ZXN0TmFtZSApO1xuXG5cdHRoaXMubW9kdWxlLnRlc3RzLnB1c2goIHtcblx0XHRuYW1lOiB0aGlzLnRlc3ROYW1lLFxuXHRcdHRlc3RJZDogdGhpcy50ZXN0SWRcblx0fSApO1xuXG5cdGlmICggc2V0dGluZ3Muc2tpcCApIHtcblxuXHRcdC8vIFNraXBwZWQgdGVzdHMgd2lsbCBmdWxseSBpZ25vcmUgYW55IHNlbnQgY2FsbGJhY2tcblx0XHR0aGlzLmNhbGxiYWNrID0gZnVuY3Rpb24oKSB7fTtcblx0XHR0aGlzLmFzeW5jID0gZmFsc2U7XG5cdFx0dGhpcy5leHBlY3RlZCA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5hc3NlcnQgPSBuZXcgQXNzZXJ0KCB0aGlzICk7XG5cdH1cbn1cblxuVGVzdC5jb3VudCA9IDA7XG5cblRlc3QucHJvdG90eXBlID0ge1xuXHRiZWZvcmU6IGZ1bmN0aW9uKCkge1xuXHRcdGlmIChcblxuXHRcdFx0Ly8gRW1pdCBtb2R1bGVTdGFydCB3aGVuIHdlJ3JlIHN3aXRjaGluZyBmcm9tIG9uZSBtb2R1bGUgdG8gYW5vdGhlclxuXHRcdFx0dGhpcy5tb2R1bGUgIT09IGNvbmZpZy5wcmV2aW91c01vZHVsZSB8fFxuXG5cdFx0XHRcdC8vIFRoZXkgY291bGQgYmUgZXF1YWwgKGJvdGggdW5kZWZpbmVkKSBidXQgaWYgdGhlIHByZXZpb3VzTW9kdWxlIHByb3BlcnR5IGRvZXNuJ3Rcblx0XHRcdFx0Ly8geWV0IGV4aXN0IGl0IG1lYW5zIHRoaXMgaXMgdGhlIGZpcnN0IHRlc3QgaW4gYSBzdWl0ZSB0aGF0IGlzbid0IHdyYXBwZWQgaW4gYVxuXHRcdFx0XHQvLyBtb2R1bGUsIGluIHdoaWNoIGNhc2Ugd2UnbGwganVzdCBlbWl0IGEgbW9kdWxlU3RhcnQgZXZlbnQgZm9yICd1bmRlZmluZWQnLlxuXHRcdFx0XHQvLyBXaXRob3V0IHRoaXMsIHJlcG9ydGVycyBjYW4gZ2V0IHRlc3RTdGFydCBiZWZvcmUgbW9kdWxlU3RhcnQgIHdoaWNoIGlzIGEgcHJvYmxlbS5cblx0XHRcdFx0IWhhc093bi5jYWxsKCBjb25maWcsIFwicHJldmlvdXNNb2R1bGVcIiApXG5cdFx0KSB7XG5cdFx0XHRpZiAoIGhhc093bi5jYWxsKCBjb25maWcsIFwicHJldmlvdXNNb2R1bGVcIiApICkge1xuXHRcdFx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZURvbmVcIiwge1xuXHRcdFx0XHRcdG5hbWU6IGNvbmZpZy5wcmV2aW91c01vZHVsZS5uYW1lLFxuXHRcdFx0XHRcdHRlc3RzOiBjb25maWcucHJldmlvdXNNb2R1bGUudGVzdHMsXG5cdFx0XHRcdFx0ZmFpbGVkOiBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0XHRcdHBhc3NlZDogY29uZmlnLm1vZHVsZVN0YXRzLmFsbCAtIGNvbmZpZy5tb2R1bGVTdGF0cy5iYWQsXG5cdFx0XHRcdFx0dG90YWw6IGNvbmZpZy5tb2R1bGVTdGF0cy5hbGwsXG5cdFx0XHRcdFx0cnVudGltZTogbm93KCkgLSBjb25maWcubW9kdWxlU3RhdHMuc3RhcnRlZFxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0XHRjb25maWcucHJldmlvdXNNb2R1bGUgPSB0aGlzLm1vZHVsZTtcblx0XHRcdGNvbmZpZy5tb2R1bGVTdGF0cyA9IHsgYWxsOiAwLCBiYWQ6IDAsIHN0YXJ0ZWQ6IG5vdygpIH07XG5cdFx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZVN0YXJ0XCIsIHtcblx0XHRcdFx0bmFtZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdFx0dGVzdHM6IHRoaXMubW9kdWxlLnRlc3RzXG5cdFx0XHR9ICk7XG5cdFx0fVxuXG5cdFx0Y29uZmlnLmN1cnJlbnQgPSB0aGlzO1xuXG5cdFx0aWYgKCB0aGlzLm1vZHVsZS50ZXN0RW52aXJvbm1lbnQgKSB7XG5cdFx0XHRkZWxldGUgdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50LmJlZm9yZUVhY2g7XG5cdFx0XHRkZWxldGUgdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50LmFmdGVyRWFjaDtcblx0XHR9XG5cdFx0dGhpcy50ZXN0RW52aXJvbm1lbnQgPSBleHRlbmQoIHt9LCB0aGlzLm1vZHVsZS50ZXN0RW52aXJvbm1lbnQgKTtcblxuXHRcdHRoaXMuc3RhcnRlZCA9IG5vdygpO1xuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwidGVzdFN0YXJ0XCIsIHtcblx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkXG5cdFx0fSApO1xuXG5cdFx0aWYgKCAhY29uZmlnLnBvbGx1dGlvbiApIHtcblx0XHRcdHNhdmVHbG9iYWwoKTtcblx0XHR9XG5cdH0sXG5cblx0cnVuOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcHJvbWlzZTtcblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblxuXHRcdGlmICggdGhpcy5hc3luYyApIHtcblx0XHRcdFFVbml0LnN0b3AoKTtcblx0XHR9XG5cblx0XHR0aGlzLmNhbGxiYWNrU3RhcnRlZCA9IG5vdygpO1xuXG5cdFx0aWYgKCBjb25maWcubm90cnljYXRjaCApIHtcblx0XHRcdHJ1blRlc3QoIHRoaXMgKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0cnVuVGVzdCggdGhpcyApO1xuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0dGhpcy5wdXNoRmFpbHVyZSggXCJEaWVkIG9uIHRlc3QgI1wiICsgKCB0aGlzLmFzc2VydGlvbnMubGVuZ3RoICsgMSApICsgXCIgXCIgK1xuXHRcdFx0XHR0aGlzLnN0YWNrICsgXCI6IFwiICsgKCBlLm1lc3NhZ2UgfHwgZSApLCBleHRyYWN0U3RhY2t0cmFjZSggZSwgMCApICk7XG5cblx0XHRcdC8vIEVsc2UgbmV4dCB0ZXN0IHdpbGwgY2FycnkgdGhlIHJlc3BvbnNpYmlsaXR5XG5cdFx0XHRzYXZlR2xvYmFsKCk7XG5cblx0XHRcdC8vIFJlc3RhcnQgdGhlIHRlc3RzIGlmIHRoZXkncmUgYmxvY2tpbmdcblx0XHRcdGlmICggY29uZmlnLmJsb2NraW5nICkge1xuXHRcdFx0XHRRVW5pdC5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJ1blRlc3QoIHRlc3QgKSB7XG5cdFx0XHRwcm9taXNlID0gdGVzdC5jYWxsYmFjay5jYWxsKCB0ZXN0LnRlc3RFbnZpcm9ubWVudCwgdGVzdC5hc3NlcnQgKTtcblx0XHRcdHRlc3QucmVzb2x2ZVByb21pc2UoIHByb21pc2UgKTtcblx0XHR9XG5cdH0sXG5cblx0YWZ0ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdGNoZWNrUG9sbHV0aW9uKCk7XG5cdH0sXG5cblx0cXVldWVIb29rOiBmdW5jdGlvbiggaG9vaywgaG9va05hbWUgKSB7XG5cdFx0dmFyIHByb21pc2UsXG5cdFx0XHR0ZXN0ID0gdGhpcztcblx0XHRyZXR1cm4gZnVuY3Rpb24gcnVuSG9vaygpIHtcblx0XHRcdGNvbmZpZy5jdXJyZW50ID0gdGVzdDtcblx0XHRcdGlmICggY29uZmlnLm5vdHJ5Y2F0Y2ggKSB7XG5cdFx0XHRcdGNhbGxIb29rKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNhbGxIb29rKCk7XG5cdFx0XHR9IGNhdGNoICggZXJyb3IgKSB7XG5cdFx0XHRcdHRlc3QucHVzaEZhaWx1cmUoIGhvb2tOYW1lICsgXCIgZmFpbGVkIG9uIFwiICsgdGVzdC50ZXN0TmFtZSArIFwiOiBcIiArXG5cdFx0XHRcdCggZXJyb3IubWVzc2FnZSB8fCBlcnJvciApLCBleHRyYWN0U3RhY2t0cmFjZSggZXJyb3IsIDAgKSApO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBjYWxsSG9vaygpIHtcblx0XHRcdFx0cHJvbWlzZSA9IGhvb2suY2FsbCggdGVzdC50ZXN0RW52aXJvbm1lbnQsIHRlc3QuYXNzZXJ0ICk7XG5cdFx0XHRcdHRlc3QucmVzb2x2ZVByb21pc2UoIHByb21pc2UsIGhvb2tOYW1lICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSxcblxuXHQvLyBDdXJyZW50bHkgb25seSB1c2VkIGZvciBtb2R1bGUgbGV2ZWwgaG9va3MsIGNhbiBiZSB1c2VkIHRvIGFkZCBnbG9iYWwgbGV2ZWwgb25lc1xuXHRob29rczogZnVuY3Rpb24oIGhhbmRsZXIgKSB7XG5cdFx0dmFyIGhvb2tzID0gW107XG5cblx0XHRmdW5jdGlvbiBwcm9jZXNzSG9va3MoIHRlc3QsIG1vZHVsZSApIHtcblx0XHRcdGlmICggbW9kdWxlLnBhcmVudE1vZHVsZSApIHtcblx0XHRcdFx0cHJvY2Vzc0hvb2tzKCB0ZXN0LCBtb2R1bGUucGFyZW50TW9kdWxlICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIG1vZHVsZS50ZXN0RW52aXJvbm1lbnQgJiZcblx0XHRcdFx0UVVuaXQub2JqZWN0VHlwZSggbW9kdWxlLnRlc3RFbnZpcm9ubWVudFsgaGFuZGxlciBdICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0aG9va3MucHVzaCggdGVzdC5xdWV1ZUhvb2soIG1vZHVsZS50ZXN0RW52aXJvbm1lbnRbIGhhbmRsZXIgXSwgaGFuZGxlciApICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSG9va3MgYXJlIGlnbm9yZWQgb24gc2tpcHBlZCB0ZXN0c1xuXHRcdGlmICggIXRoaXMuc2tpcCApIHtcblx0XHRcdHByb2Nlc3NIb29rcyggdGhpcywgdGhpcy5tb2R1bGUgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGhvb2tzO1xuXHR9LFxuXG5cdGZpbmlzaDogZnVuY3Rpb24oKSB7XG5cdFx0Y29uZmlnLmN1cnJlbnQgPSB0aGlzO1xuXHRcdGlmICggY29uZmlnLnJlcXVpcmVFeHBlY3RzICYmIHRoaXMuZXhwZWN0ZWQgPT09IG51bGwgKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIG51bWJlciBvZiBhc3NlcnRpb25zIHRvIGJlIGRlZmluZWQsIGJ1dCBleHBlY3QoKSB3YXMgXCIgK1xuXHRcdFx0XHRcIm5vdCBjYWxsZWQuXCIsIHRoaXMuc3RhY2sgKTtcblx0XHR9IGVsc2UgaWYgKCB0aGlzLmV4cGVjdGVkICE9PSBudWxsICYmIHRoaXMuZXhwZWN0ZWQgIT09IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIFwiICsgdGhpcy5leHBlY3RlZCArIFwiIGFzc2VydGlvbnMsIGJ1dCBcIiArXG5cdFx0XHRcdHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKyBcIiB3ZXJlIHJ1blwiLCB0aGlzLnN0YWNrICk7XG5cdFx0fSBlbHNlIGlmICggdGhpcy5leHBlY3RlZCA9PT0gbnVsbCAmJiAhdGhpcy5hc3NlcnRpb25zLmxlbmd0aCApIHtcblx0XHRcdHRoaXMucHVzaEZhaWx1cmUoIFwiRXhwZWN0ZWQgYXQgbGVhc3Qgb25lIGFzc2VydGlvbiwgYnV0IG5vbmUgd2VyZSBydW4gLSBjYWxsIFwiICtcblx0XHRcdFx0XCJleHBlY3QoMCkgdG8gYWNjZXB0IHplcm8gYXNzZXJ0aW9ucy5cIiwgdGhpcy5zdGFjayApO1xuXHRcdH1cblxuXHRcdHZhciBpLFxuXHRcdFx0YmFkID0gMDtcblxuXHRcdHRoaXMucnVudGltZSA9IG5vdygpIC0gdGhpcy5zdGFydGVkO1xuXHRcdGNvbmZpZy5zdGF0cy5hbGwgKz0gdGhpcy5hc3NlcnRpb25zLmxlbmd0aDtcblx0XHRjb25maWcubW9kdWxlU3RhdHMuYWxsICs9IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7XG5cblx0XHRmb3IgKCBpID0gMDsgaSA8IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdGlmICggIXRoaXMuYXNzZXJ0aW9uc1sgaSBdLnJlc3VsdCApIHtcblx0XHRcdFx0YmFkKys7XG5cdFx0XHRcdGNvbmZpZy5zdGF0cy5iYWQrKztcblx0XHRcdFx0Y29uZmlnLm1vZHVsZVN0YXRzLmJhZCsrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwidGVzdERvbmVcIiwge1xuXHRcdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHRcdG1vZHVsZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdHNraXBwZWQ6ICEhdGhpcy5za2lwLFxuXHRcdFx0ZmFpbGVkOiBiYWQsXG5cdFx0XHRwYXNzZWQ6IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggLSBiYWQsXG5cdFx0XHR0b3RhbDogdGhpcy5hc3NlcnRpb25zLmxlbmd0aCxcblx0XHRcdHJ1bnRpbWU6IHRoaXMucnVudGltZSxcblxuXHRcdFx0Ly8gSFRNTCBSZXBvcnRlciB1c2Vcblx0XHRcdGFzc2VydGlvbnM6IHRoaXMuYXNzZXJ0aW9ucyxcblx0XHRcdHRlc3RJZDogdGhpcy50ZXN0SWQsXG5cblx0XHRcdC8vIFNvdXJjZSBvZiBUZXN0XG5cdFx0XHRzb3VyY2U6IHRoaXMuc3RhY2ssXG5cblx0XHRcdC8vIERFUFJFQ0FURUQ6IHRoaXMgcHJvcGVydHkgd2lsbCBiZSByZW1vdmVkIGluIDIuMC4wLCB1c2UgcnVudGltZSBpbnN0ZWFkXG5cdFx0XHRkdXJhdGlvbjogdGhpcy5ydW50aW1lXG5cdFx0fSApO1xuXG5cdFx0Ly8gUVVuaXQucmVzZXQoKSBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlcGxhY2VkIGZvciBhIG5ld1xuXHRcdC8vIGZpeHR1cmUgcmVzZXQgZnVuY3Rpb24gb24gUVVuaXQgMi4wLzIuMS5cblx0XHQvLyBJdCdzIHN0aWxsIGNhbGxlZCBoZXJlIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBoYW5kbGluZ1xuXHRcdFFVbml0LnJlc2V0KCk7XG5cblx0XHRjb25maWcuY3VycmVudCA9IHVuZGVmaW5lZDtcblx0fSxcblxuXHRxdWV1ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHByaW9yaXR5LFxuXHRcdFx0dGVzdCA9IHRoaXM7XG5cblx0XHRpZiAoICF0aGlzLnZhbGlkKCkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcnVuKCkge1xuXG5cdFx0XHQvLyBFYWNoIG9mIHRoZXNlIGNhbiBieSBhc3luY1xuXHRcdFx0c3luY2hyb25pemUoIFtcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5iZWZvcmUoKTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHR0ZXN0Lmhvb2tzKCBcImJlZm9yZUVhY2hcIiApLFxuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0ZXN0LnJ1bigpO1xuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHRlc3QuaG9va3MoIFwiYWZ0ZXJFYWNoXCIgKS5yZXZlcnNlKCksXG5cblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5hZnRlcigpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0ZXN0LmZpbmlzaCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRdICk7XG5cdFx0fVxuXG5cdFx0Ly8gUHJpb3JpdGl6ZSBwcmV2aW91c2x5IGZhaWxlZCB0ZXN0cywgZGV0ZWN0ZWQgZnJvbSBzZXNzaW9uU3RvcmFnZVxuXHRcdHByaW9yaXR5ID0gUVVuaXQuY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSAmJlxuXHRcdFx0XHQrc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSggXCJxdW5pdC10ZXN0LVwiICsgdGhpcy5tb2R1bGUubmFtZSArIFwiLVwiICsgdGhpcy50ZXN0TmFtZSApO1xuXG5cdFx0cmV0dXJuIHN5bmNocm9uaXplKCBydW4sIHByaW9yaXR5LCBjb25maWcuc2VlZCApO1xuXHR9LFxuXG5cdHB1c2hSZXN1bHQ6IGZ1bmN0aW9uKCByZXN1bHRJbmZvICkge1xuXG5cdFx0Ly8gRGVzdHJ1Y3R1cmUgb2YgcmVzdWx0SW5mbyA9IHsgcmVzdWx0LCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBuZWdhdGl2ZSB9XG5cdFx0dmFyIHNvdXJjZSxcblx0XHRcdGRldGFpbHMgPSB7XG5cdFx0XHRcdG1vZHVsZTogdGhpcy5tb2R1bGUubmFtZSxcblx0XHRcdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHRcdFx0cmVzdWx0OiByZXN1bHRJbmZvLnJlc3VsdCxcblx0XHRcdFx0bWVzc2FnZTogcmVzdWx0SW5mby5tZXNzYWdlLFxuXHRcdFx0XHRhY3R1YWw6IHJlc3VsdEluZm8uYWN0dWFsLFxuXHRcdFx0XHRleHBlY3RlZDogcmVzdWx0SW5mby5leHBlY3RlZCxcblx0XHRcdFx0dGVzdElkOiB0aGlzLnRlc3RJZCxcblx0XHRcdFx0bmVnYXRpdmU6IHJlc3VsdEluZm8ubmVnYXRpdmUgfHwgZmFsc2UsXG5cdFx0XHRcdHJ1bnRpbWU6IG5vdygpIC0gdGhpcy5zdGFydGVkXG5cdFx0XHR9O1xuXG5cdFx0aWYgKCAhcmVzdWx0SW5mby5yZXN1bHQgKSB7XG5cdFx0XHRzb3VyY2UgPSBzb3VyY2VGcm9tU3RhY2t0cmFjZSgpO1xuXG5cdFx0XHRpZiAoIHNvdXJjZSApIHtcblx0XHRcdFx0ZGV0YWlscy5zb3VyY2UgPSBzb3VyY2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJsb2dcIiwgZGV0YWlscyApO1xuXG5cdFx0dGhpcy5hc3NlcnRpb25zLnB1c2goIHtcblx0XHRcdHJlc3VsdDogISFyZXN1bHRJbmZvLnJlc3VsdCxcblx0XHRcdG1lc3NhZ2U6IHJlc3VsdEluZm8ubWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRwdXNoRmFpbHVyZTogZnVuY3Rpb24oIG1lc3NhZ2UsIHNvdXJjZSwgYWN0dWFsICkge1xuXHRcdGlmICggISggdGhpcyBpbnN0YW5jZW9mIFRlc3QgKSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJwdXNoRmFpbHVyZSgpIGFzc2VydGlvbiBvdXRzaWRlIHRlc3QgY29udGV4dCwgd2FzIFwiICtcblx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdH1cblxuXHRcdHZhciBkZXRhaWxzID0ge1xuXHRcdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRcdHJlc3VsdDogZmFsc2UsXG5cdFx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UgfHwgXCJlcnJvclwiLFxuXHRcdFx0XHRhY3R1YWw6IGFjdHVhbCB8fCBudWxsLFxuXHRcdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkLFxuXHRcdFx0XHRydW50aW1lOiBub3coKSAtIHRoaXMuc3RhcnRlZFxuXHRcdFx0fTtcblxuXHRcdGlmICggc291cmNlICkge1xuXHRcdFx0ZGV0YWlscy5zb3VyY2UgPSBzb3VyY2U7XG5cdFx0fVxuXG5cdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJsb2dcIiwgZGV0YWlscyApO1xuXG5cdFx0dGhpcy5hc3NlcnRpb25zLnB1c2goIHtcblx0XHRcdHJlc3VsdDogZmFsc2UsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9LFxuXG5cdHJlc29sdmVQcm9taXNlOiBmdW5jdGlvbiggcHJvbWlzZSwgcGhhc2UgKSB7XG5cdFx0dmFyIHRoZW4sIG1lc3NhZ2UsXG5cdFx0XHR0ZXN0ID0gdGhpcztcblx0XHRpZiAoIHByb21pc2UgIT0gbnVsbCApIHtcblx0XHRcdHRoZW4gPSBwcm9taXNlLnRoZW47XG5cdFx0XHRpZiAoIFFVbml0Lm9iamVjdFR5cGUoIHRoZW4gKSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHRRVW5pdC5zdG9wKCk7XG5cdFx0XHRcdHRoZW4uY2FsbChcblx0XHRcdFx0XHRwcm9taXNlLFxuXHRcdFx0XHRcdGZ1bmN0aW9uKCkgeyBRVW5pdC5zdGFydCgpOyB9LFxuXHRcdFx0XHRcdGZ1bmN0aW9uKCBlcnJvciApIHtcblx0XHRcdFx0XHRcdG1lc3NhZ2UgPSBcIlByb21pc2UgcmVqZWN0ZWQgXCIgK1xuXHRcdFx0XHRcdFx0XHQoICFwaGFzZSA/IFwiZHVyaW5nXCIgOiBwaGFzZS5yZXBsYWNlKCAvRWFjaCQvLCBcIlwiICkgKSArXG5cdFx0XHRcdFx0XHRcdFwiIFwiICsgdGVzdC50ZXN0TmFtZSArIFwiOiBcIiArICggZXJyb3IubWVzc2FnZSB8fCBlcnJvciApO1xuXHRcdFx0XHRcdFx0dGVzdC5wdXNoRmFpbHVyZSggbWVzc2FnZSwgZXh0cmFjdFN0YWNrdHJhY2UoIGVycm9yLCAwICkgKTtcblxuXHRcdFx0XHRcdFx0Ly8gRWxzZSBuZXh0IHRlc3Qgd2lsbCBjYXJyeSB0aGUgcmVzcG9uc2liaWxpdHlcblx0XHRcdFx0XHRcdHNhdmVHbG9iYWwoKTtcblxuXHRcdFx0XHRcdFx0Ly8gVW5ibG9ja1xuXHRcdFx0XHRcdFx0UVVuaXQuc3RhcnQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdHZhbGlkOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgZmlsdGVyID0gY29uZmlnLmZpbHRlcixcblx0XHRcdHJlZ2V4RmlsdGVyID0gL14oIT8pXFwvKFtcXHdcXFddKilcXC8oaT8kKS8uZXhlYyggZmlsdGVyICksXG5cdFx0XHRtb2R1bGUgPSBjb25maWcubW9kdWxlICYmIGNvbmZpZy5tb2R1bGUudG9Mb3dlckNhc2UoKSxcblx0XHRcdGZ1bGxOYW1lID0gKCB0aGlzLm1vZHVsZS5uYW1lICsgXCI6IFwiICsgdGhpcy50ZXN0TmFtZSApO1xuXG5cdFx0ZnVuY3Rpb24gbW9kdWxlQ2hhaW5OYW1lTWF0Y2goIHRlc3RNb2R1bGUgKSB7XG5cdFx0XHR2YXIgdGVzdE1vZHVsZU5hbWUgPSB0ZXN0TW9kdWxlLm5hbWUgPyB0ZXN0TW9kdWxlLm5hbWUudG9Mb3dlckNhc2UoKSA6IG51bGw7XG5cdFx0XHRpZiAoIHRlc3RNb2R1bGVOYW1lID09PSBtb2R1bGUgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fSBlbHNlIGlmICggdGVzdE1vZHVsZS5wYXJlbnRNb2R1bGUgKSB7XG5cdFx0XHRcdHJldHVybiBtb2R1bGVDaGFpbk5hbWVNYXRjaCggdGVzdE1vZHVsZS5wYXJlbnRNb2R1bGUgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBtb2R1bGVDaGFpbklkTWF0Y2goIHRlc3RNb2R1bGUgKSB7XG5cdFx0XHRyZXR1cm4gaW5BcnJheSggdGVzdE1vZHVsZS5tb2R1bGVJZCwgY29uZmlnLm1vZHVsZUlkICkgPiAtMSB8fFxuXHRcdFx0XHR0ZXN0TW9kdWxlLnBhcmVudE1vZHVsZSAmJiBtb2R1bGVDaGFpbklkTWF0Y2goIHRlc3RNb2R1bGUucGFyZW50TW9kdWxlICk7XG5cdFx0fVxuXG5cdFx0Ly8gSW50ZXJuYWxseS1nZW5lcmF0ZWQgdGVzdHMgYXJlIGFsd2F5cyB2YWxpZFxuXHRcdGlmICggdGhpcy5jYWxsYmFjayAmJiB0aGlzLmNhbGxiYWNrLnZhbGlkVGVzdCApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICggY29uZmlnLm1vZHVsZUlkICYmIGNvbmZpZy5tb2R1bGVJZC5sZW5ndGggPiAwICYmXG5cdFx0XHQhbW9kdWxlQ2hhaW5JZE1hdGNoKCB0aGlzLm1vZHVsZSApICkge1xuXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYgKCBjb25maWcudGVzdElkICYmIGNvbmZpZy50ZXN0SWQubGVuZ3RoID4gMCAmJlxuXHRcdFx0aW5BcnJheSggdGhpcy50ZXN0SWQsIGNvbmZpZy50ZXN0SWQgKSA8IDAgKSB7XG5cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZiAoIG1vZHVsZSAmJiAhbW9kdWxlQ2hhaW5OYW1lTWF0Y2goIHRoaXMubW9kdWxlICkgKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYgKCAhZmlsdGVyICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlZ2V4RmlsdGVyID9cblx0XHRcdHRoaXMucmVnZXhGaWx0ZXIoICEhcmVnZXhGaWx0ZXJbIDEgXSwgcmVnZXhGaWx0ZXJbIDIgXSwgcmVnZXhGaWx0ZXJbIDMgXSwgZnVsbE5hbWUgKSA6XG5cdFx0XHR0aGlzLnN0cmluZ0ZpbHRlciggZmlsdGVyLCBmdWxsTmFtZSApO1xuXHR9LFxuXG5cdHJlZ2V4RmlsdGVyOiBmdW5jdGlvbiggZXhjbHVkZSwgcGF0dGVybiwgZmxhZ3MsIGZ1bGxOYW1lICkge1xuXHRcdHZhciByZWdleCA9IG5ldyBSZWdFeHAoIHBhdHRlcm4sIGZsYWdzICk7XG5cdFx0dmFyIG1hdGNoID0gcmVnZXgudGVzdCggZnVsbE5hbWUgKTtcblxuXHRcdHJldHVybiBtYXRjaCAhPT0gZXhjbHVkZTtcblx0fSxcblxuXHRzdHJpbmdGaWx0ZXI6IGZ1bmN0aW9uKCBmaWx0ZXIsIGZ1bGxOYW1lICkge1xuXHRcdGZpbHRlciA9IGZpbHRlci50b0xvd2VyQ2FzZSgpO1xuXHRcdGZ1bGxOYW1lID0gZnVsbE5hbWUudG9Mb3dlckNhc2UoKTtcblxuXHRcdHZhciBpbmNsdWRlID0gZmlsdGVyLmNoYXJBdCggMCApICE9PSBcIiFcIjtcblx0XHRpZiAoICFpbmNsdWRlICkge1xuXHRcdFx0ZmlsdGVyID0gZmlsdGVyLnNsaWNlKCAxICk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgdGhlIGZpbHRlciBtYXRjaGVzLCB3ZSBuZWVkIHRvIGhvbm91ciBpbmNsdWRlXG5cdFx0aWYgKCBmdWxsTmFtZS5pbmRleE9mKCBmaWx0ZXIgKSAhPT0gLTEgKSB7XG5cdFx0XHRyZXR1cm4gaW5jbHVkZTtcblx0XHR9XG5cblx0XHQvLyBPdGhlcndpc2UsIGRvIHRoZSBvcHBvc2l0ZVxuXHRcdHJldHVybiAhaW5jbHVkZTtcblx0fVxufTtcblxuLy8gUmVzZXRzIHRoZSB0ZXN0IHNldHVwLiBVc2VmdWwgZm9yIHRlc3RzIHRoYXQgbW9kaWZ5IHRoZSBET00uXG4vKlxuREVQUkVDQVRFRDogVXNlIG11bHRpcGxlIHRlc3RzIGluc3RlYWQgb2YgcmVzZXR0aW5nIGluc2lkZSBhIHRlc3QuXG5Vc2UgdGVzdFN0YXJ0IG9yIHRlc3REb25lIGZvciBjdXN0b20gY2xlYW51cC5cblRoaXMgbWV0aG9kIHdpbGwgdGhyb3cgYW4gZXJyb3IgaW4gMi4wLCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIDIuMVxuKi9cblFVbml0LnJlc2V0ID0gZnVuY3Rpb24oKSB7XG5cblx0Ly8gUmV0dXJuIG9uIG5vbi1icm93c2VyIGVudmlyb25tZW50c1xuXHQvLyBUaGlzIGlzIG5lY2Vzc2FyeSB0byBub3QgYnJlYWsgb24gbm9kZSB0ZXN0c1xuXHRpZiAoICFkZWZpbmVkLmRvY3VtZW50ICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHZhciBmaXh0dXJlID0gZGVmaW5lZC5kb2N1bWVudCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCAmJlxuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwicXVuaXQtZml4dHVyZVwiICk7XG5cblx0aWYgKCBmaXh0dXJlICkge1xuXHRcdGZpeHR1cmUuaW5uZXJIVE1MID0gY29uZmlnLmZpeHR1cmU7XG5cdH1cbn07XG5cblFVbml0LnB1c2hGYWlsdXJlID0gZnVuY3Rpb24oKSB7XG5cdGlmICggIVFVbml0LmNvbmZpZy5jdXJyZW50ICkge1xuXHRcdHRocm93IG5ldyBFcnJvciggXCJwdXNoRmFpbHVyZSgpIGFzc2VydGlvbiBvdXRzaWRlIHRlc3QgY29udGV4dCwgaW4gXCIgK1xuXHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHR9XG5cblx0Ly8gR2V0cyBjdXJyZW50IHRlc3Qgb2JqXG5cdHZhciBjdXJyZW50VGVzdCA9IFFVbml0LmNvbmZpZy5jdXJyZW50O1xuXG5cdHJldHVybiBjdXJyZW50VGVzdC5wdXNoRmFpbHVyZS5hcHBseSggY3VycmVudFRlc3QsIGFyZ3VtZW50cyApO1xufTtcblxuLy8gQmFzZWQgb24gSmF2YSdzIFN0cmluZy5oYXNoQ29kZSwgYSBzaW1wbGUgYnV0IG5vdFxuLy8gcmlnb3JvdXNseSBjb2xsaXNpb24gcmVzaXN0YW50IGhhc2hpbmcgZnVuY3Rpb25cbmZ1bmN0aW9uIGdlbmVyYXRlSGFzaCggbW9kdWxlLCB0ZXN0TmFtZSApIHtcblx0dmFyIGhleCxcblx0XHRpID0gMCxcblx0XHRoYXNoID0gMCxcblx0XHRzdHIgPSBtb2R1bGUgKyBcIlxceDFDXCIgKyB0ZXN0TmFtZSxcblx0XHRsZW4gPSBzdHIubGVuZ3RoO1xuXG5cdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdGhhc2ggID0gKCAoIGhhc2ggPDwgNSApIC0gaGFzaCApICsgc3RyLmNoYXJDb2RlQXQoIGkgKTtcblx0XHRoYXNoIHw9IDA7XG5cdH1cblxuXHQvLyBDb252ZXJ0IHRoZSBwb3NzaWJseSBuZWdhdGl2ZSBpbnRlZ2VyIGhhc2ggY29kZSBpbnRvIGFuIDggY2hhcmFjdGVyIGhleCBzdHJpbmcsIHdoaWNoIGlzbid0XG5cdC8vIHN0cmljdGx5IG5lY2Vzc2FyeSBidXQgaW5jcmVhc2VzIHVzZXIgdW5kZXJzdGFuZGluZyB0aGF0IHRoZSBpZCBpcyBhIFNIQS1saWtlIGhhc2hcblx0aGV4ID0gKCAweDEwMDAwMDAwMCArIGhhc2ggKS50b1N0cmluZyggMTYgKTtcblx0aWYgKCBoZXgubGVuZ3RoIDwgOCApIHtcblx0XHRoZXggPSBcIjAwMDAwMDBcIiArIGhleDtcblx0fVxuXG5cdHJldHVybiBoZXguc2xpY2UoIC04ICk7XG59XG5cbmZ1bmN0aW9uIHN5bmNocm9uaXplKCBjYWxsYmFjaywgcHJpb3JpdHksIHNlZWQgKSB7XG5cdHZhciBsYXN0ID0gIXByaW9yaXR5LFxuXHRcdGluZGV4O1xuXG5cdGlmICggUVVuaXQub2JqZWN0VHlwZSggY2FsbGJhY2sgKSA9PT0gXCJhcnJheVwiICkge1xuXHRcdHdoaWxlICggY2FsbGJhY2subGVuZ3RoICkge1xuXHRcdFx0c3luY2hyb25pemUoIGNhbGxiYWNrLnNoaWZ0KCkgKTtcblx0XHR9XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKCBwcmlvcml0eSApIHtcblx0XHRjb25maWcucXVldWUuc3BsaWNlKCBwcmlvcml0eUNvdW50KyssIDAsIGNhbGxiYWNrICk7XG5cdH0gZWxzZSBpZiAoIHNlZWQgKSB7XG5cdFx0aWYgKCAhdW5pdFNhbXBsZXIgKSB7XG5cdFx0XHR1bml0U2FtcGxlciA9IHVuaXRTYW1wbGVyR2VuZXJhdG9yKCBzZWVkICk7XG5cdFx0fVxuXG5cdFx0Ly8gSW5zZXJ0IGludG8gYSByYW5kb20gcG9zaXRpb24gYWZ0ZXIgYWxsIHByaW9yaXR5IGl0ZW1zXG5cdFx0aW5kZXggPSBNYXRoLmZsb29yKCB1bml0U2FtcGxlcigpICogKCBjb25maWcucXVldWUubGVuZ3RoIC0gcHJpb3JpdHlDb3VudCArIDEgKSApO1xuXHRcdGNvbmZpZy5xdWV1ZS5zcGxpY2UoIHByaW9yaXR5Q291bnQgKyBpbmRleCwgMCwgY2FsbGJhY2sgKTtcblx0fSBlbHNlIHtcblx0XHRjb25maWcucXVldWUucHVzaCggY2FsbGJhY2sgKTtcblx0fVxuXG5cdGlmICggY29uZmlnLmF1dG9ydW4gJiYgIWNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRwcm9jZXNzKCBsYXN0ICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdW5pdFNhbXBsZXJHZW5lcmF0b3IoIHNlZWQgKSB7XG5cblx0Ly8gMzItYml0IHhvcnNoaWZ0LCByZXF1aXJlcyBvbmx5IGEgbm9uemVybyBzZWVkXG5cdC8vIGh0dHA6Ly9leGNhbWVyYS5jb20vc3BoaW54L2FydGljbGUteG9yc2hpZnQuaHRtbFxuXHR2YXIgc2FtcGxlID0gcGFyc2VJbnQoIGdlbmVyYXRlSGFzaCggc2VlZCApLCAxNiApIHx8IC0xO1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0c2FtcGxlIF49IHNhbXBsZSA8PCAxMztcblx0XHRzYW1wbGUgXj0gc2FtcGxlID4+PiAxNztcblx0XHRzYW1wbGUgXj0gc2FtcGxlIDw8IDU7XG5cblx0XHQvLyBFQ01BU2NyaXB0IGhhcyBubyB1bnNpZ25lZCBudW1iZXIgdHlwZVxuXHRcdGlmICggc2FtcGxlIDwgMCApIHtcblx0XHRcdHNhbXBsZSArPSAweDEwMDAwMDAwMDtcblx0XHR9XG5cblx0XHRyZXR1cm4gc2FtcGxlIC8gMHgxMDAwMDAwMDA7XG5cdH07XG59XG5cbmZ1bmN0aW9uIHNhdmVHbG9iYWwoKSB7XG5cdGNvbmZpZy5wb2xsdXRpb24gPSBbXTtcblxuXHRpZiAoIGNvbmZpZy5ub2dsb2JhbHMgKSB7XG5cdFx0Zm9yICggdmFyIGtleSBpbiBnbG9iYWwgKSB7XG5cdFx0XHRpZiAoIGhhc093bi5jYWxsKCBnbG9iYWwsIGtleSApICkge1xuXG5cdFx0XHRcdC8vIEluIE9wZXJhIHNvbWV0aW1lcyBET00gZWxlbWVudCBpZHMgc2hvdyB1cCBoZXJlLCBpZ25vcmUgdGhlbVxuXHRcdFx0XHRpZiAoIC9ecXVuaXQtdGVzdC1vdXRwdXQvLnRlc3QoIGtleSApICkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbmZpZy5wb2xsdXRpb24ucHVzaCgga2V5ICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGNoZWNrUG9sbHV0aW9uKCkge1xuXHR2YXIgbmV3R2xvYmFscyxcblx0XHRkZWxldGVkR2xvYmFscyxcblx0XHRvbGQgPSBjb25maWcucG9sbHV0aW9uO1xuXG5cdHNhdmVHbG9iYWwoKTtcblxuXHRuZXdHbG9iYWxzID0gZGlmZiggY29uZmlnLnBvbGx1dGlvbiwgb2xkICk7XG5cdGlmICggbmV3R2xvYmFscy5sZW5ndGggPiAwICkge1xuXHRcdFFVbml0LnB1c2hGYWlsdXJlKCBcIkludHJvZHVjZWQgZ2xvYmFsIHZhcmlhYmxlKHMpOiBcIiArIG5ld0dsb2JhbHMuam9pbiggXCIsIFwiICkgKTtcblx0fVxuXG5cdGRlbGV0ZWRHbG9iYWxzID0gZGlmZiggb2xkLCBjb25maWcucG9sbHV0aW9uICk7XG5cdGlmICggZGVsZXRlZEdsb2JhbHMubGVuZ3RoID4gMCApIHtcblx0XHRRVW5pdC5wdXNoRmFpbHVyZSggXCJEZWxldGVkIGdsb2JhbCB2YXJpYWJsZShzKTogXCIgKyBkZWxldGVkR2xvYmFscy5qb2luKCBcIiwgXCIgKSApO1xuXHR9XG59XG5cbi8vIFdpbGwgYmUgZXhwb3NlZCBhcyBRVW5pdC5hc3luY1Rlc3RcbmZ1bmN0aW9uIGFzeW5jVGVzdCggdGVzdE5hbWUsIGV4cGVjdGVkLCBjYWxsYmFjayApIHtcblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdGNhbGxiYWNrID0gZXhwZWN0ZWQ7XG5cdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHR9XG5cblx0UVVuaXQudGVzdCggdGVzdE5hbWUsIGV4cGVjdGVkLCBjYWxsYmFjaywgdHJ1ZSApO1xufVxuXG4vLyBXaWxsIGJlIGV4cG9zZWQgYXMgUVVuaXQudGVzdFxuZnVuY3Rpb24gdGVzdCggdGVzdE5hbWUsIGV4cGVjdGVkLCBjYWxsYmFjaywgYXN5bmMgKSB7XG5cdGlmICggZm9jdXNlZCApICB7IHJldHVybjsgfVxuXG5cdHZhciBuZXdUZXN0O1xuXG5cdGlmICggYXJndW1lbnRzLmxlbmd0aCA9PT0gMiApIHtcblx0XHRjYWxsYmFjayA9IGV4cGVjdGVkO1xuXHRcdGV4cGVjdGVkID0gbnVsbDtcblx0fVxuXG5cdG5ld1Rlc3QgPSBuZXcgVGVzdCgge1xuXHRcdHRlc3ROYW1lOiB0ZXN0TmFtZSxcblx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0YXN5bmM6IGFzeW5jLFxuXHRcdGNhbGxiYWNrOiBjYWxsYmFja1xuXHR9ICk7XG5cblx0bmV3VGVzdC5xdWV1ZSgpO1xufVxuXG4vLyBXaWxsIGJlIGV4cG9zZWQgYXMgUVVuaXQuc2tpcFxuZnVuY3Rpb24gc2tpcCggdGVzdE5hbWUgKSB7XG5cdGlmICggZm9jdXNlZCApICB7IHJldHVybjsgfVxuXG5cdHZhciB0ZXN0ID0gbmV3IFRlc3QoIHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0c2tpcDogdHJ1ZVxuXHR9ICk7XG5cblx0dGVzdC5xdWV1ZSgpO1xufVxuXG4vLyBXaWxsIGJlIGV4cG9zZWQgYXMgUVVuaXQub25seVxuZnVuY3Rpb24gb25seSggdGVzdE5hbWUsIGV4cGVjdGVkLCBjYWxsYmFjaywgYXN5bmMgKSB7XG5cdHZhciBuZXdUZXN0O1xuXG5cdGlmICggZm9jdXNlZCApICB7IHJldHVybjsgfVxuXG5cdFFVbml0LmNvbmZpZy5xdWV1ZS5sZW5ndGggPSAwO1xuXHRmb2N1c2VkID0gdHJ1ZTtcblxuXHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgKSB7XG5cdFx0Y2FsbGJhY2sgPSBleHBlY3RlZDtcblx0XHRleHBlY3RlZCA9IG51bGw7XG5cdH1cblxuXHRuZXdUZXN0ID0gbmV3IFRlc3QoIHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdGFzeW5jOiBhc3luYyxcblx0XHRjYWxsYmFjazogY2FsbGJhY2tcblx0fSApO1xuXG5cdG5ld1Rlc3QucXVldWUoKTtcbn1cblxuZnVuY3Rpb24gQXNzZXJ0KCB0ZXN0Q29udGV4dCApIHtcblx0dGhpcy50ZXN0ID0gdGVzdENvbnRleHQ7XG59XG5cbi8vIEFzc2VydCBoZWxwZXJzXG5RVW5pdC5hc3NlcnQgPSBBc3NlcnQucHJvdG90eXBlID0ge1xuXG5cdC8vIFNwZWNpZnkgdGhlIG51bWJlciBvZiBleHBlY3RlZCBhc3NlcnRpb25zIHRvIGd1YXJhbnRlZSB0aGF0IGZhaWxlZCB0ZXN0XG5cdC8vIChubyBhc3NlcnRpb25zIGFyZSBydW4gYXQgYWxsKSBkb24ndCBzbGlwIHRocm91Z2guXG5cdGV4cGVjdDogZnVuY3Rpb24oIGFzc2VydHMgKSB7XG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAxICkge1xuXHRcdFx0dGhpcy50ZXN0LmV4cGVjdGVkID0gYXNzZXJ0cztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMudGVzdC5leHBlY3RlZDtcblx0XHR9XG5cdH0sXG5cblx0Ly8gSW5jcmVtZW50IHRoaXMgVGVzdCdzIHNlbWFwaG9yZSBjb3VudGVyLCB0aGVuIHJldHVybiBhIGZ1bmN0aW9uIHRoYXRcblx0Ly8gZGVjcmVtZW50cyB0aGF0IGNvdW50ZXIgYSBtYXhpbXVtIG9mIG9uY2UuXG5cdGFzeW5jOiBmdW5jdGlvbiggY291bnQgKSB7XG5cdFx0dmFyIHRlc3QgPSB0aGlzLnRlc3QsXG5cdFx0XHRwb3BwZWQgPSBmYWxzZSxcblx0XHRcdGFjY2VwdENhbGxDb3VudCA9IGNvdW50O1xuXG5cdFx0aWYgKCB0eXBlb2YgYWNjZXB0Q2FsbENvdW50ID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0YWNjZXB0Q2FsbENvdW50ID0gMTtcblx0XHR9XG5cblx0XHR0ZXN0LnNlbWFwaG9yZSArPSAxO1xuXHRcdHRlc3QudXNlZEFzeW5jID0gdHJ1ZTtcblx0XHRwYXVzZVByb2Nlc3NpbmcoKTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiBkb25lKCkge1xuXG5cdFx0XHRpZiAoIHBvcHBlZCApIHtcblx0XHRcdFx0dGVzdC5wdXNoRmFpbHVyZSggXCJUb28gbWFueSBjYWxscyB0byB0aGUgYGFzc2VydC5hc3luY2AgY2FsbGJhY2tcIixcblx0XHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGFjY2VwdENhbGxDb3VudCAtPSAxO1xuXHRcdFx0aWYgKCBhY2NlcHRDYWxsQ291bnQgPiAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRlc3Quc2VtYXBob3JlIC09IDE7XG5cdFx0XHRwb3BwZWQgPSB0cnVlO1xuXHRcdFx0cmVzdW1lUHJvY2Vzc2luZygpO1xuXHRcdH07XG5cdH0sXG5cblx0Ly8gRXhwb3J0cyB0ZXN0LnB1c2goKSB0byB0aGUgdXNlciBBUElcblx0Ly8gQWxpYXMgb2YgcHVzaFJlc3VsdC5cblx0cHVzaDogZnVuY3Rpb24oIHJlc3VsdCwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgbmVnYXRpdmUgKSB7XG5cdFx0dmFyIGN1cnJlbnRBc3NlcnQgPSB0aGlzIGluc3RhbmNlb2YgQXNzZXJ0ID8gdGhpcyA6IFFVbml0LmNvbmZpZy5jdXJyZW50LmFzc2VydDtcblx0XHRyZXR1cm4gY3VycmVudEFzc2VydC5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IHJlc3VsdCxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5lZ2F0aXZlOiBuZWdhdGl2ZVxuXHRcdH0gKTtcblx0fSxcblxuXHRwdXNoUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0SW5mbyApIHtcblxuXHRcdC8vIERlc3RydWN0dXJlIG9mIHJlc3VsdEluZm8gPSB7IHJlc3VsdCwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgbmVnYXRpdmUgfVxuXHRcdHZhciBhc3NlcnQgPSB0aGlzLFxuXHRcdFx0Y3VycmVudFRlc3QgPSAoIGFzc2VydCBpbnN0YW5jZW9mIEFzc2VydCAmJiBhc3NlcnQudGVzdCApIHx8IFFVbml0LmNvbmZpZy5jdXJyZW50O1xuXG5cdFx0Ly8gQmFja3dhcmRzIGNvbXBhdGliaWxpdHkgZml4LlxuXHRcdC8vIEFsbG93cyB0aGUgZGlyZWN0IHVzZSBvZiBnbG9iYWwgZXhwb3J0ZWQgYXNzZXJ0aW9ucyBhbmQgUVVuaXQuYXNzZXJ0Lipcblx0XHQvLyBBbHRob3VnaCwgaXQncyB1c2UgaXMgbm90IHJlY29tbWVuZGVkIGFzIGl0IGNhbiBsZWFrIGFzc2VydGlvbnNcblx0XHQvLyB0byBvdGhlciB0ZXN0cyBmcm9tIGFzeW5jIHRlc3RzLCBiZWNhdXNlIHdlIG9ubHkgZ2V0IGEgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IHRlc3QsXG5cdFx0Ly8gbm90IGV4YWN0bHkgdGhlIHRlc3Qgd2hlcmUgYXNzZXJ0aW9uIHdlcmUgaW50ZW5kZWQgdG8gYmUgY2FsbGVkLlxuXHRcdGlmICggIWN1cnJlbnRUZXN0ICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcImFzc2VydGlvbiBvdXRzaWRlIHRlc3QgY29udGV4dCwgaW4gXCIgKyBzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApICk7XG5cdFx0fVxuXG5cdFx0aWYgKCBjdXJyZW50VGVzdC51c2VkQXN5bmMgPT09IHRydWUgJiYgY3VycmVudFRlc3Quc2VtYXBob3JlID09PSAwICkge1xuXHRcdFx0Y3VycmVudFRlc3QucHVzaEZhaWx1cmUoIFwiQXNzZXJ0aW9uIGFmdGVyIHRoZSBmaW5hbCBgYXNzZXJ0LmFzeW5jYCB3YXMgcmVzb2x2ZWRcIixcblx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXG5cdFx0XHQvLyBBbGxvdyB0aGlzIGFzc2VydGlvbiB0byBjb250aW51ZSBydW5uaW5nIGFueXdheS4uLlxuXHRcdH1cblxuXHRcdGlmICggISggYXNzZXJ0IGluc3RhbmNlb2YgQXNzZXJ0ICkgKSB7XG5cdFx0XHRhc3NlcnQgPSBjdXJyZW50VGVzdC5hc3NlcnQ7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFzc2VydC50ZXN0LnB1c2hSZXN1bHQoIHJlc3VsdEluZm8gKTtcblx0fSxcblxuXHRvazogZnVuY3Rpb24oIHJlc3VsdCwgbWVzc2FnZSApIHtcblx0XHRtZXNzYWdlID0gbWVzc2FnZSB8fCAoIHJlc3VsdCA/IFwib2theVwiIDogXCJmYWlsZWQsIGV4cGVjdGVkIGFyZ3VtZW50IHRvIGJlIHRydXRoeSwgd2FzOiBcIiArXG5cdFx0XHRRVW5pdC5kdW1wLnBhcnNlKCByZXN1bHQgKSApO1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiAhIXJlc3VsdCxcblx0XHRcdGFjdHVhbDogcmVzdWx0LFxuXHRcdFx0ZXhwZWN0ZWQ6IHRydWUsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9LFxuXG5cdG5vdE9rOiBmdW5jdGlvbiggcmVzdWx0LCBtZXNzYWdlICkge1xuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlIHx8ICggIXJlc3VsdCA/IFwib2theVwiIDogXCJmYWlsZWQsIGV4cGVjdGVkIGFyZ3VtZW50IHRvIGJlIGZhbHN5LCB3YXM6IFwiICtcblx0XHRcdFFVbml0LmR1bXAucGFyc2UoIHJlc3VsdCApICk7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6ICFyZXN1bHQsXG5cdFx0XHRhY3R1YWw6IHJlc3VsdCxcblx0XHRcdGV4cGVjdGVkOiBmYWxzZSxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9ICk7XG5cdH0sXG5cblx0ZXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdC8qanNoaW50IGVxZXFlcTpmYWxzZSAqL1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiBleHBlY3RlZCA9PSBhY3R1YWwsXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9ICk7XG5cdH0sXG5cblx0bm90RXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdC8qanNoaW50IGVxZXFlcTpmYWxzZSAqL1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiBleHBlY3RlZCAhPSBhY3R1YWwsXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRuZWdhdGl2ZTogdHJ1ZVxuXHRcdH0gKTtcblx0fSxcblxuXHRwcm9wRXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdGFjdHVhbCA9IG9iamVjdFZhbHVlcyggYWN0dWFsICk7XG5cdFx0ZXhwZWN0ZWQgPSBvYmplY3RWYWx1ZXMoIGV4cGVjdGVkICk7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IFFVbml0LmVxdWl2KCBhY3R1YWwsIGV4cGVjdGVkICksXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9ICk7XG5cdH0sXG5cblx0bm90UHJvcEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHRhY3R1YWwgPSBvYmplY3RWYWx1ZXMoIGFjdHVhbCApO1xuXHRcdGV4cGVjdGVkID0gb2JqZWN0VmFsdWVzKCBleHBlY3RlZCApO1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiAhUVVuaXQuZXF1aXYoIGFjdHVhbCwgZXhwZWN0ZWQgKSxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5lZ2F0aXZlOiB0cnVlXG5cdFx0fSApO1xuXHR9LFxuXG5cdGRlZXBFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IFFVbml0LmVxdWl2KCBhY3R1YWwsIGV4cGVjdGVkICksXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9ICk7XG5cdH0sXG5cblx0bm90RGVlcEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogIVFVbml0LmVxdWl2KCBhY3R1YWwsIGV4cGVjdGVkICksXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRuZWdhdGl2ZTogdHJ1ZVxuXHRcdH0gKTtcblx0fSxcblxuXHRzdHJpY3RFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IGV4cGVjdGVkID09PSBhY3R1YWwsXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0XHR9ICk7XG5cdH0sXG5cblx0bm90U3RyaWN0RXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiBleHBlY3RlZCAhPT0gYWN0dWFsLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0bmVnYXRpdmU6IHRydWVcblx0XHR9ICk7XG5cdH0sXG5cblx0XCJ0aHJvd3NcIjogZnVuY3Rpb24oIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR2YXIgYWN0dWFsLCBleHBlY3RlZFR5cGUsXG5cdFx0XHRleHBlY3RlZE91dHB1dCA9IGV4cGVjdGVkLFxuXHRcdFx0b2sgPSBmYWxzZSxcblx0XHRcdGN1cnJlbnRUZXN0ID0gKCB0aGlzIGluc3RhbmNlb2YgQXNzZXJ0ICYmIHRoaXMudGVzdCApIHx8IFFVbml0LmNvbmZpZy5jdXJyZW50O1xuXG5cdFx0Ly8gJ2V4cGVjdGVkJyBpcyBvcHRpb25hbCB1bmxlc3MgZG9pbmcgc3RyaW5nIGNvbXBhcmlzb25cblx0XHRpZiAoIG1lc3NhZ2UgPT0gbnVsbCAmJiB0eXBlb2YgZXhwZWN0ZWQgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRtZXNzYWdlID0gZXhwZWN0ZWQ7XG5cdFx0XHRleHBlY3RlZCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0Y3VycmVudFRlc3QuaWdub3JlR2xvYmFsRXJyb3JzID0gdHJ1ZTtcblx0XHR0cnkge1xuXHRcdFx0YmxvY2suY2FsbCggY3VycmVudFRlc3QudGVzdEVudmlyb25tZW50ICk7XG5cdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRhY3R1YWwgPSBlO1xuXHRcdH1cblx0XHRjdXJyZW50VGVzdC5pZ25vcmVHbG9iYWxFcnJvcnMgPSBmYWxzZTtcblxuXHRcdGlmICggYWN0dWFsICkge1xuXHRcdFx0ZXhwZWN0ZWRUeXBlID0gUVVuaXQub2JqZWN0VHlwZSggZXhwZWN0ZWQgKTtcblxuXHRcdFx0Ly8gV2UgZG9uJ3Qgd2FudCB0byB2YWxpZGF0ZSB0aHJvd24gZXJyb3Jcblx0XHRcdGlmICggIWV4cGVjdGVkICkge1xuXHRcdFx0XHRvayA9IHRydWU7XG5cdFx0XHRcdGV4cGVjdGVkT3V0cHV0ID0gbnVsbDtcblxuXHRcdFx0Ly8gRXhwZWN0ZWQgaXMgYSByZWdleHBcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJyZWdleHBcIiApIHtcblx0XHRcdFx0b2sgPSBleHBlY3RlZC50ZXN0KCBlcnJvclN0cmluZyggYWN0dWFsICkgKTtcblxuXHRcdFx0Ly8gRXhwZWN0ZWQgaXMgYSBzdHJpbmdcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0b2sgPSBleHBlY3RlZCA9PT0gZXJyb3JTdHJpbmcoIGFjdHVhbCApO1xuXG5cdFx0XHQvLyBFeHBlY3RlZCBpcyBhIGNvbnN0cnVjdG9yLCBtYXliZSBhbiBFcnJvciBjb25zdHJ1Y3RvclxuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcImZ1bmN0aW9uXCIgJiYgYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQgKSB7XG5cdFx0XHRcdG9rID0gdHJ1ZTtcblxuXHRcdFx0Ly8gRXhwZWN0ZWQgaXMgYW4gRXJyb3Igb2JqZWN0XG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRcdG9rID0gYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQuY29uc3RydWN0b3IgJiZcblx0XHRcdFx0XHRhY3R1YWwubmFtZSA9PT0gZXhwZWN0ZWQubmFtZSAmJlxuXHRcdFx0XHRcdGFjdHVhbC5tZXNzYWdlID09PSBleHBlY3RlZC5tZXNzYWdlO1xuXG5cdFx0XHQvLyBFeHBlY3RlZCBpcyBhIHZhbGlkYXRpb24gZnVuY3Rpb24gd2hpY2ggcmV0dXJucyB0cnVlIGlmIHZhbGlkYXRpb24gcGFzc2VkXG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwiZnVuY3Rpb25cIiAmJiBleHBlY3RlZC5jYWxsKCB7fSwgYWN0dWFsICkgPT09IHRydWUgKSB7XG5cdFx0XHRcdGV4cGVjdGVkT3V0cHV0ID0gbnVsbDtcblx0XHRcdFx0b2sgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGN1cnJlbnRUZXN0LmFzc2VydC5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6IG9rLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWRPdXRwdXQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9XG59O1xuXG4vLyBQcm92aWRlIGFuIGFsdGVybmF0aXZlIHRvIGFzc2VydC50aHJvd3MoKSwgZm9yIGVudmlyb25tZW50cyB0aGF0IGNvbnNpZGVyIHRocm93cyBhIHJlc2VydmVkIHdvcmRcbi8vIEtub3duIHRvIHVzIGFyZTogQ2xvc3VyZSBDb21waWxlciwgTmFyd2hhbFxuKCBmdW5jdGlvbigpIHtcblx0Lypqc2hpbnQgc3ViOnRydWUgKi9cblx0QXNzZXJ0LnByb3RvdHlwZS5yYWlzZXMgPSBBc3NlcnQucHJvdG90eXBlIFsgXCJ0aHJvd3NcIiBdOyAvL2pzY3M6aWdub3JlIHJlcXVpcmVEb3ROb3RhdGlvblxufSgpICk7XG5cbmZ1bmN0aW9uIGVycm9yU3RyaW5nKCBlcnJvciApIHtcblx0dmFyIG5hbWUsIG1lc3NhZ2UsXG5cdFx0cmVzdWx0RXJyb3JTdHJpbmcgPSBlcnJvci50b1N0cmluZygpO1xuXHRpZiAoIHJlc3VsdEVycm9yU3RyaW5nLnN1YnN0cmluZyggMCwgNyApID09PSBcIltvYmplY3RcIiApIHtcblx0XHRuYW1lID0gZXJyb3IubmFtZSA/IGVycm9yLm5hbWUudG9TdHJpbmcoKSA6IFwiRXJyb3JcIjtcblx0XHRtZXNzYWdlID0gZXJyb3IubWVzc2FnZSA/IGVycm9yLm1lc3NhZ2UudG9TdHJpbmcoKSA6IFwiXCI7XG5cdFx0aWYgKCBuYW1lICYmIG1lc3NhZ2UgKSB7XG5cdFx0XHRyZXR1cm4gbmFtZSArIFwiOiBcIiArIG1lc3NhZ2U7XG5cdFx0fSBlbHNlIGlmICggbmFtZSApIHtcblx0XHRcdHJldHVybiBuYW1lO1xuXHRcdH0gZWxzZSBpZiAoIG1lc3NhZ2UgKSB7XG5cdFx0XHRyZXR1cm4gbWVzc2FnZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFwiRXJyb3JcIjtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHJlc3VsdEVycm9yU3RyaW5nO1xuXHR9XG59XG5cbi8vIFRlc3QgZm9yIGVxdWFsaXR5IGFueSBKYXZhU2NyaXB0IHR5cGUuXG4vLyBBdXRob3I6IFBoaWxpcHBlIFJhdGjDqSA8cHJhdGhlQGdtYWlsLmNvbT5cblFVbml0LmVxdWl2ID0gKCBmdW5jdGlvbigpIHtcblxuXHQvLyBTdGFjayB0byBkZWNpZGUgYmV0d2VlbiBza2lwL2Fib3J0IGZ1bmN0aW9uc1xuXHR2YXIgY2FsbGVycyA9IFtdO1xuXG5cdC8vIFN0YWNrIHRvIGF2b2lkaW5nIGxvb3BzIGZyb20gY2lyY3VsYXIgcmVmZXJlbmNpbmdcblx0dmFyIHBhcmVudHMgPSBbXTtcblx0dmFyIHBhcmVudHNCID0gW107XG5cblx0dmFyIGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uKCBvYmogKSB7XG5cblx0XHQvKmpzaGludCBwcm90bzogdHJ1ZSAqL1xuXHRcdHJldHVybiBvYmouX19wcm90b19fO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHVzZVN0cmljdEVxdWFsaXR5KCBiLCBhICkge1xuXG5cdFx0Ly8gVG8gY2F0Y2ggc2hvcnQgYW5ub3RhdGlvbiBWUyAnbmV3JyBhbm5vdGF0aW9uIG9mIGEgZGVjbGFyYXRpb24uIGUuZy46XG5cdFx0Ly8gYHZhciBpID0gMTtgXG5cdFx0Ly8gYHZhciBqID0gbmV3IE51bWJlcigxKTtgXG5cdFx0aWYgKCB0eXBlb2YgYSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdGEgPSBhLnZhbHVlT2YoKTtcblx0XHR9XG5cdFx0aWYgKCB0eXBlb2YgYiA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdGIgPSBiLnZhbHVlT2YoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYSA9PT0gYjtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbXBhcmVDb25zdHJ1Y3RvcnMoIGEsIGIgKSB7XG5cdFx0dmFyIHByb3RvQSA9IGdldFByb3RvKCBhICk7XG5cdFx0dmFyIHByb3RvQiA9IGdldFByb3RvKCBiICk7XG5cblx0XHQvLyBDb21wYXJpbmcgY29uc3RydWN0b3JzIGlzIG1vcmUgc3RyaWN0IHRoYW4gdXNpbmcgYGluc3RhbmNlb2ZgXG5cdFx0aWYgKCBhLmNvbnN0cnVjdG9yID09PSBiLmNvbnN0cnVjdG9yICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gUmVmICM4NTFcblx0XHQvLyBJZiB0aGUgb2JqIHByb3RvdHlwZSBkZXNjZW5kcyBmcm9tIGEgbnVsbCBjb25zdHJ1Y3RvciwgdHJlYXQgaXRcblx0XHQvLyBhcyBhIG51bGwgcHJvdG90eXBlLlxuXHRcdGlmICggcHJvdG9BICYmIHByb3RvQS5jb25zdHJ1Y3RvciA9PT0gbnVsbCApIHtcblx0XHRcdHByb3RvQSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmICggcHJvdG9CICYmIHByb3RvQi5jb25zdHJ1Y3RvciA9PT0gbnVsbCApIHtcblx0XHRcdHByb3RvQiA9IG51bGw7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsb3cgb2JqZWN0cyB3aXRoIG5vIHByb3RvdHlwZSB0byBiZSBlcXVpdmFsZW50IHRvXG5cdFx0Ly8gb2JqZWN0cyB3aXRoIE9iamVjdCBhcyB0aGVpciBjb25zdHJ1Y3Rvci5cblx0XHRpZiAoICggcHJvdG9BID09PSBudWxsICYmIHByb3RvQiA9PT0gT2JqZWN0LnByb3RvdHlwZSApIHx8XG5cdFx0XHRcdCggcHJvdG9CID09PSBudWxsICYmIHByb3RvQSA9PT0gT2JqZWN0LnByb3RvdHlwZSApICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UmVnRXhwRmxhZ3MoIHJlZ2V4cCApIHtcblx0XHRyZXR1cm4gXCJmbGFnc1wiIGluIHJlZ2V4cCA/IHJlZ2V4cC5mbGFncyA6IHJlZ2V4cC50b1N0cmluZygpLm1hdGNoKCAvW2dpbXV5XSokLyApWyAwIF07XG5cdH1cblxuXHR2YXIgY2FsbGJhY2tzID0ge1xuXHRcdFwic3RyaW5nXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwiYm9vbGVhblwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcIm51bWJlclwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcIm51bGxcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJ1bmRlZmluZWRcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJzeW1ib2xcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJkYXRlXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXG5cdFx0XCJuYW5cIjogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0XCJyZWdleHBcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHRyZXR1cm4gYS5zb3VyY2UgPT09IGIuc291cmNlICYmXG5cblx0XHRcdFx0Ly8gSW5jbHVkZSBmbGFncyBpbiB0aGUgY29tcGFyaXNvblxuXHRcdFx0XHRnZXRSZWdFeHBGbGFncyggYSApID09PSBnZXRSZWdFeHBGbGFncyggYiApO1xuXHRcdH0sXG5cblx0XHQvLyAtIHNraXAgd2hlbiB0aGUgcHJvcGVydHkgaXMgYSBtZXRob2Qgb2YgYW4gaW5zdGFuY2UgKE9PUClcblx0XHQvLyAtIGFib3J0IG90aGVyd2lzZSxcblx0XHQvLyBpbml0aWFsID09PSB3b3VsZCBoYXZlIGNhdGNoIGlkZW50aWNhbCByZWZlcmVuY2VzIGFueXdheVxuXHRcdFwiZnVuY3Rpb25cIjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY2FsbGVyID0gY2FsbGVyc1sgY2FsbGVycy5sZW5ndGggLSAxIF07XG5cdFx0XHRyZXR1cm4gY2FsbGVyICE9PSBPYmplY3QgJiYgdHlwZW9mIGNhbGxlciAhPT0gXCJ1bmRlZmluZWRcIjtcblx0XHR9LFxuXG5cdFx0XCJhcnJheVwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBpLCBqLCBsZW4sIGxvb3AsIGFDaXJjdWxhciwgYkNpcmN1bGFyO1xuXG5cdFx0XHRsZW4gPSBhLmxlbmd0aDtcblx0XHRcdGlmICggbGVuICE9PSBiLmxlbmd0aCApIHtcblxuXHRcdFx0XHQvLyBTYWZlIGFuZCBmYXN0ZXJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUcmFjayByZWZlcmVuY2UgdG8gYXZvaWQgY2lyY3VsYXIgcmVmZXJlbmNlc1xuXHRcdFx0cGFyZW50cy5wdXNoKCBhICk7XG5cdFx0XHRwYXJlbnRzQi5wdXNoKCBiICk7XG5cdFx0XHRmb3IgKCBpID0gMDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHRsb29wID0gZmFsc2U7XG5cdFx0XHRcdGZvciAoIGogPSAwOyBqIDwgcGFyZW50cy5sZW5ndGg7IGorKyApIHtcblx0XHRcdFx0XHRhQ2lyY3VsYXIgPSBwYXJlbnRzWyBqIF0gPT09IGFbIGkgXTtcblx0XHRcdFx0XHRiQ2lyY3VsYXIgPSBwYXJlbnRzQlsgaiBdID09PSBiWyBpIF07XG5cdFx0XHRcdFx0aWYgKCBhQ2lyY3VsYXIgfHwgYkNpcmN1bGFyICkge1xuXHRcdFx0XHRcdFx0aWYgKCBhWyBpIF0gPT09IGJbIGkgXSB8fCBhQ2lyY3VsYXIgJiYgYkNpcmN1bGFyICkge1xuXHRcdFx0XHRcdFx0XHRsb29wID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRcdFx0XHRcdHBhcmVudHNCLnBvcCgpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggIWxvb3AgJiYgIWlubmVyRXF1aXYoIGFbIGkgXSwgYlsgaSBdICkgKSB7XG5cdFx0XHRcdFx0cGFyZW50cy5wb3AoKTtcblx0XHRcdFx0XHRwYXJlbnRzQi5wb3AoKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRwYXJlbnRzQi5wb3AoKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0sXG5cblx0XHRcInNldFwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBpbm5lckVxLFxuXHRcdFx0XHRvdXRlckVxID0gdHJ1ZTtcblxuXHRcdFx0aWYgKCBhLnNpemUgIT09IGIuc2l6ZSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRhLmZvckVhY2goIGZ1bmN0aW9uKCBhVmFsICkge1xuXHRcdFx0XHRpbm5lckVxID0gZmFsc2U7XG5cblx0XHRcdFx0Yi5mb3JFYWNoKCBmdW5jdGlvbiggYlZhbCApIHtcblx0XHRcdFx0XHRpZiAoIGlubmVyRXF1aXYoIGJWYWwsIGFWYWwgKSApIHtcblx0XHRcdFx0XHRcdGlubmVyRXEgPSB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdGlmICggIWlubmVyRXEgKSB7XG5cdFx0XHRcdFx0b3V0ZXJFcSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHRcdHJldHVybiBvdXRlckVxO1xuXHRcdH0sXG5cblx0XHRcIm1hcFwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBpbm5lckVxLFxuXHRcdFx0XHRvdXRlckVxID0gdHJ1ZTtcblxuXHRcdFx0aWYgKCBhLnNpemUgIT09IGIuc2l6ZSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRhLmZvckVhY2goIGZ1bmN0aW9uKCBhVmFsLCBhS2V5ICkge1xuXHRcdFx0XHRpbm5lckVxID0gZmFsc2U7XG5cblx0XHRcdFx0Yi5mb3JFYWNoKCBmdW5jdGlvbiggYlZhbCwgYktleSApIHtcblx0XHRcdFx0XHRpZiAoIGlubmVyRXF1aXYoIFsgYlZhbCwgYktleSBdLCBbIGFWYWwsIGFLZXkgXSApICkge1xuXHRcdFx0XHRcdFx0aW5uZXJFcSA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0aWYgKCAhaW5uZXJFcSApIHtcblx0XHRcdFx0XHRvdXRlckVxID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIG91dGVyRXE7XG5cdFx0fSxcblxuXHRcdFwib2JqZWN0XCI6IGZ1bmN0aW9uKCBiLCBhICkge1xuXHRcdFx0dmFyIGksIGosIGxvb3AsIGFDaXJjdWxhciwgYkNpcmN1bGFyO1xuXG5cdFx0XHQvLyBEZWZhdWx0IHRvIHRydWVcblx0XHRcdHZhciBlcSA9IHRydWU7XG5cdFx0XHR2YXIgYVByb3BlcnRpZXMgPSBbXTtcblx0XHRcdHZhciBiUHJvcGVydGllcyA9IFtdO1xuXG5cdFx0XHRpZiAoIGNvbXBhcmVDb25zdHJ1Y3RvcnMoIGEsIGIgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU3RhY2sgY29uc3RydWN0b3IgYmVmb3JlIHRyYXZlcnNpbmcgcHJvcGVydGllc1xuXHRcdFx0Y2FsbGVycy5wdXNoKCBhLmNvbnN0cnVjdG9yICk7XG5cblx0XHRcdC8vIFRyYWNrIHJlZmVyZW5jZSB0byBhdm9pZCBjaXJjdWxhciByZWZlcmVuY2VzXG5cdFx0XHRwYXJlbnRzLnB1c2goIGEgKTtcblx0XHRcdHBhcmVudHNCLnB1c2goIGIgKTtcblxuXHRcdFx0Ly8gQmUgc3RyaWN0OiBkb24ndCBlbnN1cmUgaGFzT3duUHJvcGVydHkgYW5kIGdvIGRlZXBcblx0XHRcdGZvciAoIGkgaW4gYSApIHtcblx0XHRcdFx0bG9vcCA9IGZhbHNlO1xuXHRcdFx0XHRmb3IgKCBqID0gMDsgaiA8IHBhcmVudHMubGVuZ3RoOyBqKysgKSB7XG5cdFx0XHRcdFx0YUNpcmN1bGFyID0gcGFyZW50c1sgaiBdID09PSBhWyBpIF07XG5cdFx0XHRcdFx0YkNpcmN1bGFyID0gcGFyZW50c0JbIGogXSA9PT0gYlsgaSBdO1xuXHRcdFx0XHRcdGlmICggYUNpcmN1bGFyIHx8IGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdGlmICggYVsgaSBdID09PSBiWyBpIF0gfHwgYUNpcmN1bGFyICYmIGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdFx0bG9vcCA9IHRydWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRlcSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YVByb3BlcnRpZXMucHVzaCggaSApO1xuXHRcdFx0XHRpZiAoICFsb29wICYmICFpbm5lckVxdWl2KCBhWyBpIF0sIGJbIGkgXSApICkge1xuXHRcdFx0XHRcdGVxID0gZmFsc2U7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cGFyZW50cy5wb3AoKTtcblx0XHRcdHBhcmVudHNCLnBvcCgpO1xuXG5cdFx0XHQvLyBVbnN0YWNrLCB3ZSBhcmUgZG9uZVxuXHRcdFx0Y2FsbGVycy5wb3AoKTtcblxuXHRcdFx0Zm9yICggaSBpbiBiICkge1xuXG5cdFx0XHRcdC8vIENvbGxlY3QgYidzIHByb3BlcnRpZXNcblx0XHRcdFx0YlByb3BlcnRpZXMucHVzaCggaSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBFbnN1cmVzIGlkZW50aWNhbCBwcm9wZXJ0aWVzIG5hbWVcblx0XHRcdHJldHVybiBlcSAmJiBpbm5lckVxdWl2KCBhUHJvcGVydGllcy5zb3J0KCksIGJQcm9wZXJ0aWVzLnNvcnQoKSApO1xuXHRcdH1cblx0fTtcblxuXHRmdW5jdGlvbiB0eXBlRXF1aXYoIGEsIGIgKSB7XG5cdFx0dmFyIHR5cGUgPSBRVW5pdC5vYmplY3RUeXBlKCBhICk7XG5cdFx0cmV0dXJuIFFVbml0Lm9iamVjdFR5cGUoIGIgKSA9PT0gdHlwZSAmJiBjYWxsYmFja3NbIHR5cGUgXSggYiwgYSApO1xuXHR9XG5cblx0Ly8gVGhlIHJlYWwgZXF1aXYgZnVuY3Rpb25cblx0ZnVuY3Rpb24gaW5uZXJFcXVpdiggYSwgYiApIHtcblxuXHRcdC8vIFdlJ3JlIGRvbmUgd2hlbiB0aGVyZSdzIG5vdGhpbmcgbW9yZSB0byBjb21wYXJlXG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoIDwgMiApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIFJlcXVpcmUgdHlwZS1zcGVjaWZpYyBlcXVhbGl0eVxuXHRcdHJldHVybiAoIGEgPT09IGIgfHwgdHlwZUVxdWl2KCBhLCBiICkgKSAmJlxuXG5cdFx0XHQvLyAuLi5hY3Jvc3MgYWxsIGNvbnNlY3V0aXZlIGFyZ3VtZW50IHBhaXJzXG5cdFx0XHQoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgfHwgaW5uZXJFcXVpdi5hcHBseSggdGhpcywgW10uc2xpY2UuY2FsbCggYXJndW1lbnRzLCAxICkgKSApO1xuXHR9XG5cblx0cmV0dXJuIGlubmVyRXF1aXY7XG59KCkgKTtcblxuLy8gQmFzZWQgb24ganNEdW1wIGJ5IEFyaWVsIEZsZXNsZXJcbi8vIGh0dHA6Ly9mbGVzbGVyLmJsb2dzcG90LmNvbS8yMDA4LzA1L2pzZHVtcC1wcmV0dHktZHVtcC1vZi1hbnktamF2YXNjcmlwdC5odG1sXG5RVW5pdC5kdW1wID0gKCBmdW5jdGlvbigpIHtcblx0ZnVuY3Rpb24gcXVvdGUoIHN0ciApIHtcblx0XHRyZXR1cm4gXCJcXFwiXCIgKyBzdHIudG9TdHJpbmcoKS5yZXBsYWNlKCAvXFxcXC9nLCBcIlxcXFxcXFxcXCIgKS5yZXBsYWNlKCAvXCIvZywgXCJcXFxcXFxcIlwiICkgKyBcIlxcXCJcIjtcblx0fVxuXHRmdW5jdGlvbiBsaXRlcmFsKCBvICkge1xuXHRcdHJldHVybiBvICsgXCJcIjtcblx0fVxuXHRmdW5jdGlvbiBqb2luKCBwcmUsIGFyciwgcG9zdCApIHtcblx0XHR2YXIgcyA9IGR1bXAuc2VwYXJhdG9yKCksXG5cdFx0XHRiYXNlID0gZHVtcC5pbmRlbnQoKSxcblx0XHRcdGlubmVyID0gZHVtcC5pbmRlbnQoIDEgKTtcblx0XHRpZiAoIGFyci5qb2luICkge1xuXHRcdFx0YXJyID0gYXJyLmpvaW4oIFwiLFwiICsgcyArIGlubmVyICk7XG5cdFx0fVxuXHRcdGlmICggIWFyciApIHtcblx0XHRcdHJldHVybiBwcmUgKyBwb3N0O1xuXHRcdH1cblx0XHRyZXR1cm4gWyBwcmUsIGlubmVyICsgYXJyLCBiYXNlICsgcG9zdCBdLmpvaW4oIHMgKTtcblx0fVxuXHRmdW5jdGlvbiBhcnJheSggYXJyLCBzdGFjayApIHtcblx0XHR2YXIgaSA9IGFyci5sZW5ndGgsXG5cdFx0XHRyZXQgPSBuZXcgQXJyYXkoIGkgKTtcblxuXHRcdGlmICggZHVtcC5tYXhEZXB0aCAmJiBkdW1wLmRlcHRoID4gZHVtcC5tYXhEZXB0aCApIHtcblx0XHRcdHJldHVybiBcIltvYmplY3QgQXJyYXldXCI7XG5cdFx0fVxuXG5cdFx0dGhpcy51cCgpO1xuXHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0cmV0WyBpIF0gPSB0aGlzLnBhcnNlKCBhcnJbIGkgXSwgdW5kZWZpbmVkLCBzdGFjayApO1xuXHRcdH1cblx0XHR0aGlzLmRvd24oKTtcblx0XHRyZXR1cm4gam9pbiggXCJbXCIsIHJldCwgXCJdXCIgKTtcblx0fVxuXG5cdHZhciByZU5hbWUgPSAvXmZ1bmN0aW9uIChcXHcrKS8sXG5cdFx0ZHVtcCA9IHtcblxuXHRcdFx0Ly8gVGhlIG9ialR5cGUgaXMgdXNlZCBtb3N0bHkgaW50ZXJuYWxseSwgeW91IGNhbiBmaXggYSAoY3VzdG9tKSB0eXBlIGluIGFkdmFuY2Vcblx0XHRcdHBhcnNlOiBmdW5jdGlvbiggb2JqLCBvYmpUeXBlLCBzdGFjayApIHtcblx0XHRcdFx0c3RhY2sgPSBzdGFjayB8fCBbXTtcblx0XHRcdFx0dmFyIHJlcywgcGFyc2VyLCBwYXJzZXJUeXBlLFxuXHRcdFx0XHRcdGluU3RhY2sgPSBpbkFycmF5KCBvYmosIHN0YWNrICk7XG5cblx0XHRcdFx0aWYgKCBpblN0YWNrICE9PSAtMSApIHtcblx0XHRcdFx0XHRyZXR1cm4gXCJyZWN1cnNpb24oXCIgKyAoIGluU3RhY2sgLSBzdGFjay5sZW5ndGggKSArIFwiKVwiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0b2JqVHlwZSA9IG9ialR5cGUgfHwgdGhpcy50eXBlT2YoIG9iaiAgKTtcblx0XHRcdFx0cGFyc2VyID0gdGhpcy5wYXJzZXJzWyBvYmpUeXBlIF07XG5cdFx0XHRcdHBhcnNlclR5cGUgPSB0eXBlb2YgcGFyc2VyO1xuXG5cdFx0XHRcdGlmICggcGFyc2VyVHlwZSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHRcdHN0YWNrLnB1c2goIG9iaiApO1xuXHRcdFx0XHRcdHJlcyA9IHBhcnNlci5jYWxsKCB0aGlzLCBvYmosIHN0YWNrICk7XG5cdFx0XHRcdFx0c3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0cmV0dXJuIHJlcztcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gKCBwYXJzZXJUeXBlID09PSBcInN0cmluZ1wiICkgPyBwYXJzZXIgOiB0aGlzLnBhcnNlcnMuZXJyb3I7XG5cdFx0XHR9LFxuXHRcdFx0dHlwZU9mOiBmdW5jdGlvbiggb2JqICkge1xuXHRcdFx0XHR2YXIgdHlwZTtcblx0XHRcdFx0aWYgKCBvYmogPT09IG51bGwgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwibnVsbFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCB0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcInVuZGVmaW5lZFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBRVW5pdC5pcyggXCJyZWdleHBcIiwgb2JqICkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwicmVnZXhwXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIFFVbml0LmlzKCBcImRhdGVcIiwgb2JqICkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiZGF0ZVwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBRVW5pdC5pcyggXCJmdW5jdGlvblwiLCBvYmogKSApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJmdW5jdGlvblwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBvYmouc2V0SW50ZXJ2YWwgIT09IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdFx0b2JqLmRvY3VtZW50ICE9PSB1bmRlZmluZWQgJiZcblx0XHRcdFx0XHRcdG9iai5ub2RlVHlwZSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcIndpbmRvd1wiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBvYmoubm9kZVR5cGUgPT09IDkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiZG9jdW1lbnRcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggb2JqLm5vZGVUeXBlICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcIm5vZGVcIjtcblx0XHRcdFx0fSBlbHNlIGlmIChcblxuXHRcdFx0XHRcdC8vIE5hdGl2ZSBhcnJheXNcblx0XHRcdFx0XHR0b1N0cmluZy5jYWxsKCBvYmogKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiIHx8XG5cblx0XHRcdFx0XHQvLyBOb2RlTGlzdCBvYmplY3RzXG5cdFx0XHRcdFx0KCB0eXBlb2Ygb2JqLmxlbmd0aCA9PT0gXCJudW1iZXJcIiAmJiBvYmouaXRlbSAhPT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0KCBvYmoubGVuZ3RoID8gb2JqLml0ZW0oIDAgKSA9PT0gb2JqWyAwIF0gOiAoIG9iai5pdGVtKCAwICkgPT09IG51bGwgJiZcblx0XHRcdFx0XHRvYmpbIDAgXSA9PT0gdW5kZWZpbmVkICkgKSApXG5cdFx0XHRcdCkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImFycmF5XCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG9iai5jb25zdHJ1Y3RvciA9PT0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImVycm9yXCI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dHlwZSA9IHR5cGVvZiBvYmo7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHR5cGU7XG5cdFx0XHR9LFxuXG5cdFx0XHRzZXBhcmF0b3I6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5tdWx0aWxpbmUgPyB0aGlzLkhUTUwgPyBcIjxiciAvPlwiIDogXCJcXG5cIiA6IHRoaXMuSFRNTCA/IFwiJiMxNjA7XCIgOiBcIiBcIjtcblx0XHRcdH0sXG5cblx0XHRcdC8vIEV4dHJhIGNhbiBiZSBhIG51bWJlciwgc2hvcnRjdXQgZm9yIGluY3JlYXNpbmctY2FsbGluZy1kZWNyZWFzaW5nXG5cdFx0XHRpbmRlbnQ6IGZ1bmN0aW9uKCBleHRyYSApIHtcblx0XHRcdFx0aWYgKCAhdGhpcy5tdWx0aWxpbmUgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGNociA9IHRoaXMuaW5kZW50Q2hhcjtcblx0XHRcdFx0aWYgKCB0aGlzLkhUTUwgKSB7XG5cdFx0XHRcdFx0Y2hyID0gY2hyLnJlcGxhY2UoIC9cXHQvZywgXCIgICBcIiApLnJlcGxhY2UoIC8gL2csIFwiJiMxNjA7XCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbmV3IEFycmF5KCB0aGlzLmRlcHRoICsgKCBleHRyYSB8fCAwICkgKS5qb2luKCBjaHIgKTtcblx0XHRcdH0sXG5cdFx0XHR1cDogZnVuY3Rpb24oIGEgKSB7XG5cdFx0XHRcdHRoaXMuZGVwdGggKz0gYSB8fCAxO1xuXHRcdFx0fSxcblx0XHRcdGRvd246IGZ1bmN0aW9uKCBhICkge1xuXHRcdFx0XHR0aGlzLmRlcHRoIC09IGEgfHwgMTtcblx0XHRcdH0sXG5cdFx0XHRzZXRQYXJzZXI6IGZ1bmN0aW9uKCBuYW1lLCBwYXJzZXIgKSB7XG5cdFx0XHRcdHRoaXMucGFyc2Vyc1sgbmFtZSBdID0gcGFyc2VyO1xuXHRcdFx0fSxcblxuXHRcdFx0Ly8gVGhlIG5leHQgMyBhcmUgZXhwb3NlZCBzbyB5b3UgY2FuIHVzZSB0aGVtXG5cdFx0XHRxdW90ZTogcXVvdGUsXG5cdFx0XHRsaXRlcmFsOiBsaXRlcmFsLFxuXHRcdFx0am9pbjogam9pbixcblx0XHRcdGRlcHRoOiAxLFxuXHRcdFx0bWF4RGVwdGg6IFFVbml0LmNvbmZpZy5tYXhEZXB0aCxcblxuXHRcdFx0Ly8gVGhpcyBpcyB0aGUgbGlzdCBvZiBwYXJzZXJzLCB0byBtb2RpZnkgdGhlbSwgdXNlIGR1bXAuc2V0UGFyc2VyXG5cdFx0XHRwYXJzZXJzOiB7XG5cdFx0XHRcdHdpbmRvdzogXCJbV2luZG93XVwiLFxuXHRcdFx0XHRkb2N1bWVudDogXCJbRG9jdW1lbnRdXCIsXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbiggZXJyb3IgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFwiRXJyb3IoXFxcIlwiICsgZXJyb3IubWVzc2FnZSArIFwiXFxcIilcIjtcblx0XHRcdFx0fSxcblx0XHRcdFx0dW5rbm93bjogXCJbVW5rbm93bl1cIixcblx0XHRcdFx0XCJudWxsXCI6IFwibnVsbFwiLFxuXHRcdFx0XHRcInVuZGVmaW5lZFwiOiBcInVuZGVmaW5lZFwiLFxuXHRcdFx0XHRcImZ1bmN0aW9uXCI6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0XHR2YXIgcmV0ID0gXCJmdW5jdGlvblwiLFxuXG5cdFx0XHRcdFx0XHQvLyBGdW5jdGlvbnMgbmV2ZXIgaGF2ZSBuYW1lIGluIElFXG5cdFx0XHRcdFx0XHRuYW1lID0gXCJuYW1lXCIgaW4gZm4gPyBmbi5uYW1lIDogKCByZU5hbWUuZXhlYyggZm4gKSB8fCBbXSApWyAxIF07XG5cblx0XHRcdFx0XHRpZiAoIG5hbWUgKSB7XG5cdFx0XHRcdFx0XHRyZXQgKz0gXCIgXCIgKyBuYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXQgKz0gXCIoXCI7XG5cblx0XHRcdFx0XHRyZXQgPSBbIHJldCwgZHVtcC5wYXJzZSggZm4sIFwiZnVuY3Rpb25BcmdzXCIgKSwgXCIpe1wiIF0uam9pbiggXCJcIiApO1xuXHRcdFx0XHRcdHJldHVybiBqb2luKCByZXQsIGR1bXAucGFyc2UoIGZuLCBcImZ1bmN0aW9uQ29kZVwiICksIFwifVwiICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFycmF5OiBhcnJheSxcblx0XHRcdFx0bm9kZWxpc3Q6IGFycmF5LFxuXHRcdFx0XHRcImFyZ3VtZW50c1wiOiBhcnJheSxcblx0XHRcdFx0b2JqZWN0OiBmdW5jdGlvbiggbWFwLCBzdGFjayApIHtcblx0XHRcdFx0XHR2YXIga2V5cywga2V5LCB2YWwsIGksIG5vbkVudW1lcmFibGVQcm9wZXJ0aWVzLFxuXHRcdFx0XHRcdFx0cmV0ID0gW107XG5cblx0XHRcdFx0XHRpZiAoIGR1bXAubWF4RGVwdGggJiYgZHVtcC5kZXB0aCA+IGR1bXAubWF4RGVwdGggKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJbb2JqZWN0IE9iamVjdF1cIjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRkdW1wLnVwKCk7XG5cdFx0XHRcdFx0a2V5cyA9IFtdO1xuXHRcdFx0XHRcdGZvciAoIGtleSBpbiBtYXAgKSB7XG5cdFx0XHRcdFx0XHRrZXlzLnB1c2goIGtleSApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFNvbWUgcHJvcGVydGllcyBhcmUgbm90IGFsd2F5cyBlbnVtZXJhYmxlIG9uIEVycm9yIG9iamVjdHMuXG5cdFx0XHRcdFx0bm9uRW51bWVyYWJsZVByb3BlcnRpZXMgPSBbIFwibWVzc2FnZVwiLCBcIm5hbWVcIiBdO1xuXHRcdFx0XHRcdGZvciAoIGkgaW4gbm9uRW51bWVyYWJsZVByb3BlcnRpZXMgKSB7XG5cdFx0XHRcdFx0XHRrZXkgPSBub25FbnVtZXJhYmxlUHJvcGVydGllc1sgaSBdO1xuXHRcdFx0XHRcdFx0aWYgKCBrZXkgaW4gbWFwICYmIGluQXJyYXkoIGtleSwga2V5cyApIDwgMCApIHtcblx0XHRcdFx0XHRcdFx0a2V5cy5wdXNoKCBrZXkgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0a2V5cy5zb3J0KCk7XG5cdFx0XHRcdFx0Zm9yICggaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRcdFx0a2V5ID0ga2V5c1sgaSBdO1xuXHRcdFx0XHRcdFx0dmFsID0gbWFwWyBrZXkgXTtcblx0XHRcdFx0XHRcdHJldC5wdXNoKCBkdW1wLnBhcnNlKCBrZXksIFwia2V5XCIgKSArIFwiOiBcIiArXG5cdFx0XHRcdFx0XHRcdGR1bXAucGFyc2UoIHZhbCwgdW5kZWZpbmVkLCBzdGFjayApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGR1bXAuZG93bigpO1xuXHRcdFx0XHRcdHJldHVybiBqb2luKCBcIntcIiwgcmV0LCBcIn1cIiApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRub2RlOiBmdW5jdGlvbiggbm9kZSApIHtcblx0XHRcdFx0XHR2YXIgbGVuLCBpLCB2YWwsXG5cdFx0XHRcdFx0XHRvcGVuID0gZHVtcC5IVE1MID8gXCImbHQ7XCIgOiBcIjxcIixcblx0XHRcdFx0XHRcdGNsb3NlID0gZHVtcC5IVE1MID8gXCImZ3Q7XCIgOiBcIj5cIixcblx0XHRcdFx0XHRcdHRhZyA9IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSxcblx0XHRcdFx0XHRcdHJldCA9IG9wZW4gKyB0YWcsXG5cdFx0XHRcdFx0XHRhdHRycyA9IG5vZGUuYXR0cmlidXRlcztcblxuXHRcdFx0XHRcdGlmICggYXR0cnMgKSB7XG5cdFx0XHRcdFx0XHRmb3IgKCBpID0gMCwgbGVuID0gYXR0cnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0XHRcdFx0XHRcdHZhbCA9IGF0dHJzWyBpIF0ubm9kZVZhbHVlO1xuXG5cdFx0XHRcdFx0XHRcdC8vIElFNiBpbmNsdWRlcyBhbGwgYXR0cmlidXRlcyBpbiAuYXR0cmlidXRlcywgZXZlbiBvbmVzIG5vdCBleHBsaWNpdGx5XG5cdFx0XHRcdFx0XHRcdC8vIHNldC4gVGhvc2UgaGF2ZSB2YWx1ZXMgbGlrZSB1bmRlZmluZWQsIG51bGwsIDAsIGZhbHNlLCBcIlwiIG9yXG5cdFx0XHRcdFx0XHRcdC8vIFwiaW5oZXJpdFwiLlxuXHRcdFx0XHRcdFx0XHRpZiAoIHZhbCAmJiB2YWwgIT09IFwiaW5oZXJpdFwiICkge1xuXHRcdFx0XHRcdFx0XHRcdHJldCArPSBcIiBcIiArIGF0dHJzWyBpIF0ubm9kZU5hbWUgKyBcIj1cIiArXG5cdFx0XHRcdFx0XHRcdFx0XHRkdW1wLnBhcnNlKCB2YWwsIFwiYXR0cmlidXRlXCIgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXQgKz0gY2xvc2U7XG5cblx0XHRcdFx0XHQvLyBTaG93IGNvbnRlbnQgb2YgVGV4dE5vZGUgb3IgQ0RBVEFTZWN0aW9uXG5cdFx0XHRcdFx0aWYgKCBub2RlLm5vZGVUeXBlID09PSAzIHx8IG5vZGUubm9kZVR5cGUgPT09IDQgKSB7XG5cdFx0XHRcdFx0XHRyZXQgKz0gbm9kZS5ub2RlVmFsdWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIHJldCArIG9wZW4gKyBcIi9cIiArIHRhZyArIGNsb3NlO1xuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdC8vIEZ1bmN0aW9uIGNhbGxzIGl0IGludGVybmFsbHksIGl0J3MgdGhlIGFyZ3VtZW50cyBwYXJ0IG9mIHRoZSBmdW5jdGlvblxuXHRcdFx0XHRmdW5jdGlvbkFyZ3M6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0XHR2YXIgYXJncyxcblx0XHRcdFx0XHRcdGwgPSBmbi5sZW5ndGg7XG5cblx0XHRcdFx0XHRpZiAoICFsICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YXJncyA9IG5ldyBBcnJheSggbCApO1xuXHRcdFx0XHRcdHdoaWxlICggbC0tICkge1xuXG5cdFx0XHRcdFx0XHQvLyA5NyBpcyAnYSdcblx0XHRcdFx0XHRcdGFyZ3NbIGwgXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoIDk3ICsgbCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gXCIgXCIgKyBhcmdzLmpvaW4oIFwiLCBcIiApICsgXCIgXCI7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Ly8gT2JqZWN0IGNhbGxzIGl0IGludGVybmFsbHksIHRoZSBrZXkgcGFydCBvZiBhbiBpdGVtIGluIGEgbWFwXG5cdFx0XHRcdGtleTogcXVvdGUsXG5cblx0XHRcdFx0Ly8gRnVuY3Rpb24gY2FsbHMgaXQgaW50ZXJuYWxseSwgaXQncyB0aGUgY29udGVudCBvZiB0aGUgZnVuY3Rpb25cblx0XHRcdFx0ZnVuY3Rpb25Db2RlOiBcIltjb2RlXVwiLFxuXG5cdFx0XHRcdC8vIE5vZGUgY2FsbHMgaXQgaW50ZXJuYWxseSwgaXQncyBhIGh0bWwgYXR0cmlidXRlIHZhbHVlXG5cdFx0XHRcdGF0dHJpYnV0ZTogcXVvdGUsXG5cdFx0XHRcdHN0cmluZzogcXVvdGUsXG5cdFx0XHRcdGRhdGU6IHF1b3RlLFxuXHRcdFx0XHRyZWdleHA6IGxpdGVyYWwsXG5cdFx0XHRcdG51bWJlcjogbGl0ZXJhbCxcblx0XHRcdFx0XCJib29sZWFuXCI6IGxpdGVyYWxcblx0XHRcdH0sXG5cblx0XHRcdC8vIElmIHRydWUsIGVudGl0aWVzIGFyZSBlc2NhcGVkICggPCwgPiwgXFx0LCBzcGFjZSBhbmQgXFxuIClcblx0XHRcdEhUTUw6IGZhbHNlLFxuXG5cdFx0XHQvLyBJbmRlbnRhdGlvbiB1bml0XG5cdFx0XHRpbmRlbnRDaGFyOiBcIiAgXCIsXG5cblx0XHRcdC8vIElmIHRydWUsIGl0ZW1zIGluIGEgY29sbGVjdGlvbiwgYXJlIHNlcGFyYXRlZCBieSBhIFxcbiwgZWxzZSBqdXN0IGEgc3BhY2UuXG5cdFx0XHRtdWx0aWxpbmU6IHRydWVcblx0XHR9O1xuXG5cdHJldHVybiBkdW1wO1xufSgpICk7XG5cbi8vIEJhY2sgY29tcGF0XG5RVW5pdC5qc0R1bXAgPSBRVW5pdC5kdW1wO1xuXG4vLyBEZXByZWNhdGVkXG4vLyBFeHRlbmQgYXNzZXJ0IG1ldGhvZHMgdG8gUVVuaXQgZm9yIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG4oIGZ1bmN0aW9uKCkge1xuXHR2YXIgaSxcblx0XHRhc3NlcnRpb25zID0gQXNzZXJ0LnByb3RvdHlwZTtcblxuXHRmdW5jdGlvbiBhcHBseUN1cnJlbnQoIGN1cnJlbnQgKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFzc2VydCA9IG5ldyBBc3NlcnQoIFFVbml0LmNvbmZpZy5jdXJyZW50ICk7XG5cdFx0XHRjdXJyZW50LmFwcGx5KCBhc3NlcnQsIGFyZ3VtZW50cyApO1xuXHRcdH07XG5cdH1cblxuXHRmb3IgKCBpIGluIGFzc2VydGlvbnMgKSB7XG5cdFx0UVVuaXRbIGkgXSA9IGFwcGx5Q3VycmVudCggYXNzZXJ0aW9uc1sgaSBdICk7XG5cdH1cbn0oKSApO1xuXG4vLyBGb3IgYnJvd3NlciwgZXhwb3J0IG9ubHkgc2VsZWN0IGdsb2JhbHNcbmlmICggZGVmaW5lZC5kb2N1bWVudCApIHtcblxuXHQoIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpLCBsLFxuXHRcdFx0a2V5cyA9IFtcblx0XHRcdFx0XCJ0ZXN0XCIsXG5cdFx0XHRcdFwibW9kdWxlXCIsXG5cdFx0XHRcdFwiZXhwZWN0XCIsXG5cdFx0XHRcdFwiYXN5bmNUZXN0XCIsXG5cdFx0XHRcdFwic3RhcnRcIixcblx0XHRcdFx0XCJzdG9wXCIsXG5cdFx0XHRcdFwib2tcIixcblx0XHRcdFx0XCJub3RPa1wiLFxuXHRcdFx0XHRcImVxdWFsXCIsXG5cdFx0XHRcdFwibm90RXF1YWxcIixcblx0XHRcdFx0XCJwcm9wRXF1YWxcIixcblx0XHRcdFx0XCJub3RQcm9wRXF1YWxcIixcblx0XHRcdFx0XCJkZWVwRXF1YWxcIixcblx0XHRcdFx0XCJub3REZWVwRXF1YWxcIixcblx0XHRcdFx0XCJzdHJpY3RFcXVhbFwiLFxuXHRcdFx0XHRcIm5vdFN0cmljdEVxdWFsXCIsXG5cdFx0XHRcdFwidGhyb3dzXCIsXG5cdFx0XHRcdFwicmFpc2VzXCJcblx0XHRcdF07XG5cblx0XHRmb3IgKCBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0d2luZG93WyBrZXlzWyBpIF0gXSA9IFFVbml0WyBrZXlzWyBpIF0gXTtcblx0XHR9XG5cdH0oKSApO1xuXG5cdHdpbmRvdy5RVW5pdCA9IFFVbml0O1xufVxuXG4vLyBGb3Igbm9kZWpzXG5pZiAoIHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlICYmIG1vZHVsZS5leHBvcnRzICkge1xuXHRtb2R1bGUuZXhwb3J0cyA9IFFVbml0O1xuXG5cdC8vIEZvciBjb25zaXN0ZW5jeSB3aXRoIENvbW1vbkpTIGVudmlyb25tZW50cycgZXhwb3J0c1xuXHRtb2R1bGUuZXhwb3J0cy5RVW5pdCA9IFFVbml0O1xufVxuXG4vLyBGb3IgQ29tbW9uSlMgd2l0aCBleHBvcnRzLCBidXQgd2l0aG91dCBtb2R1bGUuZXhwb3J0cywgbGlrZSBSaGlub1xuaWYgKCB0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBleHBvcnRzICkge1xuXHRleHBvcnRzLlFVbml0ID0gUVVuaXQ7XG59XG5cbmlmICggdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQgKSB7XG5cdGRlZmluZSggZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFFVbml0O1xuXHR9ICk7XG5cdFFVbml0LmNvbmZpZy5hdXRvc3RhcnQgPSBmYWxzZTtcbn1cblxuLy8gR2V0IGEgcmVmZXJlbmNlIHRvIHRoZSBnbG9iYWwgb2JqZWN0LCBsaWtlIHdpbmRvdyBpbiBicm93c2Vyc1xufSggKCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXM7XG59KCkgKSApICk7XG5cbiggZnVuY3Rpb24oKSB7XG5cbi8vIE9ubHkgaW50ZXJhY3Qgd2l0aCBVUkxzIHZpYSB3aW5kb3cubG9jYXRpb25cbnZhciBsb2NhdGlvbiA9IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2F0aW9uO1xuaWYgKCAhbG9jYXRpb24gKSB7XG5cdHJldHVybjtcbn1cblxudmFyIHVybFBhcmFtcyA9IGdldFVybFBhcmFtcygpO1xuXG5RVW5pdC51cmxQYXJhbXMgPSB1cmxQYXJhbXM7XG5cbi8vIE1hdGNoIG1vZHVsZS90ZXN0IGJ5IGluY2x1c2lvbiBpbiBhbiBhcnJheVxuUVVuaXQuY29uZmlnLm1vZHVsZUlkID0gW10uY29uY2F0KCB1cmxQYXJhbXMubW9kdWxlSWQgfHwgW10gKTtcblFVbml0LmNvbmZpZy50ZXN0SWQgPSBbXS5jb25jYXQoIHVybFBhcmFtcy50ZXN0SWQgfHwgW10gKTtcblxuLy8gRXhhY3QgY2FzZS1pbnNlbnNpdGl2ZSBtYXRjaCBvZiB0aGUgbW9kdWxlIG5hbWVcblFVbml0LmNvbmZpZy5tb2R1bGUgPSB1cmxQYXJhbXMubW9kdWxlO1xuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gb3IgY2FzZS1pbnNlbnN0aXZlIHN1YnN0cmluZyBtYXRjaCBhZ2FpbnN0IFwibW9kdWxlTmFtZTogdGVzdE5hbWVcIlxuUVVuaXQuY29uZmlnLmZpbHRlciA9IHVybFBhcmFtcy5maWx0ZXI7XG5cbi8vIFRlc3Qgb3JkZXIgcmFuZG9taXphdGlvblxuaWYgKCB1cmxQYXJhbXMuc2VlZCA9PT0gdHJ1ZSApIHtcblxuXHQvLyBHZW5lcmF0ZSBhIHJhbmRvbSBzZWVkIGlmIHRoZSBvcHRpb24gaXMgc3BlY2lmaWVkIHdpdGhvdXQgYSB2YWx1ZVxuXHRRVW5pdC5jb25maWcuc2VlZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoIDM2ICkuc2xpY2UoIDIgKTtcbn0gZWxzZSBpZiAoIHVybFBhcmFtcy5zZWVkICkge1xuXHRRVW5pdC5jb25maWcuc2VlZCA9IHVybFBhcmFtcy5zZWVkO1xufVxuXG4vLyBBZGQgVVJMLXBhcmFtZXRlci1tYXBwZWQgY29uZmlnIHZhbHVlcyB3aXRoIFVJIGZvcm0gcmVuZGVyaW5nIGRhdGFcblFVbml0LmNvbmZpZy51cmxDb25maWcucHVzaChcblx0e1xuXHRcdGlkOiBcImhpZGVwYXNzZWRcIixcblx0XHRsYWJlbDogXCJIaWRlIHBhc3NlZCB0ZXN0c1wiLFxuXHRcdHRvb2x0aXA6IFwiT25seSBzaG93IHRlc3RzIGFuZCBhc3NlcnRpb25zIHRoYXQgZmFpbC4gU3RvcmVkIGFzIHF1ZXJ5LXN0cmluZ3MuXCJcblx0fSxcblx0e1xuXHRcdGlkOiBcIm5vZ2xvYmFsc1wiLFxuXHRcdGxhYmVsOiBcIkNoZWNrIGZvciBHbG9iYWxzXCIsXG5cdFx0dG9vbHRpcDogXCJFbmFibGluZyB0aGlzIHdpbGwgdGVzdCBpZiBhbnkgdGVzdCBpbnRyb2R1Y2VzIG5ldyBwcm9wZXJ0aWVzIG9uIHRoZSBcIiArXG5cdFx0XHRcImdsb2JhbCBvYmplY3QgKGB3aW5kb3dgIGluIEJyb3dzZXJzKS4gU3RvcmVkIGFzIHF1ZXJ5LXN0cmluZ3MuXCJcblx0fSxcblx0e1xuXHRcdGlkOiBcIm5vdHJ5Y2F0Y2hcIixcblx0XHRsYWJlbDogXCJObyB0cnktY2F0Y2hcIixcblx0XHR0b29sdGlwOiBcIkVuYWJsaW5nIHRoaXMgd2lsbCBydW4gdGVzdHMgb3V0c2lkZSBvZiBhIHRyeS1jYXRjaCBibG9jay4gTWFrZXMgZGVidWdnaW5nIFwiICtcblx0XHRcdFwiZXhjZXB0aW9ucyBpbiBJRSByZWFzb25hYmxlLiBTdG9yZWQgYXMgcXVlcnktc3RyaW5ncy5cIlxuXHR9XG4pO1xuXG5RVW5pdC5iZWdpbiggZnVuY3Rpb24oKSB7XG5cdHZhciBpLCBvcHRpb24sXG5cdFx0dXJsQ29uZmlnID0gUVVuaXQuY29uZmlnLnVybENvbmZpZztcblxuXHRmb3IgKCBpID0gMDsgaSA8IHVybENvbmZpZy5sZW5ndGg7IGkrKyApIHtcblxuXHRcdC8vIE9wdGlvbnMgY2FuIGJlIGVpdGhlciBzdHJpbmdzIG9yIG9iamVjdHMgd2l0aCBub25lbXB0eSBcImlkXCIgcHJvcGVydGllc1xuXHRcdG9wdGlvbiA9IFFVbml0LmNvbmZpZy51cmxDb25maWdbIGkgXTtcblx0XHRpZiAoIHR5cGVvZiBvcHRpb24gIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRvcHRpb24gPSBvcHRpb24uaWQ7XG5cdFx0fVxuXG5cdFx0aWYgKCBRVW5pdC5jb25maWdbIG9wdGlvbiBdID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRRVW5pdC5jb25maWdbIG9wdGlvbiBdID0gdXJsUGFyYW1zWyBvcHRpb24gXTtcblx0XHR9XG5cdH1cbn0gKTtcblxuZnVuY3Rpb24gZ2V0VXJsUGFyYW1zKCkge1xuXHR2YXIgaSwgcGFyYW0sIG5hbWUsIHZhbHVlO1xuXHR2YXIgdXJsUGFyYW1zID0ge307XG5cdHZhciBwYXJhbXMgPSBsb2NhdGlvbi5zZWFyY2guc2xpY2UoIDEgKS5zcGxpdCggXCImXCIgKTtcblx0dmFyIGxlbmd0aCA9IHBhcmFtcy5sZW5ndGg7XG5cblx0Zm9yICggaSA9IDA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRpZiAoIHBhcmFtc1sgaSBdICkge1xuXHRcdFx0cGFyYW0gPSBwYXJhbXNbIGkgXS5zcGxpdCggXCI9XCIgKTtcblx0XHRcdG5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQoIHBhcmFtWyAwIF0gKTtcblxuXHRcdFx0Ly8gQWxsb3cganVzdCBhIGtleSB0byB0dXJuIG9uIGEgZmxhZywgZS5nLiwgdGVzdC5odG1sP25vZ2xvYmFsc1xuXHRcdFx0dmFsdWUgPSBwYXJhbS5sZW5ndGggPT09IDEgfHxcblx0XHRcdFx0ZGVjb2RlVVJJQ29tcG9uZW50KCBwYXJhbS5zbGljZSggMSApLmpvaW4oIFwiPVwiICkgKSA7XG5cdFx0XHRpZiAoIHVybFBhcmFtc1sgbmFtZSBdICkge1xuXHRcdFx0XHR1cmxQYXJhbXNbIG5hbWUgXSA9IFtdLmNvbmNhdCggdXJsUGFyYW1zWyBuYW1lIF0sIHZhbHVlICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1cmxQYXJhbXNbIG5hbWUgXSA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB1cmxQYXJhbXM7XG59XG5cbi8vIERvbid0IGxvYWQgdGhlIEhUTUwgUmVwb3J0ZXIgb24gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRzXG5pZiAoIHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIgfHwgIXdpbmRvdy5kb2N1bWVudCApIHtcblx0cmV0dXJuO1xufVxuXG4vLyBEZXByZWNhdGVkIFFVbml0LmluaXQgLSBSZWYgIzUzMFxuLy8gUmUtaW5pdGlhbGl6ZSB0aGUgY29uZmlndXJhdGlvbiBvcHRpb25zXG5RVW5pdC5pbml0ID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjb25maWcgPSBRVW5pdC5jb25maWc7XG5cblx0Y29uZmlnLnN0YXRzID0geyBhbGw6IDAsIGJhZDogMCB9O1xuXHRjb25maWcubW9kdWxlU3RhdHMgPSB7IGFsbDogMCwgYmFkOiAwIH07XG5cdGNvbmZpZy5zdGFydGVkID0gMDtcblx0Y29uZmlnLnVwZGF0ZVJhdGUgPSAxMDAwO1xuXHRjb25maWcuYmxvY2tpbmcgPSBmYWxzZTtcblx0Y29uZmlnLmF1dG9zdGFydCA9IHRydWU7XG5cdGNvbmZpZy5hdXRvcnVuID0gZmFsc2U7XG5cdGNvbmZpZy5maWx0ZXIgPSBcIlwiO1xuXHRjb25maWcucXVldWUgPSBbXTtcblxuXHRhcHBlbmRJbnRlcmZhY2UoKTtcbn07XG5cbnZhciBjb25maWcgPSBRVW5pdC5jb25maWcsXG5cdGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50LFxuXHRjb2xsYXBzZU5leHQgPSBmYWxzZSxcblx0aGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0dW5maWx0ZXJlZFVybCA9IHNldFVybCggeyBmaWx0ZXI6IHVuZGVmaW5lZCwgbW9kdWxlOiB1bmRlZmluZWQsXG5cdFx0bW9kdWxlSWQ6IHVuZGVmaW5lZCwgdGVzdElkOiB1bmRlZmluZWQgfSApLFxuXHRkZWZpbmVkID0ge1xuXHRcdHNlc3Npb25TdG9yYWdlOiAoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHggPSBcInF1bml0LXRlc3Qtc3RyaW5nXCI7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCB4LCB4ICk7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIHggKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0oKSApXG5cdH0sXG5cdG1vZHVsZXNMaXN0ID0gW107XG5cbi8qKlxuKiBFc2NhcGUgdGV4dCBmb3IgYXR0cmlidXRlIG9yIHRleHQgY29udGVudC5cbiovXG5mdW5jdGlvbiBlc2NhcGVUZXh0KCBzICkge1xuXHRpZiAoICFzICkge1xuXHRcdHJldHVybiBcIlwiO1xuXHR9XG5cdHMgPSBzICsgXCJcIjtcblxuXHQvLyBCb3RoIHNpbmdsZSBxdW90ZXMgYW5kIGRvdWJsZSBxdW90ZXMgKGZvciBhdHRyaWJ1dGVzKVxuXHRyZXR1cm4gcy5yZXBsYWNlKCAvWydcIjw+Jl0vZywgZnVuY3Rpb24oIHMgKSB7XG5cdFx0c3dpdGNoICggcyApIHtcblx0XHRjYXNlIFwiJ1wiOlxuXHRcdFx0cmV0dXJuIFwiJiMwMzk7XCI7XG5cdFx0Y2FzZSBcIlxcXCJcIjpcblx0XHRcdHJldHVybiBcIiZxdW90O1wiO1xuXHRcdGNhc2UgXCI8XCI6XG5cdFx0XHRyZXR1cm4gXCImbHQ7XCI7XG5cdFx0Y2FzZSBcIj5cIjpcblx0XHRcdHJldHVybiBcIiZndDtcIjtcblx0XHRjYXNlIFwiJlwiOlxuXHRcdFx0cmV0dXJuIFwiJmFtcDtcIjtcblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuZnVuY3Rpb24gYWRkRXZlbnQoIGVsZW0sIHR5cGUsIGZuICkge1xuXHRpZiAoIGVsZW0uYWRkRXZlbnRMaXN0ZW5lciApIHtcblxuXHRcdC8vIFN0YW5kYXJkcy1iYXNlZCBicm93c2Vyc1xuXHRcdGVsZW0uYWRkRXZlbnRMaXN0ZW5lciggdHlwZSwgZm4sIGZhbHNlICk7XG5cdH0gZWxzZSBpZiAoIGVsZW0uYXR0YWNoRXZlbnQgKSB7XG5cblx0XHQvLyBTdXBwb3J0OiBJRSA8OVxuXHRcdGVsZW0uYXR0YWNoRXZlbnQoIFwib25cIiArIHR5cGUsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50ID0gd2luZG93LmV2ZW50O1xuXHRcdFx0aWYgKCAhZXZlbnQudGFyZ2V0ICkge1xuXHRcdFx0XHRldmVudC50YXJnZXQgPSBldmVudC5zcmNFbGVtZW50IHx8IGRvY3VtZW50O1xuXHRcdFx0fVxuXG5cdFx0XHRmbi5jYWxsKCBlbGVtLCBldmVudCApO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl8Tm9kZUxpc3R9IGVsZW1zXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuZnVuY3Rpb24gYWRkRXZlbnRzKCBlbGVtcywgdHlwZSwgZm4gKSB7XG5cdHZhciBpID0gZWxlbXMubGVuZ3RoO1xuXHR3aGlsZSAoIGktLSApIHtcblx0XHRhZGRFdmVudCggZWxlbXNbIGkgXSwgdHlwZSwgZm4gKTtcblx0fVxufVxuXG5mdW5jdGlvbiBoYXNDbGFzcyggZWxlbSwgbmFtZSApIHtcblx0cmV0dXJuICggXCIgXCIgKyBlbGVtLmNsYXNzTmFtZSArIFwiIFwiICkuaW5kZXhPZiggXCIgXCIgKyBuYW1lICsgXCIgXCIgKSA+PSAwO1xufVxuXG5mdW5jdGlvbiBhZGRDbGFzcyggZWxlbSwgbmFtZSApIHtcblx0aWYgKCAhaGFzQ2xhc3MoIGVsZW0sIG5hbWUgKSApIHtcblx0XHRlbGVtLmNsYXNzTmFtZSArPSAoIGVsZW0uY2xhc3NOYW1lID8gXCIgXCIgOiBcIlwiICkgKyBuYW1lO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUNsYXNzKCBlbGVtLCBuYW1lLCBmb3JjZSApIHtcblx0aWYgKCBmb3JjZSB8fCB0eXBlb2YgZm9yY2UgPT09IFwidW5kZWZpbmVkXCIgJiYgIWhhc0NsYXNzKCBlbGVtLCBuYW1lICkgKSB7XG5cdFx0YWRkQ2xhc3MoIGVsZW0sIG5hbWUgKTtcblx0fSBlbHNlIHtcblx0XHRyZW1vdmVDbGFzcyggZWxlbSwgbmFtZSApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNsYXNzKCBlbGVtLCBuYW1lICkge1xuXHR2YXIgc2V0ID0gXCIgXCIgKyBlbGVtLmNsYXNzTmFtZSArIFwiIFwiO1xuXG5cdC8vIENsYXNzIG5hbWUgbWF5IGFwcGVhciBtdWx0aXBsZSB0aW1lc1xuXHR3aGlsZSAoIHNldC5pbmRleE9mKCBcIiBcIiArIG5hbWUgKyBcIiBcIiApID49IDAgKSB7XG5cdFx0c2V0ID0gc2V0LnJlcGxhY2UoIFwiIFwiICsgbmFtZSArIFwiIFwiLCBcIiBcIiApO1xuXHR9XG5cblx0Ly8gVHJpbSBmb3IgcHJldHRpbmVzc1xuXHRlbGVtLmNsYXNzTmFtZSA9IHR5cGVvZiBzZXQudHJpbSA9PT0gXCJmdW5jdGlvblwiID8gc2V0LnRyaW0oKSA6IHNldC5yZXBsYWNlKCAvXlxccyt8XFxzKyQvZywgXCJcIiApO1xufVxuXG5mdW5jdGlvbiBpZCggbmFtZSApIHtcblx0cmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBuYW1lICk7XG59XG5cbmZ1bmN0aW9uIGdldFVybENvbmZpZ0h0bWwoKSB7XG5cdHZhciBpLCBqLCB2YWwsXG5cdFx0ZXNjYXBlZCwgZXNjYXBlZFRvb2x0aXAsXG5cdFx0c2VsZWN0aW9uID0gZmFsc2UsXG5cdFx0dXJsQ29uZmlnID0gY29uZmlnLnVybENvbmZpZyxcblx0XHR1cmxDb25maWdIdG1sID0gXCJcIjtcblxuXHRmb3IgKCBpID0gMDsgaSA8IHVybENvbmZpZy5sZW5ndGg7IGkrKyApIHtcblxuXHRcdC8vIE9wdGlvbnMgY2FuIGJlIGVpdGhlciBzdHJpbmdzIG9yIG9iamVjdHMgd2l0aCBub25lbXB0eSBcImlkXCIgcHJvcGVydGllc1xuXHRcdHZhbCA9IGNvbmZpZy51cmxDb25maWdbIGkgXTtcblx0XHRpZiAoIHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHR2YWwgPSB7XG5cdFx0XHRcdGlkOiB2YWwsXG5cdFx0XHRcdGxhYmVsOiB2YWxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0ZXNjYXBlZCA9IGVzY2FwZVRleHQoIHZhbC5pZCApO1xuXHRcdGVzY2FwZWRUb29sdGlwID0gZXNjYXBlVGV4dCggdmFsLnRvb2x0aXAgKTtcblxuXHRcdGlmICggIXZhbC52YWx1ZSB8fCB0eXBlb2YgdmFsLnZhbHVlID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxpbnB1dCBpZD0ncXVuaXQtdXJsY29uZmlnLVwiICsgZXNjYXBlZCArXG5cdFx0XHRcdFwiJyBuYW1lPSdcIiArIGVzY2FwZWQgKyBcIicgdHlwZT0nY2hlY2tib3gnXCIgK1xuXHRcdFx0XHQoIHZhbC52YWx1ZSA/IFwiIHZhbHVlPSdcIiArIGVzY2FwZVRleHQoIHZhbC52YWx1ZSApICsgXCInXCIgOiBcIlwiICkgK1xuXHRcdFx0XHQoIGNvbmZpZ1sgdmFsLmlkIF0gPyBcIiBjaGVja2VkPSdjaGVja2VkJ1wiIDogXCJcIiApICtcblx0XHRcdFx0XCIgdGl0bGU9J1wiICsgZXNjYXBlZFRvb2x0aXAgKyBcIicgLz48bGFiZWwgZm9yPSdxdW5pdC11cmxjb25maWctXCIgKyBlc2NhcGVkICtcblx0XHRcdFx0XCInIHRpdGxlPSdcIiArIGVzY2FwZWRUb29sdGlwICsgXCInPlwiICsgdmFsLmxhYmVsICsgXCI8L2xhYmVsPlwiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPGxhYmVsIGZvcj0ncXVuaXQtdXJsY29uZmlnLVwiICsgZXNjYXBlZCArXG5cdFx0XHRcdFwiJyB0aXRsZT0nXCIgKyBlc2NhcGVkVG9vbHRpcCArIFwiJz5cIiArIHZhbC5sYWJlbCArXG5cdFx0XHRcdFwiOiA8L2xhYmVsPjxzZWxlY3QgaWQ9J3F1bml0LXVybGNvbmZpZy1cIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcIicgbmFtZT0nXCIgKyBlc2NhcGVkICsgXCInIHRpdGxlPSdcIiArIGVzY2FwZWRUb29sdGlwICsgXCInPjxvcHRpb24+PC9vcHRpb24+XCI7XG5cblx0XHRcdGlmICggUVVuaXQuaXMoIFwiYXJyYXlcIiwgdmFsLnZhbHVlICkgKSB7XG5cdFx0XHRcdGZvciAoIGogPSAwOyBqIDwgdmFsLnZhbHVlLmxlbmd0aDsgaisrICkge1xuXHRcdFx0XHRcdGVzY2FwZWQgPSBlc2NhcGVUZXh0KCB2YWwudmFsdWVbIGogXSApO1xuXHRcdFx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArIGVzY2FwZWQgKyBcIidcIiArXG5cdFx0XHRcdFx0XHQoIGNvbmZpZ1sgdmFsLmlkIF0gPT09IHZhbC52YWx1ZVsgaiBdID9cblx0XHRcdFx0XHRcdFx0KCBzZWxlY3Rpb24gPSB0cnVlICkgJiYgXCIgc2VsZWN0ZWQ9J3NlbGVjdGVkJ1wiIDogXCJcIiApICtcblx0XHRcdFx0XHRcdFwiPlwiICsgZXNjYXBlZCArIFwiPC9vcHRpb24+XCI7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoIGogaW4gdmFsLnZhbHVlICkge1xuXHRcdFx0XHRcdGlmICggaGFzT3duLmNhbGwoIHZhbC52YWx1ZSwgaiApICkge1xuXHRcdFx0XHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxvcHRpb24gdmFsdWU9J1wiICsgZXNjYXBlVGV4dCggaiApICsgXCInXCIgK1xuXHRcdFx0XHRcdFx0XHQoIGNvbmZpZ1sgdmFsLmlkIF0gPT09IGogP1xuXHRcdFx0XHRcdFx0XHRcdCggc2VsZWN0aW9uID0gdHJ1ZSApICYmIFwiIHNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcdFx0XHRcdFwiPlwiICsgZXNjYXBlVGV4dCggdmFsLnZhbHVlWyBqIF0gKSArIFwiPC9vcHRpb24+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGNvbmZpZ1sgdmFsLmlkIF0gJiYgIXNlbGVjdGlvbiApIHtcblx0XHRcdFx0ZXNjYXBlZCA9IGVzY2FwZVRleHQoIGNvbmZpZ1sgdmFsLmlkIF0gKTtcblx0XHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxvcHRpb24gdmFsdWU9J1wiICsgZXNjYXBlZCArXG5cdFx0XHRcdFx0XCInIHNlbGVjdGVkPSdzZWxlY3RlZCcgZGlzYWJsZWQ9J2Rpc2FibGVkJz5cIiArIGVzY2FwZWQgKyBcIjwvb3B0aW9uPlwiO1xuXHRcdFx0fVxuXHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjwvc2VsZWN0PlwiO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB1cmxDb25maWdIdG1sO1xufVxuXG4vLyBIYW5kbGUgXCJjbGlja1wiIGV2ZW50cyBvbiB0b29sYmFyIGNoZWNrYm94ZXMgYW5kIFwiY2hhbmdlXCIgZm9yIHNlbGVjdCBtZW51cy5cbi8vIFVwZGF0ZXMgdGhlIFVSTCB3aXRoIHRoZSBuZXcgc3RhdGUgb2YgYGNvbmZpZy51cmxDb25maWdgIHZhbHVlcy5cbmZ1bmN0aW9uIHRvb2xiYXJDaGFuZ2VkKCkge1xuXHR2YXIgdXBkYXRlZFVybCwgdmFsdWUsIHRlc3RzLFxuXHRcdGZpZWxkID0gdGhpcyxcblx0XHRwYXJhbXMgPSB7fTtcblxuXHQvLyBEZXRlY3QgaWYgZmllbGQgaXMgYSBzZWxlY3QgbWVudSBvciBhIGNoZWNrYm94XG5cdGlmICggXCJzZWxlY3RlZEluZGV4XCIgaW4gZmllbGQgKSB7XG5cdFx0dmFsdWUgPSBmaWVsZC5vcHRpb25zWyBmaWVsZC5zZWxlY3RlZEluZGV4IF0udmFsdWUgfHwgdW5kZWZpbmVkO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gZmllbGQuY2hlY2tlZCA/ICggZmllbGQuZGVmYXVsdFZhbHVlIHx8IHRydWUgKSA6IHVuZGVmaW5lZDtcblx0fVxuXG5cdHBhcmFtc1sgZmllbGQubmFtZSBdID0gdmFsdWU7XG5cdHVwZGF0ZWRVcmwgPSBzZXRVcmwoIHBhcmFtcyApO1xuXG5cdC8vIENoZWNrIGlmIHdlIGNhbiBhcHBseSB0aGUgY2hhbmdlIHdpdGhvdXQgYSBwYWdlIHJlZnJlc2hcblx0aWYgKCBcImhpZGVwYXNzZWRcIiA9PT0gZmllbGQubmFtZSAmJiBcInJlcGxhY2VTdGF0ZVwiIGluIHdpbmRvdy5oaXN0b3J5ICkge1xuXHRcdFFVbml0LnVybFBhcmFtc1sgZmllbGQubmFtZSBdID0gdmFsdWU7XG5cdFx0Y29uZmlnWyBmaWVsZC5uYW1lIF0gPSB2YWx1ZSB8fCBmYWxzZTtcblx0XHR0ZXN0cyA9IGlkKCBcInF1bml0LXRlc3RzXCIgKTtcblx0XHRpZiAoIHRlc3RzICkge1xuXHRcdFx0dG9nZ2xlQ2xhc3MoIHRlc3RzLCBcImhpZGVwYXNzXCIsIHZhbHVlIHx8IGZhbHNlICk7XG5cdFx0fVxuXHRcdHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSggbnVsbCwgXCJcIiwgdXBkYXRlZFVybCApO1xuXHR9IGVsc2Uge1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IHVwZGF0ZWRVcmw7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2V0VXJsKCBwYXJhbXMgKSB7XG5cdHZhciBrZXksIGFyclZhbHVlLCBpLFxuXHRcdHF1ZXJ5c3RyaW5nID0gXCI/XCIsXG5cdFx0bG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XG5cblx0cGFyYW1zID0gUVVuaXQuZXh0ZW5kKCBRVW5pdC5leHRlbmQoIHt9LCBRVW5pdC51cmxQYXJhbXMgKSwgcGFyYW1zICk7XG5cblx0Zm9yICgga2V5IGluIHBhcmFtcyApIHtcblxuXHRcdC8vIFNraXAgaW5oZXJpdGVkIG9yIHVuZGVmaW5lZCBwcm9wZXJ0aWVzXG5cdFx0aWYgKCBoYXNPd24uY2FsbCggcGFyYW1zLCBrZXkgKSAmJiBwYXJhbXNbIGtleSBdICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdC8vIE91dHB1dCBhIHBhcmFtZXRlciBmb3IgZWFjaCB2YWx1ZSBvZiB0aGlzIGtleSAoYnV0IHVzdWFsbHkganVzdCBvbmUpXG5cdFx0XHRhcnJWYWx1ZSA9IFtdLmNvbmNhdCggcGFyYW1zWyBrZXkgXSApO1xuXHRcdFx0Zm9yICggaSA9IDA7IGkgPCBhcnJWYWx1ZS5sZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0cXVlcnlzdHJpbmcgKz0gZW5jb2RlVVJJQ29tcG9uZW50KCBrZXkgKTtcblx0XHRcdFx0aWYgKCBhcnJWYWx1ZVsgaSBdICE9PSB0cnVlICkge1xuXHRcdFx0XHRcdHF1ZXJ5c3RyaW5nICs9IFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KCBhcnJWYWx1ZVsgaSBdICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cXVlcnlzdHJpbmcgKz0gXCImXCI7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3QgK1xuXHRcdGxvY2F0aW9uLnBhdGhuYW1lICsgcXVlcnlzdHJpbmcuc2xpY2UoIDAsIC0xICk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5VXJsUGFyYW1zKCkge1xuXHR2YXIgc2VsZWN0ZWRNb2R1bGUsXG5cdFx0bW9kdWxlc0xpc3QgPSBpZCggXCJxdW5pdC1tb2R1bGVmaWx0ZXJcIiApLFxuXHRcdGZpbHRlciA9IGlkKCBcInF1bml0LWZpbHRlci1pbnB1dFwiICkudmFsdWU7XG5cblx0c2VsZWN0ZWRNb2R1bGUgPSBtb2R1bGVzTGlzdCA/XG5cdFx0ZGVjb2RlVVJJQ29tcG9uZW50KCBtb2R1bGVzTGlzdC5vcHRpb25zWyBtb2R1bGVzTGlzdC5zZWxlY3RlZEluZGV4IF0udmFsdWUgKSA6XG5cdFx0dW5kZWZpbmVkO1xuXG5cdHdpbmRvdy5sb2NhdGlvbiA9IHNldFVybCgge1xuXHRcdG1vZHVsZTogKCBzZWxlY3RlZE1vZHVsZSA9PT0gXCJcIiApID8gdW5kZWZpbmVkIDogc2VsZWN0ZWRNb2R1bGUsXG5cdFx0ZmlsdGVyOiAoIGZpbHRlciA9PT0gXCJcIiApID8gdW5kZWZpbmVkIDogZmlsdGVyLFxuXG5cdFx0Ly8gUmVtb3ZlIG1vZHVsZUlkIGFuZCB0ZXN0SWQgZmlsdGVyc1xuXHRcdG1vZHVsZUlkOiB1bmRlZmluZWQsXG5cdFx0dGVzdElkOiB1bmRlZmluZWRcblx0fSApO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyVXJsQ29uZmlnQ29udGFpbmVyKCkge1xuXHR2YXIgdXJsQ29uZmlnQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJzcGFuXCIgKTtcblxuXHR1cmxDb25maWdDb250YWluZXIuaW5uZXJIVE1MID0gZ2V0VXJsQ29uZmlnSHRtbCgpO1xuXHRhZGRDbGFzcyggdXJsQ29uZmlnQ29udGFpbmVyLCBcInF1bml0LXVybC1jb25maWdcIiApO1xuXG5cdC8vIEZvciBvbGRJRSBzdXBwb3J0OlxuXHQvLyAqIEFkZCBoYW5kbGVycyB0byB0aGUgaW5kaXZpZHVhbCBlbGVtZW50cyBpbnN0ZWFkIG9mIHRoZSBjb250YWluZXJcblx0Ly8gKiBVc2UgXCJjbGlja1wiIGluc3RlYWQgb2YgXCJjaGFuZ2VcIiBmb3IgY2hlY2tib3hlc1xuXHRhZGRFdmVudHMoIHVybENvbmZpZ0NvbnRhaW5lci5nZXRFbGVtZW50c0J5VGFnTmFtZSggXCJpbnB1dFwiICksIFwiY2xpY2tcIiwgdG9vbGJhckNoYW5nZWQgKTtcblx0YWRkRXZlbnRzKCB1cmxDb25maWdDb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwic2VsZWN0XCIgKSwgXCJjaGFuZ2VcIiwgdG9vbGJhckNoYW5nZWQgKTtcblxuXHRyZXR1cm4gdXJsQ29uZmlnQ29udGFpbmVyO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyTG9vc2VGaWx0ZXIoKSB7XG5cdHZhciBmaWx0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImZvcm1cIiApLFxuXHRcdGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJsYWJlbFwiICksXG5cdFx0aW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImlucHV0XCIgKSxcblx0XHRidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImJ1dHRvblwiICk7XG5cblx0YWRkQ2xhc3MoIGZpbHRlciwgXCJxdW5pdC1maWx0ZXJcIiApO1xuXG5cdGxhYmVsLmlubmVySFRNTCA9IFwiRmlsdGVyOiBcIjtcblxuXHRpbnB1dC50eXBlID0gXCJ0ZXh0XCI7XG5cdGlucHV0LnZhbHVlID0gY29uZmlnLmZpbHRlciB8fCBcIlwiO1xuXHRpbnB1dC5uYW1lID0gXCJmaWx0ZXJcIjtcblx0aW5wdXQuaWQgPSBcInF1bml0LWZpbHRlci1pbnB1dFwiO1xuXG5cdGJ1dHRvbi5pbm5lckhUTUwgPSBcIkdvXCI7XG5cblx0bGFiZWwuYXBwZW5kQ2hpbGQoIGlucHV0ICk7XG5cblx0ZmlsdGVyLmFwcGVuZENoaWxkKCBsYWJlbCApO1xuXHRmaWx0ZXIuYXBwZW5kQ2hpbGQoIGJ1dHRvbiApO1xuXHRhZGRFdmVudCggZmlsdGVyLCBcInN1Ym1pdFwiLCBmdW5jdGlvbiggZXYgKSB7XG5cdFx0YXBwbHlVcmxQYXJhbXMoKTtcblxuXHRcdGlmICggZXYgJiYgZXYucHJldmVudERlZmF1bHQgKSB7XG5cdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xuXG5cdHJldHVybiBmaWx0ZXI7XG59XG5cbmZ1bmN0aW9uIHRvb2xiYXJNb2R1bGVGaWx0ZXJIdG1sKCkge1xuXHR2YXIgaSxcblx0XHRtb2R1bGVGaWx0ZXJIdG1sID0gXCJcIjtcblxuXHRpZiAoICFtb2R1bGVzTGlzdC5sZW5ndGggKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0bW9kdWxlRmlsdGVySHRtbCArPSBcIjxsYWJlbCBmb3I9J3F1bml0LW1vZHVsZWZpbHRlcic+TW9kdWxlOiA8L2xhYmVsPlwiICtcblx0XHRcIjxzZWxlY3QgaWQ9J3F1bml0LW1vZHVsZWZpbHRlcicgbmFtZT0nbW9kdWxlZmlsdGVyJz48b3B0aW9uIHZhbHVlPScnIFwiICtcblx0XHQoIFFVbml0LnVybFBhcmFtcy5tb2R1bGUgPT09IHVuZGVmaW5lZCA/IFwic2VsZWN0ZWQ9J3NlbGVjdGVkJ1wiIDogXCJcIiApICtcblx0XHRcIj48IEFsbCBNb2R1bGVzID48L29wdGlvbj5cIjtcblxuXHRmb3IgKCBpID0gMDsgaSA8IG1vZHVsZXNMaXN0Lmxlbmd0aDsgaSsrICkge1xuXHRcdG1vZHVsZUZpbHRlckh0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArXG5cdFx0XHRlc2NhcGVUZXh0KCBlbmNvZGVVUklDb21wb25lbnQoIG1vZHVsZXNMaXN0WyBpIF0gKSApICsgXCInIFwiICtcblx0XHRcdCggUVVuaXQudXJsUGFyYW1zLm1vZHVsZSA9PT0gbW9kdWxlc0xpc3RbIGkgXSA/IFwic2VsZWN0ZWQ9J3NlbGVjdGVkJ1wiIDogXCJcIiApICtcblx0XHRcdFwiPlwiICsgZXNjYXBlVGV4dCggbW9kdWxlc0xpc3RbIGkgXSApICsgXCI8L29wdGlvbj5cIjtcblx0fVxuXHRtb2R1bGVGaWx0ZXJIdG1sICs9IFwiPC9zZWxlY3Q+XCI7XG5cblx0cmV0dXJuIG1vZHVsZUZpbHRlckh0bWw7XG59XG5cbmZ1bmN0aW9uIHRvb2xiYXJNb2R1bGVGaWx0ZXIoKSB7XG5cdHZhciB0b29sYmFyID0gaWQoIFwicXVuaXQtdGVzdHJ1bm5lci10b29sYmFyXCIgKSxcblx0XHRtb2R1bGVGaWx0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInNwYW5cIiApLFxuXHRcdG1vZHVsZUZpbHRlckh0bWwgPSB0b29sYmFyTW9kdWxlRmlsdGVySHRtbCgpO1xuXG5cdGlmICggIXRvb2xiYXIgfHwgIW1vZHVsZUZpbHRlckh0bWwgKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0bW9kdWxlRmlsdGVyLnNldEF0dHJpYnV0ZSggXCJpZFwiLCBcInF1bml0LW1vZHVsZWZpbHRlci1jb250YWluZXJcIiApO1xuXHRtb2R1bGVGaWx0ZXIuaW5uZXJIVE1MID0gbW9kdWxlRmlsdGVySHRtbDtcblxuXHRhZGRFdmVudCggbW9kdWxlRmlsdGVyLmxhc3RDaGlsZCwgXCJjaGFuZ2VcIiwgYXBwbHlVcmxQYXJhbXMgKTtcblxuXHR0b29sYmFyLmFwcGVuZENoaWxkKCBtb2R1bGVGaWx0ZXIgKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kVG9vbGJhcigpIHtcblx0dmFyIHRvb2xiYXIgPSBpZCggXCJxdW5pdC10ZXN0cnVubmVyLXRvb2xiYXJcIiApO1xuXG5cdGlmICggdG9vbGJhciApIHtcblx0XHR0b29sYmFyLmFwcGVuZENoaWxkKCB0b29sYmFyVXJsQ29uZmlnQ29udGFpbmVyKCkgKTtcblx0XHR0b29sYmFyLmFwcGVuZENoaWxkKCB0b29sYmFyTG9vc2VGaWx0ZXIoKSApO1xuXHRcdHRvb2xiYXJNb2R1bGVGaWx0ZXIoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRIZWFkZXIoKSB7XG5cdHZhciBoZWFkZXIgPSBpZCggXCJxdW5pdC1oZWFkZXJcIiApO1xuXG5cdGlmICggaGVhZGVyICkge1xuXHRcdGhlYWRlci5pbm5lckhUTUwgPSBcIjxhIGhyZWY9J1wiICsgZXNjYXBlVGV4dCggdW5maWx0ZXJlZFVybCApICsgXCInPlwiICsgaGVhZGVyLmlubmVySFRNTCArXG5cdFx0XHRcIjwvYT4gXCI7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kQmFubmVyKCkge1xuXHR2YXIgYmFubmVyID0gaWQoIFwicXVuaXQtYmFubmVyXCIgKTtcblxuXHRpZiAoIGJhbm5lciApIHtcblx0XHRiYW5uZXIuY2xhc3NOYW1lID0gXCJcIjtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRUZXN0UmVzdWx0cygpIHtcblx0dmFyIHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApLFxuXHRcdHJlc3VsdCA9IGlkKCBcInF1bml0LXRlc3RyZXN1bHRcIiApO1xuXG5cdGlmICggcmVzdWx0ICkge1xuXHRcdHJlc3VsdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKCByZXN1bHQgKTtcblx0fVxuXG5cdGlmICggdGVzdHMgKSB7XG5cdFx0dGVzdHMuaW5uZXJIVE1MID0gXCJcIjtcblx0XHRyZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInBcIiApO1xuXHRcdHJlc3VsdC5pZCA9IFwicXVuaXQtdGVzdHJlc3VsdFwiO1xuXHRcdHJlc3VsdC5jbGFzc05hbWUgPSBcInJlc3VsdFwiO1xuXHRcdHRlc3RzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKCByZXN1bHQsIHRlc3RzICk7XG5cdFx0cmVzdWx0LmlubmVySFRNTCA9IFwiUnVubmluZy4uLjxiciAvPiYjMTYwO1wiO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHN0b3JlRml4dHVyZSgpIHtcblx0dmFyIGZpeHR1cmUgPSBpZCggXCJxdW5pdC1maXh0dXJlXCIgKTtcblx0aWYgKCBmaXh0dXJlICkge1xuXHRcdGNvbmZpZy5maXh0dXJlID0gZml4dHVyZS5pbm5lckhUTUw7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kRmlsdGVyZWRUZXN0KCkge1xuXHR2YXIgdGVzdElkID0gUVVuaXQuY29uZmlnLnRlc3RJZDtcblx0aWYgKCAhdGVzdElkIHx8IHRlc3RJZC5sZW5ndGggPD0gMCApIHtcblx0XHRyZXR1cm4gXCJcIjtcblx0fVxuXHRyZXR1cm4gXCI8ZGl2IGlkPSdxdW5pdC1maWx0ZXJlZFRlc3QnPlJlcnVubmluZyBzZWxlY3RlZCB0ZXN0czogXCIgK1xuXHRcdGVzY2FwZVRleHQoIHRlc3RJZC5qb2luKCBcIiwgXCIgKSApICtcblx0XHRcIiA8YSBpZD0ncXVuaXQtY2xlYXJGaWx0ZXInIGhyZWY9J1wiICtcblx0XHRlc2NhcGVUZXh0KCB1bmZpbHRlcmVkVXJsICkgK1xuXHRcdFwiJz5SdW4gYWxsIHRlc3RzPC9hPjwvZGl2PlwiO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRVc2VyQWdlbnQoKSB7XG5cdHZhciB1c2VyQWdlbnQgPSBpZCggXCJxdW5pdC11c2VyQWdlbnRcIiApO1xuXG5cdGlmICggdXNlckFnZW50ICkge1xuXHRcdHVzZXJBZ2VudC5pbm5lckhUTUwgPSBcIlwiO1xuXHRcdHVzZXJBZ2VudC5hcHBlbmRDaGlsZChcblx0XHRcdGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxuXHRcdFx0XHRcIlFVbml0IFwiICsgUVVuaXQudmVyc2lvbiArIFwiOyBcIiArIG5hdmlnYXRvci51c2VyQWdlbnRcblx0XHRcdClcblx0XHQpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZEludGVyZmFjZSgpIHtcblx0dmFyIHF1bml0ID0gaWQoIFwicXVuaXRcIiApO1xuXG5cdGlmICggcXVuaXQgKSB7XG5cdFx0cXVuaXQuaW5uZXJIVE1MID1cblx0XHRcdFwiPGgxIGlkPSdxdW5pdC1oZWFkZXInPlwiICsgZXNjYXBlVGV4dCggZG9jdW1lbnQudGl0bGUgKSArIFwiPC9oMT5cIiArXG5cdFx0XHRcIjxoMiBpZD0ncXVuaXQtYmFubmVyJz48L2gyPlwiICtcblx0XHRcdFwiPGRpdiBpZD0ncXVuaXQtdGVzdHJ1bm5lci10b29sYmFyJz48L2Rpdj5cIiArXG5cdFx0XHRhcHBlbmRGaWx0ZXJlZFRlc3QoKSArXG5cdFx0XHRcIjxoMiBpZD0ncXVuaXQtdXNlckFnZW50Jz48L2gyPlwiICtcblx0XHRcdFwiPG9sIGlkPSdxdW5pdC10ZXN0cyc+PC9vbD5cIjtcblx0fVxuXG5cdGFwcGVuZEhlYWRlcigpO1xuXHRhcHBlbmRCYW5uZXIoKTtcblx0YXBwZW5kVGVzdFJlc3VsdHMoKTtcblx0YXBwZW5kVXNlckFnZW50KCk7XG5cdGFwcGVuZFRvb2xiYXIoKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kVGVzdHNMaXN0KCBtb2R1bGVzICkge1xuXHR2YXIgaSwgbCwgeCwgeiwgdGVzdCwgbW9kdWxlT2JqO1xuXG5cdGZvciAoIGkgPSAwLCBsID0gbW9kdWxlcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0bW9kdWxlT2JqID0gbW9kdWxlc1sgaSBdO1xuXG5cdFx0Zm9yICggeCA9IDAsIHogPSBtb2R1bGVPYmoudGVzdHMubGVuZ3RoOyB4IDwgejsgeCsrICkge1xuXHRcdFx0dGVzdCA9IG1vZHVsZU9iai50ZXN0c1sgeCBdO1xuXG5cdFx0XHRhcHBlbmRUZXN0KCB0ZXN0Lm5hbWUsIHRlc3QudGVzdElkLCBtb2R1bGVPYmoubmFtZSApO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRUZXN0KCBuYW1lLCB0ZXN0SWQsIG1vZHVsZU5hbWUgKSB7XG5cdHZhciB0aXRsZSwgcmVydW5UcmlnZ2VyLCB0ZXN0QmxvY2ssIGFzc2VydExpc3QsXG5cdFx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cblx0aWYgKCAhdGVzdHMgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInN0cm9uZ1wiICk7XG5cdHRpdGxlLmlubmVySFRNTCA9IGdldE5hbWVIdG1sKCBuYW1lLCBtb2R1bGVOYW1lICk7XG5cblx0cmVydW5UcmlnZ2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJhXCIgKTtcblx0cmVydW5UcmlnZ2VyLmlubmVySFRNTCA9IFwiUmVydW5cIjtcblx0cmVydW5UcmlnZ2VyLmhyZWYgPSBzZXRVcmwoIHsgdGVzdElkOiB0ZXN0SWQgfSApO1xuXG5cdHRlc3RCbG9jayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwibGlcIiApO1xuXHR0ZXN0QmxvY2suYXBwZW5kQ2hpbGQoIHRpdGxlICk7XG5cdHRlc3RCbG9jay5hcHBlbmRDaGlsZCggcmVydW5UcmlnZ2VyICk7XG5cdHRlc3RCbG9jay5pZCA9IFwicXVuaXQtdGVzdC1vdXRwdXQtXCIgKyB0ZXN0SWQ7XG5cblx0YXNzZXJ0TGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwib2xcIiApO1xuXHRhc3NlcnRMaXN0LmNsYXNzTmFtZSA9IFwicXVuaXQtYXNzZXJ0LWxpc3RcIjtcblxuXHR0ZXN0QmxvY2suYXBwZW5kQ2hpbGQoIGFzc2VydExpc3QgKTtcblxuXHR0ZXN0cy5hcHBlbmRDaGlsZCggdGVzdEJsb2NrICk7XG59XG5cbi8vIEhUTUwgUmVwb3J0ZXIgaW5pdGlhbGl6YXRpb24gYW5kIGxvYWRcblFVbml0LmJlZ2luKCBmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIGksIG1vZHVsZU9iaiwgdGVzdHM7XG5cblx0Ly8gU29ydCBtb2R1bGVzIGJ5IG5hbWUgZm9yIHRoZSBwaWNrZXJcblx0Zm9yICggaSA9IDA7IGkgPCBkZXRhaWxzLm1vZHVsZXMubGVuZ3RoOyBpKysgKSB7XG5cdFx0bW9kdWxlT2JqID0gZGV0YWlscy5tb2R1bGVzWyBpIF07XG5cdFx0aWYgKCBtb2R1bGVPYmoubmFtZSApIHtcblx0XHRcdG1vZHVsZXNMaXN0LnB1c2goIG1vZHVsZU9iai5uYW1lICk7XG5cdFx0fVxuXHR9XG5cdG1vZHVsZXNMaXN0LnNvcnQoIGZ1bmN0aW9uKCBhLCBiICkge1xuXHRcdHJldHVybiBhLmxvY2FsZUNvbXBhcmUoIGIgKTtcblx0fSApO1xuXG5cdC8vIENhcHR1cmUgZml4dHVyZSBIVE1MIGZyb20gdGhlIHBhZ2Vcblx0c3RvcmVGaXh0dXJlKCk7XG5cblx0Ly8gSW5pdGlhbGl6ZSBRVW5pdCBlbGVtZW50c1xuXHRhcHBlbmRJbnRlcmZhY2UoKTtcblx0YXBwZW5kVGVzdHNMaXN0KCBkZXRhaWxzLm1vZHVsZXMgKTtcblx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cdGlmICggdGVzdHMgJiYgY29uZmlnLmhpZGVwYXNzZWQgKSB7XG5cdFx0YWRkQ2xhc3MoIHRlc3RzLCBcImhpZGVwYXNzXCIgKTtcblx0fVxufSApO1xuXG5RVW5pdC5kb25lKCBmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIGksIGtleSxcblx0XHRiYW5uZXIgPSBpZCggXCJxdW5pdC1iYW5uZXJcIiApLFxuXHRcdHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApLFxuXHRcdGh0bWwgPSBbXG5cdFx0XHRcIlRlc3RzIGNvbXBsZXRlZCBpbiBcIixcblx0XHRcdGRldGFpbHMucnVudGltZSxcblx0XHRcdFwiIG1pbGxpc2Vjb25kcy48YnIgLz5cIixcblx0XHRcdFwiPHNwYW4gY2xhc3M9J3Bhc3NlZCc+XCIsXG5cdFx0XHRkZXRhaWxzLnBhc3NlZCxcblx0XHRcdFwiPC9zcGFuPiBhc3NlcnRpb25zIG9mIDxzcGFuIGNsYXNzPSd0b3RhbCc+XCIsXG5cdFx0XHRkZXRhaWxzLnRvdGFsLFxuXHRcdFx0XCI8L3NwYW4+IHBhc3NlZCwgPHNwYW4gY2xhc3M9J2ZhaWxlZCc+XCIsXG5cdFx0XHRkZXRhaWxzLmZhaWxlZCxcblx0XHRcdFwiPC9zcGFuPiBmYWlsZWQuXCJcblx0XHRdLmpvaW4oIFwiXCIgKTtcblxuXHRpZiAoIGJhbm5lciApIHtcblx0XHRiYW5uZXIuY2xhc3NOYW1lID0gZGV0YWlscy5mYWlsZWQgPyBcInF1bml0LWZhaWxcIiA6IFwicXVuaXQtcGFzc1wiO1xuXHR9XG5cblx0aWYgKCB0ZXN0cyApIHtcblx0XHRpZCggXCJxdW5pdC10ZXN0cmVzdWx0XCIgKS5pbm5lckhUTUwgPSBodG1sO1xuXHR9XG5cblx0aWYgKCBjb25maWcuYWx0ZXJ0aXRsZSAmJiBkb2N1bWVudC50aXRsZSApIHtcblxuXHRcdC8vIFNob3cg4pyWIGZvciBnb29kLCDinJQgZm9yIGJhZCBzdWl0ZSByZXN1bHQgaW4gdGl0bGVcblx0XHQvLyB1c2UgZXNjYXBlIHNlcXVlbmNlcyBpbiBjYXNlIGZpbGUgZ2V0cyBsb2FkZWQgd2l0aCBub24tdXRmLTgtY2hhcnNldFxuXHRcdGRvY3VtZW50LnRpdGxlID0gW1xuXHRcdFx0KCBkZXRhaWxzLmZhaWxlZCA/IFwiXFx1MjcxNlwiIDogXCJcXHUyNzE0XCIgKSxcblx0XHRcdGRvY3VtZW50LnRpdGxlLnJlcGxhY2UoIC9eW1xcdTI3MTRcXHUyNzE2XSAvaSwgXCJcIiApXG5cdFx0XS5qb2luKCBcIiBcIiApO1xuXHR9XG5cblx0Ly8gQ2xlYXIgb3duIHNlc3Npb25TdG9yYWdlIGl0ZW1zIGlmIGFsbCB0ZXN0cyBwYXNzZWRcblx0aWYgKCBjb25maWcucmVvcmRlciAmJiBkZWZpbmVkLnNlc3Npb25TdG9yYWdlICYmIGRldGFpbHMuZmFpbGVkID09PSAwICkge1xuXHRcdGZvciAoIGkgPSAwOyBpIDwgc2Vzc2lvblN0b3JhZ2UubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRrZXkgPSBzZXNzaW9uU3RvcmFnZS5rZXkoIGkrKyApO1xuXHRcdFx0aWYgKCBrZXkuaW5kZXhPZiggXCJxdW5pdC10ZXN0LVwiICkgPT09IDAgKSB7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIGtleSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFNjcm9sbCBiYWNrIHRvIHRvcCB0byBzaG93IHJlc3VsdHNcblx0aWYgKCBjb25maWcuc2Nyb2xsdG9wICYmIHdpbmRvdy5zY3JvbGxUbyApIHtcblx0XHR3aW5kb3cuc2Nyb2xsVG8oIDAsIDAgKTtcblx0fVxufSApO1xuXG5mdW5jdGlvbiBnZXROYW1lSHRtbCggbmFtZSwgbW9kdWxlICkge1xuXHR2YXIgbmFtZUh0bWwgPSBcIlwiO1xuXG5cdGlmICggbW9kdWxlICkge1xuXHRcdG5hbWVIdG1sID0gXCI8c3BhbiBjbGFzcz0nbW9kdWxlLW5hbWUnPlwiICsgZXNjYXBlVGV4dCggbW9kdWxlICkgKyBcIjwvc3Bhbj46IFwiO1xuXHR9XG5cblx0bmFtZUh0bWwgKz0gXCI8c3BhbiBjbGFzcz0ndGVzdC1uYW1lJz5cIiArIGVzY2FwZVRleHQoIG5hbWUgKSArIFwiPC9zcGFuPlwiO1xuXG5cdHJldHVybiBuYW1lSHRtbDtcbn1cblxuUVVuaXQudGVzdFN0YXJ0KCBmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIHJ1bm5pbmcsIHRlc3RCbG9jaywgYmFkO1xuXG5cdHRlc3RCbG9jayA9IGlkKCBcInF1bml0LXRlc3Qtb3V0cHV0LVwiICsgZGV0YWlscy50ZXN0SWQgKTtcblx0aWYgKCB0ZXN0QmxvY2sgKSB7XG5cdFx0dGVzdEJsb2NrLmNsYXNzTmFtZSA9IFwicnVubmluZ1wiO1xuXHR9IGVsc2Uge1xuXG5cdFx0Ly8gUmVwb3J0IGxhdGVyIHJlZ2lzdGVyZWQgdGVzdHNcblx0XHRhcHBlbmRUZXN0KCBkZXRhaWxzLm5hbWUsIGRldGFpbHMudGVzdElkLCBkZXRhaWxzLm1vZHVsZSApO1xuXHR9XG5cblx0cnVubmluZyA9IGlkKCBcInF1bml0LXRlc3RyZXN1bHRcIiApO1xuXHRpZiAoIHJ1bm5pbmcgKSB7XG5cdFx0YmFkID0gUVVuaXQuY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSAmJlxuXHRcdFx0K3Nlc3Npb25TdG9yYWdlLmdldEl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIGRldGFpbHMubW9kdWxlICsgXCItXCIgKyBkZXRhaWxzLm5hbWUgKTtcblxuXHRcdHJ1bm5pbmcuaW5uZXJIVE1MID0gKCBiYWQgP1xuXHRcdFx0XCJSZXJ1bm5pbmcgcHJldmlvdXNseSBmYWlsZWQgdGVzdDogPGJyIC8+XCIgOlxuXHRcdFx0XCJSdW5uaW5nOiA8YnIgLz5cIiApICtcblx0XHRcdGdldE5hbWVIdG1sKCBkZXRhaWxzLm5hbWUsIGRldGFpbHMubW9kdWxlICk7XG5cdH1cblxufSApO1xuXG5mdW5jdGlvbiBzdHJpcEh0bWwoIHN0cmluZyApIHtcblxuXHQvLyBTdHJpcCB0YWdzLCBodG1sIGVudGl0eSBhbmQgd2hpdGVzcGFjZXNcblx0cmV0dXJuIHN0cmluZy5yZXBsYWNlKCAvPFxcLz9bXj5dKyg+fCQpL2csIFwiXCIgKS5yZXBsYWNlKCAvXFwmcXVvdDsvZywgXCJcIiApLnJlcGxhY2UoIC9cXHMrL2csIFwiXCIgKTtcbn1cblxuUVVuaXQubG9nKCBmdW5jdGlvbiggZGV0YWlscyApIHtcblx0dmFyIGFzc2VydExpc3QsIGFzc2VydExpLFxuXHRcdG1lc3NhZ2UsIGV4cGVjdGVkLCBhY3R1YWwsIGRpZmYsXG5cdFx0c2hvd0RpZmYgPSBmYWxzZSxcblx0XHR0ZXN0SXRlbSA9IGlkKCBcInF1bml0LXRlc3Qtb3V0cHV0LVwiICsgZGV0YWlscy50ZXN0SWQgKTtcblxuXHRpZiAoICF0ZXN0SXRlbSApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRtZXNzYWdlID0gZXNjYXBlVGV4dCggZGV0YWlscy5tZXNzYWdlICkgfHwgKCBkZXRhaWxzLnJlc3VsdCA/IFwib2theVwiIDogXCJmYWlsZWRcIiApO1xuXHRtZXNzYWdlID0gXCI8c3BhbiBjbGFzcz0ndGVzdC1tZXNzYWdlJz5cIiArIG1lc3NhZ2UgKyBcIjwvc3Bhbj5cIjtcblx0bWVzc2FnZSArPSBcIjxzcGFuIGNsYXNzPSdydW50aW1lJz5AIFwiICsgZGV0YWlscy5ydW50aW1lICsgXCIgbXM8L3NwYW4+XCI7XG5cblx0Ly8gVGhlIHB1c2hGYWlsdXJlIGRvZXNuJ3QgcHJvdmlkZSBkZXRhaWxzLmV4cGVjdGVkXG5cdC8vIHdoZW4gaXQgY2FsbHMsIGl0J3MgaW1wbGljaXQgdG8gYWxzbyBub3Qgc2hvdyBleHBlY3RlZCBhbmQgZGlmZiBzdHVmZlxuXHQvLyBBbHNvLCB3ZSBuZWVkIHRvIGNoZWNrIGRldGFpbHMuZXhwZWN0ZWQgZXhpc3RlbmNlLCBhcyBpdCBjYW4gZXhpc3QgYW5kIGJlIHVuZGVmaW5lZFxuXHRpZiAoICFkZXRhaWxzLnJlc3VsdCAmJiBoYXNPd24uY2FsbCggZGV0YWlscywgXCJleHBlY3RlZFwiICkgKSB7XG5cdFx0aWYgKCBkZXRhaWxzLm5lZ2F0aXZlICkge1xuXHRcdFx0ZXhwZWN0ZWQgPSBcIk5PVCBcIiArIFFVbml0LmR1bXAucGFyc2UoIGRldGFpbHMuZXhwZWN0ZWQgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXhwZWN0ZWQgPSBRVW5pdC5kdW1wLnBhcnNlKCBkZXRhaWxzLmV4cGVjdGVkICk7XG5cdFx0fVxuXG5cdFx0YWN0dWFsID0gUVVuaXQuZHVtcC5wYXJzZSggZGV0YWlscy5hY3R1YWwgKTtcblx0XHRtZXNzYWdlICs9IFwiPHRhYmxlPjx0ciBjbGFzcz0ndGVzdC1leHBlY3RlZCc+PHRoPkV4cGVjdGVkOiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdGVzY2FwZVRleHQoIGV4cGVjdGVkICkgK1xuXHRcdFx0XCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cblx0XHRpZiAoIGFjdHVhbCAhPT0gZXhwZWN0ZWQgKSB7XG5cblx0XHRcdG1lc3NhZ2UgKz0gXCI8dHIgY2xhc3M9J3Rlc3QtYWN0dWFsJz48dGg+UmVzdWx0OiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdFx0ZXNjYXBlVGV4dCggYWN0dWFsICkgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblxuXHRcdFx0Ly8gRG9uJ3Qgc2hvdyBkaWZmIGlmIGFjdHVhbCBvciBleHBlY3RlZCBhcmUgYm9vbGVhbnNcblx0XHRcdGlmICggISggL14odHJ1ZXxmYWxzZSkkLy50ZXN0KCBhY3R1YWwgKSApICYmXG5cdFx0XHRcdFx0ISggL14odHJ1ZXxmYWxzZSkkLy50ZXN0KCBleHBlY3RlZCApICkgKSB7XG5cdFx0XHRcdGRpZmYgPSBRVW5pdC5kaWZmKCBleHBlY3RlZCwgYWN0dWFsICk7XG5cdFx0XHRcdHNob3dEaWZmID0gc3RyaXBIdG1sKCBkaWZmICkubGVuZ3RoICE9PVxuXHRcdFx0XHRcdHN0cmlwSHRtbCggZXhwZWN0ZWQgKS5sZW5ndGggK1xuXHRcdFx0XHRcdHN0cmlwSHRtbCggYWN0dWFsICkubGVuZ3RoO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEb24ndCBzaG93IGRpZmYgaWYgZXhwZWN0ZWQgYW5kIGFjdHVhbCBhcmUgdG90YWxseSBkaWZmZXJlbnRcblx0XHRcdGlmICggc2hvd0RpZmYgKSB7XG5cdFx0XHRcdG1lc3NhZ2UgKz0gXCI8dHIgY2xhc3M9J3Rlc3QtZGlmZic+PHRoPkRpZmY6IDwvdGg+PHRkPjxwcmU+XCIgK1xuXHRcdFx0XHRcdGRpZmYgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZC5pbmRleE9mKCBcIltvYmplY3QgQXJyYXldXCIgKSAhPT0gLTEgfHxcblx0XHRcdFx0ZXhwZWN0ZWQuaW5kZXhPZiggXCJbb2JqZWN0IE9iamVjdF1cIiApICE9PSAtMSApIHtcblx0XHRcdG1lc3NhZ2UgKz0gXCI8dHIgY2xhc3M9J3Rlc3QtbWVzc2FnZSc+PHRoPk1lc3NhZ2U6IDwvdGg+PHRkPlwiICtcblx0XHRcdFx0XCJEaWZmIHN1cHByZXNzZWQgYXMgdGhlIGRlcHRoIG9mIG9iamVjdCBpcyBtb3JlIHRoYW4gY3VycmVudCBtYXggZGVwdGggKFwiICtcblx0XHRcdFx0UVVuaXQuY29uZmlnLm1heERlcHRoICsgXCIpLjxwPkhpbnQ6IFVzZSA8Y29kZT5RVW5pdC5kdW1wLm1heERlcHRoPC9jb2RlPiB0byBcIiArXG5cdFx0XHRcdFwiIHJ1biB3aXRoIGEgaGlnaGVyIG1heCBkZXB0aCBvciA8YSBocmVmPSdcIiArXG5cdFx0XHRcdGVzY2FwZVRleHQoIHNldFVybCggeyBtYXhEZXB0aDogLTEgfSApICkgKyBcIic+XCIgK1xuXHRcdFx0XHRcIlJlcnVuPC9hPiB3aXRob3V0IG1heCBkZXB0aC48L3A+PC90ZD48L3RyPlwiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LW1lc3NhZ2UnPjx0aD5NZXNzYWdlOiA8L3RoPjx0ZD5cIiArXG5cdFx0XHRcdFwiRGlmZiBzdXBwcmVzc2VkIGFzIHRoZSBleHBlY3RlZCBhbmQgYWN0dWFsIHJlc3VsdHMgaGF2ZSBhbiBlcXVpdmFsZW50XCIgK1xuXHRcdFx0XHRcIiBzZXJpYWxpemF0aW9uPC90ZD48L3RyPlwiO1xuXHRcdH1cblxuXHRcdGlmICggZGV0YWlscy5zb3VyY2UgKSB7XG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LXNvdXJjZSc+PHRoPlNvdXJjZTogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRcdGVzY2FwZVRleHQoIGRldGFpbHMuc291cmNlICkgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIjtcblx0XHR9XG5cblx0XHRtZXNzYWdlICs9IFwiPC90YWJsZT5cIjtcblxuXHQvLyBUaGlzIG9jY3VycyB3aGVuIHB1c2hGYWlsdXJlIGlzIHNldCBhbmQgd2UgaGF2ZSBhbiBleHRyYWN0ZWQgc3RhY2sgdHJhY2Vcblx0fSBlbHNlIGlmICggIWRldGFpbHMucmVzdWx0ICYmIGRldGFpbHMuc291cmNlICkge1xuXHRcdG1lc3NhZ2UgKz0gXCI8dGFibGU+XCIgK1xuXHRcdFx0XCI8dHIgY2xhc3M9J3Rlc3Qtc291cmNlJz48dGg+U291cmNlOiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdGVzY2FwZVRleHQoIGRldGFpbHMuc291cmNlICkgKyBcIjwvcHJlPjwvdGQ+PC90cj5cIiArXG5cdFx0XHRcIjwvdGFibGU+XCI7XG5cdH1cblxuXHRhc3NlcnRMaXN0ID0gdGVzdEl0ZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwib2xcIiApWyAwIF07XG5cblx0YXNzZXJ0TGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImxpXCIgKTtcblx0YXNzZXJ0TGkuY2xhc3NOYW1lID0gZGV0YWlscy5yZXN1bHQgPyBcInBhc3NcIiA6IFwiZmFpbFwiO1xuXHRhc3NlcnRMaS5pbm5lckhUTUwgPSBtZXNzYWdlO1xuXHRhc3NlcnRMaXN0LmFwcGVuZENoaWxkKCBhc3NlcnRMaSApO1xufSApO1xuXG5RVW5pdC50ZXN0RG9uZSggZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciB0ZXN0VGl0bGUsIHRpbWUsIHRlc3RJdGVtLCBhc3NlcnRMaXN0LFxuXHRcdGdvb2QsIGJhZCwgdGVzdENvdW50cywgc2tpcHBlZCwgc291cmNlTmFtZSxcblx0XHR0ZXN0cyA9IGlkKCBcInF1bml0LXRlc3RzXCIgKTtcblxuXHRpZiAoICF0ZXN0cyApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR0ZXN0SXRlbSA9IGlkKCBcInF1bml0LXRlc3Qtb3V0cHV0LVwiICsgZGV0YWlscy50ZXN0SWQgKTtcblxuXHRhc3NlcnRMaXN0ID0gdGVzdEl0ZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwib2xcIiApWyAwIF07XG5cblx0Z29vZCA9IGRldGFpbHMucGFzc2VkO1xuXHRiYWQgPSBkZXRhaWxzLmZhaWxlZDtcblxuXHQvLyBTdG9yZSByZXN1bHQgd2hlbiBwb3NzaWJsZVxuXHRpZiAoIGNvbmZpZy5yZW9yZGVyICYmIGRlZmluZWQuc2Vzc2lvblN0b3JhZ2UgKSB7XG5cdFx0aWYgKCBiYWQgKSB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCBcInF1bml0LXRlc3QtXCIgKyBkZXRhaWxzLm1vZHVsZSArIFwiLVwiICsgZGV0YWlscy5uYW1lLCBiYWQgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSggXCJxdW5pdC10ZXN0LVwiICsgZGV0YWlscy5tb2R1bGUgKyBcIi1cIiArIGRldGFpbHMubmFtZSApO1xuXHRcdH1cblx0fVxuXG5cdGlmICggYmFkID09PSAwICkge1xuXG5cdFx0Ly8gQ29sbGFwc2UgdGhlIHBhc3NpbmcgdGVzdHNcblx0XHRhZGRDbGFzcyggYXNzZXJ0TGlzdCwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHR9IGVsc2UgaWYgKCBiYWQgJiYgY29uZmlnLmNvbGxhcHNlICYmICFjb2xsYXBzZU5leHQgKSB7XG5cblx0XHQvLyBTa2lwIGNvbGxhcHNpbmcgdGhlIGZpcnN0IGZhaWxpbmcgdGVzdFxuXHRcdGNvbGxhcHNlTmV4dCA9IHRydWU7XG5cdH0gZWxzZSB7XG5cblx0XHQvLyBDb2xsYXBzZSByZW1haW5pbmcgdGVzdHNcblx0XHRhZGRDbGFzcyggYXNzZXJ0TGlzdCwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHR9XG5cblx0Ly8gVGhlIHRlc3RJdGVtLmZpcnN0Q2hpbGQgaXMgdGhlIHRlc3QgbmFtZVxuXHR0ZXN0VGl0bGUgPSB0ZXN0SXRlbS5maXJzdENoaWxkO1xuXG5cdHRlc3RDb3VudHMgPSBiYWQgP1xuXHRcdFwiPGIgY2xhc3M9J2ZhaWxlZCc+XCIgKyBiYWQgKyBcIjwvYj4sIFwiICsgXCI8YiBjbGFzcz0ncGFzc2VkJz5cIiArIGdvb2QgKyBcIjwvYj4sIFwiIDpcblx0XHRcIlwiO1xuXG5cdHRlc3RUaXRsZS5pbm5lckhUTUwgKz0gXCIgPGIgY2xhc3M9J2NvdW50cyc+KFwiICsgdGVzdENvdW50cyArXG5cdFx0ZGV0YWlscy5hc3NlcnRpb25zLmxlbmd0aCArIFwiKTwvYj5cIjtcblxuXHRpZiAoIGRldGFpbHMuc2tpcHBlZCApIHtcblx0XHR0ZXN0SXRlbS5jbGFzc05hbWUgPSBcInNraXBwZWRcIjtcblx0XHRza2lwcGVkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJlbVwiICk7XG5cdFx0c2tpcHBlZC5jbGFzc05hbWUgPSBcInF1bml0LXNraXBwZWQtbGFiZWxcIjtcblx0XHRza2lwcGVkLmlubmVySFRNTCA9IFwic2tpcHBlZFwiO1xuXHRcdHRlc3RJdGVtLmluc2VydEJlZm9yZSggc2tpcHBlZCwgdGVzdFRpdGxlICk7XG5cdH0gZWxzZSB7XG5cdFx0YWRkRXZlbnQoIHRlc3RUaXRsZSwgXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHRvZ2dsZUNsYXNzKCBhc3NlcnRMaXN0LCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdFx0fSApO1xuXG5cdFx0dGVzdEl0ZW0uY2xhc3NOYW1lID0gYmFkID8gXCJmYWlsXCIgOiBcInBhc3NcIjtcblxuXHRcdHRpbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInNwYW5cIiApO1xuXHRcdHRpbWUuY2xhc3NOYW1lID0gXCJydW50aW1lXCI7XG5cdFx0dGltZS5pbm5lckhUTUwgPSBkZXRhaWxzLnJ1bnRpbWUgKyBcIiBtc1wiO1xuXHRcdHRlc3RJdGVtLmluc2VydEJlZm9yZSggdGltZSwgYXNzZXJ0TGlzdCApO1xuXHR9XG5cblx0Ly8gU2hvdyB0aGUgc291cmNlIG9mIHRoZSB0ZXN0IHdoZW4gc2hvd2luZyBhc3NlcnRpb25zXG5cdGlmICggZGV0YWlscy5zb3VyY2UgKSB7XG5cdFx0c291cmNlTmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwicFwiICk7XG5cdFx0c291cmNlTmFtZS5pbm5lckhUTUwgPSBcIjxzdHJvbmc+U291cmNlOiA8L3N0cm9uZz5cIiArIGRldGFpbHMuc291cmNlO1xuXHRcdGFkZENsYXNzKCBzb3VyY2VOYW1lLCBcInF1bml0LXNvdXJjZVwiICk7XG5cdFx0aWYgKCBiYWQgPT09IDAgKSB7XG5cdFx0XHRhZGRDbGFzcyggc291cmNlTmFtZSwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHRcdH1cblx0XHRhZGRFdmVudCggdGVzdFRpdGxlLCBcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dG9nZ2xlQ2xhc3MoIHNvdXJjZU5hbWUsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0XHR9ICk7XG5cdFx0dGVzdEl0ZW0uYXBwZW5kQ2hpbGQoIHNvdXJjZU5hbWUgKTtcblx0fVxufSApO1xuXG4vLyBBdm9pZCByZWFkeVN0YXRlIGlzc3VlIHdpdGggcGhhbnRvbWpzXG4vLyBSZWY6ICM4MThcbnZhciBub3RQaGFudG9tID0gKCBmdW5jdGlvbiggcCApIHtcblx0cmV0dXJuICEoIHAgJiYgcC52ZXJzaW9uICYmIHAudmVyc2lvbi5tYWpvciA+IDAgKTtcbn0gKSggd2luZG93LnBoYW50b20gKTtcblxuaWYgKCBub3RQaGFudG9tICYmIGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIiApIHtcblx0UVVuaXQubG9hZCgpO1xufSBlbHNlIHtcblx0YWRkRXZlbnQoIHdpbmRvdywgXCJsb2FkXCIsIFFVbml0LmxvYWQgKTtcbn1cblxuLypcbiAqIFRoaXMgZmlsZSBpcyBhIG1vZGlmaWVkIHZlcnNpb24gb2YgZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gncyBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uXG4gKiAoaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC9zb3VyY2UvYnJvd3NlL3RydW5rL2phdmFzY3JpcHQvZGlmZl9tYXRjaF9wYXRjaF91bmNvbXByZXNzZWQuanMpLFxuICogbW9kaWZpY2F0aW9ucyBhcmUgbGljZW5zZWQgYXMgbW9yZSBmdWxseSBzZXQgZm9ydGggaW4gTElDRU5TRS50eHQuXG4gKlxuICogVGhlIG9yaWdpbmFsIHNvdXJjZSBvZiBnb29nbGUtZGlmZi1tYXRjaC1wYXRjaCBpcyBhdHRyaWJ1dGFibGUgYW5kIGxpY2Vuc2VkIGFzIGZvbGxvd3M6XG4gKlxuICogQ29weXJpZ2h0IDIwMDYgR29vZ2xlIEluYy5cbiAqIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHBzOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIE1vcmUgSW5mbzpcbiAqICBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL1xuICpcbiAqIFVzYWdlOiBRVW5pdC5kaWZmKGV4cGVjdGVkLCBhY3R1YWwpXG4gKlxuICovXG5RVW5pdC5kaWZmID0gKCBmdW5jdGlvbigpIHtcblx0ZnVuY3Rpb24gRGlmZk1hdGNoUGF0Y2goKSB7XG5cdH1cblxuXHQvLyAgRElGRiBGVU5DVElPTlNcblxuXHQvKipcblx0ICogVGhlIGRhdGEgc3RydWN0dXJlIHJlcHJlc2VudGluZyBhIGRpZmYgaXMgYW4gYXJyYXkgb2YgdHVwbGVzOlxuXHQgKiBbW0RJRkZfREVMRVRFLCAnSGVsbG8nXSwgW0RJRkZfSU5TRVJULCAnR29vZGJ5ZSddLCBbRElGRl9FUVVBTCwgJyB3b3JsZC4nXV1cblx0ICogd2hpY2ggbWVhbnM6IGRlbGV0ZSAnSGVsbG8nLCBhZGQgJ0dvb2RieWUnIGFuZCBrZWVwICcgd29ybGQuJ1xuXHQgKi9cblx0dmFyIERJRkZfREVMRVRFID0gLTEsXG5cdFx0RElGRl9JTlNFUlQgPSAxLFxuXHRcdERJRkZfRVFVQUwgPSAwO1xuXG5cdC8qKlxuXHQgKiBGaW5kIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHR3byB0ZXh0cy4gIFNpbXBsaWZpZXMgdGhlIHByb2JsZW0gYnkgc3RyaXBwaW5nXG5cdCAqIGFueSBjb21tb24gcHJlZml4IG9yIHN1ZmZpeCBvZmYgdGhlIHRleHRzIGJlZm9yZSBkaWZmaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgT2xkIHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBOZXcgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtib29sZWFuPX0gb3B0Q2hlY2tsaW5lcyBPcHRpb25hbCBzcGVlZHVwIGZsYWcuIElmIHByZXNlbnQgYW5kIGZhbHNlLFxuXHQgKiAgICAgdGhlbiBkb24ndCBydW4gYSBsaW5lLWxldmVsIGRpZmYgZmlyc3QgdG8gaWRlbnRpZnkgdGhlIGNoYW5nZWQgYXJlYXMuXG5cdCAqICAgICBEZWZhdWx0cyB0byB0cnVlLCB3aGljaCBkb2VzIGEgZmFzdGVyLCBzbGlnaHRseSBsZXNzIG9wdGltYWwgZGlmZi5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLkRpZmZNYWluID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0Miwgb3B0Q2hlY2tsaW5lcyApIHtcblx0XHR2YXIgZGVhZGxpbmUsIGNoZWNrbGluZXMsIGNvbW1vbmxlbmd0aCxcblx0XHRcdGNvbW1vbnByZWZpeCwgY29tbW9uc3VmZml4LCBkaWZmcztcblxuXHRcdC8vIFRoZSBkaWZmIG11c3QgYmUgY29tcGxldGUgaW4gdXAgdG8gMSBzZWNvbmQuXG5cdFx0ZGVhZGxpbmUgPSAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCkgKyAxMDAwO1xuXG5cdFx0Ly8gQ2hlY2sgZm9yIG51bGwgaW5wdXRzLlxuXHRcdGlmICggdGV4dDEgPT09IG51bGwgfHwgdGV4dDIgPT09IG51bGwgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiTnVsbCBpbnB1dC4gKERpZmZNYWluKVwiICk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgZm9yIGVxdWFsaXR5IChzcGVlZHVwKS5cblx0XHRpZiAoIHRleHQxID09PSB0ZXh0MiApIHtcblx0XHRcdGlmICggdGV4dDEgKSB7XG5cdFx0XHRcdHJldHVybiBbXG5cdFx0XHRcdFx0WyBESUZGX0VRVUFMLCB0ZXh0MSBdXG5cdFx0XHRcdF07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXG5cdFx0aWYgKCB0eXBlb2Ygb3B0Q2hlY2tsaW5lcyA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdG9wdENoZWNrbGluZXMgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGNoZWNrbGluZXMgPSBvcHRDaGVja2xpbmVzO1xuXG5cdFx0Ly8gVHJpbSBvZmYgY29tbW9uIHByZWZpeCAoc3BlZWR1cCkuXG5cdFx0Y29tbW9ubGVuZ3RoID0gdGhpcy5kaWZmQ29tbW9uUHJlZml4KCB0ZXh0MSwgdGV4dDIgKTtcblx0XHRjb21tb25wcmVmaXggPSB0ZXh0MS5zdWJzdHJpbmcoIDAsIGNvbW1vbmxlbmd0aCApO1xuXHRcdHRleHQxID0gdGV4dDEuc3Vic3RyaW5nKCBjb21tb25sZW5ndGggKTtcblx0XHR0ZXh0MiA9IHRleHQyLnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cblx0XHQvLyBUcmltIG9mZiBjb21tb24gc3VmZml4IChzcGVlZHVwKS5cblx0XHRjb21tb25sZW5ndGggPSB0aGlzLmRpZmZDb21tb25TdWZmaXgoIHRleHQxLCB0ZXh0MiApO1xuXHRcdGNvbW1vbnN1ZmZpeCA9IHRleHQxLnN1YnN0cmluZyggdGV4dDEubGVuZ3RoIC0gY29tbW9ubGVuZ3RoICk7XG5cdFx0dGV4dDEgPSB0ZXh0MS5zdWJzdHJpbmcoIDAsIHRleHQxLmxlbmd0aCAtIGNvbW1vbmxlbmd0aCApO1xuXHRcdHRleHQyID0gdGV4dDIuc3Vic3RyaW5nKCAwLCB0ZXh0Mi5sZW5ndGggLSBjb21tb25sZW5ndGggKTtcblxuXHRcdC8vIENvbXB1dGUgdGhlIGRpZmYgb24gdGhlIG1pZGRsZSBibG9jay5cblx0XHRkaWZmcyA9IHRoaXMuZGlmZkNvbXB1dGUoIHRleHQxLCB0ZXh0MiwgY2hlY2tsaW5lcywgZGVhZGxpbmUgKTtcblxuXHRcdC8vIFJlc3RvcmUgdGhlIHByZWZpeCBhbmQgc3VmZml4LlxuXHRcdGlmICggY29tbW9ucHJlZml4ICkge1xuXHRcdFx0ZGlmZnMudW5zaGlmdCggWyBESUZGX0VRVUFMLCBjb21tb25wcmVmaXggXSApO1xuXHRcdH1cblx0XHRpZiAoIGNvbW1vbnN1ZmZpeCApIHtcblx0XHRcdGRpZmZzLnB1c2goIFsgRElGRl9FUVVBTCwgY29tbW9uc3VmZml4IF0gKTtcblx0XHR9XG5cdFx0dGhpcy5kaWZmQ2xlYW51cE1lcmdlKCBkaWZmcyApO1xuXHRcdHJldHVybiBkaWZmcztcblx0fTtcblxuXHQvKipcblx0ICogUmVkdWNlIHRoZSBudW1iZXIgb2YgZWRpdHMgYnkgZWxpbWluYXRpbmcgb3BlcmF0aW9uYWxseSB0cml2aWFsIGVxdWFsaXRpZXMuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDbGVhbnVwRWZmaWNpZW5jeSA9IGZ1bmN0aW9uKCBkaWZmcyApIHtcblx0XHR2YXIgY2hhbmdlcywgZXF1YWxpdGllcywgZXF1YWxpdGllc0xlbmd0aCwgbGFzdGVxdWFsaXR5LFxuXHRcdFx0cG9pbnRlciwgcHJlSW5zLCBwcmVEZWwsIHBvc3RJbnMsIHBvc3REZWw7XG5cdFx0Y2hhbmdlcyA9IGZhbHNlO1xuXHRcdGVxdWFsaXRpZXMgPSBbXTsgLy8gU3RhY2sgb2YgaW5kaWNlcyB3aGVyZSBlcXVhbGl0aWVzIGFyZSBmb3VuZC5cblx0XHRlcXVhbGl0aWVzTGVuZ3RoID0gMDsgLy8gS2VlcGluZyBvdXIgb3duIGxlbmd0aCB2YXIgaXMgZmFzdGVyIGluIEpTLlxuXHRcdC8qKiBAdHlwZSB7P3N0cmluZ30gKi9cblx0XHRsYXN0ZXF1YWxpdHkgPSBudWxsO1xuXG5cdFx0Ly8gQWx3YXlzIGVxdWFsIHRvIGRpZmZzW2VxdWFsaXRpZXNbZXF1YWxpdGllc0xlbmd0aCAtIDFdXVsxXVxuXHRcdHBvaW50ZXIgPSAwOyAvLyBJbmRleCBvZiBjdXJyZW50IHBvc2l0aW9uLlxuXG5cdFx0Ly8gSXMgdGhlcmUgYW4gaW5zZXJ0aW9uIG9wZXJhdGlvbiBiZWZvcmUgdGhlIGxhc3QgZXF1YWxpdHkuXG5cdFx0cHJlSW5zID0gZmFsc2U7XG5cblx0XHQvLyBJcyB0aGVyZSBhIGRlbGV0aW9uIG9wZXJhdGlvbiBiZWZvcmUgdGhlIGxhc3QgZXF1YWxpdHkuXG5cdFx0cHJlRGVsID0gZmFsc2U7XG5cblx0XHQvLyBJcyB0aGVyZSBhbiBpbnNlcnRpb24gb3BlcmF0aW9uIGFmdGVyIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHBvc3RJbnMgPSBmYWxzZTtcblxuXHRcdC8vIElzIHRoZXJlIGEgZGVsZXRpb24gb3BlcmF0aW9uIGFmdGVyIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHBvc3REZWwgPSBmYWxzZTtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cblx0XHRcdC8vIEVxdWFsaXR5IGZvdW5kLlxuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfRVFVQUwgKSB7XG5cdFx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMSBdLmxlbmd0aCA8IDQgJiYgKCBwb3N0SW5zIHx8IHBvc3REZWwgKSApIHtcblxuXHRcdFx0XHRcdC8vIENhbmRpZGF0ZSBmb3VuZC5cblx0XHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoKysgXSA9IHBvaW50ZXI7XG5cdFx0XHRcdFx0cHJlSW5zID0gcG9zdElucztcblx0XHRcdFx0XHRwcmVEZWwgPSBwb3N0RGVsO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRcdC8vIE5vdCBhIGNhbmRpZGF0ZSwgYW5kIGNhbiBuZXZlciBiZWNvbWUgb25lLlxuXHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGggPSAwO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdFx0cG9zdElucyA9IHBvc3REZWwgPSBmYWxzZTtcblxuXHRcdFx0Ly8gQW4gaW5zZXJ0aW9uIG9yIGRlbGV0aW9uLlxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9ERUxFVEUgKSB7XG5cdFx0XHRcdFx0cG9zdERlbCA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cG9zdElucyA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvKlxuXHRcdFx0XHQgKiBGaXZlIHR5cGVzIHRvIGJlIHNwbGl0OlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz48ZGVsPkI8L2RlbD5YWTxpbnM+QzwvaW5zPjxkZWw+RDwvZGVsPlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz5YPGlucz5DPC9pbnM+PGRlbD5EPC9kZWw+XG5cdFx0XHRcdCAqIDxpbnM+QTwvaW5zPjxkZWw+QjwvZGVsPlg8aW5zPkM8L2lucz5cblx0XHRcdFx0ICogPGlucz5BPC9kZWw+WDxpbnM+QzwvaW5zPjxkZWw+RDwvZGVsPlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz48ZGVsPkI8L2RlbD5YPGRlbD5DPC9kZWw+XG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRpZiAoIGxhc3RlcXVhbGl0eSAmJiAoICggcHJlSW5zICYmIHByZURlbCAmJiBwb3N0SW5zICYmIHBvc3REZWwgKSB8fFxuXHRcdFx0XHRcdFx0KCAoIGxhc3RlcXVhbGl0eS5sZW5ndGggPCAyICkgJiZcblx0XHRcdFx0XHRcdCggcHJlSW5zICsgcHJlRGVsICsgcG9zdElucyArIHBvc3REZWwgKSA9PT0gMyApICkgKSB7XG5cblx0XHRcdFx0XHQvLyBEdXBsaWNhdGUgcmVjb3JkLlxuXHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0sXG5cdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0WyBESUZGX0RFTEVURSwgbGFzdGVxdWFsaXR5IF1cblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0Ly8gQ2hhbmdlIHNlY29uZCBjb3B5IHRvIGluc2VydC5cblx0XHRcdFx0XHRkaWZmc1sgZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSArIDEgXVsgMCBdID0gRElGRl9JTlNFUlQ7XG5cdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tOyAvLyBUaHJvdyBhd2F5IHRoZSBlcXVhbGl0eSB3ZSBqdXN0IGRlbGV0ZWQ7XG5cdFx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblx0XHRcdFx0XHRpZiAoIHByZUlucyAmJiBwcmVEZWwgKSB7XG5cblx0XHRcdFx0XHRcdC8vIE5vIGNoYW5nZXMgbWFkZSB3aGljaCBjb3VsZCBhZmZlY3QgcHJldmlvdXMgZW50cnksIGtlZXAgZ29pbmcuXG5cdFx0XHRcdFx0XHRwb3N0SW5zID0gcG9zdERlbCA9IHRydWU7XG5cdFx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoID0gMDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tOyAvLyBUaHJvdyBhd2F5IHRoZSBwcmV2aW91cyBlcXVhbGl0eS5cblx0XHRcdFx0XHRcdHBvaW50ZXIgPSBlcXVhbGl0aWVzTGVuZ3RoID4gMCA/IGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gOiAtMTtcblx0XHRcdFx0XHRcdHBvc3RJbnMgPSBwb3N0RGVsID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNoYW5nZXMgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXG5cdFx0aWYgKCBjaGFuZ2VzICkge1xuXHRcdFx0dGhpcy5kaWZmQ2xlYW51cE1lcmdlKCBkaWZmcyApO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogQ29udmVydCBhIGRpZmYgYXJyYXkgaW50byBhIHByZXR0eSBIVE1MIHJlcG9ydC5cblx0ICogQHBhcmFtIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gZGlmZnMgQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwYXJhbSB7aW50ZWdlcn0gc3RyaW5nIHRvIGJlIGJlYXV0aWZpZWQuXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCByZXByZXNlbnRhdGlvbi5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmUHJldHR5SHRtbCA9IGZ1bmN0aW9uKCBkaWZmcyApIHtcblx0XHR2YXIgb3AsIGRhdGEsIHgsXG5cdFx0XHRodG1sID0gW107XG5cdFx0Zm9yICggeCA9IDA7IHggPCBkaWZmcy5sZW5ndGg7IHgrKyApIHtcblx0XHRcdG9wID0gZGlmZnNbIHggXVsgMCBdOyAvLyBPcGVyYXRpb24gKGluc2VydCwgZGVsZXRlLCBlcXVhbClcblx0XHRcdGRhdGEgPSBkaWZmc1sgeCBdWyAxIF07IC8vIFRleHQgb2YgY2hhbmdlLlxuXHRcdFx0c3dpdGNoICggb3AgKSB7XG5cdFx0XHRjYXNlIERJRkZfSU5TRVJUOlxuXHRcdFx0XHRodG1sWyB4IF0gPSBcIjxpbnM+XCIgKyBlc2NhcGVUZXh0KCBkYXRhICkgKyBcIjwvaW5zPlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9ERUxFVEU6XG5cdFx0XHRcdGh0bWxbIHggXSA9IFwiPGRlbD5cIiArIGVzY2FwZVRleHQoIGRhdGEgKSArIFwiPC9kZWw+XCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0VRVUFMOlxuXHRcdFx0XHRodG1sWyB4IF0gPSBcIjxzcGFuPlwiICsgZXNjYXBlVGV4dCggZGF0YSApICsgXCI8L3NwYW4+XCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gaHRtbC5qb2luKCBcIlwiICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIERldGVybWluZSB0aGUgY29tbW9uIHByZWZpeCBvZiB0d28gc3RyaW5ncy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge251bWJlcn0gVGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIGNvbW1vbiB0byB0aGUgc3RhcnQgb2YgZWFjaFxuXHQgKiAgICAgc3RyaW5nLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDb21tb25QcmVmaXggPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciBwb2ludGVybWlkLCBwb2ludGVybWF4LCBwb2ludGVybWluLCBwb2ludGVyc3RhcnQ7XG5cblx0XHQvLyBRdWljayBjaGVjayBmb3IgY29tbW9uIG51bGwgY2FzZXMuXG5cdFx0aWYgKCAhdGV4dDEgfHwgIXRleHQyIHx8IHRleHQxLmNoYXJBdCggMCApICE9PSB0ZXh0Mi5jaGFyQXQoIDAgKSApIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblxuXHRcdC8vIEJpbmFyeSBzZWFyY2guXG5cdFx0Ly8gUGVyZm9ybWFuY2UgYW5hbHlzaXM6IGh0dHBzOi8vbmVpbC5mcmFzZXIubmFtZS9uZXdzLzIwMDcvMTAvMDkvXG5cdFx0cG9pbnRlcm1pbiA9IDA7XG5cdFx0cG9pbnRlcm1heCA9IE1hdGgubWluKCB0ZXh0MS5sZW5ndGgsIHRleHQyLmxlbmd0aCApO1xuXHRcdHBvaW50ZXJtaWQgPSBwb2ludGVybWF4O1xuXHRcdHBvaW50ZXJzdGFydCA9IDA7XG5cdFx0d2hpbGUgKCBwb2ludGVybWluIDwgcG9pbnRlcm1pZCApIHtcblx0XHRcdGlmICggdGV4dDEuc3Vic3RyaW5nKCBwb2ludGVyc3RhcnQsIHBvaW50ZXJtaWQgKSA9PT1cblx0XHRcdFx0XHR0ZXh0Mi5zdWJzdHJpbmcoIHBvaW50ZXJzdGFydCwgcG9pbnRlcm1pZCApICkge1xuXHRcdFx0XHRwb2ludGVybWluID0gcG9pbnRlcm1pZDtcblx0XHRcdFx0cG9pbnRlcnN0YXJ0ID0gcG9pbnRlcm1pbjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBvaW50ZXJtYXggPSBwb2ludGVybWlkO1xuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcm1pZCA9IE1hdGguZmxvb3IoICggcG9pbnRlcm1heCAtIHBvaW50ZXJtaW4gKSAvIDIgKyBwb2ludGVybWluICk7XG5cdFx0fVxuXHRcdHJldHVybiBwb2ludGVybWlkO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgdGhlIGNvbW1vbiBzdWZmaXggb2YgdHdvIHN0cmluZ3MuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBjb21tb24gdG8gdGhlIGVuZCBvZiBlYWNoIHN0cmluZy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ29tbW9uU3VmZml4ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgcG9pbnRlcm1pZCwgcG9pbnRlcm1heCwgcG9pbnRlcm1pbiwgcG9pbnRlcmVuZDtcblxuXHRcdC8vIFF1aWNrIGNoZWNrIGZvciBjb21tb24gbnVsbCBjYXNlcy5cblx0XHRpZiAoICF0ZXh0MSB8fFxuXHRcdFx0XHQhdGV4dDIgfHxcblx0XHRcdFx0dGV4dDEuY2hhckF0KCB0ZXh0MS5sZW5ndGggLSAxICkgIT09IHRleHQyLmNoYXJBdCggdGV4dDIubGVuZ3RoIC0gMSApICkge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXG5cdFx0Ly8gQmluYXJ5IHNlYXJjaC5cblx0XHQvLyBQZXJmb3JtYW5jZSBhbmFseXNpczogaHR0cHM6Ly9uZWlsLmZyYXNlci5uYW1lL25ld3MvMjAwNy8xMC8wOS9cblx0XHRwb2ludGVybWluID0gMDtcblx0XHRwb2ludGVybWF4ID0gTWF0aC5taW4oIHRleHQxLmxlbmd0aCwgdGV4dDIubGVuZ3RoICk7XG5cdFx0cG9pbnRlcm1pZCA9IHBvaW50ZXJtYXg7XG5cdFx0cG9pbnRlcmVuZCA9IDA7XG5cdFx0d2hpbGUgKCBwb2ludGVybWluIDwgcG9pbnRlcm1pZCApIHtcblx0XHRcdGlmICggdGV4dDEuc3Vic3RyaW5nKCB0ZXh0MS5sZW5ndGggLSBwb2ludGVybWlkLCB0ZXh0MS5sZW5ndGggLSBwb2ludGVyZW5kICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuc3Vic3RyaW5nKCB0ZXh0Mi5sZW5ndGggLSBwb2ludGVybWlkLCB0ZXh0Mi5sZW5ndGggLSBwb2ludGVyZW5kICkgKSB7XG5cdFx0XHRcdHBvaW50ZXJtaW4gPSBwb2ludGVybWlkO1xuXHRcdFx0XHRwb2ludGVyZW5kID0gcG9pbnRlcm1pbjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBvaW50ZXJtYXggPSBwb2ludGVybWlkO1xuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcm1pZCA9IE1hdGguZmxvb3IoICggcG9pbnRlcm1heCAtIHBvaW50ZXJtaW4gKSAvIDIgKyBwb2ludGVybWluICk7XG5cdFx0fVxuXHRcdHJldHVybiBwb2ludGVybWlkO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBGaW5kIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHR3byB0ZXh0cy4gIEFzc3VtZXMgdGhhdCB0aGUgdGV4dHMgZG8gbm90XG5cdCAqIGhhdmUgYW55IGNvbW1vbiBwcmVmaXggb3Igc3VmZml4LlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgT2xkIHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBOZXcgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtib29sZWFufSBjaGVja2xpbmVzIFNwZWVkdXAgZmxhZy4gIElmIGZhbHNlLCB0aGVuIGRvbid0IHJ1biBhXG5cdCAqICAgICBsaW5lLWxldmVsIGRpZmYgZmlyc3QgdG8gaWRlbnRpZnkgdGhlIGNoYW5nZWQgYXJlYXMuXG5cdCAqICAgICBJZiB0cnVlLCB0aGVuIHJ1biBhIGZhc3Rlciwgc2xpZ2h0bHkgbGVzcyBvcHRpbWFsIGRpZmYuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIHdoZW4gdGhlIGRpZmYgc2hvdWxkIGJlIGNvbXBsZXRlIGJ5LlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNvbXB1dGUgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyLCBjaGVja2xpbmVzLCBkZWFkbGluZSApIHtcblx0XHR2YXIgZGlmZnMsIGxvbmd0ZXh0LCBzaG9ydHRleHQsIGksIGhtLFxuXHRcdFx0dGV4dDFBLCB0ZXh0MkEsIHRleHQxQiwgdGV4dDJCLFxuXHRcdFx0bWlkQ29tbW9uLCBkaWZmc0EsIGRpZmZzQjtcblxuXHRcdGlmICggIXRleHQxICkge1xuXG5cdFx0XHQvLyBKdXN0IGFkZCBzb21lIHRleHQgKHNwZWVkdXApLlxuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgdGV4dDIgXVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZiAoICF0ZXh0MiApIHtcblxuXHRcdFx0Ly8gSnVzdCBkZWxldGUgc29tZSB0ZXh0IChzcGVlZHVwKS5cblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdFsgRElGRl9ERUxFVEUsIHRleHQxIF1cblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0bG9uZ3RleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MSA6IHRleHQyO1xuXHRcdHNob3J0dGV4dCA9IHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCA/IHRleHQyIDogdGV4dDE7XG5cdFx0aSA9IGxvbmd0ZXh0LmluZGV4T2YoIHNob3J0dGV4dCApO1xuXHRcdGlmICggaSAhPT0gLTEgKSB7XG5cblx0XHRcdC8vIFNob3J0ZXIgdGV4dCBpcyBpbnNpZGUgdGhlIGxvbmdlciB0ZXh0IChzcGVlZHVwKS5cblx0XHRcdGRpZmZzID0gW1xuXHRcdFx0XHRbIERJRkZfSU5TRVJULCBsb25ndGV4dC5zdWJzdHJpbmcoIDAsIGkgKSBdLFxuXHRcdFx0XHRbIERJRkZfRVFVQUwsIHNob3J0dGV4dCBdLFxuXHRcdFx0XHRbIERJRkZfSU5TRVJULCBsb25ndGV4dC5zdWJzdHJpbmcoIGkgKyBzaG9ydHRleHQubGVuZ3RoICkgXVxuXHRcdFx0XTtcblxuXHRcdFx0Ly8gU3dhcCBpbnNlcnRpb25zIGZvciBkZWxldGlvbnMgaWYgZGlmZiBpcyByZXZlcnNlZC5cblx0XHRcdGlmICggdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoICkge1xuXHRcdFx0XHRkaWZmc1sgMCBdWyAwIF0gPSBkaWZmc1sgMiBdWyAwIF0gPSBESUZGX0RFTEVURTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkaWZmcztcblx0XHR9XG5cblx0XHRpZiAoIHNob3J0dGV4dC5sZW5ndGggPT09IDEgKSB7XG5cblx0XHRcdC8vIFNpbmdsZSBjaGFyYWN0ZXIgc3RyaW5nLlxuXHRcdFx0Ly8gQWZ0ZXIgdGhlIHByZXZpb3VzIHNwZWVkdXAsIHRoZSBjaGFyYWN0ZXIgY2FuJ3QgYmUgYW4gZXF1YWxpdHkuXG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0MSBdLFxuXHRcdFx0XHRbIERJRkZfSU5TRVJULCB0ZXh0MiBdXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgcHJvYmxlbSBjYW4gYmUgc3BsaXQgaW4gdHdvLlxuXHRcdGhtID0gdGhpcy5kaWZmSGFsZk1hdGNoKCB0ZXh0MSwgdGV4dDIgKTtcblx0XHRpZiAoIGhtICkge1xuXG5cdFx0XHQvLyBBIGhhbGYtbWF0Y2ggd2FzIGZvdW5kLCBzb3J0IG91dCB0aGUgcmV0dXJuIGRhdGEuXG5cdFx0XHR0ZXh0MUEgPSBobVsgMCBdO1xuXHRcdFx0dGV4dDFCID0gaG1bIDEgXTtcblx0XHRcdHRleHQyQSA9IGhtWyAyIF07XG5cdFx0XHR0ZXh0MkIgPSBobVsgMyBdO1xuXHRcdFx0bWlkQ29tbW9uID0gaG1bIDQgXTtcblxuXHRcdFx0Ly8gU2VuZCBib3RoIHBhaXJzIG9mZiBmb3Igc2VwYXJhdGUgcHJvY2Vzc2luZy5cblx0XHRcdGRpZmZzQSA9IHRoaXMuRGlmZk1haW4oIHRleHQxQSwgdGV4dDJBLCBjaGVja2xpbmVzLCBkZWFkbGluZSApO1xuXHRcdFx0ZGlmZnNCID0gdGhpcy5EaWZmTWFpbiggdGV4dDFCLCB0ZXh0MkIsIGNoZWNrbGluZXMsIGRlYWRsaW5lICk7XG5cblx0XHRcdC8vIE1lcmdlIHRoZSByZXN1bHRzLlxuXHRcdFx0cmV0dXJuIGRpZmZzQS5jb25jYXQoIFtcblx0XHRcdFx0WyBESUZGX0VRVUFMLCBtaWRDb21tb24gXVxuXHRcdFx0XSwgZGlmZnNCICk7XG5cdFx0fVxuXG5cdFx0aWYgKCBjaGVja2xpbmVzICYmIHRleHQxLmxlbmd0aCA+IDEwMCAmJiB0ZXh0Mi5sZW5ndGggPiAxMDAgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kaWZmTGluZU1vZGUoIHRleHQxLCB0ZXh0MiwgZGVhZGxpbmUgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5kaWZmQmlzZWN0KCB0ZXh0MSwgdGV4dDIsIGRlYWRsaW5lICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIERvIHRoZSB0d28gdGV4dHMgc2hhcmUgYSBzdWJzdHJpbmcgd2hpY2ggaXMgYXQgbGVhc3QgaGFsZiB0aGUgbGVuZ3RoIG9mIHRoZVxuXHQgKiBsb25nZXIgdGV4dD9cblx0ICogVGhpcyBzcGVlZHVwIGNhbiBwcm9kdWNlIG5vbi1taW5pbWFsIGRpZmZzLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59IEZpdmUgZWxlbWVudCBBcnJheSwgY29udGFpbmluZyB0aGUgcHJlZml4IG9mXG5cdCAqICAgICB0ZXh0MSwgdGhlIHN1ZmZpeCBvZiB0ZXh0MSwgdGhlIHByZWZpeCBvZiB0ZXh0MiwgdGhlIHN1ZmZpeCBvZlxuXHQgKiAgICAgdGV4dDIgYW5kIHRoZSBjb21tb24gbWlkZGxlLiAgT3IgbnVsbCBpZiB0aGVyZSB3YXMgbm8gbWF0Y2guXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkhhbGZNYXRjaCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIGxvbmd0ZXh0LCBzaG9ydHRleHQsIGRtcCxcblx0XHRcdHRleHQxQSwgdGV4dDJCLCB0ZXh0MkEsIHRleHQxQiwgbWlkQ29tbW9uLFxuXHRcdFx0aG0xLCBobTIsIGhtO1xuXG5cdFx0bG9uZ3RleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MSA6IHRleHQyO1xuXHRcdHNob3J0dGV4dCA9IHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCA/IHRleHQyIDogdGV4dDE7XG5cdFx0aWYgKCBsb25ndGV4dC5sZW5ndGggPCA0IHx8IHNob3J0dGV4dC5sZW5ndGggKiAyIDwgbG9uZ3RleHQubGVuZ3RoICkge1xuXHRcdFx0cmV0dXJuIG51bGw7IC8vIFBvaW50bGVzcy5cblx0XHR9XG5cdFx0ZG1wID0gdGhpczsgLy8gJ3RoaXMnIGJlY29tZXMgJ3dpbmRvdycgaW4gYSBjbG9zdXJlLlxuXG5cdFx0LyoqXG5cdFx0ICogRG9lcyBhIHN1YnN0cmluZyBvZiBzaG9ydHRleHQgZXhpc3Qgd2l0aGluIGxvbmd0ZXh0IHN1Y2ggdGhhdCB0aGUgc3Vic3RyaW5nXG5cdFx0ICogaXMgYXQgbGVhc3QgaGFsZiB0aGUgbGVuZ3RoIG9mIGxvbmd0ZXh0P1xuXHRcdCAqIENsb3N1cmUsIGJ1dCBkb2VzIG5vdCByZWZlcmVuY2UgYW55IGV4dGVybmFsIHZhcmlhYmxlcy5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gbG9uZ3RleHQgTG9uZ2VyIHN0cmluZy5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gc2hvcnR0ZXh0IFNob3J0ZXIgc3RyaW5nLlxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBpIFN0YXJ0IGluZGV4IG9mIHF1YXJ0ZXIgbGVuZ3RoIHN1YnN0cmluZyB3aXRoaW4gbG9uZ3RleHQuXG5cdFx0ICogQHJldHVybiB7QXJyYXkuPHN0cmluZz59IEZpdmUgZWxlbWVudCBBcnJheSwgY29udGFpbmluZyB0aGUgcHJlZml4IG9mXG5cdFx0ICogICAgIGxvbmd0ZXh0LCB0aGUgc3VmZml4IG9mIGxvbmd0ZXh0LCB0aGUgcHJlZml4IG9mIHNob3J0dGV4dCwgdGhlIHN1ZmZpeFxuXHRcdCAqICAgICBvZiBzaG9ydHRleHQgYW5kIHRoZSBjb21tb24gbWlkZGxlLiAgT3IgbnVsbCBpZiB0aGVyZSB3YXMgbm8gbWF0Y2guXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkaWZmSGFsZk1hdGNoSSggbG9uZ3RleHQsIHNob3J0dGV4dCwgaSApIHtcblx0XHRcdHZhciBzZWVkLCBqLCBiZXN0Q29tbW9uLCBwcmVmaXhMZW5ndGgsIHN1ZmZpeExlbmd0aCxcblx0XHRcdFx0YmVzdExvbmd0ZXh0QSwgYmVzdExvbmd0ZXh0QiwgYmVzdFNob3J0dGV4dEEsIGJlc3RTaG9ydHRleHRCO1xuXG5cdFx0XHQvLyBTdGFydCB3aXRoIGEgMS80IGxlbmd0aCBzdWJzdHJpbmcgYXQgcG9zaXRpb24gaSBhcyBhIHNlZWQuXG5cdFx0XHRzZWVkID0gbG9uZ3RleHQuc3Vic3RyaW5nKCBpLCBpICsgTWF0aC5mbG9vciggbG9uZ3RleHQubGVuZ3RoIC8gNCApICk7XG5cdFx0XHRqID0gLTE7XG5cdFx0XHRiZXN0Q29tbW9uID0gXCJcIjtcblx0XHRcdHdoaWxlICggKCBqID0gc2hvcnR0ZXh0LmluZGV4T2YoIHNlZWQsIGogKyAxICkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdHByZWZpeExlbmd0aCA9IGRtcC5kaWZmQ29tbW9uUHJlZml4KCBsb25ndGV4dC5zdWJzdHJpbmcoIGkgKSxcblx0XHRcdFx0XHRzaG9ydHRleHQuc3Vic3RyaW5nKCBqICkgKTtcblx0XHRcdFx0c3VmZml4TGVuZ3RoID0gZG1wLmRpZmZDb21tb25TdWZmaXgoIGxvbmd0ZXh0LnN1YnN0cmluZyggMCwgaSApLFxuXHRcdFx0XHRcdHNob3J0dGV4dC5zdWJzdHJpbmcoIDAsIGogKSApO1xuXHRcdFx0XHRpZiAoIGJlc3RDb21tb24ubGVuZ3RoIDwgc3VmZml4TGVuZ3RoICsgcHJlZml4TGVuZ3RoICkge1xuXHRcdFx0XHRcdGJlc3RDb21tb24gPSBzaG9ydHRleHQuc3Vic3RyaW5nKCBqIC0gc3VmZml4TGVuZ3RoLCBqICkgK1xuXHRcdFx0XHRcdFx0c2hvcnR0ZXh0LnN1YnN0cmluZyggaiwgaiArIHByZWZpeExlbmd0aCApO1xuXHRcdFx0XHRcdGJlc3RMb25ndGV4dEEgPSBsb25ndGV4dC5zdWJzdHJpbmcoIDAsIGkgLSBzdWZmaXhMZW5ndGggKTtcblx0XHRcdFx0XHRiZXN0TG9uZ3RleHRCID0gbG9uZ3RleHQuc3Vic3RyaW5nKCBpICsgcHJlZml4TGVuZ3RoICk7XG5cdFx0XHRcdFx0YmVzdFNob3J0dGV4dEEgPSBzaG9ydHRleHQuc3Vic3RyaW5nKCAwLCBqIC0gc3VmZml4TGVuZ3RoICk7XG5cdFx0XHRcdFx0YmVzdFNob3J0dGV4dEIgPSBzaG9ydHRleHQuc3Vic3RyaW5nKCBqICsgcHJlZml4TGVuZ3RoICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICggYmVzdENvbW1vbi5sZW5ndGggKiAyID49IGxvbmd0ZXh0Lmxlbmd0aCApIHtcblx0XHRcdFx0cmV0dXJuIFsgYmVzdExvbmd0ZXh0QSwgYmVzdExvbmd0ZXh0Qixcblx0XHRcdFx0XHRiZXN0U2hvcnR0ZXh0QSwgYmVzdFNob3J0dGV4dEIsIGJlc3RDb21tb25cblx0XHRcdFx0XTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEZpcnN0IGNoZWNrIGlmIHRoZSBzZWNvbmQgcXVhcnRlciBpcyB0aGUgc2VlZCBmb3IgYSBoYWxmLW1hdGNoLlxuXHRcdGhtMSA9IGRpZmZIYWxmTWF0Y2hJKCBsb25ndGV4dCwgc2hvcnR0ZXh0LFxuXHRcdFx0TWF0aC5jZWlsKCBsb25ndGV4dC5sZW5ndGggLyA0ICkgKTtcblxuXHRcdC8vIENoZWNrIGFnYWluIGJhc2VkIG9uIHRoZSB0aGlyZCBxdWFydGVyLlxuXHRcdGhtMiA9IGRpZmZIYWxmTWF0Y2hJKCBsb25ndGV4dCwgc2hvcnR0ZXh0LFxuXHRcdFx0TWF0aC5jZWlsKCBsb25ndGV4dC5sZW5ndGggLyAyICkgKTtcblx0XHRpZiAoICFobTEgJiYgIWhtMiApIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH0gZWxzZSBpZiAoICFobTIgKSB7XG5cdFx0XHRobSA9IGhtMTtcblx0XHR9IGVsc2UgaWYgKCAhaG0xICkge1xuXHRcdFx0aG0gPSBobTI7XG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0Ly8gQm90aCBtYXRjaGVkLiAgU2VsZWN0IHRoZSBsb25nZXN0LlxuXHRcdFx0aG0gPSBobTFbIDQgXS5sZW5ndGggPiBobTJbIDQgXS5sZW5ndGggPyBobTEgOiBobTI7XG5cdFx0fVxuXG5cdFx0Ly8gQSBoYWxmLW1hdGNoIHdhcyBmb3VuZCwgc29ydCBvdXQgdGhlIHJldHVybiBkYXRhLlxuXHRcdHRleHQxQSwgdGV4dDFCLCB0ZXh0MkEsIHRleHQyQjtcblx0XHRpZiAoIHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCApIHtcblx0XHRcdHRleHQxQSA9IGhtWyAwIF07XG5cdFx0XHR0ZXh0MUIgPSBobVsgMSBdO1xuXHRcdFx0dGV4dDJBID0gaG1bIDIgXTtcblx0XHRcdHRleHQyQiA9IGhtWyAzIF07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRleHQyQSA9IGhtWyAwIF07XG5cdFx0XHR0ZXh0MkIgPSBobVsgMSBdO1xuXHRcdFx0dGV4dDFBID0gaG1bIDIgXTtcblx0XHRcdHRleHQxQiA9IGhtWyAzIF07XG5cdFx0fVxuXHRcdG1pZENvbW1vbiA9IGhtWyA0IF07XG5cdFx0cmV0dXJuIFsgdGV4dDFBLCB0ZXh0MUIsIHRleHQyQSwgdGV4dDJCLCBtaWRDb21tb24gXTtcblx0fTtcblxuXHQvKipcblx0ICogRG8gYSBxdWljayBsaW5lLWxldmVsIGRpZmYgb24gYm90aCBzdHJpbmdzLCB0aGVuIHJlZGlmZiB0aGUgcGFydHMgZm9yXG5cdCAqIGdyZWF0ZXIgYWNjdXJhY3kuXG5cdCAqIFRoaXMgc3BlZWR1cCBjYW4gcHJvZHVjZSBub24tbWluaW1hbCBkaWZmcy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIHdoZW4gdGhlIGRpZmYgc2hvdWxkIGJlIGNvbXBsZXRlIGJ5LlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkxpbmVNb2RlID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIGEsIGRpZmZzLCBsaW5lYXJyYXksIHBvaW50ZXIsIGNvdW50SW5zZXJ0LFxuXHRcdFx0Y291bnREZWxldGUsIHRleHRJbnNlcnQsIHRleHREZWxldGUsIGo7XG5cblx0XHQvLyBTY2FuIHRoZSB0ZXh0IG9uIGEgbGluZS1ieS1saW5lIGJhc2lzIGZpcnN0LlxuXHRcdGEgPSB0aGlzLmRpZmZMaW5lc1RvQ2hhcnMoIHRleHQxLCB0ZXh0MiApO1xuXHRcdHRleHQxID0gYS5jaGFyczE7XG5cdFx0dGV4dDIgPSBhLmNoYXJzMjtcblx0XHRsaW5lYXJyYXkgPSBhLmxpbmVBcnJheTtcblxuXHRcdGRpZmZzID0gdGhpcy5EaWZmTWFpbiggdGV4dDEsIHRleHQyLCBmYWxzZSwgZGVhZGxpbmUgKTtcblxuXHRcdC8vIENvbnZlcnQgdGhlIGRpZmYgYmFjayB0byBvcmlnaW5hbCB0ZXh0LlxuXHRcdHRoaXMuZGlmZkNoYXJzVG9MaW5lcyggZGlmZnMsIGxpbmVhcnJheSApO1xuXG5cdFx0Ly8gRWxpbWluYXRlIGZyZWFrIG1hdGNoZXMgKGUuZy4gYmxhbmsgbGluZXMpXG5cdFx0dGhpcy5kaWZmQ2xlYW51cFNlbWFudGljKCBkaWZmcyApO1xuXG5cdFx0Ly8gUmVkaWZmIGFueSByZXBsYWNlbWVudCBibG9ja3MsIHRoaXMgdGltZSBjaGFyYWN0ZXItYnktY2hhcmFjdGVyLlxuXHRcdC8vIEFkZCBhIGR1bW15IGVudHJ5IGF0IHRoZSBlbmQuXG5cdFx0ZGlmZnMucHVzaCggWyBESUZGX0VRVUFMLCBcIlwiIF0gKTtcblx0XHRwb2ludGVyID0gMDtcblx0XHRjb3VudERlbGV0ZSA9IDA7XG5cdFx0Y291bnRJbnNlcnQgPSAwO1xuXHRcdHRleHREZWxldGUgPSBcIlwiO1xuXHRcdHRleHRJbnNlcnQgPSBcIlwiO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblx0XHRcdHN3aXRjaCAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSApIHtcblx0XHRcdGNhc2UgRElGRl9JTlNFUlQ6XG5cdFx0XHRcdGNvdW50SW5zZXJ0Kys7XG5cdFx0XHRcdHRleHRJbnNlcnQgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9ERUxFVEU6XG5cdFx0XHRcdGNvdW50RGVsZXRlKys7XG5cdFx0XHRcdHRleHREZWxldGUgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9FUVVBTDpcblxuXHRcdFx0XHQvLyBVcG9uIHJlYWNoaW5nIGFuIGVxdWFsaXR5LCBjaGVjayBmb3IgcHJpb3IgcmVkdW5kYW5jaWVzLlxuXHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlID49IDEgJiYgY291bnRJbnNlcnQgPj0gMSApIHtcblxuXHRcdFx0XHRcdC8vIERlbGV0ZSB0aGUgb2ZmZW5kaW5nIHJlY29yZHMgYW5kIGFkZCB0aGUgbWVyZ2VkIG9uZXMuXG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCxcblx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQgKTtcblx0XHRcdFx0XHRwb2ludGVyID0gcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQ7XG5cdFx0XHRcdFx0YSA9IHRoaXMuRGlmZk1haW4oIHRleHREZWxldGUsIHRleHRJbnNlcnQsIGZhbHNlLCBkZWFkbGluZSApO1xuXHRcdFx0XHRcdGZvciAoIGogPSBhLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tICkge1xuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyLCAwLCBhWyBqIF0gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cG9pbnRlciA9IHBvaW50ZXIgKyBhLmxlbmd0aDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3VudEluc2VydCA9IDA7XG5cdFx0XHRcdGNvdW50RGVsZXRlID0gMDtcblx0XHRcdFx0dGV4dERlbGV0ZSA9IFwiXCI7XG5cdFx0XHRcdHRleHRJbnNlcnQgPSBcIlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cdFx0ZGlmZnMucG9wKCk7IC8vIFJlbW92ZSB0aGUgZHVtbXkgZW50cnkgYXQgdGhlIGVuZC5cblxuXHRcdHJldHVybiBkaWZmcztcblx0fTtcblxuXHQvKipcblx0ICogRmluZCB0aGUgJ21pZGRsZSBzbmFrZScgb2YgYSBkaWZmLCBzcGxpdCB0aGUgcHJvYmxlbSBpbiB0d29cblx0ICogYW5kIHJldHVybiB0aGUgcmVjdXJzaXZlbHkgY29uc3RydWN0ZWQgZGlmZi5cblx0ICogU2VlIE15ZXJzIDE5ODYgcGFwZXI6IEFuIE8oTkQpIERpZmZlcmVuY2UgQWxnb3JpdGhtIGFuZCBJdHMgVmFyaWF0aW9ucy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIGF0IHdoaWNoIHRvIGJhaWwgaWYgbm90IHlldCBjb21wbGV0ZS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZCaXNlY3QgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyLCBkZWFkbGluZSApIHtcblx0XHR2YXIgdGV4dDFMZW5ndGgsIHRleHQyTGVuZ3RoLCBtYXhELCB2T2Zmc2V0LCB2TGVuZ3RoLFxuXHRcdFx0djEsIHYyLCB4LCBkZWx0YSwgZnJvbnQsIGsxc3RhcnQsIGsxZW5kLCBrMnN0YXJ0LFxuXHRcdFx0azJlbmQsIGsyT2Zmc2V0LCBrMU9mZnNldCwgeDEsIHgyLCB5MSwgeTIsIGQsIGsxLCBrMjtcblxuXHRcdC8vIENhY2hlIHRoZSB0ZXh0IGxlbmd0aHMgdG8gcHJldmVudCBtdWx0aXBsZSBjYWxscy5cblx0XHR0ZXh0MUxlbmd0aCA9IHRleHQxLmxlbmd0aDtcblx0XHR0ZXh0Mkxlbmd0aCA9IHRleHQyLmxlbmd0aDtcblx0XHRtYXhEID0gTWF0aC5jZWlsKCAoIHRleHQxTGVuZ3RoICsgdGV4dDJMZW5ndGggKSAvIDIgKTtcblx0XHR2T2Zmc2V0ID0gbWF4RDtcblx0XHR2TGVuZ3RoID0gMiAqIG1heEQ7XG5cdFx0djEgPSBuZXcgQXJyYXkoIHZMZW5ndGggKTtcblx0XHR2MiA9IG5ldyBBcnJheSggdkxlbmd0aCApO1xuXG5cdFx0Ly8gU2V0dGluZyBhbGwgZWxlbWVudHMgdG8gLTEgaXMgZmFzdGVyIGluIENocm9tZSAmIEZpcmVmb3ggdGhhbiBtaXhpbmdcblx0XHQvLyBpbnRlZ2VycyBhbmQgdW5kZWZpbmVkLlxuXHRcdGZvciAoIHggPSAwOyB4IDwgdkxlbmd0aDsgeCsrICkge1xuXHRcdFx0djFbIHggXSA9IC0xO1xuXHRcdFx0djJbIHggXSA9IC0xO1xuXHRcdH1cblx0XHR2MVsgdk9mZnNldCArIDEgXSA9IDA7XG5cdFx0djJbIHZPZmZzZXQgKyAxIF0gPSAwO1xuXHRcdGRlbHRhID0gdGV4dDFMZW5ndGggLSB0ZXh0Mkxlbmd0aDtcblxuXHRcdC8vIElmIHRoZSB0b3RhbCBudW1iZXIgb2YgY2hhcmFjdGVycyBpcyBvZGQsIHRoZW4gdGhlIGZyb250IHBhdGggd2lsbCBjb2xsaWRlXG5cdFx0Ly8gd2l0aCB0aGUgcmV2ZXJzZSBwYXRoLlxuXHRcdGZyb250ID0gKCBkZWx0YSAlIDIgIT09IDAgKTtcblxuXHRcdC8vIE9mZnNldHMgZm9yIHN0YXJ0IGFuZCBlbmQgb2YgayBsb29wLlxuXHRcdC8vIFByZXZlbnRzIG1hcHBpbmcgb2Ygc3BhY2UgYmV5b25kIHRoZSBncmlkLlxuXHRcdGsxc3RhcnQgPSAwO1xuXHRcdGsxZW5kID0gMDtcblx0XHRrMnN0YXJ0ID0gMDtcblx0XHRrMmVuZCA9IDA7XG5cdFx0Zm9yICggZCA9IDA7IGQgPCBtYXhEOyBkKysgKSB7XG5cblx0XHRcdC8vIEJhaWwgb3V0IGlmIGRlYWRsaW5lIGlzIHJlYWNoZWQuXG5cdFx0XHRpZiAoICggbmV3IERhdGUoKSApLmdldFRpbWUoKSA+IGRlYWRsaW5lICkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0Ly8gV2FsayB0aGUgZnJvbnQgcGF0aCBvbmUgc3RlcC5cblx0XHRcdGZvciAoIGsxID0gLWQgKyBrMXN0YXJ0OyBrMSA8PSBkIC0gazFlbmQ7IGsxICs9IDIgKSB7XG5cdFx0XHRcdGsxT2Zmc2V0ID0gdk9mZnNldCArIGsxO1xuXHRcdFx0XHRpZiAoIGsxID09PSAtZCB8fCAoIGsxICE9PSBkICYmIHYxWyBrMU9mZnNldCAtIDEgXSA8IHYxWyBrMU9mZnNldCArIDEgXSApICkge1xuXHRcdFx0XHRcdHgxID0gdjFbIGsxT2Zmc2V0ICsgMSBdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHgxID0gdjFbIGsxT2Zmc2V0IC0gMSBdICsgMTtcblx0XHRcdFx0fVxuXHRcdFx0XHR5MSA9IHgxIC0gazE7XG5cdFx0XHRcdHdoaWxlICggeDEgPCB0ZXh0MUxlbmd0aCAmJiB5MSA8IHRleHQyTGVuZ3RoICYmXG5cdFx0XHRcdFx0dGV4dDEuY2hhckF0KCB4MSApID09PSB0ZXh0Mi5jaGFyQXQoIHkxICkgKSB7XG5cdFx0XHRcdFx0eDErKztcblx0XHRcdFx0XHR5MSsrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHYxWyBrMU9mZnNldCBdID0geDE7XG5cdFx0XHRcdGlmICggeDEgPiB0ZXh0MUxlbmd0aCApIHtcblxuXHRcdFx0XHRcdC8vIFJhbiBvZmYgdGhlIHJpZ2h0IG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMWVuZCArPSAyO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCB5MSA+IHRleHQyTGVuZ3RoICkge1xuXG5cdFx0XHRcdFx0Ly8gUmFuIG9mZiB0aGUgYm90dG9tIG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMXN0YXJ0ICs9IDI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyb250ICkge1xuXHRcdFx0XHRcdGsyT2Zmc2V0ID0gdk9mZnNldCArIGRlbHRhIC0gazE7XG5cdFx0XHRcdFx0aWYgKCBrMk9mZnNldCA+PSAwICYmIGsyT2Zmc2V0IDwgdkxlbmd0aCAmJiB2MlsgazJPZmZzZXQgXSAhPT0gLTEgKSB7XG5cblx0XHRcdFx0XHRcdC8vIE1pcnJvciB4MiBvbnRvIHRvcC1sZWZ0IGNvb3JkaW5hdGUgc3lzdGVtLlxuXHRcdFx0XHRcdFx0eDIgPSB0ZXh0MUxlbmd0aCAtIHYyWyBrMk9mZnNldCBdO1xuXHRcdFx0XHRcdFx0aWYgKCB4MSA+PSB4MiApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBPdmVybGFwIGRldGVjdGVkLlxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaWZmQmlzZWN0U3BsaXQoIHRleHQxLCB0ZXh0MiwgeDEsIHkxLCBkZWFkbGluZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBXYWxrIHRoZSByZXZlcnNlIHBhdGggb25lIHN0ZXAuXG5cdFx0XHRmb3IgKCBrMiA9IC1kICsgazJzdGFydDsgazIgPD0gZCAtIGsyZW5kOyBrMiArPSAyICkge1xuXHRcdFx0XHRrMk9mZnNldCA9IHZPZmZzZXQgKyBrMjtcblx0XHRcdFx0aWYgKCBrMiA9PT0gLWQgfHwgKCBrMiAhPT0gZCAmJiB2MlsgazJPZmZzZXQgLSAxIF0gPCB2MlsgazJPZmZzZXQgKyAxIF0gKSApIHtcblx0XHRcdFx0XHR4MiA9IHYyWyBrMk9mZnNldCArIDEgXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR4MiA9IHYyWyBrMk9mZnNldCAtIDEgXSArIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0eTIgPSB4MiAtIGsyO1xuXHRcdFx0XHR3aGlsZSAoIHgyIDwgdGV4dDFMZW5ndGggJiYgeTIgPCB0ZXh0Mkxlbmd0aCAmJlxuXHRcdFx0XHRcdHRleHQxLmNoYXJBdCggdGV4dDFMZW5ndGggLSB4MiAtIDEgKSA9PT1cblx0XHRcdFx0XHR0ZXh0Mi5jaGFyQXQoIHRleHQyTGVuZ3RoIC0geTIgLSAxICkgKSB7XG5cdFx0XHRcdFx0eDIrKztcblx0XHRcdFx0XHR5MisrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHYyWyBrMk9mZnNldCBdID0geDI7XG5cdFx0XHRcdGlmICggeDIgPiB0ZXh0MUxlbmd0aCApIHtcblxuXHRcdFx0XHRcdC8vIFJhbiBvZmYgdGhlIGxlZnQgb2YgdGhlIGdyYXBoLlxuXHRcdFx0XHRcdGsyZW5kICs9IDI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIHkyID4gdGV4dDJMZW5ndGggKSB7XG5cblx0XHRcdFx0XHQvLyBSYW4gb2ZmIHRoZSB0b3Agb2YgdGhlIGdyYXBoLlxuXHRcdFx0XHRcdGsyc3RhcnQgKz0gMjtcblx0XHRcdFx0fSBlbHNlIGlmICggIWZyb250ICkge1xuXHRcdFx0XHRcdGsxT2Zmc2V0ID0gdk9mZnNldCArIGRlbHRhIC0gazI7XG5cdFx0XHRcdFx0aWYgKCBrMU9mZnNldCA+PSAwICYmIGsxT2Zmc2V0IDwgdkxlbmd0aCAmJiB2MVsgazFPZmZzZXQgXSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0XHR4MSA9IHYxWyBrMU9mZnNldCBdO1xuXHRcdFx0XHRcdFx0eTEgPSB2T2Zmc2V0ICsgeDEgLSBrMU9mZnNldDtcblxuXHRcdFx0XHRcdFx0Ly8gTWlycm9yIHgyIG9udG8gdG9wLWxlZnQgY29vcmRpbmF0ZSBzeXN0ZW0uXG5cdFx0XHRcdFx0XHR4MiA9IHRleHQxTGVuZ3RoIC0geDI7XG5cdFx0XHRcdFx0XHRpZiAoIHgxID49IHgyICkge1xuXG5cdFx0XHRcdFx0XHRcdC8vIE92ZXJsYXAgZGV0ZWN0ZWQuXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRpZmZCaXNlY3RTcGxpdCggdGV4dDEsIHRleHQyLCB4MSwgeTEsIGRlYWRsaW5lICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gRGlmZiB0b29rIHRvbyBsb25nIGFuZCBoaXQgdGhlIGRlYWRsaW5lIG9yXG5cdFx0Ly8gbnVtYmVyIG9mIGRpZmZzIGVxdWFscyBudW1iZXIgb2YgY2hhcmFjdGVycywgbm8gY29tbW9uYWxpdHkgYXQgYWxsLlxuXHRcdHJldHVybiBbXG5cdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0MSBdLFxuXHRcdFx0WyBESUZGX0lOU0VSVCwgdGV4dDIgXVxuXHRcdF07XG5cdH07XG5cblx0LyoqXG5cdCAqIEdpdmVuIHRoZSBsb2NhdGlvbiBvZiB0aGUgJ21pZGRsZSBzbmFrZScsIHNwbGl0IHRoZSBkaWZmIGluIHR3byBwYXJ0c1xuXHQgKiBhbmQgcmVjdXJzZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB4IEluZGV4IG9mIHNwbGl0IHBvaW50IGluIHRleHQxLlxuXHQgKiBAcGFyYW0ge251bWJlcn0geSBJbmRleCBvZiBzcGxpdCBwb2ludCBpbiB0ZXh0Mi5cblx0ICogQHBhcmFtIHtudW1iZXJ9IGRlYWRsaW5lIFRpbWUgYXQgd2hpY2ggdG8gYmFpbCBpZiBub3QgeWV0IGNvbXBsZXRlLlxuXHQgKiBAcmV0dXJuIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkJpc2VjdFNwbGl0ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgeCwgeSwgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIHRleHQxYSwgdGV4dDFiLCB0ZXh0MmEsIHRleHQyYiwgZGlmZnMsIGRpZmZzYjtcblx0XHR0ZXh0MWEgPSB0ZXh0MS5zdWJzdHJpbmcoIDAsIHggKTtcblx0XHR0ZXh0MmEgPSB0ZXh0Mi5zdWJzdHJpbmcoIDAsIHkgKTtcblx0XHR0ZXh0MWIgPSB0ZXh0MS5zdWJzdHJpbmcoIHggKTtcblx0XHR0ZXh0MmIgPSB0ZXh0Mi5zdWJzdHJpbmcoIHkgKTtcblxuXHRcdC8vIENvbXB1dGUgYm90aCBkaWZmcyBzZXJpYWxseS5cblx0XHRkaWZmcyA9IHRoaXMuRGlmZk1haW4oIHRleHQxYSwgdGV4dDJhLCBmYWxzZSwgZGVhZGxpbmUgKTtcblx0XHRkaWZmc2IgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MWIsIHRleHQyYiwgZmFsc2UsIGRlYWRsaW5lICk7XG5cblx0XHRyZXR1cm4gZGlmZnMuY29uY2F0KCBkaWZmc2IgKTtcblx0fTtcblxuXHQvKipcblx0ICogUmVkdWNlIHRoZSBudW1iZXIgb2YgZWRpdHMgYnkgZWxpbWluYXRpbmcgc2VtYW50aWNhbGx5IHRyaXZpYWwgZXF1YWxpdGllcy5cblx0ICogQHBhcmFtIHshQXJyYXkuPCFEaWZmTWF0Y2hQYXRjaC5EaWZmPn0gZGlmZnMgQXJyYXkgb2YgZGlmZiB0dXBsZXMuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNsZWFudXBTZW1hbnRpYyA9IGZ1bmN0aW9uKCBkaWZmcyApIHtcblx0XHR2YXIgY2hhbmdlcywgZXF1YWxpdGllcywgZXF1YWxpdGllc0xlbmd0aCwgbGFzdGVxdWFsaXR5LFxuXHRcdFx0cG9pbnRlciwgbGVuZ3RoSW5zZXJ0aW9uczIsIGxlbmd0aERlbGV0aW9uczIsIGxlbmd0aEluc2VydGlvbnMxLFxuXHRcdFx0bGVuZ3RoRGVsZXRpb25zMSwgZGVsZXRpb24sIGluc2VydGlvbiwgb3ZlcmxhcExlbmd0aDEsIG92ZXJsYXBMZW5ndGgyO1xuXHRcdGNoYW5nZXMgPSBmYWxzZTtcblx0XHRlcXVhbGl0aWVzID0gW107IC8vIFN0YWNrIG9mIGluZGljZXMgd2hlcmUgZXF1YWxpdGllcyBhcmUgZm91bmQuXG5cdFx0ZXF1YWxpdGllc0xlbmd0aCA9IDA7IC8vIEtlZXBpbmcgb3VyIG93biBsZW5ndGggdmFyIGlzIGZhc3RlciBpbiBKUy5cblx0XHQvKiogQHR5cGUgez9zdHJpbmd9ICovXG5cdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblxuXHRcdC8vIEFsd2F5cyBlcXVhbCB0byBkaWZmc1tlcXVhbGl0aWVzW2VxdWFsaXRpZXNMZW5ndGggLSAxXV1bMV1cblx0XHRwb2ludGVyID0gMDsgLy8gSW5kZXggb2YgY3VycmVudCBwb3NpdGlvbi5cblxuXHRcdC8vIE51bWJlciBvZiBjaGFyYWN0ZXJzIHRoYXQgY2hhbmdlZCBwcmlvciB0byB0aGUgZXF1YWxpdHkuXG5cdFx0bGVuZ3RoSW5zZXJ0aW9uczEgPSAwO1xuXHRcdGxlbmd0aERlbGV0aW9uczEgPSAwO1xuXG5cdFx0Ly8gTnVtYmVyIG9mIGNoYXJhY3RlcnMgdGhhdCBjaGFuZ2VkIGFmdGVyIHRoZSBlcXVhbGl0eS5cblx0XHRsZW5ndGhJbnNlcnRpb25zMiA9IDA7XG5cdFx0bGVuZ3RoRGVsZXRpb25zMiA9IDA7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfRVFVQUwgKSB7IC8vIEVxdWFsaXR5IGZvdW5kLlxuXHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoKysgXSA9IHBvaW50ZXI7XG5cdFx0XHRcdGxlbmd0aEluc2VydGlvbnMxID0gbGVuZ3RoSW5zZXJ0aW9uczI7XG5cdFx0XHRcdGxlbmd0aERlbGV0aW9uczEgPSBsZW5ndGhEZWxldGlvbnMyO1xuXHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMiA9IDA7XG5cdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgPSAwO1xuXHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHR9IGVsc2UgeyAvLyBBbiBpbnNlcnRpb24gb3IgZGVsZXRpb24uXG5cdFx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0lOU0VSVCApIHtcblx0XHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMiArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF0ubGVuZ3RoO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdLmxlbmd0aDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEVsaW1pbmF0ZSBhbiBlcXVhbGl0eSB0aGF0IGlzIHNtYWxsZXIgb3IgZXF1YWwgdG8gdGhlIGVkaXRzIG9uIGJvdGhcblx0XHRcdFx0Ly8gc2lkZXMgb2YgaXQuXG5cdFx0XHRcdGlmICggbGFzdGVxdWFsaXR5ICYmICggbGFzdGVxdWFsaXR5Lmxlbmd0aCA8PVxuXHRcdFx0XHRcdFx0TWF0aC5tYXgoIGxlbmd0aEluc2VydGlvbnMxLCBsZW5ndGhEZWxldGlvbnMxICkgKSAmJlxuXHRcdFx0XHRcdFx0KCBsYXN0ZXF1YWxpdHkubGVuZ3RoIDw9IE1hdGgubWF4KCBsZW5ndGhJbnNlcnRpb25zMixcblx0XHRcdFx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMiApICkgKSB7XG5cblx0XHRcdFx0XHQvLyBEdXBsaWNhdGUgcmVjb3JkLlxuXHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0sXG5cdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0WyBESUZGX0RFTEVURSwgbGFzdGVxdWFsaXR5IF1cblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0Ly8gQ2hhbmdlIHNlY29uZCBjb3B5IHRvIGluc2VydC5cblx0XHRcdFx0XHRkaWZmc1sgZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSArIDEgXVsgMCBdID0gRElGRl9JTlNFUlQ7XG5cblx0XHRcdFx0XHQvLyBUaHJvdyBhd2F5IHRoZSBlcXVhbGl0eSB3ZSBqdXN0IGRlbGV0ZWQuXG5cdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tO1xuXG5cdFx0XHRcdFx0Ly8gVGhyb3cgYXdheSB0aGUgcHJldmlvdXMgZXF1YWxpdHkgKGl0IG5lZWRzIHRvIGJlIHJlZXZhbHVhdGVkKS5cblx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoLS07XG5cdFx0XHRcdFx0cG9pbnRlciA9IGVxdWFsaXRpZXNMZW5ndGggPiAwID8gZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCAtIDEgXSA6IC0xO1xuXG5cdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvdW50ZXJzLlxuXHRcdFx0XHRcdGxlbmd0aEluc2VydGlvbnMxID0gMDtcblx0XHRcdFx0XHRsZW5ndGhEZWxldGlvbnMxID0gMDtcblx0XHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMiA9IDA7XG5cdFx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMiA9IDA7XG5cdFx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblx0XHRcdFx0XHRjaGFuZ2VzID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblxuXHRcdC8vIE5vcm1hbGl6ZSB0aGUgZGlmZi5cblx0XHRpZiAoIGNoYW5nZXMgKSB7XG5cdFx0XHR0aGlzLmRpZmZDbGVhbnVwTWVyZ2UoIGRpZmZzICk7XG5cdFx0fVxuXG5cdFx0Ly8gRmluZCBhbnkgb3ZlcmxhcHMgYmV0d2VlbiBkZWxldGlvbnMgYW5kIGluc2VydGlvbnMuXG5cdFx0Ly8gZS5nOiA8ZGVsPmFiY3h4eDwvZGVsPjxpbnM+eHh4ZGVmPC9pbnM+XG5cdFx0Ly8gICAtPiA8ZGVsPmFiYzwvZGVsPnh4eDxpbnM+ZGVmPC9pbnM+XG5cdFx0Ly8gZS5nOiA8ZGVsPnh4eGFiYzwvZGVsPjxpbnM+ZGVmeHh4PC9pbnM+XG5cdFx0Ly8gICAtPiA8aW5zPmRlZjwvaW5zPnh4eDxkZWw+YWJjPC9kZWw+XG5cdFx0Ly8gT25seSBleHRyYWN0IGFuIG92ZXJsYXAgaWYgaXQgaXMgYXMgYmlnIGFzIHRoZSBlZGl0IGFoZWFkIG9yIGJlaGluZCBpdC5cblx0XHRwb2ludGVyID0gMTtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIC0gMSBdWyAwIF0gPT09IERJRkZfREVMRVRFICYmXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0lOU0VSVCApIHtcblx0XHRcdFx0ZGVsZXRpb24gPSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdO1xuXHRcdFx0XHRpbnNlcnRpb24gPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdG92ZXJsYXBMZW5ndGgxID0gdGhpcy5kaWZmQ29tbW9uT3ZlcmxhcCggZGVsZXRpb24sIGluc2VydGlvbiApO1xuXHRcdFx0XHRvdmVybGFwTGVuZ3RoMiA9IHRoaXMuZGlmZkNvbW1vbk92ZXJsYXAoIGluc2VydGlvbiwgZGVsZXRpb24gKTtcblx0XHRcdFx0aWYgKCBvdmVybGFwTGVuZ3RoMSA+PSBvdmVybGFwTGVuZ3RoMiApIHtcblx0XHRcdFx0XHRpZiAoIG92ZXJsYXBMZW5ndGgxID49IGRlbGV0aW9uLmxlbmd0aCAvIDIgfHxcblx0XHRcdFx0XHRcdFx0b3ZlcmxhcExlbmd0aDEgPj0gaW5zZXJ0aW9uLmxlbmd0aCAvIDIgKSB7XG5cblx0XHRcdFx0XHRcdC8vIE92ZXJsYXAgZm91bmQuICBJbnNlcnQgYW4gZXF1YWxpdHkgYW5kIHRyaW0gdGhlIHN1cnJvdW5kaW5nIGVkaXRzLlxuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKFxuXHRcdFx0XHRcdFx0XHRwb2ludGVyLFxuXHRcdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0XHRbIERJRkZfRVFVQUwsIGluc2VydGlvbi5zdWJzdHJpbmcoIDAsIG92ZXJsYXBMZW5ndGgxICkgXVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gPVxuXHRcdFx0XHRcdFx0XHRkZWxldGlvbi5zdWJzdHJpbmcoIDAsIGRlbGV0aW9uLmxlbmd0aCAtIG92ZXJsYXBMZW5ndGgxICk7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdID0gaW5zZXJ0aW9uLnN1YnN0cmluZyggb3ZlcmxhcExlbmd0aDEgKTtcblx0XHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKCBvdmVybGFwTGVuZ3RoMiA+PSBkZWxldGlvbi5sZW5ndGggLyAyIHx8XG5cdFx0XHRcdFx0XHRcdG92ZXJsYXBMZW5ndGgyID49IGluc2VydGlvbi5sZW5ndGggLyAyICkge1xuXG5cdFx0XHRcdFx0XHQvLyBSZXZlcnNlIG92ZXJsYXAgZm91bmQuXG5cdFx0XHRcdFx0XHQvLyBJbnNlcnQgYW4gZXF1YWxpdHkgYW5kIHN3YXAgYW5kIHRyaW0gdGhlIHN1cnJvdW5kaW5nIGVkaXRzLlxuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKFxuXHRcdFx0XHRcdFx0XHRwb2ludGVyLFxuXHRcdFx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFx0XHRbIERJRkZfRVFVQUwsIGRlbGV0aW9uLnN1YnN0cmluZyggMCwgb3ZlcmxhcExlbmd0aDIgKSBdXG5cdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMCBdID0gRElGRl9JTlNFUlQ7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdFx0aW5zZXJ0aW9uLnN1YnN0cmluZyggMCwgaW5zZXJ0aW9uLmxlbmd0aCAtIG92ZXJsYXBMZW5ndGgyICk7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMCBdID0gRElGRl9ERUxFVEU7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdFx0ZGVsZXRpb24uc3Vic3RyaW5nKCBvdmVybGFwTGVuZ3RoMiApO1xuXHRcdFx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgaWYgdGhlIHN1ZmZpeCBvZiBvbmUgc3RyaW5nIGlzIHRoZSBwcmVmaXggb2YgYW5vdGhlci5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge251bWJlcn0gVGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIGNvbW1vbiB0byB0aGUgZW5kIG9mIHRoZSBmaXJzdFxuXHQgKiAgICAgc3RyaW5nIGFuZCB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzdHJpbmcuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNvbW1vbk92ZXJsYXAgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciB0ZXh0MUxlbmd0aCwgdGV4dDJMZW5ndGgsIHRleHRMZW5ndGgsXG5cdFx0XHRiZXN0LCBsZW5ndGgsIHBhdHRlcm4sIGZvdW5kO1xuXG5cdFx0Ly8gQ2FjaGUgdGhlIHRleHQgbGVuZ3RocyB0byBwcmV2ZW50IG11bHRpcGxlIGNhbGxzLlxuXHRcdHRleHQxTGVuZ3RoID0gdGV4dDEubGVuZ3RoO1xuXHRcdHRleHQyTGVuZ3RoID0gdGV4dDIubGVuZ3RoO1xuXG5cdFx0Ly8gRWxpbWluYXRlIHRoZSBudWxsIGNhc2UuXG5cdFx0aWYgKCB0ZXh0MUxlbmd0aCA9PT0gMCB8fCB0ZXh0Mkxlbmd0aCA9PT0gMCApIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblxuXHRcdC8vIFRydW5jYXRlIHRoZSBsb25nZXIgc3RyaW5nLlxuXHRcdGlmICggdGV4dDFMZW5ndGggPiB0ZXh0Mkxlbmd0aCApIHtcblx0XHRcdHRleHQxID0gdGV4dDEuc3Vic3RyaW5nKCB0ZXh0MUxlbmd0aCAtIHRleHQyTGVuZ3RoICk7XG5cdFx0fSBlbHNlIGlmICggdGV4dDFMZW5ndGggPCB0ZXh0Mkxlbmd0aCApIHtcblx0XHRcdHRleHQyID0gdGV4dDIuc3Vic3RyaW5nKCAwLCB0ZXh0MUxlbmd0aCApO1xuXHRcdH1cblx0XHR0ZXh0TGVuZ3RoID0gTWF0aC5taW4oIHRleHQxTGVuZ3RoLCB0ZXh0Mkxlbmd0aCApO1xuXG5cdFx0Ly8gUXVpY2sgY2hlY2sgZm9yIHRoZSB3b3JzdCBjYXNlLlxuXHRcdGlmICggdGV4dDEgPT09IHRleHQyICkge1xuXHRcdFx0cmV0dXJuIHRleHRMZW5ndGg7XG5cdFx0fVxuXG5cdFx0Ly8gU3RhcnQgYnkgbG9va2luZyBmb3IgYSBzaW5nbGUgY2hhcmFjdGVyIG1hdGNoXG5cdFx0Ly8gYW5kIGluY3JlYXNlIGxlbmd0aCB1bnRpbCBubyBtYXRjaCBpcyBmb3VuZC5cblx0XHQvLyBQZXJmb3JtYW5jZSBhbmFseXNpczogaHR0cHM6Ly9uZWlsLmZyYXNlci5uYW1lL25ld3MvMjAxMC8xMS8wNC9cblx0XHRiZXN0ID0gMDtcblx0XHRsZW5ndGggPSAxO1xuXHRcdHdoaWxlICggdHJ1ZSApIHtcblx0XHRcdHBhdHRlcm4gPSB0ZXh0MS5zdWJzdHJpbmcoIHRleHRMZW5ndGggLSBsZW5ndGggKTtcblx0XHRcdGZvdW5kID0gdGV4dDIuaW5kZXhPZiggcGF0dGVybiApO1xuXHRcdFx0aWYgKCBmb3VuZCA9PT0gLTEgKSB7XG5cdFx0XHRcdHJldHVybiBiZXN0O1xuXHRcdFx0fVxuXHRcdFx0bGVuZ3RoICs9IGZvdW5kO1xuXHRcdFx0aWYgKCBmb3VuZCA9PT0gMCB8fCB0ZXh0MS5zdWJzdHJpbmcoIHRleHRMZW5ndGggLSBsZW5ndGggKSA9PT1cblx0XHRcdFx0XHR0ZXh0Mi5zdWJzdHJpbmcoIDAsIGxlbmd0aCApICkge1xuXHRcdFx0XHRiZXN0ID0gbGVuZ3RoO1xuXHRcdFx0XHRsZW5ndGgrKztcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIFNwbGl0IHR3byB0ZXh0cyBpbnRvIGFuIGFycmF5IG9mIHN0cmluZ3MuICBSZWR1Y2UgdGhlIHRleHRzIHRvIGEgc3RyaW5nIG9mXG5cdCAqIGhhc2hlcyB3aGVyZSBlYWNoIFVuaWNvZGUgY2hhcmFjdGVyIHJlcHJlc2VudHMgb25lIGxpbmUuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHt7Y2hhcnMxOiBzdHJpbmcsIGNoYXJzMjogc3RyaW5nLCBsaW5lQXJyYXk6ICFBcnJheS48c3RyaW5nPn19XG5cdCAqICAgICBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgZW5jb2RlZCB0ZXh0MSwgdGhlIGVuY29kZWQgdGV4dDIgYW5kXG5cdCAqICAgICB0aGUgYXJyYXkgb2YgdW5pcXVlIHN0cmluZ3MuXG5cdCAqICAgICBUaGUgemVyb3RoIGVsZW1lbnQgb2YgdGhlIGFycmF5IG9mIHVuaXF1ZSBzdHJpbmdzIGlzIGludGVudGlvbmFsbHkgYmxhbmsuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkxpbmVzVG9DaGFycyA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIGxpbmVBcnJheSwgbGluZUhhc2gsIGNoYXJzMSwgY2hhcnMyO1xuXHRcdGxpbmVBcnJheSA9IFtdOyAvLyBFLmcuIGxpbmVBcnJheVs0XSA9PT0gJ0hlbGxvXFxuJ1xuXHRcdGxpbmVIYXNoID0ge307ICAvLyBFLmcuIGxpbmVIYXNoWydIZWxsb1xcbiddID09PSA0XG5cblx0XHQvLyAnXFx4MDAnIGlzIGEgdmFsaWQgY2hhcmFjdGVyLCBidXQgdmFyaW91cyBkZWJ1Z2dlcnMgZG9uJ3QgbGlrZSBpdC5cblx0XHQvLyBTbyB3ZSdsbCBpbnNlcnQgYSBqdW5rIGVudHJ5IHRvIGF2b2lkIGdlbmVyYXRpbmcgYSBudWxsIGNoYXJhY3Rlci5cblx0XHRsaW5lQXJyYXlbIDAgXSA9IFwiXCI7XG5cblx0XHQvKipcblx0XHQgKiBTcGxpdCBhIHRleHQgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzLiAgUmVkdWNlIHRoZSB0ZXh0cyB0byBhIHN0cmluZyBvZlxuXHRcdCAqIGhhc2hlcyB3aGVyZSBlYWNoIFVuaWNvZGUgY2hhcmFjdGVyIHJlcHJlc2VudHMgb25lIGxpbmUuXG5cdFx0ICogTW9kaWZpZXMgbGluZWFycmF5IGFuZCBsaW5laGFzaCB0aHJvdWdoIGJlaW5nIGEgY2xvc3VyZS5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBTdHJpbmcgdG8gZW5jb2RlLlxuXHRcdCAqIEByZXR1cm4ge3N0cmluZ30gRW5jb2RlZCBzdHJpbmcuXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkaWZmTGluZXNUb0NoYXJzTXVuZ2UoIHRleHQgKSB7XG5cdFx0XHR2YXIgY2hhcnMsIGxpbmVTdGFydCwgbGluZUVuZCwgbGluZUFycmF5TGVuZ3RoLCBsaW5lO1xuXHRcdFx0Y2hhcnMgPSBcIlwiO1xuXG5cdFx0XHQvLyBXYWxrIHRoZSB0ZXh0LCBwdWxsaW5nIG91dCBhIHN1YnN0cmluZyBmb3IgZWFjaCBsaW5lLlxuXHRcdFx0Ly8gdGV4dC5zcGxpdCgnXFxuJykgd291bGQgd291bGQgdGVtcG9yYXJpbHkgZG91YmxlIG91ciBtZW1vcnkgZm9vdHByaW50LlxuXHRcdFx0Ly8gTW9kaWZ5aW5nIHRleHQgd291bGQgY3JlYXRlIG1hbnkgbGFyZ2Ugc3RyaW5ncyB0byBnYXJiYWdlIGNvbGxlY3QuXG5cdFx0XHRsaW5lU3RhcnQgPSAwO1xuXHRcdFx0bGluZUVuZCA9IC0xO1xuXG5cdFx0XHQvLyBLZWVwaW5nIG91ciBvd24gbGVuZ3RoIHZhcmlhYmxlIGlzIGZhc3RlciB0aGFuIGxvb2tpbmcgaXQgdXAuXG5cdFx0XHRsaW5lQXJyYXlMZW5ndGggPSBsaW5lQXJyYXkubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKCBsaW5lRW5kIDwgdGV4dC5sZW5ndGggLSAxICkge1xuXHRcdFx0XHRsaW5lRW5kID0gdGV4dC5pbmRleE9mKCBcIlxcblwiLCBsaW5lU3RhcnQgKTtcblx0XHRcdFx0aWYgKCBsaW5lRW5kID09PSAtMSApIHtcblx0XHRcdFx0XHRsaW5lRW5kID0gdGV4dC5sZW5ndGggLSAxO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxpbmUgPSB0ZXh0LnN1YnN0cmluZyggbGluZVN0YXJ0LCBsaW5lRW5kICsgMSApO1xuXHRcdFx0XHRsaW5lU3RhcnQgPSBsaW5lRW5kICsgMTtcblxuXHRcdFx0XHRpZiAoIGxpbmVIYXNoLmhhc093blByb3BlcnR5ID8gbGluZUhhc2guaGFzT3duUHJvcGVydHkoIGxpbmUgKSA6XG5cdFx0XHRcdFx0XHRcdCggbGluZUhhc2hbIGxpbmUgXSAhPT0gdW5kZWZpbmVkICkgKSB7XG5cdFx0XHRcdFx0Y2hhcnMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSggbGluZUhhc2hbIGxpbmUgXSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNoYXJzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoIGxpbmVBcnJheUxlbmd0aCApO1xuXHRcdFx0XHRcdGxpbmVIYXNoWyBsaW5lIF0gPSBsaW5lQXJyYXlMZW5ndGg7XG5cdFx0XHRcdFx0bGluZUFycmF5WyBsaW5lQXJyYXlMZW5ndGgrKyBdID0gbGluZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGNoYXJzO1xuXHRcdH1cblxuXHRcdGNoYXJzMSA9IGRpZmZMaW5lc1RvQ2hhcnNNdW5nZSggdGV4dDEgKTtcblx0XHRjaGFyczIgPSBkaWZmTGluZXNUb0NoYXJzTXVuZ2UoIHRleHQyICk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNoYXJzMTogY2hhcnMxLFxuXHRcdFx0Y2hhcnMyOiBjaGFyczIsXG5cdFx0XHRsaW5lQXJyYXk6IGxpbmVBcnJheVxuXHRcdH07XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlaHlkcmF0ZSB0aGUgdGV4dCBpbiBhIGRpZmYgZnJvbSBhIHN0cmluZyBvZiBsaW5lIGhhc2hlcyB0byByZWFsIGxpbmVzIG9mXG5cdCAqIHRleHQuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcGFyYW0geyFBcnJheS48c3RyaW5nPn0gbGluZUFycmF5IEFycmF5IG9mIHVuaXF1ZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDaGFyc1RvTGluZXMgPSBmdW5jdGlvbiggZGlmZnMsIGxpbmVBcnJheSApIHtcblx0XHR2YXIgeCwgY2hhcnMsIHRleHQsIHk7XG5cdFx0Zm9yICggeCA9IDA7IHggPCBkaWZmcy5sZW5ndGg7IHgrKyApIHtcblx0XHRcdGNoYXJzID0gZGlmZnNbIHggXVsgMSBdO1xuXHRcdFx0dGV4dCA9IFtdO1xuXHRcdFx0Zm9yICggeSA9IDA7IHkgPCBjaGFycy5sZW5ndGg7IHkrKyApIHtcblx0XHRcdFx0dGV4dFsgeSBdID0gbGluZUFycmF5WyBjaGFycy5jaGFyQ29kZUF0KCB5ICkgXTtcblx0XHRcdH1cblx0XHRcdGRpZmZzWyB4IF1bIDEgXSA9IHRleHQuam9pbiggXCJcIiApO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogUmVvcmRlciBhbmQgbWVyZ2UgbGlrZSBlZGl0IHNlY3Rpb25zLiAgTWVyZ2UgZXF1YWxpdGllcy5cblx0ICogQW55IGVkaXQgc2VjdGlvbiBjYW4gbW92ZSBhcyBsb25nIGFzIGl0IGRvZXNuJ3QgY3Jvc3MgYW4gZXF1YWxpdHkuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDbGVhbnVwTWVyZ2UgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIHBvaW50ZXIsIGNvdW50RGVsZXRlLCBjb3VudEluc2VydCwgdGV4dEluc2VydCwgdGV4dERlbGV0ZSxcblx0XHRcdGNvbW1vbmxlbmd0aCwgY2hhbmdlcywgZGlmZlBvaW50ZXIsIHBvc2l0aW9uO1xuXHRcdGRpZmZzLnB1c2goIFsgRElGRl9FUVVBTCwgXCJcIiBdICk7IC8vIEFkZCBhIGR1bW15IGVudHJ5IGF0IHRoZSBlbmQuXG5cdFx0cG9pbnRlciA9IDA7XG5cdFx0Y291bnREZWxldGUgPSAwO1xuXHRcdGNvdW50SW5zZXJ0ID0gMDtcblx0XHR0ZXh0RGVsZXRlID0gXCJcIjtcblx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHRjb21tb25sZW5ndGg7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXHRcdFx0c3dpdGNoICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdICkge1xuXHRcdFx0Y2FzZSBESUZGX0lOU0VSVDpcblx0XHRcdFx0Y291bnRJbnNlcnQrKztcblx0XHRcdFx0dGV4dEluc2VydCArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfREVMRVRFOlxuXHRcdFx0XHRjb3VudERlbGV0ZSsrO1xuXHRcdFx0XHR0ZXh0RGVsZXRlICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9FUVVBTDpcblxuXHRcdFx0XHQvLyBVcG9uIHJlYWNoaW5nIGFuIGVxdWFsaXR5LCBjaGVjayBmb3IgcHJpb3IgcmVkdW5kYW5jaWVzLlxuXHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQgPiAxICkge1xuXHRcdFx0XHRcdGlmICggY291bnREZWxldGUgIT09IDAgJiYgY291bnRJbnNlcnQgIT09IDAgKSB7XG5cblx0XHRcdFx0XHRcdC8vIEZhY3RvciBvdXQgYW55IGNvbW1vbiBwcmVmaXhlcy5cblx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCA9IHRoaXMuZGlmZkNvbW1vblByZWZpeCggdGV4dEluc2VydCwgdGV4dERlbGV0ZSApO1xuXHRcdFx0XHRcdFx0aWYgKCBjb21tb25sZW5ndGggIT09IDAgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggKCBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCApID4gMCAmJlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0IC0gMSBdWyAwIF0gPT09XG5cdFx0XHRcdFx0XHRcdFx0XHRESUZGX0VRVUFMICkge1xuXHRcdFx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCAtIDEgXVsgMSBdICs9XG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0LnN1YnN0cmluZyggMCwgY29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCAwLCAwLCBbIERJRkZfRVFVQUwsXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0LnN1YnN0cmluZyggMCwgY29tbW9ubGVuZ3RoIClcblx0XHRcdFx0XHRcdFx0XHRdICk7XG5cdFx0XHRcdFx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHRleHRJbnNlcnQgPSB0ZXh0SW5zZXJ0LnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHRcdHRleHREZWxldGUgPSB0ZXh0RGVsZXRlLnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIEZhY3RvciBvdXQgYW55IGNvbW1vbiBzdWZmaXhpZXMuXG5cdFx0XHRcdFx0XHRjb21tb25sZW5ndGggPSB0aGlzLmRpZmZDb21tb25TdWZmaXgoIHRleHRJbnNlcnQsIHRleHREZWxldGUgKTtcblx0XHRcdFx0XHRcdGlmICggY29tbW9ubGVuZ3RoICE9PSAwICkge1xuXHRcdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0gPSB0ZXh0SW5zZXJ0LnN1YnN0cmluZyggdGV4dEluc2VydC5sZW5ndGggLVxuXHRcdFx0XHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoICkgKyBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdFx0XHRcdHRleHRJbnNlcnQgPSB0ZXh0SW5zZXJ0LnN1YnN0cmluZyggMCwgdGV4dEluc2VydC5sZW5ndGggLVxuXHRcdFx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0XHR0ZXh0RGVsZXRlID0gdGV4dERlbGV0ZS5zdWJzdHJpbmcoIDAsIHRleHREZWxldGUubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0XHRjb21tb25sZW5ndGggKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBEZWxldGUgdGhlIG9mZmVuZGluZyByZWNvcmRzIGFuZCBhZGQgdGhlIG1lcmdlZCBvbmVzLlxuXHRcdFx0XHRcdGlmICggY291bnREZWxldGUgPT09IDAgKSB7XG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgLSBjb3VudEluc2VydCxcblx0XHRcdFx0XHRcdFx0Y291bnREZWxldGUgKyBjb3VudEluc2VydCwgWyBESUZGX0lOU0VSVCwgdGV4dEluc2VydCBdICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggY291bnRJbnNlcnQgPT09IDAgKSB7XG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgLSBjb3VudERlbGV0ZSxcblx0XHRcdFx0XHRcdFx0Y291bnREZWxldGUgKyBjb3VudEluc2VydCwgWyBESUZGX0RFTEVURSwgdGV4dERlbGV0ZSBdICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdFx0cG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRcdFsgRElGRl9ERUxFVEUsIHRleHREZWxldGUgXSwgWyBESUZGX0lOU0VSVCwgdGV4dEluc2VydCBdXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwb2ludGVyID0gcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQgK1xuXHRcdFx0XHRcdFx0KCBjb3VudERlbGV0ZSA/IDEgOiAwICkgKyAoIGNvdW50SW5zZXJ0ID8gMSA6IDAgKSArIDE7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIHBvaW50ZXIgIT09IDAgJiYgZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDAgXSA9PT0gRElGRl9FUVVBTCApIHtcblxuXHRcdFx0XHRcdC8vIE1lcmdlIHRoaXMgZXF1YWxpdHkgd2l0aCB0aGUgcHJldmlvdXMgb25lLlxuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciwgMSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3VudEluc2VydCA9IDA7XG5cdFx0XHRcdGNvdW50RGVsZXRlID0gMDtcblx0XHRcdFx0dGV4dERlbGV0ZSA9IFwiXCI7XG5cdFx0XHRcdHRleHRJbnNlcnQgPSBcIlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCBkaWZmc1sgZGlmZnMubGVuZ3RoIC0gMSBdWyAxIF0gPT09IFwiXCIgKSB7XG5cdFx0XHRkaWZmcy5wb3AoKTsgLy8gUmVtb3ZlIHRoZSBkdW1teSBlbnRyeSBhdCB0aGUgZW5kLlxuXHRcdH1cblxuXHRcdC8vIFNlY29uZCBwYXNzOiBsb29rIGZvciBzaW5nbGUgZWRpdHMgc3Vycm91bmRlZCBvbiBib3RoIHNpZGVzIGJ5IGVxdWFsaXRpZXNcblx0XHQvLyB3aGljaCBjYW4gYmUgc2hpZnRlZCBzaWRld2F5cyB0byBlbGltaW5hdGUgYW4gZXF1YWxpdHkuXG5cdFx0Ly8gZS5nOiBBPGlucz5CQTwvaW5zPkMgLT4gPGlucz5BQjwvaW5zPkFDXG5cdFx0Y2hhbmdlcyA9IGZhbHNlO1xuXHRcdHBvaW50ZXIgPSAxO1xuXG5cdFx0Ly8gSW50ZW50aW9uYWxseSBpZ25vcmUgdGhlIGZpcnN0IGFuZCBsYXN0IGVsZW1lbnQgKGRvbid0IG5lZWQgY2hlY2tpbmcpLlxuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCAtIDEgKSB7XG5cdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIC0gMSBdWyAwIF0gPT09IERJRkZfRVFVQUwgJiZcblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMCBdID09PSBESUZGX0VRVUFMICkge1xuXG5cdFx0XHRcdGRpZmZQb2ludGVyID0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRwb3NpdGlvbiA9IGRpZmZQb2ludGVyLnN1YnN0cmluZyhcblx0XHRcdFx0XHRkaWZmUG9pbnRlci5sZW5ndGggLSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdLmxlbmd0aFxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdC8vIFRoaXMgaXMgYSBzaW5nbGUgZWRpdCBzdXJyb3VuZGVkIGJ5IGVxdWFsaXRpZXMuXG5cdFx0XHRcdGlmICggcG9zaXRpb24gPT09IGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gKSB7XG5cblx0XHRcdFx0XHQvLyBTaGlmdCB0aGUgZWRpdCBvdmVyIHRoZSBwcmV2aW91cyBlcXVhbGl0eS5cblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0gPSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXS5zdWJzdHJpbmcoIDAsIGRpZmZzWyBwb2ludGVyIF1bIDEgXS5sZW5ndGggLVxuXHRcdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdLmxlbmd0aCApO1xuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0gPVxuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSArIGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF07XG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gMSwgMSApO1xuXHRcdFx0XHRcdGNoYW5nZXMgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBkaWZmUG9pbnRlci5zdWJzdHJpbmcoIDAsIGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0ubGVuZ3RoICkgPT09XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdICkge1xuXG5cdFx0XHRcdFx0Ly8gU2hpZnQgdGhlIGVkaXQgb3ZlciB0aGUgbmV4dCBlcXVhbGl0eS5cblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICs9IGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF07XG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdID1cblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXS5zdWJzdHJpbmcoIGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF0ubGVuZ3RoICkgK1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXTtcblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIgKyAxLCAxICk7XG5cdFx0XHRcdFx0Y2hhbmdlcyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cblx0XHQvLyBJZiBzaGlmdHMgd2VyZSBtYWRlLCB0aGUgZGlmZiBuZWVkcyByZW9yZGVyaW5nIGFuZCBhbm90aGVyIHNoaWZ0IHN3ZWVwLlxuXHRcdGlmICggY2hhbmdlcyApIHtcblx0XHRcdHRoaXMuZGlmZkNsZWFudXBNZXJnZSggZGlmZnMgKTtcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIGZ1bmN0aW9uKCBvLCBuICkge1xuXHRcdHZhciBkaWZmLCBvdXRwdXQsIHRleHQ7XG5cdFx0ZGlmZiA9IG5ldyBEaWZmTWF0Y2hQYXRjaCgpO1xuXHRcdG91dHB1dCA9IGRpZmYuRGlmZk1haW4oIG8sIG4gKTtcblx0XHRkaWZmLmRpZmZDbGVhbnVwRWZmaWNpZW5jeSggb3V0cHV0ICk7XG5cdFx0dGV4dCA9IGRpZmYuZGlmZlByZXR0eUh0bWwoIG91dHB1dCApO1xuXG5cdFx0cmV0dXJuIHRleHQ7XG5cdH07XG59KCkgKTtcblxufSgpICk7XG4iLCJjb25zdCBzZWFyY2hDb21wb25lbnQgPSBmdW5jdGlvbiBzZWFyY2hDb21wb25lbnQgKCl7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0ZW1wbGF0ZSgpe1xuICAgICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgICAgICA8Zm9ybT5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cInNlYXJjaFwiPldoYXQgZGlkIHlvdSBlYXQgdG9kYXkgPzwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwic2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJUYWNvcywgY29mZmVlLCBiYW5uYW5hLCAuLi5cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cIlNlYXJjaFwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZm9ybT5gO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluaXQoKXtcbiAgICAgICAgICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHJvb3QuY2xhc3NMaXN0LmFkZCgncm9vdCcpO1xuICAgICAgICAgICAgcm9vdC5pbm5lckhUTUwgPSB0aGlzLnRlbXBsYXRlKCk7XG5cbiAgICAgICAgICAgIHRoaXMuZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKHJvb3QpO1xuXG4gICAgICAgICAgICBjb25zdCBidXR0b24gPSB0aGlzLmZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9YnV0dG9uXScpO1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoRmllbGQgPSB0aGlzLmZyYWdtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W25hbWU9c2VhcmNoXScpO1xuXG4gICAgICAgICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLmxvZyhlLCBzZWFyY2hGaWVsZC52YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlcihjb250YWluZXIpe1xuICAgICAgICAgICAgaWYodGhpcy5mcmFnbWVudCAmJiBjb250YWluZXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCl7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZnJhZ21lbnQucXVlcnlTZWxlY3RvcignLnJvb3QgPiAqJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgc2VhcmNoQ29tcG9uZW50O1xuIiwiaW1wb3J0IFFVbml0IGZyb20gJ3F1bml0anMnO1xuaW1wb3J0IHNlYXJjaENvbXBvbmVudCBmcm9tICcuLi8uLi9zcmMvY29tcG9uZW50cy9zZWFyY2guanMnO1xuXG5RVW5pdC5tb2R1bGUoJ0FQSScpO1xuXG5RVW5pdC50ZXN0KCdmYWN0b3J5JywgYXNzZXJ0ID0+IHtcbiAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBzZWFyY2hDb21wb25lbnQsICdmdW5jdGlvbicsICdUaGUgY29tcG9uZW50IG1vZHVsZSBleHBvc2UgYSBmdW5jdGlvbicpO1xuICAgIGFzc2VydC5lcXVhbCggdHlwZW9mIHNlYXJjaENvbXBvbmVudCgpLCAnb2JqZWN0JywgJ1RoZSBjb21wb25lbnQgZmFjdG9yeSBjcmVhdGVzIGFuIG9iamVjdCcpO1xuICAgIGFzc2VydC5ub3REZWVwRXF1YWwoc2VhcmNoQ29tcG9uZW50KCksIHNlYXJjaENvbXBvbmVudCgpLCAnVGhlIGNvbXBvbmVudCBmYWN0b3J5IGNyZWF0ZXMgbmV3IG9iamVjdHMnKTtcbn0pO1xuXG5RVW5pdC50ZXN0KCdjb21wb25lbnQnLCBhc3NlcnQgPT4ge1xuICAgIHZhciBjb21wb25lbnQgPSBzZWFyY2hDb21wb25lbnQoKTtcbiAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBjb21wb25lbnQuaW5pdCwgJ2Z1bmN0aW9uJywgJ1RoZSBjb21wb25lbnQgZXhwb3NlcyBhbiBpbml0IG1ldGhvZCcpO1xuICAgIGFzc2VydC5lcXVhbCggdHlwZW9mIGNvbXBvbmVudC5yZW5kZXIsICdmdW5jdGlvbicsICdUaGUgY29tcG9uZW50IGV4cG9zZXMgYSByZW5kZXIgbWV0aG9kJyk7XG59KTtcbiJdfQ==
