'use strict';

const assert = require('node:assert/strict');
const { EdgeHubMqttClientManager } = require('../src/client-manager-mqtt');

const manager = new EdgeHubMqttClientManager();

assert.equal(manager.users, 0);
assert.equal(manager.isConnected(), false);
assert.equal(manager.inputListeners.size, 0);
assert.equal(manager.methodHandlers.size, 0);
assert.equal(manager.twinDesiredListeners.size, 0);

let releaseCalled = false;
const removeInput = manager.addInputListener('input1', () => {});
const removeTwin = manager.addTwinDesiredListener(() => {});
const removeMethod = manager.addMethodHandler('method1', () => {});

assert.equal(manager.inputListeners.size, 1);
assert.equal(manager.twinDesiredListeners.size, 1);
assert.equal(manager.methodHandlers.size, 1);

removeInput();
removeTwin();
removeMethod();
releaseCalled = manager.inputListeners.size === 0
    && manager.twinDesiredListeners.size === 0
    && manager.methodHandlers.size === 0;
assert.equal(releaseCalled, true);

manager.emit('connecting');
manager.emit('connected');
manager.emit('disconnected');

assert.equal(manager.client, null);

console.log('MQTT client manager lifecycle primitives passed.');
