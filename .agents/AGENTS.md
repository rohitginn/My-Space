
## Modals and Popups
Do NOT use browser default popups or modals such as `window.confirm()`, `window.prompt()`, or `window.alert()`. Always use custom-built, aesthetically pleasing React/Next.js modal components for any user prompts, confirmations, or alerts.

## Micro-animations and UX Motion
Always prioritize using `motion` (Framer Motion / Motion React) features in the codebase whenever there is an opportunity to elevate the user experience. Use animations, smooth page transitions, hover effects, and spring-based microinteractions on buttons, card selections, list insertions, and dropdown openings to make the UI feel alive, premium, and satisfying to interact with.

## Animated SVG Icons & Transform Origins
When implementing SVG icons in the navigation or interactive dashboards, prefer hand-crafted custom components animated with `framer-motion` over static icons:
- Pass down an `isHovered` boolean prop from the parent link/button container.
- Animate nested `<motion.path>`, `<motion.circle>`, `<motion.rect>`, or `<motion.g>` elements on hover (e.g. wiggling, sliding, scaling, or spinning).
- **Crucial**: Always specify correct transform origins using `style={{ originX: 0.5, originY: 0.5 }}` (or specific layout coordinates like `style={{ originX: '12px', originY: '4px' }}`) so transforms pivot from the correct anatomical anchors rather than the SVG root corner (0,0).
- Use snappy, responsive spring transitions (`type: 'spring', stiffness: 350, damping: 12`) for physical animations like bounces, wiggles, and popups.
