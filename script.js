// First, we should grab all of the inputs that we'll be using.
var descriptionInput = $('input[name=description]');
var aprInput = $('input[name=apr]');
var balanceInput = $('input[name=balance]');
var paymentInput = $('input[name=payment]');
var totalPaymentsInput = $('input[name=total-payments]');
var extraPaymentInput = $('input[name=extra-payment]');
var monthsToPayoffInput = $('input[name=months-to-payoff]');

// We should focus in on the descriptionInput so the user can start typing right away.
descriptionInput.focus();

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
    this.register = [new Payment(0, 0, 0, balance)];

    this.interest = function() {
        return parseInt(Math.round((30 / 365) * (this.apr / 10000) * (this.balance / 100) * 100));
    }

    // Amount must be given in cents, not dollars.cents.
    this.pay = function(amount, isOverflow) {
        var period = this.register.length;
        var interest = isOverflow ? 0 : this.interest();
        var principle = amount - interest;
        var balance = this.balance;
        var overflow = 0;

        if(balance === 0) {
            interest = 0;
            principle = 0;
            overflow = amount;
        } else if(principle > balance) {
            overflow = principle - balance;
            principle = balance;
            balance = 0;
        } else {
            balance -= principle;
        }

        this.register.push(new Payment(period, interest, principle, balance));
        model.balance -= principle;
        this.balance = balance;
    }
}

// The payment object.
var Payment = function(period, interest, principle, balance) {
    this.period = period;
    this.interest = interest;
    this.principle = principle;
    this.balance = balance;
}

// We need to add Debt objects to our model.
function addDebt(description, apr, balance, payment) {
    apr = Math.round(parseFloat(apr * 100));
    balance = Math.round(parseInt(balance * 100));
    payment = Math.round(parseInt(payment * 100));

    model.balance += balance;
    model.debts.push(new Debt(description, apr, balance, payment));
}

// When the user clicks "Add Debt", this happens...
$('#add-debt-form').submit(function(event) {
    event.preventDefault();

    function isEmpty(value) {
        if(value === 'undefined' || value === 'null' || value === '') {
            return true;
        }

        return false;
    }

    var error = 
        isEmpty(descriptionInput.val()) ||
        isEmpty(aprInput.val()) ||
        isEmpty(balanceInput.val( )) ||
        isEmpty(paymentInput.val()) ||
        isNaN(aprInput.val()) ||
        isNaN(balanceInput.val()) ||
        isNaN(paymentInput.val());

    if(!error) {
        addDebt(descriptionInput.val(), aprInput.val(), balanceInput.val(), paymentInput.val());
        descriptionInput.focus();
    } else {
        console.log("Invalid input error.");
    }
});