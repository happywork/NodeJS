define([
    'dispatcher/AppDispatcher',
    'constants/AppConstants'
], function(
    AppDispatcher,
    AppConstants
){

    var ControlsActions = {

        placeBet: function(bet, cashOut){
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.PLACE_BET,
                bet: bet,
                cashOut: cashOut
            });
        },

        cashOut: function(){
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.CASH_OUT
            });
        },

        cancelBet: function(){
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.CANCEL_BET
            });
        },

        setBetSize: function(betSize){
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.SET_BET_SIZE,
                betSize: betSize
            });
        },

        setAutoCashOut: function(autoCashOut){
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.SET_AUTO_CASH_OUT,
                autoCashOut: autoCashOut
            });
        },

        finishRound: function(currentTime, currentPoint) {
            AppDispatcher.handleViewAction({
                actionType:AppConstants.ActionTypes.FINISH_ROUND,
                currentTime: currentTime,
                currentPoint: currentPoint
            });
        }
    };

    return ControlsActions;
});