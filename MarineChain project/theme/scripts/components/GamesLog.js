define([
    'react',
    'game-logic/clib',
    'game-logic/engine'
], function(
    React,
    Clib,
    Engine
){

    /** Constants **/
    var MAX_GAMES_SHOWED = 50;

    var D = React.DOM;

    function getState(){
        return {
            engine: Engine
        }
    }

    function copyHash(gameId, hash) {
        return function() {
            prompt('Game ' + gameId + ' Hash: ', hash);
        }
    }

    return React.createClass({
        displayName: 'gamesLog',

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function () {
            Engine.on({
                game_crash: this._onChange
            });
        },

        componentWillUnmount: function () {
            Engine.off({
                game_crash: this._onChange
            });
        },

        _onChange: function () {
            //Check if its mounted because when Game view receives the disconnect event from EngineVirtualStore unmounts all views
            //and the views unregister their events before the event dispatcher dispatch them with the disconnect event
            if (this.isMounted())
                this.setState(getState());
        },

        render: function () {
            var self = this;

            var rows = self.state.engine.tableHistory.slice(0, MAX_GAMES_SHOWED).map(function (game, i) {
                var cashed_at, bet, profit;
                var player = game.player_info[self.state.engine.username];

                if (player) {
                    // bonus = player.bonus;
                    bet = player.bet;

                    //If the player won
                    if (player.stopped_at) {
                        profit = ((player.stopped_at / 100) * player.bet) - player.bet;
                        cashed_at = Clib.formatSatoshis(player.stopped_at);

                        //If the player lost
                    } else {
                        profit = -bet;
                        cashed_at = '-';
                    }

                    //If we got a bonus
                    // if (bonus) {
                    //     profit = profit + bonus;
                    //     bonus = Clib.formatDecimals(bonus * 100 / bet, 2) + '%';
                    // } else {
                    //     bonus = '0%';
                    // }

                    profit = Clib.formatSatoshis(profit);
                    bet = Clib.formatSatoshis(bet);

                    //If we didn't play
                } else {
                    cashed_at = '-';
                    bet = '-';
                    profit = '-';
                    // bonus = '-';
                }

                var className;
                if (game.game_crash >= 198)
                    className = 'games-log-goodcrash';
                else if (game.game_crash <= 196)
                    className = 'games-log-badcrash';
                else
                    className = '';

                var styleLine = {};
                if (i % 2) {
                    styleLine = {color: '#ddd', fontSize: '17px'};
                }
                else {
                    styleLine = {color: '#ddd', backgroundColor: '#253048', fontSize: '17px'};
                }

                var strShortHash = game.hash.substring(0, 20);
                return D.tr({key: 'game_' + i, style: styleLine},
                    D.td(null,
                        D.a({href: '/game/' + game.game_id, target: '_blank', className: className},
                            Clib.formatSatoshis(game.game_crash), D.i(null, 'x'))
                    ),
                    D.td({className: className}, cashed_at),
                    D.td({className: className}, bet),
                    // D.td({className: className}, bonus),
                    D.td({className: className}, profit),
                    // D.td(null,
                    //     D.label({className: 'games-log-hash'}, game.hash)
                    // )
                    D.td(null,
                        D.label({className: 'games-log-hash'}, strShortHash),
                        D.div({ className: 'hash-copy-cont', style:{float:'left', marginRight:'5px'}, onClick: copyHash(game.game_id, game.hash) },
                            D.span({ className: 'hash-copy' }, D.i({ className: 'fa fa-clipboard' }))
                        )
                    )
                );
            });

            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            return D.div({className: "portlet box", style: {marginBottom: '0px'}},
                D.div({className: "portlet-body"},
                    D.div({
                            id : 'id_divGamesLog',
                            className: "scroller",
                            style: {"height": "400px"},
                            "data-always-visible": "1",
                            "data-rail-visible1": "1"
                        },
                        D.table({className: "table table-hover", id: 'id_tableHistory'},
                            D.thead(null,
                                D.tr({style: {'color': '#efefef'}},
                                    D.th(null, languageFlag ? "CRASH" : "CRASH_zh"),
                                    D.th(null, "@"),
                                    D.th(null, languageFlag ? "BET" : "BET_zh"),
                                    // D.th(null, "BONUS"),
                                    D.th(null, languageFlag ? "PROFIT" : "PROFIT_zh"),
                                    D.th(null, languageFlag ? "HASH" : "HASH_zh")
                                )
                            ),
                            D.tbody(null,
                                rows
                            )
                        )
                    )
                )
            );
        }
    });
});