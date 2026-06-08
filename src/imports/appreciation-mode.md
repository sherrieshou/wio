Add a new mode called Appreciation Mode.

GOAL
Appreciation Mode is a near-fullscreen viewing mode for the 3D semantic visualization.
Its purpose is to let the user appreciate the 3D model itself without interface clutter.

IMPORTANT CONSTRAINT
Do not change the visual style of the 3D information display in this step.
Do not change the 3D points, their shape, their glow, their material, their size logic, their opacity logic, or their trajectory styling.
Do not change the semantic mapping.
This step is only about adding a new viewing mode, hiding interface layers, and adjusting camera framing.

MODE BEHAVIOR
When the user enters Appreciation Mode:
- hide all floating UI information overlays
- hide transcript / message panels
- hide replay controls
- hide timeline
- hide legends
- hide buttons and interface chrome that sit above the visualization

Only keep:
- the 3D semantic model
- the 3D axis
- the world sphere

VISUAL RESULT
The result should feel close to fullscreen and immersive.
The page should become a clean viewing canvas for the 3D model.

CAMERA / COMPOSITION RULES
In Appreciation Mode:
- move the visual center of the 3D model to the center of the screen
- adjust the camera so the model is no longer offset for transcript or legend layout
- bring the camera slightly closer to the model
- apply a subtle zoom-in effect
- keep the zoom mild and elegant, not dramatic
- preserve the overall readable 3D orientation

The effect should feel like:
- a focused gallery view
- a cleaner, more immersive inspection state
- not a completely different world or camera language

TRANSITION RULES
The transition into Appreciation Mode should feel smooth and intentional.
It should feel like the interface layers are receding so the 3D world can take focus.

EXIT RULE
The user should be able to leave Appreciation Mode and return to the normal interface view.

LAYOUT RULES
- Appreciation Mode should not feel like a dashboard
- It should not retain side panels or floating informational cards
- It should not keep the model pushed to one side
- It should feel spatial, centered, and contemplative

WHAT NOT TO CHANGE
- Do not redesign the 3D point style
- Do not redesign the trajectory style
- Do not redesign the semantic axes
- Do not change replay logic
- Do not change transcript logic
- Do not alter the meaning of the visualization

OUTPUT EXPECTATION
Return a new Appreciation Mode where:
- all overlay UI disappears
- only the 3D model, 3D axis, and world sphere remain
- the model shifts to the center of the screen
- the camera is slightly closer
- the experience feels immersive and clean


Do not remove the 3D axis or the world sphere in Appreciation Mode.
These should remain visible as part of the spatial viewing experience.

The zoom-in should be subtle, like a refined camera push-in, not a dramatic close-up.