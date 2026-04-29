const accountModel = require("../models/account.model")

async function createAccountController(req, res){
    /**
     * - here we are creating account for the user who is logged in
     * - we will get the user from the req object which is set by the auth middleware
     * - we will create an account for the user and return the account details in the response
     */

    const user = req.user;

    const account = await accountModel.create({
        user: user._id
    })

    res.status(201).json({
        account 
    })
}

module.exports = {
    createAccountController
}