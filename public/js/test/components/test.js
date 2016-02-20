import QUnit from 'qunitjs';
import searchComponent from '../../src/components/search.js';

QUnit.module('API');

QUnit.test('factory', assert => {
    assert.equal( typeof searchComponent, 'function', 'The component module expose a function');
    assert.equal( typeof searchComponent(), 'object', 'The component factory creates an object');
    assert.notDeepEqual(searchComponent(), searchComponent(), 'The component factory creates new objects');
});

QUnit.test('component', assert => {
    var component = searchComponent();
    assert.equal( typeof component.init, 'function', 'The component exposes an init method');
    assert.equal( typeof component.render, 'function', 'The component exposes a render method');
});
