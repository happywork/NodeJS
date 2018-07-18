/**
 * This view acts as a wrapper for all the other views in the game
 * it is subscribed to changes in EngineVirtualStore but it only
 * listen to connection changes so every view should subscribe to
 * EngineVirtualStore independently.
 */
define([
    'react',
    'components/TopBar',
    // 'components/ChartControls',
    'components/GraphicsContainer',
    'components/ControlsSelector',
    'components/GamesLog',
    'components/Chat',
    'components/Players',
    'components/BetBar',
    'components/Controls',
    'game-logic/engine',
    'game-logic/clib',
    'game-logic/hotkeys',
    'stores/GameSettingsStore'
], function(
    React,
    TopBarClass,
    // ChartControlsClass,
    GraphicsContainerClass,
    ControlsSelectorClass,
    // TabsSelectorClass,
    GamesLogClass,
    ChatClass,
    PlayersClass,
    BetBarClass,
    ControlsClass,
    Engine,
    Clib,
    Hotkeys,
    GameSettingsStore
){
    var TopBar = React.createFactory(TopBarClass);
    // var ChartControls = React.createFactory(ChartControlsClass);
    var GraphicsContainer =  React.createFactory(GraphicsContainerClass);
    var ControlsSelector = React.createFactory(ControlsSelectorClass);

    var GamesLog = React.createFactory(GamesLogClass);
    var Chat = React.createFactory(ChatClass);

    var Players = React.createFactory(PlayersClass);
    var BetBar = React.createFactory(BetBarClass);
    var Controls = React.createFactory(ControlsClass);

    var D = React.DOM;

    return React.createClass({
        displayName: 'Game',

        getInitialState: function () {
            var state = GameSettingsStore.getState();
            state.username = Engine.username;
            state.isConnected = Engine.isConnected;
            state.admin = Engine.admin;
            state.showMessage = true;
            state.isMobileOrSmall = Clib.isMobileOrSmall(); //bool
            return state;
        },

        componentDidMount:  function() {
            Engine.on({
                'connected': this._onEngineChange,
                'disconnected': this._onEngineChange
            });
            GameSettingsStore.addChangeListener(this._onSettingsChange);
            window.addEventListener("resize", this._onWindowResize);
            Hotkeys.mount();
        },

        componentWillUnmount: function() {
            Engine.off({
                'connected': this._onChange,
                'disconnected': this._onChange
            });

            window.removeEventListener("resize", this._onWindowResize);

            Hotkeys.unmount();
        },

        _onEngineChange: function() {
            if((this.state.isConnected != Engine.isConnected) && this.isMounted())
                this.setState({ isConnected: Engine.isConnected, username : Engine.username, admin:Engine.admin });
        },

        _onSettingsChange: function() {
            if(this.isMounted())
                this.setState(GameSettingsStore.getState());
        },

        _onWindowResize: function() {
            var isMobileOrSmall = Clib.isMobileOrSmall();
            if(this.state.isMobileOrSmall !== isMobileOrSmall)
                this.setState({ isMobileOrSmall: isMobileOrSmall });
        },

        _hideMessage: function() {
            this.setState({ showMessage: false });
        },

        render: function() {
            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            if (!this.state.isConnected)
                return D.div({ id: 'loading-container' },
                    D.div({ className: 'loading-image' },
                        D.span({ className: 'bubble-1' }),
                        D.span({ className: 'bubble-2' }),
                        D.span({ className: 'bubble-3' })
                    )
                );

            var loginButton = null;
            var registerButton = null;
            var accountButton = null;
            var adminButton = null;
            var logoutButton = null;
            var chatButton = null;
            var languageButton = null;
            if (this.state.username) {      //isLogin

                accountButton = D.li( null,
                                    D.a({ href : "/account/?clang=" + languageCode },
                                        D.i({ className : "far fa-user fa-2x" }),
                                        D.span({ className : "title"}, languageFlag ? 'Account' : 'Account_zh')
                                    )
                                );
                if(this.state.admin)
                    adminButton =   D.li( null,
                                        D.a({ href : "/company/?clang=" + languageCode },
                                            D.i({ className : "fa fa-cogs fa-2x" }),
                                            D.span({ className : "title"}, languageFlag ? 'Admin' : 'Admin_zh')
                                        )
                                    );
            }

            if(!this.state.isMobileOrSmall) {       //isOnPC
                chatButton = D.li({id: 'chat_modal_button'},
                                D.a({href: "#chatModal", 'data-backdrop': false, 'data-toggle': "modal"},
                                    D.i({className: "far fa-comments fa-2x"}),
                                    D.span({className: "title"}, languageFlag ? 'Chat' : 'Chat_zh')
                                )
                            );
            } else {
                languageButton = D.li({id: 'id_btnLanguageSwitch'},
                    D.a({ href : "#" },
                        D.i({ className : "fas fa-language fa-2x" }),
                        D.span({ className : "title"}, 'Language')
                    )
                );
            }

            if(!this.state.username && this.state.isMobileOrSmall) {        //isNotLogin and isOnMobile
                loginButton =   D.li( null,
                                    D.a({ href : "/login/?clang=" + languageCode },
                                        D.i({ className : "fas fa-sign-in-alt fa-2x" }),
                                        D.span({ className : "title"}, languageFlag ? 'Login' : 'Login_zh')
                                    )
                                );

                registerButton =   D.li( null,
                                        D.a({ href : "/register/?clang=" + languageCode },
                                            D.i({ className : "far fa-user fa-2x" }),
                                            D.span({ className : "title"}, languageFlag ? 'Register' : 'Register_zh')
                                        )
                                    );
            } else if (this.state.username && this.state.isMobileOrSmall) {
                logoutButton = D.li( null,
                    D.form({'action':'/logout', 'method':'post', id:'logout'}),
                    D.a({'href':'javascript:', style:{'position':'relative'},
                            'onclick':'logout()', 'alt':'Logout', id:'id_linkLogout_sidebar'},
                        D.i({className:'fas fa-power-off fa-2x'}),
                        D.span({ className : "title"}, 'Logout')
                    )
                );
            }




            var objSideBar =
                D.div({ className : "page-sidebar-wrapper" },
                    D.div({ className : "page-sidebar navbar-collapse collapse" },
                        D.ul({ className : "page-sidebar-menu page-sidebar-menu-hover-submenu ", 'data-keep-expanded' : false, 'data-auto-scroll' : true, 'data-slide-speed' : 200 },
                            chatButton,
                            loginButton,
                            registerButton,
                            accountButton,
                            D.li( null,
                                D.a({ href : "/tutorial/?clang=" + languageCode },
                                    D.i({ className : "fab fa-leanpub fa-2x" }),
                                    D.span({ className : "title"}, (languageFlag ? 'Tutorial' : 'Tutorial_zh'))
                                )
                            ),
                            D.li( null,
                                D.a({ href : "/leaderboard/?clang=" + languageCode },
                                    D.i({ className : "fas fa-users fa-2x" }),
                                    D.span({ className : "title"},
                                        "Leader",
                                        D.br(null),
                                        languageFlag ? "board" : "boarder_zh"
                                    )
                                )
                            ),
                            D.li( null,
                                D.a({ href : "/no_user/?clang=" + languageCode },
                                    D.i({ className : "fas fa-chart-line fa-2x" }),
                                    D.span({ className : "title"}, languageFlag ? 'Stats' : "Stats_zh")
                                )
                            ),
                            D.li( null,
                                D.a({ href : "/faq_languageCode/?clang=" + languageCode },
                                    D.i({ className : "fas fa-question-circle fa-2x" }),
                                    D.span({ className : "title"}, languageFlag ? 'FAQ' : "FAQ_zh")
                                )
                            ),
                            adminButton,
                            languageButton,
                            logoutButton
                        )
                    )
                );

                var contentDiv = null;
                if(!this.state.isMobileOrSmall)
                    contentDiv = D.div({className : 'row'},
                                    D.div({ className : 'col-md-5' },
                                        Players(),
                                        BetBar(),
                                        GamesLog()
                                    ),
                                    D.div({className : 'col-md-7' },
                                        GraphicsContainer({
                                            isMobileOrSmall: this.state.isMobileOrSmall,
                                            controlsSize: this.state.controlsSize
                                        }),
                                        ControlsSelector({
                                            isMobileOrSmall: this.state.isMobileOrSmall,
                                            controlsSize: this.state.controlsSize
                                        })
                                    )
                                );

                else contentDiv = D.div({className : 'row'},
                                    D.div({className : 'col-md-12' },
                                        GraphicsContainer({
                                            isMobileOrSmall: this.state.isMobileOrSmall,
                                            controlsSize: this.state.controlsSize
                                        }),
                                        Controls({isMobileOrSmall: this.state.isMobileOrSmall, controlsSize: this.state.controlsSize}),
                                        ControlsSelector({
                                            isMobileOrSmall: this.state.isMobileOrSmall,
                                            controlsSize: this.state.controlsSize,
                                            username: this.state.username
                                        })
                                    )
                                );

            return D.div({id: 'game-inner-container'},
                TopBar({isMobileOrSmall: this.state.isMobileOrSmall}),
                //messageContainer,
                D.div({className : 'clearfix'}),
                D.div({className : 'page-container'},
                    objSideBar,
                    D.div({className : 'page-content-wrapper'},
                        D.div({className : 'page-content', style : {boxShadow : 'inset 4px 0 20px 10px #232935'}},
                            contentDiv
                        )
                    ),
                    Chat({ isMobileOrSmall: this.state.isMobileOrSmall })
                )
            );
        }
    });

});
