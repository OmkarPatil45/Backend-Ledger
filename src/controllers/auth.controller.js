const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
const bcrypt = require("bcryptjs")
const tokenBlacklistModel = require("../models/accounts.model")

dotenv.config()

/*
* - user register controller 
* - POST /api/ auth/register
*
*/

async function userRegisterController(req,res) {
    
    const {email, password, name} = req.body
    
    const isExists = await userModel.findOne({
        email: email
    })

    if(isExists) {
        return res.status(422).json({
            message: "Email already exists",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign(
        {id: user._id},
        process.env.JWT_SECRET,
        {expiresIn: "3d"}
    )

    res.cookie("token", token)

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token    
    })

}

/*
* - user login controller 
* - POST /api/ auth/login
*
*/

async function userLoginController(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email }).select("+password")

    if (!user) {
        return res.status(401).json({
            message: "User not found",
            status: "failed"
        })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        return res.status(401).json({
            message: "Invalid credentials",
            status: "failed"
        })
    }

    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "3d" }
    )

    res.cookie("token", token)

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })
}

/**
 * - user logout controller
 * - POST /api/ auth/logout
 * - This will clear the token cookie on the client side to log the user out
 */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if (!token) {
        return res.status(400).json({
            message: "User logged out successfully"
        })
    }

    await tokenBlacklistModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })
}


module.exports = { 
    userRegisterController,
    userLoginController,
    userLogoutController
}

