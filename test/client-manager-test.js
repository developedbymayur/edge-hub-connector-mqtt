'use strict';

const assert = require('node:assert/strict');
const { EdgeHubMqttClientManager } = require('../src/client-manager-mqtt');

const manager = new EdgeHubMqttClientManager();

assert.equal(manager.users, 0);
assert.equal(manager.isConnected(), false);

const removeInput = manager.addInputListener('input1', () => {});
const removeTwin = manager.addTwinDesiredListener(() => {});
const removeMethod = manager.addMethodHandler('method1', () => {});

assert.equal(manager.inputListeners.size, 1);
assert.equal(manager.twinDesiredListeners.size, 1);
assert.equal(manager.methodHandlers.size, 1);

assert.throws(
    () => manager.addMethodHandler('method1', () => {}),
    /already registered/
);

removeInput();
removeTwin();
removeMethod();

assert.equal(manager.inputListeners.size, 0);
assert.equal(manager.twinDesiredListeners.size, 0);
assert.equal(manager.methodHandlers.size, 0);

let connectingEvents = 0;
let connectedEvents = 0;
let disconnectedEvents = 0;
manager.on('connecting', () => connectingEvents++);
manager.on('connected', () => connectedEvents++);
manager.on('disconnected', () => disconnectedEvents++);
manager.emit('connecting');
manager.emit('connected');
manager.emit('disconnected');

assert.equal(connectingEvents, 1);
assert.equal(connectedEvents, 1);
assert.equal(disconnectedEvents, 1);

console.log('MQTT client manager lifecycle primitives passed.');
