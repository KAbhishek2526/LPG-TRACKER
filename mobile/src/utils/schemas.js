import { z } from 'zod';

export const loginSchema = z.object({
    phone: z.string().min(10, 'Phone must be at least 10 characters').max(20, 'Phone must be under 20 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

export const deliverySchema = z.object({
    otp_provided: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must be numeric')
});
