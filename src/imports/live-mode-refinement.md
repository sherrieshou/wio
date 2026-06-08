Only modify Live Mode in this step.
Do not redesign Replay Mode.
Do not redesign unrelated parts of the interface.
Preserve the existing overall visual style unless a change is explicitly requested below.

IMPORTANT CONSTRAINT
Do not change the visual style of the 3D information display in this step.
Do not change the 3D points, their shape, their glow, their material, their size logic, their opacity logic, or their trajectory styling.
Only change the live-mode conversation behavior and the interface components around the existing 3D scene.

Refine Live Mode only.

GOAL
Live Mode should feel like the conversation is happening now.
The interface should communicate temporal unfolding, voice synchronization, and active presence.

This step is specifically about the behavior of the active dialogue, the voice bar, and the pacing of text appearance.

WHAT TO CHANGE
Focus only on the live unfolding conversation experience.

LIVE DIALOGUE GENERATION
- Each dialogue bubble must not appear all at once.
- The text should appear progressively in sync with the voice-over.
- The generation should feel temporal and sequential, not instant.
- The user should feel that the system is “speaking / revealing” the conversation in real time.

ACTIVE BUBBLE BEHAVIOR
- The currently active dialogue bubble should have a subtle breathing effect.
- The breathing effect should be gentle and calm, not flashy.
- Only the currently active bubble should feel alive in this way.
- Older bubbles should remain static.

VOICE BAR + DIALOGUE RELATIONSHIP
- The voice bar and the active dialogue bubble should behave as one unified module.
- They should feel like two parts of the same active playback object.
- Do not make them look like separate unrelated components.
- The relationship between them should be obvious visually and behaviorally.

PAUSE BEHAVIOR
- Pause must stop both:
  1. voice playback
  2. dialogue text generation
- Pause should freeze the current state cleanly, not reset it.
- Resume should continue from the paused position.

TIMING / RHYTHM
- The experience should feel paced, not rushed.
- Text reveal should be readable and synchronized with narration.
- The live mode should prioritize clarity over speed.

LAYOUT RULES
- Keep the 3D model relatively prominent in Live Mode.
- The active dialogue area should feel central to the experience.
- Live Mode should not show replay timeline controls.
- Keep the interface focused on the current round, not full-session review.

VISUAL RULES
- Keep motion subtle and elegant.
- Avoid aggressive typing effects, flickering, or flashy animation.
- Avoid making the breathing effect too large or too obvious.
- Keep the voice bar visually integrated with the bubble rather than styled as a generic audio player.

WHAT NOT TO CHANGE
- Do not redesign Replay Mode in this step.
- Do not add review timeline behavior here.
- Do not add scrub controls here.
- Do not add semantic convergence effects yet.
- Do not change the 3D information point style.

OUTPUT EXPECTATION
Return a refined Live Mode that clearly communicates:
- real-time unfolding
- synchronized voice + text
- active bubble emphasis
- unified playback component