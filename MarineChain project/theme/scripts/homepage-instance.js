define([
    'react',
    'components/Homepage'
], function(
    React,
    HomepageClass
){

    var Homepage = React.createFactory(HomepageClass);

    React.render(
        Homepage(),
        document.getElementById('id_hTotalMemberProfits')
    );

});