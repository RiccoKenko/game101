import { describe, expect, it } from 'vitest';
import { costOf, guessCost } from '../../scripts/art/openai';

describe('OpenAI picture costs', () => {
  it('prices a picture from the token counts OpenAI returns', () => {
    // A high-quality landscape picture (~5,500 output tokens) with one reference picture.
    const usd = costOf('gpt-image-2', { input_tokens: 2600, output_tokens: 5500, input_tokens_details: { image_tokens: 2000, text_tokens: 600 } });
    expect(usd).toBeCloseTo((2000 * 8 + 600 * 5 + 5500 * 30) / 1e6, 6);
    expect(usd).toBeGreaterThan(0.17);
    expect(usd).toBeLessThan(0.2);
  });

  it('guesses on the high side before calling, so the budget is never passed', () => {
    expect(guessCost('medium', 0)).toBeGreaterThanOrEqual(0.053);
    expect(guessCost('high', 2)).toBeGreaterThan(0.211 + 0.05);
    expect(guessCost('nonsense', 0)).toBe(guessCost('high', 0));
  });
});
