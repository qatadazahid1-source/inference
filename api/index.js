import app from "../backend/src/index.js";
import serverless from "serverless-http";

export default serverless(app);
