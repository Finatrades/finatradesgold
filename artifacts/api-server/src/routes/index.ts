import { Router, type IRouter } from "express";
import healthRouter from "./health";
import b2bAuthRouter from "./b2b-auth";
import b2bOnboardingRouter from "./b2b-onboarding";
import b2bDashboardRouter from "./b2b-dashboard";
import b2bConsignmentsRouter from "./b2b-consignments";
import b2bInventoryRouter from "./b2b-inventory";
import b2bMarketplaceRouter from "./b2b-marketplace";
import b2bRfqRouter from "./b2b-rfq";
import b2bOrdersRouter from "./b2b-orders";
import b2bEscrowRouter from "./b2b-escrow";
import b2bBarterRouter from "./b2b-barter";
import b2bWarehousesRouter from "./b2b-warehouses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(b2bAuthRouter);
router.use(b2bOnboardingRouter);
router.use(b2bDashboardRouter);
router.use(b2bConsignmentsRouter);
router.use(b2bInventoryRouter);
router.use(b2bMarketplaceRouter);
router.use(b2bRfqRouter);
router.use(b2bOrdersRouter);
router.use(b2bEscrowRouter);
router.use(b2bBarterRouter);
router.use(b2bWarehousesRouter);

export default router;
