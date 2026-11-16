// Mirrors the backend's global exception filter response shape.
// `code` is a plain string (not a closed union) because the backend's set of
// business codes grows independently of this contract.
export interface ErrorDetail {
  field: string;
  messages: string[];
  /** Values the client could use instead, e.g. the end times that would make a template day fit. */
  suggestions?: string[];
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: ErrorDetail[];
}

export class ApiError extends Error {
  constructor(public readonly body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
  }
}

/** Error code of a deactivated account, both from the login (Better Auth) and from `/api/v1`. */
export const ACCOUNT_DEACTIVATED_CODE = "ACCOUNT_DEACTIVATED";
