export function calculateMonthlyInterest(balance, interestRate) {
    return balance * (interestRate / 12);
}

export function calculateDisposableIncome(annualIncome, exemptionThreshold) {
    return Math.max(0, (annualIncome - exemptionThreshold) / 12);
}

export function calculateIncomeBased(disposableIncome, percentage) {
    return disposableIncome * percentage;
}

export function calculateLegalMinimum(balance, interestRate, remainingMonths) {
    if (remainingMonths <= 0 || balance <= 0) return 0;
    
    // Convert annual rate to monthly rate
    const monthlyRate = interestRate / 12;
    
    // Handle edge case where interest rate is 0
    if (monthlyRate === 0) {
        return balance / remainingMonths;
    }
    
    // Use standard loan amortization formula: PMT = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    const rateFactorPower = Math.pow(1 + monthlyRate, remainingMonths);
    const payment = balance * (monthlyRate * rateFactorPower) / (rateFactorPower - 1);
    
    // Return rounded payment to avoid floating point precision issues
    return Math.round(payment * 100) / 100;
} 