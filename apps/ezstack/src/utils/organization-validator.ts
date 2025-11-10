/**
 * Organization Name Validator
 * 
 * Prevents users from using fraudulent organization names that could be used
 * for phishing attacks in OTP emails and SMS messages.
 */

// List of blocked brand names and variations
const BLOCKED_BRANDS = [
  // Tech companies
  'google', 'facebook', 'meta', 'apple', 'microsoft', 'amazon', 'netflix',
  'twitter', 'x corp', 'linkedin', 'instagram', 'whatsapp', 'snapchat', 'tiktok',
  'youtube', 'github', 'gitlab', 'bitbucket', 'slack', 'discord', 'zoom',
  'dropbox', 'notion', 'figma', 'adobe', 'salesforce', 'oracle', 'ibm',
  'tesla', 'uber', 'lyft', 'airbnb', 'spotify', 'paypal', 'stripe', 'square',
  
  // Financial institutions
  'bank of america', 'chase', 'wells fargo', 'citibank', 'capital one',
  'american express', 'amex', 'visa', 'mastercard', 'discover',
  'goldman sachs', 'jp morgan', 'morgan stanley', 'schwab', 'fidelity',
  
  // E-commerce
  'walmart', 'target', 'bestbuy', 'ebay', 'etsy', 'shopify',
  
  // Government/Services
  'irs', 'social security', 'usps', 'fedex', 'ups', 'dhl',
  
  // Common phishing targets
  'coinbase', 'binance', 'metamask', 'opensea',
];

/**
 * Normalize text to catch leetspeak and variations
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase().trim();
  
  // Remove common separators
  normalized = normalized.replace(/[\s\-_.]/g, '');
  
  // Replace leetspeak characters
  normalized = normalized
    .replace(/[4@α]/g, 'a')
    .replace(/[3€ε]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0øο]/g, 'o')
    .replace(/[5$ς]/g, 's')
    .replace(/[9q]/g, 'g')
    .replace(/8/g, 'b')
    .replace(/[7+]/g, 't');
  
  return normalized;
}

/**
 * Generate variations of a blocked name to catch leetspeak
 */
function generateVariations(blockedName: string): Set<string> {
  const variations = new Set<string>();
  variations.add(blockedName);
  
  // Add version with spaces removed
  variations.add(blockedName.replace(/\s/g, ''));
  
  // Add version with common separators
  variations.add(blockedName.replace(/\s/g, '-'));
  variations.add(blockedName.replace(/\s/g, '_'));
  variations.add(blockedName.replace(/\s/g, '.'));
  
  return variations;
}

/**
 * Check if organization name contains blocked brands
 */
function containsBlockedBrand(orgName: string): boolean {
  const normalized = normalizeText(orgName);
  
  for (const blocked of BLOCKED_BRANDS) {
    const blockedNormalized = normalizeText(blocked);
    const variations = generateVariations(blockedNormalized);
    
    for (const variation of variations) {
      if (normalized.includes(variation)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check for suspicious patterns that often indicate phishing
 */
function hasSuspiciousPattern(orgName: string): boolean {
  const patterns = [
    // Too many numbers (e.g., "G00gl3" or "F4c3b00k")
    /\d.*\d.*\d/,
    
    // Excessive special characters
    /[!@#$%^&*()]{2,}/,
    
    // Unusual Unicode characters that look like Latin letters
    /[α-ωА-я]/,
    
    // "Official" or "Verify" in the name (common phishing tactic)
    /\b(official|verify|verification|secure|security|support)\b/i,
  ];
  
  return patterns.some(pattern => pattern.test(orgName));
}

/**
 * Validate organization name
 * 
 * @param orgName - The organization name to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateOrganizationName(orgName: string): {
  isValid: boolean;
  error?: string;
} {
  // Check if empty or too short
  if (!orgName || orgName.trim().length < 2) {
    return {
      isValid: false,
      error: 'Organization name must be at least 2 characters long',
    };
  }
  
  // Check if too long
  if (orgName.length > 100) {
    return {
      isValid: false,
      error: 'Organization name must be less than 100 characters',
    };
  }
  
  // Check for only whitespace
  if (!/\S/.test(orgName)) {
    return {
      isValid: false,
      error: 'Organization name cannot be only whitespace',
    };
  }
  
  // Check for blocked brands
  if (containsBlockedBrand(orgName)) {
    return {
      isValid: false,
      error: 'This organization name is not allowed. Please use your actual organization name.',
    };
  }
  
  // Check for suspicious patterns
  if (hasSuspiciousPattern(orgName)) {
    return {
      isValid: false,
      error: 'Organization name contains suspicious patterns. Please use a standard business name.',
    };
  }
  
  // Check for control characters or unusual whitespace
  if (/[\x00-\x1F\x7F-\x9F]/.test(orgName)) {
    return {
      isValid: false,
      error: 'Organization name contains invalid characters',
    };
  }
  
  return { isValid: true };
}

/**
 * Get a user-friendly error message for validation failures
 */
export function getValidationErrorMessage(orgName: string): string | null {
  const result = validateOrganizationName(orgName);
  return result.isValid ? null : (result.error || 'Invalid organization name');
}

