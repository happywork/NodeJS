$(document).ready(function(){	

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

	//change url in faq page
	function changeurl(url)
	{
		
	 	var new_url= url;
	 	window.history.pushState("data","Title", new_url);
	 	//window.history.pushState({},"Results for `Cats`",'url.html?s=cats');
	 	document.title= url.substring(1);
	}
	
	$("#legal_terms a").click(function(e){
		e.preventDefault();
		changeurl('/terms-of-use');
	});
	$("#privacy_policy a").click(function(e){
		e.preventDefault();
		changeurl('/privacy-policy');
	});
	$("#kyc_aml a").click(function(e){
		e.preventDefault();
		changeurl('/kyc-aml');
	});
	$("#risks_disclimer a").click(function(e){
		e.preventDefault();
		changeurl('/risk-disclimer');
	});
	$("#faq_content a").click(function(e){

		e.preventDefault();
		changeurl('/faq');
	});

	//terms of use, legal link on the footer
	jQuery("#colophon .legal-privacy-footer").on('click', function(e){
            
            e.preventDefault();
            //window.location.href = "faq/#privacy";
            jQuery(".legal-content").removeClass("active");
            jQuery(".legal-privacy").addClass("active");

            jQuery(".subnav .nav>li:nth-child(2)").addClass("active");
            jQuery(".subnav .nav>li:first-child").removeClass("active");
            jQuery(".subnav .nav>li:nth-child(3)").removeClass("active");
            jQuery(".subnav .nav>li:nth-child(4)").removeClass("active");
            jQuery(".subnav .nav>li:nth-child(5)").removeClass("active");        

            jQuery(".subnav .nav>li:nth-child(2) a").attr("aria-expanded", true);
            jQuery(".subnav .nav>li:first-child a").attr("aria-expanded", false);
            jQuery(".subnav .nav>li:nth-child(3) a").attr("aria-expanded", false);
            jQuery(".subnav .nav>li:nth-child(4) a").attr("aria-expanded", false);
            jQuery(".subnav .nav>li:nth-child(5) a").attr("aria-expanded", false);
        

            jQuery('html, body').animate({
                scrollTop: jQuery(".header").offset().top + 20
            }, 1000);
    });

    jQuery("#colophon .privacy-terms").on('click', function(e){           
        e.preventDefault();     
        //window.location.href = "faq/#legal";
        jQuery(".legal-content").addClass("active");
        jQuery(".legal-privacy").removeClass("active");

        jQuery(".subnav .nav>li:first-child").addClass("active");
        jQuery(".subnav .nav>li:nth-child(2)").removeClass("active");
        jQuery(".subnav .nav>li:nth-child(3)").removeClass("active");
        jQuery(".subnav .nav>li:nth-child(4)").removeClass("active");
        jQuery(".subnav .nav>li:nth-child(5)").removeClass("active");

        jQuery(".subnav .nav>li:first-child a").attr("aria-expanded", true);
        jQuery(".subnav .nav>li:nth-child(2) a").attr("aria-expanded", false);       
        jQuery(".subnav .nav>li:nth-child(3) a").attr("aria-expanded", false);       
        jQuery(".subnav .nav>li:nth-child(4) a").attr("aria-expanded", false);       
        jQuery(".subnav .nav>li:nth-child(5) a").attr("aria-expanded", false);       

        jQuery('html, body').animate({
            scrollTop: jQuery(".header").offset().top + 20
        }, 1000);
        
    });

    
});
