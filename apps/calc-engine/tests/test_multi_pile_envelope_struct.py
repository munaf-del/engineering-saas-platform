import copy

from app.engine import multi_pile_envelope, multi_pile_struct
from app.models.calculation import CalculationRequest, RulePack


def _project_specifics() -> dict:
    return {
        "references": [],
        "structuralDefaults": {
            "concreteClasses": [
                {
                    "id": "conc_32",
                    "displayName": "32 MPa Concrete",
                    "active": True,
                    "fc_MPa": 32,
                    "Ec_MPa": 30100,
                }
            ],
            "reinforcementGrades": [
                {
                    "id": "reo_d500n",
                    "displayName": "D500N",
                    "active": True,
                    "fsy_MPa": 500,
                    "Es_MPa": 200000,
                }
            ],
            "tendonGrades": [],
            "coverDurabilityClasses": [
                {
                    "id": "cover_mild_100y",
                    "displayName": "Mild 100y",
                    "active": True,
                    "minCoverCastInPlace_mm": 75,
                    "nominalCover_mm": 75,
                }
            ],
        },
        "geotechnicalMaterials": {
            "activeReferenceId": "",
            "templateState": "empty",
            "materials": [],
        },
        "geotechnicalBasis": {
            "groundwaterDesignNotes": "",
            "cfaUpliftMode": "manual-entry",
            "cfaUpliftFactor": 0.7,
            "defaultSocketAssumptions": "",
            "foundingNotes": "",
            "commentary": "",
            "arrAssessment": {
                "irrValues": [1, 1, 1, 1, 1, 1, 1, 1, 1],
                "testType": "NONE",
                "testPilePercentage": 0,
                "weightTotal": 14.5,
                "weightedScore": 14.5,
                "arrValue": 1.0,
                "arrBand": "<= 1.5",
                "phiTf": None,
                "testBenefitK": 0,
                "phiGbLow": 0.67,
                "phiGbHigh": 0.76,
                "phiGLow": 0.67,
                "phiGHigh": 0.76,
            },
        },
    }


def _state() -> dict:
    return {
        "combinationSettings": {
            "alpha": 0.015,
            "psiC": 0.4,
            "psiE": 0.3,
            "psiL": 0.4,
            "groundwaterFactor": 1.5,
            "minPermanentFactor": 0.7,
            "reduceMinimumPermanentWithPointNine": False,
        },
        "pileTypes": [
            {
                "id": "BP1",
                "displayName": "BP1",
                "sizePreset": "750",
                "useCustom": False,
                "customMm": 750,
                "Dmm": 750,
                "nominalDiameterMm": 750,
                "eoop": 0.075,
                "eoopM": 0.075,
                "active": True,
                "order": 0,
            }
        ],
        "geoArrSettings": {
            "irrValues": [1, 1, 1, 1, 1, 1, 1, 1, 1],
            "testType": "NONE",
            "testPilePercentage": 0,
            "weightTotal": 14.5,
            "weightedScore": 14.5,
            "arrValue": 1.0,
            "arrBand": "<= 1.5",
            "phiTf": None,
            "testBenefitK": 0,
            "phiGbLow": 0.67,
            "phiGbHigh": 0.76,
            "phiGLow": 0.67,
            "phiGHigh": 0.76,
        },
        "geoTypeSettings": {
            "BP1": {
                "typeId": "BP1",
                "linkedDmm": 750,
                "redundancy": "LOW",
                "shaftRedComp": 1,
                "shaftRedTen": 0.5,
                "useNnf": False,
                "Nnf": 0,
                "s1H": 0,
                "s1qs": 0,
                "s1MaterialId": "",
                "s2H": 0,
                "s2qs": 0,
                "s2MaterialId": "",
                "s3H": 0,
                "s3qs": 0,
                "s3MaterialId": "",
                "Ls": 0,
                "useLsMinOverride": False,
                "LsMinOverride": 0,
                "qsRock": 0,
                "qbRock": 0,
                "foundingMaterialId": "",
                "useBase": "YES",
                "LsMode": "pending",
                "LsSolved": 0,
                "LsManual": 0,
                "LsAdopted": 0,
                "socketOverrideEnabled": False,
            }
        },
        "geoResults": {},
        "joints": [
            {
                "id": "J1",
                "displayName": "Joint 1",
                "jointDisplayName": "Joint 1",
                "x": 0,
                "y": 0,
                "z": 0,
                "supportCount": 1,
                "noOfSupports": 1,
                "pileTypeId": "BP1",
                "active": True,
                "order": 0,
            }
        ],
        "generatedPiles": [
            {
                "id": "J1-P1",
                "parentJointId": "J1",
                "supportIndex": 1,
                "supportCount": 1,
                "pileTypeId": "BP1",
            }
        ],
        "loadPatterns": [
            {
                "id": "G1",
                "displayName": "G1",
                "patternType": "Permanent",
                "reversible": False,
                "enabled": True,
                "order": 0,
            }
        ],
        "jointLoads": [
            {
                "jointId": "J1",
                "patternId": "G1",
                "p": 1000,
                "vx": 120,
                "vy": 80,
                "mx": 200,
                "my": 160,
                "mz": 0,
            }
        ],
        "combinationLibrary": [
            {
                "id": "C1",
                "displayName": "1.0G",
                "source": "custom",
                "kind": "linear",
                "enabled": True,
                "includeInEnvelope": True,
                "terms": [{"patternId": "G1", "factor": 1.0}],
                "order": 0,
            }
        ],
        "selectedCombinations": ["C1"],
        "uiState": {
            "multiPileStructDesigner": {
                "typeSettingsByTypeId": {
                    "BP1": {
                        "concreteClassId": "conc_32",
                        "reinforcementGradeId": "reo_d500n",
                        "coverDurabilityClassId": "cover_mild_100y",
                        "barDia": 20,
                        "nBars": 10,
                        "cover": 75,
                        "tieDia": 12,
                        "tieS": 200,
                        "tieLegs": 2,
                        "transverseSystem": "ties",
                        "useBiax": "YES",
                    }
                }
            }
        },
    }


def _envelope_joint_row() -> dict:
    return {
        "jointId": "J1",
        "jointDisplayName": "Joint 1",
        "pileTypeId": "BP1",
        "representativePileId": "J1-P1",
        "activePatternIds": ["G1"],
        "nMax": {
            "value": 1000,
            "combinationId": "C1",
            "combinationName": "1.0G",
            "source": "custom",
        },
        "nMin": {
            "value": -150,
            "combinationId": "C1",
            "combinationName": "1.0G",
            "source": "custom",
        },
        "vx": {"value": 120, "combinationId": "C1", "combinationName": "1.0G", "source": "custom"},
        "vy": {"value": 80, "combinationId": "C1", "combinationName": "1.0G", "source": "custom"},
        "mx": {"value": 200, "combinationId": "C1", "combinationName": "1.0G", "source": "custom"},
        "my": {"value": 160, "combinationId": "C1", "combinationName": "1.0G", "source": "custom"},
    }


def test_compute_struct_results_exposes_curve_shear_and_section_values():
    results = multi_pile_struct.compute_struct_results(
        _state(),
        _project_specifics(),
        [_envelope_joint_row()],
    )

    assert "BP1" in results
    struct = results["BP1"]
    assert struct["status"] == "pass"
    assert struct["sectionValues"]["phiPn"] > 0
    assert struct["sectionValues"]["phiMn"] > 0
    assert struct["sectionValues"]["phiVu"] > 0
    assert struct["interaction"]["curve"]
    assert len(struct["interaction"]["curve"]) == 120
    assert struct["interaction"]["demandPoint"]["M"] > 0
    assert struct["shear"]["Vu_capacity"] > 0
    assert struct["shear"]["demandCases"][0]["Vstar"] > 0
    assert struct["utilisation"]["governing"] > 0
    assert struct["reinforcementCompliance"]["status"] == "pass"
    assert struct["reinforcementCompliance"]["summaryText"] == "OK"
    assert struct["reinforcementCompliance"]["provided"]["As_perim"] > 0
    assert struct["reinforcementCompliance"]["required"]["As_min"] > 0
    assert struct["reinforcementCompliance"]["checks"]["okAsMin"] is True
    assert struct["reinforcementCompliance"]["context"]["clauseRef"] == "AS 2159 Clause 5.3.3"
    assert struct["reinforcementCompliance"]["context"]["providedAreaBasis"] == "perimeter"


def test_compute_struct_results_exposes_warning_reinforcement_compliance_when_as_min_not_met():
    state = copy.deepcopy(_state())
    state["uiState"]["multiPileStructDesigner"]["typeSettingsByTypeId"]["BP1"]["nBars"] = 6

    results = multi_pile_struct.compute_struct_results(
        state,
        _project_specifics(),
        [_envelope_joint_row()],
    )

    compliance = results["BP1"]["reinforcementCompliance"]
    assert compliance["status"] == "warning"
    assert compliance["summaryText"] == "WARNING"
    assert compliance["checks"]["okAsMin"] is False
    assert compliance["checks"]["okAsMax"] is True
    assert compliance["checks"]["asMaxExceeded"] is False
    assert compliance["minimumStatusText"] == "As,min NOT MET"
    assert (
        "minimum longitudinal reinforcement required by AS 2159 Clause 5.3.3"
        in compliance["detailText"]
    )
    assert compliance["context"]["minReoRuleLabel"] == "OTHER PILES - FULLY EMBEDDED"
    assert compliance["context"]["reoLocDetailLabel"] == "BELOW 3D"


def test_multi_pile_envelope_run_includes_struct_results_artifact():
    request = CalculationRequest(
        calcType="multi_pile_envelope",
        inputs={},
        loadCombinations=[],
        rulePack=RulePack(
            id="multi-pile-envelope",
            standardCode="MULTI_PILE",
            version="1",
            rules={},
        ),
        standardsRefs=[],
        payload={
            "pileGroupId": "PG1",
            "multiPile": _state(),
            "projectSpecifics": _project_specifics(),
        },
    )

    result = multi_pile_envelope.run(request)

    envelope = result.artifacts["multiPileEnvelope"]
    assert envelope["jointResults"]
    assert "structResults" in envelope
    assert "BP1" in envelope["structResults"]
    assert envelope["structResults"]["BP1"]["interaction"]["curve"]
    assert envelope["structResults"]["BP1"]["shear"]["Vu_capacity"] > 0
    assert envelope["structResults"]["BP1"]["reinforcementCompliance"]["summaryText"] == "OK"
