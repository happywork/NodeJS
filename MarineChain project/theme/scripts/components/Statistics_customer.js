/**
 * This view acts as a wrapper for all the other views in the game
 * it is subscribed to changes in EngineVirtualStore but it only
 * listen to connection changes so every view should subscribe to
 * EngineVirtualStore independently.
 */
define([
    'react',
    'game-logic/engine_statistics',
    'game-logic/clib',
    'game-logic/hotkeys',
    'stores/GameSettingsStore'
], function(
    React,
    Engine,
    Clib,
    Hotkeys,
    GameSettingsStore
){
    var D = React.DOM;
    var profit = {};

    return React.createClass({
        displayName: 'Statistics',

        getInitialState: function () {
            var state = GameSettingsStore.getState();
            state.isConnected = Engine.isConnected;
            state.showMessage = true;
            state.isMobileOrSmall = Clib.isMobileOrSmall(); //bool
            state.totalInvestment = 0;
            state.totalProfit = 0;

            return state;
        },

        componentDidMount: function() {
            Engine.on({
                'connected': this._onEngineChange,
                'disconnected': this._onEngineChange,
                'customer_statistics_update': this._onCustomerStatisticsUpdated
            });
            GameSettingsStore.addChangeListener(this._onSettingsChange);
            window.addEventListener("resize", this._onWindowResize);
            Hotkeys.mount();
        },

        componentWillUnmount: function() {
            Engine.off({
                'connected': this._onChange,
                'disconnected': this._onChange,
                'customer_statistics_update': this._onCustomerStatisticsUpdated,

            });

            window.removeEventListener("resize", this._onWindowResize);

            Hotkeys.unmount();
        },

        _onEngineChange: function() {
            if((this.state.isConnected != Engine.isConnected) && this.isMounted())
                this.setState({ isConnected: Engine.isConnected });
        },

        _onChange: function() {
        },

        _onCustomerStatisticsUpdated: function(data) {
            this.state.totalInvestment = data.totalInvestment;
            this.state.totalProfit = data.totalProfit;
            this.setState(this.state);
        },

        _onSettingsChange: function() {
        },

        _onWindowResize: function() {
        },

        _hideMessage: function() {
        },

        render: function() {
            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            return  D.div({className:"row"},
                        D.div({ className:"col-lg-3 col-md-3 col-sm-6 col-xs-12"}),
                        D.div({ className:"col-lg-3 col-md-3 col-sm-6 col-xs-12"},
                            D.div({ className:"dashboard-stat blue-madison"},
                                D.div({ className:"visual"},
                                    D.i({className:"fas fa-globe fa-2x"})
                                ),
                                D.div({ className:"details"},
                                    D.div({ className:"number"}, this.state.totalInvestment / 100000000.0 + " BTC"),
                                    D.div({ className:"desc"}, languageFlag ? "Total Investment Amount" : "Total Investment Amount_zh")
                                ),
                                D.a({className:"more", "href":"javascript:;"},
                                    languageFlag ? "View graph" : "View graph_zh",
                                    D.i({"className":"m-icon-swapright m-icon-white"})
                                )
                            )
                        ),
                        D.div({ className:"col-lg-3 col-md-3 col-sm-6 col-xs-12"},
                            D.div({ className:"dashboard-stat green-haze"},
                                D.div({ className:"visual"},
                                    D.i({className:"fas fa-percent fa-2x"})
                                ),
                                D.div({ className:"details"},
                                    D.div({ className:"number"}, this.state.totalProfit / 100000000.0 + " BTC"),
                                    D.div({ className:"desc"}, languageFlag ? "Total Profit" : "Total Profit_zh")
                                ),
                                D.a({className:"more", "href":"javascript:;"},
                                    languageFlag ? "View graph" : "View graph_zh",
                                    D.i({"className":"m-icon-swapright m-icon-white"})
                                )
                            )
                        ),
                        D.div({ className:"col-lg-3 col-md-3 col-sm-6 col-xs-12"})
                    );
        }
    });
});
