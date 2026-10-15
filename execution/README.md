# Execution Scripts (Layer 3)

Deterministic Python scripts that execute concrete actions.

## Guidelines
1. **Deterministic & Isolated**: Scripts should have clear inputs and outputs, avoiding LLM-probabilistic guessing for deterministic tasks.
2. **Environment & Secrets**: Load credentials from `.env` or system environment using `python-dotenv`. Never hardcode tokens or API keys.
3. **Intermediates**: Write temporary or cache files to `.tmp/`.
4. **Error Reporting**: Provide clear exit codes and stack traces so orchestration (Layer 2) can debug and self-anneal when failures occur.
5. **Reusability**: Check existing scripts in this directory before creating new ones.
