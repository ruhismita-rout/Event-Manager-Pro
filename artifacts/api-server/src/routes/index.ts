import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import registrationsRouter from "./registrations";
import chatRouter from "./chat";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(registrationsRouter);
router.use(chatRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);

export default router;
