# Icon Combinder

This context defines the project language for composing an outer wrapper with an inner icon into a single PNG artifact.

## Language

**Wrapper**:
The outer shape that frames the inner icon.
_Avoid_: shell, border, mask

**Icon**:
The inner image placed inside the wrapper.
_Avoid_: badge art, source image

**Composite icon**:
The final PNG produced by combining a wrapper and an icon.
_Avoid_: output image, merged icon

**Composite icon anti-aliasing**:
The export-quality concern of making a Composite icon's edges look smooth in the final PNG.
It primarily concerns the Wrapper edge; it does not imply restoring detail already lost inside a low-resolution Icon.
_Avoid_: icon restoration, blur fix

## Relationships

- A **Wrapper** contains one **Icon**
- A **Composite icon** combines one **Wrapper** and one **Icon**

## Example dialogue

> **Dev:** "Does this Composite icon keep the Wrapper visible behind the Icon?"
> **Domain expert:** "Yes. The Wrapper is always the outer frame; the Icon is the inner payload."
