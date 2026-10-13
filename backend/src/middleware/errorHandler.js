import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(statusCode, code, message, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'general';
      if (!fields[fieldPath]) {
        fields[fieldPath] = issue.message;
      }
    }

    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The submitted request data failed validation.',
        fields
      }
    });
  }

  // Handle known operational ApiErrors
  if (err instanceof ApiError) {
    const errorBody = {
      code: err.code,
      message: err.message
    };
    if (err.fields) {
      errorBody.fields = err.fields;
    }
    return res.status(err.statusCode).json({
      ok: false,
      error: errorBody
    });
  }

  // Handle bad JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.'
      }
    });
  }

  console.error('[Unhandled Error]', err);

  return res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.'
    }
  });
}
