(function(){
  var INIT =      10 * 1000,
      MIN  =       1 * 1000,
      MAX  = 10 * 60 * 1000
      ;

  function ExponentialBackoff(init, min, max) {
    this.init = init || INIT;
    this.min  = min  || MIN;
    this.max  = max  || MAX;
    this.reset();
  }

  ExponentialBackoff.prototype.reset = function() {
    this.t = -1;
    this.maxReached = false;
  };

  ExponentialBackoff.prototype.nextDelay = function() {
    var delay;

    if (this.maxReached) {
      return this.max;
    }
    if (this.t === -1) {
      delay = this.min;
      this.t = this.init;
    } else {
      delay = Math.round(this.t + this.t * Math.random());
      this.t = this.t * 2;
    }
    if (this.t > this.max) {
      this.maxReached = true;
    }
    return delay;
  };

  ExponentialBackoff.prototype.setTime = function(init) {
    this.init = init;
  };

  ExponentialBackoff.prototype.setMin = function(min) {
    this.min = min;
  };

  ExponentialBackoff.prototype.setMax = function(max) {
    this.max = max;
  };


  var interval = new ExponentialBackoff();
  module.exports = interval;
})();
