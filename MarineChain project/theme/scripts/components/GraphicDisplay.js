/**
 * The code that renders the canvas, its life cycle is managed by Chart.js
 */

define([
    'game-logic/clib',
    'game-logic/stateLib',
    'lodash',
    'game-logic/engine'
], function(
    Clib,
    StateLib,
    _,
    Engine
){

    var g_objChart = null;

    var g_objDivPayout = null;
    var g_objDivRoundNote = null;

    // threshould
    var g_nBezierX = 50;
    var g_nBezierY = 100;
    var g_nMSDiff = 300;

    var g_nMSPre = 0;

    function Graph() {
        this.rendering = false;
        this.animRequest = null;
        // this.getParentNodeFunc = null;
    }

    Graph.prototype.startRendering = function() {
        this.rendering = true;

        this.animRequest = window.requestAnimationFrame(this.render.bind(this));

        // WRT
        g_objDivPayout = document.getElementById('id_divPayout');
        g_objDivRoundNote = document.getElementById('id_divRoundNote');

        g_objChart = AmCharts.makeChart("id_divChart", {
            "type": "serial",
            "theme": "dark",
            "marginRight": 80,
            "marginTop": 17,
            "autoMarginOffset": 20,
            "graphs": [{
                "id": "g1",
                "title": "Graph title",
                "type": "smoothedLine",
                "bezierX" : g_nBezierX,
                "bezierY" : g_nBezierY,
                "lineThickness": 2,
                "title": "Price",
                "useLineColorForBulletBorder": true,
                "valueField": "value",
                "lineColor": "#FF671E"
            }],
            "valueAxes": [
                {
                    "title": "Multiplier",
                    "gridColor": "#FFFFFF",
                    "gridAlpha": 0.2,
                    "dashLength": 0,
                    "axisThickness": 2,
                    "axisColor": "#FFF"
                }
            ],
            "CategoryAxes": [
                {
                    "axisThickness": 2,
                    "axisColor": "#FFF"
                }
            ],
            "categoryField": "time"
        });
    };

    Graph.prototype.stopRendering = function() {
        this.rendering = false;

        window.removeEventListener('resize', this.onWindowResizeBinded);
    };

    Graph.prototype.render = function() {
        if(!this.rendering)
            return;

        this.drawGameData();
        this.animRequest = window.requestAnimationFrame(this.render.bind(this));
    };

     Graph.prototype.drawGameData = function()
     {
         var languageCode = document.getElementById('id_hiddenLanguageCode').value;
         var languageFlag = (languageCode == 'en') ? true : false;

        if(Engine.gameState === 'IN_PROGRESS')
        {
            this.currentTime = Clib.getElapsedTimeWithLag(Engine);
            this.currentGamePayout = Clib.calcGamePayout(this.currentTime);

            var strCurPayout = parseFloat(this.currentGamePayout + 0).toFixed(2);
            var screen_width = window.innerWidth;
            if(screen_width < 780) {
                if (strCurPayout >= 10000) {
                    g_objDivPayout.style.right = "0";
                    var payoutLeft = (screen_width - 240) / 2 + 20;
                    g_objDivPayout.style.left = payoutLeft + "px";
                } else if (strCurPayout >= 1000) {
                    g_objDivPayout.style.right = "0";
                    var payoutLeft = (screen_width - 210) / 2 + 20;
                    g_objDivPayout.style.left = payoutLeft + "px";
                } else if (strCurPayout >= 100) {
                    g_objDivPayout.style.right = "0";
                    var payoutLeft = (screen_width - 180) / 2 + 20;
                    g_objDivPayout.style.left = payoutLeft + "px";
                }
            }else {
                if (strCurPayout >= 10000) {
                    var payoutHeight = parseFloat(window.getComputedStyle(g_objDivPayout, null).getPropertyValue('height'));
                    var payoutFont = payoutHeight / 17 * 3;
                    var payoutPadding = (payoutHeight - payoutFont) / 9 * 4;
                    g_objDivPayout.style.fontSize = payoutFont + "px";
                    g_objDivPayout.style.padding = payoutPadding + "px 1px";
                } else if (strCurPayout >= 1000) {
                    var payoutHeight = parseFloat(window.getComputedStyle(g_objDivPayout, null).getPropertyValue('height'));
                    var payoutFont = payoutHeight / 14 * 3;
                    var payoutPadding = (payoutHeight - payoutFont) / 10 * 4;
                    g_objDivPayout.style.fontSize = payoutFont + "px";
                    g_objDivPayout.style.padding = payoutPadding + "px 1px";
                } else if (strCurPayout >= 100) {
                    var payoutHeight = parseFloat(window.getComputedStyle(g_objDivPayout, null).getPropertyValue('height'));
                    var payoutFont = payoutHeight / 12 * 3;
                    var payoutPadding = (payoutHeight - payoutFont) / 10 * 4;
                    g_objDivPayout.style.fontSize = payoutFont + "px";
                    g_objDivPayout.style.padding = payoutPadding + "px 1px";
                } else {
                    var payoutHeight = parseFloat(window.getComputedStyle(g_objDivPayout, null).getPropertyValue('height'));
                    var payoutFont = payoutHeight / 10 * 3;
                    var payoutPadding = (payoutHeight - payoutFont) / 8 * 3;
                    g_objDivPayout.style.fontSize = payoutFont + "px";
                    g_objDivPayout.style.padding = payoutPadding + "px 1px";
                }
            }

            if (StateLib.currentlyPlaying(Engine))
            {// when user betted
                g_objDivPayout.style.color = "#7cba00";
            }
            else
            {
                g_objDivPayout.style.color = "#f8f6f6";
            }
            g_objDivPayout.innerHTML = strCurPayout + "x";
            g_objDivRoundNote.innerText = "";

            if (this.currentTime - g_nMSPre < g_nMSDiff)
            {
                return;// game server : multiplyer change time
            }
            g_nMSPre = this.currentTime;

            var fStep = this.currentTime / 2500;

            // Graph
            var aryChartData = [];
            var prex = -1, prey = -1;
            g_objChart.dataProvider = aryChartData;

            // var nCntStep = 0;
            for(var t = 0 ; t <= this.currentTime; t += fStep)
            {
                var x = t / 100;
                x = x.toFixed(2);
                var y = Clib.calcGamePayout(t) - 1;
                y = y.toFixed(2);

                if (x != prex && y != prey)
                {
                    var aryPos = { time: x, value: y };
                    g_objChart.dataProvider.push(aryPos);

                    prex = x;
                    prey = y;
                    //////////////////////////////////////
                    // console.log("Step count : " + nCntStep);
                    // nCntStep = 0;
                }
                // else
                // {
                //     nCntStep ++;
                // }
            }

            g_objChart.validateData();
            aryChartData = null;
        }

        //If the engine enters in the room @ ENDED it doesn't have the crash value, so we don't display it
        if(Engine.gameState === 'ENDED')
        {
            var screen_width = window.innerWidth;
            if(screen_width <= 780) {
                g_objDivPayout.style.right = "0";
                var str_width = 120;
                while(strCrashValue) {
                    strCrashValue /= 10;
                    str_width += 30;
                }
                var payoutLeft = (screen_width - str_width) / 2 + 20;
                //g_objDivPayout.style.left = payoutLeft + "px";
                g_objDivPayout.style.left = payoutLeft + "px";
            }

            var strCrashValue = Clib.formatDecimals(Engine.tableHistory[0].game_crash/100, 2);

            g_objDivPayout.style.color = "#3b3a4d";
            g_objDivPayout.innerHTML = strCrashValue + "x";

            g_objDivRoundNote.style.color = "#ff5200";
            var strNote =languageFlag ? ('Busted @ ' + strCrashValue + 'x') : ('Busted_zh @ ' + strCrashValue + 'x');
            g_objDivRoundNote.innerText = strNote;

        }

        if(Engine.gameState === 'STARTING')
        {
            g_objDivRoundNote.style.color = "#ff7100";

            var timeLeft = ((Engine.startTime - Date.now())/1000).toFixed(1);

            timeLeft = parseFloat(timeLeft);
            if (timeLeft < 0.00) timeLeft = 0.00;
            timeLeft = timeLeft.toFixed(1);

            var strNote = languageFlag ? ('Next round in ' + timeLeft + 's') : ('Next round in _zh ' + timeLeft + 's');
            g_objDivRoundNote.innerText = strNote;

            g_nMSPre = 0;
            g_objChart.clear();
            g_objChart = null;
            g_objChart = AmCharts.makeChart("id_divChart", {
                "type": "serial",
                "theme": "dark",
                "marginRight": 80,
                "marginTop": 17,
                "autoMarginOffset": 20,
                "graphs": [{
                    "id": "g1",
                    "type": "smoothedLine",
                    "lineThickness": 2,
                    "bezierX" : g_nBezierX,
                    "bezierY" : g_nBezierY,
                    "title": "Price",
                    "useLineColorForBulletBorder": true,
                    "valueField": "value",
                    "lineColor": "#FF671E"
                }],
                "valueAxes": [
                    {
                        "title": "Multiplier",
                        "gridColor": "#FFFFFF",
                        "gridAlpha": 0.2,
                        "dashLength": 0,
                        "axisThickness": 2,
                        "axisColor": "#FFF"
                    }
                ],
                "CategoryAxes": [
                    {
                        "axisThickness": 2,
                        "axisColor": "#FFF"
                    }
                ],
                "categoryField": "time"
            });

            //////////////////

            var screen_width = window.innerWidth;
            if(screen_width <= 780) {
                g_objDivPayout.style.right = "0";
                var payoutLeft = (screen_width - 120) / 2 + 20;
                //g_objDivPayout.style.left = payoutLeft + "px";
                g_objDivPayout.style.left = payoutLeft + "px";
            }

            g_objDivPayout.style.color = "#3b3a4d";
            g_objDivPayout.innerHTML = "1.00x";


        }

    };

    return Graph;
});