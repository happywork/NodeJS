requirejs.config({
    baseUrl: "/scripts", //If no baseUrl is explicitly set in the configuration, the default value will be the location of the HTML page that loads require.js.
    paths: {
        autolinker: '../../node_modules/autolinker/dist/Autolinker',
        classnames: '../../node_modules/classnames/index',
        lodash: '../../node_modules/lodash/index',
        react: '../../node_modules/react/dist/react-with-addons',
        seedrandom: '../../node_modules/seedrandom/seedrandom',
        socketio: '../../node_modules/socket.io-client/socket.io',
        mousetrap: '../../node_modules/mousetrap/mousetrap',
        screenfull: '../../node_modules/screenfull/dist/screenfull'
    },
    shim: {

    }
});

require(['game'], function() {

    var height = null;
    var timer = window.setInterval(is_element_loaded, 10);

    function is_element_loaded() {
        height = $("#round_info").height();    
        if(height != null)
        {
            $("#loading-div").hide();
            window.clearTimeout(timer);

            jQuery(document).ready(function()
            {
                Metronic.init();
                Layout.init();

                function isMobileDevice() {
                    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
                };

                calcLayout();
                if(!isMobileDevice()) {
                    $( window ).resize(function() {
                        calcLayout();
                    });
                }


                $("#chatModal").draggable();

                $('#chatModal .modal-content').resizable({
                    alsoResize: "#chatModal .modal-dialog, #chatModal .scroller, #chatModal .slimScrollDiv, #chatModal",
                    minHeight: 150,
                    minWidth:400,
                    resize: function(event, ui) {
                        var height = ui.size.height;
                        var width = ui.size.width;
                        $(this).find('#chatModal .scroller').css("width", (width - 20) + "px");
                        $(this).find('#chatModal .slimScrollDiv').css("width", (width - 20) + "px");
                        $(this).find('#chatModal .slimScrollDiv').css("height", (height - 110) + "px");
                        $("#chatModal").css('padding-left', 0);
                    }
                });

                $("#chat_modal_button" ).click(function() {
                    onSidebarLiElement(this);
                });

                $("#close_chat_button" ).click(function() {
                    onCloseModal('chat');
                });

                $("#id_linkLogout").click(function() {
                    if (document.getElementById('logout') ) {
                        if (confirm("Are you sure you want to log out?")) {
                            document.getElementById("logout").submit();
                        }
                    }
                });

                $("#id_linkLogout_sidebar").click(function() {
                    if (document.getElementById('logout') ) {
                        if (confirm("Are you sure you want to log out?")) {
                            document.getElementById("logout").submit();
                        }
                    }
                });

                $(document).on('click', '.menu-toggler.responsive-toggler', function() {
                    if($(".navbar-collapse").attr('aria-expanded') == 'true')
                        $(".custom-bitcoin-amount-mobile").hide();
                    else $(".custom-bitcoin-amount-mobile").show();
                });

                $(document).on('click', '#id_advertisementContainer_before', function() {
                    $("#id_advertisementContainer").css('right', '0');
                    $("#id_advertisementContainer_before").css('right', '125px');
                });

                $('body').click(function(event) {
                    if(event.toElement.id != 'id_advertisementContainer_before' && event.toElement.id != 'id_imageAdvertisement') {
                        $("#id_advertisementContainer").css('right', '-200px');
                        $("#id_advertisementContainer_before").css('right', '-75px');
                    } else if (event.toElement.id == 'id_imageAdvertisement') {
                        window.location = '/?clang=' + $("#id_hiddenLanguageCode").val();
                    }
                });

                $(document).on('click', '.class_liLanguage', function() {
                    var current_url = window.location.href;
                    var language_code;
                    if($(this).next().hasClass('class_liLanguage'))
                        language_code = 'en';
                    else language_code = 'zh';
                    $("#id_formSetLanguage").find("[name='current_url']").val(current_url);
                    $("#id_formSetLanguage").find("[name='language_code']").val(language_code);
                    $("#id_formSetLanguage").submit();
                });
            });

            function onSidebarLiElement(el) {
                if($(el).hasClass('active') === true)
                    $(el).removeClass('active');
                else $(el).addClass('active');
            };

            function  onCloseModal(val) {
                if (val == "chat") {
                    $("#chat_modal_button").removeClass('active');
                } else if(val == 'history') {
                    $("#history_modal_button").removeClass('active');
                } else if(val == 'setting') {
                    $("#setting_modal_button").removeClass('active');
                }
            };

            function calcLayout() {
                var height = $(window).height();
                var width = $(window).width();
                var headerHeight = $('.page-header').outerHeight();
                height = height - headerHeight;

                if(width <= 480) {
                    var cash_panel_height = 70;    // =cash_panel_width
                    var cash_panel_top = 25;
                    var cash_panel_right = (width - cash_panel_height) / 2 + 30;
                    var cash_panel_font = cash_panel_height / 7 * 5;
                    var cash_panel_padding = (cash_panel_height - cash_panel_font) / 7 * 3;
                    $("#id_divPayout").css('height', cash_panel_height + "px");
                    $("#id_divPayout").css('width', cash_panel_height + "px");
                    $("#id_divPayout").css("top", cash_panel_top + "px");
                    $("#id_divPayout").css("right", cash_panel_right + "px");
                    $("#id_divPayout").css("font-size", cash_panel_font + "px" );
                    $("#id_divPayout").css("padding", cash_panel_padding + "px 1px" );
                    $("#id_divPayout").removeClass("btn-circle-50p");

                    var graph_height = cash_panel_height + 100;
                    $("#id_divChart").css("height", graph_height + "px");
                    $("#id_divChart").css("width", '125%');
                    $("#id_divChart").css("margin-left", '-8%');

                    var roundNote_height = cash_panel_height;
                    var roundNote_top = cash_panel_top - 20;
                    var roundNote_right = 0;
                    var roundNote_width = width - 50;
                    var roundNote_padding = cash_panel_padding;
                    var roundNote_font = cash_panel_font / 5 * 4;
                    $("#id_divRoundNote").css("height", roundNote_height + "px");
                    $("#id_divRoundNote").css("top", roundNote_top + "px");
                    $("#id_divRoundNote").css("right", (roundNote_right + 25) +'px');
                    $("#id_divRoundNote").css("width", roundNote_width+'px');
                    $("#id_divRoundNote").css("padding", roundNote_padding + "px 1px" );
                    $("#id_divRoundNote").css("font-size", roundNote_font + "px" );

                    var round_info_height = 200;
                    $("#round_info").css('height', round_info_height + 'px');
                    $("#round_info").parent().css("height", round_info_height + 'px');

                    var tab_content_height =  height - graph_height - $("#tab_manual").height() - 15;
                    $("#play_button_tab_content").css("height", tab_content_height + 'px');
                    $("#play_button_tab_content").parent().css('padding', '0 0 0 40px');
                    $("#play_button_tab_content").parent().parent().css('padding', '0 7px 0 0');

                    $(".button-container").parent().css('padding', '0px');
                    $(".button-container").parent().css('margin-left', '-10px');

                    $("#tab_chat").find('.scroller').css('height', (tab_content_height - 55) + 'px')
                    $("#tab_chat").find('.slimScrollDiv').css('height', (tab_content_height - 64) + 'px')

                    $("#tab_players").find('.scroller').css('height', (tab_content_height - 23) + 'px');
                    $("#tab_players").find('.slimScrollDiv').css('height', (tab_content_height - 23) + 'px');

                    $("#tab_history").find('.scroller').css('height', (tab_content_height - 23) + 'px');
                    $("#tab_history").find('.slimScrollDiv').css('height', (tab_content_height - 23) + 'px');

                    var maxProfit_right = $("#play_button_tab_content").width() / 100 * 72;
                    var maxProfit_top = -17;
                    $('.max-profit').css('right', maxProfit_right + 'px');
                    $('.max-profit').css('top', maxProfit_top + 'px');

                    $(document).on('click', '.custom-tab-menu', function() {
                        if($(this).text() == 'Custom') {
                            setTextareaHeight();
                            function setTextareaHeight() {
                                if($("#id_textareaCustomScript").css('height') == undefined)
                                    setTimeout(setTextareaHeight, 30);
                                else $("#id_textareaCustomScript").css('height', (tab_content_height - 60) + 'px');
                            }
                        }
                    });

                    $(".custom-control-tab-li").first().children().click();
                } else if(width <= 780) {

                    var cash_panel_height = 75;    // =cash_panel_width
                    var cash_panel_top = 75;
                    var cash_panel_right = (width - cash_panel_height) / 2;
                    var cash_panel_font = cash_panel_height / 7 * 5;
                    var cash_panel_padding = (cash_panel_height - cash_panel_font) / 7 * 3;

                    $("#id_divPayout").css('height', cash_panel_height + "px");
                    $("#id_divPayout").css('width', cash_panel_height + "px");
                    $("#id_divPayout").css("top", cash_panel_top + "px");
                    $("#id_divPayout").css("right", cash_panel_right + "px");
                    $("#id_divPayout").css("font-size", cash_panel_font + "px" );
                    $("#id_divPayout").css("padding", cash_panel_padding + "px 1px" );
                    $("#id_divPayout").removeClass("btn-circle-50p");


                    var graph_height = cash_panel_height + 200;
                    $("#id_divChart").css("height", graph_height + "px");
                    $("#id_divChart").css("width", '115%');
                    $("#id_divChart").css("margin-left", '-4%');

                    var roundNote_height = cash_panel_height;
                    var roundNote_top = cash_panel_top;
                    var roundNote_right = 0;
                    var roundNote_width = width - 50;
                    var roundNote_padding = cash_panel_padding;
                    var roundNote_font = cash_panel_font;
                    $("#id_divRoundNote").css("height", roundNote_height + "px");
                    $("#id_divRoundNote").css("top", roundNote_top + "px");
                    $("#id_divRoundNote").css("right", (roundNote_right + 25) +'px');
                    $("#id_divRoundNote").css("width", roundNote_width+'px');
                    $("#id_divRoundNote").css("padding", roundNote_padding + "px 1px" );
                    $("#id_divRoundNote").css("font-size", roundNote_font + "px" );

                    var round_info_height = 200;
                    $("#round_info").css('height', round_info_height + 'px');
                    $("#round_info").parent().css("height", round_info_height + 'px');

                    var tab_content_height =  height - graph_height - 88;
                    $("#play_button_tab_content").css("height", tab_content_height + 'px');
                    $("#play_button_tab_content").parent().css('padding', '0 0 0 40px');
                    $("#play_button_tab_content").parent().parent().css('padding', '0 7px 0 0');

                    $(".button-container").parent().css('padding', '0px');
                    $(".button-container").parent().css('margin-left', '-10px');

                    $("#tab_chat").find('.scroller').css('height', (tab_content_height - 55) + 'px')
                    $("#tab_chat").find('.slimScrollDiv').css('height', (tab_content_height - 64) + 'px')

                    $("#tab_players").find('.scroller').css('height', (tab_content_height - 23) + 'px');
                    $("#tab_players").find('.slimScrollDiv').css('height', (tab_content_height - 23) + 'px');

                    $("#tab_history").find('.scroller').css('height', (tab_content_height - 23) + 'px');
                    $("#tab_history").find('.slimScrollDiv').css('height', (tab_content_height - 23) + 'px');

                    $(document).on('click', '.custom-tab-menu', function() {
                        if($(this).text() == 'Custom') {
                            setTextareaHeight();
                            function setTextareaHeight() {
                                if($("#id_textareaCustomScript").css('height') == undefined)
                                    setTimeout(setTextareaHeight, 100);
                                else $("#id_textareaCustomScript").css('height', (tab_content_height - 60) + 'px');
                            }
                        }
                    });

                    $(".custom-control-tab-li").first().children().click();

                    if($("#tab_manual").children().eq(0).children().eq(0).hasClass('col-xs-9')) {
                        $("#tab_manual").children().eq(0).children().eq(0).removeClass('col-xs-9').addClass('col-xs-6');
                        $("#tab_manual").children().eq(0).children().eq(1).removeClass('col-xs-3').addClass('col-xs-6');
                    }

                    var maxProfit_right = $("#play_button_tab_content").width() / 100 * 90;
                    var maxProfit_top = -18;
                    $('.max-profit').css('right', maxProfit_right + 'px');
                    $('.max-profit').css('top', maxProfit_top + 'px');

                } else {

                    $(".page-sidebar-menu-hover-submenu").parent().attr('style', 'height:' + height + 'px !important');
                    $("#play_button_tab_content").css("height", '225px');

                    var round_info_height = (height - 82) / 2;
                    $("#round_info").css('height', round_info_height + 'px');
                    $("#round_info").parent().css("height", round_info_height + 'px');

                    $("#id_divGamesLog").css('height', round_info_height + 'px');
                    $("#id_divGamesLog").parent().css("height", round_info_height + 'px');

                    var graph_height = height - $("#play_button_tab_content").height() - 111;
                    var graph_width = $("#play_button_tab_content").width();

                    $("#id_divChart").css("height", graph_height + "px");

                    var cash_panel_height = ((graph_height < graph_width) ? (graph_height) : (graph_width)) - 80;
                    $("#id_divPayout").css('height', cash_panel_height + "px");
                    $("#id_divPayout").css('width', cash_panel_height + "px");

                    var cash_panel_top = (graph_height - cash_panel_height) / 2 - 10;
                    var cash_panel_right = $("#id_divRecentHistory").width() + ($("#play_button_tab_content").width() - $("#id_divRecentHistory").width()) / 2 - $("#id_divPayout").width() / 2;
                    var cash_panel_font = cash_panel_height / 10 * 3;
                    var cash_panel_padding = (cash_panel_height - cash_panel_font) / 8 * 3;

                    $("#id_divPayout").css("top", cash_panel_top + "px");
                    $("#id_divPayout").css("font-size", cash_panel_font + "px" );
                    $("#id_divPayout").css("padding", cash_panel_padding + "px 1px" );
                    $("#id_divPayout").css("right", cash_panel_right+'px');

                    var roundNote_height = cash_panel_height;
                    var roundNote_top = cash_panel_top;
                    var roundNote_right = $("#id_divRecentHistory").width() + 10;
                    var roundNote_width = $('#play_button_tab_content').width() - $("#id_divRecentHistory").width();
                    var roundNote_padding = cash_panel_height / 4 ;
                    var roundNote_font   = (cash_panel_height - cash_panel_font) / 8 * 3;
                    $("#id_divRoundNote").css("height", roundNote_height + "px");
                    $("#id_divRoundNote").css("top", roundNote_top + "px");
                    $("#id_divRoundNote").css("right", (roundNote_right + 10) +'px');
                    $("#id_divRoundNote").css("width", roundNote_width+'px');
                    $("#id_divRoundNote").css("padding", roundNote_padding + "px 1px" );
                    $("#id_divRoundNote").css("font-size", roundNote_font + "px" );

                    var maxProfit_right = $("#play_button_tab_content").width() / 100 * 90;
                    $('.max-profit').css('right', maxProfit_right + 'px');

                    var recentHistoryPadding = ($("#id_divRecentHistory").find('.scroller').innerWidth() - $('#id_divRecentHistory').find('.scroller').width()) / 2 ;
                    $('#id_divRecentHistory').find('.scroller').css('padding-left', recentHistoryPadding + 'px');

                    $(document).on('click', '.custom-tab-menu', function() {
                        if($(this).text() == 'Custom') {
                            setTextareaHeight();
                            function setTextareaHeight() {
                                if($("#id_textareaCustomScript").css('height') == undefined)
                                    setTimeout(setTextareaHeight, 100);
                                else {
                                    $("#id_textareaCustomScript").css('height', 'auto');
                                    $(".custom-customscript-button").css('margin-top', ($("#id_textareaCustomScript").height() - 60) + 'px', '!important');
                                }
                            }
                        }
                    });
                }
            }
        }
    }
});