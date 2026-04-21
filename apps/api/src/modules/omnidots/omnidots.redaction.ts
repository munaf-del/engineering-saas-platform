import { OMNIDOTS_REDACTED_VALUE, OMNIDOTS_SECRET_QUERY_PARAM } from './omnidots.constants';

export function redactOmnidotsUrl(input: string | URL) {
  const raw = input.toString();

  try {
    const url = new URL(raw);
    if (url.searchParams.has(OMNIDOTS_SECRET_QUERY_PARAM)) {
      url.searchParams.set(OMNIDOTS_SECRET_QUERY_PARAM, OMNIDOTS_REDACTED_VALUE);
    }
    return url.toString();
  } catch {
    return redactOmnidotsText(raw);
  }
}

export function redactOmnidotsText(text: string, secrets: Array<string | null | undefined> = []) {
  let redacted = text.replace(
    new RegExp(`([?&]${OMNIDOTS_SECRET_QUERY_PARAM}=)([^&\\s]+)`, 'gi'),
    `$1${OMNIDOTS_REDACTED_VALUE}`,
  );

  for (const secret of secrets) {
    if (!secret) {
      continue;
    }

    redacted = redacted.split(secret).join(OMNIDOTS_REDACTED_VALUE);
  }

  return redacted;
}

export function buildOmnidotsSafeErrorMessage(
  error: unknown,
  secrets: Array<string | null | undefined> = [],
) {
  if (error instanceof Error) {
    return redactOmnidotsText(error.message, secrets);
  }

  if (typeof error === 'string') {
    return redactOmnidotsText(error, secrets);
  }

  return 'Unknown Omnidots error';
}
