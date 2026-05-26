from flask import Blueprint, request, jsonify
from .redis_store import save_game 

routes_bp = Blueprint('routes', __name__)

@routes_bp.route('/save-board', methods=['POST'])
def save_board_to_redis():
    data = request.json
    player_id = data.get('player_id')  # get player id from request body
    board = data.get('board')  # get player board configuration

    if not player_id or not board:
        return jsonify({"status": "error", "message": "Incomplete data"}), 400

    # Save the player board to Redis for state management
    save_game(f"board:{player_id}", board)

    return jsonify({
        "status": "success", 
        "message": f"Board for {player_id} has been saved in Redis"
    })