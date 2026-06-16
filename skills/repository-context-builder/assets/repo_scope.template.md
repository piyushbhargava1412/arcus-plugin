# Repository Scope: [REPO NAME]

**Generated**: [DATE]
**Confidence**: [HIGH | MEDIUM | LOW]

<!-- context-meta
verification-commit: unknown
generated-at: [ISO-TIMESTAMP]
confidence: high | medium | low
-->

---

## Overview

<!-- 2-3 sentences: what business domain this repo serves, its role in the ecosystem.
     BUSINESS ONLY — do NOT repeat tech stack, language, or framework here.
     Technical overview belongs in repo_map.md → Overview. -->

## Business Capabilities

### Owned

<!-- What this repo is responsible for — business functions it implements -->

- [ capability ]

### Out of Scope

<!-- What this repo explicitly does NOT do — important for grooming boundaries -->

- [ capability — owned by X or not implemented ]

## Events

### Produced

<!-- Events/messages this repo publishes -->

| Event Name           | Topic / Queue        | Schema Path                     | Description                     |
|----------------------|----------------------|---------------------------------|---------------------------------|
|                      |                      |                                 |                                 |

<!-- If none found: "No event producers detected. Checked: [directories/files searched]" -->

### Consumed

<!-- Events/messages this repo subscribes to -->

| Event Name           | Topic / Queue        | Handler Path                    | Description                     |
|----------------------|----------------------|---------------------------------|---------------------------------|
|                      |                      |                                 |                                 |

<!-- If none found: "No event consumers detected. Checked: [directories/files searched]" -->

## APIs
<!-- Logical API operations this repo exposes or consumes (business interface boundaries).
     List methods, paths, and what they do — do NOT list schema file paths here.
     Schema files (OpenAPI, Avro, Proto) belong in repo_map.md → Contracts & Schemas. -->
### Exposed

<!-- REST/gRPC/GraphQL endpoints this repo serves -->

| API                  | Method / Type        | Path / Operation                | Spec Path                       |
|----------------------|----------------------|---------------------------------|---------------------------------|
|                      |                      |                                 |                                 |

<!-- If none found: "No exposed APIs detected. Checked: [directories/files searched]" -->

### Consumed

<!-- External APIs this repo calls -->

| Service              | API / Endpoint       | Client Path                     | Evidence                        |
|----------------------|----------------------|---------------------------------|---------------------------------|
|                      |                      |                                 |                                 |

<!-- If none found: "No consumed APIs detected. Checked: [directories/files searched]" -->

## Data Ownership

### Entities / Stores

<!-- Data models, database tables, or stores this repo owns -->

| Entity / Store       | Type (DB/Cache/File) | Location / Config               | Description                     |
|----------------------|----------------------|---------------------------------|---------------------------------|
|                      |                      |                                 |                                 |

### Data Flow

<!-- How data enters, transforms, and exits this repo -->

```
[source] → [this repo processing] → [destination]
```

## Dependencies

### Upstream (this repo depends on)

<!-- Services, APIs, data sources this repo requires -->

| Dependency           | Type (API/Event/DB)  | Evidence                        |
|----------------------|----------------------|---------------------------------|
|                      |                      |                                 |

### Downstream (depends on this repo)

<!-- Services that consume this repo's APIs or events -->

| Dependent            | Type (API/Event)     | Evidence                        |
|----------------------|----------------------|---------------------------------|
|                      |                      |                                 |

<!-- If unknown: "Downstream dependents not discoverable from repo alone — requires ecosystem documentation." -->

## Non-Functional Constraints

<!-- SLAs, throughput requirements, compliance, security posture — if documented or inferable -->

| Constraint           | Value / Target       | Evidence                        |
|----------------------|----------------------|---------------------------------|
|                      |                      |                                 |

<!-- If not found: "No non-functional constraints documented." -->

## CI/CD & Automation

<!-- High-level summary of the SDLC automation in this repo — pipelines, deployment targets, gates -->

| Workflow             | Trigger              | Key Test Gates                  | Deploy Target                   |
|----------------------|----------------------|---------------------------------|---------------------------------|
|                      |                      |                                 |                                 |

<!-- Example gates: unit-tests, integration-tests, functional-tests, acceptance-tests, performance-tests -->
<!-- If none: "No CI/CD configuration detected." -->
<!-- See repo_map.md → CI/CD Workflows for file-level detail. -->

---

## Confidence & Unknowns

### Confidently Inferred

<!-- Items the agent is confident about, with evidence -->

| Aspect | Confidence | Evidence |
|--------|------------|----------|
|        | HIGH / MEDIUM / LOW |          |

### Needs Human Confirmation

<!-- IMPORTANT: These questions MUST be prompted to the user during generation.
     The agent must ask each question interactively and record answers here. -->

| # | Question | Answer | Status |
|---|----------|--------|--------|
| 1 | [ question — reason ] | [ user's answer or "Pending" ] | ✅ Confirmed / ⏳ Pending |

### Not Found (checked but absent)

<!-- Items that were searched for but not found. Include paths checked. -->

- [ item — directories/files searched ]

> **See also**: [repo_map.md](repo_map.md) for technical topology and navigation.
