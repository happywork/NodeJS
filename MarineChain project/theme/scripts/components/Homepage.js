define([
    'react',
    'game-logic/clib',
    'game-logic/stateLib',
    'lodash',
    'game-logic/engine'
], function(
    React,
    Clib,
    StateLib,
    _,
    Engine
){
    function getState(){
        return {
            engine: Engine
        }
    }

    var $edtTotalMemberProfits = null;

    return React.createClass({
        displayName: 'Homepage',

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            Engine.on({
                homepage_event: this._onChange
            });

            $edtTotalMemberProfits = $('#id_edtTotalMemberProfits');
            $edtTotalMemberProfits.flapper({
                width: 10,
                chars_preset: 'alpha',
                chars: ['0','1','2','3','4','5','6','7','8','9']
            });
        },

        componentWillUnmount: function() {
            Engine.off({
                homepage_event: this._onChange
            });
        },

        _onChange: function() {
            var strProfits = Engine.nTotalMemberProfits.toString();
            strProfits = "0000000000" + strProfits;
            strProfits = strProfits.substring(-10);

            $edtTotalMemberProfits.val(strProfits).change();

            this.setState(getState());
        },

        render: function () {
            return null;
        }
    });
});