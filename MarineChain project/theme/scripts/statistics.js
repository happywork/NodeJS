define([
    'react',
    'components/Statistics'
], function(
    React,
    StatisticsClass
) {

    var Statistics = React.createFactory(StatisticsClass);

    React.render(
        Statistics(),
        document.getElementById('id_divStatistics')
    );
});