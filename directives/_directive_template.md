# Directive: [Task / Workflow Name]

## 1. Goal
[Clear statement of what this workflow achieves]

## 2. Inputs & Prerequisites
- Input data / parameters: `...`
- Required API keys / environment variables in `.env`: `...`
- Credentials needed (e.g., `credentials.json`): `...`

## 3. Execution Tools & Scripts
> Principle: Check `execution/` before creating new scripts. Use deterministic Python scripts for all I/O, API calls, and data processing.

- Primary script: `execution/[script_name].py`
- Auxiliary tools: `...`

## 4. Execution Steps (Orchestration Flow)
1. **Prepare Inputs**: Store intermediate payloads in `.tmp/` if needed.
2. **Execute Tool**: Run `python execution/[script_name].py [args]`.
3. **Verify Output**: Validate response status and output files.
4. **Deliver**: Push final deliverables to cloud targets (e.g., Google Sheets, Slides, database).

## 5. Outputs & Deliverables
- **Intermediates**: Stored temporarily in `.tmp/` (can be deleted/regenerated)
- **Deliverables**: [Link or location of final cloud asset / deliverable]

## 6. Edge Cases, Failure Handling & Learnings (Self-Annealing Log)
<!-- As errors, rate limits, or API idiosyncrasies are encountered and resolved, document them here -->
- *[Date]* - [Issue encountered] -> [Deterministic fix applied to script/directive]
