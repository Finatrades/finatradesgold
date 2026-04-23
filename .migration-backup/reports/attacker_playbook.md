# Attacker Playbook - Finatrades Platform

## Fastest Path to Money Analysis

### Hypothesis 1: Account Takeover → Drain Wallet
```
1. Find target email (social engineering, data breach)
2. Attempt password reset → BLOCKED (5/hour rate limit)
3. Attempt login brute force → BLOCKED (10/15min rate limit)
4. Attempt OTP bypass → BLOCKED (5/5min + 10min expiry)
5. Attempt session hijacking → BLOCKED (secure cookies, session regeneration)

RESULT: FAILED - Strong auth controls
```

### Hypothesis 2: IDOR → Access Other User's Wallet
```
1. Login as attacker
2. Capture wallet API request: GET /api/wallets/MY_ID
3. Replace MY_ID with victim's ID
4. → BLOCKED by ensureOwnerOrAdmin middleware

RESULT: FAILED - Authorization checks on all endpoints
```

### Hypothesis 3: Double-Submit Deposit
```
1. Login as attacker
2. Submit deposit request with amount $10,000
3. Immediately re-submit same request
4. → BLOCKED by idempotency key (Redis SETNX)
5. Second request returns cached result

RESULT: FAILED - Idempotency protection
```

### Hypothesis 4: Race Condition on Transfer
```
1. Have balance of $1,000
2. Send two parallel requests to transfer $1,000 each
3. Both hit server simultaneously
4. → BLOCKED by idempotency lock (30-second TTL)
5. Second request waits/fails

RESULT: FAILED - Atomic operations
```

### Hypothesis 5: Negative Amount Exploit
```
1. Call POST /api/withdrawal-requests
2. Set amount: -1000 (hoping to add funds)
3. → BLOCKED by Zod schema validation
4. Error: "Amount must be positive"

RESULT: FAILED - Input validation
```

### Hypothesis 6: Admin Privilege Escalation
```
1. Login as regular user via /api/auth/login
2. Session set with adminPortal: false
3. Call admin endpoint /api/admin/users
4. → BLOCKED by ensureAdminAsync
5. Checks: role='admin' AND adminPortal=true AND active employee

RESULT: FAILED - Multi-layer admin verification
```

### Hypothesis 7: Self-Approve My Own Deposit
```
1. Somehow become admin (social engineering)
2. Submit deposit request as user
3. Switch to admin portal
4. Approve own deposit
5. → TECHNICALLY POSSIBLE if same person has both roles
6. But mitigated by:
   - Audit logs track all actions
   - Employee status must be active
   - Different portal sessions required

RESULT: MITIGATED - Audit trail + role separation
```

## Attack Surface Strengths

| Area | Protection Level | Bypass Difficulty |
|------|-----------------|-------------------|
| Authentication | 🔒🔒🔒🔒🔒 | Very Hard |
| Session Management | 🔒🔒🔒🔒🔒 | Very Hard |
| Authorization | 🔒🔒🔒🔒🔒 | Very Hard |
| Money Operations | 🔒🔒🔒🔒🔒 | Very Hard |
| Input Validation | 🔒🔒🔒🔒 | Hard |
| File Uploads | 🔒🔒🔒🔒 | Hard |
| API Rate Limiting | 🔒🔒🔒🔒 | Hard |
| Admin Access | 🔒🔒🔒🔒🔒 | Very Hard |

## Potential Weak Points (Theoretical)

1. **Social Engineering** - Platform security can't prevent phishing
2. **Insider Threat** - Active admin could abuse privileges (mitigated by audit logs)
3. **Third-Party Dependencies** - Payment gateway vulnerabilities (out of scope)
4. **Physical Access** - Server-level attacks (AWS responsibility)

## Conclusion

As a black-hat attacker, this platform presents significant barriers:
- Cannot brute force credentials (rate limited)
- Cannot bypass authentication (session security)
- Cannot access other users' data (IDOR protection)
- Cannot manipulate money (idempotency + validation)
- Cannot escalate privileges (multi-layer checks)

**Attack Viability: LOW**
**Recommended Target: ELSEWHERE**
