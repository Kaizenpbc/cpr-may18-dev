import { z } from 'zod';

export const envSchema = z.object({
  VITE_API_URL: z.string().url().optional(),
  VITE_APP_NAME: z.string().optional(),
  VITE_APP_VERSION: z.string().optional(),
  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = () => {
  try {
    return envSchema.parse(import.meta.env);
  } catch (error) {
    console.warn('[ENV] Environment validation warning:', error);
    return import.meta.env;
  }
};
