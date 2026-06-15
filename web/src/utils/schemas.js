import { z } from 'zod';

export const loginSchema = z.object({
    phone: z.string().min(10, 'Phone must be at least 10 characters').max(20, 'Phone must be under 20 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

export const assignSchema = z.object({
    cylinder_id: z.string().min(1, 'Cylinder ID is required'),
    agent_id: z.number().int().positive('Agent ID is required'),
    customer_id: z.number().int().positive('Customer ID is required')
});
