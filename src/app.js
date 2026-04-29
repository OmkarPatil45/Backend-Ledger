const express = require("express")
const cookieParser = require("cookie-parser")
const bcrypt = require("bcryptjs")


const app = express()

/* express server cant read the req.body's data by default,
 * hence we need to use express.json() middleware to parse the incoming JSON data in the request body 
 * and can read it & make it available under req.body property.
 */
app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")

/**
 * - Use Routes
 */
app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)


module.exports = app;