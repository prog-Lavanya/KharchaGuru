import joblib
import numpy as np
MODEL_PATH = "ml/category_model.pkl"
model = joblib.load(MODEL_PATH)
CONFIDENCE_THRESHOLD = 0.45   
def predict_category_from_ml(description: str) -> str:
    """
    Predict expense category using description text only.
    If confidence < threshold → return 'Others'
    """
    if not description or not description.strip():
        return "Others"
    text = description.lower()

    probs = model.predict_proba([text])[0]
    max_prob = float(np.max(probs))
    pred_category = model.classes_[np.argmax(probs)]

    # Threshold 
    if max_prob < CONFIDENCE_THRESHOLD:
        return "Others"

    return pred_category
