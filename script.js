// First, we should grab all of the inputs that we'll be using.
var descriptionInput = $('input[name=description]');
var aprInput = $('input[name=apr]');
var balanceInput = $('input[name=balance]');
var paymentInput = $('input[name=payment]');
var totalPaymentsInput = $('input[name=total-payments]');
var extraPaymentInput = $('input[name=extra-payment]');
var monthsToPayoffInput = $('input[name=months-to-payoff]');

// Now, we can describe the model that will be used to build the components on the page.
// All values are in pennies, not dollars and cents.
// If we used dollars and cents, we'd have to use floating point numbers and javascrit
// would give us some weird results and we may never reach zero.
var model = {
    balance: 0, // The balance of all the debts combined
    extra: 0, // Any amount to be paid extra
    debts: [] // The debts being snowballed
}

// The Debt object describes a debt (credit card, loan, etc.) that the user adds.
var Debt = function(description, apr, balance, payment) {
    this.description = description;
    this.apr = apr;
    this.balance = balance;
    this.payment = payment;

    this.pay = function(amount, isOverflow) {
        var interest, principle, overflow;
    }
}

// We need to add Debt objects to our model.
function addDebt(description, apr, balance, payment) {
    apr = parseFloat(apr);
    balance = Math.round(parseInt(balance * 100));
    payment = Math.round(parseInt(payment * 100));

    model.balance += balance;
    model.debts.push(new Debt(description, apr, balance, payment));
}