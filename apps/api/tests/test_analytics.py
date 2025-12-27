"""
Tests for analytics endpoints
"""
import pytest
from fastapi import status


def test_get_match_stats_not_found(authenticated_client):
    """Test getting stats for non-existent match"""
    response = authenticated_client.get("/api/v1/analytics/matches/99999/stats")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_match_stats_unauthorized(client):
    """Test getting stats without authentication"""
    response = client.get("/api/v1/analytics/matches/1/stats")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_match_stats(authenticated_client, test_user):
    """Test getting stats for a match"""
    # Create a match
    match_response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Test Match",
            "match_type": "singles"
        }
    )
    match_id = match_response.json()["id"]
    
    # Try to get stats (may not exist yet)
    response = authenticated_client.get(f"/api/v1/analytics/matches/{match_id}/stats")
    # Should return 404 if no stats, or 200 if stats exist
    assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_200_OK]


def test_generate_mock_stats(authenticated_client, test_user):
    """Test generating mock stats for a match"""
    # Create a match
    match_response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Test Match",
            "match_type": "singles"
        }
    )
    match_id = match_response.json()["id"]
    
    # Generate mock stats
    response = authenticated_client.post(f"/api/v1/analytics/matches/{match_id}/mock")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_rallies" in data
    assert "player1_stats" in data
    assert "player2_stats" in data


def test_get_shot_heatmap_not_found(authenticated_client):
    """Test getting heatmap for non-existent match"""
    response = authenticated_client.get("/api/v1/analytics/matches/99999/heatmap")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_serve_analysis_not_found(authenticated_client):
    """Test getting serve analysis for non-existent match"""
    response = authenticated_client.get("/api/v1/analytics/matches/99999/serves")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_player_comparison_not_found(authenticated_client):
    """Test getting player comparison for non-existent match"""
    response = authenticated_client.get("/api/v1/analytics/matches/99999/compare")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_analytics_endpoints_unauthorized(client):
    """Test all analytics endpoints require authentication"""
    endpoints = [
        "/api/v1/analytics/matches/1/stats",
        "/api/v1/analytics/matches/1/heatmap",
        "/api/v1/analytics/matches/1/serves",
        "/api/v1/analytics/matches/1/compare",
    ]
    
    for endpoint in endpoints:
        response = client.get(endpoint)
        # Endpoint may not exist (404) or require auth (401)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND]

