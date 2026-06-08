Prompt 1 （把3d模型界面清楚的分为live和review): 

Only modify the mode structure and layout logic described below.
Do not redesign unrelated parts of the interface.
Preserve the existing overall visual style unless a change is explicitly requested below.

IMPORTANT CONSTRAINT
Do not change the visual style of the 3D information display in this step.
Do not change the 3D points, their shape, their glow, their material, their size logic, their opacity logic, or their trajectory styling.
Only change the mode structure, layout, and interface organization around the existing 3D scene.

Redesign the current 3D conversation interface into two clearly distinct modes:
1. Live Mode
2. Replay Mode

GOAL
The purpose of this edit is to separate the experience into two different interface states:
- Live Mode = the conversation is unfolding in the present
- Replay Mode = the conversation is being reviewed afterward

This change is about information architecture and layout separation first.
Do not focus on advanced motion details yet.
Do not add new visual decoration unless needed for clarity.

WHAT TO CHANGE
Create two clearly different interface variants for the same 3D scene:
- one version for Live Mode
- one version for Replay Mode

LIVE MODE REQUIREMENTS
- Live Mode should feel immersive, present-tense, and focused on the current unfolding conversation.
- The 3D visualization should take more visual space than in Replay Mode.
- There should be no replay timeline visible in Live Mode.
- The screen should prioritize the current active dialogue and current active 3D points.
- Live Mode should feel less analytical and more experiential.

REPLAY MODE REQUIREMENTS
- Replay Mode should feel like a review / analysis interface.
- The 3D visualization can be slightly smaller than in Live Mode.
- Replay Mode should reserve space at the bottom for a timeline / progress-based review system.
- Replay Mode should feel more structured, less immersive, and easier to inspect.
- The layout should make room for reviewing past rounds instead of only focusing on the present moment.

LAYOUT DIFFERENTIATION
The two modes must feel clearly different in layout, not just slightly restyled:
- Live Mode = larger model, fewer review controls, stronger focus on the current moment
- Replay Mode = smaller model, visible review structure, more room for timeline controls

MODE IDENTITY
Make it visually obvious which mode the user is in.
The two modes should not feel like the same page with one element turned on or off.

WHAT NOT TO CHANGE
- Keep the existing overall UI style direction soft, minimal, rounded, and calm.
- Do not redesign the visual brand language from scratch.
- Do not add temporary convergence behavior yet.
- Do not change the 3D information point style.
- Do not overcomplicate the screen with too many extra controls.

VISUAL CONSTRAINTS
- Keep the interface clean and airy.
- Preserve the soft editorial / rounded UI tone.
- The distinction between modes should come from hierarchy and layout, not from heavy color changes.
- Avoid making Replay Mode feel like a dense dashboard.
- Avoid making Live Mode feel like a static analysis screen.

OUTPUT EXPECTATION
Produce two clearly different UI states for the same system:
- Live Mode
- Replay Mode
They should feel intentionally designed for different tasks.