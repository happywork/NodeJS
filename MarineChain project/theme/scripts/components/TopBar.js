define([
    'react',
    'game-logic/engine',
    'stores/GameSettingsStore',
    'actions/GameSettingsActions',
    'game-logic/clib',
    'screenfull'
], function(
    React,
    Engine,
    GameSettingsStore,
    GameSettingsActions,
    Clib,
    Screenfull //Attached to window.screenfull
) {
    var D = React.DOM;

    function getState() {
        return {
            balanceBitsFormatted: Clib.formatSatoshis(Engine.balanceSatoshis),
            theme: GameSettingsStore.getCurrentTheme()//black || white
        }
    }

    return React.createClass({
        displayName: 'TopBar',

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired
        },

        getInitialState: function() {
            var state = getState();
            state.username = Engine.username;
            state.fullScreen = false;
            return state;
        },

        componentDidMount: function() {
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                cashed_out: this._onChange
            });
            GameSettingsStore.on('all', this._onChange);
        },

        componentWillUnmount: function() {
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                cashed_out: this._onChange
            });
            GameSettingsStore.off('all', this._onChange);
        },

        _onChange: function() {
            this.setState(getState());
        },

        _toggleFullScreen: function() {
        	window.screenfull.toggle();
            this.setState({ fullScreen: !this.state.fullScreen });
        },

        render: function()
        {
            var strTopbarElement_1 = null;
            var strTopbarElement_2 = null;
            var satoshiElementForMobileView = null;
            var logoutButton = null;

            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            if (this.state.username) {// logged already
                strTopbarElement_1 = D.li({ className : "dropdown class_satoshi_panel"},
                    D.a({ href : "javascript:;", className : "dropdown-toggle custom-bitcoin-amount" }, this.state.balanceBitsFormatted + " bits" )
                );

                var strUserImagePath = '/img/photos/' + this.state.username + '.jpg';
                strTopbarElement_2 = D.li({className : 'dropdown dropdown-user'},
                    D.a({href : '/account', className : 'dropdown-toggle', 'data-toggle' : 'dropdown', 'data-hover' : 'dropdown', 'data-close-others' : 'true'},
                        D.img({alt : '', className : 'img-circle', src : strUserImagePath }),
                        D.span({className : 'username username-hide-on-mobile', style : { fontWeight : 800, color : '#eee' }}, this.state.username )
                    )
                );

                // logoutButton = D.li({className : 'dropdown'},
                //                     D.form({'action':'/logout', 'method':'post', id:'logout'}),
                //                     D.a({ className : 'dropdown-toggle', 'alt':'Logout', id:'id_linkLogout'},
                //                         D.i({className:'fas fa-power-off fa-lg'}),
                //                     )
                //                 );

                logoutButton =  D.li({className : 'dropdown'},
                                    D.form({'action':'/logout', 'method':'post', id:'logout'}),
                                    D.a({ className : 'dropdown-toggle', 'alt':'Logout', id:'id_linkLogout'},
                                        D.i({ className: 'fas fa-power-off fa-lg' })
                                    )
                                );

                satoshiElementForMobileView = D.a({ href : "javascript:;", className : "dropdown-toggle custom-bitcoin-amount-mobile" }, this.state.balanceBitsFormatted + " bits" );
            }
            else
            {// unregisted user
                strTopbarElement_1 = D.li({ className : "dropdown", style : { marginTop : '15px', marginRight : '20px'}},
                    D.a({ href : "/login/?clang="+languageCode, className:"btn btn-circle-3 btn-circle-custom btn-danger custom-login-register-btn", style : {'background': '0 0 ', width:'100px', 'border':'1px solid #f1353d', paddingTop:'10px', paddingBottom:'10px' } }, languageFlag ? 'Login' : 'Login_zh')
                );

                strTopbarElement_2 = D.li({ className : "dropdown", style : { marginTop : '15px', marginRight : '20px'}},
                    D.a({ href : "/register/?clang="+languageCode, className:"btn btn-circle-3 btn-circle-custom btn-danger custom-login-register-btn", style : {'background': '0 0', width:'100px', 'border':'1px solid #f1353d', paddingTop:'10px', paddingBottom:'10px' } }, languageFlag ? 'Register' : 'Register_zh')
                );
            }

            return D.div({className : 'page-header navbar navbar-fixed-top'},
                D.div({className : 'page-header-inner'},
                    D.div({className : 'page-logo'},
                        D.a({href : '/?clang='+languageCode},
                            D.img({src : '/img/logo.png', 'alt' : 'logo', className : 'logo-default'})
                        )
                    ),
                    D.a({href:'javascript:;', className:'menu-toggler responsive-toggler', 'data-toggle':'collapse', 'data-target':'.navbar-collapse'}),
                    satoshiElementForMobileView,
                    D.div({className : 'page-top'},
                        D.div({className : 'top-menu custom-top-menu'},
                            D.ul({className : 'nav navbar-nav'},
                                D.li({ className : "dropdown dropdown-language", id:'id_liLanguage' },
                                    D.a({ className : "dropdown-toggle", 'data-toggle' : "dropdown", 'data-hover' : "dropdown", 'data-close-others' : "true" },
                                        D.img({ alt : "", src : "/img/24x24-icon_"+ (languageFlag ? "english" : "chinese") +".svg", width: "20px" }),
                                        D.span({ className : "langname", style : {marginLeft : '7px', marginRight : '5px'} }, languageFlag ? "English" : "Chinese_zh"),
                                        D.i({ className : "fa fa-angle-down"})
                                    ),
                                    D.ul({ className : "dropdown-menu", style:{marginLeft:'60px'}},
                                        D.li({className : 'class_liLanguage', "languageCode":"en"},
                                            D.a({ href : "javascript:;" },
                                                D.span({style : { marginLeft : '3px'}}, languageFlag ? "English" : "English_zh")
                                            )
                                        ),
                                        D.li({className : 'class_liLanguage', 'languageCode':'zh'},
                                            D.a({ href : "javascript:;" },
                                                D.span({style : { marginLeft : '3px'}}, languageFlag ? "Chinese" : "Chinese_zh")
                                            )
                                        ),
                                        D.form({'action':'/setLanguage', 'method':'post', id:'id_formSetLanguage', 'hidden':'true'},
                                            D.input({'type':'hidden', 'name':'current_url', 'value':''}),
                                            D.input({'type':'hidden', 'name':'language_code', 'value':''})
                                        ),
                                    )
                                ),
                                D.li({className : 'dropdown'},
                                    D.a({href : '/deposit/?clang='+languageCode, className : 'dropdown-toggle'},
                                        D.i({className : 'fab fa-btc fa-lg'})
                                    )
                                ),
                                D.li({className : 'dropdown'},
                                    D.a({href : '/withdraw/?clang'+languageCode, className : 'dropdown-toggle'},
                                        D.i({className : 'fas fa-dollar-sign fa-lg'})
                                    )
                                )
                            )
                        ),
                        D.div({className : 'top-menu custom-top-menu', style : {float : 'right'}},
                            D.ul({className : 'nav navbar-nav', style : {marginRight : '-16px'}},
                                strTopbarElement_1,
                                strTopbarElement_2,
                                logoutButton,
                                D.li({className : 'dropdown', id:'id_liFullscreen'},
                                    D.a({ className : 'dropdown-toggle', onClick: this._toggleFullScreen },
                                        this.state.fullScreen? D.i({ className: 'fas fa-compress fa-lg' }) : D.i({ className: 'fas fa-expand-arrows-alt fa-lg' })
                                    )
                                )
                            )
                        )
                    )
                )
            );

            // return (<div className="page-header navbar navbar-fixed-top"><div className="page-header-inner"><div className="page-logo"><a href='/'><img src="/metronic/assets/admin/layout2/img/logo4.png" alt="logo" className="logo-default" /></a></div><div className="page-top"><div className="top-menu"><ul className="nav navbar-nav pull-right"><li className="dropdown"><a href="javascript:;" className="dropdown-toggle"><i className="fa fa-bitcoin" /></a></li><li className="dropdown"> <a href="javascript:;" className="dropdown-toggle"> <i className="fa fa-facebook" /></a></li><li className="dropdown"> <a href="javascript:;" className="dropdown-toggle"> <i className="fa fa-vk" /></a></li><li className="dropdown"> <a href="javascript:;" className="dropdown-toggle"> <i className="fa fa-expand" /></a></li><li className="dropdown dropdown-user"><a href="javascript:;" className="dropdown-toggle" data-toggle="dropdown" data-hover="dropdown" data-close-others="true"><img alt className="img-circle" src="/metronic/assets/admin/pages/media/profile/profile_user.jpg" /><span className="username username-hide-on-mobile">Nick</span><i className="fa fa-angle-down" /></a><ul className="dropdown-menu dropdown-menu-default"><li><a href="login.html"><i className="icon-key" />Log Out</a></li></ul></li></ul></div></div></div></div>);
        }
    });
});
