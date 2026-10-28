import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("ChatDonald’s está vivo 🍔");
});

app.listen(PORT, () => {
  console.log(`ChatDonald’s funcionando en el puerto ${PORT}`);
});
