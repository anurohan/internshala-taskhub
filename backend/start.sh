#!/bin/bash
# Start the RQ worker in the background
python worker.py &
# Start the Gunicorn server
gunicorn run:app -w 2 -b 0.0.0.0:$PORT
