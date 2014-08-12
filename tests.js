// Utility function to allow for different method naming conventions, depending on sdk language
function callMethod(obj, methodName) {
	var args = Array.prototype.slice.call(arguments, 2);
	if(language == 'cs') {
		methodName = methodName.charAt(0).toUpperCase() + methodName.slice(1);
		if(methodName == 'FireHit') {
			methodName = 'FireHitAsync';
		}
	} else if(language == 'java') {
		if(methodName == 'fireHit') {
			// Add a null completion delegate to the arguments
			args.push(null);
		}
	}
	return obj[methodName].apply(obj, args);
}

// Accesses the appropriate property or calls its getter, depending on language
function callGetter(obj, propertyName) {
	if(language == 'objc') {
		return obj[propertyName];
	} else if(language == 'cs') {
		propertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
		return obj[propertyName];
	}
	// Else, call a getter function
	var args = Array.prototype.slice.call(arguments, 2),
		methodName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
	if('get'+methodName in obj) {
		methodName = 'get'+methodName;
	} else {
		methodName = 'is'+methodName;
	}
	return obj[methodName].apply(obj, args);
}

// Accesses the appropriate property or calls its setter, depending on language
function callSetter(obj, propertyName) {
	var args = Array.prototype.slice.call(arguments, 2);
	if(language == 'objc') {
		obj[propertyName] = args[0];
		return;
	} else if(language == 'cs') {
		propertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
		obj[propertyName] = args[0];
		return;
	}
	// Else, call a setter function
	var methodName = 'set'+propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
	obj[methodName].apply(obj, args);
}

// Jint (the js interpreter used in the c# test runner) has a bug that breaks its indexOf
// implementation, so we have to use a custom one
function indexOf(list, item) {
	for(var i = 0; i < list.length; i++) {
		if(list[i] == item) {
			return i;
		}
	}
	return -1;
}

// Assert that a certain series of operations come out of the queue
function expect(q) {
	for(var i = 1; i < arguments.length; i++) {
		callMethod(q, 'expect', arguments[i]);
	}
}

function consumeEvent(q, event_name) {
	var arg = callMethod(q, 'expectEventually', 'job-ended');
	util.assertEqual(event_name, arg);
}

function consumeEventsUnordered(q, name1, name2) {
	var arg = callMethod(q, 'expectEventually', 'job-ended');
	if(arg == name1) {
		arg = callMethod(q, 'expectEventually', 'job-ended');
		util.assertEqual(arg, name2);
	} else if(arg == name2) {
		arg = callMethod(q, 'expectEventually', 'job-ended');
		util.assertEqual(arg, name1);
	} else {
		util.fail('Expected one of "'+name1+'" or "'+name2+'" but got "'+arg+'"');
	}
}

function consumeAutomaticEvents(q) {
	consumeEventsUnordered(q, platform+'-test%20app-install', platform+'-test%20app-open');
}


// Runs a function as a test
var tests_count = 0;
function test(name, body) {
	util.log('\n* '+name);
	body();
	tests_count++;
}

// Useful for testing our 255 character limits
string256 = '';
for(var i = 0; i < 256; i++) {
	string256 += 'a';
}


util.log('Running ' + language + ' tests');

// Event tests
test('event', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test1', false);
	util.assertEqual('test1', callGetter(e, 'name'));
	util.assertEqual(false, callGetter(e, 'oneTimeOnly'));
	e = util.newEvent('test2', true);
	util.assertEqual('test2', callGetter(e, 'name'));
	util.assertEqual(true, callGetter(e, 'oneTimeOnly'));
});
test('event-name-no-dots', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('hello com.test.event', false);
	util.assertEqual('hello%20com_test_event', callGetter(e, 'encodedName'));
});
test('event-params', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', 'key1', 'val1');
	callMethod(e, 'addPair', 'key2', 'val2');
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&custom-key1=val1') != -1);
	util.assertTrue(pd.indexOf('&custom-key2=val2') != -1);
});
test('event-null-param', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', 'key', null);
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&custom-key=') == -1);
});
test('event-param-int', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', 'key', -13);
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&created-ms=') != -1);
	util.assertTrue(pd.indexOf('&custom-key=-13') != -1);
});
test('event-param-uint', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', 'key', 4294967295);
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&created-ms=') != -1);
	util.assertTrue(pd.indexOf('&custom-key=4294967295') != -1);
});
test('event-param-double', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', 'key', 4.8);
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&created-ms=') != -1);
	util.assertTrue(pd.indexOf('&custom-key=4.8') != -1);
});
test('event-param-encoding', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', " !#$&'()+,/:;=?@[]", " !#$&'()+,/:;=?@[]-_.");
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&created-ms=') != -1);
	util.assertTrue(pd.indexOf('&custom-%20%21%23%24%26%27%28%29%2B%2C%2F%3A%3B%3D%3F%40%5B%5D=%20%21%23%24%26%27%28%29%2B%2C%2F%3A%3B%3D%3F%40%5B%5D-_.') != -1);
});
test('event-param-encoding-unicode', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', 'key\u01c5\u1667', 'value\u1511\u167b');
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&created-ms=') != -1);
	util.assertTrue(pd.indexOf('&custom-key%C7%85%E1%99%A7=value%E1%94%91%E1%99%BB') != -1);
});
test('event-long-key', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', string256, 'val');
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('&aaaaaaaaaaaaa') == -1);
});
test('event-long-value', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var e = util.newEvent('test', false);
	callMethod(e, 'addPair', 'key', string256);
	util.prepareEvent(ts, e);
	var pd = callGetter(e, 'postData');
	util.assertTrue(pd.indexOf('=aaaaaaaaaaaaa') == -1);
});


// Hit tests
test('hit', function() {
	var h = util.newHit('test tracker');
	util.assertEqual('test tracker', callGetter(h, 'trackerName'));
	util.assertEqual('test%20tracker', callGetter(h, 'encodedTrackerName'));
	util.assertEqual('', callGetter(h, 'postData'));
});
test('hit-tags', function() {
	var h = util.newHit('test');
	callMethod(h, 'addTag', 'one, two');
	callMethod(h, 'addTag', 'three');
	util.assertEqual('__ts=one%2C%20two,three', callGetter(h, 'postData'));
});
test('hit-tag-long', function() {
	var h = util.newHit('test');
	callMethod(h, 'addTag', string256);
	util.assertEqual('', callGetter(h, 'postData'));
});


// Tapstream tests
test('required-post-data', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var pd = util.getPostData(ts);
	util.log(pd);
	util.assertTrue(pd.search('secret=') != -1);
	util.assertTrue(pd.search('sdkversion=') != -1);
	util.assertTrue(pd.search('uuid=') != -1);
	util.assertTrue(pd.search('platform=') != -1);
	util.assertTrue(pd.search('vendor=') != -1);
	util.assertTrue(pd.search('model=') != -1);
	util.assertTrue(pd.search('os=') != -1);
	util.assertTrue(pd.search('resolution=') != -1);
	util.assertTrue(pd.search('locale=') != -1);
	util.assertTrue(pd.search('app-name=') != -1);
	util.assertTrue(pd.search('app-version=') != -1);
	util.assertTrue(pd.search('package-name=') != -1);
	util.assertTrue(pd.search('gmtoffset=') != -1);
});
/*
test('collect-device-info-defaults-to-true', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var pd = util.getPostData(ts);
	util.log(pd);
	if(language == 'java') {
		util.assertTrue(pd.search('hardware-wifi-mac=') != -1);
		util.assertTrue(pd.search('hardware-android-device-id=') != -1);
		util.assertTrue(pd.search('hardware-android-android-id=') != -1);
	} else if(language == 'cs') {
		if(platform == 'windows') {
			util.assertTrue(pd.search('hardware-windows-ashwid=') != -1);
			util.assertTrue(pd.search('hardware-winphone-device-unique-id=') == -1);
		} else {
			util.assertTrue(pd.search('hardware-windows-ashwid=') == -1);
			util.assertTrue(pd.search('hardware-winphone-device-unique-id=') != -1);
		}
	} else if(language == 'objc') {
		util.log(platform);
		util.assertTrue(pd.search('hardware-wifi-mac=') != -1);
	}
});
test('collect-device-info-opt-out', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();
	if(language == 'java') {
		callSetter(conf, 'collectWifiMac', false);
		callSetter(conf, 'collectDeviceId', false);
		callSetter(conf, 'collectAndroidId', false);
	} else if(language == 'cs') {
		if(platform == 'windows') {
			callSetter(conf, 'collectAppSpecificHardwareId', false);
		} else {
			callSetter(conf, 'collectDeviceUniqueId', false);
		}
	} else if(language == 'objc') {
		callSetter(conf, 'collectWifiMac', false);
	}
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var pd = util.getPostData(ts);
	util.log(pd);
	if(language == 'java') {
		util.assertTrue(pd.search('hardware-wifi-mac=') == -1);
		util.assertTrue(pd.search('hardware-android-device-id=') == -1);
		util.assertTrue(pd.search('hardware-android-android-id=') == -1);
	} else if(language == 'cs') {
		util.assertTrue(pd.search('hardware-windows-ashwid=') == -1);
		util.assertTrue(pd.search('hardware-winphone-device-unique-id=') == -1);
	} else if(language == 'objc') {
		util.assertTrue(pd.search('hardware-wifi-mac=') == -1);
	}
});
*/
test('device-info-opt-in', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();

	callSetter(conf, 'odin1', 'test');
	if(language == 'java') {
		callSetter(conf, 'openUdid', 'test');
		callSetter(conf, 'wifiMac', 'test-wifi-mac');
		callSetter(conf, 'deviceId', 'test-android-device-id');
		callSetter(conf, 'androidId', 'test-android-id');
	} else if(language == 'cs') {
	} else if(language == 'objc') {
		if(platform == 'ios') {
			callSetter(conf, 'openUdid', 'test');
			callSetter(conf, 'udid', 'test');
			callSetter(conf, 'idfa', 'test');
			callSetter(conf, 'secureUdid', 'test');
		} else {
			callSetter(conf, 'serialNumber', 'test');
		}
	}
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var pd = util.getPostData(ts);
	util.log(pd);

	util.assertTrue(pd.search('hardware-odin1=test') != -1);
	if(language == 'java') {
		util.assertTrue(pd.search('hardware-open-udid=test') != -1);
		util.assertTrue(pd.search('hardware-wifi-mac=test-wifi-mac') != -1);
		util.assertTrue(pd.search('hardware-android-device-id=test-android-device-id') != -1);
		util.assertTrue(pd.search('hardware-android-android-id=test-android-id') != -1);
	} else if(language == 'cs') {
	} else if(language == 'objc') {
		if(platform == 'ios') {
			util.assertTrue(pd.search('hardware-open-udid=') != -1);
			util.assertTrue(pd.search('hardware-ios-udid=') != -1);
			util.assertTrue(pd.search('hardware-ios-idfa=') != -1);
			util.assertTrue(pd.search('hardware-ios-secure-udid=') != -1);
		} else {
			util.assertTrue(pd.search('hardware-mac-serial-number=') != -1);
		}
	}
});
test('long-device-identifiers-rejected', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();

	callSetter(conf, 'odin1', string256);
	if(language == 'java') {
		callSetter(conf, 'openUdid', string256);
	} else if(language == 'cs') {
	} else if(language == 'objc') {
		if(platform == 'ios') {
			callSetter(conf, 'openUdid', string256);
			callSetter(conf, 'udid', string256);
			callSetter(conf, 'idfa', string256);
			callSetter(conf, 'secureUdid', string256);
		} else {
			callSetter(conf, 'serialNumber', string256);
		}
	}
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var pd = util.getPostData(ts);
	util.log(pd);
	util.assertTrue(pd.search('hardware-odin1=') == -1);
	util.assertTrue(pd.search('hardware-open-udid=') == -1);
	util.assertTrue(pd.search('hardware-ios-udid=') == -1);
	util.assertTrue(pd.search('hardware-ios-idfa=') == -1);
	util.assertTrue(pd.search('hardware-ios-secure-udid=') == -1);
	util.assertTrue(pd.search('hardware-mac-serial-number=') == -1);
});
test('automatic-events', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	consumeAutomaticEvents(q);
	var fired_events = util.getSavedFiredList(ts);
	util.assertTrue(indexOf(fired_events, platform+'-test app-install') != -1);
});
test('automatic-events-suppress-install', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();
	callSetter(conf, 'fireAutomaticInstallEvent', false);
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	consumeEvent(q, platform+'-test%20app-open');
});
test('automatic-events-suppress-open', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();
	callSetter(conf, 'fireAutomaticOpenEvent', false);
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	consumeEvent(q, platform+'-test%20app-install');
	var fired_events = util.getSavedFiredList(ts);
	util.assertTrue(indexOf(fired_events, platform+'-test app-install') != -1);
});
test('automatic-events-custom-names', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();
	callSetter(conf, 'installEventName', 'my-install-event');
	callSetter(conf, 'openEventName', 'my-open-event');
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	consumeEventsUnordered(q, 'my-install-event', 'my-open-event');
	var fired_events = util.getSavedFiredList(ts);
	util.assertTrue(indexOf(fired_events, 'my-install-event') != -1);
});
test('hardware-id-included', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();
	callSetter(conf, 'hardware', '12345');
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var pd = util.getPostData(ts);
	util.log(pd);
	util.assertTrue(pd.search("hardware=12345") != -1);
});
test('long-hardware-id-rejected', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();
	callSetter(conf, 'hardware', string256);
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf);
	var pd = util.getPostData(ts);
	util.assertTrue(pd.search("hardware=") == -1);
});
test('succeeded', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-succeeded', 'job-ended');
});
test('succeeded-event-has-created-time', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-succeeded', 'job-ended');
	var pd = callGetter(e, 'postData');
	util.log(pd);
	util.assertTrue(pd.search('&created-ms=') == 0);
	util.assertTrue(parseInt(pd.substring(12)) > 1386800000000);
});
test('failed', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
});
test('failed-event-has-created-time', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	var pd = callGetter(e, 'postData');
	util.log(pd);
	util.assertTrue(pd.search('&created-ms=') == 0);
	util.assertTrue(parseInt(pd.substring(12)) > 1386800000000);
});
test('failed-non-500-range-doesnt-retry', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 404);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-failed', 'job-ended');
});
test('oto-enters-fired-list', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', true);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'fired-list-saved');
	var fired_events = util.getSavedFiredList(ts);
	util.assertTrue(indexOf(fired_events, 'test') != -1);
	expect(q, 'event-succeeded', 'job-ended');
});
test('non-oto-does-not-enter-fired-list', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-succeeded', 'job-ended');
	var fired_events = util.getSavedFiredList(ts);
	util.assertTrue(indexOf(fired_events, 'test') == -1);
});
test('respects-fired-list-for-oto-events', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', true);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'fired-list-saved', 'event-succeeded', 'job-ended');
	e = util.newEvent('test', true);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-ignored-already-fired', 'job-ended');
});
test('respects-firing-list-for-oto-events', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', true);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	util.setDelay(ts, 1);
	callMethod(ts, 'fireEvent', e);
	e = util.newEvent('test', true);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-ignored-already-in-progress', 'job-ended');
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
});
test('doesnt-respect-fired-list-for-non-oto-events', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', true);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'fired-list-saved', 'event-succeeded', 'job-ended');
	e = util.newEvent('test', false);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-succeeded', 'job-ended');
});
test('failed-oto-events-dont-enter-fired-list', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', true);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	var fired_events = util.getSavedFiredList(ts);
	util.assertTrue(indexOf(fired_events, 'test') == -1);
});
test('increasing-delay', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	var expected = [2, 4, 8, 16, 32, 60, 60, 60];
	for(var i = 0; i < expected.length; i++) {
		callMethod(ts, 'fireEvent', e);
		expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
		util.assertEqual(expected[i], util.getDelay(ts));
	}
});
test('success-doesnt-increase-delay', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-succeeded', 'job-ended');
	util.assertEqual(0, util.getDelay(ts));
});
test('first-failure-increases-delay', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	util.assertEqual(2, util.getDelay(ts));
});
test('success-of-first-failed-event-resets-delay', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	util.assertEqual(2, util.getDelay(ts));

	util.setResponseStatus(ts, 200);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-succeeded', 'job-ended');
	util.assertEqual(0, util.getDelay(ts));
});
test('success-of-any-event-resets-delay', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	util.assertEqual(2, util.getDelay(ts));

	util.setResponseStatus(ts, 200);
	e = util.newEvent('another', false);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'event-succeeded', 'job-ended');
	util.assertEqual(0, util.getDelay(ts));
});
test('subsequent-failure-of-same-event-increases-delay', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('test', false);
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	util.assertEqual(2, util.getDelay(ts));

	callMethod(ts, 'fireEvent', e);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	util.assertEqual(4, util.getDelay(ts));
});
test('only-first-event-to-fail-can-increase-delay', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e1 = util.newEvent('test1', false),
		e2 = util.newEvent('test2', false);
	consumeAutomaticEvents(q);

	util.setResponseStatus(ts, 500);
	
	callMethod(ts, 'fireEvent', e1);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	util.assertEqual(2, util.getDelay(ts));

	callMethod(ts, 'fireEvent', e2);
	expect(q, 'event-failed', 'retry', 'job-ended');
	util.assertEqual(2, util.getDelay(ts));

	callMethod(ts, 'fireEvent', e1);
	expect(q, 'increased-delay', 'event-failed', 'retry', 'job-ended');
	util.assertEqual(4, util.getDelay(ts));

	callMethod(ts, 'fireEvent', e2);
	expect(q, 'event-failed', 'retry', 'job-ended');
	util.assertEqual(4, util.getDelay(ts));
});

test('hit-success', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		h = util.newHit('test');
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireHit', h);
	expect(q, 'hit-succeeded');
});
test('hit-failed', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		h = util.newHit('test');
	consumeAutomaticEvents(q);
	util.setResponseStatus(ts, 500);
	callMethod(ts, 'fireHit', h);
	expect(q, 'hit-failed');
});



// Global event params
test('global-params', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig();
	util.setSetGlobalParam(conf, 'global-test-1', 'hello world');
	util.setSetGlobalParam(conf, 'global-test-2', 'test');
	var ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		pd = util.getPostData(ts),
		e1 = util.newEvent('test1', false),
		e2 = util.newEvent('test2', false);
	callMethod(e1, 'addPair', 'global-test-2', 'overridden');
	util.prepareEvent(ts, e1);
	util.prepareEvent(ts, e2);
	var epd1 = callGetter(e1, 'postData'),
		epd2 = callGetter(e2, 'postData');

	util.assertTrue(pd.search('&custom-global-test-1=hello%20world') == -1);
	util.assertTrue(pd.search('&custom-global-test-2=overridden') == -1);
	util.assertTrue(pd.search('&custom-global-test-2=test') == -1);

	util.assertTrue(epd1.search('&custom-global-test-1=hello%20world') != -1);
	util.assertTrue(epd1.search('&custom-global-test-2=overridden') != -1);
	util.assertTrue(epd1.search('&custom-global-test-2=test') == -1);

	util.assertTrue(epd2.search('&custom-global-test-1=hello%20world') != -1);
	util.assertTrue(epd2.search('&custom-global-test-2=overridden') == -1);
	util.assertTrue(epd2.search('&custom-global-test-2=test') != -1);
});

// Purchase events
test('purchase-no-price', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('order123abc', 'com.product.sku', 2),
		pd = callGetter(e, 'postData');
	util.log('Event post data: ' + pd);
	util.assertTrue(pd.search('&purchase-transaction-id=order123abc') != -1);
	util.assertTrue(pd.search('&purchase-product-id=com.product.sku') != -1);
	util.assertTrue(pd.search('&purchase-quantity=2') != -1);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	consumeEvent(q, platform+'-test%20app-purchase-com_product_sku');
});
test('purchase-with-price', function() {
	var q = util.newOperationQueue(),
		conf = util.newConfig(),
		ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
		e = util.newEvent('order123abc', 'com.product.sku', 2, 299, 'USD'),
		pd = callGetter(e, 'postData');
	util.log(pd);
	util.assertTrue(pd.search('&purchase-transaction-id=order123abc') != -1);
	util.assertTrue(pd.search('&purchase-product-id=com.product.sku') != -1);
	util.assertTrue(pd.search('&purchase-quantity=2') != -1);
	util.assertTrue(pd.search('&purchase-price=299') != -1);
	util.assertTrue(pd.search('&purchase-currency=USD') != -1);
	consumeAutomaticEvents(q);
	callMethod(ts, 'fireEvent', e);
	consumeEvent(q, platform+'-test%20app-purchase-com_product_sku');
});


if(language == 'java') {

	test('purchase-with-json', function() {
		var q = util.newOperationQueue(),
			conf = util.newConfig(),
			ts = util.newTapstream(q, 'test-account', 'test-secret', conf),
			e = util.newEvent(
				'{"orderId": "order123abc", "productId": "com.product.sku"}',
				'{"productId": "com.product.sku", "type": "inapp", "price": "$2.99", "title": "Gold Coins", "Description": "Coins to buy stuff with", "price_amount_micros": 2990000, "price_currency_code": "USD"}'),
			pd = callGetter(e, 'postData');
		util.log(pd);
		util.assertTrue(pd.search('&purchase-transaction-id=order123abc') != -1);
		util.assertTrue(pd.search('&purchase-product-id=com.product.sku') != -1);
		util.assertTrue(pd.search('&purchase-quantity=1') != -1);
		util.assertTrue(pd.search('&purchase-price=299') != -1);
		util.assertTrue(pd.search('&purchase-currency=USD') != -1);
		consumeAutomaticEvents(q);
		callMethod(ts, 'fireEvent', e);
		consumeEvent(q, platform+'-test%20app-purchase-com_product_sku');
	});

}


util.log('\n' + tests_count + ' tests ok');
