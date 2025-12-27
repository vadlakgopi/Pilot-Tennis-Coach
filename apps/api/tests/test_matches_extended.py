"""
Extended tests for match endpoints - additional scenarios
"""
import pytest
from fastapi import status


def test_create_match_missing_title(authenticated_client):
    """Test creating match without title"""
    response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "match_type": "singles"
        }
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_create_match_invalid_type(authenticated_client):
    """Test creating match with invalid match type"""
    response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Test Match",
            "match_type": "invalid_type"
        }
    )
    # Should validate match_type enum
    assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_400_BAD_REQUEST]


def test_update_match(authenticated_client):
    """Test updating a match"""
    # Create a match
    create_response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Original Title",
            "match_type": "singles"
        }
    )
    match_id = create_response.json()["id"]
    
    # Update the match
    update_response = authenticated_client.put(
        f"/api/v1/matches/{match_id}",
        json={
            "title": "Updated Title",
            "match_type": "doubles"
        }
    )
    # Should return 200 or 204
    assert update_response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]


def test_update_match_not_found(authenticated_client):
    """Test updating non-existent match"""
    response = authenticated_client.put(
        "/api/v1/matches/99999",
        json={
            "title": "Updated Title"
        }
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_match_unauthorized(client):
    """Test updating match without authentication"""
    response = client.put(
        "/api/v1/matches/1",
        json={
            "title": "Updated Title"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_delete_match_unauthorized(client):
    """Test deleting match without authentication"""
    response = client.delete("/api/v1/matches/1")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_delete_match_not_found(authenticated_client):
    """Test deleting non-existent match"""
    response = authenticated_client.delete("/api/v1/matches/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_list_matches_with_pagination(authenticated_client):
    """Test listing matches with pagination parameters"""
    # Create multiple matches
    for i in range(3):
        authenticated_client.post(
            "/api/v1/matches",
            json={
                "title": f"Match {i+1}",
                "match_type": "singles"
            }
        )
    
    # List with pagination
    response = authenticated_client.get("/api/v1/matches/?skip=0&limit=2")
    assert response.status_code == status.HTTP_200_OK
    matches = response.json()
    assert len(matches) <= 2


def test_get_match_with_relations(authenticated_client):
    """Test getting match with related data (videos, stats)"""
    # Create a match
    create_response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Test Match",
            "match_type": "singles"
        }
    )
    match_id = create_response.json()["id"]
    
    # Get match
    response = authenticated_client.get(f"/api/v1/matches/{match_id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    # Check if related fields exist (may be empty)
    assert "videos" in data or "status" in data




