import express from "express";
import dotenv from "dotenv";
import connectDB from "./configs/db.js";
import bodyParser from "body-parser";
import cors from "cors";
import userRouter from "./routes/userRouter.js";
import cookieParser from "cookie-parser";
import noteRouter from "./routes/noteRouter.js";
import helmet from "helmet";
import ExpressMongoSanitize from "express-mongo-sanitize";
const app = express();
dotenv.config();
const port = 4000





connectDB();

app.use(express.json());
app.use(helmet());
app.use(ExpressMongoSanitize());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "https://client-noteku.vercel.app"], 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);



app.use('/api/v1/auth', userRouter)
app.use('/api/v1/note', noteRouter)

app.listen(port, () => {
    console.log(`Aplikasi berjalan diport ${port}` )
} )