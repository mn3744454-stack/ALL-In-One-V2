import { z } from "zod";

// Base horse schema (without refinements for .partial() compatibility)
export const horseSchemaBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  breed: z.string().trim().max(100, "Breed must be less than 100 characters").optional().nullable(),
  color: z.string().trim().max(50, "Color must be less than 50 characters").optional().nullable(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable().or(z.literal("")),
  birth_at: z.string().optional().nullable(), // ISO timestamp with timezone
  registration_number: z.string().trim().max(100, "Registration number must be less than 100 characters").optional().nullable(),
  microchip_number: z.string().trim().max(100, "Microchip number must be less than 100 characters").optional().nullable(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().nullable(),
  is_gelded: z.boolean().default(false),
  breeding_role: z.enum(['broodmare']).nullable().optional(),
});

// Horse schema with refinements (use for full validation)
export const horseSchema = horseSchemaBase
  .refine((data) => {
    // If is_gelded is true, gender must be male
    if (data.is_gelded && data.gender !== 'male') return false;
    return true;
  }, { message: "Only male horses can be gelded", path: ["is_gelded"] })
  .refine((data) => {
    // If breeding_role is 'broodmare', gender must be female
    if (data.breeding_role === 'broodmare' && data.gender !== 'female') return false;
    return true;
  }, { message: "Only female horses can be broodmares", path: ["breeding_role"] });

export type HorseFormData = z.infer<typeof horseSchema>;

// Invitation validation schema
export const invitationSchema = z.object({
  invitee_email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  proposed_role: z.enum(["owner", "manager", "foreman", "vet", "trainer", "employee"], { required_error: "Role is required" }),
  assigned_horse_ids: z.array(z.string().uuid("Invalid horse ID")).optional().default([]),
});

export type InvitationFormData = z.infer<typeof invitationSchema>;

// Tenant validation schema
export const tenantSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  type: z.enum(["stable", "clinic", "lab", "academy", "pharmacy", "transport", "auction", "horse_owner", "trainer", "doctor"], { required_error: "Type is required" }),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional().nullable(),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional().nullable(),
  phone: z.string().trim().max(50, "Phone must be less than 50 characters").optional().nullable(),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().nullable().or(z.literal("")),
  logo_url: z.string().url("Invalid URL").optional().nullable(),
});

export type TenantFormData = z.infer<typeof tenantSchema>;

// Profile validation schema
export const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Name must be less than 100 characters").optional().nullable(),
  phone: z.string().trim().max(50, "Phone must be less than 50 characters").optional().nullable(),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  avatar_url: z.string().url("Invalid URL").optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Type for validation results
type ValidationResult<T> = 
  | { success: true; data: T; errors?: never }
  | { success: false; data?: never; errors: string[] };

// Helper function to safely parse and get validation errors
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map((e) => e.message);
  return { success: false, errors };
}
