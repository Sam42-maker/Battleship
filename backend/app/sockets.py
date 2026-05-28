from flask_socketio import emit, join_room, leave_room
from flask import request
from .rabbit_mq import publish_move
from .redis_store import get_room, save_room, delete_room
import json

def handle_socket_events(socketio):
    
    @socketio.on('create_or_join_room')
    def handle_create_or_join(data):
        raw_room_code = data.get('room_code') or data.get('code') # support both 'room_code' and 'code' for backward compatibility with older frontend versions
        room_code = raw_room_code.strip().upper() if raw_room_code else ''
        player_name = data.get('name')
        sid = request.sid

        if not room_code or not player_name:
            emit('room_error', {'message': 'Captain name and room code cannot be empty!'})
            return

        room_data = get_room(room_code)

        if not room_data:
            # create a new room as host
            room_data = {
                'room_code': room_code,
                'player1': {'sid': sid, 'name': player_name, 'ready': False},
                'player2': None,
                'status': 'waiting'
            }
            save_room(room_code, room_data)
            join_room(room_code)

            emit('room_status', {
                'role': 'host',
                'room_code': room_code,
                'player1': player_name,
                'player2': None
            })
        else:
            if room_data['player2'] is None:
                # add the second player and set ready-to-start status
                room_data['player2'] = {'sid': sid, 'name': player_name, 'ready': False}
                room_data['status'] = 'ready_to_start'
                save_room(room_code, room_data)
                join_room(room_code)

                emit('room_status', {
                    'room_code': room_code,
                    'player1': room_data['player1']['name'],
                    'player2': player_name,
                    'status': 'full'
                }, room=room_code)
            else:
                emit('room_error', {'message': '⚠️ Sorry, that room is already full!'})

    @socketio.on('start_battle')
    def handle_start_battle(data):
        room_code = data.get('room_code')
        if not room_code: room_code = data.get('code') # fallback to 'code' for backward compatibility with older frontend versions
        room_data = get_room(room_code)

        if room_data and room_data['player1']['sid'] == request.sid:
            if room_data['player2'] is not None:
                # start ship placement phase for both players
                emit('init_placement', {'room_code': room_code}, room=room_code)
            else:
                emit('room_error', {'message': 'Cannot start, Player 2 has not joined yet!'})

    # ==========================================
    # NEW LOGIC: MULTIPLAYER COMBAT SYNCHRONIZATION
    # ==========================================

    @socketio.on('player_ready_combat') # <-- Event name has been aligned with the frontend
    def handle_player_ready_combat(data):
        room_code = data.get('room_code')
        if not room_code: room_code = data.get('code') # fallback to 'code' for backward compatibility with older frontend versions
        room_data = get_room(room_code)
        
        if room_data:
            # mark the player who triggered the event as ready
            if room_data.get('player1') and room_data['player1'].get('sid') == request.sid: 
                room_data['player1']['ready'] = True
            elif room_data.get('player2') and room_data['player2'].get('sid') == request.sid: 
                room_data['player2']['ready'] = True
                
            save_room(room_code, room_data)
            
            # notify the opponent that we are ready
            emit('enemy_ready_status', {}, room=room_code, include_self=False)
            
            # if both players are ready, start multiplayer combat
            p1_ready = room_data.get('player1') and room_data['player1'].get('ready') == True
            p2_ready = room_data.get('player2') and room_data['player2'].get('ready') == True
            
            if p1_ready and p2_ready:
                emit('start_multiplayer_combat', {}, room=room_code)


    # handle_rejoin event is triggered when a player refreshes the page during a game session. This will allow them to rejoin the same Socket.IO room and continue receiving real-time updates without losing their game state.
    @socketio.on('rejoin_room')
    def handle_rejoin(data):
        room_code = data.get('room_code')
        if room_code:
            join_room(room_code)
            print(f"Player rejoined room {room_code} after refresh")

    # request_rematch event is triggered when a player clicks the "Play Again" button after a game ends. This will update the rematch status in Redis and notify both players about the rematch readiness. Once both players are ready, it will reset the game state and signal them to start placing ships again.
    @socketio.on('request_rematch')
    def handle_rematch(data):
        room_code = data.get('room_code')
        role = data.get('role')  # 'host' atau 'guest'
        
        if not room_code:
            return

        # Ambil data room dari Redis
        room_data = get_room(room_code)
        if not room_data:
            return

        # Inisialisasi status rematch di data room jika belum ada
        if 'rematch' not in room_data:
            room_data['rematch'] = {'host': False, 'guest': False}

        # Tandai player yang meminta rematch sebagai True
        if role == 'host':
            room_data['rematch']['host'] = True
        elif role == 'guest':
            room_data['rematch']['guest'] = True

        # Simpan kembali status terbaru ke Redis
        save_room(room_code, room_data)

        # Beritahu kedua player di dalam room mengenai status siap tanding ulang
        emit('rematch_status_update', {
            'hostReady': room_data['rematch']['host'],
            'guestReady': room_data['rematch']['guest']
        }, room=room_code)

        # Cek jika KEDUA player sudah menekan tombol PLAY AGAIN
        if room_data['rematch']['host'] and room_data['rematch']['guest']:
            # Reset status rematch di Redis untuk game berikutnya nanti
            room_data['rematch'] = {'host': False, 'guest': False}
            room_data['status'] = 'placement'
            save_room(room_code, room_data)

            # Kirim sinyal ke kedua frontend untuk masuk ke layar penempatan kapal lagi!
            emit('init_placement', {}, room=room_code)

    # player_quit_room event is triggered when a player leaves the room, either by clicking "Exit Room" or closing the browser tab. This will notify the opponent and clean up the room data in Redis.
    @socketio.on('player_quit_room')
    def handle_player_quit_room(data):
        room_code = data.get('room_code')
        # notify opponent in the same room that the player has quit, so they can be redirected back to the lobby or show a message
        emit('force_quit_lobby', {}, room=room_code, include_self=False)
        
        # destroy room data in Redis and leave the Socket.IO room to clean up resources
        if room_code:
            delete_room(room_code)
            leave_room(room_code)

    @socketio.on('fire_shot')
    def handle_shot(data):
        room_code = data.get('room_code')
        if not room_code: room_code = data.get('code')
        # forward shot target to opponent through socket
        if 'targets' in data and isinstance(data['targets'], list):
            emit('receive_shot', {'targets': data['targets']}, room=room_code, include_self=False)
        elif 'x' in data and 'y' in data:
            emit('receive_shot', {'targets': [{'x': data['x'], 'y': data['y']}]}, room=room_code, include_self=False)
        # log move to queue for audit / synchronization
        publish_move(data)

    @socketio.on('shot_result_report')
    def handle_shot_result_report(data):
        room_code = data.get('room_code')
        if not room_code: room_code = data.get('code')
        # send shot evaluation result back to the shooter
        emit('update_enemy_radar', {
            'hits': data.get('hits', []),
            'misses': data.get('misses', []),
            'sunkShips': data.get('sunkShips', []),
            'allSunk': data.get('allSunk', False)
        }, room=room_code, include_self=False)