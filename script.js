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
var chart = $('#payoff-chart').get(0).getContext('2d'); // For the graph

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
    this.balance = balance; // In cents
    this.payment = payment; // in cents
    this.register = [new Payment(0, 0, 0, balance)];

    // Amount must be given in cents, not dollars.cents.
    this.pay = function(amount, isOverflow) {
        var period = this.register.length;
        var interest = !isOverflow ? makesCents((30 / 365) * (this.balance / 100) * this.apr) : 0;
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

    // Get all of the arrays we're going to need to make the chart.
    // The charts are made down lower.
    model.debts.forEach(debt => debtLabels.push(debt.description));

    for(var i = 0; i < model.debts[0].register.length; i++) {
        var sum = 0;
        model.debts.forEach(debt => sum += debt.register[i].balance);
        debtDataset.push((sum / 100));
    }

    debtSnowball.empty();

    totalPaymentsInput.val(dollarBillz(model.payments));
    extraPaymentInput.val(dollarBillz(model.extra));
    monthsToPayoffInput.val(model.debts[0].register.length - 1);

    var html = "<table><thead><tr>";

    model.debts.forEach(function(debt) {
        html += "<th>" + debt.description + "</th>";
    });

    html += "</tr></thead><tbody>";

    for(var i = 0; i < model.debts[0].register.length; i++) {
        html += "<tr>";

        model.debts.forEach(function(debt) {
            html += "<td><span class=\"payment\">" + dollarBillz(debt.register[i].principle + debt.register[i].interest) + "</span><span class=\"balance\">" + dollarBillz(debt.register[i].balance) + "</span></td>";
        });

        html += "</tr>";
    }

    html += "</tbody></table>";

    debtSnowball.append(html).removeAttr('hidden');

    var payoffChart = new Chart(chart, {
        type: 'line',
        data: {
            labels: createGraphLabels(),
            datasets: createGraphDatasets(),
        },
        options: {
            fill: false,
            lineTension: 0
        }
    });
}

// The snowballer function creates the debt snowball and adds everything to the register.
function snowballer() {
    reset(); // When we call snowballer, the model must be reset first.

    model.debts.sort(function(a, b) {
        return (a.balance / a.payment) - (b.balance / b.payment);
    });

    while(model.balance > 0) {
        var overflow = model.extra;

        model.debts.forEach(function(debt) {
            var amount = debt.payment;
            overflow += debt.pay(amount, false).overflow;
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

// Converts the given dollar amount into cents (int).
function makesCents(amount) {
    return Math.round(parseInt(amount * 100));
}

// Converts from cents to dollars (string).
function dollarBillz(amount) {
    return (amount / 100).toFixed(2);
}

// We need to add Debt objects to our model.
function addDebt(description, apr, balance, payment) {
    var interest = (30 / 365) * balance * (apr / 100);
    var minimum = balance / 84;
    var tooLow = minimum > payment ? true : false;
    apr = parseFloat(apr / 100);
    balance = makesCents(balance);
    payment = tooLow ? makesCents(Math.ceil(minimum + interest)) : makesCents(payment);

    model.balance += balance;
    model.payments += payment;
    model.debts.push(new Debt(description, apr, balance, payment));
}

// Resets the model and debts back to their beginning state.
function reset() {
    model.balance = 0;
    model.payments = 0;
    debtLabels = [];
    debtDataset = [];

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

        // TODO: User enters payment larger than balance.
        // TODO: User enters payment smaller than interest.
        // TODO: User enters APR > 100.
        // TODO: Other input errors?

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
    model.extra = makesCents(totalPaymentsInput.val()) - model.payments;
    render();
});

// When the user changes the value in extra-payment.
extraPaymentInput.on('change', function(event) {
    model.extra = makesCents(extraPaymentInput.val());
    render();
});

// When the user changes the months-to-payoff input, extra should change to an appropriate amount.
monthsToPayoffInput.on('change', function(event) {
    model.extra = 0;
    snowballer();
    var target = parseInt(monthsToPayoffInput.val());
    var extra = 0;

    while(model.debts[0].register.length - 1 > target) {
        model.extra = makesCents(extra);
        snowballer();
        extra++;
    }

    render();
});

// Returns an array that contains all of the data labels for the graph.
function createGraphLabels() {
    var today = new Date();
    var month = today.getMonth();
    var year = today.getUTCFullYear();
    var distance = model.debts[0].register.length;
    var monthLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    var labels = [monthLabels[month] + ", " + year];

    for(var i = 0; i < distance; i++) {
        month++;

        if(month > 11) {
            month = 0;
            year++;
        }

        labels.push(monthLabels[month] + ", " + year);
    }

    return labels;
}

// Creates the datasets that are used to create the graph.
function createGraphDatasets() {
    var datasets = [];

    model.debts.forEach(function(debt) {
        var label = debt.description;
        var data = [];
        debt.register.forEach(e => data.push(dollarBillz(e.balance)));
        datasets.push({label:label,data:data});
    });

    return datasets;
}
