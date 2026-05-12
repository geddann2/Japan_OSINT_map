from flask import Flask, render_template
from dotenv import load_dotenv
from api.aircraft import get_aircraft
from api.earthquake import get_earthquake
from api.ship import get_ship, init_ship

load_dotenv()  # .envを読み込む

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/aircraft")
def aircraft():
    return get_aircraft()


@app.route("/api/earthquake")
def earthquake():
    return get_earthquake()

@app.route("/api/ship")
def ship():
    return get_ship()

init_ship()
app.run(debug=True)


if __name__ == "__main__":
    app.run(debug=True)
