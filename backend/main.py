from flask import Flask
from flask_cors import CORS 
from flask_socketio import SocketIO
from app.routes import routes_bp
from app.sockets import handle_socket_events
app = Flask(__name__)
CORS(app) 

app.register_blueprint(routes_bp)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

handle_socket_events(socketio)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)