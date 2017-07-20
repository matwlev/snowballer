// First things first: let's grab all of the pieces of the page that we're going to be using. It's
// probably better to just get this all out of the way now.
var descriptionInput = $('input[name=description]');
var aprInput = $('input[name=apr]');
var balanceInput = $('input[name=balance]');
var paymentInput = $('input[name=payment]');
var totalPaymentsInput = $('input[name=total-payments]');
var extraPaymentInput = $('input[name=extra-payment]');
var monthsToPayoffInput = $('input[name=months-to-payoff]');
var snowballerDiv = $('#snowballer');
var debtOptions = $('#debt-options');
var debtSnowball = $('#debt-snowball');
var addDebtAlert = $('#add-debt-alert');
var clearDataBtn = $('#clear-debt-data');
var chartCanvas = $('#payoff-chart');
var tableViewBtn = $('#table-view-btn');
var graphViewBtn = $('#graph-view-btn');
var chart = chartCanvas.get(0).getContext('2d'); // For the graph

// When the page loads we want to user to be able to start typing right away. We can focus on the
// debt description input to make it easier for everybody.
descriptionInput.focus();

// This is the model. Say "hello, model!" It's going to be used to store EVERYTHING about the page.
// One thing to note: the balance, payments, and extra are all going to be stored as CENTS, note
// dollars. The reason we're doing this is to avoid weird rounding errors when dealing with
// floating point numbers. If we use cents, we can use integers and our lives will be easier.
var model = {
    balance: 0, // The balance of all the debts combined.
    payments: 0, // The total of all of the debts payments.
    extra: 0, // Any amount to be paid extra.
    debts: [] // An array holding debt objects for all of the debts the user inputs.
}

// The debt object! These are input by the user and then added to the model's debts array.
var Debt = function(description, apr, balance, payment) {
    this.description = description;
    this.apr = apr;
    this.balance = balance; // In cents
    this.payment = payment; // in cents
    this.register = [new Payment(0, 0, 0, balance)];

    // All amounts must be given to the function in cents, not dollars and cents.
    this.pay = function(amount, isOverflow) {
        var period = this.register.length;
        var interest = !isOverflow ? makesCents((30 / 365) * (this.balance / 100) * this.apr) : 0;
        var principle = amount - interest;
        var balance = this.balance;
        var overflow = 0;

        // This is our logic for making a payment. It's pretty self-explanitory. No surprises here.
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

        // If there is any amount that has overflowed, we need to update what we're adding to there
        // debts register.
        if(isOverflow) {
            this.register[this.register.length - 1].principle += principle;
            this.register[this.register.length - 1].balance = balance;
        } else {
            this.register.push(new Payment(period, interest, principle, balance));
        }

        // We want to return an object with the amount paid and the amount overflowed because we'll
        // need to use them when we snowball the debt.
        return {payment: principle, overflow: overflow};
    }
}

// Finds the debt with the lowest balance and returns it's id if once is found. If none of them are
// the lowest, we return -1.
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

// The payment object that will be added to a debt's register when a payment is made.
var Payment = function(period, interest, principle, balance) {
    this.period = period;
    this.interest = interest;
    this.principle = principle;
    this.balance = balance;
}

// This guy calls snowballer() then creates the entire page!
function render() {
    snowballer(); // Snowballer! Say, "thank you, snowballer()!"

    // We need to make an array to hold the data we're going to use for the chart that chart.js is
    // going to create. This one grabs all of the labels...
    model.debts.forEach(debt => debtLabels.push(debt.description));

    // ...and this one grabs all of the data.
    for(var i = 0; i < model.debts[0].register.length; i++) {
        var sum = 0;
        model.debts.forEach(debt => sum += debt.register[i].balance);
        debtDataset.push((sum / 100));
    }

    debtSnowball.empty();

    totalPaymentsInput.val(dollarBillz(model.payments));
    extraPaymentInput.val(dollarBillz(model.extra));
    monthsToPayoffInput.val(model.debts[0].register.length - 1);

    // Build the table for just the balances.
    var html = "<table id=\"balance-table\" class=\"table table-striped\"><thead><tr><th>Period</th>";

    model.debts.forEach(function(debt) {
        html += "<th>" + debt.description + "</th>";
    });

    html += "</tr></thead><tbody>";

    for(var i = 0; i < model.debts[0].register.length; i++) {
        html += "<tr><td>" + i + "</td>";

        model.debts.forEach(function(debt) {
            html += "<span id=\"payment-group\">";
            html += "<td><span class=\"balance";

            if(debt.register[i].balance === 0) {
                html += " zero-balance";
            }

            html +="\">$" + dollarBillz(debt.register[i].balance) + "</span></td>"
            html += "</span>";
        });

        html += "</tr>";
    }

    html += "</tbody></table>"; // End of table

    // // Build a table for just the payments.
    // html2 += "</tbody></table>";

    // var html2 = "<table id=\"payment-table\" class=\"table table-striped\" hidden=\"hidden\"><thead><tr><th>Period</th>";

    // model.debts.forEach(function(debt) {
    //     html2 += "<th>" + debt.description + "</th>";
    // });

    // html2 += "</tr></thead><tbody>";

    // for(var i = 0; i < model.debts[0].register.length; i++) {
    //     html2 += "<tr><td>" + i + "</td>";

    //     model.debts.forEach(function(debt) {
    //         html2 += "<span id=\"payment-group\">";
    //         html2 += "<td><span class=\"balance";

    //         if(debt.register[i].balance === 0) {
    //             html2 += " zero-balance";
    //         }

    //         html2 +="\">$" + dollarBillz(debt.register[i].balance) + "</span></td>"
    //         html2 += "</span>";
    //     });

    //     html2 += "</tr>";
    // }

    // html2 += "</tbody></table>"; // End of table


    addDebtAlert.attr('hidden', 'hidden');
    debtSnowball.append(html);
    // debtSnowball.append(html2);
    snowballerDiv.removeAttr('hidden');

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
    reset(); // snowballer() has to work with a fresh version of the model.

    // Sort the debts by shortest to longest payoff based on the payment and balance.
    model.debts.sort(function(a, b) {
        return (a.balance / a.payment) - (b.balance / b.payment);
    });

    // This loop is what does the snowballing.
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

// Converts from cents to dollars for display (string).
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
        isNaN(paymentInput.val()) || 
        aprInput.val() > 100 ||
        aprInput.val() < 0;

        // TODO: Other input errors?

    if(!error) {
        addDebt(descriptionInput.val(), aprInput.val(), balanceInput.val(), paymentInput.val());
        descriptionInput.val('').focus();
        aprInput.val('');
        balanceInput.val('');
        paymentInput.val('');
        debtOptions.removeAttr('hidden');
        $('#description-group').removeClass('has-error');
        $('#apr-group').removeClass('has-error');
        $('#payment-group').removeClass('has-error');
        $('#balance-group').removeClass('has-error');

        render();
    } else {
        addDebtAlert.removeClass('alert-info').addClass('alert-danger').html("<strong>Uh oh!</strong> Something went wrong!");

        if(isEmpty(descriptionInput.val())) {
            $('#description-group').addClass('has-error');
        }

        if(isEmpty(aprInput.val()) || isNaN(aprInput.val()) || aprInput.val() > 100 || aprInput.val() < 0) {
            $('#apr-group').addClass('has-error');
        }

        if(isEmpty(paymentInput.val()) || isNaN(paymentInput.val())) {
            $('#payment-group').addClass('has-error');
        }

        if(isEmpty(balanceInput.val()) || isNaN(balanceInput.val())) {
            $('#balance-group').addClass('has-error');
        }
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

// When the user clicks the button to clear the page, the page and all of the data is cleared.
clearDataBtn.on('click', function(event) {
    reset();
    model.debts = [];
    addDebtAlert.removeAttr('hidden');
    addDebtAlert.removeClass('alert-danger').addClass('alert-info').html("<strong>Add some debts!</strong> Use to form above to add some debts to your snowball.");
    debtSnowball.empty();
    chartCanvas.empty();
    snowballerDiv.attr('hidden', 'hidden');
});

// When the user wants to switch from graph view to table view or vice-versa.
tableViewBtn.on('click', function(event) {
    graphViewBtn.removeClass('btn-primary').addClass('btn-default');
    tableViewBtn.removeClass('btn-default').addClass('btn-primary');

    $('#balance-payment-btns').attr('hidden', 'hidden');
    $('#payoff-chart-canvas-wrapper').attr('hidden', 'hidden');
    $('#debt-snowball').removeAttr('hidden');
});

graphViewBtn.on('click', function(event) {
    tableViewBtn.removeClass('btn-primary').addClass('btn-default');
    graphViewBtn.removeClass('btn-default').addClass('btn-primary');

    $('#balance-payment-btns').removeAttr('hidden');
    $('#payoff-chart-canvas-wrapper').removeAttr('hidden');
    $('#debt-snowball').attr('hidden', 'hidden');
});
