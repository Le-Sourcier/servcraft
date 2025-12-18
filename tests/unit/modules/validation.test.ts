import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validate,
  validateBody,
  validateQuery,
  emailSchema,
  passwordSchema,
} from '../../../src/modules/validation/validator.js';
import { ValidationError } from '../../../src/utils/errors.js';

describe('Validation Module', () => {
  describe('validate', () => {
    const testSchema = z.object({
      name: z.string().min(2),
      age: z.number().positive(),
    });

    it('should return validated data for valid input', () => {
      const input = { name: 'John', age: 25 };
      const result = validate(testSchema, input);
      expect(result).toEqual(input);
    });

    it('should throw ValidationError for invalid input', () => {
      const input = { name: 'J', age: -1 };
      expect(() => validate(testSchema, input)).toThrow(ValidationError);
    });

    it('should include field errors in ValidationError', () => {
      const input = { name: 'J', age: -1 };
      try {
        validate(testSchema, input);
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.errors).toHaveProperty('name');
          expect(error.errors).toHaveProperty('age');
        }
      }
    });
  });

  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
      ];

      validEmails.forEach((email) => {
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = ['notanemail', '@example.com', 'test@', 'test@.com'];

      invalidEmails.forEach((email) => {
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('passwordSchema', () => {
    it('should accept strong passwords', () => {
      const validPasswords = ['Password1!', 'Str0ng@Pass', 'MyP@ssw0rd'];

      validPasswords.forEach((password) => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'short',           // Too short
        'nouppercase1!',   // No uppercase
        'NOLOWERCASE1!',   // No lowercase
        'NoNumbers!',      // No numbers
        'NoSpecial1',      // No special chars
      ];

      invalidPasswords.forEach((password) => {
        expect(() => passwordSchema.parse(password)).toThrow();
      });
    });
  });
});
