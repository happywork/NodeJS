define([
    'react',
    'game-logic/clib',
    'game-logic/stateLib',
    'lodash',
    'components/BetButton',
    'actions/ControlsActions',
    'stores/ControlsStore',
    'game-logic/engine'
], function(
    React,
    Clib,
    StateLib,
    _,
    BetButtonClass,
    ControlsActions,
    ControlsStore,
    Engine
){
    var BetButton = React.createFactory(BetButtonClass);

    var D = React.DOM;
    var currentTime, currentGamePayout;
    var warningPoint = 0;

    function getState(){
        return {
            betSize: ControlsStore.getBetSize(), //Bet input string in bits
            betInvalid: ControlsStore.getBetInvalid(), //false || string error message
            cashOut: ControlsStore.getCashOut(),
            cashOutInvalid: ControlsStore.getCashOutInvalid(), //false || string error message
            engine: Engine
        }
    }

    return React.createClass({
        displayName: 'Controls',

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired,
            controlsSize: React.PropTypes.string.isRequired
        },

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            ControlsStore.addChangeListener(this._onChange);
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange,
                placing_bet: this._onChange,
                bet_placed: this._onChange,
                bet_queued: this._onChange,
                cashing_out: this._onChange,
                cancel_bet: this._onChange,
                game_tick: this._onTick,
                warning_point_updated: this._onChangeWarningPoint
            });
        },

        componentWillUnmount: function() {
            ControlsStore.removeChangeListener(this._onChange);
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange,
                placing_bet: this._onChange,
                bet_placed: this._onChange,
                bet_queued: this._onChange,
                cashing_out: this._onChange,
                cancel_bet: this._onChange,
                game_tick: this._onTick,
                warning_point_updated: this._onChangeWarningPoint
            });
        },

        _onTick: function() {
            var self = this;
            self.state = getState();
            currentTime = Clib.getElapsedTimeWithLag(self.state.engine);
            currentGamePayout = Clib.calcGamePayout(currentTime);

        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _onChangeWarningPoint: function(data) {
            warningPoint = data;
        },

        _placeBet: function () {
            var bet = StateLib.parseBet(this.state.betSize);
            var cashOut = StateLib.parseCashOut(this.state.cashOut);
            ControlsActions.placeBet(bet, cashOut);
        },

        _finishRound: function() {
            ControlsActions.finishRound(currentTime, currentGamePayout);
        },

        _cancelBet: function() {
            ControlsActions.cancelBet();
        },

        _cashOut: function() {
            ControlsActions.cashOut();
        },

        _setBetSize: function(betSize) {
            ControlsActions.setBetSize(betSize);
        },

        _setAutoCashOut: function(autoCashOut) {
            ControlsActions.setAutoCashOut(autoCashOut);
        },

        _redirectToLogin: function() {
            window.location = '/login';
        },

        render: function () {

            var self = this;
            self.state = getState();
            var isPlayingOrBetting =  StateLib.isBetting(Engine) || (Engine.gameState === 'IN_PROGRESS' && StateLib.currentlyPlaying(Engine));

            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

           // If they're not logged in, let just show a login to play
            if (!Engine.username)
                return D.div({className : "tab-pane active", id : "tab_manual"},
                    D.div({ className : 'row'},
                        D.div({className : 'col-md-3'}),
                        D.div({className : 'col-md-6'},
                            D.button({ className: 'btn btn-circle-6 btn-circle-custom btn-danger custom-login-play-btn', onClick: this._redirectToLogin, style : { width :'100%', height:'80px', marginTop:'65px', fontSize:'30px'} }, languageFlag ? 'Login to play' : 'Login to play_zh')
                        ),
                        D.div({className : 'col-md-3'})
                    )
                );

            var controlInputs = D.div({ className : 'col-md-6 col-xs-9' },
                                    D.div({ className : "portlet-body form" },
                                        D.form( {action : "#", className : "form-horizontal" },
                                            D.div({ className : "form-body custom-form-body" },
                                                D.div({ className : "form-group custom-form-group" },
                                                    D.label({ className : "col-md-5 col-xs-5 control-label"}, languageFlag ? "Bet" : "Bet_zh"),
                                                    D.div({ className : "col-md-7 col-xs-7" },
                                                        D.div({ className : "input-group" },
                                                            D.input({ className : "form-control", placeholder : "",
                                                                type: 'number',
                                                                step: 1,
                                                                min: 1,
                                                                name: 'bet-size',
                                                                value: self.state.betSize,
                                                                disabled: isPlayingOrBetting,
                                                                onChange: function (e)
                                                                {
                                                                    self._setBetSize(e.target.value);
                                                                }
                                                            })
                                                        )
                                                    )
                                                ),
                                                D.div({ className : "form-group last custom-form-group" },
                                                    D.label({ className : "col-md-5 col-xs-5 control-label custom-manual-autocashout-label" }, languageFlag ? "Auto Cash Out" : "Auto Cash Out_zh"),
                                                    D.div({ className : "col-md-7 col-xs-7" },
                                                        D.div({ className : "input-group" },
                                                            D.input({ className : "form-control", placeholder : "",
                                                                type: 'number',
                                                                step: 0.01,
                                                                min: 1,
                                                                value: self.state.cashOut,
                                                                name: 'cash-out',
                                                                disabled: isPlayingOrBetting,
                                                                onChange: function (e)
                                                                {
                                                                    self._setAutoCashOut(e.target.value);
                                                                }
                                                            })
                                                        )
                                                    )
                                                )
                                            )
                                        )
                                    )
                                );

            var hotkeyInfoDiv = D.div( {className : 'row custom-hotkey-div'},
                                    D.div({className : 'col-md-12', style : {textAlign : 'center'}},
                                        D.h4(null, D.b(null, 'Hotkey')),
                                        D.span({ style : { marginRight:'20px'}}, languageFlag ? 'Bet(Space)' : 'Bet(Space)_zh'),
                                        D.span({ style : { marginRight:'20px'}}, languageFlag ? 'Double bet(C)' : 'Double bet(C)_zh'),
                                        D.span({ style : { marginRight:'20px'}}, languageFlag ? 'Halve bet(X)' : 'Halve bet(X)_zh')
                                    )
                                );

            //For Admin Control Panel with Stop Button
            var game = self.state.engine;
            var isInProgressing = !(Engine.gameState === 'IN_PROGRESS');
            var totalBet = 0;
            var playerTaken = 0;
            var styleLine = {textAlign:'center', fontSize:'40px'};

            if((Engine.gameState === 'IN_PROGRESS')) {
                _.forEach(game.playerInfo, function (play) {
                    totalBet += play.bet;
                    if (play.stopped_at != undefined)
                        playerTaken += play.bet * play.stopped_at;
                });
                var profit = parseInt((totalBet - totalBet / 100.0 - playerTaken) / 100);
                if(warningPoint > profit) {
                    var colorGB = parseInt(165 / (warningPoint) * (profit));
                    if(colorGB < 0)
                        colorGB = 0;
                    styleLine = {textAlign: 'center', fontSize: '40px', color: 'RGB(165, ' + colorGB + ', ' + colorGB + ')',
                        borderBottom: '4px solid RGB(165, ' + colorGB + ', ' + colorGB + ')'};
                }
            }

            var adminControlDiv =   D.div(null,
                                        D.hr({style: {margin:"0"}}),
                                        D.div({className : 'row'},
                                            D.div({className:'col-md-9'},
                                                D.div({className:'row'},
                                                    D.div({className:'col-md-4', style: {textAlign:'center', fontSize:'15px', marginTop:'10px'}},
                                                        languageFlag ? "Warning Point" : "Warning Point_zh"
                                                    ),
                                                    D.div({className:'col-md-8', style: {textAlign:'center', fontSize:'15px', marginTop:'10px'}},
                                                        languageFlag ? "Round Profit" : "Round Profit_zh"
                                                    )
                                                ),
                                                D.div({className:'row'},
                                                    D.div({className:'col-md-4', id:'id_warningDiv', style: {textAlign:'center', fontSize:'40px'}},
                                                        warningPoint
                                                    ),
                                                    D.div({className:'col-md-8', style: styleLine },
                                                        profit
                                                    )
                                                )
                                            ),
                                            D.div({className:'col-md-3'},
                                                D.button({ className: "btn btn-circle-6 custom-stop-game", disabled: isInProgressing,
                                                            style: {width: '100%', height:'100%', fontSize: '30px', margin: '20px 0'},
                                                            onClick: this._finishRound}, languageFlag ? "Stop" : "Stop_zh"
                                                )
                                            )
                                        )
                                    );
            var switchDiv = null;
            if(!this.props.isMobileOrSmall) {
                if (Engine.admin) {
                    switchDiv = adminControlDiv;
                } else {
                    switchDiv = hotkeyInfoDiv;
                }
            }

            //If the user is logged in render the controls
            return  D.div({className : "tab-pane active", id : "tab_manual", style: {marginBottom:'3px'}},
                        D.div({ className: 'row' },

                            controlInputs,

                            D.div({className : 'col-md-5 col-xs-3'},
                                D.div({ className: 'row button-container' },
                                    BetButton({
                                        engine: this.state.engine,
                                        placeBet: this._placeBet,
                                        cancelBet: this._cancelBet,
                                        cashOut: this._cashOut,
                                        isMobileOrSmall: this.props.isMobileOrSmall,
                                        betSize: this.state.betSize,
                                        betInvalid: this.state.betInvalid,
                                        cashOutInvalid: this.state.cashOutInvalid,
                                        controlsSize: this.props.controlsSize
                                    })
                                )
                            )
                        ),
                        switchDiv
                    )
        }
    });
});