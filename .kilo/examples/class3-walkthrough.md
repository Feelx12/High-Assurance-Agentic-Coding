---
name: high-assurance-class3-walkthrough
description: Complete Class 3 High-Assurance workflow example — adding a payment authorization check to a user profile API.
---

# End-to-End Class 3 Walkthrough

> **Example project**: A Node.js/TypeScript REST API.
> **Feature**: Add a payment authorization check before allowing profile deletion.

This walkthrough shows every artifact produced in a real Class 3 workflow.

---

## Step 0: User Request

```
/grounding

I need to add a check that prevents users from deleting their profile if they have an active
paid subscription. Deleting the profile should fail with a 403 if there is an active subscription.
```

---

## Step 1: `/grounding` — Formal Grounding Mode

The agent runs `Grounding Mode` (`.kilo/modes/grounding-mode.md`).

### 1a. Change Classification

```markdown
## Change Classification
- Class: 3
- Label: Non-Trivial Feature / Architecture Change
- Reason: Touches payment/subscription logic and user deletion — a CRITICAL domain per the coverage registry.
- Escalation triggers: Payment logic touched, Permission logic touched, Data integrity invariant
```

### 1b. Invoke `fresh-graph-grounding` skill

MCP call: `joern.create_graph_snapshot({ repo_path: "/workspace/myapp" })`

```json
{
  "status": "PASS",
  "snapshot_id": "snap-20260513-a1b2c3",
  "commit_hash": "abc1234",
  "impacted_files": [
    "src/users/user.service.ts",
    "src/users/user.controller.ts",
    "src/subscriptions/subscription.service.ts",
    "src/auth/auth.guard.ts",
    "test/users/user.service.spec.ts"
  ]
}
```

**Structural Truth produced:**
```markdown
## Structural Truth
- Graph snapshot: snap-20260513-a1b2c3
- Impacted files: user.service.ts, user.controller.ts, subscription.service.ts
- Impacted symbols: UserService.deleteUser, SubscriptionService.getActiveSubscription
- Upstream callers: UserController.deleteProfile → UserService.deleteUser
- Downstream dependencies: UserService.deleteUser → Database.users.delete
- Data flows: userId → getActiveSubscription → deleteUser guard
- Mutation points: Database.users.delete(userId)
- Related tests: test/users/user.service.spec.ts
- Risk level: CRITICAL
```

### 1c. Invoke `alloy-rule-authoring` skill

Agent creates `formal/user-profile-deletion.als`:

```alloy
module UserProfileDeletion

sig User {}
sig Subscription {
  owner: one User,
  status: one Status
}
abstract sig Status {}
one sig Active, Inactive extends Status {}

-- Fact: A user may not be deleted if they have an active subscription
pred CanDelete(u: User) {
  no s: Subscription | s.owner = u and s.status = Active
}

-- Assert: Deletion of users with active subs is always blocked
assert NoDeletionWithActiveSub {
  all u: User |
    (some s: Subscription | s.owner = u and s.status = Active)
      implies not CanDelete(u)
}

run CanDelete for 5
check NoDeletionWithActiveSub for 5
```

MCP call: `alloy.check_assertion({ model: "formal/user-profile-deletion.als", assertion: "NoDeletionWithActiveSub", scope: 5 })`

```json
{
  "status": "PASS",
  "result": "NO_COUNTEREXAMPLE",
  "counterexample": null
}
```

**Behavioral Truth produced:**
```markdown
## Behavioral Truth
- Alloy files: formal/user-profile-deletion.als
- Assertions checked: NoDeletionWithActiveSub
- All assertions pass: true
- Entity mappings: User → User model, Subscription → Subscription model, Active → status=active
```

### 1d. Invoke `human-readable-handoff` skill

```markdown
## Human-Readable Implementation Handoff

### Request Summary
Add a 403 guard on DELETE /users/:id that checks for active subscription before deletion.

### Assumptions
- Assumption: SubscriptionService.getActiveSubscription(userId) returns null if no active sub
  - Confidence: HIGH (verified by graph query)
  - Risk: LOW
  - Requires human confirmation: No

### Behavior Requirements Verified
- A user with status=active subscription CANNOT delete their profile
- A user with no subscription or inactive subscription CAN delete their profile
- The 403 response must include a reason string

### Out of Scope
- Canceling subscriptions — that is a separate flow
- Deleting subscriptions — not in scope
- Changing subscription status — not in scope

### Structural Scope from Joern
Impacted files:
- src/users/user.service.ts
- src/users/user.controller.ts
- test/users/user.service.spec.ts

### Alloy Rules Created
- formal/user-profile-deletion.als
- Assertion: NoDeletionWithActiveSub → NO_COUNTEREXAMPLE ✓

### What the Implementation Will Do
- Add a call to SubscriptionService.getActiveSubscription(userId) in UserService.deleteUser
- Return 403 ForbiddenException if active subscription found
- Add unit tests for both the blocked and allowed paths

### What the Implementation Will Not Do
- Cancel or modify subscriptions
- Change auth/permissions
- Modify subscription schema

### Handoff Decision
Implementation may proceed: Yes
Reason: Alloy assertion holds, graph scope is clear, risk is bounded.
```

### 1e. Invoke `formal-work-package` skill

```json
{
  "artifact_id": "myapp-profile-delete-20260513-a1b2",
  "commit_hash": "abc1234",
  "graph_snapshot": "snap-20260513-a1b2c3",
  "alloy_validation": "NoDeletionWithActiveSub:NO_COUNTEREXAMPLE",
  "change_class": "CLASS_3",
  "risk_level": "CRITICAL",
  "autonomy_level": "LEVEL_3",
  "allowed_files": [
    "src/users/user.service.ts",
    "test/users/user.service.spec.ts"
  ],
  "forbidden_files": [
    "src/auth/**",
    "src/subscriptions/subscription.service.ts",
    "src/subscriptions/subscription.schema.ts"
  ],
  "required_tests": [
    "Should return 403 when user has active subscription",
    "Should allow deletion when user has no subscription",
    "Should allow deletion when subscription is inactive"
  ],
  "success_criteria": [
    "NoDeletionWithActiveSub Alloy assertion holds",
    "All required tests pass",
    "No unauthorized architecture drift detected"
  ],
  "stop_conditions": [
    "If SubscriptionService interface must change — return to Grounding Mode",
    "If auth logic must change — return to Grounding Mode with CRITICAL escalation",
    "If new external dependency required — return to Grounding Mode"
  ]
}
```

---

## Step 2: `/implementation` — Constrained Implementation Mode

The agent reads the Formal Work Package and implements only within the allowed files.

```typescript
// src/users/user.service.ts  (only this file is modified)

async deleteUser(userId: string): Promise<void> {
  // HIGH-ASSURANCE GATE: Check for active subscription before deletion
  // Formal basis: formal/user-profile-deletion.als → NoDeletionWithActiveSub
  const activeSub = await this.subscriptionService.getActiveSubscription(userId);
  if (activeSub) {
    throw new ForbiddenException(
      'Cannot delete profile with an active subscription. Cancel your subscription first.'
    );
  }
  await this.usersRepository.delete(userId);
}
```

Tests added to `test/users/user.service.spec.ts`:
```typescript
it('should throw 403 when user has active subscription', async () => {
  subscriptionService.getActiveSubscription.mockResolvedValue({ status: 'active' });
  await expect(service.deleteUser('user-1')).rejects.toThrow(ForbiddenException);
});

it('should allow deletion when no subscription exists', async () => {
  subscriptionService.getActiveSubscription.mockResolvedValue(null);
  await expect(service.deleteUser('user-1')).resolves.toBeUndefined();
});
```

---

## Step 3: `/verification` — Verification Traceability Mode

### 3a. Rerun Alloy
MCP call: `alloy.check_assertion({ model: "formal/user-profile-deletion.als", assertion: "NoDeletionWithActiveSub" })`
→ `NO_COUNTEREXAMPLE` ✓

### 3b. Run tests
MCP call: `verification.run_unit_tests({ scope: "test/users/user.service.spec.ts" })`
→ `PASS` — 3 tests, 3 passing ✓

### 3c. Post-implementation snapshot and diff
MCP call: `joern.create_graph_snapshot({ repo_path: "/workspace/myapp" })`
→ `snap-20260513-b3c4d5`

MCP call: `joern.compare_graph_snapshots({ before_id: "snap-20260513-a1b2c3", after_id: "snap-20260513-b3c4d5" })`
→ `drift_indicator: CHANGES_DETECTED` — only `UserService.deleteUser` modified. No unauthorized drift.

### 3d. Generate Traceability Report

MCP call: `verification.generate_traceability_report({ artifact_id: "myapp-profile-delete-20260513-a1b2-trace", change_class: "CLASS_3", risk_level: "CRITICAL", final_decision: "PASS" })`

```json
{
  "artifact_id": "myapp-profile-delete-20260513-a1b2-trace",
  "derived_from": "myapp-profile-delete-20260513-a1b2",
  "commit_hash": "def5678",
  "change_class": "CLASS_3",
  "risk_level": "CRITICAL",
  "structural_truth": {
    "graph_snapshot_id": "snap-20260513-b3c4d5",
    "impacted_files": ["src/users/user.service.ts", "test/users/user.service.spec.ts"],
    "drift_result": "EXPECTED"
  },
  "behavioral_truth": {
    "alloy_validation_id": "NoDeletionWithActiveSub:NO_COUNTEREXAMPLE",
    "all_assertions_pass": true,
    "counterexamples": []
  },
  "verification_truth": {
    "tests_run": ["test/users/user.service.spec.ts"],
    "all_tests_pass": true,
    "lint_pass": true,
    "typecheck_pass": true
  },
  "architecture_drift": "EXPECTED",
  "final_decision": "PASS"
}
```

**Outcome: ACCEPTED** ✅

---

## Key Takeaways

1. The **Alloy model** proved that deletion with an active subscription is always blocked — before a single line of production code was written.
2. The **Formal Work Package** strictly bounded the change to 2 files — `user.service.ts` and its test.
3. The **graph diff** confirmed the change touched only the intended symbol.
4. The **traceability report** is the permanent audit trail, linked to commit hash, snapshot, and Alloy validation.

Human approval is required before merging because the risk level is CRITICAL (payment/subscription logic). Reference: `artifact_id: myapp-profile-delete-20260513-a1b2`.
