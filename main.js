'use strict';

(function() {

    function byId(id) {
        return document.getElementById(id);
    }

    function minSecToMS(min, sec) {
        return min * 60 * 1000 + sec * 1000;
    }

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

    var selectedLap = null;
    var lastTickTime = null;
    var isMuted = true;
    var loadedAudio = false;
    var shortBeep = document.getElementById('shortBeep');
    var longBeep = document.getElementById('longBeep');
    function loadAudio() {
        if (!loadedAudio) {
            // On iOS you can't play back sounds unless it comes from a user
            // action first, so pretend to play the sound in this callback so
            // that it actually plays in the timer countdown later on
            shortBeep.play();
            shortBeep.pause();
            shortBeep.currentTime = 0;
            longBeep.play();
            longBeep.pause();
            longBeep.currentTime = 0;
            loadedAudio = true;
        }
    }

    function playShort() {
        if (isMuted) {
            return;
        }
        loadAudio();
        shortBeep.play();
    }

    function playLong() {
        if (isMuted) {
            return;
        }
        loadAudio();
        longBeep.play();
    }

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
                    playShort();
                }
            }

            if (starting || (timer.isCountdownTimer() && elapsed <= 0)) {
                playLong();
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

        selectedLap = null;
        renderTime(0);
        renderControls(timer);
        renderIntervals(timer);
    };

    var newSetCb = function(timer) {
        renderIntervals(timer);
    };

    var timer = new Timer(tickCb, newLapCb, clearCb, newSetCb);

    byId('lapReset').addEventListener('click', function() {
        timer.lapResetTimer();
    });

    byId('startStop').addEventListener('click', function() {
        timer.toggleTimer();
        renderControls(timer);
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

    byId('muteToggleButton').addEventListener('click', function(evt) {
        isMuted = !isMuted;

        var src = '';
        if (isMuted) {
            src = 'speaker-muted.png';
        } else {
            src = 'speaker.png';
        }
        document.querySelector('#muteToggleButton img').src = src;
    });

    byId('settingsButton').addEventListener('click', function(evt) {
        byId('timerUI').classList.add('hidden');
        byId('settingsUI').classList.remove('hidden');
    });

    byId('done').addEventListener('click', function(evt) {
        function getVal(value) {
            var val = parseInt(value, 10);
            if (isNaN(val)) {
                val = 0;
            }
            return val;
        }

        var countdownMin, countdownSec;
        countdownMin = getVal(byId('countdownMin').value);
        countdownSec = getVal(byId('countdownSec').value);

        var workMin, workSec, numSets, restMin, restSec;
        workMin = getVal(byId('workMin').value);
        workSec = getVal(byId('workSec').value);
        restMin = getVal(byId('restMin').value);
        restSec = getVal(byId('restSec').value);
        numSets = getVal(byId('setsCount').value);

        if (countdownMin > 0 || countdownSec > 0) {
            //This is a countdown timer
            timer.setCountdown(countdownMin, countdownSec);
            byId('intervalUI').classList.add('hidden');
        } else if (numSets > 0 &&
            (workMin > 0 || workSec > 0)) {

            var sets = [];
            for (var i=0; i<numSets; ++i) {
                sets.push({
                    work: minSecToMS(workMin, workSec),
                    rest: minSecToMS(restMin, restSec)
                });
            }
            timer.setSets(sets);
            byId('intervalUI').classList.remove('hidden');
        }

        renderControls(timer);
        renderIntervals(timer);
        renderTime(minSecToMS(countdownMin, countdownSec));

        byId('settingsUI').classList.add('hidden');
        byId('timerUI').classList.remove('hidden');
    });
})();
