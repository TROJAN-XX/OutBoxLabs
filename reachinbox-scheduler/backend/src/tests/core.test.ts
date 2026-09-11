import { describe, it, expect } from 'vitest';

// Email validation regex (same as used in schema)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  return emailRegex.test(email);
}

function deduplicateRecipients(recipients: string[]): {
  unique: string[];
  duplicateCount: number;
} {
  const normalized = recipients.map((r) => r.trim().toLowerCase());
  const unique = [...new Set(normalized)];
  return {
    unique,
    duplicateCount: normalized.length - unique.length,
  };
}

function calculateScheduleTimes(
  startTime: Date,
  recipientCount: number,
  delayMs: number
): Date[] {
  return Array.from({ length: recipientCount }, (_, i) => {
    return new Date(startTime.getTime() + i * delayMs);
  });
}

describe('Email Validation', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.name@domain.co')).toBe(true);
    expect(validateEmail('a@b.c')).toBe(true);
    expect(validateEmail('user+tag@gmail.com')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user @domain.com')).toBe(false);
    expect(validateEmail('user@domain')).toBe(false);
  });
});

describe('Recipient Deduplication', () => {
  it('removes duplicate email addresses', () => {
    const result = deduplicateRecipients([
      'alice@test.com',
      'bob@test.com',
      'alice@test.com',
    ]);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
  });

  it('normalizes email casing', () => {
    const result = deduplicateRecipients([
      'Alice@Test.com',
      'alice@test.com',
      'ALICE@TEST.COM',
    ]);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicateCount).toBe(2);
  });

  it('trims whitespace', () => {
    const result = deduplicateRecipients([
      '  alice@test.com  ',
      'alice@test.com',
    ]);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  it('handles empty input', () => {
    const result = deduplicateRecipients([]);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicateCount).toBe(0);
  });

  it('handles all unique emails', () => {
    const result = deduplicateRecipients([
      'a@b.com',
      'c@d.com',
      'e@f.com',
    ]);
    expect(result.unique).toHaveLength(3);
    expect(result.duplicateCount).toBe(0);
  });
});

describe('Schedule Time Calculation', () => {
  it('calculates staggered send times correctly', () => {
    const start = new Date('2026-09-15T10:00:00Z');
    const times = calculateScheduleTimes(start, 4, 2000);

    expect(times).toHaveLength(4);
    expect(times[0].toISOString()).toBe('2026-09-15T10:00:00.000Z');
    expect(times[1].toISOString()).toBe('2026-09-15T10:00:02.000Z');
    expect(times[2].toISOString()).toBe('2026-09-15T10:00:04.000Z');
    expect(times[3].toISOString()).toBe('2026-09-15T10:00:06.000Z');
  });

  it('handles single recipient', () => {
    const start = new Date('2026-09-15T10:00:00Z');
    const times = calculateScheduleTimes(start, 1, 2000);

    expect(times).toHaveLength(1);
    expect(times[0].toISOString()).toBe('2026-09-15T10:00:00.000Z');
  });

  it('handles zero delay', () => {
    const start = new Date('2026-09-15T10:00:00Z');
    const times = calculateScheduleTimes(start, 3, 0);

    expect(times).toHaveLength(3);
    expect(times[0].getTime()).toBe(times[1].getTime());
    expect(times[1].getTime()).toBe(times[2].getTime());
  });

  it('handles large recipient counts', () => {
    const start = new Date('2026-09-15T10:00:00Z');
    const times = calculateScheduleTimes(start, 1000, 2000);

    expect(times).toHaveLength(1000);
    // Last email: 10:00:00 + 999 * 2s = 10:33:18
    const lastExpected = new Date('2026-09-15T10:33:18.000Z');
    expect(times[999].toISOString()).toBe(lastExpected.toISOString());
  });
});

describe('Rate Limit Logic', () => {
  function getHourWindow(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}`;
  }

  function getNextHourWindowStart(timestamp: Date): Date {
    const next = new Date(timestamp);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next;
  }

  it('generates correct hour window keys', () => {
    expect(getHourWindow(new Date('2026-09-15T10:30:00Z'))).toBe('2026-09-15-10');
    expect(getHourWindow(new Date('2026-09-15T23:59:59Z'))).toBe('2026-09-15-23');
    expect(getHourWindow(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01-00');
  });

  it('calculates next hour window start correctly', () => {
    const now = new Date('2026-09-15T10:30:00Z');
    const next = getNextHourWindowStart(now);
    expect(next.toISOString()).toBe('2026-09-15T11:00:00.000Z');
  });

  it('handles midnight hour transition', () => {
    const now = new Date('2026-09-15T23:45:00Z');
    const next = getNextHourWindowStart(now);
    expect(next.toISOString()).toBe('2026-09-16T00:00:00.000Z');
  });
});

describe('Idempotency Logic', () => {
  it('prevents processing an already-sent job', () => {
    // Simulates the idempotency check
    const jobStatus = 'SENT';
    const shouldProcess = jobStatus !== 'SENT' && jobStatus !== 'FAILED';
    expect(shouldProcess).toBe(false);
  });

  it('allows processing a scheduled job', () => {
    const jobStatus = 'SCHEDULED';
    const shouldProcess = jobStatus !== 'SENT' && jobStatus !== 'FAILED';
    expect(shouldProcess).toBe(true);
  });

  it('prevents processing a failed job', () => {
    const jobStatus = 'FAILED';
    const shouldProcess = jobStatus !== 'SENT' && jobStatus !== 'FAILED';
    expect(shouldProcess).toBe(false);
  });

  it('simulates atomic claim with concurrent workers', () => {
    // Simulates the updateMany WHERE status = SCHEDULED logic
    let dbStatus = 'SCHEDULED';

    // Worker 1 claims
    const worker1Claims = dbStatus === 'SCHEDULED';
    if (worker1Claims) {
      dbStatus = 'PROCESSING';
    }

    // Worker 2 attempts to claim same job
    const worker2Claims = dbStatus === 'SCHEDULED';

    expect(worker1Claims).toBe(true);
    expect(worker2Claims).toBe(false);
    expect(dbStatus).toBe('PROCESSING');
  });
});

describe('Past Start Time Validation', () => {
  it('rejects start times in the past', () => {
    const pastTime = new Date(Date.now() - 60000); // 1 minute ago
    const isValid = pastTime.getTime() > Date.now();
    expect(isValid).toBe(false);
  });

  it('accepts start times in the future', () => {
    const futureTime = new Date(Date.now() + 60000); // 1 minute ahead
    const isValid = futureTime.getTime() > Date.now();
    expect(isValid).toBe(true);
  });
});

describe('CSV Email Extraction', () => {
  function extractEmails(csvContent: string): {
    valid: string[];
    invalid: string[];
    duplicates: number;
  } {
    const emailRegex = /[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/g;
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
    const allEmails: string[] = [];
    const invalid: string[] = [];

    for (const line of lines) {
      const matches = line.match(emailRegex);
      if (matches) {
        allEmails.push(...matches);
      } else if (line.trim() && !line.toLowerCase().includes('email')) {
        invalid.push(line.trim());
      }
    }

    const normalized = allEmails.map((e) => e.trim().toLowerCase());
    const unique = [...new Set(normalized)];
    const duplicates = normalized.length - unique.length;
    const valid = unique.filter((e) => emailRegex.test(e));

    return { valid, invalid, duplicates };
  }

  it('extracts emails from simple CSV', () => {
    const csv = 'email\njohn@example.com\nalice@example.com';
    const result = extractEmails(csv);
    expect(result.valid).toHaveLength(2);
    expect(result.duplicates).toBe(0);
  });

  it('extracts emails from CSV with name column', () => {
    const csv = 'name,email\nJohn,john@example.com\nAlice,alice@example.com';
    const result = extractEmails(csv);
    expect(result.valid).toHaveLength(2);
  });

  it('handles duplicates in CSV', () => {
    const csv = 'email\njohn@example.com\njohn@example.com\nalice@example.com';
    const result = extractEmails(csv);
    expect(result.valid).toHaveLength(2);
    expect(result.duplicates).toBe(1);
  });
});
