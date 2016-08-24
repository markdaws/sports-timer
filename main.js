function Util() {}

Util.pad = function(num, size) {
    var s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
};

function Timer(tickCb, newLapCb, clearCb) {
    this._tickCb = tickCb;
    this._newLapCb = newLapCb;
    this._clearCb = clearCb;
    this.reset();
}

Timer.prototype = {
    _elapsed: function() {
        return this._runningTotal + this._currentTotal;
    },

    toggleTimer: function() {
        if (this._isRunning) {
            this.stopTimer();
        }
        else {
            this.startTimer();
        }
    },

    lapResetTimer: function() {
        if (this._isRunning) {
            if (this._laps.length === 10) {
                return;
            }

            var currentTotal = this._runningTotal + this._currentTotal;
            this._laps.push({
                time: currentTotal - this._lastLap
            });
            this._lastLap = currentTotal;
            this._newLapCb(this);
        }
        else {
            this.reset();
            this._clearCb(this);
        }
    },

    reset: function() {
        this._isStartCountdown = true;
        this._lastLap = 0;
        this._lastTick = -9999;
        this._startTime = null;
        this._runningTotal = 0;
        this._currentTotal = 0;
        this._lastTimestamp = -1;
        this._laps = [];
    },

    startTimer: function() {
        var loop = function() {
            if (!this._isRunning) {
                return;
            }

            var delta = new Date().getTime() - this._startTime;
            this._currentTotal = delta;

            // Tick only once per second
            if (this._currentTotal - this._lastTick  > 1000) {
                this._lastTick = this._currentTotal;

                var elapsed = this._elapsed();
                var isCountdown = this._isStartCountdown;
                if (this._isStartCountdown) {
                    elapsed = 11000 - elapsed;

                    if (elapsed < 1000) {
                        this.reset();
                        this._isStartCountdown = false;
                        this._startTime = new Date().getTime();
                        elapsed = 0;
                    }
                }

                // Wrap time if goes past 99:59
                if (elapsed >= 100 * 60 * 1000) {
                    elapsed -= 100 * 60 * 1000;
                }
                this._tickCb(this, elapsed, isCountdown);
            }
            setTimeout(loop, 100);
        }.bind(this);

        this._isRunning = true;
        this._startTime = new Date().getTime();
        setTimeout(loop, 100);
    },

    stopTimer: function() {
        this._runningTotal += this._currentTotal;

        this._isRunning = false;
        this._startTime = null;
        this._currentTotal = 0;
        this._lastTick = -9999;
    },

    laps: function() {
        return this._laps;
    },

    isRunning: function() {
        return this._isRunning;
    }
};

(function() {

    var selectedLap = null;
    var isCountdown = true;
    var lastTickTime = null;

    var lapElByIndex = function(index) {
        return document.getElementsByClassName('lap' + index)[0];
    };
    var renderTime = function(elapsed, format) {
        var min = Util.pad(parseInt((elapsed / 1000) / 60, 10), 2);
        var sec = Util.pad(parseInt(elapsed / 1000 % 60, 10), 2);
        var el = document.getElementsByClassName('time')[0];

        if (!format) {
            format = 'MM:SS';
        }

        switch (format) {
        case 'MM:SS':
            el.innerText = min + ':' + sec;
            break;

        case 'SS':
            el.innerText = sec;
            break;
        }
    };

    var shortBeep = document.getElementById('shortBeep');
    var longBeep = document.getElementById('longBeep');
    var tickCb = function(timer, elapsed, isStartCountdown) {
        lastTickTime = elapsed;

        if (!selectedLap) {
            var format = 'MM:SS';
            if (isStartCountdown) {
                format = 'SS';

                if (elapsed <= 0) {
                    longBeep.play();
                }
                else if (elapsed <= 4000) {
                    shortBeep.play();
                }
            }
            renderTime(elapsed, format);
        }
    };
    var newLapCb = function(timer) {
        var i = timer.laps().length - 1;
        lapElByIndex(i).classList.remove('hidden');
    };
    var clearCb = function(timer) {
        var i;
        for (i=0; i<10; ++i) {
            lapElByIndex(i).classList.add('hidden');
        }
        for (i=0; i<10; ++i) {
            lapElByIndex(i).classList.remove('lapSelected');
        }
        renderTime(0);
        selectedLap = null;
        isCountdown = true;
    };

    var timer = new Timer(tickCb, newLapCb, clearCb);

    var byId = document.getElementById.bind(document);
    byId('lapReset').addEventListener('click', function() {
        timer.lapResetTimer();
    });
    byId('startStop').addEventListener('click', function() {
        var el = document.getElementById('startStop');
        var borderEl = document.getElementById('startStopBorder');
        if (timer.isRunning()) {
            el.style.fill = '#00ff00';
            borderEl.style.stroke = '#00ff00';
        }
        else {
            el.style.fill = '#ff0000';
            borderEl.style.stroke = '#ff0000';
        }
        timer.toggleTimer();
    });
    byId('laps').addEventListener('click', function(evt) {
        for (var i=0; i<10; ++i) {
            lapElByIndex(i).classList.remove('lapSelected');
        }

        var lapEl = evt.target;
        lapEl.classList.add('lapSelected');
        if (selectedLap == evt.target) {
            lapEl.classList.remove('lapSelected');
            selectedLap = null;
            renderTime(lastTickTime);
        }
        else {
            selectedLap = lapEl;
            var lap = timer.laps()[parseInt(lapEl.getAttribute('data-lap'), 10)];
            renderTime(lap.time);
        }
    });
})();
