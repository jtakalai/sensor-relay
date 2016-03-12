var argv = require("yargs").argv
var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var socket = require("net").Socket();
var restler = require("restler");
var _ = require("lodash")

function invalid_arguments() {
  console.log("Usage: bin/www <ip> <port> [<parameter> <parameter> ...]")
  process.exit(1)
}

var parameterNames = ["loggingTime", "loggingSample", "identifierForVendor", "deviceID", "locationTimestamp_since1970", "locationLatitude", "locationLongitude", "locationAltitude", "locationSpeed", "locationCourse", "locationVerticalAccuracy", "locationHorizontalAccuracy", "locationFloor", "locationHeadingTimestamp_since1970", "locationHeadingX", "locationHeadingY", "locationHeadingZ", "locationTrueHeading", "locationMagneticHeading", "locationHeadingAccuracy", "accelerometerTimestamp_sinceReboot", "accelerometerAccelerationX", "accelerometeraccelerationY", "accelerometeraccelerationZ", "gyroTimestamp_sinceReboot", "gyroRotationX", "gyroRotationY", "gyroRotationZ", "motionTimestamp_sinceReboot", "motionYaw", "motionRoll", "motionPitch", "motionRotationRateX", "motionRotationRateY", "motionRotationRateZ", "motionUserAccelerationX", "motionUserAccelerationY", "motionUserAccelerationZ", "motionAttitudeReferenceFrame", "motionQuaternionX", "motionQuaternionY", "motionQuaternionZ", "motionQuaternionW", "motionGravityX", "motionGravityY", "motionGravityZ", "motionMagneticFieldX", "motionMagneticFieldY", "motionMagneticFieldZ", "motionMagneticFieldCalibrationAccuracy", "activityTimestamp_sinceReboot", "activity", "activityConfidence", "activityStartDate", "pedometerStartDate", "pedometerNumberofSteps", "pedometerDistance", "pedometerFloorAscended", "pedometerFloorDescended", "pedometerEndDate", "altimeterTimestamp_sinceReboot", "altimeterReset", "altimeterRelativeAltitude", "altimeterPressure", "IP_en0", "IP_pdp_ip0", "deviceOrientation", "batteryState", "batteryLevel", "state"]
var defaultParams = [
  "gyroRotationX", "gyroRotationY", "gyroRotationZ",
  "accelerometerAccelerationX", "accelerometerAccelerationX", "accelerometerAccelerationX",
  "motionYaw", "motionRoll", "motionPitch",
  "motionUserAccelerationX", "motionUserAccelerationY", "motionUserAccelerationZ",
  "activity", "activityConfidence",
  "pedometerNumberofSteps", "pedometerDistance"
]
var maxErrors = 3

// open socket to phone
if (argv._.length < 2) { invalid_arguments() }
var ip = argv._[0]
var port = +argv._[1]
if (!port) { invalid_arguments() }
var wantedParams = argv._.length > 2 ? argv._.slice(2) : defaultParams
socket.connect(port, ip);
console.log("Opened connection to " + ip + ":" + port + ", relaying " + wantedParams.length + " parameters: " + wantedParams.join(", "))

// listen to phone and send to streamr
var consecutiveErrors = 0
socket.on("data", function(csvBuffer) {
  process.stdout.write(":")
  var list = csvBuffer.toString().split(",")

  // first message is a list of names: loggingTime,deviceID,locationTimestamp_since1970,... (70 in total)
  // NOT ALWAYS! Solution, hard-coded, see above
  /*if (!parameterNames) {
    parameterNames = list
    return
  }*/

  // filter input, convert to numbers if possible
  var input = _.zipObject(parameterNames, list)
  var message = _(input).pick(wantedParams)
                        .pickBy(function(data, param) { return data !== "null" })
                        .mapValues(function(data) { return _.isNaN(+data) ? data : +data })

  restler.post("http://localhost:8080/json", {
    headers: {
      Stream: "Cr-65bXmR5iQVlAauFYiQA",   // sensor
      Auth: "bR4SBaD3TdSpee_6-jBm7g",
      //Timestamp: +input.locationHeadingTimestamp_since1970
    },
    data: JSON.stringify(message)
  })/*.on("complete", function(result, response) {
    console.log(result)//, response.statusCode)
  })*/.on("success", function(result, response) {
    process.stdout.write("" + response.statusCode)
    consecutiveErrors = 0
  }).on("fail", function(data, response) {
    console.error(response.statusCode, response.statusMessage, response.headers, data)
    if (maxErrors >= ++consecutiveErrors) {
      process.exit(0)
    }
  })
});




var routes = require("./routes/index");
var users = require("./routes/users");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", routes);
app.use("/users", users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {}
  });
});


module.exports = app;
