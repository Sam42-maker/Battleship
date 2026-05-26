# rabbit_mq.py
# - Provides RabbitMQ helper to publish multiplayer move data
# - publish_move: send shot data to battleship_moves queue
import pika
import json

def publish_move(move_data):
    try:
        # open connection to RabbitMQ service
        connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
        channel = connection.channel()
        channel.queue_declare(queue='battleship_moves')
        
        # send move event to the battleship_moves queue
        channel.basic_publish(
            exchange='',
            routing_key='battleship_moves',
            body=json.dumps(move_data)
        )
        connection.close()
    except Exception as e:
        # log if communication failure occurs
        print(f"Error RabbitMQ: {e}")