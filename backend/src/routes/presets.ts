import { Router } from "express";
import { PRESETS, listCategories } from "../presets";

export const presetsRouter = Router();

presetsRouter.get("/", (_req, res) => {
  res.json({ categories: listCategories(), presets: PRESETS });
});
