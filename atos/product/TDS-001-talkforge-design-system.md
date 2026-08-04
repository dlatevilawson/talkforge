# TDS-001 — TalkForge Design System v1.0

| Field | Value |
|---|---|
| **Document ID** | TDS-001 |
| **Title** | TalkForge Design System |
| **Version** | 1.0.0 |
| **Status** | **Proposed — Founder Review · UI implementation frozen** |
| **Owner** | Chief Experience Architect |
| **Final approver** | Founder |
| **Governance steward** | Atlas |
| **Feasibility owner** | Engineering Lead |
| **Plane** | Working Knowledge |
| **Captured in** | IV-UX-006 |
| **Blind spot review** | BS-008 |
| **Related** | CXA-001 · DES-001 · CRAFT-LAW-001 · AMD-001 · SYS2-001 · PCI-001 · BID-018 · BUILD-UX-001 |
| **Date** | 2026-08-04 |

---

## Status and authority

This document is the proposed visual and interaction counterpart to TalkForge’s governing product doctrine. It defines how the Communication Gym should feel, but it remains subordinate to the Constitution, CXA-001, Human Dignity Standard, Forge Laws, System 1, and System 2.

Version 1.0 is a reviewable experience specification. It does not:

- amend CXA-001;
- authorize Phase 8 feature implementation;
- lift the current architecture certification NO-GO;
- validate progress metrics;
- approve future Machines.

Implementation remains frozen until Founder review, governance review, engineering feasibility review, and the applicable architecture gates are resolved.

---

# 1. Design philosophy

## 1.1 The product is a place

Members do not open software. They enter a Communication Gym.

Every surface is an environment with one purpose:

| Environment | Purpose | Intended feeling |
|---|---|---|
| Entrance | Inspire | Hope |
| Coach | Recommend | Understood and confident |
| Gym Floor | Explore | Curious and autonomous |
| Training Room | Practice | Focused and safe |
| Reflection Room | Make meaning | Proud and thoughtful |
| Progress Center | Understand growth | Capable |
| Profile | Confirm understanding | Recognized and in control |
| Settings | Manage the experience | Secure |

Environment language must clarify the member’s mental model. It must never become decorative architecture, forced wayfinding, or literal skeuomorphism.

## 1.2 One purpose per environment

Do not mix purposes to fill space:

- The Coach does not become a catalog.
- The Gym Floor does not prescribe identity.
- Training does not become analytics.
- Reflection does not become scoring.
- Progress does not become competition.
- Settings does not become onboarding.

## 1.3 Beauty serves understanding

Admitted CXA Principle 001 remains binding:

> Beauty exists to reduce cognitive load, increase confidence, and make practice feel natural.

### Proposed CXA amendment — Beauty Has a Job

Every beautiful element must reduce uncertainty:

- Lighting tells the member where to look.
- Spacing tells the member what matters.
- Motion tells the member what changed.
- Typography tells the member what deserves attention.
- Color tells the member about state or identity.
- Material tells the member which Machine they are using.

If removing a visual element leaves the experience equally understandable, the element probably did not earn its place.

This amendment remains proposed until explicit Founder admission.

## 1.4 The deletion test

Before adding an element, ask:

1. What uncertainty does it remove?
2. What action does it clarify?
3. What emotional state does it support?
4. Does its meaning survive without color, motion, or sound?
5. Can it be removed without reducing comprehension?

If the answers are weak, remove it.

---

# 2. Experience principles

## 2.1 Three-second clarity

Every primary environment must communicate within three seconds:

1. Why am I here?
2. What should I do?
3. Can I begin immediately?

For the Coach Homepage:

1. What am I preparing for?
2. Why this recommendation?
3. Can I start immediately?

## 2.2 One primary action

Each environment has one dominant action. Secondary actions must be visually quieter and preserve autonomy without competing.

| Environment | Primary action | Secondary autonomy |
|---|---|---|
| Coach | Begin Training | Not today |
| Gym Floor | Select a Machine | Return to Coach |
| Training Room | Continue the rep | Pause or end |
| Reflection Room | Capture what changed | Skip |
| Progress Center | Review one meaningful pattern | Change time range |

## 2.3 Progressive revelation

Show only what the member needs for the next good decision.

- Evidence appears near a recommendation, with detail available on request.
- Advanced settings appear only in context.
- Progress detail follows a meaningful summary.
- Machine specifications expand after selection.
- Coach redirection appears after “Not today,” not before.

## 2.4 Evidence before confidence theater

Recommendations explain their basis in plain language:

- “Your leadership meeting is tomorrow.”
- “You asked to keep practicing interruptions.”
- “You chose calm authority as your current focus.”

Do not imply calendar, memory, history, or identity evidence that the system does not possess.

## 2.5 Intentions, not promises

Use:

- “This session is designed to help you practice recovering after interruptions.”
- “This exercise develops concise executive communication.”

Avoid guaranteed transformation, diagnosis, and unsupported identity claims.

---

# 3. Spatial system

## 3.1 Base unit

The system uses a `4px` base. Most layout distances use multiples of `8px`; `4px` exists for optical adjustment and compact internal alignment.

## 3.2 Spacing scale

| Token | Value | Primary use |
|---|---:|---|
| `space-0` | `0` | Reset |
| `space-1` | `4px` | Optical adjustment |
| `space-2` | `8px` | Tight internal relationship |
| `space-3` | `12px` | Compact control groups |
| `space-4` | `16px` | Standard internal spacing |
| `space-5` | `20px` | Mobile page inset |
| `space-6` | `24px` | Component sections |
| `space-8` | `32px` | Related groups |
| `space-10` | `40px` | Major component separation |
| `space-12` | `48px` | Mobile section separation |
| `space-16` | `64px` | Desktop section separation |
| `space-20` | `80px` | Environmental breathing room |
| `space-24` | `96px` | Hero separation |
| `space-32` | `128px` | Large spatial transition |

Do not introduce intermediate values without an optical reason recorded in the component specification.

## 3.3 Responsive grid

| Viewport | Columns | Outer margin | Gutter | Content behavior |
|---|---:|---:|---:|---|
| `320–599px` | 4 | `20px` | `16px` | One-column primary flow |
| `600–899px` | 8 | `32px` | `20px` | One dominant region; supporting split permitted |
| `900–1199px` | 12 | `48px` | `24px` | Asymmetric composition |
| `1200px+` | 12 | `max(64px, auto)` | `32px` | `1200px` primary content maximum |

Immersive Training Room content may use the full viewport, but spoken content remains within a readable measure.

## 3.4 Readable measure

- Primary statement: `16–28` characters per line when possible.
- Body copy: `45–68` characters per line.
- Explanatory copy: maximum `640px`.
- Coach recommendation: maximum `18` words before supporting detail.

## 3.5 Shape system

| Token | Value | Use |
|---|---:|---|
| `radius-sm` | `8px` | Compact indicators |
| `radius-md` | `12px` | Controls and disclosures |
| `radius-lg` | `20px` | Secondary surfaces |
| `radius-xl` | `28px` | Environmental stages |
| `radius-round` | `999px` | Single-action buttons and physical apertures |

Rounded shapes communicate approachability. Structural regions must not become “pill soup.” Text inputs use `radius-md`; primary action buttons may use `radius-round`.

---

# 4. Typography

## 4.1 Typeface roles

| Role | Typeface | Use |
|---|---|---|
| **Interface and Coach** | Manrope | Navigation, recommendations, controls, training |
| **Human reflection** | Fraunces | Entrance statements, reflection peaks, rare emotional moments |
| **Technical data** | Geist Mono | Time, calibrated Machine data, diagnostics only |
| **Fallback** | `ui-sans-serif, system-ui, sans-serif` | Resilience |

Manrope and Fraunces are already shipped on public TalkForge surfaces. Geist remains an implementation fallback until typography convergence is approved.

Fraunces must never appear inside dense controls, metrics, or long instructional copy.

## 4.2 Type scale

| Token | Mobile | Desktop | Weight | Use |
|---|---|---|---:|---|
| `display` | `44/48` | `72/76` | 500–600 | Rare signature statement |
| `heading-1` | `36/40` | `52/56` | 600 | Environment purpose |
| `heading-2` | `30/36` | `40/46` | 600 | Major section |
| `heading-3` | `24/30` | `28/34` | 600 | Component title |
| `body-lg` | `18/28` | `20/30` | 400–500 | Coach recommendation |
| `body` | `16/26` | `16/26` | 400 | Standard copy |
| `body-sm` | `14/20` | `14/20` | 400–500 | Supporting detail |
| `caption` | `12/16` | `12/16` | 500 | Metadata |

Values are `font-size/line-height` in pixels.

## 4.3 Typography rules

- Sentence case by default.
- Use size before color.
- Use weight before decoration.
- Maximum three weights in one environment.
- Avoid weight `700+` except for accessibility-required emphasis in small rendered contexts.
- Uppercase is reserved for Machine plates and brief environmental labels.
- Uppercase tracking: `0.12em–0.18em`; never use wide tracking for paragraphs.
- Do not center paragraphs longer than three lines.
- Use tabular numerals for duration and validated progress data.

---

# 5. Color system

## 5.1 Status of color values

Founder gold and landing ink values are already authoritative through BID-018. Other v1.0 values are proposed semantic tokens pending contrast verification and Founder approval.

## 5.2 Brand constants

| Token | Value | Use |
|---|---|---|
| `gold-light` | `#F7E3B0` | Focus, illuminated highlight |
| `gold` | `#C99B4A` | Official mark, controlled brand action |
| `gold-deep` | `#B98634` | Depth and pressed state |
| `gold-muted` | `#8A6A2F` | Decorative material only after contrast review |
| `ink` | `#121417` | Official wordmark and light-surface primary text |

The official mark’s gradient and geometry must not be recolored or reconstructed ad hoc.

## 5.3 Gym neutrals

| Token | Value | Use |
|---|---|---|
| `void` | `#050505` | Primary Gym background |
| `obsidian` | `#0B0C0F` | Immersive background |
| `graphite` | `#121417` | Elevated structural surface |
| `iron` | `#1A1D22` | Raised control surface |
| `steel` | `#252A31` | Selected or interactive surface |
| `text-primary` | `#F4F4F5` | Primary text |
| `text-secondary` | `#C5C7CB` | Supporting text |
| `text-muted` | `#9A9DA3` | Metadata after contrast verification |
| `line-subtle` | `rgba(244,244,245,0.10)` | Quiet division |
| `line-strong` | `rgba(244,244,245,0.18)` | Interactive boundary |

Dark surfaces must feel warm and intimate, never blue-black or gothic.

## 5.4 Entrance neutrals

The deployed public system remains:

| Token | Value |
|---|---|
| `entrance-bg` | `#F7F8FA` |
| `entrance-ink` | `#121417` |
| `entrance-ink-soft` | `#2A3038` |
| `entrance-muted` | `#5A616C` |
| `entrance-line` | `#E6E8EC` |

Entrance and Gym are two atmospheres in one system: morning invitation and focused training.

## 5.5 Semantic states

| State | Proposed color | Required companion |
|---|---|---|
| Ready / focus | `gold-light` | “Ready” text and illuminated aperture |
| Success / growth | `#82B89A` | Check or completed label |
| Caution / recovery | `#D9A86C` | Plain-language recovery instruction |
| Error | `#D98B87` | Error label and recovery action |
| Offline | `#A4A7AD` | Offline label and persistent cached content |

State is never communicated by color alone.

## 5.6 Machine color

Each Machine owns one restrained accent. Only the active Machine accent may dominate an environment.

Machine color:

- identifies equipment;
- highlights active state;
- never recolors general navigation;
- never replaces semantic success, warning, or error;
- must pass light and dark contrast testing;
- must have shape, label, and material equivalents.

Default SaaS blue is not a universal TalkForge trust color. The existing blue presence language remains provisional until Founder review.

---

# 6. Machine identity language

## 6.1 Machines are equipment

A Machine is not a card, course thumbnail, mascot, or feature icon. It is a recognizable training instrument with a consistent physical grammar.

Every Machine requires:

1. A unique silhouette
2. A functional aperture or core
3. A primary material
4. A signature light
5. A signature activation motion
6. An optional signature sound
7. A behavioral personality
8. A monochrome identity
9. A reduced-motion state
10. A short training promise

## 6.2 Shared physical grammar

All Machines belong to one manufactured family:

- precision-machined geometry;
- warm metal or mineral materials;
- visible joints that imply purpose;
- one illuminated core;
- restrained surface detail;
- no floating holographic dashboards;
- no robots, brains, sparkles, microphones, or generic sound waves;
- no excessive glassmorphism.

Machines should feel engineered, maintained, and ready for use.

## 6.3 Recognition hierarchy

A Machine must remain recognizable in this order:

1. Silhouette
2. Structural geometry
3. Material
4. Light placement
5. Motion
6. Color
7. Label
8. Sound

Color and label cannot rescue an indistinct object.

## 6.4 Initial identity territories

These are design territories, not final Machine approvals:

| Machine | Silhouette | Material | Light behavior | Personality |
|---|---|---|---|---|
| Executive | Upright central spine with narrow aperture | Dark titanium | Controlled vertical white-violet line | Composed and exact |
| Conflict | Two opposing plates with protected center gap | Blackened steel | Low crimson tension, soft release | Direct without aggression |
| Boundary | Clear perimeter surrounding a stable core | Brushed bronze | Amber perimeter locks into place | Calm and firm |
| Empathy | Paired arcs facing a shared center | Frosted glass and warm aluminum | Soft mineral-green convergence | Patient and attentive |
| Negotiation | Balanced opposing arms around an axis | Graphite and machined brass | Gold calibration marks align | Strategic and measured |
| Interview | Focused aperture held by an open frame | Anodized aluminum | Blue-grey aperture sharpens | Alert and prepared |

Phase 8.2 must develop and test every approved Machine using this grammar.

## 6.5 Machine plate

Every Machine plate uses the same information order:

1. Machine name
2. What it trains
3. Intended audience or situation
4. Estimated duration
5. Intensity
6. Readiness state

Difficulty must describe exercise demand, not member ability.

---

# 7. Lighting system

Lighting is functional wayfinding.

| Lighting state | Meaning | Behavior |
|---|---|---|
| Ambient | Environment available | Very low, stable warmth |
| Recommended | Coach selected this Machine | Localized signature light |
| Ready | Training can begin | Core reaches stable intensity |
| Active | Session in progress | Narrow, responsive illumination |
| Paused | Member remains in control | Light holds; no alarming pulse |
| Recovery | Reconnection or interruption | Warm low-frequency breathing |
| Complete | Rep finished | Brief expansion, then calm |

Rules:

- Never flash.
- Never use more than one dominant light source.
- Avoid high-frequency pulsing.
- Lighting must not delay controls.
- Reduced-motion mode uses static intensity changes.
- Every lighting state has visible text or structural confirmation.

---

# 8. Motion system

## 8.1 Motion jobs

Motion may communicate:

- spatial movement;
- state change;
- cause and effect;
- completion;
- recovery;
- focus.

Motion may not exist solely to make the interface feel active.

## 8.2 Duration tokens

| Token | Duration | Use |
|---|---:|---|
| `motion-none` | `0ms` | Reduced motion and immediate state |
| `motion-micro` | `120ms` | Press, hover, focus |
| `motion-control` | `180ms` | Disclosure and selection |
| `motion-state` | `280ms` | State replacement |
| `motion-spatial` | `420ms` | Machine movement within a room |
| `motion-room` | `560ms` | Environment transition |
| `motion-ritual` | `800ms` maximum | Optional power-on or completion ritual |

No interaction waits for a ritual animation. The control becomes operable as soon as the system is ready.

## 8.3 Easing

| Token | Curve | Meaning |
|---|---|---|
| `ease-enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | Calm arrival |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Clear departure |
| `ease-move` | `cubic-bezier(0.65, 0, 0.35, 1)` | Spatial continuity |
| `ease-physical` | Critically damped spring | Machine-only physical response |

## 8.4 Coach-to-training sequence

1. Recommendation is immediately readable.
2. Machine powers on without blocking input.
3. Begin Training is available as soon as readiness is true.
4. Activation moves the Machine toward the foreground.
5. The Coach environment recedes.
6. The Training Room resolves around the same Machine.
7. On completion, the Reflection Room becomes available—not compulsory.

Spatial continuity communicates one journey, not a series of unrelated pages.

## 8.5 Reduced motion

With `prefers-reduced-motion`:

- remove parallax, spring, scale, and large translation;
- replace room movement with immediate crossfade or cut;
- preserve focus order and state announcements;
- keep controls available at the same time;
- never remove information.

---

# 9. Sound and haptics

## 9.1 Sound principles

Sound is optional confirmation, not atmosphere by default.

- No autoplaying homepage audio.
- No ambient loop required for identity.
- No spoken instruction without captions or transcript.
- Respect device mute and member preference.
- Never use sound as the only confirmation.
- Machine sounds must feel physical and restrained, not cinematic or gamified.

Initial sonic vocabulary:

| Event | Character | Maximum duration |
|---|---|---:|
| Machine ready | Soft mechanical resolve | `350ms` |
| Training begins | Low, clean engagement | `450ms` |
| Rep complete | Warm upward release | `500ms` |
| Recovery restored | Quiet reconnection | `300ms` |

Errors use calm language before alarm sound. Repeated failure sounds are prohibited.

## 9.2 Haptic principles

Haptics are opt-in enhancements on supported devices:

| Event | Haptic |
|---|---|
| Selection | Light impact |
| Begin Training | Medium, single impact |
| Pause / resume | Light confirmation |
| Completion | Gentle success pattern |
| Error | No repeated buzz; one restrained notification only when useful |

Haptics never convey unique information and must respect platform accessibility settings.

---

# 10. Iconography

## 10.1 System icons

System icons are quiet tools, not brand expression:

- `1.75px` optical stroke at `24px`;
- round joins with controlled terminals;
- simple geometry;
- no filled icon unless selected or critical;
- minimum `20px` rendered size;
- always paired with accessible text when meaning is not universal.

## 10.2 Machine glyphs

Machine glyphs derive from the Machine silhouette. They are not stock category symbols.

Each must work:

- at `16px` in navigation;
- at `24px` in controls;
- at `48px` on a Machine plate;
- in monochrome;
- in embossed or etched material.

Avoid chat bubbles, microphones, brains, sparkle clusters, trophies, coins, flames, and generic people icons.

---

# 11. Component architecture

## 11.1 Primitive components

| Component | Responsibility |
|---|---|
| `RoomShell` | Environment background, safe area, focus destination |
| `SpatialContainer` | Responsive grid and readable measure |
| `Stack` / `Cluster` | Tokenized spacing without arbitrary margins |
| `Text` | Semantic type roles |
| `Button` | Primary, secondary, quiet, destructive variants |
| `IconButton` | Accessible compact action |
| `Field` | Label, input, help, error |
| `Disclosure` | Progressive detail |
| `Status` | Text, icon, and optional color state |
| `Divider` | Rare structural separation |

## 11.2 Experience components

| Component | Responsibility |
|---|---|
| `CoachGreeting` | Human recognition without chat simulation |
| `RecommendationStage` | One mission, evidence, purpose, action |
| `MachineArtifact` | Recognizable equipment object |
| `MachinePlate` | Training purpose, duration, intensity, readiness |
| `EvidenceLine` | Explain why now with provenance |
| `TrainingIntent` | Intended outcome without guarantee |
| `BeginTrainingAction` | Sole dominant Coach action |
| `NotTodayAction` | Dignified redirection |
| `CurrentFocus` | Evidence-backed continuity |
| `ProgressSignal` | Validated pattern with provenance and limitations |
| `MachineRail` | Maximum two or three secondary Machines |
| `RoomTransition` | Preserves object and focus continuity |
| `ReflectionPrompt` | One skippable meaning-making invitation |
| `RecoveryState` | Reconnection and resume |

## 11.3 Component rules

- A component exists to encode repeated meaning, not merely repeated styling.
- No generic `Card` grid as product architecture.
- Avoid nesting bordered surfaces.
- One primary button per decision region.
- Components expose semantic state, not raw color props.
- Every interactive component includes hover, focus, active, disabled, loading, error, and reduced-motion behavior where applicable.
- Shared components must remain replaceable when a clearer contextual pattern emerges.

---

# 12. Interaction patterns

## 12.1 Primary action

- Verb first.
- Describe the member’s next action.
- Minimum target `44×44px`.
- Remains stable while supporting content loads.
- Loading text names what is happening: “Opening the Training Room…”
- Disabled state must explain why when the reason is not obvious.

## 12.2 “Not today”

“Not today” is never failure. It opens:

1. Something lighter
2. A different conversation
3. Later today

The Coach adapts without guilt, streak loss, red warning, or retention pressure.

## 12.3 Recommendation evidence

Evidence appears in a single plain-language line. Detailed provenance is disclosed on request.

Never expose internal architecture terms such as:

- readiness ranking;
- Living Profile gate;
- model confidence;
- candidate count;
- recommendation engine.

## 12.4 Voice controls

- Listening, thinking, speaking, interrupted, reconnecting, and paused are explicit states.
- The member can pause or end at any time.
- Transcript and typed interaction remain available.
- Silence is not immediately treated as failure.
- Interruption recovery preserves the member’s last complete thought.

---

# 13. State design

Every state has a functional job and emotional objective.

| State | Member should feel | Required behavior |
|---|---|---|
| Loading | Expected | Preserve geometry; name what is preparing |
| Empty | Guided | One honest next action; no fake content |
| Offline | Secure | Keep cached context; explain what remains available |
| Interrupted | Held | Preserve work and offer immediate resume |
| Reconnecting | Calm | Show progress without alarming pulse |
| Completed | Proud | Acknowledge the rep; invite reflection |
| Cancelled | In control | Confirm exit without shame |
| Declined | Respected | Ask what would help instead |
| Error | Supported | Own the failure; provide recovery |
| Recovered | Relieved | Return to the exact meaningful point |

## 13.1 Loading

- Under `400ms`, avoid unnecessary loading theater.
- Beyond `400ms`, show stable structure and specific status.
- Never display fake progress percentages.
- Do not rotate motivational messages to disguise latency.

## 13.2 Empty

Empty states never blame incomplete setup. Replace “Complete your profile” with the human purpose:

> “What conversation are you preparing for?”

## 13.3 Error language

Use:

> “We lost the connection. Your last response is safe.”

Avoid:

> “Session failure. Error 503.”

Technical detail may be available in a secondary disclosure.

## 13.4 Completion

Completion celebrates courage and preparedness, not points:

> “You stayed with the interruption and finished your thought.”

Reflection remains optional.

---

# 14. Progress presentation

## 14.1 What progress means

Progress represents preparedness for real conversations, not time spent inside TalkForge.

Potential concepts:

- current training focus;
- conversation confidence;
- recovery behavior;
- transfer to real life;
- training rhythm;
- consistency of meaningful practice.

## 14.2 Quantification gate

Do not display:

- “Preparedness: 82%”
- “41% faster than last week”
- readiness scores;
- reflection quality;
- skill balance;
- comparative growth;

until each measure has:

1. An operational definition
2. A valid evidence source
3. A minimum sample requirement
4. Uncertainty and limitation rules
5. Provenance visible to the member
6. A dignity and bias review
7. An explanation of how it supports action

Without these, use qualitative, evidence-bound language:

> “In your last two interruption practices, you returned to your main point without Coach prompting.”

## 14.3 Prohibited mechanics

- XP
- Coins
- Levels
- Daily streak pressure
- Leaderboards
- Loss aversion
- Artificial scarcity
- Punitive red states

Training Rhythm may summarize continuity only when it avoids guilt and does not optimize activity for its own sake.

---

# 15. Accessibility standard

TalkForge targets WCAG 2.2 AA as a floor.

## 15.1 Perception

- Text contrast: at least `4.5:1`.
- Large text and essential non-text contrast: at least `3:1`.
- State survives without color.
- Machine identity survives without color, sound, animation, or texture.
- Captions and transcripts accompany voice.
- Decorative Machine imagery is hidden from assistive technology when its meaning is already expressed.

## 15.2 Operation

- Complete keyboard navigation.
- Logical focus order follows visual hierarchy.
- Focus ring is always visible and uses a semantic token.
- Minimum target size `44×44px`.
- No keyboard trap.
- Pause, stop, and skip remain available.
- Room transitions move focus to the new environment heading.

## 15.3 Understanding

- Plain language.
- Consistent control placement.
- Errors identify the issue and recovery.
- No unexplained internal system language.
- No action depends on remembering a previous screen.
- Time estimates are honest and non-binding.

## 15.4 Motion and audio

- Respect reduced-motion and platform audio preferences.
- No flashing content.
- No essential timed animation.
- No audio-only confirmation.
- No haptic-only confirmation.

## 15.5 Zoom and adaptation

- Support `200%` text zoom without loss of function.
- Support `400%` browser zoom in a single-column reflow where required.
- Honor safe areas and dynamic text.
- Do not truncate the recommendation’s essential meaning.

---

# 16. Mobile patterns

Mobile should feel like carrying a private communication coach.

## 16.1 Rules

- One-column primary flow.
- Page inset `20px`.
- Primary action is thumb reachable.
- Sticky action appears only after the in-flow action leaves view.
- No horizontal carousel is required to understand the page.
- Secondary navigation uses a quiet sheet or dedicated destination.
- Machine rendering degrades to a static artifact on low-power or reduced-data devices.
- Voice controls remain reachable without covering transcript content.
- Keyboard appearance must not hide the active field or action.

## 16.2 First viewport

The first viewport contains:

1. Greeting
2. Conversation being prepared for
3. Training objective
4. Machine readiness
5. Begin Training
6. Not today

Supporting progress and Gym exploration begin below.

---

# 17. Desktop patterns

Desktop introduces atmosphere, never additional complexity.

## 17.1 Rules

- Use asymmetric composition to establish one focal point.
- Recommendation occupies the primary reading column.
- Machine Artifact occupies the environmental column.
- Supporting content remains below the principal composition.
- Do not fill empty space with analytics, navigation, or cards.
- Pointer movement may produce subtle light response only when reduced motion is not requested.
- Keyboard and screen-reader order follows the same hierarchy as mobile.

## 17.2 Maximum density

Above the fold:

- one recommendation;
- one Machine;
- one primary action;
- one secondary autonomy action;
- one evidence line;
- one intended outcome.

Whitespace is not unused capacity. It is attention control.

---

# 18. Coach Homepage application

## 18.1 Signature composition

```text
Good morning, Latevi.

Today we’re preparing for your leadership meeting.

Practice finishing your point when someone interrupts.

[ Executive Machine Artifact ]

EXECUTIVE MACHINE
12 min · Focused · Ready

Your leadership meeting is tomorrow.

This session is designed to help you recover
without rushing or losing your idea.

[ Begin Training ]
Not today
```

## 18.2 Signature line

Proposed brand line:

> **Today, we’re training this.**

Use as a Coach ritual only when followed immediately by a specific, human training objective. Do not repeat it as decorative marketing copy across every environment.

The line remains proposed brand language pending Founder admission.

## 18.3 First-time adaptation

When TalkForge lacks evidence, it does not manufacture confidence:

```text
Welcome to TalkForge.

What conversation are you preparing for?

[ Tell Forge what’s ahead ]
```

No empty progress, false Current Focus, or generic Machine wall appears.

## 18.4 Recommendation readiness

The Machine may visually power on, but Begin Training must not wait for the animation. Functional readiness controls availability; animation only explains it.

---

# 19. Design-to-engineering contract

Before implementation, every component specification must include:

1. Purpose
2. Content model
3. Variants
4. Interaction states
5. Responsive behavior
6. Keyboard behavior
7. Screen-reader behavior
8. Reduced-motion behavior
9. Loading and error behavior
10. Token usage
11. Analytics purpose, if any
12. Acceptance criteria

Engineering resolves implementation feasibility. The CXA resolves experience standards. Atlas resolves governance conflicts. The Founder retains final production approval.

No new dependency or component framework is required by this specification.

---

# 20. Certification checklist

An environment is not ready unless:

## Purpose

- One purpose is explicit.
- One primary action is unmistakable.
- The three-second test passes.

## Humanity

- The member feels understood rather than evaluated.
- Decline, pause, and redirection preserve dignity.
- Copy describes behavior and intention, not identity.

## Clarity

- Every element supports the next good decision.
- Internal architecture is invisible.
- Evidence is available without overwhelming.

## Craft

- Typography, spacing, material, light, and motion form one hierarchy.
- Loading, empty, offline, interrupted, completed, declined, and recovered states are designed.
- Beauty passes the deletion test.

## Accessibility

- Keyboard, screen reader, zoom, contrast, reduced motion, transcript, and typed alternatives pass.
- Meaning survives without color, animation, sound, or haptics.

## Architecture

- Living Profile remains the identity source of truth.
- Readiness and Pedagogy own recommendation judgment.
- Experiences do not write identity.
- Metrics have operational definitions and provenance.
- Current certification and release gates pass.

---

# 21. Founder review decisions

Version 1.0 requires explicit decisions on:

1. Admit or revise “Beauty Has a Job” as a CXA principle.
2. Admit or retain “Today, we’re training this” as working brand language.
3. Approve Manrope as the converged product UI typeface or retain Geist in the app.
4. Approve gold as the global action/focus language and define whether blue remains session-only.
5. Approve the initial Machine identity territories for Phase 8.2 exploration.
6. Approve optional sound and haptic exploration.
7. Keep all progress quantification blocked until operational definitions are separately reviewed.

---

# 22. Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-04 | Initial proposed Communication Gym design system for Founder review; implementation frozen |
