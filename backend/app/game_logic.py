# game_logic.py
# - Manage the basic Battleship game logic
# - generate_bot_board: create an automatic bot board for the strategy phase
# - bot_shoot: choose bot shot coordinates for the combat phase
import random

class BattleshipLogic:
    def __init__(self):
        self.ships = {"Carrier": 5, "Battleship": 4, "Cruiser": 3, "Submarine": 3, "Patrol Boat": 2}

    def generate_bot_board(self):
        """Generate bot board automatically (Strategy Phase)"""
        board = [[0]*10 for _ in range(10)]  # initialize empty 10x10 board
        for ship, size in self.ships.items():
            placed = False
            while not placed:
                orientation = random.choice(['H', 'V'])  # choose ship orientation
                x, y = random.randint(0, 9), random.randint(0, 9)  # random position
                
                # check if ship fits and does not overlap another ship
                if orientation == 'H' and y + size <= 10:
                    if all(board[x][y+i] == 0 for i in range(size)):
                        for i in range(size): board[x][y+i] = 1
                        placed = True
                elif orientation == 'V' and x + size <= 10:
                    if all(board[x+i][y] == 0 for i in range(size)):
                        for i in range(size): board[x+i][y] = 1
                        placed = True
        return board  # return bot board with ships placed

    def bot_shoot(self, player_board):
        """Bot selects a shot (Combat Phase)"""
        while True:
            x, y = random.randint(0, 9), random.randint(0, 9)
            # choose a random coordinate that hasn't been shot before
            if player_board[x][y] not in [2, 3]: # not shot before
                return x, y