Refactor AXIS KEY and POINT KEY into the same reusable legend section template.

The problem is not only visual inconsistency, but also motion inconsistency.
Both sections should use the same component structure, the same interaction pattern, and the same animation behavior.

Create one shared template component for both:

legend-section
  legend-header
    chevron
    title
  legend-content
    legend-item
    legend-item
    ...

Use this same template for:
- AXIS KEY
- POINT KEY

Requirements:

1. Shared structure
Both sections must use the same section component, not two separate custom implementations.

2. Shared interaction
Both sections should:
- be collapsible
- be expanded by default
- toggle by clicking the header
- keep the header visible when collapsed

3. Shared motion
Use the exact same animation pattern for both sections:
- same expand/collapse duration
- same easing
- same chevron rotation behavior
- same fade/slide behavior for content
- same spacing transition when the section opens/closes

4. Animation behavior
When expanded:
- content fades in and slides in slightly
- container height expands smoothly
- chevron rotates to expanded state

When collapsed:
- content fades out and slides up slightly
- container height collapses smoothly
- chevron rotates back

Suggested motion style:
- duration: 180–220ms
- easing: ease-out or a soft cubic-bezier
- subtle, clean, minimal
- no bouncy or exaggerated motion

5. Content model
The template should be reusable so only the content changes.

Apply it like this:

legend-stack
  legend-section(title="AXIS KEY", items=axisItems)
  legend-section(title="POINT KEY", items=pointItems)

6. Constraints
- Do not change the 3D scene
- Do not modify point rendering or axis rendering
- Only unify the legend component system, layout, and motion behavior