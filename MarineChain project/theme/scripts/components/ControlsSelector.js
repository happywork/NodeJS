define([
    'components/Controls',
    'components/StrategyEditor',
    'components/Players',
    'components/GamesLog',
    'components/ChatForMobile',
    'stores/ControlsSelectorStore',
    'actions/ControlsSelectorActions',
    'actions/StrategyEditorActions',
    'react'
], function(
    ControlsClass,
    StrategyEditorClass,
    PlayersClass,
    GamesLogClass,
    ChatClass,
    ControlsSelectorStore,
    ControlsSelectorActions,
    StrategyEditorActions,
    React
) {
    var D = React.DOM;
    var StrategyEditor = React.createFactory(StrategyEditorClass);
    var Controls = React.createFactory(ControlsClass);
    var Players = React.createFactory(PlayersClass);
    var GamesLog = React.createFactory(GamesLogClass);
    var Chat = React.createFactory(ChatClass);


    function getState(){
        return ControlsSelectorStore.getState();
    }

    return React.createClass({
        displayName: 'ControlsSelector',

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired,
            controlsSize: React.PropTypes.string.isRequired,
            username: React.PropTypes.string.isRequired
        },

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            ControlsSelectorStore.addChangeListener(this._onChange);
        },

        componentWillUnmount: function() {
            ControlsSelectorStore.removeChangeListener(this._onChange);
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _selectControl: function(controlName) {
            return function() {
                ControlsSelectorActions.selectControl(controlName);
                StrategyEditorActions.selectStrategy(controlName);
            }
        },

        render: function() {

            var controlTabSelect = null;
            var controlTabContent = null;

            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            if(this.props.isMobileOrSmall) {        //Mobile or Small Screen
                if(this.props.username) {
                    controlTabSelect = D.ul({className: "nav nav-tabs"},
                        D.li({className: 'custom-control-tab-li'},
                            D.a({
                                className: 'custom-tab-menu',
                                href: "#tab_auto",
                                "data-toggle": "tab",
                                onClick: this._selectControl('autoBet')
                            }, "Auto")
                        ),
                        D.li({className: 'custom-control-tab-li'},
                            D.a({
                                className: 'custom-tab-menu',
                                href: "#tab_auto",
                                "data-toggle": "tab",
                                onClick: this._selectControl('custom')
                            }, "Custom")
                        ),
                        D.li({className: 'custom-control-tab-li'},
                            D.a({className: 'custom-tab-menu', href: "#tab_chat", "data-toggle": "tab"}, "Chat")
                        ),
                        D.li({className: 'custom-control-tab-li'},
                            D.a({className: 'custom-tab-menu', href: "#tab_players", "data-toggle": "tab"}, "Players")
                        ),
                        D.li({className: 'custom-control-tab-li'},
                            D.a({className: 'custom-tab-menu', href: "#tab_history", "data-toggle": "tab"}, "History")
                        )
                    );
                    controlTabContent = D.div({
                            className: "tab-content",
                            id: "play_button_tab_content",
                            style: {overflowX: 'hidden', overflowY: 'scroll'}
                        },
                        StrategyEditor(),
                        D.div({className: 'tab-pane', id: 'tab_chat'},
                            Chat({isMobileOrSmall: this.props.isMobileOrSmall})
                        ),
                        D.div({className: 'tab-pane', id: 'tab_players'},
                            Players()
                        ),
                        D.div({className: 'tab-pane', id: 'tab_history'},
                            GamesLog()
                        )
                    );
                } else {
                    controlTabSelect = D.ul({className: "nav nav-tabs"},
                        D.li({className: 'custom-control-tab-li'},
                            D.a({className: 'custom-tab-menu', href: "#tab_chat", "data-toggle": "tab"}, "Chat")
                        ),
                        D.li({className: 'custom-control-tab-li'},
                            D.a({className: 'custom-tab-menu', href: "#tab_players", "data-toggle": "tab"}, "Players")
                        ),
                        D.li({className: 'custom-control-tab-li'},
                            D.a({className: 'custom-tab-menu', href: "#tab_history", "data-toggle": "tab"}, "History")
                        )
                    );
                    controlTabContent = D.div({
                            className: "tab-content",
                            id: "play_button_tab_content",
                            style: {overflowX: 'hidden', overflowY: 'scroll'}
                        },
                        D.div({className: 'tab-pane', id: 'tab_chat'},
                            Chat({isMobileOrSmall: this.props.isMobileOrSmall})
                        ),
                        D.div({className: 'tab-pane', id: 'tab_players'},
                            Players()
                        ),
                        D.div({className: 'tab-pane', id: 'tab_history'},
                            GamesLog()
                        )
                    );
                }
            } else {        //Not Small Screen
                controlTabSelect = D.ul({className : "nav nav-tabs"},
                                        D.li({className : "active custom-control-tab-li"},
                                            D.a({className: 'custom-tab-menu', href : "#tab_manual", "data-toggle" : "tab"}, languageFlag ? "Manual" : "Manual_zh")
                                        ),
                                        D.li({className:'custom-control-tab-li'},
                                            D.a({className: 'custom-tab-menu', href : "#tab_auto", "data-toggle" : "tab", onClick: this._selectControl('autoBet')}, languageFlag ? "Auto" : "Auto_zh")
                                        ),
                                        D.li({className:'custom-control-tab-li'},
                                            D.a({className: 'custom-tab-menu', href : "#tab_auto", "data-toggle" : "tab", onClick: this._selectControl('custom')}, languageFlag ? "Custom" : "Custom_zh")
                                        )
                                    );
                controlTabContent = D.div({className : "tab-content", id : "play_button_tab_content"},
                                        Controls({isMobileOrSmall: this.props.isMobileOrSmall, controlsSize: this.props.controlsSize}),
                                        StrategyEditor()
                                    );
            }

            return D.div({className : 'row', style : { "marginTop":"0px"}},
                    D.div({className:'col-md-12'},
                        D.div({className : 'tabbable-custom tabbable-noborder', id: 'bet_button_tabs'},
                            controlTabSelect,
                            controlTabContent
                        )
                    )
            );
        }
    });

});
