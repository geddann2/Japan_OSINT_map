from flask import Flask, render_template
from dotenv import load_dotenv
from api.aircraft import get_aircraft, save_route, get_route
from api.earthquake import get_earthquake
from api.ship import get_ship, init_ship
from api.camera import get_camera, set_embed, report_embed_ng


import logging

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


load_dotenv()

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/aircraft")
def aircraft():
    return get_aircraft()
@app.route("/api/aircraft/route", methods=["GET"])
def aircraft_route_get():
    return get_route()

@app.route("/api/aircraft/route", methods=["POST"])
def aircraft_route_post():
    return save_route()

@app.route("/api/earthquake")
def earthquake():
    return get_earthquake()

@app.route("/api/ship")
def ship():
    return get_ship()

@app.route("/api/camera")
def camera():
    return get_camera()

@app.route("/api/camera/embed", methods=["POST"])
def camera_embed():
    return set_embed()


@app.route("/api/camera/embed_ng", methods=["POST"])
def camera_embed_ng():
    return report_embed_ng()



if __name__ == "__main__":
    init_ship()
    app.run(debug=True)