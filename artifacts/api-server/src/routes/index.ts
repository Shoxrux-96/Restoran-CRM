import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import venuesRouter from "./venues";
import productsRouter from "./products";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import debtsRouter from "./debts";
import roomsRouter from "./rooms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(venuesRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(debtsRouter);
router.use(roomsRouter);

export default router;
