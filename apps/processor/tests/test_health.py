"""
Health endpoint tests for CA Copilot backend.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope='module')
def client():
    from api.app import create_app
    app = create_app()
    return TestClient(app)


class TestHealthEndpoints:
    def test_health_check_ok(self, client):
        resp = client.get('/health')
        assert resp.status_code == 200
        data = resp.json()
        assert data['service'] == 'ca-copilot-processor'
        assert 'uptime_seconds' in data
        assert 'database' in data
        assert 'version' in data

    def test_health_ping(self, client):
        resp = client.get('/health/ping')
        assert resp.status_code == 200
        data = resp.json()
        assert data['pong'] is True
        assert 'ts' in data

    def test_health_database_field(self, client):
        resp = client.get('/health')
        db = resp.json()['database']
        assert 'status' in db
        assert db['status'] in ('connected', 'error')
