import { ApiResponseBuilder } from '../../utils/apiResponse';

describe('ApiResponseBuilder.success', () => {
  it('returns success:true with data', () => {
    const res = ApiResponseBuilder.success({ id: 1 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: 1 });
    expect(res.error).toBeUndefined();
  });

  it('includes a timestamp string', () => {
    const res = ApiResponseBuilder.success(null);
    expect(typeof res.meta?.timestamp).toBe('string');
    expect(new Date(res.meta!.timestamp).getTime()).not.toBeNaN();
  });

  it('includes version from env or default', () => {
    const res = ApiResponseBuilder.success(null);
    expect(res.meta?.version).toBe(process.env.API_VERSION ?? '1.0.0');
  });

  it('merges extra meta fields', () => {
    const res = ApiResponseBuilder.success('ok', { version: '2.0.0' });
    expect(res.meta?.version).toBe('2.0.0');
  });
});

describe('ApiResponseBuilder.error', () => {
  it('returns success:false with error shape', () => {
    const res = ApiResponseBuilder.error('NOT_FOUND', 'Resource not found');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
    expect(res.error?.message).toBe('Resource not found');
    expect(res.data).toBeUndefined();
  });

  it('includes optional details string', () => {
    const res = ApiResponseBuilder.error('BAD_REQUEST', 'Invalid input', 'field: email');
    expect(res.error?.details).toBe('field: email');
  });

  it('includes optional details object', () => {
    const res = ApiResponseBuilder.error('VALIDATION', 'Failed', { field: 'email' });
    expect(res.error?.details).toEqual({ field: 'email' });
  });
});

describe('ApiResponseBuilder.paginate', () => {
  const items = [{ id: 1 }, { id: 2 }];

  it('returns success:true with data array', () => {
    const res = ApiResponseBuilder.paginate(items, 1, 10, 2);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(items);
  });

  it('calculates totalPages correctly', () => {
    const res = ApiResponseBuilder.paginate([], 1, 10, 25);
    expect(res.meta?.pagination?.totalPages).toBe(3);
  });

  it('sets page and limit in pagination meta', () => {
    const res = ApiResponseBuilder.paginate(items, 2, 5, 10);
    expect(res.meta?.pagination?.page).toBe(2);
    expect(res.meta?.pagination?.limit).toBe(5);
    expect(res.meta?.pagination?.total).toBe(10);
  });

  it('rounds up totalPages for partial last page', () => {
    const res = ApiResponseBuilder.paginate([], 1, 3, 7);
    expect(res.meta?.pagination?.totalPages).toBe(3);
  });
});
