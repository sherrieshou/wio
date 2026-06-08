Update the legend section layout.
	1.	Move the chevron icon to the right side

In each legend section header (AXIS KEY and POINT KEY):
	•	the section title should appear on the left
	•	the chevron (expand/collapse arrow) should be aligned to the far right

Header layout example:

AXIS KEY                             ▴
POINT KEY                            ▴

The chevron should rotate when the section collapses/expands.
	2.	Right-align the legend content

All legend items inside the section should be right-aligned.

This means:
	•	the text column aligns to the right edge
	•	the marker (X / Y / Z / dot) sits to the left of the text
	•	rows visually align to the right side of the panel

	3.	Constraints

	•	Keep AXIS KEY and POINT KEY using the same legend-section template
	•	Maintain the existing spacing and typography style
	•	Do not change the 3D visualization, axes, or point rendering
	•	Only update the legend header layout and item alignment

Improve alignment of legend items.

Create a fixed marker column so all legend rows align perfectly.

Implementation intent:

- add a dedicated marker column
- marker column width: 20px
- markers should be centered in that column
- text labels should start at the same horizontal position

Example structure:

legend-item
  legend-marker
  legend-text

This applies to both AXIS KEY and POINT KEY.

Do not allow markers (X, Y, Z, dots, squares) to determine text alignment dynamically.

The marker column must have a fixed width so all labels align vertically.

Apply a final polish to the legend panel so it feels like a lightweight visualization overlay.

Goals:
- reduce visual weight
- keep readability
- maintain a minimal, soft aesthetic

Adjustments:

1. Background
Use a translucent background instead of a solid panel.

Example intent:
background: rgba(255,255,255,0.6)
backdrop-filter: blur(6px)

2. Section dividers
Make section separators lighter.

Use a subtle divider:
border-top: 1px solid rgba(0,0,0,0.06)

Add spacing:
margin-top: 16px
padding-top: 16px

3. Section headers
Reduce visual dominance of the headers.

legend-header
font-size: 12px
letter-spacing: 0.08em
opacity: 0.65

4. Do not modify:
- 3D scene
- axis rendering
- point rendering
- legend layout structure

Only apply visual polish to the legend container and section headers.