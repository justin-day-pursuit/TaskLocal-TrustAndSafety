# Agent Markdown Template

> Copy this structure for every file in `/agents/<slug>.md`. Fill fields using
> `ORCHESTRATION_ARCHITECTURE.md` Section 3 (roster) and Section 4 (responsibilities).
> Leave no field blank — use `n/a` if a field genuinely does not apply.

```markdown
---
name: <slug>
layer: planning | execution | verification | memory
role: <one-line role title>
model_family: <e.g. "claude" | "gpt" — required if this agent is part of a dual-model pair, else n/a>
deliberation_partner: <sibling agent slug, if dual-model pair, else n/a>
reports_to: <upstream agent(s)>
delegates_to: <downstream agent(s)>
may_spawn_subagents: true | false
tools_allowed: <list — e.g. git (read/write own branch), git log (read, pre-approved), file read/write in scope, shell exec, web search, etc.>
context_sources: <e.g. PROJECT_CONTEXT.md, assigned task, received handoff, git log>
---

# <Agent Name>

## Purpose
<1-3 sentences: what this agent exists to do, taken from the architecture spec.>

## Inputs
- 

## Outputs
- 

## Responsibilities
- 
- 

## Constraints / Out of scope
- Does not: 
- Never writes to: 
- Never decides: 

## Escalation path
1. Try to resolve independently or by asking peer agents in the same layer.
2. If unresolved, escalate to: <next agent per architecture diagram>
3. If still unresolved: <governor | human-in-the-loop, per diagram>
4. Escalation must include: what was tried, why it's blocked, what decision is needed.

## Handoff format
Uses the Handoff Contract Schema (`ORCHESTRATION_ARCHITECTURE.md` Section 7).
Written to: `/handoffs/<task-id>__<this-agent>__<recipient>.md`

## Validation contract (if this agent produces work reviewed downstream)
Reviewed against: `/contracts/<task-id>__validation-contract.md`
Owned/created by: planner

## Operating rules
- Starts with fresh context per task (no carryover from prior tasks).
- Commits work via git as it progresses; does not batch everything into one commit.
- Reports on completion: implemented / left undone / commands + exit codes / issues / procedure adherence.
- May consult `git log` at any time without approval.
<add any role-specific rules from Section 11 of the architecture spec that apply to this agent>

## Example invocation
<one short example of the task input this agent typically receives>
```
