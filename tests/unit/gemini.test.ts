import { describe, expect, it } from 'vitest';
import { findImages } from '../../scripts/art/gemini';

describe('Gemini image responses', () => {
  it('finds the picture in the interactions and the generateContent shapes, and skips text', () => {
    const interactions = { output_text: 'Here you go', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'hi' }, { type: 'image', mime_type: 'image/png', data: 'AAA' }] }], output_image: { data: 'AAA' } };
    expect(findImages(interactions)).toEqual(['AAA']);
    const content = { candidates: [{ content: { parts: [{ text: 'hi' }, { inlineData: { mimeType: 'image/png', data: 'BBB' } }] } }] };
    expect(findImages(content)).toEqual(['BBB']);
    expect(findImages({ candidates: [{ content: { parts: [{ text: 'I cannot draw that.' }] } }] })).toEqual([]);
  });
});
