import { Router } from "express";
import {
  getApiHealth,
  getDatabaseHealth,
} from "../controllers/health.controller";

const healthRouter = Router();

healthRouter.get("/health", getApiHealth);
healthRouter.get("/db/health", getDatabaseHealth);

export default healthRouter;
