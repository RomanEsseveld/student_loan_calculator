import LoanCalculator from './calculator.js';
import { VALID_YEARS, CONFIG, YEARLY_CONSTANTS, LOAN_TYPES } from './constants.js';

// Initialize chart variables
let minimumChart = null;
let optimizedChart = null;

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
function formatNumber(input, isBlur = false) {
    // If empty or just placeholder text, don't format
    if (!input.value || input.value === input.placeholder) {
        return;
    }

    // During typing, only remove non-digits
    if (!isBlur) {
        let value = input.value.replace(/[^\d]/g, '');
        input.value = value;
        return;
    }

    // On blur, format the number properly
    let value = input.value.replace(/[^\d]/g, '');
    if (value) {
        const number = parseInt(value);
        if (!isNaN(number)) {
            input.value = number.toLocaleString('nl-NL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    }
}

// Get numeric value from formatted input
function getNumericValue(input) {
    if (!input.value || input.value === input.placeholder) return 0;
    
    // First remove the dots (thousand separators)
    let value = input.value.replace(/\./g, '');
    // Then replace comma with dot for decimal
    value = value.replace(',', '.');
    // Convert to number
    const number = parseFloat(value);
    
    if (isNaN(number) || number < 0) {
        throw new Error(`Ongeldig getal: ${input.value}`);
    }
    return number;
}

// Helper function for Dutch number formatting
function formatDutchNumber(number) {
    return number.toFixed(2)
        .replace('.', ',')  // Replace decimal point with comma
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');  // Add dots for thousands
}

// Create separate charts for each strategy
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

    // Make charts container visible
    document.querySelector('.charts-container').style.display = 'grid';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Ensure output sections are hidden initially
    document.getElementById('summary').classList.remove('visible');
    document.querySelector('.charts-container').style.display = 'none';

    initializeYearDropdown();
    initializeFutureRates();

    // Handle start year change
    document.getElementById('start_year').addEventListener('change', initializeFutureRates);

    // Format number inputs
    ['debt_amount', 'reference_income', 'max_payment'].forEach(id => {
        const input = document.getElementById(id);
        
        // Add input event listener for basic formatting
        input.addEventListener('input', () => formatNumber(input, false));
        
        // Add focus event listener to clear placeholder
        input.addEventListener('focus', function() {
            if (this.value === this.placeholder) {
                this.value = '';
            }
        });
        
        // Add blur event listener for complete formatting
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.value = this.placeholder;
            } else {
                formatNumber(this, true);
            }
        });
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
        console.log('Form submitted - starting calculations');

        try {
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
            });

            console.log('Custom rates collected:', customRates);

            // Get form values
            const debtAmount = getNumericValue(document.getElementById('debt_amount'));
            const startYear = Number(document.getElementById('start_year').value);
            const isSingle = document.getElementById('is_single').value === 'true';
            const referenceIncome = getNumericValue(document.getElementById('reference_income'));
            const maxMonthlyPayment = getNumericValue(document.getElementById('max_payment'));
            const loanType = document.getElementById('loan_type').value;

            console.log('Form values:', {
                debtAmount,
                startYear,
                isSingle,
                referenceIncome,
                maxMonthlyPayment,
                loanType
            });

            // Create calculator parameters
            const params = {
                debtAmount,
                startYear,
                isSingle,
                referenceIncome,
                maxMonthlyPayment,
                loanType,
                customRates
            };

            console.log('Creating calculator with params:', params);
            const calculator = new LoanCalculator(params);

            console.log('Generating summaries...');
            const minimumSummary = calculator.generateMinimumMonthlySummary();
            const optimizedSummary = calculator.generateOptimizedSummary();
            console.log('Summaries generated:', { minimumSummary, optimizedSummary });

            // Show summary section
            const summarySection = document.getElementById('summary');
            if (!summarySection) {
                throw new Error('Summary section not found in DOM');
            }
            summarySection.classList.add('visible');
            console.log('Summary section made visible');

            // Update summary display with both strategies
            summarySection.innerHTML = `
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
            console.log('Summary HTML updated');

            // Show and update charts
            const chartsContainer = document.querySelector('.charts-container');
            if (!chartsContainer) {
                throw new Error('Charts container not found in DOM');
            }
            chartsContainer.style.display = 'grid';
            console.log('Charts container made visible');

            updateCharts(minimumSummary.timeline, optimizedSummary.timeline);
            console.log('Charts updated');

            // Scroll to results
            summarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('Scrolled to results');

        } catch (error) {
            console.error('Calculation error:', error);
            alert('Error: ' + error.message);
        }
    });

    // Add loan type change handler
    document.getElementById('loan_type').addEventListener('change', initializeFutureRates);

    // Track modal opens
    document.querySelectorAll('.header-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            const pageName = this.getAttribute('href').replace('.html', '');
            gtag('event', 'modal_open', {
                'modal_type': pageName
            });
        });
    });

    // Track external link clicks
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.addEventListener('click', function(e) {
            gtag('event', 'external_link_click', {
                'link_url': this.href,
                'link_text': this.textContent.trim()
            });
        });
    });

    // Track Buy Me a Coffee button clicks
    // Wait for the button to be loaded
    const bmc_interval = setInterval(() => {
        const bmcButton = document.querySelector('.bmc-btn');
        if (bmcButton) {
            clearInterval(bmc_interval);
            bmcButton.addEventListener('click', function() {
                gtag('event', 'support_click', {
                    'type': 'buy_me_coffee'
                });
            });
        }
    }, 1000);
}); 