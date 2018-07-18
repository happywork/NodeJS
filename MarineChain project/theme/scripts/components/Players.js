define([
    'react',
    'game-logic/clib',
    'lodash',
    'game-logic/engine',
    'classnames'
], function(
    React,
    Clib,
    _,
    Engine,
    CX
){

    var D = React.DOM;

    function calcProfit(bet, stoppedAt) {
        return ((stoppedAt - 100) * bet)/100;
    }

    function getState(){
        return {
            engine: Engine
        }
    }

    return React.createClass({
        displayName: 'usersPlaying',

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange
            });
        },

        componentWillUnmount: function() {
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange
            });
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        render: function() {
            var self = this;

            var usersWonCashed = [];
            var usersLostPlaying = [];

            var trUsersWonCashed;
            var trUsersLostPlaying;

            var tBody;

            var game = self.state.engine;

            /** Separate and sort the users depending on the game state **/
            if (game.gameState === 'STARTING') {
                //The list is already ordered by engine given an index

                usersLostPlaying = self.state.engine.joined.map(function(player) {
                    var bet; // can be undefined

                    if (player === self.state.engine.username)
                        bet = self.state.engine.nextBetAmount;

                    return { username: player, bet: bet };
                });
            } else {
                _.forEach(game.playerInfo, function (player, username) {

                    if (player.stopped_at)
                        usersWonCashed.push(player);
                    else
                        usersLostPlaying.push(player);
                });

                usersWonCashed.sort(function(a, b) {
                    var r = b.stopped_at - a.stopped_at;
                    if (r !== 0) return r;
                    return a.username < b.username ? 1 : -1;
                });

                usersLostPlaying.sort(function(a, b) {
                    var r = b.bet - a.bet;
                    if (r !== 0) return r;
                    return a.username < b.username ? 1 : -1;
                });

            }

            /** Create the rows for the table **/

            //Users Playing and users cashed
            if(game.gameState === 'IN_PROGRESS' || game.gameState === 'STARTING') {
                var i, length;
                // var bonusClass = (game.gameState === 'IN_PROGRESS')? 'bonus-projection' : '';

                trUsersLostPlaying = [];
                for(i=0, length = usersLostPlaying.length; i < length; i++) {

                    var user = usersLostPlaying[i];
                    // var bonus = (game.gameState === 'IN_PROGRESS')? ( (user.bonus)? Clib.formatDecimals((user.bonus*100/user.bet), 2) + '%': '0%' ) : '-';
                    var classes = CX({
                        'user-playing': true,
                        'me': self.state.engine.username === user.username
                    });

                    var styleLine = {};
                    if (i % 2)
                        styleLine = { color : '#ddd' };
                    else
                        styleLine = { color : '#ddd', backgroundColor : '#253048' };

                    trUsersLostPlaying.push( D.tr({ className: classes, key: 'user' + i, style : styleLine },
                        D.td( null,
                            D.img({ className: "players-avatar", style : {float : 'left'}, src: '/img/photos/' + user.username + '.jpg' } ),
                            D.div({className : 'players-line-name', style : {float : 'left'}}, D.a({ className : 'players-name', style : {color : '#ddd'}, href: '/user/' + user.username, target: '_blank' }, user.username))
                        ),
                        D.td({className : 'players-line'}, D.span(null, '-')),
                        D.td({className : 'players-line'}, D.span(null, user.bet ? Clib.formatSatoshis(user.bet, 0) : '?' )),
                        // D.td({className : 'players-line'}, D.span({ className: bonusClass }, bonus)),
                        D.td({className : 'players-line'}, D.span(null, '-'))
                    ));
                }

                trUsersWonCashed = [];
                for (i=0, length = usersWonCashed.length; i < length; i++) {

                    var user = usersWonCashed[i];
                    var profit = calcProfit(user.bet, user.stopped_at);
                    // var bonus = (game.gameState === 'IN_PROGRESS')? ( (user.bonus)? Clib.formatDecimals((user.bonus*100/user.bet), 2) + '%': '0%' ) : '-';
                    var classes = CX({
                        'user-cashed': true,
                        'me': self.state.engine.username === user.username
                    });

                    var styleLine = {};
                    if (usersLostPlaying.length % 2)
                    {
                        if (i % 2)
                            styleLine = { color : '#00dc76', backgroundColor : '#253048' };
                        else
                            styleLine = { color : '#00dc76' };
                    }
                    else
                    {
                        if (i % 2)
                            styleLine = { color : '#00dc76' };
                        else
                            styleLine = { color : '#00dc76', backgroundColor : '#253048' };
                    }

                    trUsersWonCashed.push( D.tr({ className: classes, key: 'user' + i, style : styleLine },
                        D.td( null,
                            D.img({ className: "players-avatar", style : {float : 'left'}, src: '/img/photos/' + user.username + '.jpg' }),
                            D.div({className : 'players-line-name', style : {float : 'left'}}, D.a({ className : 'players-name', style : {color : '#00dc76'}, href: '/user/' + user.username, target: '_blank' }, user.username))
                        ),
                        D.td({className : 'players-line'}, D.span(null, user.stopped_at/100 + 'x')),
                        D.td({className : 'players-line'}, D.span(null, Clib.formatSatoshis(user.bet, 0))),
                        // D.td({className : 'players-line'}, D.span({ className: bonusClass }, bonus)),
                        D.td({className : 'players-line'}, D.span(null, Clib.formatSatoshis(profit)))
                    ));
                }

                tBody = D.tbody({ className: '' },
                    trUsersLostPlaying,
                    trUsersWonCashed
                );

                //Users Lost and users Won
            } else if(game.gameState === 'ENDED') {

                trUsersLostPlaying = usersLostPlaying.map(function(entry, i) {
                    var bet = entry.bet;
                    // var bonus = entry.bonus;
                    var profit = -bet;

                    // if (bonus) {
                    //     profit = Clib.formatSatoshis(profit + bonus);
                    //     bonus = Clib.formatDecimals(bonus*100/bet, 2)+'%';
                    // } else {
                        profit = Clib.formatSatoshis(profit);
                    //     bonus = '0%';
                    // }

                    var classes = CX({
                        'user-lost': true,
                        'me': self.state.engine.username === entry.username
                    });

                    var styleLine = {};
                    if (i % 2)
                        styleLine = { color : '#f5533c' };
                    else
                        styleLine = { color : '#f5533c', backgroundColor : '#253048' };

                    return D.tr({ className: classes, key: 'user' + i, style : styleLine },
                        D.td( null,
                            D.img({ className: "players-avatar", style : {float : 'left'}, src: '/img/photos/' + entry.username + '.jpg' }),
                            D.div({className : 'players-line-name', style : {float : 'left'}}, D.a({ className : 'players-name', style : {color : '#f5533c'}, href: '/user/' + entry.username, target: '_blank' }, entry.username))
                        ),
                        D.td({className : 'players-line'}, D.span(null, '-')),
                        D.td({className : 'players-line'}, D.span(null, Clib.formatSatoshis(entry.bet, 0))),
                        // D.td({className : 'players-line'}, D.span(null, bonus)),
                        D.td({className : 'players-line'}, D.span(null, profit))
                    );
                });

                trUsersWonCashed = usersWonCashed.map(function(entry, i) {
                    var bet = entry.bet;
                    // var bonus = entry.bonus;
                    var stopped = entry.stopped_at;
                    var profit = bet * (stopped - 100) / 100;

                    // if (bonus) {
                    //     profit = Clib.formatSatoshis(profit + bonus);
                    //     bonus = Clib.formatDecimals(bonus*100/bet, 2)+'%';
                    // } else {
                        profit = Clib.formatSatoshis(profit);
                    //     bonus = '0%';
                    // }

                    var classes = CX({
                        'user-won': true,
                        'me': self.state.engine.username === entry.username
                    });

                    var styleLine = {};
                    if (usersLostPlaying.length % 2)
                    {
                        if (i % 2)
                            styleLine = { color : '#00dc76', backgroundColor : '#253048' };
                        else
                            styleLine = { color : '#00dc76' };
                    }
                    else
                    {
                        if (i % 2)
                            styleLine = { color : '#00dc76' };
                        else
                            styleLine = { color : '#00dc76', backgroundColor : '#253048' };
                    }

                    return D.tr({ className: classes, key: 'user' + i, style : styleLine },
                        D.td( null,
                            D.img({ className: "players-avatar", style : {float : 'left'}, src: '/img/photos/' + entry.username + '.jpg' }),
                            D.div({className : 'players-line-name', style : {float : 'left'}}, D.a({ className : 'players-name', style : {color : '#00dc76'}, href: '/user/' + entry.username, target: '_blank' }, entry.username))
                        ),
                        D.td({className : 'players-line'}, D.span(null, stopped / 100, 'x')),
                        D.td({className : 'players-line'}, D.span(null, Clib.formatSatoshis(bet, 0))),
                        // D.td({className : 'players-line'}, D.span(null, bonus)),
                        D.td({className : 'players-line'}, D.span(null, profit))
                    );
                });

                tBody = D.tbody({ className: '' },
                    trUsersLostPlaying,
                    trUsersWonCashed
                );
            }

            // return D.div({ id: 'players-container' },
            //     D.div({ className: 'header-bg' }),
            //     D.div({ className: 'table-inner' },
            //     D.table({ className: 'users-playing' },
            //         D.thead(null,
            //             D.tr(null,
            //                 D.th(null, D.div({ className: 'th-inner' }, 'User')),
            //                 D.th(null, D.div({ className: 'th-inner' }, '@')),
            //                 D.th(null, D.div({ className: 'th-inner' }, 'Bet')),
            //                 D.th(null, D.div({ className: 'th-inner' }, 'Bonus')),
            //                 D.th(null, D.div({ className: 'th-inner' }, 'Profit'))
            //             )
            //         ),
            //         tBody
            //     )
            // )
            // );
            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            return D.div({className : "portlet box", style : {marginBottom : '0px'}},
                D.div({className : "portlet-body"},
                    D.div({id : 'round_info', className : 'scroller', 'data-always-visible' : 1, 'data-rail-visible' : 1},
                        D.table({className : "table table-hover"},
                            D.thead({style : {color : '#fefefe'}},
                                D.tr(null,
                                    D.th(null, languageFlag ? 'USER' : 'USER_zh'),
                                    D.th(null, '@'),
                                    D.th(null, languageFlag ? 'BET' : 'BET_zh'),
                                    // D.th(null, 'BONUS'),
                                    D.th(null, languageFlag ? 'PROFIT' : "PROFIT_zh")
                                )
                            ),
                            tBody
                        )
                    )
                )
            );
        }

    });

});