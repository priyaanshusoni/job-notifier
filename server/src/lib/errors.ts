export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Machine-readable code, e.g. "EMAIL_TAKEN" */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, code?: string) {
    return new ApiError(400, message, code);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, message);
  }
  static conflict(message: string, code?: string) {
    return new ApiError(409, message, code);
  }
  /** 502 — an upstream dependency (JSearch, Gemini, Telegram) failed. */
  static upstream(message: string, code?: string) {
    return new ApiError(502, message, code);
  }
}
