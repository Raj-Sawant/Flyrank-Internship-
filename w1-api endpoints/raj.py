from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allows browser requests from any origin

# Sample data
messages = [
    {"id": 1, "sender": "alice@example.com", "subject": "Hello", "body": "Welcome!"},
    {"id": 2, "sender": "bob@example.com", "subject": "Meeting", "body": "Tomorrow at 2pm"},
]

@app.route('/api/messages', methods=['GET'])
def get_messages():
    return jsonify(messages)

@app.route('/api/messages/<int:msg_id>', methods=['GET'])
def get_message(msg_id):
    msg = next((m for m in messages if m["id"] == msg_id), None)
    return jsonify(msg) if msg else ("Not found", 404)

if __name__ == '__main__':
    app.run(port=5000, debug=True)