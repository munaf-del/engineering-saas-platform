"""
Standards rule pack loader.

Rule packs are passed into the calc-engine via the CalculationRequest.
This module provides validation helpers to ensure a rule pack contains
the required rules before a calculation proceeds.
"""

from app.models.calculation import RulePack


class MissingRuleError(Exception):
    """Raised when a required rule is not found in the provided rule pack."""

    def __init__(self, rule_key: str, standard_code: str) -> None:
        self.rule_key = rule_key
        self.standard_code = standard_code
        super().__init__(
            f"Required rule '{rule_key}' not found in rule pack for {standard_code}. "
            f"Cannot proceed without an approved rule pack entry."
        )


def require_rule(rule_pack: RulePack, rule_key: str) -> float:
    """
    Retrieve a required numerical rule value from a rule pack.
    Raises MissingRuleError if the rule is absent — never returns a default.
    """
    entry = rule_pack.rules.get(rule_key)
    if entry is None or entry.value is None:
        raise MissingRuleError(rule_key, rule_pack.standard_code)
    return entry.value


def require_table(rule_pack: RulePack, rule_key: str) -> dict[str, float]:
    """
    Retrieve a required lookup table from a rule pack.
    Raises MissingRuleError if the table is absent.
    """
    entry = rule_pack.rules.get(rule_key)
    if entry is None or entry.table is None:
        raise MissingRuleError(rule_key, rule_pack.standard_code)
    return entry.table
