
from flask_socketio import emit, join_room, leave_room
from flask import request
from .rabbit_mq import publish_move
from .redis_store import get_room, save_room
import json

def handle_socket_events(socketio):
    
    @socketio.on('create_or_join_room')
    def handle_create_or_join(data):
        room_code = data.get('room_code').strip().upper()
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

    # found this logic is missing in the current codebase, so I added it to handle rematch synchronization between players after a game ends
    @socketio.on('player_ready_rematch') # sychronize rematch readiness between players
    def handle_rematch(data):
        room_code = data.get('room_code')
        role = data.get('role')
        room_data = get_room(room_code)
        if room_data:
            if 'rematch' not in room_data: 
                room_data['rematch'] = {'hostReady': False, 'guestReady': False}
            
            if role == 'host': 
                room_data['rematch']['hostReady'] = True
            elif role == 'guest': 
                room_data['rematch']['guestReady'] = True
            
            save_room(room_code, room_data)
            emit('rematch_update', room_data['rematch'], room=room_code)

            if room_data['rematch']['hostReady'] and room_data['rematch']['guestReady']:
                # 1. Reset the rematch status in the room data for both players so it can be used for the next game
                room_data['rematch'] = {'hostReady': False, 'guestReady': False}
                
                # 2. Reset status ready The formation of the two players becomes a false
                room_data['player1']['ready'] = False
                if room_data['player2']:
                    room_data['player2']['ready'] = False
                
                room_data['status'] = 'placement'
                save_room(room_code, room_data)
                
                # 3. Send a signal to all players in that room to enter the placement phase again
                emit('init_placement', {}, room=room_code)

    @socketio.on('player_quit_room')
    def handle_player_quit_room(data):
        room_code = data.get('room_code')
        emit('force_quit_lobby', {}, room=room_code, include_self=False)

    @socketio.on('fire_shot')
    def handle_shot(data):
        room_code = data.get('room_code')
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
        # send shot evaluation result back to the shooter
        emit('update_enemy_radar', {
            'hits': data.get('hits', []),
            'misses': data.get('misses', []),
            'sunkShips': data.get('sunkShips', []),
            'allSunk': data.get('allSunk', False)
        }, room=room_code, include_self=False)