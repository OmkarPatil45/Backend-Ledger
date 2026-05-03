const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {
    
    /**
     *  1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey} = req.body

    if(!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "Missing required fields: fromAccount, toAccount, amount, idempotencyKey"
        })
    }

    // Check if transaction with the same idempotency key already exists
    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })

    // Check if both accounts exist
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    // If either account doesn't exist, return an error
    if( !fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid account IDs"
        })
    }

    /**
     *   2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey,
    })

    if(isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already completed",
                transaction: isTransactionAlreadyExists
            })
        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is pending"
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction already failed"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }

    }

    /**
     * 3. Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both accounts must be active to perform a transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */

    const balance = await fromUserAccount.getBalance()

    if(balance < amount){
        return res.status(400).json({
            message: `Insufficient balance. Current balance: ${balance}, Required: ${amount}`
        })
    }


    /**
     * 5. Create transaction (PENDING)  
     */

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = await transactionModel.create({
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    }, { session })

    /**
     * 6. Create DEBIT ledger entry
     */
    const debitLedgerEntry = await ledgerModel.create({
        account: fromAccount,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }, { session })

    /**
     * 7. Create CREDIT ledger entry
     */
    const creditLedgerEntry = await ledgerModel.create({
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }, { session})


    /**
     * 8. Mark transaction COMPLETED
     */
    transaction.status = "COMPLETED"
    await transaction.save({ session })

    /**
     * 9. Commit MongoDB session
     */
    await session.commitTransaction()
    session.endSession()

    /**
     * 10. Send email notification (This is a placeholder, actual implementation 
     * would involve integrating with an email service)
     */
    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })
}

async function createInitialFundsTransaction(req, res) {
    const {toAccount, amount, idempotencyKey} = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "Missing required fields: toAccount, amount, idempotencyKey"
        })
    }

    console.log("Looking for account with _id:", toAccount)
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    console.log("Found account:", toUserAccount)

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount ID",
            receivedId: toAccount
        })
    }

    const fromUserAccount = await accountModel.findOne({
        systemUser: true,
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = await transactionModel.create([{
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    }], { session })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction[0]._id,
        type: "DEBIT"
    }], { session })

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction[0]._id,
        type: "CREDIT"
    }], { session })

    transaction[0].status = "COMPLETED"
    await transaction[0].save({ session })

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction[0]
    })
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}