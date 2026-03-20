"""Integration tests exercising the FastAPI endpoints end-to-end."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_health(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


async def test_pile_group_full_run(client: AsyncClient):
    """2×2 grid, two load combos, with design checks."""
    payload = {
        "calcType": "pile_group",
        "inputs": {
            "grid_nx": {"value": 2, "unit": "count", "label": "Grid columns"},
            "grid_ny": {"value": 2, "unit": "count", "label": "Grid rows"},
            "grid_spacing_x": {"value": 3.0, "unit": "m", "label": "Spacing X"},
            "grid_spacing_y": {"value": 3.0, "unit": "m", "label": "Spacing Y"},
            "pile_diameter": {"value": 0.6, "unit": "m", "label": "Diameter"},
            "pile_length": {"value": 15.0, "unit": "m", "label": "Length"},
            "lc_DL_N": {"value": 2000000, "unit": "N", "label": "DL axial"},
            "lc_DL_Mx": {"value": 100000, "unit": "N·m", "label": "DL Mx"},
            "lc_LL_N": {"value": 800000, "unit": "N", "label": "LL axial"},
            "compression_capacity": {"value": 3000000, "unit": "N", "label": "Ult compression"},
            "tension_capacity": {"value": 1500000, "unit": "N", "label": "Ult tension"},
            "lateral_capacity": {"value": 500000, "unit": "N", "label": "Ult lateral"},
        },
        "loadCombinations": [
            {
                "id": "c1",
                "name": "1.35G",
                "limitState": "strength",
                "factors": [{"loadCaseId": "DL", "factor": 1.35, "source": "Table 4.1"}],
                "clauseRef": "Cl 4.2.1",
            },
            {
                "id": "c2",
                "name": "1.2G + 1.5Q",
                "limitState": "strength",
                "factors": [
                    {"loadCaseId": "DL", "factor": 1.2, "source": "Table 4.1"},
                    {"loadCaseId": "LL", "factor": 1.5, "source": "Table 4.1"},
                ],
                "clauseRef": "Cl 4.2.2",
            },
        ],
        "rulePack": {
            "id": "rp-1",
            "standardCode": "AS 2159",
            "version": "2009",
            "rules": {
                "phi_g_compression": {
                    "clauseRef": "Cl 4.3.1",
                    "description": "Geotechnical compression reduction factor",
                    "value": 0.5,
                },
                "phi_g_tension": {
                    "clauseRef": "Cl 4.3.2",
                    "description": "Geotechnical tension reduction factor",
                    "value": 0.5,
                },
                "phi_g_lateral": {
                    "clauseRef": "Cl 4.3.3",
                    "description": "Geotechnical lateral reduction factor",
                    "value": 0.5,
                },
            },
        },
        "standardsRefs": [{"code": "AS 2159", "edition": "2009"}],
    }

    res = await client.post("/api/v1/calculations/run", json=payload)
    assert res.status_code == 200

    data = res.json()
    assert data["requestHash"]
    assert len(data["errors"]) == 0
    assert data["governingCase"] is not None
    assert data["durationMs"] > 0
    assert "pile_1_max_compression" in data["outputs"]
    assert "pile_4_max_compression" in data["outputs"]
    assert data["outputs"]["num_piles"]["value"] == 4
    assert data["outputs"]["num_combinations"]["value"] == 2
    assert len(data["designChecks"]) > 0
    assert len(data["assumptions"]) > 0
    assert len(data["steps"]) > 0

    for dc in data["designChecks"]:
        assert dc["utilisationRatio"] >= 0
        assert dc["status"] in ("pass", "warning", "fail")
        assert dc["reserveCapacity"] is not None


async def test_pile_group_validation_missing_load_case(client: AsyncClient):
    payload = {
        "calcType": "pile_group",
        "inputs": {
            "grid_nx": {"value": 2, "unit": "count", "label": "nx"},
            "grid_ny": {"value": 2, "unit": "count", "label": "ny"},
            "grid_spacing_x": {"value": 3.0, "unit": "m", "label": "sx"},
            "grid_spacing_y": {"value": 3.0, "unit": "m", "label": "sy"},
            "lc_DL_N": {"value": 1000, "unit": "N", "label": "DL N"},
        },
        "loadCombinations": [
            {
                "id": "c1",
                "name": "Bad combo",
                "limitState": "strength",
                "factors": [{"loadCaseId": "NONEXIST", "factor": 1.0, "source": "test"}],
                "clauseRef": "Cl 1",
            },
        ],
        "rulePack": {
            "id": "rp",
            "standardCode": "test",
            "version": "1",
            "rules": {"r": {"clauseRef": "Cl 1", "description": "t", "value": 1.0}},
        },
        "standardsRefs": [{"code": "test", "edition": "1"}],
    }

    res = await client.post("/api/v1/calculations/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert any(e["code"] == "MISSING_LOAD_CASE" for e in data["errors"])


async def test_unimplemented_calc_type(client: AsyncClient):
    payload = {
        "calcType": "pile_capacity",
        "inputs": {"d": {"value": 0.6, "unit": "m", "label": "d"}},
        "loadCombinations": [],
        "rulePack": {
            "id": "rp",
            "standardCode": "test",
            "version": "1",
            "rules": {"r": {"clauseRef": "Cl 1", "description": "t", "value": 1.0}},
        },
        "standardsRefs": [{"code": "test", "edition": "1"}],
    }
    res = await client.post("/api/v1/calculations/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert any(e["code"] == "CALC_TYPE_NOT_IMPLEMENTED" for e in data["errors"])


async def test_pile_group_no_layout_returns_error(client: AsyncClient):
    payload = {
        "calcType": "pile_group",
        "inputs": {"lc_DL_N": {"value": 1000, "unit": "N", "label": "N"}},
        "loadCombinations": [
            {
                "id": "c1",
                "name": "test",
                "limitState": "strength",
                "factors": [{"loadCaseId": "DL", "factor": 1.0, "source": "t"}],
                "clauseRef": "Cl 1",
            },
        ],
        "rulePack": {
            "id": "rp",
            "standardCode": "test",
            "version": "1",
            "rules": {"r": {"clauseRef": "Cl 1", "description": "t", "value": 1.0}},
        },
        "standardsRefs": [{"code": "test", "edition": "1"}],
    }
    res = await client.post("/api/v1/calculations/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert any(e["code"] == "NO_LAYOUT" for e in data["errors"])


async def test_pile_group_explicit_layout(client: AsyncClient):
    """Triangle layout with explicit coordinates."""
    payload = {
        "calcType": "pile_group",
        "inputs": {
            "pile_count": {"value": 3, "unit": "count", "label": "Pile count"},
            "pile_1_x": {"value": 0.0, "unit": "m", "label": "P1 X"},
            "pile_1_y": {"value": 1.732, "unit": "m", "label": "P1 Y"},
            "pile_2_x": {"value": -1.5, "unit": "m", "label": "P2 X"},
            "pile_2_y": {"value": -0.866, "unit": "m", "label": "P2 Y"},
            "pile_3_x": {"value": 1.5, "unit": "m", "label": "P3 X"},
            "pile_3_y": {"value": -0.866, "unit": "m", "label": "P3 Y"},
            "lc_DL_N": {"value": 3000, "unit": "N", "label": "DL axial"},
        },
        "loadCombinations": [
            {
                "id": "c1",
                "name": "1.0G",
                "limitState": "strength",
                "factors": [{"loadCaseId": "DL", "factor": 1.0, "source": "test"}],
                "clauseRef": "Cl 1",
            },
        ],
        "rulePack": {
            "id": "rp",
            "standardCode": "test",
            "version": "1",
            "rules": {"r": {"clauseRef": "Cl 1", "description": "t", "value": 1.0}},
        },
        "standardsRefs": [{"code": "test", "edition": "1"}],
    }

    res = await client.post("/api/v1/calculations/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["errors"]) == 0
    assert data["outputs"]["num_piles"]["value"] == 3
    assert "pile_1_max_compression" in data["outputs"]
