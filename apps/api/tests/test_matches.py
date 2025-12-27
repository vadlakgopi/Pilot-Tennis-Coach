"""
Tests for match endpoints
"""
import pytest
from fastapi import status


def test_create_match(authenticated_client):
    """Test creating a match"""
    response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Test Match",
            "match_type": "singles",
            "player1_name": "Player 1",
            "player2_name": "Player 2",
            "event": "Test Tournament",
            "event_date": "2025-01-15T10:00:00Z",
            "bracket": "Quarter Final",
            "uploader_notes": "Test notes"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "Test Match"
    assert data["match_type"] == "singles"
    assert data["status"] == "uploading"
    assert data.get("event") == "Test Tournament"
    assert data.get("bracket") == "Quarter Final"
    assert "id" in data


def test_create_match_unauthorized(client):
    """Test creating match without authentication"""
    response = client.post(
        "/api/v1/matches",
        json={
            "title": "Test Match",
            "match_type": "singles"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_matches_empty(authenticated_client):
    """Test listing matches when none exist"""
    response = authenticated_client.get("/api/v1/matches")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_list_matches(authenticated_client):
    """Test listing matches"""
    # Create a match
    create_response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Match 1",
            "match_type": "singles"
        }
    )
    match_id = create_response.json()["id"]
    
    # List matches
    response = authenticated_client.get("/api/v1/matches")
    assert response.status_code == status.HTTP_200_OK
    matches = response.json()
    assert len(matches) == 1
    assert matches[0]["id"] == match_id
    assert matches[0]["title"] == "Match 1"


def test_list_matches_with_sorting(authenticated_client):
    """Test listing matches with sorting"""
    # Create matches
    authenticated_client.post(
        "/api/v1/matches",
        json={"title": "Match 1", "match_type": "singles", "event_date": "2025-01-15T10:00:00Z"}
    )
    authenticated_client.post(
        "/api/v1/matches",
        json={"title": "Match 2", "match_type": "singles", "event_date": "2025-01-20T10:00:00Z"}
    )
    
    # List matches sorted by event_date
    response = authenticated_client.get("/api/v1/matches?sort_by=event_date&sort_order=asc")
    assert response.status_code == status.HTTP_200_OK
    matches = response.json()
    assert len(matches) >= 2


def test_get_match(authenticated_client):
    """Test getting a specific match"""
    # Create a match
    create_response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Test Match",
            "match_type": "singles"
        }
    )
    match_id = create_response.json()["id"]
    
    # Get the match
    response = authenticated_client.get(f"/api/v1/matches/{match_id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == match_id
    assert data["title"] == "Test Match"


def test_get_match_not_found(authenticated_client):
    """Test getting a non-existent match"""
    response = authenticated_client.get("/api/v1/matches/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_match(authenticated_client):
    """Test deleting a match"""
    # Create a match
    create_response = authenticated_client.post(
        "/api/v1/matches",
        json={
            "title": "Match to Delete",
            "match_type": "singles"
        }
    )
    match_id = create_response.json()["id"]
    
    # Delete the match
    response = authenticated_client.delete(f"/api/v1/matches/{match_id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify it's deleted
    get_response = authenticated_client.get(f"/api/v1/matches/{match_id}")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


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
            "player1_name": "Updated Player 1",
            "event": "Updated Tournament",
            "bracket": "Semi Final"
        }
    )
    assert update_response.status_code == status.HTTP_200_OK
    data = update_response.json()
    assert data["player1_name"] == "Updated Player 1"
    assert data["event"] == "Updated Tournament"
    assert data["bracket"] == "Semi Final"


