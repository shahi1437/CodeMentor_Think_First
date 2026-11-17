from __future__ import annotations

import re
from typing import Dict, List, Tuple

try:
    import numpy as np  # noqa: F401
    from sklearn.feature_extraction.text import CountVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
except Exception:  # pragma: no cover - optional dependency guard
    CountVectorizer = None
    LogisticRegression = None
    Pipeline = None


ERROR_LABELS = ["syntax_error", "name_error", "logic_error", "runtime_error", "performance_issue"]

_ERROR_FEATURES: Dict[str, List[str]] = {
    "syntax_error": ["syntax error", "unexpected indent", "missing parenthesis", "invalid syntax", "parse error"],
    "name_error": ["nameerror", "undefined variable", "not defined", "traceback", "missing variable"],
    "logic_error": ["wrong output", "logic bug", "incorrect result", "algorithm", "expected value"],
    "runtime_error": ["division by zero", "index out of range", "out of memory", "typeerror", "valueerror"],
    "performance_issue": ["slow", "timeout", "time limit", "too many loops", "complexity"],
}


class ErrorClassifier:
    _model = None

    @classmethod
    def build_model(cls):
        if Pipeline is None or CountVectorizer is None or LogisticRegression is None:
            return None

        training_text: List[str] = []
        training_labels: List[str] = []
        for label, examples in _ERROR_FEATURES.items():
            for example in examples:
                training_text.append(example)
                training_labels.append(label)

        try:
            model = Pipeline(
                [
                    ("vectorizer", CountVectorizer(ngram_range=(1, 2))),
                    ("classifier", LogisticRegression(max_iter=1000)),
                ]
            )
            model.fit(training_text, training_labels)
            cls._model = model
            return model
        except TypeError:
            return None

    @classmethod
    def predict_error(cls, code: str, language: str = "python") -> Dict[str, object]:
        candidate_text = code.lower()

        lowered = candidate_text
        syntax_markers = ["syntax error", "unexpected indent", "invalid syntax", "missing parenthesis", "unexpected token"]
        if any(marker in lowered for marker in syntax_markers):
            return {"label": "syntax_error", "confidence": 0.86, "reasons": ["syntax_error"], "message": "Check for malformed syntax and brackets."}

        name_markers = ["nameerror", "not defined", "undefined variable", "missing variable", "print(name)", "not in locals", "name is not defined"]
        if any(marker in lowered for marker in name_markers):
            return {"label": "name_error", "confidence": 0.9, "reasons": ["name_error"], "message": "Verify variable names and initialization order."}

        runtime_markers = ["division by zero", "index out of range", "typeerror", "valueerror", "attributeerror"]
        if any(marker in lowered for marker in runtime_markers):
            return {"label": "runtime_error", "confidence": 0.82, "reasons": ["runtime_error"], "message": "Check input validation and edge cases."}

        performance_markers = ["time limit", "slow", "timeout", "complexity", "too many loops"]
        if any(marker in lowered for marker in performance_markers):
            return {"label": "performance_issue", "confidence": 0.76, "reasons": ["performance_issue"], "message": "Reduce unnecessary loops and verify complexity."}

        if cls._model is None:
            cls.build_model()

        if cls._model is not None:
            prediction = cls._model.predict([candidate_text])[0]
            probabilities = cls._model.predict_proba([candidate_text])[0]
            confidence = float(max(probabilities))
            reasons = []
            for label, examples in _ERROR_FEATURES.items():
                if any(token in candidate_text for token in examples):
                    reasons.append(label)
            if not reasons:
                reasons = ["logic_error"]
            return {
                "label": prediction,
                "confidence": round(confidence, 3),
                "reasons": reasons,
                "message": f"Detected likely {prediction.replace('_', ' ')} in {language} code.",
            }

        return {"label": "logic_error", "confidence": 0.7, "reasons": ["logic_error"], "message": "Trace the expected output against the program flow."}


def build_ml_summary() -> Dict[str, object]:
    return {
        "labels": ERROR_LABELS,
        "model_ready": ErrorClassifier.build_model() is not None,
        "training_samples": sum(len(v) for v in _ERROR_FEATURES.values()),
    }
