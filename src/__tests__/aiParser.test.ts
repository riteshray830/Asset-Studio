import { describe, it, expect } from 'vitest';
import { hasPdfSignature, parseAiFile } from '../services/aiParser';

describe('Adobe Illustrator Parser (aiParser)', () => {
  it('detects modern PDF-compatible Illustrator stream headers', () => {
    const encoder = new TextEncoder();
    const pdfAiHeader = encoder.encode('%PDF-1.5\n%Illustrator 24.0 file\n').buffer;
    expect(hasPdfSignature(pdfAiHeader)).toBe(true);

    const pdfAiHeaderLater = encoder.encode('Some preamble text ... %PDF-1.7 stream content').buffer;
    expect(hasPdfSignature(pdfAiHeaderLater)).toBe(true);
  });

  it('rejects legacy Postscript or non-PDF files in signature check', () => {
    const encoder = new TextEncoder();
    const legacyPostscript = encoder.encode('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 500 500\n').buffer;
    expect(hasPdfSignature(legacyPostscript)).toBe(false);

    const randomBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
    expect(hasPdfSignature(randomBuffer)).toBe(false);
  });

  it('provides actionable guidance when opening legacy non-PDF Illustrator files', async () => {
    const encoder = new TextEncoder();
    const legacyContent = encoder.encode('%!PS-Adobe-3.0\n%AI5_File\n%%BoundingBox: 0 0 400 300\n');
    const legacyFile = new File([legacyContent], 'legacy_vector.ai', { type: 'application/illustrator' });

    await expect(parseAiFile(legacyFile)).rejects.toThrow(
      /Create PDF Compatible File/
    );
  });
});
