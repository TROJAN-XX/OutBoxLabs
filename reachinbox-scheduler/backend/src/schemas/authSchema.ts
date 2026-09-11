import { z } from 'zod';

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential token is required'),
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
