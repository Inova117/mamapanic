/**
 * Input Validator - Security utility for sanitizing and validating user input
 * Prevents XSS, spam, and injection attacks
 */

export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitized?: string;
}

export class InputValidator {
    // ─── Constants ───────────────────────────────────────────────────────────

    private static readonly XSS_PATTERNS = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,     // onerror=, onclick=, etc.
        /<iframe/gi,
        /<img[^>]+src[^>]*>/gi,
        /data:text\/html/gi,
    ];

    private static readonly SQL_PATTERNS = [
        /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bTRUNCATE\b)\s+/gi,
        /('|")\s*(OR|AND)\s*('|")/gi,
        /;\s*--/gi,
    ];

    private static readonly SPAM_PATTERNS = [
        /(.)\1{15,}/,           // Chars repeated 15+ times (aaaaaaaaaaaaaaa)
        /(https?:\/\/[^\s]+){4,}/gi, // 4+ URLs in one message
    ];

    // ─── Core Sanitizer ──────────────────────────────────────────────────────

    /**
     * Strip HTML tags and dangerous patterns from text
     */
    static sanitize(input: string, maxLength: number = 500): string {
        let sanitized = input;

        // Remove HTML tags
        sanitized = sanitized.replace(/<[^>]+>/g, '');

        // Remove XSS patterns
        for (const pattern of this.XSS_PATTERNS) {
            sanitized = sanitized.replace(pattern, '');
        }

        // Normalize whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();

        // Enforce max length
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    // ─── Field Validators ────────────────────────────────────────────────────

    /**
     * Validate a chat / direct message
     */
    static validateMessage(input: string): ValidationResult {
        const sanitized = this.sanitize(input, 500);

        if (!sanitized) {
            return { valid: false, error: 'El mensaje no puede estar vacío' };
        }
        if (sanitized.length < 2) {
            return { valid: false, error: 'El mensaje es demasiado corto' };
        }

        // Spam detection
        for (const pattern of this.SPAM_PATTERNS) {
            if (pattern.test(sanitized)) {
                return { valid: false, error: 'Mensaje no permitido' };
            }
        }

        return { valid: true, sanitized };
    }

    /**
     * Validate an email address
     */
    static validateEmail(email: string): ValidationResult {
        const sanitized = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        if (!emailRegex.test(sanitized)) {
            return { valid: false, error: 'Correo electrónico inválido' };
        }

        return { valid: true, sanitized };
    }

    /**
     * Validate a password (basic strength check)
     */
    static validatePassword(password: string): ValidationResult {
        if (password.length < 8) {
            return { valid: false, error: 'La contraseña debe tener al menos 8 caracteres' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, error: 'La contraseña debe tener al menos una mayúscula' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, error: 'La contraseña debe tener al menos un número' };
        }
        return { valid: true };
    }

    /**
     * Validate a name (person / profile name)
     */
    static validateName(input: string): ValidationResult {
        const sanitized = this.sanitize(input, 100);

        if (!sanitized || sanitized.length < 2) {
            return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
        }
        if (sanitized.length > 100) {
            return { valid: false, error: 'El nombre es demasiado largo (máx 100 caracteres)' };
        }
        // Only allow letters, spaces, hyphens, apostrophes
        if (!/^[\p{L}\s\-']+$/u.test(sanitized)) {
            return { valid: false, error: 'El nombre contiene caracteres no permitidos' };
        }

        return { valid: true, sanitized };
    }

    /**
     * Validate free-text notes (bitácora, brain dump, etc.)
     */
    static validateNotes(input: string, maxLength = 2000): ValidationResult {
        const sanitized = this.sanitize(input, maxLength);

        if (!sanitized) {
            return { valid: false, error: 'Las notas no pueden estar vacías' };
        }

        return { valid: true, sanitized };
    }

    // ─── SQL / Injection Guard ────────────────────────────────────────────────

    /**
     * Detect potential SQL injection attempts (extra layer over parameterized queries)
     */
    static hasSQLInjection(input: string): boolean {
        return this.SQL_PATTERNS.some((p) => p.test(input));
    }

    /**
     * Detect XSS patterns
     */
    static hasXSS(input: string): boolean {
        return this.XSS_PATTERNS.some((p) => p.test(input));
    }
}
