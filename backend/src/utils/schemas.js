const { z } = require('zod');

const loginSchema = z.object({
    body: z.object({
        phone: z.string().min(10).max(20),
        password: z.string().min(6),
        device_fingerprint: z.string().min(10)
    })
});

const assignCylinderSchema = z.object({
    body: z.object({
        cylinder_id: z.string().min(1),
        agent_id: z.number().int().positive(),
        assigned_by: z.number().int().positive(),
        location_lat: z.number().optional(),
        location_lng: z.number().optional()
    })
});

const scanCylinderSchema = z.object({
    body: z.object({
        cylinder_id: z.string().min(1),
        user_id: z.number().int().positive(),
        location_lat: z.number().optional(),
        location_lng: z.number().optional()
    })
});

const deliverCylinderSchema = z.object({
    body: z.object({
        cylinder_id: z.string().min(1),
        user_id: z.number().int().positive(),
        location_lat: z.number().optional(),
        location_lng: z.number().optional(),
        otp_provided: z.string().min(6).max(10)
    })
});

module.exports = {
    loginSchema,
    assignCylinderSchema,
    scanCylinderSchema,
    deliverCylinderSchema
};
