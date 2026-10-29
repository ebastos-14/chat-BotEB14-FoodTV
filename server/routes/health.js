import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    service: "chat-BotEB14-FoodTV",
    timestamp: Date.now()
  });
});

export default router;
