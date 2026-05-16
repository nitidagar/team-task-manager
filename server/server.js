require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const projectsRouter = require("./routes/projects");
const tasksRouter = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/projects", projectsRouter);
app.use("/api", tasksRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
