import { type Request, type Response, type NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?:       string;
}

export function errorHandler(
  err:  AppError,
  req:  Request,
  res:  Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const isProd     = process.env.NODE_ENV === "production";

  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack ?? err.message);
  } else {
    console.warn(`[WARN] ${req.method} ${req.path} ${statusCode}:`, err.message);
  }

  if (isProd && statusCode === 500) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.status(statusCode).json({
    error: err.message,
    ...(err.code ? { code: err.code } : {}),
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `${req.method} ${req.path} not found` });
}

export function createError(
  message:    string,
  statusCode: number,
  code?:      string,
): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code       = code;
  return err;
}
