import re
MIN_AMOUNT = 10
MAX_AMOUNT = 1_000_000
def parse_number(num_str):
    try:
        clean_str = re.sub(r'[₹\s,a-zA-Z]', '', num_str)
        return float(clean_str)
    except:
        return None
    
def valid_amount(amount):
    return amount is not None and MIN_AMOUNT <= amount <= MAX_AMOUNT

def search_patterns(patterns, text):
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            num = parse_number(match.group(1))
            if valid_amount(num):
                return num
    return None

def pick_best(candidates):
    if not candidates:
        return None
    preferred = [a for a in candidates if 50 <= a <= 50000]
    return preferred[0] if preferred else min(candidates)


def extract_amount(text: str):
    print("extract_amt called")
    if not text:
        return None
    text = text.lower()
    context_patterns = [
        r'(?:paid|amount|cost|bill|total)\D*(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)'
    ]
    amount = search_patterns(context_patterns, text)
    if amount:
        return amount
    currency_patterns = [
        r'₹\s*(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)',
        r'rs\.?\s*(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)',
        r'(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)\s*rs'
    ]
    amount = search_patterns(currency_patterns, text)
    if amount:
        return amount
    match = re.search(r'\b(\d+\.\d{2})\b', text)
    if match:
        amount = float(match.group(1))
        if valid_amount(amount):
            return amount
    numbers = re.findall(r'\d+(?:[,\s]\d+)*(?:\.\d{1,2})?', text)
    candidates = []
    for n in numbers:
        parsed = parse_number(n)
        if valid_amount(parsed):
            candidates.append(parsed)
    return pick_best(candidates)

# main funnction
def get_final_parse(raw_text: str):
    print("final_parse called")
    """
    Returns: (amount: float, description: str)
    """
    if not raw_text:
        return 0.0, "Expense"
    text = raw_text.lower().strip()
    # amount extraction
    amount = extract_amount(text)
    if amount is None:
        return 0.0, raw_text.capitalize()

    amount_str = str(int(amount)) if amount.is_integer() else str(amount)
    description = text.replace(amount_str, "")

    fillers = ["paid", "amount", "cost", "bill", "total", "rs", "for", "in", "on", "₹"]
    for word in fillers:
        description = description.replace(word, " ")

    final_desc = " ".join(description.split()).capitalize()
    if not final_desc:
        final_desc = "Expense"
    return amount, final_desc
