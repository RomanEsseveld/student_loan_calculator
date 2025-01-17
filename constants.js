// Yearly constants for exemption thresholds and interest rates
export const YEARLY_CONSTANTS = {
    2022: {
        interestRate: {
            SF35: 0.00,
            SF15: 0.00
        },
        exemptionThreshold: {
            SF35: 22356.00,
            SF15: 18779.04
        }
    },
    2023: {
        interestRate: {
            SF35: 0.0046,
            SF15: 0.0178
        },
        exemptionThreshold: {
            SF35: 25069.82,
            SF15: 21058.65
        }
    },
    2024: {
        interestRate: {
            SF35: 0.0256,
            SF15: 0.0295
        },
        exemptionThreshold: {
            SF35: 26819.42,
            SF15: 22528.31
        }
    },
    2025: {
        interestRate: {
            SF35: 0.0257,
            SF15: 0.0221
        },
        exemptionThreshold: {
            SF35: 28405.73,
            SF15: 23860.81
        }
    }
};

export const CONFIG = {
    ANNUAL_INCOME_GROWTH: 0.03,    // 3% annual income growth
    DEFAULT_FUTURE_RATE: 0.025     // 2.5% default for future periods
};

export const VALID_YEARS = {
    MIN: 2022,
    MAX: 2025
};

export const LOAN_TYPES = {
    SF35: {
        PAYMENT_PERCENTAGE: 0.04,      // 4% of disposable income
        REPAYMENT_MONTHS: 420,         // 35 years
        SINGLE_THRESHOLD: 1.00,        // 100% of minimum wage
        PARTNER_THRESHOLD: 1.43,       // 143% of minimum wage
        NAME: "SF35"
    },
    SF15: {
        PAYMENT_PERCENTAGE: 0.12,      // 12% of disposable income
        REPAYMENT_MONTHS: 180,         // 15 years
        SINGLE_THRESHOLD: 0.84,        // 84% of minimum wage
        PARTNER_THRESHOLD: 1.20,       // 120% of minimum wage
        NAME: "SF15"
    }
};

// Partner thresholds for SF15
export const SF15_PARTNER_THRESHOLDS = {
    2022: 26827.20,
    2023: 30083.78,
    2024: 32183.30,
    2025: 34086.88
}; 