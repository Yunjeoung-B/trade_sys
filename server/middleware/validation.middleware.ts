import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Middleware factory for validating request body with Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error.name === "ZodError") {
        const firstError = error.errors[0];
        return res.status(400).json({
          message: `Validation error: ${firstError.path.join('.')} - ${firstError.message}`
        });
      }
      res.status(400).json({ message: "Invalid request data" });
    }
  };
}

/**
 * Middleware factory for validating request params with Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      res.status(400).json({ message: "Invalid request parameters" });
    }
  };
}

/**
 * Middleware factory for validating request query with Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      res.status(400).json({ message: "Invalid query parameters" });
    }
  };
}
