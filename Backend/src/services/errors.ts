// Errores de negocio que los controladores traducen a un código HTTP. El
// mensaje se muestra al usuario, así que no debe incluir datos internos.

export class NotFoundError extends Error {
  readonly status = 404;
}

export class ConflictError extends Error {
  readonly status = 409;
}

export class ForbiddenError extends Error {
  readonly status = 403;
}

export class BadRequestError extends Error {
  readonly status = 400;
}

export type BusinessError = NotFoundError | ConflictError | ForbiddenError | BadRequestError;

export function isBusinessError(error: unknown): error is BusinessError {
  return (
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof ForbiddenError ||
    error instanceof BadRequestError
  );
}

export function pgErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}
