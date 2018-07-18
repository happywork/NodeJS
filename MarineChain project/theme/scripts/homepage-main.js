requirejs.config({
    baseUrl: "/scripts",
    paths: {
        react: '../../node_modules/react/dist/react-with-addons',
        seedrandom: '../../node_modules/seedrandom/seedrandom',
        socketio: '../../node_modules/socket.io-client/socket.io',
        lodash: '../../node_modules/lodash/index'
    }
});

require(['homepage-instance'], function() {

    var height = null;
    var timer = window.setInterval(is_element_loaded, 10);

    function is_element_loaded() {
        $.post('/getLeaderBoardTop5', function(data) {
            var str = '';
            for(var i = 0; i < data.length; i++) {
                str += '<tr>';
                str += '<td>' + (i + 1) + '</td>';
                str += '<td><a href="/user' + data[i].username +'" style="color:white;">' + data[i].username + '</a></td>';
                str += '<td>' + parseInt(data[i].net_profit / 100) + ' bits' + '</td>';
                str += '</tr>';
            }
            $(str).appendTo("#id_tbodyTop5Players");
        });

        height = $("#topcontrol").height();
        if(height != null) {
            window.clearTimeout(timer);

            Layout.init();
            RevosliderInit.initRevoSlider();

            $(document).on('click', '.class_liLanguage', function() {
                var current_url = window.location.href;
                var language_code = $(this).attr('language_code');
                $("#id_formSetLanguage").find("[name='current_url']").val(current_url);
                $("#id_formSetLanguage").find("[name='language_code']").val(language_code);
                $("#id_formSetLanguage").submit();
            });

            

            $(".custom-nav a").hover(
                function() {
                    $(this).animate({
                        'padding' : '0 15px 0 15px'
                    }, 400);
                    $(this).find('i').animate({
                        'font-size': '45px'
                    }, 400, function() {

                        //alert('top : ' + position.top + "   left : " + position.left);
                    });
                    $(this).find('i').css('color', '#3facff');
                    var menu_title = $(this).find('i').attr('data-title');
                    $('.custom-title-label').text(menu_title);
                    var position = $(this).find('i').offset();


                    var offset_title =  {
                        Leaderboard : '166.375px',
                        'Stats' : 0,
                        'FAQ' : '-165.375px'
                    };
                    $(".custom-title-label").animate({
                        marginRight: offset_title[menu_title]
                    }, 300);
                    $(".custom-title-label").fadeIn(500);


                }, function() {
                    $(this).animate({
                        'padding' : '25px 30px 0 30px'
                    }, 100);

                    $(this).find('i').animate({
                        'font-size': '20px'
                    }, 100);
                    $(this).find('i').css('color', '#efefef');
                    $(".custom-title-label").fadeOut(0);
                }
            );

            var screen_width = $(window).width();
            if(screen_width <= 480) {
                $(".custom-btn-playnow-a").css('top', '80px');
                $(".custom-btn-playnow-a").css('padding', '10px 65px');
                $(".custom-btn-playnow-a").css('font-size', '20px');

                $("#id_tbodyTop5Players").parent().parent().parent().css('margin-top', '55px');
            } else if(screen_width <= 780) {
                $(".custom-btn-playnow-a").css('top', '200px');
                $(".custom-btn-playnow-a").css('padding', '20px 65px');
                $(".custom-btn-playnow-a").css('font-size', '25px');

                $("#custom-homepage-container").children().eq(0).children(1).removeClass('col-xs-5').addClass('col-xs-4');
                $("#custom-homepage-container").children().eq(0).children(2).removeClass('col-xs-7').addClass('col-xs-8');

                $("#id_tbodyTop5Players").parent().parent().parent().css('margin-top', '55px');
            }
        }
    }

    console.log(3333);
    //roadmap timeline
    

    function toggleIcon(e) {
        console.log(e.target);
        $(e.target)
            .prev('.panel-heading')
            .find(".more-less")
            .toggleClass('glyphicon-menu-down glyphicon-menu-up');  //fa-icon fa-angle-up

    }
    $('.panel-group').on('hidden.bs.collapse', toggleIcon);
    $('.panel-group').on('shown.bs.collapse', toggleIcon);  

    function addClassColor(e) {
        console.log(e.target);
        $(e.target)
            .prev('.panel-heading')         
            .toggleClass('headerbgcolorremove headerbgcolor');  //fa-icon fa-angle-up

    }
    $('.panel-group').on('hidden.bs.collapse', addClassColor);
    $('.panel-group').on('shown.bs.collapse', addClassColor);

});