export class RepaymentSchedule {
    constructor({
        year,
        monthlyPayment,
        totalPaid,
        remainingBalance,
        interestPaid,
        annualIncome,
        interestRate
    }) {
        this.year = year;
        this.monthlyPayment = monthlyPayment;
        this.totalPaid = totalPaid;
        this.remainingBalance = remainingBalance;
        this.interestPaid = interestPaid;
        this.annualIncome = annualIncome;
        this.interestRate = interestRate;
    }
} 