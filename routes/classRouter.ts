import { Router } from "express";

export const classRouter: Router = Router();

classRouter.post("/", async (req, res) => {});

classRouter.post("/:id/add-student", async (req, res) => {});

classRouter.get("/:id", async (req, res) => {});

classRouter.get("/:id/my-attendance", async (req, res) => {});
