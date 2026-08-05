# MBL-001 — Machine Behavior Language

| Field | Value |
|---|---|
| **Document ID** | MBL-001 |
| **Title** | Machine Behavior Language |
| **Version** | 1.0.0 |
| **Status** | **Proposed — Founder Review · implementation not authorized** |
| **Role** | Chief Interaction Architect |
| **Accountable executive** | Chief Experience Architect |
| **Final approver** | Founder |
| **Governance steward** | Atlas |
| **Feasibility owner** | Engineering Lead |
| **Plane** | Working Knowledge |
| **Captured in** | IV-UX-008 |
| **Blind spot review** | BS-009 |
| **Related** | CXA-001 · TDS-001 · DES-001 · CRAFT-LAW-001 · AMD-001 · SYS2-001 · BUILD-UX-001 |
| **Date** | 2026-08-04 |

---

## Status and authority

The Chief Interaction Architect (CIA) is a specialist role operating under the authority of the Chief Experience Architect. The CIA defines how TalkForge behaves. The role does not:

- redesign information architecture;
- change product, engineering, AI, or data ownership;
- possess independent production veto authority;
- alter security, architecture, constitutional, or release gates;
- authorize UI implementation.

MBL-001 operationalizes CXA-001 and TDS-001. If this language conflicts with the Constitution, CXA-001, the Human Dignity Standard, System 1, System 2, or an active architecture gate, the higher authority wins.

This version is a complete proposed specification. It becomes permanent Canonical experience architecture only through explicit Founder admission.

---

## Mission

> **Every interaction exists to transform hesitation into readiness.**

A member should recognize TalkForge without seeing the logo. Recognition should emerge through:

- causality;
- movement;
- timing;
- rhythm;
- lighting;
- sound;
- haptics;
- transitions;
- emotional pacing;
- recovery.

The interface never merely responds. It coaches.

Behavior must increase confidence, reduce hesitation, and prepare a human being for a real conversation.

---

# 1. Behavioral Philosophy

## 1.1 What interaction means

Interaction is the relationship between a member's intention and TalkForge's response.

A TalkForge interaction has three responsibilities:

1. **Acknowledge** — confirm that the member's action was received.
2. **Orient** — make the resulting state immediately understandable.
3. **Prepare** — reduce the distance to the next useful action or real-world conversation.

An interaction that animates without acknowledging, orienting, or preparing has no job.

## 1.2 Behavioral character

TalkForge behavior is:

| Quality | Expression |
|---|---|
| **Mechanical in causality** | Actions have clear, reliable consequences |
| **Human in pacing** | Pauses, guidance, and recovery respect emotional context |
| **Quiet at rest** | Nothing moves merely to prove the product is alive |
| **Confident in direction** | One next action receives unmistakable emphasis |
| **Warm in recovery** | Failure is owned by the system, not assigned to the member |
| **Precise in state** | Listening, recording, thinking, paused, and complete are distinct |
| **Patient under uncertainty** | The system does not rush silence or invent progress |
| **Authoritative without command** | The Coach recommends; the member remains free to redirect |

TalkForge is neither purely mechanical nor organic. Machines express precision; the Coach provides human pacing.

## 1.3 The feeling after every action

After any interaction, the member should feel at least one of:

- **Certain** — "The system understood what I did."
- **Oriented** — "I know what changed."
- **Capable** — "I know what to do next."
- **Held** — "My work and context are safe."
- **Ready** — "I can take the next step."

No action should leave the member wondering whether the system received it.

## 1.4 How TalkForge differs

Productivity software often optimizes speed, density, and throughput. TalkForge optimizes preparedness.

TalkForge does not:

- celebrate task volume;
- simulate busyness;
- use activity as proof of progress;
- animate dashboards continuously;
- reward repeated checking;
- turn hesitation into a notification opportunity.

TalkForge behavior creates enough calm for honest practice, then enough momentum to begin.

## 1.5 Behavior deletion test

Before approving behavior, ask:

1. What uncertainty does this remove?
2. What state does this explain?
3. What next action does this support?
4. Does it delay the member?
5. Is the same meaning available without motion, color, sound, or haptics?

If behavior does not survive this test, remove it.

---

# 2. Motion Grammar

## 2.1 Motion has five permitted jobs

Motion may communicate:

1. **Cause and effect** — what changed because of the member's action.
2. **Spatial continuity** — where the member moved within the Gym.
3. **State transition** — ready, active, paused, recovered, complete.
4. **Focus** — what deserves attention now.
5. **Physical response** — how a Machine engages, resists, or settles.

Motion may not exist solely to create novelty, luxury, excitement, or perceived intelligence.

## 2.2 Motion hierarchy

Only one motion layer leads at a time:

| Rank | Layer | Example |
|---:|---|---|
| 1 | **Member consequence** | Training begins after activation |
| 2 | **Environment transition** | Coach recedes as Training Room resolves |
| 3 | **Machine response** | Core illuminates and mechanism settles |
| 4 | **Control response** | Button compresses or disclosure opens |
| 5 | **Background atmosphere** | Static or nearly imperceptible light behavior |

Lower-ranked movement pauses or reduces when a higher-ranked movement occurs.

## 2.3 Movement vocabulary

| Behavior | Meaning | Use |
|---|---|---|
| **Settle** | Ready and stable | Recommendations, Machines, completed loading |
| **Advance** | Move toward commitment | Begin Training, continue |
| **Recede** | Leave focus without disappearing abruptly | Previous environment |
| **Reveal** | New information became useful | Evidence, reflection detail |
| **Align** | Calibration or readiness | Negotiation and skill configuration |
| **Engage** | Machine or recording becomes active | Training start |
| **Hold** | Paused but safe | Pause, interruption, offline |
| **Release** | Completion or tension resolved | End of rep, recovery |
| **Return** | Restore continuity | Reconnection, Coach homecoming |

## 2.4 Rest positions

Every object has an intentional rest position:

- Buttons are static.
- Coach recommendations are stable.
- Machine cores use steady illumination, not pulse, when ready.
- Loading indicators stop when no new state is known.
- Progress visualizations remain still until explicitly explored.
- Background light does not drift continuously.

Rest communicates confidence.

## 2.5 Acceleration and deceleration

| Pattern | Curve | Use |
|---|---|---|
| Calm arrival | `cubic-bezier(0.22, 1, 0.36, 1)` | Recommendations and environmental entry |
| Clear departure | `cubic-bezier(0.4, 0, 1, 1)` | Dismissal and exit |
| Spatial movement | `cubic-bezier(0.65, 0, 0.35, 1)` | Room and Machine travel |
| Physical settle | Critically damped spring | Machine mechanisms only |

Avoid elastic overshoot in navigation, Coach messages, progress, failure, and accessibility-critical state changes.

## 2.6 Motion by element

### Buttons

- Pointer or touch down: `120ms` compression to `98%` maximum.
- Release: `180ms` return.
- Activation state appears immediately.
- Buttons never bounce.
- Disabled controls do not animate to attract attention.

### Cards and surfaces

TalkForge does not use generic card motion as identity.

When a bounded surface is necessary:

- hover changes elevation or boundary, not position, by more than `2px`;
- selection aligns light and boundary in `180ms`;
- opening detail expands in place;
- surfaces never float continuously.

### Machines

- Move as objects with weight.
- Engage from core to exterior.
- Settle without oscillation.
- Preserve silhouette during transitions.
- Never spin for loading.

### Coach recommendations

- Replace only when the recommendation truly changes.
- New recommendation settles in; old evidence recedes.
- The change includes a plain-language explanation.
- No carousel motion.

### Progress

- Reveal evidence before visualization.
- Do not animate numbers counting upward.
- Do not fill progress rings theatrically.
- Comparative movement appears only when the metric is validated.

### Navigation

- Current environment remains spatially anchored.
- Selection emphasis moves `180ms`; page content transitions separately.
- Navigation never competes with the primary action.

## 2.7 Reduced motion

When reduced motion is requested:

- replace spatial movement with immediate cut or short opacity change;
- remove spring, parallax, scale, and large translation;
- keep timing of control availability identical or faster;
- preserve state labels and focus movement;
- never remove content or context.

---

# 3. Timing System

## 3.1 Timing tokens

| Token | Duration | Purpose |
|---|---:|---|
| `instant` | `0–80ms` | Input acknowledgement and critical state |
| `micro` | `120ms` | Press, hover, focus |
| `control` | `180ms` | Selection, disclosure, small transition |
| `state` | `280ms` | State replacement |
| `spatial` | `420ms` | Machine movement within an environment |
| `room` | `560ms` | Transition between environments |
| `ritual` | `800ms` maximum | Optional activation or completion sequence |

No custom duration is allowed without a documented behavioral reason.

## 3.2 Response thresholds

| System response | Standard |
|---|---|
| Input acknowledgement | Within `100ms` |
| Visual loading treatment | After `400ms` |
| Waiting explanation | By `1000ms` |
| Long-wait reassurance | At `3000ms`, only if state is known |
| Recovery option | Immediately when failure is actionable |
| Cancellation | Always available during non-atomic waits |

## 3.3 Loading

Under `400ms`, avoid loading theater.

After `400ms`:

- preserve final geometry;
- name what is happening;
- keep available actions operable;
- show progress only when progress is measurable;
- never rotate motivational text to conceal latency.

## 3.4 Waiting

Waiting language reports known state:

- "Opening the Training Room..."
- "Reconnecting your session..."
- "Saving your reflection..."

Avoid:

- "Working magic..."
- "Thinking deeply..."
- fake percentages;
- random status messages;
- countdowns without certainty.

## 3.5 AI preparation

AI response preparation is not presented as human thought.

Behavior:

1. Acknowledge the member's turn immediately.
2. Use a quiet state label such as "Forge is preparing a response."
3. Preserve transcript and controls.
4. Offer pause or end where appropriate.
5. If delay exceeds `3000ms`, explain that the response is taking longer.

Do not simulate typing solely to anthropomorphize intelligence.

## 3.6 Recording and listening

- Recording acknowledgement: under `100ms`.
- Listening state remains steady, not rapidly pulsing.
- Silence tolerance: no interruption before the training modality's defined pause threshold.
- Voice activity can shape a restrained waveform only when a text label also confirms state.
- Stop control responds immediately.

## 3.7 Reflection

Reflection begins only after the completion state settles.

- Completion acknowledgement: `280ms`.
- Reflection invitation: after `400–800ms`, never before the member sees completion.
- No forced countdown.
- Skip is available immediately.

## 3.8 Completion

Completion behavior lasts no longer than `800ms`.

It:

- confirms what happened;
- honors the rep;
- releases visual tension;
- reveals the next optional action.

It does not:

- trigger confetti;
- count points;
- play a long fanfare;
- block reflection or exit.

## 3.9 Recovery

Recovery prioritizes function:

1. Freeze and preserve the last trusted state immediately.
2. Explain the interruption within `280ms`.
3. Offer recovery as soon as possible.
4. Confirm restored continuity within `280ms`.
5. Return to the exact meaningful point.

Polish follows restoration, never precedes it.

---

# 4. Interaction Hierarchy

## 4.1 Levels

| Level | Role | Behavioral emphasis |
|---|---|---|
| **Primary** | One next meaningful action | Strongest contrast, immediate response |
| **Secondary** | Redirection or supporting action | Quiet but discoverable |
| **Background** | Context that requires no action | Stable and non-animated |
| **System** | State and status communication | Precise, calm, persistent as needed |
| **Attention** | Time-sensitive but non-dangerous condition | Localized emphasis, no alarm |
| **Recovery** | Restore work, state, or connection | Prominent when needed; confidence-preserving |
| **Danger** | Destructive or irreversible action | Deliberate, explicit, isolated |

## 4.2 One obvious action

Every decision region has one primary action.

If two actions appear equally emphasized:

1. determine which better serves the environment purpose;
2. demote the other;
3. move optional exploration below the decision;
4. remove any action that does not support the current purpose.

## 4.3 Primary behavior

- Immediate acknowledgement.
- Strongest stable contrast.
- No idle animation.
- Clear verb.
- Preserves keyboard focus and assistive announcement.

## 4.4 Secondary behavior

Secondary actions preserve autonomy:

- Not today
- Pause
- Skip
- Choose another Machine
- Return to Coach

They remain available without competing visually.

## 4.5 Attention behavior

Attention is not danger.

Examples:

- upcoming conversation moved sooner;
- microphone permission needed;
- recommendation changed;
- session can be resumed.

Use one localized light, icon, or label. Do not shake, pulse repeatedly, or introduce urgency language without evidence.

## 4.6 Danger behavior

Danger is reserved for:

- permanent deletion;
- irreversible data removal;
- ending an active session when unsaved content would be lost.

Danger actions require plain consequence language and confirmation. Red is never used for ordinary decline, low activity, or incomplete training.

---

# 5. Machine Activation

## 5.1 Activation purpose

Machine activation marks a psychological transition from deciding to practicing.

The member should feel:

- committed;
- oriented;
- safe;
- ready to make an imperfect attempt.

## 5.2 Activation sequence

| Step | Behavior | Maximum duration |
|---:|---|---:|
| 1 | Selection receives immediate control feedback | `120ms` |
| 2 | Machine identity becomes dominant | `180ms` |
| 3 | Core light reaches ready state | `420ms` |
| 4 | Environment quiets around the Machine | `420ms` |
| 5 | Training intention remains visible | Persistent |
| 6 | Begin action becomes or remains available | As soon as system readiness is true |
| 7 | Activation advances Machine into Training Room | `560ms` |
| 8 | Focus moves to Training Room heading or control | At environment resolution |

Animation never determines availability. System readiness does.

## 5.3 Lighting

- Recommended: localized signature light.
- Selected: light sharpens and boundary resolves.
- Ready: stable core illumination.
- Active: narrow responsive light.
- Paused: light holds at lower intensity.

## 5.4 Movement

Machines move toward the member along one stable axis. They do not spin, orbit, bounce, or assemble from particles.

## 5.5 Sound

Optional activation sound:

- physical;
- low amplitude;
- under `450ms`;
- distinct by Machine family;
- never required for state understanding.

## 5.6 Typography and focus

During activation:

- Machine name remains visible.
- Training objective remains more prominent than technical specifications.
- Duration and intensity stay secondary.
- Focus moves predictably.
- No new choice appears during the transition.

## 5.7 Psychological transition

Activation copy uses commitment without pressure:

- "Begin Training"
- "Let's practice the interruption."
- "Start when you're ready."

Avoid:

- "Prove yourself"
- "Challenge accepted"
- "Don't break your streak"
- "Let's crush this"

---

# 6. Environmental Continuity

## 6.1 One facility

The member travels through one connected place:

```text
Coach
  -> Gym Floor (optional exploration)
  -> Training Room
  -> Reflection Room
  -> Progress Center (optional)
  -> Coach
```

The Coach remains the continuity anchor.

## 6.2 Transition anchors

Each transition preserves one shared object:

| From | To | Shared anchor |
|---|---|---|
| Coach | Gym Floor | Recommended Machine |
| Coach | Training Room | Machine + training intention |
| Gym Floor | Training Room | Selected Machine |
| Training Room | Reflection Room | Completed rep or spoken intention |
| Reflection Room | Progress Center | Key learning |
| Reflection Room | Coach | Next meaningful step |
| Progress Center | Coach | Current focus |

The shared anchor prevents the experience from feeling like disconnected pages.

## 6.3 Direction

- Deeper training moves forward.
- Reflection settles inward rather than forward.
- Return to Coach restores the original orientation.
- Back navigation returns to the previous meaningful state, not a blank screen.

Direction must remain comprehensible without motion through headings, focus, and preserved context.

## 6.4 Environment transitions

- Maximum `560ms`.
- One dominant movement.
- Preserve member input.
- Move keyboard focus when the new environment is ready.
- Announce the new environment to assistive technology.
- Reduced motion uses immediate state resolution.

## 6.5 Returning to Coach

After training or reflection, the Coach acknowledges continuity:

> "You practiced staying with your point. We can build on that next time."

It does not reset to a generic dashboard or demand another session.

---

# 7. Sound Language

## 7.1 Sound philosophy

Sound reinforces certainty. It never seeks attention.

Silence is the default and a first-class material.

## 7.2 Global rules

- No autoplaying ambient audio.
- No sound required to understand state.
- Respect mute, focus modes, reduced sensory preferences, and context.
- Never play sound for hover.
- Never layer more than one system sound.
- Voice coaching always has captions or transcript.
- Sound can be disabled globally and per session.

## 7.3 Sound vocabulary

| Event | Character | Duration | Default |
|---|---|---:|---|
| Selection | Quiet tactile tick | `80–120ms` | Off on web; platform-dependent |
| Confirmation | Soft mechanical resolve | `180–280ms` | Restrained |
| Machine ready | Signature material engagement | `250–350ms` | Optional |
| Training start | Low clean engagement | `350–450ms` | Optional |
| Recording start | Neutral single cue | Under `150ms` | On when useful |
| Recording stop | Lower neutral cue | Under `150ms` | On when useful |
| Thinking / preparing | Silence | `0ms` | Always |
| Encouragement | Voice or text, not a jingle | Contextual | No system sound |
| Completion | Warm release | `350–500ms` | Optional |
| Recovery restored | Quiet reconnection | `200–300ms` | Optional |
| Failure | Silence first | `0ms` | No alarm |
| Achievement | Evidence-specific acknowledgement | Under `500ms` | No fanfare |

## 7.4 Recording cues

Recording cues must be:

- distinguishable from calls and operating-system alarms;
- audible but private;
- paired with visible and announced state;
- configurable for environments where sound is inappropriate.

## 7.5 Failure sound

Failure does not use a negative buzzer.

If sound is useful, use one quiet neutral cue after the visual state appears. Repeated retries do not repeat the cue.

## 7.6 Machine sonic identity

Machine personality may influence material character:

- metal click;
- damped lock;
- calibrated slide;
- soft resonance;
- focused aperture.

Volume, duration, and semantic meaning remain consistent across Machines.

---

# 8. Haptic Language

## 8.1 Haptic philosophy

Haptics communicate certainty through touch. They do not reward compulsion.

## 8.2 Global rules

- Optional and platform-respecting.
- Never the only signal.
- No repeated vibration loops.
- No haptic on passive waiting.
- No haptic for routine progress exposure.
- No punishment haptic.
- Respect reduced sensory and device settings.

## 8.3 Haptic vocabulary

| Event | Pattern | Meaning |
|---|---|---|
| Selection | One light impact | Choice received |
| Confirmation | One light-to-medium impact | Action committed |
| Machine activation | One medium controlled impact | Equipment engaged |
| Training start | One medium impact | Session entered |
| Recording start | One light impact | Microphone active |
| Recording stop | One light impact | Microphone inactive |
| Reflection complete | One gentle success pattern | Thought preserved |
| Recovery restored | One light impact | Continuity returned |
| Decline | None | No punishment or emotional judgment |
| Mistake | None by default | Error communicated calmly |
| Achievement | Gentle success pattern only when evidence-backed | Meaningful milestone |

## 8.4 Cross-platform semantics

Use platform-native semantic haptics where available. Do not reproduce exact vibration waveforms across devices at the expense of accessibility or platform expectations.

---

# 9. Lighting Semantics

## 9.1 Lighting is state

Lighting directs attention and communicates readiness. It is not environmental decoration.

## 9.2 Semantic states

| State | Light behavior | Structural / text equivalent |
|---|---|---|
| Ready | Stable core at full working intensity | "Ready" |
| Unavailable | Core off; material remains visible | Reason + recovery action |
| Recommended | Localized signature light | "Recommended by Coach" |
| Selected | Boundary sharpens; core aligns | Selected state |
| Active | Narrow responsive light | "Active" or session state |
| Focused | Surrounding lights reduce | Focus heading |
| Listening | Stable low-amplitude response | "Forge is listening" |
| Thinking / preparing | Core holds; no fake progress pulse | "Forge is preparing a response" |
| Recording | Clear steady indicator | "Recording" + timer when appropriate |
| Paused | Light lowers and holds | "Paused" |
| Completed | Brief expansion, then warm rest | Completion statement |
| Recovered | Core returns to previous stable intensity | "Connected" / "Resumed" |
| Error | Local light lowers; no alarming flash | Error and recovery language |

## 9.3 Lighting hierarchy

1. Primary action or active Machine
2. Current system state
3. Supporting environment
4. Background

Only one dominant light source appears in a decision region.

## 9.4 Prohibited lighting

- Rapid pulse
- Flash
- Rainbow state cycling
- Continuous drift
- Neon edge outlining everywhere
- Red wash for ordinary errors
- Lighting that obscures text contrast
- Unexplained glow around AI content

---

# 10. Failure Language

## 10.1 Failure principle

> **The system owns the failure. The member keeps their confidence.**

Failure behavior must preserve:

- work;
- context;
- dignity;
- control;
- a clear path forward.

## 10.2 Failure sequence

1. Stop unsafe or uncertain behavior.
2. Preserve the last trusted state.
3. State what happened in plain language.
4. State what is safe.
5. Offer one primary recovery action.
6. Offer one quiet alternative when useful.
7. Return to the exact meaningful point.

## 10.3 Language pattern

Use:

> "We lost the connection. Your last response is safe."

> "Forge could not hear that clearly. Try again or continue by typing."

> "This Machine is unavailable right now. Your training plan has not changed."

Avoid:

- "You failed"
- "Invalid response"
- "Session failure"
- "Something went wrong" without explanation
- blame-oriented microphone language
- alarming technical codes in the primary message

Technical detail may appear in a secondary disclosure.

## 10.4 Visual behavior

- No shake.
- No full-screen red.
- No destructive sound.
- No lost content without explicit warning.
- Recovery action receives primary emphasis.
- Exit remains available.

## 10.5 Repeated failure

After two failed attempts:

- stop repeating the same instruction;
- offer a different modality;
- preserve the objective;
- reduce effort;
- allow the member to leave without penalty.

Example:

> "Voice is still unavailable. Continue this practice by typing, or return later."

## 10.6 Offline

When offline:

- retain cached plan and completed local work where safe;
- explain which features require connection;
- do not imply live coaching is available;
- queue supported actions transparently;
- never fabricate synchronization.

---

# 11. Emotional Rhythm

## 11.1 Session arc

| Phase | Member state | Behavioral objective | Interaction expression |
|---|---|---|---|
| Arrival | Uncertain or preoccupied | Recognition | Quiet greeting and one recommendation |
| Curiosity | Evaluating relevance | Trust | Explain why this training |
| Commitment | Choosing to begin | Agency | Immediate activation and visible exit |
| Challenge | Attempting imperfectly | Focus | Reduce chrome and preserve controls |
| Discomfort | Struggling or interrupted | Safety | Slow pacing; no evaluation theater |
| Recovery | Reorienting | Capability | Restore exact context and one next action |
| Completion | Effort released | Pride | Name evidence of what happened |
| Reflection | Making meaning | Growth | One optional prompt |
| Confidence | Seeing transfer | Readiness | Connect learning to real conversation |
| Departure | Returning to life | Calm momentum | Close cleanly; no retention pressure |

## 11.2 Emotional pacing rules

- Do not begin at maximum intensity.
- Do not celebrate before effort is understood.
- Do not interrupt discomfort merely to reassure.
- Do not make reflection compete with completion.
- Do not use excitement to conceal uncertainty.
- Let silence exist during thought.
- End with readiness, not a demand for another rep.

## 11.3 Challenge and support

Training may become demanding. Behavioral intensity can increase through:

- faster conversational turn-taking;
- firmer simulated pushback;
- less Coach intervention;
- more realistic interruptions;
- narrower response time when the exercise requires it.

Intensity never increases through:

- visual alarm;
- louder sound;
- punitive language;
- lost progress;
- identity judgment.

## 11.4 Emotional measurement

Designer intent is not evidence.

Emotional outcomes require member research:

- Did the member feel safer to try?
- Did the system feel calm or slow?
- Did recovery restore confidence?
- Did celebration feel earned?
- Did the member leave more prepared?

Do not infer success from completion rate or time in product.

---

# 12. Machine Personality Profiles

## 12.1 Shared inheritance

All Machines inherit:

- immediate acknowledgement;
- consistent primary and secondary action placement;
- common system state labels;
- common recovery semantics;
- accessibility parity;
- restrained sound and haptics;
- stable rest;
- no gamification.

Personality changes expression, not meaning.

## 12.2 Executive Machine

| Dimension | Profile |
|---|---|
| Movement | Controlled vertical advance; exact settle |
| Lighting | Narrow white-violet central line |
| Material | Dark titanium with warm precision edges |
| Voice | Concise, composed, direct |
| Pacing | Deliberate; short pauses before challenge |
| Emotional objective | Calm authority |
| Interaction | Removes options during the rep; restores them at pause |
| Sound | Low mechanical engagement, clean resolve |
| Haptics | Single medium activation; light confirmation |

Behavioral signature: it never rushes, wobbles, or over-explains.

## 12.3 Conflict Machine

| Dimension | Profile |
|---|---|
| Movement | Opposing forms establish tension, then release |
| Lighting | Low restrained crimson core; never full red wash |
| Material | Blackened steel around a protected center gap |
| Voice | Honest, firm, non-aggressive |
| Pacing | Realistic tension with clear recovery pauses |
| Emotional objective | Courage without escalation |
| Interaction | Pushback remains behavior-specific; pause always available |
| Sound | Damped tension and release |
| Haptics | Medium activation; no haptic for disagreement |

Behavioral signature: tension is visible, but the member is never made unsafe.

## 12.4 Negotiation Machine

| Dimension | Profile |
|---|---|
| Movement | Calibrated alignment around a stable axis |
| Lighting | Gold markers align as choices become clear |
| Material | Graphite and machined brass |
| Voice | Strategic, measured, curious |
| Pacing | Allows thought; accelerates only for live-pressure exercises |
| Emotional objective | Strategic confidence |
| Interaction | Makes trade-offs visible without scoring the person |
| Sound | Quiet calibrated slide and lock |
| Haptics | Light selection; medium agreement confirmation |

Behavioral signature: every move feels considered, never adversarial.

## 12.5 Empathy Machine

| Dimension | Profile |
|---|---|
| Movement | Paired forms converge without collapsing |
| Lighting | Soft mineral-green shared center |
| Material | Frosted mineral glass and warm aluminum |
| Voice | Patient, attentive, plain |
| Pacing | Longest silence tolerance; no premature prompting |
| Emotional objective | Presence and understanding |
| Interaction | Reflection precedes response suggestions |
| Sound | Soft resonance; silence preferred |
| Haptics | Light confirmation only |

Behavioral signature: it makes room rather than filling silence.

## 12.6 Phone Machine

| Dimension | Profile |
|---|---|
| Movement | Compact aperture closes distractions around the call |
| Lighting | Small steady warm-white call indicator |
| Material | Satin ceramic and dark aluminum |
| Voice | Natural, concise, conversational |
| Pacing | Real-time turn-taking with clear connection states |
| Emotional objective | Composure without visual reassurance |
| Interaction | Audio state is always mirrored visually and textually |
| Sound | Familiar but non-OS call cues |
| Haptics | Light connect and disconnect confirmation |

Behavioral signature: confidence persists when the screen is not being watched.

## 12.7 Boundary Machine

| Dimension | Profile |
|---|---|
| Movement | Perimeter resolves around a stable center |
| Lighting | Amber boundary locks into place |
| Material | Brushed bronze and dark stone |
| Voice | Calm, unambiguous, respectful |
| Pacing | Gives space before commitment; does not soften the boundary afterward |
| Emotional objective | Firmness without guilt |
| Interaction | Shows alternatives without reopening the member's stated limit |
| Sound | Damped lock |
| Haptics | Medium confirmation when boundary is committed |

Behavioral signature: the center remains stable while pressure moves around it.

## 12.8 Interruption Machine

| Dimension | Profile |
|---|---|
| Movement | Intentional disruption followed by rapid re-alignment |
| Lighting | Core briefly divides, then restores the main line |
| Material | Segmented titanium with visible continuity spine |
| Voice | Realistic interruption, calm recovery coaching |
| Pacing | Sudden challenge followed by protected recovery window |
| Emotional objective | Recovery confidence |
| Interaction | Preserves last complete thought and offers a return cue |
| Sound | Brief cut, then clean reconnection |
| Haptics | No haptic on interruption; light confirmation on recovery |

Behavioral signature: disruption never destroys continuity.

## 12.9 Future Machine requirements

Every future Machine must document:

1. Training objective
2. Emotional objective
3. Distinct silhouette
4. Movement signature
5. Lighting signature
6. Material language
7. Voice and pacing
8. Interaction behavior
9. Optional sound and haptics
10. Reduced-motion, silent, monochrome, keyboard, and screen-reader equivalents
11. Failure and recovery behavior
12. Evidence that personality improves comprehension rather than novelty

---

# 13. Accessibility

## 13.1 Behavioral equivalence

Every interaction must remain fully understandable without:

- color;
- motion;
- sound;
- haptics;
- visual Machine detail.

## 13.2 Required equivalents

| Behavioral channel | Required equivalent |
|---|---|
| Motion | State label, focus movement, or structural change |
| Lighting | Text and icon state |
| Sound | Visible and announced confirmation |
| Haptic | Visible and announced confirmation |
| Color | Text, shape, icon, or pattern |
| Spatial transition | Environment heading and focus |
| Voice | Transcript and typed alternative |

## 13.3 WCAG floor

TalkForge targets WCAG 2.2 AA as a minimum.

Behavior requirements:

- full keyboard operation;
- visible focus;
- logical focus order;
- `44 x 44px` minimum targets;
- no flashing;
- reduced-motion parity;
- no essential timed action without extension;
- pause, stop, and skip controls;
- status changes announced appropriately;
- errors described in text;
- zoom and reflow without loss of action;
- captions, transcripts, and typed alternatives.

## 13.4 Live regions

Use live announcements only for state that matters:

- recording started or stopped;
- connection lost or restored;
- Machine ready;
- recommendation changed;
- reflection saved.

Do not announce decorative movement, light, or every transcript token.

## 13.5 Focus behavior

- Focus never moves unexpectedly on passive updates.
- Environment transitions move focus to the environment heading or primary control.
- Recovery restores focus to the interrupted action.
- Modal behavior traps focus only while the modal is necessary.
- Escape and close behavior remain predictable.

## 13.6 Sensory safety

- No rapid pulsing.
- No sudden loud sound.
- No repeated error vibration.
- No essential spatial audio.
- No animation that implies urgency without evidence.
- Member settings override Machine personality.

---

# 14. Anti-Manipulation Rules

## 14.1 Prohibited behavior

TalkForge prohibits:

- infinite animations;
- attention hijacking;
- false urgency;
- variable reward loops;
- artificial scarcity;
- manipulative notifications;
- dark patterns;
- streak-loss pressure;
- disguised advertisements;
- autoplay designed to prevent exit;
- guilt after decline;
- celebration disproportionate to evidence;
- fabricated AI thinking behavior;
- fake progress;
- hidden cancellation;
- interface movement intended to increase time in product.

## 14.2 Notification standard

A notification must:

1. relate to a member-declared conversation, commitment, or preference;
2. arrive at an appropriate time;
3. state why it was sent;
4. offer direct control;
5. stop after decline or dismissal patterns indicate it is not helpful.

Notifications may support preparation. They may not manufacture habit anxiety.

## 14.3 Recommendation autonomy

The Coach recommends one action, but the member can:

- decline;
- choose something lighter;
- choose a different conversation;
- return later;
- explore the Gym;
- turn off a data source;
- correct the evidence.

Strong guidance without redirection is coercion.

## 14.4 Emotional integrity

Do not:

- infer fear from hesitation alone;
- use emotional language unsupported by evidence;
- celebrate identity transformation after one session;
- present confidence scores as truth;
- exploit vulnerability to increase retention;
- confuse intensity with effectiveness.

## 14.5 Silence and departure

The product may allow a member to leave quietly.

No exit intercept appears after ordinary completion, decline, or cancellation unless unsaved work would be lost.

---

# 15. Certification Gate

Every interaction must answer **yes** before implementation:

1. Does this interaction reduce cognitive load?
2. Does it strengthen trust rather than demand attention?
3. Does it increase confidence before a real conversation?
4. Is the purpose immediately understandable?
5. Would a first-time member know what to do within three seconds?
6. Is motion communicating meaning rather than decoration?
7. Does this preserve TalkForge's Communication Gym identity?
8. Can this interaction be understood without color, motion, sound, or haptics?
9. Would this interaction still feel premium ten years from now?
10. Does it help the member become more prepared for a real conversation?

## 15.1 Required evidence package

Before implementation, an interaction specification includes:

- environment purpose;
- emotional objective;
- primary action;
- state diagram;
- timing tokens;
- motion rationale;
- sound and haptic rationale, if used;
- lighting semantics, if used;
- keyboard and screen-reader behavior;
- reduced-motion behavior;
- loading, failure, recovery, decline, and completion behavior;
- anti-manipulation review;
- cognitive-load analysis;
- engineering feasibility review;
- testable acceptance criteria.

## 15.2 Cross-functional approval

| Authority | Reviews |
|---|---|
| Chief Interaction Architect | Behavioral consistency and purpose |
| Chief Experience Architect | Complete member experience |
| Atlas | Governance, mission, and constitutional consistency |
| Engineering Lead | Feasibility, reliability, performance, and platform behavior |
| Founder | Final production approval |

## 15.3 Automatic failure conditions

An interaction fails certification if it:

- delays a ready action for animation;
- invents progress;
- loses member work without warning;
- depends on one sensory channel;
- punishes decline;
- competes with the primary action;
- exposes internal architecture instead of human purpose;
- increases activity without increasing preparedness;
- cannot explain its own behavior;
- violates an active architecture, security, or release gate.

---

## Non-negotiable constraints

- Preserve all existing governance, architecture, security, and constitutional decisions.
- Do not redesign the information architecture established by CXA-001.
- Do not introduce conflicting gamification or engagement mechanics.
- Favor clarity over spectacle.
- Favor confidence over excitement.
- Favor preparation over entertainment.
- Favor long-term trust over short-term engagement.

---

## Founder principle

> **People may forget the interface they saw, but they should remember how TalkForge prepared them to face a real conversation. Every interaction exists to transform hesitation into readiness.**

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-04 | Initial proposed Machine Behavior Language for Founder review |
