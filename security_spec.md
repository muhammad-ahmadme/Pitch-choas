# Security Specification & Payload-First TDD

## 1. Data Invariants
1. A `/users/{userId}` document belongs strictly to `request.auth.uid == userId`, with `ownerUid == request.auth.uid` immutable after creation.
2. No PII (`email`, `phone`, `address`) is ever stored inside `/users/{userId}` or `/leaderboards/{userId}`.
3. Timestamps (`createdAt`, `updatedAt`) MUST equal `request.time` from the server; `createdAt` is immutable on update.
4. Array unlocks (`unlockedPlayerIds`, `unlockedKitIds`, `earnedTrophyIds`, `claimedAchievementIds`) are bounded in size (`<= 30`), and `playerUpgrades` is a bounded map (`<= 24` keys).
5. Public `/leaderboards/{userId}` documents contain only non-PII club display metrics and can only be written by the owner `userId`.

## 2. Adversarial "Dirty Dozen" Payloads (All Expected: PERMISSION_DENIED)
1. **Cross-user Read**: User B attempts `get(/users/userA)` -> DENIED.
2. **Cross-user Write**: User B attempts `set(/users/userA, { ownerUid: 'userB', ... })` -> DENIED.
3. **Identity Spoof**: User A writes `/users/userA` with `ownerUid: 'userB'` -> DENIED.
4. **Ghost Field / Shadow Update**: User A sends extra field `isAdmin: true` in `/users/userA` -> DENIED by `hasOnly`.
5. **Unverified Email**: Unverified auth token attempts write to `/users/userA` -> DENIED by `email_verified == true`.
6. **Client-Forged Timestamp**: User A writes `createdAt: '2020-01-01'` or custom timestamp != `request.time` -> DENIED.
7. **Immutable Field Mutation**: User A updates `ownerUid` or `createdAt` on `/users/userA` -> DENIED.
8. **ID Poisoning**: Attempt to read/write `/users/` with oversized or non-alphanumeric ID (`../hack` or 500-char string) -> DENIED by `isValidId`.
9. **Array Flood / Denial of Wallet**: User A writes `unlockedPlayerIds` with 100 items -> DENIED by `.size() <= 30`.
10. **Numeric Poisoning**: User A sets `coins: -999` or `coins: "infinite"` -> DENIED by type & range checks.
11. **Leaderboard Spoof**: User B tries to update `/leaderboards/userA` -> DENIED.
12. **Blanket List Scraping on Private Users**: User B runs `list(/users)` -> DENIED (`allow list: if false`).
