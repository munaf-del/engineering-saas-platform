from enum import Enum
from pydantic import BaseModel, Field


class CalcType(str, Enum):
    PILE_CAPACITY = "pile_capacity"
    PILE_SETTLEMENT = "pile_settlement"
    PILE_LATERAL = "pile_lateral"
    PILE_GROUP = "pile_group"
    BEAM_CHECK = "beam_check"
    COLUMN_CHECK = "column_check"
    CONNECTION_CHECK = "connection_check"
    FOOTING_CHECK = "footing_check"
    RETAINING_WALL = "retaining_wall"
    BEARING_CAPACITY = "bearing_capacity"


class LimitState(str, Enum):
    STRENGTH = "strength"
    SERVICEABILITY = "serviceability"
    STABILITY = "stability"


class InputValue(BaseModel):
    value: float
    unit: str
    label: str
    source: str | None = None


class RuleEntry(BaseModel):
    clause_ref: str = Field(alias="clauseRef")
    description: str
    value: float | None = None
    table: dict[str, float] | None = None
    formula: str | None = None

    model_config = {"populate_by_name": True}


class RulePack(BaseModel):
    id: str
    standard_code: str = Field(alias="standardCode")
    version: str
    rules: dict[str, RuleEntry]

    model_config = {"populate_by_name": True}


class StandardRef(BaseModel):
    code: str
    edition: str
    amendment: str | None = None


class LoadCombinationFactor(BaseModel):
    load_case_id: str = Field(alias="loadCaseId")
    factor: float
    source: str

    model_config = {"populate_by_name": True}


class LoadCombination(BaseModel):
    id: str
    name: str
    limit_state: LimitState = Field(alias="limitState")
    factors: list[LoadCombinationFactor]
    clause_ref: str = Field(alias="clauseRef")

    model_config = {"populate_by_name": True}


class CalcOptions(BaseModel):
    include_intermediate_steps: bool = Field(default=True, alias="includeIntermediateSteps")
    precision_digits: int = Field(default=6, alias="precisionDigits")

    model_config = {"populate_by_name": True}


class CalculationRequest(BaseModel):
    calc_type: CalcType = Field(alias="calcType")
    inputs: dict[str, InputValue]
    load_combinations: list[LoadCombination] = Field(alias="loadCombinations")
    rule_pack: RulePack = Field(alias="rulePack")
    standards_refs: list[StandardRef] = Field(alias="standardsRefs")
    options: CalcOptions | None = None

    model_config = {"populate_by_name": True}


class OutputValue(BaseModel):
    value: float
    unit: str
    label: str
    clause_ref: str | None = Field(default=None, alias="clauseRef")

    model_config = {"populate_by_name": True}


class CalculationStep(BaseModel):
    name: str
    description: str
    formula: str
    inputs: dict[str, dict[str, float | str]]
    result: dict[str, float | str]
    clause_ref: str = Field(alias="clauseRef")

    model_config = {"populate_by_name": True}


class CalcWarning(BaseModel):
    code: str
    message: str
    clause_ref: str | None = Field(default=None, alias="clauseRef")

    model_config = {"populate_by_name": True}


class CalcError(BaseModel):
    code: str
    message: str
    clause_ref: str | None = Field(default=None, alias="clauseRef")

    model_config = {"populate_by_name": True}


class ClauseReference(BaseModel):
    standard_code: str = Field(alias="standardCode")
    clause: str
    description: str | None = None

    model_config = {"populate_by_name": True}


class CalculationResult(BaseModel):
    request_hash: str = Field(alias="requestHash")
    outputs: dict[str, OutputValue]
    steps: list[CalculationStep]
    governing_case: str | None = Field(default=None, alias="governingCase")
    warnings: list[CalcWarning]
    errors: list[CalcError]
    standard_refs_used: list[ClauseReference] = Field(alias="standardRefsUsed")
    duration_ms: float = Field(alias="durationMs")

    model_config = {"populate_by_name": True}
