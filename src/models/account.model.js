const mongoose = require("mongoose")
const ledgerModel = require("./ledger.model")

const accountSchema = new mongoose.Schema({
    user: {
        // here we used objectId because we want to link this account with user collection
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Account must be associated with a user" ],
        index: true
    },

    status: {
        type: String,
        enum: {
            values: ["ACTIVE", "FROZEN", "CLOSED"],
            message: "Status must be either ACTIVE, FROZEN, or CLOSED",
        },
        default: "ACTIVE"
    },

    currency: {
        type: String,
        required: [true, "Currency is required for account creation"],
        default: "INR"
    }
},

    {
        timestamps: true
    }
)

// Compound indexing used to optimize queries filtering by user and status
accountSchema.index({ user: 1, status: 1 })

accountSchema.methods.getBalance = async function() {

    // Aggregate pipeline used to calculate the balance by summing up all CREDIT and DEBIT entries
    //  for the account in the ledger collection
    const balanceData = await ledgerModel.aggregate([
        { $match: { account: this._id} },
        {
            $group: {
                _id: null,
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "DEBIT" ] },
                            "$amount",
                            0
                        ]
                    }
                }, 
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "CREDIT" ] },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                balance: { $subtract: [ "$totalCredit", "$totalDebit" ] }
            }
        }
    ])

    if(balanceData.length === 0) {
        return 0
    }

    // if there are no transactions for the account, balanceData will be an empty array
    // and accessing balanceData[0].balance will throw an error. 
    // By using 0, we ensure that if there are no transactions, the balance will be returned as 0 instead of throwing an error.
    return balanceData[0].balance
}


const accountModel = mongoose.model("account", accountSchema)

module.exports = accountModel