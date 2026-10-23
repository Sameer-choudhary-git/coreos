import type { RequestHandler } from "express";
import { supabase } from "../config/supabase.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
      return;
    }

    req.user = data.user;
    next();
  } catch (error) {
    next(error);
  }
};