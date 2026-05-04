const express = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")



const router = express.Router()

/**
 * - POST /api/accounts
 * - Create a new account
 * - Protected Route (Requires Authentication)
 */
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController)


/**
 * - GET /api/accounts/balance
 * - Get account balance for the logged in user
 * - Protected Route (Requires Authentication)
 */
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController)


/**
 * - GET /api/accounts/balance/:accountId
 * - Get balance for a specific account by ID
 * - Protected Route (Requires Authentication) 
 */
router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController)

module.exports = router