import { YEARLY_CONSTANTS, CONFIG, LOAN_TYPES, SF15_PARTNER_THRESHOLDS } from './constants.js';
import { RepaymentSchedule } from './models/RepaymentSchedule.js';
import * as LoanUtils from './utils/loanUtils.js';

export default class LoanCalculator {
    constructor(params) {
        this.validateParams(params);
        this.params = params;
        this.loanConfig = LOAN_TYPES[params.loanType];
    }

    validateParams(params) {
        if (!params.debtAmount || params.debtAmount <= 0) {
            throw new Error("Debt amount must be positive");
        }
        if (!params.startYear || params.startYear < 2022 || params.startYear > 2025) {
            throw new Error(`Start year must be between 2022 and 2025`);
        }
        if (params.referenceIncome < 0) {
            throw new Error("Income cannot be negative");
        }
        if (!params.loanType || !LOAN_TYPES[params.loanType]) {
            throw new Error("Invalid loan type");
        }
    }

    getInterestRate(year) {
        if (year < 2023) return 0;
        if (year in YEARLY_CONSTANTS) return YEARLY_CONSTANTS[year].interestRate[this.params.loanType];
        
        // Find which 5-year period this year belongs to
        let periodStart;
        if (year >= 2025 && year <= 2029) periodStart = 2025;
        else if (year >= 2030 && year <= 2034) periodStart = 2030;
        else if (year >= 2035 && year <= 2039) periodStart = 2035;
        else if (year >= 2040 && year <= 2044) periodStart = 2040;
        else if (year >= 2045 && year <= 2049) periodStart = 2045;
        else if (year >= 2050 && year <= 2054) periodStart = 2050;
        else if (year >= 2055 && year <= 2059) periodStart = 2055;
        
        // Use custom rate if available, otherwise use default
        const rate = this.params.customRates?.[periodStart];
        return rate === undefined ? CONFIG.DEFAULT_FUTURE_RATE : rate;
    }

    calculateMonthlyPayment(annualIncome, remainingBalance, interestRate, remainingMonths, year) {
        if (year < this.params.startYear + 2) return 0;

        const exemptionThreshold = this.calculateExemptionThreshold(year);
        const disposableIncome = LoanUtils.calculateDisposableIncome(annualIncome, exemptionThreshold);
        const incomeBased = LoanUtils.calculateIncomeBased(disposableIncome, this.loanConfig.PAYMENT_PERCENTAGE);
        const legalMinimum = LoanUtils.calculateLegalMinimum(remainingBalance, interestRate, remainingMonths);

        return Math.min(incomeBased, legalMinimum);
    }

    calculateExemptionThreshold(year) {
        const baseThreshold = this.getBaseExemptionThreshold();
        const yearsFromStart = year - this.params.startYear;
        const growthFactor = Math.pow(1 + CONFIG.ANNUAL_INCOME_GROWTH, yearsFromStart);
        const multiplier = this.params.isSingle ? 
            this.loanConfig.SINGLE_THRESHOLD : 
            this.loanConfig.PARTNER_THRESHOLD;
        return baseThreshold * growthFactor * multiplier;
    }

    getBaseExemptionThreshold() {
        const year = this.params.startYear;
        const loanType = this.params.loanType;
        
        // Get the base threshold for the specific loan type
        const threshold = YEARLY_CONSTANTS[year]?.exemptionThreshold[loanType] || 
                         YEARLY_CONSTANTS[Object.keys(YEARLY_CONSTANTS).pop()].exemptionThreshold[loanType];
        
        if (!this.params.isSingle && loanType === 'SF15') {
            // For SF15 with partner, use specific partner thresholds
            return SF15_PARTNER_THRESHOLDS[year] || 
                   SF15_PARTNER_THRESHOLDS[Object.keys(SF15_PARTNER_THRESHOLDS).pop()];
        }
        
        return threshold;
    }

    calculateMinimumMonthlySchedule() {
        const timeline = [];
        let remainingBalance = this.params.debtAmount;
        let totalPaid = 0;
        let totalInterest = 0;
        const currentYear = new Date().getFullYear();

        // Calculate initial income based on reference year
        let initialIncome = this.params.referenceIncome * 
                          Math.pow(1 + CONFIG.ANNUAL_INCOME_GROWTH, 2);
        
        // Calculate end year of repayment (start year + 2 years grace + repayment period)
        const repaymentEndYear = this.params.startYear + 2 + Math.ceil(this.loanConfig.REPAYMENT_MONTHS / 12);
        const gracePeriodEnd = this.params.startYear + 2;

        // Generate timeline starting from current year until end of repayment
        for (let year = 0; currentYear + year <= repaymentEndYear; year++) {
            const simulationYear = currentYear + year;
            const yearsFromStart = simulationYear - this.params.startYear;
            const annualIncome = initialIncome * Math.pow(1 + CONFIG.ANNUAL_INCOME_GROWTH, yearsFromStart);
            
            // Calculate remaining months
            const yearsIntoRepayment = Math.max(0, simulationYear - gracePeriodEnd);
            const remainingMonths = this.loanConfig.REPAYMENT_MONTHS - (yearsIntoRepayment * 12);

            // Skip if we're past the repayment period
            if (remainingMonths <= 0) break;

            // Calculate minimum required payment
            const minPayment = this.calculateMonthlyPayment(
                annualIncome, 
                remainingBalance, 
                this.getInterestRate(simulationYear), 
                remainingMonths,
                simulationYear
            );

            let yearlyPayment = 0;
            let yearlyInterest = 0;

            // Monthly calculations
            for (let month = 0; month < 12; month++) {
                if (remainingBalance <= 0) break;

                const monthlyInterest = remainingBalance * (this.getInterestRate(simulationYear) / 12);
                yearlyInterest += monthlyInterest;

                const payment = Math.min(minPayment, remainingBalance + monthlyInterest);
                yearlyPayment += payment;

                const principalPayment = payment - monthlyInterest;
                remainingBalance = Math.max(0, remainingBalance - principalPayment);
            }

            totalPaid += yearlyPayment;
            totalInterest += yearlyInterest;

            timeline.push({
                year: simulationYear,
                monthlyPayment: minPayment,
                totalPaid: totalPaid,
                remainingBalance: remainingBalance,
                interestPaid: totalInterest,
                annualIncome: annualIncome,
                interestRate: this.getInterestRate(simulationYear)
            });

            if (remainingBalance <= 0) break;
        }

        return timeline;
    }

    generateMinimumMonthlySummary() {
        const timeline = this.calculateMinimumMonthlySchedule();
        const lastEntry = timeline[timeline.length - 1];
        const currentDebt = timeline.length > 0 ? timeline[0].remainingBalance : this.params.debtAmount;

        return {
            debtAmount: currentDebt,
            totalRepayment: lastEntry.totalPaid,
            totalInterest: lastEntry.interestPaid,
            forgivenAmount: lastEntry.remainingBalance,
            repaymentYears: timeline.length,
            timeline: timeline,
            strategy: `Minimale maandelijkse lasten (${this.loanConfig.NAME})`
        };
    }

    calculateOptimizedSchedule() {
        const timeline = [];
        let remainingBalance = this.params.debtAmount;
        let totalPaid = 0;
        let totalInterest = 0;
        const currentYear = new Date().getFullYear();

        // Calculate initial income based on reference year
        let initialIncome = this.params.referenceIncome * 
                          Math.pow(1 + CONFIG.ANNUAL_INCOME_GROWTH, 2);
        
        // Calculate end year of repayment (start year + 2 years grace + repayment period)
        const repaymentEndYear = this.params.startYear + 2 + Math.ceil(this.loanConfig.REPAYMENT_MONTHS / 12);
        const gracePeriodEnd = this.params.startYear + 2;

        // Generate timeline starting from current year until end of repayment
        for (let year = 0; currentYear + year <= repaymentEndYear; year++) {
            const simulationYear = currentYear + year;
            const yearsFromStart = simulationYear - this.params.startYear;
            const annualIncome = initialIncome * Math.pow(1 + CONFIG.ANNUAL_INCOME_GROWTH, yearsFromStart);
            
            // Calculate remaining months
            const yearsIntoRepayment = Math.max(0, simulationYear - gracePeriodEnd);
            const remainingMonths = this.loanConfig.REPAYMENT_MONTHS - (yearsIntoRepayment * 12);

            // Skip if we're past the repayment period
            if (remainingMonths <= 0) break;

            // Calculate minimum required payment
            const minPayment = this.calculateMonthlyPayment(
                annualIncome, 
                remainingBalance, 
                this.getInterestRate(simulationYear), 
                remainingMonths,
                simulationYear
            );

            // In the accelerated payment strategy, we always pay the maximum allowed amount
            const monthlyInterest = remainingBalance * (this.getInterestRate(simulationYear) / 12);
            const optimalPayment = Math.min(
                this.params.maxMonthlyPayment,
                remainingBalance + monthlyInterest
            );

            let yearlyPayment = 0;
            let yearlyInterest = 0;
            let currentBalance = remainingBalance;

            // Monthly calculations
            for (let month = 0; month < 12; month++) {
                if (currentBalance <= 0) break;

                const monthlyInterest = currentBalance * (this.getInterestRate(simulationYear) / 12);
                yearlyInterest += monthlyInterest;

                const payment = Math.min(optimalPayment, currentBalance + monthlyInterest);
                yearlyPayment += payment;

                const principalPayment = payment - monthlyInterest;
                currentBalance = Math.max(0, currentBalance - principalPayment);
            }

            totalPaid += yearlyPayment;
            totalInterest += yearlyInterest;
            remainingBalance = currentBalance;

            timeline.push({
                year: simulationYear,
                monthlyPayment: optimalPayment,
                totalPaid: totalPaid,
                remainingBalance: remainingBalance,
                interestPaid: totalInterest,
                annualIncome: annualIncome,
                interestRate: this.getInterestRate(simulationYear)
            });

            if (remainingBalance <= 0) break;
        }

        return timeline;
    }

    simulateRemainingCost(startingBalance, monthlyPayment, currentYear, remainingMonths) {
        let balance = startingBalance;
        let totalCost = 0;

        // Simulate until end of loan term
        let year = currentYear;
        let monthsLeft = remainingMonths;

        while (monthsLeft > 0 && balance > 0) {
            const interestRate = this.getInterestRate(year);
            
            // Simulate 12 months or remaining months
            const monthsThisYear = Math.min(12, monthsLeft);
            for (let month = 0; month < monthsThisYear; month++) {
                const monthlyInterest = balance * (interestRate / 12);
                const payment = Math.min(monthlyPayment, balance + monthlyInterest);
                
                totalCost += payment;
                balance = Math.max(0, balance + monthlyInterest - payment);
            }

            monthsLeft -= monthsThisYear;
            year++;
        }

        // Don't add remaining balance - it will be forgiven
        return totalCost;
    }

    processPayments(timeline, monthlyPayment, year, annualIncome, interestRate, 
                    remainingBalance, totalPaid, totalInterest) {
        let yearlyPayment = 0;
        let yearlyInterest = 0;
        let currentBalance = remainingBalance;

        // Monthly calculations
        for (let month = 0; month < 12; month++) {
            if (currentBalance <= 0) break;

            const monthlyInterest = currentBalance * (interestRate / 12);
            yearlyInterest += monthlyInterest;

            const payment = Math.min(monthlyPayment, currentBalance + monthlyInterest);
            yearlyPayment += payment;

            const principalPayment = payment - monthlyInterest;
            currentBalance = Math.max(0, currentBalance - principalPayment);
        }

        totalPaid += yearlyPayment;
        totalInterest += yearlyInterest;

        timeline.push({
            year: year,
            monthlyPayment: monthlyPayment,
            totalPaid: totalPaid,
            remainingBalance: currentBalance,
            interestPaid: totalInterest,
            annualIncome: annualIncome,
            interestRate: interestRate
        });

        return {
            remainingBalance: currentBalance,
            totalPaid: totalPaid,
            totalInterest: totalInterest
        };
    }

    generateOptimizedSummary() {
        const timeline = this.calculateOptimizedSchedule();
        const lastEntry = timeline[timeline.length - 1];
        const currentDebt = timeline.length > 0 ? timeline[0].remainingBalance : this.params.debtAmount;

        return {
            debtAmount: currentDebt,
            totalRepayment: lastEntry.totalPaid,
            totalInterest: lastEntry.interestPaid,
            forgivenAmount: lastEntry.remainingBalance,
            repaymentYears: timeline.length,
            timeline: timeline,
            strategy: 'Versneld aflossen (max €' + this.params.maxMonthlyPayment.toLocaleString('nl-NL') + ' per maand)'
        };
    }
} 