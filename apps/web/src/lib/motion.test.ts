import { describe, expect, it } from 'vitest';
import { EASE_OUT, fadeSlideUp, fadeSlideUpItem, hoverLift, pageTransition, pressTap, staggerParent } from './motion.js';

describe('Motion Animation Tokens', () => {
  it('defines valid cubic-bezier EASE_OUT array', () => {
    expect(EASE_OUT).toHaveLength(4);
    expect(EASE_OUT[0]).toBe(0.23);
    expect(EASE_OUT[1]).toBe(1);
  });

  it('defines fadeSlideUp variant with initial, animate, exit states', () => {
    expect(fadeSlideUp.initial).toEqual({ opacity: 0, y: 8 });
    expect(fadeSlideUp.animate).toEqual({ opacity: 1, y: 0 });
    expect(fadeSlideUp.exit).toEqual({ opacity: 0, y: -8 });
  });

  it('defines staggerParent with staggerChildren transition', () => {
    expect(staggerParent.animate.transition.staggerChildren).toBe(0.05);
  });

  it('defines interactive micro-animation scales', () => {
    expect(pressTap.scale).toBe(0.97);
    expect(hoverLift.scale).toBe(1.02);
  });

  it('defines pageTransition with entrance and exit slide animation', () => {
    expect(pageTransition.initial).toEqual({ opacity: 0, y: 6 });
    expect(pageTransition.animate).toEqual({ opacity: 1, y: 0 });
    expect(pageTransition.exit).toEqual({ opacity: 0, y: -6 });
  });
});
