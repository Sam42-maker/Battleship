import redis
import json

# Host name 'redis' matches the service name in docker-compose
r = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

def save_game(game_id, data):
    # save general game data to Redis
    r.set(f"game:{game_id}", json.dumps(data))

def get_game(game_id):
    data = r.get(f"game:{game_id}")
    return json.loads(data) if data else None

# === ADD THESE TWO NEW FUNCTIONS BELOW ===

def save_room(room_code, data):
    """Save multiplayer room session data to Redis"""
    # save room state under a Redis key
    r.set(f"room:{room_code}", json.dumps(data))

def get_room(room_code):
    """Retrieve room status data from Redis"""
    data = r.get(f"room:{room_code}")
    return json.loads(data) if data else None