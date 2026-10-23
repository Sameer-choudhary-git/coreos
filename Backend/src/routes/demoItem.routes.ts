import { Router } from "express";
import type { RequestHandler } from "express";

import {
  createDemoItem,
  getDemoItems,
  getDemoItemById,
  updateDemoItem,
  deleteDemoItem,
} from "../controllers/demoItem.controller.js";

const router = Router();

const createDemoItemWithDocs: RequestHandler = (req, res, next) => {
  /*
    #swagger.tags = ['DemoItems']
    #swagger.summary = 'Create a demo item'

    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
                example: "Hackathon test item"
              }
            }
          },
          example: {
            name: "Hackathon test item"
          }
        }
      }
    }

    #swagger.responses[201] = {
      description: 'Item created successfully'
    }

    #swagger.responses[400] = {
      description: 'Invalid request body'
    }
  */

  return createDemoItem(req, res, next);
};

router.post("/", createDemoItemWithDocs);
router.get("/", getDemoItems);
router.get("/:id", getDemoItemById);
router.patch("/:id", updateDemoItem);
router.delete("/:id", deleteDemoItem);

export default router;