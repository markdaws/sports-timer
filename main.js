function Util() {}

Util.requestAnimFrame = (function() {
    var anim = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element){
            window.setTimeout(callback, 1000 / 60);
        };
    return function(args) {
        anim.call(window, args);
    };
})();

Util.pad = function(num, size) {
    var s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
};

function Timer(tickCb, newLapCb, clearCb) {
    this._tickCb = tickCb;
    this._newLapCb = newLapCb;
    this._clearCb = clearCb;
    this._startTime = null;
    this._isRunning = false;
    this._runningTotal = 0;
    this._currentTotal = 0;
    this._lastLap = 0;
    this.laps = [];
}

Timer.prototype = {
    toggleTimer: function() {
        var isRunning = false;
        return function() {
            var el = document.getElementById('startStop');
            var borderEl = document.getElementById('startStopBorder');
            if (isRunning) {
                el.style.fill = '#00ff00';
                borderEl.style.stroke = '#00ff00';
                this.stopTimer();
            }
            else {
                el.style.fill = '#ff0000';
                borderEl.style.stroke = '#ff0000';
                this.startTimer();
            }
            isRunning = !isRunning;
        };
    }(),

    lapResetTimer: function() {
        if (this._isRunning) {
            var currentTotal = this._runningTotal + this._currentTotal;
            this.laps.push({
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
        this._startTime = null;
        this._runningTotal = 0;
        this._currentTotal = 0;
        this.laps = [];
    },

    startTimer: function() {
        function loop(timestamp) {
            if (!this._isRunning) {
                return;
            }

            if (!this._startTime) {
                this._startTime = timestamp;
            }

            var delta = timestamp - this._startTime;
            this._currentTotal = delta;
            this._tickCb(this);
            Util.requestAnimFrame(loop.bind(this));
        }
        this._isRunning = true;
        Util.requestAnimFrame(loop.bind(this));
    },

    stopTimer: function() {
        this._isRunning = false;
        this._startTime = null;
        this._runningTotal += this._currentTotal;
        this._currentTotal = 0;
    },

    getElapsed: function() {
        return this._runningTotal + this._currentTotal;
    }
};

(function() {

    var selectedLap = null;
    var isCountdown = true;

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
        }
    };

    var tickCb = function(timer) {
        if (!selectedLap) {

            var elapsed = timer.getElapsed();
            var format = 'MM:SS';
            if (isCountdown) {
                format = 'SS';

                // Counting down from 10
                if (elapsed > 10000) {
                    isCountdown = false;
                    elapsed = elapsed - 10000;
                    timer.reset();
                }
                else {
                    //11000 so that 10 shows for 1 second
                    elapsed = 11000 - elapsed;
                }
            }
            renderTime(elapsed, format);
        }
    };
    var newLapCb = function(timer) {
        var i = timer.laps.length - 1;
        lapElByIndex(i).classList.remove('hidden');
    };
    var clearCb = function(timer) {
        for (var i=0; i<10; ++i) {
            lapElByIndex(i).classList.add('hidden');
        }
        for (var i=0; i<10; ++i) {
            lapElByIndex(i).classList.remove('lapSelected');
        }
        selectedLap = null;
        isCountdown = true;
    };

    var timer = new Timer(tickCb, newLapCb, clearCb);

    var byId = document.getElementById.bind(document);
    byId('lapReset').addEventListener('click', function() {
        timer.lapResetTimer();
        if (!selectedLap) {
            renderTime(0);
        }
    });
    byId('startStop').addEventListener('click', function() {
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
            renderTime(timer.getElapsed());
        }
        else {
            selectedLap = lapEl;
            var lap = timer.laps[parseInt(lapEl.getAttribute('data-lap'), 10)];
            renderTime(lap.time);
        }
    });
})();
