const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
dotenv.config()

async function authMiddleware(req, res, next){
    const token = req.cookies.token || req.headers.authorization?.split(" ") [1]

    if(!token) {
        return res.status(401).json({
            message: "Unauthorized access, token not found",
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.id) // Changed from decoded.userId to decoded.id
        req.user = user
        next()
    }
    catch (error) {
        return res.status(401).json({
            message: "Unauthorized access, invalid token",
        })
    }
}

module.exports = {
    authMiddleware
}
