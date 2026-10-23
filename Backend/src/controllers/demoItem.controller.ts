import type { RequestHandler } from "express";
import { demoItemService } from "../services/demoItem.service.js";
import {
  createDemoItemSchema,
  updateDemoItemSchema,
  idSchema,
} from "../validators/demoItem.schema.js";

// CREATE
export const createDemoItem: RequestHandler = async (req, res) => {
  const parsed = createDemoItemSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues,
    });
    return;
  }

  const item = await demoItemService.create(parsed.data.name);

  res.status(201).json({ success: true, data: item });
};

// READ ALL
export const getDemoItems: RequestHandler = async (_req, res) => {
  const items = await demoItemService.findAll();

  res.status(200).json({ success: true, data: items });
};

// READ ONE
export const getDemoItemById: RequestHandler = async (req, res) => {
  const parsedId = idSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    res.status(400).json({ success: false, message: "Invalid item ID" });
    return;
  }

  const item = await demoItemService.findById(parsedId.data);

  if (!item) {
    res.status(404).json({ success: false, message: "Item not found" });
    return;
  }

  res.status(200).json({ success: true, data: item });
};

// UPDATE
export const updateDemoItem: RequestHandler = async (req, res) => {
  const parsedId = idSchema.safeParse(req.params.id);
  const parsedBody = updateDemoItemSchema.safeParse(req.body);

  if (!parsedId.success || !parsedBody.success) {
    res.status(400).json({
      success: false,
      message: "Invalid ID or request body",
    });
    return;
  }

  const item = await demoItemService.update(
    parsedId.data,
    parsedBody.data.name,
  );

  if (!item) {
    res.status(404).json({ success: false, message: "Item not found" });
    return;
  }

  res.status(200).json({ success: true, data: item });
};

// DELETE
export const deleteDemoItem: RequestHandler = async (req, res) => {
  const parsedId = idSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    res.status(400).json({ success: false, message: "Invalid item ID" });
    return;
  }

  const deleted = await demoItemService.delete(parsedId.data);

  if (!deleted) {
    res.status(404).json({ success: false, message: "Item not found" });
    return;
  }

  res.status(204).send();
};