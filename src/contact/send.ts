import type { ContactPayload, ContactReply } from './rules';

/**
 * Sends a message to the contact service and returns its answer. Whatever the
 * status, the service answers a JSON `ContactReply`; a network failure, an
 * answer that is not one, and a refusal (a request the service will never
 * accept, which the page cannot fix) all come back as `failed`.
 */
export async function sendContact(payload: ContactPayload): Promise<ContactReply> {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const reply: unknown = await response.json();
    return isReply(reply) && reply.result !== 'refused' ? reply : { result: 'failed' };
  } catch {
    return { result: 'failed' };
  }
}

/** Whether a parsed answer has the shape of a ContactReply. */
function isReply(value: unknown): value is ContactReply {
  if (typeof value !== 'object' || value === null || !('result' in value)) return false;
  switch (value.result) {
    case 'sent':
    case 'failed':
    case 'refused':
      return true;
    case 'invalid':
      return 'fields' in value && typeof value.fields === 'object' && value.fields !== null;
    case 'limited':
      return 'scope' in value && (value.scope === 'ip' || value.scope === 'site');
    default:
      return false;
  }
}
