function Timer(tickCb, newLapCb, clearCb, newSetCb) {
    this.countdownFrom = 0;
    this.sets = [
        {
            work: 5000,
            rest: 1000
        },
        {
            work: 5000,
            rest: 1000
        }
    ];
    this._tickCb = tickCb;
    this._newLapCb = newLapCb;
    this._clearCb = clearCb;
    this._newSetCb = newSetCb;
    this.reset();
}

Timer.prototype = {
    isCountdownTimer: function() {
        return this.countdownFrom !== 0 || this.sets.length > 0;
    },

    currentSet: function() {
        return this._currentSet + 1;
    },

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
            if (this._isStartCountdown) {
                return;
            }

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
        this._laps = [];
        this._currentSet = 0;
        this._setWorking = true;
        this._startCountdownLength = 3000;
    },

    startTimer: function() {
        var loop = function() {
            if (!this._isRunning) {
                return;
            }

            var delta = Math.floor((new Date().getTime() - this._startTime) / 1000) * 1000;
            this._currentTotal = delta;
            var starting = false;

            // Tick only once per second
            if (this._currentTotal - this._lastTick  >= 1000) {
                this._lastTick = this._currentTotal;

                var elapsed = this._elapsed();
                var isCountdown = this._isStartCountdown;

                if (this._isStartCountdown) {
                    elapsed = this._startCountdownLength - elapsed;

                    if (elapsed <= 0) {
                        this.reset();
                        this._isStartCountdown = false;
                        this._startTime = new Date().getTime();
                        elapsed = this.countdownFrom;
                        starting = true;
                    }
                }
                else {
                    if (this.sets.length > 0) {
                        var set = this.sets[this._currentSet];
                        elapsed = (this._setWorking ? set.work : set.rest) - elapsed;
                        if (elapsed <= 0) {
                            if (!this._setWorking) {
                                ++this._currentSet;
                                if (this._currentSet >= this.sets.length) {
                                    this.stopTimer();
                                }
                                else {
                                    this._newSetCb(this);
                                }
                            }
                            this._startTime = new Date().getTime();
                            this._runningTotal = this._currentTotal = 0;
                            this._lastTick = -9999;
                            this._setWorking = !this._setWorking;
                        }
                    } else if (this.countdownFrom !== 0) {
                        // Timer is counting down instead of up
                        elapsed = this.countdownFrom - elapsed;

                        if (elapsed <= 0) {
                            this.stopTimer();
                        }
                    } else {
                        // Wrap time if goes past 99:59
                        elapsed = elapsed % (100 * 60 * 1000);
                    }
                }
                this._tickCb(this, elapsed, isCountdown, starting);
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
    var lastTickTime = null;

    function pad(num, size) {
        var s = num + '';
        while (s.length < size) s = '0' + s;
        return s;
    }
    
    var lapElByIndex = function(index) {
        return document.getElementsByClassName('lap' + index)[0];
    };
    var renderTime = function(elapsed, format) {
        var min = pad(parseInt((elapsed / 1000) / 60, 10), 2);
        var sec = pad(parseInt(elapsed / 1000 % 60, 10), 2);
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
    var renderIntervals = function(timer) {
        document.getElementById('intervalCount').childNodes[0].nodeValue = timer.currentSet() + '/' + timer.sets.length;
    };
    var renderControls = function(timer) {
        var el = document.getElementById('startStop');
        var borderEl = document.getElementById('startStopBorder');
        if (!timer.isRunning()) {
            el.style.fill = '#00ff00';
            borderEl.style.stroke = '#00ff00';
        }
        else {
            el.style.fill = '#ff0000';
            borderEl.style.stroke = '#ff0000';
        }
    };
    var render = function(timer) {
        renderControls(timer);
        renderIntervals(timer);
    };

    var shortBeep = document.getElementById('shortBeep');
    var longBeep = document.getElementById('longBeep');
    var tickCb = function(timer, elapsed, isStartCountdown, starting) {
        lastTickTime = elapsed;

        if (!selectedLap) {
            var format = 'MM:SS';
            if (isStartCountdown) {
                format = 'SS';
            }

            // Starting countdown or countdown timer and reached the end of the timer
            // then beep
            if (isStartCountdown || timer.isCountdownTimer()) {
                if (elapsed > 0 && elapsed <= 3000) {
                    //shortBeep.play();
                }
            }

            if (starting || (timer.isCountdownTimer() && elapsed <= 0)) {
                //longBeep.play();
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
        render(timer);
        selectedLap = null;
    };
    var newSetCb = function(timer) {
        renderIntervals(timer);
    };

    var timer = new Timer(tickCb, newLapCb, clearCb, newSetCb);
    //TODO: Remove
    render(timer);

    var byId = document.getElementById.bind(document);
    byId('lapReset').addEventListener('click', function() {
        timer.lapResetTimer();
    });
    byId('startStop').addEventListener('click', function() {
        // On iOS you can't play back sounds unless it comes from a user
        // action first, so pretend to play the sound in this callback so
        // that it actually plays in the timer countdown later on
        shortBeep.play();
        shortBeep.pause();
        shortBeep.currentTime = 0;
        longBeep.play();
        longBeep.pause();
        longBeep.currentTime = 0;

        timer.toggleTimer();
        render(timer);
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
