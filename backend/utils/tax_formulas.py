
def compute_tax(total_income: float):
    """
    Calculates tax using Indian NEW TAX REGIME (2023 – 2024)
    """
    # Standard Deduction
    taxable = total_income - 50000
    if taxable < 0:
        taxable = 0
    tax = 0
    #New Regime Slabs
    if taxable <= 300000:
        tax = 0
    elif taxable <= 600000:
        tax = (taxable - 300000) * 0.05
    elif taxable <= 900000:
        tax = 15000 + (taxable - 600000) * 0.10
    elif taxable <= 1200000:
        tax = 45000 + (taxable - 900000) * 0.15
    elif taxable <= 1500000:
        tax = 90000 + (taxable - 1200000) * 0.20
    else:
        tax = 150000 + (taxable - 1500000) * 0.30
    # Rebate under Sec 87A (Income <= 7 lakh)
    if total_income <= 700000:
        tax = 0
    # Add 4% health & education cess
    cess = tax * 0.04
    tax_liability = round(tax + cess, 2)
    # Suggest mandatory savings (80C) if tax > 0
    suggested_savings = 150000 if total_income > 700000 else 0

    return taxable, tax_liability, suggested_savings