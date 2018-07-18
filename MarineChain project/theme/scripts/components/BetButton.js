define([
    'react',
    'game-logic/clib',
    'game-logic/stateLib',
    'constants/AppConstants',
    'components/Payout'
], function(
    React,
    Clib,
    StateLib,
    AppConstants,
    PayoutClass
){

    var D = React.DOM;
    var Payout = React.createFactory(PayoutClass);

    return React.createClass({
        displayName: 'BetButton',

        propTypes: {
            engine: React.PropTypes.object.isRequired,
            placeBet: React.PropTypes.func.isRequired,
            cancelBet: React.PropTypes.func.isRequired,
            cashOut: React.PropTypes.func.isRequired,
            isMobileOrSmall: React.PropTypes.bool.isRequired,
            betSize: React.PropTypes.string.isRequired,
            betInvalid: React.PropTypes.any.isRequired,
            cashOutInvalid: React.PropTypes.any.isRequired,
            controlsSize: React.PropTypes.string.isRequired
        },

        getInitialState: function() {
            return {
                initialDisable: true
            }
        },

        componentDidMount: function() {
            this._initialDisableTimeout();
            this.props.engine.on({
                game_crash: this._onGameCrash
            });
        },

        componentWillUnmount: function() {
            this.props.engine.off({
                game_crash: this._onGameCrash
            });
        },

        _onGameCrash: function() {
            this.setState({ initialDisable: true });
            this._initialDisableTimeout();
        },

        _initialDisableTimeout: function() {
            var self = this;
            setTimeout(function() {
                if(self.isMounted())
                    self.setState({ initialDisable: false });
            }, AppConstants.BetButton.INITIAL_DISABLE_TIME);
        },

        _cashOut: function () {
            this.props.cashOut();
            this.setState({ initialDisable: true });
            this._initialDisableTimeout();
        },

        render: function() {
            var self = this;

            var smallButton = this.props.isMobileOrSmall || this.props.controlsSize === 'small';

            var notPlaying = StateLib.notPlaying(this.props.engine);
            var isBetting = StateLib.isBetting(this.props.engine);

            // Able to bet, or is already betting
            var notPlayingOrBetting = notPlaying || isBetting;

            var canUserBet = StateLib.canUserBet(this.props.engine.balanceSatoshis, this.props.betSize, this.props.betInvalid, this.props.cashOutInvalid);
            var invalidBet = canUserBet instanceof Error; 

            var btnClasses, btnContent = [], onClickFun = null, onMouseDownFun = null, onMouseUpFun = null;
            btnClasses = 'btn btn-circle-6 btn-circle-custom btn-danger bet-button';

            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            if(notPlayingOrBetting) {
                //Betting
                if(isBetting) {
                    btnClasses += ' disable';

                    //Can cancel
                    if (this.props.engine.gameState !== 'STARTING') {
                        btnContent.push(
                            D.span({ key: 'bc-0'}, smallButton ? '' : ( languageFlag ? 'Betting...' : 'Betting..._zh')),
                            D.span({ className: 'cancel', key: 'bc-1' }, smallButton ? (languageFlag ? 'Cancel' : 'Cancel_zh') : (languageFlag ? '(Cancel)' : '(Cancel)_zh')));
                        onClickFun = this.props.cancelBet;
                        btnClasses += ' cancel';
                    } else {
                        btnContent.push(D.span({ key: 'bc-0'}, smallButton ? 'Betting' : 'Betting...'));
                    }

                    //Initial disable
                } else if(this.state.initialDisable) {
                	var btnText = (canUserBet.message === 'Not enough bits')? (smallButton? (languageFlag ? 'Bet' : 'Bet_zh') : (languageFlag ? 'Bet too big' : 'Bet too big _zh')) : (smallButton? (languageFlag ? 'Bet' : 'Bet_zh') : (languageFlag ? 'Place bet' : 'Place bet_zh'));
                    btnContent.push(D.span({ key: 'bc-2' }, btnText));
                    btnClasses += ' disable unselect';

                    //Able to betting
                } else if(notPlaying) {

                    //Invalid bet
                    if(invalidBet) {

                    	var btnText =   (canUserBet.message === 'Not enough bits')? (smallButton? (languageFlag ? 'Bet' : 'Bet_zh') : (languageFlag ? 'Bet too big' : 'Bet too big _zh')) : (smallButton? (languageFlag ? 'Bet' : 'Bet_zh') : (languageFlag ? 'Place bet' : 'Place bet_zh'));
                        //btnContent.push(D.span({ key: 'bc-3' }, invalidBet));
                        btnContent.push(D.span({ key: 'bc-3' }, btnText));
                        btnClasses += ' invalid-bet unselect';

                    //Placing bet
                    } else if(this.props.engine.placingBet) {
                        btnContent.push(D.span({ key: 'bc-4' }, smallButton? (languageFlag ? 'Bet' : 'Bet_zh') : (languageFlag ? 'Place bet' : 'Place bet_zh')));
                        btnClasses += ' disable unselect';

                    //Able to bet
                    } else {
                        btnContent.push(D.span({ key: 'bc-5' }, smallButton? (languageFlag ? 'Bet' : 'Bet_zh') : (languageFlag ? 'Place bet' : 'Place bet_zh')));
                        btnClasses += ' ';
                        onClickFun = self.props.placeBet;
                    }

                    //User is cashing out
                } else {
                    console.error('Not defined state in controls');
                }

            //The user is playing
            } else {
                if(!smallButton) {
                    btnContent.push(
                        D.div({className: 'btn-content', key: 'bc-6'},
                            D.span({className: 'cashout-cont'}, languageFlag ? 'Cash out' : 'Cash out_zh'),
                            D.span({className: 'cashout-amount-cont'},
                                D.span(null, '@ '),
                                Payout({engine: this.props.engine}),
                                D.span(null, 'bits')
                            )
                        )
                    );
                } else {
                    btnContent.push(
                        D.div({className: 'btn-content', key: 'bc-6'},
                            D.span({className: 'cashout-cont'}, languageFlag ? 'Cash out' : 'Cash out_zh')
                        )
                    );
                }

                //Cashing out
                if (this.props.engine.cashingOut) {
                    btnClasses += ' disable';

                //Able to cash out
                } else {
                    btnClasses += ' cashout';
                    onMouseDownFun = this._cashOut;
                }
            }

            return D.div({ className: 'col-md-12 bet-button-container', style : {height : '80px', marginTop : '10px'} },
                D.button({
                    className: btnClasses,
                    onClick: onClickFun,
                    onMouseDown: onMouseDownFun,
                    onMouseUp: onMouseUpFun,
                    type : 'submit',
                    style :
                    {
                        width :'100%',
                        height:'100%',
                        // backgroundColor: '#04be7f',
                        fontSize:'30px'
                    }
                },
                btnContent)
            );
        }
    });

});