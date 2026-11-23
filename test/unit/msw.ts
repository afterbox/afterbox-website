import { http, HttpResponse, type JsonBodyType } from "msw";
import { setupServer } from "msw/node";

export const API = "http://api.test";
export const server = setupServer();

export const url = (path: string) => `${API}${path}`;

export const apiError = (status: number, code: string, details?: Record<string, unknown>, message = "Calm message.") =>
  HttpResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });

export const json = (body: JsonBodyType, status = 200) => HttpResponse.json(body, { status });

export { http, HttpResponse };
