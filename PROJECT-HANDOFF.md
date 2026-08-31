# MQTT Project Handoff

## Purpose

This repository is a separate workstream for building and testing an Azure IoT Edge Node-RED MQTT connector for Azure IoT Edge 1.6.x.

Do not modify or merge this work into the AMQP repository unless explicitly decided later.

## Reference AMQP Project

Reference repository:
- https://github.com/developedbymayur/edge-hub-connector

The AMQP project is a working reference for the desired Node-RED user experience and production discipline. The current AMQP package exposes four public Node-RED nodes and uses one shared resilient AMQP client internally.

Important architectural expectation:

```text
Node-RED nodes
  ├── Module Input
  ├── Module Output
  ├── Module Twin
  └── Module Method
          |
          v
    one shared client
          |
          v
       EdgeHub
```

The MQTT implementation should preserve the same user-facing philosophy where appropriate, but it must be based on verified Azure IoT Edge 1.6 MQTT behavior and SDK/API support rather than assumptions copied from the AMQP implementation.

## Current Environment Used for Validation

Known test environment from the AMQP work:
- Azure IoT Edge: 1.6.0
- Node-RED: 5.0.4
- Node.js inside the Node-RED 5.0.4 image: 24.18.1
- Azure IoT Edge Hub image: 1.6.0
- OPC Publisher: 2.9.15
- Simulated Temperature Sensor: 1.5

Example deployment module:
- Module name: `NodeRedData`

Example Edge device:
- `IoT-Edge-AUCPL-ChSambhajiNagar-QA`

Example EdgeHub routes:

```json
{
  "NodeRedDatatoUpstream": "FROM /messages/modules/NodeRedData/outputs/* INTO $upstream",
  "OpcPublisherToNodeRedData": "FROM /messages/modules/OpcPublisher/* INTO BrokeredEndpoint(\"/modules/NodeRedData/inputs/OpcPublisher\")",
  "SimulatedTemperatureSensorToNodeRedData": "FROM /messages/modules/SimulatedTemperatureSensor/* INTO BrokeredEndpoint(\"/modules/NodeRedData/inputs/SimulatedTemperatureSensor\")"
}
```

These are reference routes for testing and understanding the intended message path. Verify all MQTT-specific requirements independently.

## Mandatory First Activities in the New MQTT Chat

### 1. Study Azure IoT Edge 1.6 architecture

Before writing MQTT code, inspect and document the actual Azure IoT Edge 1.6 behavior for:
- Edge Agent 1.6
- Edge Hub 1.6
- supported inbound module protocols
- supported outbound/cloud protocols
- local module authentication and workload API behavior
- routing semantics for module-to-module and module-to-cloud messages
- configuration required to enable MQTT
- protocol ports and TLS expectations
- MQTT topic conventions used by EdgeHub

Use current Microsoft documentation and source/code where needed. Do not infer protocol behavior solely from the old MQTT connector.

### 2. Study the SDK/API path actually supported by Edge 1.6

Determine exactly which Node.js Azure IoT SDK/package should be used for an MQTT-based module connection in Edge 1.6.

Verify:
- module authentication through the Edge workload identity flow
- MQTT transport availability
- Node.js/runtime compatibility
- current package versions that work with Node-RED 5.x / Node.js 24.x
- connection lifecycle APIs
- message receive/send APIs
- message completion/acknowledgment semantics
- twin APIs
- direct-method APIs
- reconnect behavior

Explicitly compare SDK versions and avoid introducing a dependency only because it existed in the earlier implementation.

### 3. Inspect the old/reference MQTT implementation

Locate the previous Node-RED MQTT connector behavior used before the AMQP migration.

The key requirement from the project owner is:
- one MQTT client connection per Node-RED runtime
- multiple Node-RED nodes reuse the same client
- nodes differ primarily by configured route/input/output names

Preserve functional behavior from the previous connector wherever technically possible.

### 4. Fork/copy strategy

Do not blindly copy AMQP transport code into this repository.

Use the AMQP repository as a reference for:
- package structure
- Node-RED node layout
- test discipline
- documentation
- logging/status presentation
- packaging
- shared-client lifecycle architecture

But implement the MQTT transport based on verified Edge 1.6 requirements.

## Intended Public Node-RED Interface

Target four public nodes unless the verified MQTT architecture shows a strong reason otherwise:

1. Module Input (MQTT)
2. Module Output (MQTT)
3. Module Twin (MQTT)
4. Module Method (MQTT)

The underlying MQTT connection manager should be internal and shared.

Do not expose a separate client/connection node unless testing proves it is required for correct Node-RED lifecycle behavior.

## Functional Requirements

The MQTT package must support, as applicable to the verified Edge 1.6 MQTT API:
- receiving module input messages
- sending module output messages
- module twin desired-property handling
- module twin reported-property updates
- direct methods
- JSON payloads
- string payloads
- Buffer payloads
- EdgeHub module-to-module routing
- NodeRedData output routed upstream to IoT Hub

Do not intentionally change the existing functional contract merely to simplify implementation.

## Resilience Requirements

This is a critical requirement.

The MQTT implementation must be tested for:

```text
Node-RED starts before EdgeHub
        -> connection retries
        -> connection succeeds later
        -> nodes become operational
```

```text
Established MQTT connection drops
        -> disconnect detected
        -> automatic reconnect
        -> subscriptions restored
        -> telemetry resumes
```

```text
One AMQP/MQTT node is removed
        -> shared MQTT client remains active
        -> other nodes continue working
```

```text
Last MQTT node is removed
        -> shared client closes cleanly
```

A manual restart of both Node-RED and the source sensor must NOT be required to recover normal message flow.

## Test Record Format

Maintain test results using this structure:

| TC | Test Case | Action | Expected Result | Actual Result | Status | Remarks |
|---|---|---|---|---|---|---|
| TC-01 | Basic input | | | | | |
| TC-02 | Basic output/cloud | | | | | |
| TC-03 | Multiple MQTT nodes / shared client | | | | | |
| TC-04 | Node-RED restart | | | | | |
| TC-05 | EdgeHub startup ordering | | | | | |
| TC-06 | MQTT disconnect/reconnect | | | | | |
| TC-07 | Cloud outage/store-and-forward | | | | | |
| TC-08 | Module Twin | | | | | |
| TC-09 | Direct Method | | | | | |
| TC-10 | Payload compatibility | | | | | |
| TC-11 | Long-running stability | | | | | |

## Production Readiness Requirements

Before publishing to npm / Node-RED Palette Manager:
- package metadata is correct
- public node count matches intended design
- runtime package contents are minimal and reviewed
- repository README is complete
- local package smoke tests pass
- package-content check passes
- automated unit/integration tests cover connection lifecycle
- startup ordering is tested
- reconnect is tested
- multiple-node shared-client behavior is tested
- no manual container restart is required for recovery
- Node-RED editor configuration/help text is clean
- logs and node status make failures diagnosable

## Important Lessons from AMQP Testing

During AMQP testing:
- A standalone `ModuleClient.fromEnvironment(Amqp)` connection successfully connected to EdgeHub and retrieved the twin.
- Node-RED successfully received SimulatedTemperatureSensor data.
- Node-RED Module Output successfully called `sendOutputEvent()`.
- Azure CLI `az iot hub monitor-events` confirmed `NodeRedData` telemetry arriving in IoT Hub.
- The EdgeHub cloud connection was established over AMQP.
- Early versions required restarting both NodeRedData and the simulated sensor to restore flow, which motivated stronger connection lifecycle/reconnect handling.
- A confusing `Input completion failed: undefined` was observed when considering duplicate input listeners; duplicate identical inputs are not a normal deployment requirement and should not drive the primary design.

These observations are context only. Verify MQTT behavior independently.

## Working Rule for the New Chat

Start with research and verification, then architecture, then code.

Do not immediately edit files after opening the new chat.

First retrieve this handoff, inspect the new repository, research Azure IoT Edge 1.6 / EdgeHub / EdgeAgent MQTT support and the current SDK path, and summarize the verified design before implementation begins.
