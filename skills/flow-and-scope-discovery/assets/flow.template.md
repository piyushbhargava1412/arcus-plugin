# Flow: [Flow Name]

<!-- context-meta
verification-commit: [hash or unknown]
generated-at: [ISO-TIMESTAMP]
confidence: [high | medium | low]
-->

## Overview
Brief 1-sentence description of the business purpose for this flow.

## Entry Points
- **Type**: [REST | Listener | Job]
- **Path/Topic**: [e.g., POST /v1/orders]
- **File**: `[path/to/EntryPoint.java]`

## Core Path
Bulleted sequence of the "Happy Path" execution logic.
1. `[EntryPoint] -> [Service]`
2. `[Service] -> [Business Logic]`
3. `[Business Logic] -> [Repository/Integration]`

## Data Touchpoints
- **Entities**: `[EntityName]` (path/to/file)
- **Tables**: `[table_name]` (if evident)

## Integrations
- **Type**: [Produced Event | API Call]
- **Target**: [Downstream System Name]
- **Channel**: [Topic Name | API Path]

## Scope
Critical files required to understand or modify this flow.
- `[path/to/KeyFile1.java]`
- `[path/to/KeyFile2.java]`

## Tests
- `[path/to/TestFile.java]`

