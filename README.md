# Azure IoT Edge MQTT nodes for Node-RED

This package provides Node-RED nodes for communicating with the local Azure IoT Edge Hub using the Azure IoT Node.js SDK over MQTT.

It is the separate MQTT workstream for Azure IoT Edge 1.6.x and is based on the functional/reference behavior of `iotblackbelt/noderededgemodule` while using the current Azure IoT Node.js MQTT transport.

## Requirements

- Azure IoT Edge 1.6.x
- Edge Agent 1.6.x
- Edge Hub 1.6.x
- Node-RED 5.x
- Node.js 18 or newer
- The Node-RED process must run as an IoT Edge module so the standard `IOTEDGE_*` environment variables are available.
- Edge Hub MQTT endpoint must be enabled; the standard MQTT endpoint is TCP 8883.

No IoT Hub connection string is required. `ModuleClient.fromEnvironment(Mqtt)` obtains authentication through the standard IoT Edge workload identity flow.

## Supported MQTT SDK path

The package uses Microsoft's current Azure IoT Node.js packages:

- `azure-iot-device` 1.18.4
- `azure-iot-device-mqtt` 1.16.4

The connector does not implement the Edge Hub MQTT authentication protocol directly. The SDK handles the workload API trust bundle, SAS signing/renewal, MQTT TLS connection, Edge Hub protocol topics, twin operations, direct methods, and transport lifecycle.

## Node-RED nodes

Four public MQTT nodes are provided:

- **Module Input (MQTT)** — receives a named Edge Hub module input.
- **Module Output (MQTT)** — sends `msg.payload` to a named Edge Hub module output.
- **Module Twin (MQTT)** — receives desired-property updates and reports properties.
- **Module Method (MQTT)** — handles direct-method requests and sends a response.

There is no separate client/config node. The connection manager is internal to the runtime.

## Shared connection model

All MQTT nodes in one Node-RED runtime share one underlying `ModuleClient` / MQTT connection.

```text
Node-RED runtime
        |
        +-- Module Input (MQTT)
        +-- Module Output (MQTT)
        +-- Module Twin (MQTT)
        +-- Module Method (MQTT)
        |
        +----> ONE shared ModuleClient / MQTT connection
                         |
                         v
                    Edge Hub 1.6
```

Node configuration defines the input, output, or method name. It does not create a separate MQTT transport connection.

## MQTT protocol paths

The Azure Edge Hub MQTT protocol maps the Edge Hub endpoint model into MQTT topics. Relevant paths include:

```text
Module output:
devices/<deviceId>/modules/<moduleId>/messages/events/

Module input:
devices/<deviceId>/modules/<moduleId>/inputs/<inputName>

Direct methods:
$iothub/methods/POST/#
$iothub/methods/res/<status>/?$rid=<requestId>

Twin:
$iothub/twin/...
```

The SDK supplies the output name to Edge Hub using its MQTT transport conventions rather than requiring the Node-RED node to construct raw topics.

## Authentication and TLS

When running as an Edge module, the SDK uses `IOTEDGE_*` environment values and `IotEdgeAuthenticationProvider`. The provider obtains the Edge trust bundle through the workload API and uses iotedged to sign SAS authentication material.

The MQTT transport connects to Edge Hub over TLS (`mqtts`) and the normal Edge Hub MQTT listener is TCP 8883.

## Routing

The Node-RED module communicates with the local Edge Hub. Edge Hub is responsible for module-to-module and module-to-cloud routing according to the deployment's `$edgeHub.routes` configuration.

A typical upstream route is conceptually:

```json
{
  "NodeRedDatatoUpstream": "FROM /messages/modules/NodeRedData/outputs/* INTO $upstream"
}
```

Store-and-forward remains an Edge Hub function. The connector does not attempt to replace or duplicate Edge Hub routing.

## Startup and reconnect behavior

The connector does not depend on Edge Agent startup ordering. If Node-RED starts before Edge Hub is ready, the shared manager keeps retrying with bounded exponential backoff.

For an established MQTT connection loss:

```text
MQTT connection drops
        -> disconnect detected
        -> current client discarded
        -> new ModuleClient created
        -> Edge workload authentication repeated
        -> MQTT connection reopened
        -> registered input/method/twin listeners restored
```

Removing one MQTT node does not close the shared client while other MQTT nodes remain active. When the last MQTT node is removed, the shared client is closed cleanly.

## Payload behavior

Input payloads are decoded as UTF-8. Valid JSON is parsed into a JavaScript value; non-JSON content remains a string.

Output payloads support:

- objects/arrays -> JSON text with `application/json` metadata
- strings -> UTF-8 text
- Buffers -> UTF-8 text

## Example

See `examples/basic-mqtt-flow.json` for a minimal input/output flow.

## Development

```bash
npm install
npm test
npm run pack:check
```

The package publishes only `src`, `examples`, `README.md`, and `LICENSE`.

## Test record

| TC | Test Case | Action | Expected Result | Actual Result | Status | Remarks |
|---|---|---|---|---|---|---|
| TC-01 | Basic MQTT connection | Automated manager/node smoke coverage | Nodes load and manager API is available | Automated smoke/lifecycle checks added | Pending runtime | Requires Edge 1.6 integration environment |
| TC-02 | Module input | Deploy input node and route into Node-RED | Named input is received | Not yet runtime-tested | Pending runtime | |
| TC-03 | Module output to EdgeHub | Send payload to configured output | EdgeHub accepts output message | Not yet runtime-tested | Pending runtime | |
| TC-04 | Cloud telemetry | Route output to `$upstream` | IoT Hub receives telemetry | Not yet runtime-tested | Pending runtime | |
| TC-05 | Multiple MQTT nodes / shared client | Use multiple MQTT nodes in one runtime | Exactly one underlying client is reused | Covered by architecture; runtime count not yet observed | Pending runtime | |
| TC-06 | Node-RED restart | Restart Node-RED module | MQTT path recovers automatically | Not yet runtime-tested | Pending runtime | |
| TC-07 | EdgeHub startup ordering | Start Node-RED before EdgeHub readiness | Manager retries until EdgeHub is reachable | Retry logic implemented; runtime evidence pending | Pending runtime | |
| TC-08 | MQTT disconnect/reconnect | Interrupt MQTT/EdgeHub path | Connector reconnects without source restart | Disconnect/reconnect logic implemented; runtime evidence pending | Pending runtime | |
| TC-09 | Listener/subscription restoration | Drop connection after listeners are active | Inputs/methods/twin become active again | Reattachment logic implemented; runtime evidence pending | Pending runtime | |
| TC-10 | Cloud outage/store-and-forward | Interrupt upstream connectivity | EdgeHub handles store-and-forward per deployment | Not yet runtime-tested | Pending runtime | EdgeHub responsibility |
| TC-11 | Module Twin | Receive desired update and report properties | Twin operations work through MQTT SDK | Not yet runtime-tested | Pending runtime | |
| TC-12 | Direct Method | Invoke configured method | Node receives request and returns response | Not yet runtime-tested | Pending runtime | |
| TC-13 | Payload compatibility | Test JSON, strings, Buffers, non-JSON | Payloads retain intended content | Unit-level serialization logic added | Partial | Runtime matrix pending |
| TC-14 | Long-running stability | Leave module running | No connection/resource degradation | Not yet runtime-tested | Pending runtime | |
