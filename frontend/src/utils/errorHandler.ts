// ─── Error Handling ───────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function getErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';

  if (raw) {
    // Render/backend provisioning state: SharePoint export not yet present on host.
    if (raw.includes('SHAREPOINT_DATA_MISSING') || raw.includes('Missing data file')) {
      return 'La base documentaire est en cours de préparation sur le serveur. Réessayez dans quelques minutes.';
    }
    return raw;
  }
  return 'Une erreur inattendue s’est produite.';
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.toLowerCase().includes('network error')
    );
  }
  return false;
}

export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const prefix = context ? `[${context}]` : '[Error]';
  console.error(`${prefix} ${message}`, error);
}
