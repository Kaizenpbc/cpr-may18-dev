import { sanitizeString, sanitizeObject } from '../../middleware/inputSanitizer.js';

describe('sanitizeString', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\t tab \t')).toBe('tab');
  });

  it('removes null bytes', () => {
    expect(sanitizeString('he\0llo')).toBe('hello');
    expect(sanitizeString('\0start')).toBe('start');
  });

  it('preserves normal text including SQL keywords (parameterized queries handle injection)', () => {
    expect(sanitizeString('Please SELECT all options')).toBe('Please SELECT all options');
    expect(sanitizeString("Update my address to O'Brien St")).toBe("Update my address to O'Brien St");
    expect(sanitizeString('DROP the subject')).toBe('DROP the subject');
  });

  it('preserves apostrophes and special characters in names', () => {
    expect(sanitizeString("O'Malley")).toBe("O'Malley");
    expect(sanitizeString('100% complete')).toBe('100% complete');
  });

  it('coerces non-string input to string', () => {
    expect(sanitizeString(42 as unknown as string)).toBe('42');
    expect(sanitizeString(true as unknown as string)).toBe('true');
  });
});

describe('sanitizeObject', () => {
  it('returns null and undefined unchanged', () => {
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
  });

  it('returns numbers and booleans unchanged', () => {
    expect(sanitizeObject(42)).toBe(42);
    expect(sanitizeObject(true)).toBe(true);
  });

  it('trims strings in flat objects', () => {
    const result = sanitizeObject({ name: '  Alice  ', age: 30 }) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('recursively sanitizes nested objects', () => {
    const input = { user: { name: '  Bob  ', city: ' Toronto ' } };
    const result = sanitizeObject(input) as { user: { name: string; city: string } };
    expect(result.user.name).toBe('Bob');
    expect(result.user.city).toBe('Toronto');
  });

  it('recursively sanitizes arrays', () => {
    const result = sanitizeObject(['  a  ', '  b  ']) as string[];
    expect(result).toEqual(['a', 'b']);
  });

  it('does not sanitize sensitive fields (password etc)', () => {
    const input = { password: '  my secret  ', name: '  Alice  ' };
    const result = sanitizeObject(input) as Record<string, unknown>;
    expect(result.password).toBe('  my secret  '); // untouched
    expect(result.name).toBe('Alice');             // trimmed
  });

  it('removes null bytes from string values', () => {
    const result = sanitizeObject({ text: 'hel\0lo' }) as Record<string, unknown>;
    expect(result.text).toBe('hello');
  });
});
