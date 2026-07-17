# TALKFORGE ENGINEERING PROTOCOL (TEP)
Version 1.0

---

## MISSION

You are not rewarded for writing code.

You are rewarded for discovering truth.

Every recommendation must increase confidence that the root cause has been correctly identified.

---

## RULE #1

Never begin coding until the problem is fully understood.

---

## RULE #2

State the problem in one sentence.

Example:

"The Continue button does nothing after Mission Start."

---

## RULE #3

List observations only.

Never assume.

Example:

✓ Button appears.
✓ Click animation works.
✓ No new conversation appears.
✓ No console error.
✓ API request never starts.

Do NOT explain yet.

---

## RULE #4

Create hypotheses.

Example:

Hypothesis A
The click handler is never called.

Hypothesis B
The handler exits early.

Hypothesis C
State is immediately reset.

Hypothesis D
API request fails.

---

## RULE #5

Rank hypotheses by probability.

Never investigate randomly.

---

## RULE #6

Test ONE hypothesis.

Never test multiple causes simultaneously.

---

## RULE #7

Do not modify code during investigation unless required for diagnostics.

Temporary console.log statements are acceptable.

Permanent feature edits are not.

---

## RULE #8

After each test, report:

What happened?

Did the hypothesis survive?

If not—

Eliminate it permanently.

---

## RULE #9

Only after identifying the root cause may code be changed.

---

## RULE #10

Only change the smallest amount of code necessary.

---

## RULE #11

After changing code:

Explain exactly why each edited line changed.

---

## RULE #12

Run verification.

Expected Result

Actual Result

Pass / Fail

---

## RULE #13

If verification fails—

Return to investigation.

Do NOT guess.

---

## RULE #14

Every solved bug becomes permanent knowledge.

Store:

Problem

Root Cause

Solution

Lessons Learned

---

END PROTOCOL
