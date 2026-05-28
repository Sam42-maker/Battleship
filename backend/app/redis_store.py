import redis
import json

# Host name 'redis' matches the service name in docker-compose
r = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# save_game is used to store the current state of the game, such as player boards and game progress, in Redis for state management during gameplay
def save_game(game_id, data):
    # save general game data to Redis
    r.set(f"game:{game_id}", json.dumps(data))

# get_game retrieves the game state from Redis using the game_id, allowing the application to maintain and access the current state of the game during gameplay
def get_game(game_id):
    data = r.get(f"game:{game_id}")
    return json.loads(data) if data else None

# === ADD THESE TWO NEW FUNCTIONS BELOW ===

# save_room is used to store the current state of a multiplayer room, including player information and game status, in Redis for real-time access during gameplay
def save_room(room_code, data):
    """Save multiplayer room session data to Redis"""
    # save room state under a Redis key
    r.set(f"room:{room_code}", json.dumps(data))

# get_room is used to retrieve the current state of a multiplayer room, such as player info and game status, for real-time updates during gameplay
def get_room(room_code):
    """Retrieve room status data from Redis"""
    data = r.get(f"room:{room_code}")
    return json.loads(data) if data else None

# delete_room is used to clear the room data from Redis when a game session ends or is reset
def delete_room(room_code):
    """Hapus room dari Redis agar kodenya kosong kembali"""
    r.delete(f"room:{room_code}")