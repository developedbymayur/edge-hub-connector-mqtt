# MQTT Project Handoff

## Purpose

This repository is the separate workstream for building and testing an Azure IoT Edge Node-RED MQTT connector for Azure IoT Edge 1.6.x.

Do not continue MQTT implementation in the AMQP repository. The AMQP project remains a separate reference and working stream.

## Base repository / source project

The MQTT implementation must be based on:

- https://github.com/iotblackbelt/noderededgemodule

Use that repository as the primary functional/reference baseline for the MQTT Node-RED integration.

A key project requirement is to study Azure IoT Edge 1.6 itself before deciding how the MQTT implementation should work. Do not blindly reuse assumptions from older Azure IoT Edge versions or from the AMQP implementation.

## Reference AMQP project

The working AMQP project is:

- https://github.com/developedbymayur/edge-hub-connector

Current AMQP package:

- `@developedbymayur/node-red-contrib-azure-iot-edge-amqp`
- Current tested version: `0.5.1`

The AMQP project is a reference for:
- desired Node-RED user experience
- shared connection lifecycle
- status/logging discipline
- packaging
- test-record discipline
- production-readiness expectations

Do not copy AMQP transport internals without verifying MQTT-specific Azure IoT Edge 1.6 requirements.

## Current known validation environment

From the AMQP project:

- Azure IoT Edge: 1.6.0
- Edge Agent: 1.6.0
- Edge Hub: 1.6.0
- Node-RED: 5.0.4
- Node.js in the current Node-RED image: 24.18.1
- OPC Publisher: 2.9.15
- Simulated Temperature Sensor: 1.5

Example module:
- `NodeRedData`

Example device:
- `IoT-Edge-AUCPL-ChSambhajiNagar-QA`

These are reference values for testing. Verify MQTT compatibility independently.

## Mandatory first activities in the new MQTT chat

Do these in order. Do not start coding before the research/verification step is complete.

### 1. Retrieve and inspect this repository

Start with:

- repository metadata
- current files
- package metadata
- Node-RED node definitions
- existing tests/CI if present

Then inspect the base repository:

- https://github.com/iotblackbelt/noderededgemodule

Understand exactly what functionality and Node-RED behavior the existing implementation provides.

### 2. Study Azure IoT Edge 1.6

Study the actual Azure IoT Edge 1.6 architecture, especially:

- Edge Agent 1.6
- Edge Hub 1.6
- protocol heads / MQTT support
- local module authentication
- workload API / identity flow
- module-to-module routing
- module-to-cloud routing
- MQTT ports and TLS behavior
- EdgeHub topic conventions
- startup ordering and reconnect behavior
- cloud forwarding and store-and-forward

Use current Microsoft documentation and Azure IoT Edge source/code as authoritative references where applicable.

### 3. Study the actual SDK/API path

Determine which SDK/API is actually appropriate for an Azure IoT Edge 1.6 module using MQTT.

Verify before selecting dependencies:

- Node.js compatibility
- Azure IoT Node.js SDK package/version
- MQTT transport/package support
- authentication through the Edge workload identity
- connect/open lifecycle
- send API
- receive/subscription API
- message completion/acknowledgment semantics
- twin APIs
- direct-method APIs
- reconnect behavior

Do not select a package solely because it was used by an older implementation.

### 4. Compare old MQTT behavior with the desired architecture

The previous MQTT implementation had the following desired model:

```text
One Node-RED runtime
        |
        +-- Module Input
        +-- Module Output
        +-- Module Twin / supported operations
        |
        +----> ONE shared MQTT client / connection
```

Multiple Node-RED nodes should reuse one underlying MQTT client/connection. Node configuration should primarily define route/input/output/method names rather than creating separate transport connections.

Preserve existing functional behavior where supported by the verified Azure IoT Edge 1.6 MQTT architecture.

### 5. Architecture decision

Only after steps 1-4:

- document the verified MQTT architecture
- decide whether MQTT can support the same four public nodes as AMQP
- identify any operations that MQTT cannot support directly
- explicitly document any limitations instead of emulating unsupported behavior
- decide the shared-client lifecycle and reconnection design

## Target public Node-RED interface

Target four public nodes unless research proves a different design is required:

1. Module Input (MQTT)
2. Module Output (MQTT)
3. Module Twin (MQTT)
4. Module Method (MQTT)

The MQTT connection/client manager should be internal.

Do not expose a separate client node unless testing proves it is required for correct operation.

## Functional goals

Where supported by Azure IoT Edge 1.6 MQTT:

### Module Input

Receive messages from a named EdgeHub module input/route and emit them into Node-RED.

### Module Output

Send `msg.payload` to a named EdgeHub module output so EdgeHub can route it locally or upstream to IoT Hub.

### Module Twin

Support desired-property reception and reported-property updates where the verified MQTT/API path supports them.

### Module Method

Verify whether direct methods are available through the selected MQTT mechanism. If not supported, document the limitation rather than inventing an unsupported protocol behavior.

Payload behavior should cover, where appropriate:

- JSON objects
- strings
- Buffers
- non-JSON content

## Resilience requirements

This is a primary requirement.

The MQTT implementation must handle startup ordering and reconnect without requiring manual restarts.

Required behavior:

```text
Node-RED starts before EdgeHub
        -> MQTT connection retries
        -> EdgeHub becomes available
        -> connection succeeds
        -> subscriptions/listeners become active
```

```text
Established MQTT connection drops
        -> disconnect detected
        -> automatic reconnect
        -> subscriptions/listeners restored
        -> telemetry resumes
```

```text
One Node-RED MQTT node removed
        -> shared MQTT client remains active
        -> remaining nodes continue working
```

```text
Last MQTT node removed
        -> shared MQTT client closes cleanly
```

A manual restart of both Node-RED and the source module must not be required to recover ordinary operation.

## Test record

Maintain a running test table throughout the project:

| TC | Test Case | Action | Expected Result | Actual Result | Status | Remarks |
|---|---|---|---|---|---|---|
| TC-01 | Basic MQTT connection | | | | | |
| TC-02 | Module input | | | | | |
| TC-03 | Module output to EdgeHub | | | | | |
| TC-04 | Cloud telemetry | | | | | |
| TC-05 | Multiple MQTT nodes / shared client | | | | | |
| TC-06 | Node-RED restart | | | | | |
| TC-07 | EdgeHub startup ordering | | | | | |
| TC-08 | MQTT disconnect/reconnect | | | | | |
| TC-09 | Listener/subscription restoration | | | | | |
| TC-10 | Cloud outage/store-and-forward | | | | | |
| TC-11 | Module Twin | | | | | |
| TC-12 | Direct Method | | | | | |
| TC-13 | Payload compatibility | | | | | |
| TC-14 | Long-running stability | | | | | |

Record exact commands, logs, observed timestamps, and cloud evidence rather than relying only on the Node-RED UI.

## AMQP baseline already proven

The AMQP project has already demonstrated this complete telemetry path:

```text
SimulatedTemperatureSensor
        -> EdgeHub
        -> NodeRedData Module Input
        -> NodeRedData Module Output
        -> EdgeHub
        -> IoT Hub
```

It also demonstrated a working AMQP SDK-level module connection and cloud telemetry through `NodeRedData`.

These results are a baseline only. MQTT must be independently validated.

## Production readiness before publication

Before publishing the MQTT package to npm / Node-RED Palette Manager:

- package metadata is correct
- package name/version are finalized
- public node count is intentional and documented
- package contents are minimal and reviewed
- README is complete
- example flow is included
- npm pack content is reviewed
- smoke/unit tests pass
- behavioral lifecycle tests pass
- multiple-node shared-client behavior is proven
- startup ordering is proven
- reconnect is proven
- no manual source-module restart is required for recovery
- Node-RED editor UI is polished
- node status/logging is diagnostic
- no secrets/connection strings are committed
- MQTT limitations are explicitly documented

## Starting sequence for the new MQTT chat

The new chat should proceed one step/command at a time.

1. Retrieve this handoff file.
2. Inspect the new repository.
3. Inspect `https://github.com/iotblackbelt/noderededgemodule`.
4. Research Azure IoT Edge 1.6 Edge Agent and Edge Hub MQTT architecture.
5. Research and verify the supported SDK/API path.
6. Summarize findings and architecture.
7. Only then create/modify implementation files.

Do not start MQTT coding before the architecture and SDK path are verified.