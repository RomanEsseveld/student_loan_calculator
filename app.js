import LoanCalculator from './calculator.js';
import { VALID_YEARS, CONFIG, YEARLY_CONSTANTS, LOAN_TYPES } from './constants.js';

// Initialize the year dropdown
function initializeYearDropdown() {
    const select = document.getElementById('start_year');
    const currentYear = new Date().getFullYear();
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add options from VALID_YEARS.MIN to current year
    for (let year = VALID_YEARS.MIN; year <= Math.min(currentYear, VALID_YEARS.MAX); year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
        }
        select.appendChild(option);
    }
}

// Initialize future interest rate inputs
function initializeFutureRates() {
    const startYear = Number(document.getElementById('start_year').value);
    const loanType = document.getElementById('loan_type').value;
    const container = document.getElementById('future_rates_container');
    container.innerHTML = '';

    // First period (not editable)
    const firstPeriodStart = startYear;
    const firstPeriodEnd = startYear + 4;
    let firstPeriodRate;
    
    // Determine first period rate based on start year
    if (startYear in YEARLY_CONSTANTS) {
        firstPeriodRate = (YEARLY_CONSTANTS[startYear].interestRate[loanType] * 100).toFixed(2);
    }

    // Add first period (read-only)
    const firstPeriodDiv = document.createElement('div');
    firstPeriodDiv.className = 'rate-input-group';
    firstPeriodDiv.innerHTML = `
        <label>${firstPeriodStart}-${firstPeriodEnd}</label>
        <input type="number" 
               value="${firstPeriodRate}"
               readonly
               disabled
               style="background-color: #f5f5f5;">
    `;
    container.appendChild(firstPeriodDiv);

    // Calculate remaining periods based on loan type plus 2 years for grace period
    const totalYears = (LOAN_TYPES[loanType].REPAYMENT_MONTHS / 12) + 2;  // Add 2 years for grace period
    const remainingYears = totalYears - 5;
    const numPeriods = Math.ceil(remainingYears / 5);
    const secondPeriodStart = firstPeriodEnd + 1;

    // Add future periods (editable)
    for (let i = 0; i < numPeriods; i++) {
        const periodStart = secondPeriodStart + (i * 5);
        const periodEnd = Math.min(periodStart + 4, startYear + totalYears - 1);
        
        const div = document.createElement('div');
        div.className = 'rate-input-group';
        div.innerHTML = `
            <label>${periodStart}-${periodEnd}</label>
            <input type="number" 
                   class="future-rate" 
                   data-period="${periodStart}" 
                   value="2.5" 
                   step="0.01" 
                   min="0" 
                   max="10">
        `;
        container.appendChild(div);
    }
}

// Format number inputs with thousands separator
function formatNumber(input) {
    // Remove all non-digits first
    const value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        const number = parseInt(value);
        if (!isNaN(number)) {
            input.value = number.toLocaleString('nl-NL');
        }
    }
}

// Get numeric value from formatted input
function getNumericValue(input) {
    const value = Number(input.value.replace(/[^0-9]/g, ''));
    if (isNaN(value) || value < 0) {
        throw new Error(`Invalid number: ${input.value}`);
    }
    return value;
}

// Helper function for Dutch number formatting
function formatDutchNumber(number) {
    return number.toFixed(2)
        .replace('.', ',')  // Replace decimal point with comma
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');  // Add dots for thousands
}

// Create separate charts for each strategy
let minimumChart = null;
let optimizedChart = null;

function createChart(ctx, timeline, title) {
    const gridColor = '#e0e0e0';
    const fontFamily = 'Arial, sans-serif';
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeline.map(entry => entry.year),
            datasets: [{
                label: 'Resterende Schuld',
                data: timeline.map(entry => entry.remainingBalance),
                borderColor: '#FF6384',
                backgroundColor: 'white',
                borderWidth: 2.5,
                tension: 0.3,
                yAxisID: 'balance',
                fill: false,
                pointRadius: 3,
                pointBackgroundColor: '#FF6384'
            }, {
                label: 'Maandelijkse Betaling',
                data: timeline.map(entry => entry.monthlyPayment),
                borderColor: '#36A2EB',
                backgroundColor: 'white',
                borderWidth: 2.5,
                tension: 0.3,
                yAxisID: 'payment',
                fill: false,
                pointRadius: 3,
                pointBackgroundColor: '#36A2EB'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    color: '#333',
                    font: {
                        size: 16,
                        family: fontFamily,
                        weight: '500'
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        padding: 20,
                        color: '#666',
                        font: {
                            family: fontFamily,
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'white',
                    titleColor: '#333',
                    titleFont: {
                        family: fontFamily,
                        size: 13,
                        weight: '600'
                    },
                    bodyColor: '#666',
                    bodyFont: {
                        family: fontFamily,
                        size: 12
                    },
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': €' + formatDutchNumber(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor,
                        drawBorder: false,
                        drawTicks: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: fontFamily,
                            size: 11
                        },
                        padding: 8
                    }
                },
                balance: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Resterende Schuld (€)',
                        color: '#666',
                        font: {
                            family: fontFamily,
                            size: 12
                        },
                        padding: {
                            top: 0,
                            bottom: 10
                        }
                    },
                    grid: {
                        color: gridColor,
                        drawBorder: false,
                        drawTicks: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: fontFamily,
                            size: 11
                        },
                        padding: 8,
                        callback: function(value) {
                            return '€' + formatDutchNumber(value);
                        }
                    }
                },
                payment: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Maandelijkse Betaling (€)',
                        color: '#666',
                        font: {
                            family: fontFamily,
                            size: 12
                        },
                        padding: {
                            top: 0,
                            bottom: 10
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                        drawTicks: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: fontFamily,
                            size: 11
                        },
                        padding: 8,
                        callback: function(value) {
                            return '€' + formatDutchNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function updateCharts(minimumTimeline, optimizedTimeline) {
    const minimumCtx = document.getElementById('minimumChart').getContext('2d');
    const optimizedCtx = document.getElementById('optimizedChart').getContext('2d');
    
    if (minimumChart) minimumChart.destroy();
    if (optimizedChart) optimizedChart.destroy();

    const loanType = document.getElementById('loan_type').value;
    minimumChart = createChart(minimumCtx, minimumTimeline, `Minimale maandelijkse lasten (${loanType})`);
    optimizedChart = createChart(optimizedCtx, optimizedTimeline, `Versneld aflossen (${loanType})`);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeYearDropdown();
    initializeFutureRates();

    // About modal functionality
    const btn = document.getElementById('showAbout');
    const assumptionsBtn = document.getElementById('showAssumptions');
    const modals = {
        aboutModal: document.getElementById('aboutModal'),
        assumptionsModal: document.getElementById('assumptionsModal')
    };
    
    btn.onclick = function() {
        modals.aboutModal.style.display = 'block';
    }
    
    assumptionsBtn.onclick = function() {
        modals.assumptionsModal.style.display = 'block';
    }
    
    // Handle closing for all modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = function() {
            const modalId = this.getAttribute('data-modal');
            modals[modalId].style.display = 'none';
        }
    });
    
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }

    // Handle start year change
    document.getElementById('start_year').addEventListener('change', initializeFutureRates);

    // Format number inputs
    ['debt_amount', 'reference_income', 'max_payment'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', () => formatNumber(input));
    });

    // Allow manual editing of future rates
    document.getElementById('future_rates_container').addEventListener('input', function(e) {
        if (e.target.classList.contains('future-rate')) {
            let value = e.target.value.replace(/[^0-9.]/g, '');
            value = value.replace(/(\..*)\./g, '$1'); // Allow only one decimal point
            if (value) {
                const number = parseFloat(value);
                if (!isNaN(number) && number >= 0 && number <= 10) {
                    e.target.value = number.toFixed(2);
                }
            }
        }
    });

    // Handle form submission
    document.getElementById('calculatorForm').addEventListener('submit', function(e) {
        e.preventDefault();

        console.log('Form submitted');
        // Collect custom rates
        const customRates = {};
        document.querySelectorAll('.future-rate').forEach(input => {
            const period = Number(input.dataset.period);
            const value = Number(input.value);
            if (isNaN(value) || value < 0 || value > 10) {
                throw new Error(`Invalid interest rate: ${input.value}%`);
            }
            const rate = value / 100;
            customRates[period] = rate;
            console.log(`Period ${period}-${period+4}: ${rate * 100}%`);
        });

        console.log('All custom rates:', customRates);

        // Create calculator parameters
        const params = {
            debtAmount: getNumericValue(document.getElementById('debt_amount')),
            startYear: Number(document.getElementById('start_year').value),
            isSingle: document.getElementById('is_single').value === 'true',
            referenceIncome: getNumericValue(document.getElementById('reference_income')),
            maxMonthlyPayment: getNumericValue(document.getElementById('max_payment')),
            loanType: document.getElementById('loan_type').value,
            customRates: customRates
        };

        try {
            const calculator = new LoanCalculator(params);
            const minimumSummary = calculator.generateMinimumMonthlySummary();
            const optimizedSummary = calculator.generateOptimizedSummary();

            // Update summary display with both strategies
            document.getElementById('summary').innerHTML = `
                <h2>Vergelijking Strategieën</h2>
                
                <div class="strategy-comparison">
                    <div class="strategy">
                        <h3>${minimumSummary.strategy}</h3>
                        <div class="result-row">
                            <span class="result-label">Totale Schuld</span>
                            <span class="result-value">€${formatDutchNumber(minimumSummary.debtAmount)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Opgebouwde Rente</span>
                            <span class="result-value">€${formatDutchNumber(minimumSummary.totalInterest)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Totaal Afgelost</span>
                            <span class="result-value">€${formatDutchNumber(minimumSummary.totalRepayment)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Kwijtgescholden</span>
                            <span class="result-value">€${formatDutchNumber(minimumSummary.forgivenAmount)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Terugbetaalperiode</span>
                            <span class="result-value">${minimumSummary.repaymentYears} jaar</span>
                        </div>
                    </div>

                    <div class="strategy">
                        <h3>${optimizedSummary.strategy}</h3>
                        <div class="result-row">
                            <span class="result-label">Totale Schuld</span>
                            <span class="result-value">€${formatDutchNumber(optimizedSummary.debtAmount)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Opgebouwde Rente</span>
                            <span class="result-value">€${formatDutchNumber(optimizedSummary.totalInterest)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Totaal Afgelost</span>
                            <span class="result-value">€${formatDutchNumber(optimizedSummary.totalRepayment)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Kwijtgescholden</span>
                            <span class="result-value">€${formatDutchNumber(optimizedSummary.forgivenAmount)}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">Terugbetaalperiode</span>
                            <span class="result-value">${optimizedSummary.repaymentYears} jaar</span>
                        </div>
                    </div>
                </div>
            `;

            // Show results and charts
            const summaryElement = document.getElementById('summary');
            const chartsContainer = document.querySelector('.charts-container');
            
            summaryElement.classList.add('visible');
            chartsContainer.classList.add('visible');
            
            // Update charts to show both strategies
            updateCharts(minimumSummary.timeline, optimizedSummary.timeline);
            
            // Scroll to results
            summaryElement.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });

    // Add loan type change handler
    document.getElementById('loan_type').addEventListener('change', initializeFutureRates);
}); 