var T   = 10 * 1000,
    MIN = 1 * 1000,
    MAX = 10 * 60 * 1000
    ;

function ExponentialBackoff() {
  this.reset();
}

ExponentialBackoff.prototype.reset = function() {
  this.t = -1;
  this.maxReached = false;
};

ExponentialBackoff.prototype.nextDelay = function() {
  var delay;

  if (this.maxReached) {
    return ExponentialBackoff.MAX;
  }
  if (this.t === -1) {
    delay = MIN;
    this.t = T;
  } else {
    delay = Math.round(this.t + this.t * Math.random());
    this.t = this.t * 2;
  }
  if (this.t > MAX) {
    this.maxReached = true;
  }
  return delay;
};

var interval = new ExponentialBackoff();
module.exports = interval;
