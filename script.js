// First, we should grab all of the inputs and other elements that we'll be using often.
var descriptionInput = $('input[name=description]');
var aprInput = $('input[name=apr]');
var balanceInput = $('input[name=balance]');
var paymentInput = $('input[name=payment]');
var totalPaymentsInput = $('input[name=total-payments]');
var extraPaymentInput = $('input[name=extra-payment]');
var monthsToPayoffInput = $('input[name=months-to-payoff]');
var debtOptions = $('#debt-options');
var debtSnowball = $('#debt-snowball');

// We should focus in on the descriptionInput so the user can start typing right away.
descriptionInput.focus();

// Now, we can describe the model that will be used to build the components on the page.
// All values are in pennies, not dollars and cents.
// If we used dollars and cents, we'd have to use floating point numbers and javascrit
// would give us some weird results and we may never reach zero.
var model = {
    balance: 0, // The balance of all the debts combined
    payments: 0, // The total of all of the debts payments
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
        return Math.round(parseInt((30 / 365) * (this.apr / 10000) * (this.balance / 100) * 100));
    }

    // Amount must be given in cents, not dollars.cents.
    this.pay = function(amount, isOverflow) {
        var period = this.register.length;
        var interest = !isOverflow ? this.interest() : 0;
        var principle = amount - interest;
        var balance = this.balance;
        var overflow = 0;

        if(balance === 0) {
            overflow += principle;
            principle = 0;
        } else if(principle > balance) {
            overflow += (principle - balance);
            principle = balance;
            balance = 0;
        } else {
            balance -= principle;
        }

        model.balance -= principle;
        this.balance = balance;

        if(isOverflow) {
            this.register[this.register.length - 1].principle += principle;
            this.register[this.register.length - 1].balance = balance;
        } else {
            this.register.push(new Payment(period, interest, principle, balance));
        }

        return {payment: principle, overflow: overflow};
    }
}

// Finds the debt with the lowest balance and returns debt.id.
function findLowestDebt() {
    var inTheRunning = model.debts.filter(function(debt) {
        return debt.balance > 0;
    });

    if(inTheRunning.length === 0) {
        return -1;
    } else if(inTheRunning.length === 1) {
        return inTheRunning[0].id;
    }else {
        var target = inTheRunning[0];

        for(var i = 1; i < inTheRunning.length - 1; i++) {
            if(target.balance > inTheRunning[i].balance) {
                target = inTheRunning[i];
            }
        }

        return target.id;
    }
}

// The payment object.
var Payment = function(period, interest, principle, balance) {
    this.period = period;
    this.interest = interest;
    this.principle = principle;
    this.balance = balance;
}

// render() creates the page!
function render() {
    snowballer();

    debtSnowball.empty();

    totalPaymentsInput.val((model.payments / 100).toFixed(2));
    extraPaymentInput.val((model.extra / 100).toFixed(2));
    monthsToPayoffInput.val(model.debts[0].register.length - 1);

    var html = "<table><thead><tr>";

    model.debts.forEach(function(debt) {
        html += "<th>" + debt.description + "</th>";
    });

    html += "</tr></thead><tbody>";

    for(var i = 0; i < model.debts[0].register.length; i++) {
        html += "<tr>";

        model.debts.forEach(function(debt) {
            html += "<td><span class=\"payment\">" + ((debt.register[i].principle + debt.register[i].interest) / 100).toFixed(2) + "</span><span class=\"balance\">" + (debt.register[i].balance / 100).toFixed(2) + "</span></td>"; 
        });

        html += "</tr>";
    }

    html += "</tbody></table>";

    debtSnowball.append(html).removeAttr('hidden');
}

// The snowballer function creates the debt snowball and adds everything to the register.
function snowballer() {
    reset(); // When we call snowballer, the model must be reset first.

    while(model.balance > 0) {
        var overflow = model.extra;

        model.debts.forEach(function(debt) {
            overflow += debt.pay(debt.payment, false).overflow;
        });

        while(overflow > 0) {
            var lowest = findLowestDebt();

            model.debts.forEach(function(debt) {
                if(lowest === -1) {
                    overflow = 0;
                } else if(debt.id === lowest) {
                    overflow -= debt.pay(overflow, true).payment;
                } 
            });
        }
    }
}

// We need to add Debt objects to our model.
function addDebt(description, apr, balance, payment) {
    apr = Math.round(parseInt(apr * 100));
    balance = Math.round(parseInt(balance * 100));
    payment = Math.round(parseInt(payment * 100));

    if(payment < (30 / 365) * this.apr * this.balance) {
        // TODO: add 1% of balance to the interest to pay.
        payment = Math.round(parseInt((30 / 365) * (apr / 10000) * (balance / 100) * 100));
    }

    model.balance += balance;
    model.payments += payment;
    model.debts.push(new Debt(description, apr, balance, payment));
}

// Resets the model and debts back to their beginning state.
function reset() {
    model.balance = 0;
    model.payments = 0;

    model.debts.forEach(function(debt) {
        debt.balance = debt.register[0].balance;
        debt.register = [debt.register[0]];
        model.balance += debt.balance;
        model.payments += debt.payment;
    });
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
        descriptionInput.val('').focus();
        aprInput.val('');
        balanceInput.val('');
        paymentInput.val('');
        debtOptions.removeAttr('hidden');

        render();
    } else {
        console.log("Invalid input error.");
    }
});

// When the user changes the value in total-balance.
totalPaymentsInput.on('change', function(event) {
    model.extra = Math.round(parseInt(totalPaymentsInput.val() * 100) - model.payments);
    render();
});

// When the user changes the value in extra-payment.
extraPaymentInput.on('change', function(event) {
    model.extra = Math.round(parseInt(extraPaymentInput.val() * 100));
    render();
});