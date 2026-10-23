import type { RequestHandler } from "express";
import { userService } from "../services/user.service.js";

// GET /api/users/me
export const getMyProfile: RequestHandler = async (req, res) => {
  const authUser = req.authUser;

  if (!authUser) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const user = await userService.findById(authUser.id);

  if (!user) {
    res.status(404).json({
      success: false,
      message: "User profile not found. Create your profile first.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: user,
  });
};

// PUT /api/users/me
export const saveMyProfile: RequestHandler = async (req, res) => {
  const authUser = req.authUser;

  if (!authUser) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const name = req.body?.name;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({
      success: false,
      message: "A valid name is required",
    });
    return;
  }

  if (!authUser.email) {
    res.status(400).json({
      success: false,
      message: "The authenticated account has no email",
    });
    return;
  }

  const user = await userService.updateProfile({
    id: authUser.id,
    name: name.trim(),
    email: authUser.email,
  });

  res.status(200).json({
    success: true,
    message: "User profile saved successfully",
    data: user,
  });
};