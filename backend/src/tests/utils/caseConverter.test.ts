import { snakeToCamel, camelToSnake, keysToCamel, keysToSnake } from '../../utils/caseConverter';

describe('snakeToCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(snakeToCamel('first_name')).toBe('firstName');
    expect(snakeToCamel('user_id')).toBe('userId');
    expect(snakeToCamel('created_at')).toBe('createdAt');
  });

  it('leaves already-camel strings unchanged', () => {
    expect(snakeToCamel('firstName')).toBe('firstName');
    expect(snakeToCamel('id')).toBe('id');
  });
});

describe('camelToSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('firstName')).toBe('first_name');
    expect(camelToSnake('userId')).toBe('user_id');
    expect(camelToSnake('createdAt')).toBe('created_at');
  });

  it('leaves already-snake strings unchanged', () => {
    expect(camelToSnake('first_name')).toBe('first_name');
    expect(camelToSnake('id')).toBe('id');
  });
});

describe('keysToCamel', () => {
  it('converts object keys from snake_case to camelCase', () => {
    const input = { first_name: 'John', last_name: 'Doe', user_id: 1 };
    expect(keysToCamel(input)).toEqual({ firstName: 'John', lastName: 'Doe', userId: 1 });
  });

  it('handles nested objects', () => {
    const input = { user_data: { first_name: 'Jane', role_id: 2 } };
    expect(keysToCamel(input)).toEqual({ userData: { firstName: 'Jane', roleId: 2 } });
  });

  it('handles arrays of objects', () => {
    const input = [{ user_id: 1 }, { user_id: 2 }];
    expect(keysToCamel(input)).toEqual([{ userId: 1 }, { userId: 2 }]);
  });

  it('preserves Date objects', () => {
    const date = new Date('2026-01-01');
    expect(keysToCamel(date)).toBe(date);
  });

  it('handles null and undefined', () => {
    expect(keysToCamel(null)).toBeNull();
    expect(keysToCamel(undefined)).toBeUndefined();
  });
});

describe('keysToSnake', () => {
  it('converts object keys from camelCase to snake_case', () => {
    const input = { firstName: 'John', lastName: 'Doe', userId: 1 };
    expect(keysToSnake(input)).toEqual({ first_name: 'John', last_name: 'Doe', user_id: 1 });
  });

  it('handles arrays of objects', () => {
    const input = [{ userId: 1 }, { userId: 2 }];
    expect(keysToSnake(input)).toEqual([{ user_id: 1 }, { user_id: 2 }]);
  });
});
