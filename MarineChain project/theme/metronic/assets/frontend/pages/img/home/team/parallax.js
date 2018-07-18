/**
 * Author: Tom Usborne
 * jQuery Simple Parallax for Page Header background
 *
 */

// Get the full screen height
function generateScreenHeight() {
	var w=window,
	d=document,
	e=d.documentElement,
	g=d.getElementsByTagName('body')[0],
	x=w.innerWidth||e.clientWidth||g.clientWidth,
	y=w.innerHeight||e.clientHeight||g.clientHeight;

	return y;
}

// Build the header height function
function generateHeaderHeight() {

	if ( ! document.querySelectorAll(".fullscreen-enabled")[0] )
		return;
	
	var offset = jQuery(".fullscreen-enabled").offset().top;
		
	document.querySelectorAll(".fullscreen-enabled")[0].style.height = generateScreenHeight() - offset + 'px';
	
}

// Run the header height function
generateHeaderHeight();

function generateHeaderParallax() {

	// Disable on mobile
	var mobile = jQuery( '.menu-toggle' );
	if ( mobile.is( ':visible' ) )
		return;

	// Only run the function if the setting exists
	if ( ! jQuery('.generate-page-header.parallax-enabled')[0] )
		return;
		
	// Page Header element
	var $this = jQuery( '.generate-page-header.parallax-enabled' );
			
	var x = jQuery(this).scrollTop();
	return $this.css('background-position', 'center ' + parseInt(-x / 3) + 'px');	

}

jQuery(document).ready(function($) {
	
	// Set up the resize timer
	var generateResizeTimer;

	if ( jQuery('.generate-page-header.parallax-enabled')[0] ) {
		// Initiate parallax effect on scroll for our page header
		$(document).scroll(function() {			
			generateHeaderParallax();
		});
	}
	
	if ( jQuery('.generate-page-header.fullscreen-enabled')[0] ) {
		// Initiate full window height on resize
		var width = $(window).width();
		$(window).resize(function() {
			if($(window).width() != width){
				clearTimeout(generateResizeTimer);
				generateResizeTimer = setTimeout(generateHeaderHeight, 200);
				width = $(window).width();
			}
		});
	}

});